import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/stores/index.ts"],
  format: ["esm", "cjs"],
  clean: true,
  dts: {
    compilerOptions: {
      composite: false,
    },
  },
});
