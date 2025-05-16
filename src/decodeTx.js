import { createPublicClient, http, decodeEventLog, decodeAbiParameters, bytesToHex, parseAbi } from 'viem';
import { avalancheFuji } from 'viem/chains';
import { teleporterABI } from './abis/teleporterABI.mjs'; // ABI for the Teleporter contract (used on both source and destination)
import { tokenHomeABI } from './abis/tokenHomeABI.mjs';   // ABI for the receiving contract (TokenHome on destination)

// Define a standard ERC20 ABI using viem's parseAbi utility
const standardErc20ABI = parseAbi([
  // Common Events needed for decoding logs
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
  // You can add function signatures here if you need to interact with the contract,
  // but they aren't strictly necessary just for decoding Transfer/Approval events.
]);
// --- End Import ABIs ---


// Mapping of contract addresses to their ABIs
const abiMap = {
  // Teleporter contract address on the DESTINATION chain (Fuji in this example)
  '0x253b2784c75e510dd0ff1da844684a1ac0aa5fcf': teleporterABI,
  // Receiving contract address on the DESTINATION chain
  '0x71e62b9792e8e79d1aec8203a137b33b1f7157d9': tokenHomeABI,

  '0x0d89bfcae286ba3a99f8e98574869e69fcbe1147': tokenHomeABI,

  '0x665c66454d15baf533581b7f2045f36bb0f006fa': tokenHomeABI, // <<< ADDED THIS LINE

  // Teleporter contract address on the SOURCE chain (Emits SendCrossChainMessage)
  '0xf7cbd95f1355f0d8d659864b92e2e9fbfab786f7': teleporterABI,    // <<< USING teleporterABI
  // ERC20 Token contract address (involved in the transfer)
  '0x6f419e35a60439569640ca078ba5e86599e30cc6': standardErc20ABI, // <<< USING standardErc20ABI defined via parseAbi
};

const client = createPublicClient({
  chain: avalancheFuji,
  transport: http('https://api.avax-test.network/ext/bc/C/rpc') // Ensure this RPC is reliable
});

// Define ABIs for different inner message types for the RECEIVING side (TokenHome)
// These are used when decoding ReceiveCrossChainMessage events from the Teleporter (0x253b...)
const innerMessagePayloadABIs = {
  // Type 32: RegisterRemote (from your first example)
  32: [
    { type: 'bytes32', name: 'remoteBlockchainID' },
    { type: 'address', name: 'remoteTokenTransferrerAddress' }
  ],
  // Type 1: Example for TransferTokensWithPayload (VERIFY THIS STRUCTURE with your TokenHome contract)
  1: [
      { type: 'address', name: 'recipient' },
      { type: 'uint256', name: 'amount' },
      { type: 'bytes', name: 'payload' } // Assuming it includes a payload field
  ],
  // Add other known message types received by TokenHome here
};

// Function to decode the inner message of ReceiveCrossChainMessage
// This function remains the same - it decodes the message payload based on its first byte (type)
// It's only relevant when a ReceiveCrossChainMessage event is found in the logs (usually from 0x253b...).
function decodeInnerMessage(messageHex) {
  try {
    // Decode the first byte to get the messageType
    const [messageType] = decodeAbiParameters(
      [{ type: 'uint8', name: 'messageType' }],
      messageHex
    );
    const type = Number(messageType);

    // Look up the specific payload structure for this type
    const payloadAbiDefinition = innerMessagePayloadABIs[type];

    if (!payloadAbiDefinition) {
      // Fallback if the type is unknown
      console.warn(`No specific payload ABI found for inner message type ${type}. Decoding remaining data as generic bytes.`);
      try {
          const [decodedType, payloadBytes] = decodeAbiParameters(
              [ { type: 'uint8', name: 'messageType' }, { type: 'bytes', name: 'payload' } ],
              messageHex
          );
          return {
              messageType: type,
              payload: bytesToHex(payloadBytes),
              decodingNote: 'Generic payload decoding due to unknown type.'
          };
      } catch(genericDecodeError){
           return { error: `Failed to decode inner message type ${type} with generic fallback: ${genericDecodeError.message}`, rawMessageHex: messageHex };
      }
    }

    // Construct the full ABI for the inner message (type + specific payload)
     const fullAbiDefinition = [
       { type: 'uint8', name: 'messageType' },
       ...payloadAbiDefinition
     ];

    // Decode the entire inner message hex using the constructed ABI
    const decodedParams = decodeAbiParameters(fullAbiDefinition, messageHex);

    // Structure the result into an object
    const result = {};
    fullAbiDefinition.forEach((param, index) => {
      result[param.name] = decodedParams[index];
    });
    result.messageType = Number(result.messageType); // Ensure type is number
    return result;

  } catch (error) {
     // Handle errors during inner message decoding
     return { error: `Failed to decode inner message: ${error.message}`, rawMessageHex: messageHex };
  }
}


// Main function to decode events from a transaction hash
async function decodeEventsFromTx(txHash) {
  try {
    console.log(`Fetching receipt for tx: ${txHash}...`);
    // Ensure the client is connected to the correct chain for the given txHash
    const receipt = await client.getTransactionReceipt({ hash: txHash });

    // Handle cases where receipt is not found or has no logs
    if (!receipt) {
        console.error(`No receipt found for transaction hash: ${txHash}. (Check explorer/RPC and client chain)`);
        return [];
    }
    if (!receipt.logs || receipt.logs.length === 0) {
        console.warn(`Receipt found for ${txHash}, but it contains no logs.`);
        return [];
    }
    console.log(`Found ${receipt.logs.length} logs for tx: ${txHash}. Decoding...`);

    // Process each log in the receipt
    const decodedEvents = receipt.logs.map((log, index) => {
      const lowerCaseAddress = log.address.toLowerCase();
      const abi = abiMap[lowerCaseAddress]; // Look up ABI using lowercase address

      // If no ABI is found in our map for this contract address
      if (!abi) {
        return {
            info: `No ABI provided for contract ${log.address}`,
            rawLog: log,
            logIndex: index
        };
      }

      // Try to decode the log using the found ABI
      try {
        const decoded = decodeEventLog({
          abi,
          data: log.data,
          topics: log.topics
        });

        // Special handling if this log is a ReceiveCrossChainMessage from the DESTINATION Teleporter (0x253b...)
        if (lowerCaseAddress === '0x253b2784c75e510dd0ff1da844684a1ac0aa5fcf' && decoded.eventName === 'ReceiveCrossChainMessage') {
             if (decoded.args && decoded.args.message && typeof decoded.args.message.message === 'string') {
                const messageHex = decoded.args.message.message;
                // Decode the nested message payload
                const decodedInnerMessage = decodeInnerMessage(messageHex);
                console.log(`Log ${index}: Decoded ReceiveCrossChainMessage with inner message.`);
                return {
                  eventName: decoded.eventName,
                  contractAddress: log.address,
                  args: decoded.args,
                  decodedInnerMessage, // Include the detailed decoded inner message
                  logIndex: index
                };
             } else {
                // Handle cases where the expected structure isn't present
                console.warn(`Log ${index}: ReceiveCrossChainMessage structure invalid.`);
                return {
                  eventName: decoded.eventName,
                  contractAddress: log.address,
                  args: decoded.args,
                  error: "Could not find 'message.message' structure in ReceiveCrossChainMessage args.",
                  logIndex: index
                };
            }
        }
        // Events from the SOURCE Teleporter (0xf7...) like SendCrossChainMessage, MessageSent, etc.
        // or events from TokenHome (0x71...) like MessageExecuted, RemoteRegistered, etc.
        // or events from the ERC20 contract (0x6f...) like Transfer
        // will be decoded here using their respective ABIs from abiMap.
        return {
          eventName: decoded.eventName,
          contractAddress: log.address, // Added address for clarity
          args: decoded.args,
          logIndex: index
        };
      } catch (error) {
        // Handle errors during log decoding (e.g., ABI mismatch for a specific event signature)
        const shortMessage = error.message.split('\n')[0]; // Get first line of error
        // Check if the error is specifically about ABI mismatch for the event
        if (error.name === 'DecodeLogDataMismatch' || error.name === 'DecodeLogTopicsMismatch') {
             console.error(`Log ${index}: ABI found for ${log.address}, but it doesn't match the event signature (Topic0: ${log.topics[0]}): ${shortMessage}`);
             return {
                error: `ABI found for ${log.address} but it doesn't match event signature at index ${index} (Topic0: ${log.topics[0]})`,
                rawLog: log,
                logIndex: index
             };
        } else {
            // Handle other potential decoding errors
            console.error(`Log ${index}: Failed to decode log from ${log.address} (Topic0: ${log.topics[0]}): ${shortMessage}`);
            return {
                error: `Failed to decode log at index ${index} from ${log.address} (Topic0: ${log.topics[0]}): ${shortMessage}`,
                rawLog: log,
                logIndex: index
            };
        }
      }
    });
    console.log(`Decoding finished for tx: ${txHash}`);
    return decodedEvents;
  } catch (error) {
    // Handle errors fetching the receipt or other major issues
    console.error(`Error fetching or processing receipt for tx ${txHash}: ${error.message}`);
    return { error: `Failed to process transaction ${txHash}: ${error.message}` };
  }
}

// --- Example Usage ---

// Transaction Hash for the RegisterRemote scenario (destination chain tx, likely involves 0x253b... emitting ReceiveCrossChainMessage)
// const txHash = '0x45608677ac59d0fc09333f1dbf152a39a6f4c4ffa775a22e690bb486a9f13d90';

// Transaction Hash for the Token Transfer initiation (source chain tx, likely involves 0xf7... emitting SendCrossChainMessage)
// const txHash = '0x45608677ac59d0fc09333f1dbf152a39a6f4c4ffa775a22e690bb486a9f13d90';
const txHash = '0x531a48e36cb0c118462952c85d8c65e49c99cb71d5a958ec6bd975a5eae8c7bf';


// Execute the decoding function and print the results
decodeEventsFromTx(txHash).then(events => {
  console.log(JSON.stringify(events, (key, value) =>
    // Custom replacer function to convert BigInts to strings for JSON compatibility
    typeof value === 'bigint' ? value.toString() : value
  , 2)); // Pretty print with 2 spaces indentation
}).catch(err => {
    // Catch errors from the promise chain itself (e.g., network issues in decodeEventsFromTx)
    console.error("Fatal Error during event decoding process:", err);
});
