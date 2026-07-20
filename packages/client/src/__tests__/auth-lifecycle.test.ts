import { TalakWeb3Client, InMemoryTokenStorage } from "@talak-web3/client";
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("E2E Auth Lifecycle", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let storage: InMemoryTokenStorage;
  let client: TalakWeb3Client;

  beforeEach(() => {
    storage = new InMemoryTokenStorage();
    let callCount = 0;

    fetchMock = vi.fn(async (url: string | URL | Request, opts?: RequestInit) => {
      const path = String(url);
      callCount++;
      const seq = callCount;

      if (path.includes("/auth/nonce")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ nonce: `nonce-${seq}` }),
          text: async () => "",
        } as Response;
      }

      if (path.includes("/auth/login")) {
        const body = JSON.parse(String(opts?.body ?? "{}"));
        if (!body.message || !body.signature) {
          return {
            ok: false,
            status: 400,
            json: async () => ({}),
            text: async () => "Bad request",
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ accessToken: `at-${seq}`, refreshToken: `rt-${seq}` }),
          text: async () => "",
        } as Response;
      }

      if (path.includes("/auth/verify")) {
        if (!opts?.headers || !(opts.headers as Record<string, string>)["Authorization"]) {
          return {
            ok: false,
            status: 401,
            json: async () => ({ ok: false }),
            text: async () => "",
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, payload: { address: "0x1234", chainId: 1 } }),
          text: async () => "",
        } as Response;
      }

      if (path.includes("/auth/refresh")) {
        const body = JSON.parse(String(opts?.body ?? "{}"));
        if (!body.refreshToken) {
          return {
            ok: false,
            status: 400,
            json: async () => ({}),
            text: async () => "",
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            accessToken: `refreshed-at-${seq}`,
            refreshToken: `refreshed-rt-${seq}`,
          }),
          text: async () => "",
        } as Response;
      }

      if (path.includes("/auth/logout")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true }),
          text: async () => "",
        } as Response;
      }

      return { ok: false, status: 404, json: async () => ({}), text: async () => "" } as Response;
    });

    client = new TalakWeb3Client({
      baseUrl: "http://localhost:3000",
      fetch: fetchMock as unknown as typeof fetch,
      storage,
    });
  });

  it("complete lifecycle: nonce → login → verify → refresh → logout", async () => {
    // Step 1: Get nonce
    const nonceRes = await client.getNonce("0x1234");
    expect(nonceRes.nonce).toBeTruthy();
    expect(storage.getAccessToken()).toBeNull();

    // Step 2: Login with SIWE
    const loginRes = await client.loginWithSiwe(
      "example.com wants you to sign in...",
      "0xsignature",
    );
    expect(loginRes.accessToken).toBe("at-2");
    expect(loginRes.refreshToken).toBe("rt-2");
    expect(storage.getAccessToken()).toBe("at-2");
    expect(storage.getRefreshToken()).toBe("rt-2");

    // Step 3: Verify session (should use stored access token)
    const verifyRes = await client.verifySession();
    expect(verifyRes.ok).toBe(true);
    const authHeader = fetchMock.mock.calls[2]?.[1]?.headers?.["Authorization"];
    expect(authHeader).toBe("Bearer at-2");

    // Step 4: Refresh tokens
    const refreshRes = await client.refresh("rt-2");
    expect(refreshRes.accessToken).toBe("refreshed-at-4");
    expect(refreshRes.refreshToken).toBe("refreshed-rt-4");
    expect(storage.getAccessToken()).toBe("refreshed-at-4");
    expect(storage.getRefreshToken()).toBe("refreshed-rt-4");

    // Step 5: Logout
    await client.logout();
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
  });

  it("auto-retry on 401 with refresh token", async () => {
    // Login first
    await client.loginWithSiwe("msg", "0xsig");

    // Make verify return 401 first, then 200 after refresh
    let verifyAttempts = 0;
    fetchMock.mockImplementation(async (url: string | URL | Request, opts?: RequestInit) => {
      const path = String(url);
      if (path.includes("/auth/verify")) {
        verifyAttempts++;
        if (verifyAttempts === 1) {
          return {
            ok: false,
            status: 401,
            json: async () => ({}),
            text: async () => "",
          } as Response;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ ok: true, payload: { address: "0x1234", chainId: 1 } }),
          text: async () => "",
        } as Response;
      }
      if (path.includes("/auth/refresh")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ accessToken: "new-at", refreshToken: "new-rt" }),
          text: async () => "",
        } as Response;
      }
      return { ok: true, status: 200, json: async () => ({}), text: async () => "" } as Response;
    });

    const result = await client.verifySession();
    expect(result.ok).toBe(true);
    expect(verifyAttempts).toBe(2);
    expect(storage.getAccessToken()).toBe("new-at");
  });

  it("logout clears storage even without refresh token", async () => {
    storage.setAccessToken("at-only");
    await client.logout();
    expect(storage.getAccessToken()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deduplicates concurrent refresh calls", async () => {
    storage.setAccessToken("expired-at");
    storage.setRefreshToken("refresh-token");

    let refreshCount = 0;
    fetchMock.mockImplementation(async (url: string | URL | Request, opts?: RequestInit) => {
      const path = String(url);
      if (path.includes("/auth/verify")) {
        return { ok: false, status: 401, json: async () => ({}), text: async () => "" } as Response;
      }
      if (path.includes("/auth/refresh")) {
        refreshCount++;
        await new Promise((r) => setTimeout(r, 50));
        return {
          ok: true,
          status: 200,
          json: async () => ({ accessToken: "deduped-at", refreshToken: "deduped-rt" }),
          text: async () => "",
        } as Response;
      }
      return { ok: true, status: 200, json: async () => ({}), text: async () => "" } as Response;
    });

    const results = await Promise.all([
      client.verifySession().catch(() => null),
      client.verifySession().catch(() => null),
      client.verifySession().catch(() => null),
    ]);

    expect(results).toHaveLength(3);
    expect(refreshCount).toBe(1);
  });

  it("login failure does not store tokens", async () => {
    fetchMock.mockImplementationOnce(
      async () =>
        ({
          ok: false,
          status: 401,
          json: async () => ({}),
          text: async () => "Unauthorized",
        }) as Response,
    );

    await expect(client.loginWithSiwe("msg", "bad-sig")).rejects.toThrow("Login failed");
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
  });

  it("refresh failure clears storage", async () => {
    storage.setAccessToken("at");
    storage.setRefreshToken("bad-rt");

    fetchMock.mockImplementationOnce(
      async () =>
        ({
          ok: false,
          status: 401,
          json: async () => ({}),
          text: async () => "",
        }) as Response,
    );

    await expect(client.refresh("bad-rt")).rejects.toThrow("Refresh failed");
  });
});
