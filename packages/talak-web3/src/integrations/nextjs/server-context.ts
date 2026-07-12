import { getAccessTokenFromRequest } from "@talak-web3/core";
import type { TalakWeb3Instance } from "@talak-web3/types";

/**
 * Server-side session representation
 */
export interface ServerSession {
  address: string | null;
  chainId: number | null;
  isAuthenticated: boolean;
}

/**
 * Get the current session in a Server Component or Route Handler.
 */
export async function getSession(instance: TalakWeb3Instance): Promise<ServerSession> {
  try {
    const { headers } = await import("next/headers.js");
    const headersStore = await headers();

    const authHeader = headersStore.get("authorization");
    let token: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }

    if (!token) {
      const cookieHeader = headersStore.get("cookie");
      if (cookieHeader) {
        token = getAccessTokenFromRequest(
          new Request("http://localhost", { headers: { cookie: cookieHeader } }),
        );
      }
    }

    if (!token) {
      return { address: null, chainId: null, isAuthenticated: false };
    }

    const ip =
      headersStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headersStore.get("x-real-ip") ??
      "unknown";
    const userAgent = headersStore.get("user-agent") ?? "unknown";

    const payload = await instance.context.auth.verifySession(token, { ip, userAgent });

    return {
      address: payload.address,
      chainId: payload.chainId,
      isAuthenticated: true,
    };
  } catch {
    return { address: null, chainId: null, isAuthenticated: false };
  }
}

/**
 * Get session or throw if not authenticated.
 */
export async function requireSession(instance: TalakWeb3Instance): Promise<ServerSession> {
  const session = await getSession(instance);

  if (!session.isAuthenticated) {
    throw new Error("Unauthorized: authentication required");
  }

  return session;
}

/**
 * Try to get session without throwing on failure.
 */
export async function tryGetSession(instance: TalakWeb3Instance): Promise<ServerSession | null> {
  const session = await getSession(instance);
  return session.isAuthenticated ? session : null;
}
