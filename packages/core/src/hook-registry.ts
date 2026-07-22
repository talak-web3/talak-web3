import type { IHookRegistry, Logger } from "@talak-web3/types";

type AnyHandler = (data: unknown) => void;

export class HookRegistry<Events extends Record<string, unknown>> implements IHookRegistry<Events> {
  private readonly map = new Map<keyof Events, Set<AnyHandler>>();

  constructor(private readonly logger?: Logger) {}

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
        if (this.logger) {
          this.logger.error(`[HookRegistry] Error in handler for "${String(event)}":`, err);
        } else {
          console.error(`[HookRegistry] Error in handler for "${String(event)}":`, err);
        }
      }
    }
  }

  clear(): void {
    this.map.clear();
  }
}
