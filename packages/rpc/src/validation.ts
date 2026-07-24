import { RpcError, RPC_ERROR_CODES } from "@talak-web3/errors";
import { z } from "zod";

/** Zod schema for validating JSON-RPC 2.0 request structure. */
export const RpcRequestSchema = z
  .object({
    jsonrpc: z.literal("2.0"),
    id: z.union([z.string().max(64), z.number().int().finite()]),
    method: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-z0-9_]+$/i, {
        message: "Method contains disallowed characters (only alphanumeric and underscore allowed)",
      }),
    params: z.array(z.unknown()).max(20, { message: "Maximum 20 parameters allowed" }).default([]),
  })
  .strict();

/** Inferred type for a validated JSON-RPC 2.0 request. */
export type RpcRequest = z.infer<typeof RpcRequestSchema>;

/** Validates a raw payload as a JSON-RPC 2.0 request, checking schema, size, and nesting depth. */
export function validateRpcRequest(payload: unknown): RpcRequest {
  if (typeof payload !== "object" || payload === null) {
    throw new RpcError("Invalid RPC request: payload must be an object", {
      code: RPC_ERROR_CODES.INVALID_PAYLOAD,
      status: 400,
    });
  }

  const payloadStr = JSON.stringify(payload);
  if (payloadStr.length > 1024 * 1024) {
    throw new RpcError("RPC payload size exceeds 1MB limit", {
      code: RPC_ERROR_CODES.PAYLOAD_TOO_LARGE,
      status: 413,
    });
  }

  const result = RpcRequestSchema.safeParse(payload);
  if (!result.success) {
    const firstError = result.error.issues[0];
    throw new RpcError(`Invalid RPC request: ${firstError?.message ?? "Schema mismatch"}`, {
      code: RPC_ERROR_CODES.VALIDATION_ERROR,
      status: 400,
      data: result.error.format(),
    });
  }

  checkDepth(result.data.params);

  return result.data;
}

function checkDepth(val: unknown, depth = 0): void {
  if (depth > 5) {
    throw new RpcError("RPC parameters too deeply nested (max depth 5)", {
      code: RPC_ERROR_CODES.DEPTH_EXCEEDED,
      status: 400,
    });
  }

  if (Array.isArray(val)) {
    for (const item of val) checkDepth(item, depth + 1);
  } else if (typeof val === "object" && val !== null) {
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        checkDepth((val as Record<string, unknown>)[key], depth + 1);
      }
    }
  }
}
