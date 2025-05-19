import { config } from 'dotenv';
import OpenAI from 'openai';
import { AvalancheSDK } from './lib/avalanche-js.mjs';
import { avalancheFuji, dispatchL1 } from './lib/chains.mjs';
import { teleporterABI } from './abis/teleporterABI.mjs';
import { createPublicClient, http, decodeAbiParameters, parseAbiParameters } from 'viem';

config();

const openai = new OpenAI();
const openaiModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
const POLLING_INTERVAL_MS = 10000;
const CONSOLE_WIDTH = 80; // Approximate width for alignment

const receiveCrossChainMessageEventAbi = teleporterABI.find(
    (item) => item.type === 'event' && item.name === 'ReceiveCrossChainMessage'
);
if (!receiveCrossChainMessageEventAbi) {
    throw new Error("Could not find ReceiveCrossChainMessage event definition in teleporterABI.mjs.");
}

// Unified display formatter
function formatChatMessage(agentName, messageDirection, text, txInfo) {
    const prefix = agentName;
    let messageLine = `${prefix}: "${text}"`;
    let txLine = txInfo ? `    Tx: ${txInfo}` : null;

    if (messageDirection === 'sent') { // This agent sent it (align right)
        const padding = Math.max(0, CONSOLE_WIDTH - messageLine.length);
        messageLine = ' '.repeat(padding) + messageLine;
        if (txLine) {
            const txPadding = Math.max(0, CONSOLE_WIDTH - txLine.length);
            txLine = ' '.repeat(txPadding) + txLine;
        }
    } else { // This agent received it (align left)
        // No change to messageLine padding
        // txLine is already indented if it exists
    }
    return `\n${messageLine}${txLine ? '\n' + txLine : ''}`;
}

async function runAgent({
    sdkInstance,
    agentDisplayName, // e.g., "❄️  [FUJI AGENT]"
    isSelfInChatView, // boolean: true if this agent's sent messages should be on the right
    myChainObject,    // e.g., avalancheFuji
    partnerChainObject, // e.g., dispatchL1
    systemPrompt
}) {
    await sdkInstance.createAccount(myChainObject);
    const myAddress = sdkInstance.walletClient.account.address;
    console.log(`\n${agentDisplayName} (${myAddress}) online, on ${myChainObject.name}.`);

    if (process.env.SEND_INITIAL_GREETING === 'true' && isSelfInChatView) { // Only one agent sends initial greeting
        const initialMessage = `Hello ${partnerChainObject.name}, ${agentDisplayName} here!`;
        try {
            const txResult = await sdkInstance.sendMessage(myChainObject, partnerChainObject, initialMessage, myAddress);
            console.log(formatChatMessage(agentDisplayName, 'sent', initialMessage, `${txResult.hash} (on ${txResult.sourceChainName})`));
        } catch (e) {
            console.error(`\n${agentDisplayName} Error sending initial greeting:`, e.message);
        }
    }

    const publicClient = createPublicClient({
        chain: myChainObject,
        transport: http(myChainObject.rpcUrls.default.http[0]),
    });

    let lastProcessedBlock = await publicClient.getBlockNumber() - 1n;

    async function pollForMessages() {
        try {
            const currentBlock = await publicClient.getBlockNumber();
            if (currentBlock <= lastProcessedBlock) return;

            const logs = await publicClient.getLogs({
                address: sdkInstance.teleporterAddress,
                event: receiveCrossChainMessageEventAbi,
                fromBlock: lastProcessedBlock + 1n,
                toBlock: currentBlock
            });

            for (const log of logs) {
                if (!log.args || !log.args.message) continue;
                const msgStruct = log.args.message;
                const destinationAddress = msgStruct.destinationAddress;

                if (destinationAddress.toLowerCase() !== myAddress.toLowerCase()) continue;

                const payloadBytes = msgStruct.message;
                let incoming = '';
                try {
                    [incoming] = decodeAbiParameters(parseAbiParameters('string'), payloadBytes);
                } catch (decodeError) {
                    console.error(`\n${agentDisplayName} Error decoding message (Tx: ${log.transactionHash}):`, decodeError.message);
                    continue;
                }
                
                console.log(formatChatMessage(agentDisplayName, 'received', incoming, `${log.transactionHash} (on ${myChainObject.name})`));

                try {
                    const completion = await openai.chat.completions.create({
                        model: openaiModel,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: incoming },
                        ],
                        max_completion_tokens: 60,
                    });
                    
                    const reply = completion.choices[0].message.content ? completion.choices[0].message.content.trim() : "[empty OpenAI response]";

                    if (reply.startsWith("[") || reply === "") {
                        // console.warn(`${agentDisplayName} AI response was empty/problematic. Not sending.`);
                    } else {
                        const txResult = await sdkInstance.sendMessage(myChainObject, partnerChainObject, reply, myAddress);
                        console.log(formatChatMessage(agentDisplayName, 'sent', reply, `${txResult.hash} (on ${txResult.sourceChainName})`));
                    }
                } catch (openaiError) {
                    console.error(`\n${agentDisplayName} Error during OpenAI call (for incoming: "${incoming}"):`, openaiError.message);
                }
            }
            lastProcessedBlock = currentBlock;
        } catch (error) {
            console.error(`\n${agentDisplayName} Error during polling:`, error.message);
        }
    }
    setInterval(pollForMessages, POLLING_INTERVAL_MS);
    pollForMessages(); 
}

async function mainUnifiedChat() {
    console.log("--- Unified Cross-Chain AI Chat Starting ---");
    console.log(`--- Watching Fuji and Dispatch L1 simultaneously. Right-side is Fuji, Left-side is Dispatch L1 ---\n`);

    const fujiSDK = new AvalancheSDK();
    const dispatchSDK = new AvalancheSDK(); // Separate SDK instances for clean context

    // Fuji Agent (will appear on the right in this unified view)
    runAgentLogic({
        sdkInstance: fujiSDK,
        agentDisplayName: "❄️  [FUJI AGENT]",
        isSelfInChatView: true, // Critical for formatting and initial greeting
        myChainObject: avalancheFuji,
        partnerChainObject: dispatchL1,
        systemPrompt: 'You are an AI agent running on the Fuji chain. Respond concisely and with witty humor with a short answer but never empty. You are one of the older blockchains on avalanche and you have a lot of history and transactions and sometimes you mock new chains like Dispatch L1 becuse they are new and have less history of transactions and you are a little bit older and wiser.'
    });

    // Dispatch Agent (will appear on the left in this unified view)
    runAgentLogic({
        sdkInstance: dispatchSDK,
        agentDisplayName: "🛰️  [DISPATCH AGENT]",
        isSelfInChatView: false, // This agent's sent messages will be formatted as if received by Fuji
        myChainObject: dispatchL1,
        partnerChainObject: avalancheFuji,
        systemPrompt: 'You are an AI agent running on the Dispatch L1 chain. Respond concisely with a short answer but never empty. You are a new L1 chain on Avalanche and you are a little bit younger and more energetic and sometimes you mock older chains like Fuji because they are older. Also you mock Base Appchains because they are L3s and wtf is that?'
    });

    // Keep the main process alive
    // In a real daemon, you might have better lifecycle management
    await new Promise(() => {}); 
}

mainUnifiedChat().catch(err => {
    console.error("Unhandled error in Unified Chat:", err);
}); 