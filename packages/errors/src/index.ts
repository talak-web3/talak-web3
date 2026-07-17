export {
  AUTH_ERROR_CODES,
  RPC_ERROR_CODES,
  CONFIG_ERROR_CODES,
  SECURITY_ERROR_CODES,
  PLUGIN_ERROR_CODES,
  STORAGE_ERROR_CODES,
  TABLELAND_ERROR_CODES,
  CERAMIC_ERROR_CODES,
  AI_ERROR_CODES,
  CRYPTO_ERROR_CODES,
  REALTIME_ERROR_CODES,
  TX_ERROR_CODES,
  AA_ERROR_CODES,
  CIRCUIT_ERROR_CODES,
} from "./codes.js";

/** @internal Only for use by @talak-web3/core — not part of public API */
export { INTERNAL_ERROR_CODES } from "./codes/internal.js";

export class TalakWeb3Error extends Error {
  readonly code: string;
  readonly status: number;
  readonly data?: unknown;
  override readonly cause?: unknown;

  constructor(
    message: string,
    opts: { code: string; status?: number; cause?: unknown; data?: unknown },
  ) {
    super(message, { cause: opts.cause });
    this.name = "TalakWeb3Error";
    this.code = opts.code;
    this.status = opts.status ?? 500;
    this.cause = opts.cause;
    this.data = opts.data;
  }
}

export class AuthError extends TalakWeb3Error {
  constructor(message = "Unauthorized") {
    super(message, { code: "AUTH", status: 401 });
    this.name = "AuthError";
  }
}
