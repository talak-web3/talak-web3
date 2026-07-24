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

function safeDbIndex(envVar: string | undefined, fallback: number): number {
  if (!envVar) return fallback;
  const n = Number(envVar);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 15) {
    throw new Error(`Invalid Redis DB index: ${envVar}. Must be integer 0-15.`);
  }
  return n;
}

let shutdownRegistered = false;
function registerShutdown(): void {
  if (shutdownRegistered) return;
  shutdownRegistered = true;
  const handler = async () => {
    await ConnectionManager.shutdown();
    process.exit(0);
  };
  process.on("SIGTERM", handler);
  process.on("SIGINT", handler);
  process.on("exit", () => {
    ConnectionManager.shutdown();
  });
}

export class ConnectionManager {
  private static redisInstances = new Map<string, Redis>();

  /**
   * Get or create a Redis connection.
   *
   * @param purpose - The purpose label for this connection.
   * @param redisUrl - Optional Redis URL override. If not provided, falls back to REDIS_URL env var or "redis://localhost:6379".
   */
  static getRedis(
    purpose: "sessions" | "rate-limit" | "revocation" = "sessions",
    redisUrl?: string,
  ): Redis {
    const baseUrl = redisUrl || process.env["REDIS_URL"] || "redis://localhost:6379";
    const dbMap: Record<string, number> = {
      sessions: safeDbIndex(process.env["REDIS_DB_SESSIONS"], 0),
      "rate-limit": safeDbIndex(process.env["REDIS_DB_RATE_LIMIT"], 1),
      revocation: safeDbIndex(process.env["REDIS_DB_REVOCATION"], 2),
    };

    const db = dbMap[purpose] ?? 0;
    const instanceKey = `${baseUrl}:${db}`;

    const existing = this.redisInstances.get(instanceKey);
    if (existing) {
      return existing;
    }

    registerShutdown();

    const options: RedisOptions = {
      ...HARDENED_REDIS_OPTS,
      db,
    };

    if (baseUrl.startsWith("rediss://")) {
      options.tls = {};
    }

    const client = new Redis(baseUrl, options);

    client.on("error", (_err: Error) => {
      void _err;
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
