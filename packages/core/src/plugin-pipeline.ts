import type { TalakWeb3Context, TalakWeb3Plugin } from "@talak-web3/types";

export async function runPluginBeforeHooks(
  plugins: Iterable<TalakWeb3Plugin>,
  request: Request,
  ctx: TalakWeb3Context,
): Promise<void> {
  for (const plugin of plugins) {
    if (plugin.onBeforeRequest) {
      await plugin.onBeforeRequest(request, ctx);
    }
  }
}

export async function runPluginAfterHooks(
  plugins: Iterable<TalakWeb3Plugin>,
  response: Response,
  ctx: TalakWeb3Context,
): Promise<void> {
  for (const plugin of plugins) {
    if (plugin.onAfterResponse) {
      await plugin.onAfterResponse(response, ctx);
    }
  }
}
