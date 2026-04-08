# Security Architecture

This document describes the security architecture of talak-web3, including threat models, security controls, and best practices.

## Security Principles

1. **Fail-Closed**: The system fails securely rather than exposing users to risk
2. **Defense in Depth**: Multiple layers of security controls
3. **Least Privilege**: Minimal permissions required for operations
4. **Zero Trust**: Verify everything, trust nothing implicitly

## Threat Model

### STRIDE Analysis

| Threat | Description | Mitigation |
|--------|-------------|------------|
| **Spoofing** | Attacker impersonates legitimate user | SIWE signatures, JWT validation |
| **Tampering** | Modification of data in transit | HTTPS, signature verification |
| **Repudiation** | User denies performing an action | Audit logging, non-repudiable signatures |
| **Information Disclosure** | Unauthorized access to sensitive data | Encryption at rest and in transit |
| **Denial of Service** | System unavailability | Rate limiting, circuit breakers |
| **Elevation of Privilege** | Unauthorized access elevation | RBAC, permission checks |

### Attack Surface

```
┌─────────────────────────────────────────────────────────────┐
│                      Attack Surface                          │
├─────────────────────────────────────────────────────────────┤
│  Client Layer    │  Wallet Connections, SIWE Signatures     │
├─────────────────────────────────────────────────────────────┤
│  API Layer       │  REST/WebSocket Endpoints, Auth Headers  │
├─────────────────────────────────────────────────────────────┤
│  Service Layer   │  Session Management, Token Validation    │
├─────────────────────────────────────────────────────────────┤
│  Data Layer      │  Redis, Database, External APIs          │
├─────────────────────────────────────────────────────────────┤
│  Network Layer   │  RPC Providers, Blockchain Nodes         │
└─────────────────────────────────────────────────────────────┘
```

## Security Controls

### Authentication

- **SIWE (EIP-4361)**: Cryptographic proof of wallet ownership
- **JWT Access Tokens**: Short-lived tokens (15 minutes)
- **Refresh Tokens**: Long-lived tokens with rotation
- **Nonce Management**: Single-use nonces with expiration

### Session Security

```typescript
// Secure session configuration
const sessionConfig = {
  accessTokenTTL: 900,        // 15 minutes
  refreshTokenTTL: 604800,    // 7 days
  nonceTTL: 300,              // 5 minutes
  maxConcurrentSessions: 5,
  requireMFA: false,
};
```

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/nonce` | 10 | 1 minute |
| `/auth/verify` | 5 | 1 minute |
| `/auth/refresh` | 10 | 1 minute |
| `/rpc/*` | 100 | 1 minute |
| General API | 1000 | 1 hour |

### Input Validation

All inputs are validated using Zod schemas:

```typescript
const SIWEMessageSchema = z.object({
  domain: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  statement: z.string().max(140).optional(),
  uri: z.string().url(),
  version: z.literal('1'),
  chainId: z.number().positive(),
  nonce: z.string().regex(/^[a-zA-Z0-9]{8,}$/),
  issuedAt: z.string().datetime(),
  expirationTime: z.string().datetime().optional(),
  notBefore: z.string().datetime().optional(),
  requestId: z.string().uuid().optional(),
  resources: z.array(z.string().url()).optional(),
});
```

## Cryptographic Practices

### Key Management

- JWT secrets: 256-bit minimum, rotated every 90 days
- Database encryption: AES-256-GCM
- Key derivation: PBKDF2 with 100,000 iterations

### Signature Verification

```typescript
// EIP-191 personal sign verification
const isValid = await verifyMessage({
  address: message.address,
  message: message.toMessage(),
  signature: signature,
});
```

## Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Audit Logging

All security-relevant events are logged:

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| Login Success | Address, IP, User-Agent, Timestamp | 90 days |
| Login Failure | Address, IP, Reason, Timestamp | 90 days |
| Token Refresh | Session ID, IP, Timestamp | 90 days |
| Logout | Session ID, Timestamp | 90 days |
| Permission Denied | Resource, Action, Address | 90 days |
| Rate Limit Hit | Endpoint, IP, Timestamp | 30 days |

## Vulnerability Disclosure

We follow responsible disclosure:

1. Report vulnerabilities to security@talak.dev
2. Allow 90 days for remediation before public disclosure
3. Credit researchers in security advisories
4. Maintain CVE records for critical issues

## Compliance

- **GDPR**: Right to erasure, data portability
- **CCPA**: Consumer privacy rights
- **SOC 2**: Security controls (in progress)

## Security Checklist

- [ ] HTTPS everywhere
- [ ] Secure session configuration
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Output encoding
- [ ] CSRF protection
- [ ] Security headers configured
- [ ] Dependency scanning
- [ ] Secrets management
- [ ] Audit logging
- [ ] Incident response plan
