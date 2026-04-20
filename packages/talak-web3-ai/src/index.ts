/**
 * @deprecated This package is now a re-export from @talak-web3/types.
 * Import directly from @talak-web3/types instead.
 * This package will be removed in the next major version.
 */

export {
  type AgentRunInput,
  type AgentRunOutput,
  type AiAgent,
  type ToolDefinition,
} from "@talak-web3/types";

// Re-export plugin if it exists
export * from "./plugin";
