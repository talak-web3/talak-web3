# @talak-web3/realtime

Real-time updates via WebSocket for blockchain events.

## Installation

```bash
npm install @talak-web3/realtime
# or
yarn add @talak-web3/realtime
# or
pnpm add @talak-web3/realtime
```

## Usage

```typescript
import { createRealtimeClient } from "@talak-web3/realtime";

const realtime = createRealtimeClient({
  url: "wss://ws.talak.dev",
});

// Subscribe to new blocks
realtime.subscribe("block", (block) => {
  console.log("New block:", block.number);
});

// Subscribe to address transactions
realtime.subscribe(
  "transactions",
  {
    address: "0x1111111111111111111111111111111111111111",
  },
  (tx) => {
    console.log("New transaction:", tx.hash);
  },
);

// Subscribe to contract events
realtime.subscribe(
  "events",
  {
    address: "0x1111111111111111111111111111111111111111",
    event: "Transfer",
  },
  (event) => {
    console.log("Transfer:", event);
  },
);
```

## Features

- Automatic reconnection
- Event filtering
- Multi-chain support
- Typed events

## License

MIT
