import { config } from "dotenv";
import { AvalancheSDK } from "./lib/avalanche-js.mjs";
import { avalancheFuji, dispatchL1 } from "./lib/chains.mjs"; // Import chain objects

config(); // Load .env variables

async function main() {
    const sdk = new AvalancheSDK();
    const recipientAddress = '0x89516a552b4eded87811a4c38e888a21942b9dfc';

    // Test sending message from Fuji to DispatchL1
    try {
        console.log("\n=== Sending message from Fuji to DispatchL1 ===");
        const fujiToDispatch = await sdk.sendMessage(
            avalancheFuji,      // Pass Fuji chain object
            dispatchL1,         // Pass DispatchL1 chain object
            "Hello from Fuji to DispatchL1 via Teleporter!",
            recipientAddress
        );

        console.log("\n--- Fuji to DispatchL1 Message Sent ---");
        console.log("Transaction Hash:", fujiToDispatch.hash);
        console.log("Source Chain:", fujiToDispatch.sourceChainName); // Updated to sourceChainName

        // Wait a bit before sending the next message
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log("\n=== Sending message from DispatchL1 to Fuji ===");
        const dispatchToFuji = await sdk.sendMessage(
            dispatchL1,         // Pass DispatchL1 chain object
            avalancheFuji,      // Pass Fuji chain object
            "Hello from DispatchL1 to Fuji via Teleporter!",
            recipientAddress
        );

        console.log("\n--- DispatchL1 to Fuji Message Sent ---");
        console.log("Transaction Hash:", dispatchToFuji.hash);
        console.log("Source Chain:", dispatchToFuji.sourceChainName); // Updated to sourceChainName

    } catch (err) {
        console.error("\n--- Error Sending Message ---");
        console.error("Error:", err.message);
        if (err.stack) {
            console.error("Stack:", err.stack);
        }
        if (err.cause) {
            console.error("Cause:", err.cause);
        }
    }
}

main().catch((err) => {
    console.error("Unhandled error in main execution:", err);
}); 