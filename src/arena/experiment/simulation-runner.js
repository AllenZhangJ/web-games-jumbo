import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { normalizeThrownError } from '@number-strategy-jump/arena-contracts';
import { createArenaExperimentDefinition } from './experiment-definition.js';
import {
  ARENA_EXPERIMENT_CASE_STATUS,
  createArenaExperimentReport,
} from './experiment-report.js';
import { MetricCollectorRegistry } from './metric-collector-registry.js';
import {
  SimulationWorkloadRegistry,
  assertSimulationCase,
} from './simulation-workload-registry.js';

export const SIMULATION_EXPERIMENT_RUNNER_STATE = Object.freeze({
  READY: 'ready',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
});

const RUN_KEYS = new Set(['generatedAt', 'environment']);
const METADATA_KEYS = new Set([
  'matchSeed',
  'matchSchemaVersion',
  'physicsBackendVersion',
  'configHash',
  'ruleContentHash',
]);
const STEP_KEYS = new Set(['inputFrames', 'events', 'snapshot']);
const RESULT_KEYS = new Set(['finalHash', 'result']);
const HASH_PATTERN = /^[0-9a-f]{8}$/;

class MetricCollectorExecutionError extends Error {
  constructor(collectorId, method, cause) {
    super(`MetricCollector ${collectorId}.${method} 执行失败。`);
    this.name = 'MetricCollectorExecutionError';
    this.cause = cause;
  }
}

function invokeCollectors(collectors, method, value) {
  for (const collector of collectors) {
    try {
      collector.instance[method](value);
    } catch (error) {
      throw new MetricCollectorExecutionError(collector.id, method, error);
    }
  }
}

function validateMetadata(value, seed, expected) {
  const metadata = cloneFrozenData(value, 'SimulationCase metadata');
  assertKnownKeys(metadata, METADATA_KEYS, 'SimulationCase metadata');
  if (metadata.matchSeed !== seed) throw new RangeError('SimulationCase matchSeed 与实验 seed 不一致。');
  for (const field of [
    'matchSchemaVersion',
    'physicsBackendVersion',
    'configHash',
    'ruleContentHash',
  ]) {
    if (metadata[field] !== expected[field]) {
      throw new Error(`SimulationCase ${field} 与候选不一致。`);
    }
  }
  return metadata;
}

function validateSnapshot(value, name) {
  const snapshot = cloneFrozenData(value, name);
  assertPlainRecord(snapshot, name);
  assertIntegerAtLeast(snapshot.tick, 0, `${name}.tick`);
  return snapshot;
}

function validateStep(value, previousTick) {
  const step = cloneFrozenData(value, 'SimulationCase step');
  assertKnownKeys(step, STEP_KEYS, 'SimulationCase step');
  if (!Array.isArray(step.inputFrames)) throw new TypeError('SimulationCase step.inputFrames 必须是数组。');
  if (!Array.isArray(step.events)) throw new TypeError('SimulationCase step.events 必须是数组。');
  const snapshot = validateSnapshot(step.snapshot, 'SimulationCase step.snapshot');
  if (snapshot.tick !== previousTick + 1) {
    throw new RangeError(`SimulationCase tick 必须从 ${previousTick} 精确推进到 ${previousTick + 1}。`);
  }
  return Object.freeze({
    inputFrames: step.inputFrames,
    events: step.events,
    snapshot,
  });
}

function validateResult(value) {
  const result = cloneFrozenData(value, 'SimulationCase result');
  assertKnownKeys(result, RESULT_KEYS, 'SimulationCase result');
  if (typeof result.finalHash !== 'string' || !HASH_PATTERN.test(result.finalHash)) {
    throw new TypeError('SimulationCase result.finalHash 必须是 8 位小写十六进制 hash。');
  }
  assertPlainRecord(result.result, 'SimulationCase result.result');
  return result;
}

function isCaseComplete(simulationCase) {
  const complete = simulationCase.isComplete();
  if (typeof complete !== 'boolean') {
    throw new TypeError('SimulationCase.isComplete() 必须返回布尔值。');
  }
  return complete;
}

function failureData(error) {
  const normalized = normalizeThrownError(error, 'SimulationCase 失败');
  const name = typeof normalized.name === 'string' && normalized.name.trim().length > 0
    ? normalized.name.slice(0, 128)
    : 'Error';
  const message = typeof normalized.message === 'string' && normalized.message.trim().length > 0
    ? normalized.message.slice(0, 2_000)
    : 'SimulationCase 失败';
  return Object.freeze({
    name,
    message,
  });
}

function destroyCase(simulationCase, originalError = null) {
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

function destroyCollectors(collectors) {
  const errors = [];
  for (let index = collectors.length - 1; index >= 0; index -= 1) {
    try {
      collectors[index].instance.destroy();
    } catch (error) {
      errors.push(normalizeThrownError(error, `MetricCollector ${collectors[index].id} 清理失败`));
    }
  }
  if (errors.length > 0) {
    const error = new Error('MetricCollector 清理未完整完成。');
    error.causes = errors;
    throw error;
  }
}

export class SimulationExperimentRunner {
  #definition;
  #workloadRegistry;
  #collectorRegistry;
  #state;

  constructor({ definition, workloadRegistry, collectorRegistry }) {
    this.#definition = createArenaExperimentDefinition(definition);
    if (!(workloadRegistry instanceof SimulationWorkloadRegistry)) {
      throw new TypeError('SimulationExperimentRunner 需要 SimulationWorkloadRegistry。');
    }
    if (!(collectorRegistry instanceof MetricCollectorRegistry)) {
      throw new TypeError('SimulationExperimentRunner 需要 MetricCollectorRegistry。');
    }
    workloadRegistry.require(this.#definition.workload);
    collectorRegistry.assertDefinition(this.#definition);
    this.#workloadRegistry = workloadRegistry;
    this.#collectorRegistry = collectorRegistry;
    this.#state = SIMULATION_EXPERIMENT_RUNNER_STATE.READY;
  }

  get state() {
    return this.#state;
  }

  run(options) {
    const source = cloneFrozenData(options, 'SimulationExperimentRunner.run options');
    assertKnownKeys(source, RUN_KEYS, 'SimulationExperimentRunner.run options');
    if (this.#state !== SIMULATION_EXPERIMENT_RUNNER_STATE.READY) {
      throw new Error(`SimulationExperimentRunner 无法从 ${this.#state} 运行。`);
    }
    this.#state = SIMULATION_EXPERIMENT_RUNNER_STATE.RUNNING;
    let collectors = Object.freeze([]);
    try {
      const workload = this.#workloadRegistry.require(this.#definition.workload);
      collectors = this.#collectorRegistry.createCollectors(this.#definition);
      const cases = [];
      let failedCaseCount = 0;
      for (const seed of this.#definition.getSeeds()) {
        const caseResult = this.#runCase(seed, workload, collectors);
        cases.push(caseResult);
        if (caseResult.status === ARENA_EXPERIMENT_CASE_STATUS.FAILED) {
          failedCaseCount += 1;
          if (failedCaseCount > this.#definition.limits.maximumFailedCases) break;
        }
      }
      const metrics = collectors.map(({ id, version, instance }) => ({
        id,
        version,
        data: cloneFrozenData(instance.getResult(), `MetricCollector ${id} result`),
      }));
      destroyCollectors(collectors);
      collectors = Object.freeze([]);
      const report = createArenaExperimentReport(this.#definition, {
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
        const combined = new Error('SimulationExperimentRunner 失败且 collector 清理未完成。');
        combined.originalError = error;
        combined.cleanupError = cleanupError;
        throw combined;
      }
      throw error;
    }
  }

  #runCase(seed, workload, collectors) {
    let simulationCase = null;
    let metadata = null;
    let snapshot = null;
    let eventCount = 0;
    try {
      simulationCase = workload.createCase({
        seed,
        candidate: this.#definition.candidate,
        parameters: this.#definition.workload.parameters,
      });
      assertSimulationCase(simulationCase, `SimulationCase seed ${seed}`);
      metadata = validateMetadata(
        simulationCase.getMetadata(),
        seed,
        this.#definition.candidate.authority,
      );
      snapshot = validateSnapshot(simulationCase.getSnapshot(), `SimulationCase ${seed} snapshot`);
      const begin = Object.freeze({ seed, metadata, initialSnapshot: snapshot });
      invokeCollectors(collectors, 'beginCase', begin);
      let stepCount = 0;
      while (!isCaseComplete(simulationCase)) {
        if (stepCount >= this.#definition.limits.maximumTicksPerCase) {
          throw new Error(
            `SimulationCase ${seed} 未在 ${this.#definition.limits.maximumTicksPerCase} tick 内结束。`,
          );
        }
        const step = validateStep(simulationCase.step(), snapshot.tick);
        snapshot = step.snapshot;
        eventCount += step.events.length;
        stepCount += 1;
        const observation = Object.freeze({ seed, metadata, ...step });
        invokeCollectors(collectors, 'observeStep', observation);
      }
      const exported = validateResult(simulationCase.exportResult());
      const cleanupFailure = destroyCase(simulationCase);
      simulationCase = null;
      if (cleanupFailure) throw cleanupFailure;
      const completed = Object.freeze({
        seed,
        metadata,
        finalSnapshot: snapshot,
        ticks: snapshot.tick,
        eventCount,
        finalHash: exported.finalHash,
        result: exported.result,
      });
      invokeCollectors(collectors, 'completeCase', completed);
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
        const cleanupFailure = destroyCase(simulationCase, error);
        simulationCase = null;
        throw cleanupFailure;
      }
      const failure = destroyCase(simulationCase, error);
      simulationCase = null;
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

  destroy() {
    if (this.#state === SIMULATION_EXPERIMENT_RUNNER_STATE.DESTROYED) return;
    if (this.#state === SIMULATION_EXPERIMENT_RUNNER_STATE.RUNNING) {
      throw new Error('run() 期间不能销毁 SimulationExperimentRunner。');
    }
    this.#state = SIMULATION_EXPERIMENT_RUNNER_STATE.DESTROYED;
    this.#definition = null;
    this.#workloadRegistry = null;
    this.#collectorRegistry = null;
  }
}
