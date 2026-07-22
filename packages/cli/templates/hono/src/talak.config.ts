import { createTalakWeb3 } from "talak-web3";

export const app = createTalakWeb3({
  preset: "mainnet",
  auth: {
    domain: process.env.SIWE_DOMAIN || "localhost:3000",

    nonceStore: undefined as unknown,
    refreshStore: undefined as unknown,
    revocationStore: undefined as unknown,
  },
});

await app.init();
