/**
 * Rate limiting utilities for talak-web3
 *
 * Provides both in-memory and Redis-backed rate limiting implementations.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: number;
}

export interface RateLimiter {
  check(key: string, cost?: number): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Redis Rate Limiter (Production-grade, distributed)
// ---------------------------------------------------------------------------

/**
 * Sliding window rate limiting using Redis and Lua script for atomicity.
 * Supports variable cost (token consumption) and adaptive penalties.
 * Key structure: rate_limit:{key}
 * Returns: { allowed(0/1), remaining, resetAtMs }
 */
const adaptiveSlidingWindowLua = `
local key = KEYS[1]
local windowMs = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local cost = tonumber(ARGV[4]) or 1
local windowStart = now - windowMs

-- Cleanup expired entries
redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)

local currentCount = redis.call('ZCARD', key)
local allowed = 0
local remaining = limit - currentCount

if (currentCount + cost) <= limit then
  allowed = 1
  -- Add entries for each cost unit to correctly track capacity
  for i=1,cost do
    redis.call('ZADD', key, now, now .. ":" .. i .. ":" .. math.random())
  end
  remaining = limit - (currentCount + cost)
end

-- Set expiry to at least the window duration
redis.call('PEXPIRE', key, windowMs)

return { allowed, remaining, now + windowMs }
`;

export class RedisRateLimiter implements RateLimiter {
  private readonly redis: any;
  private readonly capacity: number;
  private readonly windowMs: number;

  constructor(redis: any, opts: { capacity: number; windowMs: number }) {
    if (!redis) throw new Error("Redis client required for distributed rate limiting");
    this.redis = redis;
    this.capacity = opts.capacity;
    this.windowMs = opts.windowMs;
  }

  /**
   * Checks if a request is allowed.
   * @param key Unique identifier (IP, address, etc.)
   * @param cost Number of tokens to consume (default: 1)
   */
  async check(key: string, cost = 1): Promise<RateLimitResult> {
    const fullKey = `rate_limit:${key}`;
    const now = Date.now();

    const res = (await this.redis.eval(
      adaptiveSlidingWindowLua,
      1,
      fullKey,
      String(this.windowMs),
      String(this.capacity),
      String(now),
      String(cost),
    )) as unknown;

    if (!Array.isArray(res) || res.length < 3) {
      return { allowed: false, remaining: 0 };
    }

    return {
      allowed: Number(res[0]) === 1,
      remaining: Math.max(0, Number(res[1])),
      resetAt: Number(res[2]),
    };
  }

  /**
   * Forcefully applies a penalty by consuming tokens regardless of current state.
   * Useful for penalizing failed auth attempts.
   */
  async penalize(key: string, cost: number): Promise<void> {
    const fullKey = `rate_limit:${key}`;
    const now = Date.now();

    // Just add tokens to the set to reduce remaining capacity
    for (let i = 0; i < cost; i++) {
      await this.redis.zadd(fullKey, now, `${now}:penalty:${i}:${Math.random()}`);
    }
    await this.redis.pexpire(fullKey, this.windowMs);
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(`rate_limit:${key}`);
  }
}

/**
 * Factory for production-grade rate limiters.
 * Note: Memory fallback is disabled for security reasons.
 */
export function createRateLimiter(opts: {
  redis: any;
  capacity: number;
  windowMs: number;
}): RedisRateLimiter {
  return new RedisRateLimiter(opts.redis, opts);
}
