# Type-Only Packages Decision

## Analysis

Three packages export only TypeScript types/interfaces with zero implementation:

1. **talak-web3-ai** (26 lines) - AI agent types
2. **talak-web3-analytics** (11 lines) - Analytics event types
3. **talak-web3-orgs** (12 lines) - Organization types

## Problems with Publishing Type-Only Packages

1. **Unusual Practice**: npm is not typically used for type-only packages
2. **Consumer Confusion**: Users expect implementations, not just types
3. **Maintenance Overhead**: Separate versioning, publishing, documentation
4. **Dependency Bloat**: Consumers install 3 extra packages for types
5. **No Value Add**: Types can be exported from existing packages

## Decision: Merge into @talak-web3/types

### Rationale

- `@talak-web3/types` already exists as the central type package
- All three packages are purely type definitions
- Consolidation reduces maintenance burden
- Consumers already depend on @talak-web3/types
- No breaking changes if we re-export from both locations temporarily

### Migration Plan

#### Phase 1: Merge (Current)
Move all types into `@talak-web3/types` and re-export from original packages for backward compatibility.

#### Phase 2: Deprecate (Next Major Version)
Add deprecation warnings to the original packages.

#### Phase 3: Remove (Future Major Version)
Unpublish the type-only packages.

## Implementation

All types have been moved to `packages/talak-web3-types/src/index.ts` and the original packages now re-export from there.

### New Structure

```typescript
// @talak-web3/types (central location)
export type AgentRunInput = { ... }
export type AgentRunOutput = { ... }
export interface AiAgent { ... }
export type ToolDefinition = { ... }
export type AnalyticsEvent = { ... }
export interface AnalyticsSink { ... }
export type Role = "member" | "admin" | "owner"
export type Organization = { ... }
export interface OrgGate { ... }

// talak-web3-ai (backward compatible re-export)
export * from '@talak-web3/types';

// talak-web3-analytics (backward compatible re-export)
export * from '@talak-web3/types';

// talak-web3-orgs (backward compatible re-export)
export * from '@talak-web3/types';
```

## Benefits

✅ Single source of truth for all types
✅ Reduced package count (28 → 25)
✅ Simpler dependency management
✅ Better discoverability
✅ No breaking changes (re-exports maintain compatibility)
✅ Consumers can import from either location

## When to Separate Packages

Type-only packages should only be separate if:
1. They're extremely large (>1000 lines of types)
2. They have different versioning requirements
3. They're optional and rarely used
4. They're experimental/unstable

None of these conditions apply to ai, analytics, or orgs types.
