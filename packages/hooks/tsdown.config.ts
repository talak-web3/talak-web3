import { defineConfig } from "tsdown";

import { talakWeb3Config } from "../../tsdown.base.ts";

export default defineConfig(
  talakWeb3Config({
    entry: ["src/index.tsx", "src/hook-registry.ts"],
    platform: "neutral",
    deps: {
      neverBundle: ["react", "react-dom"],
    },
  }),
);
