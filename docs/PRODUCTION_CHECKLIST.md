# Production checklist

Use this before shipping a deployment that uses `@talak-web3/*` auth.

## Environment

- [ ] `NODE_ENV=production`
- [ ] `JWT_PRIVATE_KEY` — PKCS#8 RSA PEM, ≥2048 bits (not `JWT_SECRET`)
- [ ] `JWT_PUBLIC_KEY` — matching SPKI PEM
- [ ] `JWT_PRIMARY_KID` set if you rotate keys
- [ ] `REDIS_URL` (`redis://` or `rediss://`)
- [ ] `SIWE_DOMAIN` matches browser hostname used in SIWE messages
- [ ] `ALLOWED_ORIGINS` / CORS allowlist configured for browser apps
- [ ] `TRUST_PROXY=true` **only** if behind a trusted reverse proxy
- [ ] `REQUIRE_REDIS_RATE_LIMIT=true` (recommended multi-instance)

## Application config

- [ ] `nonceStore` / `refreshStore` / `revocationStore` are Redis (or other durable) — **not** InMemory
- [ ] `createAuthHandler(..., { redis })` or explicit Redis `rateLimiters` for multi-instance
- [ ] Session cookies remain HttpOnly (server `Set-Cookie`); do not use client `CookieTokenStorage` with `allowInsecureCookies` for real sessions
- [ ] CSRF enabled for browser mutating routes (see hono-backend reference)
- [ ] Integrity hashes set if you enforce dependency integrity (`JOSE_INTEGRITY_HASH`, etc.)

## Operations

- [ ] Redis AOF / replication / `noeviction` per [REDIS_DEPLOYMENT_RUNBOOK.md](./REDIS_DEPLOYMENT_RUNBOOK.md)
- [ ] Health checks and metrics (auth failures, 429s, Redis errors)
- [ ] Key rotation / emergency purge runbook understood ([SECURITY_ARCHITECTURE.md](./SECURITY_ARCHITECTURE.md))
- [ ] `pnpm audit` reviewed for **runtime** packages; residual risk documented if any
- [ ] Backups / incident contacts for Redis and signing keys

## Verify

```bash
pnpm build
pnpm typecheck
pnpm test:unit
pnpm audit
```

When all boxes are checked, re-run the project audit agent for a formal GO under `AUDIT_STRICT`.
