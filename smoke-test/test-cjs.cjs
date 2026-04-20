const { talakWeb3, MainnetPreset } = require("talak-web3");
const fs = require("node:fs");
const path = require("node:path");

console.log("Testing CJS Require...");
try {
  // Test 1: Basic require and instantiation
  const app = talakWeb3(MainnetPreset);
  console.log("✓ CJS Require Success: app created");

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

  // Test 4: Verify the ESM bundle exists
  const distPath = path.join(__dirname, "../packages/talak-web3/dist");
  const esmExists = fs.readFileSync(path.join(distPath, "index.js"), "utf-8");
  if (!esmExists || esmExists.length < 1000) {
    throw new Error("ESM bundle is missing or too small");
  }
  console.log(`✓ ESM bundle exists (${esmExists.length} bytes)`);

  console.log("\n✅ All CJS tests passed!");
} catch (e) {
  console.error("❌ CJS Require Failed:", e);
  process.exit(1);
}
