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
  ArenaV2CollectionPreviewPageTransactionConstructionCleanupFailureCandidateV1,
  ArenaV2CollectionPreviewPageTransactionOwnerCandidateV1,
  type ArenaV2CollectionPreviewPageTransactionDestroyResultV1,
  type ArenaV2CollectionPreviewPageTransactionSnapshotV1,
  type ArenaV2CollectionPreviewPageTransactionStepInputV1,
  type ArenaV2CollectionPreviewPageTransactionStepResultV1,
} from './arena-v2-collection-preview-page-transaction-owner-candidate-v1.js';
import {
  ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceConstructionCleanupFailureCandidateV1,
  ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceCandidateV1,
  type ArenaV2WeaponCollectionMultiSlotPreviewRenderDestroyResultV1,
  type ArenaV2WeaponCollectionMultiSlotPreviewRenderSnapshotV1,
  type ArenaV2WeaponCollectionPreviewRendererPortV1,
} from './arena-v2-weapon-collection-multi-slot-preview-render-surface-candidate-v1.js';

export const ARENA_V2_COLLECTION_PREVIEW_PAGE_SURFACE_HOST_CANDIDATE_V1 = Object.freeze({
  stage: 'A6.14' as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  ownsA6_12cPageTransaction: true as const,
  ownsA6_13RenderSurface: true as const,
  submitAwaitsResourceSettlement: false as const,
  renderTickAuthority: 'host-injected-presentation-integer-tick' as const,
  mapPagePolicy: 'empty-three-frame-clears-prior-weapon-pixels' as const,
  destroyOrder: Object.freeze(['a6.13-render-surface', 'a6.12c-page-transaction'] as const),
  constructionCleanupRetainsRetryableChildOwners: true as const,
  constructionCleanupReleasesRendererBorrowBeforePageResources: true as const,
  terminalCleanupReleasesRendererBorrowBeforePageResources: true as const,
  synchronousLifecycleOperationReentryRejected: true as const,
  swallowedChildReentryRejectedBeforeSuccessCommit: true as const,
  submissionOwnerPublishedBeforePageStep: true as const,
  submissionSettlementCommitsUnderOperationGuard: true as const,
  publicReadsRejectedDuringOperationCommit: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  pageRenderAndSnapshotCallbacksCheckedBeforeStateCommit: true as const,
  asyncChildSubmissionCapturedBeforeCommitCheck: true as const,
  destroyReentryRetainsCurrentAndLaterOwners: true as const,
  ordinaryDestroyFailureRetainsCurrentAndLaterOwners: true as const,
  constructionAndTerminalCleanupMustCompleteSynchronously: true as const,
  createsDom: false as const,
  createsRaf: false as const,
});

export type ArenaV2CollectionPreviewPageSurfaceHostStateV1 =
  | 'active'
  | 'submitting'
  | 'failed'
  | 'destroy-incomplete'
  | 'destroyed';

export interface ArenaV2CollectionPreviewPageSurfaceHostOptionsV1 {
  readonly schemaVersion: 1;
  readonly bindingSnapshot: ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1;
  readonly renderer: ArenaV2WeaponCollectionPreviewRendererPortV1;
  readonly underlyingLoader?: unknown;
}

export interface ArenaV2CollectionPreviewPageSurfaceRenderInputV1 {
  readonly schemaVersion: 1;
  readonly presentationTick: number;
  readonly pixelRatio: number;
}

export interface ArenaV2CollectionPreviewPageSurfaceHostSnapshotV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly hardGate: false;
  readonly defaultSurfaceWired: false;
  readonly state: ArenaV2CollectionPreviewPageSurfaceHostStateV1;
  readonly page: ArenaV2CollectionPreviewPageTransactionSnapshotV1;
  readonly render: ArenaV2WeaponCollectionMultiSlotPreviewRenderSnapshotV1;
  readonly currentPageRenderable: boolean;
  readonly submitAwaitsResourceSettlement: false;
  readonly createsDom: false;
  readonly createsRaf: false;
}

export interface ArenaV2CollectionPreviewPageSurfaceHostDestroyResultV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly state: 'destroyed' | 'destroy-incomplete';
  readonly destroyOrder: readonly ['a6.13-render-surface', 'a6.12c-page-transaction'];
  readonly renderResult: ArenaV2WeaponCollectionMultiSlotPreviewRenderDestroyResultV1 | null;
  readonly pageResult: ArenaV2CollectionPreviewPageTransactionDestroyResultV1 | null;
  readonly failurePhases: readonly ('a6.13-render-surface' | 'a6.12c-page-transaction')[];
}

const OPTION_KEYS = new Set(['schemaVersion', 'bindingSnapshot', 'renderer', 'underlyingLoader']);
const OPTION_REQUIRED_KEYS = new Set(['schemaVersion', 'bindingSnapshot', 'renderer']);
const RENDER_KEYS = new Set(['schemaVersion', 'presentationTick', 'pixelRatio']);
const NATIVE_PROMISE_THEN = Promise.prototype.then;

function isPageSurfaceHostState(
  value: ArenaV2CollectionPreviewPageSurfaceHostStateV1,
  expected: ArenaV2CollectionPreviewPageSurfaceHostStateV1,
): boolean {
  return value === expected;
}

function captureOptions(value: unknown): PlainRecord {
  const source = assertPlainRecord(value, 'A6.14 constructor');
  assertKnownKeys(source, OPTION_KEYS, 'A6.14 constructor');
  for (const key of OPTION_REQUIRED_KEYS) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`A6.14 constructor缺少${key}。`);
  }
  const output: PlainRecord = {};
  for (const key of OPTION_KEYS) {
    if (!Object.hasOwn(source, key)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (descriptor === undefined || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`A6.14 constructor.${key}必须是数据字段。`);
    }
    output[key] = descriptor.value;
  }
  return output;
}

function exactClonedRecord(value: unknown, keys: ReadonlySet<string>, name: string): PlainRecord {
  const source = assertPlainRecord(cloneFrozenData(value, name), name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  return source;
}

function nonNegativeInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name}必须是非负安全整数。`);
  }
  return value as number;
}

function pixelRatio(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0.5 || value > 2) {
    throw new RangeError('A6.14 pixelRatio必须位于0.5..2。');
  }
  return value;
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

interface DeferredPromiseOwnerV1<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason: unknown) => void;
}

function createDeferredPromiseOwner<T>(): Readonly<DeferredPromiseOwnerV1<T>> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return Object.freeze({ promise, resolve, reject });
}

interface ConstructionCleanupResourcesV1 {
  readonly renderSurface: ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceCandidateV1 | null;
  renderConstructionDebt:
    ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceConstructionCleanupFailureCandidateV1 | null;
  readonly page: ArenaV2CollectionPreviewPageTransactionOwnerCandidateV1 | null;
  pageConstructionDebt:
    ArenaV2CollectionPreviewPageTransactionConstructionCleanupFailureCandidateV1 | null;
  renderResult: ArenaV2WeaponCollectionMultiSlotPreviewRenderDestroyResultV1 | null;
  pageResult: ArenaV2CollectionPreviewPageTransactionDestroyResultV1 | null;
}

function constructionCleanupComplete(resources: ConstructionCleanupResourcesV1): boolean {
  return (resources.renderSurface === null || resources.renderResult?.state === 'destroyed')
    && resources.renderConstructionDebt === null
    && (resources.page === null || resources.pageResult?.state === 'destroyed')
    && resources.pageConstructionDebt === null;
}

function cleanupConstructionResources(resources: ConstructionCleanupResourcesV1): void {
  if (resources.renderSurface !== null && resources.renderResult?.state !== 'destroyed') {
    const result = resources.renderSurface.destroy();
    rejectThenable(result, 'A6.14 construction render surface.destroy');
    resources.renderResult = result;
    if (resources.renderResult.state !== 'destroyed') {
      throw new Error('A6.14构造回滚时A6.13清理不完整。');
    }
  }
  if (resources.renderConstructionDebt !== null) {
    rejectThenable(
      resources.renderConstructionDebt.retryCleanup(),
      'A6.14 construction render debt.retryCleanup',
    );
    if (resources.renderConstructionDebt.cleanupComplete) {
      resources.renderConstructionDebt = null;
    } else {
      throw new Error('A6.14构造回滚时A6.13构造债务清理不完整。');
    }
  }
  const rendererBorrowReleased = resources.renderSurface === null
    || resources.renderResult?.state === 'destroyed';
  const allRendererBorrowsReleased = rendererBorrowReleased
    && resources.renderConstructionDebt === null;
  if (allRendererBorrowsReleased
    && resources.page !== null
    && resources.pageResult?.state !== 'destroyed') {
    const result = resources.page.destroy();
    rejectThenable(result, 'A6.14 construction page transaction.destroy');
    resources.pageResult = result;
    if (resources.pageResult.state !== 'destroyed') {
      throw new Error('A6.14构造回滚时A6.12c清理不完整。');
    }
  }
  if (allRendererBorrowsReleased && resources.pageConstructionDebt !== null) {
    rejectThenable(
      resources.pageConstructionDebt.retryCleanup(),
      'A6.14 construction page debt.retryCleanup',
    );
    if (resources.pageConstructionDebt.cleanupComplete) {
      resources.pageConstructionDebt = null;
    } else {
      throw new Error('A6.14构造回滚时A6.12c构造债务清理不完整。');
    }
  }
  if (!constructionCleanupComplete(resources)) {
    throw new Error('A6.14构造资源清理依赖尚未收敛。');
  }
}

export class ArenaV2CollectionPreviewPageSurfaceHostConstructionCleanupFailureCandidateV1
  extends AggregateError {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly #resources: ConstructionCleanupResourcesV1;

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    resources: ConstructionCleanupResourcesV1,
  ) {
    super([originalError, cleanupError], 'A6.14构造失败且反向清理不完整。');
    this.name = 'ArenaV2CollectionPreviewPageSurfaceHostConstructionCleanupFailureCandidateV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#resources = resources;
  }

  get cleanupComplete(): boolean { return constructionCleanupComplete(this.#resources); }

  get ownsRendererBorrow(): boolean {
    return this.#resources.renderSurface !== null
      || this.#resources.renderConstructionDebt !== null;
  }

  retryCleanup(): void { cleanupConstructionResources(this.#resources); }
}

function throwConstructionFailure(
  primary: unknown,
  renderSurface: ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceCandidateV1 | null,
  renderConstructionDebt:
    ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceConstructionCleanupFailureCandidateV1
    | null,
  page: ArenaV2CollectionPreviewPageTransactionOwnerCandidateV1 | null,
  pageConstructionDebt:
    ArenaV2CollectionPreviewPageTransactionConstructionCleanupFailureCandidateV1 | null,
): never {
  const resources: ConstructionCleanupResourcesV1 = {
    renderSurface,
    renderConstructionDebt,
    page,
    pageConstructionDebt,
    renderResult: null,
    pageResult: null,
  };
  try {
    cleanupConstructionResources(resources);
  } catch (cleanupError) {
    throw new ArenaV2CollectionPreviewPageSurfaceHostConstructionCleanupFailureCandidateV1(
      primary,
      cleanupError,
      resources,
    );
  }
  throw primary;
}

export class ArenaV2CollectionPreviewPageSurfaceHostCandidateV1 {
  readonly #page: ArenaV2CollectionPreviewPageTransactionOwnerCandidateV1;
  readonly #renderSurface: ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceCandidateV1;
  #state: ArenaV2CollectionPreviewPageSurfaceHostStateV1 = 'active';
  #submission: Promise<ArenaV2CollectionPreviewPageTransactionStepResultV1> | null = null;
  #lastSubmissionPromise: Promise<ArenaV2CollectionPreviewPageTransactionStepResultV1> | null = null;
  #childSubmission:
    Promise<ArenaV2CollectionPreviewPageTransactionStepResultV1> | null = null;
  #lastChildSubmissionPromise:
    Promise<ArenaV2CollectionPreviewPageTransactionStepResultV1> | null = null;
  #snapshot: ArenaV2CollectionPreviewPageSurfaceHostSnapshotV1;
  #destroyResult: ArenaV2CollectionPreviewPageSurfaceHostDestroyResultV1 | null = null;
  #renderDestroyResult: ArenaV2WeaponCollectionMultiSlotPreviewRenderDestroyResultV1 | null = null;
  #pageDestroyResult: ArenaV2CollectionPreviewPageTransactionDestroyResultV1 | null = null;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(value: unknown) {
    const source = captureOptions(value);
    if (source.schemaVersion !== 1) throw new RangeError('A6.14 constructor.schemaVersion必须为1。');
    let page: ArenaV2CollectionPreviewPageTransactionOwnerCandidateV1 | null = null;
    let pageConstructionDebt:
      ArenaV2CollectionPreviewPageTransactionConstructionCleanupFailureCandidateV1 | null = null;
    let renderSurface: ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceCandidateV1 | null = null;
    let renderConstructionDebt:
      ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceConstructionCleanupFailureCandidateV1
      | null = null;
    try {
      page = new ArenaV2CollectionPreviewPageTransactionOwnerCandidateV1(
        Object.hasOwn(source, 'underlyingLoader')
          ? {
            schemaVersion: 1,
            bindingSnapshot: source.bindingSnapshot,
            underlyingLoader: source.underlyingLoader,
          }
          : { schemaVersion: 1, bindingSnapshot: source.bindingSnapshot },
      );
      renderSurface = new ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceCandidateV1({
        schemaVersion: 1,
        renderer: source.renderer,
      });
      this.#page = page;
      this.#renderSurface = renderSurface;
      this.#snapshot = this.#runSynchronousOperation(
        'constructor-snapshot',
        () => this.#makeSnapshot(),
      );
    } catch (error) {
      if (error
        instanceof ArenaV2CollectionPreviewPageTransactionConstructionCleanupFailureCandidateV1) {
        pageConstructionDebt = error;
      }
      if (error
        instanceof ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceConstructionCleanupFailureCandidateV1) {
        renderConstructionDebt = error;
      }
      throwConstructionFailure(
        error,
        renderSurface,
        renderConstructionDebt,
        page,
        pageConstructionDebt,
      );
    }
  }

  get state(): ArenaV2CollectionPreviewPageSurfaceHostStateV1 {
    this.#assertNoOperation('state read');
    return this.#state;
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation !== null) {
      const error = new Error(`A6.14 ${this.#operation}期间拒绝${operation}。`);
      this.#reentrySequence += 1;
      this.#reentryError ??= error;
      throw this.#reentryError;
    }
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) throw new Error('A6.14缺少当前操作所有权。');
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runSynchronousOperation<T>(operation: string, run: () => T): T {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    let failed = false;
    let failure: unknown = null;
    let result!: T;
    try {
      result = run();
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      if (this.#operation === operation) this.#operation = null;
    }
    const reentryError = this.#reentryError;
    this.#reentryError = null;
    if (reentryError !== null) {
      this.#state = 'failed';
      throw failed && failure !== reentryError
        ? new AggregateError([failure, reentryError], `A6.14 ${operation}失败且同步重入。`)
        : reentryError;
    }
    if (failed) throw failure;
    return result;
  }

  #makeSnapshot(
    requestedState: ArenaV2CollectionPreviewPageSurfaceHostStateV1 = this.#state,
  ): ArenaV2CollectionPreviewPageSurfaceHostSnapshotV1 {
    const page = this.#page.getSnapshot();
    this.#assertCurrentOperationCommit();
    const render = this.#renderSurface.getSnapshot();
    this.#assertCurrentOperationCommit();
    const currentPageRenderable = this.#page.getCurrentRenderFacts() !== null;
    this.#assertCurrentOperationCommit();
    const state = (requestedState === 'active' || requestedState === 'submitting')
      && (page.state === 'failed' || render.state === 'failed')
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
      page,
      render,
      currentPageRenderable,
      submitAwaitsResourceSettlement: false as const,
      createsDom: false as const,
      createsRaf: false as const,
    });
  }

  #publish(
    requestedState: ArenaV2CollectionPreviewPageSurfaceHostStateV1 = this.#state,
  ): void {
    try {
      const snapshot = this.#makeSnapshot(requestedState);
      this.#assertCurrentOperationCommit();
      this.#state = snapshot.state;
      this.#snapshot = snapshot;
    } catch (error) {
      if (this.#state === 'active' || this.#state === 'submitting') this.#state = 'failed';
      throw error;
    }
  }

  #fail(): void {
    try { this.#publish('failed'); } catch { this.#state = 'failed'; }
  }

  #attachChildSubmissionSettlement(
    operation: Promise<ArenaV2CollectionPreviewPageTransactionStepResultV1>,
    childSubmission: Promise<ArenaV2CollectionPreviewPageTransactionStepResultV1>,
    submissionOwner: Readonly<DeferredPromiseOwnerV1<
      ArenaV2CollectionPreviewPageTransactionStepResultV1
    >>,
  ): void {
    Reflect.apply(NATIVE_PROMISE_THEN, childSubmission, [
      (result: ArenaV2CollectionPreviewPageTransactionStepResultV1) => {
        try {
          this.#runSynchronousOperation('submission-fulfilled', () => {
            if (this.#submission !== operation) return;
            if (this.#state !== 'submitting') {
              throw new Error(`A6.14 submission完成时拒绝状态${this.#state}复活。`);
            }
            const pageState = this.#page.state;
            this.#assertCurrentOperationCommit();
            this.#publish(pageState === 'active' ? 'active' : 'failed');
            this.#assertCurrentOperationCommit();
            if (!isPageSurfaceHostState(this.#state, 'active')) {
              throw new Error('A6.14 A6.12c完成后未回到active。');
            }
            this.#submission = null;
            this.#childSubmission = null;
          });
          submissionOwner.resolve(result);
        } catch (error) {
          let failure = error;
          try {
            this.#runSynchronousOperation('submission-fulfilled-failure', () => {
              if (this.#submission === operation) this.#submission = null;
              if (this.#childSubmission === childSubmission) this.#childSubmission = null;
              this.#fail();
            });
          } catch (closeError) {
            failure = new AggregateError(
              [error, closeError],
              'A6.14 submission成功后的失败关闭不完整。',
            );
            this.#state = 'failed';
          }
          submissionOwner.reject(failure);
        }
      },
      (error: unknown) => {
        let failure = error;
        try {
          this.#runSynchronousOperation('submission-rejected', () => {
            if (this.#submission !== operation) return;
            this.#publish('failed');
            this.#assertCurrentOperationCommit();
            this.#submission = null;
            this.#childSubmission = null;
          });
        } catch (commitError) {
          failure = new AggregateError(
            [error, commitError],
            'A6.14 submission失败提交未能完整关闭。',
          );
          try {
            this.#runSynchronousOperation('submission-rejected-failure', () => {
              if (this.#submission === operation) this.#submission = null;
              if (this.#childSubmission === childSubmission) this.#childSubmission = null;
              this.#fail();
            });
          } catch (closeError) {
            failure = new AggregateError(
              [failure, closeError],
              'A6.14 submission拒绝后的失败关闭不完整。',
            );
            this.#state = 'failed';
          }
        }
        submissionOwner.reject(failure);
      },
    ]);
  }

  submitPage(
    value: ArenaV2CollectionPreviewPageTransactionStepInputV1,
  ): Promise<ArenaV2CollectionPreviewPageTransactionStepResultV1> {
    return this.#runSynchronousOperation('submit-page', () => {
      if (this.#state === 'active') this.#publish();
      if (this.#state !== 'active' && this.#state !== 'submitting') {
        throw new Error(`A6.14 submitPage拒绝状态${this.#state}。`);
      }
      if (this.#submission !== null) {
        const activeSubmission = this.#submission;
        let replayPromise: Promise<ArenaV2CollectionPreviewPageTransactionStepResultV1>;
        try {
          replayPromise = this.#page.step(value);
          this.#assertCurrentOperationCommit();
          nativePromise(replayPromise, 'A6.14 A6.12c.step replay');
          this.#assertCurrentOperationCommit();
        } catch (error) {
          this.#fail();
          throw error;
        }
        if (replayPromise !== this.#childSubmission) {
          this.#fail();
          throw new Error('A6.14 A6.12c运行中返回了冲突submission Promise。');
        }
        return activeSubmission;
      }

      const submissionOwner = createDeferredPromiseOwner<
        ArenaV2CollectionPreviewPageTransactionStepResultV1
      >();
      const operation = submissionOwner.promise;
      Reflect.apply(NATIVE_PROMISE_THEN, operation, [undefined, () => undefined]);
      this.#submission = operation;
      this.#state = 'submitting';
      let childSubmission: Promise<ArenaV2CollectionPreviewPageTransactionStepResultV1>;
      try {
        childSubmission = this.#page.step(value);
        nativePromise(childSubmission, 'A6.14 A6.12c.step');
      } catch (error) {
        if (this.#submission === operation) this.#submission = null;
        this.#childSubmission = null;
        submissionOwner.reject(error);
        if (this.#reentryError === null) {
          const pageState = this.#page.state;
          this.#assertCurrentOperationCommit();
          this.#publish(pageState === 'active' ? 'active' : 'failed');
        }
        throw error;
      }

      this.#childSubmission = childSubmission;
      this.#attachChildSubmissionSettlement(operation, childSubmission, submissionOwner);
      this.#assertCurrentOperationCommit();

      if (childSubmission === this.#lastChildSubmissionPromise
        && this.#lastSubmissionPromise !== null) {
        const previousSubmission = this.#lastSubmissionPromise;
        const pageState = this.#page.state;
        this.#assertCurrentOperationCommit();
        this.#publish(pageState === 'active' ? 'active' : 'failed');
        this.#assertCurrentOperationCommit();
        if (this.#submission === operation) this.#submission = null;
        this.#childSubmission = null;
        return previousSubmission;
      }

      this.#publish('submitting');
      this.#assertCurrentOperationCommit();
      this.#lastChildSubmissionPromise = childSubmission;
      this.#lastSubmissionPromise = operation;
      return operation;
    });
  }

  renderCurrent(value: ArenaV2CollectionPreviewPageSurfaceRenderInputV1):
    ArenaV2WeaponCollectionMultiSlotPreviewRenderSnapshotV1 {
    return this.#runSynchronousOperation('render-current', () => {
      if (this.#state === 'active') this.#publish();
      if (this.#state !== 'active') {
        throw new Error(`A6.14 renderCurrent拒绝状态${this.#state}。`);
      }
      const source = exactClonedRecord(value, RENDER_KEYS, 'A6.14 renderCurrent');
      if (source.schemaVersion !== 1) throw new RangeError('A6.14 render.schemaVersion必须为1。');
      const facts = this.#page.getCurrentRenderFacts();
      this.#assertCurrentOperationCommit();
      if (facts === null) throw new Error('A6.14当前没有已提交页面可供渲染。');
      try {
        const rendered = this.#renderSurface.render({
          schemaVersion: 1,
          epochId: facts.epochId,
          tick: nonNegativeInteger(source.presentationTick, 'A6.14 presentationTick'),
          screenId: facts.screenId,
          viewport: facts.layoutSnapshot.mountViewport,
          pixelRatio: pixelRatio(source.pixelRatio),
          contentClipRectCssPixels: facts.layoutSnapshot.contentClipRectCssPixels,
          mounts: facts.mountSnapshot.activeMounts,
        });
        this.#assertCurrentOperationCommit();
        this.#publish();
        this.#assertCurrentOperationCommit();
        return rendered;
      } catch (error) {
        if (this.#reentryError === null) {
          const renderState = this.#renderSurface.state;
          this.#assertCurrentOperationCommit();
          const pageState = this.#page.state;
          this.#assertCurrentOperationCommit();
          try {
            this.#publish(renderState === 'active' && pageState === 'active'
              ? 'active'
              : 'failed');
          } catch { this.#state = 'failed'; }
        }
        throw error;
      }
    });
  }

  getSnapshot(): ArenaV2CollectionPreviewPageSurfaceHostSnapshotV1 {
    return this.#runSynchronousOperation('snapshot-refresh', () => {
      if (this.#state === 'active' || this.#state === 'submitting') this.#publish();
      return this.#snapshot;
    });
  }

  destroy(): ArenaV2CollectionPreviewPageSurfaceHostDestroyResultV1 {
    return this.#runSynchronousOperation('destroy', () => {
      if (this.#state === 'destroyed' && this.#destroyResult !== null) {
        return this.#destroyResult;
      }
      if (this.#submission !== null) throw new Error('A6.14 submission微任务运行中拒绝destroy。');
      const failurePhases: ('a6.13-render-surface' | 'a6.12c-page-transaction')[] = [];
      if (this.#renderDestroyResult?.state !== 'destroyed') {
        try {
          const renderDestroyResult = this.#renderSurface.destroy();
          rejectThenable(renderDestroyResult, 'A6.14 render surface.destroy');
          this.#assertCurrentOperationCommit();
          this.#renderDestroyResult = renderDestroyResult;
          if (renderDestroyResult.state !== 'destroyed') {
            failurePhases.push('a6.13-render-surface');
          }
        } catch (error) {
          if (this.#reentryError !== null) throw error;
          failurePhases.push('a6.13-render-surface');
        }
      }
      if (this.#renderDestroyResult?.state === 'destroyed'
        && this.#pageDestroyResult?.state !== 'destroyed') {
        try {
          const pageDestroyResult = this.#page.destroy();
          rejectThenable(pageDestroyResult, 'A6.14 page transaction.destroy');
          this.#assertCurrentOperationCommit();
          this.#pageDestroyResult = pageDestroyResult;
          if (pageDestroyResult.state !== 'destroyed') {
            failurePhases.push('a6.12c-page-transaction');
          }
        } catch (error) {
          if (this.#reentryError !== null) throw error;
          failurePhases.push('a6.12c-page-transaction');
        }
      }
      const complete = failurePhases.length === 0
        && this.#renderDestroyResult?.state === 'destroyed'
        && this.#pageDestroyResult?.state === 'destroyed';
      const nextState = complete ? 'destroyed' : 'destroy-incomplete';
      const snapshot = this.#makeSnapshot(nextState);
      this.#assertCurrentOperationCommit();
      const result = Object.freeze({
        schemaVersion: 1 as const,
        status: 'production-unreachable' as const,
        implementationStatus: 'code-written-not-run' as const,
        validationStatus: 'not-run' as const,
        state: nextState,
        destroyOrder: Object.freeze([
          'a6.13-render-surface',
          'a6.12c-page-transaction',
        ] as const),
        renderResult: this.#renderDestroyResult,
        pageResult: this.#pageDestroyResult,
        failurePhases: Object.freeze(failurePhases),
      });
      this.#state = nextState;
      this.#snapshot = snapshot;
      this.#destroyResult = result;
      return result;
    });
  }
}
