import { validateConfig } from '@talak-web3/config';
import { HookRegistry } from '@talak-web3/hooks';
import type { BetterWeb3BaseConfig, BetterWeb3Context, BetterWeb3EventsMap, BetterWeb3Instance, BetterWeb3Plugin, Logger, RpcCache } from '@talak-web3/types';
import { BetterWeb3Error } from '@talak-web3/errors';
import { MiddlewareChain } from './middleware.js';
import { UnifiedRpc } from '@talak-web3/rpc';
import { SecurityInvariant, securityMiddleware } from './security.js';
import { BetterWeb3Auth } from '@talak-web3/auth';

// ---------------------------------------------------------------------------
// Internal implementations of Logger + RpcCache
// ---------------------------------------------------------------------------

class ConsoleLogger implements Logger {
  info(message: string, ...args: unknown[]): void { console.info('[talak-web3]', message, ...args); }
  warn(message: string, ...args: unknown[]): void { console.warn('[talak-web3]', message, ...args); }
  error(message: string, ...args: unknown[]): void { console.error('[talak-web3]', message, ...args); }
  debug(message: string, ...args: unknown[]): void {
    if (process.env['NODE_ENV'] !== 'production') console.debug('[talak-web3]', message, ...args);
  }
}

class TtlCache implements RpcCache {
  private readonly store = new Map<string, { value: unknown; expiresAt: number }>();

  get<T = unknown>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) { this.store.delete(key); return undefined; }
    return entry.value as T;
  }

  set<T = unknown>(key: string, value: T, ttlMs = 60_000): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void { this.store.delete(key); }
  clear(): void { this.store.clear(); }
}

// ---------------------------------------------------------------------------
// Singleton factory
// ---------------------------------------------------------------------------

// Re-export BetterWeb3Instance from types for backward compatibility
export type { BetterWeb3Instance } from '@talak-web3/types';

let singleton: BetterWeb3Instance | undefined;

export function betterWeb3(input: unknown = {}): BetterWeb3Instance {
  if (singleton) return singleton;

  SecurityInvariant.checkSecrets(input);
  const config = validateConfig(input) as any as BetterWeb3BaseConfig;
  const logger = new ConsoleLogger();
  const hooks = new HookRegistry<BetterWeb3EventsMap>();
  const plugins = new Map<string, BetterWeb3Plugin>();
  const requestChain = new MiddlewareChain();
  const responseChain = new MiddlewareChain();
  const cache = new TtlCache();
  const auth = new BetterWeb3Auth();

  // Build RPC endpoint list from all configured chains
  const endpoints = config.chains.flatMap((c, priority) =>
    c.rpcUrls.map(url => ({ url, priority })),
  );

  const contextShape: Omit<BetterWeb3Context, 'rpc'> = {
    config,
    hooks,
    plugins,
    auth,
    cache,
    logger,
    requestChain,
    responseChain,
  };

  const bootstrapContext: BetterWeb3Context = {
    ...contextShape,
    rpc: {
      request: async () => {
        throw new BetterWeb3Error('RPC not initialized', { code: 'RPC_NOT_READY', status: 500 });
      },
    },
  };
  const rpc = new UnifiedRpc(bootstrapContext, endpoints);

  const context: BetterWeb3Context = {
    ...contextShape,
    rpc,
  };

  // Patch UnifiedRpc's internal context reference to the complete one
  rpc.ctx = context;

  // Register core security middleware
  requestChain.use(securityMiddleware);

  const instance: BetterWeb3Instance = {
    config: context.config,
    hooks,
    context,

    async init() {
      await auth.coldStart();

      for (const plugin of config.plugins ?? []) {
        if (!isBetterWeb3Plugin(plugin)) {
          throw new BetterWeb3Error('Invalid plugin config: expected BetterWeb3Plugin object', {
            code: 'PLUGIN_INVALID',
            status: 400,
          });
        }
        if (plugins.has(plugin.name)) {
          throw new BetterWeb3Error(`Plugin "${plugin.name}" already registered`, {
            code: 'PLUGIN_DUPLICATE',
            status: 400,
          });
        }
        await plugin.setup(context);
        plugins.set(plugin.name, plugin);
        hooks.emit('plugin-load', { name: plugin.name });
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
      cache.clear();
      singleton = undefined;
      logger.info('talak-web3 instance destroyed');
    },
  };

  singleton = instance;
  return instance;
}

/** @internal — resets singleton; for tests only */
export function __resetBetterWeb3(): void {
  singleton = undefined;
}

function isBetterWeb3Plugin(input: unknown): input is BetterWeb3Plugin {
  if (!input || typeof input !== 'object') return false;
  const rec = input as Record<string, unknown>;
  return (
    typeof rec['name'] === 'string' &&
    typeof rec['version'] === 'string' &&
    typeof rec['setup'] === 'function'
  );
}
