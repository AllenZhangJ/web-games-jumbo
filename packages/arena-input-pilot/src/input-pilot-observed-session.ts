import {
  cloneFrozenData,
  combineCleanupFailure,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_MATCH_PHASE } from '@number-strategy-jump/arena-match';

type DataRecord = Readonly<Record<string, unknown>>;
type BoundMethod = (...args: readonly unknown[]) => unknown;

interface DelegateSessionPort {
  readonly owner: object;
  readonly start: BoundMethod;
  readonly setPaused: BoundMethod;
  readonly step: BoundMethod;
  readonly getSnapshot: BoundMethod;
  readonly getPublicMatchInfo: BoundMethod;
  readonly exportReplay: BoundMethod;
  readonly destroy: BoundMethod;
}

interface CollectorPort {
  readonly observeStep: BoundMethod;
}

function dataRecord(value: unknown, name: string): DataRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 无效。`);
  }
  return value as DataRecord;
}

function ownDataValue(record: DataRecord, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
    throw new TypeError(`${name}.${key} 必须是自有数据字段。`);
  }
  return descriptor.value;
}

function findDataMethod(owner: object, method: string, name: string): BoundMethod {
  let current: object | null = owner;
  while (current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current, method);
    if (descriptor) {
      if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
        throw new TypeError(`${name}.${method} 必须是数据方法。`);
      }
      if (typeof descriptor.value !== 'function') {
        throw new TypeError(`${name} 缺少 ${method}()。`);
      }
      return descriptor.value.bind(owner) as BoundMethod;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  throw new TypeError(`${name} 缺少 ${method}()。`);
}

function validateSession(value: unknown): DelegateSessionPort {
  const owner = dataRecord(value, 'pilot delegate session');
  return Object.freeze({
    owner,
    start: findDataMethod(owner, 'start', 'pilot delegate session'),
    setPaused: findDataMethod(owner, 'setPaused', 'pilot delegate session'),
    step: findDataMethod(owner, 'step', 'pilot delegate session'),
    getSnapshot: findDataMethod(owner, 'getSnapshot', 'pilot delegate session'),
    getPublicMatchInfo: findDataMethod(owner, 'getPublicMatchInfo', 'pilot delegate session'),
    exportReplay: findDataMethod(owner, 'exportReplay', 'pilot delegate session'),
    destroy: findDataMethod(owner, 'destroy', 'pilot delegate session'),
  });
}

function validateCollector(value: unknown): CollectorPort {
  const owner = dataRecord(value, 'pilot metric collector');
  return Object.freeze({
    observeStep: findDataMethod(owner, 'observeStep', 'pilot metric collector'),
  });
}

function immutableObservation(value: unknown, name: string): unknown {
  // 正式 Match/Session 合同已经返回深冻结值；正常路径保持引用且不重复遍历整张地图。
  // 测试替身或外部适配若返回可变值，则在研究边界复制并冻结后再交给 Collector/UI。
  if (value !== null && typeof value === 'object' && Object.isFrozen(value)) return value;
  return cloneFrozenData(value, name);
}

function snapshotTick(value: unknown, name: string): number {
  const source = dataRecord(value, name);
  const tick = ownDataValue(source, 'tick', name);
  if (!Number.isSafeInteger(tick) || (tick as number) < 0) {
    throw new RangeError(`${name}.tick 必须是非负安全整数。`);
  }
  return tick as number;
}

function snapshotPhase(value: unknown, name: string): unknown {
  return ownDataValue(dataRecord(value, name), 'phase', name);
}

export class InputPilotObservedSession {
  #delegate: DelegateSessionPort | null;
  #collector: CollectorPort | null;
  #stepping: boolean;
  #running: boolean;
  #failed: boolean;
  #destroyed: boolean;

  constructor({ session, collector }: { readonly session: unknown; readonly collector: unknown }) {
    this.#delegate = validateSession(session);
    this.#collector = validateCollector(collector);
    this.#stepping = false;
    this.#running = false;
    this.#failed = false;
    this.#destroyed = false;
    Object.freeze(this);
  }

  get state(): unknown {
    if (this.#destroyed || this.#delegate === null) return 'destroyed';
    if (this.#failed) return 'failed';
    return Reflect.get(this.#delegate.owner, 'state');
  }

  #assertUsable(allowRunning = false): void {
    if (this.#destroyed || this.#failed) throw new Error('InputPilotObservedSession 已销毁。');
    if (this.#running && !allowRunning) {
      throw new Error('runUntilEnded() 期间不能重入 InputPilotObservedSession。');
    }
  }

  #requireDelegate(): DelegateSessionPort {
    const delegate = this.#delegate;
    if (delegate === null) throw new Error('InputPilotObservedSession Delegate 已释放。');
    return delegate;
  }

  #fail(error: unknown, operation: string): Error {
    const failure = normalizeThrownError(
      error,
      `InputPilotObservedSession ${operation} 失败`,
    );
    const cleanupErrors: Error[] = [];
    const delegate = this.#delegate;
    this.#collector = null;
    this.#failed = true;
    if (delegate !== null) {
      try {
        delegate.destroy();
        this.#delegate = null;
        this.#destroyed = true;
      } catch (cleanupError) {
        cleanupErrors.push(normalizeThrownError(
          cleanupError,
          'InputPilotObservedSession delegate 清理失败',
        ));
      }
    }
    return combineCleanupFailure(
      failure,
      cleanupErrors,
      `InputPilotObservedSession ${operation} 失败且清理未完整完成。`,
    );
  }

  #startCore(): unknown {
    try {
      return this.#requireDelegate().start();
    } catch (error) {
      throw this.#fail(error, 'start');
    }
  }

  start(): unknown {
    this.#assertUsable();
    return this.#startCore();
  }

  setPaused(paused: unknown): unknown {
    this.#assertUsable();
    if (typeof paused !== 'boolean') throw new TypeError('paused 必须是布尔值。');
    if (this.#stepping) throw new Error('step() 期间不能暂停 InputPilotObservedSession。');
    try {
      return this.#requireDelegate().setPaused(paused);
    } catch (error) {
      throw this.#fail(error, 'setPaused');
    }
  }

  #stepCore(input: unknown): unknown {
    if (this.#stepping) throw new Error('InputPilotObservedSession.step() 不可重入。');
    this.#stepping = true;
    try {
      try {
        const delegate = this.#requireDelegate();
        const collector = this.#collector;
        if (collector === null) throw new Error('InputPilotObservedSession Collector 已释放。');
        const beforeSnapshot = immutableObservation(
          delegate.getSnapshot(),
          'pilot before snapshot',
        );
        const result = immutableObservation(delegate.step(input), 'pilot observed result');
        const resultSource = dataRecord(result, 'pilot observed result');
        const resultSnapshot = ownDataValue(resultSource, 'snapshot', 'pilot observed result');
        const resultEvents = ownDataValue(resultSource, 'events', 'pilot observed result');
        const resultInput = ownDataValue(resultSource, 'input', 'pilot observed result');
        if (snapshotTick(resultSnapshot, 'pilot observed snapshot') === snapshotTick(beforeSnapshot, 'pilot before snapshot')) {
          if (resultInput !== null || !Array.isArray(resultEvents) || resultEvents.length > 0) {
            throw new RangeError('未推进的 pilot step 不能消费输入或产生事件。');
          }
          return Object.freeze({
            events: immutableObservation(resultEvents, 'pilot paused events'),
            snapshot: immutableObservation(resultSnapshot, 'pilot paused snapshot'),
            input: null,
          });
        }
        const observedResult = Object.freeze({
          events: immutableObservation(resultEvents, 'pilot observed events'),
          snapshot: immutableObservation(resultSnapshot, 'pilot observed snapshot'),
          input: immutableObservation(resultInput, 'pilot observed input'),
        });
        collector.observeStep({
          beforeSnapshot,
          input: observedResult.input,
          result: observedResult,
        });
        return observedResult;
      } catch (error) {
        throw this.#fail(error, 'step');
      }
    } finally {
      this.#stepping = false;
    }
  }

  step(input: unknown = null): unknown {
    this.#assertUsable();
    return this.#stepCore(input);
  }

  runUntilEnded(
    inputProvider: (snapshot: unknown) => unknown = () => null,
    optionsValue: unknown = {},
  ): unknown {
    this.#assertUsable();
    if (typeof inputProvider !== 'function') throw new TypeError('inputProvider 必须是函数。');
    const options = cloneFrozenData(optionsValue, 'InputPilotObservedSession run options');
    const optionsSource = dataRecord(options, 'InputPilotObservedSession run options');
    const maxTicksValue = Object.hasOwn(optionsSource, 'maxTicks')
      ? ownDataValue(optionsSource, 'maxTicks', 'InputPilotObservedSession run options')
      : 100_000;
    if (!Number.isSafeInteger(maxTicksValue) || (maxTicksValue as number) < 1) {
      throw new RangeError('maxTicks 必须是正安全整数。');
    }
    this.#running = true;
    try {
      this.#startCore();
      let steps = 0;
      let current = immutableObservation(
        this.#requireDelegate().getSnapshot(),
        'pilot public snapshot',
      );
      while (snapshotPhase(current, 'pilot public snapshot') !== ARENA_MATCH_PHASE.ENDED && steps < (maxTicksValue as number)) {
        const input = inputProvider(current);
        this.#stepCore(input ?? null);
        current = immutableObservation(
          this.#requireDelegate().getSnapshot(),
          'pilot public snapshot',
        );
        steps += 1;
      }
      if (snapshotPhase(current, 'pilot public snapshot') !== ARENA_MATCH_PHASE.ENDED) {
        throw new Error(`pilot match 在 ${String(maxTicksValue)} tick 内未结束。`);
      }
      return this.#requireDelegate().exportReplay();
    } finally {
      this.#running = false;
    }
  }

  getSnapshot(): unknown {
    this.#assertUsable();
    return immutableObservation(this.#requireDelegate().getSnapshot(), 'pilot public snapshot');
  }

  getPublicMatchInfo(): unknown {
    this.#assertUsable();
    return immutableObservation(
      this.#requireDelegate().getPublicMatchInfo(),
      'pilot public match info',
    );
  }

  exportReplay(): unknown {
    this.#assertUsable();
    return this.#requireDelegate().exportReplay();
  }

  destroy(): void {
    if (this.#destroyed) return;
    if (this.#stepping) throw new Error('step() 期间不能销毁 InputPilotObservedSession。');
    if (this.#running) throw new Error('runUntilEnded() 期间不能销毁 InputPilotObservedSession。');
    const delegate = this.#delegate;
    this.#failed = true;
    if (delegate !== null) {
      delegate.destroy();
      this.#delegate = null;
    }
    this.#collector = null;
    this.#destroyed = true;
  }
}
