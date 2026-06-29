import { runWithRequestStateAsync } from "@talak-web3/core";
import type { TalakWeb3Context } from "@talak-web3/types";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { nextCookies } from "../plugin.js";

const mockCookies = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

const mockHeaders = {
  get: vi.fn(),
};

vi.mock("next/headers.js", () => ({
  cookies: vi.fn().mockResolvedValue(mockCookies),
  headers: vi.fn().mockResolvedValue(mockHeaders),
}));

function createMockCtx(): TalakWeb3Context {
  return {
    config: { chains: [], rpc: { retries: 0, timeout: 0 } },
    hooks: { on: vi.fn(), off: vi.fn(), emit: vi.fn(), clear: vi.fn() },
    plugins: new Map(),
    auth: {} as TalakWeb3Context["auth"],
    cache: { get: vi.fn(), set: vi.fn(), delete: vi.fn(), clear: vi.fn() },
    logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
    requestChain: {} as TalakWeb3Context["requestChain"],
    responseChain: {} as TalakWeb3Context["responseChain"],
    rpc: {} as TalakWeb3Context["rpc"],
  };
}

describe("nextCookies", () => {
  const ctx = createMockCtx();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a plugin with correct structure", () => {
    const plugin = nextCookies();

    expect(plugin).toHaveProperty("name", "next-cookies");
    expect(plugin).toHaveProperty("version");
    expect(plugin).toHaveProperty("setup");
    expect(plugin).toHaveProperty("onBeforeRequest");
    expect(plugin).toHaveProperty("onAfterResponse");
  });

  it("should forward Set-Cookie headers to Next.js", async () => {
    const plugin = nextCookies();
    const mockResponse = new Response("OK", {
      status: 200,
      headers: {
        "set-cookie": "token=abc123; Path=/; HttpOnly; Secure",
      },
    });

    await plugin.onAfterResponse!(mockResponse, ctx);

    expect(mockCookies.set).toHaveBeenCalledWith(
      "token",
      "abc123",
      expect.objectContaining({
        path: "/",
        httpOnly: true,
        secure: true,
      }),
    );
  });

  it("should set shouldSkipSessionRefresh in RSC context", async () => {
    const { headers } = await import("next/headers.js");
    vi.mocked(headers).mockResolvedValueOnce({
      get: vi.fn((name: string) => {
        if (name === "RSC") return "1";
        return null;
      }),
    } as unknown as Headers);

    const plugin = nextCookies();
    const request = new Request("http://localhost:3000/api/auth/session");

    await runWithRequestStateAsync(async () => {
      await plugin.onBeforeRequest!(request, ctx);
    });
  });

  it("should not skip refresh for Server Actions", async () => {
    const { headers } = await import("next/headers.js");
    vi.mocked(headers).mockResolvedValueOnce({
      get: vi.fn((name: string) => {
        if (name === "RSC") return "1";
        if (name === "next-action") return "abc123";
        return null;
      }),
    } as unknown as Headers);

    const plugin = nextCookies();
    const request = new Request("http://localhost:3000/api/auth/session");

    await expect(plugin.onBeforeRequest!(request, ctx)).resolves.toBeUndefined();
  });

  it("should handle cookies outside request scope gracefully", async () => {
    const { cookies } = await import("next/headers.js");
    vi.mocked(cookies).mockRejectedValueOnce(
      new Error("`cookies` was called outside a request scope."),
    );

    const plugin = nextCookies();
    const mockResponse = new Response("OK", {
      status: 200,
      headers: {
        "set-cookie": "token=abc",
      },
    });

    await expect(plugin.onAfterResponse!(mockResponse, ctx)).resolves.toBeUndefined();
  });
});
