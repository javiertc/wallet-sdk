// decodeTransferrer.mjs
// ----------------------------------------------------
// npm i viem@latest
// node decodeTransferrer.mjs
// ----------------------------------------------------
import { decodeAbiParameters } from 'viem'

// ────────────────────────────────────────────────────
// 1.  Paste your teleporterMessage.message hex here
// ────────────────────────────────────────────────────
const RAW =
  '0x' +
  '0000000000000000000000000000000000000000000000000000000000000020' + // slot 0: offset -> payload (32)
  '0000000000000000000000000000000000000000000000000000000000000000' + // slot 1: messageType = 0
  '0000000000000000000000000000000000000000000000000000000000000040' + // slot 2: payload length = 64 bytes
  '0000000000000000000000000000000000000000000000000000000000000060' + // slot 3: (offset in payload -> inner struct)
  '0000000000000000000000000000000000000000000000000000000000000000' + // slot 4: initialReserveImbalance = 0
  '0000000000000000000000000000000000000000000000000000000000000012' + // slot 5: homeTokenDecimals    = 18
  '0000000000000000000000000000000000000000000000000000000000000012'   // slot 6: remoteTokenDecimals  = 18

// ────────────────────────────────────────────────────
// Enum map  (keep in sync with Solidity definition)
// ────────────────────────────────────────────────────
const TRANSFERRER_TYPE = [
    'REGISTER_REMOTE',   // 0
    'SINGLE_HOP_SEND',   // 1
    'SINGLE_HOP_CALL',   // 2
    'MULTI_HOP_SEND',    // 3
    'MULTI_HOP_CALL',    // 4
  ]
  
// ────────────────────────────────────────────────────
// 2.  Decode outer struct:  (bytes payload, uint8 messageType)
// ────────────────────────────────────────────────────
const [payload, messageType] = decodeAbiParameters(
  [
    { name: 'payload',     type: 'bytes' },
    { name: 'messageType', type: 'uint8' },
  ],
  RAW,
)

const typeId   = Number(messageType)
const typeName = TRANSFERRER_TYPE[typeId] ?? 'UNKNOWN'

console.log('\n🟢 TransferrerMessage')
console.log('  messageType        :', typeId, `(${typeName})`)
console.log('  payload bytes      :', (payload.length - 2) / 2)

// If it isn’t REGISTER_REMOTE or payload empty, we’re done
if (typeName !== 'REGISTER_REMOTE') {
  console.log('\nℹ️  Not a REGISTER_REMOTE message.')
  process.exit(0)
}
if (payload === '0x') {
  console.error('\n⚠️  REGISTER_REMOTE has empty payload – cannot decode.')
  process.exit(1)
}

// ────────────────────────────────────────────────────
// 3.  Decode inner RegisterRemoteMessage
//     (int256 imbalance, uint8 homeDec, uint8 remoteDec)
// ────────────────────────────────────────────────────
const [
  initialReserveImbalance,
  homeTokenDecimals,
  remoteTokenDecimals,
] = decodeAbiParameters(
  [
    { type: 'int256' },
    { type: 'uint8'  },
    { type: 'uint8'  },
  ],
  payload,
)

console.log('\n🟢 RegisterRemoteMessage')
console.log('  initialReserveImbalance :', initialReserveImbalance.toString())
console.log('  homeTokenDecimals       :', Number(homeTokenDecimals))
console.log('  remoteTokenDecimals     :', Number(remoteTokenDecimals))