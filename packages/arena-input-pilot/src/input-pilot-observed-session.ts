import {
  cloneFrozenData,
  combineCleanupFailure,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_MATCH_PHASE } from '@number-strategy-jump/arena-match';

type DataRecord = Readonly<Record<string, unknown>>;
type BoundMethod = (...args: readonly unknown[]) => unknown;

const NATIVE_PROMISE_THEN = Promise.prototype.then;

interface DelegateSessionPort {
  readonly owner: object;
  readonly start: BoundMethod;
  readonly setPaused: BoundMethod;
  readonly stepWithLegacySnapshotForAudit: BoundMethod;
  readonly getLegacyFullSnapshotForAudit: BoundMethod;
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

function rejectAsyncSyncReturn(value: unknown, label: string): void {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return;
  let nativePromise = false;
  try {
    Reflect.apply(NATIVE_PROMISE_THEN, value, [() => {}, () => {}]);
    nativePromise = true;
  } catch {
    // 普通对象和 hostile thenable 没有 Promise internal slot。
  }
  if (nativePromise) throw new TypeError(`${label} 必须同步完成。`);
  const visited = new Set<object>();
  let current: object | null = value as object;
  let depth = 0;
  while (current !== null && depth < 32 && !visited.has(current)) {
    visited.add(current);
    depth += 1;
    const descriptor = Object.getOwnPropertyDescriptor(current, 'then');
    if (descriptor) {
      if (!('value' in descriptor)) throw new TypeError(`${label} 返回了访问器 thenable。`);
      if (typeof descriptor.value !== 'function') return;
      throw new TypeError(`${label} 必须同步完成。`);
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  if (current !== null) throw new TypeError(`${label} 返回值原型链无效。`);
}

function safelyWrapThrownError(value: unknown, message: string): Error {
  const failure = new Error(message);
  try {
    Object.defineProperty(failure, 'cause', {
      value,
      enumerable: false,
      configurable: true,
      writable: false,
    });
  } catch {
    // Caller-thrown values remain opaque; the static failure is authoritative.
  }
  return failure;
}

function validateSession(value: unknown): DelegateSessionPort {
  const owner = dataRecord(value, 'pilot delegate session');
  return Object.freeze({
    owner,
    start: findDataMethod(owner, 'start', 'pilot delegate session'),
    setPaused: findDataMethod(owner, 'setPaused', 'pilot delegate session'),
    stepWithLegacySnapshotForAudit: findDataMethod(owner, 'stepWithLegacySnapshotForAudit', 'pilot delegate session'),
    getLegacyFullSnapshotForAudit: findDataMethod(
      owner,
      'getLegacyFullSnapshotForAudit',
      'pilot delegate session',
    ),
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
    const state = Reflect.get(this.#delegate.owner, 'state');
    rejectAsyncSyncReturn(state, 'InputPilotObservedSession state');
    return state;
  }

  #assertUsable(allowRunning = false): void {
    if (this.#destroyed || this.#failed) throw new Error('InputPilotObservedSession 已销毁。');
    if (this.#running && !allowRunning) {
      throw new Error('runLegacyUntilEndedForAudit() 期间不能重入 InputPilotObservedSession。');
    }
  }

  #requireDelegate(): DelegateSessionPort {
    const delegate = this.#delegate;
    if (delegate === null) throw new Error('InputPilotObservedSession Delegate 已释放。');
    return delegate;
  }

  #fail(error: unknown, operation: string): Error {
    const failure = safelyWrapThrownError(error, `InputPilotObservedSession ${operation} 失败`);
    const cleanupErrors: Error[] = [];
    const delegate = this.#delegate;
    this.#collector = null;
    this.#failed = true;
    if (delegate !== null) {
      try {
        const cleanupResult = delegate.destroy();
        rejectAsyncSyncReturn(cleanupResult, 'InputPilotObservedSession delegate.destroy()');
        this.#delegate = null;
        this.#destroyed = true;
      } catch (cleanupError) {
        cleanupErrors.push(safelyWrapThrownError(
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
      const result = this.#requireDelegate().start();
      rejectAsyncSyncReturn(result, 'InputPilotObservedSession delegate.start()');
      return result;
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
    if (this.#stepping) throw new Error('stepWithLegacySnapshotForAudit() 期间不能暂停 InputPilotObservedSession。');
    try {
      const result = this.#requireDelegate().setPaused(paused);
      rejectAsyncSyncReturn(result, 'InputPilotObservedSession delegate.setPaused()');
      return result;
    } catch (error) {
      throw this.#fail(error, 'setPaused');
    }
  }

  #stepCore(input: unknown): unknown {
    if (this.#stepping) throw new Error('InputPilotObservedSession.stepWithLegacySnapshotForAudit() 不可重入。');
    this.#stepping = true;
    try {
      try {
        const delegate = this.#requireDelegate();
        const collector = this.#collector;
        if (collector === null) throw new Error('InputPilotObservedSession Collector 已释放。');
        const beforeValue = delegate.getLegacyFullSnapshotForAudit();
        rejectAsyncSyncReturn(
          beforeValue,
          'InputPilotObservedSession delegate.getLegacyFullSnapshotForAudit()',
        );
        const beforeSnapshot = immutableObservation(
          beforeValue,
          'pilot before snapshot',
        );
        const stepValue = delegate.stepWithLegacySnapshotForAudit(input);
        rejectAsyncSyncReturn(
          stepValue,
          'InputPilotObservedSession delegate.stepWithLegacySnapshotForAudit()',
        );
        const result = immutableObservation(stepValue, 'pilot observed result');
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
        const committedResult = Object.freeze({
          events: immutableObservation(resultEvents, 'pilot observed events'),
          snapshot: immutableObservation(resultSnapshot, 'pilot observed snapshot'),
          input: immutableObservation(resultInput, 'pilot observed input'),
        });
        const collectorResult = collector.observeStep({
          beforeSnapshot,
          input: committedResult.input,
          result: committedResult,
        });
        rejectAsyncSyncReturn(collectorResult, 'InputPilotObservedSession collector.observeStep()');
        return committedResult;
      } catch (error) {
        throw this.#fail(error, 'step');
      }
    } finally {
      this.#stepping = false;
    }
  }

  stepWithLegacySnapshotForAudit(input: unknown = null): unknown {
    this.#assertUsable();
    return this.#stepCore(input);
  }

  runLegacyUntilEndedForAudit(
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
      const firstSnapshotValue = this.#requireDelegate().getLegacyFullSnapshotForAudit();
      rejectAsyncSyncReturn(
        firstSnapshotValue,
        'InputPilotObservedSession delegate.getLegacyFullSnapshotForAudit()',
      );
      let steps = 0;
      let current = immutableObservation(
        firstSnapshotValue,
        'pilot public snapshot',
      );
      while (snapshotPhase(current, 'pilot public snapshot') !== ARENA_MATCH_PHASE.ENDED && steps < (maxTicksValue as number)) {
        const input = inputProvider(current);
        rejectAsyncSyncReturn(input, 'InputPilotObservedSession inputProvider()');
        this.#stepCore(input ?? null);
        const nextSnapshotValue = this.#requireDelegate().getLegacyFullSnapshotForAudit();
        rejectAsyncSyncReturn(
          nextSnapshotValue,
          'InputPilotObservedSession delegate.getLegacyFullSnapshotForAudit()',
        );
        current = immutableObservation(
          nextSnapshotValue,
          'pilot public snapshot',
        );
        steps += 1;
      }
      if (snapshotPhase(current, 'pilot public snapshot') !== ARENA_MATCH_PHASE.ENDED) {
        throw new Error(`pilot match 在 ${String(maxTicksValue)} tick 内未结束。`);
      }
      const replay = this.#requireDelegate().exportReplay();
      rejectAsyncSyncReturn(replay, 'InputPilotObservedSession delegate.exportReplay()');
      return replay;
    } catch (error) {
      if (this.#failed) throw error;
      throw this.#fail(error, 'runLegacyUntilEndedForAudit');
    } finally {
      this.#running = false;
    }
  }

  getLegacyFullSnapshotForAudit(): unknown {
    this.#assertUsable();
    const value = this.#requireDelegate().getLegacyFullSnapshotForAudit();
    rejectAsyncSyncReturn(
      value,
      'InputPilotObservedSession delegate.getLegacyFullSnapshotForAudit()',
    );
    return immutableObservation(
      value,
      'pilot public snapshot',
    );
  }

  getPublicMatchInfo(): unknown {
    this.#assertUsable();
    const value = this.#requireDelegate().getPublicMatchInfo();
    rejectAsyncSyncReturn(
      value,
      'InputPilotObservedSession delegate.getPublicMatchInfo()',
    );
    return immutableObservation(
      value,
      'pilot public match info',
    );
  }

  exportReplay(): unknown {
    this.#assertUsable();
    const replay = this.#requireDelegate().exportReplay();
    rejectAsyncSyncReturn(replay, 'InputPilotObservedSession delegate.exportReplay()');
    return replay;
  }

  destroy(): void {
    if (this.#destroyed) return;
    if (this.#stepping) throw new Error('stepWithLegacySnapshotForAudit() 期间不能销毁 InputPilotObservedSession。');
    if (this.#running) {
      throw new Error('runLegacyUntilEndedForAudit() 期间不能销毁 InputPilotObservedSession。');
    }
    const delegate = this.#delegate;
    this.#failed = true;
    if (delegate !== null) {
      const result = delegate.destroy();
      rejectAsyncSyncReturn(result, 'InputPilotObservedSession delegate.destroy()');
      this.#delegate = null;
    }
    this.#collector = null;
    this.#destroyed = true;
  }
}
