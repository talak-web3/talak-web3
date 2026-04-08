# @talak-web3/rpc

RPC client and utilities for blockchain interactions.

## Installation

```bash
npm install @talak-web3/rpc
# or
yarn add @talak-web3/rpc
# or
pnpm add @talak-web3/rpc
```

## Usage

```typescript
import { createRpcClient } from '@talak-web3/rpc';

const rpc = createRpcClient({
  url: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
  chainId: 1,
});

// Get balance
const balance = await rpc.getBalance({
  address: '0x...',
  blockTag: 'latest',
});

// Send transaction
const hash = await rpc.sendTransaction({
  to: '0x...',
  value: 1000000000000000000n,
});
```

## Features

- Multi-provider fallback
- Request batching
- Caching layer
- Rate limiting
- WebSocket support

## License

MIT
