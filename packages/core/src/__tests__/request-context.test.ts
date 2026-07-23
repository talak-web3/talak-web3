import { describe, expect, it } from "vitest";

import { getRequestContext } from "../auth-handler.js";

describe("H-002 trusted proxy IP resolution", () => {
  it("ignores X-Forwarded-For when trustProxy is false", () => {
    const req = new Request("http://localhost/api/auth/nonce", {
      headers: {
        "x-forwarded-for": "9.9.9.9",
        "user-agent": "test",
      },
    });
    expect(getRequestContext(req, false).ip).toBe("unknown");
  });

  it("honors X-Forwarded-For when trustProxy is true", () => {
    const req = new Request("http://localhost/api/auth/nonce", {
      headers: {
        "x-forwarded-for": "9.9.9.9, 1.1.1.1",
        "user-agent": "test",
      },
    });
    expect(getRequestContext(req, true).ip).toBe("9.9.9.9");
  });
});
