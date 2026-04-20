/**
 * Smoke test for CJS bundle
 * Verifies that require('talak-web3') works correctly with the CJS bundle
 */

const path = require("path");

// Load the CJS bundle
const bundlePath = path.join(__dirname, "..", "packages", "talak-web3", "dist", "index.cjs");
const talakWeb3 = require(bundlePath);

console.log("=== CJS Bundle Smoke Test ===\n");

// Test 1: Check that talakWeb3 function exists
if (typeof talakWeb3.talakWeb3 !== "function") {
  console.error("❌ FAIL: talakWeb3 is not a function");
  process.exit(1);
}
console.log("✓ talakWeb3 is exported as a function");

// Test 2: Check key exports
const expectedExports = [
  "talakWeb3",
  "TalakWeb3Client",
  "InMemoryTokenStorage",
  "CookieTokenStorage",
  "MainnetPreset",
  "PolygonPreset",
  "ConfigManager",
  "MultiChainRouter",
  "estimateEip1559Fees",
];

const missingExports = expectedExports.filter((exp) => !(exp in talakWeb3));
if (missingExports.length > 0) {
  console.error(`❌ FAIL: Missing exports: ${missingExports.join(", ")}`);
  process.exit(1);
}
console.log(`✓ All ${expectedExports.length} expected exports are present`);

// Test 3: Check that __resetTalakWeb3 exists (for testing)
if (typeof talakWeb3.__resetTalakWeb3 !== "function") {
  console.error("❌ FAIL: __resetTalakWeb3 is not a function");
  process.exit(1);
}
console.log("✓ __resetTalakWeb3 is exported for testing");

// Test 4: Verify presets are objects
if (typeof talakWeb3.MainnetPreset !== "object" || !talakWeb3.MainnetPreset.chains) {
  console.error("❌ FAIL: MainnetPreset is not properly structured");
  process.exit(1);
}
console.log("✓ MainnetPreset is properly structured");

// Test 5: Verify classes are constructors
try {
  new talakWeb3.InMemoryTokenStorage();
  console.log("✓ InMemoryTokenStorage can be instantiated");
} catch (error) {
  console.error("❌ FAIL: InMemoryTokenStorage cannot be instantiated:", error.message);
  process.exit(1);
}

console.log("\n✅ All CJS smoke tests passed!");
process.exit(0);
