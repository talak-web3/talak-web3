import type { Address, ChainId } from "@talak-web3/types";
import { useCallback, useSyncExternalStore, useContext } from "react";

import { StoreContext } from "../context.js";
import { assertContext } from "../shared/assert.js";
import type { ChainConfig } from "../store.js";

export interface UseAccountReturn {
  /** Connected wallet address, or `null`. */
  address: Address | null;
  /** Whether a wallet is connected. */
  isConnected: boolean;
  /** Current chain ID. */
  chainId: ChainId;
  /** All configured chains. */
  chains: readonly ChainConfig[];
  /** Connect a browser wallet via `eth_requestAccounts`. */
  connect: () => Promise<void>;
  /** Disconnect (clears stored address). */
  disconnect: () => void;
  /** Request a chain switch. */
  switchChain: (chainId: ChainId) => void;
}

/**
 * Reactive account state, chain state, and connection actions.
 *
 * Only re-renders when address or chain changes.
 *
 * @example
 * ```tsx
 * function WalletButton() {
 *   const { address, chainId, isConnected, connect, disconnect, switchChain } = useAccount();
 *   return isConnected
 *     ? <button onClick={disconnect}>{address?.slice(0,6)}… on chain {chainId}</button>
 *     : <button onClick={connect}>Connect Wallet</button>;
 * }
 * ```
 */
export function useAccount(): UseAccountReturn {
  const store = useContext(StoreContext);
  assertContext(store, "StoreContext");

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error(
        "[@talak-web3/hooks] useAccount.connect: window.ethereum is not available. " +
          "Make sure a wallet extension is installed.",
      );
    }
    const accounts = await window.ethereum.request<string[]>({
      method: "eth_requestAccounts",
    });
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts returned by wallet.");
    }
    store.setAddress(accounts[0] as Address);
  }, [store]);

  const disconnect = useCallback(() => store.setAddress(null), [store]);
  const switchChain = useCallback((id: ChainId) => store.switchChain(id), [store]);

  return {
    address: state.address,
    isConnected: state.address !== null,
    chainId: state.chainId,
    chains: state.chains,
    connect,
    disconnect,
    switchChain,
  };
}
