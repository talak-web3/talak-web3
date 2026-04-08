# talak-web3

A comprehensive Web3 SDK for blockchain development. The main package providing everything you need to build secure, scalable Web3 applications.

## Features

- **Multi-chain Support**: Ethereum, Polygon, Arbitrum, Optimism, Base, and more
- **Authentication**: SIWE (Sign-In with Ethereum), JWT sessions, refresh tokens
- **Smart Contract Interactions**: Type-safe contract calls with viem
- **Gasless Transactions**: Meta-transactions and relayer support
- **Real-time Updates**: WebSocket subscriptions for blockchain events
- **Type Safety**: Full TypeScript support with generated types

## Installation

```bash
npm install talak-web3
# or
yarn add talak-web3
# or
pnpm add talak-web3
```

## Quick Start

```typescript
import { createTalakClient } from 'talak-web3';

const client = createTalakClient({
  chain: 'ethereum',
  rpcUrl: process.env.RPC_URL,
});

// Authenticate with SIWE
const session = await client.auth.signInWithEthereum({
  domain: 'myapp.com',
  uri: 'https://myapp.com/login',
});
```

## Subpath Exports

```typescript
// Core functionality
import { createTalakClient } from 'talak-web3';

// Multi-chain utilities
import { createMultiChainClient } from 'talak-web3/multichain';

// React hooks
import { useWallet, useSIWE } from 'talak-web3/react';
```

## Documentation

- [Getting Started](https://docs.talak.dev/getting-started)
- [Authentication](https://docs.talak.dev/auth)
- [API Reference](https://docs.talak.dev/api)

## License

MIT
