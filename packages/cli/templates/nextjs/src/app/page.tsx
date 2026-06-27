"use client";

import { useSIWE } from "talak-web3/react";

export default function Home() {
  const { signIn, signOut, isAuthenticated, user } = useSIWE({
    domain: process.env.NEXT_PUBLIC_SIWE_DOMAIN || "localhost:3000",
    uri: typeof window !== "undefined" ? window.location.origin : "",
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">Welcome to talak-web3</h1>

        <div className="flex flex-col items-center gap-4">
          {isAuthenticated ? (
            <>
              <p className="text-lg">
                Connected: {user?.address.slice(0, 6)}...{user?.address.slice(-4)}
              </p>
              <button
                onClick={signOut}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={signIn}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Sign In with Ethereum
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
