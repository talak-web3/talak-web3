# docs-site

Markdown sources for talak-web3 documentation (architecture, guides, plugins). Files live under `docs/`; TypeScript under `src/` is minimal scaffolding.

## Note on workspace membership

This folder is listed in [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml), but there is **no `package.json`** here yet, so **pnpm does not treat it as an installable workspace package**. To make it a first-class workspace app, add a private `package.json` and appropriate scripts.

## Contents

- `docs/` — Markdown pages (e.g. architecture, security, performance).
- `src/` — Supporting code if you wire a static site generator later.

## Related

- [Repository README](../../README.md)
- [Package index](../../packages.md)
