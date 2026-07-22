# @talak-web3/core

Core framework for talak-web3. Provides the plugin system, middleware chains, context management, and RPC handling.

## Features

- **Plugin System** - Extensible plugin architecture with lifecycle hooks
- **Middleware Chains** - Onion-style middleware for requests and responses
- **Context Management** - Shared context across all components
- **RPC Management** - Unified RPC interface with failover support
- **Singleton Pattern** - Ensures single framework instance per application

## Installation

```bash
npm install @talak-web3/core

yarn add @talak-web3/core

pnpm add @talak-web3/core
```

## Quick Start

```typescript
import { talakWeb3 } from "@talak-web3/core";

const app = talakWeb3({
  chains: [
    { id: 1, rpcUrls: ["https://eth-mainnet.g.alchemy.com/v2/demo_api_key"] },
    { id: 137, rpcUrls: ["https://polygon-mainnet.g.alchemy.com/v2/demo_api_key"] },
  ],
  auth: {
    domain: "yourdomain.com",
    secret: process.env.JWT_SECRET,
  },
});

await app.init();

const blockNumber = await app.context.rpc.request(1, "eth_blockNumber");

await app.destroy();
```

## Plugin System

```typescript
import type { TalakWeb3Plugin, TalakWeb3Context } from '@talak-web3/core';

const myPlugin: TalakWeb3Plugin = {
  name: 'my-plugin',
  version: '1.0.0',

  async setup(context: TalakWeb3Context) {

    context.hooks.on('plugin-load', ({ name }) => {
      console.log(`Plugin loaded: ${name}`);
    });

    context.requestChain.use(async (req, next) => {
      console.log('Request:', req);
      return next();
    });
  },

  async teardown() {

  },
};

const app = talakWeb3({
  chains: [...],
  plugins: [myPlugin],
});
```

## Context

The context object provides access to all framework services:

```typescript
interface TalakWeb3Context {
  config: TalakWeb3Config;
  hooks: HookRegistry;
  plugins: Map<string, TalakWeb3Plugin>;
  auth: TalakWeb3Auth;
  cache: RpcCache;
  logger: Logger;
  requestChain: MiddlewareChain;
  responseChain: MiddlewareChain;
  rpc: UnifiedRpc;
}
```

## Middleware

Middleware follows the onion pattern with access to the full context:

```typescript
import type { MiddlewareHandler } from "@talak-web3/core";

const myMiddleware: MiddlewareHandler = async (req, next, ctx) => {
  ctx.logger.info("Before request");
  const result = await next();
  ctx.logger.info("After request");
  return result;
};

app.context.requestChain.use(myMiddleware);
```

- `requestChain` — intercepts outgoing RPC calls (security, caching, logging)
- `responseChain` — intercepts responses before returning to caller

## License

MIT
