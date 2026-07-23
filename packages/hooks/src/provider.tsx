import type { TalakWeb3Client } from "@talak-web3/client";
import type { TalakWeb3Instance } from "@talak-web3/types";
import { useMemo, type ReactNode } from "react";

import { StoreContext, ClientContext } from "./context.js";
import { TalakWeb3Store } from "./store.js";

export interface TalakWeb3ProviderProps {
  /** Initialized TalakWeb3 SDK instance. */
  instance: TalakWeb3Instance;
  /** Optional browser HTTP client (required for SIWE flows). */
  client?: TalakWeb3Client;
  children: ReactNode;
}

/**
 * Root provider for all talak-web3 React hooks.
 *
 * Wraps the SDK instance in a single reactive store and provides it
 * via context. Hooks use `useSyncExternalStore` under the hood for
 * tear-free React 18+ concurrency.
 *
 * @example
 * ```tsx
 * <TalakWeb3Provider instance={instance} client={client}>
 *   <YourApp />
 * </TalakWeb3Provider>
 * ```
 */
export function TalakWeb3Provider({ instance, client, children }: TalakWeb3ProviderProps) {
  const store = useMemo(() => new TalakWeb3Store(instance), [instance]);

  return (
    <StoreContext value={store}>
      <ClientContext value={client ?? null}>{children}</ClientContext>
    </StoreContext>
  );
}
