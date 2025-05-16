// main.js
import { config } from 'dotenv';
import { IcmSDK } from './lib/icm-js.mjs';
import { avalancheFuji } from 'viem/chains';

// Load environment variables
config();

// Validate required environment variables
function validateEnvVariables() {
  const required = ['PRIVATE_KEY', 'TELEPORTER_ADDRESS', 'COFFEE_BLOCKCHAIN_ID', 'COFFEE_EVM_CHAIN_ID', 'COFFEE_RPC_URL'];
  
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`Missing required environment variable: ${key}`);
      process.exit(1);
    }
  }
  
  // Check for Fuji blockchain ID specifically
  if (!process.env.FUJI_BLOCKCHAIN_ID) {
    console.error('Missing FUJI_BLOCKCHAIN_ID in environment variables');
    console.error('Please add FUJI_BLOCKCHAIN_ID to your .env file');
    process.exit(1);
  }
}

// Validate environment variables before proceeding
validateEnvVariables();

// Define chain configurations
const chainConfigs = {
  fuji: {
    chain: avalancheFuji,
    blockchainId: process.env.FUJI_BLOCKCHAIN_ID,
  },
  coffee: {
    chain: {
      id: Number(process.env.COFFEE_EVM_CHAIN_ID),
      name: 'coffee',
      rpcUrls: { default: { http: [process.env.COFFEE_RPC_URL] } },
      nativeCurrency: { name: 'COFFEE', symbol: 'COFFEE', decimals: 18 },
    },
    blockchainId: process.env.COFFEE_BLOCKCHAIN_ID,
  },
};

// Initialize the SDK
const icm = new IcmSDK(
  process.env.PRIVATE_KEY,
  process.env.TELEPORTER_ADDRESS,
  "0x8cbfd85f0360812c97a9cd2d02d1da6f7d9f15c2", // Recipient address
  chainConfigs
);

// Send a message and process the receipt
async function main() {
  try {
    console.log("Sending message from Coffee to Fuji...");
    const { hash, sourceChain } = await icm.sendMessage('coffee', 'fuji', 'Hello from fuji, by Angela again!');
    console.log(`Message sent with transaction hash: ${hash}`);
    await icm.processReceipt(sourceChain, hash);
  } catch (error) {
    console.error("Error during message sending:", error.message);
  }
}

main().catch(console.error);