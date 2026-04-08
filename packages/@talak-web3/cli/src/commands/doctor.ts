import fs from 'node:fs';
import path from 'node:path';

interface DoctorOptions {
  project?: string;
}

interface CheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fix?: string;
}

export async function doctorCommand(options: DoctorOptions = {}) {
  const projectPath = options.project || '.';
  
  console.log('🔍 Running talak-web3 health checks...\n');

  const results: CheckResult[] = [];

  // Check 1: package.json exists
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    results.push({ name: 'package.json', status: 'pass', message: 'Found package.json' });
  } else {
    results.push({ name: 'package.json', status: 'fail', message: 'Missing package.json', fix: 'Run "npm init" to create one' });
  }

  // Check 2: talak-web3 dependency
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const hasTalakWeb3 = packageJson.dependencies?.['talak-web3'] || packageJson.devDependencies?.['talak-web3'];
    if (hasTalakWeb3) {
      results.push({ name: 'talak-web3 dependency', status: 'pass', message: `Version: ${hasTalakWeb3}` });
    } else {
      results.push({ name: 'talak-web3 dependency', status: 'fail', message: 'talak-web3 not installed', fix: 'Run "npm install talak-web3"' });
    }
  }

  // Check 3: Environment variables
  const envPath = path.join(projectPath, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const hasJwtSecret = envContent.includes('JWT_SECRET=') && !envContent.includes('JWT_SECRET=your-secret');
    const hasRedisUrl = envContent.includes('REDIS_URL=');
    
    if (hasJwtSecret) {
      results.push({ name: 'JWT_SECRET', status: 'pass', message: 'JWT_SECRET configured' });
    } else {
      results.push({ name: 'JWT_SECRET', status: 'warn', message: 'JWT_SECRET not set or using default', fix: 'Set a strong random JWT_SECRET in .env' });
    }

    if (hasRedisUrl) {
      results.push({ name: 'REDIS_URL', status: 'pass', message: 'REDIS_URL configured' });
    } else {
      results.push({ name: 'REDIS_URL', status: 'warn', message: 'REDIS_URL not set', fix: 'Set REDIS_URL in .env for production' });
    }
  } else {
    results.push({ name: '.env file', status: 'fail', message: 'Missing .env file', fix: 'Copy .env.example to .env and configure' });
  }

  // Check 4: TypeScript config
  const tsConfigPath = path.join(projectPath, 'tsconfig.json');
  if (fs.existsSync(tsConfigPath)) {
    results.push({ name: 'tsconfig.json', status: 'pass', message: 'Found tsconfig.json' });
  } else {
    results.push({ name: 'tsconfig.json', status: 'warn', message: 'Missing tsconfig.json', fix: 'Create a tsconfig.json for TypeScript' });
  }

  // Check 5: Node version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0] ?? '0');
  if (majorVersion >= 20) {
    results.push({ name: 'Node.js version', status: 'pass', message: `Version: ${nodeVersion}` });
  } else {
    results.push({ name: 'Node.js version', status: 'warn', message: `Version: ${nodeVersion} (recommended: 20+)`, fix: 'Upgrade to Node.js 20 or later' });
  }

  // Display results
  const passCount = results.filter(r => r.status === 'pass').length;
  const warnCount = results.filter(r => r.status === 'warn').length;
  const failCount = results.filter(r => r.status === 'fail').length;

  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
    console.log(`${icon} ${result.name}: ${result.message}`);
    if (result.fix) {
      console.log(`   💡 Fix: ${result.fix}`);
    }
  });

  console.log(`\n📊 Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} errors`);

  if (failCount > 0) {
    console.log('\n❌ Please fix the errors above before continuing.');
    process.exit(1);
  } else if (warnCount > 0) {
    console.log('\n⚠️  Please review the warnings above.');
  } else {
    console.log('\n✅ All checks passed! Your project looks great.');
  }
}
