/**
 * @talak-web3/nextjs - Next.js integration for talak-web3
 *
 * Utilities for integrating talak-web3 with the Next.js App Router, including
 * route handlers, cookie management, and React Server Component (RSC) detection.
 */

// Auth handler (re-exported from core)
export { createAuthHandler, type AuthHandlerOptions } from "@talak-web3/core";

// Route handler adapter
export { toNextJsHandler, type TalakWeb3RouteHandler, type TalakWeb3Handler } from "./handler.js";

// Cookie utilities
export {
  parseSetCookieHeader,
  toCookieOptions,
  createSetCookieString,
  type CookieAttributes,
} from "./cookies.js";

// Next.js cookie plugin (with RSC detection)
export { nextCookies, type NextCookiesPluginOptions } from "./plugin.js";

// Cookie plugin guard
export { warnIfCookiePluginNotLast } from "./cookie-plugin-guard.js";

// Server-side session helpers
export { getSession, requireSession, tryGetSession, type ServerSession } from "./server-context.js";

// Middleware for route protection
export { createMiddleware, type TalakMiddlewareOptions } from "./middleware.js";
