export type ChainId = number;

export type Hex = `0x${string}`;

export type Address = Hex;

export type UnixMs = number;

// ---------------------------------------------------------------------------

// Infrastructure interfaces (no circular deps — this package has no imports)

// ---------------------------------------------------------------------------

export interface Logger {
  info(message: string, ...args: unknown[]): void;

  warn(message: string, ...args: unknown[]): void;

  error(message: string, ...args: unknown[]): void;

  debug(message: string, ...args: unknown[]): void;
}

// ---------------------------------------------------------------------------
// Auth Store interfaces (defined here to avoid circular deps with @talak-web3/auth)
// ---------------------------------------------------------------------------

/** Pluggable nonce storage (SIWE). */
export interface NonceStore {
  create(address: string, meta?: { ip?: string; ua?: string }): Promise<string>;
  consume(address: string, nonce: string): Promise<boolean>;
}

/** Refresh session record (opaque token hashed with SHA-256 for storage). */
export interface RefreshSession {
  id: string;
  address: string;
  chainId: number;
  hash: string;
  expiresAt: number;
  revoked: boolean;
}

export interface RefreshStore {
  create(
    address: string,
    chainId: number,
    ttlMs: number,
  ): Promise<{ token: string; session: RefreshSession }>;
  rotate(token: string, ttlMs: number): Promise<{ token: string; session: RefreshSession }>;
  revoke(token: string): Promise<void>;
  lookup(token: string): Promise<RefreshSession | null>;
}

/** Access-token JTI deny-list. */
export interface RevocationStore {
  revoke(jti: string, expiresAtMs: number): Promise<void>;
  isRevoked(jti: string): Promise<boolean>;
}

export interface RpcOptions {
  retries?: number;

  timeout?: number;

  failover?: boolean;
}

export interface IRpc {
  request<T = unknown>(method: string, params?: unknown[], options?: RpcOptions): Promise<T>;

  /** Pause health checks temporarily */
  pauseHealthChecks(): void;

  /** Resume health checks with specified interval */
  resumeHealthChecks(intervalMs?: number): void;

  /** Stop all health checks and cleanup */
  stop(): void;
}

export interface RpcCache {
  get<T = unknown>(key: string): T | undefined;

  set<T = unknown>(key: string, value: T, ttlMs?: number): void;

  delete(key: string): void;

  clear(): void;
}

export interface IAuth {
  coldStart(): Promise<void>;

  validateJwt(token: string): Promise<boolean>;
}

// Concrete auth surface used by TalakWeb3Context.auth.

// Implemented by `talak-web3-auth` but defined here to avoid circular deps.

export interface TalakWeb3Auth extends IAuth {
  /** Verify SIWE message + signature and issue JWT pair */

  loginWithSiwe(
    message: string,
    signature: string,
  ): Promise<{ accessToken: string; refreshToken: string }>;

  /** Create session JWT without SIWE (testing / server-side flows) */

  createSession(address: string, chainId: number): Promise<string>;

  /** Validate and decode a session JWT */

  verifySession(token: string): Promise<{ address: string; chainId: number }>;

  /** Revoke a session JWT */

  revokeSession(token: string): Promise<void>;

  /** Generate a SIWE nonce */

  generateNonce(): string;
}

export type TalakWeb3EventsMap = {
  "plugin-load": { name: string };

  "rpc-error": { endpoint: string; error: Error; attempt: number };

  "chain-changed": number;

  "chain-switch": number;

  "account-changed": string | null;

  "tx:gasless-start": { to: string; data: string };

  "tx:gasless-success": { hash: string };

  "tx:gasless-error": { error: unknown };

  "storage:query-start": { sql: string; params: unknown[] };

  "storage:query-end": { sql: string; results: unknown[] };

  "identity:profile-create": { did: string };

  "identity:profile-created": { id: string };

  "ai:run-start": { input: unknown };

  "ai:run-end": { output: unknown };
};

export interface IHookRegistry<Events extends Record<string, unknown> = TalakWeb3EventsMap> {
  on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): () => void;

  off<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void;

  emit<K extends keyof Events>(event: K, data: Events[K]): void;

  clear(): void;
}

export interface IMiddlewareChain<T = unknown, R = unknown> {
  use(handler: MiddlewareHandler<T, R>): void;

  execute(req: T, ctx: TalakWeb3Context, finalHandler: () => Promise<R>): Promise<R>;
}

// ---------------------------------------------------------------------------

// Config surface (structural — avoids circular dep with talak-web3-config)

// ---------------------------------------------------------------------------

export interface TalakWeb3BaseConfig {
  readonly chains: ReadonlyArray<{
    readonly id: number;

    readonly name: string;

    readonly rpcUrls: readonly string[];

    readonly nativeCurrency: {
      readonly name: string;

      readonly symbol: string;

      readonly decimals: number;
    };

    readonly testnet: boolean;

    readonly blockExplorers?: ReadonlyArray<{ readonly name: string; readonly url: string }>;
  }>;

  readonly debug: boolean;

  readonly allowedOrigins?: readonly string[];

  readonly rpc: { readonly retries: number; readonly timeout: number };

  readonly plugins?: ReadonlyArray<unknown>;

  readonly auth?: {
    readonly domain?: string;
    readonly uri?: string;
    readonly version?: string;
    readonly nonceStore?: NonceStore;
    readonly refreshStore?: RefreshStore;
    readonly revocationStore?: RevocationStore;
    readonly accessTtlSeconds?: number;
    readonly refreshTtlSeconds?: number;
  };

  readonly ai?: { readonly apiKey: string; readonly baseUrl?: string; readonly model?: string };

  readonly ceramic?: { readonly nodeUrl: string; readonly seed?: string };

  readonly tableland?: { readonly privateKey?: string; readonly network?: string };
}

// ---------------------------------------------------------------------------

// Plugin + middleware

// ---------------------------------------------------------------------------

export interface TalakWeb3Plugin {
  name: string;

  version: string;

  dependencies?: string[];

  setup(ctx: TalakWeb3Context): void | Promise<void>;

  onBeforeRequest?(req: unknown): Promise<void>;

  onAfterResponse?(res: unknown): Promise<void>;

  onChainChanged?(chainId: number): void;

  onAccountChanged?(address: string | null): void;

  teardown?(): void | Promise<void>;
}

export type MiddlewareHandler<T = unknown, R = unknown> = (
  req: T,

  next: () => Promise<R>,

  ctx: TalakWeb3Context,
) => Promise<R>;

export interface TalakWeb3Middleware {
  name: string;

  onRequest?: MiddlewareHandler;

  onResponse?: MiddlewareHandler;
}

// ---------------------------------------------------------------------------

// Central dependency container

// ---------------------------------------------------------------------------

export interface TalakWeb3Context {
  readonly config: TalakWeb3BaseConfig;

  readonly hooks: IHookRegistry<TalakWeb3EventsMap>;

  readonly plugins: Map<string, TalakWeb3Plugin>;

  readonly rpc: IRpc;

  readonly auth: TalakWeb3Auth;

  readonly cache: RpcCache;

  readonly logger: Logger;

  readonly requestChain: IMiddlewareChain<unknown, unknown>;

  readonly responseChain: IMiddlewareChain<unknown, unknown>;

  adapters?: Record<string, unknown>;
}

// TalakWeb3Instance lives here (not in core) so hooks can import it

// without creating a hooks ↔ core circular dependency.

export interface TalakWeb3Instance {
  readonly config: TalakWeb3BaseConfig;

  readonly hooks: IHookRegistry<TalakWeb3EventsMap>;

  readonly context: TalakWeb3Context;

  init(): Promise<void>;

  destroy(): Promise<void>;
}

// ---------------------------------------------------------------------------
// AI Agent types (merged from talak-web3-ai)
// ---------------------------------------------------------------------------

export type ToolDefinition = {
  name: string;
  description?: string;
  /** JSON schema parameters (OpenAI tool format). */
  parameters: Record<string, unknown>;
  handler: (input: unknown) => Promise<unknown>;
};

export type AgentRunInput = {
  prompt: string;
  tools?: ToolDefinition[];
};

export type AgentRunOutput = {
  text: string;
  toolCalls?: Array<{ tool: string; input: unknown; output?: unknown }>;
};

export interface AiAgent {
  run(input: AgentRunInput): Promise<AgentRunOutput>;
  /** Streaming run that yields incremental text deltas. */
  runStream?(
    input: AgentRunInput,
  ): AsyncIterable<
    { type: "text-delta"; delta: string } | { type: "done"; output: AgentRunOutput }
  >;
}

// ---------------------------------------------------------------------------
// Analytics types (merged from talak-web3-analytics)
// ---------------------------------------------------------------------------

export type AnalyticsEvent = {
  name: string;
  tsMs: number;
  properties?: Record<string, unknown>;
};

export interface AnalyticsSink {
  ingest(events: AnalyticsEvent[]): Promise<void>;
}

// ---------------------------------------------------------------------------
// Organization types (merged from talak-web3-orgs)
// ---------------------------------------------------------------------------

export type Role = "member" | "admin" | "owner";

export type Organization = {
  id: string;
  name: string;
};

export interface OrgGate {
  hasRole(input: { orgId: string; address: string; role: Role }): Promise<boolean>;
}
