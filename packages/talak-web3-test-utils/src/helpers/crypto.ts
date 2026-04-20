/**
 * Cryptographic helpers for testing
 */

import { randomBytes, createHash } from "node:crypto";

/**
 * Generate test encryption keys
 */
export function generateTestKeys(): {
  privateKey: `0x${string}`;
  publicKey: `0x${string}`;
  jwtSecret: Uint8Array;
} {
  const privateKey = `0x${randomBytes(32).toString("hex")}` as `0x${string}`;
  const publicKey = `0x04${randomBytes(64).toString("hex")}` as `0x${string}`;
  const jwtSecret = randomBytes(32);

  return {
    privateKey,
    publicKey,
    jwtSecret,
  };
}

/**
 * Generate a test JWT secret
 */
export function generateTestSecret(): Uint8Array {
  return randomBytes(32);
}

/**
 * Generate a test API key
 */
export function generateTestApiKey(): string {
  return `tk_${randomBytes(32).toString("base64url")}`;
}

/**
 * Hash a string using SHA-256
 */
export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Generate a random hex string
 */
export function randomHex(length: number): `0x${string}` {
  return `0x${randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .substring(0, length)}`;
}

/**
 * Generate a random base64 string
 */
export function randomBase64(length: number = 32): string {
  return randomBytes(length).toString("base64url");
}
