import { describe, it, expect, vi, beforeEach } from "vitest";
import { TalakWeb3Error } from "@talak-web3/errors";

describe("TablelandPlugin", () => {
  it("throws when TABLELAND_PRIVATE_KEY is missing", async () => {
    const originalEnv = process.env["TABLELAND_PRIVATE_KEY"];
    delete process.env["TABLELAND_PRIVATE_KEY"];

    const { TablelandPlugin } = await import("../tableland.js");
    const mockCtx = {
      config: { tableland: {} },
      hooks: { emit: vi.fn() },
      adapters: {},
    } as never;

    const plugin = new TablelandPlugin(mockCtx);

    await expect(plugin.query("SELECT 1")).rejects.toThrow(TalakWeb3Error);

    if (originalEnv !== undefined) {
      process.env["TABLELAND_PRIVATE_KEY"] = originalEnv;
    }
  });

  it("throws when private key is not 64-char hex", async () => {
    const originalEnv = process.env["TABLELAND_PRIVATE_KEY"];
    process.env["TABLELAND_PRIVATE_KEY"] = "not-a-valid-key";

    const { TablelandPlugin } = await import("../tableland.js");
    const mockCtx = {
      config: { tableland: {} },
      hooks: { emit: vi.fn() },
      adapters: {},
    } as never;

    const plugin = new TablelandPlugin(mockCtx);

    await expect(plugin.query("SELECT 1")).rejects.toThrow("64-character hex");

    if (originalEnv !== undefined) {
      process.env["TABLELAND_PRIVATE_KEY"] = originalEnv;
    } else {
      delete process.env["TABLELAND_PRIVATE_KEY"];
    }
  });
});

describe("PinataStorageAdapter", () => {
  it("throws without JWT", async () => {
    const originalEnv = process.env["PINATA_JWT"];
    delete process.env["PINATA_JWT"];

    const { PinataStorageAdapter } = await import("../storage.js");

    expect(() => new PinataStorageAdapter({} as never)).toThrow("PINATA_JWT");

    if (originalEnv !== undefined) {
      process.env["PINATA_JWT"] = originalEnv;
    }
  });
});
