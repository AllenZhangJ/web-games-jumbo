import { spawn } from 'node:child_process';
import { lstat } from 'node:fs/promises';
import path from 'node:path';

const VITEST_FILES = Object.freeze([
  'packages/arena-presentation-contracts/test/arena-stage7-formal-asset-budget-v1.test.ts',
  'packages/arena-presentation-contracts/test/arena-stage7-formal-asset-budget-v2-candidate.test.ts',
  'packages/arena-product-presentation/test/arena-v2-a3-a6-production-approval-evidence-ledger-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-a3-a6-formal-asset-readiness-candidate-v1.test.ts',
  'packages/arena-release/test/arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v1.test.ts',
  'packages/arena-release/test/arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v2.test.ts',
  'packages/arena-release/test/arena-v2-a7-formal-visual-media-freeze-evidence-candidate-v3.test.ts',
  'packages/arena-release/test/arena-v2-a7-formal-evidence-retrieval-verifier-candidate-v1.test.ts',
  'packages/arena-release/test/arena-v2-a7-formal-budget-structural-evidence-candidate-v1.test.ts',
  'packages/arena-release/test/arena-v2-a7-formal-budget-structural-limit-proposal-candidate-v1.test.ts',
  'packages/arena-release/test/arena-v2-a7-formal-budget-independent-approval-decision-candidate-v1.test.ts',
  'packages/arena-release/test/arena-v2-a7-formal-budget-approved-policy-assembly-candidate-v1.test.ts',
  'packages/arena-release/test/arena-v2-p7-preregistration-candidate-v1.test.ts',
  'packages/arena-release/test/arena-v2-p7-evidence-evaluation-candidate-v1.test.ts',
  'packages/arena-release/test/arena-v2-p7-automation-execution-evidence-candidate-v1.test.ts',
  'packages/arena-release/test/arena-v2-p7-automation-evidence-producer-candidate-v1.test.ts',
  'packages/arena-release/test/arena-v2-p7-stage-report-candidate-v1.test.ts',
  'packages/arena-release/test/arena-v2-p7-stage-report-candidate-v2.test.ts',
  'packages/arena-release/test/arena-v2-p7-automation-stage-report-session-candidate-v1.test.ts',
  'packages/arena-release/test/arena-v2-p7-release-freeze-assembly-session-candidate-v1.test.ts',
  'packages/arena-release/test/arena-v2-p7-release-freeze-manifest-candidate-v1.test.ts',
]);
const NODE_TEST_FILES = Object.freeze([
  'tests/arena/p7-versioned-candidate-reachability.test.ts',
  'tests/arena/a7-formal-evidence-store-adapters-candidate-v1.test.ts',
]);

async function assertFiles(root: string, files: readonly string[]): Promise<void> {
  if (files.length === 0 || new Set(files).size !== files.length) {
    throw new RangeError('P7定向测试清单必须非空且不得重复。');
  }
  for (const relative of files) {
    const stat = await lstat(path.join(root, relative));
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new TypeError(`${relative}必须是真实测试文件。`);
    }
  }
}

async function run(root: string, label: string, args: readonly string[]): Promise<void> {
  const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit' });
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
  const root = process.cwd();
  await assertFiles(root, [...VITEST_FILES, ...NODE_TEST_FILES]);
  await run(root, 'P7候选Vitest', [
    path.join(root, 'node_modules/vitest/vitest.mjs'),
    'run', '--maxWorkers=1', '--fileParallelism=false', ...VITEST_FILES,
  ]);
  await run(root, 'P7候选可达性Node测试', [
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
