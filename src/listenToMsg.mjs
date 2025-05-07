import { createPublicClient, http } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { teleporterABI } from './abis/teleporterABI.mjs';

// TeleporterMessenger contract address
const TELEPORTER_MESSENGER_ADDRESS = '0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf';
// Receiver contract address to filter for
const RECEIVER_ADDRESS = '0xaa114bdfd995e0011bef6a9a0e3ddf164f033f85';

// Custom RPC endpoint
const CUSTOM_RPC_URL = 'https://3.90.156.8.nip.io/ext/bc/2u5zKRAJ3iMsGMMJQTz97okfZkW2tU6Un3LSeJZ7n9Gntdt2RR/rpc';

// Setup Viem public client with custom RPC
const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(CUSTOM_RPC_URL),
});

// Function to monitor the ReceiveCrossChainMessage event using imported ABI
async function monitorTeleporterMessages() {
  console.log(`Monitoring ReceiveCrossChainMessage events for receiver ${RECEIVER_ADDRESS} using custom RPC...`);

  // Find the ReceiveCrossChainMessage event in the ABI
  const receiveEvent = teleporterABI.find(item => item.name === 'ReceiveCrossChainMessage' && item.type === 'event');
  if (!receiveEvent) {
    throw new Error('ReceiveCrossChainMessage event not found in ABI');
  }

  // Watch for the ReceiveCrossChainMessage event
  publicClient.watchEvent({
    address: TELEPORTER_MESSENGER_ADDRESS,
    event: receiveEvent,
    onLogs: (logs) => {
      logs.forEach(log => {
        const destinationAddress = log.args.message.destinationAddress;
        if (destinationAddress.toLowerCase() === RECEIVER_ADDRESS.toLowerCase()) {
          console.log('Received message for ReceiverOnSubnet:');
          console.log('Message ID:', log.args.messageID);
          console.log('Source Blockchain ID:', log.args.sourceBlockchainID);
          console.log('Deliverer:', log.args.deliverer);
          console.log('Destination Address:', destinationAddress);
          console.log('Message Content:', log.args.message.message);
          console.log('Decoded Message:', Buffer.from(log.args.message.message.slice(2), 'hex').toString());
        }
      });
    },
  });
}

// Start monitoring
monitorTeleporterMessages().catch(console.error);