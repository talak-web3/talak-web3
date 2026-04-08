import { betterWeb3, MainnetPreset } from 'talak-web3';
import type { BetterWeb3Instance } from 'talak-web3';

console.log('Testing TS Import...');
try {
  const app: BetterWeb3Instance = betterWeb3(MainnetPreset);
  console.log('TS Import Success: app created with type safety');
} catch (e) {
  console.error('TS Import Failed:', e);
  process.exit(1);
}
