import { TalakWeb3ConfigSchema, type TalakWeb3Config } from "./schema";

export const MainnetPreset: TalakWeb3Config = {
  plugins: [],
  rpc: { retries: 7, timeout: 10000 },
  debug: false,
  chains: [
    {
      id: 1,
      name: "Ethereum Mainnet",
      rpcUrls: ["https://cloudflare-eth.com"],
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      testnet: false,
    },
  ],
};

export const PolygonPreset: TalakWeb3Config = {
  plugins: [],
  rpc: { retries: 7, timeout: 10000 },
  debug: false,
  chains: [
    {
      id: 137,
      name: "Polygon Mainnet",
      rpcUrls: ["https://polygon-rpc.com"],
      nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
      testnet: false,
    },
  ],
};

export const ArbitrumPreset: TalakWeb3Config = {
  plugins: [],
  rpc: { retries: 7, timeout: 10000 },
  debug: false,
  chains: [
    {
      id: 42161,
      name: "Arbitrum One",
      rpcUrls: ["https://arb1.arbitrum.io/rpc"],
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      testnet: false,
    },
  ],
};

export const OptimismPreset: TalakWeb3Config = {
  plugins: [],
  rpc: { retries: 7, timeout: 10000 },
  debug: false,
  chains: [
    {
      id: 10,
      name: "Optimism",
      rpcUrls: ["https://mainnet.optimism.io"],
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      testnet: false,
    },
  ],
};

export const BasePreset: TalakWeb3Config = {
  plugins: [],
  rpc: { retries: 7, timeout: 10000 },
  debug: false,
  chains: [
    {
      id: 8453,
      name: "Base",
      rpcUrls: ["https://mainnet.base.org"],
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      testnet: false,
    },
  ],
};

export const AvalanchePreset: TalakWeb3Config = {
  plugins: [],
  rpc: { retries: 7, timeout: 10000 },
  debug: false,
  chains: [
    {
      id: 43114,
      name: "Avalanche C-Chain",
      rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
      nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
      testnet: false,
    },
  ],
};

const PRESETS: Record<string, TalakWeb3Config> = {
  mainnet: MainnetPreset,
  polygon: PolygonPreset,
  arbitrum: ArbitrumPreset,
  optimism: OptimismPreset,
  base: BasePreset,
  avalanche: AvalanchePreset,
};

export type PresetName = keyof typeof PRESETS;

export function resolvePreset(input: Record<string, unknown>): Record<string, unknown> {
  const presetName = input["preset"];
  if (!presetName || typeof presetName !== "string") return input;

  const preset = PRESETS[presetName];
  if (!preset) {
    throw new Error(`Unknown preset: "${presetName}"`);
  }

  const { preset: _, chains: userChainsRaw, ...rest } = input;

  // Merge chains by id: user chains override preset chains with same id,
  // user chains with new ids are appended
  const userChains = Array.isArray(userChainsRaw)
    ? (userChainsRaw as Record<string, unknown>[])
    : [];
  const presetChains = [...preset.chains] as Record<string, unknown>[];
  const mergedChains = [...presetChains];

  for (const uc of userChains) {
    const idx = mergedChains.findIndex((pc) => pc.id === uc.id);
    if (idx >= 0) {
      mergedChains[idx] = { ...mergedChains[idx], ...uc };
    } else {
      mergedChains.push(uc);
    }
  }

  return { ...preset, ...rest, chains: mergedChains };
}

export class ConfigManager {
  static validate(config: unknown) {
    return TalakWeb3ConfigSchema.parse(config);
  }

  static fromPreset(
    preset: "mainnet" | "polygon" | "arbitrum" | "optimism" | "base" | "avalanche",
  ) {
    const presets: Record<string, TalakWeb3Config> = {
      mainnet: MainnetPreset,
      polygon: PolygonPreset,
      arbitrum: ArbitrumPreset,
      optimism: OptimismPreset,
      base: BasePreset,
      avalanche: AvalanchePreset,
    };
    return this.validate(presets[preset]);
  }

  static merge(base: unknown, override: unknown) {
    return this.validate({
      ...(base as Record<string, unknown>),
      ...(override as Record<string, unknown>),
    });
  }

  static fromConfig(config: TalakWeb3Config): TalakWeb3Config {
    return this.validate(config);
  }
}
