import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AccountAbstractionClient } from "@talak-web3/tx";

const rpcResults: unknown[][] = [];
let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  rpcResults.length = 0;
  originalFetch = globalThis.fetch;
  globalThis.fetch = vi.fn(async () => {
    const body = rpcResults.shift() ?? ["0x0"];
    return {
      ok: true,
      status: 200,
      json: async () => {
        if (body instanceof Array && body[0] === "__error") {
          throw new Error(String(body[1] ?? "fetch failed"));
        }
        return { jsonrpc: "2.0", id: 1, result: body[0] ?? "0x0" };
      },
    } as Response;
  }) as typeof globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function createClient() {
  return new AccountAbstractionClient({
    bundlerUrl: "http://localhost:3000",
    sender: "0x1234567890abcdef1234567890abcdef12345678",
    sign: vi.fn(async () => "0xsignature" as const),
    chainId: 1,
  });
}

describe("AccountAbstractionClient", () => {
  describe("buildCallData", () => {
    it("encodes function selector and args", () => {
      const client = createClient();
      const calldata = client.buildCallData(
        "0xabcdef1234567890abcdef1234567890abcdef12",
        0n,
        "0xdeadbeef",
      );
      expect(calldata).toBeDefined();
      expect(typeof calldata).toBe("string");
      expect(calldata.startsWith("0x")).toBe(true);
    });
  });

  describe("getNonce", () => {
    it("fetches nonce from bundler via RPC", async () => {
      rpcResults.push(["0x0"]);
      const client = createClient();
      const nonce = await client.getNonce();
      expect(nonce).toBe("0x0");
      expect(globalThis.fetch).toHaveBeenCalled();
    });
  });

  describe("sendGasless", () => {
    it("builds calldata, gets nonce, signs, and sends", async () => {
      rpcResults.push(
        ["0x0"],
        [{ callGasLimit: "0x5208", verificationGasLimit: "0x186a0", preVerificationGas: "0x5208" }],
        [{ maxFeePerGas: "0x3b9aca00", maxPriorityFeePerGas: "0x3b9aca00" }],
        [{ hash: "0xop-hash" }],
      );
      const client = createClient();
      const hash = await client.sendGasless(
        "0xabcdef1234567890abcdef1234567890abcdef12",
        "0xdeadbeef",
      );
      expect(hash).toBe("0xop-hash");
      expect(client["opts"].sign).toHaveBeenCalled();
    });
  });
});
