import { createWalletClient, createPublicClient, formatUnits, parseUnits, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';
import { erc20Abi } from 'viem';
import { tokenHomeABI } from './abis/tokenHomeABI.mjs';
import { teleporterABI } from './abis/teleporterABI.mjs';

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

   /**
   * @description Sends tokens from one chain to another through the TokenHome contract
   * @param {Viem.Address} recipient - The address that will receive tokens on the destination chain
   * @param {string} amount - The amount of tokens to send in decimal format (e.g. "1.5")
   * @returns {Promise<{
   *   approveTxHash: Viem.Hash,
   *   sendTxHash: Viem.Hash
   * }>} Object containing both approval and send transaction hashes
   * @throws {Error} If approval or send transaction fails
   * @example
   * const result = await ictt.sendTokenCrossChain(
   *   "0xRecipientAddress...",
   *   "1.5"
   * );
   * console.log("Approval tx:", result.approveTxHash);
   * console.log("Send tx:", result.sendTxHash);
   */
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

  
  /**
   * @description Gets the transferred balance for a remote token transferrer
   * @param {Viem.Bytes32} remoteBlockchainID - The blockchain ID of the remote chain
   * @param {Viem.Address} remoteTokenTransferrerAddress - The address of the remote token transferrer
   * @returns {Promise<bigint>} The transferred balance
   * @example
   * const balance = await ictt.getTransferredBalance(
   *   "0x1234...",
   *   "0xabcd..."
   * );
   */
  async getTransferredBalance(remoteBlockchainID, remoteTokenTransferrerAddress) {
    const { tokenHomeContract } = this.config;

    // Get token decimals first
    const decimals = await this.getTokenDecimals();

    const balance = await this.publicClient.readContract({
      address: tokenHomeContract,
      abi: tokenHomeABI,
      functionName: 'transferredBalances',
      args: [remoteBlockchainID, remoteTokenTransferrerAddress]
    });

    return formatUnits(balance, decimals);
    // return balance;
  }


  /**
   * @description Gets the blockchain ID for this TokenHome contract
   * @returns {Promise<Viem.Bytes32>} The blockchain ID as bytes32
   * @example
   * const blockchainID = await ictt.getBlockchainID();
   */
  async getBlockchainID() {
    const { tokenHomeContract } = this.config;
    
    const blockchainID = await this.publicClient.readContract({
      address: tokenHomeContract,
      abi: tokenHomeABI,
      functionName: 'blockchainID'
    });

    return blockchainID;
  }

  /**
   * @description Gets the tokenDecimals for this TokenHome contract
   * @returns {Promise<Viem.Bytes32>} The number of decimals for the token
   * @example
   * const blockchainID = await ictt.getTokenDecimals();
   */
    async getTokenDecimals() {
      const { tokenHomeContract } = this.config;
      
      const decimals = await this.publicClient.readContract({
        address: tokenHomeContract,
        abi: tokenHomeABI,
        functionName: 'tokenDecimals'
      });
  
      return decimals;
    }

    /**
   * @description Sends a cross-chain message using Teleporter
   * @param {Object} params The message parameters
   * @param {string} params.destinationAddress The target contract address
   * @param {string} params.message The message to send
   * @param {bigint} params.gasLimit Optional gas limit override
   * @returns {Promise<{txHash: string, receipt: Object}>}
   */
    async sendCrossChainMessage({destinationBlockchainID, destinationAddress, message, gasLimit = 100000n}) {
      const messageInput = {
        destinationBlockchainID: destinationBlockchainID,
        destinationAddress: destinationAddress,
        feeInfo: {
          feeTokenAddress: '0x0000000000000000000000000000000000000000',
          amount: 0n
        },
        requiredGasLimit: gasLimit,
        allowedRelayerAddresses: [],
        message: message
      };
  
      const txHash = await this.walletClient.writeContract({
        address: this.TELEPORTER_ADDRESS,
        abi: teleporterABI,
        functionName: 'sendCrossChainMessage',
        args: [messageInput],
        gasLimit: this.config.gasLimit
      });
  
      const receipt = await this.waitForTransactionReceipt(txHash);
  
      return {
        txHash,
        receipt
      };
    }

}