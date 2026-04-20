/**
 * Smoke test for ESM bundle
 * Verifies that import { talakWeb3 } from 'talak-web3' works correctly with the ESM bundle
 */

import {
  talakWeb3,
  __resetTalakWeb3,
  TalakWeb3Client,
  InMemoryTokenStorage,
  CookieTokenStorage,
  MainnetPreset,
  PolygonPreset,
  ConfigManager,
  MultiChainRouter,
  estimateEip1559Fees,
} from "../packages/talak-web3/dist/index.js";

console.log("=== ESM Bundle Smoke Test ===\n");

// Test 1: Check that talakWeb3 function exists
if (typeof talakWeb3 !== "function") {
  console.error("❌ FAIL: talakWeb3 is not a function");
  process.exit(1);
}
console.log("✓ talakWeb3 is imported as a function");

// Test 2: Check that __resetTalakWeb3 exists (for testing)
if (typeof __resetTalakWeb3 !== "function") {
  console.error("❌ FAIL: __resetTalakWeb3 is not a function");
  process.exit(1);
}
console.log("✓ __resetTalakWeb3 is imported for testing");

// Test 3: Verify presets are objects
if (typeof MainnetPreset !== "object" || !MainnetPreset.chains) {
  console.error("❌ FAIL: MainnetPreset is not properly structured");
  process.exit(1);
}
console.log("✓ MainnetPreset is properly structured");

// Test 4: Verify classes are constructors
try {
  new InMemoryTokenStorage();
  console.log("✓ InMemoryTokenStorage can be instantiated");
} catch (error) {
  console.error("❌ FAIL: InMemoryTokenStorage cannot be instantiated:", error.message);
  process.exit(1);
}

// Test 5: Verify ConfigManager has static methods
if (typeof ConfigManager.validate !== "function") {
  console.error("❌ FAIL: ConfigManager.validate is not a function");
  process.exit(1);
}
console.log("✓ ConfigManager has validate method");

// Test 6: Verify estimateEip1559Fees is a function
if (typeof estimateEip1559Fees !== "function") {
  console.error("❌ FAIL: estimateEip1559Fees is not a function");
  process.exit(1);
}
console.log("✓ estimateEip1559Fees is a function");

console.log("\n✅ All ESM smoke tests passed!");
process.exit(0);
