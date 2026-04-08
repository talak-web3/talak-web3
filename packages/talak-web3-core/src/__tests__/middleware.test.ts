import { describe, it, expect, vi, beforeEach } from 'vitest';
import { betterWeb3, __resetBetterWeb3 } from '../index';
import type { MiddlewareHandler } from '@talak-web3/types';

describe('betterWeb3 middleware', () => {
  beforeEach(() => {
    __resetBetterWeb3();
  });

  it('should execute request middleware chain', async () => {
    const instance = betterWeb3();
    const order: string[] = [];

    const m1: MiddlewareHandler = async (req, next) => {
      order.push('m1-start');
      const res = await next();
      order.push('m1-end');
      return res;
    };

    const m2: MiddlewareHandler = async (req, next) => {
      order.push('m2-start');
      const res = await next();
      order.push('m2-end');
      return res;
    };

    instance.context.requestChain.use(m1);
    instance.context.requestChain.use(m2);

    const finalHandler = async () => {
      order.push('final');
      return { success: true };
    };

    const result = await instance.context.requestChain.execute({ data: 'test' }, instance.context, finalHandler);

    expect(result).toEqual({ success: true });
    expect(order).toEqual(['m1-start', 'm2-start', 'final', 'm2-end', 'm1-end']);
  });
});
