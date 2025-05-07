import { createPublicClient, createWalletClient, http, encodeFunctionData, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { erc20Abi } from '@viem/abis';

// Extended ABI with mint function
const mintFunctionAbi = {
  inputs: [
    { internalType: 'address', name: 'to', type: 'address' },
    { internalType: 'uint256', name: 'amount', type: 'uint256' },
  ],
  name: 'mint',
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function',
};
const extendedERC20Abi = [...erc20Abi, mintFunctionAbi];

// Placeholder for ERC20 contract bytecode (replace with actual compiled bytecode)
const ERC20MintableBytecode = "0x..."; // Compile your ERC20 Solidity code to get this

// Class to interact with a deployed ERC20 token contract
class ERC20MintableToken {
  constructor(address, walletClient, publicClient) {
    this.address = address;
    this.walletClient = walletClient;
    this.publicClient = publicClient;
  }

  async invoke(method, args) {
    const data = encodeFunctionData({
      abi: extendedERC20Abi,
      functionName: method,
      args: args,
    });

    const txHash = await this.walletClient.sendTransaction({
      to: this.address,
      data: data,
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`Invoked ${method} with args ${args}:`, receipt);
    return receipt;
  }

  async mint(to, amount) {
    return await this.invoke('mint', [to, parseUnits(amount.toString(), 18)]);
  }

  async transfer(to, amount) {
    return await this.invoke('transfer', [to, parseUnits(amount.toString(), 18)]);
  }

  async approve(spender, amount) {
    return await this.invoke('approve', [spender, parseUnits(amount.toString(), 18)]);
  }

  getContractAddress() {
    return this.address;
  }
}

// SDK class to deploy and manage ERC20 mintable tokens
class ERC20MintableSDK {
  constructor(chain, privateKey) {
    this.chain = chain;
    this.account = privateKeyToAccount(privateKey);
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(),
    });
    this.walletClient = createWalletClient({
      account: this.account,
      chain: this.chain,
      transport: http(),
    });
  }

  async createERC20({ name, symbol, totalSupply }) {
    const data = encodeFunctionData({
      abi: extendedERC20Abi,
      functionName: 'constructor',
      args: [name, symbol, parseUnits(totalSupply.toString(), 18)],
    });

    const txHash = await this.walletClient.sendTransaction({
      data: ERC20MintableBytecode + data.slice(2),
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    const contractAddress = receipt.contractAddress;
    console.log(`Deployed ERC20 token at ${contractAddress}`);
    return new ERC20MintableToken(contractAddress, this.walletClient, this.publicClient);
  }
}

export default ERC20MintableSDK;