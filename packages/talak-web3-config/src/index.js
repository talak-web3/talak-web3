import { BetterWeb3Error } from "@talak-web3/errors";
import { BetterWeb3ConfigSchema } from "./schema";
export * from "./schema";
export * from "./presets";
export function validateConfig(input) {
    const result = BetterWeb3ConfigSchema.safeParse(input || {});
    if (!result.success) {
        throw new BetterWeb3Error("Invalid config", {
            code: "CONFIG_INVALID",
            status: 400,
            cause: result.error
        });
    }
    return result.data;
}
//# sourceMappingURL=index.js.map