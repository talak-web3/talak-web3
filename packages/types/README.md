# @talak-web3/types

Shared TypeScript types for talak-web3 packages.

## Installation

```bash
npm install @talak-web3/types
pnpm add @talak-web3/types
```

## Usage

```typescript
import type {
  Hex,
  Address,
  ChainId,
  Logger,
  NonceStore,
  RefreshStore,
  RefreshSession,
  RevocationStore,
  TalakWeb3BaseConfig,
  TalakWeb3Plugin,
  TalakWeb3Instance,
  TalakWeb3Context,
  IRpc,
  RequestChain,
  ResponseChain,
} from "@talak-web3/types";
```

## Core Types

### Primitives

```typescript
type ChainId = number;
type Hex = `0x${string}`;
type Address = Hex;
type UnixMs = number;
```

### Stores

```typescript
interface NonceStore {
  create(address: string, meta?: { ip?: string; ua?: string }): Promise<string>;
  consume(address: string, nonce: string): Promise<boolean>;
}

interface RefreshStore {
  create(
    address: string,
    chainId: number,
    ttlMs: number,
  ): Promise<{ token: string; session: RefreshSession }>;
  rotate(token: string, ttlMs: number): Promise<{ token: string; session: RefreshSession }>;
  revoke(token: string): Promise<void>;
  lookup(token: string): Promise<RefreshSession | null>;
}

interface RevocationStore {
  revoke(jti: string, expiresAtMs: number): Promise<void>;
  isRevoked(jti: string): Promise<boolean>;
}
```

### Plugin System

```typescript
interface TalakWeb3Plugin {
  name: string;
  version: string;
  setup(ctx: TalakWeb3Context): void | Promise<void>;
  teardown?(ctx: TalakWeb3Context): void | Promise<void>;
}
```

## License

MIT
