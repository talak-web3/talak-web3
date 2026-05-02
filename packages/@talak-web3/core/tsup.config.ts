import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/middleware.ts", "src/security.ts"],
  format: ["esm", "cjs"],
  clean: true,
  dts: {
    compilerOptions: {
      composite: false,
    },
  },
});
