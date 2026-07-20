import { createPublicKey } from "node:crypto";

import { TalakWeb3Error } from "@talak-web3/errors";

function validateKeyStrength(pem: string, label: string): void {
  try {
    const keyObj = createPublicKey(pem);
    const details = keyObj.asymmetricKeyDetails;
    if (details?.modulusLength !== undefined && details.modulusLength < 2048) {
      throw new TalakWeb3Error(
        `INVALID CONFIGURATION: ${label} RSA key must be at least 2048 bits (got ${details.modulusLength})`,
        { code: "ENV_JWT_KEY_TOO_WEAK", status: 500 },
      );
    }
  } catch (err) {
    if (err instanceof TalakWeb3Error) throw err;
    throw new TalakWeb3Error(`INVALID CONFIGURATION: ${label} could not be parsed as a valid key`, {
      code: "ENV_JWT_KEY_INVALID",
      status: 500,
    });
  }
}

export function validateEnv(): void {
  const required = ["JWT_PRIVATE_KEY", "JWT_PUBLIC_KEY", "REDIS_URL", "SIWE_DOMAIN"];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new TalakWeb3Error(
      `CRITICAL CONFIGURATION ERROR: Missing mandatory environment variables: ${missing.join(", ")}`,
      { code: "ENV_MISSING_REQUIRED", status: 500 },
    );
  }

  const priv = process.env["JWT_PRIVATE_KEY"]!;
  const pub = process.env["JWT_PUBLIC_KEY"]!;

  if (!priv.includes("-----BEGIN PRIVATE KEY-----")) {
    throw new TalakWeb3Error(
      "INVALID CONFIGURATION: JWT_PRIVATE_KEY must be a valid PKCS#8 PEM string",
      { code: "ENV_JWT_KEY_INVALID", status: 500 },
    );
  }

  if (!pub.includes("-----BEGIN PUBLIC KEY-----")) {
    throw new TalakWeb3Error(
      "INVALID CONFIGURATION: JWT_PUBLIC_KEY must be a valid SPKI PEM string",
      { code: "ENV_JWT_KEY_INVALID", status: 500 },
    );
  }

  validateKeyStrength(priv, "JWT_PRIVATE_KEY");
  validateKeyStrength(pub, "JWT_PUBLIC_KEY");

  if (
    !process.env["REDIS_URL"]?.startsWith("redis://") &&
    !process.env["REDIS_URL"]?.startsWith("rediss://")
  ) {
    throw new TalakWeb3Error(
      "INVALID CONFIGURATION: REDIS_URL must be a valid redis:// or rediss:// connection string",
      { code: "ENV_REDIS_URL_INVALID", status: 500 },
    );
  }

  console.log("[BOOTSTRAP] Environment validation: PASSED");
  console.log("[BOOTSTRAP] JWT mode: RS256");
}
