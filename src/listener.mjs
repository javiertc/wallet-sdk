// listener.mjs ──────────────────────────────────────────────────────────
import { createPublicClient, http, decodeAbiParameters, parseAbiParameters} from 'viem'
import { avalancheFuji } from 'viem/chains'
import { teleporterABI } from './abis/teleporterABI.mjs'

// ── config ─────────────────────────────────────────────────────────────
const TELEPORTER_MESSENGER = '0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf'
const RPC_URL = 'https://damp-tiniest-waterfall.avalanche-testnet.quiknode.pro/168b44f55f10444779c59cc2e1aba64c943c9cb0/ext/bc/C/rpc/'

// Web-socket is better; use http() + poll:true here for public RPC
const publicClient = createPublicClient({
    chain: avalancheFuji,
    transport: http(RPC_URL),
})

// ── enum map (keep with Solidity) ──────────────────────────────────────
const TRANSFERRER_TYPE = [
    'REGISTER_REMOTE',   // 0
    'SINGLE_HOP_SEND',   // 1
    'SINGLE_HOP_CALL',   // 2
    'MULTI_HOP_SEND',    // 3
    'MULTI_HOP_CALL',    // 4
]

// Helper to decode the inner bytes
function decodeTransferrerBlob(hex) {
    // contract layout: (bytes payload, uint8 messageType)
    const [payload, messageType] = decodeAbiParameters(
        [
            { type: 'bytes' },
            { type: 'uint8' },
        ],
        hex,
    )

    const typeId = Number(messageType)
    const typeName = TRANSFERRER_TYPE[typeId] ?? 'UNKNOWN'

    const result = { typeId, typeName, payload }

    if (typeName === 'REGISTER_REMOTE' && payload !== '0x') {
        const [imbalance, homeDec, remoteDec] = decodeAbiParameters(
            [
                { type: 'int256' },
                { type: 'uint8' },
                { type: 'uint8' },
            ],
            payload,
        )
        result.register = {
            initialReserveImbalance: imbalance.toString(),
            homeTokenDecimals: Number(homeDec),
            remoteTokenDecimals: Number(remoteDec),
        }
    }

    return result
}

// ── main listener ──────────────────────────────────────────────────────
console.log('🔭  Listening for ReceiveCrossChainMessage events on Fuji…')

publicClient.watchContractEvent({
    address: TELEPORTER_MESSENGER,
    abi: teleporterABI,
    eventName: 'ReceiveCrossChainMessage',
    poll: true,   // needed for HTTP transport
    onLogs: (logs) => {
        logs.forEach((log) => {
            if (!log.args) return   // skip undecodable


            console.log('--- ReceiveCrossChainMessage event ---');
            console.log(log.args);

            const { messageID, sourceBlockchainID, deliverer, rewardRedeemer, message} = log.args
            const decoded = decodeTransferrerBlob(message.message)

            // 1. print the TransferrerMessage type
            console.log('\n TransferrerMessage')
            console.log('  typeId   :', decoded.typeId, `(${decoded.typeName})`)
            console.log('  payloadB :', (decoded.payload.length - 2) / 2)

            // 2. if REGISTER_REMOTE, print its struct
            if (decoded.typeName === 'REGISTER_REMOTE' && decoded.register) {
                console.log('  initialReserveImbalance :', decoded.register.initialReserveImbalance)
                console.log('  home/remote decimals     :', decoded.register.homeTokenDecimals, '/', decoded.register.remoteTokenDecimals)
            }

            // 3. summary of tokenHome/remote & chain ids
            console.log('\n🔗  Summary')
            console.log('  BlockNumber :', log.blockNumber)
            console.log('  txHash      :', log.transactionHash)
            console.log('  MessageID  :', messageID)
            console.log('  TokenRemote :', message.originSenderAddress)
            console.log('  sourceBlockchainID :', sourceBlockchainID)
            console.log('  TokenHome   :', message.destinationAddress)
            console.log('  HomeChainID :', message.destinationBlockchainID)
            console.log('  Deliverer   :', deliverer)
            console.log('  RewardRedeemer:', rewardRedeemer)
            console.log('  Raw Payload :', message.message) 
            console.log('  Decoded Msg :', decoded.payload)

            console.log('---------------------------------------------')
            // Define the ABI type for decoding the message
            const messageAbi = parseAbiParameters('string');
            console.log('  Decoded Msg :', decodeAbiParameters(messageAbi, log.args.message.message));
            
        })
    },
    onError: (err) => console.error('watch error:', err),
})

// graceful Ctrl-C
process.on('SIGINT', () => {
    console.log('\n👋  watcher stopped')
    process.exit(0)
})