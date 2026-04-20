import { createHmac, timingSafeEqual } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import { TalakWeb3Error } from "@talak-web3/errors";

/**
 * Zero-Trust Internal Authentication
 * Implements request signing for service-to-service communication.
 */
export interface InternalAuthConfig {
  secret: string;
  headerName?: string;
  timestampHeader?: string;
  maxSkewSeconds?: number;
}

export class InternalAuth {
  private secret: string;
  private headerName: string;
  private timestampHeader: string;
  private maxSkewSeconds: number;

  constructor(config: InternalAuthConfig) {
    this.secret = config.secret;
    this.headerName = config.headerName ?? "X-Talak-Internal-Auth";
    this.timestampHeader = config.timestampHeader ?? "X-Talak-Timestamp";
    this.maxSkewSeconds = config.maxSkewSeconds ?? 30;
  }

  /**
   * Sign an outgoing request.
   * Returns headers to be added to the request.
   */
  async signRequest(method: string, path: string, body?: string): Promise<Record<string, string>> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payload = `${timestamp}:${method.toUpperCase()}:${path}:${body ?? ""}`;
    const signature = createHmac("sha256", this.secret).update(payload).digest("hex");

    return {
      [this.headerName]: signature,
      [this.timestampHeader]: timestamp,
    };
  }

  /**
   * Create Hono middleware to verify internal requests.
   */
  createMiddleware(): MiddlewareHandler {
    return async (c, next) => {
      const signature = c.req.header(this.headerName);
      const timestamp = c.req.header(this.timestampHeader);

      if (!signature || !timestamp) {
        throw new TalakWeb3Error("Missing internal authentication headers", {
          code: "INTERNAL_AUTH_MISSING",
          status: 401,
        });
      }

      // Check timestamp skew to prevent replay attacks
      const ts = parseInt(timestamp, 10);
      const now = Math.floor(Date.now() / 1000);
      if (isNaN(ts) || Math.abs(now - ts) > this.maxSkewSeconds) {
        throw new TalakWeb3Error("Internal authentication timestamp skew too large", {
          code: "INTERNAL_AUTH_TIMESTAMP_SKEW",
          status: 401,
        });
      }

      // Reconstruct payload and verify signature
      const method = c.req.method;
      const path = c.req.path;
      const body = await c.req.text().catch(() => "");
      const payload = `${timestamp}:${method.toUpperCase()}:${path}:${body}`;

      const expectedSignature = createHmac("sha256", this.secret).update(payload).digest("hex");

      const signatureBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);

      if (
        signatureBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(signatureBuffer, expectedBuffer)
      ) {
        throw new TalakWeb3Error("Invalid internal authentication signature", {
          code: "INTERNAL_AUTH_INVALID_SIGNATURE",
          status: 401,
        });
      }

      await next();
    };
  }
}
