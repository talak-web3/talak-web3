# Changelog

All notable changes to this monorepo are documented here. Versions refer to the published **`talak-web3`** npm package unless a scoped package version is noted.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- `@talak-web3/auth/stores`: `RedisNonceStore`, `RedisRefreshStore`, and `RedisRevocationStore` (`ioredis`), including Lua-backed atomic nonce consumption for `RedisNonceStore`.
- CLI bin alias **`talak`** (alongside `talak-web3` and `create-talak-web3`).
- This `CHANGELOG.md` file.

### Changed

- **`@talak-web3/auth`**: `JWT_SECRET` is **required** when `NODE_ENV=production`; JWT verification restricts algorithms to **HS256**; `generateNonce()` uses 32 bytes (64 hex chars).
- **README**: Corrected CLI install/init commands, removed unverified codecov badge, aligned feature claims with implemented code, pointed to [`packages.md`](./packages.md) for the full package list.

### Fixed

- Documentation examples that referenced Redis store classes that were previously undocumented/unimplemented.
- **`package.publish.json`** version drift (aligned with `packages/talak-web3` for the publish folder).

## [1.0.4] - 2026-04-10

### Summary

- Published **`talak-web3@1.0.4`** and scoped **`@talak-web3/*@1.0.1`** packages to npm.
- Added GitHub Packages publish workflow and `dist` sync into `talak-web3-publish`.

[Unreleased]: https://github.com/dagimabebe/talak-web3/compare/v1.0.4...HEAD
[1.0.4]: https://github.com/dagimabebe/talak-web3/releases/tag/v1.0.4
