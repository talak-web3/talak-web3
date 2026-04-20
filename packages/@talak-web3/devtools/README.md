# @talak-web3/devtools

Lightweight helpers for observability and request tracing in talak-web3 apps.

## Installation

```bash
pnpm add @talak-web3/devtools
```

## API

### `createRequestId(): string`

Returns a new unique id (via `crypto.randomUUID()`), suitable for correlating logs and traces per request.

```ts
import { createRequestId } from "@talak-web3/devtools";

const id = createRequestId();
```

## Development

```bash
pnpm --filter @talak-web3/devtools build
pnpm --filter @talak-web3/devtools typecheck
```

## License

MIT
