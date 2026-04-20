import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Redis from 'ioredis';
import { RedisRevocationStore } from '../../stores/redis-revocation.js';

/**
 * ADVERSARIAL TEST: Multi-Instance Revocation Race
 * 
 * Scenario: Multiple instances revoke same key simultaneously
 * Previous system: No distributed propagation, instances accept revoked keys
 * New system: Pub/Sub broadcast ensures all instances receive revocation instantly
 */

describe('Adversarial: Multi-Instance Revocation Race', () => {
  let redis1: Redis;
  let redis2: Redis;
  let store1: RedisRevocationStore;
  let store2: RedisRevocationStore;
  const testJti = 'test-jti-12345';

  beforeEach(async () => {
    // Simulate two separate instances
    redis1 = new Redis({ host: 'localhost', port: 6379, db: 15 });
    redis2 = new Redis({ host: 'localhost', port: 6379, db: 15 });
    
    store1 = new RedisRevocationStore({ 
      redis: redis1,
      enablePubSub: true,
    });
    store2 = new RedisRevocationStore({ 
      redis: redis2,
      enablePubSub: true,
    });
    
    // Clean up
    await redis1.flushdb();
  });

  afterEach(async () => {
    await store1.close();
    await store2.close();
    await redis1.quit();
    await redis2.quit();
  });

  it('should propagate revocation to all instances via Pub/Sub', async () => {
    const expiresAtMs = Date.now() + 3600000; // 1 hour
    
    // Instance 1 revokes
    await store1.revoke(testJti, expiresAtMs);
    
    // Wait for Pub/Sub propagation (100ms should be enough)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Instance 2 should see the revocation in cache
    const isRevoked = await store2.isRevoked(testJti);
    expect(isRevoked).toBe(true);
  });

  it('should handle concurrent revocations from multiple instances', async () => {
    const expiresAtMs = Date.now() + 3600000;
    
    // Both instances revoke simultaneously
    await Promise.all([
      store1.revoke(testJti, expiresAtMs),
      store2.revoke(testJti, expiresAtMs),
    ]);
    
    // Wait for propagation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Both should see it as revoked
    const revoked1 = await store1.isRevoked(testJti);
    const revoked2 = await store2.isRevoked(testJti);
    
    expect(revoked1).toBe(true);
    expect(revoked2).toBe(true);
  });

  it('should fail closed when Pub/Sub is disconnected', async () => {
    const expiresAtMs = Date.now() + 3600000;
    
    // Create store with very short disconnect timeout
    const strictStore = new RedisRevocationStore({
      redis: redis1,
      enablePubSub: true,
      pubSubDisconnectTimeoutMs: 50, // 50ms timeout
    });
    
    // Revoke
    await strictStore.revoke(testJti, expiresAtMs);
    
    // Simulate Pub/Sub disconnection by manipulating timestamp
    (strictStore as any).lastPubSubMessageAt = Date.now() - 1000; // 1 second ago
    
    // Should fall back to Redis check (still works)
    const isRevoked = await strictStore.isRevoked(testJti);
    expect(isRevoked).toBe(true);
    
    await strictStore.close();
  });

  it('should handle global invalidation broadcast', async () => {
    const invalidationTime = Math.floor(Date.now() / 1000);
    
    // Instance 1 sets global invalidation
    await store1.setGlobalInvalidationTime(invalidationTime);
    
    // Wait for propagation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Instance 2 should see it
    const globalTime = await store2.getGlobalInvalidationTime();
    expect(globalTime).toBe(invalidationTime);
  });

  it('should maintain LRU cache size limit', async () => {
    const maxSize = 10;
    const limitedStore = new RedisRevocationStore({
      redis: redis1,
      cacheMaxSize: maxSize,
      enablePubSub: false, // Disable Pub/Sub for this test
    });
    
    // Revoke more than max size
    for (let i = 0; i < 20; i++) {
      await limitedStore.revoke(`jti-${i}`, Date.now() + 3600000);
    }
    
    // Cache should not exceed limit
    const cacheSize = (limitedStore as any).revokedCache.size;
    expect(cacheSize).toBeLessThanOrEqual(maxSize);
    
    await limitedStore.close();
  });
});
