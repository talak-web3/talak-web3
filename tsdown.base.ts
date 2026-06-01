import type { UserConfig } from "tsdown";

export function talakWeb3Config(overrides: Partial<UserConfig> = {}): UserConfig {
  return {
    format: ["esm", "cjs"],
    platform: "node",
    target: "es2024",
    fixedExtension: false,
    outDir: "dist",
    clean: true,
    treeshake: true,
    sourcemap: true,
    dts: { sourcemap: true },
    failOnWarn: "ci-only",
    ...overrides,
  };
}
