export const TALAK_ACCESS_COOKIE = "talak_web3_access";
export const TALAK_REFRESH_COOKIE = "talak_web3_refresh";

export interface AuthCookieOptions {
  path?: string;
  domain?: string;
  expires?: Date;
  maxAge?: number;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "strict" | "lax" | "none";
}

export function createSetCookieString(
  name: string,
  value: string,
  options: AuthCookieOptions = {},
): string {
  // Security-mandatory defaults: user can only make MORE secure, not less
  const isProduction = process.env["NODE_ENV"] === "production" || process.env["HTTPS"] === "true";
  const secure = options.secure !== undefined ? options.secure : isProduction;
  const httpOnly = options.httpOnly !== undefined ? options.httpOnly : true;
  const sameSite = options.sameSite ?? "strict";
  const path = options.path ?? "/";

  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`];

  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (httpOnly) parts.push("HttpOnly");
  if (secure) parts.push("Secure");
  parts.push(`SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`);

  return parts.join("; ");
}

export function createClearCookieString(name: string, path = "/"): string {
  return `${name}=; Path=${path}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function parseCookieHeader(cookieHeader: string | null): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!cookieHeader) return cookies;

  for (const part of cookieHeader.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (!name) continue;
    cookies.set(name, decodeURIComponent(valueParts.join("=")));
  }

  return cookies;
}

export function getAccessTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookies = parseCookieHeader(request.headers.get("cookie"));
  return cookies.get(TALAK_ACCESS_COOKIE) ?? null;
}

export function getRefreshTokenFromRequest(request: Request): string | null {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  return cookies.get(TALAK_REFRESH_COOKIE) ?? null;
}

export function appendAuthCookies(
  headers: Headers,
  tokens: { accessToken: string; refreshToken: string },
  options: {
    accessTtlSeconds: number;
    refreshTtlSeconds: number;
    secure?: boolean;
  },
): void {
  const secure = options.secure ?? process.env["NODE_ENV"] === "production";
  const cookieDefaults: AuthCookieOptions = {
    path: "/",
    httpOnly: true,
    secure,
    sameSite: "lax",
  };

  headers.append(
    "Set-Cookie",
    createSetCookieString(TALAK_ACCESS_COOKIE, tokens.accessToken, {
      ...cookieDefaults,
      maxAge: options.accessTtlSeconds,
    }),
  );
  headers.append(
    "Set-Cookie",
    createSetCookieString(TALAK_REFRESH_COOKIE, tokens.refreshToken, {
      ...cookieDefaults,
      maxAge: options.refreshTtlSeconds,
    }),
  );
}

export function appendClearAuthCookies(headers: Headers): void {
  headers.append("Set-Cookie", createClearCookieString(TALAK_ACCESS_COOKIE));
  headers.append("Set-Cookie", createClearCookieString(TALAK_REFRESH_COOKIE));
}

export function getJwtExp(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")) as {
      exp?: unknown;
    };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}
