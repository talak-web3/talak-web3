import type { Context, MiddlewareHandler } from "hono";

export interface MetricsClient {
  increment(name: string, tags?: Record<string, string>): void;
  timing(name: string, duration: number, tags?: Record<string, string>): void;
}

/**
 * Minimal console-based metrics client that can be extended with Prometheus.
 */
class ConsoleMetricsClient implements MetricsClient {
  increment(name: string, tags?: Record<string, string>): void {
    console.debug(`[metrics] increment ${name}`, tags);
  }
  timing(name: string, duration: number, tags?: Record<string, string>): void {
    console.debug(`[metrics] timing ${name} ${duration}ms`, tags);
  }
}

export const metrics = new ConsoleMetricsClient();

/**
 * Middleware to inject metrics client into context.
 */
export function metricsMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    c.set("metrics", metrics);
    await next();
  };
}

declare module "hono" {
  interface ContextVariableMap {
    metrics: MetricsClient;
  }
}
