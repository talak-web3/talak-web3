/**
 * talak-web3
 * (C) 2026 Better-Web3 Team
 */

// Core Factory
export { betterWeb3 } from '@talak-web3/core';

// Client & Session Manager
export { 
  BetterWeb3Client, 
  InMemoryTokenStorage, 
  CookieTokenStorage 
} from '@talak-web3/client';

// Presets & Configuration
export {
  MainnetPreset,
  PolygonPreset,
  ConfigManager
} from '@talak-web3/config';

// Stable Types
export type {
  BetterWeb3Instance,
  BetterWeb3Context,
  BetterWeb3Plugin,
  BetterWeb3BaseConfig,
} from '@talak-web3/types';

export { MultiChainRouter, estimateEip1559Fees } from './multichain.js';

export type {
  TokenStorage,
  NonceResponse,
  LoginResponse,
  RefreshResponse,
  VerifyResponse
} from '@talak-web3/client';
