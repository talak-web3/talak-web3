"use client";

import { useState } from "react";
import { TalakWeb3Client } from "talak-web3";
import { createWalletClient, custom } from "viem";
import { mainnet } from "viem/chains";

const authClient = new TalakWeb3Client({ baseUrl: "/api" });

export default function Home() {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    setError(null);
    try {
      const ethereum = (
        window as unknown as { ethereum?: { request: (args: unknown) => Promise<unknown> } }
      ).ethereum;
      if (!ethereum) throw new Error("No wallet found");

      const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
      const addr = accounts[0] as `0x${string}`;
      const { nonce } = await authClient.getNonce(addr);

      const domain = window.location.host;
      const uri = window.location.origin;
      const message =
        `${domain} wants you to sign in with your Ethereum account:\n` +
        `${addr}\n\n` +
        `Sign in with talak-web3.\n\n` +
        `URI: ${uri}\n` +
        `Version: 1\n` +
        `Chain ID: 1\n` +
        `Nonce: ${nonce}\n` +
        `Issued At: ${new Date().toISOString()}`;

      const walletClient = createWalletClient({
        chain: mainnet,
        transport: custom(ethereum),
      });
      const signature = await walletClient.signMessage({ account: addr, message });

      await authClient.loginWithSiwe(message, signature);
      setAddress(addr);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await authClient.logout();
    setAddress(null);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="mb-8 text-4xl font-bold">Welcome to talak-web3</h1>
      {error ? <p className="mb-4 text-red-600">{error}</p> : null}
      {address ? (
        <div className="flex flex-col items-center gap-4">
          <p>
            Connected: {address.slice(0, 6)}...{address.slice(-4)}
          </p>
          <button
            type="button"
            onClick={signOut}
            className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={signIn}
          disabled={loading}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in with Ethereum"}
        </button>
      )}
    </main>
  );
}
