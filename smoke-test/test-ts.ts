import {
  talakWeb3,
  MainnetPreset,
  InMemoryTokenStorage,
  ConfigManager,
  estimateEip1559Fees,
} from "talak-web3";

console.log("=== TypeScript Bundle Smoke Test ===\n");

const app = talakWeb3(MainnetPreset);

if (typeof app.init !== "function") {
  console.error("❌ FAIL: app.init is not a function");
  process.exit(1);
}
console.log("✓ talakWeb3() returns instance with init method");

if (typeof MainnetPreset !== "object" || !MainnetPreset.chains) {
  console.error("❌ FAIL: MainnetPreset is not properly structured");
  process.exit(1);
}
console.log("✓ MainnetPreset is properly structured");

try {
  new InMemoryTokenStorage();
  console.log("✓ InMemoryTokenStorage can be instantiated");
} catch (error) {
  console.error("❌ FAIL: InMemoryTokenStorage cannot be instantiated:", error.message);
  process.exit(1);
}

if (typeof ConfigManager.validate !== "function") {
  console.error("❌ FAIL: ConfigManager.validate is not a function");
  process.exit(1);
}
console.log("✓ ConfigManager has validate method");

if (typeof estimateEip1559Fees !== "function") {
  console.error("❌ FAIL: estimateEip1559Fees is not a function");
  process.exit(1);
}
console.log("✓ estimateEip1559Fees is a function");

console.log("\n✅ All TypeScript smoke tests passed!");
process.exit(0);
