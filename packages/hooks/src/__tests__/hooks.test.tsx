import type { TalakWeb3Instance, TalakWeb3Context, IRpc } from "@talak-web3/types";
// @vitest-environment jsdom
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { useAccount } from "../hooks/use-account.js";
import { useBalance } from "../hooks/use-balance.js";
import { TalakWeb3Provider } from "../provider.js";
import { useTalakWeb3 } from "../shared/use-talak.js";
import { TalakWeb3Store } from "../store.js";

type Events = Record<string, unknown>;
class MockHookRegistry {
  private map = new Map<string, Set<(data: unknown) => void>>();

  on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): () => void {
    const key = event as string;
    let handlers = this.map.get(key);
    if (!handlers) {
      handlers = new Set();
      this.map.set(key, handlers);
    }
    handlers.add(handler as (data: unknown) => void);
    return () => handlers?.delete(handler as (data: unknown) => void);
  }

  off(_event: string, _handler: (...args: unknown[]) => void): void {
    /* no-op */
  }
  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    this.map.get(event as string)?.forEach((h) => h(data));
  }
  clear(): void {
    /* no-op */
  }
}

function mockEthereum(overrides: Partial<Window["ethereum"]> = {}) {
  const ethereum = {
    isMetaMask: true,
    request: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
    ...overrides,
  };
  Object.defineProperty(window, "ethereum", {
    value: ethereum,
    writable: true,
    configurable: true,
  });
  return ethereum;
}

function createMockInstance(overrides?: { rpc?: Partial<IRpc> }): TalakWeb3Instance {
  const hooks = new MockHookRegistry() as unknown as TalakWeb3Instance["hooks"];
  const rpc: IRpc = {
    request: vi.fn().mockResolvedValue("0x0"),
    getProvider: vi.fn().mockResolvedValue(undefined),
    pauseHealthChecks: vi.fn(),
    resumeHealthChecks: vi.fn(),
    stop: vi.fn(),
    ...overrides?.rpc,
  };

  const context: TalakWeb3Context = {
    config: {
      chains: [
        {
          id: 1,
          name: "Ethereum",
          rpcUrls: ["https://rpc.example.com"],
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          testnet: false,
        },
        {
          id: 10,
          name: "Optimism",
          rpcUrls: ["https://rpc.optimism.example.com"],
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          testnet: false,
        },
      ],
      debug: false,
      rpc: { retries: 3, timeout: 10_000 },
    } as TalakWeb3Context["config"],
    hooks,
    plugins: new Map(),
    rpc,
    auth: {} as TalakWeb3Context["auth"],
    cache: {} as TalakWeb3Context["cache"],
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    requestChain: {} as TalakWeb3Context["requestChain"],
    responseChain: {} as TalakWeb3Context["responseChain"],
  };

  return {
    config: context.config,
    hooks,
    context,
    handler: vi.fn().mockResolvedValue(new Response()),
    init: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    healthCheck: vi.fn().mockReturnValue({ status: "ok" as const, checks: {} }),
    shutdown: vi.fn().mockResolvedValue(undefined),
  } satisfies TalakWeb3Instance as unknown as TalakWeb3Instance;
}

function createWrapper(instance: TalakWeb3Instance) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <TalakWeb3Provider instance={instance}>{children}</TalakWeb3Provider>;
  };
}

describe("TalakWeb3Provider", () => {
  it("renders children without throwing", () => {
    const instance = createMockInstance();
    const { result } = renderHook(() => useAccount(), { wrapper: createWrapper(instance) });
    expect(result.current.address).toBeNull();
  });

  it("throws when used outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAccount())).toThrow("StoreContext");
    spy.mockRestore();
  });
});

describe("useTalakWeb3", () => {
  it("returns the SDK instance", () => {
    const instance = createMockInstance();
    const { result } = renderHook(() => useTalakWeb3(), { wrapper: createWrapper(instance) });
    expect(result.current).toBe(instance);
  });

  it("throws outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useTalakWeb3())).toThrow("StoreContext");
    spy.mockRestore();
  });
});

describe("useAccount", () => {
  beforeEach(() => mockEthereum());

  it("starts with null address and first chain", () => {
    const { result } = renderHook(() => useAccount(), {
      wrapper: createWrapper(createMockInstance()),
    });
    expect(result.current.address).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.chainId).toBe(1);
    expect(result.current.chains).toHaveLength(2);
  });

  it("connect requests accounts via eth_requestAccounts", async () => {
    const eth = mockEthereum({ request: vi.fn().mockResolvedValue(["0xABC"]) });
    const { result } = renderHook(() => useAccount(), {
      wrapper: createWrapper(createMockInstance()),
    });

    await act(async () => {
      await result.current.connect();
    });

    expect(eth.request).toHaveBeenCalledWith({ method: "eth_requestAccounts" });
    expect(result.current.address).toBe("0xABC");
    expect(result.current.isConnected).toBe(true);
  });

  it("disconnect clears address", async () => {
    mockEthereum({ request: vi.fn().mockResolvedValue(["0xABC"]) });
    const { result } = renderHook(() => useAccount(), {
      wrapper: createWrapper(createMockInstance()),
    });

    await act(async () => {
      await result.current.connect();
    });
    act(() => result.current.disconnect());

    expect(result.current.address).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it("reacts to account-changed events", () => {
    const instance = createMockInstance();
    const { result } = renderHook(() => useAccount(), { wrapper: createWrapper(instance) });

    act(() => instance.hooks.emit("account-changed", "0xABC"));
    expect(result.current.address).toBe("0xABC");
    expect(result.current.isConnected).toBe(true);
  });

  it("reacts to chain-changed events", () => {
    const instance = createMockInstance();
    const { result } = renderHook(() => useAccount(), { wrapper: createWrapper(instance) });

    expect(result.current.chainId).toBe(1);
    act(() => instance.hooks.emit("chain-changed", 10));
    expect(result.current.chainId).toBe(10);
  });

  it("switchChain emits chain-switch event", () => {
    const instance = createMockInstance();
    const spy = vi.spyOn(instance.hooks, "emit");
    const { result } = renderHook(() => useAccount(), { wrapper: createWrapper(instance) });

    act(() => result.current.switchChain(10));
    expect(spy).toHaveBeenCalledWith("chain-switch", 10);
  });

  it("throws outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAccount())).toThrow("StoreContext");
    spy.mockRestore();
  });
});

describe("useBalance", () => {
  it("fetches and returns balance", async () => {
    const mockRequest = vi.fn().mockResolvedValue("0x1bc16d674ec80000"); // 2 ETH
    const { result } = renderHook(() => useBalance({ address: "0xABC" }), {
      wrapper: createWrapper(createMockInstance({ rpc: { request: mockRequest } })),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBe(2000000000000000000n);
    expect(mockRequest).toHaveBeenCalledWith(1, "eth_getBalance", ["0xABC", "latest"]);
  });

  it("exposes error state on failure", async () => {
    const mockRequest = vi.fn().mockRejectedValue(new Error("RPC timeout"));
    const { result } = renderHook(() => useBalance({ address: "0xABC" }), {
      wrapper: createWrapper(createMockInstance({ rpc: { request: mockRequest } })),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe("RPC timeout");
  });
});

describe("TalakWeb3Store", () => {
  it("is exported for advanced use", () => {
    const instance = createMockInstance();
    const store = new TalakWeb3Store(instance);
    expect(store.getSnapshot().chainId).toBe(1);
    expect(store.getSnapshot().chains).toHaveLength(2);
    expect(store.getSnapshot().address).toBeNull();
  });

  it("notifies on chain-changed", () => {
    const instance = createMockInstance();
    const store = new TalakWeb3Store(instance);
    const cb = vi.fn();
    const unsub = store.subscribe(cb);

    instance.hooks.emit("chain-changed", 10);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().chainId).toBe(10);

    unsub();
    instance.hooks.emit("chain-changed", 1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("setAddress emits account-changed and updates state", () => {
    const instance = createMockInstance();
    const store = new TalakWeb3Store(instance);
    const spy = vi.spyOn(instance.hooks, "emit");

    store.setAddress("0xABC");
    expect(spy).toHaveBeenCalledWith("account-changed", "0xABC");
  });
});
