import {
  assertKnownKeys,
  assertPlainRecord,
  cloneFrozenData,
  combineCleanupFailure,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import {
  INPUT_PILOT_RUNTIME_STATE,
  InputPilotAssignedMatchService,
  InputPilotMetricCollector,
  InputPilotObservedMatchService,
  createInputPilotDefinition,
  createInputPilotTrialCheckpoint,
  type InputPilotRuntimeState,
} from '@number-strategy-jump/arena-input-pilot';
import { QuickMatchService } from '@number-strategy-jump/arena-v1-composition';
import { ArenaPresentationSession } from '@number-strategy-jump/arena-v1-greybox-session';

type UnknownMethod = (...args: unknown[]) => unknown;
type DataRecord = Record<string, unknown>;

interface CollectorPort {
  readonly owner: object;
  readonly getStatus: UnknownMethod;
  readonly finalize: UnknownMethod;
  readonly destroy: UnknownMethod;
}

interface PresentationPort {
  readonly getState: () => unknown;
  readonly start: UnknownMethod;
  readonly setPaused: UnknownMethod;
  readonly destroy: UnknownMethod;
}

export interface InputPilotPresentationRuntimeStatus {
  readonly state: InputPilotRuntimeState;
  readonly timedOut: boolean;
}

const OPTION_KEYS = new Set([
  'platform',
  'definition',
  'checkpoint',
  'matchService',
  'onProgress',
  'onFailure',
  'onDiagnostic',
  'sessionOptions',
  'presentationSessionFactory',
  'collectorFactory',
  'observedMatchServiceFactory',
]);

function dataMethod(value: unknown, key: string, name: string): UnknownMethod {
  const method = optionalDataMethod(value, key, name);
  if (method !== null) return method;
  throw new TypeError(`${name} 缺少 ${key}()。`);
}

function optionalDataMethod(value: unknown, key: string, name: string): UnknownMethod | null {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  let current: object | null = value as object;
  const visited = new Set<object>();
  while (current !== null) {
    if (visited.has(current) || visited.size >= 32) throw new TypeError(`${name} 原型链无效。`);
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${key} 必须是数据方法。`);
      }
      return descriptor.value.bind(value) as UnknownMethod;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  return null;
}

function requiredFunction(value: unknown, name: string): UnknownMethod {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value as UnknownMethod;
}

function stateReader(value: object, name: string): () => unknown {
  let current: object | null = value;
  const visited = new Set<object>();
  while (current !== null) {
    if (visited.has(current) || visited.size >= 32) throw new TypeError(`${name} 原型链无效。`);
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, 'state');
    if (descriptor) {
      if (Object.hasOwn(descriptor, 'value')) {
        const owner = current;
        return () => {
          const latest = Object.getOwnPropertyDescriptor(owner, 'state');
          if (!latest || !Object.hasOwn(latest, 'value')) {
            throw new TypeError(`${name}.state 不能在运行期替换为访问器。`);
          }
          return latest.value;
        };
      }
      if (typeof descriptor.get !== 'function') {
        throw new TypeError(`${name}.state 必须可读。`);
      }
      const getter = descriptor.get;
      return () => getter.call(value);
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  throw new TypeError(`${name} 缺少 state。`);
}

function shallowDataRecord(value: unknown, name: string): DataRecord {
  const source = assertPlainRecord(value, name);
  const result: DataRecord = {};
  for (const key of Reflect.ownKeys(source)) {
    if (typeof key !== 'string') throw new TypeError(`${name} 不能包含 Symbol 字段。`);
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
    }
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new RangeError(`${name} 包含不安全字段 ${key}。`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function collectorPort(value: unknown): CollectorPort {
  if (!value || typeof value !== 'object') {
    throw new TypeError('collectorFactory 返回值无效。');
  }
  const destroy = dataMethod(value, 'destroy', 'pilot metric collector');
  try {
    return Object.freeze({
      owner: value,
      getStatus: dataMethod(value, 'getStatus', 'pilot metric collector'),
      finalize: dataMethod(value, 'finalize', 'pilot metric collector'),
      destroy,
    });
  } catch (error) {
    const cleanupErrors: Error[] = [];
    try {
      destroy();
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(cleanupError, '无效 pilot metric collector 清理失败'));
    }
    throw combineCleanupFailure(
      normalizeThrownError(error, 'pilot metric collector 合同无效'),
      cleanupErrors,
      'pilot metric collector 合同无效且清理失败。',
    );
  }
}

function presentationPort(value: unknown): PresentationPort {
  if (!value || typeof value !== 'object') {
    throw new TypeError('presentationSessionFactory 返回值无效。');
  }
  const destroy = dataMethod(value, 'destroy', 'pilot presentation');
  try {
    return Object.freeze({
      getState: stateReader(value, 'pilot presentation'),
      start: dataMethod(value, 'start', 'pilot presentation'),
      setPaused: dataMethod(value, 'setPaused', 'pilot presentation'),
      destroy,
    });
  } catch (error) {
    const cleanupErrors: Error[] = [];
    try {
      destroy();
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(cleanupError, '无效 pilot presentation 清理失败'));
    }
    throw combineCleanupFailure(
      normalizeThrownError(error, 'pilot presentation 合同无效'),
      cleanupErrors,
      'pilot presentation 合同无效且清理失败。',
    );
  }
}

function sessionState(value: unknown): InputPilotRuntimeState {
  if (value === 'created') return INPUT_PILOT_RUNTIME_STATE.CREATED;
  if (value === 'starting') return INPUT_PILOT_RUNTIME_STATE.STARTING;
  if (value === 'result') return INPUT_PILOT_RUNTIME_STATE.RESULT;
  if (value === 'failed') return INPUT_PILOT_RUNTIME_STATE.FAILED;
  if (value === 'destroyed') return INPUT_PILOT_RUNTIME_STATE.DESTROYED;
  return INPUT_PILOT_RUNTIME_STATE.RUNNING;
}

function collectorTimedOut(value: unknown): boolean {
  const source = cloneFrozenData(value, 'InputPilotPresentationRuntime collector status');
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new TypeError('pilot metric collector status 必须是对象。');
  }
  const timedOut = (source as Readonly<Record<string, unknown>>).timedOut;
  if (typeof timedOut !== 'boolean') {
    throw new TypeError('pilot metric collector status.timedOut 必须是布尔值。');
  }
  return timedOut;
}

export class InputPilotPresentationRuntime {
  #collector: CollectorPort | null;
  #assignedMatchService: InputPilotAssignedMatchService | null;
  #presentation: PresentationPort | null;
  #onProgress: UnknownMethod | null;
  #onFailure: UnknownMethod | null;
  #onDiagnostic: UnknownMethod | null;
  #reportedFailure: boolean;
  #finalMetrics: unknown;
  #hasFinalMetrics: boolean;
  #lastTimedOut: boolean;
  #cleanupFailed: boolean;
  #destroyed: boolean;

  constructor(optionsValue: unknown) {
    assertKnownKeys(optionsValue, OPTION_KEYS, 'InputPilotPresentationRuntime options');
    const definition = createInputPilotDefinition(optionsValue.definition);
    const checkpoint = createInputPilotTrialCheckpoint(definition, optionsValue.checkpoint);
    const matchService = Object.hasOwn(optionsValue, 'matchService')
      ? optionsValue.matchService
      : new QuickMatchService();
    const onProgress = requiredFunction(
      optionsValue.onProgress,
      'InputPilotPresentationRuntime.onProgress',
    );
    const onFailure = requiredFunction(
      optionsValue.onFailure,
      'InputPilotPresentationRuntime.onFailure',
    );
    const onDiagnostic = Object.hasOwn(optionsValue, 'onDiagnostic')
      ? requiredFunction(optionsValue.onDiagnostic, 'InputPilotPresentationRuntime.onDiagnostic')
      : (() => undefined);
    const sessionOptions = Object.hasOwn(optionsValue, 'sessionOptions')
      ? shallowDataRecord(optionsValue.sessionOptions, 'InputPilotPresentationRuntime.sessionOptions')
      : {};
    const presentationSessionFactory = Object.hasOwn(optionsValue, 'presentationSessionFactory')
      ? requiredFunction(optionsValue.presentationSessionFactory, 'presentationSessionFactory')
      : ((host: unknown, options: unknown) => new ArenaPresentationSession(host, options));
    const collectorFactory = Object.hasOwn(optionsValue, 'collectorFactory')
      ? requiredFunction(optionsValue.collectorFactory, 'collectorFactory')
      : ((options: unknown) => new InputPilotMetricCollector(options as ConstructorParameters<typeof InputPilotMetricCollector>[0]));
    const observedMatchServiceFactory = Object.hasOwn(optionsValue, 'observedMatchServiceFactory')
      ? requiredFunction(optionsValue.observedMatchServiceFactory, 'observedMatchServiceFactory')
      : ((options: unknown) => new InputPilotObservedMatchService(options as ConstructorParameters<typeof InputPilotObservedMatchService>[0]));

    this.#collector = null;
    this.#assignedMatchService = null;
    this.#presentation = null;
    this.#onProgress = onProgress;
    this.#onFailure = onFailure;
    this.#onDiagnostic = onDiagnostic;
    this.#reportedFailure = false;
    this.#finalMetrics = null;
    this.#hasFinalMetrics = false;
    this.#lastTimedOut = false;
    this.#cleanupFailed = false;
    this.#destroyed = false;

    try {
      const collectorOwner = collectorFactory({
        definition,
        assignment: checkpoint.assignment,
      });
      this.#collector = collectorPort(collectorOwner);
      const observed = observedMatchServiceFactory({
        matchService,
        collector: collectorOwner,
      });
      const destroyObserved = optionalDataMethod(observed, 'destroy', 'pilot observed match service');
      try {
        this.#assignedMatchService = new InputPilotAssignedMatchService({
          matchService: observed,
          matchSeed: checkpoint.assignment.matchSeed,
        });
      } catch (error) {
        const cleanupErrors: Error[] = [];
        try {
          destroyObserved?.();
        } catch (cleanupError) {
          cleanupErrors.push(normalizeThrownError(
            cleanupError,
            '无效 pilot observed match service 清理失败',
          ));
        }
        throw combineCleanupFailure(
          normalizeThrownError(error, 'pilot observed match service 合同无效'),
          cleanupErrors,
          'pilot observed match service 合同无效且清理失败。',
        );
      }
      const presentationOwner = presentationSessionFactory(optionsValue.platform, {
        ...sessionOptions,
        mapperId: checkpoint.assignment.mapperId,
        matchService: this.#assignedMatchService,
        experimentLabel: '',
        onMatchProgress: () => this.#handleProgress(),
        onDiagnostic: (diagnostic: unknown) => this.#handleDiagnostic(diagnostic),
      });
      this.#presentation = presentationPort(presentationOwner);
    } catch (error) {
      const cleanupErrors = this.#cleanupResources();
      this.#destroyed = cleanupErrors.length === 0;
      throw combineCleanupFailure(
        normalizeThrownError(error, 'InputPilotPresentationRuntime 构造失败'),
        cleanupErrors,
        'InputPilotPresentationRuntime 构造失败且清理未完整完成。',
      );
    }
    Object.freeze(this);
  }

  #handleProgress(): unknown {
    if (this.#destroyed || this.#cleanupFailed) return false;
    const collector = this.#collector;
    const onProgress = this.#onProgress;
    if (collector === null || onProgress === null) return false;
    this.#lastTimedOut = collectorTimedOut(collector.getStatus());
    return onProgress();
  }

  #handleDiagnostic(value: unknown): void {
    let diagnostic: Readonly<Record<string, unknown>>;
    try {
      const cloned = cloneFrozenData(value, 'InputPilotPresentationRuntime diagnostic');
      if (!cloned || typeof cloned !== 'object' || Array.isArray(cloned)) return;
      diagnostic = cloned as Readonly<Record<string, unknown>>;
      this.#onDiagnostic?.(diagnostic);
    } catch {
      return;
    }
    if (diagnostic.type !== 'session-failed' || this.#reportedFailure) return;
    this.#reportedFailure = true;
    const message = typeof diagnostic.message === 'string'
      ? diagnostic.message
      : 'Arena pilot session failed.';
    try {
      this.#onFailure?.(new Error(message));
    } catch {
      // Failure reporting cannot take ownership of the runtime lifecycle.
    }
  }

  #assertUsable(): void {
    if (this.#destroyed || this.#cleanupFailed) {
      throw new Error('InputPilotPresentationRuntime 已销毁。');
    }
  }

  start(): unknown {
    if (this.#destroyed || this.#cleanupFailed) {
      return Promise.reject(new Error('InputPilotPresentationRuntime 已销毁。'));
    }
    const presentation = this.#presentation;
    if (presentation === null) return Promise.reject(new Error('pilot presentation 缺失。'));
    return presentation.start();
  }

  setPaused(paused: unknown): unknown {
    this.#assertUsable();
    if (typeof paused !== 'boolean') throw new TypeError('paused 必须是布尔值。');
    const presentation = this.#presentation;
    if (presentation === null) throw new Error('pilot presentation 缺失。');
    return presentation.setPaused(paused);
  }

  getStatus(): InputPilotPresentationRuntimeStatus {
    if (this.#destroyed) {
      return Object.freeze({
        state: INPUT_PILOT_RUNTIME_STATE.DESTROYED,
        timedOut: this.#lastTimedOut,
      });
    }
    if (this.#cleanupFailed) {
      return Object.freeze({
        state: INPUT_PILOT_RUNTIME_STATE.FAILED,
        timedOut: this.#lastTimedOut,
      });
    }
    const collector = this.#collector;
    const presentation = this.#presentation;
    if (collector === null || presentation === null) {
      throw new Error('InputPilotPresentationRuntime 资源缺失。');
    }
    this.#lastTimedOut = collectorTimedOut(collector.getStatus());
    return Object.freeze({
      state: sessionState(presentation.getState()),
      timedOut: this.#lastTimedOut,
    });
  }

  finalizeMetrics(): unknown {
    if (this.#hasFinalMetrics) return this.#finalMetrics;
    this.#assertUsable();
    const collector = this.#collector;
    if (collector === null) throw new Error('pilot metric collector 缺失。');
    const metrics = collector.finalize();
    this.#finalMetrics = metrics;
    this.#hasFinalMetrics = true;
    return metrics;
  }

  #cleanupResources(): Error[] {
    const errors: Error[] = [];
    if (this.#presentation !== null) {
      try {
        this.#presentation.destroy();
        this.#presentation = null;
      } catch (error) {
        errors.push(normalizeThrownError(error, 'pilot presentation 清理失败'));
        return errors;
      }
    }
    if (this.#assignedMatchService !== null) {
      try {
        this.#assignedMatchService.destroy();
        this.#assignedMatchService = null;
      } catch (error) {
        errors.push(normalizeThrownError(error, 'pilot match service 清理失败'));
        return errors;
      }
    }
    if (this.#collector !== null) {
      try {
        this.#collector.destroy();
        this.#collector = null;
      } catch (error) {
        errors.push(normalizeThrownError(error, 'pilot metric collector 清理失败'));
      }
    }
    return errors;
  }

  destroy(): void {
    if (this.#destroyed) return;
    const errors = this.#cleanupResources();
    if (errors.length > 0) {
      this.#cleanupFailed = true;
      const failure = new Error('InputPilotPresentationRuntime 清理未完整完成。') as Error & {
        cleanupErrors?: readonly Error[];
      };
      failure.cleanupErrors = Object.freeze(errors);
      throw failure;
    }
    this.#cleanupFailed = false;
    this.#onProgress = null;
    this.#onFailure = null;
    this.#onDiagnostic = null;
    this.#destroyed = true;
  }
}

export function createInputPilotPresentationRuntimeFactory(
  optionsValue: unknown,
): (trialValue: unknown) => InputPilotPresentationRuntime {
  const options = shallowDataRecord(
    optionsValue,
    'createInputPilotPresentationRuntimeFactory options',
  );
  return (trialValue: unknown) => {
    const trial = shallowDataRecord(trialValue, 'InputPilotPresentationRuntime trial');
    return new InputPilotPresentationRuntime({ ...options, ...trial });
  };
}
