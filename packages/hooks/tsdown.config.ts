import { defineConfig } from "tsdown";

import { talakWeb3Config } from "../../tsdown.base.ts";

export default defineConfig(
  talakWeb3Config({
    entry: {
      index: "src/index.ts",
      "hooks/use-account": "src/hooks/use-account.ts",
      "hooks/use-balance": "src/hooks/use-balance.ts",
    },
    platform: "neutral",
    deps: {
      neverBundle: ["react", "react-dom"],
    },
  }),
);
