export { talakWeb3, createAuthHandler, type AuthHandlerOptions } from "@talak-web3/core";

export { TalakWeb3Client, InMemoryTokenStorage, CookieTokenStorage } from "@talak-web3/client";

export { MainnetPreset, PolygonPreset, ConfigManager } from "@talak-web3/config";

export type {
  TalakWeb3Instance,
  TalakWeb3Context,
  TalakWeb3Plugin,
  TalakWeb3BaseConfig,
} from "@talak-web3/types";

export { MultiChainRouter, estimateEip1559Fees } from "./multichain.js";

export type {
  TokenStorage,
  NonceResponse,
  LoginResponse,
  RefreshResponse,
  VerifyResponse,
} from "@talak-web3/client";
