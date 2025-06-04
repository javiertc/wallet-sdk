import { config } from "dotenv";
import { AvalancheSDK } from "./lib/avalanche-js.mjs";
import { avalancheFuji, dispatchL1 } from './lib/chains.mjs';

config();

async function main() {
  console.log("🚀 Starting ERC20 Token Deployment and Bridging Process...");
  const avalancheSDK = new AvalancheSDK();

  const recipientAddressOnL1 = "0x8ae323046633A07FB162043f28Cea39FFc23B50A";
  const amountToTransfer = 1;

  try {
    await avalancheSDK.createAccount(avalancheFuji);
    
    const erc20ToDeploy = {
      name: 'Summit 2025',
      symbol: 'S2025',
      totalSupply: 1_000_000,
    };

    console.log(`   Deploying ${erc20ToDeploy.symbol} token on Fuji...`);
    const token = await avalancheSDK.createErc20(erc20ToDeploy);
    console.log(`✅ ${erc20ToDeploy.symbol} deployed on Fuji: ${token.address}`);

    const teleporterAddresses = {
      sourceRegistry: avalancheFuji.contracts.teleporterRegistry.address,
      destinationRegistry: dispatchL1.contracts.teleporterRegistry.address 
    };

    console.log(`\n   Bridging ${amountToTransfer} ${erc20ToDeploy.symbol} from Fuji to Dispatch L1 for ${recipientAddressOnL1}...`);
    const result = await avalancheSDK.bridgeErc20ToL1(
      avalancheFuji,
      dispatchL1,
      token.address,
      teleporterAddresses,
      recipientAddressOnL1,
      amountToTransfer
    );

    console.log("\n🎉 --- Full Bridging Process Complete --- 🎉");
    console.log(`   TokenHome on Fuji:      ${result.tokenHomeAddress}`);
    console.log(`   TokenRemote on Dispatch L1: ${result.tokenRemoteAddress}`);
    console.log(`   Approve Tx (Fuji):      ${result.transferApproveTxHash}`);
    console.log(`   Send Tx (Fuji):         ${result.transferSendTxHash}`);

  } catch (err) {
    console.error("\n🛑 --- Error in Bridging Process --- 🛑");
    console.error("   Error:", err.message);
    if (err.cause) {
      console.error("   Cause:", err.cause);
    }
    // Consider re-throwing or exiting if it's a fatal script error
    // process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n🛑 --- Unhandled Top-Level Error --- 🛑");
  console.error("   Error:", err.message);
  console.error("   Stack:", err.stack);
  process.exit(1);
});

