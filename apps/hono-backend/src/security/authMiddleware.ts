import type { MiddlewareHandler } from "hono";
import { TalakWeb3Error } from "@talak-web3/errors";
import type { TalakWeb3Auth } from "@talak-web3/auth";

/**
 * Production-grade Authentication Middleware.
 * Strictly verifies JWT session using RS256 and checks against revocation list.
 */
export function authMiddleware(auth: TalakWeb3Auth): MiddlewareHandler {
  return async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new TalakWeb3Error("Missing or invalid Authorization header", {
        code: "AUTH_REQUIRED",
        status: 401,
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new TalakWeb3Error("Invalid token format", {
        code: "AUTH_INVALID_TOKEN",
        status: 401,
      });
    }

    try {
      // verifySession handles RS256 signature, expiration, and revocation check
      const session = await auth.verifySession(token);

      // Inject session into Hono context
      c.set("session", session);

      await next();
    } catch (error) {
      if (error instanceof TalakWeb3Error) {
        throw error;
      }

      throw new TalakWeb3Error("Session validation failed", {
        code: "AUTH_VALIDATION_ERROR",
        status: 401,
        cause: error,
      });
    }
  };
}
