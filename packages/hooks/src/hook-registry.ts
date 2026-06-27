import type { IHookRegistry } from "@talak-web3/types";

type AnyHandler = (data: unknown) => void;

/**
 * A type-safe event registry.
 *
 * This file intentionally has zero React imports so consumers that only
 * need the event system (e.g. @talak-web3/core) can import it without
 * pulling in React.
 */
export class HookRegistry<Events extends Record<string, unknown>> implements IHookRegistry<Events> {
  private readonly map = new Map<keyof Events, Set<AnyHandler>>();

  on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): () => void {
    let handlers = this.map.get(event);
    if (!handlers) {
      handlers = new Set<AnyHandler>();
      this.map.set(event, handlers);
    }
    handlers.add(handler as AnyHandler);
    return () => this.off(event, handler);
  }

  off<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void {
    this.map.get(event)?.delete(handler as AnyHandler);
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const handlers = this.map.get(event);
    if (!handlers) return;
    for (const h of handlers) {
      try {
        h(data as unknown);
      } catch (err) {
        console.error(`[HookRegistry] Error in handler for "${String(event)}":`, err);
      }
    }
  }

  clear(): void {
    this.map.clear();
  }
}
