import { describe, it, expect } from "vitest";

import { parseSetCookieHeader, toCookieOptions, createSetCookieString } from "../cookies.js";

describe("parseSetCookieHeader", () => {
  it("should parse a simple cookie", () => {
    const cookies = parseSetCookieHeader("token=abc123");
    const token = cookies.get("token");

    expect(token).toBeDefined();
    expect(token?.value).toBe("abc123");
  });

  it("should parse cookies with attributes", () => {
    const cookies = parseSetCookieHeader("token=abc123; Path=/; HttpOnly; Secure; SameSite=Strict");
    const token = cookies.get("token");

    expect(token).toBeDefined();
    expect(token?.value).toBe("abc123");
    expect(token?.path).toBe("/");
    expect(token?.httponly).toBe(true);
    expect(token?.secure).toBe(true);
    expect(token?.samesite).toBe("strict");
  });

  it("should parse cookies with Max-Age", () => {
    const cookies = parseSetCookieHeader("token=abc123; Max-Age=3600");
    const token = cookies.get("token");

    expect(token).toBeDefined();
    expect(token?.["max-age"]).toBe(3600);
  });

  it("should parse cookies with Expires", () => {
    const cookies = parseSetCookieHeader("token=abc123; Expires=Thu, 01 Jan 2025 00:00:00 GMT");
    const token = cookies.get("token");

    expect(token).toBeDefined();
    expect(token?.expires).toBeInstanceOf(Date);
  });

  it("should parse cookies with Domain", () => {
    const cookies = parseSetCookieHeader("token=abc123; Domain=example.com");
    const token = cookies.get("token");

    expect(token).toBeDefined();
    expect(token?.domain).toBe("example.com");
  });

  it("should parse multiple cookies separated by commas", () => {
    const cookies = parseSetCookieHeader("token1=abc, token2=def, token3=ghi");

    expect(cookies.size).toBe(3);
    expect(cookies.get("token1")?.value).toBe("abc");
    expect(cookies.get("token2")?.value).toBe("def");
    expect(cookies.get("token3")?.value).toBe("ghi");
  });

  it("should handle encoded values", () => {
    const cookies = parseSetCookieHeader("token=hello%20world");
    const token = cookies.get("token");

    expect(token?.value).toBe("hello world");
  });
});

describe("toCookieOptions", () => {
  it("should convert basic attributes", () => {
    const options = toCookieOptions({
      value: "abc",
      path: "/",
      httponly: true,
      secure: true,
    });

    expect(options).toEqual({
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: undefined,
      maxAge: undefined,
      expires: undefined,
      domain: undefined,
    });
  });

  it("should include domain when present", () => {
    const options = toCookieOptions({
      value: "abc",
      domain: "example.com",
    });

    expect(options.domain).toBe("example.com");
  });

  it("should include maxAge when present", () => {
    const options = toCookieOptions({
      value: "abc",
      "max-age": 3600,
    });

    expect(options.maxAge).toBe(3600);
  });

  it("should include expires when present", () => {
    const date = new Date("2025-01-01");
    const options = toCookieOptions({
      value: "abc",
      expires: date,
    });

    expect(options.expires).toBe(date);
  });

  it("should include sameSite when present", () => {
    const options = toCookieOptions({
      value: "abc",
      samesite: "lax",
    });

    expect(options.sameSite).toBe("lax");
  });
});

describe("createSetCookieString", () => {
  it("should create a simple cookie string", () => {
    const str = createSetCookieString("token", "abc123");

    expect(str).toBe("token=abc123; Path=/");
  });

  it("should create cookie with HttpOnly", () => {
    const str = createSetCookieString("token", "abc123", {
      httponly: true,
    });

    expect(str).toContain("HttpOnly");
  });

  it("should create cookie with Secure", () => {
    const str = createSetCookieString("token", "abc123", {
      secure: true,
    });

    expect(str).toContain("Secure");
  });

  it("should create cookie with SameSite", () => {
    const str = createSetCookieString("token", "abc123", {
      samesite: "strict",
    });

    expect(str).toContain("SameSite=Strict");
  });

  it("should create cookie with Max-Age", () => {
    const str = createSetCookieString("token", "abc123", {
      "max-age": 3600,
    });

    expect(str).toContain("Max-Age=3600");
  });

  it("should create cookie with custom Path", () => {
    const str = createSetCookieString("token", "abc123", {
      path: "/api",
    });

    expect(str).toContain("Path=/api");
  });
});
