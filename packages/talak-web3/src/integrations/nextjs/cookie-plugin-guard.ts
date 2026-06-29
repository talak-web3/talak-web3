import type { TalakWeb3Context } from "@talak-web3/types";

/**
 * Warns when a cookie integration plugin is not effectively last.
 *
 * A plugin is considered misordered when there is at least one other plugin
 * after it in the `plugins` array that declares `onAfterResponse`, since those
 * hooks can set cookies that this integration will not see.
 */
export function warnIfCookiePluginNotLast(ctx: TalakWeb3Context, pluginId: string): void {
  const plugins = Array.from(ctx.plugins.values());
  if (plugins.length === 0) return;

  const index = plugins.findIndex((p) => p.name === pluginId);
  if (index === -1) return;

  const pluginsAfter = plugins.slice(index + 1);
  const hasAfterHooksAfter = pluginsAfter.some((p) => typeof p.onAfterResponse === "function");

  if (!hasAfterHooksAfter) return;

  ctx.logger.warn(
    `[talak-web3] Cookie integration plugin "${pluginId}" should be placed last in the plugins array. ` +
      "Plugins with `onAfterResponse` running after it may set cookies that are not forwarded to the framework cookie store. " +
      "Move your cookie integration plugin to the end of the `plugins` array to avoid missing `Set-Cookie` headers.",
  );
}
