import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryRateLimiter } from "../src/index.js";

describe("InMemoryRateLimiter", () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    limiter = new InMemoryRateLimiter({
      capacity: 5,
      refillPerSecond: 1,
    });
  });

  it("should allow requests within limit", async () => {
    for (let i = 0; i < 5; i++) {
      const result = await limiter.check("test-key");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    }
  });

  it("should block requests exceeding limit", async () => {
    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      await limiter.check("test-key");
    }

    // Next request should be blocked
    const result = await limiter.check("test-key");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetAt).toBeDefined();
  });

  it("should track different keys independently", async () => {
    // Exhaust key1
    for (let i = 0; i < 5; i++) {
      await limiter.check("key1");
    }

    // key1 should be blocked
    expect((await limiter.check("key1")).allowed).toBe(false);

    // key2 should still be allowed
    expect((await limiter.check("key2")).allowed).toBe(true);
  });

  it("should reset rate limit for a key", async () => {
    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      await limiter.check("test-key");
    }

    // Verify blocked
    expect((await limiter.check("test-key")).allowed).toBe(false);

    // Reset
    await limiter.reset("test-key");

    // Should be allowed again
    expect((await limiter.check("test-key")).allowed).toBe(true);
  });

  it("should respect cost parameter", async () => {
    // Request with cost of 3
    const result1 = await limiter.check("test-key", 3);
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2);

    // Request with cost of 2 (should use remaining)
    const result2 = await limiter.check("test-key", 2);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(0);

    // Next request should be blocked
    const result3 = await limiter.check("test-key");
    expect(result3.allowed).toBe(false);
  });
});
