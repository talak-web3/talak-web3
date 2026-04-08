import os from 'node:os';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

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

function runNpm(args) {
  if (process.platform === 'win32') {
    const comspec = process.env.ComSpec ?? 'cmd.exe';
    return run(comspec, ['/d', '/s', '/c', 'npm.cmd', ...args]);
  }
  return run('npm', args);
}

function listWorkspaceDirs(repoRoot) {
  const dirs = [];
  const roots = ['packages', 'apps'];

  for (const root of roots) {
    const absRoot = path.join(repoRoot, root);
    if (!fs.existsSync(absRoot)) continue;
    for (const entry of fs.readdirSync(absRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const first = path.join(absRoot, entry.name);
      const firstPkg = path.join(first, 'package.json');
      if (fs.existsSync(firstPkg)) {
        dirs.push(first);
        continue;
      }
      for (const nested of fs.readdirSync(first, { withFileTypes: true })) {
        if (!nested.isDirectory()) continue;
        const second = path.join(first, nested.name);
        if (fs.existsSync(path.join(second, 'package.json'))) dirs.push(second);
      }
    }
  }
  return dirs;
}

async function runInDir(task, cwd) {
  if (process.platform === 'win32') {
    const comspec = process.env.ComSpec ?? 'cmd.exe';
    return new Promise((resolve) => {
      const child = spawn(comspec, ['/d', '/s', '/c', 'npm.cmd', 'run', task, '--if-present'], {
        cwd,
        stdio: 'inherit',
        shell: false,
      });
      child.on('exit', (code) => resolve(code ?? 1));
    });
  }
  return new Promise((resolve) => {
    const child = spawn('npm', ['run', task, '--if-present'], { cwd, stdio: 'inherit', shell: false });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

async function runPool(items, worker, concurrency) {
  const queue = [...items];
  let failed = 0;
  const workers = Array.from({ length: Math.min(concurrency, queue.length || 1) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) return;
      const code = await worker(item);
      if (code !== 0) failed = code;
      if (failed !== 0) return;
    }
  });
  await Promise.all(workers);
  return failed;
}

const task = process.argv[2];
const rawArgs = process.argv.slice(3);
const filter = rawArgs[0] === '--filter' ? rawArgs[1] : rawArgs[0];

if (!task) {
  console.error('Usage: node scripts/ws.mjs <build|typecheck|lint|test|dev|clean> [filter]');
  process.exit(1);
}

const concurrency = getConcurrency();
const repoRoot = process.cwd();
let dirs = listWorkspaceDirs(repoRoot);
if ((task === 'typecheck' || task === 'test') && !filter) {
  dirs = dirs.filter((d) => d.includes(`${path.sep}packages${path.sep}`));
}
if (filter) dirs = dirs.filter((d) => d.includes(filter));
if (dirs.length === 0) {
  console.error(`No matching workspace packages for filter: ${filter ?? '(none)'}`);
  process.exit(1);
}

if (task === 'dev') {
  const code = await runPool(dirs, (d) => runInDir(task, d), Math.max(2, concurrency));
  process.exit(code);
}

const code = await runPool(dirs, (d) => runInDir(task, d), concurrency);
process.exit(code);
