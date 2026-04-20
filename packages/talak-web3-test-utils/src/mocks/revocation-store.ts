/**
 * Mock Revocation Store for testing
 */

import type { RevocationStore } from "@talak-web3/auth";

/**
 * Mock implementation of RevocationStore for testing
 * Tracks JWT access token revocations
 */
export class MockRevocationStore implements RevocationStore {
  private revokedTokens = new Map<string, number>(); // jti -> expiresAt
  private globalInvalidationAt = 0;
  private operationLog: Array<{
    operation: "revoke" | "check";
    jti: string;
    wasRevoked: boolean;
    timestamp: number;
  }> = [];

  /**
   * Revoke a JWT by its JTI (JWT ID)
   */
  async revoke(jti: string, expiresAtMs: number): Promise<void> {
    this.revokedTokens.set(jti, expiresAtMs);

    this.operationLog.push({
      operation: "revoke",
      jti,
      wasRevoked: true,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if a JWT is revoked
   */
  async isRevoked(jti: string): Promise<boolean> {
    const exp = this.revokedTokens.get(jti);

    let isRevoked: boolean;

    if (exp === undefined) {
      isRevoked = false;
    } else if (Date.now() > exp) {
      // Token has expired, clean up
      this.revokedTokens.delete(jti);
      isRevoked = false;
    } else {
      isRevoked = true;
    }

    this.operationLog.push({
      operation: "check",
      jti,
      wasRevoked: isRevoked,
      timestamp: Date.now(),
    });

    return isRevoked;
  }

  /**
   * Get all revoked tokens (for testing verification)
   */
  getRevokedTokens(): Map<string, number> {
    return new Map(this.revokedTokens);
  }

  /**
   * Get operation log for verification
   */
  getOperationLog(): Array<{
    operation: "revoke" | "check";
    jti: string;
    wasRevoked: boolean;
    timestamp: number;
  }> {
    return [...this.operationLog];
  }

  /**
   * Clear all revoked tokens and operation log
   */
  clear(): void {
    this.revokedTokens.clear();
    this.operationLog = [];
  }

  /**
   * Get total revoked token count
   */
  getRevocationCount(): number {
    return this.revokedTokens.size;
  }

  /**
   * Clean up expired tokens
   */
  cleanupExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [jti, expiresAt] of this.revokedTokens.entries()) {
      if (now > expiresAt) {
        this.revokedTokens.delete(jti);
        cleaned++;
      }
    }

    return cleaned;
  }

  async setGlobalInvalidationTime(timestampSeconds: number): Promise<void> {
    this.globalInvalidationAt = timestampSeconds;
  }

  async getGlobalInvalidationTime(): Promise<number> {
    return this.globalInvalidationAt;
  }
}
