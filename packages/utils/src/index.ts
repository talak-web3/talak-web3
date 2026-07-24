import type { Hex } from "@talak-web3/types";

const warned = new Set<string>();

/** Logs a deprecation warning once per unique message. */
export function deprecated(message: string, alternative?: string): void {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(
    `[talak-web3] DEPRECATED: ${message}${alternative ? ` — Use ${alternative} instead` : ""}`,
  );
}

/** Exhaustiveness check — ensures all cases of a discriminated union are handled. */
export function assertUnreachable(x: never): never {
  throw new Error(`Unreachable: ${String(x)}`);
}

/** Validates that a string is a hex-encoded value prefixed with `0x`. */
export function isHex(value: string): value is Hex {
  return /^0x[0-9a-fA-F]*$/.test(value);
}

/** Validates that a string is a 40-character hex Ethereum address. */
export function validateAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/** Validates that a string is a 64-character hex hash (32 bytes). */
export function isValidHash(hash: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(hash);
}

/** Returns a truncated representation of an Ethereum address (e.g. `0x1234...abcd`). */
export function shortenAddress(address: string, chars = 4): string {
  if (!validateAddress(address)) {
    throw new Error(`Invalid address: ${address}`);
  }
  return `${address.substring(0, chars + 2)}...${address.substring(42 - chars)}`;
}

/** Returns the current timestamp in milliseconds. */
export function nowMs(): number {
  return Date.now();
}

export * from "./migration";
