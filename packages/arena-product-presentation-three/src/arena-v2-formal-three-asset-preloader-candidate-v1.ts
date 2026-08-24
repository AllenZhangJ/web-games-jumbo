import {
  assertKnownKeys,
  assertPlainRecord,
  assertSynchronousReturn as rejectThenable,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_FORMAL_ASSET_PRODUCTION_APPROVAL_CANDIDATE_V1,
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  PresentationAssetLoadTask,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  GltfPresentationAssetLoader,
  type GltfPresentationAssetValue,
} from '@number-strategy-jump/arena-presentation-three';
import * as THREE from 'three';

export const ARENA_V2_FORMAL_THREE_ASSET_PRELOADER_STATE_CANDIDATE_V1 = Object.freeze({
  CREATED: 'created',
  LOADING: 'loading',
  READY: 'ready',
  DISPOSING: 'disposing',
  FAILED: 'failed',
  DISPOSED: 'disposed',
} as const);

type PreloaderState = typeof ARENA_V2_FORMAL_THREE_ASSET_PRELOADER_STATE_CANDIDATE_V1[
  keyof typeof ARENA_V2_FORMAL_THREE_ASSET_PRELOADER_STATE_CANDIDATE_V1
];

const OPTION_KEYS = new Set([
  'loader',
  'readAssetBytes',
  'createImage',
  'allowUnapprovedCandidates',
]);
const ASSET_VALUE_KEYS = new Set(['assetId', 'scene', 'animations', 'sourceKey']);

const PRODUCTION_APPROVED_VISUAL_ASSET_IDS = Object.freeze(
  [...ARENA_V2_FORMAL_ASSET_PRODUCTION_APPROVAL_CANDIDATE_V1
    .productionApprovedModelAssetIds],
);
const PRODUCTION_APPROVED_VISUAL_ASSET_ID_SET = new Set(
  PRODUCTION_APPROVED_VISUAL_ASSET_IDS,
);

if (
  ARENA_V2_FORMAL_ASSET_PRODUCTION_APPROVAL_CANDIDATE_V1.catalogContentHash
  !== ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1.contentHash
) {
  throw new RangeError('Arena V2 formal Three asset preloader批准账本与Catalog身份漂移。');
}

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function loaderPort(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Arena V2 formal Three asset preloader需要loader对象。');
  }
  const visited = new Set<object>();
  let cursor: object | null = value;
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) {
      throw new TypeError('Arena V2 formal Three asset preloader loader原型链无效。');
    }
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, 'load');
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError('Arena V2 formal Three asset preloader loader.load必须是数据方法。');
      }
      return value;
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  throw new TypeError('Arena V2 formal Three asset preloader loader缺少load。');
}

function assetValue(value: unknown, expectedAssetId: string): GltfPresentationAssetValue {
  const source = assertPlainRecord(value, `Arena V2 formal Three asset ${expectedAssetId}`);
  assertKnownKeys(source, ASSET_VALUE_KEYS, `Arena V2 formal Three asset ${expectedAssetId}`);
  for (const key of ASSET_VALUE_KEYS) {
    dataField(source, key, `Arena V2 formal Three asset ${expectedAssetId}`);
  }
  if (source.assetId !== expectedAssetId) {
    throw new RangeError(`Arena V2 formal Three asset ${expectedAssetId}身份漂移。`);
  }
  if (!(source.scene instanceof THREE.Object3D)) {
    throw new TypeError(`Arena V2 formal Three asset ${expectedAssetId}.scene必须是Object3D。`);
  }
  if (!Array.isArray(source.animations)
    || source.animations.some((clip) => !(clip instanceof THREE.AnimationClip))) {
    throw new TypeError(`Arena V2 formal Three asset ${expectedAssetId}.animations无效。`);
  }
  if (typeof source.sourceKey !== 'string' || source.sourceKey.length === 0) {
    throw new TypeError(`Arena V2 formal Three asset ${expectedAssetId}.sourceKey必须是非空字符串。`);
  }
  return Object.freeze({
    assetId: expectedAssetId,
    scene: source.scene,
    animations: Object.freeze([...source.animations]) as readonly THREE.AnimationClip[],
    sourceKey: source.sourceKey,
  });
}

function aggregateFailure(message: string, cause: unknown, cleanupErrors: readonly unknown[]): Error {
  if (cleanupErrors.length === 0 && cause instanceof Error) return cause;
  const values = cause === null ? cleanupErrors : [cause, ...cleanupErrors];
  return new AggregateError(values, message);
}

function throwSettledBatchFailures(
  results: readonly PromiseSettledResult<unknown>[],
  message: string,
): void {
  const failures = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map(({ reason }) => reason);
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) throw new AggregateError(failures, message);
}

function deferred<T>(): Readonly<{
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return Object.freeze({ promise, resolve, reject });
}

/**
 * Loading-screen owner for the exact formal V2 visual catalog. It may perform
 * asynchronous GLB I/O, but it exposes only settled immutable templates to the
 * synchronous match stage. Tasks retain and release all loader leases.
 */
export class ArenaV2FormalThreeAssetPreloaderCandidateV1 {
  readonly #loader: unknown;
  readonly #ownedLoader: GltfPresentationAssetLoader | null;
  readonly #allowUnapprovedCandidates: boolean;
  readonly #tasks = new Map<string, PresentationAssetLoadTask>();
  readonly #assets = new Map<string, GltfPresentationAssetValue>();
  #state: PreloaderState = 'created';
  #loadOperation: Promise<this> | null = null;
  #loadPending = false;
  #disposeRequested = false;
  #lastError: unknown = null;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #ownedLoaderCleanupComplete = false;

  constructor(value: unknown = {}) {
    const source = assertPlainRecord(value, 'Arena V2 formal Three asset preloader options');
    assertKnownKeys(source, OPTION_KEYS, 'Arena V2 formal Three asset preloader options');
    for (const key of Object.keys(source)) {
      dataField(source, key, 'Arena V2 formal Three asset preloader options');
    }
    if (
      source.allowUnapprovedCandidates !== undefined
      && typeof source.allowUnapprovedCandidates !== 'boolean'
    ) {
      throw new TypeError(
        'Arena V2 formal Three asset preloader allowUnapprovedCandidates必须是boolean。',
      );
    }
    this.#allowUnapprovedCandidates = source.allowUnapprovedCandidates === true;
    if (source.loader === undefined) {
      if (source.readAssetBytes !== undefined && typeof source.readAssetBytes !== 'function') {
        throw new TypeError(
          'Arena V2 formal Three asset preloader readAssetBytes必须是函数。',
        );
      }
      if (source.createImage !== undefined && typeof source.createImage !== 'function') {
        throw new TypeError(
          'Arena V2 formal Three asset preloader createImage必须是函数。',
        );
      }
      const loaderOptions: Record<string, unknown> = {};
      if (source.readAssetBytes !== undefined) {
        loaderOptions.readAssetBytes = source.readAssetBytes;
      }
      if (source.createImage !== undefined) loaderOptions.createImage = source.createImage;
      const loader = new GltfPresentationAssetLoader(loaderOptions);
      this.#loader = loader;
      this.#ownedLoader = loader;
    } else {
      if (source.readAssetBytes !== undefined || source.createImage !== undefined) {
        throw new RangeError(
          'Arena V2 formal Three asset preloader注入loader时不可再注入readAssetBytes/createImage。',
        );
      }
      this.#loader = loaderPort(source.loader);
      this.#ownedLoader = null;
      this.#ownedLoaderCleanupComplete = true;
    }
  }

  get state(): PreloaderState {
    return this.#runSynchronousCommit('state-read', () => this.#state);
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation === null) return;
    const error = new Error(
      `Arena V2 formal Three asset preloader ${operation}不可重入${this.#operation}。`,
    );
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) {
      throw new Error('Arena V2 formal Three asset preloader缺少当前操作所有权。');
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runSynchronousCommit<T>(operation: string, commit: () => T): T {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    let failed = false;
    let failureValue: unknown = null;
    let result!: T;
    try {
      result = commit();
    } catch (error) {
      failed = true;
      failureValue = error;
    } finally {
      if (this.#operation === operation) this.#operation = null;
    }
    const reentryError = this.#reentryError;
    this.#reentryError = null;
    if (reentryError !== null) {
      this.#lastError = reentryError;
      this.#state = 'failed';
      throw failed && failureValue !== reentryError
        ? new AggregateError(
          [failureValue, reentryError],
          `Arena V2 formal Three asset preloader ${operation}失败且同步重入。`,
        )
        : reentryError;
    }
    if (failed) throw failureValue;
    return result;
  }

  #cleanupTasks(): readonly unknown[] {
    const errors: unknown[] = [];
    for (const [assetId, task] of this.#tasks) {
      try {
        rejectThenable(
          task.destroy(),
          `Arena V2 formal Three asset ${assetId} task.destroy()`,
        );
        this.#assertCurrentOperationCommit();
        const cleanupComplete = task.isCleanupComplete();
        this.#assertCurrentOperationCommit();
        if (!cleanupComplete) {
          throw new Error(`Arena V2 formal Three asset ${assetId} task清理尚未收敛。`);
        }
        this.#tasks.delete(assetId);
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        break;
      }
    }
    if (this.#tasks.size === 0) this.#assets.clear();
    return Object.freeze(errors);
  }

  #cleanupOwnedLoader(): unknown | null {
    if (this.#ownedLoaderCleanupComplete) return null;
    if (this.#ownedLoader === null) {
      this.#ownedLoaderCleanupComplete = true;
      return null;
    }
    try {
      rejectThenable(
        this.#ownedLoader.destroy(),
        'Arena V2 formal Three asset preloader owned loader.destroy()',
      );
      this.#assertCurrentOperationCommit();
      const cleanupComplete = this.#ownedLoader.isCleanupComplete();
      this.#assertCurrentOperationCommit();
      if (!cleanupComplete) {
        return new Error('Arena V2 formal Three asset preloader底层loader清理尚未收敛。');
      }
      this.#ownedLoaderCleanupComplete = true;
      return null;
    } catch (error) {
      return error;
    }
  }

  #requestOwnedLoaderShutdown(): unknown | null {
    if (this.#ownedLoaderCleanupComplete || this.#ownedLoader === null) return null;
    try {
      rejectThenable(
        this.#ownedLoader.destroy(),
        'Arena V2 formal Three asset preloader owned loader shutdown request',
      );
      this.#assertCurrentOperationCommit();
      return null;
    } catch (error) {
      return error;
    }
  }

  #continueRequestedDisposal(): void {
    if (!this.#disposeRequested || this.#state === 'disposed') return;
    this.#runSynchronousCommit(
      'Arena V2 formal Three asset preloader异步续接清理',
      () => {
        const errors: unknown[] = [];
        const loaderShutdownError = this.#requestOwnedLoaderShutdown();
        if (loaderShutdownError !== null) errors.push(loaderShutdownError);
        errors.push(...this.#cleanupTasks());
        if (this.#tasks.size === 0 && !this.#loadPending) {
          const loaderError = this.#cleanupOwnedLoader();
          if (loaderError !== null) errors.push(loaderError);
        }
        const cleanupComplete = this.#tasks.size === 0
          && !this.#loadPending
          && this.#ownedLoaderCleanupComplete;
        if (errors.length > 0) {
          this.#lastError = new AggregateError(
            errors,
            'Arena V2 formal Three asset preloader异步续接清理不完整。',
          );
          this.#state = 'failed';
          return;
        }
        this.#state = cleanupComplete ? 'disposed' : 'disposing';
      },
    );
  }

  #assertDefinitionsPermitted(
    definitions: readonly Readonly<{ readonly id: string }>[],
  ): void {
    if (this.#allowUnapprovedCandidates) return;
    const blockedAssetIds = definitions
      .map(({ id }) => id)
      .filter((assetId) => !PRODUCTION_APPROVED_VISUAL_ASSET_ID_SET.has(assetId))
      .sort();
    if (blockedAssetIds.length === 0) return;
    throw new Error(
      `Arena V2 formal Three asset preloader拒绝${blockedAssetIds.length}项未获生产批准资产；`
      + '默认路径不会发起任何GLB加载。',
    );
  }

  load(): Promise<this> {
    this.#assertNoOperation('Arena V2 formal Three asset preloader load');
    if (this.#state === 'disposed') {
      return Promise.reject(new Error('Arena V2 formal Three asset preloader已销毁。'));
    }
    if (this.#state === 'failed') {
      const error = new Error('Arena V2 formal Three asset preloader已失败。');
      error.cause = this.#lastError;
      return Promise.reject(error);
    }
    if (this.#loadOperation !== null) return this.#loadOperation;
    const registry = ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1
      .visualAssetRegistry;
    const definitions = registry.list();
    try {
      this.#assertDefinitionsPermitted(definitions);
    } catch (error) {
      this.#lastError = error;
      this.#state = 'failed';
      this.#loadOperation = Promise.reject(error);
      return this.#loadOperation;
    }
    this.#state = 'loading';
    this.#loadPending = true;
    const loadOwner = deferred<this>();
    this.#loadOperation = loadOwner.promise;
    let operations: Promise<void>[] = [];
    try {
      this.#runSynchronousCommit(
        'Arena V2 formal Three asset preloader加载启动',
        () => {
          operations = definitions.map(async (definition) => {
        this.#assertCurrentOperationCommit();
        if (this.#state !== 'loading') {
          throw new Error(`Arena V2 formal Three asset ${definition.id}启动时Owner已不可接收。`);
        }
        if (this.#tasks.has(definition.id)) {
          throw new RangeError(`Arena V2 formal Three asset ${definition.id}重复加载。`);
        }
        const task = new PresentationAssetLoadTask({
          assetRegistry: registry,
          assetId: definition.id,
          loader: this.#loader,
        });
        this.#tasks.set(definition.id, task);
        const taskOperation = task.load();
        this.#assertCurrentOperationCommit();
        const taskValue = await taskOperation;
        this.#runSynchronousCommit(
          `Arena V2 formal Three asset ${definition.id} settlement`,
          () => {
            const loaded = assetValue(taskValue, definition.id);
            if (this.#state !== 'loading') {
              throw new Error(`Arena V2 formal Three asset ${definition.id}加载完成时Owner已不可接收。`);
            }
            this.#assets.set(definition.id, loaded);
          },
        );
          });
        },
      );
    } catch (error) {
      const execution = Promise.allSettled(operations).then(() => {
        if (this.#state !== 'loading') throw error;
        return this.#runSynchronousCommit(
          'Arena V2 formal Three asset preloader启动失败提交',
          () => {
            this.#lastError = error;
            const cleanupErrors = this.#cleanupTasks();
            this.#state = 'failed';
            throw aggregateFailure(
              'Arena V2 formal Three asset preloader启动失败且清理不完整。',
              error,
              cleanupErrors,
            );
          },
        );
      }).finally(() => {
        try {
          this.#runSynchronousCommit(
            'Arena V2 formal Three asset preloader启动失败终态水位',
            () => { this.#loadPending = false; },
          );
        } finally {
          this.#continueRequestedDisposal();
        }
      });
      void execution.then(loadOwner.resolve, loadOwner.reject);
      return this.#loadOperation;
    }
    const execution = Promise.allSettled(operations).then((results) => {
      return this.#runSynchronousCommit(
        'Arena V2 formal Three asset preloader加载成功提交',
        () => {
          throwSettledBatchFailures(
            results,
            'Arena V2 formal Three asset preloader加载批次存在多项失败。',
          );
          if (this.#state !== 'loading') {
            throw new Error('Arena V2 formal Three asset preloader完成时状态已改变。');
          }
          if (this.#assets.size !== definitions.length) {
            throw new RangeError('Arena V2 formal Three asset preloader加载数量不闭合。');
          }
          this.#state = 'ready';
          return this;
        },
      );
    }).catch((error: unknown) => {
      if (this.#state !== 'loading') throw error;
      return this.#runSynchronousCommit(
        'Arena V2 formal Three asset preloader加载失败提交',
        () => {
          this.#lastError = error;
          const cleanupErrors = this.#cleanupTasks();
          this.#state = 'failed';
          throw aggregateFailure(
            'Arena V2 formal Three asset preloader加载失败且清理不完整。',
            error,
            cleanupErrors,
          );
        },
      );
    }).finally(() => {
      try {
        this.#runSynchronousCommit(
          'Arena V2 formal Three asset preloader加载终态水位',
          () => { this.#loadPending = false; },
        );
      } finally {
        this.#continueRequestedDisposal();
      }
    });
    void execution.then(loadOwner.resolve, loadOwner.reject);
    return this.#loadOperation;
  }

  requireAsset(assetId: unknown): GltfPresentationAssetValue {
    return this.#runSynchronousCommit('asset-read', () => {
    if (this.#state !== 'ready') {
      throw new Error(`Arena V2 formal Three asset preloader尚未就绪：${this.#state}。`);
    }
    if (typeof assetId !== 'string' || assetId.length === 0) {
      throw new TypeError('Arena V2 formal Three asset id必须是非空字符串。');
    }
    const value = this.#assets.get(assetId);
    if (value === undefined) throw new RangeError(`Arena V2 formal Three asset ${assetId}未预载。`);
    return value;
    });
  }

  getSnapshot(): Readonly<{
    readonly state: PreloaderState;
    readonly approvalMode: 'production-approved-only' | 'isolated-unapproved-candidates';
    readonly expectedAssetIds: readonly string[];
    readonly productionApprovedAssetIds: readonly string[];
    readonly blockedAssetIds: readonly string[];
    readonly loadedAssetIds: readonly string[];
    readonly pendingTaskCount: number;
      readonly loadPending: boolean;
      readonly disposeRequested: boolean;
      readonly ownedLoaderCleanupComplete: boolean;
  }> {
    return this.#runSynchronousCommit('snapshot-read', () => {
    const expectedAssetIds = ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1
      .visualAssetRegistry.list().map(({ id }) => id).sort();
    return Object.freeze({
      state: this.#state,
      approvalMode: this.#allowUnapprovedCandidates
        ? 'isolated-unapproved-candidates'
        : 'production-approved-only',
      expectedAssetIds: Object.freeze(expectedAssetIds),
      productionApprovedAssetIds: PRODUCTION_APPROVED_VISUAL_ASSET_IDS,
      blockedAssetIds: Object.freeze(this.#allowUnapprovedCandidates
        ? []
        : expectedAssetIds.filter((assetId) => (
          !PRODUCTION_APPROVED_VISUAL_ASSET_ID_SET.has(assetId)
        ))),
      loadedAssetIds: Object.freeze([...this.#assets.keys()].sort()),
      pendingTaskCount: this.#tasks.size,
      loadPending: this.#loadPending,
      disposeRequested: this.#disposeRequested,
      ownedLoaderCleanupComplete: this.#ownedLoaderCleanupComplete,
    });
    });
  }

  dispose(): void {
    this.#assertNoOperation('Arena V2 formal Three asset preloader dispose');
    if (this.#state === 'disposed') return;
    this.#runSynchronousCommit('Arena V2 formal Three asset preloader dispose', () => {
      this.#disposeRequested = true;
      const errors: unknown[] = [];
      const loaderShutdownError = this.#requestOwnedLoaderShutdown();
      if (loaderShutdownError !== null) errors.push(loaderShutdownError);
      errors.push(...this.#cleanupTasks());
      if (this.#tasks.size === 0 && !this.#loadPending) {
        const loaderError = this.#cleanupOwnedLoader();
        if (loaderError !== null) errors.push(loaderError);
      }
      const cleanupComplete = this.#tasks.size === 0
        && !this.#loadPending
        && this.#ownedLoaderCleanupComplete;
      this.#state = errors.length > 0
        ? 'failed'
        : cleanupComplete
          ? 'disposed'
          : 'disposing';
      if (errors.length === 0 && !cleanupComplete) {
        errors.push(new Error('Arena V2 formal Three asset preloader终态清理依赖尚未收敛。'));
      }
      this.#lastError = errors.length === 0 ? this.#lastError : errors[0];
      if (errors.length > 0) {
        throw new AggregateError(errors, 'Arena V2 formal Three asset preloader清理不完整。');
      }
    });
  }
}

export const ARENA_V2_FORMAL_THREE_ASSET_PRELOADER_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  defaultNavigationWired: false as const,
  productionApprovalCheckedBeforeLoaderInvocation: true as const,
  productionApprovalUsesSharedLedgerIndex: true as const,
  defaultUnapprovedCandidateLoadingAllowed: false as const,
  isolatedCandidateLoadingRequiresExplicitOptIn: true as const,
  currentProductionApprovedVisualAssetCount: 0 as const,
  loadingPhaseMayBeAsync: true as const,
  loadOperationPublishedBeforeLoaderInvocation: true as const,
  repeatedLoadAndIdempotentDisposeCheckReentryBeforeFastPath: true as const,
  synchronousLaunchAndCleanupCommitsGuarded: true as const,
  publicReadsRejectedDuringSynchronousCommit: true as const,
  swallowedTaskOrLoaderReentryFailsClosed: true as const,
  eachAssetSettlementCommitsUnderOperationGuard: true as const,
  batchSuccessAndTerminalWatermarksCommitUnderOperationGuard: true as const,
  synchronousLaunchFailureCommitsFailedAfterStartedTasksSettle: true as const,
  publicAssetAndSnapshotReadsUseOperationGuard: true as const,
  matchPhaseReadsSettledTemplatesOnly: true as const,
  ownsAssetLeases: true as const,
  releasesLateLoadsAfterCancellation: true as const,
  waitsForEntireLoadBatchSettlement: true as const,
  reportsEveryRejectedLoadInSettledBatch: true as const,
  retainsIncompleteTasksForCleanupRetry: true as const,
  cleanupStopsAtFirstIncompleteTask: true as const,
  loadedAssetReferencesRetainedUntilEveryTaskSettlesAndCleans: true as const,
  cleanupCallbacksMustCompleteSynchronously: true as const,
  disposalWaitsForLoadingToSettle: true as const,
  loadingSettlementAutomaticallyContinuesRequestedDisposal: true as const,
  terminalContinuationUsesAsyncSettlementNotPolling: true as const,
  lateLoadFailureCannotRefailClosedOwner: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  taskLoadCheckedBeforeLaunchingLaterTasks: true as const,
  taskCleanupCheckedBeforeOwnershipRelease: true as const,
  cleanupReentryRetainsCurrentAndLaterTasks: true as const,
  defaultUnderlyingLoaderOwnedAndDestroyedAfterTasks: true as const,
  defaultUnderlyingLoaderAcceptsCancellableAssetReadAndImagePorts: true as const,
  defaultUnderlyingLoaderShutdownRequestedBeforeTaskSettlementWait: true as const,
  programmaticFallbackAllowed: false as const,
  validationStatus: 'not-run' as const,
});
