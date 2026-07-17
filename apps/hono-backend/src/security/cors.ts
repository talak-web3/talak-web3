import type { Context, MiddlewareHandler } from "hono";

export type CorsPolicy = {
  allowedOrigins: readonly string[];
  allowedMethods?: readonly string[];
  allowedHeaders?: readonly string[];
  maxAgeSeconds?: number;
};

function validateOrigins(origins: readonly string[]): void {
  for (const origin of origins) {
    try {
      new URL(origin);
    } catch {
      console.error(`[CORS] Invalid origin format: "${origin}" — must be full URL like https://example.com`);
      process.exit(1);
    }
  }
}

function setCorsHeaders(c: Context, origin: string, policy: CorsPolicy): void {
  c.header("Access-Control-Allow-Origin", origin);
  c.header("Vary", "Origin");
  c.header(
    "Access-Control-Allow-Methods",
    (policy.allowedMethods ?? ["GET", "POST", "OPTIONS"]).join(", "),
  );
  c.header(
    "Access-Control-Allow-Headers",
    (
      policy.allowedHeaders ?? ["Content-Type", "Authorization", "X-Request-Id", "X-CSRF-Token"]
    ).join(", "),
  );
  c.header("Access-Control-Max-Age", String(policy.maxAgeSeconds ?? 600));

  c.header("Access-Control-Allow-Credentials", "true");
}

export function strictCors(policy: CorsPolicy): MiddlewareHandler {
  validateOrigins(policy.allowedOrigins);
  const allowed = new Set(policy.allowedOrigins);

  return async (c, next) => {
    const origin = c.req.header("origin");

    if (!origin) {
      await next();
      return;
    }

    if (!allowed.has(origin)) {
      return c.json({ error: "Origin not allowed" }, 403);
    }

    if (c.req.method === "OPTIONS") {
      setCorsHeaders(c, origin, policy);
      return c.body(null, 204);
    }

    setCorsHeaders(c, origin, policy);
    await next();
  };
}
