import {
  InMemoryNonceStore,
  InMemoryRefreshStore,
  InMemoryRevocationStore,
} from "@talak-web3/auth";
import type { PresetName, TalakWeb3Input } from "@talak-web3/types";
import { describe, it, expect } from "vitest";

import { talakWeb3 } from "../index";

const stores = () => ({
  nonceStore: new InMemoryNonceStore(),
  refreshStore: new InMemoryRefreshStore(),
  revocationStore: new InMemoryRevocationStore(),
});

describe("type-level checks", () => {
  it("partial config without chains compiles", () => {
    // Should compile: all fields are optional in TalakWeb3Input
    const instance = talakWeb3({ auth: stores() });
    expect(instance).toBeDefined();
  });

  it("preset is not in the output config", () => {
    const instance = talakWeb3({ preset: "mainnet", auth: stores() });
    expect(instance.config).not.toHaveProperty("preset");
  });
});
