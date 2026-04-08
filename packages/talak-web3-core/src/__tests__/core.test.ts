import { describe, it, expect, vi, beforeEach } from 'vitest';
import { betterWeb3, __resetBetterWeb3 } from '../index';

describe('betterWeb3', () => {
  beforeEach(() => {
    __resetBetterWeb3();
  });

  it('should initialize with default config', () => {
    const instance = betterWeb3();
    expect(instance.config).toBeDefined();
    expect(instance.hooks).toBeDefined();
    expect(instance.context).toBeDefined();
  });

  it('should be a singleton', () => {
    const instance1 = betterWeb3({ key: '1' });
    const instance2 = betterWeb3({ key: '2' });
    expect(instance1).toBe(instance2);
  });

  it('should setup plugins during init', async () => {
    const setup = vi.fn();
    const plugin = {
      name: 'test-plugin',
      version: '1.0.0',
      setup
    };

    // Need to reset singleton for this test
    // In a real scenario we might have a reset method for testing
    const instance = betterWeb3({ plugins: [plugin] });
    await instance.init();

    expect(setup).toHaveBeenCalledWith(instance.context);
    expect(instance.context.plugins.get('test-plugin')).toBe(plugin);
  });
});
