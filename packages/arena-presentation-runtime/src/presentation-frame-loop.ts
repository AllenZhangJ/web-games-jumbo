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
  #hasPendingFrame = false;
  #generation = 0;
  #lastTimestamp: number | null = null;
  #state: FrameLoopState = 'idle';
  #scheduling = false;
  #delivering = false;
  #cancelling = false;

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

  #report(error: unknown): void {
    observeNativePromise(error);
    try {
      containDiagnosticReturn(this.#onError(error), 'PresentationFrameLoop.onError()');
    } catch (observerError) {
      observeNativePromise(observerError);
      // Diagnostics cannot restart the loop.
    }
  }

  #cancel(token: unknown): void {
    if (this.#cancelling) return;
    this.#cancelling = true;
    try {
      containDiagnosticReturn(
        this.#cancelFrame(token),
        'PresentationFrameLoop.cancelFrame()',
      );
    } catch (error) {
      observeNativePromise(error);
      // Generation checks suppress callbacks even when the host cannot cancel.
    } finally {
      this.#cancelling = false;
    }
  }

  #schedule(): boolean {
    if (this.#state !== 'running' || this.#hasPendingFrame || this.#scheduling) return false;
    this.#scheduling = true;
    const generation = this.#generation;
    let synchronous = true;
    let invokedSynchronously = false;
    let token: unknown;
    try {
      token = this.#requestFrame((timestamp) => {
        if (synchronous) {
          invokedSynchronously = true;
          containDiagnosticReturn(timestamp, 'PresentationFrameLoop synchronous timestamp');
          return;
        }
        if (this.#state !== 'running' || generation !== this.#generation) {
          observeNativePromise(timestamp);
          return;
        }
        this.#hasPendingFrame = false;
        this.#token = undefined;
        this.#deliver(timestamp, generation);
      });
      synchronous = false;
      const asyncToken = observeNativePromise(token);
      if (invokedSynchronously) {
        this.#cancel(token);
        throw new Error('PresentationFrameLoop 不接受同步 requestFrame 回调。');
      }
      if (this.#state !== 'running' || generation !== this.#generation) {
        this.#cancel(token);
        return false;
      }
      if (asyncToken) {
        throw new TypeError('PresentationFrameLoop.requestFrame() 必须同步返回 token。');
      }
      this.#token = token;
      this.#hasPendingFrame = true;
      return true;
    } finally {
      synchronous = false;
      this.#scheduling = false;
    }
  }

  #deliver(timestamp: unknown, generation: number): void {
    if (this.#delivering) {
      observeNativePromise(timestamp);
      this.#state = 'failed';
      this.#report(new Error('PresentationFrameLoop callback 不可重入。'));
      return;
    }
    this.#delivering = true;
    try {
      const normalized = safeTimestamp(timestamp, this.#now, this.#lastTimestamp);
      let deltaSeconds = 0;
      if (this.#lastTimestamp !== null) {
        const raw = (normalized - this.#lastTimestamp) / 1000;
        deltaSeconds = Math.min(this.#maxDeltaSeconds, Math.max(0, Number.isFinite(raw) ? raw : 0));
      }
      this.#lastTimestamp = normalized;
      const callback = this.#callback;
      if (!callback) throw new Error('PresentationFrameLoop 缺少活动 callback。');
      const result = callback(Object.freeze({ timestamp: normalized, deltaSeconds }));
      rejectThenable(result, 'PresentationFrameLoop callback');
      if (result === false && this.#state === 'running' && generation === this.#generation) {
        this.#state = 'idle';
        this.#callback = null;
      }
    } catch (error) {
      if (this.#state !== 'destroyed') this.#state = 'failed';
      this.#report(error);
    } finally {
      this.#delivering = false;
    }
    if (this.#state === 'running' && generation === this.#generation) {
      try { this.#schedule(); } catch (error) {
        this.#state = 'failed';
        this.#report(error);
      }
    }
  }

  start(callbackValue: unknown): boolean {
    if (this.#cancelling) throw new Error('PresentationFrameLoop 不可在 cancelFrame() 中重入。');
    if (this.#state === 'destroyed') throw new Error('PresentationFrameLoop 已销毁。');
    if (this.#state === 'failed') throw new Error('PresentationFrameLoop 已失败。');
    const callback = requiredFunction<PresentationFrameCallback>(callbackValue, 'PresentationFrameLoop.callback');
    if (this.#state === 'running') return false;
    this.#callback = callback;
    this.#lastTimestamp = null;
    this.#generation += 1;
    this.#state = 'running';
    try {
      return this.#schedule();
    } catch (error) {
      if ((this.#state as FrameLoopState) !== 'destroyed') this.#state = 'failed';
      this.#callback = null;
      this.#report(error);
      throw error;
    }
  }

  stop(): boolean {
    if (this.#cancelling) throw new Error('PresentationFrameLoop 不可在 cancelFrame() 中重入。');
    if (this.#state === 'destroyed' || this.#state === 'idle') return false;
    this.#generation += 1;
    const token = this.#token;
    const hadPendingFrame = this.#hasPendingFrame;
    this.#token = undefined;
    this.#hasPendingFrame = false;
    this.#callback = null;
    this.#lastTimestamp = null;
    if (this.#state !== 'failed') this.#state = 'idle';
    if (hadPendingFrame) {
      this.#cancel(token);
    }
    return true;
  }

  getDebugSnapshot(): Readonly<Record<string, number | boolean | string | null>> {
    return Object.freeze({
      state: this.#state, hasPendingFrame: this.#hasPendingFrame,
      generation: this.#generation, lastTimestamp: this.#lastTimestamp,
      scheduling: this.#scheduling, delivering: this.#delivering,
    });
  }

  destroy(): void {
    if (this.#cancelling) throw new Error('PresentationFrameLoop 不可在 cancelFrame() 中重入。');
    if (this.#state === 'destroyed') return;
    this.stop();
    this.#generation += 1;
    this.#state = 'destroyed';
    this.#callback = null;
  }
}
