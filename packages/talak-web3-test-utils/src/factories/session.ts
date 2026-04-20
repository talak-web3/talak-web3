/**
 * Session factories for testing
 */

import { SignJWT } from "jose";
import type { MockSession, TokenPair } from "../types.js";

/**
 * Create a mock session with tokens
 */
export async function createMockSession(
  overrides: Partial<MockSession> = {},
): Promise<MockSession> {
  const address = overrides.address ?? "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
  const chainId = overrides.chainId ?? 1;

  // Generate tokens if not provided
  let accessToken = overrides.accessToken;
  let refreshToken = overrides.refreshToken;

  if (!accessToken || !refreshToken) {
    const tokens = await createMockTokenPair(address, chainId);
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
  }

  return {
    address: address.toLowerCase(),
    chainId,
    accessToken,
    refreshToken,
    expiresAt: overrides.expiresAt ?? Date.now() + 15 * 60 * 1000, // 15 minutes
  };
}

/**
 * Create a mock token pair (access + refresh)
 */
export async function createMockTokenPair(
  address: string,
  chainId: number,
  secret?: Uint8Array,
): Promise<TokenPair> {
  const encoder = new TextEncoder();
  const jwtSecret = secret ?? encoder.encode("test-secret-for-mocking-only");

  const now = Math.floor(Date.now() / 1000);
  const jti = crypto.randomUUID();

  const accessToken = await new SignJWT({ address, chainId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(address.toLowerCase())
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(now + 15 * 60) // 15 minutes
    .sign(jwtSecret);

  // Refresh token is opaque (random string)
  const refreshTokenBytes = new Uint8Array(32);
  crypto.getRandomValues(refreshTokenBytes);
  const refreshToken = Buffer.from(refreshTokenBytes).toString("base64url");

  return { accessToken, refreshToken };
}

/**
 * Create an expired access token for testing
 */
export async function createExpiredAccessToken(
  address: string,
  chainId: number,
  secret?: Uint8Array,
): Promise<string> {
  const encoder = new TextEncoder();
  const jwtSecret = secret ?? encoder.encode("test-secret-for-mocking-only");

  const past = Math.floor(Date.now() / 1000) - 60 * 60; // 1 hour ago
  const jti = crypto.randomUUID();

  return new SignJWT({ address, chainId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(address.toLowerCase())
    .setJti(jti)
    .setIssuedAt(past)
    .setExpirationTime(past + 15 * 60) // Expired 45 minutes ago
    .sign(jwtSecret);
}

/**
 * Create a malformed token for testing error handling
 */
export function createMalformedToken(): string {
  return "malformed.token.here";
}

/**
 * Create a token with invalid signature for testing
 */
export async function createInvalidSignatureToken(
  address: string,
  chainId: number,
): Promise<string> {
  const encoder = new TextEncoder();
  const wrongSecret = encoder.encode("wrong-secret");

  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ address, chainId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(address.toLowerCase())
    .setIssuedAt()
    .setExpirationTime(now + 15 * 60)
    .sign(wrongSecret);
}
