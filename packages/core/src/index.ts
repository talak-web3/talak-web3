import {
  TalakWeb3Auth,
  type RevocationStore,
  type NonceStore,
  type RefreshStore,
  InMemoryNonceStore,
  InMemoryRefreshStore,
  InMemoryRevocationStore,
} from "@talak-web3/auth";
import { validateConfig } from "@talak-web3/config";
import { TalakWeb3Error, RPC_ERROR_CODES, PLUGIN_ERROR_CODES } from "@talak-web3/errors";
import { UnifiedRpc } from "@talak-web3/rpc";
import type {
  TalakWeb3BaseConfig,
  TalakWeb3Context,
  TalakWeb3EventsMap,
  TalakWeb3Instance,
  TalakWeb3Plugin,
  Logger,
  RpcCache,
} from "@talak-web3/types";

import { HookRegistry } from "./hook-registry.js";

export { MiddlewareChain, errorHandlingMiddleware, requestLoggingMiddleware, requestIdMiddleware } from "./middleware.js";
import { createAuthHandler } from "./auth-handler.js";
import { MiddlewareChain, requestIdMiddleware, requestLoggingMiddleware } from "./middleware.js";
import { SecurityInvariant, securityMiddleware } from "./security.js";

export { createAuthHandler, type AuthHandlerOptions } from "./auth-handler.js";
export {
  TALAK_ACCESS_COOKIE,
  TALAK_REFRESH_COOKIE,
  getAccessTokenFromRequest,
  getRefreshTokenFromRequest,
  createSetCookieString,
  appendAuthCookies,
  appendClearAuthCookies,
} from "./auth-cookies.js";
export {
  getShouldSkipSessionRefresh,
  setShouldSkipSessionRefresh,
  resetShouldSkipSessionRefresh,
} from "./should-session-refresh.js";
export { runWithRequestState, runWithRequestStateAsync } from "./request-state.js";

class ConsoleLogger implements Logger {
  private readonly structured: boolean;

  constructor(structured = process.env["LOG_FORMAT"] === "json") {
    this.structured = structured;
  }

  private formatMessage(level: string, message: string, args: unknown[]): string | object {
    if (this.structured) {
      return JSON.stringify({
        level,
        message,
        timestamp: new Date().toISOString(),
        args: args.length > 0 ? args : undefined,
      });
    }
    return message;
  }

  info(message: string, ...args: unknown[]): void {
    const output = this.formatMessage("info", message, args);
    if (this.structured) {
      console.error(output);
    } else {
      console.info("[talak-web3]", message, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    const output = this.formatMessage("warn", message, args);
    if (this.structured) {
      console.error(output);
    } else {
      console.warn("[talak-web3]", message, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    const output = this.formatMessage("error", message, args);
    if (this.structured) {
      console.error(output);
    } else {
      console.error("[talak-web3]", message, ...args);
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (process.env["NODE_ENV"] !== "production") {
      const output = this.formatMessage("debug", message, args);
      if (this.structured) {
        console.error(output);
      } else {
        console.debug("[talak-web3]", message, ...args);
      }
    }
  }
}

/**
 * In-memory TTL-based cache with O(1) lookup and eviction.
 * Uses a Set for O(1) insertion-order tracking.
 */
class TtlCache implements RpcCache {
  private readonly store = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly maxSize: number;
  private insertionOrder: Set<string> = new Set();

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  get<T = unknown>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.insertionOrder.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T = unknown>(key: string, value: T, ttlMs = 60_000): void {
    if (!this.store.has(key) && this.store.size >= this.maxSize) {
      this.evictOldest();
    }

    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });

    if (!this.insertionOrder.has(key)) {
      this.insertionOrder.add(key);
    }
  }

  delete(key: string): void {
    this.store.delete(key);
    this.insertionOrder.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.insertionOrder = new Set();
  }

  private evictOldest(): void {
    const oldestKey = this.insertionOrder.values().next().value;
    if (oldestKey !== undefined) {
      this.insertionOrder.delete(oldestKey);
      this.store.delete(oldestKey);
    }
  }
}

export type { TalakWeb3Instance, MiddlewareHandler, IMiddlewareChain } from "@talak-web3/types";

function extractAuthFromInput(input: unknown): TalakWeb3Auth | undefined {
  if (!input || typeof input !== "object") return undefined;
  const auth = (input as Record<string, unknown>)["auth"];
  return auth instanceof TalakWeb3Auth ? auth : undefined;
}

function extractAuthStoresFromInput(input: unknown): {
  nonceStore?: NonceStore;
  refreshStore?: RefreshStore;
  revocationStore?: RevocationStore;
  accessTtlSeconds?: number;
  refreshTtlSeconds?: number;
  expectedDomain?: string;
  keyProviderType?: import("@talak-web3/auth").KeyProviderType;
  keyProviderOptions?: unknown;
  keyRotationConfig?: unknown;
  timeSource?: import("@talak-web3/auth").AuthoritativeTime;
  contextEnforcementDate?: Date;
} {
  if (!input || typeof input !== "object") return {};
  const auth = (input as Record<string, unknown>)["auth"];
  if (!auth || typeof auth !== "object" || auth instanceof TalakWeb3Auth) return {};

  const authConfig = auth as Record<string, unknown>;
  const options: ReturnType<typeof extractAuthStoresFromInput> = {};

  if (authConfig["nonceStore"]) options.nonceStore = authConfig["nonceStore"] as NonceStore;
  if (authConfig["refreshStore"]) options.refreshStore = authConfig["refreshStore"] as RefreshStore;
  if (authConfig["revocationStore"]) {
    options.revocationStore = authConfig["revocationStore"] as RevocationStore;
  }
  if (authConfig["accessTtlSeconds"] !== undefined) {
    options.accessTtlSeconds = authConfig["accessTtlSeconds"] as number;
  }
  if (authConfig["refreshTtlSeconds"] !== undefined) {
    options.refreshTtlSeconds = authConfig["refreshTtlSeconds"] as number;
  }
  if (authConfig["domain"]) options.expectedDomain = authConfig["domain"] as string;

  return options;
}

/**
 * Creates a new TalakWeb3 SDK instance.
 *
 * @param input - Configuration object or partial config
 * @returns TalakWeb3Instance with handler, init, destroy, shutdown, and healthCheck methods
 *
 * @example
 * ```typescript
 * const app = createTalakWeb3({
 *   chains: [{ id: 1, name: "Ethereum", rpcUrls: ["https://..."], nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, testnet: false }],
 *   auth: { domain: "app.example.com" }
 * });
 * await app.init();
 * // If no auth stores provided, InMemory stores are auto-created for dev mode
 * ```
 */
export function createTalakWeb3(input: unknown = {}): TalakWeb3Instance {
  const normalizedInput = normalizeConfigInput(input);
  const injectedAuth = extractAuthFromInput(normalizedInput);
  const injectedAuthStores = extractAuthStoresFromInput(normalizedInput);
  SecurityInvariant.checkSecrets(normalizedInput);
  const config = validateConfig(normalizedInput) as TalakWeb3BaseConfig;
  const logger = new ConsoleLogger();
  const hooks = new HookRegistry<TalakWeb3EventsMap>(logger);
  const plugins = new Map<string, TalakWeb3Plugin>();
  const requestChain = new MiddlewareChain();
  const responseChain = new MiddlewareChain();

  const cache = new TtlCache();

  let auth: TalakWeb3Auth;

  if (injectedAuth) {
    auth = injectedAuth;
  } else {
    const authConfig = config.auth ?? {};
    const authOptions = {
      ...injectedAuthStores,
    };

    if (!authOptions.nonceStore) authOptions.nonceStore = new InMemoryNonceStore();
    if (!authOptions.refreshStore) authOptions.refreshStore = new InMemoryRefreshStore();
    if (!authOptions.revocationStore) authOptions.revocationStore = new InMemoryRevocationStore();

    if (!authOptions.expectedDomain && authConfig.domain) {
      authOptions.expectedDomain = authConfig.domain;
    }

    auth = new TalakWeb3Auth(
      authOptions as {
        nonceStore: NonceStore;
        refreshStore: RefreshStore;
        revocationStore: RevocationStore;
        accessTtlSeconds?: number;
        refreshTtlSeconds?: number;
        expectedDomain?: string;
        keyProviderType?: import("@talak-web3/auth").KeyProviderType;
        keyProviderOptions?: unknown;
        keyRotationConfig?: unknown;
        timeSource?: import("@talak-web3/auth").AuthoritativeTime;
        contextEnforcementDate?: Date;
      },
    );
  }

  const endpoints = config.chains.flatMap((c, priority) =>
    c.rpcUrls.map((url) => ({ url, priority })),
  );

  const contextShape: Omit<TalakWeb3Context, "rpc"> = {
    config,
    hooks,
    plugins,
    auth,
    cache,
    logger,
    requestChain,
    responseChain,
  };

  const bootstrapContext: TalakWeb3Context = {
    ...contextShape,
    rpc: {
      request: async () => {
        throw new TalakWeb3Error("RPC not initialized", {
          code: RPC_ERROR_CODES.NOT_READY,
          status: 500,
        });
      },
      pauseHealthChecks: () => {
        throw new TalakWeb3Error("RPC not initialized", {
          code: RPC_ERROR_CODES.NOT_READY,
          status: 500,
        });
      },
      resumeHealthChecks: () => {
        throw new TalakWeb3Error("RPC not initialized", {
          code: RPC_ERROR_CODES.NOT_READY,
          status: 500,
        });
      },
      stop: () => {},
    },
  };
  const rpc = new UnifiedRpc(bootstrapContext, endpoints);

  const context: TalakWeb3Context = {
    ...contextShape,
    rpc,
  };

  rpc.ctx = context;
  requestChain.use(requestIdMiddleware);
  requestChain.use(securityMiddleware);
  requestChain.use(requestLoggingMiddleware);

  const instanceBase = {
    config: context.config,
    hooks,
    context,

    healthCheck() {
      const checks: Record<string, boolean> = {
        auth: !!context.auth,
        rpc: !!context.rpc,
        cache: !!context.cache,
        plugins: context.plugins.size > 0,
      };
      const failedCount = Object.values(checks).filter((v) => !v).length;
      const status: "ok" | "degraded" | "error" =
        failedCount === 0 ? "ok" : failedCount < Object.keys(checks).length ? "degraded" : "error";
      return { status, checks };
    },

    async init() {
      await auth.coldStart();

      for (const plugin of config.plugins ?? []) {
        if (!isTalakWeb3Plugin(plugin)) {
          throw new TalakWeb3Error("Invalid plugin config: expected TalakWeb3Plugin object", {
            code: PLUGIN_ERROR_CODES.INVALID,
            status: 400,
          });
        }
        if (plugins.has(plugin.name)) {
          throw new TalakWeb3Error(`Plugin "${plugin.name}" already registered`, {
            code: PLUGIN_ERROR_CODES.DUPLICATE,
            status: 400,
          });
        }
        await plugin.setup(context);
        plugins.set(plugin.name, plugin);
        hooks.emit("plugin-load", { name: plugin.name });
        logger.info(`Plugin loaded: ${plugin.name}@${plugin.version}`);
      }
    },

    async destroy() {
      for (const plugin of plugins.values()) {
        if (plugin.teardown) {
          await plugin.teardown();
        }
      }
      plugins.clear();
      hooks.clear();
    },

    async shutdown() {
      await this.destroy();
      const { ConnectionManager } = await import("./connections.js");
      await ConnectionManager.shutdown();
    },
  };

  const instance: TalakWeb3Instance = {
    ...instanceBase,
    handler: createAuthHandler({
      ...instanceBase,
      handler: async () => new Response(null, { status: 500 }),
    }),
    healthCheck() {
      const checks: Record<string, boolean> = {
        auth: !!context.auth,
        rpc: !!context.rpc,
        cache: !!context.cache,
        plugins: context.plugins.size > 0,
      };
      const failedCount = Object.values(checks).filter((v) => !v).length;
      const status: "ok" | "degraded" | "error" =
        failedCount === 0 ? "ok" : failedCount < Object.keys(checks).length ? "degraded" : "error";
      return { status, checks };
    },
  };

  if (!(globalThis as Record<string, unknown>)["__talak_shutdown_registered"]) {
    (globalThis as Record<string, unknown>)["__talak_shutdown_registered"] = true;
    const gracefulShutdown = async () => {
      await instance.destroy();
      const { ConnectionManager } = await import("./connections.js");
      await ConnectionManager.shutdown();
      process.exit(0);
    };
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  }

  return instance;
}

/**
 * Alias for {@link createTalakWeb3}.
 */
export function talakWeb3(input: unknown = {}): TalakWeb3Instance {
  return createTalakWeb3(input);
}

function isTalakWeb3Plugin(input: unknown): input is TalakWeb3Plugin {
  if (!input || typeof input !== "object") return false;
  const rec = input as Record<string, unknown>;
  return (
    typeof rec["name"] === "string" &&
    typeof rec["version"] === "string" &&
    typeof rec["setup"] === "function"
  );
}

function normalizeConfigInput(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const rec = input as Record<string, unknown>;
  const rawChains = Array.isArray(rec["chains"]) ? rec["chains"] : undefined;
  if (!rawChains) return input;

  const chainCurrencyMap: Record<number, { symbol: string; name: string }> = {
    1: { symbol: "ETH", name: "Ether" },
    137: { symbol: "POL", name: "Polygon" },
    10: { symbol: "ETH", name: "Ether" },
    42161: { symbol: "ETH", name: "Ether" },
    56: { symbol: "BNB", name: "BNB" },
    43114: { symbol: "AVAX", name: "Avalanche" },
  };

  const chains = rawChains.map((chain, i) => {
    if (!chain || typeof chain !== "object") return chain;
    const c = chain as Record<string, unknown>;
    const id = typeof c["id"] === "number" ? c["id"] : i + 1;
    const currency = chainCurrencyMap[id] ?? { symbol: "ETH", name: "Ether" };
    return Object.assign(c, {
      name: typeof c[`name`] === `string` && c[`name`].length > 0 ? c[`name`] : `Chain ${id}`,
      nativeCurrency:
        typeof c[`nativeCurrency`] === `object` && c[`nativeCurrency`] !== null
          ? c[`nativeCurrency`]
          : { name: currency.name, symbol: currency.symbol, decimals: 18 },
    });
  });

  return { ...rec, chains };
}
