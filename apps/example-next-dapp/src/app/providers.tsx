'use client';

import type { ReactNode } from 'react';
import { BetterWeb3Provider } from '@talak-web3/hooks';
import { betterWeb3 } from '@talak-web3/core';

const instance = betterWeb3({
  debug: true,
  chains: [
    {
      id: 1,
      name: 'Ethereum',
      rpcUrls: ['https://cloudflare-eth.com'],
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      testnet: false,
    },
  ] as const,
  rpc: { retries: 2, timeout: 10_000 },
});

void instance.init();

export function Providers({ children }: { children: ReactNode }) {
  return <BetterWeb3Provider instance={instance}>{children}</BetterWeb3Provider>;
}

