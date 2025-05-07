import { createPublicClient, http } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { teleporterABI } from './abis/teleporterABI.mjs';

// TeleporterMessenger contract (on Fuji C-Chain)
const TELEPORTER_MESSENGER_ADDRESS = '0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf';

// *** Updated receiver address on Fuji C-Chain ***
const RECEIVER_ADDRESS = '0xa0287d24a971a697187a6e8Fb2861624e5C510DA';

// Fuji testnet C-Chain public RPC
const CUSTOM_RPC_URL = 'https://api.avax-test.network/ext/bc/C/rpc';

const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(CUSTOM_RPC_URL),
});

async function monitorTeleporterMessages() {
  console.log(`🚀 Listening for ReceiveCrossChainMessage → ${RECEIVER_ADDRESS} on Fuji C-Chain`);

  const receiveEvent = teleporterABI.find(
    (item) => item.type === 'event' && item.name === 'ReceiveCrossChainMessage'
  );
  if (!receiveEvent) throw new Error('ReceiveCrossChainMessage event not found in ABI');

  publicClient.watchEvent({
    address: TELEPORTER_MESSENGER_ADDRESS,
    event: receiveEvent,
    onLogs(logs) {
      for (const log of logs) {
        const { messageID, sourceBlockchainID, deliverer, message: msgStruct } = log.args;
        const dest = msgStruct.destinationAddress;

        if (dest.toLowerCase() === RECEIVER_ADDRESS.toLowerCase()) {
          const raw = msgStruct.message;
          const decoded = Buffer.from(raw.slice(2), 'hex').toString();

          console.log('--- ReceiverOnFuji received a cross-chain message ---');
          console.log('Message ID:         ', messageID);
          console.log('Source Chain ID:    ', sourceBlockchainID);
          console.log('Relayer (deliverer):', deliverer);
          console.log('Destination Address:', dest);
          console.log('Raw Payload Bytes:  ', raw);
          console.log('Decoded Message:    ', decoded);
          console.log('-------------------------------------------------------');
        }
      }
    },
  });
}

monitorTeleporterMessages().catch(console.error);