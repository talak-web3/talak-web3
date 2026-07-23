import {
  InMemoryNonceStore,
  InMemoryRefreshStore,
  InMemoryRevocationStore,
} from "@talak-web3/auth";
import { afterEach, describe, expect, it } from "vitest";

import { createAuthHandler } from "../auth-handler.js";
import { createTalakWeb3 } from "../index.js";

describe("REQUIRE_REDIS_RATE_LIMIT", () => {
  const prevEnv = process.env["NODE_ENV"];
  const prevReq = process.env["REQUIRE_REDIS_RATE_LIMIT"];

  afterEach(() => {
    process.env["NODE_ENV"] = prevEnv;
    if (prevReq === undefined) delete process.env["REQUIRE_REDIS_RATE_LIMIT"];
    else process.env["REQUIRE_REDIS_RATE_LIMIT"] = prevReq;
  });

  it("throws when requireRedisRateLimit option set without redis in production", () => {
    process.env["NODE_ENV"] = "test";
    const app = createTalakWeb3({
      chains: [
        {
          id: 1,
          name: "Ethereum",
          rpcUrls: ["https://example.com"],
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        },
      ],
      auth: {
        nonceStore: new InMemoryNonceStore(),
        refreshStore: new InMemoryRefreshStore(),
        revocationStore: new InMemoryRevocationStore(),
      },
    });

    process.env["NODE_ENV"] = "production";
    expect(() => createAuthHandler(app, { requireRedisRateLimit: true })).toThrow(
      /Redis-backed auth rate limiters/,
    );
  });
});
