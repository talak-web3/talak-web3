# <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> Hono Backend Reference

The authoritative reference implementation of the `talak-web3` backend. Built on Hono for maximum performance and edge-compatibility.

---

## 1. <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> [SECURITY] Production Hardening

- **Zod Edge Validation**: All incoming bodies and headers are strictly typed and validated before reaching handlers.
- **Fail-Closed Redis**: Explicitly fails on storage degradation to protect nonces.
- **CORS Protection**: Exact Set-based matching (no Wildcards allowed).

## 2. <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg> [FLOW] Deployment

```bash
pnpm build
pnpm start
```

For a full production topology (Nginx + Redis + SSL), see the [/examples/production-deployment/](../../examples/production-deployment/README.md) guide.

---

[Root README](../../README.md)
