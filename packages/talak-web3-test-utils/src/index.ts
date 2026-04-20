/**
 * talak-web3 Test Utilities
 *
 * Shared testing utilities for the talak-web3 monorepo.
 * Provides mocks, factories, and helpers for consistent testing.
 */

// Factories
export { createMockWallet, generateWalletAddress } from "./factories/wallet.js";
export { createMockSiweMessage, generateSiweMessage } from "./factories/siwe.js";
export { createMockSession, createMockTokenPair } from "./factories/session.js";

// Mocks
export { MockRedis, createMockRedis } from "./mocks/redis.js";
export { MockNonceStore } from "./mocks/nonce-store.js";
export { MockRefreshStore } from "./mocks/refresh-store.js";
export { MockRevocationStore } from "./mocks/revocation-store.js";

// Helpers
export { setupTestContext, createTestContext } from "./helpers/context.js";
export { generateTestKeys, generateTestSecret } from "./helpers/crypto.js";
export { waitFor, sleep, retryAsync } from "./helpers/async.js";
export { expectError, expectAuthError } from "./helpers/errors.js";

// Types
export type { MockWallet, MockSession, TestContext } from "./types.js";
