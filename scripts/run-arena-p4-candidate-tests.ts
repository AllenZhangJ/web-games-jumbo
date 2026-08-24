import { spawn } from 'node:child_process';
import { lstat } from 'node:fs/promises';
import path from 'node:path';

const VITEST_FILES = Object.freeze([
  'packages/arena-bot/test/survival-enemy-weapon-affordance-v1.test.ts',
  'packages/arena-contracts/test/weapon-feedback-semantic-v1.test.ts',
  'packages/arena-contracts/test/weapon-feedback-direction-fact-v2.test.ts',
  'packages/arena-contracts/test/match-event-v6.test.ts',
  'packages/arena-contracts/test/action-feedback-outcome-consistency-v1.test.ts',
  'packages/arena-contracts/test/competitive-equipment-action-eligibility-v1.test.ts',
  'packages/arena-contracts/test/survival-equipment-action-eligibility-v1.test.ts',
  'packages/arena-contracts/test/survival-equipment-ownership-consistency-v1.test.ts',
  'packages/arena-core/test/weapon-feedback-resolver-v1.test.ts',
  'packages/arena-core/test/weapon-feedback-result-direction-resolver-v2.test.ts',
  'packages/arena-core/test/action-primitives.test.ts',
  'packages/arena-core/test/begin-down-smash-action-effect-handler-v1.test.ts',
  'packages/arena-definitions/test/weapon-combat-grammar-definition-v1.test.ts',
  'packages/arena-product-content/test/arena-v2-heavy-hammer-weapon-candidate-v1.test.ts',
  'packages/arena-product-content/test/arena-v2-gravity-chain-weapon-candidate-v1.test.ts',
  'packages/arena-product-content/test/arena-v2-charge-shield-weapon-candidate-v1.test.ts',
  'packages/arena-product-content/test/arena-v2-line-suppressor-weapon-candidate-v1.test.ts',
  'packages/arena-product-content/test/arena-v2-read-counter-weapon-candidate-v1.test.ts',
  'packages/arena-product-content/test/arena-v2-flank-blade-weapon-candidate-v1.test.ts',
  'packages/arena-product-content/test/arena-v2-launch-weapon-catalog-candidate-v1.test.ts',
  'packages/arena-product-content/test/arena-v2-collection-weapon-catalog-candidate-v1.test.ts',
  'packages/arena-product-content/test/arena-v2-unarmed-action-candidate-v1.test.ts',
  'packages/arena-product-content/test/arena-v2-survival-baseline-weapon-tiers-candidate-v1.test.ts',
  'packages/arena-product-content/test/arena-v2-survival-pressure-candidate-v1.test.ts',
  'packages/arena-equipment/test/equipment-supply-wave-overrides.test.ts',
  'packages/arena-match/test/survival-pressure-resolver-v1.test.ts',
  'packages/arena-match/test/match-core-weapon-feedback-adapter-v1.test.ts',
  'packages/arena-match/test/match-core-weapon-feedback-direction-checkpoint-v2.test.ts',
  'packages/arena-match/test/match-core-weapon-feedback-direction-owner-v2.test.ts',
  'packages/arena-match/test/match-core-weapon-feedback-bundle-owner-v2.test.ts',
  'packages/arena-presentation-runtime/test/arena-v2-weapon-feedback-presentation.test.ts',
  'packages/arena-product-presentation/test/arena-v2-mode-hud-effects-and-markers-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-twenty-weapon-feedback-read-plan-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-twenty-weapon-feedback-hud-adapter-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-twenty-weapon-feedback-hud-host-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-twenty-weapon-feedback-vfx-resolution-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-twenty-weapon-feedback-vfx-port-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-twenty-weapon-feedback-direction-read-plan-candidate-v2.test.ts',
  'packages/arena-product-presentation/test/arena-v2-twenty-weapon-feedback-vfx-resolution-candidate-v2.test.ts',
  'packages/arena-product-presentation/test/arena-v2-weapon-impact-strength-projection-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-character-weapon-first-screen-readability-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-weapon-phase-audio-owner-candidate-v1.test.ts',
  'packages/arena-product-composition/test/arena-v2-single-weapon-production-readiness-candidate-v1.test.ts',
  'packages/arena-product-composition/test/arena-v2-single-weapon-production-assessment-candidate-v1.test.ts',
  'packages/arena-product-composition/test/arena-v2-single-weapon-registration-plan-candidate-v1.test.ts',
  'packages/arena-product-composition/test/arena-v2-single-weapon-registration-configuration-envelope-candidate-v1.test.ts',
  'packages/arena-product-composition/test/arena-v2-single-weapon-registry-snapshot-candidate-v1.test.ts',
  'packages/arena-product-composition/test/arena-v2-single-weapon-registry-publication-owner-candidate-v1.test.ts',
  'packages/arena-product-composition/test/arena-v2-in-memory-registry-publication-port-candidate-v1.test.ts',
  'packages/arena-regression/test/arena-baseline-weapon-consequence-verification-v1.test.ts',
  'packages/arena-regression/test/arena-baseline-weapon-matchcore-replay-verification-v1.test.ts',
  'packages/arena-regression/test/arena-expanded-weapon-counterplay-verification-v1.test.ts',
  'packages/arena-regression/test/arena-expanded-weapon-spatial-counterplay-verification-v1.test.ts',
  'packages/arena-regression/test/arena-expanded-weapon-verification-v1.test.ts',
  'packages/arena-regression/test/arena-line-suppressor-verification-v1.test.ts',
  'packages/arena-regression/test/arena-read-counter-verification-v1.test.ts',
  'packages/arena-regression/test/arena-flank-blade-verification-v1.test.ts',
  'packages/arena-regression/test/arena-survival-baseline-weapon-supply-verification-v1.test.ts',
  'packages/arena-regression/test/arena-survival-weapon-tier-consequence-verification-v1.test.ts',
  'packages/arena-regression/test/arena-survival-weapon-bot-affordance-verification-v1.test.ts',
  'packages/arena-regression/test/arena-survival-tiered-supply-matchcore-verification-v1.test.ts',
  'packages/arena-regression/test/arena-survival-pressure-bot-long-run-verification-v1.test.ts',
  'packages/arena-regression/test/arena-three-mode-weapon-feedback-restore-suffix-candidate-v1.test.ts',
  'packages/arena-regression/test/arena-three-mode-weapon-feedback-failure-injection-candidate-v1.test.ts',
  'packages/arena-regression/test/arena-three-mode-weapon-feedback-real-failure-replay-candidate-v1.test.ts',
  'packages/arena-regression/test/arena-three-mode-content-selection-checkpoint-capability-v1.test.ts',
  'packages/arena-regression/test/arena-v2-registry-backed-local-playable-owner-candidate-v1.test.ts',
]);
const NODE_TEST_FILES = Object.freeze([
  'tests/arena/p4-versioned-candidate-reachability.test.ts',
]);

async function assertFiles(repositoryRoot: string, files: readonly string[]): Promise<void> {
  if (files.length === 0 || new Set(files).size !== files.length) {
    throw new RangeError('P4定向测试清单必须非空且不得重复。');
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
  await run(repositoryRoot, 'P4 Vitest定向测试', process.execPath, [
    path.join(repositoryRoot, 'node_modules/vitest/vitest.mjs'),
    'run',
    '--maxWorkers=1',
    '--fileParallelism=false',
    ...VITEST_FILES,
  ]);
  await run(repositoryRoot, 'P4 Node架构测试', process.execPath, [
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
