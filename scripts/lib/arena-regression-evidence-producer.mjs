import {
  ARENA_REGRESSION_COMPONENT_ID,
  createArenaRegressionEvidenceReport,
  createArenaStage9RegressionEvidenceV1Definition,
} from '@number-strategy-jump/arena-regression';
import { runArenaChildProcess } from './arena-child-process.ts';

const PROCESS_TIMEOUT_MS = 10 * 60 * 1000;
const MAXIMUM_STDOUT_BYTES = 16 * 1024 * 1024;
const MAXIMUM_STDERR_BYTES = 4 * 1024 * 1024;

function componentDefinition(id) {
  return createArenaStage9RegressionEvidenceV1Definition().components.find((value) => (
    value.id === id
  ));
}

function processDefinitions() {
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
        'scripts/arena-input-fuzz.mjs',
        `--matches=${inputFuzz.matchesPerMapper}`,
        `--replay-samples=${inputFuzz.replaySamplesPerMapper}`,
      ]),
      output: 'json',
    }),
    Object.freeze({
      id: lifecycle.id,
      args: Object.freeze(['--test', ...lifecycle.testFiles]),
      output: 'tap',
    }),
    Object.freeze({
      id: presentation.id,
      args: Object.freeze([
        '--expose-gc',
        'scripts/arena-presentation-session-soak.mjs',
        `--matches=${presentation.matches}`,
      ]),
      output: 'json',
    }),
    Object.freeze({
      id: productPresentation.id,
      args: Object.freeze([
        '--expose-gc',
        'scripts/arena-product-presentation-session-soak.mjs',
        `--matches=${productPresentation.matches}`,
      ]),
      output: 'json',
    }),
    Object.freeze({
      id: stress.id,
      args: Object.freeze([
        'scripts/arena-product-session-stress.mjs',
        `--matches=${stress.matches}`,
      ]),
      output: 'json',
    }),
  ]);
}

function failureTail(value) {
  return value.trim().slice(-2_000);
}

function assertSuccessfulProcess(definition, result) {
  if (!result || typeof result !== 'object') {
    throw new TypeError(`Regression component ${definition.id} 没有返回子进程结果。`);
  }
  if (typeof result.stdout !== 'string' || typeof result.stderr !== 'string') {
    throw new TypeError(`Regression component ${definition.id} 子进程输出合同无效。`);
  }
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

function parseJsonOutput(definition, stdout) {
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`Regression component ${definition.id} 未输出唯一有效 JSON：${error.message}`);
  }
}

function tapCount(stdout, name) {
  const pattern = new RegExp(`^# ${name} (\\d+)$`, 'gm');
  const matches = [...stdout.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error(`Lifecycle TAP 必须精确包含一个 # ${name} 汇总。`);
  }
  return Number(matches[0][1]);
}

function parseLifecycleOutput(stdout) {
  const plans = [...stdout.matchAll(/^1\.\.(\d+)$/gm)];
  if (!/^TAP version 13$/m.test(stdout) || plans.length !== 1) {
    throw new Error('Lifecycle regression 未输出完整 TAP 13 计划。');
  }
  const definition = componentDefinition(ARENA_REGRESSION_COMPONENT_ID.LIFECYCLE_TESTS);
  const result = Object.freeze({
    id: definition.id,
    testFileCount: definition.testFiles.length,
    testCount: tapCount(stdout, 'tests'),
    passCount: tapCount(stdout, 'pass'),
    failCount: tapCount(stdout, 'fail'),
    cancelledCount: tapCount(stdout, 'cancelled'),
    skippedCount: tapCount(stdout, 'skipped'),
    todoCount: tapCount(stdout, 'todo'),
  });
  if (Number(plans[0][1]) !== result.testCount) {
    throw new Error('Lifecycle TAP 计划与 tests 汇总不一致。');
  }
  return result;
}

function inputFuzzComponent(value) {
  const definition = componentDefinition(ARENA_REGRESSION_COMPONENT_ID.INPUT_FUZZ);
  if (
    !value
    || typeof value !== 'object'
    || value.mode !== 'batch-fuzz'
    || value.reproductionCase !== null
    || !value.mappers
    || typeof value.mappers !== 'object'
    || Array.isArray(value.mappers)
  ) throw new Error('Input fuzz 输出不是完整 batch-fuzz 结果。');
  const mapperKeys = Object.keys(value.mappers).sort();
  if (
    mapperKeys.length !== definition.mapperIds.length
    || mapperKeys.some((id, index) => id !== definition.mapperIds[index])
  ) throw new Error('Input fuzz 输出未精确覆盖固定 InputMapper。');
  return {
    id: definition.id,
    matchesPerMapper: value.matchesPerMapper,
    totalMatches: value.totalMatches,
    replaySamplesPerMapper: value.replaySamplesPerMapper,
    verifiedReplays: value.verifiedReplays,
    uniqueFinalHashes: value.uniqueFinalHashes,
    mappers: definition.mapperIds.map((id) => ({ id, ...value.mappers[id] })),
    operations: value.operations,
    frameCounts: value.frameCounts,
  };
}

function presentationComponent(value, product) {
  const id = product
    ? ARENA_REGRESSION_COMPONENT_ID.PRODUCT_PRESENTATION_SESSION_SOAK
    : ARENA_REGRESSION_COMPONENT_ID.PRESENTATION_SESSION_SOAK;
  return {
    id,
    ...(product ? { ok: value?.ok, uniqueAuthorityHashes: value?.uniqueAuthorityHashes } : {}),
    matches: value?.matches,
    uniqueMatchSeeds: value?.uniqueMatchSeeds,
    heapGrowthBytes: value?.heapGrowthBytes,
    heapGrowthBudgetBytes: value?.heapGrowthBudgetBytes,
    remainingFrames: value?.remainingFrames,
    remainingLifecycleListeners: value?.remainingLifecycleListeners,
    remainingCanvasListeners: value?.remainingCanvasListeners,
    inputBound: value?.inputBound,
    diagnostics: value?.diagnostics,
  };
}

function productStressComponent(value) {
  return {
    id: ARENA_REGRESSION_COMPONENT_ID.PRODUCT_SESSION_STRESS,
    ok: value?.ok,
    matches: value?.matches,
    authorityHashCount: value?.authorityHashCount,
    contentHashCount: value?.contentHashCount,
    lifecycleTransitions: value?.lifecycleTransitions,
    rematches: value?.rematches,
    maximumTicks: value?.maximumTicks,
    restarts: value?.restarts,
    experience: value?.experience,
    latestGrantId: value?.latestGrantId,
  };
}

function normalizeComponent(definition, stdout) {
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

export function describeArenaRegressionEvidenceProcesses() {
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
}) {
  const components = [];
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
