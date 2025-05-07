import { config } from 'dotenv';
import { createPublicClient, createWalletClient, http, encodeAbiParameters, parseAbiParameters, parseEventLogs } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';
import { teleporterABI } from './abis/teleporterABI.mjs';

// Load environment variables
config();

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TELEPORTER_ADDRESS = process.env.TELEPORTER_ADDRESS;
const DESTINATION_CHAIN_ID = process.env.DESTINATION_CHAIN_ID;
const RECIPIENT = process.env.RECIPIENT;

// Source RPC URL for Fuji testnet C-Chain
const SOURCE_RPC_URL = 'https://api.avax-test.network/ext/bc/C/rpc';

// Setup Viem clients
const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(SOURCE_RPC_URL),
});

const account = privateKeyToAccount(PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: avalancheFuji,
  transport: http(SOURCE_RPC_URL),
});

// Utility function to send cross-chain message
async function sendCrossChainMessage(destinationAddress, message) {
  try {
    // Define TeleporterMessageInput struct
    const messageInput = {
      destinationBlockchainID: DESTINATION_CHAIN_ID,
      destinationAddress: destinationAddress,
      feeInfo: {
        feeTokenAddress: '0x0000000000000000000000000000000000000000', // No fee token
        amount: BigInt(0), // No fee amount
      },
      requiredGasLimit: BigInt(100000), // Gas limit for execution
      allowedRelayerAddresses: [], // No specific relayers
      message: encodeAbiParameters(parseAbiParameters('string'), [message]), // Encode the message
    };

    // Send the transaction using writeContract
    const hash = await walletClient.writeContract({
      address: TELEPORTER_ADDRESS,
      abi: teleporterABI,
      functionName: 'sendCrossChainMessage',
      args: [messageInput],
    });

    console.log(`Transaction sent: ${hash}`);
    return hash;
  } catch (error) {
    console.error('Error sending cross-chain message:', error.message);
    throw error;
  }
}

// Utility function to process transaction receipt and extract details
async function processTransactionReceipt(hash) {
  try {
    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Transaction confirmed: ${receipt.status}`);

    // Get transaction details
    const transaction = await publicClient.getTransaction({ hash });

    if (receipt.status === 'success') {
      // Parse event logs
      const eventLogs = parseEventLogs({
        abi: teleporterABI,
        logs: receipt.logs,
      });

      // Find SendCrossChainMessage event
      const sendEvent = eventLogs.find(log => log.eventName === 'SendCrossChainMessage');
      if (sendEvent) {
        const messageID = sendEvent.args.messageID;
        console.log(`Message ID: ${messageID}`);

        // Extract and print additional details, adjusting for nested destinationAddress
        const sourceAddress = transaction.from;
        const destinationAddress = sendEvent.args.message?.destinationAddress || 'Not found in expected structure';
        const nonce = transaction.nonce;
        const gasConsumed = receipt.gasUsed.toString();

        console.log(`Source Address: ${sourceAddress}`);
        console.log(`Destination Address: ${destinationAddress}`);
        console.log(`Nonce: ${nonce}`);
        console.log(`Gas Consumed: ${gasConsumed}`);

        // If destinationAddress is still undefined, inspect raw logs
        if (destinationAddress === 'Not found in expected structure') {
          console.log('Inspecting raw logs due to missing destinationAddress:');
          receipt.logs.forEach((log, index) => {
            console.log(`Log ${index}:`, { topics: log.topics, data: log.data });
          });
        }

        return messageID;
      } else {
        console.log('SendCrossChainMessage event not found. Raw logs:');
        receipt.logs.forEach((log, index) => {
          console.log(`Log ${index}:`, { topics: log.topics, data: log.data });
        });
      }
    } else {
      console.log('Transaction failed');
    }
  } catch (error) {
    console.error('Error processing transaction receipt:', error.message);
    throw error;
  }
}

// Main function to orchestrate the process
async function main(destinationAddress, message) {
  try {
    const hash = await sendCrossChainMessage(destinationAddress, message);
    await processTransactionReceipt(hash);
  } catch (error) {
    console.error('Error in main process:', error.message);
  }
}

// Example usage
const destinationAddress = "0xaa114bdfd995e0011bef6a9a0e3ddf164f033f85"; // Address on the destination chain
const message = "Hello, cross-chain world, This is Javier!"; // Arbitrary message

main(destinationAddress, message).catch(console.error);