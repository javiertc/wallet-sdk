// decodeTx.js  –  node ≥ 18  (ES-module)
// ---------------------------------------------------
import {
    createPublicClient,
    http,
    decodeEventLog,
    decodeAbiParameters,
  } from 'viem'
  import { avalancheFuji } from 'viem/chains'
  import { teleporterABI } from './abis/teleporterABI.mjs'
  
  // RPC & tx hash on Fuji
  const RPC  = 'https://api.avax-test.network/ext/bc/C/rpc'
  const HASH = '0xcd937c2db0b63e2e121c422c9db6aba208a8d9d11681933323e57054b33560e9'
  
  const client = createPublicClient({ chain: avalancheFuji, transport: http(RPC) })
  
  // Solidity enum – keep in order
  const TYPES = [
    'REGISTER_REMOTE',   // 0
    'SINGLE_HOP_SEND',   // 1
    'SINGLE_HOP_CALL',   // 2
    'MULTI_HOP_SEND',    // 3
    'MULTI_HOP_CALL',    // 4
  ]
  
  // ── helper to decode the innermost blob ─────────────
  function decodeTransferrer(hex) {
    // correct layout: (uint8 messageType, bytes payload)
    const [mt, payload] = decodeAbiParameters(
      [{ type: 'uint8' }, { type: 'bytes' }],
      hex,
    )
  
    const out = { typeId: Number(mt), type: TYPES[mt] ?? 'UNKNOWN' }
  
    if (out.type === 'REGISTER_REMOTE' && payload !== '0x') {
      const [imb, homeDec, remoteDec] = decodeAbiParameters(
        [{ type: 'int256' }, { type: 'uint8' }, { type: 'uint8' }],
        payload,
      )
      out.register = {
        imbalance: imb.toString(),
        homeDecimals: Number(homeDec),
        remoteDecimals: Number(remoteDec),
      }
    }
    return out
  }
  
  /* ------------------------------------------------------------------ */
  ;(async () => {
    const { logs } = await client.getTransactionReceipt({ hash: HASH })
    console.log(`\n🧾  tx has ${logs.length} log(s)`)
  
    for (const raw of logs) {
      try {
        const { eventName, args } = decodeEventLog({
          abi: teleporterABI,
          topics: raw.topics,
          data:   raw.data,
        })
        if (eventName !== 'ReceiveCrossChainMessage') continue
  
        const transferrer = decodeTransferrer(args.message.message)
  
        console.log('\n✅  ReceiveCrossChainMessage')
        console.log('  messageID         :', args.messageID)
        console.log('  sourceChainID     :', args.sourceBlockchainID)
        console.log('  transferrer type  :', transferrer.type)
  
        if (transferrer.type === 'REGISTER_REMOTE') {
          console.log('  imbalance         :', transferrer.register.imbalance)
          console.log('  decimals Home/Rem :',
                      transferrer.register.homeDecimals, '/',
                      transferrer.register.remoteDecimals)
        }
  
        console.log('\n🔗  Token pair')
        console.log('  TokenHome   :', args.message.destinationAddress)
        console.log('  HomeChainID :', args.message.destinationBlockchainID)
        console.log('  TokenRemote :', args.message.originSenderAddress)
        console.log('  RemoteChainID :', args.sourceBlockchainID)
        console.log('------------------------------------------------')
      } catch {/* skip non-matching logs */}
    }
  })()