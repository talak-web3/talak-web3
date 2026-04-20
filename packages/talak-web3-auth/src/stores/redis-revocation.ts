import type Redis from "ioredis";
import { TalakWeb3Error } from "@talak-web3/errors";
import type { RevocationStore } from "../contracts.js";

export interface RedisRevocationStoreOptions {
  redis: Redis;
  /** Key prefix. Default talak:jti: */
  keyPrefix?: string;
}

/**
 * Redis-backed JTI revocation list. Each JTI is stored with TTL so Redis evicts
 * entries when the original access token would have expired.
 */
export class RedisRevocationStore implements RevocationStore {
  private readonly redis: Redis;
  private readonly prefix: string;

  constructor(opts: RedisRevocationStoreOptions) {
    this.redis = opts.redis;
    this.prefix = opts.keyPrefix ?? "talak:jti:";
  }

  private key(jti: string): string {
    return `${this.prefix}${jti}`;
  }

  private globalKey(): string {
    return `${this.prefix}global_invalidation`;
  }

  async revoke(jti: string, expiresAtMs: number): Promise<void> {
    const ttl = Math.max(1, expiresAtMs - Date.now());
    try {
      await this.redis.set(this.key(jti), "1", "PX", ttl);
    } catch (err) {
      throw new TalakWeb3Error("Redis revocation store failure", {
        code: "AUTH_REDIS_REVOCATION_ERROR",
        status: 503,
        cause: err,
      });
    }
  }

  async isRevoked(jti: string): Promise<boolean> {
    try {
      const v = await this.redis.get(this.key(jti));
      return v !== null;
    } catch (err) {
      throw new TalakWeb3Error("Redis revocation store failure", {
        code: "AUTH_REDIS_REVOCATION_ERROR",
        status: 503,
        cause: err,
      });
    }
  }

  async setGlobalInvalidationTime(timestampSeconds: number): Promise<void> {
    try {
      await this.redis.set(this.globalKey(), timestampSeconds.toString());
    } catch (err) {
      throw new TalakWeb3Error("Redis revocation store failure", {
        code: "AUTH_REDIS_REVOCATION_ERROR",
        status: 503,
        cause: err,
      });
    }
  }

  async getGlobalInvalidationTime(): Promise<number> {
    try {
      const v = await this.redis.get(this.globalKey());
      return v ? parseInt(v, 10) : 0;
    } catch (err) {
      throw new TalakWeb3Error("Redis revocation store failure", {
        code: "AUTH_REDIS_REVOCATION_ERROR",
        status: 503,
        cause: err,
      });
    }
  }
}
