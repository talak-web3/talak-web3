export interface TokenStorage {
  getAccessToken(): string | null;
  setAccessToken(token: string): void;
  getRefreshToken(): string | null;
  setRefreshToken(token: string): void;
  clear(): void;
}
/** In-memory token storage (default — suitable for SPAs) */
export declare class InMemoryTokenStorage implements TokenStorage {
  private accessToken;
  private refreshToken;
  getAccessToken(): string | null;
  setAccessToken(token: string): void;
  getRefreshToken(): string | null;
  setRefreshToken(token: string): void;
  clear(): void;
}
/**
 * Cookie-based token storage implementation.
 * Used when the backend sets HttpOnly cookies (or if the client manages accessible cookies).
 * Note: If the backend leverages 'Set-Cookie' HttpOnly for the refresh token,
 * the client should NOT attempt to read/write it directly. This implementation
 * assumes the client is manually syncing an accessible cookie or managing
 * the access token in memory while relying on browser credentials inclusion.
 */
export declare class CookieTokenStorage implements TokenStorage {
  private accessToken;
  getAccessToken(): string | null;
  setAccessToken(token: string): void;
  getRefreshToken(): string | null;
  setRefreshToken(token: string): void;
  clear(): void;
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
  payload?: {
    address: string;
    chainId: number;
  };
}
export type TalakWeb3ClientOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
  storage?: TokenStorage;
};
export declare class TalakWeb3Client {
  private readonly baseUrl;
  private readonly fetchImpl;
  readonly storage: TokenStorage;
  private refreshPromise;
  constructor(opts: TalakWeb3ClientOptions);
  /**
   * Core request method.
   * Automatically attaches the access token via Authorization header.
   * On 401, attempts a single token refresh (batched via mutex) then retries once.
   */
  private request;
  /**
   * Safe, concurrent-aware refresh wrapped in a Promise mutex.
   */
  private getOrStartRefresh;
  /**
   * Extract CSRF token from document.cookie for double-submit.
   */
  private getCsrfToken;
  /** Request a server-issued nonce for SIWE authentication. */
  getNonce(address: string): Promise<NonceResponse>;
  /**
   * Submit signed SIWE message for authentication.
   * Stores both tokens in the configured storage on success.
   */
  loginWithSiwe(message: string, signature: string): Promise<LoginResponse>;
  /**
   * Rotate the refresh token and update stored tokens.
   * Exposed publicly but usually called automatically on 401 by request().
   */
  refresh(refreshToken: string): Promise<RefreshResponse>;
  /** Revoke the refresh session. Clears local token storage. */
  logout(): Promise<void>;
  /** Verify the currently stored access token with the server. */
  verifySession(): Promise<VerifyResponse>;
  getChain(id: number): Promise<unknown>;
  listChains(): Promise<unknown>;
  rpcCall(chainId: number, method: string, params: unknown[]): Promise<unknown>;
}
