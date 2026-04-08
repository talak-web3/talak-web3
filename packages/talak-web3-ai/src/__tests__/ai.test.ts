import { describe, it, expect, beforeEach } from 'vitest';
import { betterWeb3 } from '@talak-web3/core';
import { BetterWeb3AiPlugin } from '@talak-web3/ai';

describe('AI Plugin', () => {
  let instance: any;

  beforeEach(() => {
    instance = betterWeb3();
    BetterWeb3AiPlugin.setup(instance.context);
  });

  it('should run AI prompt', async () => {
    const result = await instance.context.ai.run({ prompt: 'Hello AI' });
    expect(result.text).toContain('Hello AI');
  });

  it('should emit hooks on run', async () => {
    const events: string[] = [];
    instance.context.hooks.on('ai:run-start', () => events.push('start'));
    instance.context.hooks.on('ai:run-end', () => events.push('end'));

    await instance.context.ai.run({ prompt: 'Test hooks' });
    expect(events).toEqual(['start', 'end']);
  });

  it('should handle tool calls', async () => {
    const result = await instance.context.ai.run({ 
      prompt: 'Use tools', 
      tools: ['transfer'] 
    });
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].tool).toBe('transfer');
  });
});
