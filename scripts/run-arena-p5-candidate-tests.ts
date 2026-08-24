import { spawn } from 'node:child_process';
import { lstat } from 'node:fs/promises';
import path from 'node:path';

const VITEST_FILES = Object.freeze([
  'packages/arena-product-content/test/arena-v2-information-content-read-catalog-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-information-screen-registry-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-information-screen-view-model-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-information-content-read-projection-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-formal-asset-production-approval-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-weapon-map-learning-projection-candidate-v1.test.ts',
  // P5.3zzzq/P5.3zzzr share one availability fact parser and one deferred test file.
  'packages/arena-product-presentation/test/arena-v2-weapon-availability-information-projection-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-survival-repeatable-challenge-information-projection-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-competitive-repeatable-challenge-information-projection-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-result-home-continuation-receipt-information-projection-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-home-record-summary-information-projection-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-home-next-learning-signature-information-projection-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-information-screen-pipeline-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-information-selection-action-accessibility-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-information-navigation-session-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-product-session-information-projection-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-mode-content-information-projection-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-information-screen-layout-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-mode-hud-render-layout-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-mode-hud-effects-and-markers-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-mode-hud-presentation-host-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-mode-hud-validated-presentation-host-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-twenty-weapon-feedback-hud-adapter-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-twenty-weapon-feedback-hud-host-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-weapon-impact-strength-projection-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-ui-render-plan-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-ui-visual-tokens-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-ui-surface-candidates-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-collection-fallback-semantic-source-candidate-v1.test.ts',
  'packages/arena-product-presentation/test/arena-v2-formal-audio-combat-grammar-identity-candidate-v1.test.ts',
  'packages/arena-product-composition/test/arena-v2-information-mode-session-host-candidate-v1.test.ts',
  'packages/arena-product-composition/test/arena-v2-mode-learning-session-factory-candidate-v1.test.ts',
  'packages/arena-product-composition/test/arena-v2-quick-match-bundle-factory-candidate-v1.test.ts',
  'packages/arena-presentation-runtime/test/presentation-runtime.test.ts',
  'packages/arena-presentation-runtime/test/arena-v2-weapon-feedback-presentation.test.ts',
  'packages/arena-presentation-three/test/presentation-three.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-formal-gltf-character-view-animation-hold-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-formal-gltf-character-view-hit-direction-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-formal-three-asset-preloader-approval-gate-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-twenty-weapon-formal-vfx-combat-grammar-identity-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-twenty-weapon-audiovisual-manifest-combat-grammar-identity-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-collection-semantic-fallback-visual-profile-candidate-v1.test.ts',
  'packages/arena-product-presentation-three/test/arena-v2-collection-preview-render-plan-layout-bridge-candidate-v1.test.ts',
]);
const NODE_TEST_FILES = Object.freeze([
  'tests/arena/p5-versioned-candidate-reachability.test.ts',
  'tests/arena/p5-information-dom-surface-candidate-v1.test.ts',
  'tests/arena/p5-information-canvas-surface-candidate-v1.test.ts',
  'tests/arena/p5-formal-hud-canvas-ready-announcement-candidate-v1.test.ts',
  'tests/arena/p5-formal-three-camera-impact-candidate-v1.test.ts',
  'tests/arena/p5-formal-three-character-impact-readability-candidate-v1.test.ts',
  'tests/arena/p5-formal-three-asset-preloader-approval-gate-candidate-v1.test.ts',
  'tests/arena/p5-formal-asset-production-approval-loading-gates-candidate-v1.test.ts',
  'tests/arena/p5-formal-web-audio-bus-candidate-v1.test.ts',
  'tests/arena/p5-formal-web-mode-registry-preflight-adapter-candidate-v1.test.ts',
  'tests/arena/p5-formal-web-playable-composition-lifecycle-candidate-v1.test.ts',
  'tests/arena/p5-formal-web-pointer-surface-visual-tokens-v1.test.ts',
  'tests/arena/a6-16-17-information-collection-preview-wiring-candidate-v1.test.ts',
  'tests/arena/p5-character-selection-mode-loadout-preview-candidate-v1.test.ts',
]);

async function assertFiles(repositoryRoot: string, files: readonly string[]): Promise<void> {
  if (files.length === 0 || new Set(files).size !== files.length) {
    throw new RangeError('P5定向测试清单必须非空且不得重复。');
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
  await run(repositoryRoot, 'P5 Vitest定向测试', process.execPath, [
    path.join(repositoryRoot, 'node_modules/vitest/vitest.mjs'),
    'run',
    '--maxWorkers=1',
    '--fileParallelism=false',
    ...VITEST_FILES,
  ]);
  await run(repositoryRoot, 'P5 Node架构测试', process.execPath, [
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
