import { describe, it, expect } from "vitest";
import { Templates } from "@talak-web3/templates";

describe("Templates", () => {
  describe("nextjs template", () => {
    it("has package.json with correct dependencies", () => {
      const pkg = JSON.parse(Templates.nextjs.files["package.json"]);
      expect(pkg.dependencies).toHaveProperty("@talak-web3/core");
      expect(pkg.dependencies).toHaveProperty("next");
      expect(pkg.dependencies).toHaveProperty("react");
    });

    it("has talak-web3 config file", () => {
      expect(Templates.nextjs.files["talak-web3.config.ts"]).toContain("talakWeb3");
    });
  });

  describe("hono template", () => {
    it("has package.json with correct dependencies", () => {
      const pkg = JSON.parse(Templates.hono.files["package.json"]);
      expect(pkg.dependencies).toHaveProperty("@talak-web3/core");
      expect(pkg.dependencies).toHaveProperty("hono");
    });
  });

  describe("template structure", () => {
    it("has both nextjs and hono templates", () => {
      expect(Templates).toHaveProperty("nextjs");
      expect(Templates).toHaveProperty("hono");
    });

    it("each template has a files object", () => {
      expect(typeof Templates.nextjs.files).toBe("object");
      expect(typeof Templates.hono.files).toBe("object");
    });

    it("each template file is a string", () => {
      for (const file of Object.values(Templates.nextjs.files)) {
        expect(typeof file).toBe("string");
      }
      for (const file of Object.values(Templates.hono.files)) {
        expect(typeof file).toBe("string");
      }
    });
  });
});
