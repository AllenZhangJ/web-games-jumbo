import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { assertEvidenceUtcInstant } from '@number-strategy-jump/arena-evidence-contracts';
import { createArenaExperimentDefinition } from '@number-strategy-jump/arena-experiment';
import { readArenaMetricGate } from '@number-strategy-jump/arena-experiment';

export const ARENA_EXPERIMENT_REPORT_SCHEMA_VERSION = 2;

export const ARENA_EXPERIMENT_CASE_STATUS = Object.freeze({
  COMPLETED: 'completed',
  FAILED: 'failed',
});

export const ARENA_EXPERIMENT_OUTCOME = Object.freeze({
  PASSED: 'passed',
  FAILED: 'failed',
});

const REPORT_KEYS = new Set(['generatedAt', 'environment', 'cases', 'metrics']);
const ENVIRONMENT_KEYS = new Set(['runtimeName', 'runtimeVersion', 'platform', 'architecture']);
const CASE_KEYS = new Set([
  'seed',
  'status',
  'ticks',
  'eventCount',
  'finalHash',
  'result',
  'failure',
]);
const FAILURE_KEYS = new Set(['name', 'message']);
const METRIC_KEYS = new Set(['id', 'version', 'data']);
const HASH_PATTERN = /^[0-9a-f]{8}$/;

function cloneEnvironment(value) {
  const name = 'ArenaExperimentReport.environment';
  assertKnownKeys(value, ENVIRONMENT_KEYS, name);
  return Object.freeze(Object.fromEntries([...ENVIRONMENT_KEYS].map((key) => [
    key,
    boundedText(value[key], 128, `${name}.${key}`),
  ])));
}

function boundedText(value, maximumLength, name) {
  const text = assertNonEmptyString(value, name);
  if (text.length > maximumLength) {
    throw new RangeError(`${name} 不能超过 ${maximumLength} 个字符。`);
  }
  return text;
}

function cloneFailure(value, name) {
  assertKnownKeys(value, FAILURE_KEYS, name);
  return Object.freeze({
    name: boundedText(value.name, 128, `${name}.name`),
    message: boundedText(value.message, 2_000, `${name}.message`),
  });
}

function cloneCases(values, definition) {
  if (!Array.isArray(values)) throw new TypeError('ArenaExperimentReport.cases 必须是数组。');
  const plannedSeeds = definition.getSeeds();
  if (values.length > plannedSeeds.length) {
    throw new RangeError('ArenaExperimentReport.cases 超过 Definition seed 数量。');
  }
  return Object.freeze(values.map((value, index) => {
    const name = `ArenaExperimentReport.cases[${index}]`;
    assertKnownKeys(value, CASE_KEYS, name);
    if (value.seed !== plannedSeeds[index]) {
      throw new RangeError(`${name}.seed 必须按 Definition 顺序执行。`);
    }
    const status = value.status;
    if (!Object.values(ARENA_EXPERIMENT_CASE_STATUS).includes(status)) {
      throw new RangeError(`${name}.status 不受支持：${String(status)}。`);
    }
    const finalHash = value.finalHash;
    const result = value.result === null
      ? null
      : cloneFrozenData(value.result, `${name}.result`);
    const failure = value.failure === null
      ? null
      : cloneFailure(value.failure, `${name}.failure`);
    if (status === ARENA_EXPERIMENT_CASE_STATUS.COMPLETED) {
      if (typeof finalHash !== 'string' || !HASH_PATTERN.test(finalHash)) {
        throw new TypeError(`${name}.finalHash 必须是 8 位小写十六进制 hash。`);
      }
      assertPlainRecord(result, `${name}.result`);
      if (failure !== null) throw new RangeError(`${name} completed 不能包含 failure。`);
    } else if (finalHash !== null || result !== null || failure === null) {
      throw new RangeError(`${name} failed 必须只包含 failure。`);
    }
    return Object.freeze({
      seed: value.seed,
      status,
      ticks: assertIntegerAtLeast(value.ticks, 0, `${name}.ticks`),
      eventCount: assertIntegerAtLeast(value.eventCount, 0, `${name}.eventCount`),
      finalHash,
      result,
      failure,
    });
  }));
}

function cloneMetrics(values, definition) {
  if (!Array.isArray(values)) throw new TypeError('ArenaExperimentReport.metrics 必须是数组。');
  if (values.length !== definition.collectors.length) {
    throw new RangeError('ArenaExperimentReport.metrics 必须覆盖全部 Definition collectors。');
  }
  return Object.freeze(values.map((value, index) => {
    const name = `ArenaExperimentReport.metrics[${index}]`;
    assertKnownKeys(value, METRIC_KEYS, name);
    const expected = definition.collectors[index];
    if (value.id !== expected.id || value.version !== expected.version) {
      throw new RangeError(`${name} 与 Definition collector 不一致。`);
    }
    const data = cloneFrozenData(value.data, `${name}.data`);
    assertPlainRecord(data, `${name}.data`);
    return Object.freeze({ id: expected.id, version: expected.version, data });
  }));
}

export function createArenaExperimentReport(definitionValue, value) {
  const definition = createArenaExperimentDefinition(definitionValue);
  const source = cloneFrozenData(value, 'ArenaExperimentReport source');
  assertKnownKeys(source, REPORT_KEYS, 'ArenaExperimentReport source');
  const cases = cloneCases(source.cases, definition);
  const metrics = cloneMetrics(source.metrics, definition);
  const completedCaseCount = cases.filter(({ status }) => (
    status === ARENA_EXPERIMENT_CASE_STATUS.COMPLETED
  )).length;
  const failedCaseCount = cases.length - completedCaseCount;
  const plannedCaseCount = definition.getSeeds().length;
  const remainingCaseCount = plannedCaseCount - cases.length;
  const failedMetricGates = Object.freeze(metrics.flatMap((metric) => {
    const gate = readArenaMetricGate(metric.data);
    if (gate === null || gate.passed) return [];
    return [Object.freeze({
      collectorId: metric.id,
      failedCheckIds: Object.freeze(gate.checks
        .filter(({ passed }) => !passed)
        .map(({ id }) => id)),
    })];
  }));
  const outcome = failedCaseCount === 0
    && remainingCaseCount === 0
    && failedMetricGates.length === 0
    ? ARENA_EXPERIMENT_OUTCOME.PASSED
    : ARENA_EXPERIMENT_OUTCOME.FAILED;
  const deterministicResult = Object.freeze({
    definitionHash: definition.getContentHash(),
    outcome,
    cases,
    metrics,
  });
  return cloneFrozenData({
    schemaVersion: ARENA_EXPERIMENT_REPORT_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    generatedAt: assertEvidenceUtcInstant(
      source.generatedAt,
      'ArenaExperimentReport.generatedAt',
    ),
    environment: cloneEnvironment(source.environment),
    outcome,
    freezeEligible: outcome === ARENA_EXPERIMENT_OUTCOME.PASSED
      && !definition.candidate.sourceDirty,
    stoppedEarly: remainingCaseCount > 0,
    plannedCaseCount,
    executedCaseCount: cases.length,
    completedCaseCount,
    failedCaseCount,
    remainingCaseCount,
    failedMetricGateCount: failedMetricGates.length,
    failedMetricGates,
    cases,
    metrics,
    resultHash: createDeterministicDataHash(
      deterministicResult,
      `ArenaExperimentReport ${definition.id}`,
    ),
  }, 'ArenaExperimentReport');
}
