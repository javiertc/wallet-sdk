export const erc20ContractABI = [{
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "messageID",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "message",
        "type": "bytes"
      }
    ],
    "name": "SendWarpMessage",
    "type": "event"
  }];