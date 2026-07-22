export { talakWeb3, createAuthHandler, type AuthHandlerOptions } from "@talak-web3/core";

export { TalakWeb3Client, InMemoryTokenStorage, CookieTokenStorage } from "@talak-web3/client";

export { MainnetPreset, PolygonPreset, ConfigManager } from "@talak-web3/config";

export type {
  TalakWeb3Instance,
  TalakWeb3Context,
  TalakWeb3Plugin,
  TalakWeb3BaseConfig,
  PresetName,
  TalakWeb3Input,
  ChainId,
  UnixMs,
  Hex,
  Address,
  IRpc,
  RpcCache,
  RpcEndpoint,
  RpcOptions,
  IHookRegistry,
  IMiddlewareChain,
  MiddlewareHandler,
  TalakWeb3EventsMap,
  Logger,
  NonceStore,
  RefreshStore,
  RefreshSession,
  RevocationStore,
  SessionPayload,
  JwksResponse,
  JsonWebKey,
  TalakWeb3Middleware,
  TalakWeb3Auth,
} from "@talak-web3/types";

export { MultiChainRouter, estimateEip1559Fees } from "./multichain.js";

export type {
  TokenStorage,
  NonceResponse,
  LoginResponse,
  RefreshResponse,
  VerifyResponse,
  TalakWeb3ClientOptions,
  ChainInfo,
} from "@talak-web3/client";
