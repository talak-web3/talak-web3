# @talak-web3/utils

Utility functions for talak-web3.

## Installation

```bash
npm install @talak-web3/utils
pnpm add @talak-web3/utils
```

## Utilities

### Validation

```typescript
import { isHex, validateAddress, isValidHash, shortenAddress } from "@talak-web3/utils";

isHex("0xdeadbeef");                          // true
validateAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"); // true
isValidHash("0x" + "a".repeat(64));            // true
shortenAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"); // "0x742...0bEb"
```

### Deprecation

```typescript
import { deprecated } from "@talak-web3/utils";

deprecated("oldMethod()", "newMethod()"); // warns once per message
```

### Migration

```typescript
import { MigrationTool, SDKType } from "@talak-web3/utils";
```

### Other

```typescript
import { assertUnreachable, nowMs } from "@talak-web3/utils";

assertUnreachable(x); // compile-time exhaustiveness check
nowMs();              // Date.now() wrapper
```

## License

MIT
