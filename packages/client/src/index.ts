export interface TokenStorage {
  getAccessToken(): string | null;
  setAccessToken(token: string): void;
  getRefreshToken(): string | null;
  setRefreshToken(token: string): void;
  clear(): void;
}

export class InMemoryTokenStorage implements TokenStorage {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  getAccessToken(): string | null {
    return this.accessToken;
  }
  setAccessToken(token: string): void {
    this.accessToken = token;
  }
  getRefreshToken(): string | null {
    return this.refreshToken;
  }
  setRefreshToken(token: string): void {
    this.refreshToken = token;
  }
  clear(): void {
    this.accessToken = null;
    this.refreshToken = null;
  }
}

const ACCESS_COOKIE_NAME = "talak_web3_access";
const REFRESH_COOKIE_NAME = "talak_web3_refresh";
const COOKIE_OPTIONS = `path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict; Secure`;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? (match[2] ?? null) : null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${value}; ${COOKIE_OPTIONS}`;
}

function expireCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export class CookieTokenStorage implements TokenStorage {
  private accessToken: string | null = null;

  getAccessToken(): string | null {
    return this.accessToken ?? readCookie(ACCESS_COOKIE_NAME);
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
    writeCookie(ACCESS_COOKIE_NAME, token);
  }

  getRefreshToken(): string | null {
    return readCookie(REFRESH_COOKIE_NAME);
  }

  setRefreshToken(token: string): void {
    writeCookie(REFRESH_COOKIE_NAME, token);
  }

  clear(): void {
    this.accessToken = null;
    expireCookie(ACCESS_COOKIE_NAME);
    expireCookie(REFRESH_COOKIE_NAME);
  }
}

export interface NonceResponse {
  nonce: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface VerifyResponse {
  ok: boolean;
  payload?: { address: string; chainId: number };
}

/** Chain descriptor returned by the API. */
export interface ChainInfo {
  id: number;
  name: string;
  rpcUrls: string[];
  nativeCurrency: { name: string; symbol: string; decimals: number };
  testnet: boolean;
  blockExplorers?: { name: string; url: string }[];
}

/** Options for constructing a {@link TalakWeb3Client}. */
export type TalakWeb3ClientOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
  storage?: TokenStorage;
};

/** Browser-friendly HTTP client for the TalakWeb3 API. Handles SIWE login, token refresh, RPC calls, and chain queries. */
export class TalakWeb3Client {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  readonly storage: TokenStorage;

  private refreshPromise: Promise<RefreshResponse> | null = null;

  constructor(opts: TalakWeb3ClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.storage = opts.storage ?? new InMemoryTokenStorage();
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    retryOnUnauthorized = true,
  ): Promise<T> {
    const accessToken = this.storage.getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> | undefined),
    };

    if (["POST", "PUT", "DELETE"].includes(options.method ?? "GET")) {
      const csrfToken = this.getCsrfToken();
      if (csrfToken) headers["x-csrf-token"] = csrfToken;
    }

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const res = await this.fetchImpl(`${this.baseUrl}${path}`, { ...options, headers });

    if (res.status === 401 && retryOnUnauthorized) {
      const refreshToken = this.storage.getRefreshToken();
      if (refreshToken) {
        try {
          await this.getOrStartRefresh(refreshToken);

          return this.request<T>(path, options, false);
        } catch (err) {
          this.storage.clear();
          throw err;
        }
      }
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  private getOrStartRefresh(refreshToken: string): Promise<RefreshResponse> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.refresh(refreshToken).finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private clearTokens(): void {
    this.storage.setAccessToken(null as unknown as string);
    this.storage.setRefreshToken(null as unknown as string);
    this.storage.clear();
  }

  private getCsrfToken(): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp("(^| )csrf_token=([^;]+)"));
    return match ? (match[2] ?? null) : null;
  }

  async getNonce(address: string): Promise<NonceResponse> {
    return this.request<NonceResponse>("/auth/nonce", {
      method: "POST",
      body: JSON.stringify({ address }),
    });
  }

  /** Authenticate with a SIWE message + signature. Stores the returned token pair in {@link storage}. */
  async loginWithSiwe(message: string, signature: string): Promise<LoginResponse> {
    const res = await this.fetchImpl(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, signature }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Login failed: HTTP ${res.status}: ${text}`);
    }
    const data = (await res.json()) as LoginResponse;
    try {
      this.storage.setAccessToken(data.accessToken);
      this.storage.setRefreshToken(data.refreshToken);
    } catch {
      this.storage.clear();
      throw new Error("Failed to persist auth tokens");
    }
    return data;
  }

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const res = await this.fetchImpl(`${this.baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      this.clearTokens();
      const text = await res.text().catch(() => "");
      throw new Error(`Refresh failed: HTTP ${res.status}: ${text}`);
    }
    const data = (await res.json()) as RefreshResponse;
    this.storage.setAccessToken(data.accessToken);
    this.storage.setRefreshToken(data.refreshToken);
    return data;
  }

  async logout(): Promise<void> {
    const refreshToken = this.storage.getRefreshToken();
    if (!refreshToken) {
      this.storage.clear();
      return;
    }

    try {
      await this.request<{ ok: boolean }>(
        "/auth/logout",
        {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        },
        false,
      );
    } finally {
      this.storage.clear();
    }
  }

  /** Verify the current access token is still valid. */
  async verifySession(): Promise<VerifyResponse> {
    return this.request<VerifyResponse>("/auth/verify");
  }

  /** Fetch a single chain's metadata by ID. */
  async getChain(id: number): Promise<ChainInfo> {
    return this.request<ChainInfo>(`/chains/${id}`);
  }
  /** List all supported chains. */
  async listChains(): Promise<ChainInfo[]> {
    return this.request<ChainInfo[]>("/chains");
  }

  /**
   * Make a JSON-RPC call. The generic `T` parameter lets you type the response.
   *
   * @example
   * ```ts
   * const balance = await client.rpcCall<string>("eth_getBalance", ["0x..."]);
   * ```
   */
  async rpcCall<T = unknown>(chainId: number, method: string, params: unknown[]): Promise<T> {
    return this.request<T>(`/rpc/${chainId}`, {
      method: "POST",
      body: JSON.stringify({ method, params, id: 1, jsonrpc: "2.0" }),
    });
  }
}
