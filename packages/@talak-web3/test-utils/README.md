# @talak-web3/test-utils

Shared testing utilities for the talak-web3 monorepo: factories, mocks, and small helpers so packages can test auth, sessions, and async flows consistently.

## Installation

```bash
pnpm add -D @talak-web3/test-utils
```

## Exports

- **Factories** — `createMockWallet`, `generateWalletAddress`, `createMockSiweMessage`, `generateSiweMessage`, `createMockSession`, `createMockTokenPair`
- **Mocks** — `MockRedis`, `createMockRedis`, `MockNonceStore`, `MockRefreshStore`, `MockRevocationStore`
- **Helpers** — `setupTestContext`, `createTestContext`, `generateTestKeys`, `generateTestSecret`, `waitFor`, `sleep`, `retryAsync`, `expectError`, `expectAuthError`
- **Types** — `MockWallet`, `MockSession`, `TestContext`

## Example

```ts
import { createMockWallet, setupTestContext } from "@talak-web3/test-utils";

const wallet = createMockWallet();
const ctx = await setupTestContext();
```

## Development

```bash
pnpm --filter @talak-web3/test-utils build
pnpm --filter @talak-web3/test-utils test
```

## License

MIT
