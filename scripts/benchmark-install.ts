import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const MAX_INSTALL_TIME_MS = 47000;

async function benchmark() {
  console.log('Starting install benchmark (cold)...');

  // Cleanup
  console.log('Cleaning up node_modules and lockfiles...');
  const packages = JSON.parse(execSync('pnpm m ls --json', { encoding: 'utf8' }));
  const pathsToClean = [
    'node_modules',
    'pnpm-lock.yaml',
    ...packages.map((pkg: any) => path.join(pkg.path, 'node_modules'))
  ];

  pathsToClean.forEach(p => {
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true });
    }
  });

  // Note: We don't clear global pnpm cache here as it might be destructive for the user's machine,
  // but in a real CI environment, we would start with a clean slate.
  // Instead, we focus on the project-level install performance.

  const start = Date.now();
  try {
    execSync('pnpm install --no-frozen-lockfile', { stdio: 'inherit' });
  } catch (error) {
    console.error('Install failed:', error);
    process.exit(1);
  }
  const end = Date.now();
  const duration = end - start;

  console.log(`\nInstall duration: ${(duration / 1000).toFixed(2)}s`);

  if (duration > MAX_INSTALL_TIME_MS) {
    console.error(`ERROR: Install budget exceeded! Took ${(duration / 1000).toFixed(2)}s, max is ${MAX_INSTALL_TIME_MS / 1000}s.`);
    process.exit(1);
  } else {
    console.log(`SUCCESS: Install budget within limits (${(duration / 1000).toFixed(2)}s/${MAX_INSTALL_TIME_MS / 1000}s).`);
  }
}

benchmark();
