# @talak-web3/analytics

Thin TypeScript package that **re-exports analytics types** from [`@talak-web3/analytics-engine`](https://www.npmjs.com/package/@talak-web3/analytics-engine). Use this when you want a stable `@talak-web3/analytics` import path aligned with other scoped packages.

## Installation

```bash
pnpm add @talak-web3/analytics
```

## Exports

- `AnalyticsEvent`
- `AnalyticsSink`

These types are defined in `@talak-web3/analytics-engine`; this package does not add runtime logic.

## Development

```bash
pnpm --filter @talak-web3/analytics build
pnpm --filter @talak-web3/analytics typecheck
```

## License

MIT
