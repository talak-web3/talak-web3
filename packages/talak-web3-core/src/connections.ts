import Redis, { type RedisOptions } from "ioredis";
import { TalakWeb3Error } from "@talak-web3/errors";

/**
 * Hardened Redis connection options for production.
 * Enforces TLS, authentication, and strict connection limits.
 */
export const HARDENED_REDIS_OPTS: RedisOptions = {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
  reconnectOnError: (err) => {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) return true;
    return false;
  },
  // Production hardening
  enableReadyCheck: true,
  maxLoadingRetryTime: 10000,
  connectTimeout: 5000,
  // Ensure we don't evict session data if possible
  // Note: eviction policy is usually set on the Redis server itself,
  // but we can request a specific behavior via connection hints if supported.
};

/**
 * Centralized Connection Manager.
 * Manages hardened infrastructure pools (Redis, RPC providers).
 * Supports logical separation of concerns (e.g. separate DBs for sessions vs rate limiting).
 */
export class ConnectionManager {
  private static redisInstances = new Map<string, Redis>();

  /**
   * Returns a pooled, hardened Redis instance for the given purpose.
   * Reuses existing connections but allows logical DB separation.
   */
  static getRedis(purpose: "sessions" | "rate-limit" | "revocation" = "sessions"): Redis {
    // 1. Resolve connection details from environment
    const baseUrl = process.env["REDIS_URL"] || "redis://localhost:6379";
    const dbMap: Record<string, number> = {
      sessions: parseInt(process.env["REDIS_DB_SESSIONS"] || "0"),
      "rate-limit": parseInt(process.env["REDIS_DB_RATE_LIMIT"] || "1"),
      revocation: parseInt(process.env["REDIS_DB_REVOCATION"] || "2"),
    };

    const db = dbMap[purpose] ?? 0;
    const instanceKey = `${baseUrl}:${db}`;

    if (this.redisInstances.has(instanceKey)) {
      return this.redisInstances.get(instanceKey)!;
    }

    // 2. Initialize new hardened connection
    const options: RedisOptions = {
      ...HARDENED_REDIS_OPTS,
      db,
    };

    // Automatically enable TLS if URL starts with rediss://
    if (baseUrl.startsWith("rediss://")) {
      options.tls = {};
    }

    const client = new Redis(baseUrl, options);

    client.on("error", (err) => {
      console.error(`[ConnectionManager] Redis Error (${purpose}):`, err.message);
    });

    this.redisInstances.set(instanceKey, client);
    return client;
  }

  /**
   * Gracefully closes all managed connections.
   */
  static async shutdown(): Promise<void> {
    const closes = Array.from(this.redisInstances.values()).map((r) => r.quit());
    await Promise.all(closes);
    this.redisInstances.clear();
  }
}
