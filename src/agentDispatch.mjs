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
const CONSOLE_WIDTH = 80;

const receiveCrossChainMessageEventAbi = teleporterABI.find(
    (item) => item.type === 'event' && item.name === 'ReceiveCrossChainMessage'
);
if (!receiveCrossChainMessageEventAbi) {
    throw new Error("Could not find ReceiveCrossChainMessage event definition in teleporterABI.mjs.");
}

function formatChatMessage(currentAgentDisplayName, // Name of the agent whose console this is
                           messageSourceAgentDisplayName, // Name of the agent who authored the original message text
                           messageDirection, // 'SENT' by current agent, 'RECEIVED' by current agent
                           text,
                           txHash,
                           chainNameForTx) {
    let logLine1 = '';
    const txLine = txHash ? `    Tx: ${txHash} (on ${chainNameForTx})` : null;

    if (messageDirection === 'SENT') { // Current agent sent this, align right
        logLine1 = `${currentAgentDisplayName}: "${text}"`;
        const padding1 = Math.max(0, CONSOLE_WIDTH - logLine1.length);
        logLine1 = ' '.repeat(padding1) + logLine1;
        let logLine2 = '';
        if (txLine) {
            const padding2 = Math.max(0, CONSOLE_WIDTH - txLine.length);
            logLine2 = '\n' + ' '.repeat(padding2) + txLine;
        }
        return `\n${logLine1}${logLine2}`;
    } else { // Current agent received this, show sender on left
        logLine1 = `${messageSourceAgentDisplayName}: "${text}"`; // Use the actual sender's name
        let logLine2 = '';
        if (txLine) {
            logLine2 = '\n' + txLine; // Tx info for received message is left-aligned under it
        }
        return `\n${logLine1}${logLine2}`;
    }
}

async function main() {
  const sdk = new AvalancheSDK();
  await sdk.createAccount(dispatchL1);
  const myAddress = sdk.walletClient.account.address;
  const dispatchAgentDisplayName = "🛰️  [DISPATCH AGENT]";
  const fujiAgentDisplayName = "❄️  [FUJI AGENT]";

  console.log(`\n${dispatchAgentDisplayName} (${myAddress}) online. Watching for messages from ${fujiAgentDisplayName}.`);

  if (process.env.SEND_INITIAL_GREETING === 'true') {
    const initialMessage = 'Hello Fuji, Dispatch agent online!';
    try {
      const txResult = await sdk.sendMessage(dispatchL1, avalancheFuji, initialMessage, myAddress);
      console.log(formatChatMessage(dispatchAgentDisplayName, dispatchAgentDisplayName, 'SENT', initialMessage, txResult.hash, txResult.sourceChainName));
    } catch (e) {
      console.error(`\n${dispatchAgentDisplayName} Error sending initial greeting:`, e.message);
    }
  }

  const publicClient = createPublicClient({
    chain: dispatchL1,
    transport: http(dispatchL1.rpcUrls.default.http[0])
  });

  let lastProcessedBlock = await publicClient.getBlockNumber() - 1n;

  async function pollForMessages() {
    try {
      const currentBlock = await publicClient.getBlockNumber();
      if (currentBlock <= lastProcessedBlock) return;

      const logs = await publicClient.getLogs({
        address: sdk.teleporterAddress,
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
            console.error(`\n${dispatchAgentDisplayName} Error decoding message (Tx: ${log.transactionHash}):`, decodeError.message);
            continue;
        }

        // For received messages, messageSourceAgentDisplayName is the partner
        console.log(formatChatMessage(dispatchAgentDisplayName, fujiAgentDisplayName, 'RECEIVED', incoming, log.transactionHash, dispatchL1.name));
        
        try {
            const completion = await openai.chat.completions.create({
              model: openaiModel,
              messages: [
                { role: 'system', content: 'You are an AI agent running on the Dispatch L1 chain. Respond concisely with a short answer but never empty. You are a new L1 chain on Avalanche and you are a little bit younger and more energetic and sometimes you mock older chains like Fuji because they are older. Also you mock Base Appchains because they are L3s and wtf is that?' },
                { role: 'user', content: incoming }
              ],
              max_completion_tokens: 60
            });

            const reply = completion.choices[0].message.content ? completion.choices[0].message.content.trim() : "[empty OpenAI response]";

            if (reply.startsWith("[") || reply === "") {
                // console.warn(`${dispatchAgentDisplayName} AI response was empty/problematic. Not sending.`);
            } else {
                const txResult = await sdk.sendMessage(dispatchL1, avalancheFuji, reply, myAddress);
                console.log(formatChatMessage(dispatchAgentDisplayName, dispatchAgentDisplayName, 'SENT', reply, txResult.hash, txResult.sourceChainName));
            }
        } catch (openaiError) {
            console.error(`\n${dispatchAgentDisplayName} Error during OpenAI call (for incoming: "${incoming}"):`, openaiError.message);
        }
      }
      lastProcessedBlock = currentBlock;
    } catch (error) {
      console.error(`\n${dispatchAgentDisplayName} Error during polling:`, error.message);
    }
  }
  setInterval(pollForMessages, POLLING_INTERVAL_MS);
  pollForMessages();
}

main().catch((err) => {
  // Use a static string here as agentName might not be in scope if main itself fails early
  console.error(`[DISPATCH AGENT] Unhandled error:`, err.message, err.stack);
}); 