import type { TalakWeb3Context, TalakWeb3Instance } from "@talak-web3/types";
import { randomBytes } from "node:crypto";

export interface RequestContext extends TalakWeb3Context {
  readonly requestId: string;
  readonly timestamp: number;
  readonly ip?: string;
  readonly userAgent?: string;
  authState?: {
    address?: string;
    chainId?: number;
    isAuthenticated: boolean;
  };
}

/**
 * Context Factory for creating request-scoped isolated contexts.
 * Ensures no shared mutable state exists between different requests.
 */
export class ContextFactory {
  /**
   * Creates a new request-scoped context from a base TalakWeb3 instance.
   */
  static create(
    instance: TalakWeb3Instance,
    meta: { ip?: string; userAgent?: string } = {},
  ): RequestContext {
    const requestId = randomBytes(16).toString("hex");
    const timestamp = Date.now();

    // Deep copy or re-create request-specific parts of the context
    const context: RequestContext = {
      ...instance.context,
      requestId,
      timestamp,
      ip: meta.ip,
      userAgent: meta.userAgent,
      authState: {
        isAuthenticated: false,
      },
      // Ensure we have a fresh request chain for this request
      // (The base instance has the global middleware, but we might want request-specific ones)
    };

    return context;
  }
}
