import { defineChain } from 'viem';
import { avalancheFuji as baseAvalancheFuji } from 'viem/chains';

export const avalancheFuji = {
  ...baseAvalancheFuji,
  contracts: {
    teleporterRegistry: {
      address: '0xF86Cb19Ad8405AEFa7d09C778215D2Cb6eBfB228',
    },
  },
};

export const dispatchL1 = defineChain({
  id: 779672,
  name: 'Dispatch L1',
  nativeCurrency: {
    decimals: 18,
    name: 'DIS',
    symbol: 'DIS',
  },
  rpcUrls: {
    default: {
      http: ['https://subnets.avax.network/dispatch/testnet/rpc'],
    },
  },
  blockExplorers: {
    default: { name: 'Dispatch Explorer', url: 'https://subnets-test.avax.network/dispatch' },
  },
  contracts: {
    teleporterRegistry: {
      address: '0x083e276d96ce818f2225d901b44e358dcfc5d606'
    }
  },
  testnet: true
}); 