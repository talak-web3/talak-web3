# API Reference

Complete API reference for talak-web3 (RS256 JWT + pluggable stores).

## Core API

### `talakWeb3(config)` / `createTalakWeb3(config)`

Creates a new talak-web3 application instance.

**Production:** you must provide Redis-backed (or other durable) `nonceStore`, `refreshStore`, and `revocationStore`. In-memory stores are **rejected** when `NODE_ENV=production`.

JWT signing uses **RS256** with PEM keys — not a shared HMAC secret.

```typescript
import Redis from "ioredis";
import { talakWeb3 } from "talak-web3";
import { RedisNonceStore, RedisRefreshStore, RedisRevocationStore } from "@talak-web3/auth/stores";

const redis = new Redis(process.env.REDIS_URL!);

const app = talakWeb3({
  chains: [
    {
      id: 1,
      name: "Ethereum",
      rpcUrls: ["https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"],
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      testnet: false,
    },
  ],
  auth: {
    domain: process.env.SIWE_DOMAIN!, // e.g. "app.example.com"
    nonceStore: new RedisNonceStore({ redis }),
    refreshStore: new RedisRefreshStore({ redis }),
    revocationStore: new RedisRevocationStore({ redis }),
    accessTtlSeconds: 900,
    refreshTtlSeconds: 604800,
  },
});

await app.init();
```

#### Required environment (production auth)

| Variable                          | Description                                                     |
| --------------------------------- | --------------------------------------------------------------- |
| `JWT_PRIVATE_KEY`                 | PKCS#8 PEM RSA private key (RS256, ≥2048 bits)                  |
| `JWT_PUBLIC_KEY`                  | SPKI PEM RSA public key                                         |
| `JWT_PRIMARY_KID`                 | Optional key id (default `v1`)                                  |
| `SIWE_DOMAIN`                     | Expected SIWE domain                                            |
| `REDIS_URL`                       | Redis connection (`redis://` or `rediss://`)                    |
| `TRUST_PROXY` / `TRUSTED_PROXIES` | Set when behind a reverse proxy so `X-Forwarded-For` is trusted |

#### Configuration options (auth stores)

| Option                           | Type              | Default                 | Description         |
| -------------------------------- | ----------------- | ----------------------- | ------------------- |
| `auth.domain` / `expectedDomain` | `string`          | env `SIWE_DOMAIN`       | SIWE domain binding |
| `auth.nonceStore`                | `NonceStore`      | InMemory (**dev only**) | Nonce store         |
| `auth.refreshStore`              | `RefreshStore`    | InMemory (**dev only**) | Refresh store       |
| `auth.revocationStore`           | `RevocationStore` | InMemory (**dev only**) | Revocation store    |
| `auth.accessTtlSeconds`          | `number`          | `900`                   | Access token TTL    |
| `auth.refreshTtlSeconds`         | `number`          | `604800`                | Refresh token TTL   |

### Context API

#### `app.context.auth`

##### `createNonce(address, meta?)`

Creates a SIWE nonce for an address.

```typescript
const nonce = await app.context.auth.createNonce(address, { ip, ua });
```

##### `loginWithSiwe(message, signature, context?)`

Verifies SIWE and issues access + refresh tokens. Pass `context` for IP/UA token binding.

```typescript
const { accessToken, refreshToken } = await app.context.auth.loginWithSiwe(message, signature, {
  ip: "1.2.3.4",
  userAgent: "…",
});
```

##### `refresh(refreshToken, context?)`

Rotates the refresh token and issues a new access token. **Pass the same client context** so binding is preserved after refresh.

```typescript
const pair = await app.context.auth.refresh(refreshToken, { ip, userAgent });
```

##### `verifySession(token, context?)`

Verifies an access token (and optional context binding).

```typescript
const session = await app.context.auth.verifySession(token, { ip, userAgent });
```

##### `createSession(address, chainId)`

Issues an access token without SIWE (server-side only; use carefully).

### Auth HTTP handler

```typescript
import { createAuthHandler } from "@talak-web3/core";

const handler = createAuthHandler(app, {
  basePath: "/api/auth",
  trustProxy: true, // only when behind a trusted reverse proxy
  // rateLimiters: { login: new RedisRateLimiter(...) }
});
```

Routes: `POST /nonce`, `POST /login`, `POST /refresh`, `POST /logout`, `GET|POST /verify`, `GET /session`, `GET /jwks`.

## Security notes

- Prefer Redis stores and fail-closed Redis config (see `docs/REDIS_DEPLOYMENT_RUNBOOK.md`).
- Do not use `InMemory*` stores or HMAC `JWT_SECRET` in production.
- CSRF (hono reference app): double-submit cookie is **not** HttpOnly so browsers can send `x-csrf-token`.
- Client `CookieTokenStorage` is XSS-readable; use `allowInsecureCookies: true` only if you accept that risk.

## Further reading

- [Architecture](./ARCHITECTURE.md)
- [Security architecture](./SECURITY_ARCHITECTURE.md)
- [Threat model](./THREAT_MODEL.md)
- [Minimal setup](./MINIMAL_SETUP.md)
