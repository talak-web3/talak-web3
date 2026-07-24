# Deployment Guide

This guide covers deploying `talak-web3` in a production environment.

## Production requirements

For a secure, horizontally scalable deployment, the following are **mandatory**:

- **Redis** — atomic nonce consumption, refresh rotation, revocation, and (recommended) distributed rate limits
- **RS256 JWT keys** — `JWT_PRIVATE_KEY` (PKCS#8 PEM) and `JWT_PUBLIC_KEY` (SPKI PEM), RSA ≥2048 bits
- **HTTPS** — protect cookies, tokens, and CSRF headers
- **Stable SIWE domain** — `SIWE_DOMAIN` / `expectedDomain` must match the browser origin host

In-memory auth stores are **rejected** when `NODE_ENV=production`.

## Setup steps

### 1. Provision infrastructure

- Node.js 18+
- Redis 7+ (AOF enabled; see [REDIS_DEPLOYMENT_RUNBOOK.md](./REDIS_DEPLOYMENT_RUNBOOK.md))

### 2. Configure environment

```env
NODE_ENV=production
REDIS_URL=redis://your-production-redis:6379
# or rediss:// for TLS

JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
JWT_PRIMARY_KID=v1

SIWE_DOMAIN=your-app-domain.com
ALLOWED_ORIGINS=https://your-app-domain.com

# Only behind a trusted reverse proxy
TRUST_PROXY=true

# Optional: fail closed if auth rate limiters are not Redis-backed
REQUIRE_REDIS_RATE_LIMIT=true
```

**Do not use `JWT_SECRET` or HS256 shared secrets.** Runtime signing is RS256 via `jose`.

### 3. Configure Redis-backed stores

```typescript
import Redis from "ioredis";
import { talakWeb3 } from "talak-web3";
import { RedisNonceStore, RedisRefreshStore, RedisRevocationStore } from "@talak-web3/auth/stores";
import { createAuthHandler } from "@talak-web3/core";

const redis = new Redis(process.env.REDIS_URL!);

const app = talakWeb3({
  auth: {
    domain: process.env.SIWE_DOMAIN!,
    nonceStore: new RedisNonceStore({ redis }),
    refreshStore: new RedisRefreshStore({ redis }),
    revocationStore: new RedisRevocationStore({ redis }),
  },
  chains: [
    /* … */
  ],
});

await app.init();

const handler = createAuthHandler(app, {
  trustProxy: true,
  redis, // distributed auth rate limits
  requireRedisRateLimit: true,
});
```

### 4. Build and launch

```bash
pnpm install
pnpm build
pnpm --filter hono-backend start
```

## Horizontal scaling

`talak-web3` is **stateless at the app layer** when Redis is used:

- All instances share the same Redis for nonces, refresh, revocation, and rate limits
- Sticky sessions are not required
- Keep `SIWE_DOMAIN` / `ALLOWED_ORIGINS` consistent across replicas

## Hardening

- Redis ACL + private network; prefer `rediss://`
- Enable AOF and `noeviction` as in the Redis runbook
- Container CPU/memory limits
- Edge rate limits (nginx/CDN) in addition to app limiters

See also: [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md), [SECURITY.md](../SECURITY.md).
