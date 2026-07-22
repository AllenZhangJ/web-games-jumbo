import {
  combineCleanupFailure,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import {
  rejectThenable,
  snapshotFunction,
  snapshotMethod,
  type UnknownMethod,
} from './capability-utils.js';
import { cloneKnownRecord } from './input-validation.js';

interface PlatformPort {
  readonly bindInput: UnknownMethod;
  readonly onResize: UnknownMethod;
  readonly onShow: UnknownMethod;
  readonly onHide: UnknownMethod;
}

interface SamplerPort {
  readonly pointerStart: UnknownMethod;
  readonly pointerMove: UnknownMethod;
  readonly pointerEnd: UnknownMethod;
  readonly pointerCancel: UnknownMethod;
  readonly resize: UnknownMethod;
  readonly suspend: UnknownMethod;
  readonly resume: UnknownMethod;
}

type Cleanup = () => unknown;
type AdapterState = 'idle' | 'starting' | 'started' | 'stopping' | 'destroyed';

const OPTION_KEYS = new Set([
  'platform',
  'sampler',
  'viewportProvider',
  'onError',
  'manageLifecycle',
]);

function validatePlatform(value: unknown): PlatformPort {
  return Object.freeze({
    bindInput: snapshotMethod(value, 'PointerInputAdapter.platform', 'bindInput')!,
    onResize: snapshotMethod(value, 'PointerInputAdapter.platform', 'onResize')!,
    onShow: snapshotMethod(value, 'PointerInputAdapter.platform', 'onShow')!,
    onHide: snapshotMethod(value, 'PointerInputAdapter.platform', 'onHide')!,
  });
}

function validateSampler(value: unknown): SamplerPort {
  return Object.freeze({
    pointerStart: snapshotMethod(value, 'PointerInputAdapter.sampler', 'pointerStart')!,
    pointerMove: snapshotMethod(value, 'PointerInputAdapter.sampler', 'pointerMove')!,
    pointerEnd: snapshotMethod(value, 'PointerInputAdapter.sampler', 'pointerEnd')!,
    pointerCancel: snapshotMethod(value, 'PointerInputAdapter.sampler', 'pointerCancel')!,
    resize: snapshotMethod(value, 'PointerInputAdapter.sampler', 'resize')!,
    suspend: snapshotMethod(value, 'PointerInputAdapter.sampler', 'suspend')!,
    resume: snapshotMethod(value, 'PointerInputAdapter.sampler', 'resume')!,
  });
}

export class PointerInputAdapter {
  readonly #platform: PlatformPort;
  readonly #sampler: SamplerPort;
  readonly #viewportProvider: UnknownMethod;
  readonly #onError: UnknownMethod;
  #cleanups: Cleanup[];
  #state: AdapterState;
  #destroyRequested: boolean;
  readonly #manageLifecycle: boolean;
  #reentryAttempted: boolean;

  constructor(options: unknown) {
    const source = cloneKnownRecord(options, OPTION_KEYS, 'PointerInputAdapter options');
    this.#platform = validatePlatform(source.platform);
    this.#sampler = validateSampler(source.sampler);
    this.#viewportProvider = snapshotFunction(
      source.viewportProvider,
      'PointerInputAdapter.viewportProvider',
    );
    this.#onError = source.onError === undefined
      ? () => {}
      : snapshotFunction(source.onError, 'PointerInputAdapter.onError');
    this.#cleanups = [];
    this.#state = 'idle';
    this.#destroyRequested = false;
    if (source.manageLifecycle !== undefined && typeof source.manageLifecycle !== 'boolean') {
      throw new TypeError('PointerInputAdapter.manageLifecycle 必须是布尔值。');
    }
    this.#manageLifecycle = source.manageLifecycle as boolean | undefined ?? true;
    this.#reentryAttempted = false;
    Object.freeze(this);
  }

  #report(error: unknown): void {
    try {
      const result = this.#onError(error);
      rejectThenable(result, 'PointerInputAdapter.onError');
    } catch { /* diagnostics cannot break input cleanup */ }
  }

  #dispatch(callback: UnknownMethod): UnknownMethod {
    return (...args: unknown[]) => {
      if (this.#state !== 'started') return false;
      try {
        const result = callback(...args);
        rejectThenable(result, 'PointerInputAdapter input callback');
        return result;
      } catch (error) {
        this.#report(error);
        return false;
      }
    };
  }

  #cleanup(values: readonly Cleanup[]): Readonly<{
    failed: Cleanup[];
    errors: Error[];
  }> {
    const failed: Cleanup[] = [];
    const errors: Error[] = [];
    for (const cleanup of [...values].reverse()) {
      try {
        const result = cleanup();
        rejectThenable(result, 'PointerInputAdapter cleanup');
      } catch (error) {
        const failure = normalizeThrownError(error, 'PointerInputAdapter 绑定清理失败');
        failed.push(cleanup);
        errors.push(failure);
        this.#report(failure);
      }
    }
    failed.reverse();
    return Object.freeze({ failed, errors });
  }

  #assertStartContinues(): void {
    if (this.#destroyRequested) {
      throw new Error('PointerInputAdapter 启动期间已请求销毁。');
    }
    if (this.#reentryAttempted) {
      throw new Error('PointerInputAdapter 启动期间发生重入。');
    }
  }

  start(): boolean {
    if (this.#state === 'destroyed' || this.#destroyRequested) {
      throw new Error('PointerInputAdapter 已销毁。');
    }
    if (this.#state === 'started') return false;
    if (this.#state === 'starting') {
      this.#reentryAttempted = true;
      throw new Error('PointerInputAdapter.start() 不可重入。');
    }
    if (this.#state === 'stopping') {
      this.#reentryAttempted = true;
      throw new Error('PointerInputAdapter.stop() 期间不能 start。');
    }
    if (this.#cleanups.length > 0) {
      throw new Error('PointerInputAdapter 存在未完成清理，不能重新 start。');
    }
    this.#state = 'starting';
    this.#reentryAttempted = false;
    const cleanups: Cleanup[] = [];
    const register = (candidate: unknown, name: string): void => {
      rejectThenable(candidate, name);
      if (typeof candidate !== 'function') {
        throw new TypeError('PointerInputAdapter 平台绑定必须返回 cleanup 函数。');
      }
      cleanups.push(candidate as Cleanup);
      this.#assertStartContinues();
    };
    try {
      const viewport = this.#viewportProvider();
      rejectThenable(viewport, 'PointerInputAdapter.viewportProvider');
      const resizeResult = this.#sampler.resize(viewport);
      rejectThenable(resizeResult, 'PointerInputAdapter.sampler.resize');
      this.#assertStartContinues();
      register(this.#platform.bindInput({
        onStart: this.#dispatch((point) => this.#sampler.pointerStart(point)),
        onMove: this.#dispatch((point) => this.#sampler.pointerMove(point)),
        onEnd: this.#dispatch((point) => this.#sampler.pointerEnd(point)),
        onCancel: this.#dispatch((point) => this.#sampler.pointerCancel(point)),
      }), 'PointerInputAdapter.platform.bindInput');
      if (this.#manageLifecycle) {
        register(this.#platform.onResize(this.#dispatch(() => {
          const nextViewport = this.#viewportProvider();
          rejectThenable(nextViewport, 'PointerInputAdapter.viewportProvider');
          return this.#sampler.resize(nextViewport);
        })), 'PointerInputAdapter.platform.onResize');
        register(this.#platform.onHide(this.#dispatch(() => this.#sampler.suspend())),
          'PointerInputAdapter.platform.onHide');
        register(this.#platform.onShow(this.#dispatch(() => this.#sampler.resume())),
          'PointerInputAdapter.platform.onShow');
      }
      this.#cleanups = cleanups;
      this.#state = 'started';
      return true;
    } catch (error) {
      const cleanup = this.#cleanup(cleanups);
      this.#cleanups = cleanup.failed;
      this.#state = this.#destroyRequested && cleanup.failed.length === 0
        ? 'destroyed'
        : 'idle';
      throw combineCleanupFailure(
        normalizeThrownError(error, 'PointerInputAdapter 启动失败'),
        cleanup.errors,
        'PointerInputAdapter 启动失败且绑定清理未完整完成。',
      );
    } finally {
      this.#reentryAttempted = false;
    }
  }

  stop(): boolean {
    if (this.#state === 'destroyed') return false;
    if (this.#state === 'idle' && this.#cleanups.length === 0) return false;
    if (this.#state === 'starting') {
      this.#reentryAttempted = true;
      throw new Error('PointerInputAdapter.start() 期间不能 stop。');
    }
    if (this.#state === 'stopping') return false;
    this.#state = 'stopping';
    const cleanups = this.#cleanups.splice(0);
    const cleanup = this.#cleanup(cleanups);
    this.#cleanups = cleanup.failed;
    try {
      const result = this.#sampler.suspend();
      rejectThenable(result, 'PointerInputAdapter.sampler.suspend');
    } catch (error) { this.#report(error); }
    this.#state = this.#destroyRequested && cleanup.failed.length === 0
      ? 'destroyed'
      : 'idle';
    if (cleanup.errors.length > 0) {
      const failure = new Error('PointerInputAdapter 绑定清理未完整完成。') as Error & {
        cleanupErrors: readonly Error[];
      };
      failure.cleanupErrors = Object.freeze(cleanup.errors);
      throw failure;
    }
    return true;
  }

  getDebugSnapshot(): Readonly<{
    state: AdapterState;
    cleanupCount: number;
    destroyRequested: boolean;
    manageLifecycle: boolean;
  }> {
    return Object.freeze({
      state: this.#state,
      cleanupCount: this.#cleanups.length,
      destroyRequested: this.#destroyRequested,
      manageLifecycle: this.#manageLifecycle,
    });
  }

  destroy(): void {
    if (this.#state === 'destroyed' && this.#cleanups.length === 0) return;
    this.#destroyRequested = true;
    if (this.#state === 'starting' || this.#state === 'stopping') return;
    this.stop();
    if (this.#cleanups.length === 0) this.#state = 'destroyed';
  }
}
