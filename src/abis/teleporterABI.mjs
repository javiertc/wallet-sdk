export const teleporterABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "messageID",
        "type": "bytes32"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "feeTokenAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "indexed": false,
        "internalType": "struct TeleporterFeeInfo",
        "name": "updatedFeeInfo",
        "type": "tuple"
      }
    ],
    "name": "AddFeeAmount",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "blockchainID",
        "type": "bytes32"
      }
    ],
    "name": "BlockchainIDInitialized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "messageID",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "sourceBlockchainID",
        "type": "bytes32"
      }
    ],
    "name": "MessageExecuted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "messageID",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "sourceBlockchainID",
        "type": "bytes32"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "messageNonce",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "originSenderAddress",
            "type": "address"
          },
          {
            "internalType": "bytes32",
            "name": "destinationBlockchainID",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "destinationAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "requiredGasLimit",
            "type": "uint256"
          },
          {
            "internalType": "address[]",
            "name": "allowedRelayerAddresses",
            "type": "address[]"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "receivedMessageNonce",
                "type": "uint256"
              },
              {
                "internalType": "address",
                "name": "relayerRewardAddress",
                "type": "address"
              }
            ],
            "internalType": "struct TeleporterMessageReceipt[]",
            "name": "receipts",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "message",
            "type": "bytes"
          }
        ],
        "indexed": false,
        "internalType": "struct TeleporterMessage",
        "name": "message",
        "type": "tuple"
      }
    ],
    "name": "MessageExecutionFailed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "messageID",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "destinationBlockchainID",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "relayerRewardAddress",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "feeTokenAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "indexed": false,
        "internalType": "struct TeleporterFeeInfo",
        "name": "feeInfo",
        "type": "tuple"
      }
    ],
    "name": "ReceiptReceived",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "messageID",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "sourceBlockchainID",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "deliverer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "rewardRedeemer",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "messageNonce",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "originSenderAddress",
            "type": "address"
          },
          {
            "internalType": "bytes32",
            "name": "destinationBlockchainID",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "destinationAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "requiredGasLimit",
            "type": "uint256"
          },
          {
            "internalType": "address[]",
            "name": "allowedRelayerAddresses",
            "type": "address[]"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "receivedMessageNonce",
                "type": "uint256"
              },
              {
                "internalType": "address",
                "name": "relayerRewardAddress",
                "type": "address"
              }
            ],
            "internalType": "struct TeleporterMessageReceipt[]",
            "name": "receipts",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "message",
            "type": "bytes"
          }
        ],
        "indexed": false,
        "internalType": "struct TeleporterMessage",
        "name": "message",
        "type": "tuple"
      }
    ],
    "name": "ReceiveCrossChainMessage",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "redeemer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "asset",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "RelayerRewardsRedeemed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "messageID",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "destinationBlockchainID",
        "type": "bytes32"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "messageNonce",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "originSenderAddress",
            "type": "address"
          },
          {
            "internalType": "bytes32",
            "name": "destinationBlockchainID",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "destinationAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "requiredGasLimit",
            "type": "uint256"
          },
          {
            "internalType": "address[]",
            "name": "allowedRelayerAddresses",
            "type": "address[]"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "receivedMessageNonce",
                "type": "uint256"
              },
              {
                "internalType": "address",
                "name": "relayerRewardAddress",
                "type": "address"
              }
            ],
            "internalType": "struct TeleporterMessageReceipt[]",
            "name": "receipts",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "message",
            "type": "bytes"
          }
        ],
        "indexed": false,
        "internalType": "struct TeleporterMessage",
        "name": "message",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "feeTokenAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "indexed": false,
        "internalType": "struct TeleporterFeeInfo",
        "name": "feeInfo",
        "type": "tuple"
      }
    ],
    "name": "SendCrossChainMessage",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "WARP_MESSENGER",
    "outputs": [
      {
        "internalType": "contract IWarpMessenger",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "messageID",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "feeTokenAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "additionalFeeAmount",
        "type": "uint256"
      }
    ],
    "name": "addFeeAmount",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "blockchainID",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "sourceBlockchainID",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "destinationBlockchainID",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "nonce",
        "type": "uint256"
      }
    ],
    "name": "calculateMessageID",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "relayer",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "feeAsset",
        "type": "address"
      }
    ],
    "name": "checkRelayerRewardAmount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "messageID",
        "type": "bytes32"
      }
    ],
    "name": "getFeeInfo",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "messageID",
        "type": "bytes32"
      }
    ],
    "name": "getMessageHash",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "destinationBlockchainID",
        "type": "bytes32"
      }
    ],
    "name": "getNextMessageID",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "sourceBlockchainID",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "getReceiptAtIndex",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "receivedMessageNonce",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "relayerRewardAddress",
            "type": "address"
          }
        ],
        "internalType": "struct TeleporterMessageReceipt",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "sourceBlockchainID",
        "type": "bytes32"
      }
    ],
    "name": "getReceiptQueueSize",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "messageID",
        "type": "bytes32"
      }
    ],
    "name": "getRelayerRewardAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "initializeBlockchainID",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "messageNonce",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "messageID",
        "type": "bytes32"
      }
    ],
    "name": "messageReceived",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "sourceBlockchainID",
        "type": "bytes32"
      }
    ],
    "name": "receiptQueues",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "first",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "last",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "messageIndex",
        "type": "uint32"
      },
      {
        "internalType": "address",
        "name": "relayerRewardAddress",
        "type": "address"
      }
    ],
    "name": "receiveCrossChainMessage",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "messageID",
        "type": "bytes32"
      }
    ],
    "name": "receivedFailedMessageHashes",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "messageHash",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "feeAsset",
        "type": "address"
      }
    ],
    "name": "redeemRelayerRewards",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "sourceBlockchainID",
        "type": "bytes32"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "messageNonce",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "originSenderAddress",
            "type": "address"
          },
          {
            "internalType": "bytes32",
            "name": "destinationBlockchainID",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "destinationAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "requiredGasLimit",
            "type": "uint256"
          },
          {
            "internalType": "address[]",
            "name": "allowedRelayerAddresses",
            "type": "address[]"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "receivedMessageNonce",
                "type": "uint256"
              },
              {
                "internalType": "address",
                "name": "relayerRewardAddress",
                "type": "address"
              }
            ],
            "internalType": "struct TeleporterMessageReceipt[]",
            "name": "receipts",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "message",
            "type": "bytes"
          }
        ],
        "internalType": "struct TeleporterMessage",
        "name": "message",
        "type": "tuple"
      }
    ],
    "name": "retryMessageExecution",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "messageNonce",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "originSenderAddress",
            "type": "address"
          },
          {
            "internalType": "bytes32",
            "name": "destinationBlockchainID",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "destinationAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "requiredGasLimit",
            "type": "uint256"
          },
          {
            "internalType": "address[]",
            "name": "allowedRelayerAddresses",
            "type": "address[]"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "receivedMessageNonce",
                "type": "uint256"
              },
              {
                "internalType": "address",
                "name": "relayerRewardAddress",
                "type": "address"
              }
            ],
            "internalType": "struct TeleporterMessageReceipt[]",
            "name": "receipts",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "message",
            "type": "bytes"
          }
        ],
        "internalType": "struct TeleporterMessage",
        "name": "message",
        "type": "tuple"
      }
    ],
    "name": "retrySendCrossChainMessage",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "destinationBlockchainID",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "destinationAddress",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "feeTokenAddress",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              }
            ],
            "internalType": "struct TeleporterFeeInfo",
            "name": "feeInfo",
            "type": "tuple"
          },
          {
            "internalType": "uint256",
            "name": "requiredGasLimit",
            "type": "uint256"
          },
          {
            "internalType": "address[]",
            "name": "allowedRelayerAddresses",
            "type": "address[]"
          },
          {
            "internalType": "bytes",
            "name": "message",
            "type": "bytes"
          }
        ],
        "internalType": "struct TeleporterMessageInput",
        "name": "messageInput",
        "type": "tuple"
      }
    ],
    "name": "sendCrossChainMessage",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "sourceBlockchainID",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32[]",
        "name": "messageIDs",
        "type": "bytes32[]"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "feeTokenAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "internalType": "struct TeleporterFeeInfo",
        "name": "feeInfo",
        "type": "tuple"
      },
      {
        "internalType": "address[]",
        "name": "allowedRelayerAddresses",
        "type": "address[]"
      }
    ],
    "name": "sendSpecifiedReceipts",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "messageID",
        "type": "bytes32"
      }
    ],
    "name": "sentMessageInfo",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "messageHash",
        "type": "bytes32"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "feeTokenAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
        "internalType": "struct TeleporterFeeInfo",
        "name": "feeInfo",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];