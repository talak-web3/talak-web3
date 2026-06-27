# Workspace packages

This file lists every **npm workspace member** in this repo (see [`pnpm-workspace.yaml`](pnpm-workspace.yaml)) and links to its **README**. Workspace packages are folders that contain a `package.json` at the listed path.

**Live npm versions** (badges from the public registry): [`docs/NPM_REGISTRY.md`](docs/NPM_REGISTRY.md).

For a short overview of the `packages/` directory, see [`packages/README.md`](packages/README.md).

---

## Libraries (`packages/`)

| Path                                                      | npm name                       | README                                        | Summary                                                 |
| --------------------------------------------------------- | ------------------------------ | --------------------------------------------- | ------------------------------------------------------- |
| [`packages/sdk`](packages/sdk/)                           | `@talak-web3/sdk`              | [README](packages/sdk/README.md)              | Unified SDK entrypoint; re-exports feature modules.     |
| [`packages/adapters`](packages/adapters/)                 | `@talak-web3/adapters`         | [README](packages/adapters/README.md)         | Adapters for web, Node, and other runtimes.             |
| [`packages/ai`](packages/ai/)                             | `@talak-web3/ai`               | [README](packages/ai/README.md)               | AI-related helpers and integrations.                    |
| [`packages/analytics-engine`](packages/analytics-engine/) | `@talak-web3/analytics-engine` | [README](packages/analytics-engine/README.md) | Analytics event types and sinks (engine).               |
| [`packages/auth`](packages/auth/)                         | `@talak-web3/auth`             | [README](packages/auth/README.md)             | SIWE, sessions, token lifecycle.                        |
| [`packages/client`](packages/client/)                     | `@talak-web3/client`           | [README](packages/client/README.md)           | HTTP client for talak-web3 APIs.                        |
| [`packages/config`](packages/config/)                     | `@talak-web3/config`           | [README](packages/config/README.md)           | Configuration loading and validation.                   |
| [`packages/core`](packages/core/)                         | `@talak-web3/core`             | [README](packages/core/README.md)             | Core orchestrator, plugins, middleware chains, context. |
| [`packages/errors`](packages/errors/)                     | `@talak-web3/errors`           | [README](packages/errors/README.md)           | Shared error types and helpers.                         |
| [`packages/handlers`](packages/handlers/)                 | `@talak-web3/handlers`         | [README](packages/handlers/README.md)         | Route and protocol handlers.                            |
| [`packages/hooks`](packages/hooks/)                       | `@talak-web3/hooks`            | [README](packages/hooks/README.md)            | React hooks and providers.                              |
| [`packages/identity`](packages/identity/)                 | `@talak-web3/identity`         | [README](packages/identity/README.md)         | Identity and account abstractions.                      |
| [`packages/realtime`](packages/realtime/)                 | `@talak-web3/realtime`         | [README](packages/realtime/README.md)         | Realtime channels and messaging.                        |
| [`packages/rpc`](packages/rpc/)                           | `@talak-web3/rpc`              | [README](packages/rpc/README.md)              | Multi-provider RPC routing and resilience.              |
| [`packages/test-utils`](packages/test-utils/)             | `@talak-web3/test-utils`       | [README](packages/test-utils/README.md)       | Mocks, factories, and test helpers.                     |
| [`packages/tx`](packages/tx/)                             | `@talak-web3/tx`               | [README](packages/tx/README.md)               | Transaction and account-abstraction utilities.          |
| [`packages/types`](packages/types/)                       | `@talak-web3/types`            | [README](packages/types/README.md)            | Shared TypeScript types.                                |
| [`packages/utils`](packages/utils/)                       | `@talak-web3/utils`            | [README](packages/utils/README.md)            | General-purpose utilities.                              |
| [`packages/cli`](packages/cli/)                           | `@talak-web3/cli`              | [README](packages/cli/README.md)              | CLI: `init`, `doctor`, `generate`, and other tooling.   |
| [`packages/dashboard`](packages/dashboard/)               | `@talak-web3/dashboard`        | [README](packages/dashboard/README.md)        | Admin dashboard UI building blocks.                     |
| [`packages/templates`](packages/templates/)               | `@talak-web3/templates`        | [README](packages/templates/README.md)        | Programmatic templates used by the CLI.                 |

---

## Example apps (`apps/`)

Private applications used to exercise the SDK. Each has its own README.

| Path                                                | `package.json` name     | README                                     | Summary                                   |
| --------------------------------------------------- | ----------------------- | ------------------------------------------ | ----------------------------------------- |
| [`apps/example-next-dapp`](apps/example-next-dapp/) | `example-next-dapp`     | [README](apps/example-next-dapp/README.md) | Next.js sample using core, hooks, and tx. |
| [`apps/gasless-tx-app`](apps/gasless-tx-app/)       | `example-gasless-tx`    | [README](apps/gasless-tx-app/README.md)    | Gasless transaction demo.                 |
| [`apps/hono-backend`](apps/hono-backend/)           | `hono-backend`          | [README](apps/hono-backend/README.md)      | Hono reference backend for talak-web3.    |
| [`apps/minimal-auth-app`](apps/minimal-auth-app/)   | `example-minimal-auth`  | [README](apps/minimal-auth-app/README.md)  | Minimal auth + client example.            |
| [`apps/react-native-dapp`](apps/react-native-dapp/) | `react-native-dapp`     | [README](apps/react-native-dapp/README.md) | Expo / React Native sample with hooks.    |
| [`apps/rpc-dashboard-app`](apps/rpc-dashboard-app/) | `example-rpc-dashboard` | [README](apps/rpc-dashboard-app/README.md) | RPC dashboard demo.                       |

---

## Documentation sources (`apps/docs-site`)

| Path                                | README                             | Note                                                                                                                                                                                                        |
| ----------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`apps/docs-site`](apps/docs-site/) | [README](apps/docs-site/README.md) | Markdown documentation sources. This folder is listed in `pnpm-workspace.yaml` but **does not define a `package.json`**, so it is **not** an installable workspace package until a `package.json` is added. |

---

## Counts

- **Libraries:** 26 packages under `packages/`
- **Apps:** 6 packages under `apps/` (with `package.json`)
- **Docs-only folder:** `apps/docs-site` (no `package.json`)

Run `pnpm -r list --depth -1` from the repo root to list workspace packages as resolved by pnpm.
