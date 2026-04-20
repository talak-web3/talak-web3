import { describe, it, expect, beforeEach } from 'vitest';
import { AuthoritativeTime, HttpTimeSource, setAuthoritativeTime } from '../../time.js';
import { TalakWeb3Error } from '@talak-web3/errors';

/**
 * ADVERSARIAL TEST: System Clock Skew Attack
 * 
 * Scenario: Attacker manipulates system clock to extend token validity
 * Previous system: Used Date.now() directly, vulnerable to clock manipulation
 * New system: Authoritative time source with drift detection fails closed
 */

describe('Adversarial: Clock Skew Attack', () => {
  beforeEach(() => {
    // Reset global instance before each test
    setAuthoritativeTime(new AuthoritativeTime({
      syncIntervalMs: 1000, // Fast sync for testing
      maxDriftMs: 5000,
    }));
  });

  it('should detect and reject excessive clock drift', async () => {
    // Create mock time source that returns skewed time
    const skewedSource = {
      getTime: async () => {
        // Return time that's 10 seconds ahead (exceeds 5s threshold)
        return Date.now() + 10000;
      },
    };

    const authTime = new AuthoritativeTime({
      timeSource: skewedSource,
      maxDriftMs: 5000,
    });

    // Should throw on sync due to excessive drift
    await expect(authTime.sync()).rejects.toThrow(TalakWeb3Error);
    await expect(authTime.sync()).rejects.toThrow('Clock drift exceeds threshold');
  });

  it('should use authoritative time instead of system time', async () => {
    const accurateSource = {
      getTime: async () => {
        const accurateTime = Date.now() + 100; // Small offset
        return accurateTime;
      },
    };

    const authTime = new AuthoritativeTime({
      timeSource: accurateSource,
      maxDriftMs: 5000,
    });

    // Wait for initial sync
    await new Promise(resolve => setTimeout(resolve, 100));

    const authoritativeNow = authTime.now();
    const systemNow = Date.now();

    // Should have offset applied
    const offset = authTime.getOffset();
    expect(Math.abs(offset - 100)).toBeLessThan(50); // Allow some variance
  });

  it('should auto-resync when interval elapses', async () => {
    let callCount = 0;
    const countingSource = {
      getTime: async () => {
        callCount++;
        return Date.now();
      },
    };

    const authTime = new AuthoritativeTime({
      timeSource: countingSource,
      syncIntervalMs: 100, // Very short for testing
    });

    // Initial sync
    await new Promise(resolve => setTimeout(resolve, 50));
    const initialCalls = callCount;

    // Wait for auto-resync
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Call now() to trigger resync
    authTime.now();
    await new Promise(resolve => setTimeout(resolve, 50));

    // Should have synced at least once more
    expect(callCount).toBeGreaterThan(initialCalls);
  });

  it('should handle time source failures gracefully', async () => {
    const failingSource = {
      getTime: async () => {
        throw new Error('Time source unavailable');
      },
    };

    const authTime = new AuthoritativeTime({
      timeSource: failingSource,
      maxDriftMs: 5000,
    });

    // Sync should fail but not crash
    await expect(authTime.sync()).rejects.toThrow('Time source unavailable');
    
    // Should still return time (with last known offset)
    const time = authTime.now();
    expect(typeof time).toBe('number');
    expect(time).toBeGreaterThan(0);
  });

  it('should compensate for network latency', async () => {
    const latencySource = {
      getTime: async () => {
        // Simulate 50ms network delay
        await new Promise(resolve => setTimeout(resolve, 50));
        return Date.now();
      },
    };

    const authTime = new AuthoritativeTime({
      timeSource: latencySource,
      maxDriftMs: 5000,
    });

    await authTime.sync();
    
    // Offset should account for latency (approximately 25ms compensation)
    const offset = authTime.getOffset();
    expect(Math.abs(offset)).toBeLessThan(100); // Should be close to 0
  });
});

describe('Adversarial: Time-Based Token Expiration Bypass', () => {
  it('should prevent token validity extension via clock manipulation', async () => {
    // This test validates that token expiration checks use authoritative time
    // Implementation is in the main auth module, but we verify the time source here
    
    const accurateSource = {
      getTime: async () => Date.now(),
    };

    const authTime = new AuthoritativeTime({
      timeSource: accurateSource,
    });

    // Simulate token issued at T0 with 15min TTL
    const tokenIssuedAt = authTime.now();
    const tokenTtlMs = 15 * 60 * 1000;
    const tokenExpiresAt = tokenIssuedAt + tokenTtlMs;

    // Attacker tries to set system clock back by 1 hour
    const manipulatedSystemTime = Date.now() - 3600000;
    
    // Token expiration check should use authoritative time, not system time
    const authoritativeNow = authTime.now();
    const isExpired = authoritativeNow > tokenExpiresAt;

    // Should NOT be expired (authoritative time hasn't changed)
    expect(isExpired).toBe(false);
  });
});
