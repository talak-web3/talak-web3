import { performance } from 'node:perf_hooks';
import { spawn } from 'node:child_process';
import { rmSync, existsSync, writeFileSync } from 'node:fs';

type RunResult = {
  label: string;
  ms: number;
  code: number;
};

function formatMs(ms: number) {
  const s = ms / 1000;
  return s >= 60 ? `${(s / 60).toFixed(2)}m` : `${s.toFixed(2)}s`;
}

async function main() {
  const cwd = process.cwd();
  const filter = process.argv[2] ?? 'talak-web3';
  const cacheDir = `${cwd}\\.turbo`;

  console.log(`benchmark:tasks cwd=${cwd}`);
  console.log(`benchmark:tasks filter=${filter}`);

  const nodeCmd = process.platform === 'win32' ? 'node.exe' : 'node';

  function spawnPnpm(args: string[]) {
    if (process.platform === 'win32') {
      const comspec = process.env.ComSpec ?? 'cmd.exe';
      return spawn(comspec, ['/d', '/s', '/c', 'pnpm', ...args], { cwd, shell: false, stdio: 'inherit' });
    }
    return spawn('pnpm', args, { cwd, shell: false, stdio: 'inherit' });
  }

  function runLogged(label: string, command: string, args: string[]) {
    return new Promise<RunResult>((resolve) => {
      const start = performance.now();
      const child = spawn(command, args, { cwd, shell: false, stdio: 'inherit' });
      child.on('error', (e) => {
        const end = performance.now();
        resolve({ label, ms: end - start, code: 1 });
      });
      child.on('exit', (code) => {
        const end = performance.now();
        resolve({ label, ms: end - start, code: code ?? 1 });
      });
    });
  }

  function runPnpmLogged(label: string, args: string[]) {
    return new Promise<RunResult>((resolve) => {
      const start = performance.now();
      const child = spawnPnpm(args);
      child.on('error', (e) => {
        const end = performance.now();
        resolve({ label, ms: end - start, code: 1 });
      });
      child.on('exit', (code) => {
        const end = performance.now();
        resolve({ label, ms: end - start, code: code ?? 1 });
      });
    });
  }

  if (existsSync(cacheDir)) rmSync(cacheDir, { recursive: true, force: true });

  console.log('benchmark: baseline cold start');
  const baselineCold = await runPnpmLogged('baseline:cold (concurrency=1)', [
    '-r',
    '--workspace-concurrency',
    '1',
    '--filter',
    `${filter}...`,
    'build'
  ]);
  console.log(`benchmark: baseline cold done (code=${baselineCold.code})`);

  const fastWarm1 = await runLogged(
    'fast:warm#1 (auto concurrency via scripts/fast.mjs)',
    nodeCmd,
    ['scripts/fast.mjs', 'build', filter]
  );
  console.log(`benchmark: fast warm#1 done (code=${fastWarm1.code})`);

  const fastWarm2 = await runLogged(
    'fast:warm#2 (repeat, should be mostly cached)',
    nodeCmd,
    ['scripts/fast.mjs', 'build', filter]
  );
  console.log(`benchmark: fast warm#2 done (code=${fastWarm2.code})`);

  const results = [baselineCold, fastWarm1, fastWarm2];
  if (results.some((r) => r.code !== 0)) process.exit(1);

  const speedup = baselineCold.ms / Math.min(fastWarm1.ms, fastWarm2.ms);

  console.log('benchmark: writing benchmark-tasks.latest.json');
  writeFileSync('benchmark-tasks.latest.json', JSON.stringify({ filter, results, speedup }, null, 2));
  console.log('benchmark: wrote benchmark-tasks.latest.json');

  console.log('\nBenchmark results');
  for (const r of results) console.log(`- ${r.label}: ${formatMs(r.ms)}`);
  console.log(`- speedup vs baseline:cold: ${speedup.toFixed(2)}x`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
