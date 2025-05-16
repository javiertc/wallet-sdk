import { config } from "dotenv";
import { AvalancheSDK } from "./lib/avalanche-js.mjs";
import { avalancheFuji } from 'viem/chains';
import { defineChain, createPublicClient, http, zeroAddress } from 'viem';
import { teleporterRegistryABI } from './abis/teleporterRegistryABI.mjs';

config(); // loads environment variables from .env

export const dispatchL1 = defineChain({
  id: 779672,
  name: 'Dispatch L1',
  nativeCurrency: {
    decimals: 18,
    name: 'DIS',
    symbol: 'DIS',
  },
  rpcUrls: {
    default: {
      http: ['https://subnets.avax.network/dispatch/testnet/rpc'],
    },
  },
  blockExplorers: {
    default: { name: 'Dispatch Explorer', url: 'https://subnets-test.avax.network/dispatch' },
  },
  testnet: true,
});
 
const gasLimit = 250000;
const feeReceiver = "0x0000000000000000000000000000000000000000";

async function main() {
    const avalancheSDK = new AvalancheSDK();

    const erc20Details = {
        name: 'JAVIERCOIN',
        symbol: 'JTC',
        totalSupply: 1_000_000, // Will be converted to Wei by SDK
        decimals: 18
    };

    const teleporterAddresses = {
        sourceRegistry: "0xF86Cb19Ad8405AEFa7d09C778215D2Cb6eBfB228", // Fuji official Teleporter Registry
        destinationRegistry: "0x083e276d96ce818f2225d901b44e358dcfc5d606"  // Dispatch L1 Teleporter Registry - VERIFY THIS IS INITIALIZED
    };

    // The recipient address on Dispatch L1 will be the same as the deployer/sender on Fuji for this example
    // For a real scenario, this would be a different user's address on the destination chain.
    // We will get the actual address after the SDK switches context to Dispatch L1 within bridgeErc20ToL1
    // and then use it if transferDetails.recipient is not explicitly set.
    // For now, let's set a placeholder or retrieve it if possible.
    
    // The SDK will attempt to fetch destinationBlockchainID. Provide a fallback if needed.
    // const dispatchL1BlockchainID_fallback = "0xYOUR_DISPATCH_L1_BLOCKCHAIN_ID_HEX"; // TODO: Find and fill if dynamic lookup fails

    const transferDetails = {
        // recipient will be set to the deployer's address on Dispatch L1 by default if not specified
        // recipient: "0xRECIPIENT_ADDRESS_ON_DISPATCH_L1", 
        amount: "1", // 1 full token
        // destinationBlockchainID: dispatchL1BlockchainID_fallback, // SDK will try to fetch this
        // gasLimit: optional, defaults in SDK
        // feeReceiver: optional, defaults in SDK to zeroAddress
    };

    try {
        console.log("Setting up account on Fuji and deploying ERC20 token...");
        // Stage 0: Deploy ERC20 on Source Chain (Fuji)
        await avalancheSDK.createAccount(avalancheFuji); // Initialize account for Fuji
        
        const erc20Deployment = await avalancheSDK.createErc20({
            name: erc20Details.name,
            symbol: erc20Details.symbol,
            totalSupply: erc20Details.totalSupply,
            // decimals are handled within createErc20 which assumes 18, or could be added if createErc20 is made more flexible
        });
        const fujiDeployedErc20Address = erc20Deployment.address;
        console.log(`ERC20 (${erc20Details.symbol}) deployed on Fuji at: ${fujiDeployedErc20Address}`);


        console.log("\nStarting ERC20 bridging process...");
        const result = await avalancheSDK.bridgeErc20ToL1(
            avalancheFuji,
            dispatchL1,
            erc20Details, // Still needed for remote token name, symbol, decimals
            fujiDeployedErc20Address, // Pass the deployed ERC20 address
            teleporterAddresses,
            transferDetails
        );

        console.log("\n--- Full Bridging Process Complete ---");
        console.log("Deployed ERC20 on Fuji:", fujiDeployedErc20Address); // Use the variable from above
        console.log("Deployed TokenHome on Fuji:", result.tokenHomeAddress);
        console.log("Deployed TokenRemote on Dispatch L1:", result.tokenRemoteAddress);
        console.log("Transfer Approve Tx Hash (Fuji):", result.transferApproveTxHash);
        console.log("Transfer Send Tx Hash (Fuji):", result.transferSendTxHash);

    } catch (err) {
        console.error("\n--- Error in Full Bridging Process ---");
        console.error("Error during end-to-end bridging operation:", err.message);
        if (err.cause) {
            console.error("Cause:", err.cause);
        }
    }
}

main().catch((err) => {
    console.error("Unhandled error in main execution:", err);
});

