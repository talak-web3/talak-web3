import { defineConfig } from "tsdown";

import { talakWeb3Config } from "../../tsdown.base.ts";

export default defineConfig(
  talakWeb3Config({
    entry: ["src/index.ts", "src/multichain.ts", "src/react.ts"],
    alias: {
      "@talak-web3/core": "../../@talak-web3/core/dist/index.mjs",
      "@talak-web3/auth": "../../@talak-web3/auth/dist/index.mjs",
      "@talak-web3/client": "../../@talak-web3/client/dist/index.mjs",
      "@talak-web3/config": "../../@talak-web3/config/dist/index.mjs",
      "@talak-web3/hooks": "../../@talak-web3/hooks/dist/index.mjs",
      "@talak-web3/types": "../../@talak-web3/types/dist/index.mjs",
      "@talak-web3/errors": "../../@talak-web3/errors/dist/index.mjs",
      "@talak-web3/middleware": "../../@talak-web3/middleware/dist/index.mjs",
      "@talak-web3/rpc": "../../@talak-web3/rpc/dist/index.mjs",
      "@talak-web3/utils": "../../@talak-web3/utils/dist/index.mjs",
    },
    deps: {
      neverBundle: ["react", "react-dom", "viem", "jose", "ioredis", "zod"],
    },
  }),
);
