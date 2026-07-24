import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

async function collectTestFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.isSymbolicLink()) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectTestFiles(target));
    else if (entry.isFile() && entry.name.endsWith('.test.ts')) files.push(target);
  }
  return files;
}

async function main(): Promise<void> {
  const repositoryRoot = process.cwd();
  const governanceRoot = path.join(repositoryRoot, 'tests', 'governance');
  const files = (await collectTestFiles(path.join(repositoryRoot, 'tests')))
    .filter((filename) => !filename.startsWith(`${governanceRoot}${path.sep}`))
    .map((filename) => path.relative(repositoryRoot, filename));
  if (files.length === 0) throw new RangeError('未发现 Node TypeScript 测试，拒绝以空测试集通过。');

  const child = spawn(process.execPath, ['--import', 'tsx', '--test', ...files], {
    cwd: repositoryRoot,
    stdio: 'inherit',
  });
  const forwardSignal = (signal: NodeJS.Signals): void => {
    if (!child.killed) child.kill(signal);
  };
  const forwardSigint = (): void => forwardSignal('SIGINT');
  const forwardSigterm = (): void => forwardSignal('SIGTERM');
  process.once('SIGINT', forwardSigint);
  process.once('SIGTERM', forwardSigterm);
  const result = await new Promise<Readonly<{ code: number | null; signal: NodeJS.Signals | null }>>(
    (resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => resolve({ code, signal }));
    },
  );
  process.removeListener('SIGINT', forwardSigint);
  process.removeListener('SIGTERM', forwardSigterm);
  if (result.signal !== null) throw new Error(`Node 测试进程被 ${result.signal} 终止。`);
  if (result.code !== 0) process.exitCode = result.code ?? 1;
  else console.log(JSON.stringify({ status: 'passed', nodeTestFileCount: files.length }));
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
