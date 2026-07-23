# Authentication model

## Overview

talak-web3 implements SIWE (EIP-4361) with:

- Short-lived **RS256** JWT access tokens (`JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`)
- Opaque refresh tokens (SHA-256 hashed at rest) with rotation
- Pluggable nonce / refresh / revocation stores (Redis required in production)

## Nonce consumption order

**Login consumes the nonce before signature verification.**

Rationale: under concurrent login with the same nonce, atomic consume ensures **exactly one** request can proceed. Verifying the signature first would allow two parallel requests to both pass verify and then race on consume.

Trade-off: a client that obtains a nonce and submits an **invalid** signature burns that nonce (availability DoS per address is mitigated by rate limits on `/nonce` and `/login`).

## Token binding

Access tokens may embed `contextHash` / `ipSubnet` from client IP + User-Agent.  
Always pass the same request context into `loginWithSiwe`, `refresh`, and `verifySession` (the HTTP auth handler does this when `trustProxy` is configured correctly).

## Production

See [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) and [DEPLOYMENT.md](./DEPLOYMENT.md).
