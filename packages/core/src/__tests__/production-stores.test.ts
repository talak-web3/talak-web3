import {
  InMemoryNonceStore,
  InMemoryRefreshStore,
  InMemoryRevocationStore,
} from "@talak-web3/auth";
import { CONFIG_ERROR_CODES } from "@talak-web3/errors";
import { afterEach, describe, expect, it } from "vitest";

import { createTalakWeb3 } from "../index.js";

const chain = {
  id: 1,
  name: "Ethereum",
  rpcUrls: ["https://example.com"],
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
};

describe("C-001 production in-memory store guard", () => {
  const prev = process.env["NODE_ENV"];

  afterEach(() => {
    process.env["NODE_ENV"] = prev;
  });

  it("throws when NODE_ENV=production and stores are omitted", () => {
    process.env["NODE_ENV"] = "production";
    expect(() =>
      createTalakWeb3({
        chains: [chain],
        auth: { domain: "example.com" },
      }),
    ).toThrow(/Production forbids/);
  });

  it("throws when NODE_ENV=production and InMemory stores are provided", () => {
    process.env["NODE_ENV"] = "production";
    try {
      createTalakWeb3({
        chains: [chain],
        auth: {
          domain: "example.com",
          nonceStore: new InMemoryNonceStore(),
          refreshStore: new InMemoryRefreshStore(),
          revocationStore: new InMemoryRevocationStore(),
        },
      });
      expect.fail("expected throw");
    } catch (err: unknown) {
      // Factory check or TalakWeb3Auth brand assert
      const code = (err as { code?: string }).code;
      expect([CONFIG_ERROR_CODES.INMEMORY_STORES_IN_PRODUCTION, "AUTH_STORES_MISSING"]).toContain(
        code,
      );
    }
  });

  it("allows InMemory stores outside production", () => {
    process.env["NODE_ENV"] = "test";
    const app = createTalakWeb3({
      chains: [chain],
      auth: {
        nonceStore: new InMemoryNonceStore(),
        refreshStore: new InMemoryRefreshStore(),
        revocationStore: new InMemoryRevocationStore(),
      },
    });
    expect(app.context.auth).toBeDefined();
  });
});
