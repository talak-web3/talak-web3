import type { BetterWeb3Context, MiddlewareHandler } from '@talak-web3/types';
export declare class SecurityInvariant {
    static validateOrigin(ctx: BetterWeb3Context): void;
    static checkSecrets(config: unknown): void;
    static validateRpcParams(params: unknown[]): void;
}
export declare const securityMiddleware: MiddlewareHandler;
