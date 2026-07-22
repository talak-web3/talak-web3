export { createAuthHandler, type AuthHandlerOptions } from "@talak-web3/core";

export { toNextJsHandler, type TalakWeb3RouteHandler, type TalakWeb3Handler } from "./handler.js";

export {
  parseSetCookieHeader,
  toCookieOptions,
  createSetCookieString,
  type CookieAttributes,
} from "./cookies.js";

export { nextCookies, type NextCookiesPluginOptions } from "./plugin.js";

export { warnIfCookiePluginNotLast } from "./cookie-plugin-guard.js";

export { getSession, requireSession, tryGetSession, type ServerSession } from "./server-context.js";

export { createMiddleware, type TalakMiddlewareOptions } from "./middleware.js";
