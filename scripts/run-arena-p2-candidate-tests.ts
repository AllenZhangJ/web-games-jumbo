import { spawn } from 'node:child_process';
import { lstat } from 'node:fs/promises';
import path from 'node:path';

const VITEST_FILES = Object.freeze([
  // P2.0s shared synchronous-return boundary and direct Presentation consumers.
  'packages/arena-contracts/test/contracts.test.ts',
  'packages/arena-contracts/test/arena-public-supply-projection-v3.test.ts',
  'packages/arena-contracts/test/match-content-selection-v2.test.ts',
  'packages/arena-contracts/test/match-equipment-usage-v3.test.ts',
  'packages/arena-contracts/test/match-event-v6.test.ts',
  'packages/arena-contracts/test/match-participant-assignment-v2.test.ts',
  'packages/arena-contracts/test/match-read-frame-v3.test.ts',
  'packages/arena-definitions/test/mode-definition.test.ts',
  // P2.0o/ADR-129 resolved Relationship -> Rule target eligibility matrix.
  'packages/arena-core/test/action-primitives.test.ts',
  // P2.0m Input Pilot observed-session synchronous port hardening.
  'packages/arena-input-pilot/test/input-pilot-vocabulary.test.ts',
  'packages/arena-match/test/duel-mode-adapter-v6.test.ts',
  'packages/arena-match/test/match-config-v6.test.ts',
  'packages/arena-match/test/match-mode-system.test.ts',
  'packages/arena-match/test/match-participant-system-v2.test.ts',
  'packages/arena-match/test/mode-checkpoint-v2.test.ts',
  'packages/arena-match/test/mode-match-runtime-checkpoint-v1.test.ts',
  'packages/arena-match/test/mode-match-runtime-v6.test.ts',
  'packages/arena-match/test/mode-match-runtime-terminal-evidence-v1.test.ts',
  'packages/arena-match/test/mode-policy-resolver.test.ts',
  // P2.0q/ADR-132 resolved Objective Policy -> terminal authority-fact assertion.
  'packages/arena-match/test/mode-objective-policy-resolver-v1.test.ts',
  // P2.0r/ADR-133 explicit Timeline Policy -> runtime mirror capability, still unwired.
  'packages/arena-match/test/mode-timeline-policy-resolver-v1.test.ts',
  // P2.0p/ADR-131 resolved Result Policy -> per-match terminal result assertion.
  'packages/arena-match/test/mode-result-policy-resolver-v1.test.ts',
  'packages/arena-match/test/race-mode-system.test.ts',
  'packages/arena-match/test/replay-v6.test.ts',
  'packages/arena-match/test/survival-mode-system.test.ts',
  'packages/arena-matchmaking/test/mode-match-assignment-v2.test.ts',
  'packages/arena-product-composition/test/mode-product-session-composition-v2.test.ts',
  'packages/arena-product-composition/test/arena-v2-quick-match-bundle-factory-candidate-v1.test.ts',
  'packages/arena-product-content/test/arena-v2-three-mode-registry-candidate-v1.test.ts',
  'packages/arena-product-content/test/arena-v2-three-mode-timeline-product-proposal-candidate-v1.test.ts',
  'packages/arena-product-content/test/frozen-mode-match-content-pool-v2.test.ts',
  'packages/arena-product-content/test/product-content-boundaries.test.ts',
  'packages/arena-product-contracts/test/product-match-result-v3.test.ts',
  'packages/arena-product-match/test/product-match-lifecycle.test.ts',
  'packages/arena-product-match/test/mode-product-result-assembler-v3.test.ts',
  'packages/arena-product-match/test/product-result-replay-settlement-evidence-v1.test.ts',
  'packages/arena-product-progression/test/mode-reward-resolver-v2.test.ts',
  'packages/arena-product-progression/test/product-progression.test.ts',
  'packages/arena-product-session/test/mode-product-session-v2.test.ts',
  'packages/arena-product-session/test/product-session-lifecycle.test.ts',
  'packages/arena-progression/test/mode-progression-v2.test.ts',
  'packages/arena-quick-match/test/mode-quick-match-service-v2.test.ts',
  'packages/arena-presentation-runtime/test/capability-utils-dedup.test.ts',
  'packages/arena-product-presentation/test/product-presentation-boundaries.test.ts',
  'packages/arena-product-presentation/test/arena-v2-mode-hud-effects-and-markers-v1.test.ts',
  'packages/arena-regression/test/arena-mode-golden-manifest-v2.test.ts',
  'packages/arena-regression/test/arena-mode-verification-plan-v1.test.ts',
  'packages/arena-regression/test/arena-mode-verification-runner-v1.test.ts',
  'packages/arena-regression/test/arena-mode-verification-fixture-v1.test.ts',
  'packages/arena-regression/test/arena-mode-verification-runtime-factory-v1.test.ts',
  'packages/arena-regression/test/arena-replay-v6-mode-checkpoint-v2-regression.test.ts',
  // P2.0e-f factory/Host wiring + P2.0g-A reusable pure preflight boundary.
  'packages/arena-regression/test/arena-three-mode-mode-registry-preflight-quick-match-candidate-v1.test.ts',
  'packages/arena-session/test/mode-authoritative-local-match-session-v3.test.ts',
  'packages/arena-session/test/mode-local-match-session-v2.test.ts',
]);

const NODE_TEST_FILES = Object.freeze([
  'packages/arena-match/test/mode-match-runtime-checkpoint-v3.test.ts',
  'packages/arena-match/test/mode-match-runtime-checkpoint-v4.test.ts',
  // P2.0s synchronous cleanup and Replay then-data rejection boundaries.
  'tests/arena/match-core.test.ts',
  'tests/arena/match-core-survival-supply.test.ts',
  // P2.0g-B Replay beforeStep synchronous thenable containment boundary.
  'tests/arena/replay.test.ts',
  'tests/arena/p2-versioned-candidate-reachability.test.ts',
]);

interface ChildResult {
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
}

async function assertRegularFiles(repositoryRoot: string, files: readonly string[]): Promise<void> {
  const uniqueFiles = new Set(files);
  if (uniqueFiles.size !== files.length || files.length === 0) {
    throw new RangeError('P2定向测试清单必须非空且不得重复。');
  }
  for (const file of files) {
    const stat = await lstat(path.join(repositoryRoot, file));
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new TypeError(`${file} 必须是真实测试文件。`);
    }
  }
}

async function runChild(
  repositoryRoot: string,
  label: string,
  executable: string,
  args: readonly string[],
): Promise<void> {
  const child = spawn(executable, args, {
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
  let result: ChildResult;
  try {
    result = await new Promise<ChildResult>((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => resolve({ code, signal }));
    });
  } finally {
    process.removeListener('SIGINT', forwardSigint);
    process.removeListener('SIGTERM', forwardSigterm);
  }
  if (result.signal !== null) throw new Error(`${label} 被 ${result.signal} 终止。`);
  if (result.code !== 0) throw new Error(`${label} 失败，退出码 ${String(result.code)}。`);
}

async function main(): Promise<void> {
  const repositoryRoot = process.cwd();
  await assertRegularFiles(repositoryRoot, [...VITEST_FILES, ...NODE_TEST_FILES]);

  await runChild(
    repositoryRoot,
    'P2 Vitest定向测试',
    process.execPath,
    [
      path.join(repositoryRoot, 'node_modules/vitest/vitest.mjs'),
      'run',
      '--maxWorkers=1',
      '--fileParallelism=false',
      ...VITEST_FILES,
    ],
  );
  await runChild(
    repositoryRoot,
    'P2 Node架构测试',
    process.execPath,
    ['--import', 'tsx', '--test', ...NODE_TEST_FILES],
  );

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
