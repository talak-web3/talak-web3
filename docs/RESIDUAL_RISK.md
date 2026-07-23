# Residual dependency risk

Tracks `pnpm audit` findings after production hardening (2026-07-23).

## Progress

| Scope                    | Earlier (no-go audit) |                                                      After hardening |
| ------------------------ | --------------------: | -------------------------------------------------------------------: |
| Full monorepo high       |                 25–26 | **~12** (mostly optional Ceramic/Tableland dev peers under adapters) |
| `pnpm audit --prod` high |                   ~22 |                    **~3** (docs/next/sharp/js-yaml path + remaining) |

## Policy for production GO

| Surface                                                                                                                               | Requirement                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Auth/runtime SDK** (`auth`, `core`, `rpc`, `client`, `rate-limit`, `config`, `errors`, `types`, `talak-web3` without optional Next) | High findings on **required** runtime deps should be 0           |
| **Optional integrations** (`adapters` + Ceramic/Tableland peers, `@talak-web3/ai` + openai peer)                                      | Documented residual; not required for SIWE/JWT production deploy |
| **Docs app** (`apps/docs` / Next / sharp / fumadocs)                                                                                  | Treat as static site; patch promptly, not on auth runtime path   |
| **Dev tooling** (vitest, commitlint, tsx)                                                                                             | Overrides preferred; not shipped to npm consumers                |

## Packaging changes that reduced risk

1. Ceramic/Tableland moved to **optional peerDependencies** of `@talak-web3/adapters` (dev-only for monorepo builds).
2. `openai` moved to **optional peer** of `@talak-web3/ai`.
3. Workspace overrides: `esbuild`, `vite`, `ws`, `next`, `hono`, `fast-uri`, `js-yaml`, etc.
4. `next` pinned to **16.2.11** (was resolving 16.2.4 via optional peer).

## Remaining residual (update after each audit)

| Module                          | Scope                              | Notes                                                                                                                         |
| ------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `elliptic`                      | adapters (Ceramic stack, optional) | No clean fixed upgrade on legacy ethers v5 path; **do not enable Ceramic adapters in minimal auth prod** until stack upgraded |
| `js-yaml` / `sharp` / `postcss` | docs app / fumadocs / next         | Docs-only; not required for JWT/SIWE runtime                                                                                  |
| `ws`                            | may appear via `viem`              | Keep override at ≥8.21.1; re-check after lockfile refresh                                                                     |

## Commands

```bash
pnpm audit:full      # entire monorepo (includes optional/dev trees)
pnpm audit:runtime   # production dependency tree
```

## Last reviewed

- Date: 2026-07-23
- Branch: `fix/audit-2026-07-23-065731`
- Unit tests: 300 pass
