import {
    createPublicClient, http, decodeEventLog, decodeAbiParameters,
    hexToBytes, bytesToHex, parseAbiParameters // Keep parseAbiParameters if needed elsewhere, though not for inner message decoding here
  } from 'viem';
  import { avalancheFuji } from 'viem/chains';
  
  // --- Import ABIs ---
  // Make sure this path is correct
  import { teleporterABI } from './abis/teleporterABI.mjs'; // ABI for the Teleporter contract
  
  // --- Configuration ---
  // TeleporterMessenger contract address on Fuji C-Chain 
  const TELEPORTER_MESSENGER_ADDRESS = '0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf';
  
  // Fuji testnet C-Chain public RPC
  // Replace with your own reliable RPC endpoint if needed
  // const CUSTOM_RPC_URL = 'https://api.avax-test.network/ext/bc/C/rpc'; // Default public RPC
  const CUSTOM_RPC_URL = 'https://damp-tiniest-waterfall.avalanche-testnet.quiknode.pro/168b44f55f10444779c59cc2e1aba64c943c9cb0/ext/bc/C/rpc/'; // <<< UPDATED QuikNode URL
  
  // --- Client Setup ---
  // Note: This client is still configured for Fuji. If the address 0xF7... is on a different
  // chain than the RPC URL connects to, the listener won't work correctly.
  // Ensure CUSTOM_RPC_URL points to the chain where 0xF7... is deployed.
  const publicClient = createPublicClient({
    chain: avalancheFuji, // Ensure this matches the chain of TELEPORTER_MESSENGER_ADDRESS
    transport: http(CUSTOM_RPC_URL),
  });
  
  // --- Inner Message Decoding Logic ---
  
  // Define ABIs for different inner message types received by destination contracts
  // These are used when decoding the payload within ReceiveCrossChainMessage events
  // emitted by the *destination* Teleporter (e.g., 0x25...).
  // This map might be less relevant if listening only to the source Teleporter (0xF7...)
  // as it primarily emits SendCrossChainMessage, not ReceiveCrossChainMessage.
  const innerMessagePayloadABIs = {
    // Type 32: RegisterRemote (commonly used structure)
    32: [
      { type: 'bytes32', name: 'remoteBlockchainID' },
      { type: 'address', name: 'remoteTokenTransferrerAddress' }
    ],
    // Type 1: Example for TransferTokensWithPayload (structure depends on implementation)
    1: [
        { type: 'address', name: 'recipient' },
        { type: 'uint256', name: 'amount' },
        { type: 'bytes', name: 'payload' } // Example, might just be recipient/amount
    ],
    // Type 2: TransferTokens (Hypothesized structure based on observed data)
    2: [
        { type: 'bytes32', name: 'destinationBlockchainID_inner' }, // Naming to avoid clash with outer args
        { type: 'address', name: 'destinationAddress_inner' },
        { type: 'address', name: 'tokenAddress' },
        { type: 'address', name: 'recipient' },
        { type: 'uint256', name: 'amount' }
    ]
    // Add other known message types and their payload structures here
  };
  
  /**
   * Decodes the inner message payload from a ReceiveCrossChainMessage event.
   * Determines the payload structure based on the first byte (messageType).
   * @param {string} messageHex - The hexadecimal string of the inner message payload.
   * @returns {object} An object containing the decoded parameters or an error object.
   */
  function decodeInnerMessage(messageHex) {
    // This function is primarily useful when decoding ReceiveCrossChainMessage events.
    // If listening to the source Teleporter (0xF7...), this might not be called often.
    try {
      // Ensure messageHex is a valid hex string
      if (!messageHex || !messageHex.startsWith('0x')) {
          return { error: 'Invalid messageHex format', rawMessageHex: messageHex };
      }
      // Decode the first byte to get the messageType
      const [messageType] = decodeAbiParameters(
        [{ type: 'uint8', name: 'messageType' }],
        messageHex // Decode from the beginning
      );
      const type = Number(messageType);
  
      // Look up the specific payload structure for this type
      const payloadAbiDefinition = innerMessagePayloadABIs[type];
  
      if (!payloadAbiDefinition) {
        // Fallback if the type is unknown: decode the rest as generic bytes
        console.warn(`Listener: No specific payload ABI found for inner message type ${type}. Decoding remaining data as generic bytes.`);
        try {
            // Define the structure as type + rest_as_bytes
            const [decodedType, payloadBytes] = decodeAbiParameters(
                [ { type: 'uint8', name: 'messageType' }, { type: 'bytes', name: 'payload' } ],
                messageHex
            );
            return {
                messageType: type,
                payload: bytesToHex(payloadBytes), // Convert the raw bytes payload back to hex
                decodingNote: 'Generic payload decoding due to unknown type.'
            };
        } catch(genericDecodeError){
             return { error: `Failed to decode inner message type ${type} with generic fallback: ${genericDecodeError.message}`, rawMessageHex: messageHex };
        }
      }
  
      // Construct the full ABI for the inner message (type + specific payload)
       const fullAbiDefinition = [
         { type: 'uint8', name: 'messageType' },
         ...payloadAbiDefinition // Spread the specific payload parts
       ];
  
      // Decode the entire inner message hex using the constructed ABI
      const decodedParams = decodeAbiParameters(fullAbiDefinition, messageHex);
  
      // Structure the result into a readable object using ABI names
      const result = {};
      fullAbiDefinition.forEach((param, index) => {
        // Convert BigInts to strings for easier handling/logging
        result[param.name] = typeof decodedParams[index] === 'bigint'
                              ? decodedParams[index].toString()
                              : decodedParams[index];
      });
      // Ensure messageType is a number
      result.messageType = type;
      return result;
  
    } catch (error) {
       // Handle errors during inner message decoding
       console.error(`Listener: Error decoding inner message: ${error.message}`);
       // Return specific error info if ABI definition exists but decoding failed
       const payloadAbiDefinition = innerMessagePayloadABIs[Number(messageHex.substring(0,4), 16)] ?? null; // Attempt to get type if possible
       if (payloadAbiDefinition) {
           return { error: `Failed to decode inner message with ABI for type ${Number(messageHex.substring(0,4), 16)}: ${error.message}`, rawMessageHex: messageHex };
       } else {
           return { error: `Failed to decode inner message: ${error.message}`, rawMessageHex: messageHex };
       }
    }
  }
  
  
  // --- Event Listener Function ---
  
  async function listenToAllTeleporterEvents() {
    console.log(`🚀 Listening for all events from TeleporterMessenger (${TELEPORTER_MESSENGER_ADDRESS}) on Fuji C-Chain...`);
    console.log(`(Using RPC URL: '${CUSTOM_RPC_URL}')`); // Updated log message
  
  
    try {
      // Start watching for events
      const unwatch = publicClient.watchContractEvent({
        address: TELEPORTER_MESSENGER_ADDRESS,
        abi: teleporterABI, // Use the imported Teleporter ABI
        poll: true, // Use polling (adjust interval if needed, default is 4s)
        pollingInterval: 5000, // Poll every 5 seconds (example)
        onLogs: (logs) => {
          console.log(`\n=== Found ${logs.length} new log(s) ===`);
          for (const log of logs) {
            // Use try/catch for safety around potential bigint issues in args before stringify
            let argsString = 'Error stringifying args';
            try {
               argsString = JSON.stringify(log.args, (key, value) =>
                  typeof value === 'bigint' ? value.toString() : value // Convert BigInts before logging
               , 2);
            } catch (stringifyError) {
               console.error("Error converting log args to string:", stringifyError);
            }
  
            console.log('--- Event Received ---');
            console.log('Event Name: ', log.eventName);
            // Log SendCrossChainMessage details (most common from source Teleporter)
            if(log.eventName === 'SendCrossChainMessage') {
                console.log('SendCrossChainMessage Args: ', argsString);
            } else {
                console.log('Args: ', argsString); // Log args for other events
            }
  
  
            // Inner message decoding is only relevant for ReceiveCrossChainMessage
            // which is typically emitted by the *destination* Teleporter, not the source one (0xF7...).
            if (log.eventName === 'ReceiveCrossChainMessage') {
              console.warn("Received 'ReceiveCrossChainMessage' event. This is usually emitted by the destination Teleporter. Decoding inner message...");
              // Safely access the nested message property
              if (log.args && log.args.message && typeof log.args.message.message === 'string') {
                  const encodedMessage = log.args.message.message;
                  const decodedInnerMessage = decodeInnerMessage(encodedMessage);
                  console.log('Decoded Inner Message:', decodedInnerMessage);
              } else {
                  console.log('Could not find inner message payload (log.args.message.message) in ReceiveCrossChainMessage event.');
              }
            }
  
            console.log('Transaction Hash: ', log.transactionHash);
            console.log('Block Number: ', log.blockNumber?.toString()); // Safely convert potential BigInt
            console.log('-------------------------------------------------------');
          }
        },
        onError: (error) => {
          // Handle errors from the event watching process
          console.error('Error in watchContractEvent listener:', error);
          // Consider adding logic here to potentially restart the listener after a delay
        },
      });
  
      console.log('Listener started. Press Ctrl+C to stop.');
  
      // Graceful shutdown handler
      process.on('SIGINT', () => {
        console.log('\nSIGINT received. Stopping event listener...');
        unwatch(); // Call the unwatch function returned by watchContractEvent
        console.log('Listener stopped.');
        process.exit(0);
      });
  
      // Keep the script running indefinitely until interrupted
      // This prevents the script from exiting immediately after starting the listener
      await new Promise(() => {});
  
  
    } catch (error) {
      // Handle errors during the initial setup of the listener
      console.error('Failed to start event listener:', error);
    }
  }
  
  // --- Start the Listener ---
  listenToAllTeleporterEvents();
  