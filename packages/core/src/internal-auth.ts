import { createHmac, timingSafeEqual } from "node:crypto";

import { TalakWeb3Error, INTERNAL_ERROR_CODES } from "@talak-web3/errors";
import type { MiddlewareHandler } from "hono";

export interface InternalAuthConfig {
  secret?: string;
  secrets?: Record<string, string>;
  currentKeyId?: string;
  headerName?: string;
  timestampHeader?: string;
  keyIdHeader?: string;
  maxSkewSeconds?: number;
}

export class InternalAuth {
  private secret: string;
  private secrets: Record<string, string>;
  private currentKeyId: string | undefined;
  private headerName: string;
  private timestampHeader: string;
  private keyIdHeader: string;
  private maxSkewSeconds: number;

  constructor(config: InternalAuthConfig) {
    this.secret = config.secret ?? "";
    this.secrets = config.secrets ?? {};
    this.currentKeyId = config.currentKeyId;
    this.headerName = config.headerName ?? "X-Talak-Internal-Auth";
    this.timestampHeader = config.timestampHeader ?? "X-Talak-Timestamp";
    this.keyIdHeader = config.keyIdHeader ?? "X-Talak-Key-Id";
    this.maxSkewSeconds = config.maxSkewSeconds ?? 30;

    const hasNamedSecret = Object.values(this.secrets).some(
      (s) => typeof s === "string" && s.length > 0,
    );
    if (!this.secret && !hasNamedSecret) {
      throw new TalakWeb3Error(
        "InternalAuth requires a non-empty secret or secrets map — empty HMAC key is forbidden",
        { code: INTERNAL_ERROR_CODES.AUTH_MISSING, status: 500 },
      );
    }
  }

  private resolveSecret(keyId?: string): string {
    if (keyId && this.secrets[keyId]) {
      return this.secrets[keyId];
    }
    if (this.currentKeyId) {
      const secret = this.secrets[this.currentKeyId];
      if (secret) return secret;
    }
    return this.secret;
  }

  async signRequest(method: string, path: string, body?: string): Promise<Record<string, string>> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payload = `${timestamp}:${method.toUpperCase()}:${path}:${body ?? ""}`;
    const secretToUse = this.resolveSecret(this.currentKeyId);
    const signature = createHmac("sha256", secretToUse).update(payload).digest("hex");

    const headers: Record<string, string> = {
      [this.headerName]: signature,
      [this.timestampHeader]: timestamp,
    };

    if (this.currentKeyId) {
      headers[this.keyIdHeader] = this.currentKeyId;
    }

    return headers;
  }

  createMiddleware(): MiddlewareHandler {
    return async (c, next) => {
      const signature = c.req.header(this.headerName);
      const timestamp = c.req.header(this.timestampHeader);

      if (!signature || !timestamp) {
        throw new TalakWeb3Error("Missing internal authentication headers", {
          code: INTERNAL_ERROR_CODES.AUTH_MISSING,
          status: 401,
        });
      }

      const ts = parseInt(timestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      if (isNaN(ts) || Math.abs(now - ts) > this.maxSkewSeconds) {
        throw new TalakWeb3Error("Internal authentication timestamp skew too large", {
          code: INTERNAL_ERROR_CODES.AUTH_TIMESTAMP_SKEW,
          status: 401,
        });
      }

      const keyId = c.req.header(this.keyIdHeader);
      const method = c.req.method;
      const path = c.req.path;
      const body = await c.req.text().catch(() => "");
      const payload = `${timestamp}:${method.toUpperCase()}:${path}:${body}`;

      const secretToUse = this.resolveSecret(keyId ?? undefined);
      const expectedSignature = createHmac("sha256", secretToUse).update(payload).digest("hex");

      const signatureBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);

      if (
        signatureBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(signatureBuffer, expectedBuffer)
      ) {
        throw new TalakWeb3Error("Invalid internal authentication signature", {
          code: INTERNAL_ERROR_CODES.AUTH_INVALID_SIGNATURE,
          status: 401,
        });
      }

      await next();
    };
  }
}
