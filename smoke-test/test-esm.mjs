import { talakWeb3, MainnetPreset } from "talak-web3";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("Testing ESM Import...");
try {
  // Test 1: Basic import and instantiation
  const app = talakWeb3(MainnetPreset);
  console.log("✓ ESM Import Success: app created");

  // Test 2: Verify exports exist
  if (typeof talakWeb3 !== "function") {
    throw new Error("talakWeb3 is not a function");
  }
  console.log("✓ talakWeb3 is a function");

  // Test 3: Check that instance has expected methods
  if (typeof app.init !== "function") {
    throw new Error("app.init is not a function");
  }
  if (typeof app.destroy !== "function") {
    throw new Error("app.destroy is not a function");
  }
  console.log("✓ Instance has expected methods");

  // Test 4: Verify the CJS bundle exists
  const distPath = join(__dirname, "../packages/talak-web3/dist");
  const cjsExists = readFileSync(join(distPath, "index.cjs"), "utf-8");
  if (!cjsExists || cjsExists.length < 1000) {
    throw new Error("CJS bundle is missing or too small");
  }
  console.log(`✓ CJS bundle exists (${cjsExists.length} bytes)`);

  // Test 5: Verify type declarations exist
  const dtsExists = readFileSync(join(distPath, "index.d.ts"), "utf-8");
  if (!dtsExists || dtsExists.includes("any;")) {
    throw new Error('Type declarations are missing or contain "any" types');
  }
  console.log(`✓ Type declarations exist and don't use 'any'`);

  console.log("\n✅ All ESM tests passed!");
} catch (e) {
  console.error("❌ ESM Import Failed:", e);
  process.exit(1);
}
