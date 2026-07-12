# Next.js Integration

talak-web3 ships App Router integration via the `talak-web3/nextjs` export. Auth routes are served by a framework-agnostic handler on every `talakWeb3()` instance (`app.handler`), wrapped for Next.js with `toNextJsHandler`.

## Install

```bash
pnpm add talak-web3 next
```

`next` is a peer dependency of `talak-web3`.

## Server setup

### 1. Configure the instance

```ts
// talak.config.ts
import { talakWeb3 } from "talak-web3";
import { nextCookies } from "talak-web3/nextjs";
import {
  InMemoryNonceStore,
  InMemoryRefreshStore,
  InMemoryRevocationStore,
} from "@talak-web3/auth";

export const app = talakWeb3({
  chains: [
    {
      id: 1,
      name: "Ethereum",
      rpcUrls: ["https://cloudflare-eth.com"],
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    },
  ],
  auth: {
    nonceStore: new InMemoryNonceStore(),
    refreshStore: new InMemoryRefreshStore(),
    revocationStore: new InMemoryRevocationStore(),
    accessTtlSeconds: 900,
    refreshTtlSeconds: 604_800,
  },
  plugins: [nextCookies()],
});
```

Use Redis-backed stores in production. Place `nextCookies()` **last** in the `plugins` array so later plugins do not set cookies this integration cannot forward.

### 2. Mount the route handler

```ts
// app/api/auth/[...talak]/route.ts
import { toNextJsHandler } from "talak-web3/nextjs";
import { app } from "@/talak.config";

const handler = toNextJsHandler(app);

export const GET = handler.GET;
export const POST = handler.POST;
export const PUT = handler.PUT;
export const PATCH = handler.PATCH;
export const DELETE = handler.DELETE;
```

`toNextJsHandler` accepts either a `talakWeb3()` instance (uses `app.handler`) or any object with a `handler` property.

### 3. Auth API routes

All routes are under `/api/auth` by default:

| Route               | Method    | Description                                  |
| ------------------- | --------- | -------------------------------------------- |
| `/api/auth/nonce`   | POST      | Generate SIWE nonce                          |
| `/api/auth/login`   | POST      | Sign in with Ethereum; sets httpOnly cookies |
| `/api/auth/logout`  | POST      | Revoke session; clears cookies               |
| `/api/auth/refresh` | POST      | Rotate tokens                                |
| `/api/auth/verify`  | GET, POST | Verify access token                          |
| `/api/auth/session` | GET       | Get session; may refresh when allowed        |
| `/api/auth/jwks`    | GET       | JSON Web Key Set                             |

Customize the base path with `createAuthHandler(app, { basePath: "/auth" })` from `@talak-web3/core` or `talak-web3/nextjs`.

## Server Components

```tsx
// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "talak-web3/nextjs";
import { app } from "@/talak.config";

export default async function DashboardPage() {
  const session = await getSession(app);

  if (!session.isAuthenticated) {
    redirect("/login");
  }

  return <p>Welcome, {session.address}</p>;
}
```

Helpers: `getSession`, `requireSession`, `tryGetSession`.

## Middleware

```ts
// middleware.ts
import { createMiddleware } from "talak-web3/nextjs";

export const middleware = createMiddleware({
  publicPaths: ["/", "/login"],
  redirectTo: "/login",
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

Middleware checks for a token or `talak_web3_access` cookie. Full verification happens in pages or API routes.

## Client usage

There is no `useSIWE` hook in the current release. Use `TalakWeb3Client` or `fetch` from client components.

`TalakWeb3Client` calls paths under `/auth/*`, so set `baseUrl: "/api"` when the handler is mounted at `/api/auth`:

```tsx
"use client";

import { useState } from "react";
import { createWalletClient, custom } from "viem";
import { mainnet } from "viem/chains";
import { TalakWeb3Client } from "talak-web3";

const authClient = new TalakWeb3Client({ baseUrl: "/api" });

export function SignInButton() {
  const [address, setAddress] = useState<string | null>(null);

  async function signIn() {
    const [account] = await window.ethereum!.request({ method: "eth_requestAccounts" });
    const addr = account as `0x${string}`;

    const { nonce } = await authClient.getNonce(addr);

    const domain = window.location.host;
    const uri = window.location.origin;
    const message =
      `${domain} wants you to sign in with your Ethereum account:\n` +
      `${addr}\n\n` +
      `Sign in with talak-web3.\n\n` +
      `URI: ${uri}\n` +
      `Version: 1\n` +
      `Chain ID: 1\n` +
      `Nonce: ${nonce}\n` +
      `Issued At: ${new Date().toISOString()}`;

    const walletClient = createWalletClient({
      chain: mainnet,
      transport: custom(window.ethereum!),
    });
    const signature = await walletClient.signMessage({ account: addr, message });

    await authClient.loginWithSiwe(message, signature);
    setAddress(addr);
  }

  return address ? (
    <button onClick={() => authClient.logout().then(() => setAddress(null))}>Disconnect</button>
  ) : (
    <button onClick={signIn}>Sign in with Ethereum</button>
  );
}
```

### Cookie-based client requests

When using `nextCookies()`, prefer `credentials: "include"` so the browser stores httpOnly session cookies:

```ts
await fetch("/api/auth/login", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message, signature }),
});

const session = await fetch("/api/auth/session", { credentials: "include" }).then((r) => r.json());
```

## React provider (optional)

For chain/RPC hooks, wrap the app with `TalakWeb3Provider`:

```tsx
// app/providers.tsx
"use client";

import { TalakWeb3Provider } from "talak-web3/react";
import { app } from "@/talak.config";

void app.init();

export function Providers({ children }: { children: React.ReactNode }) {
  return <TalakWeb3Provider instance={app}>{children}</TalakWeb3Provider>;
}
```

## Exports

From `talak-web3/nextjs`:

- `toNextJsHandler` — Next.js App Router adapter
- `createAuthHandler` — standalone handler factory (also on `app.handler`)
- `nextCookies` — cookie plugin with RSC detection
- `getSession`, `requireSession`, `tryGetSession` — server session helpers
- `createMiddleware` — route protection middleware
- `parseSetCookieHeader`, `toCookieOptions`, `warnIfCookiePluginNotLast` — utilities

## RSC and cookies

The `nextCookies` plugin detects React Server Component requests (`RSC: 1` without `next-action`) and skips session refresh when cookies cannot be written, avoiding cookie/database mismatches.

[Back to Root README](../README.md)
