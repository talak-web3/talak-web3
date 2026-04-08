# @talak-web3/identity

Decentralized identity management for Web3 applications.

## Installation

```bash
npm install @talak-web3/identity
# or
yarn add @talak-web3/identity
# or
pnpm add @talak-web3/identity
```

## Features

### DID Management

```typescript
import { createIdentityManager } from '@talak-web3/identity';

const identity = createIdentityManager({
  provider: 'ethereum',
});

// Create a DID
const did = await identity.createDID({
  address: '0x...',
});

// Resolve a DID
const doc = await identity.resolveDID('did:ethr:0x...');
```

### Verifiable Credentials

```typescript
// Issue a credential
const credential = await identity.issueCredential({
  subject: 'did:ethr:0x...',
  claims: {
    name: 'Alice',
    role: 'admin',
  },
});

// Verify a credential
const isValid = await identity.verifyCredential(credential);
```

### Profile Management

```typescript
// Get profile
const profile = await identity.getProfile('0x...');

// Update profile
await identity.updateProfile({
  name: 'Alice',
  avatar: 'https://...',
  bio: 'Web3 enthusiast',
});
```

## License

MIT
