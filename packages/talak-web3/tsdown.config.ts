import { defineConfig } from "tsdown";

import { talakWeb3Config } from "../../tsdown.base.ts";

export default defineConfig(
  talakWeb3Config({
    entry: ["src/index.ts", "src/multichain.ts", "src/react.ts"],
    unbundle: false,
    deps: {
      alwaysBundle: [/@talak-web3\//],
      neverBundle: ["react", "react-dom", "viem", "jose", "ioredis", "zod"],
    },
  }),
);
