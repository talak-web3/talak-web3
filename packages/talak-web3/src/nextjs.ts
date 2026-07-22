export {
  // Auth HTTP handler
  createAuthHandler,
  type AuthHandlerOptions,

  // Route handler adapter
  toNextJsHandler,
  type TalakWeb3RouteHandler,
  type TalakWeb3Handler,

  // Cookie utilities
  parseSetCookieHeader,
  toCookieOptions,
  createSetCookieString,
  type CookieAttributes,

  // Next.js cookie plugin (with RSC detection)
  nextCookies,
  type NextCookiesPluginOptions,

  // Cookie plugin guard
  warnIfCookiePluginNotLast,

  // Server-side session helpers
  getSession,
  requireSession,
  tryGetSession,
  type ServerSession,

  // Middleware for route protection
  createMiddleware,
  type TalakMiddlewareOptions,
} from "./integrations/nextjs/index.js";
