import {
  assertSynchronousReturn as rejectThenable,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1,
} from './arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';
import {
  ArenaV2CollectionPreviewLazyGltfLoaderAdapterCandidateV1,
  type ArenaV2A6CollectionPreviewLazyGltfLoaderAdapterSnapshotV1,
} from './arena-v2-collection-preview-lazy-gltf-loader-adapter-candidate-v1.js';
import {
  ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerCandidateV1,
  type ArenaV2A6BeforeReleaseDestroyedProofReaderPortV1,
  type ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerSnapshotV1,
  type ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerStateV1,
  type ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1,
  type ArenaV2CollectionVisiblePreviewLeaseDestroyResultV1,
} from './arena-v2-collection-visible-preview-lease-command-execution-owner-candidate-v1.js';

export const ARENA_V2_COLLECTION_FORMAL_PREVIEW_RESOURCE_EXECUTION_COMPOSITION_OWNER_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    stage: 'A6.11c' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    productionReachable: false as const,
    defaultSurfaceWired: false as const,
    plansVisibility: false as const,
    createsRendererOrMount: false as const,
    ownsA6_11aAdapter: true as const,
    ownsA6_11bExecutor: true as const,
    commandCommitAwaitsLeaseSettlement: false as const,
    destroyOrdering: Object.freeze(['a6.11b-executor', 'a6.11a-adapter'] as const),
    maximumFormalPreviewTasks: 20 as const,
    maximumFormalPreviewLeases: 22 as const,
    currentProductionApprovedPreviewAssetCount: 0 as const,
    currentLoaderReachableAssetCount: 0 as const,
    currentActiveLeasePermittedCount: 0 as const,
    futureEnablementRequiresNewApprovalLedgerVersionAndIndependentGate: true as const,
    constructionCleanupRetainsRetryableExecutorAndAdapter: true as const,
    adapterDestroyWaitsForExecutorDestroyed: true as const,
    synchronousLifecycleOperationReentryRejected: true as const,
    swallowedChildReentryRejectedBeforeSuccessCommit: true as const,
    commandOwnerPublishedBeforeExecutorExecute: true as const,
    commandSettlementCommitsUnderOperationGuard: true as const,
    failedOwnerCannotBeRevivedByLateFulfillment: true as const,
    publicReadsRejectedDuringOperationCommit: true as const,
    stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
    executorAdapterSnapshotsCheckedBeforeAggregateCommit: true as const,
    asyncChildCommandCapturedAndSettledBeforeCommitCheck: true as const,
    destroyReentryRetainsCurrentAndLaterOwners: true as const,
    ordinaryDestroyFailureRetainsCurrentAndLaterOwners: true as const,
    constructionAndTerminalCleanupMustCompleteSynchronously: true as const,
  });

export type ArenaV2CollectionFormalPreviewResourceExecutionCompositionOwnerStateV1 =
  | 'active'
  | 'executing'
  | 'failed'
  | 'destroy-incomplete'
  | 'destroyed';

export interface ArenaV2CollectionFormalPreviewResourceExecutionExecutorSnapshotV1 {
  readonly schemaVersion: 1;
  readonly state: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerStateV1;
  readonly epochId: string;
  readonly catalogContentHash: string;
  readonly lastTick: number;
  readonly lastPlanIdentity: string | null;
  readonly activeLeaseCount: number;
  readonly assetReadyCount: number;
  readonly leaseFallbackCount: number;
  readonly lateSettlementDiagnosticCount: number;
  readonly pendingDestroyBarrierCount: number;
  readonly destroyIncomplete: boolean;
  readonly a6_6State: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerSnapshotV1['a6_6State'];
  readonly a6_6CleanupFailureCount: number;
}

export interface ArenaV2CollectionFormalPreviewResourceExecutionCompositionSnapshotV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly hardGate: false;
  readonly productionReachable: false;
  readonly defaultSurfaceWired: false;
  readonly state: ArenaV2CollectionFormalPreviewResourceExecutionCompositionOwnerStateV1;
  readonly epochId: string;
  readonly catalogContentHash: string;
  readonly executorSnapshot: ArenaV2CollectionFormalPreviewResourceExecutionExecutorSnapshotV1;
  readonly adapterSnapshot: ArenaV2A6CollectionPreviewLazyGltfLoaderAdapterSnapshotV1;
  readonly activeLeaseCount: number;
  readonly pendingLeaseCount: number;
  readonly readyLeaseCount: number;
  readonly fallbackLeaseCount: number;
  readonly loadingTaskCount: number;
  readonly readyTaskCount: number;
  readonly cancelledPendingTaskCount: number;
  readonly destroyOrdering: readonly ['a6.11b-executor', 'a6.11a-adapter'];
}

export interface ArenaV2CollectionFormalPreviewResourceExecutionCompositionDestroyFailureV1 {
  readonly schemaVersion: 1;
  readonly phase: 'a6.11b-executor' | 'a6.11a-adapter';
  readonly code:
    | 'destroy-threw'
    | 'destroy-incomplete'
    | 'child-state-not-destroyed'
    | 'adapter-cleanup-deferred';
}

export interface ArenaV2CollectionFormalPreviewResourceExecutionCompositionDestroyResultV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly state: 'destroyed' | 'destroy-incomplete';
  readonly destroyOrdering: readonly ['a6.11b-executor', 'a6.11a-adapter'];
  readonly executorResult: ArenaV2CollectionVisiblePreviewLeaseDestroyResultV1 | null;
  readonly executorState: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerStateV1;
  readonly adapterSnapshot: ArenaV2A6CollectionPreviewLazyGltfLoaderAdapterSnapshotV1;
  readonly failures: readonly ArenaV2CollectionFormalPreviewResourceExecutionCompositionDestroyFailureV1[];
}

export interface ArenaV2CollectionFormalPreviewResourceExecutionCompositionOwnerOptionsV1 {
  readonly schemaVersion: 1;
  readonly bindingSnapshot: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1;
  readonly beforeReleaseBarrier: ArenaV2A6BeforeReleaseDestroyedProofReaderPortV1;
  readonly underlyingLoader?: unknown;
}

type PlainData = Record<string, unknown>;

const OPTION_KEYS = new Set([
  'schemaVersion', 'bindingSnapshot', 'beforeReleaseBarrier', 'underlyingLoader',
]);
const REQUIRED_OPTION_KEYS = new Set([
  'schemaVersion', 'bindingSnapshot', 'beforeReleaseBarrier',
]);
const NATIVE_PROMISE_THEN = Promise.prototype.then;
const DESTROY_ORDER = Object.freeze(['a6.11b-executor', 'a6.11a-adapter'] as const);

function captureOptions(value: unknown): PlainData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('A6.11c constructor必须是普通对象。');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('A6.11c constructor必须使用普通对象原型。');
  }
  const result: PlainData = Object.create(null) as PlainData;
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !OPTION_KEYS.has(key)) {
      throw new RangeError(`A6.11c constructor包含未知字段${String(key)}。`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`A6.11c constructor.${key}必须是可枚举数据字段。`);
    }
    result[key] = descriptor.value;
  }
  for (const key of REQUIRED_OPTION_KEYS) {
    if (!Object.hasOwn(result, key)) throw new TypeError(`A6.11c constructor缺少${key}。`);
  }
  return result;
}

function isNativePromise(
  value: unknown,
): value is Promise<ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1> {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return false;
  try {
    Reflect.apply(NATIVE_PROMISE_THEN, value, [() => undefined, () => undefined]);
    return true;
  } catch {
    return false;
  }
}

function createDeferredPromiseOwner<T>(): Readonly<{
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: unknown) => void;
}> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return Object.freeze({ promise, resolve, reject });
}

function executorProjection(
  value: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerSnapshotV1,
): ArenaV2CollectionFormalPreviewResourceExecutionExecutorSnapshotV1 {
  return Object.freeze({
    schemaVersion: 1 as const,
    state: value.state,
    epochId: value.epochId,
    catalogContentHash: value.catalogContentHash,
    lastTick: value.lastTick,
    lastPlanIdentity: value.lastPlanIdentity,
    activeLeaseCount: value.activeLeaseCount,
    assetReadyCount: value.assetReadyCount,
    leaseFallbackCount: value.leaseFallbackCount,
    lateSettlementDiagnosticCount: value.lateSettlementDiagnosticCount,
    pendingDestroyBarrierCount: value.pendingDestroyBarrierCount,
    destroyIncomplete: value.destroyIncomplete,
    a6_6State: value.a6_6State,
    a6_6CleanupFailureCount: value.a6_6CleanupFailureCount,
  });
}

function canonicalSnapshot(
  value: ArenaV2CollectionFormalPreviewResourceExecutionCompositionSnapshotV1,
): string {
  return JSON.stringify(value);
}

function destroyFailure(
  phase: ArenaV2CollectionFormalPreviewResourceExecutionCompositionDestroyFailureV1['phase'],
  code: ArenaV2CollectionFormalPreviewResourceExecutionCompositionDestroyFailureV1['code'],
): ArenaV2CollectionFormalPreviewResourceExecutionCompositionDestroyFailureV1 {
  return Object.freeze({ schemaVersion: 1 as const, phase, code });
}

interface ConstructionCleanupResourcesV1 {
  readonly executor: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerCandidateV1 | null;
  readonly adapter: ArenaV2CollectionPreviewLazyGltfLoaderAdapterCandidateV1 | null;
  executorResult: ArenaV2CollectionVisiblePreviewLeaseDestroyResultV1 | null;
  adapterDestroyed: boolean;
}

function constructionCleanupComplete(resources: ConstructionCleanupResourcesV1): boolean {
  return (resources.executor === null || resources.executorResult?.state === 'destroyed')
    && (resources.adapter === null || resources.adapterDestroyed);
}

function cleanupConstructionResources(resources: ConstructionCleanupResourcesV1): void {
  if (resources.executor !== null && resources.executorResult?.state !== 'destroyed') {
    const result = resources.executor.destroy();
    rejectThenable(result, 'A6.11c construction executor.destroy');
    resources.executorResult = result;
    if (resources.executorResult.state !== 'destroyed') {
      throw new Error('A6.11c构造回滚时A6.11b清理不完整。');
    }
  }
  const executorDestroyed = resources.executor === null
    || resources.executorResult?.state === 'destroyed';
  if (executorDestroyed && resources.adapter !== null && !resources.adapterDestroyed) {
    rejectThenable(resources.adapter.destroy(), 'A6.11c construction adapter.destroy');
    const snapshot = resources.adapter.getSnapshot();
    rejectThenable(snapshot, 'A6.11c construction adapter.getSnapshot');
    resources.adapterDestroyed = snapshot.state === 'destroyed';
    if (!resources.adapterDestroyed) {
      throw new Error('A6.11c构造回滚时A6.11a清理不完整。');
    }
  }
  if (!constructionCleanupComplete(resources)) {
    throw new Error('A6.11c构造资源清理依赖尚未收敛。');
  }
}

export class ArenaV2CollectionFormalPreviewResourceExecutionConstructionCleanupFailureCandidateV1
  extends AggregateError {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly #resources: ConstructionCleanupResourcesV1;

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    resources: ConstructionCleanupResourcesV1,
  ) {
    super([originalError, cleanupError], 'A6.11c构造失败且反向清理不完整。');
    this.name = 'ArenaV2CollectionFormalPreviewResourceExecutionConstructionCleanupFailureCandidateV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#resources = resources;
  }

  get cleanupComplete(): boolean { return constructionCleanupComplete(this.#resources); }

  retryCleanup(): void { cleanupConstructionResources(this.#resources); }
}

function reverseCleanup(
  executor: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerCandidateV1 | null,
  adapter: ArenaV2CollectionPreviewLazyGltfLoaderAdapterCandidateV1 | null,
  primary: unknown,
): never {
  const resources: ConstructionCleanupResourcesV1 = {
    executor,
    adapter,
    executorResult: null,
    adapterDestroyed: adapter === null,
  };
  try {
    cleanupConstructionResources(resources);
  } catch (cleanupError) {
    throw new ArenaV2CollectionFormalPreviewResourceExecutionConstructionCleanupFailureCandidateV1(
      primary,
      cleanupError,
      resources,
    );
  }
  throw primary;
}

export class ArenaV2CollectionFormalPreviewResourceExecutionCompositionOwnerCandidateV1 {
  readonly #adapter: ArenaV2CollectionPreviewLazyGltfLoaderAdapterCandidateV1;
  readonly #executor: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerCandidateV1;
  #state: ArenaV2CollectionFormalPreviewResourceExecutionCompositionOwnerStateV1 = 'active';
  #inFlightPromise: Promise<ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1> | null = null;
  #childInFlightPromise:
    Promise<ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1> | null = null;
  #inFlightPreviousSnapshot: ArenaV2CollectionFormalPreviewResourceExecutionCompositionSnapshotV1 | null = null;
  #inFlightPreviousSnapshotCanonical: string | null = null;
  #lastCommitPromise: Promise<ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1> | null = null;
  #lastChildCommitPromise:
    Promise<ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1> | null = null;
  #snapshot: ArenaV2CollectionFormalPreviewResourceExecutionCompositionSnapshotV1;
  #snapshotCanonical: string;
  #destroyResult: ArenaV2CollectionFormalPreviewResourceExecutionCompositionDestroyResultV1 | null = null;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(value: unknown) {
    const source = captureOptions(value);
    if (source.schemaVersion !== 1) throw new RangeError('A6.11c constructor.schemaVersion必须为1。');
    let adapter: ArenaV2CollectionPreviewLazyGltfLoaderAdapterCandidateV1 | null = null;
    let executor: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerCandidateV1 | null = null;
    try {
      adapter = new ArenaV2CollectionPreviewLazyGltfLoaderAdapterCandidateV1(
        Object.hasOwn(source, 'underlyingLoader')
          ? { schemaVersion: 1, loader: source.underlyingLoader }
          : { schemaVersion: 1 },
      );
      executor = new ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerCandidateV1({
        schemaVersion: 1,
        bindingSnapshot: source.bindingSnapshot,
        loader: adapter,
        disposer: adapter,
        beforeReleaseBarrier: source.beforeReleaseBarrier,
      });
      this.#adapter = adapter;
      this.#executor = executor;
      const initial = this.#runSynchronousOperation('constructor-snapshot', () => {
        const children = this.#captureChildren();
        return this.#createSnapshotFromChildren(
          'active',
          children.executor,
          children.adapter,
        );
      });
      this.#snapshot = initial;
      this.#snapshotCanonical = canonicalSnapshot(initial);
    } catch (error) {
      reverseCleanup(executor, adapter, error);
    }
  }

  get state(): ArenaV2CollectionFormalPreviewResourceExecutionCompositionOwnerStateV1 {
    this.#assertNoOperation('state read');
    return this.#state;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation !== null) {
      const error = new Error(`A6.11c ${this.#operation}期间拒绝${operation}。`);
      this.#reentrySequence += 1;
      this.#reentryError ??= error;
      throw this.#reentryError;
    }
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) throw new Error('A6.11c缺少当前操作所有权。');
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runSynchronousOperation<T>(operation: string, run: () => T): T {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    let failed = false;
    let failureValue: unknown = null;
    let result!: T;
    try {
      result = run();
    } catch (error) {
      failed = true;
      failureValue = error;
    } finally {
      if (this.#operation === operation) this.#operation = null;
    }
    const reentryError = this.#reentryError;
    this.#reentryError = null;
    if (reentryError !== null) {
      this.#state = 'failed';
      throw failed && failureValue !== reentryError
        ? new AggregateError([failureValue, reentryError], `A6.11c ${operation}失败且同步重入。`)
        : reentryError;
    }
    if (failed) throw failureValue;
    return result;
  }

  #createSnapshotFromChildren(
    state: ArenaV2CollectionFormalPreviewResourceExecutionCompositionOwnerStateV1,
    executorValue: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerSnapshotV1,
    adapterValue: ArenaV2A6CollectionPreviewLazyGltfLoaderAdapterSnapshotV1,
  ): ArenaV2CollectionFormalPreviewResourceExecutionCompositionSnapshotV1 {
    const executorSnapshot = executorProjection(executorValue);
    const pendingLeaseCount = Math.max(
      0,
      executorSnapshot.activeLeaseCount
        - executorSnapshot.assetReadyCount
        - executorSnapshot.leaseFallbackCount,
    );
    return Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      implementationStatus: 'code-written-not-run' as const,
      validationStatus: 'not-run' as const,
      hardGate: false as const,
      productionReachable: false as const,
      defaultSurfaceWired: false as const,
      state,
      epochId: executorSnapshot.epochId,
      catalogContentHash: executorSnapshot.catalogContentHash,
      executorSnapshot,
      adapterSnapshot: adapterValue,
      activeLeaseCount: executorSnapshot.activeLeaseCount,
      pendingLeaseCount,
      readyLeaseCount: executorSnapshot.assetReadyCount,
      fallbackLeaseCount: executorSnapshot.leaseFallbackCount,
      loadingTaskCount: adapterValue.loadingTaskCount,
      readyTaskCount: adapterValue.readyTaskCount,
      cancelledPendingTaskCount: adapterValue.cancelledPendingTaskCount,
      destroyOrdering: DESTROY_ORDER,
    });
  }

  #captureChildren(): Readonly<{
    executor: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerSnapshotV1;
    adapter: ArenaV2A6CollectionPreviewLazyGltfLoaderAdapterSnapshotV1;
  }> {
    const executor = this.#executor.getSnapshot();
    this.#assertCurrentOperationCommit();
    const adapter = this.#adapter.getSnapshot();
    this.#assertCurrentOperationCommit();
    return Object.freeze({ executor, adapter });
  }

  #synchronizeState(): Readonly<{
    executor: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerSnapshotV1;
    adapter: ArenaV2A6CollectionPreviewLazyGltfLoaderAdapterSnapshotV1;
  }> {
    const children = this.#captureChildren();
    const { executor, adapter } = children;
    if (this.#state === 'active' || this.#state === 'executing') {
      if (executor.state === 'failed'
        || adapter.state === 'failed'
        || executor.state === 'destroyed'
        || executor.state === 'destroy-incomplete'
        || adapter.state === 'destroyed'
        || adapter.state === 'destroy-incomplete') {
        this.#state = 'failed';
      } else if (this.#inFlightPromise !== null || executor.state === 'executing') {
        this.#state = 'executing';
      } else {
        this.#state = 'active';
      }
    }
    return children;
  }

  #publishFromChildren(
    children: Readonly<{
      executor: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerSnapshotV1;
      adapter: ArenaV2A6CollectionPreviewLazyGltfLoaderAdapterSnapshotV1;
    }>,
  ): void {
    const next = this.#createSnapshotFromChildren(this.#state, children.executor, children.adapter);
    const canonical = canonicalSnapshot(next);
    if (canonical === this.#snapshotCanonical) return;
    this.#snapshot = next;
    this.#snapshotCanonical = canonical;
  }

  #fail(): void {
    if (this.#state !== 'destroyed' && this.#state !== 'destroy-incomplete') {
      this.#state = 'failed';
    }
    try {
      const children = this.#synchronizeState();
      this.#publishFromChildren(children);
    } catch { /* 保留最后一份已提交快照。 */ }
  }

  #attachCommandSettlement(
    operation: Promise<ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1>,
    childPromise: Promise<ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1>,
    commandOwner: Readonly<{
      readonly resolve: (
        value: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1,
      ) => void;
      readonly reject: (reason: unknown) => void;
    }>,
  ): void {
    Reflect.apply(NATIVE_PROMISE_THEN, childPromise, [
      (result: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1) => {
        try {
          this.#runSynchronousOperation('command-fulfilled', () => {
            if (this.#inFlightPromise !== operation
              || this.#childInFlightPromise !== childPromise) {
              throw new Error('A6.11c拒绝过期command完成提交。');
            }
            if (this.#state !== 'executing') {
              throw new Error(`A6.11c command完成时拒绝状态${this.#state}复活。`);
            }
            const children = this.#captureChildren();
            if (children.executor.state !== 'active' || children.adapter.state !== 'active') {
              throw new Error('A6.11c command完成后Child未回到active。');
            }
            this.#assertCurrentOperationCommit();
            this.#inFlightPromise = null;
            this.#childInFlightPromise = null;
            this.#inFlightPreviousSnapshot = null;
            this.#inFlightPreviousSnapshotCanonical = null;
            this.#state = 'active';
            this.#publishFromChildren(children);
          });
          commandOwner.resolve(result);
        } catch (error) {
          let failure = error;
          try {
            this.#runSynchronousOperation('command-fulfilled-failure', () => {
              if (this.#inFlightPromise === operation) this.#inFlightPromise = null;
              if (this.#childInFlightPromise === childPromise) this.#childInFlightPromise = null;
              this.#inFlightPreviousSnapshot = null;
              this.#inFlightPreviousSnapshotCanonical = null;
              this.#fail();
            });
          } catch (closeError) {
            failure = new AggregateError(
              [failure, closeError],
              'A6.11c command完成后的失败关闭不完整。',
            );
            this.#state = 'failed';
          }
          commandOwner.reject(failure);
        }
      },
      (error: unknown) => {
        let failure = error;
        try {
          this.#runSynchronousOperation('command-rejected', () => {
            if (this.#inFlightPromise !== operation
              || this.#childInFlightPromise !== childPromise
              || this.#state !== 'executing') {
              throw new Error('A6.11c拒绝过期command失败提交。');
            }
            const previousSnapshot = this.#inFlightPreviousSnapshot;
            const previousCanonical = this.#inFlightPreviousSnapshotCanonical;
            const children = this.#captureChildren();
            const reusable = children.executor.state === 'active'
              && children.adapter.state === 'active'
              && previousSnapshot !== null
              && previousCanonical !== null;
            this.#assertCurrentOperationCommit();
            this.#inFlightPromise = null;
            this.#childInFlightPromise = null;
            this.#inFlightPreviousSnapshot = null;
            this.#inFlightPreviousSnapshotCanonical = null;
            if (reusable) {
              this.#state = 'active';
              this.#snapshot = previousSnapshot;
              this.#snapshotCanonical = previousCanonical;
            } else {
              this.#state = 'failed';
              this.#publishFromChildren(children);
            }
          });
        } catch (commitError) {
          failure = new AggregateError(
            [error, commitError],
            'A6.11c command失败提交未能完整关闭。',
          );
          try {
            this.#runSynchronousOperation('command-rejected-failure', () => {
              if (this.#inFlightPromise === operation) this.#inFlightPromise = null;
              if (this.#childInFlightPromise === childPromise) this.#childInFlightPromise = null;
              this.#inFlightPreviousSnapshot = null;
              this.#inFlightPreviousSnapshotCanonical = null;
              this.#fail();
            });
          } catch (closeError) {
            failure = new AggregateError(
              [failure, closeError],
              'A6.11c command拒绝后的失败关闭不完整。',
            );
            this.#state = 'failed';
          }
        }
        commandOwner.reject(failure);
      },
    ]);
  }

  execute(
    value: unknown,
  ): Promise<ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1> {
    return this.#runSynchronousOperation('execute', () => {
      const before = this.#synchronizeState();
      if (this.#inFlightPromise !== null) {
        const activeOperation = this.#inFlightPromise;
        if (before.adapter.state !== 'active') throw new Error('A6.11c运行中adapter已不可用。');
        const replay = this.#executor.execute(value);
        this.#assertCurrentOperationCommit();
        if (replay !== this.#childInFlightPromise) {
          this.#fail();
          throw new Error('A6.11c运行中重放未返回同一子提交Promise。');
        }
        return activeOperation;
      }
      if (this.#state !== 'active'
        || before.executor.state !== 'active'
        || before.adapter.state !== 'active') {
        this.#publishFromChildren(before);
        throw new Error(`A6.11c execute拒绝状态${this.#state}。`);
      }

      const commandOwner = createDeferredPromiseOwner<
        ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1
      >();
      const operation = commandOwner.promise;
      Reflect.apply(NATIVE_PROMISE_THEN, operation, [undefined, () => undefined]);
      this.#inFlightPreviousSnapshot = this.#snapshot;
      this.#inFlightPreviousSnapshotCanonical = this.#snapshotCanonical;
      this.#inFlightPromise = operation;
      let childPromise:
        Promise<ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1> | null = null;
      try {
        childPromise = this.#executor.execute(value);
        this.#childInFlightPromise = childPromise;
        if (!isNativePromise(childPromise)) {
          this.#state = 'failed';
          throw new TypeError('A6.11c A6.11b execute必须返回原生Promise。');
        }
        const replayOfLastCommit = childPromise === this.#lastChildCommitPromise
          && this.#lastCommitPromise !== null;
        if (!replayOfLastCommit) {
          this.#attachCommandSettlement(operation, childPromise, commandOwner);
        }
        this.#assertCurrentOperationCommit();
      } catch (error) {
        if (this.#inFlightPromise === operation) this.#inFlightPromise = null;
        if (childPromise !== null && this.#childInFlightPromise === childPromise) {
          this.#childInFlightPromise = null;
        }
        this.#inFlightPreviousSnapshot = null;
        this.#inFlightPreviousSnapshotCanonical = null;
        commandOwner.reject(error);
        if (this.#reentryError === null) {
          const children = this.#synchronizeState();
          this.#publishFromChildren(children);
        } else {
          this.#state = 'failed';
        }
        throw error;
      }
      if (childPromise === null) throw new Error('A6.11c A6.11b execute未返回Promise Owner。');
      if (childPromise === this.#lastChildCommitPromise
        && this.#lastCommitPromise !== null) {
        const previousOperation = this.#lastCommitPromise;
        if (this.#inFlightPromise === operation) this.#inFlightPromise = null;
        this.#childInFlightPromise = null;
        this.#inFlightPreviousSnapshot = null;
        this.#inFlightPreviousSnapshotCanonical = null;
        Reflect.apply(NATIVE_PROMISE_THEN, previousOperation, [
          (result: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1) => (
            commandOwner.resolve(result)
          ),
          (error: unknown) => commandOwner.reject(error),
        ]);
        this.#state = 'active';
        this.#publishFromChildren(before);
        return previousOperation;
      }

      this.#lastChildCommitPromise = childPromise;
      this.#lastCommitPromise = operation;
      try {
        const executingChildren = this.#captureChildren();
        this.#state = 'executing';
        this.#publishFromChildren(executingChildren);
      } catch (error) {
        if (this.#inFlightPromise === operation) this.#inFlightPromise = null;
        if (this.#childInFlightPromise === childPromise) this.#childInFlightPromise = null;
        if (this.#lastCommitPromise === operation) this.#lastCommitPromise = null;
        if (this.#lastChildCommitPromise === childPromise) this.#lastChildCommitPromise = null;
        this.#inFlightPreviousSnapshot = null;
        this.#inFlightPreviousSnapshotCanonical = null;
        this.#state = 'failed';
        commandOwner.reject(error);
        throw error;
      }
      return operation;
    });
  }

  getSnapshot(): ArenaV2CollectionFormalPreviewResourceExecutionCompositionSnapshotV1 {
    return this.#runSynchronousOperation('snapshot-refresh', () => {
      if (this.#inFlightPromise !== null) return this.#snapshot;
      const children = this.#synchronizeState();
      this.#publishFromChildren(children);
      return this.#snapshot;
    });
  }

  resetPresentationEpoch(
    value: unknown,
  ): void {
    this.#runSynchronousOperation('reset-epoch', () => {
      const children = this.#synchronizeState();
      if (this.#state !== 'active' || this.#inFlightPromise !== null) {
        this.#publishFromChildren(children);
        throw new Error(`A6.11c reset拒绝状态${this.#state}。`);
      }
      if (children.executor.activeLeaseCount !== 0) {
        throw new Error('A6.11c reset只允许active lease为0。');
      }
      if (children.adapter.readyTaskCount !== 0 || children.adapter.loadingTaskCount !== 0) {
        throw new Error('A6.11c reset拒绝ready或未取消loading task。');
      }
      try {
        this.#executor.resetPresentationEpoch(value);
        this.#assertCurrentOperationCommit();
      } catch (error) {
        if (this.#reentryError === null) {
          const after = this.#synchronizeState();
          this.#publishFromChildren(after);
        }
        throw error;
      }
      this.#lastCommitPromise = null;
      this.#lastChildCommitPromise = null;
      this.#destroyResult = null;
      const after = this.#synchronizeState();
      this.#publishFromChildren(after);
    });
  }

  destroy(): ArenaV2CollectionFormalPreviewResourceExecutionCompositionDestroyResultV1 {
    return this.#runSynchronousOperation('destroy', () => {
    if (this.#state === 'destroyed' && this.#destroyResult !== null) return this.#destroyResult;
    const before = this.#captureChildren();
    if (this.#inFlightPromise !== null || before.executor.state === 'executing') {
      throw new Error('A6.11c命令提交微任务运行中拒绝destroy。');
    }
    const failures: ArenaV2CollectionFormalPreviewResourceExecutionCompositionDestroyFailureV1[] = [];
    let executorResult: ArenaV2CollectionVisiblePreviewLeaseDestroyResultV1 | null = null;
    let executorDestroyFailed = false;
    try {
      executorResult = this.#executor.destroy();
      rejectThenable(executorResult, 'A6.11c executor.destroy');
      this.#assertCurrentOperationCommit();
      if (executorResult.state !== 'destroyed') {
        failures.push(destroyFailure('a6.11b-executor', 'destroy-incomplete'));
      }
    } catch (error) {
      if (this.#reentryError !== null) throw error;
      executorDestroyFailed = true;
      failures.push(destroyFailure('a6.11b-executor', 'destroy-threw'));
    }
    let executorSnapshot: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionOwnerSnapshotV1 =
      before.executor;
    if (!executorDestroyFailed) {
      try {
        executorSnapshot = this.#executor.getSnapshot();
        rejectThenable(executorSnapshot, 'A6.11c executor.getSnapshot');
        this.#assertCurrentOperationCommit();
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        executorDestroyFailed = true;
        failures.push(destroyFailure('a6.11b-executor', 'child-state-not-destroyed'));
      }
    }
    let adapterDestroyAttempted = false;
    let adapterDestroyFailed = false;
    if (!executorDestroyFailed
      && executorResult?.state === 'destroyed'
      && executorSnapshot.state === 'destroyed') {
      adapterDestroyAttempted = true;
      try {
        rejectThenable(this.#adapter.destroy(), 'A6.11c adapter.destroy');
        this.#assertCurrentOperationCommit();
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        adapterDestroyFailed = true;
        failures.push(destroyFailure('a6.11a-adapter', 'destroy-threw'));
      }
    } else {
      failures.push(destroyFailure('a6.11a-adapter', 'adapter-cleanup-deferred'));
    }
    let adapterSnapshot: ArenaV2A6CollectionPreviewLazyGltfLoaderAdapterSnapshotV1 =
      this.#snapshot.adapterSnapshot;
    if (adapterDestroyAttempted && !adapterDestroyFailed) {
      try {
        adapterSnapshot = this.#adapter.getSnapshot();
        rejectThenable(adapterSnapshot, 'A6.11c adapter.getSnapshot');
        this.#assertCurrentOperationCommit();
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        failures.push(destroyFailure('a6.11a-adapter', 'child-state-not-destroyed'));
      }
    }
    if (adapterSnapshot.state !== 'destroyed') {
      failures.push(destroyFailure('a6.11a-adapter', 'destroy-incomplete'));
    }
    if (executorResult === null && executorSnapshot.state !== 'destroyed') {
      failures.push(destroyFailure('a6.11b-executor', 'child-state-not-destroyed'));
    }
    const complete = failures.length === 0
      && executorResult?.state === 'destroyed'
      && executorSnapshot.state === 'destroyed'
      && adapterSnapshot.state === 'destroyed';
    this.#state = complete ? 'destroyed' : 'destroy-incomplete';
    this.#inFlightPromise = null;
    this.#childInFlightPromise = null;
    this.#lastCommitPromise = null;
    this.#lastChildCommitPromise = null;
    const result = Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      implementationStatus: 'code-written-not-run' as const,
      validationStatus: 'not-run' as const,
      state: this.#state as 'destroyed' | 'destroy-incomplete',
      destroyOrdering: DESTROY_ORDER,
      executorResult,
      executorState: executorSnapshot.state,
      adapterSnapshot,
      failures: Object.freeze(failures),
    });
    this.#destroyResult = result;
    try {
      this.#publishFromChildren({ executor: executorSnapshot, adapter: adapterSnapshot });
    } catch {
      // Destroy result retains both child states even if a diagnostic snapshot can no longer refresh.
    }
    return result;
    });
  }
}
