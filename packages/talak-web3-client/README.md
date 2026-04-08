# @talak-web3/client

HTTP client for talak-web3 API interactions.

## Installation

```bash
npm install @talak-web3/client
# or
yarn add @talak-web3/client
# or
pnpm add @talak-web3/client
```

## Usage

```typescript
import { createTalakClient } from '@talak-web3/client';

const client = createTalakClient({
  baseUrl: 'https://api.talak.dev',
  apiKey: process.env.TALAK_API_KEY,
});

// Make authenticated requests
const user = await client.get('/user/profile');
const tx = await client.post('/transactions', { ... });
```

## Features

- Automatic retries with exponential backoff
- Request/response interceptors
- Type-safe API calls
- Built-in error handling
- Request deduplication

## License

MIT
