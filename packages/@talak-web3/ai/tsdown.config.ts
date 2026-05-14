import { defineConfig } from "tsdown";

import { talakWeb3Config } from "../../../tsdown.base.ts";

export default defineConfig(
  talakWeb3Config({
    entry: ["src/index.ts", "src/plugin.ts"],
  }),
);
