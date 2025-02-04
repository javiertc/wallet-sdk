import { createWalletClient, createPublicClient, parseUnits,http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';
import { erc20Abi } from 'viem';
import { tokenHomeABI } from './abis/tokenHomeABI.mjs';

export class ICTT {
  constructor({
    chainName,
    privateKey,
    erc20Contract,
    tokenHomeContract,
    tokenRemoteContract,
    destinationChainId,
    feeReceiver = "0x0000000000000000000000000000000000000000",
    gasLimit = 250000,
  }) {
    // const { chainRef, rpcUrl } = getChainConfig(chainName);
    const account = privateKeyToAccount(privateKey)
    this.walletClient = createWalletClient({
      account: account,
      chain: avalancheFuji,
      transport: http(),
    });

    this.publicClient = createPublicClient({
      chain: avalancheFuji,
      transport: http(),
    });


    this.config = {
      chainName,
      privateKey,
      erc20Contract,
      tokenHomeContract,
      tokenRemoteContract,
      destinationChainId,
      feeReceiver,
      gasLimit,
    };
  }

  async waitForTransactionReceipt(txHash) {
    while (true) {
      const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt) {
        return receipt;
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // wait for 1 second before retrying
    }
  }
 
  async sendTokenCrossChain(recipient, amount) {
    const { erc20Contract, tokenHomeContract, tokenRemoteContract, gasLimit, feeReceiver, destinationChainId } = this.config;

    const amountInWei = parseUnits(amount, 18);

    console.log("Amount in Wei:", amountInWei);

    console.log("Approving tokens for transfer...");
    console.log(this.config);
    
    // Approve tokens for transfer
    const approveTxHash = await this.walletClient.writeContract({
      address: erc20Contract,
      abi: erc20Abi,
      functionName: "approve",
      args: [tokenHomeContract, amountInWei],
      gasLimit
    });

    console.log("Approve transaction hash:", approveTxHash);

    // Wait for the approval transaction to be mined
    const approveReceipt = await this.waitForTransactionReceipt(approveTxHash);
    // console.log("Approval transaction mined:", approveReceipt);

    const sendTokensInput = {
      destinationBlockchainID: destinationChainId,
      destinationTokenTransferrerAddress: tokenRemoteContract,
      recipient,
      primaryFeeTokenAddress: erc20Contract,
      primaryFee: 0,
      secondaryFee: 0,
      requiredGasLimit: 250000, 
      multiHopFallback: '0x0000000000000000000000000000000000000000',
    };

    // Send tokens cross-chain
    const sendTxHash = await this.walletClient.writeContract({
      address: tokenHomeContract,
      abi: tokenHomeABI,
      functionName: 'send',
      args: [sendTokensInput, amountInWei],
      gasLimit
    });

     // Wait for the send transaction to be mined
     const sendReceipt = await this.waitForTransactionReceipt(sendTxHash);
    //  console.log("Send transaction mined:", sendReceipt);
 

    return {
      approveTxHash,
      sendTxHash,
    };
  }
}