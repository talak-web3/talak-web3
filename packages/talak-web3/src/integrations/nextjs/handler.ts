/**
 * A handler function that processes HTTP requests
 */
export type TalakWeb3Handler = (request: Request) => Promise<Response>;

/**
 * Route handler for Next.js App Router
 */
export interface TalakWeb3RouteHandler {
  GET: TalakWeb3Handler;
  POST: TalakWeb3Handler;
  PUT: TalakWeb3Handler;
  PATCH: TalakWeb3Handler;
  DELETE: TalakWeb3Handler;
}

/**
 * Wraps a talak-web3 instance or handler to work with Next.js App Router route handlers.
 *
 * - Accepts either an object with a `handler` property, or a function directly
 * - Returns an object with GET/POST/PUT/PATCH/DELETE methods that all call the same handler
 *
 * @example With a talak-web3 instance:
 * ```ts
 * // app/api/auth/[...talak]/route.ts
 * import { toNextJsHandler } from "talak-web3/nextjs";
 * import { app } from "@/talak.config";
 *
 * const routeHandler = toNextJsHandler(app);
 *
 * export const GET = routeHandler.GET;
 * export const POST = routeHandler.POST;
 * export const PUT = routeHandler.PUT;
 * export const PATCH = routeHandler.PATCH;
 * export const DELETE = routeHandler.DELETE;
 * ```
 */
export function toNextJsHandler(
  auth:
    | {
        handler: TalakWeb3Handler;
      }
    | TalakWeb3Handler,
): TalakWeb3RouteHandler {
  const handler = async (request: Request): Promise<Response> => {
    return "handler" in auth ? auth.handler(request) : auth(request);
  };

  return {
    GET: handler,
    POST: handler,
    PUT: handler,
    PATCH: handler,
    DELETE: handler,
  };
}
