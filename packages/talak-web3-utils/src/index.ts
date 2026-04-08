import type { Hex } from "@talak-web3/types";

export function assertUnreachable(x: never): never {
  throw new Error(`Unreachable: ${String(x)}`);
}

export function isHex(value: string): value is Hex {
  return /^0x[0-9a-fA-F]*$/.test(value);
}

export function nowMs(): number {
  return Date.now();
}

export * from './migration';

