import { spawn } from 'node:child_process';
import { lstat } from 'node:fs/promises';
import path from 'node:path';

const VITEST_FILES = Object.freeze([
  'packages/arena-profile-contracts/test/arena-v2-learning-profile-v1.test.ts',
  'packages/arena-storage/test/synchronous-storage-lease.test.ts',
  'packages/arena-profile-persistence/test/arena-v2-learning-profile-repository-v1.test.ts',
  'packages/arena-profile-service/test/arena-v2-learning-profile-service-v1.test.ts',
  'packages/arena-product-match/test/product-result-replay-settlement-evidence-v1.test.ts',
  'packages/arena-product-progression/test/arena-v2-learning-information-and-retention.test.ts',
  'packages/arena-product-progression/test/arena-v2-collection-mastery-detail-facts-projection-v1.test.ts',
  'packages/arena-product-progression/test/arena-v2-collection-next-goal-identity-projection-v1.test.ts',
  'packages/arena-product-progression/test/arena-v2-next-learning-goal-continuation-route-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-home-next-learning-signature-information-projection-candidate-v1.test.ts',
  'packages/arena-product-progression/test/arena-v2-collection-progress-summary-facts-projection-v1.test.ts',
  'packages/arena-product-progression/test/arena-v2-weapon-collection-research-milestone-projection-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-weapon-collection-research-selection-projection-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-competitive-repeatable-challenge-information-projection-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-result-home-continuation-receipt-information-projection-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-result-new-collection-detail-render-plan-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-canonical-intent-component-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-information-selection-action-accessibility-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-character-information-projection-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-ui-surface-candidates-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-mode-hud-effects-and-markers-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-mode-hud-presentation-host-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-twenty-weapon-feedback-hud-host-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-home-record-summary-information-projection-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-mode-mastery-selection-information-projection-candidate-v1.test.ts',
  'packages/arena-product-composition/test/arena-v2-learning-candidate-v1.test.ts',
  'packages/arena-product-composition/test/arena-v2-learning-settlement-recovery-owner-candidate-v1.test.ts',
  'packages/arena-product-composition/test/arena-v2-learning-settlement-intent-journal-candidate-v1.test.ts',
  'packages/arena-product-composition/test/arena-v2-learning-mode-session-bridge-candidate-v1.test.ts',
  'packages/arena-product-composition/test/arena-v2-information-mode-session-host-candidate-v1.test.ts',
  'packages/arena-product-composition/test/arena-v2-mode-learning-session-factory-candidate-v1.test.ts',
  'packages/arena-product-composition/test/arena-v2-quick-match-bundle-factory-candidate-v1.test.ts',
  'packages/arena-regression/test/arena-three-mode-mode-registry-preflight-quick-match-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-collection-progress-component-set-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-collection-formal-asset-reuse-binding-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-profile-collection-progress-input-adapter-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-profile-collection-mastery-detail-input-adapter-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-collection-mastery-detail-composition-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-collection-next-goal-first-screen-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-collection-four-screen-read-owner-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-collection-visible-preview-lease-command-planning-owner-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-collection-preview-lazy-gltf-loader-adapter-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-collection-formal-preview-lease-owner-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-collection-visible-preview-lease-command-execution-owner-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-collection-preview-mount-lifecycle-destroy-proof-owner-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-weapon-collection-preview-three-mount-owner-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-weapon-collection-multi-slot-preview-render-surface-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-collection-formal-preview-resource-execution-composition-owner-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-collection-visible-layout-observation-owner-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-collection-preview-page-transaction-owner-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-collection-preview-page-surface-host-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-collection-preview-render-plan-layout-bridge-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-information-collection-preview-surface-composition-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-information-collection-preview-surface-composition-integration-candidate-v1.test.ts',
]);
const NODE_TEST_FILES = Object.freeze([
  'tests/arena/p6-versioned-candidate-reachability.test.ts',
  'tests/arena/a6-16-17-information-collection-preview-wiring-candidate-v1.test.ts',
  'tests/arena/p5-formal-web-playable-composition-lifecycle-candidate-v1.test.ts',
  'tests/arena/p5-formal-hud-canvas-ready-announcement-candidate-v1.test.ts',
]);

async function assertFiles(root: string, paths: readonly string[]): Promise<void> {
  if (paths.length === 0 || new Set(paths).size !== paths.length) {
    throw new RangeError('P6定向测试清单必须非空且不得重复。');
  }
  for (const relative of paths) {
    const stat = await lstat(path.join(root, relative));
    if (stat.isSymbolicLink() || !stat.isFile()) throw new TypeError(`${relative}必须是真实文件。`);
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
  await run(root, 'P6 Vitest定向测试', [
    path.join(root, 'node_modules/vitest/vitest.mjs'),
    'run', '--maxWorkers=1', '--fileParallelism=false', ...VITEST_FILES,
  ]);
  await run(root, 'P6 Node架构测试', [
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
