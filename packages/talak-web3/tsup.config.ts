import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/react.ts"],
  format: ["esm", "cjs"],
  dts: {
    resolve: true,
  },
  clean: true,
  sourcemap: true,
  splitting: false,
  outDir: "dist",
  minify: false,
  target: "es2022",
  noExternal: [
    "@talak-web3/core",
    "@talak-web3/auth",
    "@talak-web3/client",
    "@talak-web3/config",
    "@talak-web3/hooks",
    "@talak-web3/types",
    "@talak-web3/errors",
    "@talak-web3/middleware",
    "@talak-web3/rpc",
    "@talak-web3/utils",
  ],
  external: ["react", "react-dom"],
});
