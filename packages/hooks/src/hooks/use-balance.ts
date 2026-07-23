import type { Address, ChainId, IRpc } from "@talak-web3/types";

import { useTalakWeb3, useAsyncCall } from "../shared/index.js";

export interface UseBalanceParams {
  /** Address to check. */
  address: Address;
  /** Chain ID (defaults to active chain). */
  chainId?: ChainId;
}

export interface UseBalanceReturn {
  /** Native balance in wei, or `null` while loading. */
  data: bigint | null;
  /** Whether the balance is being fetched. */
  isLoading: boolean;
  /** Error message, if any. */
  error: string | null;
  /** Refetch the balance. */
  refetch: () => void;
}

/**
 * Hook for fetching the native token balance of an address.
 *
 * Compatible with React 18+.
 *
 * @example
 * ```tsx
 * function Balance({ address }: { address: Address }) {
 *   const { data, isLoading } = useBalance({ address });
 *   if (isLoading) return <Skeleton />;
 *   return <div>{data ? formatEther(data) : "—"} ETH</div>;
 * }
 * ```
 */
export function useBalance({ address, chainId }: UseBalanceParams): UseBalanceReturn {
  const instance = useTalakWeb3();
  const rpc: IRpc = instance.context.rpc;
  const activeChainId = instance.config.chains[0]?.id ?? 1;
  const resolvedChainId = chainId ?? activeChainId;

  return useAsyncCall(
    async (_signal) => {
      const hex = await rpc.request<string>(resolvedChainId, "eth_getBalance", [address, "latest"]);
      return BigInt(hex);
    },
    [rpc, resolvedChainId, address],
  );
}
