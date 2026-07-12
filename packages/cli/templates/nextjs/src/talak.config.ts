import {
  InMemoryNonceStore,
  InMemoryRefreshStore,
  InMemoryRevocationStore,
} from "@talak-web3/auth";
import { talakWeb3 } from "talak-web3";
import { nextCookies } from "talak-web3/nextjs";

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
    nonceStore: new InMemoryNonceStore(),
    refreshStore: new InMemoryRefreshStore(),
    revocationStore: new InMemoryRevocationStore(),
  },
  plugins: [nextCookies()],
});
