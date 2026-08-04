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
  #transitioning = false;

  constructor(options: ProductMatchCoordinatorOptions) {
    this.#factory = normalizeOptions(options);
    Object.freeze(this);
  }

  get state(): ProductMatchCoordinatorState {
    return this.#state;
  }

  #begin(): void {
    if (this.#transitioning) throw new Error('ProductMatchCoordinator 操作不可重入。');
    this.#transitioning = true;
  }

  #end(): void {
    this.#transitioning = false;
  }

  #runTransition<T>(operation: () => T): T {
    this.#begin();
    try {
      return operation();
    } finally {
      this.#end();
    }
  }

  #snapshot(): ProductMatchCoordinatorSnapshot {
    const factoryHasPendingCleanup = this.#factory?.hasPendingCleanup?.() ?? false;
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
  ): Error | null {
    if (!destroy) return null;
    try {
      const result = destroy();
      containRejectedAsyncReturn(result, message);
      return null;
    } catch (error) {
      this.#cleanupRetry = destroy;
      this.#cleanupIncomplete = true;
      this.#lastError = normalizeThrownError(error, message);
      return this.#lastError;
    }
  }

  prepare(): Promise<ProductMatchCoordinatorSnapshot> {
    return this.#runTransition(() => {
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
        .then(() => this.#runTransition(() => resolveSyncOrNativePromise(
          this.#requireFactory().create(),
          'ProductMatchFactory.create()',
        )))
        .then(({ value: runtimeValue }) => this.#runTransition(() => {
          candidate = runtimeValue;
          // Take ownership of the raw candidate's cleanup method before any
          // Runtime port validation or publicInfo call can execute user code.
          candidateCleanup = snapshotOptionalDestroy(candidate);
          const runtime = createProductMatchRuntimePort(runtimeValue);
          if (
            this.#generation !== generation
            || this.#state === PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED
          ) {
            this.#destroyCandidateCleanup(candidateCleanup, '已取消 ProductMatchRuntime 清理失败');
            candidateCleanup = null;
            candidate = null;
            return this.#snapshot();
          }
          if (this.#pauseRequested) runtime.setPaused(true);
          const publicInfo = createProductPublicMatchInfo(runtime.getPublicInfo());
          this.#runtime = runtime;
          candidateCleanup = null;
          candidate = null;
          this.#publicInfo = publicInfo;
          this.#state = PRODUCT_MATCH_COORDINATOR_STATE.READY;
          this.#cleanupIncomplete = false;
          return this.#snapshot();
        }))
        .catch((error: unknown) => this.#runTransition(() => {
          if (
            this.#generation !== generation
            || this.#state === PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED
          ) {
            this.#destroyCandidateCleanup(candidateCleanup, '已取消 ProductMatchRuntime 清理失败');
            candidateCleanup = null;
            candidate = null;
            return this.#snapshot();
          }
          const failure = normalizeThrownError(error, 'ProductMatchCoordinator 准备失败');
          const cleanupFailure = this.#destroyCandidateCleanup(
            candidateCleanup,
            '准备失败后的 ProductMatchRuntime 清理失败',
          );
          candidateCleanup = null;
          candidate = null;
          this.#state = PRODUCT_MATCH_COORDINATOR_STATE.FAILED;
          this.#lastError = combineCleanupFailure(
            failure,
            cleanupFailure ? [cleanupFailure] : [],
            'ProductMatchCoordinator 准备失败且清理未完整完成。',
          );
          throw this.#lastError;
        }))
        .finally(() => {
          if (this.#preparePromise === operation) this.#preparePromise = null;
        });
      this.#preparePromise = operation;
      return operation;
    });
  }

  setPaused(paused: boolean): ProductMatchCoordinatorSnapshot {
    return this.#runTransition(() => {
      if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED) return this.#snapshot();
      this.#assertUsable();
      if (typeof paused !== 'boolean') throw new TypeError('paused 必须是布尔值。');
      this.#pauseRequested = paused;
      if (
        this.#state === PRODUCT_MATCH_COORDINATOR_STATE.IDLE
        || this.#state === PRODUCT_MATCH_COORDINATOR_STATE.PREPARING
        || this.#state === PRODUCT_MATCH_COORDINATOR_STATE.RESULT
      ) return this.#snapshot();
      try {
        this.#requireRuntime().setPaused(paused);
        if (
          this.#state === PRODUCT_MATCH_COORDINATOR_STATE.RUNNING
          || this.#state === PRODUCT_MATCH_COORDINATOR_STATE.PAUSED
        ) {
          this.#state = paused
            ? PRODUCT_MATCH_COORDINATOR_STATE.PAUSED
            : PRODUCT_MATCH_COORDINATOR_STATE.RUNNING;
        }
        return this.#snapshot();
      } catch (error) {
        this.#state = PRODUCT_MATCH_COORDINATOR_STATE.FAILED;
        this.#lastError = normalizeThrownError(error, 'ProductMatchCoordinator 暂停切换失败');
        throw this.#lastError;
      }
    });
  }

  startWithReadFrame(): ProductMatchCoordinatorReadFrameStartOutcome {
    return this.#runTransition(() => {
      this.#assertUsable();
      const runtime = this.#requireRuntime();
      try {
        if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.READY) {
          const outcome = runtime.startWithReadFrame();
          this.#state = this.#pauseRequested
            ? PRODUCT_MATCH_COORDINATOR_STATE.PAUSED
            : PRODUCT_MATCH_COORDINATOR_STATE.RUNNING;
          return Object.freeze({ readFrame: outcome.readFrame, snapshot: this.#snapshot() });
        }
        if (
          this.#state === PRODUCT_MATCH_COORDINATOR_STATE.RUNNING
          || this.#state === PRODUCT_MATCH_COORDINATOR_STATE.PAUSED
        ) {
          return Object.freeze({ readFrame: runtime.getReadFrame(), snapshot: this.#snapshot() });
        }
        throw new Error(`ProductMatchCoordinator 无法从 ${this.#state} start V2 read frame。`);
      } catch (error) {
        this.#state = PRODUCT_MATCH_COORDINATOR_STATE.FAILED;
        this.#lastError = normalizeThrownError(error, 'ProductMatchCoordinator 启动 V2 read frame 失败');
        throw this.#lastError;
      }
    });
  }

  stepWithReadFrame(playerFrame: unknown = null): ProductMatchCoordinatorReadFrameStepOutcome {
    return this.#runTransition(() => {
      this.#assertUsable();
      const runtime = this.#requireRuntime();
      if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.PAUSED) {
        return Object.freeze({
          events: EMPTY_EVENTS,
          readFrame: runtime.getReadFrame(),
          input: null,
          result: null,
        });
      }
      if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.RESULT) {
        return Object.freeze({
          events: EMPTY_EVENTS,
          readFrame: runtime.getReadFrame(),
          input: null,
          result: this.#result,
        });
      }
      if (this.#state !== PRODUCT_MATCH_COORDINATOR_STATE.RUNNING) {
        throw new Error(`ProductMatchCoordinator 无法在 ${this.#state} 状态执行 V2 step。`);
      }
      try {
        const outcome = runtime.stepWithReadFrame(playerFrame);
        const runtimeResult = runtime.getResult();
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
    });
  }

  getMatchReadFrame(): ProductMatchReadFrameStartOutcome['readFrame'] | null {
    return this.#runTransition(() => {
      this.#assertUsable();
      if (this.#runtime === null) return null;
      return this.#runtime.getReadFrame();
    });
  }

  getResult(): ProductMatchResult | null {
    return this.#runTransition(() => (
      this.#state === PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED ? null : this.#result
    ));
  }

  #releaseRuntime(): void {
    if (this.#runtime) {
      this.#runtime.destroy();
      this.#runtime = null;
    } else if (this.#cleanupRetry) {
      const cleanupRetry = this.#cleanupRetry;
      containRejectedAsyncReturn(cleanupRetry(), 'ProductMatchRuntime 重试清理');
      this.#cleanupRetry = null;
    } else {
      return;
    }
    this.#publicInfo = null;
    this.#result = null;
    this.#cleanupIncomplete = false;
  }

  #release(): ProductMatchCoordinatorSnapshot {
    if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED) {
      throw new Error('ProductMatchCoordinator 已销毁。');
    }
    if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.PREPARING) {
      throw new Error('准备中的 ProductMatchCoordinator 不能同步释放。');
    }
    try {
      this.#releaseRuntime();
      this.#factory?.retryPendingCleanup?.();
      this.#cleanupIncomplete = false;
      this.#state = PRODUCT_MATCH_COORDINATOR_STATE.IDLE;
      this.#pauseRequested = false;
      this.#lastError = null;
      return this.#snapshot();
    } catch (error) {
      this.#state = PRODUCT_MATCH_COORDINATOR_STATE.FAILED;
      this.#cleanupIncomplete = true;
      this.#lastError = normalizeThrownError(error, 'ProductMatchCoordinator 释放失败');
      throw this.#lastError;
    }
  }

  release(): ProductMatchCoordinatorSnapshot {
    return this.#runTransition(() => this.#release());
  }

  resetFailure(): ProductMatchCoordinatorSnapshot {
    return this.#runTransition(() => {
      if (this.#state !== PRODUCT_MATCH_COORDINATOR_STATE.FAILED) {
        throw new Error('只有失败的 ProductMatchCoordinator 可以 resetFailure。');
      }
      return this.#release();
    });
  }

  destroy(): void {
    this.#runTransition(() => {
      this.#generation += 1;
      this.#pauseRequested = true;
      this.#state = PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED;
      try {
        this.#factory?.retryPendingCleanup?.();
        this.#releaseRuntime();
        this.#factory = null;
        this.#cleanupIncomplete = false;
        this.#lastError = null;
      } catch (error) {
        this.#cleanupIncomplete = true;
        this.#lastError = normalizeThrownError(error, 'ProductMatchCoordinator 销毁失败');
        throw this.#lastError;
      }
    });
  }

  getSnapshot(): ProductMatchCoordinatorSnapshot {
    return this.#runTransition(() => this.#snapshot());
  }
}
