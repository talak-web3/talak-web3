/**
 * Next.js template Talak config.
 *
 * DEVELOPMENT: uses in-memory stores (not multi-instance safe).
 * PRODUCTION: set REDIS_URL and switch to Redis stores from @talak-web3/auth/stores.
 * createTalakWeb3 / talakWeb3 will refuse InMemory stores when NODE_ENV=production.
 */
import {
  InMemoryNonceStore,
  InMemoryRefreshStore,
  InMemoryRevocationStore,
} from "@talak-web3/auth";
import { talakWeb3 } from "talak-web3";
import { nextCookies } from "talak-web3/nextjs";

const isProduction = process.env.NODE_ENV === "production";

function createAuthStores() {
  if (isProduction) {
    // Production: require Redis-backed stores (install ioredis + use @talak-web3/auth/stores).
    // Example:
    //   import Redis from "ioredis";
    //   import { RedisNonceStore, RedisRefreshStore, RedisRevocationStore } from "@talak-web3/auth/stores";
    //   const redis = new Redis(process.env.REDIS_URL!);
    //   return { nonceStore: new RedisNonceStore({ redis }), ... };
    throw new Error(
      "[talak-web3] Production requires Redis auth stores. See @talak-web3/auth README and set REDIS_URL.",
    );
  }
  console.warn(
    "[talak-web3] Using InMemory auth stores — development only. Use Redis stores in production.",
  );
  return {
    nonceStore: new InMemoryNonceStore(),
    refreshStore: new InMemoryRefreshStore(),
    revocationStore: new InMemoryRevocationStore(),
  };
}

export const app = talakWeb3({
  chains: [
    {
      id: 1,
      name: "Ethereum",
      rpcUrls: ["https://cloudflare-eth.com"],
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    },
  ],
  auth: {
    domain: process.env.SIWE_DOMAIN || "localhost:3000",
    ...createAuthStores(),
  },
  plugins: [nextCookies()],
});
