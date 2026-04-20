# @talak-web3/middleware

Middleware for authentication and authorization.

## Installation

```bash
npm install @talak-web3/middleware
# or
yarn add @talak-web3/middleware
# or
pnpm add @talak-web3/middleware
```

## Usage

### Authentication Middleware

```typescript
import { authMiddleware } from "@talak-web3/middleware";
import express from "express";

const app = express();

app.use(
  authMiddleware({
    secret: process.env.JWT_SECRET,
    issuer: "myapp.com",
  }),
);

// Protected route
app.get("/protected", (req, res) => {
  res.json({ address: req.user.address });
});
```

### Authorization Middleware

```typescript
import { requireRole } from "@talak-web3/middleware";

// Require specific role
app.post("/admin", requireRole("admin"), (req, res) => {
  // Only admins can access
});

// Require NFT ownership
app.post("/holder", requireNFT("0x1111111111111111111111111111111111111111"), (req, res) => {
  // Only NFT holders can access
});
```

### Rate Limiting

```typescript
import { rateLimit } from "@talak-web3/middleware";

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  }),
);
```

## License

MIT
