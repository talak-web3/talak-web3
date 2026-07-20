import { TalakWeb3Error, RPC_ERROR_CODES, CONFIG_ERROR_CODES } from "@talak-web3/errors";
import type { TalakWeb3Context, IRpc, RpcOptions, MiddlewareHandler } from "@talak-web3/types";

import { DistributedCircuitBreaker, type CircuitBreakerConfig } from "./circuit-breaker.js";
import { validateRpcRequest } from "./validation.js";

export interface RpcEndpoint {
  url: string;
  providerId?: string;
  weight?: number;
  priority?: number;
  health?: {
    status: "up" | "down";
    latency: number;
    lastChecked: number;
  };
}

export const rpcValidationMiddleware: MiddlewareHandler = async (req, next) => {
  validateRpcRequest(req);
  return next();
};

export class UnifiedRpc implements IRpc {
  private endpoints: RpcEndpoint[];
  ctx: TalakWeb3Context;
  private healthInterval: ReturnType<typeof setInterval> | undefined;
  private requestIdCounter = 0;
  private circuitBreaker?: DistributedCircuitBreaker;
  private pendingRequests = new Map<string, Promise<unknown>>();
  private readonly maxPendingRequests = 1000;
  private signalCleanup: (() => void) | undefined;

  constructor(
    ctx: TalakWeb3Context,
    endpoints: RpcEndpoint[] = [],
    options?: { healthCheckIntervalMs?: number },
  ) {
    this.ctx = ctx;
    this.endpoints = endpoints;

    if (this.endpoints.length > 0) {
      const intervalMs = options?.healthCheckIntervalMs ?? 30_000;
      this.healthInterval = setInterval(() => {
        void this.checkAllHealth();
      }, intervalMs);

      this.healthInterval.unref?.();
    }

    this.ctx.requestChain.use(rpcValidationMiddleware);

    this.signalCleanup = () => {
      this.stop();
    };
    process.on("SIGINT", this.signalCleanup);
    process.on("SIGTERM", this.signalCleanup);
  }

  configureCircuitBreaker(config: Omit<CircuitBreakerConfig, "redis">): void {
    const redis = this.ctx.cache as unknown as CircuitBreakerConfig["redis"] | undefined;
    if (!redis) {
      throw new TalakWeb3Error("Redis client required for distributed circuit breaker", {
        code: CONFIG_ERROR_CODES.INVALID,
        status: 500,
      });
    }

    this.circuitBreaker = new DistributedCircuitBreaker({
      ...config,
      redis,
    });
  }

  stop(): void {
    if (this.healthInterval) clearInterval(this.healthInterval);

    if (this.signalCleanup) {
      process.removeListener("SIGINT", this.signalCleanup);
      process.removeListener("SIGTERM", this.signalCleanup);
      this.signalCleanup = undefined;
    }
  }

  pauseHealthChecks(): void {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = undefined;
    }
  }

  resumeHealthChecks(intervalMs = 30_000): void {
    if (this.healthInterval) return;

    if (this.endpoints.length > 0) {
      this.healthInterval = setInterval(() => {
        void this.checkAllHealth();
      }, intervalMs);
      this.healthInterval.unref?.();
    }
  }

  async checkAllHealth(): Promise<void> {
    await Promise.all(this.endpoints.map((e) => this.checkEndpointHealth(e)));
  }

  private async checkEndpointHealth(endpoint: RpcEndpoint): Promise<void> {
    const start = Date.now();
    try {
      const healthMethods = ["eth_blockNumber", "eth_chainId"];
      let healthOk = false;

      for (const method of healthMethods) {
        try {
          if (this.circuitBreaker && endpoint.providerId) {
            await this.circuitBreaker.execute(
              endpoint.providerId,
              () => this.doRequest(endpoint.url, method, [], 5_000),
              5000,
            );
          } else {
            await this.doRequest(endpoint.url, method, [], 5_000);
          }
          healthOk = true;
          break;
        } catch {
          // Try the next health check method
        }
      }

      if (healthOk) {
        endpoint.health = { status: "up", latency: Date.now() - start, lastChecked: Date.now() };
      } else {
        endpoint.health = { status: "down", latency: Infinity, lastChecked: Date.now() };
      }
    } catch {
      endpoint.health = { status: "down", latency: Infinity, lastChecked: Date.now() };
    }
  }

  async request<T = unknown>(
    method: string,
    params: unknown[] = [],
    options: RpcOptions = {},
  ): Promise<T> {
    const {
      retries = this.ctx.config.rpc.retries,
      timeout = this.ctx.config.rpc.timeout,
      failover = true,
    } = options;

    const requestId = (this.requestIdCounter =
      (this.requestIdCounter + 1) % Number.MAX_SAFE_INTEGER);
    const run = async () =>
      this.fetchWithRetry<T>(method, params, retries, timeout, failover, requestId);

    const req = { jsonrpc: "2.0", id: requestId, method, params };

    const readOnlyMethods = new Set([
      "eth_call",
      "eth_getBalance",
      "eth_getCode",
      "eth_blockNumber",
      "eth_chainId",
    ]);
    if (readOnlyMethods.has(method)) {
      const cacheKey = `${method}:${JSON.stringify(params)}`;
      const cached = this.ctx.cache.get<T>(cacheKey);
      if (cached !== undefined) return cached;

      const existing = this.pendingRequests.get(cacheKey) as Promise<T> | undefined;
      if (existing) return existing;

      if (this.pendingRequests.size >= this.maxPendingRequests) {
        const oldestKey = this.pendingRequests.keys().next().value;
        if (oldestKey !== undefined) {
          this.pendingRequests.delete(oldestKey);
        }
      }

      const promise = (async () => {
        const result = await this.executeChain<T>(this.ctx.requestChain, req, run);
        await this.executeChain(this.ctx.responseChain, { req, result }, async () => result);
        this.ctx.cache.set(cacheKey, result, this.getCacheTtl(method));
        return result;
      })();

      this.pendingRequests.set(cacheKey, promise);
      promise.finally(() => this.pendingRequests.delete(cacheKey));
      return promise;
    }

    const result = await this.executeChain<T>(this.ctx.requestChain, req, run);
    await this.executeChain(this.ctx.responseChain, { req, result }, async () => result);
    return result;
  }

  private async executeChain<T>(
    chain: unknown,
    payload: unknown,
    fallback: () => Promise<T>,
  ): Promise<T> {
    const executor = (
      chain as
        | { execute?: (p: unknown, ctx: TalakWeb3Context, n: () => Promise<T>) => Promise<T> }
        | undefined
    )?.execute;
    if (typeof executor !== "function") return fallback();
    const result = await executor.call(chain, payload, this.ctx, fallback);
    if (result === undefined) return fallback();
    return result;
  }

  private async fetchWithRetry<T>(
    method: string,
    params: unknown[],
    retries: number,
    timeout: number,
    failover: boolean,
    requestId?: number,
  ): Promise<T> {
    let lastError: Error | undefined;
    let lastFailedUrl: string | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const endpoint = await this.getBestEndpoint(failover ? undefined : lastFailedUrl);
      if (!endpoint) {
        throw new TalakWeb3Error("No RPC endpoints available", {
          code: RPC_ERROR_CODES.NO_ENDPOINTS,
          status: 503,
        });
      }

      try {
        if (attempt > 0) {
          const delay = Math.min(100 * Math.pow(2, attempt), 2000);
          await new Promise((r) => setTimeout(r, delay));
        }

        if (this.circuitBreaker && endpoint.providerId) {
          return await this.circuitBreaker.execute(
            endpoint.providerId,
            () => this.doRequest<T>(endpoint.url, method, params, timeout, requestId),
            timeout,
          );
        }

        return await this.doRequest<T>(endpoint.url, method, params, timeout, requestId);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        lastFailedUrl = endpoint.url;
        const canonical = this.endpoints.find((e) => e.url === endpoint.url);
        if (canonical) {
          canonical.health = { status: "down", latency: Infinity, lastChecked: Date.now() };
        }
        this.ctx.hooks.emit("rpc-error", { endpoint: endpoint.url, error: lastError, attempt });
        this.ctx.logger.warn(
          `RPC attempt ${attempt + 1}/${retries + 1} failed on ${endpoint.url}: ${lastError.message}`,
        );
      }
    }

    throw new TalakWeb3Error(`RPC request failed after ${retries + 1} attempts`, {
      code: RPC_ERROR_CODES.MAX_RETRIES,
      status: 502,
      cause: lastError,
    });
  }

  private async getBestEndpoint(excludeUrl?: string): Promise<RpcEndpoint | undefined> {
    const endpoints = await Promise.all(
      this.endpoints.map(async (e) => {
        if (this.circuitBreaker && e.providerId) {
          const isAvailable = await this.circuitBreaker.isAvailable(e.providerId);
          if (!isAvailable) {
            return { ...e, circuitOpen: true };
          }
        }
        return { ...e, circuitOpen: false };
      }),
    );

    const healthy = endpoints
      .filter(
        (e) => !e.circuitOpen && (!e.health || e.health.status === "up") && e.url !== excludeUrl,
      )
      .sort(
        (a, b) =>
          (a.priority ?? 0) - (b.priority ?? 0) ||
          (a.health?.latency ?? 0) - (b.health?.latency ?? 0),
      );

    if (healthy.length > 0) return healthy[0];

    if (excludeUrl) {
      const fallback = endpoints
        .filter((e) => !e.circuitOpen && (!e.health || e.health.status === "up"))
        .sort(
          (a, b) =>
            (a.priority ?? 0) - (b.priority ?? 0) ||
            (a.health?.latency ?? 0) - (b.health?.latency ?? 0),
        );

      if (fallback.length > 0) return fallback[0];
    }

    const recovering = endpoints
      .filter((e) => e.circuitOpen)
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

    if (recovering.length > 0) return recovering[0];

    return [...this.endpoints].sort(
      (a, b) => (a.health?.lastChecked ?? 0) - (b.health?.lastChecked ?? 0),
    )[0];
  }

  /**
   * Returns a method-appropriate cache TTL in milliseconds.
   * eth_chainId changes rarely; eth_blockNumber changes every ~12s;
   * other read methods use a moderate 12s default.
   */
  private getCacheTtl(method: string): number {
    switch (method) {
      case "eth_chainId":
        return 60_000;
      case "eth_blockNumber":
        return 3_000;
      case "eth_getBalance":
        return 12_000;
      case "eth_call":
        return 12_000;
      default:
        return 12_000;
    }
  }

  private async doRequest<T>(
    url: string,
    method: string,
    params: unknown[],
    timeoutMs: number,
    requestId?: number,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const id =
        requestId ??
        (this.requestIdCounter = (this.requestIdCounter + 1) % Number.MAX_SAFE_INTEGER);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${url}`);
      }

      const data = (await response.json()) as {
        result?: T;
        error?: { message: string; code: number };
      };
      if (data.error) throw new Error(data.error.message);
      if (data.result === undefined) throw new Error("Missing result in JSON-RPC response");
      return data.result;
    } finally {
      clearTimeout(timer);
    }
  }
}
