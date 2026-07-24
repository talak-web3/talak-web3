import { Hono } from "hono";

import { app as talakApp } from "./talak.config.js";

const app = new Hono();

const allowedOrigins = new Set(
  process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
);

app.use("*", async (c, next) => {
  const origin = c.req.header("origin");

  if (origin && !allowedOrigins.has(origin)) {
    return c.json({ error: "Origin not allowed" }, 403);
  }

  if (origin) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Vary", "Origin");
    c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token");
    c.header("Access-Control-Max-Age", "600");
    c.header("Access-Control-Allow-Credentials", "true");
  }

  if (c.req.method === "OPTIONS") {
    return c.body(null, 204);
  }

  await next();
});

app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

app.all("/api/auth/*", async (c) => talakApp.handler(c.req.raw));

app.get("/api/protected", async (c) => {
  const authHeader = c.req.header("authorization");
  if (!authHeader) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const session = await talakApp.context.auth.verifySession(token);

  return c.json({
    message: "Protected data",
    address: session.address,
  });
});

const port = parseInt(process.env.PORT || "3000");
console.log(`🚀 Server running at http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
