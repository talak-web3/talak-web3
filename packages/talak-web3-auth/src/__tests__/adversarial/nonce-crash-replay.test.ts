import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Redis from 'ioredis';
import { RedisNonceStore } from '../../stores/redis-nonce.js';

/**
 * ADVERSARIAL TEST: Nonce Crash Replay Attack
 * 
 * Scenario: Attacker attempts to reuse nonce after Redis crash + restart
 * Previous system: Single-key storage lost on crash, allowing replay
 * New system: Consumed set persists via AOF, preventing replay
 */

describe('Adversarial: Nonce Crash Replay', () => {
  let redis: Redis;
  let nonceStore: RedisNonceStore;
  const testAddress = '0x1234567890abcdef1234567890abcdef12345678';

  beforeEach(async () => {
    redis = new Redis({
      host: 'localhost',
      port: 6379,
      db: 15, // Use separate DB for tests
    });
    
    nonceStore = new RedisNonceStore({ redis });
    
    // Clean up before each test
    await redis.flushdb();
  });

  afterEach(async () => {
    await redis.quit();
  });

  it('should prevent nonce replay after simulated crash (consumed set persists)', async () => {
    // Setup: Create nonce
    const nonce = await nonceStore.create(testAddress);
    
    // First consume should succeed
    const firstConsume = await nonceStore.consume(testAddress, nonce);
    expect(firstConsume).toBe(true);
    
    // Simulate crash: Clear pending set (like Redis losing non-persisted data)
    const pendingKey = `talak:nonce:pending:${testAddress.toLowerCase()}`;
    await redis.del(pendingKey);
    
    // Attack: Try to replay the same nonce
    // Even though pending set is gone, consumed set should reject it
    const replayAttempt = await nonceStore.consume(testAddress, nonce);
    expect(replayAttempt).toBe(false); // Should fail - nonce already consumed
  });

  it('should handle concurrent consumption atomically', async () => {
    const nonce = await nonceStore.create(testAddress);
    
    // Simulate race condition: Multiple concurrent consume attempts
    const results = await Promise.all([
      nonceStore.consume(testAddress, nonce),
      nonceStore.consume(testAddress, nonce),
      nonceStore.consume(testAddress, nonce),
    ]);
    
    // Only one should succeed
    const successCount = results.filter(r => r).length;
    expect(successCount).toBe(1);
  });

  it('should reject non-existent nonce', async () => {
    const result = await nonceStore.consume(testAddress, 'nonexistent-nonce');
    expect(result).toBe(false);
  });

  it('should handle expired nonces correctly', async () => {
    // Create nonce store with very short TTL
    const shortTtlStore = new RedisNonceStore({
      redis,
      ttlMs: 100, // 100ms TTL
    });
    
    const nonce = await shortTtlStore.create(testAddress);
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Should fail - nonce expired
    const result = await shortTtlStore.consume(testAddress, nonce);
    expect(result).toBe(false);
  });

  it('should maintain consumed set with proper TTL', async () => {
    const nonce = await nonceStore.create(testAddress);
    await nonceStore.consume(testAddress, nonce);
    
    // Verify consumed set exists and has TTL
    const consumedKey = `talak:nonce:consumed:${testAddress.toLowerCase()}`;
    const exists = await redis.exists(consumedKey);
    expect(exists).toBe(1);
    
    const ttl = await redis.ttl(consumedKey);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(86400); // 24 hours max
  });
});
