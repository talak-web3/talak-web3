# @talak-web3/templates

Programmatic project templates used by **`@talak-web3/cli`** when you run `talak-web3 init`. Each template is a map of relative file paths to file contents (strings).

## What’s included

- **`nextjs`** — Minimal `package.json` with Next.js, React, and `@talak-web3/core` / `@talak-web3/hooks`, plus a starter `talak-web3.config.ts`.
- **`hono`** — Minimal `package.json` with Hono and `@talak-web3/core`.

## Usage (library)

```ts
import { Templates } from "@talak-web3/templates";

const pkg = Templates.nextjs.files["package.json"];
```

The CLI merges these files into the target directory when initializing a project.

## Development

```bash
pnpm --filter @talak-web3/templates build
pnpm --filter @talak-web3/templates typecheck
```

## License

MIT
