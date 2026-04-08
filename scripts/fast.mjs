import os from 'node:os';
import { spawn } from 'node:child_process';

function getConcurrency() {
  const cpuCount = os.cpus()?.length ?? 4;
  return Math.max(2, Math.min(16, cpuCount));
}

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

const task = process.argv[2];
const rawArgs = process.argv.slice(3);
const filter = rawArgs[0] === '--filter' ? rawArgs[1] : rawArgs[0];

if (!task) {
  console.error('Usage: node scripts/fast.mjs <build|typecheck|test|all> [filter]');
  process.exit(1);
}

const concurrency = getConcurrency();
const base = ['scripts/ws.mjs'];

if (task === 'all') {
  const buildCode = await run(process.execPath, [...base, 'build', ...(filter ? ['--filter', filter] : [])]);
  if (buildCode !== 0) process.exit(buildCode);
  const typecheckCode = await run(process.execPath, [...base, 'typecheck', ...(filter ? ['--filter', filter] : [])]);
  if (typecheckCode !== 0) process.exit(typecheckCode);
  const testCode = await run(process.execPath, [...base, 'test', ...(filter ? ['--filter', filter] : [])]);
  process.exit(testCode);
}

process.exit(await run(process.execPath, [...base, task, ...(filter ? ['--filter', filter] : [])]));
