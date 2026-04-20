/**
 * Mock Nonce Store for testing
 */

import type { NonceStore } from "@talak-web3/auth";

/**
 * Mock implementation of NonceStore for testing
 * Tracks all operations for verification
 */
export class MockNonceStore implements NonceStore {
  private nonces = new Map<string, Map<string, number>>(); // address -> Map<nonce, expiresAt>
  private operationLog: Array<{
    operation: string;
    address: string;
    nonce?: string;
    timestamp: number;
  }> = [];

  /**
   * Create a new nonce for an address
   */
  async create(address: string, meta?: { ip?: string; ua?: string }): Promise<string> {
    const addr = address.toLowerCase();
    const nonce = this.generateNonce();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes TTL

    let addrNonces = this.nonces.get(addr);
    if (!addrNonces) {
      addrNonces = new Map();
      this.nonces.set(addr, addrNonces);
    }

    addrNonces.set(nonce, expiresAt);

    this.operationLog.push({
      operation: "create",
      address: addr,
      nonce,
      timestamp: Date.now(),
    });

    return nonce;
  }

  /**
   * Consume a nonce (atomic operation)
   * Returns true if nonce existed and was consumed, false otherwise
   */
  async consume(address: string, nonce: string): Promise<boolean> {
    const addr = address.toLowerCase();
    const addrNonces = this.nonces.get(addr);

    this.operationLog.push({
      operation: "consume",
      address: addr,
      nonce,
      timestamp: Date.now(),
    });

    if (!addrNonces) {
      return false;
    }

    const expiresAt = addrNonces.get(nonce);
    if (expiresAt === undefined) {
      return false;
    }

    // Check expiration
    if (Date.now() > expiresAt) {
      addrNonces.delete(nonce);
      return false;
    }

    // Atomic delete
    addrNonces.delete(nonce);

    // Clean up empty address entries
    if (addrNonces.size === 0) {
      this.nonces.delete(addr);
    }

    return true;
  }

  /**
   * Check if a nonce exists (without consuming it)
   */
  async exists(address: string, nonce: string): Promise<boolean> {
    const addr = address.toLowerCase();
    const addrNonces = this.nonces.get(addr);

    if (!addrNonces) return false;

    const expiresAt = addrNonces.get(nonce);
    if (expiresAt === undefined) return false;

    if (Date.now() > expiresAt) {
      addrNonces.delete(nonce);
      return false;
    }

    return true;
  }

  /**
   * Get all nonces for an address (for testing verification)
   */
  getNoncesForAddress(address: string): Map<string, number> {
    return this.nonces.get(address.toLowerCase()) ?? new Map();
  }

  /**
   * Get operation log for verification
   */
  getOperationLog(): Array<{
    operation: string;
    address: string;
    nonce?: string;
    timestamp: number;
  }> {
    return [...this.operationLog];
  }

  /**
   * Clear all nonces and operation log
   */
  clear(): void {
    this.nonces.clear();
    this.operationLog = [];
  }

  /**
   * Get total nonce count
   */
  getNonceCount(): number {
    let count = 0;
    for (const addrNonces of this.nonces.values()) {
      count += addrNonces.size;
    }
    return count;
  }

  /**
   * Generate a cryptographically secure nonce
   */
  private generateNonce(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
}
