import {
  assertKnownKeys,
  assertPlainRecord,
  assertSynchronousReturn as rejectThenable,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1,
} from './arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';
import {
  ArenaV2CollectionFormalPreviewResourceExecutionConstructionCleanupFailureCandidateV1,
  ArenaV2CollectionFormalPreviewResourceExecutionCompositionOwnerCandidateV1,
  type ArenaV2CollectionFormalPreviewResourceExecutionCompositionDestroyResultV1,
  type ArenaV2CollectionFormalPreviewResourceExecutionCompositionSnapshotV1,
} from './arena-v2-collection-formal-preview-resource-execution-composition-owner-candidate-v1.js';
import type {
  ArenaV2CollectionFourScreenIdV1,
  ArenaV2CollectionFourScreenReadSnapshotV1,
} from './arena-v2-collection-four-screen-read-owner-candidate-v1.js';
import {
  ArenaV2CollectionPreviewMountLifecycleDestroyProofOwnerCandidateV1,
  type ArenaV2CollectionPreviewMountLifecycleSnapshotV1,
} from './arena-v2-collection-preview-mount-lifecycle-destroy-proof-owner-candidate-v1.js';
import {
  ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1,
  type ArenaV2CollectionPreviewSlotLayoutObservationInputV1,
  type ArenaV2CollectionVisibleLayoutObservationSnapshotV1,
} from './arena-v2-collection-visible-layout-observation-owner-candidate-v1.js';
import {
  createArenaV2CollectionVisiblePreviewLeaseCommandPlanIdentityV1,
  type ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1,
} from './arena-v2-collection-visible-preview-lease-command-execution-owner-candidate-v1.js';
import {
  ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1,
  type ArenaV2CollectionPlannedActivePreviewLeaseV1,
  type ArenaV2CollectionVisiblePreviewLeaseCommandPlanV1,
} from './arena-v2-collection-visible-preview-lease-command-planning-owner-candidate-v1.js';
import type {
  ArenaV2A6WeaponPreviewRectCssPixelsV1,
  ArenaV2A6WeaponPreviewViewportV1,
} from './arena-v2-weapon-collection-preview-three-mount-owner-candidate-v1.js';

export const ARENA_V2_COLLECTION_PREVIEW_PAGE_TRANSACTION_OWNER_CANDIDATE_V1 =
  Object.freeze({
    stage: 'A6.12c' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    ownsA6_12aLayoutObservation: true as const,
    ownsA6_10LeasePlanner: true as const,
    ownsA6_12bMountLifecycle: true as const,
    ownsA6_11cResourceExecution: true as const,
    stepOrder: Object.freeze([
      'observe-layout',
      'plan-leases',
      'prepare-release-mounts',
      'submit-resource-commands',
      'commit-release',
      'commit-current-mounts',
    ] as const),
    resourceSettlementAwaitedByStep: false as const,
    presentationEpochResetPolicy: 'destroy-and-recreate-owner' as const,
    constructionCleanupRetainsRetryableChildOwners: true as const,
    constructionCleanupUsesTerminalLeaseReleaseOrder: true as const,
    synchronousLifecycleOperationReentryRejected: true as const,
    swallowedChildReentryRejectedBeforeSuccessCommit: true as const,
    stepOwnerPublishedBeforeResourceExecute: true as const,
    resourceSettlementCommitsUnderOperationGuard: true as const,
    failedOwnerCannotBeRevivedByLateFulfillment: true as const,
    publicReadsRejectedDuringOperationCommit: true as const,
    stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
    layoutPlannerMountResourceAndSnapshotCallbacksCheckedBeforeStateCommit: true as const,
    asyncResourceSubmissionCapturedBeforeCommitCheck: true as const,
    destroyReentryRetainsCurrentAndLaterOwners: true as const,
    ordinaryDestroyFailureRetainsCurrentAndLaterOwners: true as const,
    constructionAndTerminalCleanupMustCompleteSynchronously: true as const,
  });

export type ArenaV2CollectionPreviewPageTransactionOwnerStateV1 =
  | 'active'
  | 'executing'
  | 'failed'
  | 'destroy-incomplete'
  | 'destroyed';

export interface ArenaV2CollectionPreviewPageTransactionOwnerOptionsV1 {
  readonly schemaVersion: 1;
  readonly bindingSnapshot: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1;
  readonly underlyingLoader?: unknown;
}

export interface ArenaV2CollectionPreviewPageTransactionStepInputV1 {
  readonly schemaVersion: 1;
  readonly epochId: string;
  readonly tick: number;
  readonly screenId: ArenaV2CollectionFourScreenIdV1;
  readonly viewport: ArenaV2A6WeaponPreviewViewportV1;
  readonly readSnapshot: ArenaV2CollectionFourScreenReadSnapshotV1;
  readonly contentClipRectCssPixels: ArenaV2A6WeaponPreviewRectCssPixelsV1;
  readonly slotLayouts: readonly ArenaV2CollectionPreviewSlotLayoutObservationInputV1[];
}

export interface ArenaV2CollectionPreviewPageTransactionStepResultV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly productionReachable: false;
  readonly defaultSurfaceWired: false;
  readonly epochId: string;
  readonly tick: number;
  readonly screenId: ArenaV2CollectionFourScreenIdV1;
  readonly planIdentity: string;
  readonly layoutSnapshot: ArenaV2CollectionVisibleLayoutObservationSnapshotV1;
  readonly plan: ArenaV2CollectionVisiblePreviewLeaseCommandPlanV1;
  readonly executionResult: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1;
  readonly mountSnapshot: ArenaV2CollectionPreviewMountLifecycleSnapshotV1;
  readonly nextActiveLeaseLedger: readonly ArenaV2CollectionPlannedActivePreviewLeaseV1[];
  readonly resourceSettlementAwaited: false;
}

export interface ArenaV2CollectionPreviewPageTransactionSnapshotV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly hardGate: false;
  readonly defaultSurfaceWired: false;
  readonly state: ArenaV2CollectionPreviewPageTransactionOwnerStateV1;
  readonly epochId: string;
  readonly lastTick: number;
  readonly lastScreenId: ArenaV2CollectionFourScreenIdV1 | null;
  readonly lastPlanIdentity: string | null;
  readonly activeLeaseLedgerCount: number;
  readonly activeLeaseCount: number;
  readonly pendingLeaseCount: number;
  readonly readyLeaseCount: number;
  readonly fallbackLeaseCount: number;
  readonly mountedCount: number;
  readonly staticFallbackCount: number;
  readonly commandSubmissionInFlight: boolean;
  readonly resourceSettlementAwaitedByStep: false;
}

export interface ArenaV2CollectionPreviewPageCurrentRenderFactsV1 {
  readonly schemaVersion: 1;
  readonly epochId: string;
  readonly layoutTick: number;
  readonly screenId: ArenaV2CollectionFourScreenIdV1;
  readonly layoutSnapshot: ArenaV2CollectionVisibleLayoutObservationSnapshotV1;
  readonly mountSnapshot: ArenaV2CollectionPreviewMountLifecycleSnapshotV1;
}

export interface ArenaV2CollectionPreviewPageTransactionDestroyFailureV1 {
  readonly schemaVersion: 1;
  readonly phase:
    | 'prepare-mount-proofs'
    | 'destroy-resources'
    | 'finalize-mounts'
    | 'destroy-planner'
    | 'destroy-layout-observer';
  readonly code: 'threw' | 'destroy-incomplete';
}

export interface ArenaV2CollectionPreviewPageTransactionDestroyResultV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly state: 'destroyed' | 'destroy-incomplete';
  readonly tick: number;
  readonly resourceResult: ArenaV2CollectionFormalPreviewResourceExecutionCompositionDestroyResultV1 | null;
  readonly failures: readonly ArenaV2CollectionPreviewPageTransactionDestroyFailureV1[];
}

const OPTION_KEYS = new Set(['schemaVersion', 'bindingSnapshot', 'underlyingLoader']);
const REQUIRED_OPTION_KEYS = new Set(['schemaVersion', 'bindingSnapshot']);
const STEP_KEYS = new Set([
  'schemaVersion', 'epochId', 'tick', 'screenId', 'viewport', 'readSnapshot',
  'contentClipRectCssPixels', 'slotLayouts',
]);
const NATIVE_PROMISE_THEN = Promise.prototype.then;

function captureOptions(value: unknown): PlainRecord {
  const source = assertPlainRecord(value, 'A6.12c constructor');
  assertKnownKeys(source, OPTION_KEYS, 'A6.12c constructor');
  for (const key of REQUIRED_OPTION_KEYS) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`A6.12c constructor缺少${key}。`);
  }
  const output: PlainRecord = {};
  for (const key of OPTION_KEYS) {
    if (!Object.hasOwn(source, key)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (descriptor === undefined || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`A6.12c constructor.${key}必须是数据字段。`);
    }
    output[key] = descriptor.value;
  }
  return output;
}

function exactClonedRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): PlainRecord {
  const source = assertPlainRecord(cloneFrozenData(value, name), name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  return source;
}

function text(value: unknown, name: string, maximum = 200): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > maximum) {
    throw new TypeError(`${name}必须是1..${maximum}字符的非空字符串。`);
  }
  return value;
}

function tick(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name}必须是非负安全整数。`);
  }
  return value as number;
}

function canonical(value: unknown, name: string): string {
  const result = JSON.stringify(value);
  if (typeof result !== 'string') throw new TypeError(`${name}无法规范序列化。`);
  return result;
}

function nativePromise<T>(value: unknown, name: string): asserts value is Promise<T> {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    throw new TypeError(`${name}必须返回原生Promise。`);
  }
  try {
    Reflect.apply(NATIVE_PROMISE_THEN, value, [() => undefined, () => undefined]);
  } catch {
    throw new TypeError(`${name}必须返回原生Promise。`);
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

function failure(
  phase: ArenaV2CollectionPreviewPageTransactionDestroyFailureV1['phase'],
  code: ArenaV2CollectionPreviewPageTransactionDestroyFailureV1['code'],
): ArenaV2CollectionPreviewPageTransactionDestroyFailureV1 {
  return Object.freeze({ schemaVersion: 1 as const, phase, code });
}

function bindingEpoch(value: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1): Readonly<{
  epochId: string;
  tick: number;
}> {
  const source = assertPlainRecord(
    cloneFrozenData(value, 'A6.12c bindingSnapshot'),
    'A6.12c bindingSnapshot',
  );
  return Object.freeze({
    epochId: text(source.epochId, 'A6.12c bindingSnapshot.epochId'),
    tick: tick(source.tick, 'A6.12c bindingSnapshot.tick'),
  });
}

interface ConstructionCleanupResourcesV1 {
  readonly identity: Readonly<{ epochId: string; tick: number }>;
  readonly resourceOwner:
    ArenaV2CollectionFormalPreviewResourceExecutionCompositionOwnerCandidateV1 | null;
  resourceConstructionDebt:
    ArenaV2CollectionFormalPreviewResourceExecutionConstructionCleanupFailureCandidateV1 | null;
  readonly mountLifecycle: ArenaV2CollectionPreviewMountLifecycleDestroyProofOwnerCandidateV1 | null;
  readonly planner: ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1 | null;
  readonly layoutOwner: ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1 | null;
  mountProofsPrepared: boolean;
  resourceDestroyResult: ArenaV2CollectionFormalPreviewResourceExecutionCompositionDestroyResultV1
    | null;
  mountsFinalized: boolean;
  plannerDestroyed: boolean;
  layoutOwnerDestroyed: boolean;
}

function constructionCleanupComplete(resources: ConstructionCleanupResourcesV1): boolean {
  return resources.mountProofsPrepared
    && (resources.resourceOwner === null || resources.resourceDestroyResult?.state === 'destroyed')
    && resources.resourceConstructionDebt === null
    && resources.mountsFinalized
    && resources.plannerDestroyed
    && resources.layoutOwnerDestroyed;
}

function cleanupConstructionResources(resources: ConstructionCleanupResourcesV1): void {
  if (!resources.mountProofsPrepared) {
    if (resources.mountLifecycle === null) resources.mountProofsPrepared = true;
    else {
      try {
        const prepared = resources.mountLifecycle.prepareAllForOwnerDestroy({
          schemaVersion: 1,
          tick: resources.identity.tick,
        });
        rejectThenable(prepared, 'A6.12c construction prepare mount proofs');
        resources.mountProofsPrepared = prepared.state === 'destroy-prepared';
        if (!resources.mountProofsPrepared) {
          throw new Error('A6.12c构造回滚时A6.12b proof准备不完整。');
        }
      } catch (error) { throw error; }
    }
  }
  if (resources.mountProofsPrepared
    && resources.resourceOwner !== null
    && resources.resourceDestroyResult?.state !== 'destroyed') {
    const result = resources.resourceOwner.destroy();
    rejectThenable(result, 'A6.12c construction resource owner.destroy');
    resources.resourceDestroyResult = result;
    if (resources.resourceDestroyResult.state !== 'destroyed') {
      throw new Error('A6.12c构造回滚时A6.11c清理不完整。');
    }
  }
  const resourcesDestroyed = resources.resourceOwner === null
    || resources.resourceDestroyResult?.state === 'destroyed';
  if (resources.mountProofsPrepared && resources.resourceConstructionDebt !== null) {
    rejectThenable(
      resources.resourceConstructionDebt.retryCleanup(),
      'A6.12c construction resource debt.retryCleanup',
    );
    if (resources.resourceConstructionDebt.cleanupComplete) {
      resources.resourceConstructionDebt = null;
    } else {
      throw new Error('A6.12c构造回滚时A6.11c构造债务清理不完整。');
    }
  }
  const allResourcesDestroyed = resourcesDestroyed
    && resources.resourceConstructionDebt === null;
  if (resources.mountProofsPrepared && allResourcesDestroyed && !resources.mountsFinalized) {
    if (resources.mountLifecycle === null) resources.mountsFinalized = true;
    else {
      try {
        const finalized = resources.mountLifecycle.finalizeDestroy({
          schemaVersion: 1,
          tick: resources.identity.tick,
          resourceOwnerState: 'destroyed',
        });
        rejectThenable(
          finalized,
          'A6.12c construction finalize mount proofs',
        );
        resources.mountsFinalized = resources.mountLifecycle.state === 'destroyed';
        if (!resources.mountsFinalized) {
          throw new Error('A6.12c构造回滚时A6.12b proof终结不完整。');
        }
      } catch (error) { throw error; }
    }
  }
  if (resources.mountsFinalized && !resources.plannerDestroyed) {
    if (resources.planner === null) resources.plannerDestroyed = true;
    else {
      rejectThenable(
        resources.planner.destroy(),
        'A6.12c construction planner.destroy',
      );
      resources.plannerDestroyed = true;
    }
  }
  if (resources.plannerDestroyed && !resources.layoutOwnerDestroyed) {
    if (resources.layoutOwner === null) resources.layoutOwnerDestroyed = true;
    else {
      rejectThenable(
        resources.layoutOwner.destroy(),
        'A6.12c construction layout owner.destroy',
      );
      resources.layoutOwnerDestroyed = true;
    }
  }
  if (!constructionCleanupComplete(resources)) {
    throw new Error('A6.12c构造资源清理依赖尚未收敛。');
  }
}

export class ArenaV2CollectionPreviewPageTransactionConstructionCleanupFailureCandidateV1
  extends AggregateError {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly #resources: ConstructionCleanupResourcesV1;

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    resources: ConstructionCleanupResourcesV1,
  ) {
    super([originalError, cleanupError], 'A6.12c构造失败且反向清理不完整。');
    this.name = 'ArenaV2CollectionPreviewPageTransactionConstructionCleanupFailureCandidateV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#resources = resources;
  }

  get cleanupComplete(): boolean { return constructionCleanupComplete(this.#resources); }

  retryCleanup(): void { cleanupConstructionResources(this.#resources); }
}

function throwConstructionFailure(
  primary: unknown,
  identity: Readonly<{ epochId: string; tick: number }>,
  resourceOwner: ArenaV2CollectionFormalPreviewResourceExecutionCompositionOwnerCandidateV1 | null,
  resourceConstructionDebt:
    ArenaV2CollectionFormalPreviewResourceExecutionConstructionCleanupFailureCandidateV1 | null,
  mountLifecycle: ArenaV2CollectionPreviewMountLifecycleDestroyProofOwnerCandidateV1 | null,
  planner: ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1 | null,
  layoutOwner: ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1 | null,
): never {
  const resources: ConstructionCleanupResourcesV1 = {
    identity,
    resourceOwner,
    resourceConstructionDebt,
    mountLifecycle,
    planner,
    layoutOwner,
    mountProofsPrepared: mountLifecycle === null,
    resourceDestroyResult: null,
    mountsFinalized: mountLifecycle === null,
    plannerDestroyed: planner === null,
    layoutOwnerDestroyed: layoutOwner === null,
  };
  try {
    cleanupConstructionResources(resources);
  } catch (cleanupError) {
    throw new ArenaV2CollectionPreviewPageTransactionConstructionCleanupFailureCandidateV1(
      primary,
      cleanupError,
      resources,
    );
  }
  throw primary;
}

export class ArenaV2CollectionPreviewPageTransactionOwnerCandidateV1 {
  readonly #epochId: string;
  readonly #layoutOwner: ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1;
  readonly #planner: ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1;
  readonly #mountLifecycle: ArenaV2CollectionPreviewMountLifecycleDestroyProofOwnerCandidateV1;
  readonly #resourceOwner: ArenaV2CollectionFormalPreviewResourceExecutionCompositionOwnerCandidateV1;
  #state: ArenaV2CollectionPreviewPageTransactionOwnerStateV1 = 'active';
  #ledger: readonly ArenaV2CollectionPlannedActivePreviewLeaseV1[] = Object.freeze([]);
  #lastTick: number;
  #lastScreenId: ArenaV2CollectionFourScreenIdV1 | null = null;
  #lastPlanIdentity: string | null = null;
  #lastInputCanonical: string | null = null;
  #lastStepPromise: Promise<ArenaV2CollectionPreviewPageTransactionStepResultV1> | null = null;
  #inFlightPromise: Promise<ArenaV2CollectionPreviewPageTransactionStepResultV1> | null = null;
  #resourceSubmission:
    Promise<ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1> | null = null;
  #committedLayoutSnapshot: ArenaV2CollectionVisibleLayoutObservationSnapshotV1 | null = null;
  #snapshot: ArenaV2CollectionPreviewPageTransactionSnapshotV1;
  #destroyResult: ArenaV2CollectionPreviewPageTransactionDestroyResultV1 | null = null;
  #destroyTick: number | null = null;
  #mountProofsPreparedForDestroy = false;
  #resourceDestroyResult: ArenaV2CollectionFormalPreviewResourceExecutionCompositionDestroyResultV1
    | null = null;
  #mountsFinalizedForDestroy = false;
  #plannerDestroyed = false;
  #layoutObserverDestroyed = false;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(value: unknown) {
    const options = captureOptions(value);
    if (options.schemaVersion !== 1) throw new RangeError('A6.12c constructor.schemaVersion必须为1。');
    const binding = options.bindingSnapshot as ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1;
    const identity = bindingEpoch(binding);
    let layoutOwner: ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1 | null = null;
    let planner: ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1 | null = null;
    let mountLifecycle: ArenaV2CollectionPreviewMountLifecycleDestroyProofOwnerCandidateV1 | null = null;
    let resourceOwner: ArenaV2CollectionFormalPreviewResourceExecutionCompositionOwnerCandidateV1 | null = null;
    let resourceConstructionDebt:
      ArenaV2CollectionFormalPreviewResourceExecutionConstructionCleanupFailureCandidateV1 | null = null;
    try {
      layoutOwner = new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({
        epochId: identity.epochId,
      });
      planner = new ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1({
        epochId: identity.epochId,
      });
      mountLifecycle = new ArenaV2CollectionPreviewMountLifecycleDestroyProofOwnerCandidateV1({
        schemaVersion: 1,
        bindingSnapshot: binding,
      });
      resourceOwner = new ArenaV2CollectionFormalPreviewResourceExecutionCompositionOwnerCandidateV1(
        Object.hasOwn(options, 'underlyingLoader')
          ? {
            schemaVersion: 1,
            bindingSnapshot: binding,
            beforeReleaseBarrier: mountLifecycle,
            underlyingLoader: options.underlyingLoader,
          }
          : {
            schemaVersion: 1,
            bindingSnapshot: binding,
            beforeReleaseBarrier: mountLifecycle,
          },
      );
      this.#epochId = identity.epochId;
      this.#lastTick = identity.tick;
      this.#layoutOwner = layoutOwner;
      this.#planner = planner;
      this.#mountLifecycle = mountLifecycle;
      this.#resourceOwner = resourceOwner;
      this.#snapshot = this.#runSynchronousOperation(
        'constructor-snapshot',
        () => this.#makeSnapshot(),
      );
    } catch (error) {
      if (error
        instanceof ArenaV2CollectionFormalPreviewResourceExecutionConstructionCleanupFailureCandidateV1) {
        resourceConstructionDebt = error;
      }
      throwConstructionFailure(
        error,
        identity,
        resourceOwner,
        resourceConstructionDebt,
        mountLifecycle,
        planner,
        layoutOwner,
      );
    }
  }

  get state(): ArenaV2CollectionPreviewPageTransactionOwnerStateV1 {
    this.#assertNoOperation('state read');
    return this.#state;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation !== null) {
      const error = new Error(`A6.12c ${this.#operation}期间拒绝${operation}。`);
      this.#reentrySequence += 1;
      this.#reentryError ??= error;
      throw this.#reentryError;
    }
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) throw new Error('A6.12c缺少当前操作所有权。');
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
        ? new AggregateError([failureValue, reentryError], `A6.12c ${operation}失败且同步重入。`)
        : reentryError;
    }
    if (failed) throw failureValue;
    return result;
  }

  #makeSnapshot(
    requestedState: ArenaV2CollectionPreviewPageTransactionOwnerStateV1 = this.#state,
  ): ArenaV2CollectionPreviewPageTransactionSnapshotV1 {
    const resource = this.#resourceOwner.getSnapshot();
    this.#assertCurrentOperationCommit();
    const mounts = this.#mountLifecycle.getSnapshot();
    this.#assertCurrentOperationCommit();
    const state = (requestedState === 'active' || requestedState === 'executing')
      && (resource.state === 'failed' || mounts.state === 'failed')
      ? 'failed'
      : requestedState;
    return Object.freeze({
      schemaVersion: 1 as const,
      status: 'production-unreachable' as const,
      implementationStatus: 'code-written-not-run' as const,
      validationStatus: 'not-run' as const,
      hardGate: false as const,
      defaultSurfaceWired: false as const,
      state,
      epochId: this.#epochId,
      lastTick: this.#lastTick,
      lastScreenId: this.#lastScreenId,
      lastPlanIdentity: this.#lastPlanIdentity,
      activeLeaseLedgerCount: this.#ledger.length,
      activeLeaseCount: resource.activeLeaseCount,
      pendingLeaseCount: resource.pendingLeaseCount,
      readyLeaseCount: resource.readyLeaseCount,
      fallbackLeaseCount: resource.fallbackLeaseCount,
      mountedCount: mounts.mountedCount,
      staticFallbackCount: mounts.staticFallbackCount,
      commandSubmissionInFlight: this.#inFlightPromise !== null,
      resourceSettlementAwaitedByStep: false as const,
    });
  }

  #publish(
    requestedState: ArenaV2CollectionPreviewPageTransactionOwnerStateV1 = this.#state,
  ): void {
    try {
      const snapshot = this.#makeSnapshot(requestedState);
      this.#assertCurrentOperationCommit();
      this.#state = snapshot.state;
      this.#snapshot = snapshot;
    } catch (error) {
      if (this.#state === 'active' || this.#state === 'executing') this.#state = 'failed';
      throw error;
    }
  }

  #fail(): void {
    try { this.#publish('failed'); } catch { this.#state = 'failed'; }
  }

  #rollbackPreparedReleaseBeforeMutation(planIdentity: string, stepTick: number): void {
    let executorActive = false;
    try {
      executorActive = this.#resourceOwner.getSnapshot().executorSnapshot.state === 'active';
      this.#assertCurrentOperationCommit();
    } catch {
      return;
    }
    if (!executorActive) return;
    try {
      this.#mountLifecycle.rollbackPreparedRelease({
        schemaVersion: 1,
        planIdentity,
        tick: stepTick,
        resourceExecutorState: 'active',
        rejectionPhase: 'before-resource-mutation',
      });
      this.#assertCurrentOperationCommit();
    } catch {
      // 回滚不完整时保留prepared proof，随后由sticky failed的destroy路径吸收。
    }
  }

  step(value: unknown): Promise<ArenaV2CollectionPreviewPageTransactionStepResultV1> {
    return this.#runSynchronousOperation('step', () => {
      if (this.#state === 'executing' && this.#inFlightPromise !== null) {
        const replay = exactClonedRecord(value, STEP_KEYS, 'A6.12c step replay');
        const replayCanonical = canonical(replay, 'A6.12c step replay');
        if (replayCanonical === this.#lastInputCanonical) return this.#inFlightPromise;
        throw new RangeError('A6.12c命令提交中拒绝冲突step。');
      }
      if (this.#state === 'active') this.#publish();
      if (this.#state !== 'active') throw new Error(`A6.12c step拒绝状态${this.#state}。`);
      const source = exactClonedRecord(value, STEP_KEYS, 'A6.12c step');
      if (source.schemaVersion !== 1) throw new RangeError('A6.12c step.schemaVersion必须为1。');
      const epochId = text(source.epochId, 'A6.12c step.epochId');
      const stepTick = tick(source.tick, 'A6.12c step.tick');
      const inputCanonical = canonical(source, 'A6.12c step');
      if (epochId !== this.#epochId) throw new RangeError('A6.12c step epoch漂移。');
      if (stepTick < this.#lastTick) throw new RangeError('A6.12c step tick回退。');
      if (stepTick === this.#lastTick && this.#lastInputCanonical !== null) {
        if (inputCanonical !== this.#lastInputCanonical || this.#lastStepPromise === null) {
          throw new RangeError('A6.12c同tick step事实冲突。');
        }
        return this.#lastStepPromise;
      }

    let layoutSnapshot: ArenaV2CollectionVisibleLayoutObservationSnapshotV1;
    let plan: ArenaV2CollectionVisiblePreviewLeaseCommandPlanV1;
    let planIdentity: string;
    let prepared = false;
    let plannerCommitted = false;
    try {
      layoutSnapshot = this.#layoutOwner.observe({
        schemaVersion: 1,
        epochId,
        tick: stepTick,
        screenId: source.screenId,
        viewport: source.viewport,
        readSnapshot: source.readSnapshot,
        previousActiveLeaseLedger: this.#ledger,
        contentClipRectCssPixels: source.contentClipRectCssPixels,
        slotLayouts: source.slotLayouts,
      });
      this.#assertCurrentOperationCommit();
      plan = this.#planner.plan(layoutSnapshot.plannerInput);
      this.#assertCurrentOperationCommit();
      plannerCommitted = true;
      planIdentity = createArenaV2CollectionVisiblePreviewLeaseCommandPlanIdentityV1(plan);
      this.#mountLifecycle.prepareRelease({
        schemaVersion: 1,
        planIdentity,
        tick: stepTick,
        releaseCommands: plan.releaseCommands,
      });
      this.#assertCurrentOperationCommit();
      prepared = true;
    } catch (error) {
      if (plannerCommitted) this.#fail();
      throw error;
    }

    const stepOwner = createDeferredPromiseOwner<
      ArenaV2CollectionPreviewPageTransactionStepResultV1
    >();
    const operation = stepOwner.promise;
    Reflect.apply(NATIVE_PROMISE_THEN, operation, [undefined, () => undefined]);
    this.#inFlightPromise = operation;
    let resourcePromise: Promise<ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1>;
    try {
      resourcePromise = this.#resourceOwner.execute({
        schemaVersion: 1,
        bindingSnapshot: layoutSnapshot.plannerInput.readSnapshot.formalAssetLeaseBinding,
        epochId,
        tick: stepTick,
        planIdentity,
        plan,
        previousActiveLeaseLedger: this.#ledger,
      });
      nativePromise(resourcePromise, 'A6.12c A6.11c.execute');
    } catch (error) {
      if (this.#inFlightPromise === operation) this.#inFlightPromise = null;
      this.#resourceSubmission = null;
      stepOwner.reject(error);
      if (prepared) this.#rollbackPreparedReleaseBeforeMutation(planIdentity, stepTick);
      this.#fail();
      throw error;
    }

    this.#resourceSubmission = resourcePromise;
    Reflect.apply(NATIVE_PROMISE_THEN, resourcePromise, [
      (executionResult: ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1) => {
        try {
          const result = this.#runSynchronousOperation('resource-fulfilled', () => {
            if (this.#inFlightPromise !== operation
              || this.#resourceSubmission !== resourcePromise) {
              throw new Error('A6.12c拒绝过期resource完成提交。');
            }
            if (this.#state !== 'executing') {
              throw new Error(`A6.12c resource完成时拒绝状态${this.#state}复活。`);
            }
            this.#mountLifecycle.commitRelease({
              schemaVersion: 1,
              planIdentity,
              executionResult,
            });
            this.#assertCurrentOperationCommit();
            const mountSnapshot = this.#mountLifecycle.commitExecution({
              schemaVersion: 1,
              executionResult,
              layoutSnapshot,
            });
            this.#assertCurrentOperationCommit();
            this.#ledger = plan.nextActiveLeaseLedger;
            this.#committedLayoutSnapshot = layoutSnapshot;
            const committed = Object.freeze({
              schemaVersion: 1 as const,
              status: 'production-unreachable' as const,
              implementationStatus: 'code-written-not-run' as const,
              validationStatus: 'not-run' as const,
              productionReachable: false as const,
              defaultSurfaceWired: false as const,
              epochId,
              tick: stepTick,
              screenId: plan.screenId,
              planIdentity,
              layoutSnapshot,
              plan,
              executionResult,
              mountSnapshot,
              nextActiveLeaseLedger: this.#ledger,
              resourceSettlementAwaited: false as const,
            });
            this.#publish('active');
            this.#assertCurrentOperationCommit();
            this.#inFlightPromise = null;
            this.#resourceSubmission = null;
            return committed;
          });
          stepOwner.resolve(result);
        } catch (error) {
          let failureValue = error;
          try {
            this.#runSynchronousOperation('resource-fulfilled-failure', () => {
              if (this.#inFlightPromise === operation) this.#inFlightPromise = null;
              if (this.#resourceSubmission === resourcePromise) this.#resourceSubmission = null;
              this.#fail();
            });
          } catch (closeError) {
            failureValue = new AggregateError(
              [error, closeError],
              'A6.12c resource成功后的失败关闭不完整。',
            );
            this.#state = 'failed';
          }
          stepOwner.reject(failureValue);
        }
      },
      (error: unknown) => {
        let failure = error;
        try {
          this.#runSynchronousOperation('resource-rejected', () => {
            this.#rollbackPreparedReleaseBeforeMutation(planIdentity, stepTick);
            this.#fail();
            this.#assertCurrentOperationCommit();
            if (this.#inFlightPromise === operation) this.#inFlightPromise = null;
            if (this.#resourceSubmission === resourcePromise) this.#resourceSubmission = null;
          });
        } catch (commitError) {
          failure = new AggregateError(
            [error, commitError],
            'A6.12c resource失败提交未能完整关闭。',
          );
          try {
            this.#runSynchronousOperation('resource-rejected-failure', () => {
              if (this.#inFlightPromise === operation) this.#inFlightPromise = null;
              if (this.#resourceSubmission === resourcePromise) this.#resourceSubmission = null;
              this.#fail();
            });
          } catch (closeError) {
            failure = new AggregateError(
              [failure, closeError],
              'A6.12c resource拒绝后的失败关闭不完整。',
            );
            this.#state = 'failed';
          }
        }
        stepOwner.reject(failure);
      },
    ]);
    this.#assertCurrentOperationCommit();
    this.#state = 'executing';
    this.#lastTick = stepTick;
    this.#lastScreenId = source.screenId as ArenaV2CollectionFourScreenIdV1;
    this.#lastPlanIdentity = planIdentity;
    this.#lastInputCanonical = inputCanonical;
    this.#publish('executing');
    this.#assertCurrentOperationCommit();
    this.#lastStepPromise = operation;
    return operation;
    });
  }

  getSnapshot(): ArenaV2CollectionPreviewPageTransactionSnapshotV1 {
    return this.#runSynchronousOperation('snapshot-refresh', () => {
      if (this.#state === 'active' || this.#state === 'executing') this.#publish();
      return this.#snapshot;
    });
  }

  getMountSnapshot(): ArenaV2CollectionPreviewMountLifecycleSnapshotV1 {
    return this.#runSynchronousOperation('mount-snapshot-read', () => {
      if (this.#state === 'destroyed') throw new Error('A6.12c已销毁，不再暴露mount快照。');
      const snapshot = this.#mountLifecycle.getSnapshot();
      this.#assertCurrentOperationCommit();
      return snapshot;
    });
  }

  getCurrentRenderFacts(): ArenaV2CollectionPreviewPageCurrentRenderFactsV1 | null {
    return this.#runSynchronousOperation('render-facts-read', () => {
      if (this.#state === 'active') this.#publish();
      if (this.#state !== 'active') return null;
      const layoutSnapshot = this.#committedLayoutSnapshot;
      if (layoutSnapshot === null) return null;
      const mountSnapshot = this.#mountLifecycle.getSnapshot();
      this.#assertCurrentOperationCommit();
      return Object.freeze({
        schemaVersion: 1 as const,
        epochId: this.#epochId,
        layoutTick: layoutSnapshot.tick,
        screenId: layoutSnapshot.screenId,
        layoutSnapshot,
        mountSnapshot,
      });
    });
  }

  destroy(): ArenaV2CollectionPreviewPageTransactionDestroyResultV1 {
    return this.#runSynchronousOperation('destroy', () => {
      if (this.#state === 'destroyed' && this.#destroyResult !== null) return this.#destroyResult;
      if (this.#inFlightPromise !== null || this.#state === 'executing') {
        throw new Error('A6.12c命令提交微任务运行中拒绝destroy。');
      }
      const failures: ArenaV2CollectionPreviewPageTransactionDestroyFailureV1[] = [];
      if (this.#destroyTick === null) {
        let resourceSnapshot:
          ArenaV2CollectionFormalPreviewResourceExecutionCompositionSnapshotV1 | null = null;
        try {
          resourceSnapshot = this.#resourceOwner.getSnapshot();
          rejectThenable(resourceSnapshot, 'A6.12c resource owner.getSnapshot');
          this.#assertCurrentOperationCommit();
        } catch (error) {
          throw error;
        }
        const mountSnapshot = this.#mountLifecycle.getSnapshot();
        rejectThenable(mountSnapshot, 'A6.12c mount lifecycle.getSnapshot');
        this.#assertCurrentOperationCommit();
        this.#destroyTick = Math.max(
          this.#lastTick,
          resourceSnapshot?.executorSnapshot.lastTick ?? this.#lastTick,
          mountSnapshot.lastTick,
        );
      }
      const destroyTick = this.#destroyTick;
      let proofsPrepared = this.#mountProofsPreparedForDestroy;
      if (!proofsPrepared) {
        try {
          const prepared = this.#mountLifecycle.prepareAllForOwnerDestroy({
            schemaVersion: 1,
            tick: destroyTick,
          });
          rejectThenable(prepared, 'A6.12c prepare mount proofs');
          this.#assertCurrentOperationCommit();
          proofsPrepared = prepared.state === 'destroy-prepared';
          this.#mountProofsPreparedForDestroy = proofsPrepared;
          if (!proofsPrepared) {
            failures.push(failure('prepare-mount-proofs', 'destroy-incomplete'));
          }
        } catch (error) {
          if (this.#reentryError !== null) throw error;
          failures.push(failure('prepare-mount-proofs', 'threw'));
        }
      }

      if (proofsPrepared && this.#resourceDestroyResult?.state !== 'destroyed') {
        try {
          const resourceDestroyResult = this.#resourceOwner.destroy();
          rejectThenable(resourceDestroyResult, 'A6.12c resource owner.destroy');
          this.#assertCurrentOperationCommit();
          this.#resourceDestroyResult = resourceDestroyResult;
          if (resourceDestroyResult.state !== 'destroyed') {
            failures.push(failure('destroy-resources', 'destroy-incomplete'));
          }
        } catch (error) {
          if (this.#reentryError !== null) throw error;
          failures.push(failure('destroy-resources', 'threw'));
        }
      }
      if (this.#resourceDestroyResult?.state === 'destroyed'
        && !this.#mountsFinalizedForDestroy) {
        try {
          const finalized = this.#mountLifecycle.finalizeDestroy({
            schemaVersion: 1,
            tick: destroyTick,
            resourceOwnerState: 'destroyed',
          });
          rejectThenable(finalized, 'A6.12c finalize mount proofs');
          this.#assertCurrentOperationCommit();
          const mountState = this.#mountLifecycle.state;
          this.#assertCurrentOperationCommit();
          this.#mountsFinalizedForDestroy = mountState === 'destroyed';
          if (!this.#mountsFinalizedForDestroy) {
            failures.push(failure('finalize-mounts', 'destroy-incomplete'));
          }
        } catch (error) {
          if (this.#reentryError !== null) throw error;
          failures.push(failure('finalize-mounts', 'threw'));
        }
      }

      if (this.#mountsFinalizedForDestroy && !this.#plannerDestroyed) {
        try {
          rejectThenable(this.#planner.destroy(), 'A6.12c planner.destroy');
          this.#assertCurrentOperationCommit();
          this.#plannerDestroyed = true;
        } catch (error) {
          if (this.#reentryError !== null) throw error;
          failures.push(failure('destroy-planner', 'threw'));
        }
      }
      if (this.#plannerDestroyed && !this.#layoutObserverDestroyed) {
        try {
          rejectThenable(this.#layoutOwner.destroy(), 'A6.12c layout owner.destroy');
          this.#assertCurrentOperationCommit();
          this.#layoutObserverDestroyed = true;
        } catch (error) {
          if (this.#reentryError !== null) throw error;
          failures.push(failure('destroy-layout-observer', 'threw'));
        }
      }
      const complete = failures.length === 0
        && this.#mountProofsPreparedForDestroy
        && this.#resourceDestroyResult?.state === 'destroyed'
        && this.#mountsFinalizedForDestroy
        && this.#plannerDestroyed
        && this.#layoutObserverDestroyed;
      const nextState = complete ? 'destroyed' : 'destroy-incomplete';
      this.#ledger = Object.freeze([]);
      this.#committedLayoutSnapshot = null;
      this.#inFlightPromise = null;
      this.#resourceSubmission = null;
      this.#lastStepPromise = null;
      const terminalSnapshot = this.#makeSnapshot(nextState);
      this.#assertCurrentOperationCommit();
      const result = Object.freeze({
        schemaVersion: 1 as const,
        status: 'production-unreachable' as const,
        implementationStatus: 'code-written-not-run' as const,
        validationStatus: 'not-run' as const,
        state: nextState,
        tick: destroyTick,
        resourceResult: this.#resourceDestroyResult,
        failures: Object.freeze(failures),
      });
      this.#state = nextState;
      this.#snapshot = terminalSnapshot;
      this.#destroyResult = result;
      return result;
    });
  }
}
