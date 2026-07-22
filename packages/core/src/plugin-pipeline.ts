import { TalakWeb3Error, PLUGIN_ERROR_CODES } from "@talak-web3/errors";
import type { TalakWeb3Context, TalakWeb3Plugin } from "@talak-web3/types";

export function resolvePluginOrder(plugins: Iterable<TalakWeb3Plugin>): TalakWeb3Plugin[] {
  const entries = Array.from(plugins);
  const nameMap = new Map<string, TalakWeb3Plugin>();
  for (const p of entries) {
    nameMap.set(p.name, p);
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const sorted: TalakWeb3Plugin[] = [];

  function visit(plugin: TalakWeb3Plugin): void {
    if (visited.has(plugin.name)) return;
    if (visiting.has(plugin.name)) {
      throw new TalakWeb3Error(`Circular plugin dependency detected involving "${plugin.name}"`, {
        code: PLUGIN_ERROR_CODES.DUPLICATE,
        status: 500,
      });
    }
    visiting.add(plugin.name);

    for (const dep of plugin.dependencies ?? []) {
      const depPlugin = nameMap.get(dep);
      if (!depPlugin) {
        throw new TalakWeb3Error(`Plugin "${plugin.name}" requires missing dependency "${dep}"`, {
          code: PLUGIN_ERROR_CODES.INVALID,
          status: 400,
        });
      }
      visit(depPlugin);
    }

    visiting.delete(plugin.name);
    visited.add(plugin.name);
    sorted.push(plugin);
  }

  for (const plugin of entries) {
    visit(plugin);
  }

  return sorted;
}

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
