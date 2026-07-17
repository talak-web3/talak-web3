# @talak-web3/config

Configuration validation and presets for talak-web3 applications.

## Installation

```bash
npm install @talak-web3/config
pnpm add @talak-web3/config`
```

## Usage

```typescript
import { validateConfig, TalakWeb3ConfigSchema, ConfigManager } from "@talak-web3/config";

// Validate at runtime with Zod
const config = validateConfig({
  chains: [{ id: 1, name: "Ethereum", rpcUrls: ["https://rpc.example.com"], nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 } }],
  rpc: { retries: 7, timeout: 10000 },
});

// Use presets
import { MainnetPreset, PolygonPreset } from "@talak-web3/config";
const merged = ConfigManager.merge(MainnetPreset, { auth: { domain: "myapp.com" } });
```

## Exports

| Export | Description |
|--------|-------------|
| `TalakWeb3ConfigSchema` | Zod schema for config validation |
| `ChainSchema` | Zod schema for chain definitions |
| `PluginSchema` | Zod schema for plugin objects |
| `validateConfig(input)` | Validate and return typed config |
| `ConfigManager` | Static merge/validate utility |
| `MainnetPreset` | Default mainnet chain config |
| `PolygonPreset` | Polygon PoS chain config |

## License

MIT
