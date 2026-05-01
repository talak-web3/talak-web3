import Redis, { type RedisOptions } from "ioredis";

export const HARDENED_REDIS_OPTS: RedisOptions = {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => Math.min(times * 100, 3000),
  reconnectOnError: (err: Error) => {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) return true;
    return false;
  },

  enableReadyCheck: true,
  maxLoadingRetryTime: 10000,
  connectTimeout: 5000,
};

export class ConnectionManager {
  private static redisInstances = new Map<string, Redis>();

  static getRedis(purpose: "sessions" | "rate-limit" | "revocation" = "sessions"): Redis {
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

    const options: RedisOptions = {
      ...HARDENED_REDIS_OPTS,
      db,
    };

    if (baseUrl.startsWith("rediss://")) {
      options.tls = {};
    }

    const client = new Redis(baseUrl, options);

    client.on("error", (err: Error) => {
      console.error(`[ConnectionManager] Redis Error (${purpose}):`, err.message);
    });

    this.redisInstances.set(instanceKey, client);
    return client;
  }

  static async shutdown(): Promise<void> {
    const closes = Array.from(this.redisInstances.values()).map((r) => r.quit());
    await Promise.all(closes);
    this.redisInstances.clear();
  }
}
