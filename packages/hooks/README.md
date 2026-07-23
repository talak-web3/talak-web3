# @talak-web3/hooks

React hooks for talak-web3. Build Web3-enabled React applications with ease.

## Installation

```bash
npm install @talak-web3/hooks

yarn add @talak-web3/hooks

pnpm add @talak-web3/hooks
```

## Quick Start

```tsx
import { talakWeb3 } from "talak-web3";
import { TalakWeb3Provider, useAccount, useBalance } from "@talak-web3/hooks";

const instance = talakWeb3({
  chains: [
    {
      id: 1,
      name: "Ethereum",
      rpcUrls: ["https://cloudflare-eth.com"],
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      testnet: false,
    },
  ],
});
await instance.init();

function App() {
  return (
    <TalakWeb3Provider instance={instance}>
      <Wallet />
    </TalakWeb3Provider>
  );
}

function Wallet() {
  const { address, chainId, isConnected, connect, switchChain } = useAccount();
  return (
    <div>
      <p>Chain: {chainId}</p>
      {isConnected ? <p>{address}</p> : <button onClick={connect}>Connect</button>}
    </div>
  );
}

function BalanceDisplay({ address }: { address: `0x${string}` }) {
  const { data, isLoading } = useBalance({ address });
  if (isLoading) return <p>Loading…</p>;
  return <p>{data ? formatEther(data) : "—"} ETH</p>;
}
```

---

## Hooks

| Hook                        | Description                                      |
| --------------------------- | ------------------------------------------------ |
| [`useAccount`](#useaccount) | Address, chain, connect, disconnect, switchChain |
| [`useBalance`](#usebalance) | Native token balance                             |

Advanced / escape hatch:

- [`useTalakWeb3`](#usetalakweb3) — raw SDK instance for plugins, middleware, etc.

---

## License

MIT
