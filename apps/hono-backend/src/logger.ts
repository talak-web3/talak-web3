import pino from "pino";
import type { Context, MiddlewareHandler } from "hono";

// Base logger instance
const baseLogger = pino({
  level: process.env["LOG_LEVEL"] ?? "info",
});

/**
 * Structural logger interface as defined in talak-web3-types
 */
export interface Logger {
  info(message: string, ...args: unknown[]): void;
  info(obj: object, message?: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  warn(obj: object, message?: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  error(obj: object, message?: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  debug(obj: object, message?: string, ...args: unknown[]): void;
  child(bindings: Record<string, unknown>): Logger;
}

// Wrapper to ensure exact compat, though Pino already satisfies it mostly
export const logger: Logger = baseLogger;

/**
 * Middleware that:
 * 1. Extracts or generates a unique x-request-id
 * 2. Injects a child logger bound to that requestId into the Hono Context
 * 3. Logs the request lifecycle (start and end)
 */
export function requestLogger(): MiddlewareHandler {
  return async (c: Context, next) => {
    const reqId = c.req.header("x-request-id") ?? crypto.randomUUID();
    c.set("requestId", reqId);
    c.header("x-request-id", reqId);

    // Bind child logger to context
    const childLogger = baseLogger.child({ reqId });
    c.set("logger", childLogger);

    const start = Date.now();
    try {
      await next();
    } finally {
      // Intentionally omitting full req body to prevent PII leaks
      childLogger.info(
        {
          method: c.req.method,
          path: c.req.path,
          status: c.res.status,
          ms: Date.now() - start,
        },
        "request",
      );
    }
  };
}

/**
 * Helper to pull the context-aware logger from Hono Context,
 * falling back to the global logger.
 */
export function getLogger(c?: Context): Logger {
  if (c) {
    const ctxLogger = c.get("logger");
    if (ctxLogger) return ctxLogger as Logger;
  }
  return logger;
}
