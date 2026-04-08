export type ChainId = number;
export type Hex = `0x${string}`;
export type Address = Hex;
export type UnixMs = number;
export interface Logger {
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
    debug(message: string, ...args: unknown[]): void;
}
export interface RpcOptions {
    retries?: number;
    timeout?: number;
    failover?: boolean;
}
export interface IRpc {
    request<T = unknown>(method: string, params?: unknown[], options?: RpcOptions): Promise<T>;
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
export interface BetterWeb3Auth extends IAuth {
    /** Verify SIWE message + signature and issue JWT pair */
    loginWithSiwe(message: string, signature: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    /** Create session JWT without SIWE (testing / server-side flows) */
    createSession(address: string, chainId: number): Promise<string>;
    /** Validate and decode a session JWT */
    verifySession(token: string): Promise<{
        address: string;
        chainId: number;
    }>;
    /** Revoke a session JWT */
    revokeSession(token: string): Promise<void>;
    /** Generate a SIWE nonce */
    generateNonce(): string;
}
export type BetterWeb3EventsMap = {
    'plugin-load': {
        name: string;
    };
    'rpc-error': {
        endpoint: string;
        error: Error;
        attempt: number;
    };
    'chain-changed': number;
    'chain-switch': number;
    'account-changed': string | null;
    'tx:gasless-start': {
        to: string;
        data: string;
    };
    'tx:gasless-success': {
        hash: string;
    };
    'tx:gasless-error': {
        error: unknown;
    };
    'storage:query-start': {
        sql: string;
        params: unknown[];
    };
    'storage:query-end': {
        sql: string;
        results: unknown[];
    };
    'identity:profile-create': {
        did: string;
    };
    'identity:profile-created': {
        id: string;
    };
    'ai:run-start': {
        input: unknown;
    };
    'ai:run-end': {
        output: unknown;
    };
};
export interface IHookRegistry<Events extends Record<string, unknown> = BetterWeb3EventsMap> {
    on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): () => void;
    off<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void;
    emit<K extends keyof Events>(event: K, data: Events[K]): void;
    clear(): void;
}
export interface IMiddlewareChain<T = unknown, R = unknown> {
    use(handler: MiddlewareHandler<T, R>): void;
    execute(req: T, ctx: BetterWeb3Context, finalHandler: () => Promise<R>): Promise<R>;
}
export interface BetterWeb3BaseConfig {
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
        readonly blockExplorers?: ReadonlyArray<{
            readonly name: string;
            readonly url: string;
        }>;
    }>;
    readonly debug: boolean;
    readonly allowedOrigins?: readonly string[];
    readonly rpc: {
        readonly retries: number;
        readonly timeout: number;
    };
    readonly plugins?: ReadonlyArray<unknown>;
    readonly auth?: {
        readonly domain?: string;
        readonly uri?: string;
        readonly version?: string;
    };
    readonly ai?: {
        readonly apiKey: string;
        readonly baseUrl?: string;
        readonly model?: string;
    };
    readonly ceramic?: {
        readonly nodeUrl: string;
        readonly seed?: string;
    };
    readonly tableland?: {
        readonly privateKey?: string;
        readonly network?: string;
    };
}
export interface BetterWeb3Plugin {
    name: string;
    version: string;
    dependencies?: string[];
    setup(ctx: BetterWeb3Context): void | Promise<void>;
    onBeforeRequest?(req: unknown): Promise<void>;
    onAfterResponse?(res: unknown): Promise<void>;
    onChainChanged?(chainId: number): void;
    onAccountChanged?(address: string | null): void;
    teardown?(): void | Promise<void>;
}
export type MiddlewareHandler<T = unknown, R = unknown> = (req: T, next: () => Promise<R>, ctx: BetterWeb3Context) => Promise<R>;
export interface BetterWeb3Middleware {
    name: string;
    onRequest?: MiddlewareHandler;
    onResponse?: MiddlewareHandler;
}
export interface BetterWeb3Context {
    readonly config: BetterWeb3BaseConfig;
    readonly hooks: IHookRegistry<BetterWeb3EventsMap>;
    readonly plugins: Map<string, BetterWeb3Plugin>;
    readonly rpc: IRpc;
    readonly auth: BetterWeb3Auth;
    readonly cache: RpcCache;
    readonly logger: Logger;
    readonly requestChain: IMiddlewareChain<unknown, unknown>;
    readonly responseChain: IMiddlewareChain<unknown, unknown>;
    adapters?: Record<string, unknown>;
}
export interface BetterWeb3Instance {
    readonly config: BetterWeb3BaseConfig;
    readonly hooks: IHookRegistry<BetterWeb3EventsMap>;
    readonly context: BetterWeb3Context;
    init(): Promise<void>;
    destroy(): Promise<void>;
}
