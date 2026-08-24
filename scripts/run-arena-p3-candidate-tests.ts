import { spawn } from 'node:child_process';
import { lstat } from 'node:fs/promises';
import path from 'node:path';

const VITEST_FILES = Object.freeze([
  'packages/arena-core/test/action-primitives.test.ts',
  'packages/arena-equipment/test/equipment-primitives.test.ts',
  'packages/arena-movement/test/movement-primitives.test.ts',
  'packages/arena-physics/test/physics-contract.test.ts',
  'packages/arena-product-content/test/arena-v2-kz-base-map-candidate-v1.test.ts',
  'packages/arena-product-content/test/kz-mode-map-adapter-v1.test.ts',
  'packages/arena-bot/test/survival-enemy-controller-v1.test.ts',
  'packages/arena-bot/test/survival-enemy-controller-v2.test.ts',
  'packages/arena-product-presentation/test/arena-v2-kz-route-presentation-projection-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-kz-route-three-readability-candidate-v1.test.ts',
  'packages/arena-regression/test/arena-kz-route-physics-verification-v1.test.ts',
  'packages/arena-regression/test/arena-survival-enemy-physics-verification-v1.test.ts',
  'packages/arena-regression/test/arena-race-crowding-physics-verification-v1.test.ts',
  'packages/arena-regression/test/arena-race-vertical-integration-verification-v1.test.ts',
  'packages/arena-regression/test/arena-survival-mode-vertical-integration-candidate-v1.test.ts',
  'packages/arena-regression/test/arena-survival-shared-world-authority-verification-v1.test.ts',
]);
const NODE_TEST_FILES = Object.freeze([
  'packages/arena-match/test/mode-match-runtime-checkpoint-v2.test.ts',
  'packages/arena-match/test/mode-match-runtime-checkpoint-v3.test.ts',
  'packages/arena-match/test/mode-match-runtime-checkpoint-v4.test.ts',
  'tests/arena/p3-versioned-candidate-reachability.test.ts',
]);

async function assertFiles(repositoryRoot: string, files: readonly string[]): Promise<void> {
  if (files.length === 0 || new Set(files).size !== files.length) {
    throw new RangeError('P3定向测试清单必须非空且不得重复。');
  }
  for (const file of files) {
    const stat = await lstat(path.join(repositoryRoot, file));
    if (stat.isSymbolicLink() || !stat.isFile()) throw new TypeError(`${file}必须是真实文件。`);
  }
}

async function run(
  repositoryRoot: string,
  label: string,
  executable: string,
  args: readonly string[],
): Promise<void> {
  const child = spawn(executable, args, { cwd: repositoryRoot, stdio: 'inherit' });
  const result = await new Promise<Readonly<{ code: number | null; signal: NodeJS.Signals | null }>>(
    (resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => resolve({ code, signal }));
    },
  );
  if (result.signal !== null) throw new Error(`${label}被${result.signal}终止。`);
  if (result.code !== 0) throw new Error(`${label}失败，退出码${String(result.code)}。`);
}

async function main(): Promise<void> {
  const repositoryRoot = process.cwd();
  await assertFiles(repositoryRoot, [...VITEST_FILES, ...NODE_TEST_FILES]);
  await run(repositoryRoot, 'P3 Vitest定向测试', process.execPath, [
    path.join(repositoryRoot, 'node_modules/vitest/vitest.mjs'),
    'run',
    '--maxWorkers=1',
    '--fileParallelism=false',
    ...VITEST_FILES,
  ]);
  await run(repositoryRoot, 'P3 Node架构测试', process.execPath, [
    '--import', 'tsx', '--test', ...NODE_TEST_FILES,
  ]);
  console.log(JSON.stringify({
    status: 'passed',
    vitestFileCount: VITEST_FILES.length,
    nodeTestFileCount: NODE_TEST_FILES.length,
  }));
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
