import {
  ARENA_REGRESSION_COMPONENT_ID,
  createArenaRegressionEvidenceReport,
  createArenaStage9RegressionEvidenceV1Definition,
  type ArenaRegressionComponentDefinition,
  type ArenaRegressionEvidenceReport,
} from '@number-strategy-jump/arena-regression';
import type { ArenaGitSourceIdentity } from '../arena-git-source-identity.js';
import {
  runArenaChildProcess,
  type ArenaChildProcessResult,
} from './arena-child-process.js';

const PROCESS_TIMEOUT_MS = 10 * 60 * 1000;
const MAXIMUM_STDOUT_BYTES = 16 * 1024 * 1024;
const MAXIMUM_STDERR_BYTES = 4 * 1024 * 1024;

type RegressionProcessOutput = 'json' | 'tap';

interface RegressionProcessDefinition {
  readonly id: string;
  readonly args: readonly string[];
  readonly output: RegressionProcessOutput;
}

type RunChildProcess = typeof runArenaChildProcess;
type ArenaRegressionEvidenceRuntime = ArenaRegressionEvidenceReport['runtime'];

function componentDefinition(id: string): Readonly<ArenaRegressionComponentDefinition> {
  const definition = createArenaStage9RegressionEvidenceV1Definition().components.find((value) => (
    value.id === id
  ));
  if (!definition) throw new RangeError(`未知 Regression component ${id}。`);
  return definition;
}

function requiredNumber(value: number | undefined, name: string): number {
  if (value === undefined) throw new Error(`${name} 未在 Definition 中配置。`);
  return value;
}

function requiredStrings(value: readonly string[] | undefined, name: string): readonly string[] {
  if (!value) throw new Error(`${name} 未在 Definition 中配置。`);
  return value;
}

function processDefinitions(): readonly Readonly<RegressionProcessDefinition>[] {
  const inputFuzz = componentDefinition(ARENA_REGRESSION_COMPONENT_ID.INPUT_FUZZ);
  const lifecycle = componentDefinition(ARENA_REGRESSION_COMPONENT_ID.LIFECYCLE_TESTS);
  const presentation = componentDefinition(
    ARENA_REGRESSION_COMPONENT_ID.PRESENTATION_SESSION_SOAK,
  );
  const productPresentation = componentDefinition(
    ARENA_REGRESSION_COMPONENT_ID.PRODUCT_PRESENTATION_SESSION_SOAK,
  );
  const stress = componentDefinition(ARENA_REGRESSION_COMPONENT_ID.PRODUCT_SESSION_STRESS);
  return Object.freeze([
    Object.freeze({
      id: inputFuzz.id,
      args: Object.freeze([
        '--import',
        'tsx',
        'scripts/arena-input-fuzz.ts',
        `--matches=${requiredNumber(inputFuzz.matchesPerMapper, 'inputFuzz.matchesPerMapper')}`,
        `--replay-samples=${requiredNumber(inputFuzz.replaySamplesPerMapper, 'inputFuzz.replaySamplesPerMapper')}`,
      ]),
      output: 'json',
    }),
    Object.freeze({
      id: lifecycle.id,
      args: Object.freeze([
        '--import',
        'tsx',
        '--test',
        ...requiredStrings(lifecycle.testFiles, 'lifecycle.testFiles'),
      ]),
      output: 'tap',
    }),
    Object.freeze({
      id: presentation.id,
      args: Object.freeze([
        '--import',
        'tsx',
        '--expose-gc',
        'scripts/arena-presentation-session-soak.ts',
        `--matches=${requiredNumber(presentation.matches, 'presentation.matches')}`,
      ]),
      output: 'json',
    }),
    Object.freeze({
      id: productPresentation.id,
      args: Object.freeze([
        '--import',
        'tsx',
        '--expose-gc',
        'scripts/arena-product-presentation-session-soak.ts',
        `--matches=${requiredNumber(productPresentation.matches, 'productPresentation.matches')}`,
      ]),
      output: 'json',
    }),
    Object.freeze({
      id: stress.id,
      args: Object.freeze([
        '--import',
        'tsx',
        'scripts/arena-product-session-stress.ts',
        `--matches=${requiredNumber(stress.matches, 'stress.matches')}`,
      ]),
      output: 'json',
    }),
  ]);
}

function failureTail(value: string): string {
  return value.trim().slice(-2_000);
}

function assertSuccessfulProcess(
  definition: Readonly<RegressionProcessDefinition>,
  result: Readonly<ArenaChildProcessResult>,
): void {
  if (result.exitCode !== 0 || result.signal !== null) {
    throw new Error(
      `Regression component ${definition.id} 失败（exit=${String(result.exitCode)}, signal=${String(result.signal)}）`
      + `${result.stderr ? `：${failureTail(result.stderr)}` : '。'}`,
    );
  }
  if (result.stderr.trim().length > 0) {
    throw new Error(`Regression component ${definition.id} 产生 stderr：${failureTail(result.stderr)}`);
  }
}

function parseJsonOutput(definition: Readonly<RegressionProcessDefinition>, stdout: string): unknown {
  try {
    return JSON.parse(stdout);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Regression component ${definition.id} 未输出唯一有效 JSON：${message}`);
  }
}

function tapCount(stdout: string, name: string): number {
  const pattern = new RegExp(`^# ${name} (\\d+)$`, 'gm');
  const matches = [...stdout.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`Lifecycle TAP 必须精确包含一个 # ${name} 汇总。`);
  }
  const match = matches[0];
  if (!match?.[1]) throw new Error(`Lifecycle TAP 缺少 # ${name} 汇总。`);
  return Number(match[1]);
}

function parseLifecycleOutput(stdout: string): Record<string, unknown> {
  const plans = [...stdout.matchAll(/^1\.\.(\d+)$/gm)];
  if (!/^TAP version 13$/m.test(stdout) || plans.length !== 1) {
    throw new Error('Lifecycle regression 未输出完整 TAP 13 计划。');
  }
  const definition = componentDefinition(ARENA_REGRESSION_COMPONENT_ID.LIFECYCLE_TESTS);
  const result = Object.freeze({
    id: definition.id,
    testFileCount: requiredStrings(definition.testFiles, 'lifecycle.testFiles').length,
    testCount: tapCount(stdout, 'tests'),
    passCount: tapCount(stdout, 'pass'),
    failCount: tapCount(stdout, 'fail'),
    cancelledCount: tapCount(stdout, 'cancelled'),
    skippedCount: tapCount(stdout, 'skipped'),
    todoCount: tapCount(stdout, 'todo'),
  });
  const plan = plans[0];
  if (!plan?.[1] || Number(plan[1]) !== result.testCount) {
    throw new Error('Lifecycle TAP 计划与 tests 汇总不一致。');
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function inputFuzzComponent(value: unknown): Record<string, unknown> {
  const definition = componentDefinition(ARENA_REGRESSION_COMPONENT_ID.INPUT_FUZZ);
  if (
    !isRecord(value)
    || value.mode !== 'batch-fuzz'
    || value.reproductionCase !== null
    || !isRecord(value.mappers)
  ) throw new Error('Input fuzz 输出不是完整 batch-fuzz 结果。');
  const mappers = value.mappers;
  const mapperKeys = Object.keys(mappers).sort();
  if (
    mapperKeys.length !== requiredStrings(definition.mapperIds, 'inputFuzz.mapperIds').length
    || mapperKeys.some((id, index) => id !== requiredStrings(definition.mapperIds, 'inputFuzz.mapperIds')[index])
  ) throw new Error('Input fuzz 输出未精确覆盖固定 InputMapper。');
  return {
    id: definition.id,
    matchesPerMapper: value.matchesPerMapper,
    totalMatches: value.totalMatches,
    replaySamplesPerMapper: value.replaySamplesPerMapper,
    verifiedReplays: value.verifiedReplays,
    uniqueFinalHashes: value.uniqueFinalHashes,
    mappers: requiredStrings(definition.mapperIds, 'inputFuzz.mapperIds').map((id) => {
      const mapper = mappers[id];
      if (!isRecord(mapper)) throw new Error(`Input fuzz mapper ${id} 输出无效。`);
      return { id, ...mapper };
    }),
    operations: value.operations,
    frameCounts: value.frameCounts,
  };
}

function presentationComponent(value: unknown, product: boolean): Record<string, unknown> {
  const id = product
    ? ARENA_REGRESSION_COMPONENT_ID.PRODUCT_PRESENTATION_SESSION_SOAK
    : ARENA_REGRESSION_COMPONENT_ID.PRESENTATION_SESSION_SOAK;
  return {
    id,
    ...(product ? { ok: isRecord(value) ? value.ok : undefined, uniqueAuthorityHashes: isRecord(value) ? value.uniqueAuthorityHashes : undefined } : {}),
    matches: isRecord(value) ? value.matches : undefined,
    uniqueMatchSeeds: isRecord(value) ? value.uniqueMatchSeeds : undefined,
    heapGrowthBytes: isRecord(value) ? value.heapGrowthBytes : undefined,
    heapGrowthBudgetBytes: isRecord(value) ? value.heapGrowthBudgetBytes : undefined,
    remainingFrames: isRecord(value) ? value.remainingFrames : undefined,
    remainingLifecycleListeners: isRecord(value) ? value.remainingLifecycleListeners : undefined,
    remainingCanvasListeners: isRecord(value) ? value.remainingCanvasListeners : undefined,
    inputBound: isRecord(value) ? value.inputBound : undefined,
    diagnostics: isRecord(value) ? value.diagnostics : undefined,
  };
}

function productStressComponent(value: unknown): Record<string, unknown> {
  const record = isRecord(value) ? value : {};
  return {
    id: ARENA_REGRESSION_COMPONENT_ID.PRODUCT_SESSION_STRESS,
    ok: record.ok,
    matches: record.matches,
    authorityHashCount: record.authorityHashCount,
    contentHashCount: record.contentHashCount,
    lifecycleTransitions: record.lifecycleTransitions,
    rematches: record.rematches,
    maximumTicks: record.maximumTicks,
    restarts: record.restarts,
    experience: record.experience,
    latestGrantId: record.latestGrantId,
  };
}

function normalizeComponent(
  definition: Readonly<RegressionProcessDefinition>,
  stdout: string,
): Record<string, unknown> {
  if (definition.output === 'tap') return parseLifecycleOutput(stdout);
  const value = parseJsonOutput(definition, stdout);
  if (definition.id === ARENA_REGRESSION_COMPONENT_ID.INPUT_FUZZ) {
    return inputFuzzComponent(value);
  }
  if (definition.id === ARENA_REGRESSION_COMPONENT_ID.PRESENTATION_SESSION_SOAK) {
    return presentationComponent(value, false);
  }
  if (definition.id === ARENA_REGRESSION_COMPONENT_ID.PRODUCT_PRESENTATION_SESSION_SOAK) {
    return presentationComponent(value, true);
  }
  return productStressComponent(value);
}

export function describeArenaRegressionEvidenceProcesses(): readonly Readonly<{
  id: string;
  executable: 'node';
  args: readonly string[];
  output: RegressionProcessOutput;
}>[] {
  return Object.freeze(processDefinitions().map(({ id, args, output }) => Object.freeze({
    id,
    executable: 'node',
    args,
    output,
  })));
}

export async function produceArenaRegressionEvidenceReport({
  root,
  sourceIdentity,
  generatedAt,
  runtime,
  runChildProcess = runArenaChildProcess,
}: Readonly<{
  root: string;
  sourceIdentity: Readonly<ArenaGitSourceIdentity>;
  generatedAt: string;
  runtime: Readonly<ArenaRegressionEvidenceRuntime>;
  runChildProcess?: RunChildProcess;
}>): Promise<Readonly<ArenaRegressionEvidenceReport>> {
  const components: Record<string, unknown>[] = [];
  for (const definition of processDefinitions()) {
    const result = await runChildProcess({
      command: process.execPath,
      args: definition.args,
      cwd: root,
      timeoutMs: PROCESS_TIMEOUT_MS,
      maximumStdoutBytes: MAXIMUM_STDOUT_BYTES,
      maximumStderrBytes: MAXIMUM_STDERR_BYTES,
    });
    assertSuccessfulProcess(definition, result);
    components.push(normalizeComponent(definition, result.stdout));
  }
  return createArenaRegressionEvidenceReport({
    sourceCommit: sourceIdentity.sourceCommit,
    sourceDirty: sourceIdentity.sourceDirty,
    generatedAt,
    runtime,
    components,
  });
}
