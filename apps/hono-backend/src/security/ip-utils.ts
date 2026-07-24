import type { Context } from "hono";

export const TRUSTED_PROXY_RANGES = process.env["TRUSTED_PROXY_RANGES"]
  ? process.env["TRUSTED_PROXY_RANGES"].split(",")
  : [
      "173.245.48.0/20",
      "103.21.244.0/22",
      "103.22.200.0/22",
      "104.16.0.0/13",
      "104.24.0.0/14",
      "131.0.72.0/22",
      "141.101.64.0/18",
      "162.158.0.0/15",
      "172.64.0.0/13",
      "173.245.48.0/20",
      "188.114.96.0/20",
      "190.93.240.0/20",
      "197.234.240.0/22",
      "198.41.128.0/17",

      "127.0.0.1",
      "::1",
    ];

export function isIpInRange(ip: string, range: string): boolean {
  if (ip === range) return true;

  if (!range.includes("/")) {
    return ip === range;
  }

  const parts = range.split("/");
  if (parts.length !== 2) return false;
  const baseIp = parts[0]!;
  const maskBits = parts[1]!;
  const mask = parseInt(maskBits, 10);

  if (ip.includes(".") && baseIp.includes(".")) {
    const ipNum = ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    const baseNum =
      baseIp.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    const maskNum = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0;

    return (ipNum & maskNum) === (baseNum & maskNum);
  }

  return false;
}

export function isTrustedProxy(ip: string): boolean {
  return TRUSTED_PROXY_RANGES.some((range) => isIpInRange(ip, range));
}

export function normalizeIp(ip: string): string {
  return ip.replace(/^::ffff:/, "");
}

/**
 * Extracts the real client IP from a Hono request context.
 * Validates X-Forwarded-For against trusted proxy ranges before trusting it.
 * Falls back to the direct socket address when the source is untrusted.
 */
export function getIp(c: Context): string {
  const cfIp = c.req.header("cf-connecting-ip");
  if (cfIp && /^[0-9a-f.:]+$/.test(cfIp)) {
    return normalizeIp(cfIp);
  }

  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    const socketAddr = (c.req.raw as unknown as { socket?: { remoteAddress?: string } }).socket
      ?.remoteAddress;

    if (socketAddr && isTrustedProxy(normalizeIp(socketAddr))) {
      const clientIp = forwarded.split(",")[0]?.trim() ?? "unknown";
      return normalizeIp(clientIp);
    }
  }

  const socketAddr = (c.req.raw as unknown as { socket?: { remoteAddress?: string } }).socket
    ?.remoteAddress;
  return socketAddr ? normalizeIp(socketAddr) : "unknown";
}
