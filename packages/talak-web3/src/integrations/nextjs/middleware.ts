import { TALAK_ACCESS_COOKIE } from "@talak-web3/core";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Options for the talak-web3 middleware
 */
export interface TalakMiddlewareOptions {
  /**
   * Base path for auth routes
   * @default "/api/auth"
   */
  basePath?: string;

  /**
   * Paths that don't require authentication (always accessible)
   * @default ["/login", "/register", "/"]
   */
  publicPaths?: string[];

  /**
   * Where to redirect unauthenticated users
   * @default "/login"
   */
  redirectTo?: string;

  /**
   * Custom token extraction logic
   */
  extractToken?: (request: NextRequest) => string | null;

  /**
   * Whether to enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Create a Next.js middleware for route protection with talak-web3.
 */
export function createMiddleware(options: TalakMiddlewareOptions = {}) {
  const {
    basePath = "/api/auth",
    publicPaths = ["/login", "/register", "/"],
    redirectTo = "/login",
    extractToken,
    debug = false,
  } = options;

  return function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (debug) {
      console.log(`[talak-web3 middleware] Checking path: ${pathname}`);
    }

    if (pathname.startsWith(basePath)) {
      return NextResponse.next();
    }

    if (publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return NextResponse.next();
    }

    const token = extractToken ? extractToken(request) : extractTokenFromRequest(request);

    if (!token) {
      const loginUrl = new URL(redirectTo, request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  };
}

function extractTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return request.cookies.get(TALAK_ACCESS_COOKIE)?.value ?? null;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
