import { config } from "dotenv";
import { AvalancheSDK } from "./lib/avalanche-js.mjs";
import { avalancheFuji, dispatchL1 } from './lib/chains.mjs';

config(); // loads environment variables from .env

async function main() {
  const avalancheSDK = new AvalancheSDK();

  const recipientAddressOnL1 = "0x8ae323046633A07FB162043f28Cea39FFc23B50A";
  const amountToTransfer = 1; // Changed to number: 1 full token

  try {
    console.log("Setting up account on Fuji and deploying ERC20 token...");
    // Stage 0: Deploy ERC20 on Source Chain (Fuji)
    await avalancheSDK.createAccount(avalancheFuji); // Initialize account for Fuji
    
  const tokenAddress = "0x51e039bcb65b25290a3e8a2129fa95b9ee372279";

    const teleporterAddresses = {
      sourceRegistry: avalancheFuji.contracts.teleporterRegistry.address, // Fuji official Teleporter Registry
      destinationRegistry: dispatchL1.contracts.teleporterRegistry.address // Dispatch L1 Teleporter Registry 
    };

    console.log("\nStarting ERC20 bridging process...");
    const result = await avalancheSDK.bridgeErc20ToL1(
      avalancheFuji,
      dispatchL1,
      tokenAddress, // Pass the deployed ERC20 address
      teleporterAddresses,
      recipientAddressOnL1,
      amountToTransfer // Pass amount directly
      // No transferOptions needed for now as we're using defaults from SDK
    );

    console.log("\n--- Full Bridging Process Complete ---");
    console.log("Deployed ERC20 on Fuji:", tokenAddress);
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

