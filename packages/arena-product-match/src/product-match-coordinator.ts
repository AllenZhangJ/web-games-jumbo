import {
  assertKnownKeys,
  combineCleanupFailure,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import {
  createProductPublicMatchInfo,
} from '@number-strategy-jump/arena-product-contracts';
import type {
  ProductMatchResult,
  ProductPublicMatchInfo,
} from '@number-strategy-jump/arena-product-contracts';
import {
  createProductMatchFactoryPort,
  type ProductMatchFactoryPort,
} from './quick-match-product-factory.js';
import {
  createProductMatchRuntimePort,
  type ProductMatchRuntimePort,
  type ProductMatchReadFrameStartOutcome,
  type ProductMatchReadFrameStepOutcome,
} from './product-match-runtime.js';
import {
  readRequiredDataField,
  requireRecord,
  containRejectedAsyncReturn,
  resolveSyncOrNativePromise,
  snapshotMethod,
} from './ports.js';

export const PRODUCT_MATCH_COORDINATOR_STATE = Object.freeze({
  IDLE: 'idle',
  PREPARING: 'preparing',
  READY: 'ready',
  RUNNING: 'running',
  PAUSED: 'paused',
  RESULT: 'result',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export type ProductMatchCoordinatorState = typeof PRODUCT_MATCH_COORDINATOR_STATE[
  keyof typeof PRODUCT_MATCH_COORDINATOR_STATE
];

export const PRODUCT_MATCH_COORDINATOR_SNAPSHOT_SCHEMA_VERSION = 1;

export interface ProductMatchCoordinatorOptions {
  readonly matchFactory: unknown;
}

export interface ProductMatchCoordinatorSnapshot {
  readonly schemaVersion: 1;
  readonly state: ProductMatchCoordinatorState;
  readonly hasRuntime: boolean;
  readonly preparing: boolean;
  readonly paused: boolean;
  readonly cleanupIncomplete: boolean;
  readonly publicMatchInfo: ProductPublicMatchInfo | null;
  readonly result: ProductMatchResult | null;
}

export interface ProductMatchCoordinatorReadFrameStartOutcome {
  readonly readFrame: ProductMatchReadFrameStartOutcome['readFrame'];
  readonly snapshot: ProductMatchCoordinatorSnapshot;
}

export type ProductMatchCoordinatorReadFrameStepOutcome = ProductMatchReadFrameStepOutcome;

const OPTION_KEYS = new Set(['matchFactory']);
const EMPTY_EVENTS: readonly unknown[] = Object.freeze([]);

function normalizeOptions(value: unknown): Readonly<ProductMatchFactoryPort> {
  assertKnownKeys(value, OPTION_KEYS, 'ProductMatchCoordinator options');
  const record = requireRecord(value, 'ProductMatchCoordinator options');
  return createProductMatchFactoryPort(
    readRequiredDataField(record, 'matchFactory', 'ProductMatchCoordinator options'),
  );
}

function snapshotOptionalDestroy(value: unknown): (() => unknown) | null {
  try {
    return snapshotMethod<() => unknown>(value, 'destroy', 'ProductMatchRuntime candidate');
  } catch {
    return null;
  }
}

type ProductMatchCoordinatorOperation =
  | 'state-read'
  | 'prepare-request'
  | 'prepare-factory-create'
  | 'prepare-adopt'
  | 'prepare-reject'
  | 'prepare-finalize'
  | 'pause-transition'
  | 'start-read-frame'
  | 'step-read-frame'
  | 'match-read-frame-read'
  | 'result-read'
  | 'release'
  | 'reset-failure'
  | 'destroy'
  | 'snapshot-read';

export const PRODUCT_MATCH_COORDINATOR_OPERATION_GUARD_V1 = Object.freeze({
  operationGuardPrecedesStateAndInputValidation: true,
  asyncPrepareOwnsOnlySynchronousCommitSlices: true,
  factoryAndRuntimeCallbacksCheckedBeforeAuthorityCommit: true,
  snapshotCallbacksCheckedBeforePublication: true,
  swallowedCallbackReentryStopsLaterAuthorityMutation: true,
  cleanupOwnershipRetainedWhenReentryInterruptsRelease: true,
  postCallbackReentryFailsClosed: true,
  destroyChecksOperationBeforeCleanupMutation: true,
  validationStatus: 'not-run',
} as const);

export class ProductMatchCoordinator {
  #factory: Readonly<ProductMatchFactoryPort> | null;
  #runtime: Readonly<ProductMatchRuntimePort> | null = null;
  #cleanupRetry: (() => unknown) | null = null;
  #state: ProductMatchCoordinatorState = PRODUCT_MATCH_COORDINATOR_STATE.IDLE;
  #generation = 0;
  #preparePromise: Promise<ProductMatchCoordinatorSnapshot> | null = null;
  #pauseRequested = false;
  #publicInfo: ProductPublicMatchInfo | null = null;
  #result: ProductMatchResult | null = null;
  #lastError: Error | null = null;
  #cleanupIncomplete = false;
  #operation: ProductMatchCoordinatorOperation | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(options: ProductMatchCoordinatorOptions) {
    this.#factory = normalizeOptions(options);
    Object.freeze(this);
  }

  get state(): ProductMatchCoordinatorState {
    return this.#runOperation('state-read', () => this.#state);
  }

  #recordReentry(requestedOperation: ProductMatchCoordinatorOperation): Error {
    this.#reentrySequence += 1;
    if (this.#reentryError === null) {
      this.#reentryError = new Error(
        `ProductMatchCoordinator ${String(this.#operation)}期间不可重入${requestedOperation}。`,
      );
    }
    return this.#reentryError;
  }

  #assertReentryFree(
    sequence: number,
    operation: ProductMatchCoordinatorOperation,
    failClosed: boolean,
  ): void {
    if (this.#reentrySequence === sequence) return;
    if (failClosed && this.#state !== PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED) {
      this.#state = PRODUCT_MATCH_COORDINATOR_STATE.FAILED;
    }
    throw this.#reentryError
      ?? new Error(`ProductMatchCoordinator ${operation}期间发生重入。`);
  }

  #runOperation<T>(
    operation: ProductMatchCoordinatorOperation,
    callback: () => T,
    options: Readonly<{ failClosedOnReentry?: boolean }> = {},
  ): T {
    if (this.#operation !== null) throw this.#recordReentry(operation);
    this.#operation = operation;
    const sequence = this.#reentrySequence;
    try {
      try {
        const result = callback();
        this.#assertReentryFree(
          sequence,
          operation,
          options.failClosedOnReentry === true,
        );
        return result;
      } catch (error) {
        if (
          options.failClosedOnReentry === true
          && this.#reentrySequence !== sequence
          && this.#state !== PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED
        ) this.#state = PRODUCT_MATCH_COORDINATOR_STATE.FAILED;
        throw error;
      }
    } finally {
      this.#operation = null;
      this.#reentryError = null;
    }
  }

  #assertAuthorityCommitReady(
    operation: ProductMatchCoordinatorOperation,
    failClosedOnReentry = false,
  ): void {
    if (this.#reentryError !== null) {
      if (failClosedOnReentry && this.#state !== PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED) {
        this.#state = PRODUCT_MATCH_COORDINATOR_STATE.FAILED;
      }
      throw this.#reentryError;
    }
    if (this.#operation !== operation) {
      throw new Error(`ProductMatchCoordinator ${operation}缺少权威操作所有权。`);
    }
  }

  #snapshot(operation: ProductMatchCoordinatorOperation): ProductMatchCoordinatorSnapshot {
    const factoryHasPendingCleanup = this.#factory?.hasPendingCleanup?.() ?? false;
    this.#assertAuthorityCommitReady(operation, true);
    return Object.freeze({
      schemaVersion: PRODUCT_MATCH_COORDINATOR_SNAPSHOT_SCHEMA_VERSION,
      state: this.#state,
      hasRuntime: this.#runtime !== null || this.#cleanupRetry !== null || factoryHasPendingCleanup,
      preparing: this.#preparePromise !== null,
      paused: this.#pauseRequested,
      cleanupIncomplete: this.#cleanupIncomplete || factoryHasPendingCleanup,
      publicMatchInfo: this.#publicInfo,
      result: this.#result,
    });
  }

  #assertUsable(): void {
    if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED) {
      throw new Error('ProductMatchCoordinator 已销毁。');
    }
    if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.FAILED) {
      const error = new Error('ProductMatchCoordinator 已失败。');
      error.cause = this.#lastError;
      throw error;
    }
  }

  #requireFactory(): Readonly<ProductMatchFactoryPort> {
    if (!this.#factory) throw new Error('ProductMatchCoordinator 已销毁。');
    return this.#factory;
  }

  #requireRuntime(): Readonly<ProductMatchRuntimePort> {
    if (!this.#runtime) throw new Error('ProductMatchCoordinator 缺少 Runtime。');
    return this.#runtime;
  }

  #destroyCandidateCleanup(
    destroy: (() => unknown) | null,
    message: string,
    operation: ProductMatchCoordinatorOperation,
  ): Error | null {
    if (!destroy) return null;
    try {
      const result = destroy();
      containRejectedAsyncReturn(result, message);
      this.#assertAuthorityCommitReady(operation, true);
      return null;
    } catch (error) {
      this.#cleanupRetry = destroy;
      this.#cleanupIncomplete = true;
      this.#lastError = normalizeThrownError(error, message);
      return this.#lastError;
    }
  }

  prepare(): Promise<ProductMatchCoordinatorSnapshot> {
    return this.#runOperation('prepare-request', () => {
      this.#assertUsable();
      if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.PREPARING) {
        if (!this.#preparePromise) throw new Error('ProductMatchCoordinator prepare 状态损坏。');
        return this.#preparePromise;
      }
      if (this.#state !== PRODUCT_MATCH_COORDINATOR_STATE.IDLE) {
        throw new Error(`ProductMatchCoordinator 无法从 ${this.#state} prepare。`);
      }

      this.#state = PRODUCT_MATCH_COORDINATOR_STATE.PREPARING;
      this.#lastError = null;
      const generation = this.#generation + 1;
      this.#generation = generation;
      let candidate: unknown = null;
      let candidateCleanup: (() => unknown) | null = null;
      const operation: Promise<ProductMatchCoordinatorSnapshot> = Promise.resolve()
        .then(() => this.#runOperation('prepare-factory-create', () => {
          const created = this.#requireFactory().create();
          this.#assertAuthorityCommitReady('prepare-factory-create', true);
          return resolveSyncOrNativePromise(created, 'ProductMatchFactory.create()');
        }, { failClosedOnReentry: true }))
        .then(({ value: runtimeValue }) => this.#runOperation('prepare-adopt', () => {
          candidate = runtimeValue;
          // Take ownership of the raw candidate's cleanup method before any
          // Runtime port validation or publicInfo call can execute user code.
          candidateCleanup = snapshotOptionalDestroy(candidate);
          const runtime = createProductMatchRuntimePort(runtimeValue);
          this.#assertAuthorityCommitReady('prepare-adopt', true);
          if (
            this.#generation !== generation
            || this.#state === PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED
          ) {
            this.#destroyCandidateCleanup(
              candidateCleanup,
              '已取消 ProductMatchRuntime 清理失败',
              'prepare-adopt',
            );
            candidateCleanup = null;
            candidate = null;
            return this.#snapshot('prepare-adopt');
          }
          if (this.#pauseRequested) {
            runtime.setPaused(true);
            this.#assertAuthorityCommitReady('prepare-adopt', true);
          }
          const publicInfo = createProductPublicMatchInfo(runtime.getPublicInfo());
          this.#assertAuthorityCommitReady('prepare-adopt', true);
          this.#runtime = runtime;
          candidateCleanup = null;
          candidate = null;
          this.#publicInfo = publicInfo;
          this.#state = PRODUCT_MATCH_COORDINATOR_STATE.READY;
          this.#cleanupIncomplete = false;
          return this.#snapshot('prepare-adopt');
        }, { failClosedOnReentry: true }))
        .catch((error: unknown) => this.#runOperation('prepare-reject', () => {
          if (
            this.#generation !== generation
            || this.#state === PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED
          ) {
            this.#destroyCandidateCleanup(
              candidateCleanup,
              '已取消 ProductMatchRuntime 清理失败',
              'prepare-reject',
            );
            candidateCleanup = null;
            candidate = null;
            return this.#snapshot('prepare-reject');
          }
          const failure = normalizeThrownError(error, 'ProductMatchCoordinator 准备失败');
          const cleanupFailure = this.#destroyCandidateCleanup(
            candidateCleanup,
            '准备失败后的 ProductMatchRuntime 清理失败',
            'prepare-reject',
          );
          this.#assertAuthorityCommitReady('prepare-reject', true);
          candidateCleanup = null;
          candidate = null;
          this.#state = PRODUCT_MATCH_COORDINATOR_STATE.FAILED;
          this.#lastError = combineCleanupFailure(
            failure,
            cleanupFailure ? [cleanupFailure] : [],
            'ProductMatchCoordinator 准备失败且清理未完整完成。',
          );
          throw this.#lastError;
        }, { failClosedOnReentry: true }))
        .finally(() => {
          this.#runOperation('prepare-finalize', () => {
            if (this.#preparePromise === operation) this.#preparePromise = null;
          });
        });
      this.#preparePromise = operation;
      return operation;
    }, { failClosedOnReentry: true });
  }

  setPaused(paused: boolean): ProductMatchCoordinatorSnapshot {
    return this.#runOperation('pause-transition', () => {
      if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED) {
        return this.#snapshot('pause-transition');
      }
      this.#assertUsable();
      if (typeof paused !== 'boolean') throw new TypeError('paused 必须是布尔值。');
      if (
        this.#state === PRODUCT_MATCH_COORDINATOR_STATE.IDLE
        || this.#state === PRODUCT_MATCH_COORDINATOR_STATE.PREPARING
        || this.#state === PRODUCT_MATCH_COORDINATOR_STATE.RESULT
      ) {
        this.#pauseRequested = paused;
        return this.#snapshot('pause-transition');
      }
      try {
        this.#requireRuntime().setPaused(paused);
        this.#assertAuthorityCommitReady('pause-transition', true);
        this.#pauseRequested = paused;
        if (
          this.#state === PRODUCT_MATCH_COORDINATOR_STATE.RUNNING
          || this.#state === PRODUCT_MATCH_COORDINATOR_STATE.PAUSED
        ) {
          this.#state = paused
            ? PRODUCT_MATCH_COORDINATOR_STATE.PAUSED
            : PRODUCT_MATCH_COORDINATOR_STATE.RUNNING;
        }
        return this.#snapshot('pause-transition');
      } catch (error) {
        this.#state = PRODUCT_MATCH_COORDINATOR_STATE.FAILED;
        this.#lastError = normalizeThrownError(error, 'ProductMatchCoordinator 暂停切换失败');
        throw this.#lastError;
      }
    }, { failClosedOnReentry: true });
  }

  startWithReadFrame(): ProductMatchCoordinatorReadFrameStartOutcome {
    return this.#runOperation('start-read-frame', () => {
      this.#assertUsable();
      const runtime = this.#requireRuntime();
      try {
        if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.READY) {
          const outcome = runtime.startWithReadFrame();
          this.#assertAuthorityCommitReady('start-read-frame', true);
          this.#state = this.#pauseRequested
            ? PRODUCT_MATCH_COORDINATOR_STATE.PAUSED
            : PRODUCT_MATCH_COORDINATOR_STATE.RUNNING;
          return Object.freeze({
            readFrame: outcome.readFrame,
            snapshot: this.#snapshot('start-read-frame'),
          });
        }
        if (
          this.#state === PRODUCT_MATCH_COORDINATOR_STATE.RUNNING
          || this.#state === PRODUCT_MATCH_COORDINATOR_STATE.PAUSED
        ) {
          const readFrame = runtime.getReadFrame();
          this.#assertAuthorityCommitReady('start-read-frame', true);
          return Object.freeze({
            readFrame,
            snapshot: this.#snapshot('start-read-frame'),
          });
        }
        throw new Error(`ProductMatchCoordinator 无法从 ${this.#state} start V2 read frame。`);
      } catch (error) {
        this.#state = PRODUCT_MATCH_COORDINATOR_STATE.FAILED;
        this.#lastError = normalizeThrownError(error, 'ProductMatchCoordinator 启动 V2 read frame 失败');
        throw this.#lastError;
      }
    }, { failClosedOnReentry: true });
  }

  stepWithReadFrame(playerFrame: unknown = null): ProductMatchCoordinatorReadFrameStepOutcome {
    return this.#runOperation('step-read-frame', () => {
      this.#assertUsable();
      const runtime = this.#requireRuntime();
      if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.PAUSED) {
        const readFrame = runtime.getReadFrame();
        this.#assertAuthorityCommitReady('step-read-frame', true);
        return Object.freeze({
          events: EMPTY_EVENTS,
          readFrame,
          input: null,
          result: null,
        });
      }
      if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.RESULT) {
        const readFrame = runtime.getReadFrame();
        this.#assertAuthorityCommitReady('step-read-frame', true);
        return Object.freeze({
          events: EMPTY_EVENTS,
          readFrame,
          input: null,
          result: this.#result,
        });
      }
      if (this.#state !== PRODUCT_MATCH_COORDINATOR_STATE.RUNNING) {
        throw new Error(`ProductMatchCoordinator 无法在 ${this.#state} 状态执行 V2 step。`);
      }
      try {
        const outcome = runtime.stepWithReadFrame(playerFrame);
        this.#assertAuthorityCommitReady('step-read-frame', true);
        const runtimeResult = runtime.getResult();
        this.#assertAuthorityCommitReady('step-read-frame', true);
        if (outcome.result !== runtimeResult) {
          throw new Error('ProductMatchCoordinator V2 result 与 Runtime result 不一致。');
        }
        if (runtimeResult !== null) {
          this.#result = runtimeResult;
          this.#state = PRODUCT_MATCH_COORDINATOR_STATE.RESULT;
        }
        return outcome;
      } catch (error) {
        this.#state = PRODUCT_MATCH_COORDINATOR_STATE.FAILED;
        this.#lastError = normalizeThrownError(error, 'ProductMatchCoordinator V2 step 失败');
        throw this.#lastError;
      }
    }, { failClosedOnReentry: true });
  }

  getMatchReadFrame(): ProductMatchReadFrameStartOutcome['readFrame'] | null {
    return this.#runOperation('match-read-frame-read', () => {
      this.#assertUsable();
      if (this.#runtime === null) return null;
      const readFrame = this.#runtime.getReadFrame();
      this.#assertAuthorityCommitReady('match-read-frame-read', true);
      return readFrame;
    }, { failClosedOnReentry: true });
  }

  getResult(): ProductMatchResult | null {
    return this.#runOperation('result-read', () => (
      this.#state === PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED ? null : this.#result
    ));
  }

  #releaseRuntime(operation: ProductMatchCoordinatorOperation): void {
    if (this.#runtime) {
      this.#runtime.destroy();
      this.#assertAuthorityCommitReady(operation, true);
      this.#runtime = null;
    } else if (this.#cleanupRetry) {
      const cleanupRetry = this.#cleanupRetry;
      containRejectedAsyncReturn(cleanupRetry(), 'ProductMatchRuntime 重试清理');
      this.#assertAuthorityCommitReady(operation, true);
      this.#cleanupRetry = null;
    } else {
      return;
    }
    this.#publicInfo = null;
    this.#result = null;
    this.#cleanupIncomplete = false;
  }

  #release(operation: 'release' | 'reset-failure'): ProductMatchCoordinatorSnapshot {
    if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED) {
      throw new Error('ProductMatchCoordinator 已销毁。');
    }
    if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.PREPARING) {
      throw new Error('准备中的 ProductMatchCoordinator 不能同步释放。');
    }
    try {
      this.#releaseRuntime(operation);
      const retryResult = this.#factory?.retryPendingCleanup?.();
      containRejectedAsyncReturn(retryResult, 'ProductMatchFactory.retryPendingCleanup');
      this.#assertAuthorityCommitReady(operation, true);
      this.#cleanupIncomplete = false;
      this.#state = PRODUCT_MATCH_COORDINATOR_STATE.IDLE;
      this.#pauseRequested = false;
      this.#lastError = null;
      return this.#snapshot(operation);
    } catch (error) {
      this.#state = PRODUCT_MATCH_COORDINATOR_STATE.FAILED;
      this.#cleanupIncomplete = true;
      this.#lastError = normalizeThrownError(error, 'ProductMatchCoordinator 释放失败');
      throw this.#lastError;
    }
  }

  release(): ProductMatchCoordinatorSnapshot {
    return this.#runOperation('release', () => this.#release('release'), {
      failClosedOnReentry: true,
    });
  }

  resetFailure(): ProductMatchCoordinatorSnapshot {
    return this.#runOperation('reset-failure', () => {
      if (this.#state !== PRODUCT_MATCH_COORDINATOR_STATE.FAILED) {
        throw new Error('只有失败的 ProductMatchCoordinator 可以 resetFailure。');
      }
      return this.#release('reset-failure');
    }, { failClosedOnReentry: true });
  }

  destroy(): void {
    this.#runOperation('destroy', () => {
      this.#generation += 1;
      this.#pauseRequested = true;
      this.#state = PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED;
      try {
        const retryResult = this.#factory?.retryPendingCleanup?.();
        containRejectedAsyncReturn(retryResult, 'ProductMatchFactory.retryPendingCleanup');
        this.#assertAuthorityCommitReady('destroy', true);
        this.#releaseRuntime('destroy');
        const destroyResult = this.#factory?.destroy?.();
        containRejectedAsyncReturn(destroyResult, 'ProductMatchFactory.destroy');
        this.#assertAuthorityCommitReady('destroy', true);
        this.#factory = null;
        this.#cleanupIncomplete = false;
        this.#lastError = null;
      } catch (error) {
        this.#cleanupIncomplete = true;
        this.#lastError = normalizeThrownError(error, 'ProductMatchCoordinator 销毁失败');
        throw this.#lastError;
      }
    }, { failClosedOnReentry: true });
  }

  getSnapshot(): ProductMatchCoordinatorSnapshot {
    return this.#runOperation('snapshot-read', () => this.#snapshot('snapshot-read'), {
      failClosedOnReentry: true,
    });
  }
}
