# Minimal Mode and Modular Setup

`talak-web3` can be adopted incrementally. You do not need to use every package to benefit from the framework.

---

## 1) Auth-Only Mode

**Goal**: Use `talak-web3` solely for secure SIWE session management while keeping your existing RPC logic.

### Required Packages

- `@talak-web3/auth`
- `@talak-web3/core`
- `@talak-web3/adapters` (Redis adapter)

### Configuration

1. Register the `AuthPlugin`.
2. Disable the `RpcProxyMiddleware`.
3. Use `@talak-web3/client` in your frontend only for `auth.login()` and token management.

### Trade-offs

- **Lost**: Automated RPC failover, request tracing, and gasless transaction support.
- **Gained**: Complete SIWE security with minimal architectural footprint.

---

## 2) RPC-Only Mode

**Goal**: Use the resilient RPC management layer and proxying without implementing SIWE.

### Required Packages

- `@talak-web3/rpc`
- `@talak-web3/core`

### Configuration

1. Configure `UnifiedRpc` with your provider URLs.
2. Mark the RPC endpoints as `public` in the Hono router.
3. Remove `@talak-web3/auth` from your dependencies.

### Trade-offs

- **Lost**: User session guarantees, role-based access control, and transaction sponsorship.
- **Gained**: 100% uptime for public blockchain data reads.

---

## 3) Full Standard Setup (Recommended)

**Goal**: Complete zero-trust architecture.

By combining all packages, you achieve the intended **Fail-Closed** behavior where your RPC access is physically tied to authenticated sessions, preventing malicious third-party drain of your provider quotas.

---

[Back to Root README](../README.md)
