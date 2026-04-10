# @talak-web3/dashboard

Optional admin UI building blocks for talak-web3: default navigation metadata and a sample **Admin** dashboard component that uses `@talak-web3/hooks`.

## Contents

- **`getDefaultNav()`** — Returns default admin nav items (`/admin`, `/admin/analytics`).
- **`AdminDashboard`** (React, in `src/index.tsx`) — Example dashboard showing chain, account, and loaded plugins via `useTalakWeb3`, `useChain`, and `useAccount`.

## Requirements

- React
- `@talak-web3/hooks` (and a configured talak-web3 app)

Import paths depend on how this package is wired in your bundler (see your app’s `package.json` / monorepo setup).

## Development

```bash
pnpm --filter @talak-web3/dashboard build
pnpm --filter @talak-web3/dashboard typecheck
```

## License

MIT
