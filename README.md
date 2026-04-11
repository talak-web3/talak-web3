# talak-web3

[![CI](https://github.com/dagimabebe/talak-web3/actions/workflows/ci.yml/badge.svg)](https://github.com/dagimabebe/talak-web3/actions)
[![npm version](https://badge.fury.io/js/talak-web3.svg)](https://www.npmjs.com/package/talak-web3)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Web3 backend toolkit for server-side SIWE sessions, RPC failover, and account-abstraction helpers. See [CHANGELOG.md](./CHANGELOG.md) for release notes.

## Features

- **Server-authenticated SIWE**: Server-side sessions and pluggable stores (`@talak-web3/auth`, Redis-backed stores in `@talak-web3/auth/stores`)
- **Resilient RPC routing**: Multi-provider failover with health tracking (`@talak-web3/rpc`)
- **Replay-resistant flows**: Nonce consumption before signature verification; refresh rotation (use Redis stores in production)
- **TypeScript-first**: Typed public APIs across packages
- **Examples**: Next.js, Hono, and React Native sample apps under `apps/` (bring your own HTTP rate limits and deployment hardening)

## Quick Start

### Installation

```bash
npm install talak-web3
# or
yarn add talak-web3
# or
pnpm add talak-web3
```

### Initialize Project

The CLI package is `@talak-web3/cli`. Binaries: `talak`, `talak-web3`, and `create-talak-web3` (all equivalent).

```bash
npx talak-web3 init my-dapp --template nextjs
# or
npx @talak-web3/cli init my-dapp --template nextjs
cd my-dapp
npm install
npm run dev
```

### Manual Setup

Consult [`docs/MINIMAL_SETUP.md`](./docs/MINIMAL_SETUP.md) and the [`@talak-web3/core`](./packages/talak-web3-core/README.md) README — `talakWeb3()` is configured via `@talak-web3/config` presets and plugins; JWT/session secrets are enforced by `@talak-web3/auth` (**`JWT_SECRET` is required when `NODE_ENV=production`**).

### React integration

`talak-web3/react` re-exports hooks from `@talak-web3/hooks` (e.g. `TalakWeb3Provider`, `useTalakWeb3`, `useAccount`, `useChain`). Wire your own SIWE signing flow against your API; there is no `useSIWE` helper in the current release.

## Package ecosystem

Highlights below; **all workspace libraries** are listed in [`packages.md`](./packages.md) and [`docs/PACKAGE_ECOSYSTEM.md`](./docs/PACKAGE_ECOSYSTEM.md).

| Package | Version | Description |
|---------|---------|-------------|
| `talak-web3` | [![npm](https://img.shields.io/npm/v/talak-web3)](https://www.npmjs.com/package/talak-web3) | Unified SDK entrypoint |
| `@talak-web3/auth` | [![npm](https://img.shields.io/npm/v/%40talak-web3%2Fauth)](https://www.npmjs.com/package/@talak-web3/auth) | SIWE and session lifecycle |
| `@talak-web3/rpc` | [![npm](https://img.shields.io/npm/v/%40talak-web3%2Frpc)](https://www.npmjs.com/package/@talak-web3/rpc) | Provider routing and failover |
| `@talak-web3/tx` | [![npm](https://img.shields.io/npm/v/%40talak-web3%2Ftx)](https://www.npmjs.com/package/@talak-web3/tx) | Account abstraction helpers |
| `@talak-web3/hooks` | [![npm](https://img.shields.io/npm/v/%40talak-web3%2Fhooks)](https://www.npmjs.com/package/@talak-web3/hooks) | React hooks and providers |
| `@talak-web3/cli` | [![npm](https://img.shields.io/npm/v/%40talak-web3%2Fcli)](https://www.npmjs.com/package/@talak-web3/cli) | CLI scaffolding (`talak-web3`, `talak`, `create-talak-web3`) |

## Development

```bash
# Clone repository
git clone https://github.com/dagimabebe/talak-web3.git
cd talak-web3

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Lint code
pnpm lint

# Type check
pnpm typecheck
```

## Production Checklist

- [ ] Redis configured for session storage
- [ ] HTTPS enabled with valid certificates
- [ ] JWT secrets rotated (256-bit minimum)
- [ ] Rate limiting at your API gateway / edge (library does not ship HTTP middleware for this)
- [ ] CORS origins restricted
- [ ] Audit logging enabled
- [ ] Error tracking configured (Sentry)
- [ ] Health checks implemented
- [ ] Monitoring dashboards set up

## Documentation

- [Workspace package list](./packages.md) - Every monorepo package and app, with links to each README
- [Getting Started](./docs/MINIMAL_SETUP.md) - First steps with talak-web3
- [Package Ecosystem](./docs/PACKAGE_ECOSYSTEM.md) - Published package catalog and install names
- [Architecture](./docs/ARCHITECTURE.md) - System design and patterns
- [Security](./docs/SECURITY_ARCHITECTURE.md) - Security architecture and threat model
- [Threat Model](./docs/THREAT_MODEL.md) - Comprehensive threat analysis
- [API Reference](https://docs.talak.dev/api) - Complete API documentation
- [Contributing](./CONTRIBUTING.md) - Contribution guidelines and troubleshooting (for example `npm warn Unknown env config "_dagimabebe-registry"`)

## Releases

See [CHANGELOG.md](./CHANGELOG.md) and [GitHub Releases](https://github.com/dagimabebe/talak-web3/releases).

## GitHub Packages

Packages listed on your GitHub profile or org **Packages** tab come from **GitHub Packages** (`npm.pkg.github.com`), not from the public npm registry. This repo publishes the unified SDK as `@dagimabebe/talak-web3` via the [**Publish to GitHub Packages** workflow](.github/workflows/publish-github-packages.yml). Open **Actions**, select that workflow, and click **Run workflow** (bump `talak-web3-publish` / `packages/talak-web3` version if the registry reports the version already exists).

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`talak-web3`](https://www.npmjs.com/package/talak-web3) | [![npm](https://img.shields.io/npm/v/talak-web3.svg)](https://www.npmjs.com/package/talak-web3) | Core SDK with all features |
| [`@talak-web3/core`](https://www.npmjs.com/package/@talak-web3/core) | [![npm](https://img.shields.io/npm/v/%40talak-web3%2Fcore.svg)](https://www.npmjs.com/package/@talak-web3/core) | Core orchestrator |
| [`@talak-web3/auth`](https://www.npmjs.com/package/@talak-web3/auth) | [![npm](https://img.shields.io/npm/v/%40talak-web3%2Fauth.svg)](https://www.npmjs.com/package/@talak-web3/auth) | SIWE authentication |
| [`@talak-web3/rpc`](https://www.npmjs.com/package/@talak-web3/rpc) | [![npm](https://img.shields.io/npm/v/%40talak-web3%2Frpc.svg)](https://www.npmjs.com/package/@talak-web3/rpc) | RPC resilience layer |
| [`@talak-web3/hooks`](https://www.npmjs.com/package/@talak-web3/hooks) | [![npm](https://img.shields.io/npm/v/%40talak-web3%2Fhooks.svg)](https://www.npmjs.com/package/@talak-web3/hooks) | React hooks |
| [`@talak-web3/types`](https://www.npmjs.com/package/@talak-web3/types) | [![npm](https://img.shields.io/npm/v/%40talak-web3%2Ftypes.svg)](https://www.npmjs.com/package/@talak-web3/types) | TypeScript types |

## Security

See [SECURITY.md](./SECURITY.md) for security policies and vulnerability disclosure thanks.

## License


MIT © [Dagim Abebe](https://github.com/dagimabebe)
