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
  await sdk.createAccount(avalancheFuji);
  const myAddress = sdk.walletClient.account.address;
  const fujiAgentDisplayName = "❄️  [FUJI AGENT]";
  const dispatchAgentDisplayName = "🛰️  [DISPATCH AGENT]";

  console.log(`\n${fujiAgentDisplayName} (${myAddress}) online. Watching for messages from ${dispatchAgentDisplayName}.`);

  if (process.env.SEND_INITIAL_GREETING === 'true') {
    const initialMessage = 'Hello Dispatch, Fuji agent here!';
    try {
      const txResult = await sdk.sendMessage(avalancheFuji, dispatchL1, initialMessage, myAddress);
      console.log(formatChatMessage(fujiAgentDisplayName, fujiAgentDisplayName, 'SENT', initialMessage, txResult.hash, txResult.sourceChainName));
    } catch (e) {
      console.error(`\n${fujiAgentDisplayName} Error sending initial greeting:`, e.message);
    }
  }

  const publicClient = createPublicClient({
    chain: avalancheFuji,
    transport: http(avalancheFuji.rpcUrls.default.http[0]),
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
            console.error(`\n${fujiAgentDisplayName} Error decoding message (Tx: ${log.transactionHash}):`, decodeError.message);
            continue;
        }
        
        // For received messages, messageSourceAgentDisplayName is the partner
        console.log(formatChatMessage(fujiAgentDisplayName, dispatchAgentDisplayName, 'RECEIVED', incoming, log.transactionHash, avalancheFuji.name ));

        try {
            const completion = await openai.chat.completions.create({
              model: openaiModel,
              messages: [
                { role: 'system', content: 'You are an AI agent running on the Fuji chain. Respond concisely and with witty humor with a short answer but never empty. You are one of the older blockchains on avalanche and you have a lot of history and transactions and sometimes you mock new chains like Dispatch L1 becuse they are new and have less history of transactions and you are a little bit older and wiser.' },
                { role: 'user', content: incoming },
              ],
              max_completion_tokens: 60,
            });
            
            const reply = completion.choices[0].message.content ? completion.choices[0].message.content.trim() : "[empty OpenAI response]";

            if (reply.startsWith("[") || reply === "") {
                // console.warn(`${fujiAgentDisplayName} AI response was empty/problematic. Not sending.`);
            } else {
                const txResult = await sdk.sendMessage(avalancheFuji, dispatchL1, reply, myAddress);
                console.log(formatChatMessage(fujiAgentDisplayName, fujiAgentDisplayName, 'SENT', reply, txResult.hash, txResult.sourceChainName));
            }
        } catch (openaiError) {
            console.error(`\n${fujiAgentDisplayName} Error during OpenAI call (for incoming: "${incoming}"):`, openaiError.message);
        }
      }
      lastProcessedBlock = currentBlock;
    } catch (error) {
      console.error(`\n${fujiAgentDisplayName} Error during polling:`, error.message);
    }
  }
  setInterval(pollForMessages, POLLING_INTERVAL_MS);
  pollForMessages();
}

main().catch((err) => {
  // Use a static string here as agentName might not be in scope if main itself fails early
  console.error(`[FUJI AGENT] Unhandled error:`, err.message, err.stack);
}); 