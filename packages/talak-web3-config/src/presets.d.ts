export declare const MainnetPreset: {
  chains: {
    id: number;
    name: string;
    rpcUrls: string[];
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
  }[];
};
export declare const PolygonPreset: {
  chains: {
    id: number;
    name: string;
    rpcUrls: string[];
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
  }[];
};
export declare class ConfigManager {
  static validate(config: unknown): {
    chains: {
      id: number;
      name: string;
      rpcUrls: string[];
      nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
      };
      testnet: boolean;
      blockExplorers?:
        | {
            name: string;
            url: string;
          }[]
        | undefined;
    }[];
    plugins: any[];
    rpc: {
      retries: number;
      timeout: number;
    };
    debug: boolean;
    auth?:
      | {
          version: string;
          domain?: string | undefined;
          uri?: string | undefined;
        }
      | undefined;
    allowedOrigins?: string[] | undefined;
    ai?:
      | {
          apiKey: string;
          baseUrl?: string | undefined;
          model?: string | undefined;
        }
      | undefined;
    ceramic?:
      | {
          nodeUrl: string;
          seed?: string | undefined;
        }
      | undefined;
    tableland?:
      | {
          privateKey?: string | undefined;
          network?: string | undefined;
        }
      | undefined;
  };
  static fromPreset(preset: "mainnet" | "polygon"): {
    chains: {
      id: number;
      name: string;
      rpcUrls: string[];
      nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
      };
      testnet: boolean;
      blockExplorers?:
        | {
            name: string;
            url: string;
          }[]
        | undefined;
    }[];
    plugins: any[];
    rpc: {
      retries: number;
      timeout: number;
    };
    debug: boolean;
    auth?:
      | {
          version: string;
          domain?: string | undefined;
          uri?: string | undefined;
        }
      | undefined;
    allowedOrigins?: string[] | undefined;
    ai?:
      | {
          apiKey: string;
          baseUrl?: string | undefined;
          model?: string | undefined;
        }
      | undefined;
    ceramic?:
      | {
          nodeUrl: string;
          seed?: string | undefined;
        }
      | undefined;
    tableland?:
      | {
          privateKey?: string | undefined;
          network?: string | undefined;
        }
      | undefined;
  };
  static merge(
    base: any,
    override: any,
  ): {
    chains: {
      id: number;
      name: string;
      rpcUrls: string[];
      nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
      };
      testnet: boolean;
      blockExplorers?:
        | {
            name: string;
            url: string;
          }[]
        | undefined;
    }[];
    plugins: any[];
    rpc: {
      retries: number;
      timeout: number;
    };
    debug: boolean;
    auth?:
      | {
          version: string;
          domain?: string | undefined;
          uri?: string | undefined;
        }
      | undefined;
    allowedOrigins?: string[] | undefined;
    ai?:
      | {
          apiKey: string;
          baseUrl?: string | undefined;
          model?: string | undefined;
        }
      | undefined;
    ceramic?:
      | {
          nodeUrl: string;
          seed?: string | undefined;
        }
      | undefined;
    tableland?:
      | {
          privateKey?: string | undefined;
          network?: string | undefined;
        }
      | undefined;
  };
}
