import { describe, it, expect } from "vitest";

import { resolvePreset } from "../presets";

describe("resolvePreset", () => {
  it("returns input unchanged when no preset key", () => {
    const input = { auth: { domain: "app.com" } };
    expect(resolvePreset(input)).toBe(input);
  });

  it("resolves preset chains for 'mainnet'", () => {
    const result = resolvePreset({ preset: "mainnet" });
    expect(result.chains).toHaveLength(1);
    expect(result.chains[0].id).toBe(1);
    expect(result).not.toHaveProperty("preset");
  });

  it("throws for unknown preset name", () => {
    expect(() => resolvePreset({ preset: "moonbeam" })).toThrow("Unknown preset");
    expect(() => resolvePreset({ preset: "moonbeam" })).toThrow(/moonbeam/);
  });

  it("user chain with same id overrides preset chain", () => {
    const result = resolvePreset({
      preset: "mainnet",
      chains: [{ id: 1, rpcUrls: ["https://custom-rpc.com"] }],
    });
    expect(result.chains).toHaveLength(1);
    expect(result.chains[0].id).toBe(1);
    expect(result.chains[0].rpcUrls).toEqual(["https://custom-rpc.com"]);
    expect(result.chains[0].name).toBe("Ethereum Mainnet");
  });

  it("user chain with new id is appended to preset chains", () => {
    const result = resolvePreset({
      preset: "mainnet",
      chains: [
        {
          id: 137,
          name: "Polygon",
          rpcUrls: ["https://polygon-rpc.com"],
          nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
        },
      ],
    });
    expect(result.chains).toHaveLength(2);
    expect(result.chains[0].id).toBe(1);
    expect(result.chains[1].id).toBe(137);
  });

  it("non-chain fields from user merge over preset", () => {
    const result = resolvePreset({
      preset: "mainnet",
      auth: { domain: "app.com" },
      debug: true,
    });
    expect(result.auth).toEqual({ domain: "app.com" });
    expect(result.debug).toBe(true);
    expect(result.chains[0].id).toBe(1);
  });

  it.each(["mainnet", "polygon", "arbitrum", "optimism", "base", "avalanche"])(
    "resolves preset '%s'",
    (name) => {
      const result = resolvePreset({ preset: name });
      expect(result.chains).toHaveLength(1);
      expect(result.chains[0].name).toBeTruthy();
    },
  );
});
