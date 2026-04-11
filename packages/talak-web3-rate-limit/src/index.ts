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
// In-Memory Rate Limiter (for development/testing)
// ---------------------------------------------------------------------------

interface MemoryBucket {
  tokens: number;
  lastRefill: number;
}

export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, MemoryBucket>();
  private readonly capacity: number;
  private readonly refillPerSecond: number;

  constructor(opts: { capacity: number; refillPerSecond: number }) {
    this.capacity = opts.capacity;
    this.refillPerSecond = opts.refillPerSecond;
    console.warn(
      '[talak-web3-rate-limit] InMemoryRateLimiter is in use. ' +
      'This is NOT suitable for production or distributed systems. ' +
      'Use RedisRateLimiter for production.',
    );
  }

  async check(key: string, cost = 1): Promise<RateLimitResult> {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    // Initialize bucket if doesn't exist
    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillPerSecond;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if enough tokens available
    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetAt: now + ((this.capacity - bucket.tokens) / this.refillPerSecond) * 1000,
      };
    }

    // Calculate when enough tokens will be available
    const tokensNeeded = cost - bucket.tokens;
    const waitTime = (tokensNeeded / this.refillPerSecond) * 1000;

    return {
      allowed: false,
      remaining: 0,
      resetAt: now + waitTime,
    };
  }

  async reset(key: string): Promise<void> {
    this.buckets.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Redis Rate Limiter (for production)
// ---------------------------------------------------------------------------

const slidingWindowLua = `
-- KEYS[1] = limit key
-- ARGV[1] = windowMs
-- ARGV[2] = limit
-- returns: { allowed(0/1), remaining }

local time = redis.call('TIME')
local now = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
local windowStart = now - tonumber(ARGV[1])

-- Remove old entries
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', windowStart)

local currentCount = redis.call('ZCARD', KEYS[1])
local allowed = 0
local remaining = tonumber(ARGV[2]) - currentCount

if currentCount < tonumber(ARGV[2]) then
  allowed = 1
  redis.call('ZADD', KEYS[1], now, now .. ":" .. math.random())
  remaining = remaining - 1
end

redis.call('PEXPIRE', KEYS[1], ARGV[1])

return { allowed, remaining }
`;

export class RedisRateLimiter implements RateLimiter {
  private readonly redis: any; // ioredis or compatible client
  private readonly capacity: number;
  private readonly refillPerSecond: number;

  constructor(
    redis: any,
    opts: { capacity: number; refillPerSecond: number },
  ) {
    this.redis = redis;
    this.capacity = opts.capacity;
    this.refillPerSecond = opts.refillPerSecond;
  }

  async check(key: string, _cost = 1): Promise<RateLimitResult> {
    const windowMs = (this.capacity / this.refillPerSecond) * 1000;

    const res = await this.redis.eval(slidingWindowLua, {
      keys: [`ratelimit:${key}`],
      arguments: [String(windowMs), String(this.capacity)],
    }) as unknown;

    if (!Array.isArray(res) || res.length < 2) {
      return { allowed: false, remaining: 0 };
    }

    const allowed = Number(res[0]) === 1;
    const remaining = Math.max(0, Number(res[1]));

    return {
      allowed,
      remaining,
      resetAt: Date.now() + windowMs,
    };
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(`ratelimit:${key}`);
  }
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

export function createRateLimiter(opts: {
  type: 'memory';
  capacity: number;
  refillPerSecond: number;
}): InMemoryRateLimiter;

export function createRateLimiter(opts: {
  type: 'redis';
  redis: any;
  capacity: number;
  refillPerSecond: number;
}): RedisRateLimiter;

export function createRateLimiter(opts: {
  type: 'memory' | 'redis';
  redis?: any;
  capacity: number;
  refillPerSecond: number;
}): RateLimiter {
  if (opts.type === 'redis') {
    if (!opts.redis) {
      throw new Error('Redis client required for redis rate limiter');
    }
    return new RedisRateLimiter(opts.redis, {
      capacity: opts.capacity,
      refillPerSecond: opts.refillPerSecond,
    });
  }

  return new InMemoryRateLimiter({
    capacity: opts.capacity,
    refillPerSecond: opts.refillPerSecond,
  });
}
