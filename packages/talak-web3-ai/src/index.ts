export type AgentRunInput = {
  prompt: string;
  tools?: ToolDefinition[];
};

export type AgentRunOutput = {
  text: string;
  toolCalls?: Array<{ tool: string; input: unknown; output?: unknown }>;
};

export interface AiAgent {
  run(input: AgentRunInput): Promise<AgentRunOutput>;
  /** Streaming run that yields incremental text deltas. */
  runStream?(input: AgentRunInput): AsyncIterable<{ type: 'text-delta'; delta: string } | { type: 'done'; output: AgentRunOutput }>;
}

export type ToolDefinition = {
  name: string;
  description?: string;
  /** JSON schema parameters (OpenAI tool format). */
  parameters: Record<string, unknown>;
  handler: (input: unknown) => Promise<unknown>;
};

export * from './plugin';
