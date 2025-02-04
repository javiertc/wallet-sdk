export const tokenHomeABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "teleporterRegistryAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "teleporterManager",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenAddress_",
        "type": "address"
      },
      {
        "internalType": "uint8",
        "name": "tokenDecimals_",
        "type": "uint8"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "recipientContract",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "CallFailed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "recipientContract",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "CallSucceeded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "remoteBlockchainID",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "remoteTokenTransferrerAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "remaining",
        "type": "uint256"
      }
    ],
    "name": "CollateralAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "oldMinTeleporterVersion",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "newMinTeleporterVersion",
        "type": "uint256"
      }
    ],
    "name": "MinTeleporterVersionUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "remoteBlockchainID",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "remoteTokenTransferrerAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "initialCollateralNeeded",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "tokenDecimals",
        "type": "uint8"
      }
    ],
    "name": "RemoteRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "teleporterAddress",
        "type": "address"
      }
    ],
    "name": "TeleporterAddressPaused",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "teleporterAddress",
        "type": "address"
      }
    ],
    "name": "TeleporterAddressUnpaused",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "teleporterMessageID",
        "type": "bytes32"
      },
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "destinationBlockchainID",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "destinationTokenTransferrerAddress",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "recipientContract",
            "type": "address"
          },
          {
            "internalType": "bytes",
            "name": "recipientPayload",
            "type": "bytes"
          },
          {
            "internalType": "uint256",
            "name": "requiredGasLimit",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "recipientGasLimit",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "multiHopFallback",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "fallbackRecipient",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "primaryFeeTokenAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "primaryFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "secondaryFee",
            "type": "uint256"
          }
        ],
        "indexed": false,
        "internalType": "struct SendAndCallInput",
        "name": "input",
        "type": "tuple"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "TokensAndCallRouted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "teleporterMessageID",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "destinationBlockchainID",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "destinationTokenTransferrerAddress",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "recipientContract",
            "type": "address"
          },
          {
            "internalType": "bytes",
            "name": "recipientPayload",
            "type": "bytes"
          },
          {
            "internalType": "uint256",
            "name": "requiredGasLimit",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "recipientGasLimit",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "multiHopFallback",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "fallbackRecipient",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "primaryFeeTokenAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "primaryFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "secondaryFee",
            "type": "uint256"
          }
        ],
        "indexed": false,
        "internalType": "struct SendAndCallInput",
        "name": "input",
        "type": "tuple"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "TokensAndCallSent",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "teleporterMessageID",
        "type": "bytes32"
      },
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "destinationBlockchainID",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "destinationTokenTransferrerAddress",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "recipient",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "primaryFeeTokenAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "primaryFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "secondaryFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "requiredGasLimit",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "multiHopFallback",
            "type": "address"
          }
        ],
        "indexed": false,
        "internalType": "struct SendTokensInput",
        "name": "input",
        "type": "tuple"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "TokensRouted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "teleporterMessageID",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "destinationBlockchainID",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "destinationTokenTransferrerAddress",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "recipient",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "primaryFeeTokenAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "primaryFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "secondaryFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "requiredGasLimit",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "multiHopFallback",
            "type": "address"
          }
        ],
        "indexed": false,
        "internalType": "struct SendTokensInput",
        "name": "input",
        "type": "tuple"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "TokensSent",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "TokensWithdrawn",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "remoteBlockchainID",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "remoteTokenTransferrerAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "addCollateral",
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
    "inputs": [],
    "name": "getMinTeleporterVersion",
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
        "internalType": "address",
        "name": "teleporterAddress",
        "type": "address"
      }
    ],
    "name": "isTeleporterAddressPaused",
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
    "inputs": [],
    "name": "owner",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "teleporterAddress",
        "type": "address"
      }
    ],
    "name": "pauseTeleporterAddress",
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
        "internalType": "address",
        "name": "originSenderAddress",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "message",
        "type": "bytes"
      }
    ],
    "name": "receiveTeleporterMessage",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "remoteBlockchainID",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "remoteTokenTransferrerAddress",
        "type": "address"
      }
    ],
    "name": "registeredRemotes",
    "outputs": [
      {
        "internalType": "bool",
        "name": "registered",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "collateralNeeded",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "tokenMultiplier",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "multiplyOnRemote",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
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
            "name": "destinationTokenTransferrerAddress",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "recipient",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "primaryFeeTokenAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "primaryFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "secondaryFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "requiredGasLimit",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "multiHopFallback",
            "type": "address"
          }
        ],
        "internalType": "struct SendTokensInput",
        "name": "input",
        "type": "tuple"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "send",
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
            "name": "destinationTokenTransferrerAddress",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "recipientContract",
            "type": "address"
          },
          {
            "internalType": "bytes",
            "name": "recipientPayload",
            "type": "bytes"
          },
          {
            "internalType": "uint256",
            "name": "requiredGasLimit",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "recipientGasLimit",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "multiHopFallback",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "fallbackRecipient",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "primaryFeeTokenAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "primaryFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "secondaryFee",
            "type": "uint256"
          }
        ],
        "internalType": "struct SendAndCallInput",
        "name": "input",
        "type": "tuple"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "sendAndCall",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "teleporterRegistry",
    "outputs": [
      {
        "internalType": "contract TeleporterRegistry",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "tokenAddress",
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
    "name": "tokenDecimals",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "remoteBlockchainID",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "remoteTokenTransferrerAddress",
        "type": "address"
      }
    ],
    "name": "transferredBalances",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "teleporterAddress",
        "type": "address"
      }
    ],
    "name": "unpauseTeleporterAddress",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "version",
        "type": "uint256"
      }
    ],
    "name": "updateMinTeleporterVersion",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];