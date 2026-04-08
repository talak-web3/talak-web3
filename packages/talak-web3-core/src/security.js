import { BetterWeb3Error } from '@talak-web3/errors';
export class SecurityInvariant {
    static validateOrigin(ctx) {
        const allowed = ctx.config.allowedOrigins;
        if (typeof window !== 'undefined' && allowed && allowed.length > 0) {
            const origin = window.location.origin;
            if (!allowed.includes(origin)) {
                throw new BetterWeb3Error(`Unauthorized origin: ${origin}`, {
                    code: 'SECURITY_UNAUTHORIZED_ORIGIN',
                    status: 403,
                });
            }
        }
    }
    static checkSecrets(config) {
        if (typeof config !== 'object' || config === null)
            return;
        const configStr = JSON.stringify(config);
        // Match 64-char hex strings prefixed with 0x (private key pattern) but not 40-char addresses
        const matches = configStr.match(/0x[a-fA-F0-9]{64}/g);
        if (matches) {
            throw new BetterWeb3Error('Potential private key leak detected in config', {
                code: 'SECURITY_SECRET_LEAK',
                status: 400,
            });
        }
    }
    static validateRpcParams(params) {
        // Guard against prototype pollution in RPC parameters
        const serialized = JSON.stringify(params);
        if (serialized.includes('__proto__') || serialized.includes('constructor')) {
            throw new BetterWeb3Error('Disallowed parameter key detected', {
                code: 'SECURITY_INVALID_PARAM',
                status: 400,
            });
        }
    }
}
export const securityMiddleware = async (req, next, ctx) => {
    SecurityInvariant.validateOrigin(ctx);
    return next();
};
//# sourceMappingURL=security.js.map