import { createPublicKey } from "node:crypto";

import { TalakWeb3Error } from "@talak-web3/errors";

import { logger } from "../logger.js";

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

  const priv = process.env["JWT_PRIVATE_KEY"] ?? "";
  const pub = process.env["JWT_PUBLIC_KEY"] ?? "";

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

  const maxConns = parseInt(process.env["REDIS_MAX_CONNECTIONS"] ?? "100", 10);
  if (Number.isNaN(maxConns) || maxConns < 1 || maxConns > 10000) {
    throw new TalakWeb3Error(
      "INVALID CONFIGURATION: REDIS_MAX_CONNECTIONS must be a number between 1 and 10000",
      { code: "ENV_REDIS_CONFIG_INVALID", status: 500 },
    );
  }

  const keyProvider = process.env["KEY_PROVIDER"];
  if (keyProvider === "vault") {
    if (!process.env["VAULT_TOKEN"]) {
      throw new TalakWeb3Error(
        "INVALID CONFIGURATION: VAULT_TOKEN is required when KEY_PROVIDER=vault",
        { code: "ENV_VAULT_CONFIG_MISSING", status: 500 },
      );
    }
    if (!process.env["VAULT_SECRET_PATH"]) {
      throw new TalakWeb3Error(
        "INVALID CONFIGURATION: VAULT_SECRET_PATH is required when KEY_PROVIDER=vault",
        { code: "ENV_VAULT_CONFIG_MISSING", status: 500 },
      );
    }
  }

  if (keyProvider === "aws") {
    if (!process.env["AWS_KMS_KEY_ID"]) {
      throw new TalakWeb3Error(
        "INVALID CONFIGURATION: AWS_KMS_KEY_ID is required when KEY_PROVIDER=aws",
        { code: "ENV_AWS_CONFIG_MISSING", status: 500 },
      );
    }
  }

  logger.info("Environment validation: PASSED");
  logger.info("JWT mode: RS256");
}
