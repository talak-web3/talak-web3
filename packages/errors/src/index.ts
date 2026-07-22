import type { INTERNAL_ERROR_CODES as _INTERNAL } from "./codes/internal.js";
import type {
  AUTH_ERROR_CODES as _AUTH,
  RPC_ERROR_CODES as _RPC,
  CONFIG_ERROR_CODES as _CONFIG,
  SECURITY_ERROR_CODES as _SEC,
  PLUGIN_ERROR_CODES as _PLUGIN,
  STORAGE_ERROR_CODES as _STORAGE,
  TABLELAND_ERROR_CODES as _TABLE,
  CERAMIC_ERROR_CODES as _CERAMIC,
  AI_ERROR_CODES as _AI,
  CRYPTO_ERROR_CODES as _CRYPTO,
  REALTIME_ERROR_CODES as _REALTIME,
  TX_ERROR_CODES as _TX,
  AA_ERROR_CODES as _AA,
  CIRCUIT_ERROR_CODES as _CIRCUIT,
} from "./codes/public.js";

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
} from "./codes/public.js";

/** Union of all known TalakWeb3 error codes. Use with `satisfies` for compile-time exhaustiveness checks on caught errors. */
export type ErrorCode =
  | (typeof _AUTH)[keyof typeof _AUTH]
  | (typeof _RPC)[keyof typeof _RPC]
  | (typeof _CONFIG)[keyof typeof _CONFIG]
  | (typeof _SEC)[keyof typeof _SEC]
  | (typeof _PLUGIN)[keyof typeof _PLUGIN]
  | (typeof _STORAGE)[keyof typeof _STORAGE]
  | (typeof _TABLE)[keyof typeof _TABLE]
  | (typeof _CERAMIC)[keyof typeof _CERAMIC]
  | (typeof _AI)[keyof typeof _AI]
  | (typeof _CRYPTO)[keyof typeof _CRYPTO]
  | (typeof _REALTIME)[keyof typeof _REALTIME]
  | (typeof _TX)[keyof typeof _TX]
  | (typeof _AA)[keyof typeof _AA]
  | (typeof _CIRCUIT)[keyof typeof _CIRCUIT]
  | (typeof _INTERNAL)[keyof typeof _INTERNAL]
  // app-level codes (hono-backend)
  | "ACCESS_DENIED"
  | "AUTH_INSECURE_TRANSPORT"
  | "AUTH_INVALID_TOKEN"
  | "AUTH_REQUIRED"
  | "AUTH_VALIDATION_ERROR"
  | "CSRF_INVALID"
  | "CSRF_ORIGIN_MISMATCH"
  | "ENV_DB_ISOLATION_REQUIRED"
  | "ENV_JWT_KEY_INVALID"
  | "ENV_JWT_KEY_TOO_WEAK"
  | "ENV_KEY_ISOLATION_VIOLATION"
  | "ENV_MISSING_REQUIRED"
  | "ENV_REDIS_URL_INVALID"
  | "ENV_VALIDATION_FAILED"
  | "INCIDENT_NOT_FOUND"
  | "INFRA_UNAVAILABLE"
  | "KEY_ISOLATION_VIOLATION"
  | "QUEUE_TIMEOUT"
  | "RATE_LIMIT"
  | "REDIS_AUTH_MISSING"
  | "REDIS_HARDENING_FAILED"
  | "REDIS_INVALID_DB"
  | "REVOCATION_STRATEGY_NOT_FOUND";

export { INTERNAL_ERROR_CODES } from "./codes/internal.js";

/**
 * Base error for all TalakWeb3 SDK errors. Includes a typed error code,
 * HTTP status, and optional structured data.
 *
 * @example
 * ```ts
 * catch (err) {
 *   if (err instanceof TalakWeb3Error) {
 *     console.log(err.code, err.status);
 *   }
 * }
 * ```
 */
export class TalakWeb3Error extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly data?: unknown;
  override readonly cause?: unknown;

  constructor(
    message: string,
    opts: { code: ErrorCode; status?: number; cause?: unknown; data?: unknown },
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
    super(message, { code: "AUTH" as ErrorCode, status: 401 });
    this.name = "AuthError";
  }
}

export class RpcError extends TalakWeb3Error {
  readonly provider?: string | undefined;
  readonly chainId?: number | undefined;
  constructor(
    message: string,
    opts: {
      provider?: string | undefined;
      chainId?: number | undefined;
      code: ErrorCode;
      status?: number;
      cause?: unknown;
      data?: unknown;
    },
  ) {
    super(message, opts);
    this.name = "RpcError";
    this.provider = opts.provider;
    this.chainId = opts.chainId;
  }
}
