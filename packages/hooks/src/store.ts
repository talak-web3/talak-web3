import type { TalakWeb3Instance, Address, IRpc } from "@talak-web3/types";

/** Shape of one configured chain. */
export interface ChainConfig {
  readonly id: number;
  readonly name: string;
  readonly rpcUrls: readonly string[];
  readonly nativeCurrency: {
    readonly name: string;
    readonly symbol: string;
    readonly decimals: number;
  };
  readonly testnet: boolean;
  readonly blockExplorers?: ReadonlyArray<{ readonly name: string; readonly url: string }>;
}

/** Snapshot of reactive state consumed by hooks via `useSyncExternalStore`. */
export interface TalakWeb3State {
  chainId: number;
  chains: readonly ChainConfig[];
  address: Address | null;
  /** Stable reference — the RPC instance never changes identity for a given SDK instance. */
  rpc: IRpc;
}

/** Reactive store wrapping a `TalakWeb3Instance`. */
export class TalakWeb3Store {
  private state: TalakWeb3State;
  private readonly listeners = new Set<() => void>();
  readonly instance: TalakWeb3Instance;

  constructor(instance: TalakWeb3Instance) {
    this.instance = instance;
    const firstChain = instance.config.chains[0];

    this.state = {
      chainId: firstChain?.id ?? 1,
      chains: instance.config.chains,
      address: null,
      rpc: instance.context.rpc,
    };

    instance.hooks.on("chain-changed", (data: unknown) => {
      this.state = { ...this.state, chainId: data as number };
      this.notify();
    });

    instance.hooks.on("account-changed", (data: unknown) => {
      this.state = { ...this.state, address: data as Address | null };
      this.notify();
    });
  }

  getSnapshot = (): TalakWeb3State => this.state;

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  /** Set the connected wallet address. */
  setAddress(addr: Address | null): void {
    this.instance.hooks.emit("account-changed", addr);
  }

  /** Request a chain switch. */
  switchChain(chainId: number): void {
    this.instance.hooks.emit("chain-switch", chainId);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}
