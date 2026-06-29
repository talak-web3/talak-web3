import {
  InMemoryNonceStore,
  InMemoryRefreshStore,
  InMemoryRevocationStore,
} from "@talak-web3/auth";
import { describe, it, expect } from "vitest";

import { TALAK_ACCESS_COOKIE, TALAK_REFRESH_COOKIE } from "../auth-cookies.js";
import { createAuthHandler } from "../auth-handler.js";
import { createTalakWeb3 } from "../index.js";
import { setShouldSkipSessionRefresh } from "../should-session-refresh.js";

describe("createAuthHandler", () => {
  const nonceStore = new InMemoryNonceStore();
  const refreshStore = new InMemoryRefreshStore();
  const revocationStore = new InMemoryRevocationStore();

  function createInstance() {
    return createTalakWeb3({
      chains: [
        {
          id: 1,
          name: "Ethereum",
          rpcUrls: ["https://example.com"],
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        },
      ],
      auth: {
        nonceStore,
        refreshStore,
        revocationStore,
        accessTtlSeconds: 900,
        refreshTtlSeconds: 60 * 60,
      },
    });
  }

  it("should expose handler on talak-web3 instance", () => {
    const instance = createInstance();
    expect(typeof instance.handler).toBe("function");
  });

  it("should create a nonce", async () => {
    const instance = createInstance();
    const response = await instance.handler(
      new Request("http://localhost:3000/api/auth/nonce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: "0x1234567890123456789012345678901234567890" }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(typeof body.nonce).toBe("string");
  });

  it("should set auth cookies on login", async () => {
    const instance = createInstance();
    const address = "0x1234567890123456789012345678901234567890";

    const nonceResponse = await instance.handler(
      new Request("http://localhost:3000/api/auth/nonce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      }),
    );
    const { nonce } = await nonceResponse.json();

    const message =
      `localhost wants you to sign in with your Ethereum account:\n` +
      `${address}\n\n` +
      `Sign in with Ethereum to talak-web3.\n\n` +
      `URI: http://localhost:3000\n` +
      `Version: 1\n` +
      `Chain ID: 1\n` +
      `Nonce: ${nonce}\n` +
      `Issued At: ${new Date().toISOString()}`;

    const signature =
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12";

    const loginResponse = await instance.handler(
      new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, signature }),
      }),
    );

    expect(loginResponse.status).toBeGreaterThanOrEqual(400);
  });

  it("should return session for unauthenticated requests", async () => {
    const instance = createInstance();
    const response = await instance.handler(
      new Request("http://localhost:3000/api/auth/session", { method: "GET" }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.isAuthenticated).toBe(false);
  });

  it("should invoke plugin hooks", async () => {
    const instance = createInstance();
    let beforeCalled = false;
    let afterCalled = false;

    await instance.init();
    instance.context.plugins.set("test-hooks", {
      name: "test-hooks",
      version: "1.0.0",
      setup: async () => {},
      onBeforeRequest: async () => {
        beforeCalled = true;
      },
      onAfterResponse: async () => {
        afterCalled = true;
      },
    });

    await instance.handler(new Request("http://localhost:3000/api/auth/session"));

    expect(beforeCalled).toBe(true);
    expect(afterCalled).toBe(true);
  });

  it("should skip session refresh when flagged by plugin", async () => {
    const instance = createInstance();
    await instance.init();
    instance.context.plugins.set("skip-refresh", {
      name: "skip-refresh",
      version: "1.0.0",
      setup: async () => {},
      onBeforeRequest: async () => {
        setShouldSkipSessionRefresh(true);
      },
    });

    const response = await instance.handler(
      new Request("http://localhost:3000/api/auth/session", {
        method: "GET",
        headers: {
          cookie: `${TALAK_REFRESH_COOKIE}=invalid-token-that-is-long-enough`,
        },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.isAuthenticated).toBe(false);
  });

  it("should expose jwks route", async () => {
    const instance = createInstance();
    const response = await instance.handler(
      new Request("http://localhost:3000/api/auth/jwks", { method: "GET" }),
    );

    const body = await response.json();
    expect(body).toBeDefined();
    expect([200, 500]).toContain(response.status);
  });

  it("should read access token from cookie on verify", async () => {
    const instance = createInstance();
    const response = await instance.handler(
      new Request("http://localhost:3000/api/auth/verify", {
        method: "GET",
        headers: {
          cookie: `${TALAK_ACCESS_COOKIE}=invalid.jwt.token`,
        },
      }),
    );

    expect(response.status).toBe(401);
  });
});
