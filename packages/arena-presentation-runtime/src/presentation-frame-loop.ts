import { assertKnownKeys } from '@number-strategy-jump/arena-contracts';

const OPTION_KEYS = new Set(['requestFrame', 'cancelFrame', 'now', 'onError', 'maxDeltaSeconds']);

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

function safeTimestamp(timestamp: unknown, now: Now, previous: number | null): number {
  if (Number.isFinite(timestamp)) return timestamp as number;
  try {
    const fallback = now();
    if (Number.isFinite(fallback)) return fallback as number;
  } catch {
    // Host clock failure falls back to a monotonic synthetic timestamp.
  }
  return previous === null ? 0 : previous + 1000 / 60;
}

function containThenable(value: unknown): boolean {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return false;
  let then: unknown;
  try { then = Reflect.get(value, 'then'); } catch { return true; }
  if (typeof then !== 'function') return false;
  try {
    Promise.resolve(value).catch(() => {});
  } catch { /* malformed thenable is still rejected synchronously */ }
  return true;
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

  constructor(options: unknown) {
    assertKnownKeys(options, OPTION_KEYS, 'PresentationFrameLoop options');
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
    try { this.#onError(error); } catch { /* diagnostics cannot restart the loop */ }
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
          return;
        }
        if (this.#state !== 'running' || generation !== this.#generation) return;
        this.#hasPendingFrame = false;
        this.#token = undefined;
        this.#deliver(timestamp, generation);
      });
      synchronous = false;
      if (invokedSynchronously) {
        try { this.#cancelFrame(token); } catch { /* callback was already suppressed */ }
        throw new Error('PresentationFrameLoop 不接受同步 requestFrame 回调。');
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
      if (containThenable(result)) {
        throw new TypeError('PresentationFrameLoop callback 必须同步返回。');
      }
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
    if (this.#state === 'destroyed') throw new Error('PresentationFrameLoop 已销毁。');
    if (this.#state === 'failed') throw new Error('PresentationFrameLoop 已失败。');
    const callback = requiredFunction<PresentationFrameCallback>(callbackValue, 'PresentationFrameLoop.callback');
    if (this.#state === 'running') return false;
    this.#callback = callback;
    this.#lastTimestamp = null;
    this.#generation += 1;
    this.#state = 'running';
    try {
      this.#schedule();
      return true;
    } catch (error) {
      this.#state = 'failed';
      this.#callback = null;
      this.#report(error);
      throw error;
    }
  }

  stop(): boolean {
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
      try { this.#cancelFrame(token); } catch { /* generation suppresses late callbacks */ }
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
    if (this.#state === 'destroyed') return;
    this.stop();
    this.#generation += 1;
    this.#state = 'destroyed';
    this.#callback = null;
  }
}
