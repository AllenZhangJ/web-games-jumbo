import {
  combineCleanupFailure,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import { QuickMatchService } from '@number-strategy-jump/arena-v1-composition';
import { ArenaPresentationSession } from '@number-strategy-jump/arena-v1-greybox-session';
import { InputPilotAssignedMatchService } from '@number-strategy-jump/arena-input-pilot';
import { createInputPilotDefinition } from '@number-strategy-jump/arena-input-pilot';
import { InputPilotMetricCollector } from '@number-strategy-jump/arena-input-pilot';
import { InputPilotObservedMatchService } from '@number-strategy-jump/arena-input-pilot';
import { createInputPilotTrialCheckpoint } from '@number-strategy-jump/arena-input-pilot';
import { INPUT_PILOT_RUNTIME_STATE } from '@number-strategy-jump/arena-input-pilot';

function requiredFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value;
}

function sessionState(value) {
  if (value === 'created') return INPUT_PILOT_RUNTIME_STATE.CREATED;
  if (value === 'starting') return INPUT_PILOT_RUNTIME_STATE.STARTING;
  if (value === 'result') return INPUT_PILOT_RUNTIME_STATE.RESULT;
  if (value === 'failed') return INPUT_PILOT_RUNTIME_STATE.FAILED;
  if (value === 'destroyed') return INPUT_PILOT_RUNTIME_STATE.DESTROYED;
  return INPUT_PILOT_RUNTIME_STATE.RUNNING;
}

function destroyValue(value, name, errors) {
  if (!value || typeof value.destroy !== 'function') return;
  try {
    value.destroy();
  } catch (error) {
    errors.push(normalizeThrownError(error, `${name} 清理失败`));
  }
}

export class InputPilotPresentationRuntime {
  #collector;
  #assignedMatchService;
  #presentation;
  #onProgress;
  #onFailure;
  #onDiagnostic;
  #reportedFailure;
  #finalMetrics;
  #lastTimedOut;
  #destroyed;

  constructor({
    platform,
    definition: definitionValue,
    checkpoint: checkpointValue,
    matchService = new QuickMatchService(),
    onProgress,
    onFailure,
    onDiagnostic = () => {},
    sessionOptions = {},
    presentationSessionFactory = (host, options) => new ArenaPresentationSession(host, options),
    collectorFactory = (options) => new InputPilotMetricCollector(options),
    observedMatchServiceFactory = (options) => new InputPilotObservedMatchService(options),
  }) {
    const definition = createInputPilotDefinition(definitionValue);
    const checkpoint = createInputPilotTrialCheckpoint(definition, checkpointValue);
    this.#onProgress = requiredFunction(onProgress, 'InputPilotPresentationRuntime.onProgress');
    this.#onFailure = requiredFunction(onFailure, 'InputPilotPresentationRuntime.onFailure');
    this.#onDiagnostic = requiredFunction(
      onDiagnostic,
      'InputPilotPresentationRuntime.onDiagnostic',
    );
    requiredFunction(presentationSessionFactory, 'presentationSessionFactory');
    requiredFunction(collectorFactory, 'collectorFactory');
    requiredFunction(observedMatchServiceFactory, 'observedMatchServiceFactory');
    this.#collector = null;
    this.#assignedMatchService = null;
    this.#presentation = null;
    this.#reportedFailure = false;
    this.#finalMetrics = null;
    this.#lastTimedOut = false;
    this.#destroyed = false;

    try {
      this.#collector = collectorFactory({
        definition,
        assignment: checkpoint.assignment,
      });
      const observed = observedMatchServiceFactory({
        matchService,
        collector: this.#collector,
      });
      this.#assignedMatchService = new InputPilotAssignedMatchService({
        matchService: observed,
        matchSeed: checkpoint.assignment.matchSeed,
      });
      this.#presentation = presentationSessionFactory(platform, {
        ...sessionOptions,
        mapperId: checkpoint.assignment.mapperId,
        matchService: this.#assignedMatchService,
        experimentLabel: '',
        onMatchProgress: () => this.#handleProgress(),
        onDiagnostic: (diagnostic) => this.#handleDiagnostic(diagnostic),
      });
      if (
        !this.#presentation
        || typeof this.#presentation.start !== 'function'
        || typeof this.#presentation.setPaused !== 'function'
        || typeof this.#presentation.destroy !== 'function'
      ) throw new TypeError('presentationSessionFactory 返回值不符合 pilot runtime 合同。');
    } catch (error) {
      const cleanupErrors = [];
      destroyValue(this.#presentation, 'pilot presentation', cleanupErrors);
      destroyValue(this.#assignedMatchService, 'pilot match service', cleanupErrors);
      destroyValue(this.#collector, 'pilot metric collector', cleanupErrors);
      this.#destroyed = true;
      throw combineCleanupFailure(
        normalizeThrownError(error, 'InputPilotPresentationRuntime 构造失败'),
        cleanupErrors,
        'InputPilotPresentationRuntime 构造失败且清理未完整完成。',
      );
    }
    Object.freeze(this);
  }

  #handleProgress() {
    if (this.#destroyed) return false;
    const collectorStatus = this.#collector.getStatus();
    this.#lastTimedOut = collectorStatus.timedOut;
    return this.#onProgress();
  }

  #handleDiagnostic(diagnostic) {
    try {
      this.#onDiagnostic(diagnostic);
    } catch {
      // Diagnostics are observational and cannot own the trial lifecycle.
    }
    if (diagnostic?.type !== 'session-failed' || this.#reportedFailure) return;
    this.#reportedFailure = true;
    this.#onFailure(new Error(diagnostic.message ?? 'Arena pilot session failed.'));
  }

  start() {
    if (this.#destroyed) return Promise.reject(new Error('InputPilotPresentationRuntime 已销毁。'));
    return this.#presentation.start();
  }

  setPaused(paused) {
    if (this.#destroyed) throw new Error('InputPilotPresentationRuntime 已销毁。');
    return this.#presentation.setPaused(paused);
  }

  getStatus() {
    if (this.#destroyed) {
      return Object.freeze({
        state: INPUT_PILOT_RUNTIME_STATE.DESTROYED,
        timedOut: this.#lastTimedOut,
      });
    }
    const collectorStatus = this.#collector.getStatus();
    this.#lastTimedOut = collectorStatus.timedOut;
    return Object.freeze({
      state: sessionState(this.#presentation.state),
      timedOut: collectorStatus.timedOut,
    });
  }

  finalizeMetrics() {
    if (this.#finalMetrics) return this.#finalMetrics;
    if (this.#destroyed) throw new Error('InputPilotPresentationRuntime 已销毁且没有冻结指标。');
    this.#finalMetrics = this.#collector.finalize();
    return this.#finalMetrics;
  }

  destroy() {
    if (this.#destroyed) return;
    const errors = [];
    destroyValue(this.#presentation, 'pilot presentation', errors);
    destroyValue(this.#assignedMatchService, 'pilot match service', errors);
    destroyValue(this.#collector, 'pilot metric collector', errors);
    this.#presentation = null;
    this.#assignedMatchService = null;
    this.#collector = null;
    this.#onProgress = null;
    this.#onFailure = null;
    this.#onDiagnostic = null;
    this.#destroyed = true;
    if (errors.length > 0) {
      const failure = new Error('InputPilotPresentationRuntime 清理未完整完成。');
      failure.cleanupErrors = errors;
      throw failure;
    }
  }
}

export function createInputPilotPresentationRuntimeFactory(options) {
  return (trial) => new InputPilotPresentationRuntime({ ...options, ...trial });
}
