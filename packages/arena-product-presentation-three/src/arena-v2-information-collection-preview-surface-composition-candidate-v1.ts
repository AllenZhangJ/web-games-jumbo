import {
  assertSynchronousReturn as rejectThenable,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaV2InformationScreenPipelineResultV1,
  ArenaV2InformationSelectionProjectionCandidateV1,
  ArenaV2UiRenderPlanV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  GltfPresentationAssetLoader,
} from '@number-strategy-jump/arena-presentation-three';
import {
  ArenaV2CollectionFourScreenReadOwnerCandidateV1,
} from './arena-v2-collection-four-screen-read-owner-candidate-v1.js';
import {
  ArenaV2CollectionPreviewPageSurfaceHostConstructionCleanupFailureCandidateV1,
  ArenaV2CollectionPreviewPageSurfaceHostCandidateV1,
  type ArenaV2CollectionPreviewPageSurfaceHostSnapshotV1,
} from './arena-v2-collection-preview-page-surface-host-candidate-v1.js';
import {
  ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1,
  type ArenaV2CollectionPreviewRenderPlanLayoutBridgeResultV1,
} from './arena-v2-collection-preview-render-plan-layout-bridge-candidate-v1.js';
import type {
  ArenaV2A6WeaponPreviewViewportV1,
} from './arena-v2-weapon-collection-preview-three-mount-owner-candidate-v1.js';
import type {
  ArenaV2WeaponCollectionPreviewRendererPortV1,
} from './arena-v2-weapon-collection-multi-slot-preview-render-surface-candidate-v1.js';

export const ARENA_V2_INFORMATION_COLLECTION_PREVIEW_SURFACE_COMPOSITION_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    stage: 'A6.16' as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    ownsA6_8ReadOwner: true as const,
    ownsA6_15LayoutBridge: true as const,
    lazilyOwnsA6_14PageSurfaceHost: true as const,
    lazilyCreatesRendererAfterFirstValidCollectionFrame: true as const,
    currentProductionApprovedPreviewAssetCount: 0 as const,
    currentCollectionFramesCreatePreviewHost: false as const,
    createsDom: false as const,
    createsRaf: false as const,
    pollsResources: false as const,
    addsPages: false as const,
    addsActions: false as const,
    forwardsActionRevealWithoutOwningLayout: true as const,
    forwardsPrimitiveRevealWithoutOwningLayout: true as const,
    constructionRollbackRetainsHostAndRendererCleanupOwnership: true as const,
    unpublishedPageSurfaceHostPublishedBeforeParentCommitCheck: true as const,
    pageSurfaceHostOwnershipTransferPrecedesRendererOrphanRelease: true as const,
    constructorRollbackReleasesDefaultLoaderAndStaticOwners: true as const,
    disposalUsesDependencyOrderedCompletionWatermarks: true as const,
    orphanRendererDisposeWaitsForScissorDisable: true as const,
    underlyingSurfaceWaitsForPreviewResourceCleanup: true as const,
    defaultUnderlyingLoaderOwnedUntilPreviewResourcesRelease: true as const,
    defaultUnderlyingLoaderAcceptsCancellableAssetReadAndImagePorts: true as const,
    defaultUnderlyingLoaderShutdownRequestedBeforePreviewTaskSettlementWait: true as const,
    lateLoaderSettlementNotificationSuppressedAfterDestroy: true as const,
    underlyingSurfaceWaitsForLoaderCleanup: true as const,
    disposeReentrancyRejected: true as const,
    synchronousLifecycleOperationReentryRejected: true as const,
    swallowedHostReentryRejectedBeforeSuccessCommit: true as const,
    submissionOwnerPublishedBeforePreviewHostSubmit: true as const,
    submissionSettlementCommitsUnderOperationGuard: true as const,
    resourceRedrawCallbackCommitsUnderOperationGuard: true as const,
    resourceRedrawCancelOwnerPublishedBeforeParentCommitCheck: true as const,
    rejectedResourceRedrawCancelFailureRetainsRetryOwnership: true as const,
    scrollRefreshReusesCurrentRevealOperation: true as const,
    publicReadsRejectedDuringOperationCommit: true as const,
    stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
    surfaceContextPreviewAndObserverCallbacksCheckedBeforeStateCommit: true as const,
    asyncSubmissionOwnersCapturedBeforeChildStart: true as const,
    childSnapshotsCheckedBeforeAggregatePublication: true as const,
    cleanupReentryRetainsCurrentAndLaterOwners: true as const,
    ordinaryCleanupFailureRetainsCurrentAndLaterOwners: true as const,
    cleanupCallbacksMustCompleteSynchronously: true as const,
  });

export type ArenaV2InformationCollectionPreviewSurfaceCompositionStateV1 =
  | 'created'
  | 'ready'
  | 'active'
  | 'failed'
  | 'dispose-pending'
  | 'disposed';

export interface ArenaV2InformationCollectionPreviewSurfacePortV1 {
  readonly scrollOffsetCssPixels: number;
  load(): unknown;
  bindIntent(value: unknown): unknown;
  bindScrollOffset(onChange: (offsetCssPixels: number) => unknown): () => void;
  revealActionPrimitive?(primitiveId: unknown): unknown;
  revealPrimitive?(primitiveId: unknown): unknown;
  render(plan: ArenaV2UiRenderPlanV1): unknown;
  dispose(): unknown;
}

export interface ArenaV2InformationCollectionPreviewContextRequestV1 {
  readonly schemaVersion: 1;
  readonly epochId: string;
  readonly tick: number;
  readonly sourceRenderPlan: ArenaV2UiRenderPlanV1;
}

export interface ArenaV2InformationCollectionPreviewContextV1 {
  readonly schemaVersion: 1;
  readonly readInput: unknown;
  readonly pipelineResult: ArenaV2InformationScreenPipelineResultV1;
  readonly authoritativeSourceRenderPlan?: ArenaV2UiRenderPlanV1;
  readonly selectionProjection: ArenaV2InformationSelectionProjectionCandidateV1 | null;
  readonly viewport: ArenaV2A6WeaponPreviewViewportV1;
  readonly pixelRatio: number;
}

export interface ArenaV2InformationCollectionPreviewSurfaceCompositionOptionsV1 {
  readonly schemaVersion: 1;
  readonly epochId: string;
  readonly surface: ArenaV2InformationCollectionPreviewSurfacePortV1;
  readonly rendererFactory: () => ArenaV2WeaponCollectionPreviewRendererPortV1;
  readonly contextProvider: (
    request: ArenaV2InformationCollectionPreviewContextRequestV1,
  ) => ArenaV2InformationCollectionPreviewContextV1 | null;
  readonly setPreviewVisible: (visible: boolean) => unknown;
  readonly scheduleAfterResourceSettlement: (callback: () => void) => () => void;
  readonly onFailure?: (error: unknown) => unknown;
  readonly underlyingLoader?: unknown;
  readonly readAssetBytes?: unknown;
  readonly createImage?: unknown;
}

export interface ArenaV2InformationCollectionPreviewSurfaceCompositionSnapshotV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly validationStatus: 'not-run';
  readonly state: ArenaV2InformationCollectionPreviewSurfaceCompositionStateV1;
  readonly epochId: string;
  readonly lastReadTick: number;
  readonly lastPresentationTick: number;
  readonly lastFixedViewportId: ArenaV2A6WeaponPreviewViewportV1['viewportId'] | null;
  readonly collectionPageVisible: boolean;
  readonly hasPreviewHost: boolean;
  readonly hasPreviewHostConstructionCleanupDebt: boolean;
  readonly commandSubmissionInFlight: boolean;
  readonly queuedFramePresent: boolean;
  readonly resourceRedrawScheduled: boolean;
  readonly rendererFactoryInvoked: boolean;
  readonly rendererCreated: boolean;
  readonly rendererOwnershipTransferred: boolean;
  readonly previewHiddenForDispose: boolean;
  readonly scrollObserverReleased: boolean;
  readonly surfaceDisposed: boolean;
  readonly layoutBridgeDestroyed: boolean;
  readonly readOwnerDestroyed: boolean;
  readonly notifyingLoaderDestroyed: boolean;
  readonly notifyingLoaderShutdownRequested: boolean;
  readonly orphanRendererCleanupComplete: boolean;
  readonly rawOrphanRendererRetainedForCleanup: boolean;
  readonly previewHost: ArenaV2CollectionPreviewPageSurfaceHostSnapshotV1 | null;
  readonly createsDom: false;
  readonly createsRaf: false;
  readonly pollsResources: false;
}

interface PreparedFrameV1 {
  readonly tick: number;
  readonly pixelRatio: number;
  readonly bridge: ArenaV2CollectionPreviewRenderPlanLayoutBridgeResultV1;
  readonly readSnapshot: ReturnType<ArenaV2CollectionFourScreenReadOwnerCandidateV1['consume']>;
}

type UnknownMethod = (...args: readonly unknown[]) => unknown;
const NATIVE_PROMISE_THEN = Promise.prototype.then;
const MAX_PENDING_EXTERNAL_SCROLL_OFFSETS = 32;

function attachNativePromiseHandlers(
  value: unknown,
  onFulfilled: (value: unknown) => unknown,
  onRejected: (reason: unknown) => unknown,
): boolean {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return false;
  try {
    Reflect.apply(NATIVE_PROMISE_THEN, value, [onFulfilled, onRejected]);
    return true;
  } catch {
    return false;
  }
}

function nonEmptyText(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name}必须是非空字符串。`);
  }
  return value;
}

function safePixelRatio(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0.5 || value > 2) {
    throw new RangeError('A6.16 pixelRatio必须位于0.5..2。');
  }
  return value;
}

function nextTick(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < -1 || value >= Number.MAX_SAFE_INTEGER) {
    throw new RangeError(`${name}耗尽安全整数tick。`);
  }
  return value + 1;
}

function method(value: unknown, key: string, name: string): UnknownMethod {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    throw new TypeError(`${name}必须是对象。`);
  }
  let cursor: object | null = value as object;
  const visited = new Set<object>();
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) throw new TypeError(`${name}原型链无效。`);
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, key);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${key}必须是数据方法。`);
      }
      const callable = descriptor.value as UnknownMethod;
      return (...args: readonly unknown[]) => Reflect.apply(callable, value, args);
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  throw new TypeError(`${name}缺少${key}()。`);
}

function nativePromise<T>(value: unknown, name: string): asserts value is Promise<T> {
  if (!attachNativePromiseHandlers(value, () => undefined, () => undefined)) {
    throw new TypeError(`${name}必须是原生Promise。`);
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

class SettlementNotifyingLoaderV1 {
  readonly #load: UnknownMethod;
  readonly #notify: () => void;
  readonly #ownedLoader: GltfPresentationAssetLoader | null;
  #destroyRequested = false;

  constructor(
    loader: unknown,
    notify: () => void,
    ownedLoader: GltfPresentationAssetLoader | null,
  ) {
    this.#load = method(loader, 'load', 'A6.16 underlying loader');
    this.#notify = notify;
    this.#ownedLoader = ownedLoader;
  }

  load(value: unknown): unknown {
    if (this.#destroyRequested) throw new Error('A6.16 notifying loader已请求销毁。');
    const result = this.#load(value);
    const notifyIfActive = () => {
      if (!this.#destroyRequested) this.#notify();
    };
    if (attachNativePromiseHandlers(result, notifyIfActive, notifyIfActive)) return result;
    rejectThenable(result, 'A6.16 underlying loader.load');
    notifyIfActive();
    return result;
  }

  destroy(): void {
    this.#destroyRequested = true;
    this.#ownedLoader?.destroy();
  }

  isCleanupComplete(): boolean {
    return this.#ownedLoader === null || this.#ownedLoader.isCleanupComplete();
  }
}

class DisposeOnceRendererPortV1 implements ArenaV2WeaponCollectionPreviewRendererPortV1 {
  readonly #setPixelRatio: UnknownMethod;
  readonly #setSize: UnknownMethod;
  readonly #clear: UnknownMethod;
  readonly #setScissorTest: UnknownMethod;
  readonly #setViewport: UnknownMethod;
  readonly #setScissor: UnknownMethod;
  readonly #clearDepth: UnknownMethod;
  readonly #render: UnknownMethod;
  readonly #dispose: UnknownMethod;
  #scissorDisabledForDispose = false;
  #disposed = false;

  get disposed(): boolean { return this.#disposed; }

  constructor(renderer: unknown) {
    this.#setPixelRatio = method(renderer, 'setPixelRatio', 'A6.16 rendererFactory result');
    this.#setSize = method(renderer, 'setSize', 'A6.16 rendererFactory result');
    this.#clear = method(renderer, 'clear', 'A6.16 rendererFactory result');
    this.#setScissorTest = method(renderer, 'setScissorTest', 'A6.16 rendererFactory result');
    this.#setViewport = method(renderer, 'setViewport', 'A6.16 rendererFactory result');
    this.#setScissor = method(renderer, 'setScissor', 'A6.16 rendererFactory result');
    this.#clearDepth = method(renderer, 'clearDepth', 'A6.16 rendererFactory result');
    this.#render = method(renderer, 'render', 'A6.16 rendererFactory result');
    this.#dispose = method(renderer, 'dispose', 'A6.16 rendererFactory result');
  }

  #call(operation: string, callable: UnknownMethod, args: readonly unknown[]): void {
    if (this.#disposed) throw new Error(`A6.16 renderer已销毁，拒绝${operation}。`);
    const result = callable(...args);
    rejectThenable(result, `A6.16 renderer.${operation}`);
    if (result !== undefined) throw new TypeError(`A6.16 renderer.${operation}必须返回void。`);
  }

  setPixelRatio(value: number): void { this.#call('setPixelRatio', this.#setPixelRatio, [value]); }
  setSize(width: number, height: number, updateStyle: false): void {
    this.#call('setSize', this.#setSize, [width, height, updateStyle]);
  }
  clear(): void { this.#call('clear', this.#clear, []); }
  setScissorTest(enabled: boolean): void {
    this.#call('setScissorTest', this.#setScissorTest, [enabled]);
    this.#scissorDisabledForDispose = !enabled;
  }
  setViewport(x: number, y: number, width: number, height: number): void {
    this.#call('setViewport', this.#setViewport, [x, y, width, height]);
  }
  setScissor(x: number, y: number, width: number, height: number): void {
    this.#call('setScissor', this.#setScissor, [x, y, width, height]);
  }
  clearDepth(): void { this.#call('clearDepth', this.#clearDepth, []); }
  render(
    scene: Parameters<ArenaV2WeaponCollectionPreviewRendererPortV1['render']>[0],
    camera: Parameters<ArenaV2WeaponCollectionPreviewRendererPortV1['render']>[1],
  ): void {
    this.#call('render', this.#render, [scene, camera]);
  }
  dispose(): void {
    if (this.#disposed) return;
    if (!this.#scissorDisabledForDispose) this.setScissorTest(false);
    const result = this.#dispose();
    rejectThenable(result, 'A6.16 renderer.dispose');
    if (result !== undefined) throw new TypeError('A6.16 renderer.dispose必须返回void。');
    this.#disposed = true;
  }
}

function throwCleanupFailure(primary: unknown, cleanup: readonly unknown[], message: string): never {
  if (cleanup.length === 0) throw primary;
  throw new AggregateError([primary, ...cleanup], message);
}

function requireSynchronousVoid(value: unknown, name: string): void {
  rejectThenable(value, name);
  if (value !== undefined) throw new TypeError(`${name}必须返回void。`);
}

export class ArenaV2InformationCollectionPreviewSurfaceCompositionCandidateV1 {
  readonly #epochId: string;
  readonly #surface: ArenaV2InformationCollectionPreviewSurfacePortV1;
  readonly #rendererFactory: () => ArenaV2WeaponCollectionPreviewRendererPortV1;
  readonly #contextProvider: ArenaV2InformationCollectionPreviewSurfaceCompositionOptionsV1[
    'contextProvider'
  ];
  readonly #setPreviewVisibleCallback:
    ArenaV2InformationCollectionPreviewSurfaceCompositionOptionsV1['setPreviewVisible'];
  readonly #scheduleAfterResourceSettlement:
    ArenaV2InformationCollectionPreviewSurfaceCompositionOptionsV1[
      'scheduleAfterResourceSettlement'
    ];
  readonly #onFailure: UnknownMethod | null;
  readonly #readOwner: ArenaV2CollectionFourScreenReadOwnerCandidateV1;
  readonly #layoutBridge: ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1;
  readonly #notifyingLoader: SettlementNotifyingLoaderV1;
  #state: ArenaV2InformationCollectionPreviewSurfaceCompositionStateV1 = 'created';
  #previewHost: ArenaV2CollectionPreviewPageSurfaceHostCandidateV1 | null = null;
  #previewHostConstructionCleanupDebt:
    ArenaV2CollectionPreviewPageSurfaceHostConstructionCleanupFailureCandidateV1 | null = null;
  #rendererFactoryInvoked = false;
  #rendererPort: DisposeOnceRendererPortV1 | null = null;
  #rawOrphanRenderer: unknown = null;
  #rawOrphanRendererDispose: UnknownMethod | null = null;
  #rendererOwnershipTransferred = false;
  #scrollUnbind: (() => unknown) | null = null;
  #scrollObserverReleased = true;
  #previewHiddenForDispose = false;
  #surfaceDisposed = false;
  #layoutBridgeDestroyed = false;
  #readOwnerDestroyed = false;
  #notifyingLoaderDestroyed = false;
  #notifyingLoaderShutdownRequested = false;
  #orphanRendererCleanupComplete = true;
  #lastReadTick = -1;
  #lastPresentationTick = -1;
  #lastSourceRenderPlan: ArenaV2UiRenderPlanV1 | null = null;
  #lastFixedViewportId: ArenaV2A6WeaponPreviewViewportV1['viewportId'] | null = null;
  #lastPixelRatio = 1;
  #collectionPageVisible = false;
  #submission: Promise<unknown> | null = null;
  #queuedFrame: PreparedFrameV1 | null = null;
  #cancelScheduledRedraw: (() => void) | null = null;
  #disposeRequested = false;
  #disposeInProgress = false;
  #externalScrollObserver: ((offsetCssPixels: number) => unknown) | null = null;
  #pendingExternalScrollOffsets: number[] = [];
  #flushingExternalScrollOffsets = false;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(value: ArenaV2InformationCollectionPreviewSurfaceCompositionOptionsV1) {
    if (value.schemaVersion !== 1) throw new RangeError('A6.16 constructor只接受schema 1。');
    this.#epochId = nonEmptyText(value.epochId, 'A6.16 epochId');
    this.#surface = value.surface;
    method(value.surface, 'load', 'A6.16 surface');
    method(value.surface, 'bindIntent', 'A6.16 surface');
    method(value.surface, 'bindScrollOffset', 'A6.16 surface');
    if (value.surface.revealActionPrimitive !== undefined) {
      method(value.surface, 'revealActionPrimitive', 'A6.16 surface');
    }
    if (value.surface.revealPrimitive !== undefined) {
      method(value.surface, 'revealPrimitive', 'A6.16 surface');
    }
    method(value.surface, 'render', 'A6.16 surface');
    method(value.surface, 'dispose', 'A6.16 surface');
    if (typeof value.contextProvider !== 'function'
      || typeof value.rendererFactory !== 'function'
      || typeof value.setPreviewVisible !== 'function'
      || typeof value.scheduleAfterResourceSettlement !== 'function') {
      throw new TypeError('A6.16 rendererFactory、provider、可见性与settlement scheduler必须是函数。');
    }
    if (value.onFailure !== undefined && typeof value.onFailure !== 'function') {
      throw new TypeError('A6.16 onFailure必须是函数。');
    }
    const usesDefaultUnderlyingLoader = value.underlyingLoader === undefined
      || value.underlyingLoader === null;
    if (!usesDefaultUnderlyingLoader
      && (value.readAssetBytes !== undefined || value.createImage !== undefined)) {
      throw new RangeError(
        'A6.16注入underlyingLoader时不可再注入readAssetBytes/createImage。',
      );
    }
    if (value.readAssetBytes !== undefined && typeof value.readAssetBytes !== 'function') {
      throw new TypeError('A6.16 readAssetBytes必须是函数。');
    }
    if (value.createImage !== undefined && typeof value.createImage !== 'function') {
      throw new TypeError('A6.16 createImage必须是函数。');
    }
    this.#contextProvider = value.contextProvider;
    this.#rendererFactory = value.rendererFactory;
    this.#setPreviewVisibleCallback = value.setPreviewVisible;
    this.#scheduleAfterResourceSettlement = value.scheduleAfterResourceSettlement;
    this.#onFailure = value.onFailure ?? null;
    this.#readOwner = new ArenaV2CollectionFourScreenReadOwnerCandidateV1({
      epochId: this.#epochId,
    });
    this.#layoutBridge = new ArenaV2CollectionPreviewRenderPlanLayoutBridgeCandidateV1({
      schemaVersion: 1,
      epochId: this.#epochId,
    });
    let ownedUnderlyingLoader: GltfPresentationAssetLoader | null = null;
    try {
      const loaderOptions: Record<string, unknown> = {};
      if (value.readAssetBytes !== undefined) {
        loaderOptions.readAssetBytes = value.readAssetBytes;
      }
      if (value.createImage !== undefined) loaderOptions.createImage = value.createImage;
      ownedUnderlyingLoader = usesDefaultUnderlyingLoader
        ? new GltfPresentationAssetLoader(loaderOptions)
        : null;
      const underlyingLoader = value.underlyingLoader ?? ownedUnderlyingLoader;
      if (underlyingLoader === null) {
        throw new Error('A6.16底层GLTF loader所有权初始化失败。');
      }
      this.#notifyingLoader = new SettlementNotifyingLoaderV1(
        underlyingLoader,
        () => this.#requestResourceRedraw(),
        ownedUnderlyingLoader,
      );
    } catch (error) {
      const cleanup: unknown[] = [];
      if (ownedUnderlyingLoader !== null) {
        try {
          ownedUnderlyingLoader.destroy();
          if (!ownedUnderlyingLoader.isCleanupComplete()) {
            throw new Error('A6.16构造回滚的默认GLTF loader清理尚未收敛。');
          }
        } catch (cleanupError) { cleanup.push(cleanupError); }
      }
      try { this.#layoutBridge.destroy(); } catch (cleanupError) { cleanup.push(cleanupError); }
      try { this.#readOwner.destroy(); } catch (cleanupError) { cleanup.push(cleanupError); }
      throwCleanupFailure(error, cleanup, 'A6.16底层loader构造失败且回滚不完整。');
    }
  }

  get state(): ArenaV2InformationCollectionPreviewSurfaceCompositionStateV1 {
    this.#assertNoOperation('state read');
    return this.#state;
  }

  get scrollOffsetCssPixels(): number {
    return this.#runSynchronousOperation('scroll offset read', () => {
      const offset = this.#surface.scrollOffsetCssPixels;
      this.#assertCurrentOperationCommit();
      return offset;
    });
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation !== null) {
      const error = new Error(`A6.16 ${this.#operation}期间拒绝${operation}。`);
      this.#reentrySequence += 1;
      this.#reentryError ??= error;
      throw this.#reentryError;
    }
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) throw new Error('A6.16缺少当前操作所有权。');
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
        ? new AggregateError([failure, reentryError], `A6.16 ${operation}失败且同步重入。`)
        : reentryError;
    }
    if (failed) throw failure;
    return result;
  }

  bindScrollOffset(onChange: (offsetCssPixels: number) => unknown): () => void {
    this.#runSynchronousOperation('bind-scroll-observer', () => {
      if (this.#state !== 'ready' && this.#state !== 'active') {
        throw new Error(`A6.16 bindScrollOffset拒绝状态${this.#state}。`);
      }
      if (typeof onChange !== 'function') {
        throw new TypeError('A6.16外部滚动观察者必须是函数。');
      }
      if (this.#externalScrollObserver !== null) {
        throw new Error('A6.16外部滚动观察者已绑定。');
      }
      this.#externalScrollObserver = onChange;
    });
    let active = true;
    return () => {
      this.#runSynchronousOperation('unbind-scroll-observer', () => {
        if (!active) return;
        active = false;
        if (this.#externalScrollObserver === onChange) {
          this.#externalScrollObserver = null;
          this.#pendingExternalScrollOffsets = [];
        }
      });
    };
  }

  #fail(error: unknown): void {
    if (this.#state !== 'disposed') this.#state = 'failed';
    this.#collectionPageVisible = false;
    if (!this.#disposeRequested) {
      try { this.#setPreviewVisible(false); } catch { /* 保留原始失败。 */ }
    }
    if (this.#onFailure !== null) {
      try { rejectThenable(this.#onFailure(error), 'A6.16 onFailure'); } catch { /* 仅观察。 */ }
    }
  }

  #setPreviewVisible(visible: boolean): void {
    requireSynchronousVoid(
      this.#setPreviewVisibleCallback(visible),
      'A6.16 setPreviewVisible',
    );
    this.#assertCurrentOperationCommit();
  }

  #runCleanupStep<T>(
    run: () => T,
    commit: (result: T) => void,
    errors: unknown[],
  ): boolean {
    const sequence = this.#reentrySequence;
    try {
      const result = run();
      rejectThenable(result, 'A6.16 cleanup callback');
      if (this.#reentrySequence !== sequence) {
        errors.push(this.#reentryError
          ?? new Error('A6.16清理回调期间发生同步重入。'));
        return false;
      }
      commit(result);
      return true;
    } catch (error) {
      errors.push(error);
      return false;
    }
  }

  #createPreviewHost(bindingSnapshot: PreparedFrameV1['readSnapshot']['formalAssetLeaseBinding']):
    ArenaV2CollectionPreviewPageSurfaceHostCandidateV1 {
    if (this.#rendererFactoryInvoked || this.#rendererOwnershipTransferred
      || this.#rendererPort !== null || this.#rawOrphanRenderer !== null
      || this.#previewHostConstructionCleanupDebt !== null) {
      throw new Error('A6.16 rendererFactory只能在首个合法收藏frame调用一次。');
    }
    this.#rendererFactoryInvoked = true;
    this.#orphanRendererCleanupComplete = false;
    let rawRenderer: unknown = null;
    let rendererPort: DisposeOnceRendererPortV1 | null = null;
    let previewHost: ArenaV2CollectionPreviewPageSurfaceHostCandidateV1 | null = null;
    try {
      rawRenderer = this.#rendererFactory();
      rejectThenable(rawRenderer, 'A6.16 rendererFactory');
      this.#assertCurrentOperationCommit();
      this.#rawOrphanRenderer = rawRenderer;
      this.#rawOrphanRendererDispose = method(
        rawRenderer,
        'dispose',
        'A6.16 rendererFactory result',
      );
      rendererPort = new DisposeOnceRendererPortV1(rawRenderer);
      this.#rendererPort = rendererPort;
      this.#rawOrphanRenderer = null;
      this.#rawOrphanRendererDispose = null;
      previewHost = new ArenaV2CollectionPreviewPageSurfaceHostCandidateV1({
        schemaVersion: 1,
        bindingSnapshot,
        renderer: rendererPort,
        underlyingLoader: this.#notifyingLoader,
      });
      this.#previewHost = previewHost;
      this.#rendererOwnershipTransferred = true;
      this.#orphanRendererCleanupComplete = true;
      this.#assertCurrentOperationCommit();
      return previewHost;
    } catch (error) {
      if (previewHost !== null) {
        throw error;
      }
      if (error
        instanceof ArenaV2CollectionPreviewPageSurfaceHostConstructionCleanupFailureCandidateV1) {
        this.#previewHostConstructionCleanupDebt = error;
        if (error.ownsRendererBorrow) {
          this.#rendererOwnershipTransferred = true;
          this.#orphanRendererCleanupComplete = true;
          throw error;
        }
      }
      const cleanup: unknown[] = [];
      let cleanupSequenceUnchanged = true;
      if (rendererPort !== null) {
        const retainedRendererPort = rendererPort;
        cleanupSequenceUnchanged = this.#runCleanupStep(
          () => retainedRendererPort.dispose(),
          () => { this.#rendererPort = null; },
          cleanup,
        );
      } else if (rawRenderer !== null) {
        cleanupSequenceUnchanged = this.#runCleanupStep(
          () => {
            const dispose = this.#rawOrphanRendererDispose
              ?? method(rawRenderer, 'dispose', 'A6.16 rejected rendererFactory result');
            requireSynchronousVoid(
              dispose(),
              'A6.16 rejected rendererFactory result.dispose',
            );
          },
          () => {
            this.#rawOrphanRenderer = null;
            this.#rawOrphanRendererDispose = null;
          },
          cleanup,
        );
      }
      this.#orphanRendererCleanupComplete = cleanupSequenceUnchanged && cleanup.length === 0;
      throwCleanupFailure(
        error,
        cleanup,
        'A6.16 renderer或A6.14构造失败且Canvas renderer清理不完整。',
      );
    }
  }

  #prepareFrame(
    sourceRenderPlan: ArenaV2UiRenderPlanV1,
    currentSurfaceScrollOffsetCssPixels: number,
  ): Readonly<{
    readonly frame: PreparedFrameV1;
    readonly previewAwareRenderPlan: ArenaV2UiRenderPlanV1;
  }> | null {
    const readTick = nextTick(this.#lastReadTick, 'A6.16 read');
    const context = this.#contextProvider(Object.freeze({
      schemaVersion: 1 as const,
      epochId: this.#epochId,
      tick: readTick,
      sourceRenderPlan,
    }));
    this.#assertCurrentOperationCommit();
    if (context === null) return null;
    if (context.schemaVersion !== 1) throw new RangeError('A6.16 context schema不受支持。');
    const canReuseScrollOffset = this.#lastSourceRenderPlan !== null
      && this.#lastSourceRenderPlan.identity === sourceRenderPlan.identity
      && this.#lastSourceRenderPlan.revision === sourceRenderPlan.revision
      && this.#lastFixedViewportId === context.viewport.viewportId;
    const scrollOffsetCssPixels = canReuseScrollOffset
      ? currentSurfaceScrollOffsetCssPixels
      : 0;
    const readSnapshot = this.#readOwner.consume(context.readInput);
    this.#assertCurrentOperationCommit();
    const pixelRatio = safePixelRatio(context.pixelRatio);
    const bridge = this.#layoutBridge.compose({
      schemaVersion: 1,
      epochId: this.#epochId,
      tick: readTick,
      viewport: context.viewport,
      scrollOffsetCssPixels,
      scrollSourceRenderPlanIdentity: sourceRenderPlan.identity,
      scrollSourceRenderPlanRevision: sourceRenderPlan.revision,
      pipelineResult: context.pipelineResult,
      ...(context.authoritativeSourceRenderPlan === undefined
        ? {}
        : { authoritativeSourceRenderPlan: context.authoritativeSourceRenderPlan }),
      selectionProjection: context.selectionProjection,
      sourceRenderPlan,
      readSnapshot,
    });
    this.#assertCurrentOperationCommit();
    this.#lastReadTick = readTick;
    this.#lastPixelRatio = pixelRatio;
    this.#lastFixedViewportId = context.viewport.viewportId;
    const frame = Object.freeze({
      tick: this.#lastReadTick,
      pixelRatio,
      bridge,
      readSnapshot,
    });
    return Object.freeze({ frame, previewAwareRenderPlan: bridge.previewAwareRenderPlan });
  }

  #renderCurrent(): void {
    if (this.#previewHost === null || !this.#collectionPageVisible
      || this.#submission !== null || this.#queuedFrame !== null
      || this.#state === 'failed' || this.#state === 'dispose-pending'
      || this.#state === 'disposed') return;
    const presentationTick = nextTick(this.#lastPresentationTick, 'A6.16 presentation');
    this.#previewHost.renderCurrent({
      schemaVersion: 1,
      presentationTick,
      pixelRatio: this.#lastPixelRatio,
    });
    this.#assertCurrentOperationCommit();
    this.#setPreviewVisible(true);
    this.#lastPresentationTick = presentationTick;
  }

  #submit(frame: PreparedFrameV1): void {
    this.#setPreviewVisible(false);
    if (frame.readSnapshot.formalAssetLeaseBinding.slots.every((slot) => (
      slot.formalReady === false
      && slot.assetUsePermitted === false
      && slot.lifecycle.requestPermitted === false
      && slot.lifecycle.requestToken === null
      && slot.lifecycle.releaseToken === null
      && slot.fallback.active === true
    ))) {
      this.#queuedFrame = null;
      this.#state = 'active';
      return;
    }
    if (this.#previewHost === null) {
      const previewHost = this.#createPreviewHost(
        frame.readSnapshot.formalAssetLeaseBinding,
      );
      this.#previewHost = previewHost;
      this.#assertCurrentOperationCommit();
    }
    if (this.#submission !== null) {
      this.#queuedFrame = frame;
      return;
    }
    const submissionOwner = createDeferredPromiseOwner<void>();
    const operation = submissionOwner.promise;
    this.#submission = operation;
    Reflect.apply(NATIVE_PROMISE_THEN, operation, [
      () => {
        try {
          this.#runSynchronousOperation('submission-fulfilled', () => {
            if (this.#submission !== operation) return;
            this.#submission = null;
            if (this.#disposeRequested) {
              this.#finishDispose();
              return;
            }
            const queued = this.#queuedFrame;
            this.#queuedFrame = null;
            if (queued !== null) {
              this.#submit(queued);
              return;
            }
            this.#renderCurrent();
          });
        } catch (error) {
          if (this.#operation === null) {
            try {
              this.#runSynchronousOperation(
                'submission-fulfilled-failure',
                () => this.#fail(error),
              );
            } catch { /* 异步完成回调只能失败关闭。 */ }
          } else {
            this.#fail(error);
          }
        }
      },
      (error: unknown) => {
        try {
          this.#runSynchronousOperation('submission-rejected', () => {
            if (this.#submission !== operation) return;
            this.#submission = null;
            this.#queuedFrame = null;
            if (this.#disposeRequested) this.#finishDispose();
            else this.#fail(error);
          });
        } catch (commitError) {
          const failure = new AggregateError(
            [error, commitError],
            'A6.16 submission失败提交未能完整关闭。',
          );
          if (this.#operation === null) {
            try {
              this.#runSynchronousOperation(
                'submission-rejected-failure',
                () => this.#fail(failure),
              );
            } catch { /* 异步失败回调只能保留失败态。 */ }
          } else {
            this.#fail(failure);
          }
        }
      },
    ]);
    try {
      const childSubmission = this.#previewHost.submitPage({
        schemaVersion: 1,
        epochId: this.#epochId,
        tick: frame.tick,
        screenId: frame.bridge.screenId,
        viewport: frame.bridge.viewport,
        readSnapshot: frame.readSnapshot,
        contentClipRectCssPixels: frame.bridge.a6_12cLayoutInput.contentClipRectCssPixels,
        slotLayouts: frame.bridge.a6_12cLayoutInput.slotLayouts,
      });
      this.#assertCurrentOperationCommit();
      nativePromise(childSubmission, 'A6.16 A6.14 submitPage');
      Reflect.apply(NATIVE_PROMISE_THEN, childSubmission, [
        () => submissionOwner.resolve(undefined),
        (error: unknown) => submissionOwner.reject(error),
      ]);
      this.#assertCurrentOperationCommit();
    } catch (error) {
      if (this.#submission === operation) this.#submission = null;
      submissionOwner.reject(error);
      throw error;
    }
  }

  #requestResourceRedraw(): void {
    if (this.#operation === null) {
      try {
        this.#runSynchronousOperation(
          'resource-redraw-schedule',
          () => this.#requestResourceRedraw(),
        );
      } catch (error) {
        this.#state = 'failed';
        if (this.#onFailure !== null) {
          try { rejectThenable(this.#onFailure(error), 'A6.16 resource redraw onFailure'); }
          catch { /* 异步资源通知只能失败关闭。 */ }
        }
      }
      return;
    }
    if (this.#cancelScheduledRedraw !== null || !this.#collectionPageVisible
      || this.#state === 'failed' || this.#state === 'dispose-pending'
      || this.#state === 'disposed') return;
    let installing = true;
    let invokedSynchronously = false;
    try {
      const rawCancel = this.#scheduleAfterResourceSettlement(() => {
        if (installing) {
          invokedSynchronously = true;
          return;
        }
        if (this.#cancelScheduledRedraw === null) return;
        try {
          this.#runSynchronousOperation('resource-redraw', () => {
            if (this.#cancelScheduledRedraw === null) return;
            this.#cancelScheduledRedraw = null;
            if (this.#submission === null) this.#renderCurrent();
          });
        } catch (error) {
          if (this.#operation === null) {
            try {
              this.#runSynchronousOperation(
                'resource-redraw-failure',
                () => this.#fail(error),
              );
            } catch { /* 异步重绘回调只能失败关闭。 */ }
          } else {
            this.#fail(error);
          }
        }
      });
      if (typeof rawCancel !== 'function') {
        throw new TypeError('A6.16 settlement scheduler必须返回取消函数。');
      }
      let cancelCompleted = false;
      const cancelOwner = (): void => {
        if (cancelCompleted) return;
        requireSynchronousVoid(rawCancel(), 'A6.16 settlement cancel');
        cancelCompleted = true;
      };
      this.#cancelScheduledRedraw = cancelOwner;
      try {
        this.#assertCurrentOperationCommit();
      } catch (error) {
        const cleanup: unknown[] = [];
        try {
          cancelOwner();
          if (this.#cancelScheduledRedraw === cancelOwner) {
            this.#cancelScheduledRedraw = null;
          }
        } catch (cleanupError) { cleanup.push(cleanupError); }
        throwCleanupFailure(error, cleanup, 'A6.16 settlement scheduler反调回滚不完整。');
      }
      if (invokedSynchronously) {
        const primary = new Error('A6.16 settlement scheduler不得同步调用回调。');
        const cleanup: unknown[] = [];
        try {
          cancelOwner();
          if (this.#cancelScheduledRedraw === cancelOwner) {
            this.#cancelScheduledRedraw = null;
          }
        } catch (error) {
          cleanup.push(error);
        }
        throwCleanupFailure(primary, cleanup, 'A6.16同步settlement回调回滚不完整。');
      }
      installing = false;
    } catch (error) {
      installing = false;
      this.#fail(error);
    }
  }

  #refreshCollection(sourceRenderPlan: ArenaV2UiRenderPlanV1, renderUi: boolean): void {
    const currentSurfaceScrollOffsetCssPixels = this.#surface.scrollOffsetCssPixels;
    this.#assertCurrentOperationCommit();
    const prepared = this.#prepareFrame(
      sourceRenderPlan,
      currentSurfaceScrollOffsetCssPixels,
    );
    this.#assertCurrentOperationCommit();
    if (prepared === null) {
      this.#setPreviewVisible(false);
      if (renderUi) {
        rejectThenable(this.#surface.render(sourceRenderPlan), 'A6.16 surface.render');
        this.#assertCurrentOperationCommit();
      }
      this.#lastSourceRenderPlan = null;
      this.#lastFixedViewportId = null;
      this.#queuedFrame = null;
      this.#collectionPageVisible = false;
      return;
    }
    if (renderUi) {
      rejectThenable(
        this.#surface.render(prepared.previewAwareRenderPlan),
        'A6.16 surface.render',
      );
      this.#assertCurrentOperationCommit();
    }
    this.#submit(prepared.frame);
    this.#assertCurrentOperationCommit();
    this.#lastSourceRenderPlan = sourceRenderPlan;
    this.#collectionPageVisible = true;
    this.#state = 'active';
  }

  #flushExternalScrollOffsets(): void {
    if (this.#flushingExternalScrollOffsets) return;
    this.#flushingExternalScrollOffsets = true;
    try {
      while (this.#pendingExternalScrollOffsets.length > 0) {
        const offsetCssPixels = this.#pendingExternalScrollOffsets.shift()!;
        const observer = this.#externalScrollObserver;
        if (observer === null) {
          this.#pendingExternalScrollOffsets = [];
          return;
        }
        try {
          rejectThenable(
            observer(offsetCssPixels),
            'A6.16外部滚动观察者',
          );
        } catch (error) {
          this.#pendingExternalScrollOffsets = [];
          try {
            this.#runSynchronousOperation(
              'external-scroll-observer-failure',
              () => this.#fail(error),
            );
          } catch { /* 外部观察者只允许把组合关闭为失败。 */ }
          return;
        }
      }
    } finally {
      this.#flushingExternalScrollOffsets = false;
    }
  }

  #handleScrollOffset(): void {
    if (this.#state === 'failed' || this.#state === 'dispose-pending'
      || this.#state === 'disposed') return;
    const refresh = (): void => {
      if (this.#lastSourceRenderPlan !== null && this.#collectionPageVisible) {
        this.#refreshCollection(this.#lastSourceRenderPlan, false);
      }
      if (this.#externalScrollObserver !== null) {
        if (this.#pendingExternalScrollOffsets.length
          >= MAX_PENDING_EXTERNAL_SCROLL_OFFSETS) {
          throw new RangeError('A6.16待发布滚动观察超过32条上限。');
        }
        const offsetCssPixels = this.#surface.scrollOffsetCssPixels;
        this.#assertCurrentOperationCommit();
        this.#pendingExternalScrollOffsets.push(offsetCssPixels);
      }
    };
    if (this.#operation === 'reveal-action' || this.#operation === 'reveal-primitive') {
      try { refresh(); } catch (error) { this.#fail(error); }
      return;
    }
    try {
      this.#runSynchronousOperation('scroll-preview-refresh', refresh);
    } catch (error) {
      if (this.#operation === null) {
        try {
          this.#runSynchronousOperation(
            'scroll-preview-failure',
            () => this.#fail(error),
          );
        } catch { /* 滚动回调只允许把组合关闭为失败。 */ }
      } else {
        this.#fail(error);
      }
    }
    this.#flushExternalScrollOffsets();
  }

  load(): this {
    return this.#runSynchronousOperation('load', () => {
      if (this.#state === 'ready' || this.#state === 'active') return this;
      if (this.#state !== 'created') throw new Error(`A6.16 load拒绝状态${this.#state}。`);
      let provisionalUnbind: (() => unknown) | null = null;
      try {
        rejectThenable(this.#surface.load(), 'A6.16 surface.load');
        this.#assertCurrentOperationCommit();
        const candidate = this.#surface.bindScrollOffset(() => this.#handleScrollOffset());
        this.#assertCurrentOperationCommit();
        if (typeof candidate !== 'function') {
          throw new TypeError('A6.16 surface.bindScrollOffset必须返回解绑函数。');
        }
        provisionalUnbind = candidate;
        this.#scrollUnbind = provisionalUnbind;
        this.#scrollObserverReleased = false;
        rejectThenable(candidate, 'A6.16 surface.bindScrollOffset result');
        provisionalUnbind = null;
        this.#state = 'ready';
        return this;
      } catch (error) {
        const cleanup: unknown[] = [];
        let mayContinue = true;
        if (provisionalUnbind !== null && this.#scrollUnbind === null) {
          this.#scrollUnbind = provisionalUnbind;
          this.#scrollObserverReleased = false;
        }
        if (this.#scrollUnbind !== null) {
          mayContinue = this.#runCleanupStep(
            () => requireSynchronousVoid(
              this.#scrollUnbind!(),
              'A6.16 rejected scroll observer unbind',
            ),
            () => {
              this.#scrollUnbind = null;
              this.#scrollObserverReleased = true;
            },
            cleanup,
          );
        }
        if (mayContinue && this.#scrollObserverReleased && !this.#surfaceDisposed) {
          this.#runCleanupStep(
            () => requireSynchronousVoid(
              this.#surface.dispose(),
              'A6.16 rejected surface.dispose',
            ),
            () => { this.#surfaceDisposed = true; },
            cleanup,
          );
        }
        const failure = cleanup.length === 0
          ? error
          : new AggregateError([error, ...cleanup], 'A6.16 load回滚不完整。');
        this.#fail(failure);
        throw failure;
      }
    });
  }

  bindIntent(value: unknown): unknown {
    return this.#runSynchronousOperation('bind-intent', () => {
      if (this.#state !== 'ready' && this.#state !== 'active') {
        throw new Error(`A6.16 bindIntent拒绝状态${this.#state}。`);
      }
      const result = this.#surface.bindIntent(value);
      rejectThenable(result, 'A6.16 surface.bindIntent');
      this.#assertCurrentOperationCommit();
      return result;
    });
  }

  revealActionPrimitive(primitiveId: unknown): void {
    let committed = false;
    try {
      this.#runSynchronousOperation('reveal-action', () => {
        if (this.#state !== 'ready' && this.#state !== 'active') {
          throw new Error(`A6.16 revealActionPrimitive拒绝状态${this.#state}。`);
        }
        if (this.#surface.revealActionPrimitive === undefined) {
          throw new Error('A6.16 underlying surface不支持动作显示请求。');
        }
        try {
          rejectThenable(
            this.#surface.revealActionPrimitive(primitiveId),
            'A6.16 surface.revealActionPrimitive',
          );
          this.#assertCurrentOperationCommit();
        } catch (error) {
          this.#fail(error);
          throw error;
        }
        committed = true;
      });
    } finally {
      if (committed) this.#flushExternalScrollOffsets();
    }
  }

  revealPrimitive(primitiveId: unknown): void {
    let committed = false;
    try {
      this.#runSynchronousOperation('reveal-primitive', () => {
        if (this.#state !== 'ready' && this.#state !== 'active') {
          throw new Error(`A6.16 revealPrimitive拒绝状态${this.#state}。`);
        }
        if (this.#surface.revealPrimitive === undefined) {
          throw new Error('A6.16 underlying surface不支持内容显示请求。');
        }
        try {
          rejectThenable(
            this.#surface.revealPrimitive(primitiveId),
            'A6.16 surface.revealPrimitive',
          );
          this.#assertCurrentOperationCommit();
        } catch (error) {
          this.#fail(error);
          throw error;
        }
        committed = true;
      });
    } finally {
      if (committed) this.#flushExternalScrollOffsets();
    }
  }

  render(plan: ArenaV2UiRenderPlanV1): void {
    this.#runSynchronousOperation('render', () => {
      if (this.#state !== 'ready' && this.#state !== 'active') {
        throw new Error(`A6.16 render拒绝状态${this.#state}。`);
      }
      try {
        this.#refreshCollection(plan, true);
      } catch (error) {
        this.#fail(error);
        throw error;
      }
    });
  }

  getSnapshot(): ArenaV2InformationCollectionPreviewSurfaceCompositionSnapshotV1 {
    this.#assertNoOperation('snapshot read');
    return this.#runSynchronousOperation('snapshot read', () => {
      const previewHost = this.#previewHost?.getSnapshot() ?? null;
      this.#assertCurrentOperationCommit();
      return Object.freeze({
        schemaVersion: 1,
        status: 'production-unreachable',
        implementationStatus: 'code-written-not-run',
        validationStatus: 'not-run',
        state: this.#state,
        epochId: this.#epochId,
        lastReadTick: this.#lastReadTick,
        lastPresentationTick: this.#lastPresentationTick,
        lastFixedViewportId: this.#lastFixedViewportId,
        collectionPageVisible: this.#collectionPageVisible,
        hasPreviewHost: this.#previewHost !== null,
        hasPreviewHostConstructionCleanupDebt:
          this.#previewHostConstructionCleanupDebt !== null,
        commandSubmissionInFlight: this.#submission !== null,
        queuedFramePresent: this.#queuedFrame !== null,
        resourceRedrawScheduled: this.#cancelScheduledRedraw !== null,
        rendererFactoryInvoked: this.#rendererFactoryInvoked,
        rendererCreated: this.#rendererPort !== null,
        rendererOwnershipTransferred: this.#rendererOwnershipTransferred,
        previewHiddenForDispose: this.#previewHiddenForDispose,
        scrollObserverReleased: this.#scrollObserverReleased,
        surfaceDisposed: this.#surfaceDisposed,
        layoutBridgeDestroyed: this.#layoutBridgeDestroyed,
        readOwnerDestroyed: this.#readOwnerDestroyed,
        notifyingLoaderDestroyed: this.#notifyingLoaderDestroyed,
        notifyingLoaderShutdownRequested: this.#notifyingLoaderShutdownRequested,
        orphanRendererCleanupComplete: this.#orphanRendererCleanupComplete,
        rawOrphanRendererRetainedForCleanup: this.#rawOrphanRenderer !== null,
        previewHost,
        createsDom: false,
        createsRaf: false,
        pollsResources: false,
      });
    });
  }

  #finishDispose(): AggregateError | null {
    const errors: unknown[] = [];
    let mayContinue = true;
    if (!this.#previewHiddenForDispose) {
      mayContinue = this.#runCleanupStep(
        () => requireSynchronousVoid(
          this.#setPreviewVisibleCallback(false),
          'A6.16 dispose setPreviewVisible',
        ),
        () => { this.#previewHiddenForDispose = true; },
        errors,
      );
    }
    if (mayContinue && this.#cancelScheduledRedraw !== null) {
      mayContinue = this.#runCleanupStep(
        () => this.#cancelScheduledRedraw!(),
        () => { this.#cancelScheduledRedraw = null; },
        errors,
      );
    }
    if (mayContinue && !this.#scrollObserverReleased) {
      if (this.#scrollUnbind === null) {
        errors.push(new Error('A6.16 scroll observer所有权丢失。'));
      } else {
        mayContinue = this.#runCleanupStep(
          () => requireSynchronousVoid(this.#scrollUnbind!(), 'A6.16 scroll observer unbind'),
          () => {
            this.#scrollUnbind = null;
            this.#scrollObserverReleased = true;
          },
          errors,
        );
      }
    }
    const callbackSourcesReleased = this.#cancelScheduledRedraw === null
      && this.#scrollObserverReleased;
    if (!mayContinue || !callbackSourcesReleased) {
      if (errors.length === 0) {
        errors.push(this.#reentryError
          ?? new Error('A6.16回调来源尚未全部释放。'));
      }
      const failure = new AggregateError(errors, 'A6.16回调来源清理不完整。');
      this.#fail(failure);
      return failure;
    }
    if (!this.#notifyingLoaderShutdownRequested) {
      mayContinue = this.#runCleanupStep(
        () => this.#notifyingLoader.destroy(),
        () => { this.#notifyingLoaderShutdownRequested = true; },
        errors,
      );
    }
    if (!mayContinue) {
      const failure = new AggregateError(
        errors,
        'A6.16底层GLTF loader停机请求未完成。',
      );
      this.#fail(failure);
      return failure;
    }
    if (this.#submission !== null) {
      this.#queuedFrame = null;
      this.#lastSourceRenderPlan = null;
      this.#lastFixedViewportId = null;
      if (errors.length === 0) {
        this.#state = 'dispose-pending';
        return null;
      }
      const failure = new AggregateError(errors, 'A6.16等待submission前清理不完整。');
      this.#fail(failure);
      return failure;
    }
    if (mayContinue && this.#previewHost !== null) {
      mayContinue = this.#runCleanupStep(
        () => {
          const result = this.#previewHost!.destroy();
          if (result.state !== 'destroyed') throw new Error('A6.16 A6.14销毁不完整。');
          return result;
        },
        () => {
          this.#previewHost = null;
          this.#rendererPort = null;
        },
        errors,
      );
    }
    if (mayContinue && this.#previewHostConstructionCleanupDebt?.ownsRendererBorrow === true) {
      const debt = this.#previewHostConstructionCleanupDebt;
      mayContinue = this.#runCleanupStep(
        () => debt.retryCleanup(),
        () => {
          if (debt.cleanupComplete) {
            this.#previewHostConstructionCleanupDebt = null;
            this.#rendererPort = null;
          }
        },
        errors,
      );
    }
    if (mayContinue && !this.#rendererOwnershipTransferred
      && this.#rendererPort !== null) {
      mayContinue = this.#runCleanupStep(
        () => this.#rendererPort!.dispose(),
        () => {
          this.#rendererPort = null;
          this.#orphanRendererCleanupComplete = true;
        },
        errors,
      );
    }
    if (mayContinue && !this.#rendererOwnershipTransferred
      && this.#rendererPort === null
      && this.#rawOrphanRenderer !== null) {
      mayContinue = this.#runCleanupStep(
        () => {
          if (this.#rawOrphanRendererDispose === null) {
            throw new Error('A6.16原始孤儿Renderer缺少已捕获dispose。');
          }
          requireSynchronousVoid(
            this.#rawOrphanRendererDispose(),
            'A6.16 raw orphan renderer.dispose',
          );
        },
        () => {
          this.#rawOrphanRenderer = null;
          this.#rawOrphanRendererDispose = null;
          this.#orphanRendererCleanupComplete = true;
        },
        errors,
      );
    }
    const orphanRendererReleased = !this.#rendererFactoryInvoked
      || this.#rendererOwnershipTransferred
      || (this.#rendererPort === null
        && this.#rawOrphanRenderer === null
        && this.#orphanRendererCleanupComplete);
    if (mayContinue && orphanRendererReleased
      && this.#previewHostConstructionCleanupDebt?.ownsRendererBorrow === false) {
      const debt = this.#previewHostConstructionCleanupDebt;
      mayContinue = this.#runCleanupStep(
        () => debt.retryCleanup(),
        () => {
          if (debt.cleanupComplete) {
            this.#previewHostConstructionCleanupDebt = null;
          }
        },
        errors,
      );
    }
    const previewResourcesReleased = this.#previewHost === null
      && this.#previewHostConstructionCleanupDebt === null
      && (this.#rendererOwnershipTransferred || orphanRendererReleased);
    if (mayContinue && previewResourcesReleased && !this.#notifyingLoaderDestroyed) {
      mayContinue = this.#runCleanupStep(
        () => {
          this.#notifyingLoader.destroy();
          if (!this.#notifyingLoader.isCleanupComplete()) {
            throw new Error('A6.16自有底层GLTF loader清理尚未收敛。');
          }
        },
        () => { this.#notifyingLoaderDestroyed = true; },
        errors,
      );
    }
    if (mayContinue && previewResourcesReleased && !this.#layoutBridgeDestroyed) {
      mayContinue = this.#runCleanupStep(
        () => this.#layoutBridge.destroy(),
        () => { this.#layoutBridgeDestroyed = true; },
        errors,
      );
    }
    if (mayContinue && previewResourcesReleased && !this.#readOwnerDestroyed) {
      mayContinue = this.#runCleanupStep(
        () => this.#readOwner.destroy(),
        () => { this.#readOwnerDestroyed = true; },
        errors,
      );
    }
    if (mayContinue && previewResourcesReleased
      && this.#scrollObserverReleased
      && this.#layoutBridgeDestroyed
      && this.#readOwnerDestroyed
      && this.#notifyingLoaderDestroyed
      && !this.#surfaceDisposed) {
      mayContinue = this.#runCleanupStep(
        () => requireSynchronousVoid(this.#surface.dispose(), 'A6.16 surface.dispose'),
        () => { this.#surfaceDisposed = true; },
        errors,
      );
    }
    if (mayContinue) {
      this.#queuedFrame = null;
      this.#lastSourceRenderPlan = null;
      this.#lastFixedViewportId = null;
    }
    const complete = this.#submission === null
      && this.#cancelScheduledRedraw === null
      && this.#previewHiddenForDispose
      && this.#scrollObserverReleased
      && this.#surfaceDisposed
      && this.#layoutBridgeDestroyed
      && this.#readOwnerDestroyed
      && this.#notifyingLoaderDestroyed
      && this.#notifyingLoaderShutdownRequested
      && this.#previewHost === null
      && this.#previewHostConstructionCleanupDebt === null
      && previewResourcesReleased;
    if (errors.length === 0 && complete) {
      this.#state = 'disposed';
      return null;
    }
    if (!complete && errors.length === 0) {
      errors.push(new Error('A6.16仍有未完成清理步骤，拒绝伪报disposed。'));
    }
    const failure = new AggregateError(errors, 'A6.16清理不完整。');
    this.#fail(failure);
    return failure;
  }

  dispose(): void {
    this.#runSynchronousOperation('dispose', () => {
      if (this.#state === 'disposed') return;
      if (this.#state === 'dispose-pending' && this.#submission !== null) return;
      if (this.#disposeInProgress) throw new Error('A6.16 dispose不可重入。');
      this.#disposeInProgress = true;
      this.#disposeRequested = true;
      this.#state = 'failed';
      this.#collectionPageVisible = false;
      this.#externalScrollObserver = null;
      this.#pendingExternalScrollOffsets = [];
      try {
        const finishFailure = this.#finishDispose();
        if (finishFailure !== null) {
          this.#state = 'failed';
          throw new AggregateError([finishFailure], 'A6.16同步清理不完整。');
        }
      } finally {
        this.#disposeInProgress = false;
      }
    });
  }
}
