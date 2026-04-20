import type Redis from "ioredis";
import { TalakWeb3Error } from "@talak-web3/errors";
import type { NonceStore } from "../contracts.js";

/** Atomic GET+DEL — returns 1 if key existed (nonce valid), 0 if missing/expired. */
const CONSUME_NONCE_LUA = `
local v = redis.call('GET', KEYS[1])
if v == false then return 0 end
redis.call('DEL', KEYS[1])
return 1
`;

export interface RedisNonceStoreOptions {
  /** Shared ioredis client (caller manages connect/quit). */
  redis: Redis;
  /** TTL for each nonce (capped at 5 minutes). Default 5 minutes. */
  ttlMs?: number;
  /** Key prefix. Default talak:nonce: */
  keyPrefix?: string;
}

/**
 * Redis-backed nonce store for production: one key per (address, nonce), TTL via PX.
 * Consumption is atomic (Lua GET+DEL) so the same nonce cannot be consumed twice.
 */
export class RedisNonceStore implements NonceStore {
  private readonly redis: Redis;
  private readonly ttlMs: number;
  private readonly prefix: string;

  constructor(opts: RedisNonceStoreOptions) {
    this.redis = opts.redis;
    this.ttlMs = Math.min(opts.ttlMs ?? 5 * 60_000, 5 * 60_000);
    this.prefix = opts.keyPrefix ?? "talak:nonce:";
  }

  private key(address: string, nonce: string): string {
    return `${this.prefix}${address.toLowerCase()}:${nonce}`;
  }

  async create(address: string, _meta?: { ip?: string; ua?: string }): Promise<string> {
    const addr = address.toLowerCase();
    const nonce = crypto.randomUUID().replace(/-/g, "");
    await this.redis.set(this.key(addr, nonce), "1", "PX", this.ttlMs);
    return nonce;
  }

  async consume(address: string, nonce: string): Promise<boolean> {
    const addr = address.toLowerCase();
    const k = this.key(addr, nonce);
    try {
      const n = (await this.redis.eval(CONSUME_NONCE_LUA, 1, k)) as number;
      return n === 1;
    } catch (err) {
      throw new TalakWeb3Error("Redis nonce store failure", {
        code: "AUTH_REDIS_NONCE_ERROR",
        status: 503,
        cause: err,
      });
    }
  }
}
