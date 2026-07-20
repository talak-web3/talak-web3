import {
  InMemoryNonceStore,
  InMemoryRefreshStore,
  InMemoryRevocationStore,
} from "@talak-web3/auth";
import { describe, it, expect, vi } from "vitest";

import { talakWeb3 } from "../index";

const stores = () => ({
  nonceStore: new InMemoryNonceStore(),
  refreshStore: new InMemoryRefreshStore(),
  revocationStore: new InMemoryRevocationStore(),
});

describe("talakWeb3", () => {
  it("should initialize with default config", () => {
    const instance = talakWeb3({ auth: stores() });
    expect(instance.config).toBeDefined();
    expect(instance.hooks).toBeDefined();
    expect(instance.context).toBeDefined();
  });

  it("should create independent instances", () => {
    const instance1 = talakWeb3({ key: "1", auth: stores() });
    const instance2 = talakWeb3({ key: "2", auth: stores() });
    expect(instance1).not.toBe(instance2);
  });

  it("should setup plugins during init", async () => {
    const setup = vi.fn();
    const plugin = {
      name: "test-plugin",
      version: "1.0.0",
      setup,
    };

    const instance = talakWeb3({ plugins: [plugin], auth: stores() });
    await instance.init();

    expect(setup).toHaveBeenCalledWith(instance.context);
    expect(instance.context.plugins.get("test-plugin")).toMatchObject({
      name: plugin.name,
      version: plugin.version,
    });
  });
});
