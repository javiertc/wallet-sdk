import { createPublicClient, http, decodeAbiParameters, parseAbiParameters } from 'viem';
import { encodeAbiParameters, encodePacked, hexToBytes } from 'viem';
import { parseEther } from 'viem/utils';
import { avalancheFuji } from 'viem/chains';
import { teleporterABI } from './abis/teleporterABI.mjs';

// TeleporterMessenger contract address on Fuji C-Chain
const TELEPORTER_MESSENGER_ADDRESS = '0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf';

// Fuji testnet C-Chain public RPC
const CUSTOM_RPC_URL = 'https://damp-tiniest-waterfall.avalanche-testnet.quiknode.pro/168b44f55f10444779c59cc2e1aba64c943c9cb0/ext/bc/C/rpc/';

const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(CUSTOM_RPC_URL),
});

// Define the ABI type for decoding the message
const messageAbi = parseAbiParameters('string');

function decodeMessage(encodedMessage) {
  try {
    const [decodedMessage] = decodeAbiParameters(messageAbi, encodedMessage);
    return decodedMessage;
  } catch (error) {
    console.error('Failed to decode message:', error);
    return null;
  }
}

async function listenToAllTeleporterEvents() {
  console.log(`🚀 Listening for all events from TeleporterMessenger on Fuji C-Chain`);

  try {
    const unwatch = publicClient.watchContractEvent({
      address: TELEPORTER_MESSENGER_ADDRESS,
      abi: teleporterABI,
      onLogs: (logs) => {
        for (const log of logs) {
          console.log('--- New Event Received ---');
          console.log('Event Name: ', log.eventName);
          console.log('Event Args: ', log.args);
      
          if (log.eventName === 'ReceiveCrossChainMessage') {
            // Decode the message for ReceiveCrossChainMessage events
            const encodedMessage = log.args.message.message;
            // Encode the message
            const decodedMessage = decodeMessage(encodedMessage);
            console.log('Decoded Message:', decodedMessage);
          } else {
            console.log('No message to decode for this event.');
          }
      
          console.log('Transaction Hash: ', log.transactionHash);
          console.log('Block Number: ', log.blockNumber);
          console.log('-------------------------------------------------------');
        }
      },
      onError: (error) => {
        console.error('Error in event listener:', error);
      },
    });

    // Keep the process alive and handle termination
    process.on('SIGINT', () => {
      console.log('Stopping event listener...');
      unwatch();
      process.exit(0);
    });

    console.log('Press Ctrl+C to stop listening');
  } catch (error) {
    console.error('Failed to start event listener:', error);
  }
}

// Start the listener
listenToAllTeleporterEvents();