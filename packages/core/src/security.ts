import { TalakWeb3Error, SECURITY_ERROR_CODES } from "@talak-web3/errors";
import type { TalakWeb3Context, MiddlewareHandler } from "@talak-web3/types";

export class SecurityInvariant {
  static validateOrigin(ctx: TalakWeb3Context): void {
    const allowed = ctx.config.allowedOrigins;
    if (typeof window !== "undefined" && allowed && allowed.length > 0) {
      const origin = window.location.origin;
      if (!allowed.includes(origin)) {
        throw new TalakWeb3Error(`Unauthorized origin: ${origin}`, {
          code: SECURITY_ERROR_CODES.UNAUTHORIZED_ORIGIN,
          status: 403,
        });
      }
    }
  }

  static checkSecrets(config: unknown): void {
    if (typeof config !== "object" || config === null) return;

    const values: string[] = [];
    const seen = new WeakSet();

    function collectValues(obj: unknown, depth = 0): void {
      if (depth > 8) return;
      if (obj === null || obj === undefined) return;
      if (typeof obj === "string") {
        values.push(obj);
        return;
      }
      if (typeof obj === "number" || typeof obj === "boolean") return;
      if (typeof obj === "function") return;
      if (typeof obj !== "object") return;
      if (seen.has(obj as object)) return;
      seen.add(obj as object);
      if (Array.isArray(obj)) {
        for (const item of obj) collectValues(item, depth + 1);
        return;
      }
      for (const val of Object.values(obj as Record<string, unknown>)) {
        collectValues(val, depth + 1);
      }
    }

    collectValues(config);

    for (const val of values) {
      if (/0x[0-9a-fA-F]{64}/.test(val)) {
        throw new TalakWeb3Error("Potential private key leak detected in config (hex)", {
          code: SECURITY_ERROR_CODES.SECRET_LEAK,
          status: 400,
        });
      }
      if (/-----BEGIN (RSA |EC )?PRIVATE KEY-----/.test(val)) {
        throw new TalakWeb3Error("Potential private key leak detected in config (PEM)", {
          code: SECURITY_ERROR_CODES.SECRET_LEAK,
          status: 400,
        });
      }
      if (/(?:^|[^0-9a-fA-F])([0-9a-fA-F]{64})(?:[^0-9a-fA-F]|$)/.test(val)) {
        throw new TalakWeb3Error("Potential secret leak detected in config (raw hex)", {
          code: SECURITY_ERROR_CODES.SECRET_LEAK,
          status: 400,
        });
      }
      if (/(?:^|[\s":])([A-Za-z0-9+/]{43}=)(?:[\s",}]|$)/.test(val)) {
        throw new TalakWeb3Error("Potential secret leak detected in config (base64)", {
          code: SECURITY_ERROR_CODES.SECRET_LEAK,
          status: 400,
        });
      }
    }
  }

  static validateRpcParams(params: unknown[]): void {
    function hasDangerousKeys(obj: unknown, depth = 0): boolean {
      if (depth > 10) return false;
      if (obj === null || typeof obj !== "object") return false;
      if (Array.isArray(obj)) {
        return obj.some((item) => hasDangerousKeys(item, depth + 1));
      }
      for (const key of Object.keys(obj as Record<string, unknown>)) {
        if (key === "__proto__" || key === "constructor" || key === "prototype") {
          return true;
        }
        if (hasDangerousKeys((obj as Record<string, unknown>)[key], depth + 1)) {
          return true;
        }
      }
      return false;
    }

    if (hasDangerousKeys(params)) {
      throw new TalakWeb3Error("Disallowed parameter key detected", {
        code: SECURITY_ERROR_CODES.INVALID_PARAM,
        status: 400,
      });
    }
  }
}

export const securityMiddleware: MiddlewareHandler = async (req, next, ctx) => {
  SecurityInvariant.validateOrigin(ctx);
  return next();
};
