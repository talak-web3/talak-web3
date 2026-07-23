import { generateKeyPair } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  InMemoryNonceStore,
  InMemoryRefreshStore,
  InMemoryRevocationStore,
  TalakWeb3Auth,
} from "../../index.js";

describe("C-002 refresh preserves context binding", () => {
  let auth: TalakWeb3Auth;
  let refreshStore: InMemoryRefreshStore;
  let privateKeyPem: string;
  let publicKeyPem: string;
  const prevPriv = process.env["JWT_PRIVATE_KEY"];
  const prevPub = process.env["JWT_PUBLIC_KEY"];

  beforeEach(async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256", {
      modulusLength: 2048,
      extractable: true,
    });
    // jose CryptoKey → export via subtle
    const { exportPKCS8, exportSPKI } = await import("jose");
    privateKeyPem = await exportPKCS8(privateKey);
    publicKeyPem = await exportSPKI(publicKey);
    process.env["JWT_PRIVATE_KEY"] = privateKeyPem;
    process.env["JWT_PUBLIC_KEY"] = publicKeyPem;

    refreshStore = new InMemoryRefreshStore();
    auth = new TalakWeb3Auth({
      nonceStore: new InMemoryNonceStore(),
      refreshStore,
      revocationStore: new InMemoryRevocationStore(),
      contextEnforcementDate: new Date("2020-01-01T00:00:00Z"),
      verifySignature: async () => true,
    });
  });

  afterEach(() => {
    if (prevPriv === undefined) delete process.env["JWT_PRIVATE_KEY"];
    else process.env["JWT_PRIVATE_KEY"] = prevPriv;
    if (prevPub === undefined) delete process.env["JWT_PUBLIC_KEY"];
    else process.env["JWT_PUBLIC_KEY"] = prevPub;
  });

  it("issues bound access token on refresh when context is provided", async () => {
    const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const context = { ip: "203.0.113.10", userAgent: "vitest" };
    const { token: refreshToken } = await refreshStore.create(address, 1, 60_000);

    const { accessToken } = await auth.refresh(refreshToken, context);
    await expect(auth.verifySession(accessToken, context)).resolves.toMatchObject({
      address: address.toLowerCase(),
      chainId: 1,
    });
  });

  it("rejects unbound access token after enforcement date when context required", async () => {
    const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const context = { ip: "203.0.113.10", userAgent: "vitest" };
    const { token: refreshToken } = await refreshStore.create(address, 1, 60_000);

    // refresh without context → no binding
    const { accessToken } = await auth.refresh(refreshToken);
    await expect(auth.verifySession(accessToken, context)).rejects.toThrow(/context|binding/i);
  });
});
