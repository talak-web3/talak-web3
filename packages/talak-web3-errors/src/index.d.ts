export declare class BetterWeb3Error extends Error {
    readonly code: string;
    readonly status: number;
    readonly data?: unknown;
    readonly cause?: unknown;
    constructor(message: string, opts: {
        code: string;
        status?: number;
        cause?: unknown;
        data?: unknown;
    });
}
export declare class AuthError extends BetterWeb3Error {
    constructor(message?: string);
}
//# sourceMappingURL=index.d.ts.map