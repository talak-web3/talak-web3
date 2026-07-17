import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof fs>("node:fs");
  return {
    ...actual,
    existsSync: vi.fn((p: string) => {
      if (p.includes("empty-dir")) return true;
      if (p.includes("non-empty")) return true;
      if (p.includes("package.json")) return true;
      if (p.includes("tsconfig.json")) return true;
      if (p.includes(".env")) return true;
      return false;
    }),
    readdirSync: vi.fn((p: string) => {
      if (p.includes("non-empty")) return ["existing-file.ts"];
      return [];
    }),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

import { doctorCommand } from "../commands/doctor.js";
import { infoCommand } from "../commands/info.js";
import { depsCommand } from "../commands/deps.js";
import { envCommand } from "../commands/env.js";
import { docsCommand } from "../commands/docs.js";

describe("CLI Commands", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("doctorCommand", () => {
    it("runs health checks and reports results", async () => {
      await doctorCommand({});
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("infoCommand", () => {
    it("displays project info", async () => {
      await infoCommand({});
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("depsCommand", () => {
    it("lists dependencies", async () => {
      await depsCommand({});
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("envCommand", () => {
    it("shows environment variables", async () => {
      await envCommand();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("docsCommand", () => {
    it("prints documentation links", async () => {
      await docsCommand();
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map((c: unknown[]) => String(c[0])).join("\n");
      expect(output).toContain("github.com");
    });
  });
});
