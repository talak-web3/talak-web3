import type { UserConfig } from "tsdown";

export function talakWeb3Config(overrides: Partial<UserConfig> = {}): UserConfig {
  return {
    format: ["esm", "cjs"],
    platform: "node",
    fixedExtension: false,
    outDir: "dist",
    clean: true,
    unbundle: true,
    dts: { sourcemap: true },
    ...overrides,
  };
}
