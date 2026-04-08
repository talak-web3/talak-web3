import type { BetterWeb3Context, IMiddlewareChain, MiddlewareHandler } from '@talak-web3/types';
export declare class MiddlewareChain<T = unknown, R = unknown> implements IMiddlewareChain<T, R> {
    private readonly middlewares;
    use(handler: MiddlewareHandler<T, R>): void;
    execute(req: T, ctx: BetterWeb3Context, finalHandler: () => Promise<R>): Promise<R>;
}
