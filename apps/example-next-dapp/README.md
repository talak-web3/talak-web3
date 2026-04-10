# example-next-dapp

Example [Next.js](https://nextjs.org/) application that uses talak-web3 workspace packages: **`@talak-web3/core`**, **`@talak-web3/hooks`**, and **`@talak-web3/tx`**.

## Prerequisites

- Node.js 20+
- pnpm (see repo root)

## Setup

From the monorepo root:

```bash
pnpm install
pnpm --filter example-next-dapp dev
```

Or from this directory after install:

```bash
pnpm dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `dev` | Next.js development server |
| `build` | Production build (see `package.json` for current behavior) |
| `start` | Start production server |
| `typecheck` | TypeScript check |

## Related

- [Root README](../../README.md)
- [Package index](../../packages.md)
