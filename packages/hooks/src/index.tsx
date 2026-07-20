import type { TalakWeb3Instance } from "@talak-web3/types";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export { HookRegistry } from "./hook-registry.js";

const TalakWeb3ReactContext = createContext<TalakWeb3Instance | null>(null);

export interface TalakWeb3ProviderProps {
  instance: TalakWeb3Instance;
  children: ReactNode;
}

export function TalakWeb3Provider({ instance, children }: TalakWeb3ProviderProps) {
  return (
    <TalakWeb3ReactContext.Provider value={instance}>{children}</TalakWeb3ReactContext.Provider>
  );
}

export function useTalakWeb3(): TalakWeb3Instance {
  const ctx = useContext(TalakWeb3ReactContext);
  if (!ctx) throw new Error("useTalakWeb3 must be used within a TalakWeb3Provider");
  return ctx;
}

export function useChain() {
  const instance = useTalakWeb3();
  const [chainId, setChainId] = useState<number>(instance.config.chains[0]?.id ?? 1);

  useEffect(() => {
    return instance.context.hooks.on("chain-changed", setChainId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, setChainId]);

  return {
    chainId,
    chains: instance.config.chains,
    switchChain: (id: number) => instance.context.hooks.emit("chain-switch", id),
  };
}

export function useAccount() {
  const instance = useTalakWeb3();
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    return instance.context.hooks.on("account-changed", setAddress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instance, setAddress]);

  return {
    address,
    isConnected: address !== null,
    connect: (addr: string) => instance.context.hooks.emit("account-changed", addr),
    disconnect: () => instance.context.hooks.emit("account-changed", null),
  };
}

export function useRpc() {
  const instance = useTalakWeb3();
  return {
    request: <T = unknown,>(method: string, params: unknown[] = []) =>
      instance.context.rpc.request<T>(method, params),
  };
}

export function useGasless() {
  const instance = useTalakWeb3();
  const [loading, setLoading] = useState(false);
  const [lastHash, setLastHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendGasless = async (to: string, callData: string) => {
    setLoading(true);
    setError(null);
    try {
      const aaPlugin = instance.context.plugins.get("aa") as
        | { sendGasless?(to: string, data: string): Promise<string> }
        | undefined;
      if (!aaPlugin?.sendGasless) throw new Error("AccountAbstraction plugin not loaded");
      const hash = await aaPlugin.sendGasless(to, callData);
      setLastHash(hash);
      return hash;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { sendGasless, loading, lastHash, error };
}

export function useIdentity() {
  const instance = useTalakWeb3();
  const [profile, setProfile] = useState<{ did?: string; ens?: string; address?: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const resolve = async (addressOrDid: string) => {
    setLoading(true);
    try {
      const identityPlugin = instance.context.plugins.get("identity") as
        | { resolve(input: string): Promise<{ did?: string; ens?: string; address?: string }> }
        | undefined;
      if (!identityPlugin) {
        setProfile({ address: addressOrDid });
        return;
      }
      const p = await identityPlugin.resolve(addressOrDid);
      setProfile(p);
    } finally {
      setLoading(false);
    }
  };

  return { profile, loading, resolve };
}
