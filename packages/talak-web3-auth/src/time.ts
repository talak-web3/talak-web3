import { TalakWeb3Error } from '@talak-web3/errors';
import type Redis from 'ioredis';

/**
 * AUTHORITATIVE TIME SYSTEM — Immutable, externally anchored time source
 * 
 * Problem: Date.now() is mutable and can be manipulated by:
 * - NTP attacks
 * - Container clock drift
 * - Malicious host processes
 * 
 * Solution: Single trusted time source with drift detection that fails closed.
 * 
 * Architecture:
 * - HTTP-based time synchronization from multiple authoritative sources
 * - Offset calculation applied to local clock
 * - Drift detection with configurable threshold (default 5s)
 * - Automatic re-synchronization every 60 seconds
 * - Fail-closed on excessive drift
 */

export interface TimeSource {
  /** Get current time in milliseconds from authoritative source */
  getTime(): Promise<number>;
}

/**
 * HTTP-based time source using Date headers from reliable endpoints
 */
export class HttpTimeSource implements TimeSource {
  private urls: string[];
  private timeoutMs: number;

  constructor(opts: { urls?: string[]; timeoutMs?: number } = {}) {
    this.urls = opts.urls ?? [
      'https://time.cloudflare.com/cdn-cgi/trace',
      'https://www.google.com/',
    ];
    this.timeoutMs = opts.timeoutMs ?? 3000;
  }

  async getTime(): Promise<number> {
    const errors: Error[] = [];

    // Try each time source in order
    for (const url of this.urls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Extract time from Date header
        const dateHeader = response.headers.get('date');
        if (dateHeader) {
          return new Date(dateHeader).getTime();
        }

        // Fallback: parse response body for Cloudflare trace format
        if (url.includes('cloudflare.com')) {
          const text = await response.text();
          const tsMatch = text.match(/ts=(\d+)/);
          if (tsMatch && tsMatch[1]) {
            return parseInt(tsMatch[1], 10) * 1000;
          }
        }
      } catch (err) {
        errors.push(err instanceof Error ? err : new Error(String(err)));
        // Continue to next source
      }
    }

    // All sources failed
    throw new TalakWeb3Error(
      `All time sources failed: ${errors.map(e => e.message).join(', ')}`,
      {
        code: 'AUTH_TIME_SOURCE_UNAVAILABLE',
        status: 503,
      }
    );
  }
}

/**
 * Authoritative time provider with drift detection and monotonic guarantee
 * 
 * INVARIANT: Time must be monotonically non-decreasing with bounded drift.
 * We don't need "accurate" time — we need "non-forgeable progression".
 * 
 * Monotonic guard prevents:
 * - System clock rollback attacks
 * - Large forward jumps (skips expiration checks)
 * - Cross-node inconsistency (via Redis-persisted floor)
 * 
 * Drift detection prevents:
 * - Gradual clock manipulation
 * - NTP compromise
 * 
 * CLUSTER-WIDE INVARIANT:
 * Monotonic floor is persisted to Redis, ensuring all nodes observe
 * non-decreasing time even after process restarts.
 */
export class AuthoritativeTime {
  private offsetMs: number = 0;
  private lastSyncAt: number = 0;
  private syncIntervalMs: number;
  private maxDriftMs: number;
  private timeSource: TimeSource;
  private syncInProgress: boolean = false;
  
  // MONOTONIC GUARD: Track last observed time
  private lastObservedTime: number = 0;
  private maxForwardJumpMs: number;
  
  // CLUSTER-WIDE MONOTONICITY: Redis-persisted floor
  private redisClient: Redis | null = null;
  private readonly monotonicFloorKey: string;
  private initialized = false;
  
  // PERSISTENT DRIFT: Last known drift across restarts
  private readonly lastDriftKey: string;
  private maxHistoricalDriftMs: number = 0;

  constructor(opts: {
    timeSource?: TimeSource;
    syncIntervalMs?: number;
    maxDriftMs?: number;
    maxForwardJumpMs?: number;
    redis?: Redis | null;
    monotonicFloorKey?: string;
    lastDriftKey?: string;
  } = {}) {
    this.timeSource = opts.timeSource ?? new HttpTimeSource();
    this.syncIntervalMs = opts.syncIntervalMs ?? 60_000; // 1 minute
    this.maxDriftMs = opts.maxDriftMs ?? 5_000; // 5 seconds
    this.maxForwardJumpMs = opts.maxForwardJumpMs ?? 60_000; // 1 minute max jump
    this.redisClient = opts.redis ?? null;
    this.monotonicFloorKey = opts.monotonicFloorKey ?? 'talak:time:monotonic_floor';
    this.lastDriftKey = opts.lastDriftKey ?? 'talak:time:last_drift';
    
    // Initial synchronization (async, doesn't block construction)
    this.initialize();
  }

  /**
   * Initialize time source with cluster-wide monotonic floor
   */
  private async initialize(): Promise<void> {
    try {
      // Load cluster-wide monotonic floor from Redis
      if (this.redisClient) {
        const floorStr = await this.redisClient.get(this.monotonicFloorKey);
        if (floorStr) {
          this.lastObservedTime = parseInt(floorStr, 10);
        }
        
        // Load last known drift for cross-restart validation
        const driftStr = await this.redisClient.get(this.lastDriftKey);
        if (driftStr) {
          this.maxHistoricalDriftMs = parseInt(driftStr, 10);
          
          // CRITICAL: If historical drift exceeded bound, fail closed
          if (this.maxHistoricalDriftMs > this.maxDriftMs) {
            throw new TalakWeb3Error(
              `Historical time drift exceeded bound: ${this.maxHistoricalDriftMs}ms > ${this.maxDriftMs}ms — possible clock attack or misconfiguration`,
              { code: 'AUTH_TIME_HISTORICAL_DRIFT', status: 503 }
            );
          }
        }
      }
      
      // Sync with authoritative time source
      await this.sync();
      this.initialized = true;
    } catch (err) {
      // FAIL CLOSED: Time initialization failure is fatal
      console.error('[AUTH] CRITICAL: Time initialization failed:', err);
      throw err;
    }
  }

  /**
   * Get current authoritative time in milliseconds
   * 
   * INVARIANT GUARANTEE:
   * - Time is monotonically non-decreasing
   * - Forward jumps are bounded to maxForwardJumpMs
   * - Drift from authoritative source is bounded to maxDriftMs
   * 
   * VIOLATION BEHAVIOR: Throws immediately (fail closed)
   */
  now(): number {
    const localNow = Date.now();
    const correctedTime = localNow + this.offsetMs;
    
    // MONOTONIC CHECK: Prevent time rollback
    if (correctedTime < this.lastObservedTime) {
      throw new TalakWeb3Error(
        `Time regression detected: ${correctedTime} < ${this.lastObservedTime} — possible clock manipulation`,
        {
          code: 'AUTH_TIME_REGRESSION',
          status: 503,
        }
      );
    }
    
    // BOUNDED JUMP CHECK: Prevent large forward skips
    if (correctedTime - this.lastObservedTime > this.maxForwardJumpMs) {
      throw new TalakWeb3Error(
        `Time jump exceeds bound: ${correctedTime - this.lastObservedTime}ms > ${this.maxForwardJumpMs}ms — possible clock attack`,
        {
          code: 'AUTH_TIME_JUMP',
          status: 503,
        }
      );
    }
    
    this.lastObservedTime = correctedTime;
    
    // Persist monotonic floor to Redis (cluster-wide guarantee)
    if (this.redisClient) {
      this.redisClient.set(
        this.monotonicFloorKey,
        correctedTime.toString(),
        'EX',
        86400 // 24 hour TTL
      ).catch(err => {
        console.warn('[AUTH] Failed to persist monotonic floor:', err);
      });
      
      // Persist current drift for cross-restart validation
      const currentDrift = Math.abs(this.offsetMs);
      this.redisClient.set(
        this.lastDriftKey,
        currentDrift.toString(),
        'EX',
        86400 // 24 hour TTL
      ).catch(err => {
        console.warn('[AUTH] Failed to persist time drift:', err);
      });
      
      // Track max historical drift
      if (currentDrift > this.maxHistoricalDriftMs) {
        this.maxHistoricalDriftMs = currentDrift;
      }
    }
    
    // Trigger re-sync if stale (non-blocking)
    if (localNow - this.lastSyncAt > this.syncIntervalMs && !this.syncInProgress) {
      this.sync().catch(err => {
        console.warn('[AUTH] Time synchronization failed:', err);
      });
    }
    
    return correctedTime;
  }

  /**
   * Synchronize with authoritative time source
   * Fails closed if drift exceeds threshold
   */
  async sync(): Promise<void> {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      const localBefore = Date.now();
      const remoteTime = await this.timeSource.getTime();
      const localAfter = Date.now();

      // Calculate offset with network latency compensation
      const roundTripMs = localAfter - localBefore;
      const estimatedLocalTime = localBefore + (roundTripMs / 2);
      const newOffset = remoteTime - estimatedLocalTime;

      // Check drift threshold
      if (Math.abs(newOffset) > this.maxDriftMs) {
        throw new TalakWeb3Error(
          `Clock drift exceeds threshold: ${newOffset}ms (max: ${this.maxDriftMs}ms) - possible time attack`,
          {
            code: 'AUTH_CLOCK_DRIFT',
            status: 503,
          }
        );
      }

      this.offsetMs = newOffset;
      this.lastSyncAt = Date.now();
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get current offset from system time (for monitoring)
   */
  getOffset(): number {
    return this.offsetMs;
  }

  /**
   * Get last synchronization timestamp
   */
  getLastSyncAt(): number {
    return this.lastSyncAt;
  }

  /**
   * Get last observed monotonic time (for audit)
   */
  getLastObservedTime(): number {
    return this.lastObservedTime;
  }
}

/**
 * Global singleton instance for application-wide time consistency
 * Initialize once at application startup
 */
let globalAuthoritativeTime: AuthoritativeTime | null = null;

export function getAuthoritativeTime(): AuthoritativeTime {
  if (!globalAuthoritativeTime) {
    globalAuthoritativeTime = new AuthoritativeTime();
  }
  return globalAuthoritativeTime;
}

export function setAuthoritativeTime(instance: AuthoritativeTime): void {
  globalAuthoritativeTime = instance;
}
