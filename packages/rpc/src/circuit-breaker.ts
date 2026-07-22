import { TalakWeb3Error, CIRCUIT_ERROR_CODES } from "@talak-web3/errors";

export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: Record<string, unknown>): Promise<unknown>;
  del(key: string): Promise<unknown>;
  incr(key: string): Promise<number>;
}

export interface CircuitBreakerConfig {
  redis: RedisLike;
  failureThreshold: number;
  successThreshold: number;
  halfOpenTimeout: number;
  windowSize: number;
  latencyThreshold?: number;
  minRequestsForLatency?: number;
  halfOpenMaxRequests?: number;
}

export interface CircuitState {
  state: "closed" | "open" | "half-open";
  failures: number;
  successes: number;
  halfOpenInFlight?: number;
  lastFailure?: number;
  lastSuccess?: number;
  openedAt?: number;
  latencyStats?: {
    average: number;
    count: number;
    lastUpdated: number;
  };
}

export class DistributedCircuitBreaker {
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      latencyThreshold: 2000,
      minRequestsForLatency: 10,
      halfOpenMaxRequests: 1,
      ...config,
    };
  }

  private getKey(chainId: number, providerId: string): string {
    return `circuit:${chainId}:${providerId}`;
  }

  private getLatencyKey(chainId: number, providerId: string): string {
    return `circuit:${chainId}:${providerId}:latency`;
  }

  private getHalfOpenKey(chainId: number, providerId: string): string {
    return `circuit:${chainId}:${providerId}:halfopen`;
  }

  async execute<T>(
    chainId: number,
    providerId: string,
    operation: () => Promise<T>,
    timeoutMs: number = 5000,
  ): Promise<T> {
    const state = await this.getState(chainId, providerId);

    if (state.state === "open") {
      const now = Date.now();
      if (state.openedAt && now - state.openedAt < this.config.halfOpenTimeout) {
        throw new TalakWeb3Error("Circuit breaker open", {
          code: CIRCUIT_ERROR_CODES.OPEN,
          status: 503,
          data: { chainId, providerId, openedAt: state.openedAt },
        });
      }

      await this.setState(chainId, providerId, {
        state: "half-open",
        failures: 0,
        successes: 0,
      });
      await this.config.redis.del(this.getHalfOpenKey(chainId, providerId));
    }

    if (state.state === "half-open") {
      const inFlight = await this.config.redis.incr(this.getHalfOpenKey(chainId, providerId));
      await this.config.redis.set(this.getHalfOpenKey(chainId, providerId), String(inFlight), {
        PX: this.config.halfOpenTimeout,
      });

      if (inFlight > (this.config.halfOpenMaxRequests ?? 1)) {
        throw new TalakWeb3Error("Circuit breaker half-open limit reached", {
          code: CIRCUIT_ERROR_CODES.OPEN,
          status: 503,
          data: { chainId, providerId, inFlight },
        });
      }
    }

    const startTime = Date.now();

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), timeoutMs),
        ),
      ]);

      const latency = Date.now() - startTime;
      await this.recordSuccess(chainId, providerId, latency);

      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      await this.recordFailure(chainId, providerId, error, latency);
      throw error;
    }
  }

  private async getState(chainId: number, providerId: string): Promise<CircuitState> {
    try {
      const key = this.getKey(chainId, providerId);
      const data = await this.config.redis.get(key);

      if (!data) {
        return {
          state: "closed",
          failures: 0,
          successes: 0,
        };
      }

      return JSON.parse(data);
    } catch {
      return {
        state: "closed",
        failures: 0,
        successes: 0,
      };
    }
  }

  private async setState(chainId: number, providerId: string, state: CircuitState): Promise<void> {
    try {
      const key = this.getKey(chainId, providerId);
      await this.config.redis.set(key, JSON.stringify(state));
    } catch (error) {
      console.warn("Failed to update circuit state:", error);
    }
  }

  private async recordSuccess(chainId: number, providerId: string, latency: number): Promise<void> {
    const state = await this.getState(chainId, providerId);

    await this.updateLatencyStats(chainId, providerId, latency);

    if (state.state === "half-open") {
      state.successes++;

      if (state.successes >= this.config.successThreshold) {
        state.state = "closed";
        state.failures = 0;
        state.successes = 0;
        await this.config.redis.del(this.getHalfOpenKey(chainId, providerId));
      }
    } else {
      state.failures = Math.max(0, state.failures - 1);
    }

    state.lastSuccess = Date.now();
    await this.setState(chainId, providerId, state);
  }

  private async recordFailure(
    chainId: number,
    providerId: string,
    error: unknown,
    latency: number,
  ): Promise<void> {
    const state = await this.getState(chainId, providerId);

    const isLatencyFailure = this.config.latencyThreshold && latency > this.config.latencyThreshold;

    const shouldUseAdaptiveThreshold = await this.shouldUseAdaptiveThreshold(chainId, providerId);
    let failureWeight = 1;

    if (shouldUseAdaptiveThreshold && isLatencyFailure) {
      const excessLatency = latency - this.config.latencyThreshold!;
      failureWeight = Math.min(3, 1 + excessLatency / this.config.latencyThreshold!);
    }

    const shouldCountFailure =
      !(error instanceof TalakWeb3Error && error.code === "CIRCUIT_OPEN") || isLatencyFailure;

    if (shouldCountFailure) {
      state.failures += failureWeight;
      state.lastFailure = Date.now();

      const effectiveThreshold = shouldUseAdaptiveThreshold
        ? await this.calculateAdaptiveThreshold(chainId, providerId)
        : this.config.failureThreshold;

      if (state.state === "closed" && state.failures >= effectiveThreshold) {
        state.state = "open";
        state.openedAt = Date.now();
        state.halfOpenInFlight = 0;
      } else if (state.state === "half-open") {
        state.state = "open";
        state.openedAt = Date.now();
        await this.config.redis.del(this.getHalfOpenKey(chainId, providerId));
      }
    }

    await this.setState(chainId, providerId, state);
  }

  private async updateLatencyStats(
    chainId: number,
    providerId: string,
    latency: number,
  ): Promise<void> {
    if (!this.config.latencyThreshold) return;

    try {
      const key = this.getLatencyKey(chainId, providerId);
      const existing = await this.config.redis.get(key);

      let stats: CircuitState["latencyStats"] = {
        average: latency,
        count: 1,
        lastUpdated: Date.now(),
      };

      if (existing) {
        const parsed = JSON.parse(existing);
        const total = parsed.average * parsed.count + latency;
        const newCount = parsed.count + 1;

        stats = {
          average: total / newCount,
          count: newCount,
          lastUpdated: Date.now(),
        };

        if (newCount > 1000 || Date.now() - parsed.lastUpdated > 3600000) {
          stats = {
            average: latency,
            count: 1,
            lastUpdated: Date.now(),
          };
        }
      }

      await this.config.redis.set(key, JSON.stringify(stats), {
        PX: 7200000,
      });
    } catch {
      // non-fatal: cache write failures ignored
    }
  }

  async getStats(chainId: number, providerId: string): Promise<CircuitState> {
    return this.getState(chainId, providerId);
  }

  async reset(chainId: number, providerId: string): Promise<void> {
    await this.setState(chainId, providerId, {
      state: "closed",
      failures: 0,
      successes: 0,
    });

    try {
      await this.config.redis.del(this.getLatencyKey(chainId, providerId));
    } catch {
      // non-fatal: cache write failures ignored
    }
  }

  private async shouldUseAdaptiveThreshold(chainId: number, providerId: string): Promise<boolean> {
    if (!this.config.latencyThreshold || !this.config.minRequestsForLatency) {
      return false;
    }

    try {
      const key = this.getLatencyKey(chainId, providerId);
      const data = await this.config.redis.get(key);

      if (!data) return false;

      const stats = JSON.parse(data) as CircuitState["latencyStats"] | undefined;
      return (
        !!stats &&
        typeof stats.count === "number" &&
        stats.count >= this.config.minRequestsForLatency
      );
    } catch {
      return false;
    }
  }

  private async calculateAdaptiveThreshold(chainId: number, providerId: string): Promise<number> {
    try {
      const key = this.getLatencyKey(chainId, providerId);
      const data = await this.config.redis.get(key);

      if (!data) return this.config.failureThreshold;

      const stats = JSON.parse(data) as CircuitState["latencyStats"] | undefined;
      if (!stats || typeof stats.average !== "number") return this.config.failureThreshold;

      const baseThreshold = this.config.failureThreshold;
      const latencyRatio = stats.average / this.config.latencyThreshold!;

      if (latencyRatio > 1.5) {
        return Math.max(1, Math.floor(baseThreshold * 0.5));
      } else if (latencyRatio > 1.2) {
        return Math.max(2, Math.floor(baseThreshold * 0.7));
      } else if (latencyRatio > 1.0) {
        return Math.max(3, Math.floor(baseThreshold * 0.9));
      }

      return Math.min(baseThreshold * 1.5, baseThreshold + 2);
    } catch {
      return this.config.failureThreshold;
    }
  }

  async isAvailable(chainId: number, providerId: string): Promise<boolean> {
    const state = await this.getState(chainId, providerId);

    if (state.state === "open") {
      const now = Date.now();
      return !(state.openedAt && now - state.openedAt < this.config.halfOpenTimeout);
    }

    return true;
  }
}
