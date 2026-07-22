import { UnifiedRpc } from "@talak-web3/rpc";
import type {
  TalakWeb3BaseConfig,
  TalakWeb3Context,
  IRpc,
  RpcEndpoint,
  RpcOptions,
} from "@talak-web3/types";

export type ChainRef = {
  id: number;
  name: string;
  rpcUrls: readonly string[];
};

export type MultiChainRequest = {
  chainId: number;
  method: string;
  params?: unknown[];
  options?: RpcOptions;
};

export class MultiChainRouter {
  private readonly ctx: TalakWeb3Context;
  private readonly config: TalakWeb3BaseConfig;
  private readonly rpcByChainId = new Map<number, IRpc>();

  constructor(ctx: TalakWeb3Context, config: TalakWeb3BaseConfig) {
    this.ctx = ctx;
    this.config = config;
  }

  listChains(): ChainRef[] {
    return this.config.chains.map((c) => ({ id: c.id, name: c.name, rpcUrls: c.rpcUrls }));
  }

  getRpc(chainId: number): IRpc {
    const existing = this.rpcByChainId.get(chainId);
    if (existing) return existing;

    const chain = this.config.chains.find((c) => c.id === chainId);
    if (!chain) throw new Error(`Unknown chainId: ${chainId}`);

    const endpoints = chain.rpcUrls.map((url: string, priority: number) => ({
      url,
      chainId: chain.id,
      priority,
      weight: 1,
    }));
    const endpointsByChain = new Map<number, RpcEndpoint[]>([[chain.id, endpoints]]);
    const rpc = new UnifiedRpc(this.ctx, endpointsByChain);
    this.rpcByChainId.set(chainId, rpc);
    return rpc;
  }

  async request<T = unknown>(req: MultiChainRequest): Promise<T> {
    const { chainId, method, params = [], options = {} } = req;
    return this.getRpc(chainId).request<T>(chainId, method, params, options);
  }
}

export type Eip1559Fees = {
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
};

/**
 * Estimate EIP-1559 fees for a transaction.
 *
 * Tries to fetch `eth_maxPriorityFeePerGas` dynamically first.
 * Falls back to the provided `priorityFee` (default 1.5 Gwei) when the RPC
 * method is not supported or an error occurs.
 *
 * @param rpc   - RPC instance bound to the target chain.
 * @param chainId - Chain ID to query (passed through to every RPC call).
 * @param opts  - Optional overrides.
 * @param opts.priorityFee - Priority fee in wei (default: 1_500_000_000 = 1.5 Gwei).
 */
export async function estimateEip1559Fees(
  rpc: IRpc,
  chainId: number,
  opts?: { priorityFee?: bigint },
): Promise<Eip1559Fees> {
  const defaultPriority = 1_500_000_000n;
  const configuredPriority = opts?.priorityFee;

  let priority: bigint;
  if (configuredPriority !== undefined) {
    priority = configuredPriority;
  } else {
    try {
      const priorityHex = await rpc.request<string>(chainId, "eth_maxPriorityFeePerGas");
      priority = BigInt(priorityHex);
    } catch {
      priority = defaultPriority;
    }
  }

  const baseFeeHex = await rpc.request<string>(chainId, "eth_gasPrice");
  const baseFee = BigInt(baseFeeHex);
  const maxFee = baseFee * 2n + priority;
  return { maxFeePerGas: maxFee, maxPriorityFeePerGas: priority };
}
