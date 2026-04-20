# @talak-web3/tx

Transaction management and utilities.

## Installation

```bash
npm install @talak-web3/tx
# or
yarn add @talak-web3/tx
# or
pnpm add @talak-web3/tx
```

## Usage

### Transaction Builder

```typescript
import { createTransactionBuilder } from "@talak-web3/tx";

const tx = createTransactionBuilder({
  chainId: 1,
});

// Build transaction
const transaction = await tx.build({
  to: "0x1111111111111111111111111111111111111111",
  value: parseEther("1.0"),
  data: "0x1111111111111111111111111111111111111111",
});

// Estimate gas
const gas = await tx.estimateGas(transaction);

// Send transaction
const hash = await tx.send(transaction);
```

### Transaction Status

```typescript
// Wait for confirmation
const receipt = await tx.wait(hash, {
  confirmations: 1,
  timeout: 60000,
});

// Get transaction status
const status = await tx.getStatus(hash);
```

### Batch Transactions

```typescript
// Send multiple transactions
const hashes = await tx.batch([
  { to: "0x1111111111111111111111111111111111111111", value: parseEther("0.1") },
  { to: "0x1111111111111111111111111111111111111111", value: parseEther("0.2") },
]);
```

## License

MIT
