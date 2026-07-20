import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  TalakWeb3Auth,
  InMemoryNonceStore,
  InMemoryRefreshStore,
  InMemoryRevocationStore,
} from "./index.js";
import { AuthoritativeTime } from "./time.js";

vi.mock("viem", () => ({
  verifyMessage: vi.fn(),
}));

import { verifyMessage } from "viem";
const mockVerify = vi.mocked(verifyMessage);

const TEST_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDnChNIYqDTb8cK
pSd8jUaprw0Nfkznngc3d1FxWna0K+j90z9LGcp1kGqh/R9H5OMUN9+FPQUyZ3mv
mT+EFJQe35+w0ogKCAW/LPI24Z7wkNNuYSJpHH6YZ5ppQ52d4mVkYm2CIMOqpu0l
jJgNWbMoirDgBJq+dzGnMzmXMPE5Mzik/YCO4VPjGoZCtYCNrp+YPCnWDg0sq0+u
40nyMMzK55s9iDIdohUBruJGH3wyWCyED2SQRx0zZ5tfNVriUooy81GKp+gV3mpF
AiH8yovlnOokD3+puS+Pep1gSyp6uwWlT1cbO4hrthUQO1CvDolpW0CSiHg9HXyI
mhuMl/0FAgMBAAECggEADDU51Mdos0C9g3LmbdF4OaNB3Q6T/owY2lswFD2BDAmi
73XlVbD4mUgxfjrmAieWa8fSWX5igynjtz3cKjzny7l/Z7mOzdA5NNi+5AaoHj2E
0oOy7LDAVrS+EbsB0ykhODyZh+NL0NKuXAonBv469ioyk4+4DoGKqoiizc9HURaU
U7bW+gGmh2MwIjuHlryyeblYiV39r4KCEqpNjf8pe/Y6QkWBNY7nd7jF47zHR783
JuyBgzcpO7ro1M2vUXb5+qhXkqKStPA1nuw3rc6OwdLLSo9kqIPnuAAofPHUdkTl
m48Wavt0Ax3nevBqDFp6GzOU9KxAL5lA+GY+b1iG+QKBgQD3zKWUM0ValPzF9lV2
7fWbdeyzQINu9/XzfONkA/GzUZVJuo3niMs1x7F/ZdK9iaIzWQnQHvxTZjsfFeuq
jJN/EeesyCYmyLWKAvtnCjn5b89EsrUXZOicGNyz/vXs1LTKZ1lq2vR3Urt68oGz
A9Nsk59H+cFo9SOA+2ZFc6Un3QKBgQDur3AKNfJkEGDGpLRs1nM1QF5Qv8BSSKEo
7VNDsKAXjICGPuQHV0gDlSwUsT7mmhYKp1Kzqodnw9YRRlkcpOY8EH47BC3vPuLD
2SMXhp8LaX86EESzMx+MfY531AfNzzlUYucx3ahJRSTFCrP63rM6Iidfxc1C7gAj
Vk8PPeurSQKBgHJuFqhxZL2Hv5LLRnw9NwYrVrsQN6Gu7+0Y5wjwqVTdf8skUxNw
oCadqOHj64WLYVPE8jshk/QPaY3ZWZLQh+xOIGYxpyyR0wOAjQfwOQVvFI/s1qOO
/bvX31NfkcFkGHi/cRNfOTVBB0Knai14vtGM+ikKtL37NgICFiBMXyAhAoGABG28
5nOZy8GCCi2EK4DPIm3PUjA8oUo3s0q0AM2GKumweM0x7fDwpSBfcQLY5+5z+j6g
ijTfzk0T674iaSWmH/cuYGnzcDz6eCfPPuCAkvWiJrGmlKyeKT0rJ44HlwoBRk+P
ep1iQfnGdOF99Wmsaae4k05YQKWp2v3++YlslgECgYEA7Id66uBfDZrmbpaBWzv7
1H4jgTN0Ypq1xWMSvfd+zN6tnV+ZFOpp3spbYHpfJHuS9EjrZfu7QtzUIv1lJITc
khcHWOwPAwV/I6XKWH7xhokbA7Y4gQ+5Uol/cpCXJtirQAyCMmQyPwkb0/YGPNlg
Ha9tn4eokufIOUwhS+PHyj8=
-----END PRIVATE KEY-----`;

const TEST_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5woTSGKg02/HCqUnfI1G
qa8NDX5M554HN3dRcVp2tCvo/dM/SxnKdZBqof0fR+TjFDffhT0FMmd5r5k/hBSU
Ht+fsNKICggFvyzyNuGe8JDTbmEiaRx+mGeaaUOdneJlZGJtgiDDqqbtJYyYDVmz
KIqw4ASavncxpzM5lzDxOTM4pP2AjuFT4xqGQrWAja6fmDwp1g4NLKtPruNJ8jDM
yuebPYgyHaIVAa7iRh98MlgshA9kkEcdM2ebXzVa4lKKMvNRiqfoFd5qRQIh/MqL
5ZzqJA9/qbkvj3qdYEsqersFpU9XGzuIa7YVEDtQrw6JaVtAkoh4PR18iJobjJf9
BQIDAQAB
-----END PUBLIC KEY-----`;

const DOMAIN = "localhost";
const ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const CHAIN_ID = 1;

function buildSiweMessage(
  nonce: string,
  domain = DOMAIN,
  address = ADDRESS,
  expiry?: Date,
): string {
  const expiryLine = expiry ? `\nExpiration Time: ${expiry.toISOString()}` : "";
  return (
    `${domain} wants you to sign in with your Ethereum account:\n` +
    `${address}\n` +
    `\nURI: http://${domain}\n` +
    `Version: 1\n` +
    `Chain ID: ${CHAIN_ID}\n` +
    `Nonce: ${nonce}\n` +
    `Issued At: ${new Date().toISOString()}` +
    expiryLine
  );
}

describe("InMemoryNonceStore", () => {
  let store: InMemoryNonceStore;

  beforeEach(() => {
    vi.useFakeTimers();

    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    store = new InMemoryNonceStore({ ttlMs: 5 * 60_000 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("creates a nonce that can be consumed once", async () => {
    const nonce = await store.create(ADDRESS);
    expect(typeof nonce).toBe("string");
    expect(nonce.length).toBeGreaterThan(0);
    expect(await store.consume(ADDRESS, nonce)).toBe(true);
  });

  it("nonce reuse → second consume returns false", async () => {
    const nonce = await store.create(ADDRESS);
    await store.consume(ADDRESS, nonce);
    expect(await store.consume(ADDRESS, nonce)).toBe(false);
  });

  it("expired nonce → consume returns false", async () => {
    const nonce = await store.create(ADDRESS);

    vi.advanceTimersByTime(5 * 60_000 + 1);
    expect(await store.consume(ADDRESS, nonce)).toBe(false);
  });

  it("unknown nonce → consume returns false", async () => {
    expect(await store.consume(ADDRESS, "deadbeef")).toBe(false);
  });

  it("concurrent consume → exactly one succeeds", async () => {
    const nonce = await store.create(ADDRESS);

    const results = await Promise.all(
      Array.from({ length: 8 }, () => store.consume(ADDRESS, nonce)),
    );
    const successes = results.filter(Boolean);
    expect(successes).toHaveLength(1);
  });

  it("constructor hard-caps TTL at 5 minutes", () => {
    const s = new InMemoryNonceStore({ ttlMs: 20 * 60_000 });

    expect((s as unknown as { ttlMs: number }).ttlMs).toBe(5 * 60_000);
  });
});

describe("InMemoryRefreshStore", () => {
  let store: InMemoryRefreshStore;

  beforeEach(() => {
    vi.useFakeTimers();
    store = new InMemoryRefreshStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const TTL = 7 * 24 * 60 * 60_000;

  it("creates a refresh token that can be looked up", async () => {
    const { token, session } = await store.create(ADDRESS, CHAIN_ID, TTL);
    expect(typeof token).toBe("string");
    expect(session.address).toBe(ADDRESS.toLowerCase());
    expect(session.chainId).toBe(CHAIN_ID);
    expect(session.revoked).toBe(false);
    const found = await store.lookup(token);
    expect(found?.address).toBe(ADDRESS.toLowerCase());
  });

  it("rotate returns a new token and revokes old", async () => {
    const { token: t1 } = await store.create(ADDRESS, CHAIN_ID, TTL);
    const { token: t2, session } = await store.rotate(t1, TTL);
    expect(t2).not.toBe(t1);
    expect(session.chainId).toBe(CHAIN_ID);

    const old = await store.lookup(t1);
    expect(old?.revoked).toBe(true);
  });

  it("refresh reuse → second rotate throws", async () => {
    const { token } = await store.create(ADDRESS, CHAIN_ID, TTL);
    await store.rotate(token, TTL);
    await expect(store.rotate(token, TTL)).rejects.toThrow();
  });

  it("expired refresh → rotate throws", async () => {
    const { token } = await store.create(ADDRESS, CHAIN_ID, 1000);
    vi.advanceTimersByTime(2000);
    await expect(store.rotate(token, TTL)).rejects.toThrow();
  });

  it("explicit revoke → revoked is true", async () => {
    const { token } = await store.create(ADDRESS, CHAIN_ID, TTL);
    await store.revoke(token);
    const session = await store.lookup(token);
    expect(session?.revoked).toBe(true);
  });

  it("lookup of unknown token returns null", async () => {
    expect(await store.lookup("notarealtoken")).toBeNull();
  });

  it("rotate on explicitly-revoked session throws", async () => {
    const { token } = await store.create(ADDRESS, CHAIN_ID, TTL);
    await store.revoke(token);
    await expect(store.rotate(token, TTL)).rejects.toThrow();
  });
});

describe("TalakWeb3Auth", () => {
  let nonceStore: InMemoryNonceStore;
  let refreshStore: InMemoryRefreshStore;
  let revocationStore: InMemoryRevocationStore;
  let auth: TalakWeb3Auth;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    process.env["JWT_PRIVATE_KEY"] = TEST_PRIVATE_KEY;
    process.env["JWT_PUBLIC_KEY"] = TEST_PUBLIC_KEY;
    nonceStore = new InMemoryNonceStore({ ttlMs: 5 * 60_000 });
    refreshStore = new InMemoryRefreshStore();
    revocationStore = new InMemoryRevocationStore();
    const timeSource = new AuthoritativeTime({ maxForwardJumpMs: Infinity });
    auth = new TalakWeb3Auth({
      expectedDomain: DOMAIN,
      nonceStore,
      refreshStore,
      revocationStore,
      timeSource,
    });

    mockVerify.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete process.env["JWT_PRIVATE_KEY"];
    delete process.env["JWT_PUBLIC_KEY"];
  });

  it("valid SIWE flow → returns accessToken and refreshToken", async () => {
    const nonce = await auth.createNonce(ADDRESS);
    const message = buildSiweMessage(nonce);
    const result = await auth.loginWithSiwe(message, "0xdeadbeef");
    expect(typeof result.accessToken).toBe("string");
    expect(typeof result.refreshToken).toBe("string");

    expect(result.accessToken.split(".").length).toBe(3);

    expect(result.refreshToken.split(".").length).not.toBe(3);
  });

  it("wrong domain → throws AUTH_SIWE_DOMAIN_MISMATCH", async () => {
    const nonce = await auth.createNonce(ADDRESS);
    const message = buildSiweMessage(nonce, "evil.com");
    await expect(auth.loginWithSiwe(message, "0xdeadbeef")).rejects.toMatchObject({
      code: "AUTH_SIWE_DOMAIN_MISMATCH",
    });
  });

  it("invalid signature → throws AUTH_SIWE_INVALID_SIG", async () => {
    mockVerify.mockResolvedValue(false);
    const nonce = await auth.createNonce(ADDRESS);
    const message = buildSiweMessage(nonce);
    await expect(auth.loginWithSiwe(message, "0xbad")).rejects.toMatchObject({
      code: "AUTH_SIWE_INVALID_SIG",
    });
  });

  it("expired SIWE message → throws AUTH_SIWE_EXPIRED", async () => {
    const nonce = await auth.createNonce(ADDRESS);
    const past = new Date(Date.now() - 1000);
    const message = buildSiweMessage(nonce, DOMAIN, ADDRESS, past);
    await expect(auth.loginWithSiwe(message, "0xdeadbeef")).rejects.toMatchObject({
      code: "AUTH_SIWE_EXPIRED",
    });
  });

  it("nonce reuse → second login throws AUTH_SIWE_NONCE_REPLAY", async () => {
    const nonce = await auth.createNonce(ADDRESS);
    const message = buildSiweMessage(nonce);
    await auth.loginWithSiwe(message, "0xdeadbeef");

    await expect(auth.loginWithSiwe(message, "0xdeadbeef")).rejects.toMatchObject({
      code: "AUTH_SIWE_NONCE_REPLAY",
    });
  });

  it("expired nonce → throws AUTH_SIWE_TIME_DRIFT", async () => {
    const nonce = await auth.createNonce(ADDRESS);
    const message = buildSiweMessage(nonce);
    vi.advanceTimersByTime(5 * 60_000 + 1);
    await expect(auth.loginWithSiwe(message, "0xdeadbeef")).rejects.toMatchObject({
      code: "AUTH_SIWE_TIME_DRIFT",
    });
  });

  it("verifySession on valid access token returns payload", async () => {
    const nonce = await auth.createNonce(ADDRESS);
    const { accessToken } = await auth.loginWithSiwe(buildSiweMessage(nonce), "0xdeadbeef");
    const payload = await auth.verifySession(accessToken);
    expect(payload.address).toBe(ADDRESS.toLowerCase());
    expect(payload.chainId).toBe(CHAIN_ID);
  });

  it("verifySession on tampered token throws", async () => {
    await expect(auth.verifySession("header.payload.invalidsig")).rejects.toMatchObject({
      code: "AUTH_TOKEN_INVALID",
    });
  });

  it("refresh rotates tokens correctly", async () => {
    const nonce = await auth.createNonce(ADDRESS);
    const { refreshToken: rt1 } = await auth.loginWithSiwe(buildSiweMessage(nonce), "0xdeadbeef");
    const { accessToken: at2, refreshToken: rt2 } = await auth.refresh(rt1);
    expect(rt2).not.toBe(rt1);
    expect(at2.split(".").length).toBe(3);
  });

  it("refresh reuse → throws (revoked)", async () => {
    const nonce = await auth.createNonce(ADDRESS);
    const { refreshToken } = await auth.loginWithSiwe(buildSiweMessage(nonce), "0xdeadbeef");
    await auth.refresh(refreshToken);
    await expect(auth.refresh(refreshToken)).rejects.toThrow();
  });

  it("expired refresh token → rotate throws", async () => {
    const shortStore = new InMemoryRefreshStore();
    const timeSource2 = new AuthoritativeTime({ maxForwardJumpMs: Infinity });
    const auth2 = new TalakWeb3Auth({
      expectedDomain: DOMAIN,
      nonceStore,
      refreshStore: shortStore,
      revocationStore,
      refreshTtlSeconds: 1,
      timeSource: timeSource2,
    });
    const nonce = await auth2.createNonce(ADDRESS);
    const { refreshToken } = await auth2.loginWithSiwe(buildSiweMessage(nonce), "0xdeadbeef");
    vi.advanceTimersByTime(2000);
    await expect(auth2.refresh(refreshToken)).rejects.toThrow();
  });

  it("revokeSession with refresh token revokes both", async () => {
    const nonce = await auth.createNonce(ADDRESS);
    const { accessToken, refreshToken } = await auth.loginWithSiwe(
      buildSiweMessage(nonce),
      "0xdeadbeef",
    );
    await auth.revokeSession(accessToken, refreshToken);

    await expect(auth.verifySession(accessToken)).rejects.toMatchObject({
      code: "AUTH_TOKEN_REVOKED",
    });

    await expect(auth.refresh(refreshToken)).rejects.toThrow();
  });

  it("validateJwt on valid token returns true", async () => {
    const nonce = await auth.createNonce(ADDRESS);
    const { accessToken } = await auth.loginWithSiwe(buildSiweMessage(nonce), "0xdeadbeef");
    expect(await auth.validateJwt(accessToken)).toBe(true);
  });

  it("validateJwt on garbage returns false", async () => {
    expect(await auth.validateJwt("garbage")).toBe(false);
  });
});
