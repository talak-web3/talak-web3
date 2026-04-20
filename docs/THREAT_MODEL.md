# Threat Model

This document provides a comprehensive threat model for talak-web3 using the STRIDE methodology.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         talak-web3 System                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐     │
│  │   Client    │◄────►│   Server    │◄────►│   Redis     │     │
│  │  (Browser)  │      │  (Node.js)  │      │  (Session)  │     │
│  └─────────────┘      └──────┬──────┘      └─────────────┘     │
│                              │                                   │
│                              ▼                                   │
│                       ┌─────────────┐                           │
│                       │ RPC Provider│                           │
│                       │  (Alchemy)  │                           │
│                       └─────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Assets

| Asset            | Sensitivity | Owner          |
| ---------------- | ----------- | -------------- |
| JWT Secrets      | Critical    | Infrastructure |
| User Sessions    | High        | Infrastructure |
| Wallet Addresses | Medium      | Users          |
| Nonce Store      | High        | Infrastructure |
| RPC Credentials  | Critical    | Infrastructure |
| Audit Logs       | High        | Infrastructure |

## Threats by Category

### Spoofing (S)

| ID  | Threat                     | Risk   | Mitigation                               |
| --- | -------------------------- | ------ | ---------------------------------------- |
| S1  | Attacker impersonates user | High   | SIWE signature verification              |
| S2  | Fake RPC endpoint          | Medium | Certificate pinning, provider validation |
| S3  | Session hijacking          | High   | HTTP-only cookies, secure tokens         |
| S4  | Phishing domain            | Medium | Domain validation in SIWE                |

### Tampering (T)

| ID  | Threat                   | Risk   | Mitigation                      |
| --- | ------------------------ | ------ | ------------------------------- |
| T1  | Modify JWT payload       | High   | HMAC signature verification     |
| T2  | Tamper with nonce store  | High   | Redis AUTH, network isolation   |
| T3  | Man-in-the-middle attack | High   | TLS 1.3, certificate validation |
| T4  | Modify transaction data  | Medium | Client-side signing             |

### Repudiation (R)

| ID  | Threat                  | Risk   | Mitigation                      |
| --- | ----------------------- | ------ | ------------------------------- |
| R1  | User denies login       | Low    | SIWE signature (non-repudiable) |
| R2  | User denies transaction | Low    | On-chain transaction record     |
| R3  | Admin denies action     | Medium | Audit logging with signatures   |

### Information Disclosure (I)

| ID  | Threat                  | Risk     | Mitigation                   |
| --- | ----------------------- | -------- | ---------------------------- |
| I1  | JWT secret exposure     | Critical | Secrets management, rotation |
| I2  | Session data leak       | High     | Encryption at rest           |
| I3  | RPC credentials leak    | Critical | Environment variables, vault |
| I4  | Error message info leak | Medium   | Generic error messages       |
| I5  | Timing attacks          | Low      | Constant-time comparisons    |

### Denial of Service (D)

| ID  | Threat                | Risk   | Mitigation                      |
| --- | --------------------- | ------ | ------------------------------- |
| D1  | Nonce exhaustion      | Medium | Rate limiting, nonce cleanup    |
| D2  | Session flooding      | Medium | Rate limiting, max sessions     |
| D3  | RPC provider overload | Medium | Health checks, caching, retries |
| D4  | Computation DoS       | Medium | Input size limits, timeouts     |

### Elevation of Privilege (E)

| ID  | Threat                    | Risk     | Mitigation                     |
| --- | ------------------------- | -------- | ------------------------------ |
| E1  | Token scope escalation    | High     | Strict token claims validation |
| E2  | Admin impersonation       | Critical | Multi-factor authentication    |
| E3  | Privilege inheritance bug | Medium   | Principle of least privilege   |

## Attack Trees

### Attack Tree: Session Hijacking

```
Session Hijacking
├── Steal JWT Token
│   ├── XSS Attack
│   │   └── Mitigation: CSP, output encoding
│   ├── Network Sniffing
│   │   └── Mitigation: HTTPS only
│   └── Browser Extension Malware
│       └── Mitigation: N/A (client-side)
├── Forge JWT Token
│   ├── Crack JWT Secret
│   │   └── Mitigation: Strong secrets (256-bit)
│   └── Algorithm Confusion
│       └── Mitigation: Explicit algorithm
└── Refresh Token Theft
    └── Mitigation: Token rotation, binding
```

### Attack Tree: SIWE Bypass

```
SIWE Bypass
├── Replay Attack
│   └── Mitigation: Nonce consumption
├── Signature Forgery
│   └── Mitigation: ECDSA verification
├── Message Tampering
│   └── Mitigation: Signature covers message
└── Weak Randomness
    └── Mitigation: CSPRNG for nonces
```

## Risk Assessment Matrix

| Likelihood \ Impact | Low | Medium | High   | Critical |
| ------------------- | --- | ------ | ------ | -------- |
| **High**            | Low | Medium | High   | Critical |
| **Medium**          | Low | Medium | High   | High     |
| **Low**             | Low | Low    | Medium | Medium   |
| **Rare**            | Low | Low    | Low    | Medium   |

## Risk Acceptance

| Risk                      | Status   | Justification                        |
| ------------------------- | -------- | ------------------------------------ |
| Browser extension malware | Accepted | Out of scope (client-side)           |
| Social engineering        | Accepted | Requires user education              |
| Quantum computing         | Accepted | Future concern (post-quantum crypto) |

## Security Requirements

### Functional Requirements

1. All authentication must use SIWE
2. Sessions must expire after 15 minutes (access token)
3. Nonces must be single-use with 5-minute expiration
4. All RPC calls must be authenticated
5. Rate limiting must be enforced

### Non-Functional Requirements

1. 99.99% uptime for authentication services
2. <100ms latency for token validation
3. Zero critical vulnerabilities in dependencies
4. 100% test coverage for security-critical code

## Review Schedule

- **Quarterly**: Full threat model review
- **Monthly**: Dependency vulnerability scan
- **Weekly**: Security log review
- **Daily**: Automated security alerts

## References

- [OWASP Threat Modeling](https://owasp.org/www-community/Application_Threat_Modeling)
- [STRIDE](https://docs.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)
- [EIP-4361](https://eips.ethereum.org/EIPS/eip-4361)
