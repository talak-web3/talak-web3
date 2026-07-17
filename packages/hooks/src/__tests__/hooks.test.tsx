import type { TalakWeb3Instance, TalakWeb3Context, IRpc } from "@talak-web3/types";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

import { HookRegistry } from "../hook-registry.js";
import { TalakWeb3Provider, useTalakWeb3, useChain, useAccount, useRpc, useGasless, useIdentity } from "../index.js";

type Events = {
  "chain-changed": number;
  "chain-switch": number;
  "account-changed": string | null;
};

function createMockInstance(overrides?: { rpc?: Partial<IRpc> }): TalakWeb3Instance {
  const hooks = new HookRegistry<Events>();

  const rpc: IRpc = {
    request: vi.fn().mockResolvedValue(null),
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
  };
}

function createWrapper(instance: TalakWeb3Instance) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <TalakWeb3Provider instance={instance}>{children}</TalakWeb3Provider>;
  };
}

describe("TalakWeb3Provider + useTalakWeb3", () => {
  it("provides instance to children via context", () => {
    const instance = createMockInstance();
    const wrapper = createWrapper(instance);

    const { result } = renderHook(() => useTalakWeb3(), { wrapper });
    expect(result.current).toBe(instance);
  });

  it("throws when used outside provider", () => {
    // Suppress React console.error for expected throw
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTalakWeb3());
    }).toThrow("useTalakWeb3 must be used within a TalakWeb3Provider");

    spy.mockRestore();
  });
});

describe("useChain", () => {
  it("returns default chain id from config", () => {
    const instance = createMockInstance();
    const wrapper = createWrapper(instance);

    const { result } = renderHook(() => useChain(), { wrapper });
    expect(result.current.chainId).toBe(1);
    expect(result.current.chains).toHaveLength(2);
  });

  it("switchChain emits chain-switch event", () => {
    const instance = createMockInstance();
    const emitSpy = vi.spyOn(instance.hooks, "emit");
    const wrapper = createWrapper(instance);

    const { result } = renderHook(() => useChain(), { wrapper });

    act(() => {
      result.current.switchChain(10);
    });

    expect(emitSpy).toHaveBeenCalledWith("chain-switch", 10);
  });

  it("updates chainId when chain-changed event fires", () => {
    const instance = createMockInstance();
    const wrapper = createWrapper(instance);

    const { result } = renderHook(() => useChain(), { wrapper });
    expect(result.current.chainId).toBe(1);

    act(() => {
      instance.hooks.emit("chain-changed", 10);
    });

    expect(result.current.chainId).toBe(10);
  });
});

describe("useAccount", () => {
  it("returns disconnected state by default", () => {
    const instance = createMockInstance();
    const wrapper = createWrapper(instance);

    const { result } = renderHook(() => useAccount(), { wrapper });
    expect(result.current.address).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it("connect emits account-changed and updates state", () => {
    const instance = createMockInstance();
    const emitSpy = vi.spyOn(instance.hooks, "emit");
    const wrapper = createWrapper(instance);

    const { result } = renderHook(() => useAccount(), { wrapper });

    act(() => {
      result.current.connect("0xABC");
    });

    expect(emitSpy).toHaveBeenCalledWith("account-changed", "0xABC");
  });

  it("updates address when account-changed event fires", () => {
    const instance = createMockInstance();
    const wrapper = createWrapper(instance);

    const { result } = renderHook(() => useAccount(), { wrapper });

    act(() => {
      instance.hooks.emit("account-changed", "0xDEF");
    });

    expect(result.current.address).toBe("0xDEF");
    expect(result.current.isConnected).toBe(true);
  });

  it("disconnect sets address to null", () => {
    const instance = createMockInstance();
    const wrapper = createWrapper(instance);

    const { result } = renderHook(() => useAccount(), { wrapper });

    act(() => {
      instance.hooks.emit("account-changed", "0xDEF");
    });
    expect(result.current.isConnected).toBe(true);

    act(() => {
      result.current.disconnect();
    });
    expect(result.current.address).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });
});

describe("useRpc", () => {
  it("delegates request to instance.context.rpc.request", async () => {
    const mockRequest = vi.fn().mockResolvedValue({ blockNumber: 42 });
    const instance = createMockInstance({ rpc: { request: mockRequest } });
    const wrapper = createWrapper(instance);

    const { result } = renderHook(() => useRpc(), { wrapper });

    let response: unknown;
    await act(async () => {
      response = await result.current.request("eth_blockNumber");
    });

    expect(mockRequest).toHaveBeenCalledWith("eth_blockNumber", []);
    expect(response).toEqual({ blockNumber: 42 });
  });

  it("passes params through to rpc.request", async () => {
    const mockRequest = vi.fn().mockResolvedValue("0x1");
    const instance = createMockInstance({ rpc: { request: mockRequest } });
    const wrapper = createWrapper(instance);

    const { result } = renderHook(() => useRpc(), { wrapper });

    await act(async () => {
      await result.current.request("eth_getBalance", ["0xABC", "latest"]);
    });

    expect(mockRequest).toHaveBeenCalledWith("eth_getBalance", ["0xABC", "latest"]);
  });
});

describe("useGasless", () => {
  it("starts with idle state", () => {
    const instance = createMockInstance();
    const wrapper = createWrapper(instance);

    const { result } = renderHook(() => useGasless(), { wrapper });
    expect(result.current.loading).toBe(false);
    expect(result.current.lastHash).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("sets error when AA plugin not loaded", async () => {
    const instance = createMockInstance();
    const wrapper = createWrapper(instance);

    const { result } = renderHook(() => useGasless(), { wrapper });

    await act(async () => {
      try {
        await result.current.sendGasless("0xtarget", "0xdata");
      } catch {
        // expected
      }
    });
    expect(result.current.error).toBe("AccountAbstraction plugin not loaded");
    expect(result.current.loading).toBe(false);
  });

  it("calls aa.sendGasless and returns hash on success", async () => {
    const instance = createMockInstance();
    const sendGasless = vi.fn().mockResolvedValue("0xhash123");
    (instance.context as unknown as Record<string, unknown>)["aa"] = { sendGasless };
    const wrapper = createWrapper(instance);

    const { result } = renderHook(() => useGasless(), { wrapper });

    let hash: string | undefined;
    await act(async () => {
      hash = await result.current.sendGasless("0xtarget", "0xdata");
    });

    expect(hash).toBe("0xhash123");
    expect(result.current.lastHash).toBe("0xhash123");
    expect(result.current.loading).toBe(false);
    expect(sendGasless).toHaveBeenCalledWith("0xtarget", "0xdata");
  });
});

describe("useIdentity", () => {
  it("starts with null profile", () => {
    const instance = createMockInstance();
    const wrapper = createWrapper(instance);

    const { result } = renderHook(() => useIdentity(), { wrapper });
    expect(result.current.profile).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("returns address as fallback when identity plugin not loaded", async () => {
    const instance = createMockInstance();
    const wrapper = createWrapper(instance);

    const { result } = renderHook(() => useIdentity(), { wrapper });

    await act(async () => {
      await result.current.resolve("0xABC");
    });

    expect(result.current.profile).toEqual({ address: "0xABC" });
    expect(result.current.loading).toBe(false);
  });

  it("calls identity.resolve and sets profile", async () => {
    const instance = createMockInstance();
    const mockProfile = { did: "did:key:z123", ens: "alice.eth", address: "0xDEF" };
    const resolve = vi.fn().mockResolvedValue(mockProfile);
    (instance.context as unknown as Record<string, unknown>)["identity"] = { resolve };
    const wrapper = createWrapper(instance);

    const { result } = renderHook(() => useIdentity(), { wrapper });

    await act(async () => {
      await result.current.resolve("0xDEF");
    });

    expect(resolve).toHaveBeenCalledWith("0xDEF");
    expect(result.current.profile).toEqual(mockProfile);
    expect(result.current.loading).toBe(false);
  });
});
