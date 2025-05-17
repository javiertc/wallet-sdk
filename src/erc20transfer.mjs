import { config } from "dotenv";
import { AvalancheSDK } from "./lib/avalanche-js.mjs";
import { avalancheFuji, dispatchL1 } from './lib/chains.mjs';

config(); // loads environment variables from .env

async function main() {
  const avalancheSDK = new AvalancheSDK();

  try {
    console.log("Setting up account on Fuji and deploying ERC20 token...");
    // Stage 0: Deploy ERC20 on Source Chain (Fuji)
    await avalancheSDK.createAccount(avalancheFuji); // Initialize account for Fuji

    const erc20Details = {
      name: 'PEPPECOIN',
      symbol: 'PEPE',
      totalSupply: 1_000_000, // Will be converted to Wei by SDK
      decimals: 18
    };

    const token = await avalancheSDK.createErc20({
      name: erc20Details.name,
      symbol: erc20Details.symbol,
      totalSupply: erc20Details.totalSupply,
      // decimals are handled within createErc20 which assumes 18, or could be added if createErc20 is made more flexible
    });

    console.log(`ERC20 (${erc20Details.symbol}) deployed on Fuji at: ${token.address}`);


    const teleporterAddresses = {
      sourceRegistry: avalancheFuji.contracts.teleporterRegistry.address, // Fuji official Teleporter Registry
      destinationRegistry: dispatchL1.contracts.teleporterRegistry.address // Dispatch L1 Teleporter Registry 
    };

    const recipientAddressOnL1 = "0x8ae323046633A07FB162043f28Cea39FFc23B50A";
    const amountToTransfer = "1"; // 1 full token

    console.log("\nStarting ERC20 bridging process...");
    const result = await avalancheSDK.bridgeErc20ToL1(
      avalancheFuji,
      dispatchL1,
      erc20Details, // Still needed for remote token name, symbol, decimals
      token.address, // Pass the deployed ERC20 address
      teleporterAddresses,
      recipientAddressOnL1, // Pass recipient address directly
      amountToTransfer // Pass amount directly
      // No transferOptions needed for now as we're using defaults from SDK
    );

    console.log("\n--- Full Bridging Process Complete ---");
    console.log("Deployed ERC20 on Fuji:", token.address);
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

