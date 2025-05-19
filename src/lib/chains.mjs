import { defineChain } from 'viem';
import { avalancheFuji as baseAvalancheFuji } from 'viem/chains';

export const avalancheFuji = {
  ...baseAvalancheFuji,
  rpcUrls: { 
    default: {
      http: ['https://damp-tiniest-waterfall.avalanche-testnet.quiknode.pro/168b44f55f10444779c59cc2e1aba64c943c9cb0/ext/bc/C/rpc/'],
    },
    public: { // Also update public if you want consistency, or keep the old one as a broader fallback
      http: ['https://damp-tiniest-waterfall.avalanche-testnet.quiknode.pro/168b44f55f10444779c59cc2e1aba64c943c9cb0/ext/bc/C/rpc/'],
    }
  },
  blockchainId: '0x7fc93d85c6d62c5b2ac0b519c87010ea5294012d1e407030d6acd0021cac10d5',
  contracts: {
    teleporterRegistry: {
      address: '0xF86Cb19Ad8405AEFa7d09C778215D2Cb6eBfB228',
    },
  },
};

export const dispatchL1 = defineChain({
  id: 779672,
  name: 'Dispatch L1',
  blockchainId: '0x9f3be606497285d0ffbb5ac9ba24aa60346a9b1812479ed66cb329f394a4b1c7',
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