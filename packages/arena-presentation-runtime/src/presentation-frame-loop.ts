import { rejectThenable } from './capability-utils.js';

const OPTION_KEYS = new Set(['requestFrame', 'cancelFrame', 'now', 'onError', 'maxDeltaSeconds']);
const NATIVE_PROMISE_THEN = Promise.prototype.then;

export interface PresentationFrame {
  readonly timestamp: number;
  readonly deltaSeconds: number;
}
export type PresentationFrameCallback = (frame: PresentationFrame) => boolean | void;
type RequestFrame = (callback: (timestamp: unknown) => void) => unknown;
type CancelFrame = (token: unknown) => void;
type Now = () => unknown;
type ErrorObserver = (error: unknown) => void;
type FrameLoopState = 'idle' | 'running' | 'failed' | 'destroyed';
type PresentationFrameLoopOperation = 'start' | 'deliver' | 'stop' | 'destroy' | 'debug-read';
type PresentationFrameLoopDeferredCommand = 'stop' | 'destroy';

function requiredFunction<T extends (...args: never[]) => unknown>(value: unknown, name: string): T {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value as T;
}

function ownOptions(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') throw new RangeError(`${name} 不支持 Symbol 字段。`);
    if (!OPTION_KEYS.has(key)) throw new RangeError(`${name} 不支持字段 ${key}。`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function observeNativePromise(value: unknown): boolean {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return false;
  try {
    Reflect.apply(NATIVE_PROMISE_THEN, value, [() => undefined, () => undefined]);
    return true;
  } catch {
    return false;
  }
}

function containDiagnosticReturn(value: unknown, name: string): void {
  if (observeNativePromise(value)) return;
  try { rejectThenable(value, name); } catch { /* diagnostics are observer-only */ }
}

function safeTimestamp(timestamp: unknown, now: Now, previous: number | null): number {
  try {
    rejectThenable(timestamp, 'PresentationFrameLoop frame timestamp');
    if (Number.isFinite(timestamp)) return timestamp as number;
  } catch (error) {
    observeNativePromise(error);
  }
  try {
    const fallback = now();
    rejectThenable(fallback, 'PresentationFrameLoop.now()');
    if (Number.isFinite(fallback)) return fallback as number;
  } catch (error) {
    observeNativePromise(error);
    // Host clock failure falls back to a monotonic synthetic timestamp.
  }
  return previous === null ? 0 : previous + 1000 / 60;
}

export class PresentationFrameLoop {
  readonly #requestFrame: RequestFrame;
  readonly #cancelFrame: CancelFrame;
  readonly #now: Now;
  readonly #onError: ErrorObserver;
  readonly #maxDeltaSeconds: number;
  #callback: PresentationFrameCallback | null = null;
  #token: unknown = undefined;
  #cancellationDebts: unknown[] = [];
  #frameSequence = 0;
  #pendingFrameSequence: number | null = null;
  #generation = 0;
  #lastTimestamp: number | null = null;
  #state: FrameLoopState = 'idle';
  #operation: PresentationFrameLoopOperation | null = null;
  #operationSequence = 0;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #deferredCommand: PresentationFrameLoopDeferredCommand | null = null;
  #observationDepth = 0;

  constructor(optionsValue: unknown) {
    const options = ownOptions(optionsValue, 'PresentationFrameLoop options');
    this.#requestFrame = requiredFunction<RequestFrame>(options.requestFrame, 'PresentationFrameLoop.requestFrame');
    this.#cancelFrame = requiredFunction<CancelFrame>(options.cancelFrame, 'PresentationFrameLoop.cancelFrame');
    this.#now = requiredFunction<Now>(options.now, 'PresentationFrameLoop.now');
    this.#onError = requiredFunction<ErrorObserver>(options.onError, 'PresentationFrameLoop.onError');
    const maxDeltaSeconds = options.maxDeltaSeconds ?? 0.1;
    if (!Number.isFinite(maxDeltaSeconds) || (maxDeltaSeconds as number) <= 0) {
      throw new RangeError('PresentationFrameLoop.maxDeltaSeconds 必须大于 0。');
    }
    this.#maxDeltaSeconds = maxDeltaSeconds as number;
  }

  #guardObservationReentry(operation: string): void {
    if (this.#observationDepth > 0) {
      throw new Error(`PresentationFrameLoop observer期间不能执行${operation}。`);
    }
  }

  #guardReentry(operation: PresentationFrameLoopOperation): void {
    if (this.#operation === null) return;
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `PresentationFrameLoop ${this.#operation}期间拒绝${operation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertOperationOwner(
    sequence: number,
    operation: PresentationFrameLoopOperation,
    label: string,
  ): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw new Error(`${label}缺少当前PresentationFrameLoop operation所有权。`);
    }
  }

  #assertCurrentOperationCommit(
    sequence: number,
    operation: PresentationFrameLoopOperation,
    label: string,
  ): void {
    this.#assertOperationOwner(sequence, operation, label);
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(
    operation: PresentationFrameLoopOperation,
    run: (sequence: number) => T,
  ): T {
    this.#guardObservationReentry(operation);
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCurrentOperationCommit(sequence, operation, `PresentationFrameLoop ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `PresentationFrameLoop ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }

  #containObservation<T>(observe: () => T): T {
    const reentryError = this.#reentryError;
    this.#observationDepth += 1;
    try {
      return observe();
    } finally {
      this.#observationDepth -= 1;
      this.#reentryError = reentryError;
    }
  }

  #report(error: unknown): void {
    observeNativePromise(error);
    try {
      this.#containObservation(() => containDiagnosticReturn(
        this.#onError(error),
        'PresentationFrameLoop.onError()',
      ));
    } catch (observerError) {
      observeNativePromise(observerError);
      // Diagnostics cannot restart the loop.
    }
  }

  #cancelOwned(
    sequence: number,
    operation: PresentationFrameLoopOperation,
    token: unknown,
  ): void {
    if (!this.#cancellationDebts.some((candidate) => Object.is(candidate, token))) {
      this.#cancellationDebts.push(token);
    }
    while (this.#cancellationDebts.length > 0) {
      const ownedToken = this.#cancellationDebts[0];
      rejectThenable(
        this.#cancelFrame(ownedToken),
        'PresentationFrameLoop.cancelFrame()',
      );
      this.#assertCurrentOperationCommit(
        sequence,
        operation,
        'PresentationFrameLoop cancelFrame',
      );
      this.#cancellationDebts.shift();
    }
  }

  #scheduleOwned(
    sequence: number,
    operation: PresentationFrameLoopOperation,
  ): boolean {
    if (this.#state !== 'running' || this.#pendingFrameSequence !== null) return false;
    if (this.#cancellationDebts.length > 0) {
      throw new Error('PresentationFrameLoop存在未结清帧取消债务，拒绝调度新帧。');
    }
    const generation = this.#generation;
    const frameSequence = this.#frameSequence + 1;
    let synchronous = true;
    let invokedSynchronously = false;
    let token: unknown;
    let tokenCaptured = false;
    let asyncToken = false;
    let cancellationAttempted = false;
    try {
      token = this.#requestFrame((timestamp) => {
        if (synchronous) {
          invokedSynchronously = true;
          containDiagnosticReturn(timestamp, 'PresentationFrameLoop synchronous timestamp');
          return;
        }
        this.#handleFrame(timestamp, generation, frameSequence, token);
      });
      tokenCaptured = true;
      synchronous = false;
      asyncToken = observeNativePromise(token);
      if (invokedSynchronously) {
        if (!asyncToken) {
          cancellationAttempted = true;
          this.#cancelOwned(sequence, operation, token);
        }
        throw new Error('PresentationFrameLoop 不接受同步 requestFrame 回调。');
      }
      this.#assertCurrentOperationCommit(sequence, operation, 'PresentationFrameLoop requestFrame');
      if (
        this.#state !== 'running'
        || generation !== this.#generation
        || this.#deferredCommand !== null
      ) {
        if (!asyncToken) {
          cancellationAttempted = true;
          this.#cancelOwned(sequence, operation, token);
        }
        return false;
      }
      if (asyncToken) {
        throw new TypeError('PresentationFrameLoop.requestFrame() 必须同步返回 token。');
      }
      this.#frameSequence = frameSequence;
      this.#pendingFrameSequence = frameSequence;
      this.#token = token;
      return true;
    } catch (error) {
      synchronous = false;
      if (tokenCaptured && !asyncToken && !invokedSynchronously && !cancellationAttempted) {
        try {
          this.#cancelOwned(sequence, operation, token);
        } catch (cancelError) {
          if (cancelError !== error) {
            throw new AggregateError(
              [error, cancelError],
              'PresentationFrameLoop 调度失败且token取消不完整。',
            );
          }
        }
      }
      throw error;
    } finally {
      synchronous = false;
    }
  }

  #stopOwned(
    sequence: number,
    operation: PresentationFrameLoopOperation,
  ): boolean {
    if (this.#cancellationDebts.length > 0) {
      this.#cancelOwned(sequence, operation, this.#cancellationDebts[0]);
    }
    if (this.#state === 'destroyed' || this.#state === 'idle') return false;
    this.#generation += 1;
    const token = this.#token;
    const hadPendingFrame = this.#pendingFrameSequence !== null;
    this.#token = undefined;
    this.#pendingFrameSequence = null;
    this.#callback = null;
    this.#lastTimestamp = null;
    if (this.#state !== 'failed') this.#state = 'idle';
    if (hadPendingFrame) this.#cancelOwned(sequence, operation, token);
    return true;
  }

  #destroyOwned(
    sequence: number,
    operation: PresentationFrameLoopOperation,
  ): void {
    if (this.#state === 'destroyed') return;
    this.#stopOwned(sequence, operation);
    if (this.#cancellationDebts.length > 0) {
      throw new Error('PresentationFrameLoop仍持有未取消帧token。');
    }
    this.#generation += 1;
    this.#state = 'destroyed';
    this.#callback = null;
    this.#pendingFrameSequence = null;
    this.#token = undefined;
  }

  #applyDeferredCommand(
    sequence: number,
    operation: PresentationFrameLoopOperation,
  ): boolean {
    const command = this.#deferredCommand;
    this.#deferredCommand = null;
    if (command === 'destroy') {
      this.#destroyOwned(sequence, operation);
      return true;
    }
    if (command === 'stop') {
      this.#stopOwned(sequence, operation);
      return true;
    }
    return false;
  }

  #deliverOwned(
    sequence: number,
    timestamp: unknown,
    generation: number,
  ): void {
    this.#pendingFrameSequence = null;
    this.#token = undefined;
    this.#deferredCommand = null;
    let failure: unknown = null;
    try {
      const normalized = safeTimestamp(timestamp, this.#now, this.#lastTimestamp);
      this.#assertCurrentOperationCommit(sequence, 'deliver', 'PresentationFrameLoop frame clock');
      let deltaSeconds = 0;
      if (this.#lastTimestamp !== null) {
        const raw = (normalized - this.#lastTimestamp) / 1000;
        deltaSeconds = Math.min(this.#maxDeltaSeconds, Math.max(0, Number.isFinite(raw) ? raw : 0));
      }
      const callback = this.#callback;
      if (!callback) throw new Error('PresentationFrameLoop 缺少活动 callback。');
      const result = callback(Object.freeze({ timestamp: normalized, deltaSeconds }));
      rejectThenable(result, 'PresentationFrameLoop callback');
      this.#assertCurrentOperationCommit(sequence, 'deliver', 'PresentationFrameLoop callback');
      this.#lastTimestamp = normalized;
      if (result === false && this.#state === 'running' && generation === this.#generation) {
        this.#state = 'idle';
        this.#callback = null;
      }
    } catch (error) {
      failure = error;
    }
    this.#applyDeferredCommand(sequence, 'deliver');
    if (failure !== null) throw failure;
    if (this.#state === 'running' && generation === this.#generation) {
      try {
        this.#scheduleOwned(sequence, 'deliver');
      } finally {
        this.#applyDeferredCommand(sequence, 'deliver');
      }
    }
  }

  #handleFrame(
    timestamp: unknown,
    generation: number,
    frameSequence: number,
    token: unknown,
  ): void {
    try {
      this.#runOperation('deliver', (sequence) => {
        if (
          this.#state !== 'running'
          || generation !== this.#generation
          || frameSequence !== this.#pendingFrameSequence
        ) {
          const cancellationIndex = this.#cancellationDebts.findIndex(
            (candidate) => Object.is(candidate, token),
          );
          if (cancellationIndex >= 0) this.#cancellationDebts.splice(cancellationIndex, 1);
          observeNativePromise(timestamp);
          return;
        }
        this.#deliverOwned(sequence, timestamp, generation);
      });
    } catch (error) {
      if (this.#state !== 'destroyed') this.#state = 'failed';
      this.#report(error);
    }
  }

  start(callbackValue: unknown): boolean {
    return this.#runOperation('start', (sequence) => {
      if (this.#cancellationDebts.length > 0) {
        this.#cancelOwned(sequence, 'start', this.#cancellationDebts[0]);
      }
      if (this.#state === 'destroyed') throw new Error('PresentationFrameLoop 已销毁。');
      if (this.#state === 'failed') throw new Error('PresentationFrameLoop 已失败。');
      const callback = requiredFunction<PresentationFrameCallback>(callbackValue, 'PresentationFrameLoop.callback');
      if (this.#state === 'running') return false;
      this.#callback = callback;
      this.#lastTimestamp = null;
      this.#generation += 1;
      this.#state = 'running';
      try {
        const scheduled = this.#scheduleOwned(sequence, 'start');
        this.#applyDeferredCommand(sequence, 'start');
        return scheduled && this.#state === 'running';
      } catch (error) {
        this.#applyDeferredCommand(sequence, 'start');
        if ((this.#state as FrameLoopState) !== 'destroyed') this.#state = 'failed';
        this.#callback = null;
        this.#report(error);
        throw error;
      }
    });
  }

  stop(): boolean {
    this.#guardObservationReentry('stop');
    if (this.#operation === 'start' || this.#operation === 'deliver') {
      if (
        this.#state === 'destroyed'
        || this.#state === 'idle'
        || this.#deferredCommand !== null
      ) return false;
      this.#deferredCommand = 'stop';
      return true;
    }
    return this.#runOperation('stop', (sequence) => this.#stopOwned(sequence, 'stop'));
  }

  getDebugSnapshot(): Readonly<Record<string, number | boolean | string | null>> {
    return this.#runOperation('debug-read', () => Object.freeze({
      state: this.#state,
      hasPendingFrame: this.#pendingFrameSequence !== null,
      pendingCancellationCount: this.#cancellationDebts.length,
      generation: this.#generation,
      lastTimestamp: this.#lastTimestamp,
      scheduling: false,
      delivering: false,
    }));
  }

  destroy(): void {
    this.#guardObservationReentry('destroy');
    if (this.#operation === 'start' || this.#operation === 'deliver') {
      this.#deferredCommand = 'destroy';
      return;
    }
    this.#runOperation('destroy', (sequence) => this.#destroyOwned(sequence, 'destroy'));
  }
}

export const PRESENTATION_FRAME_LOOP_OPERATION_POLICY = Object.freeze({
  requestCancelDeliveryAndPublicReadsUseSingleOperationOwner: true as const,
  pendingFramesUseGenerationAndMonotonicFrameSequenceIdentity: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  requestAndCancelCallbacksCheckedBeforeTokenOrStatePublication: true as const,
  failedFrameCancellationRetainsRetryableTokenOwnership: true as const,
  stopAndDestroySettleCancellationDebtBeforeTerminalPublication: true as const,
  destroyedStateRequiresZeroCancellationDebt: true as const,
  staleOneShotFrameDeliverySettlesMatchingCancellationDebt: true as const,
  newFrameSchedulingRequiresZeroCancellationDebt: true as const,
  clockAndFrameCallbacksCheckedBeforeTimestampAndNextFramePublication: true as const,
  stopAndDestroyDuringDeliveryDeferUntilCallbackClosure: true as const,
  diagnosticObserverCannotOwnFrameLoopLifecycle: true as const,
  duplicateLateAndCancelledCallbacksCannotClearNewerFrameOwner: true as const,
  cadenceDeltaClampAndFailureContainmentRemainUnchanged: true as const,
  validationStatus: 'not-run' as const,
});
