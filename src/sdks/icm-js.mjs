import { config } from 'dotenv';
import { createWalletClient, createPublicClient, encodeAbiParameters, parseAbiParameters, http, parseEventLogs } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { teleporterABI } from '../abis/teleporterABI.mjs';

// Load environment variables
config();

export class IcmSDK {
  /**
   * Initialize the Inter-Chain Messaging SDK
   * @param {string} privateKey - Private key for transaction signing
   * @param {string} teleporterAddress - Address of the Teleporter contract
   * @param {string} defaultRecipient - Default recipient address for messages
   * @param {Object} chainConfigs - Configuration for supported chains
   */
  constructor(privateKey, teleporterAddress, defaultRecipient, chainConfigs) {
    this.privateKey = privateKey;
    this.teleporterAddress = teleporterAddress;
    this.defaultRecipient = defaultRecipient;
    this.chainConfigs = chainConfigs;
    this.clients = {};

    // Initialize clients for each chain
    for (const [chainName, config] of Object.entries(chainConfigs)) {
      const account = privateKeyToAccount(privateKey);
      
      this.clients[chainName] = {
        wallet: createWalletClient({
          account,
          chain: config.chain,
          transport: http(),
        }),
        public: createPublicClient({
          chain: config.chain,
          transport: http(),
        }),
      };
    }
  }

  /**
   * Check if account has enough balance for a transaction
   * @param {string} chainName - Name of the chain
   * @returns {Promise<boolean>}
   */
  async checkBalance(chainName) {
    if (!this.clients[chainName]) {
      throw new Error(`Invalid chain name: ${chainName}`);
    }

    const publicClient = this.clients[chainName].public;
    const walletClient = this.clients[chainName].wallet;
    const address = walletClient.account.address;

    try {
      // Get current balance
      const balance = await publicClient.getBalance({ address });
      
      // Estimate gas for a message send (rough estimate)
      const estimatedGas = 200000n;
      const gasPrice = await publicClient.getGasPrice();
      const estimatedCost = estimatedGas * gasPrice;
      
      console.log(`Account balance on ${chainName}: ${balance}`);
      console.log(`Estimated transaction cost: ${estimatedCost}`);
      
      return balance >= estimatedCost;
    } catch (error) {
      console.error(`Error checking balance: ${error.message}`);
      return false;
    }
  }

  /**
   * Send a cross-chain message
   * @param {string} sourceChain - Source chain name
   * @param {string} destChain - Destination chain name
   * @param {string} message - Message to send
   * @param {string} [recipient] - Optional recipient address (overrides default)
   * @returns {Promise<{hash: string, sourceChain: string}>} Transaction hash and source chain
   */
  async sendMessage(sourceChain, destChain, message, recipient = null) {
    if (!this.chainConfigs[sourceChain] || !this.chainConfigs[destChain]) {
      throw new Error(`Invalid chain names: ${sourceChain}, ${destChain}`);
    }
    
    // Check balance before attempting transaction
    const hasBalance = await this.checkBalance(sourceChain);
    if (!hasBalance) {
      throw new Error(
        `Insufficient funds on ${sourceChain} chain. ` +
        `Please fund your account (${this.clients[sourceChain].wallet.account.address}) ` +
        `with native ${sourceChain.toUpperCase()} tokens to pay for transaction fees.`
      );
    }

    const sourceClients = this.clients[sourceChain];
    const destBlockchainID = this.chainConfigs[destChain].blockchainId;
    const recipientAddress = recipient || this.defaultRecipient;

    console.log(`Sending message from ${sourceChain} to ${destChain}`);
    console.log(`Destination blockchain ID: ${destBlockchainID}`);
    console.log(`Recipient: ${recipientAddress}`);
    console.log(`Message: "${message}"`);
    console.log(`Using teleporter address: ${this.teleporterAddress}`);

    // Encode the message as bytes
    const encodedMessage = encodeAbiParameters(
      parseAbiParameters('string'), 
      [message]
    );

    // Create the message input struct
    const messageInput = {
      destinationBlockchainID: destBlockchainID,
      destinationAddress: recipientAddress,
      feeInfo: {
        feeTokenAddress: '0x0000000000000000000000000000000000000000',
        amount: 0n
      },
      requiredGasLimit: 100000n,
      allowedRelayerAddresses: [],
      message: encodedMessage
    };

    // Send the transaction
    const hash = await sourceClients.wallet.writeContract({
      address: this.teleporterAddress,
      abi: teleporterABI,
      functionName: 'sendCrossChainMessage',
      args: [messageInput]
    });

    console.log(`Transaction sent: ${hash}`);
    return { hash, sourceChain };
  }

  /**
   * Process a transaction receipt to extract event information
   * @param {string} chainName - Chain name
   * @param {string} hash - Transaction hash
   * @returns {Promise<Object>} Processed transaction receipt
   */
  async processReceipt(chainName, hash) {
    if (!this.clients[chainName]) {
      throw new Error(`Invalid chain name: ${chainName}`);
    }

    const publicClient = this.clients[chainName].public;
    
    console.log(`Waiting for transaction receipt on ${chainName}...`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Transaction confirmed with status: ${receipt.status}`);

    if (receipt.status !== 'success') {
      console.error('Transaction failed');
      return receipt;
    }

    try {
      // Parse event logs
      const eventLogs = parseEventLogs({
        abi: teleporterABI,
        logs: receipt.logs
      });

      // Find SendCrossChainMessage event
      const sendEvent = eventLogs.find(log => log.eventName === 'SendCrossChainMessage');
      
      if (sendEvent) {
        const messageID = sendEvent.args.messageID;
        console.log('\n=== SendCrossChainMessage Event ===');
        console.log(`Message ID: ${messageID}`);
        console.log(`Destination Chain: ${sendEvent.args.destinationBlockchainID}`);
        console.log(`Destination Address: ${sendEvent.args.message.destinationAddress}`);
        
        // Log gas and fee information
        console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
        if (receipt.effectiveGasPrice) {
          const gasCost = receipt.gasUsed * receipt.effectiveGasPrice;
          console.log(`Gas Cost: ${gasCost.toString()} wei`);
        }
        
        return { receipt, event: sendEvent };
      } else {
        console.log('SendCrossChainMessage event not found in logs');
        return { receipt };
      }
    } catch (error) {
      console.error('Error processing logs:', error);
      return { receipt, error };
    }
  }
}