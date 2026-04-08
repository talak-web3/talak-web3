// Publishing script for talak-web3
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Publishing talak-web3 to NPM ===');

// Step 1: Build the package
console.log('1. Building package...');
execSync('node build-simple.cjs', { stdio: 'inherit' });

// Step 2: Backup original package.json
console.log('2. Backing up original package.json...');
if (fs.existsSync('package.json')) {
  fs.copyFileSync('package.json', 'package.dev.json');
}

// Step 3: Use publish package.json
console.log('3. Using publish configuration...');
fs.copyFileSync('package.publish.json', 'package.json');

// Step 4: Check package contents
console.log('4. Checking package contents...');
execSync('npm pack --dry-run', { stdio: 'inherit' });

// Step 5: Publish to npm
console.log('5. Publishing to npm...');
try {
  execSync('npm publish', { stdio: 'inherit' });
  console.log('6. Restoring development configuration...');
  fs.copyFileSync('package.dev.json', 'package.json');
  fs.unlinkSync('package.dev.json');
  console.log('=== Published successfully! ===');
} catch (error) {
  console.log('6. Restoring development configuration...');
  fs.copyFileSync('package.dev.json', 'package.json');
  fs.unlinkSync('package.dev.json');
  console.error('=== Publishing failed ===');
  process.exit(1);
}
