import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import type { PlainRecord } from '@number-strategy-jump/arena-contracts';
import { readBoundMethod } from './callable-boundary.js';
import {
  createArenaExperimentDefinition,
  type ArenaExperimentCandidate,
  type ArenaExperimentDefinition,
} from './experiment-definition.js';
import {
  ARENA_EXPERIMENT_CASE_STATUS,
  createArenaExperimentReport,
  type ArenaExperimentCaseResult,
  type ArenaExperimentReport,
} from './experiment-report.js';
import {
  MetricCollectorRegistry,
  type ArenaMetricCollectorHandle,
} from './metric-collector-registry.js';
import {
  SimulationWorkloadRegistry,
  assertSimulationCase,
  type ArenaSimulationCase,
  type ArenaSimulationWorkloadEntry,
} from './simulation-workload-registry.js';

export const SIMULATION_EXPERIMENT_RUNNER_STATE = Object.freeze({
  READY: 'ready',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);
export type SimulationExperimentRunnerState =
  typeof SIMULATION_EXPERIMENT_RUNNER_STATE[keyof typeof SIMULATION_EXPERIMENT_RUNNER_STATE];

const RUN_KEYS: ReadonlySet<string> = new Set(['generatedAt', 'environment']);
const METADATA_KEYS: ReadonlySet<string> = new Set([
  'matchSeed', 'matchSchemaVersion', 'physicsBackendVersion', 'configHash', 'ruleContentHash',
]);
const STEP_KEYS: ReadonlySet<string> = new Set(['inputFrames', 'events', 'snapshot']);
const RESULT_KEYS: ReadonlySet<string> = new Set(['finalHash', 'result']);
const HASH_PATTERN = /^[0-9a-f]{8}$/;
type CollectorInvocationMethod = 'beginCase' | 'observeStep' | 'completeCase' | 'failCase';

interface SimulationMetadata extends PlainRecord {
  matchSeed: number;
  matchSchemaVersion: number;
  physicsBackendVersion: string;
  configHash: string;
  ruleContentHash: string;
}
interface SimulationSnapshot extends PlainRecord { tick: number }
interface SimulationStep {
  readonly inputFrames: readonly unknown[];
  readonly events: readonly unknown[];
  readonly snapshot: SimulationSnapshot;
}
interface SimulationExportResult {
  readonly finalHash: string;
  readonly result: Readonly<PlainRecord>;
}

class MetricCollectorExecutionError extends Error {
  override readonly cause: unknown;
  constructor(collectorId: string, method: CollectorInvocationMethod, cause: unknown) {
    super(`MetricCollector ${collectorId}.${method} 执行失败。`);
    this.name = 'MetricCollectorExecutionError';
    this.cause = cause;
  }
}

function invokeCollectors(
  collectors: readonly Readonly<ArenaMetricCollectorHandle>[],
  method: CollectorInvocationMethod,
  value: unknown,
): void {
  for (const collector of collectors) {
    try {
      (collector.instance[method] as (input: unknown) => void)(value);
    } catch (error) {
      throw new MetricCollectorExecutionError(collector.id, method, error);
    }
  }
}

function validateMetadata(
  value: unknown,
  seed: number,
  expected: Readonly<ArenaExperimentCandidate>['authority'],
): SimulationMetadata {
  const metadata = cloneFrozenData(value, 'SimulationCase metadata');
  assertKnownKeys(metadata, METADATA_KEYS, 'SimulationCase metadata');
  if (metadata.matchSeed !== seed) throw new RangeError('SimulationCase matchSeed 与实验 seed 不一致。');
  for (const field of ['matchSchemaVersion', 'physicsBackendVersion', 'configHash', 'ruleContentHash'] as const) {
    if (metadata[field] !== expected[field]) throw new Error(`SimulationCase ${field} 与候选不一致。`);
  }
  return metadata as unknown as SimulationMetadata;
}
function validateSnapshot(value: unknown, name: string): SimulationSnapshot {
  const snapshot = assertPlainRecord(cloneFrozenData(value, name), name);
  const tick = assertIntegerAtLeast(snapshot.tick, 0, `${name}.tick`);
  return snapshot.tick === tick ? snapshot as SimulationSnapshot : { ...snapshot, tick };
}
function validateStep(value: unknown, previousTick: number): Readonly<SimulationStep> {
  const step = cloneFrozenData(value, 'SimulationCase step');
  assertKnownKeys(step, STEP_KEYS, 'SimulationCase step');
  if (!Array.isArray(step.inputFrames)) throw new TypeError('SimulationCase step.inputFrames 必须是数组。');
  if (!Array.isArray(step.events)) throw new TypeError('SimulationCase step.events 必须是数组。');
  const snapshot = validateSnapshot(step.snapshot, 'SimulationCase step.snapshot');
  if (snapshot.tick !== previousTick + 1) {
    throw new RangeError(`SimulationCase tick 必须从 ${previousTick} 精确推进到 ${previousTick + 1}。`);
  }
  return Object.freeze({ inputFrames: step.inputFrames, events: step.events, snapshot });
}
function validateResult(value: unknown): Readonly<SimulationExportResult> {
  const result = cloneFrozenData(value, 'SimulationCase result');
  assertKnownKeys(result, RESULT_KEYS, 'SimulationCase result');
  if (typeof result.finalHash !== 'string' || !HASH_PATTERN.test(result.finalHash)) {
    throw new TypeError('SimulationCase result.finalHash 必须是 8 位小写十六进制 hash。');
  }
  return Object.freeze({
    finalHash: result.finalHash,
    result: assertPlainRecord(result.result, 'SimulationCase result.result'),
  });
}
function isCaseComplete(simulationCase: Readonly<ArenaSimulationCase>): boolean {
  const complete = simulationCase.isComplete();
  if (typeof complete !== 'boolean') throw new TypeError('SimulationCase.isComplete() 必须返回布尔值。');
  return complete;
}
function failureData(error: unknown): Readonly<{ name: string; message: string }> {
  const normalized = normalizeThrownError(error, 'SimulationCase 失败');
  const name = normalized.name.trim().length > 0 ? normalized.name.slice(0, 128) : 'Error';
  const message = normalized.message.trim().length > 0
    ? normalized.message.slice(0, 2_000)
    : 'SimulationCase 失败';
  return Object.freeze({ name, message });
}
function destroyCase(
  simulationCase: Readonly<ArenaSimulationCase> | null,
  originalError: unknown | null = null,
): unknown | null {
  if (!simulationCase) return originalError;
  try {
    simulationCase.destroy();
    return originalError;
  } catch (cleanupError) {
    const normalizedCleanup = normalizeThrownError(cleanupError, 'SimulationCase 清理失败');
    if (originalError === null) return normalizedCleanup;
    const combined = new Error(`${failureData(originalError).message}；清理失败：${normalizedCleanup.message}`);
    combined.name = 'SimulationCaseCleanupError';
    return combined;
  }
}
function cleanupInvalidCase(value: unknown, originalError: unknown): unknown {
  if (!value || typeof value !== 'object') return originalError;
  try {
    const destroy = readBoundMethod(value, 'destroy', 'SimulationCase pending instance', false);
    if (destroy) destroy();
    return originalError;
  } catch (cleanupError) {
    const normalized = normalizeThrownError(cleanupError, 'SimulationCase 清理失败');
    return Object.assign(new Error(`${failureData(originalError).message}；清理失败：${normalized.message}`), {
      name: 'SimulationCaseCleanupError',
    });
  }
}
function destroyCollectors(collectors: readonly Readonly<ArenaMetricCollectorHandle>[]): void {
  const errors: unknown[] = [];
  for (const collector of [...collectors].reverse()) {
    try {
      collector.instance.destroy();
    } catch (error) {
      errors.push(normalizeThrownError(error, `MetricCollector ${collector.id} 清理失败`));
    }
  }
  if (errors.length > 0) {
    throw Object.assign(new Error('MetricCollector 清理未完整完成。'), {
      causes: Object.freeze(errors),
    });
  }
}

export class SimulationExperimentRunner {
  #definition: ArenaExperimentDefinition | null;
  #workloadRegistry: SimulationWorkloadRegistry | null;
  #collectorRegistry: MetricCollectorRegistry | null;
  #state: SimulationExperimentRunnerState;

  constructor(options: unknown) {
    assertKnownKeys(options, new Set(['definition', 'workloadRegistry', 'collectorRegistry']), 'SimulationExperimentRunner options');
    this.#definition = createArenaExperimentDefinition(options.definition);
    if (!(options.workloadRegistry instanceof SimulationWorkloadRegistry)) {
      throw new TypeError('SimulationExperimentRunner 需要 SimulationWorkloadRegistry。');
    }
    if (!(options.collectorRegistry instanceof MetricCollectorRegistry)) {
      throw new TypeError('SimulationExperimentRunner 需要 MetricCollectorRegistry。');
    }
    options.workloadRegistry.require(this.#definition.workload);
    options.collectorRegistry.assertDefinition(this.#definition);
    this.#workloadRegistry = options.workloadRegistry;
    this.#collectorRegistry = options.collectorRegistry;
    this.#state = SIMULATION_EXPERIMENT_RUNNER_STATE.READY;
  }

  get state(): SimulationExperimentRunnerState { return this.#state; }

  run(options: unknown): Readonly<ArenaExperimentReport> {
    const source = cloneFrozenData(options, 'SimulationExperimentRunner.run options');
    assertKnownKeys(source, RUN_KEYS, 'SimulationExperimentRunner.run options');
    if (this.#state !== 'ready') throw new Error(`SimulationExperimentRunner 无法从 ${this.#state} 运行。`);
    const definition = this.#definition;
    const workloadRegistry = this.#workloadRegistry;
    const collectorRegistry = this.#collectorRegistry;
    if (!definition || !workloadRegistry || !collectorRegistry) {
      throw new Error('SimulationExperimentRunner 已失去运行依赖。');
    }
    this.#state = SIMULATION_EXPERIMENT_RUNNER_STATE.RUNNING;
    let collectors: readonly Readonly<ArenaMetricCollectorHandle>[] = Object.freeze([]);
    try {
      const workload = workloadRegistry.require(definition.workload);
      collectors = collectorRegistry.createCollectors(definition);
      const cases: Readonly<ArenaExperimentCaseResult>[] = [];
      let failedCaseCount = 0;
      for (const seed of definition.getSeeds()) {
        const caseResult = this.#runCase(seed, workload, collectors, definition);
        cases.push(caseResult);
        if (caseResult.status === ARENA_EXPERIMENT_CASE_STATUS.FAILED) {
          failedCaseCount += 1;
          if (failedCaseCount > definition.limits.maximumFailedCases) break;
        }
      }
      const metrics = collectors.map(({ id, version, instance }) => ({
        id,
        version,
        data: cloneFrozenData(instance.getResult(), `MetricCollector ${id} result`),
      }));
      destroyCollectors(collectors);
      collectors = Object.freeze([]);
      const report = createArenaExperimentReport(definition, {
        generatedAt: source.generatedAt,
        environment: source.environment,
        cases,
        metrics,
      });
      this.#state = SIMULATION_EXPERIMENT_RUNNER_STATE.COMPLETED;
      return report;
    } catch (error) {
      this.#state = SIMULATION_EXPERIMENT_RUNNER_STATE.FAILED;
      try {
        destroyCollectors(collectors);
      } catch (cleanupError) {
        throw Object.assign(new Error('SimulationExperimentRunner 失败且 collector 清理未完成。'), {
          originalError: error,
          cleanupError,
        });
      }
      throw error;
    }
  }

  #runCase(
    seed: number,
    workload: Readonly<ArenaSimulationWorkloadEntry>,
    collectors: readonly Readonly<ArenaMetricCollectorHandle>[],
    definition: ArenaExperimentDefinition,
  ): Readonly<ArenaExperimentCaseResult> {
    let rawCase: unknown = null;
    let simulationCase: Readonly<ArenaSimulationCase> | null = null;
    let metadata: SimulationMetadata | null = null;
    let snapshot: SimulationSnapshot | null = null;
    let eventCount = 0;
    try {
      rawCase = workload.createCase({
        seed,
        candidate: definition.candidate,
        parameters: definition.workload.parameters,
      });
      try {
        simulationCase = assertSimulationCase(rawCase, `SimulationCase seed ${seed}`);
      } catch (error) {
        throw cleanupInvalidCase(rawCase, error);
      } finally {
        rawCase = null;
      }
      metadata = validateMetadata(simulationCase.getMetadata(), seed, definition.candidate.authority);
      snapshot = validateSnapshot(simulationCase.getSnapshot(), `SimulationCase ${seed} snapshot`);
      invokeCollectors(collectors, 'beginCase', Object.freeze({ seed, metadata, initialSnapshot: snapshot }));
      let stepCount = 0;
      while (!isCaseComplete(simulationCase)) {
        if (stepCount >= definition.limits.maximumTicksPerCase) {
          throw new Error(`SimulationCase ${seed} 未在 ${definition.limits.maximumTicksPerCase} tick 内结束。`);
        }
        const step = validateStep(simulationCase.step(), snapshot.tick);
        snapshot = step.snapshot;
        eventCount += step.events.length;
        stepCount += 1;
        invokeCollectors(collectors, 'observeStep', Object.freeze({ seed, metadata, ...step }));
      }
      const exported = validateResult(simulationCase.exportResult());
      const cleanupFailure = destroyCase(simulationCase);
      simulationCase = null;
      if (cleanupFailure) throw cleanupFailure;
      invokeCollectors(collectors, 'completeCase', Object.freeze({
        seed,
        metadata,
        finalSnapshot: snapshot,
        ticks: snapshot.tick,
        eventCount,
        finalHash: exported.finalHash,
        result: exported.result,
      }));
      return Object.freeze({
        seed,
        status: ARENA_EXPERIMENT_CASE_STATUS.COMPLETED,
        ticks: snapshot.tick,
        eventCount,
        finalHash: exported.finalHash,
        result: exported.result,
        failure: null,
      });
    } catch (error) {
      if (error instanceof MetricCollectorExecutionError) {
        throw destroyCase(simulationCase, error);
      }
      const failure = destroyCase(simulationCase, error);
      const failed = Object.freeze({
        seed,
        metadata,
        lastSnapshot: snapshot,
        ticks: snapshot?.tick ?? 0,
        eventCount,
        failure: failureData(failure),
      });
      invokeCollectors(collectors, 'failCase', failed);
      return Object.freeze({
        seed,
        status: ARENA_EXPERIMENT_CASE_STATUS.FAILED,
        ticks: snapshot?.tick ?? 0,
        eventCount,
        finalHash: null,
        result: null,
        failure: failureData(failure),
      });
    }
  }

  destroy(): void {
    if (this.#state === 'destroyed') return;
    if (this.#state === 'running') throw new Error('run() 期间不能销毁 SimulationExperimentRunner。');
    this.#state = SIMULATION_EXPERIMENT_RUNNER_STATE.DESTROYED;
    this.#definition = null;
    this.#workloadRegistry = null;
    this.#collectorRegistry = null;
  }
}
