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
    // TODO: Restore `failOnWarn: "ci-only"` when TypeScript 7.x stabilizes.
    // Currently omitted because TS 7.0.2 is experimental and tsdown emits a
    // warning ("TypeScript 7.0 does not yet have a stable API") that fails CI
    // when failOnWarn is enabled.
    ...overrides,
  };
}
