// ---------------------------------------------------------------------------
// Token storage interface — injectable for different environments
// (memory, localStorage, SecureStore, etc.)
// ---------------------------------------------------------------------------
/** In-memory token storage (default — suitable for SPAs) */
export class InMemoryTokenStorage {
    accessToken = null;
    refreshToken = null;
    getAccessToken() { return this.accessToken; }
    setAccessToken(token) { this.accessToken = token; }
    getRefreshToken() { return this.refreshToken; }
    setRefreshToken(token) { this.refreshToken = token; }
    clear() { this.accessToken = null; this.refreshToken = null; }
}
/**
 * Cookie-based token storage implementation.
 * Used when the backend sets HttpOnly cookies (or if the client manages accessible cookies).
 * Note: If the backend leverages 'Set-Cookie' HttpOnly for the refresh token,
 * the client should NOT attempt to read/write it directly. This implementation
 * assumes the client is manually syncing an accessible cookie or managing
 * the access token in memory while relying on browser credentials inclusion.
 */
export class CookieTokenStorage {
    accessToken = null;
    getAccessToken() { return this.accessToken; }
    setAccessToken(token) { this.accessToken = token; }
    getRefreshToken() {
        // Fallback reading from document.cookie if not HttpOnly
        if (typeof document === 'undefined')
            return null;
        const match = document.cookie.match(new RegExp('(^| )better_web3_refresh=([^;]+)'));
        return match ? match[2] ?? null : null;
    }
    setRefreshToken(token) {
        if (typeof document === 'undefined')
            return;
        document.cookie = `better_web3_refresh=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict; Secure`;
    }
    clear() {
        this.accessToken = null;
        if (typeof document !== 'undefined') {
            document.cookie = 'better_web3_refresh=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
    }
}
export class BetterWeb3Client {
    baseUrl;
    fetchImpl;
    storage;
    // Mutex to prevent concurrent refresh calls
    refreshPromise = null;
    constructor(opts) {
        this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
        this.fetchImpl = opts.fetch ?? globalThis.fetch.bind(globalThis);
        this.storage = opts.storage ?? new InMemoryTokenStorage();
    }
    /**
     * Core request method.
     * Automatically attaches the access token via Authorization header.
     * On 401, attempts a single token refresh (batched via mutex) then retries once.
     */
    async request(path, options = {}, retryOnUnauthorized = true) {
        const accessToken = this.storage.getAccessToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        // Attach CSRF token for mutating methods
        if (['POST', 'PUT', 'DELETE'].includes(options.method ?? 'GET')) {
            const csrfToken = this.getCsrfToken();
            if (csrfToken)
                headers['x-csrf-token'] = csrfToken;
        }
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }
        const res = await this.fetchImpl(`${this.baseUrl}${path}`, { ...options, headers });
        if (res.status === 401 && retryOnUnauthorized) {
            const refreshToken = this.storage.getRefreshToken();
            if (refreshToken) {
                try {
                    // Await the shared refresh mutex to prevent parallel rotations
                    await this.getOrStartRefresh(refreshToken);
                    // Retry with new access token (no further retry to prevent infinite loops)
                    return this.request(path, options, false);
                }
                catch (err) {
                    // HARD LOGOUT on refresh failure
                    this.storage.clear();
                    throw err;
                }
            }
        }
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status}: ${text}`);
        }
        return res.json();
    }
    /**
     * Safe, concurrent-aware refresh wrapped in a Promise mutex.
     */
    getOrStartRefresh(refreshToken) {
        if (!this.refreshPromise) {
            this.refreshPromise = this.refresh(refreshToken).finally(() => {
                this.refreshPromise = null;
            });
        }
        return this.refreshPromise;
    }
    /**
     * Extract CSRF token from document.cookie for double-submit.
     */
    getCsrfToken() {
        if (typeof document === 'undefined')
            return null;
        const match = document.cookie.match(new RegExp('(^| )csrf_token=([^;]+)'));
        return match ? match[2] ?? null : null;
    }
    // ---------------------------------------------------------------------------
    // Auth Endpoints
    // ---------------------------------------------------------------------------
    /** Step 1 of SIWE flow: request a server-issued nonce for an address. */
    async getNonce(address) {
        return this.request('/auth/nonce', {
            method: 'POST',
            body: JSON.stringify({ address }),
        });
    }
    /**
     * Step 4 of SIWE flow: submit signed SIWE message.
     * Stores both tokens in the configured storage on success.
     */
    async loginWithSiwe(message, signature) {
        const res = await this.fetchImpl(`${this.baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, signature }),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`Login failed: HTTP ${res.status}: ${text}`);
        }
        const data = await res.json();
        this.storage.setAccessToken(data.accessToken);
        this.storage.setRefreshToken(data.refreshToken);
        return data;
    }
    /**
     * Rotate the refresh token and update stored tokens.
     * Exposed publicly but usually called automatically on 401 by request().
     */
    async refresh(refreshToken) {
        const res = await this.fetchImpl(`${this.baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`Refresh failed: HTTP ${res.status}: ${text}`);
        }
        const data = await res.json();
        this.storage.setAccessToken(data.accessToken);
        this.storage.setRefreshToken(data.refreshToken);
        return data;
    }
    /** Revoke the refresh session. Clears local token storage. */
    async logout() {
        const refreshToken = this.storage.getRefreshToken();
        if (!refreshToken) {
            this.storage.clear();
            return;
        }
        // Best-effort — don't throw if network fails; still clear local tokens
        try {
            await this.request('/auth/logout', {
                method: 'POST',
                body: JSON.stringify({ refreshToken }),
            }, false);
        }
        finally {
            this.storage.clear();
        }
    }
    /** Verify the currently stored access token with the server. */
    async verifySession() {
        return this.request('/auth/verify');
    }
    // ---------------------------------------------------------------------------
    // Chain Endpoints
    // ---------------------------------------------------------------------------
    async getChain(id) { return this.request(`/chains/${id}`); }
    async listChains() { return this.request('/chains'); }
    // ---------------------------------------------------------------------------
    // RPC Endpoints
    // ---------------------------------------------------------------------------
    async rpcCall(chainId, method, params) {
        return this.request(`/rpc/${chainId}`, {
            method: 'POST',
            body: JSON.stringify({ method, params, id: 1, jsonrpc: '2.0' }),
        });
    }
}
//# sourceMappingURL=index.js.map