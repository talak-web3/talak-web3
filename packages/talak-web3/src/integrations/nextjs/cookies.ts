export interface CookieAttributes {
  value: string;
  "max-age"?: number | undefined;
  expires?: Date | undefined;
  domain?: string | undefined;
  path?: string | undefined;
  secure?: boolean | undefined;
  httponly?: boolean | undefined;
  samesite?: "strict" | "lax" | "none" | undefined;
  [key: string]: unknown;
}

interface ParsedCookieOptions {
  maxAge?: number | undefined;
  expires?: Date | undefined;
  domain?: string | undefined;
  path?: string | undefined;
  secure?: boolean | undefined;
  httpOnly?: boolean | undefined;
  sameSite?: CookieAttributes["samesite"];
}

function tryDecode(str: string): string {
  if (str.indexOf("%") === -1) return str;
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

function unquoteCookieValue(value: string): string {
  if (value.length < 2 || !value.startsWith('"') || !value.endsWith('"')) {
    return value;
  }
  return value.slice(1, -1);
}

function splitSetCookieHeader(setCookie: string): string[] {
  if (!setCookie) return [];

  const result: string[] = [];
  let start = 0;
  let i = 0;

  while (i < setCookie.length) {
    if (setCookie[i] === ",") {
      let j = i + 1;
      while (j < setCookie.length && setCookie[j] === " ") j++;
      while (
        j < setCookie.length &&
        setCookie[j] !== "=" &&
        setCookie[j] !== ";" &&
        setCookie[j] !== ","
      ) {
        j++;
      }

      if (j < setCookie.length && setCookie[j] === "=") {
        const part = setCookie.slice(start, i).trim();
        if (part) result.push(part);
        start = i + 1;
        while (start < setCookie.length && setCookie[start] === " ") start++;
        i = start;
        continue;
      }
    }

    i++;
  }

  const last = setCookie.slice(start).trim();
  if (last) result.push(last);

  return result;
}

/**
 * Parse a Set-Cookie header into a Map of cookie name to attributes.
 *
 * @example
 * ```ts
 * const cookies = parseSetCookieHeader("token=abc123; Path=/; HttpOnly; Secure");
 * // cookies.get("token") => { value: "abc123", path: "/", httponly: true, secure: true }
 * ```
 */
export function parseSetCookieHeader(setCookie: string): Map<string, CookieAttributes> {
  const cookies = new Map<string, CookieAttributes>();
  const cookieArray = splitSetCookieHeader(setCookie);

  cookieArray.forEach((cookieString) => {
    const parts = cookieString.split(";").map((part) => part.trim());
    const [nameValue, ...attributes] = parts;
    const [name, ...valueParts] = (nameValue || "").split("=");

    const value = unquoteCookieValue(valueParts.join("="));

    if (!name) {
      return;
    }

    const decodedValue = tryDecode(value);
    const attrObj: CookieAttributes = { value: decodedValue };

    attributes.forEach((attribute) => {
      const [attrName, ...attrValueParts] = attribute!.split("=");
      const attrValue = attrValueParts.join("=");

      const normalizedAttrName = attrName!.trim().toLowerCase();

      switch (normalizedAttrName) {
        case "max-age":
          attrObj["max-age"] = attrValue ? parseInt(attrValue.trim(), 10) : undefined;
          break;
        case "expires":
          attrObj.expires = attrValue ? new Date(attrValue.trim()) : undefined;
          break;
        case "domain":
          attrObj.domain = attrValue ? attrValue.trim() : undefined;
          break;
        case "path":
          attrObj.path = attrValue ? attrValue.trim() : undefined;
          break;
        case "secure":
          attrObj.secure = true;
          break;
        case "httponly":
          attrObj.httponly = true;
          break;
        case "samesite":
          attrObj.samesite = attrValue
            ? (attrValue.trim().toLowerCase() as "strict" | "lax" | "none")
            : undefined;
          break;
        default:
          attrObj[normalizedAttrName] = attrValue ? attrValue.trim() : true;
          break;
      }
    });

    cookies.set(name, attrObj);
  });

  return cookies;
}

export function toCookieOptions(attributes: CookieAttributes): ParsedCookieOptions {
  return {
    maxAge: attributes["max-age"],
    expires: attributes.expires,
    domain: attributes.domain,
    path: attributes.path,
    secure: attributes.secure,
    httpOnly: attributes.httponly,
    sameSite: attributes.samesite,
  };
}

export function createSetCookieString(
  name: string,
  value: string,
  options: Partial<CookieAttributes> = {},
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  parts.push(`Path=${options.path ?? "/"}`);

  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }

  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }

  if (options["max-age"] !== undefined) {
    parts.push(`Max-Age=${options["max-age"]}`);
  }

  if (options.httponly) {
    parts.push("HttpOnly");
  }

  if (options.secure) {
    parts.push("Secure");
  }

  if (options.samesite) {
    parts.push(`SameSite=${options.samesite.charAt(0).toUpperCase() + options.samesite.slice(1)}`);
  }

  return parts.join("; ");
}
