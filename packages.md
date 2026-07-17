# Workspace packages

This file lists every **npm workspace member** in this repo (see [`pnpm-workspace.yaml`](pnpm-workspace.yaml)).

---

## Libraries (`packages/`)

| Path                                          | npm name                    | Summary                                                 |
| --------------------------------------------- | --------------------------- | ------------------------------------------------------- |
| [`packages/types`](packages/types/)           | `@talak-web3/types`         | Shared TypeScript types.                                |
| [`packages/errors`](packages/errors/)         | `@talak-web3/errors`        | Shared error types and helpers.                         |
| [`packages/utils`](packages/utils/)           | `@talak-web3/utils`         | General-purpose utilities.                              |
| [`packages/config`](packages/config/)         | `@talak-web3/config`        | Configuration loading and validation.                   |
| [`packages/hooks`](packages/hooks/)           | `@talak-web3/hooks`         | React hooks and providers.                              |
| [`packages/client`](packages/client/)         | `@talak-web3/client`        | HTTP client for talak-web3 APIs.                        |
| [`packages/rpc`](packages/rpc/)               | `@talak-web3/rpc`           | Multi-provider RPC routing and resilience.              |
| [`packages/adapters`](packages/adapters/)     | `@talak-web3/adapters`      | Adapters for Ceramic, Tableland, Pinata, etc.           |
| [`packages/auth`](packages/auth/)             | `@talak-web3/auth`          | SIWE, sessions, token lifecycle.                        |
| [`packages/identity`](packages/identity/)     | `@talak-web3/identity`      | Identity and account abstractions.                      |
| [`packages/tx`](packages/tx/)                 | `@talak-web3/tx`            | Transaction and account-abstraction utilities.          |
| [`packages/realtime`](packages/realtime/)     | `@talak-web3/realtime`      | Realtime channels and messaging.                        |
| [`packages/ai`](packages/ai/)                 | `@talak-web3/ai`            | AI agent plugin and helpers.                            |
| [`packages/rate-limit`](packages/rate-limit/) | `@talak-web3/rate-limit`    | Rate limiting (in-memory and Redis).                    |
| [`packages/core`](packages/core/)             | `@talak-web3/core`          | Core orchestrator, plugins, middleware chains, context. |
| [`packages/test-utils`](packages/test-utils/) | `@talak-web3/test-utils`    | Mocks, factories, and test helpers.                     |
| [`packages/cli`](packages/cli/)               | `@talak-web3/cli`           | CLI: `init`, `doctor`, `generate`, and other tooling.   |
| [`packages/templates`](packages/templates/)   | `@talak-web3/templates`     | Programmatic templates used by the CLI.                 |
| [`packages/dashboard`](packages/dashboard/)   | `@talak-web3/dashboard`     | Admin dashboard UI building blocks.                     |
| [`packages/talak-web3`](packages/talak-web3/) | `talak-web3`                | Unified SDK; includes `talak-web3/nextjs` integration.  |

---

## Example apps (`apps/`)

Private applications used to exercise the SDK.

| Path                                    | `package.json` name     | Summary                                   |
| --------------------------------------- | ----------------------- | ----------------------------------------- |
| [`apps/hono-backend`](apps/hono-backend/) | `hono-backend`      | Hono reference backend for talak-web3.    |
| [`apps/docs`](apps/docs/)               | `@talak-web3/docs`      | Fumadocs MDX documentation site.          |

---

## Counts

- **Libraries:** 20 packages under `packages/`
- **Apps:** 2 packages under `apps/`

Run `pnpm -r list --depth -1` from the repo root to list workspace packages as resolved by pnpm.
