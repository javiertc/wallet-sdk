import { config } from "dotenv";
import { ICTT } from "./ictt-js.mjs";

config(); // loads environment variables from .env

async function main() {
  const icttClient = new ICTT({
    chainName: process.env.CHAIN_NAME || "avalancheFuji",
    privateKey: process.env.PRIVATE_KEY, // 0x...
    erc20Contract: process.env.ERC20_CONTRACT_ADDRESS,
    tokenHomeContract: process.env.TOKEN_HOME_CONTRACT,
    tokenRemoteContract: process.env.TOKEN_REMOTE_CONTRACT,
    destinationChainId: process.env.DESTINATION_CHAIN_ID,
    gasLimit: 250000,
    feeReceiver: "0x0000000000000000000000000000000000000000",
  });

  try {
    const amount = process.env.AMOUNT;   // "20000000000000000000"
    const recipient = process.env.RECIPIENT;

    if (!amount || !recipient) {
      throw new Error("AMOUNT and RECIPIENT environment variables must be set");
    }

    // Single call to approve + send tokens cross-chain
    const { approveTxHash, sendTxHash } = await icttClient.sendTokenCrossChain(recipient, amount);

    console.log("approveTxHash:", approveTxHash);
    console.log("sendTxHash:", sendTxHash);
  } catch (err) {
    console.error("Error during cross-chain token send:", err);
  }
}

main().catch((err) => {
  console.error("Unhandled error in main function:", err);
});