# talak-web3

> Production-grade Web3 backend toolkit for server-side SIWE authentication, resilient RPC routing, and account abstraction.

[![npm version](https://badge.fury.io/js/talak-web3.svg)](https://www.npmjs.com/package/talak-web3)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >=20.12](https://img.shields.io/badge/node-%3E%3D20.12-brightgreen)](https://nodejs.org)

## Overview

`talak-web3` is a unified SDK that provides the infrastructure layer for production Web3 applications. It solves common backend challenges in decentralized app development:

- **Server-authoritative authentication** — SIWE (Sign-In with Ethereum) with server-side session management, JWT issuance, and refresh token rotation
- **Resilient RPC routing** — Multi-provider failover with health tracking and automatic recovery
- **Replay-resistant security** — Atomic nonce consumption, token rotation, and revocation mechanisms
- **Type-safe development** — Full TypeScript support with generated types across all packages
- **Extensible architecture** — Plugin system with middleware chains for custom behavior

## Installation

```bash
npm install talak-web3
# or
yarn add talak-web3
# or
pnpm add talak-web3
```

**Requirements:** Node.js >= 20.12.0

## Quick Start

### Basic Setup

```typescript
import { talakWeb3, MainnetPreset } from 'talak-web3';

const app = talakWeb3({
  ...MainnetPreset,
  auth: {
    domain: 'yourdapp.com',
    secret: process.env.JWT_SECRET,
  },
});

await app.init();

// Access auth, RPC, and other capabilities through the app instance
const nonce = await app.auth.createNonce('0x...');
const result = await app.rpc.request('eth_blockNumber');
```

### React Integration

```tsx
import { TalakWeb3Provider, useAccount, useChain } from 'talak-web3/react';

function App() {
  return (
    <TalakWeb3Provider>
      <YourComponent />
    </TalakWeb3Provider>
  );
}

function YourComponent() {
  const { address, isConnected } = useAccount();
  const { chain } = useChain();
  
  if (!isConnected) return <ConnectWallet />;
  
  return <div>Connected: {address}</div>;
}
```

### Multi-Chain Support

```typescript
import { talakWeb3, MainnetPreset, PolygonPreset } from 'talak-web3';
import { MultiChainRouter } from 'talak-web3/multichain';

const app = talakWeb3({
  chains: [MainnetPreset, PolygonPreset],
  auth: {
    domain: 'yourdapp.com',
    secret: process.env.JWT_SECRET,
  },
});

// Route requests to appropriate chains
const router = new MultiChainRouter(app.context);
const ethBlock = await router.request(1, 'eth_blockNumber');
const polygonBlock = await router.request(137, 'eth_blockNumber');
```

## Core Concepts

### Singleton Pattern

`talakWeb3()` uses a singleton pattern — only one instance is created per process. This ensures consistent state across your application.

```typescript
import { talakWeb3, __resetTalakWeb3 } from 'talak-web3';

// First call creates the instance
const app1 = talakWeb3(config);

// Subsequent calls return the same instance
const app2 = talakWeb3(config);
app1 === app2; // true

// For testing: reset the singleton
__resetTalakWeb3();
```

**Implications:**
- Cannot create multiple instances for different chains/environments in the same process
- Tests must call `__resetTalakWeb3()` before each test
- Serverless functions reuse the same instance across warm invocations

### Authentication Flow

The SDK implements a secure SIWE authentication flow with short-lived JWTs and rotating refresh tokens:

```typescript
// Server-side
import { talakWeb3 } from 'talak-web3';

const app = talakWeb3({ auth: { domain: 'yourdapp.com', secret: process.env.JWT_SECRET }});

// 1. Generate nonce for client
const nonce = await app.auth.createNonce(address);

// 2. Client signs SIWE message with wallet
// 3. Verify signature and issue tokens
const { accessToken, refreshToken } = await app.auth.loginWithSiwe(signedMessage, signature);

// 4. Verify session on subsequent requests
const payload = await app.auth.verifySession(accessToken);

// 5. Rotate refresh token
const { accessToken: newAccess, refreshToken: newRefresh } = await app.auth.refresh(refreshToken);

// 6. Revoke session when needed
await app.auth.revokeSession(accessToken, refreshToken);
```

### Production Configuration

For production deployments, configure Redis-backed stores for atomic operations:

```typescript
import { talakWeb3 } from 'talak-web3';
import { RedisNonceStore, RedisRefreshStore, RedisRevocationStore } from '@talak-web3/auth/stores';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const app = talakWeb3({
  auth: {
    domain: 'yourdapp.com',
    secret: process.env.JWT_SECRET,
    nonceStore: new RedisNonceStore(redis),
    refreshStore: new RedisRefreshStore(redis),
    revocationStore: new RedisRevocationStore(redis),
    accessTtlSeconds: 900,      // 15 minutes
    refreshTtlSeconds: 604800,  // 7 days
  },
  rpc: {
    providers: [
      { url: process.env.RPC_URL_PRIMARY, priority: 1 },
      { url: process.env.RPC_URL_BACKUP, priority: 2 },
    ],
  },
});
```

## Package Exports

### Main Entry Point

```typescript
import {
  talakWeb3,              // Core factory function
  __resetTalakWeb3,       // Reset singleton (for testing)
  TalakWeb3Client,        // HTTP client for browser/Node.js
  InMemoryTokenStorage,   // In-memory token storage
  CookieTokenStorage,     // Browser cookie storage
  MainnetPreset,          // Ethereum mainnet configuration
  PolygonPreset,          // Polygon configuration
  ConfigManager,          // Configuration utilities
  MultiChainRouter,       // Multi-chain request routing
  estimateEip1559Fees,    // EIP-1559 fee estimation
} from 'talak-web3';
```

### Type Exports

```typescript
import type {
  TalakWeb3Instance,      // Main application instance type
  TalakWeb3Context,       // Application context type
  TalakWeb3Plugin,        // Plugin interface
  TalakWeb3BaseConfig,    // Configuration type
  TokenStorage,           // Token storage interface
  NonceResponse,          // Nonce API response type
  LoginResponse,          // Login API response type
  RefreshResponse,        // Refresh API response type
  VerifyResponse,         // Verify API response type
} from 'talak-web3';
```

### Subpath Exports

```typescript
// Multi-chain utilities
import { MultiChainRouter } from 'talak-web3/multichain';

// React hooks and providers
import {
  TalakWeb3Provider,
  useTalakWeb3,
  useAccount,
  useChain,
} from 'talak-web3/react';
```

## Ecosystem Packages

The `talak-web3` monorepo includes scoped packages for modular usage:

| Package | Description | Install |
|---------|-------------|---------|
| `@talak-web3/core` | Core orchestrator and singleton factory | `npm install @talak-web3/core` |
| `@talak-web3/auth` | SIWE authentication and session management | `npm install @talak-web3/auth` |
| `@talak-web3/rpc` | RPC provider routing and failover | `npm install @talak-web3/rpc` |
| `@talak-web3/client` | HTTP client with token management | `npm install @talak-web3/client` |
| `@talak-web3/hooks` | React hooks and context providers | `npm install @talak-web3/hooks` |
| `@talak-web3/config` | Configuration presets and validation | `npm install @talak-web3/config` |
| `@talak-web3/tx` | Account abstraction and gasless transactions | `npm install @talak-web3/tx` |
| `@talak-web3/types` | Shared TypeScript types | `npm install @talak-web3/types` |
| `@talak-web3/errors` | Standardized error classes | `npm install @talak-web3/errors` |
| `@talak-web3/rate-limit` | Rate limiting (memory and Redis) | `npm install @talak-web3/rate-limit` |
| `@talak-web3/cli` | CLI scaffolding tools | `npm install -g @talak-web3/cli` |

## Security Architecture

### Fail-Closed Design

All security-critical operations follow a fail-closed posture:
- If Redis is unavailable → authentication endpoints return `503 Service Unavailable`
- If rate limiter cannot verify quotas → request is blocked
- If signature verification fails → session is not issued

### Replay Protection

- **Nonce consumption**: Each nonce can only be used once, enforced atomically
- **Token rotation**: Refresh tokens are rotated on every use; old tokens are immediately revoked
- **Session revocation**: Revoking a refresh token invalidates the entire session hierarchy

### Production Requirements

Before deploying to production, ensure:

- [ ] **Redis configured** for session storage (non-negotiable for atomicity)
- [ ] **HTTPS enabled** with valid TLS certificates
- [ ] **JWT secrets rotated** (256-bit minimum, use cryptographically secure random generation)
- [ ] **Rate limiting** at your API gateway or edge layer
- [ ] **CORS origins restricted** to known frontend domains
- [ ] **Audit logging enabled** for authentication events
- [ ] **Error tracking configured** (e.g., Sentry)
- [ ] **Health checks implemented** for monitoring

## API Reference

### `talakWeb3(config)`

Creates or returns the singleton application instance.

**Parameters:**
- `config` — Configuration object or preset (see `MainnetPreset`, `PolygonPreset`)

**Returns:**
- `TalakWeb3Instance` — Application instance with `auth`, `rpc`, `context`, and other capabilities

**Example:**
```typescript
const app = talakWeb3({
  auth: {
    domain: 'yourdapp.com',
    secret: process.env.JWT_SECRET,
  },
  rpc: {
    providers: [
      { url: 'https://eth.llamarpc.com', priority: 1 },
      { url: 'https://rpc.ankr.com/eth', priority: 2 },
    ],
  },
});
```

### `app.auth`

Authentication and session management interface.

**Methods:**
- `createNonce(address: string)` — Generate a nonce for SIWE authentication
- `loginWithSiwe(message: string, signature: string)` — Verify SIWE message and issue tokens
- `verifySession(accessToken: string)` — Validate JWT and return session payload
- `refresh(refreshToken: string)` — Rotate refresh token and issue new access token
- `revokeSession(accessToken: string, refreshToken: string)` — Revoke both tokens
- `validateJwt(token: string)` — Quick validation check (returns boolean)

### `app.rpc`

RPC provider with automatic failover.

**Methods:**
- `request(method: string, params?: any[])` — Send JSON-RPC request
- `stop()` — Stop health checks
- `start(intervalMs?: number)` — Start/resume health checks

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | **Yes** (production) | Secret key for JWT signing (min 32 characters) |
| `REDIS_URL` | **Yes** (production) | Redis connection string for session storage |
| `NODE_ENV` | No | Environment (`development` or `production`) |
| `LOG_FORMAT` | No | Set to `json` for structured logging |
| `SIWE_DOMAIN` | No | SIWE domain override (defaults to auth.domain) |

## Examples

See the [`apps/`](https://github.com/dagimabebe/talak-web3/tree/main/apps) directory for complete example applications:

- **Next.js dApp** — Full-stack application with SIWE authentication
- **Hono Backend** — API server with auth endpoints
- **React Native dApp** — Mobile application integration
- **Minimal Auth** — Standalone authentication example
- **RPC Dashboard** — RPC provider monitoring interface

## Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/dagimabebe/talak-web3/blob/main/CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone repository
git clone https://github.com/dagimabebe/talak-web3.git
cd talak-web3

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Lint code
pnpm lint

# Type check
pnpm typecheck
```

## Documentation

- [Getting Started](https://github.com/dagimabebe/talak-web3/blob/main/docs/MINIMAL_SETUP.md) — First steps with talak-web3
- [Architecture](https://github.com/dagimabebe/talak-web3/blob/main/docs/ARCHITECTURE.md) — System design and patterns
- [Security](https://github.com/dagimabebe/talak-web3/blob/main/docs/SECURITY_ARCHITECTURE.md) — Security architecture and threat model
- [API Reference](https://docs.talak.dev/api) — Complete API documentation
- [Package Ecosystem](https://github.com/dagimabebe/talak-web3/blob/main/docs/PACKAGE_ECOSYSTEM.md) — Published package catalog
- [Troubleshooting](https://github.com/dagimabebe/talak-web3/blob/main/docs/TROUBLESHOOTING.md) — Common issues and solutions

## License

MIT © [Dagim Abebe](https://github.com/dagimabebe)
