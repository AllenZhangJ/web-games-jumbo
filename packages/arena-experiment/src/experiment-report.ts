import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import type { PlainRecord } from '@number-strategy-jump/arena-contracts';
import { assertEvidenceUtcInstant } from '@number-strategy-jump/arena-evidence-contracts';
import {
  createArenaExperimentDefinition,
  type ArenaExperimentDefinition,
  type ArenaExperimentDefinitionData,
} from './experiment-definition.js';
import { readArenaMetricGate } from './metric-gate.js';

export const ARENA_EXPERIMENT_REPORT_SCHEMA_VERSION = 2;
export const ARENA_EXPERIMENT_CASE_STATUS = Object.freeze({
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const);
export const ARENA_EXPERIMENT_OUTCOME = Object.freeze({
  PASSED: 'passed',
  FAILED: 'failed',
} as const);

const REPORT_KEYS: ReadonlySet<string> = new Set(['generatedAt', 'environment', 'cases', 'metrics']);
const ENVIRONMENT_KEYS = Object.freeze(['runtimeName', 'runtimeVersion', 'platform', 'architecture'] as const);
const CASE_KEYS: ReadonlySet<string> = new Set([
  'seed', 'status', 'ticks', 'eventCount', 'finalHash', 'result', 'failure',
]);
const FAILURE_KEYS: ReadonlySet<string> = new Set(['name', 'message']);
const METRIC_KEYS: ReadonlySet<string> = new Set(['id', 'version', 'data']);
const HASH_PATTERN = /^[0-9a-f]{8}$/;

export interface ArenaExperimentReportEnvironment {
  readonly runtimeName: string;
  readonly runtimeVersion: string;
  readonly platform: string;
  readonly architecture: string;
}
export interface ArenaExperimentFailure {
  readonly name: string;
  readonly message: string;
}
export interface ArenaExperimentCaseResult {
  readonly seed: number;
  readonly status: 'completed' | 'failed';
  readonly ticks: number;
  readonly eventCount: number;
  readonly finalHash: string | null;
  readonly result: Readonly<PlainRecord> | null;
  readonly failure: Readonly<ArenaExperimentFailure> | null;
}
export interface ArenaExperimentMetricResult {
  readonly id: string;
  readonly version: number;
  readonly data: Readonly<PlainRecord>;
}
export interface ArenaExperimentFailedMetricGate {
  readonly collectorId: string;
  readonly failedCheckIds: readonly string[];
}
export interface ArenaExperimentReport {
  readonly schemaVersion: typeof ARENA_EXPERIMENT_REPORT_SCHEMA_VERSION;
  readonly definitionId: string;
  readonly definitionHash: string;
  readonly generatedAt: string;
  readonly environment: Readonly<ArenaExperimentReportEnvironment>;
  readonly outcome: 'passed' | 'failed';
  readonly freezeEligible: boolean;
  readonly stoppedEarly: boolean;
  readonly plannedCaseCount: number;
  readonly executedCaseCount: number;
  readonly completedCaseCount: number;
  readonly failedCaseCount: number;
  readonly remainingCaseCount: number;
  readonly failedMetricGateCount: number;
  readonly failedMetricGates: readonly Readonly<ArenaExperimentFailedMetricGate>[];
  readonly cases: readonly Readonly<ArenaExperimentCaseResult>[];
  readonly metrics: readonly Readonly<ArenaExperimentMetricResult>[];
  readonly resultHash: string;
}

function boundedText(value: unknown, maximumLength: number, name: string): string {
  const text = assertNonEmptyString(value, name);
  if (text.length > maximumLength) throw new RangeError(`${name} 不能超过 ${maximumLength} 个字符。`);
  return text;
}
function cloneEnvironment(value: unknown): Readonly<ArenaExperimentReportEnvironment> {
  const name = 'ArenaExperimentReport.environment';
  assertKnownKeys(value, new Set(ENVIRONMENT_KEYS), name);
  return Object.freeze({
    runtimeName: boundedText(value.runtimeName, 128, `${name}.runtimeName`),
    runtimeVersion: boundedText(value.runtimeVersion, 128, `${name}.runtimeVersion`),
    platform: boundedText(value.platform, 128, `${name}.platform`),
    architecture: boundedText(value.architecture, 128, `${name}.architecture`),
  });
}
function cloneFailure(value: unknown, name: string): Readonly<ArenaExperimentFailure> {
  assertKnownKeys(value, FAILURE_KEYS, name);
  return Object.freeze({
    name: boundedText(value.name, 128, `${name}.name`),
    message: boundedText(value.message, 2_000, `${name}.message`),
  });
}
function cloneCases(
  values: unknown,
  definition: ArenaExperimentDefinition,
): readonly Readonly<ArenaExperimentCaseResult>[] {
  if (!Array.isArray(values)) throw new TypeError('ArenaExperimentReport.cases 必须是数组。');
  const plannedSeeds = definition.getSeeds();
  if (values.length > plannedSeeds.length) {
    throw new RangeError('ArenaExperimentReport.cases 超过 Definition seed 数量。');
  }
  return Object.freeze(values.map((value, index): Readonly<ArenaExperimentCaseResult> => {
    const name = `ArenaExperimentReport.cases[${index}]`;
    assertKnownKeys(value, CASE_KEYS, name);
    if (value.seed !== plannedSeeds[index]) throw new RangeError(`${name}.seed 必须按 Definition 顺序执行。`);
    const status = value.status;
    if (status !== 'completed' && status !== 'failed') {
      throw new RangeError(`${name}.status 不受支持：${String(status)}。`);
    }
    const finalHash = value.finalHash;
    const result = value.result === null
      ? null
      : assertPlainRecord(cloneFrozenData(value.result, `${name}.result`), `${name}.result`);
    const failure = value.failure === null ? null : cloneFailure(value.failure, `${name}.failure`);
    if (status === ARENA_EXPERIMENT_CASE_STATUS.COMPLETED) {
      if (typeof finalHash !== 'string' || !HASH_PATTERN.test(finalHash)) {
        throw new TypeError(`${name}.finalHash 必须是 8 位小写十六进制 hash。`);
      }
      if (result === null) throw new TypeError(`${name}.result 必须是普通对象。`);
      if (failure !== null) throw new RangeError(`${name} completed 不能包含 failure。`);
      return Object.freeze({
        seed: value.seed as number,
        status,
        ticks: assertIntegerAtLeast(value.ticks, 0, `${name}.ticks`),
        eventCount: assertIntegerAtLeast(value.eventCount, 0, `${name}.eventCount`),
        finalHash,
        result,
        failure: null,
      });
    }
    if (finalHash !== null || result !== null || failure === null) {
      throw new RangeError(`${name} failed 必须只包含 failure。`);
    }
    return Object.freeze({
      seed: value.seed as number,
      status,
      ticks: assertIntegerAtLeast(value.ticks, 0, `${name}.ticks`),
      eventCount: assertIntegerAtLeast(value.eventCount, 0, `${name}.eventCount`),
      finalHash: null,
      result: null,
      failure,
    });
  }));
}
function cloneMetrics(
  values: unknown,
  definition: ArenaExperimentDefinition,
): readonly Readonly<ArenaExperimentMetricResult>[] {
  if (!Array.isArray(values)) throw new TypeError('ArenaExperimentReport.metrics 必须是数组。');
  if (values.length !== definition.collectors.length) {
    throw new RangeError('ArenaExperimentReport.metrics 必须覆盖全部 Definition collectors。');
  }
  return Object.freeze(values.map((value, index): Readonly<ArenaExperimentMetricResult> => {
    const name = `ArenaExperimentReport.metrics[${index}]`;
    assertKnownKeys(value, METRIC_KEYS, name);
    const expected = definition.collectors[index];
    if (!expected || value.id !== expected.id || value.version !== expected.version) {
      throw new RangeError(`${name} 与 Definition collector 不一致。`);
    }
    const data = assertPlainRecord(cloneFrozenData(value.data, `${name}.data`), `${name}.data`);
    return Object.freeze({ id: expected.id, version: expected.version, data });
  }));
}

export function createArenaExperimentReport(
  definitionValue: ArenaExperimentDefinition | ArenaExperimentDefinitionData | unknown,
  value: unknown,
): Readonly<ArenaExperimentReport> {
  const definition = createArenaExperimentDefinition(definitionValue);
  const source = cloneFrozenData(value, 'ArenaExperimentReport source');
  assertKnownKeys(source, REPORT_KEYS, 'ArenaExperimentReport source');
  const cases = cloneCases(source.cases, definition);
  const metrics = cloneMetrics(source.metrics, definition);
  const completedCaseCount = cases.filter(({ status }) => status === 'completed').length;
  const failedCaseCount = cases.length - completedCaseCount;
  const plannedCaseCount = definition.getSeeds().length;
  const remainingCaseCount = plannedCaseCount - cases.length;
  const failedMetricGates = Object.freeze(metrics.flatMap((metric) => {
    const gate = readArenaMetricGate(metric.data);
    if (gate === null || gate.passed) return [];
    return [Object.freeze({
      collectorId: metric.id,
      failedCheckIds: Object.freeze(gate.checks.filter(({ passed }) => !passed).map(({ id }) => id)),
    })];
  }));
  const outcome: 'passed' | 'failed' = failedCaseCount === 0
    && remainingCaseCount === 0
    && failedMetricGates.length === 0 ? 'passed' : 'failed';
  const deterministicResult = Object.freeze({
    definitionHash: definition.getContentHash(), outcome, cases, metrics,
  });
  return cloneFrozenData({
    schemaVersion: ARENA_EXPERIMENT_REPORT_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    generatedAt: assertEvidenceUtcInstant(source.generatedAt, 'ArenaExperimentReport.generatedAt'),
    environment: cloneEnvironment(source.environment),
    outcome,
    freezeEligible: outcome === 'passed' && !definition.candidate.sourceDirty,
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
    resultHash: createDeterministicDataHash(deterministicResult, `ArenaExperimentReport ${definition.id}`),
  }, 'ArenaExperimentReport');
}
