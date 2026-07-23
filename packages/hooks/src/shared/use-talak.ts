import { useContext } from "react";

import { StoreContext, ClientContext } from "../context.js";
import { assertContext } from "./assert.js";

/**
 * Escape-hatch hook for advanced use cases.
 *
 * Returns the full SDK instance for direct access to plugins, middleware,
 * and anything not covered by the higher-level hooks.
 *
 * @example
 * ```tsx
 * function PluginList() {
 *   const instance = useTalakWeb3();
 *   return (
 *     <ul>
 *       {Array.from(instance.context.plugins.values()).map(p => (
 *         <li key={p.name}>{p.name} v{p.version}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useTalakWeb3() {
  const store = useContext(StoreContext);
  assertContext(store, "StoreContext");

  return store.instance;
}

/**
 * Returns the optional HTTP client (used internally by SIWE).
 */
export function useClient() {
  const client = useContext(ClientContext);
  return client;
}
