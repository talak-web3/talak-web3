import type { IHookRegistry, Logger } from "@talak-web3/types";

type AnyHandler = (data: unknown) => void;

/**
 * A type-safe event registry.
 */
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

  async emitAsync<K extends keyof Events>(event: K, data: Events[K]): Promise<void> {
    const handlers = this.map.get(event);
    if (!handlers || handlers.size === 0) return;
    const promises: Promise<void>[] = [];
    for (const h of handlers) {
      promises.push(
        Promise.resolve()
          .then(() => (h as (data: unknown) => void)(data as unknown))
          .catch((err) => {
            if (this.logger) {
              this.logger.error(`[HookRegistry] Async handler error:`, err);
            }
          }),
      );
    }
    await Promise.allSettled(promises);
  }

  clear(): void {
    this.map.clear();
  }
}
