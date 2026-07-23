import type { TalakWeb3Client } from "@talak-web3/client";
import { createContext } from "react";

import type { TalakWeb3Store } from "./store.js";

export const StoreContext = createContext<TalakWeb3Store | null>(null);
StoreContext.displayName = "TalakWeb3.StoreContext";

/** Optional browser HTTP client, required by SIWE flows. */
export const ClientContext = createContext<TalakWeb3Client | null>(null);
ClientContext.displayName = "TalakWeb3.ClientContext";
