# Talak-Web3 Authentication Threat Model

## Document Purpose

This document defines the **security contract** for the talak-web3 authentication system. It explicitly states what the system protects, what it assumes, and what it does not guarantee.

**Without this contract, the system will be misused.**

---

## System Overview

Talak-web3 provides wallet-based authentication (SIWE) for decentralized applications with:
- Short-lived JWT access tokens (15 min)
- Opaque refresh tokens (7 days)
- Atomic nonce consumption for replay prevention
- Distributed key revocation
- Token binding to client context (IP + User-Agent)

---

## Assets (What We Protect)

| Asset | Criticality | Impact if Compromised |
|-------|-------------|----------------------|
| **JWT signing keys** (active + rotated) | CRITICAL | Attacker can forge arbitrary tokens |
| **Nonce state** (pending + consumed) | HIGH | Replay attacks possible if lost |
| **Revocation state** (JTI blacklist) | HIGH | Revoked tokens remain valid |
| **Time authority offsets** | MEDIUM | Token expiration manipulation |
| **Refresh tokens** (opaque) | HIGH | Session hijacking |
| **User wallet addresses** | MEDIUM | Identity correlation |

---

## Trust Boundaries

### 1. Application ↔ Redis

```
┌─────────────────┐         ┌──────────────┐
│  Application    │◄───────►│    Redis     │
│  (trusted)      │  TCP    │  (semi-       │
│                 │         │   trusted)    │
└─────────────────┘         └──────────────┘
```

**Trust assumptions**:
- Redis is on private network
- Redis AUTH enabled
- Redis nodes are not actively malicious (crash faults only)
- Network is not intercepted (no TLS if localhost)

**Violations if**:
- Redis accessible from public internet
- Attacker controls Redis node
- Network traffic intercepted (no TLS)

### 2. Application ↔ Time Sources

```
┌─────────────────┐         ┌──────────────┐
│  Application    │         │  Time Source │
│  (trusted)      │◄────────│  (untrusted) │
│                 │  HTTPS  │  Cloudflare  │
└─────────────────┘         │  Google      │
                            └──────────────┘
```

**Trust assumptions**:
- HTTPS connections not intercepted
- Time sources not colluding
- DNS resolution not poisoned

**Violations if**:
- Enterprise MITM proxy intercepts TLS
- All time sources compromised simultaneously
- DNS poisoning redirects to malicious NTP

### 3. Build Pipeline ↔ Runtime

```
┌─────────────────┐         ┌──────────────┐
│  Build/Deploy   │────────►│   Runtime    │
│  (trusted)      │  image  │  (untrusted  │
│  pnpm install   │         │   after boot)│
└─────────────────┘         └──────────────┘
```

**Trust assumptions**:
- CI/CD pipeline not compromised
- Container images not tampered after build
- Lockfile integrity maintained
- npm packages not malicious

**Violations if**:
- Supply chain attack on dependencies
- Container registry compromised
- Runtime filesystem modified post-deployment

---

## Adversary Classes

### Level 1: Remote Attacker (No Infrastructure Access)

**Capabilities**:
- Intercept network traffic (public networks)
- Replay captured authentication requests
- Attempt brute-force attacks
- Exploit application vulnerabilities

**Protected Against**: ✅ YES
- Replay prevention (nonce consumption)
- Rate limiting (IP + address-based)
- Token binding (IP + User-Agent)
- Signature verification (SIWE)

**Attack scenarios mitigated**:
- Nonce replay from captured traffic
- Token theft and reuse from different context
- Brute-force SIWE signature attempts
- Session fixation attacks

### Level 2: Insider (Read-Only Infrastructure Access)

**Capabilities**:
- Monitor Redis traffic
- Read logs and metrics
- Observe network patterns
- Access monitoring dashboards

**Protected Against**: ✅ YES (mostly)
- Refresh tokens stored as SHA-256 hashes
- JWT signatures use RS256 (private key not in app)
- Nonces are opaque UUIDs
- Revocation state is append-only

**Residual risks**:
- Can observe authentication patterns (metadata)
- Can correlate IP addresses with wallet addresses
- Cannot forge tokens or bypass auth

### Level 3: Infrastructure Attacker (Redis/Node Control)

**Capabilities**:
- Control Redis nodes
- Modify Redis data
- Intercept application ↔ Redis traffic
- Restart application containers

**Protected Against**: ⚠️ PARTIALLY
- Crash faults tolerated (replication + WAIT)
- Byzantine behavior NOT tolerated
- Can delay but not prevent revocation (with WAIT)
- Can cause fail-closed (reject all auth)

**Residual risks**:
- **Can replay nonces** if controls Redis primary during failover
- **Can delay revocation** by controlling replication
- **Can cause denial of service** by rejecting all auth requests
- **Cannot forge tokens** (requires signing key)

**Mitigation**:
- Redis AUTH + private network
- Monitoring for anomalous Redis behavior
- Fail-closed behavior limits damage

### Level 4: Supply Chain Attacker

**Capabilities**:
- Compromise npm packages
- Modify container images
- Tamper with build pipeline
- Inject malicious dependencies

**Protected Against**: ⚠️ PARTIALLY
- Runtime hash verification detects tampering
- Object.freeze prevents prototype poisoning
- Periodic integrity checks catch post-load compromise
- **Cannot prevent pre-execution compromise**

**Residual risks**:
- Compromised package runs with full privileges
- Detection occurs after module loading
- Native addons bypass JavaScript checks

**Mitigation**:
- Lockfile verification (`pnpm install --frozen-lockfile`)
- Container image signing (external to app)
- CI/CD pipeline security (external to app)

---

## Security Invariants

### I2: Nonce Single-Use Durability

**Invariant**: A nonce is valid IFF it does NOT exist in the consumed set.

**Implementation**:
- Append-only consumed set (SADD, no DEL)
- WAIT replication acknowledgment
- Atomic Lua script verification

**Failure mode**: Redis partition during failover (~1-5s window)

**Detection**: `nonce_reuse_detected_total` metric

---

### I4: Distributed Key Revocation

**Invariant**: Revoked tokens are rejected within bounded time (Δ < 100ms) across all instances.

**Implementation**:
- Primary-only reads (no replica reads)
- WAIT replication on revocation
- Pub/Sub for performance optimization

**Failure mode**: New primary hasn't received revocation yet during failover

**Detection**: `revocation_pubsub_lag_ms`, `revocation_redis_fallback_total`

---

### I6: Time Trust Integrity

**Invariant**: Time is monotonically non-decreasing with bounded drift (±5s) across all nodes.

**Implementation**:
- Cluster-wide monotonic floor persisted to Redis
- Multi-source HTTP time verification
- Drift detection fails closed

**Failure mode**: All time sources collude or MITM intercepts all HTTPS

**Detection**: `time_drift_ms`, `monotonic_violation_total`

---

### I7: Token Binding

**Invariant**: Token is valid IFF presented from same client context (IP subnet + User-Agent).

**Implementation**:
- SHA-256 hash of IP + User-Agent stored in JWT
- /30 subnet tolerance for NAT (IPv4)
- /64 subnet for IPv6

**Failure mode**: User changes network mid-session (legitimate)

**Detection**: `AUTH_TOKEN_CONTEXT_MISMATCH` errors

---

### I10: Supply Chain Integrity

**Invariant**: All executed code matches verified hashes.

**Implementation**:
- Runtime hash verification of critical dependencies
- Object.freeze on critical prototypes
- Periodic integrity checks every 5 minutes

**Failure mode**: Pre-execution compromise (loader, resolver, native addons)

**Detection**: `integrity_check_failures_total`

---

## Failure Assumptions

### Tolerated Faults

✅ **Crash faults** — nodes stop responding
- Redis crash → fail closed (reject auth)
- Application crash → state recovered from Redis
- Network partition → fail closed (reject auth)

✅ **Replication lag** — delayed data propagation
- WAIT ensures acknowledgment before return
- Bounds lag to <100ms under healthy cluster

✅ **Time source unavailability** — one or more sources fail
- Multiple sources provide redundancy
- Last known offset used if all fail

### NOT Tolerated

❌ **Byzantine faults** — nodes behave maliciously
- Redis node returns incorrect data
- Time source lies about current time
- Application node modified at runtime

❌ **Consensus failures** — split-brain scenarios
- Multiple primaries accept conflicting writes
- Network partition creates divergent state

❌ **Pre-execution compromise** — tampered code loaded
- Malicious dependency in node_modules
- Modified container image
- Compromised build pipeline

---

## Residual Risks

### Risk 1: Redis Partition During Failover

- **Window**: ~1-5 seconds during primary election
- **Impact**: Potential nonce replay or revoked token acceptance
- **Probability**: LOW (requires specific timing)
- **Mitigation**: WAIT reduces probability; monitoring detects occurrence
- **Acceptance**: Rare, brief, detectable, recoverable
- **Monitoring**: `redis_wait_latency_ms` > 100ms

### Risk 2: Coordinated Time Source Compromise

- **Window**: Continuous (if all sources compromised)
- **Impact**: Token validity manipulation
- **Probability**: VERY LOW (requires nation-state level)
- **Mitigation**: Drift detection, monotonic guard, multiple sources
- **Acceptance**: Out of scope for typical threat models
- **Monitoring**: `time_drift_ms` > 5000ms

### Risk 3: Supply Chain Pre-Execution

- **Window**: Build/deployment pipeline
- **Impact**: Compromised code runs with full privileges
- **Probability**: LOW-MEDIUM (depends on CI/CD security)
- **Mitigation**: Lockfile verification, CI/CD controls, container scanning
- **Acceptance**: Shifted to deployment security (separate concern)
- **Monitoring**: `integrity_check_failures_total` > 0

### Risk 4: Byzantine Redis Node

- **Window**: Continuous (if node malicious)
- **Impact**: Arbitrary state manipulation
- **Probability**: VERY LOW (requires insider + access)
- **Mitigation**: Redis auth, network isolation, monitoring
- **Assumption**: Infrastructure is not actively malicious
- **Monitoring**: Anomalous Redis query patterns

---

## Explicit Non-Goals

This system **DOES NOT** provide:

### ❌ Linearizability

- **Why**: Requires consensus (Raft/Paxos), not replication
- **Impact**: Brief windows of stale reads during failover
- **Acceptable for**: Authentication (bounded risk)
- **Not acceptable for**: Financial transactions

### ❌ Byzantine Fault Tolerance

- **Why**: Assumes Redis nodes are not actively malicious
- **Impact**: Malicious Redis can bypass all auth checks
- **Mitigation**: Network isolation, access controls, monitoring
- **Upgrade path**: Migrate to etcd/Consul for BFT

### ❌ Pre-Execution Trust Guarantee

- **Why**: Runtime checks occur after module loading
- **Impact**: Compromised dependencies execute with full privileges
- **Mitigation**: CI/CD security, lockfile verification, container signing
- **Upgrade path**: Verified boot, signed modules, reproducible builds

### ❌ Global Total Ordering

- **Why**: Monotonic floor prevents rollback, doesn't ensure ordering
- **Impact**: Concurrent events may not be globally ordered
- **Acceptable for**: Authentication (causal ordering sufficient)
- **Upgrade path**: Hybrid Logical Clocks (HLC)

### ❌ Protection Against Nation-State Adversaries

- **Why**: Assumes infrastructure is not actively compromised
- **Impact**: State-level attacks may bypass controls
- **Mitigation**: HSM, TEE, verified boot (external to app)
- **Upgrade path**: Hardware security modules, confidential computing

---

## Security Contract

### System Guarantees (If Assumptions Hold)

✅ Replay attacks are **practically impossible** under normal operation
✅ Revoked tokens are rejected within **<100ms** (healthy cluster)
✅ Time manipulation is **detected and fails closed**
✅ Token theft is **mitigated by context binding**
✅ Dependency tampering is **detected post-load**
✅ All failures are **fail-closed** (prefer downtime over compromise)

### System Requires (From Operators)

⚠️ Redis configured with `appendonly yes` + `appendfsync everysec`
⚠️ Redis Cluster with `min-replicas-to-write 1`
⚠️ Redis AUTH enabled on private network
⚠️ Monitoring deployed for all invariant metrics
⚠️ Alerting configured for all failure modes
⚠️ CI/CD pipeline secured separately
⚠️ Container images signed and verified

### System Does Not Guarantee

❌ Protection if Redis is actively malicious
❌ Linearizable state under network partitions
❌ Pre-execution code integrity
❌ Availability during infrastructure failures

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-20 | Initial threat model with I2/I4/I6/I10 invariants |

---

## Acknowledgments

This threat model explicitly distinguishes between:
- **Implementation flaws** (fixed)
- **Architectural limits** (documented)
- **Operational requirements** (specified)

The system is **complete relative to this threat model**. Violating the assumptions voids the guarantees.
