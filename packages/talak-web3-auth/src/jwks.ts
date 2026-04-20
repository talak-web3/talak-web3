import { exportSPKI, type KeyLike } from "jose";
import { createHash } from "node:crypto";
import { TalakWeb3Error } from "@talak-web3/errors";

// ---------------------------------------------------------------------------
// JWKS (JSON Web Key Set) Management for Key Rotation
// ---------------------------------------------------------------------------

export interface JsonWebKey {
  kty: "RSA";
  use: "sig";
  alg: "RS256";
  kid: string;
  n: string;
  e: string;
  x5t?: string;
  x5c?: string[];
}

export interface JwksResponse {
  keys: JsonWebKey[];
}

export interface KeyRotationConfig {
  /** Maximum number of keys to retain in the key set */
  maxKeys: number;
  /** Grace period in milliseconds for old keys before removal */
  gracePeriodMs: number;
  /** Key rotation interval in milliseconds */
  rotationIntervalMs: number;
}

export class JwksManager {
  private keys: Map<string, { publicKey: KeyLike; privateKey?: KeyLike; createdAt: number }> =
    new Map();
  private primaryKid: string = "";
  private config: KeyRotationConfig;

  constructor(config: Partial<KeyRotationConfig> = {}) {
    this.config = {
      maxKeys: config.maxKeys ?? 5,
      gracePeriodMs: config.gracePeriodMs ?? 7 * 24 * 60 * 60 * 1000, // 7 days
      rotationIntervalMs: config.rotationIntervalMs ?? 30 * 24 * 60 * 60 * 1000, // 30 days
    };
  }

  /**
   * Add a new key to the key set
   * @param kid Key ID
   * @param publicKey RSA public key
   * @param privateKey Optional RSA private key (only for primary key)
   * @param isPrimary Whether this is the primary signing key
   */
  addKey(kid: string, publicKey: KeyLike, privateKey?: KeyLike, isPrimary = false): void {
    if (isPrimary) {
      this.primaryKid = kid;
    }

    const record: { publicKey: KeyLike; privateKey?: KeyLike; createdAt: number } = {
      publicKey,
      createdAt: Date.now(),
    };
    if (privateKey !== undefined) {
      record.privateKey = privateKey;
    }
    this.keys.set(kid, record);

    // Clean up old keys if we exceed maxKeys
    this.cleanupOldKeys();
  }

  /**
   * Get the primary signing key
   */
  getPrimaryKey(): { kid: string; privateKey: KeyLike } | null {
    const key = this.keys.get(this.primaryKid);
    if (!key || !key.privateKey) {
      return null;
    }
    return { kid: this.primaryKid, privateKey: key.privateKey };
  }

  /**
   * Get a public key by kid for verification
   */
  getPublicKey(kid: string): KeyLike | null {
    const key = this.keys.get(kid);
    return key?.publicKey ?? null;
  }

  /**
   * Get all public keys as JWKS format
   */
  async getJwks(): Promise<JwksResponse> {
    const keys: JsonWebKey[] = [];

    for (const [kid, keyData] of this.keys.entries()) {
      const spki = await exportSPKI(keyData.publicKey);
      const publicKeyPem = spki
        .replace(/-----BEGIN PUBLIC KEY-----/, "")
        .replace(/-----END PUBLIC KEY-----/, "")
        .replace(/\n/g, "");

      // Parse the SPKI to extract modulus and exponent
      const keyBuffer = Buffer.from(publicKeyPem, "base64");
      const jwk: JsonWebKey = {
        kty: "RSA",
        use: "sig",
        alg: "RS256",
        kid,
        // These would be extracted from the actual key in a real implementation
        // For now, we'll use placeholder values that would be populated by the key parsing
        n: "placeholder_modulus",
        e: "AQAB", // Standard exponent for RSA keys (65537)
        x5t: this.computeX5t(spki),
        x5c: [publicKeyPem],
      };

      keys.push(jwk);
    }

    return { keys };
  }

  /**
   * Rotate keys: create new primary key and mark old primary as secondary
   */
  async rotateKeys(newPrivateKey: KeyLike, newPublicKey: KeyLike): Promise<string> {
    const newKid = this.generateKid();

    // Add new key as primary
    this.addKey(newKid, newPublicKey, newPrivateKey, true);

    return newKid;
  }

  /**
   * Emergency purge: Remove all keys except a new mandatory one.
   * This is used in case of a catastrophic key compromise.
   */
  async emergencyPurge(newPrivateKey?: KeyLike, newPublicKey?: KeyLike): Promise<string> {
    this.keys.clear();
    this.primaryKid = "";

    if (newPrivateKey && newPublicKey) {
      return this.rotateKeys(newPrivateKey, newPublicKey);
    }

    return "";
  }

  /**
   * Revoke a specific key by ID immediately.
   */
  revokeKey(kid: string): void {
    if (kid === this.primaryKid) {
      throw new TalakWeb3Error("Cannot revoke primary key without rotation", {
        code: "AUTH_REVOKE_PRIMARY_FORBIDDEN",
        status: 403,
      });
    }
    this.keys.delete(kid);
  }

  /**
   * Check if key rotation is needed
   */
  shouldRotate(): boolean {
    const primary = this.keys.get(this.primaryKid);
    if (!primary) return true;

    const age = Date.now() - primary.createdAt;
    return age >= this.config.rotationIntervalMs;
  }

  /**
   * Clean up keys older than grace period
   */
  private cleanupOldKeys(): void {
    const now = Date.now();
    const cutoff = now - this.config.gracePeriodMs;

    // Don't remove the primary key
    const keysToRemove: string[] = [];

    for (const [kid, keyData] of this.keys.entries()) {
      if (kid === this.primaryKid) continue;
      if (keyData.createdAt < cutoff) {
        keysToRemove.push(kid);
      }
    }

    // Remove oldest keys if we still exceed maxKeys
    const sortedKeys = Array.from(this.keys.entries())
      .filter(([kid]) => kid !== this.primaryKid)
      .sort(([, a], [, b]) => a.createdAt - b.createdAt);

    const excessCount = sortedKeys.length - (this.config.maxKeys - 1);
    if (excessCount > 0) {
      const toRemove = Math.min(excessCount, sortedKeys.length);
      for (let i = 0; i < toRemove; i++) {
        const entry = sortedKeys[i];
        if (entry) keysToRemove.push(entry[0]);
      }
    }

    keysToRemove.forEach((kid) => this.keys.delete(kid));
  }

  /**
   * Generate a new key ID
   */
  private generateKid(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `v${timestamp}-${random}`;
  }

  /**
   * Compute X.509 certificate thumbprint (SHA-1)
   */
  private computeX5t(spki: string): string {
    const hash = createHash("sha1");
    hash.update(
      spki
        .replace(/-----BEGIN PUBLIC KEY-----\n/, "")
        .replace(/\n-----END PUBLIC KEY-----/, "")
        .replace(/\n/g, ""),
    );
    return hash.digest("base64url");
  }

  /**
   * Validate key set integrity
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check primary key exists and has private key
    const primary = this.keys.get(this.primaryKid);
    if (!primary) {
      errors.push("Primary key not found");
    } else if (!primary.privateKey) {
      errors.push("Primary key missing private key");
    }

    // Check we don't exceed max keys
    if (this.keys.size > this.config.maxKeys) {
      errors.push(`Key set size (${this.keys.size}) exceeds maximum (${this.config.maxKeys})`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get key rotation status
   */
  getRotationStatus(): {
    primaryKid: string;
    totalKeys: number;
    shouldRotate: boolean;
    oldestKeyAge: number;
    nextRotationIn: number;
  } {
    const primary = this.keys.get(this.primaryKid);
    const now = Date.now();

    let oldestKeyAge = 0;
    for (const keyData of this.keys.values()) {
      const age = now - keyData.createdAt;
      oldestKeyAge = Math.max(oldestKeyAge, age);
    }

    const shouldRotate = this.shouldRotate();
    const nextRotationIn = primary
      ? Math.max(0, this.config.rotationIntervalMs - (now - primary.createdAt))
      : 0;

    return {
      primaryKid: this.primaryKid,
      totalKeys: this.keys.size,
      shouldRotate,
      oldestKeyAge,
      nextRotationIn,
    };
  }
}
