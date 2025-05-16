import { createPublicClient, http, decodeEventLog, decodeAbiParameters, bytesToHex, parseAbi } from 'viem';
import { avalanche } from 'viem/chains';
import { teleporterABI } from './abis/teleporterABI.mjs'; // ABI for the Teleporter Messenger contract
import { tokenHomeABI } from './abis/tokenHomeABI.mjs';   // ABI for TokenHome
import { warpPrecompileABI } from './abis/warpPrecompileABI.mjs'; // ABI for the Warp Precompile (SendWarpMessage)

// Define a standard ERC20 ABI using viem's parseAbi utility
const standardErc20ABI = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
]);

// Minimal ABI for a common Deposit event pattern
const minimalDepositABI = parseAbi([
  'event Deposit(address indexed depositor, uint256 amount)' // Assuming one indexed address
]);

// --- End Import ABIs ---

const ERC20_TRANSFER_EVENT_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const REGISTER_REMOTE_SIGNATURE = '0xf229b02a51a4c8d5ef03a096ae0dd727d7b48b710d21b50ebebb560eef739b90'; // Likely MessageExecuted from TokenHome
const TOKENS_SENT_EVENT_SIGNATURE = '0x93f19bf1ec58a15dc643b37e7e18a1c13e85e06cd11929e283154691ace9fb52'; // From TokenHome
const SEND_WARP_MESSAGE_SIGNATURE = '0x56600c567728a800c0aa927500f831cb451df66a7af570eb4df4dfbf4674887d';  // Signature for SendWarpMessage(address indexed recipient, bytes32 indexed messageID, bytes message) This is emitted by the Warp Precompile (0x020...005)
const TOKENS_AND_CALL_SENT_SIGNATURE = '0x5d76dff81bf773b908b050fa113d39f7d8135bb4175398f313ea19cd3a1a0b16'; // From TokenHome (TokensAndCallSent)
const ERC20_APPROVAL_EVENT_SIGNATURE = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925'; // ERC20 Approval
const DEPOSIT_EVENT_SIGNATURE = '0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c'; // Common Deposit event

// Mapping of event signatures to their ABIs and a descriptive type
const eventSignatureToAbi = {
  [ERC20_TRANSFER_EVENT_SIGNATURE]: { abi: standardErc20ABI, type: 'ERC20 Transfer' },
  [ERC20_APPROVAL_EVENT_SIGNATURE]: { abi: standardErc20ABI, type: 'ERC20 Approval' },
  [DEPOSIT_EVENT_SIGNATURE]: { abi: minimalDepositABI, type: 'Deposit' },
  [REGISTER_REMOTE_SIGNATURE]: { abi: tokenHomeABI.abi, type: 'TokenHome MessageExecuted (or similar)' },
  [TOKENS_SENT_EVENT_SIGNATURE]: { abi: tokenHomeABI.abi, type: 'TokenHome TokensSent' },
  [SEND_WARP_MESSAGE_SIGNATURE]: { abi: warpPrecompileABI, type: 'SendWarpMessage' },
  [TOKENS_AND_CALL_SENT_SIGNATURE]: { abi: tokenHomeABI.abi, type: 'TokenHome TokensAndCallSent' },
};

// Mapping of KNOWN contract addresses to their ABIs
const abiMap = {
  // Teleporter contract address on the DESTINATION chain (Fuji in this example)
  '0x253b2784c75e510dd0ff1da844684a1ac0aa5fcf': teleporterABI,
  // Teleporter contract address on the SOURCE chain (Emits SendCrossChainMessage)
  '0xf7cbd95f1355f0d8d659864b92e2e9fbfab786f7': teleporterABI,
  // Warp Precompile Address (for SendWarpMessage)
  '0x0200000000000000000000000000000000000005': warpPrecompileABI, 
};

const client = createPublicClient({
  chain: avalanche,
  transport: http('https://api.avax.network/ext/bc/C/rpc')
});

// Define ABIs for different inner message types for the RECEIVING side (e.g., TokenHome)
const innerMessagePayloadABIs = {
  32: [ // Type 32: RegisterRemote
    { type: 'bytes32', name: 'remoteBlockchainID' },
    { type: 'address', name: 'remoteTokenTransferrerAddress' }
  ],
  1: [      { type: 'address', name: 'recipient' },
      { type: 'uint256', name: 'amount' },
      { type: 'bytes', name: 'payload' }
  ],
};

/**
 * Decodes an inner message from a hex string, handling different message types.
 * @param {string} messageHex - The hexadecimal string representing the encoded message.
 * @returns {Object} - An object containing the decoded message data or an error object if decoding fails.
 */
function decodeInnerMessage(messageHex) {
  if (!messageHex || !messageHex.startsWith('0x') || messageHex.length < 4) {
    console.warn("decodeInnerMessage: Invalid or too short messageHex:", messageHex);
    return { error: "Invalid or too short messageHex for inner message." };
  }

  try {
    const [messageTypeBigInt] = decodeAbiParameters(
      [{ type: 'uint8', name: 'messageType' }],
      messageHex
    );
    const messageType = Number(messageTypeBigInt);

    const payloadAbiDefinition = innerMessagePayloadABIs[messageType];

    if (!payloadAbiDefinition) {
      console.warn(`decodeInnerMessage: No specific ABI for messageType ${messageType}. Attempting generic decode.`);
      try {
        // messageHex includes the 1-byte messageType, so slice it off for unknownPayload
        const unknownPayloadHex = '0x' + messageHex.substring(4); // remove 0x and the first byte (2 hex chars)
        const [unknownPayload] = decodeAbiParameters([{ type: 'bytes', name: 'unknownPayload' }], unknownPayloadHex);
        return {
          messageType: messageType,
          unknownPayload: unknownPayload,
          info: `No specific ABI for messageType ${messageType}. Decoded as generic bytes.`
        };
      } catch (genericDecodeError) {
        console.error(`decodeInnerMessage: No specific ABI for messageType ${messageType} and generic decode failed:`, genericDecodeError.message);
        return {
          error: `No specific ABI for messageType ${messageType} and generic decode failed. Raw: ${messageHex}`,
          rawMessageHex: messageHex,
          messageTypeAttempted: messageType
        };
      }
    }

    const fullAbiDefinition = [
      { type: 'uint8', name: 'messageType' },
      ...payloadAbiDefinition
    ];

    const decodedParams = decodeAbiParameters(fullAbiDefinition, messageHex);

    const result = {};
    fullAbiDefinition.forEach((param, index) => {
      result[param.name] = decodedParams[index];
    });
    result.messageType = Number(result.messageType); // Ensure messageType is a number

    return result;

  } catch (error) {
    // This primary catch block handles errors in decoding the messageType itself or when a specific ABI fails
    console.error(`decodeInnerMessage: Failed to decode inner message. Error: ${error.message}`, error);
    // Attempt to extract messageType if possible, even on error, for better context
    let messageTypeAttempted = 'unknown';
    if (messageHex.length >=4) {
        try {
            const [typeAttempt] = decodeAbiParameters([{ type: 'uint8', name: 'messageType' }], messageHex);
            messageTypeAttempted = Number(typeAttempt);
        } catch (e) { /* ignore if can't even get type */ }
    }
    return {
        error: `Failed to decode inner message (type attempted: ${messageTypeAttempted}): ${error.message}`,
        rawMessageHex: messageHex,
        ...(messageTypeAttempted !== 'unknown' && { messageTypeAttempted }),
    };
  }
}

/**
 * Decodes additional payload for ReceiveCrossChainMessage events based on the contract address.
 * @param {Object} log - The log object from the transaction receipt.
 * @param {Object} decoded - The already decoded event data from decodeEventLog.
 * @param {Object} eventToReturn - The event object being constructed to return.
 * @param {number} index - The index of the log in the transaction receipt.
 */
function decodeReceiveCrossChainMessage(log, decoded, eventToReturn, index) {
  const lowerCaseAddress = log.address.toLowerCase();
  if (lowerCaseAddress === '0xf7cbd95f1355f0d8d659864b92e2e9fbfab786f7') {
    handleSourceTeleporterMessage(log, decoded, eventToReturn, index);
  } else if (lowerCaseAddress === '0x253b2784c75e510dd0ff1da844684a1ac0aa5fcf') {
    handleDestinationTeleporterMessage(log, decoded, eventToReturn, index);
  }
}

/**
 * Handles decoding of ReceiveCrossChainMessage for the source Teleporter contract.
 * @param {Object} log - The log object from the transaction receipt.
 * @param {Object} decoded - The already decoded event data from decodeEventLog.
 * @param {Object} eventToReturn - The event object being constructed to return.
 * @param {number} index - The index of the log in the transaction receipt.
 */
function handleSourceTeleporterMessage(log, decoded, eventToReturn, index) {
  if (decoded.args && decoded.args.message && typeof decoded.args.message.message === 'string') {
    const rawEncodedWrapperPayload = decoded.args.message.message;
    try {
      const wrapperAbi = [
        { "type": "uint256", "name": "messageProtocolType" },
        { "type": "bytes", "name": "actualMessageData" }
      ];
      const decodedWrapper = decodeAbiParameters(wrapperAbi, rawEncodedWrapperPayload);

      const messageProtocolType = decodedWrapper[0].toString();
      const rawActualMessageData = decodedWrapper[1];

      const actualMessageStaticABI = [
        { "type": "bytes32", "name": "destinationBlockchainID" },
        { "type": "address", "name": "destinationContractAddress" },
        { "type": "address", "name": "tokenAddress" },
        { "type": "address", "name": "finalRecipientAddress" },
        { "type": "uint256", "name": "amount" }
      ];

      const staticPartByteLength = 5 * 32;

      if (rawActualMessageData.length >= 2 + staticPartByteLength * 2) {
        const staticPartHex = rawActualMessageData.slice(0, 2 + staticPartByteLength * 2);
        const decodedStaticPayloadArray = decodeAbiParameters(actualMessageStaticABI, staticPartHex);

        eventToReturn.decodedSourceTeleporterPayload = {
          messageProtocolType: messageProtocolType,
          destinationBlockchainID: decodedStaticPayloadArray[0],
          destinationContractAddress: decodedStaticPayloadArray[1],
          tokenAddress: decodedStaticPayloadArray[2],
          finalRecipientAddress: decodedStaticPayloadArray[3],
          amount: decodedStaticPayloadArray[4].toString(),
          callData: "0x"
        };
        console.log(`Log ${index}: Successfully decoded source Teleporter payload (static parts) for ReceiveCrossChainMessage from ${log.address}.`);
      } else {
        console.warn(`Log ${index}: actualMessageData from source Teleporter is too short to decode static parts. Length: ${rawActualMessageData.length}, Expected for static: ${2 + staticPartByteLength * 2}`);
        eventToReturn.sourceTeleporterPayloadError = `actualMessageData too short. Raw Wrapper Hex: ${rawEncodedWrapperPayload}`;
        eventToReturn.rawSourceTeleporterPayload = rawEncodedWrapperPayload;
      }

    } catch (payloadError) {
      console.warn(`Log ${index}: Failed to decode source Teleporter payload for ReceiveCrossChainMessage from ${log.address}: ${payloadError.message}`);
      eventToReturn.sourceTeleporterPayloadError = `Decoding error: ${payloadError.message}. Raw Wrapper Hex: ${rawEncodedWrapperPayload}`;
      eventToReturn.rawSourceTeleporterPayload = rawEncodedWrapperPayload;
    }
  } else {
    console.warn(`Log ${index}: ReceiveCrossChainMessage from source Teleporter ${log.address} missing 'message.message' structure.`);
    eventToReturn.sourceTeleporterPayloadError = "Missing 'message.message' structure in source Teleporter event args.";
  }
}

/**
 * Handles decoding of ReceiveCrossChainMessage for the destination Teleporter contract.
 * @param {Object} log - The log object from the transaction receipt.
 * @param {Object} decoded - The already decoded event data from decodeEventLog.
 * @param {Object} eventToReturn - The event object being constructed to return.
 * @param {number} index - The index of the log in the transaction receipt.
 */
function handleDestinationTeleporterMessage(log, decoded, eventToReturn, index) {
  if (decoded.args && decoded.args.message && typeof decoded.args.message.message === 'string') {
    const messageHex = decoded.args.message.message;
    const decodedInnerMessage = decodeInnerMessage(messageHex);
    eventToReturn.decodedInnerApplicationMessage = decodedInnerMessage;
    console.log(`Log ${index}: Decoded inner application message for ReceiveCrossChainMessage from ${log.address}.`);
  } else {
    console.warn(`Log ${index}: ReceiveCrossChainMessage from destination Teleporter ${log.address} missing 'message.message' structure.`);
    eventToReturn.innerApplicationMessageError = "Missing 'message.message' structure in destination Teleporter event args.";
  }
}

/**
 * Handles errors encountered during log decoding, distinguishing between ABI mismatches and other errors.
 * @param {Error} error - The error object thrown during decoding.
 * @param {Object} log - The log object from the transaction receipt.
 * @param {number} index - The index of the log in the transaction receipt.
 * @returns {Object} - An object containing error or warning information along with the raw log.
 */
function handleDecodeError(error, log, index) {
  const shortMessage = error.shortMessage || error.message;
  if (error.name === 'DecodeLogDataMismatch' || error.name === 'DecodeLogTopicsMismatch') {
    console.warn(`Log ${index}: ABI mismatch for log from ${log.address} (Topic0: ${log.topics[0]}): ${shortMessage}. Raw log saved.`);
    return {
      warning: `ABI mismatch for log from ${log.address} (Topic0: ${log.topics[0]}): ${shortMessage}`,
      rawLog: log,
      logIndex: index
    };
  } else {
    console.error(`Log ${index}: Failed to decode log from ${log.address} (Topic0: ${log.topics[0]}): ${shortMessage}`);
    return {
      error: `Failed to decode log at index ${index} from ${log.address} (Topic0: ${log.topics[0]}): ${shortMessage}`,
      rawLog: log,
      logIndex: index
    };
  }
}

/**
 * Fetches and decodes events from a transaction receipt on the Avalanche Fuji chain.
 * @param {string} txHash - The transaction hash to fetch the receipt for.
 * @returns {Promise<Array<Object>>} - A promise resolving to an array of decoded event objects or error information.
 */
async function decodeEventsFromTx(txHash) {
  try {
    console.log(`Fetching receipt for tx: ${txHash}...`);
    const receipt = await client.getTransactionReceipt({ hash: txHash });

    if (!receipt) {
        console.error(`No receipt found for transaction hash: ${txHash}.`);
        return [];
    }
    if (!receipt.logs || receipt.logs.length === 0) {
        console.warn(`Receipt found for ${txHash}, but it contains no logs.`);
        return [];
    }
    console.log(`Found ${receipt.logs.length} logs for tx: ${txHash}. Decoding...`);

    const decodedEvents = receipt.logs.map((log, index) => {
      const lowerCaseAddress = log.address.toLowerCase();
      let abi = abiMap[lowerCaseAddress]; 
      const topic0 = log.topics[0]; 
      let eventType = '';

      if (!abi) {
        const signatureInfo = eventSignatureToAbi[topic0];
        if (signatureInfo) {
          abi = signatureInfo.abi;
          eventType = signatureInfo.type;
          console.log(`Log ${index}: Detected ${eventType} event signature from ${log.address}. Attempting to decode.`);
        } else {
          return {
              info: `No ABI provided in abiMap for contract ${log.address}, and signature ${topic0} not recognized as common event.`,
              rawLog: log,
              logIndex: index
          };
        }
      }

      try {
        const decoded = decodeEventLog({
          abi,
          data: log.data,
          topics: log.topics
        });

        let eventToReturn = {
          eventName: decoded.eventName,
          contractAddress: log.address,
          args: decoded.args,
          logIndex: index
        };
        
        if (decoded.eventName === 'ReceiveCrossChainMessage') {
            decodeReceiveCrossChainMessage(log, decoded, eventToReturn, index);
        }
        
        return eventToReturn;

      } catch (error) {
        return handleDecodeError(error, log, index);
      }
    });
    console.log(`Decoding finished for tx: ${txHash}`);
    return decodedEvents.filter(event => event !== undefined); 
  } catch (error) {
    console.error(`Error fetching or processing receipt for tx ${txHash}: ${error.message}`);
    return [{ error: `Failed to process transaction ${txHash}: ${error.message}`, txHash }];
  }
}

// --- Example Usage ---
// const txHash = '0x45608677ac59d0fc09333f1dbf152a39a6f4c4ffa775a22e690bb486a9f13d90'; // Example: RegisterRemote
// const txHash = '0x0b0e19ca41cf9527bc6511e75adffb774a478ceb5f591734440e3edcfcc685aa' //tokeSent from home in c-chain
// const txHash = '0x02c91172c9ff1b58b06af8db9a8f27d86921f8789044d4e970a722ffbdc7709f'; // Example: Token Transfer
// const txHash = '0x70df529c7c912878e507cb4c6cf26d1827ee993758d456d40966fa6f475f9394'; // Example: Dexalot
const txHash = '0xe76b3b3b137bfa3851c77ca7c6fd2b2037d1086ef7e231bd2cdca2f79f0899ad'; // Example: Token Transfer

decodeEventsFromTx(txHash).then(events => {
  // Custom replacer function to convert BigInt to string
  const replacer = (key, value) =>
    typeof value === 'bigint'
      ? value.toString()
      : value; // return everything else unchanged

  console.log(JSON.stringify(events, replacer, 2));
}).catch(err => {
  console.error("Error in example usage:", err);
});