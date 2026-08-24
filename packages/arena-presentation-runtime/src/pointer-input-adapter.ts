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
type PointerInputAdapterOperation = 'start' | 'stop' | 'event' | 'debug-read' | 'destroy';

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
  #cleanups: Cleanup[] = [];
  #state: AdapterState = 'idle';
  #destroyRequested = false;
  readonly #manageLifecycle: boolean;
  #operation: PointerInputAdapterOperation | null = null;
  #operationSequence = 0;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

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
    if (source.manageLifecycle !== undefined && typeof source.manageLifecycle !== 'boolean') {
      throw new TypeError('PointerInputAdapter.manageLifecycle 必须是布尔值。');
    }
    this.#manageLifecycle = source.manageLifecycle as boolean | undefined ?? true;
    Object.freeze(this);
  }

  #beginOperation(operation: PointerInputAdapterOperation): number {
    if (this.#operation !== null) {
      this.#reentrySequence += 1;
      this.#reentryError ??= new Error(
        `PointerInputAdapter.${operation}() 不可重入；当前正在 ${this.#operation}()。`,
      );
      throw this.#reentryError;
    }
    this.#operation = operation;
    this.#operationSequence += 1;
    this.#reentryError = null;
    return this.#operationSequence;
  }

  #assertCurrentOperationCommit(sequence: number, label: string): void {
    if (this.#operation === null || this.#operationSequence !== sequence) {
      throw new Error(`${label}缺少当前PointerInputAdapter操作所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #finishOperation(sequence: number): void {
    const operation = this.#operation;
    const ownershipError = operation === null || this.#operationSequence !== sequence
      ? new Error('PointerInputAdapter操作所有权在结束前已失效。')
      : null;
    const reentryError = this.#reentryError;
    if (reentryError !== null) {
      this.#state = this.#destroyRequested && this.#cleanups.length === 0
        ? 'destroyed'
        : 'idle';
    }
    this.#operation = null;
    this.#reentryError = null;
    if (ownershipError !== null) throw ownershipError;
    if (reentryError !== null) {
      throw new Error(
        `PointerInputAdapter.${operation ?? 'operation'}() 检测到宿主重入并停止发布状态。`,
        { cause: reentryError },
      );
    }
  }

  #runOperation<T>(
    operation: PointerInputAdapterOperation,
    callback: (sequence: number) => T,
  ): T {
    const sequence = this.#beginOperation(operation);
    try {
      return callback(sequence);
    } finally {
      this.#finishOperation(sequence);
    }
  }

  #callChecked<T>(sequence: number, label: string, callback: () => T): T {
    const result = callback();
    rejectThenable(result, label);
    this.#assertCurrentOperationCommit(sequence, label);
    return result;
  }

  #report(error: unknown, sequence?: number): void {
    try {
      const result = this.#onError(error);
      rejectThenable(result, 'PointerInputAdapter.onError');
    } catch { /* diagnostics cannot break input cleanup */ }
    if (sequence !== undefined) {
      this.#assertCurrentOperationCommit(sequence, 'PointerInputAdapter onError');
    }
  }

  #dispatch(callback: (sequence: number, ...args: unknown[]) => unknown): UnknownMethod {
    return (...args: unknown[]) => {
      if (this.#state !== 'started') return false;
      try {
        return this.#runOperation('event', (sequence) => {
          if (this.#state !== 'started') return false;
          return this.#callChecked(
            sequence,
            'PointerInputAdapter input callback',
            () => callback(sequence, ...args),
          );
        });
      } catch (error) {
        this.#report(error);
        return false;
      } finally {
        if (this.#destroyRequested && this.#operation === null) {
          try { this.destroy(); } catch (error) { this.#report(error); }
        }
      }
    };
  }

  #cleanup(values: readonly Cleanup[], sequence: number): Readonly<{
    failed: Cleanup[];
    errors: Error[];
  }> {
    const failed = [...values];
    const errors: Error[] = [];
    for (let index = failed.length - 1; index >= 0; index -= 1) {
      const cleanup = failed[index]!;
      try {
        this.#callChecked(
          sequence,
          'PointerInputAdapter cleanup',
          () => cleanup(),
        );
        failed.splice(index, 1);
      } catch (error) {
        const failure = normalizeThrownError(error, 'PointerInputAdapter 绑定清理失败');
        errors.push(failure);
        if (this.#reentryError === null) {
          try { this.#report(failure, sequence); } catch { /* sticky reentry is checked below */ }
        }
        if (this.#reentryError !== null) break;
      }
    }
    return Object.freeze({ failed, errors });
  }

  #assertStartContinues(sequence: number): void {
    this.#assertCurrentOperationCommit(sequence, 'PointerInputAdapter startup');
    if (this.#destroyRequested) {
      throw new Error('PointerInputAdapter 启动期间已请求销毁。');
    }
  }

  start(): boolean {
    return this.#runOperation('start', (sequence) => {
      if (this.#state === 'destroyed' || this.#destroyRequested) {
        throw new Error('PointerInputAdapter 已销毁。');
      }
      if (this.#state === 'started') return false;
      if (this.#state === 'starting' || this.#state === 'stopping') {
        throw new Error(`PointerInputAdapter 不能从 ${this.#state} 状态启动。`);
      }
      if (this.#cleanups.length > 0) {
        throw new Error('PointerInputAdapter 存在未完成清理，不能重新 start。');
      }
      this.#state = 'starting';
      const cleanups: Cleanup[] = [];
      const register = (candidate: unknown, name: string): void => {
        rejectThenable(candidate, name);
        this.#assertCurrentOperationCommit(sequence, name);
        if (typeof candidate !== 'function') {
          throw new TypeError('PointerInputAdapter 平台绑定必须返回 cleanup 函数。');
        }
        cleanups.push(candidate as Cleanup);
        this.#assertStartContinues(sequence);
      };
      try {
        const viewport = this.#callChecked(
          sequence,
          'PointerInputAdapter.viewportProvider',
          () => this.#viewportProvider(),
        );
        this.#callChecked(
          sequence,
          'PointerInputAdapter.sampler.resize',
          () => this.#sampler.resize(viewport),
        );
        this.#assertStartContinues(sequence);
        register(this.#platform.bindInput({
          onStart: this.#dispatch((eventSequence, point) => this.#callChecked(
            eventSequence,
            'PointerInputAdapter.sampler.pointerStart',
            () => this.#sampler.pointerStart(point),
          )),
          onMove: this.#dispatch((eventSequence, point) => this.#callChecked(
            eventSequence,
            'PointerInputAdapter.sampler.pointerMove',
            () => this.#sampler.pointerMove(point),
          )),
          onEnd: this.#dispatch((eventSequence, point) => this.#callChecked(
            eventSequence,
            'PointerInputAdapter.sampler.pointerEnd',
            () => this.#sampler.pointerEnd(point),
          )),
          onCancel: this.#dispatch((eventSequence, point) => this.#callChecked(
            eventSequence,
            'PointerInputAdapter.sampler.pointerCancel',
            () => this.#sampler.pointerCancel(point),
          )),
        }), 'PointerInputAdapter.platform.bindInput');
        if (this.#manageLifecycle) {
          register(this.#platform.onResize(this.#dispatch((eventSequence) => {
            const nextViewport = this.#callChecked(
              eventSequence,
              'PointerInputAdapter.viewportProvider',
              () => this.#viewportProvider(),
            );
            return this.#callChecked(
              eventSequence,
              'PointerInputAdapter.sampler.resize',
              () => this.#sampler.resize(nextViewport),
            );
          })), 'PointerInputAdapter.platform.onResize');
          register(this.#platform.onHide(this.#dispatch((eventSequence) => this.#callChecked(
            eventSequence,
            'PointerInputAdapter.sampler.suspend',
            () => this.#sampler.suspend(),
          ))), 'PointerInputAdapter.platform.onHide');
          register(this.#platform.onShow(this.#dispatch((eventSequence) => this.#callChecked(
            eventSequence,
            'PointerInputAdapter.sampler.resume',
            () => this.#sampler.resume(),
          ))), 'PointerInputAdapter.platform.onShow');
        }
        this.#assertStartContinues(sequence);
        this.#cleanups = cleanups;
        this.#state = 'started';
        return true;
      } catch (error) {
        const cleanup = this.#reentryError === null
          ? this.#cleanup(cleanups, sequence)
          : Object.freeze({ failed: [...cleanups], errors: [] as Error[] });
        this.#cleanups = cleanup.failed;
        this.#state = this.#destroyRequested && cleanup.failed.length === 0
          ? 'destroyed'
          : 'idle';
        throw combineCleanupFailure(
          normalizeThrownError(error, 'PointerInputAdapter 启动失败'),
          cleanup.errors,
          'PointerInputAdapter 启动失败且绑定清理未完整完成。',
        );
      }
    });
  }

  #stopWithinOperation(sequence: number): boolean {
    if (this.#state === 'destroyed' && this.#cleanups.length === 0) return false;
    if (this.#state === 'idle' && this.#cleanups.length === 0) {
      if (this.#destroyRequested) this.#state = 'destroyed';
      return false;
    }
    if (this.#state === 'starting' || this.#state === 'stopping') {
      throw new Error(`PointerInputAdapter 不能从 ${this.#state} 状态停止。`);
    }
    this.#state = 'stopping';
    const cleanup = this.#cleanup(this.#cleanups, sequence);
    this.#cleanups = cleanup.failed;
    if (this.#reentryError === null) {
      try {
        this.#callChecked(
          sequence,
          'PointerInputAdapter.sampler.suspend',
          () => this.#sampler.suspend(),
        );
      } catch (error) {
        if (this.#reentryError === null) this.#report(error, sequence);
      }
    }
    this.#state = this.#destroyRequested && cleanup.failed.length === 0
      ? 'destroyed'
      : 'idle';
    this.#assertCurrentOperationCommit(sequence, 'PointerInputAdapter stop publication');
    if (cleanup.errors.length > 0) {
      const failure = new Error('PointerInputAdapter 绑定清理未完整完成。') as Error & {
        cleanupErrors: readonly Error[];
      };
      failure.cleanupErrors = Object.freeze(cleanup.errors);
      throw failure;
    }
    return true;
  }

  stop(): boolean {
    return this.#runOperation('stop', (sequence) => this.#stopWithinOperation(sequence));
  }

  getDebugSnapshot(): Readonly<{
    state: AdapterState;
    cleanupCount: number;
    destroyRequested: boolean;
    manageLifecycle: boolean;
  }> {
    return this.#runOperation('debug-read', () => Object.freeze({
      state: this.#state,
      cleanupCount: this.#cleanups.length,
      destroyRequested: this.#destroyRequested,
      manageLifecycle: this.#manageLifecycle,
    }));
  }

  destroy(): void {
    if (this.#operation !== null) {
      this.#destroyRequested = true;
      return;
    }
    this.#runOperation('destroy', (sequence) => {
      if (this.#state === 'destroyed' && this.#cleanups.length === 0) return;
      this.#destroyRequested = true;
      this.#stopWithinOperation(sequence);
      this.#assertCurrentOperationCommit(sequence, 'PointerInputAdapter destroy publication');
      if (this.#cleanups.length === 0) this.#state = 'destroyed';
    });
  }
}

export const POINTER_INPUT_ADAPTER_OPERATION_POLICY = Object.freeze({
  operationGuardPrecedesLifecycleValidation: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  deferredDestroyRequestPreservesExistingLifecycleSemantics: true as const,
  platformSamplerAndEventCallbacksCheckedBeforeStatePublication: true as const,
  bindingsPublishOnlyAfterCompleteStartCallbackClosure: true as const,
  cleanupReentryRetainsCurrentAndEarlierBindingOwners: true as const,
  failedCleanupRetainsRetryOwnership: true as const,
  inputActionVocabularyRemainsPointerMovePrimaryAndJump: true as const,
  validationStatus: 'not-run' as const,
});
