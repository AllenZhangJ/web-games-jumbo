import { spawn } from 'node:child_process';
import { lstat } from 'node:fs/promises';
import path from 'node:path';

const VITEST_FILES = Object.freeze([
  'packages/arena-product-presentation/test/arena-v2-a3-a6-formal-asset-production-work-queue-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-a3-map-production-review-preparation-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-a3-survival-enemy-production-review-preparation-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-a4-playable-character-production-review-preparation-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-a4-weapon-attachment-production-review-preparation-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-a4-formal-material-texture-production-review-preparation-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-a4-weapon-impact-audio-production-review-preparation-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-a4-weapon-phase-audio-production-review-preparation-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-a5-core-feedback-vfx-production-review-preparation-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-a5-mode-and-supply-audio-production-review-preparation-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-a3-a6-formal-asset-production-review-program-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-a3-a6-production-review-evidence-submission-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-a3-a6-production-review-evidence-independent-evaluation-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-a3-a6-production-review-accepted-evidence-set-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-a3-a6-production-approval-decision-record-candidate-v1.test.ts',
]);

async function assertFixedManifest(root: string): Promise<void> {
  if (VITEST_FILES.length !== 15 || new Set(VITEST_FILES).size !== VITEST_FILES.length) {
    throw new RangeError('A3–A6生产准备候选直接规格必须精确为15个唯一文件。');
  }
  for (const relative of VITEST_FILES) {
    const stat = await lstat(path.join(root, relative));
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new TypeError(`${relative}必须是真实直接规格文件。`);
    }
  }
}

async function run(root: string): Promise<void> {
  const child = spawn(process.execPath, [
    path.join(root, 'node_modules/vitest/vitest.mjs'),
    'run',
    '--maxWorkers=1',
    '--fileParallelism=false',
    ...VITEST_FILES,
  ], { cwd: root, stdio: 'inherit' });
  const result = await new Promise<Readonly<{
    code: number | null;
    signal: NodeJS.Signals | null;
  }>>((resolveResult, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolveResult({ code, signal }));
  });
  if (result.signal !== null) throw new Error(`A3–A6生产准备候选规格被${result.signal}终止。`);
  if (result.code !== 0) throw new Error(`A3–A6生产准备候选规格失败，退出码${String(result.code)}。`);
}

async function main(): Promise<void> {
  const root = process.cwd();
  await assertFixedManifest(root);
  await run(root);
  console.log(JSON.stringify({
    status: 'passed',
    vitestFileCount: 15,
    productionBatchCount: 9,
    formalAssetCount: 130,
    missingEvidenceSlotCount: 910,
    reviewUnitCount: 95,
    productionApprovalCount: 0,
    executesReviews: false,
    hardGate: false,
  }));
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
