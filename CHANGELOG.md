# Changelog

All notable changes to this monorepo are documented here. Versions refer to the published **`talak-web3`** npm package unless a scoped package version is noted.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.1.0] - 2026-07-17

### Security Fixes (Critical)
- Added TTL-based cleanup to all InMemory stores (Nonce, Refresh, Revocation) to prevent memory leaks
- Fixed hardcoded `requestId` in middleware — now uses typed `ctx.requestId`
- Expanded secret leak detection to cover PEM keys, raw hex, and base64 patterns
- Replaced JSON string prototype pollution check with deep recursive object scanner
- Replaced `TtlCache` insertion order array with `Set` for O(1) operations
- Suppressed stack traces in production environments
- Added graceful shutdown with `SIGTERM`/`SIGINT` handlers

### Security Fixes (High)
- Added safe Redis DB index validation (0-15 range)
- Added RSA key strength validation (>= 2048 bits)
- Added explicit `mockMode` config for AI (removed fragile `NODE_ENV=test` auto-detect)
- Added 64-char hex validation for Tableland private keys
- Added HMAC key rotation support to InternalAuth
- Added configurable ceiling to InMemoryRateLimiter
- Added `timingSafeEqual` for refresh token hash comparison
- Added `halfOpenMaxRequests` to circuit breaker

### Security Fixes (Medium)
- Added IPv4-mapped IPv6 support to rate limiters
- Enforced secure cookie defaults (httpOnly, secure, sameSite=strict)
- Added logger injection to HookRegistry
- Added 1KB body size limit on auth endpoints
- Split error codes into public/internal exports

### Features
- Added `healthCheck()` method to TalakWeb3Instance
- Added `requestLoggingMiddleware` for automatic request timing
- Added `rateLimitHeaders()` helper for standard rate limit response headers
- Added `introspectToken()` method to TalakWeb3Auth
- Added request deduplication for read-only RPC calls
- Added `deprecated()` utility for migration warnings
- Zero-config dev mode: InMemory auth stores auto-created when none provided

### Bug Fixes
- Fixed `this.client!` non-null assertion with proper null check in AI plugin
- CLI version now reads from package.json instead of hardcoded
- Removed stale `packages/handlers` reference from tsconfig
- Fixed Node version check from `>= 20` to `>= 24`

### Tech Debt
- Removed dead `generateSecret()` function
- Removed redundant hand-written `.d.ts` files
- Replaced placeholder adapter tests with real tests
- Unified error construction (removed custom AiError class)
- Updated packages.md to reflect actual workspace

### Documentation
- Added JSDoc to core exports and type definitions
- Added TypeDoc configuration
- Updated CONTRIBUTING.md with security reporting and monorepo guides
- Added `.nvmrc` with Node 24

## [1.0.9] - 2026-04-15

### Summary

- Synchronized all workspace packages and unified `@dagimabebe/talak-web3` package to version **`1.0.9`**.
- Updated metadata and installation snippets across documentation to reflect the latest stable release.
- Refreshed GitHub Packages metadata to ensure "Latest" tag points to 1.0.9.

## [1.0.4] - 2026-04-10

### Summary

- Published **`talak-web3@1.0.4`** and scoped **`@talak-web3/*@1.0.1`** packages to npm.
- Added GitHub Packages publish workflow and `dist` sync into `talak-web3-publish`.

[Unreleased]: https://github.com/dagimabebe/talak-web3/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/dagimabebe/talak-web3/releases/tag/v1.1.0
[1.0.9]: https://github.com/dagimabebe/talak-web3/releases/tag/v1.0.9
[1.0.4]: https://github.com/dagimabebe/talak-web3/releases/tag/v1.0.4
