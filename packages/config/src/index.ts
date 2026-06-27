import { TalakWeb3Error, CONFIG_ERROR_CODES } from "@talak-web3/errors";

import { TalakWeb3ConfigSchema, type TalakWeb3Config } from "./schema";

export * from "./schema";

export * from "./presets";

export function validateConfig(input: unknown): TalakWeb3Config {
  const result = TalakWeb3ConfigSchema.safeParse(input || {});

  if (!result.success) {
    throw new TalakWeb3Error("Invalid config", {
      code: CONFIG_ERROR_CODES.INVALID,
      status: 400,
      cause: result.error,
    });
  }

  return result.data;
}
