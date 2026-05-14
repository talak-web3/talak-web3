import type { UserConfig } from "tsdown";

export function talakWeb3Config(overrides: Partial<UserConfig> = {}): UserConfig {
  return {
    format: ["esm", "cjs"],
    target: "es2022",
    platform: "node",
    outDir: "dist",
    sourcemap: true,
    clean: true,
    treeshake: true,
    fixedExtension: true,
    dts: { build: true, incremental: true },
    ...overrides,
  };
}
