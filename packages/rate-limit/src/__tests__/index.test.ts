import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  InMemoryRateLimiter,
  extractSubnet,
  normalizeIpForRateLimit,
  rateLimitHeaders,
} from "../index.js";

describe("InMemoryRateLimiter", () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    limiter = new InMemoryRateLimiter({ capacity: 5, refillPerSecond: 1 });
  });

  it("allows requests within limit", async () => {
    for (let i = 0; i < 5; i++) {
      const result = await limiter.check("test-key");
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks requests exceeding limit", async () => {
    for (let i = 0; i < 5; i++) await limiter.check("test-key");
    const result = await limiter.check("test-key");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetAt).toBeDefined();
  });

  it("tracks different keys independently", async () => {
    for (let i = 0; i < 5; i++) await limiter.check("key1");
    expect((await limiter.check("key1")).allowed).toBe(false);
    expect((await limiter.check("key2")).allowed).toBe(true);
  });

  it("resets rate limit for a key", async () => {
    for (let i = 0; i < 5; i++) await limiter.check("test-key");
    expect((await limiter.check("test-key")).allowed).toBe(false);
    await limiter.reset("test-key");
    expect((await limiter.check("test-key")).allowed).toBe(true);
  });

  it("respects cost parameter", async () => {
    const r1 = await limiter.check("test-key", 3);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = await limiter.check("test-key", 2);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(0);

    const r3 = await limiter.check("test-key");
    expect(r3.allowed).toBe(false);
  });

  it("refills tokens over time", async () => {
    for (let i = 0; i < 5; i++) await limiter.check("time-key");
    expect((await limiter.check("time-key")).allowed).toBe(false);

    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.advanceTimersByTime(2000);
    const r = await limiter.check("time-key");
    expect(r.allowed).toBe(true);
    vi.useRealTimers();
  });

  it("evicts oldest bucket when maxBuckets exceeded", async () => {
    const smallLimiter = new InMemoryRateLimiter({
      capacity: 5,
      refillPerSecond: 1,
      maxBuckets: 3,
    });
    await smallLimiter.check("a");
    await smallLimiter.check("b");
    await smallLimiter.check("c");
    await smallLimiter.check("d");
    const r = await smallLimiter.check("b");
    expect(r.allowed).toBe(true);
  });
});

describe("extractSubnet", () => {
  it("handles IPv4", () => {
    expect(extractSubnet("192.168.1.100")).toBe("192.168.1.100/30");
  });

  it("handles IPv4-mapped IPv6", () => {
    expect(extractSubnet("::ffff:127.0.0.1")).toBe("127.0.0.0/30");
  });

  it("handles IPv6", () => {
    const result = extractSubnet("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
    expect(result).toContain("::/64");
  });

  it("throws on invalid IP", () => {
    expect(() => extractSubnet("not-an-ip")).toThrow("Invalid IP format");
  });
});

describe("normalizeIpForRateLimit", () => {
  it("returns original string on invalid input without throwing", () => {
    expect(normalizeIpForRateLimit("invalid")).toBe("invalid");
  });

  it("normalizes valid IPs", () => {
    expect(normalizeIpForRateLimit("10.0.0.1")).toBe("10.0.0.0/30");
  });
});

describe("rateLimitHeaders", () => {
  it("produces correct headers", () => {
    const headers = rateLimitHeaders(3, 10, 1700000000000);
    expect(headers["X-RateLimit-Limit"]).toBe("10");
    expect(headers["X-RateLimit-Remaining"]).toBe("3");
    expect(headers["X-RateLimit-Reset"]).toBe(String(Math.ceil(1700000000000 / 1000)));
  });

  it("clamps negative remaining to 0", () => {
    const headers = rateLimitHeaders(-5, 10, 1700000000000);
    expect(headers["X-RateLimit-Remaining"]).toBe("0");
  });
});
