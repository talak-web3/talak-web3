import { setShouldSkipSessionRefresh } from "@talak-web3/core";
import type { TalakWeb3Plugin, TalakWeb3Context } from "@talak-web3/types";

import { warnIfCookiePluginNotLast } from "./cookie-plugin-guard.js";
import { parseSetCookieHeader, toCookieOptions } from "./cookies.js";

const PLUGIN_VERSION = "1.0.0";

/**
 * Options for the nextCookies plugin
 */
export interface NextCookiesPluginOptions {
  /**
   * Paths that should be excluded from cookie forwarding
   * @default []
   */
  excludePaths?: string[];

  /**
   * Whether to log debug information
   * @default false
   */
  debug?: boolean;
}

function isSessionRoute(request: Request): boolean {
  const { pathname } = new URL(request.url);
  return pathname.endsWith("/session");
}

/**
 * Plugin that integrates talak-web3 with Next.js cookie handling.
 *
 * - Detects RSC (React Server Components) via headers to skip session refresh
 * - Forwards Set-Cookie headers from auth responses to Next.js's cookie store
 * - Handles server action context properly
 * - Warns if plugin is not placed last in the plugins array
 *
 * @example
 * ```ts
 * import { talakWeb3 } from "talak-web3";
 * import { nextCookies } from "talak-web3/nextjs";
 *
 * const app = talakWeb3({
 *   chains: [...],
 *   plugins: [nextCookies()],
 * });
 * ```
 */
export function nextCookies(options: NextCookiesPluginOptions = {}): TalakWeb3Plugin {
  const { excludePaths = [], debug = false } = options;
  let hasWarned = false;

  return {
    name: "next-cookies",
    version: PLUGIN_VERSION,

    async setup(ctx: TalakWeb3Context) {
      if (debug) {
        ctx.logger.debug("[next-cookies] Plugin initialized");
      }
    },

    /**
     * Before hook: Detect RSC context and skip session refresh if needed.
     *
     * In Next.js, RSC sends `RSC: 1` header without `next-action`.
     * In this context, cookies cannot be written, so we skip session refresh
     * to avoid DB/cookie mismatch.
     *
     * @see https://github.com/vercel/next.js/blob/8c5af211d580/packages/next/src/server/web/spec-extension/adapters/request-cookies.ts#L112-L157
     */
    async onBeforeRequest(req: unknown, ctx: TalakWeb3Context) {
      if (!(req instanceof Request)) return;

      if (!hasWarned && isSessionRoute(req)) {
        warnIfCookiePluginNotLast(ctx, "next-cookies");
        hasWarned = true;
      }

      let headersStore: Awaited<ReturnType<typeof import("next/headers.js").headers>> | null = null;

      try {
        const { headers } = await import("next/headers.js");
        headersStore = await headers();
      } catch {
        return;
      }

      if (!headersStore) return;

      const isRSC = headersStore.get("RSC") === "1";
      const isServerAction = !!headersStore.get("next-action");

      if (isRSC && !isServerAction) {
        setShouldSkipSessionRefresh(true);
        if (debug) {
          ctx.logger.debug("[next-cookies] RSC context detected, skipping session refresh");
        }
      }
    },

    /**
     * After hook: Forward Set-Cookie headers to Next.js's cookie store.
     */
    async onAfterResponse(res: unknown, ctx: TalakWeb3Context) {
      if (!(res instanceof Response)) return;

      const setCookies = res.headers.get("set-cookie");
      if (!setCookies) return;

      const parsed = parseSetCookieHeader(setCookies);

      let cookieHelper: Awaited<ReturnType<typeof import("next/headers.js").cookies>> | null = null;

      try {
        const { cookies } = await import("next/headers.js");
        cookieHelper = await cookies();
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.startsWith("`cookies` was called outside a request scope.") ||
            error.message.includes("Cannot find module"))
        ) {
          if (debug) {
            ctx.logger.debug(
              "[next-cookies] Not in Next.js request context, skipping cookie forwarding",
            );
          }
          return;
        }
        throw error;
      }

      if (!cookieHelper) return;

      parsed.forEach((value, key) => {
        if (!key) return;

        if (excludePaths.some((p) => value.path?.startsWith(p))) {
          if (debug) {
            ctx.logger.debug(`[next-cookies] Skipping excluded path for cookie: ${key}`);
          }
          return;
        }

        try {
          const cookieOptions = toCookieOptions(value);
          cookieHelper.set(key, value.value, {
            path: cookieOptions.path ?? "/",
            ...(cookieOptions.domain !== undefined && { domain: cookieOptions.domain }),
            ...(cookieOptions.expires !== undefined && { expires: cookieOptions.expires }),
            ...(cookieOptions.maxAge !== undefined && { maxAge: cookieOptions.maxAge }),
            ...(cookieOptions.secure !== undefined && { secure: cookieOptions.secure }),
            ...(cookieOptions.httpOnly !== undefined && { httpOnly: cookieOptions.httpOnly }),
            ...(cookieOptions.sameSite !== undefined && { sameSite: cookieOptions.sameSite }),
          });
          if (debug) {
            ctx.logger.debug(`[next-cookies] Set cookie: ${key}`);
          }
        } catch {
          if (debug) {
            ctx.logger.debug(`[next-cookies] Failed to set cookie: ${key} (likely in RSC context)`);
          }
        }
      });
    },
  };
}
