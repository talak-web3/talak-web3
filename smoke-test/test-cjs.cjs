const { betterWeb3, MainnetPreset } = require('talak-web3');

console.log('Testing CJS Require...');
try {
  const app = betterWeb3(MainnetPreset);
  console.log('CJS Require Success: app created');
} catch (e) {
  console.error('CJS Require Failed:', e);
  process.exit(1);
}
