# Talak-Web3 Security Architecture & Threat Model

This document formalizes the security design, threat model (STRIDE), and compliance alignment for the Talak-Web3 project.

## 1. STRIDE Threat Model

| Threat                     | Definition                                | Mitigation                                                         |
| -------------------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| **S**poofing               | Attacker pretends to be a user or service | SIWE-based RS256 JWTs, Service-to-service request signing          |
| **T**ampering              | Unauthorized data modification            | Cryptographic chaining in audit logs, RS256 signatures for JWTs    |
| **R**epudiation            | User denies performing an action          | Immutable, tamper-evident audit logs with S3 Object Lock           |
| **I**nformation Disclosure | Sensitive data leakage                    | KMS-backed key management, zero private keys in memory             |
| **D**enial of Service      | System is made unavailable                | Adaptive rate limiting, Redis clusters separation, Priority queues |
| **E**levation of Privilege | User gains unauthorized access            | Strict JWT claim verification, Role-based policy engine            |

## 2. Key Compromise Protocol (Fail-Closed)

In the event of a key compromise, the system maintains a < 60-second recovery window:

1. **Emergency Purge**: `TalakWeb3Auth.emergencyKeyRotation()` removes all keys from JWKS.
2. **Global Invalidation**: Sets a `globalInvalidationAt` timestamp in Redis, invalidating all previously issued tokens.
3. **Cluster Isolation**: Revocation lists are stored in a dedicated Redis cluster to ensure high availability and containment.

## 3. Compliance Alignment

### SOC 2 / ISO 27001

- **Access Control**: SIWE + JWT (RS256) with remote KMS signing.
- **Audit Trails**: Immutable, cryptographically chained logs stored in WORM storage (S3 Object Lock).
- **Vulnerability Management**: Continuous dependency scanning and security auditing.

### GDPR / Privacy

- **Data Minimization**: No PII stored on-chain; minimal session metadata.
- **Data Deletion**: Configurable retention windows for audit logs and sessions.

## 4. Zero-Trust Internal Communication

Internal services use **signed headers** (`X-Talak-Internal-Auth`) for all inter-component requests. Every request is verified for:

- **Authentication**: Valid service secret.
- **Integrity**: Signature over method, path, and body.
- **Replay Protection**: Max skew validation (30s).

## 5. Third-Party Penetration Test Scope

For external validation, the following scope is defined for adversarial testing:

- **Auth Bypass**: Attempt to forge JWTs or bypass SIWE verification.
- **Race Conditions**: Exploit microtask queue interleaving during token rotation.
- **Rate Limit Evasion**: Bypass adaptive limiting via IP rotation or wallet correlation attacks.
- **Redis Abuse**: Attempt to gain access to unauthorized databases or clusters.
- **KMS Latency**: Inject failures to observe fail-closed behavior.
