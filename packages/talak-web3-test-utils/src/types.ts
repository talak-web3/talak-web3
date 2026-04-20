/**
 * Type definitions for test utilities
 */

import type { Address } from "viem";
import type { SessionPayload } from "@talak-web3/auth";

/**
 * Mock wallet for testing
 */
export interface MockWallet {
  address: Address;
  privateKey: `0x${string}`;
  publicKey: `0x${string}`;
}

/**
 * Mock session for testing
 */
export interface MockSession {
  address: string;
  chainId: number;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Test context for integration tests
 */
export interface TestContext {
  /** Unique test ID */
  testId: string;
  /** Test start time */
  startTime: number;
  /** Cleanup functions to run after test */
  cleanup: (() => Promise<void> | void)[];
  /** Add a cleanup function */
  addCleanup: (fn: () => Promise<void> | void) => void;
  /** Run all cleanup functions */
  runCleanup: () => Promise<void>;
}

/**
 * SIWE message fields
 */
export interface SiweMessageFields {
  domain: string;
  address: Address;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  statement?: string;
  uri?: string;
  version?: string;
}

/**
 * Token pair returned from authentication
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Mock Redis operations
 */
export interface MockRedisOperations {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  eval(script: string, keys: string[], args: string[]): Promise<unknown>;
}
