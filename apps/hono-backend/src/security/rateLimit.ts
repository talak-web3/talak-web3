import type { MiddlewareHandler } from 'hono';
import type { RedisClientType } from 'redis';

export type TokenBucketConfig = {
  capacity: number;
  refillPerSecond: number;
};

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

export async function rateLimitRedis(
  redis: RedisClientType,
  key: string,
  cfg: TokenBucketConfig,
  _cost = 1, // cost ignored for simple sliding window
): Promise<{ allowed: boolean; remaining: number }> {
  // Configured with capacity as limit and 1/refillPerSecond as window
  // e.g. 10 requests / 60 seconds
  const windowMs = (cfg.capacity / cfg.refillPerSecond) * 1000;
  
  const res = await redis.eval(slidingWindowLua, {
    keys: [key],
    arguments: [String(windowMs), String(cfg.capacity)],
  }) as unknown;

  if (!Array.isArray(res) || res.length < 2) return { allowed: false, remaining: 0 };
  const allowed = Number(res[0]) === 1;
  const remaining = Math.max(0, Number(res[1]));
  return { allowed, remaining };
}

export function rateLimitMiddleware(opts: {
  redis: RedisClientType;
  bucket: TokenBucketConfig;
  keyFn: (c: Parameters<MiddlewareHandler>[0]) => string;
}): MiddlewareHandler {
  return async (c, next) => {
    const key = opts.keyFn(c);
    const result = await rateLimitRedis(opts.redis, key, opts.bucket, 1);
    if (!result.allowed) {
      c.header('Retry-After', '1');
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }
    await next();
  };
}

