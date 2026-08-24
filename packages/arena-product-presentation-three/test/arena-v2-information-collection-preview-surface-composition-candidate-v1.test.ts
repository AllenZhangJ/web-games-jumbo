import { readFileSync } from 'node:fs';
import type { ArenaV2UiRenderPlanV1 } from '@number-strategy-jump/arena-product-presentation';
import { describe, expect, it } from 'vitest';
import {
  ArenaV2InformationCollectionPreviewSurfaceCompositionCandidateV1,
} from '../src/arena-v2-information-collection-preview-surface-composition-candidate-v1.js';

function nonCollectionSurface() {
  let scrollOffsetCssPixels = 0;
  return {
    get scrollOffsetCssPixels() { return scrollOffsetCssPixels; },
    load() {},
    bindIntent() { return () => undefined; },
    bindScrollOffset(_onChange: (offset: number) => unknown) {
      return () => { scrollOffsetCssPixels = 0; };
    },
    render(_plan: ArenaV2UiRenderPlanV1) {},
    dispose() {},
  };
}

describe('Arena V2 A6.16/A6.17 collection preview surface wiring（未运行候选）', () => {
  it('从未进入四收藏页时不会创建第二个WebGL renderer，dispose也不触发工厂', () => {
    let rendererFactoryCallCount = 0;
    const visibility: boolean[] = [];
    const owner = new ArenaV2InformationCollectionPreviewSurfaceCompositionCandidateV1({
      schemaVersion: 1,
      epochId: 'a6.16.lazy-renderer.test',
      surface: nonCollectionSurface(),
      rendererFactory: () => {
        rendererFactoryCallCount += 1;
        throw new Error('非收藏页不得调用rendererFactory。');
      },
      contextProvider: () => null,
      setPreviewVisible: (visible) => { visibility.push(visible); },
      scheduleAfterResourceSettlement: () => () => undefined,
    });

    owner.load();
    owner.render(Object.freeze({}) as unknown as ArenaV2UiRenderPlanV1);
    expect(rendererFactoryCallCount).toBe(0);
    expect(owner.getSnapshot()).toMatchObject({
      rendererFactoryInvoked: false,
      rendererCreated: false,
      hasPreviewHost: false,
      collectionPageVisible: false,
    });
    owner.dispose();
    expect(rendererFactoryCallCount).toBe(0);
    expect(visibility.at(-1)).toBe(false);
    expect(owner.getSnapshot()).toMatchObject({
      state: 'disposed',
      notifyingLoaderDestroyed: true,
      notifyingLoaderShutdownRequested: true,
      surfaceDisposed: true,
    });
  });

  it('A6.17只把base Pipeline交给A6.15，并把renderer创建保留在一次性工厂内部', () => {
    const source = readFileSync(new URL(
      '../../../src/entry/arena-v2-formal-web-playable-composition-candidate-v1.ts',
      import.meta.url,
    ), 'utf8');
    const factoryStart = source.indexOf('const collectionPreviewRendererFactory = () =>');
    const rendererConstruction = source.indexOf('new THREE.WebGLRenderer({');
    expect(factoryStart).toBeGreaterThan(-1);
    expect(rendererConstruction).toBeGreaterThan(factoryStart);
    expect(source).toContain(
      'pipelineResult: localHost!.getInformationCurrentScreenBasePipeline(',
    );
    expect(source).not.toMatch(
      /pipelineResult:\s*localHost!\.getInformationCurrentScreenPipeline\(/u,
    );
  });

  it('新frame在提交或合并前先隐藏旧Canvas，最后提交后才允许renderCurrent显示', () => {
    const source = readFileSync(new URL(
      '../src/arena-v2-information-collection-preview-surface-composition-candidate-v1.ts',
      import.meta.url,
    ), 'utf8');
    const renderCurrentStart = source.indexOf('#renderCurrent(): void');
    const submitStart = source.indexOf('#submit(frame: PreparedFrameV1): void');
    const hide = source.indexOf('this.#setPreviewVisible(false);', submitStart);
    const hostSubmit = source.indexOf('this.#previewHost.submitPage({', submitStart);
    const renderCurrent = source.indexOf(
      'this.#previewHost.renderCurrent({',
      renderCurrentStart,
    );
    const show = source.indexOf('this.#setPreviewVisible(true);', renderCurrent);
    expect(renderCurrentStart).toBeGreaterThan(-1);
    expect(submitStart).toBeGreaterThan(-1);
    expect(hide).toBeGreaterThan(submitStart);
    expect(hide).toBeLessThan(hostSubmit);
    expect(renderCurrent).toBeGreaterThan(renderCurrentStart);
    expect(renderCurrent).toBeLessThan(submitStart);
    expect(show).toBeGreaterThan(renderCurrent);
    expect(show).toBeLessThan(submitStart);
  });

  it('surface.load允许同步this返回；bind失败反向dispose且进入不可继续状态', () => {
    let rendererFactoryCallCount = 0;
    let surfaceDisposeCount = 0;
    const surface = {
      scrollOffsetCssPixels: 0,
      load() { return this; },
      bindIntent() { return () => undefined; },
      bindScrollOffset() { throw new Error('bind failed'); },
      render() {},
      dispose() { surfaceDisposeCount += 1; },
    };
    const owner = new ArenaV2InformationCollectionPreviewSurfaceCompositionCandidateV1({
      schemaVersion: 1,
      epochId: 'a6.16.load-rollback.test',
      surface,
      rendererFactory: () => {
        rendererFactoryCallCount += 1;
        throw new Error('load回滚不得创建renderer。');
      },
      contextProvider: () => null,
      setPreviewVisible: () => undefined,
      scheduleAfterResourceSettlement: () => () => undefined,
    });

    expect(() => owner.load()).toThrow(/bind failed/);
    expect(surfaceDisposeCount).toBe(1);
    expect(rendererFactoryCallCount).toBe(0);
    expect(owner.state).toBe('failed');
    expect(() => owner.load()).toThrow(/failed/);
    expect(() => owner.bindIntent(Object.freeze({}))).toThrow(/failed/);
  });

  it('dispose按步骤只重试未完成清理且任何首轮失败都不伪报disposed', () => {
    let unbindCount = 0;
    let surfaceDisposeCount = 0;
    const surface = {
      scrollOffsetCssPixels: 0,
      load() { return this; },
      bindIntent() { return () => undefined; },
      bindScrollOffset() {
        return () => { unbindCount += 1; };
      },
      render() {},
      dispose() {
        surfaceDisposeCount += 1;
        if (surfaceDisposeCount === 1) throw new Error('dispose once failed');
      },
    };
    const owner = new ArenaV2InformationCollectionPreviewSurfaceCompositionCandidateV1({
      schemaVersion: 1,
      epochId: 'a6.16.dispose-retry.test',
      surface,
      rendererFactory: () => { throw new Error('不得创建renderer。'); },
      contextProvider: () => null,
      setPreviewVisible: () => undefined,
      scheduleAfterResourceSettlement: () => () => undefined,
    });
    owner.load();

    expect(() => owner.dispose()).toThrow(/同步清理不完整/);
    expect(owner.state).toBe('failed');
    expect(owner.getSnapshot()).toMatchObject({
      previewHiddenForDispose: true,
      scrollObserverReleased: true,
      surfaceDisposed: false,
      layoutBridgeDestroyed: true,
      readOwnerDestroyed: true,
      notifyingLoaderDestroyed: true,
      notifyingLoaderShutdownRequested: true,
      hasPreviewHostConstructionCleanupDebt: false,
      rawOrphanRendererRetainedForCleanup: false,
    });
    owner.dispose();
    expect(owner.state).toBe('disposed');
    expect(unbindCount).toBe(1);
    expect(surfaceDisposeCount).toBe(2);
  });

  it('跨realm Promise品牌、同步scheduler拒绝与双视口身份均由静态合同固定', () => {
    const compositionSource = readFileSync(new URL(
      '../src/arena-v2-information-collection-preview-surface-composition-candidate-v1.ts',
      import.meta.url,
    ), 'utf8');
    const bridgeSource = readFileSync(new URL(
      '../src/arena-v2-collection-preview-render-plan-layout-bridge-candidate-v1.ts',
      import.meta.url,
    ), 'utf8');
    const rootSource = readFileSync(new URL(
      '../../../src/entry/arena-v2-formal-web-playable-composition-candidate-v1.ts',
      import.meta.url,
    ), 'utf8');

    expect(compositionSource).toContain('Reflect.apply(NATIVE_PROMISE_THEN');
    expect(compositionSource).toContain(
      'attachNativePromiseHandlers(result, notifyIfActive, notifyIfActive)',
    );
    expect(compositionSource).not.toContain('result instanceof Promise');
    expect(compositionSource).toContain('settlement scheduler不得同步调用回调');
    expect(compositionSource).toContain(
      'this.#lastFixedViewportId === context.viewport.viewportId',
    );
    expect(compositionSource).toContain(
      'constructionRollbackRetainsHostAndRendererCleanupOwnership: true',
    );
    expect(compositionSource).toContain(
      'constructorRollbackReleasesDefaultLoaderAndStaticOwners: true',
    );
    expect(compositionSource).toContain(
      'disposalUsesDependencyOrderedCompletionWatermarks: true',
    );
    expect(compositionSource).toContain(
      'orphanRendererDisposeWaitsForScissorDisable: true',
    );
    expect(compositionSource).toContain(
      'underlyingSurfaceWaitsForPreviewResourceCleanup: true',
    );
    expect(compositionSource).toContain(
      'defaultUnderlyingLoaderOwnedUntilPreviewResourcesRelease: true',
    );
    expect(compositionSource).toContain(
      'defaultUnderlyingLoaderAcceptsCancellableAssetReadAndImagePorts: true',
    );
    expect(compositionSource).toContain(
      'defaultUnderlyingLoaderShutdownRequestedBeforePreviewTaskSettlementWait: true',
    );
    expect(compositionSource).toContain(
      'lateLoaderSettlementNotificationSuppressedAfterDestroy: true',
    );
    expect(compositionSource).toContain(
      'underlyingSurfaceWaitsForLoaderCleanup: true',
    );
    expect(compositionSource).toContain('this.#notifyingLoader.destroy()');
    expect(compositionSource).toContain('this.#notifyingLoader.isCleanupComplete()');
    expect(rootSource).toContain(
      'collectionPreviewDefaultModelReadsAreAbortable: true',
    );
    expect(rootSource).toContain(
      'collectionPreviewDefaultModelPathsRestrictedToProjectAssets: true',
    );
    expect(compositionSource).toContain('if (this.#disposeInProgress)');
    expect(compositionSource).toContain('this.#rawOrphanRenderer = rawRenderer');
    expect(compositionSource).toContain('this.#previewHostConstructionCleanupDebt = error');
    expect(compositionSource).toMatch(
      /const previewResourcesReleased = [\s\S]*?if \(mayContinue && previewResourcesReleased[\s\S]*?this\.#notifyingLoader\.destroy\(\)[\s\S]*?this\.#surface\.dispose\(\)/u,
    );
    const hostSource = readFileSync(new URL(
      '../src/arena-v2-collection-preview-page-surface-host-candidate-v1.ts',
      import.meta.url,
    ), 'utf8');
    expect(hostSource).toContain(
      'constructionCleanupRetainsRetryableChildOwners: true',
    );
    expect(hostSource).toContain(
      'terminalCleanupReleasesRendererBorrowBeforePageResources: true',
    );
    expect(hostSource).toContain('renderConstructionDebt.retryCleanup()');
    const pageSource = readFileSync(new URL(
      '../src/arena-v2-collection-preview-page-transaction-owner-candidate-v1.ts',
      import.meta.url,
    ), 'utf8');
    expect(pageSource).toContain(
      'constructionCleanupUsesTerminalLeaseReleaseOrder: true',
    );
    expect(pageSource).toContain(
      'class ArenaV2CollectionPreviewPageTransactionConstructionCleanupFailureCandidateV1',
    );
    const renderSource = readFileSync(new URL(
      '../src/arena-v2-weapon-collection-multi-slot-preview-render-surface-candidate-v1.ts',
      import.meta.url,
    ), 'utf8');
    expect(renderSource).toContain('rendererDisposeWaitsForScissorDisable: true');
    expect(renderSource).toContain(
      'constructionCleanupRetainsRetryableRendererDebt: true',
    );
    expect(renderSource).toContain(
      'class ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceConstructionCleanupFailureCandidateV1',
    );
    const resourceExecutionSource = readFileSync(new URL(
      '../src/arena-v2-collection-formal-preview-resource-execution-composition-owner-candidate-v1.ts',
      import.meta.url,
    ), 'utf8');
    expect(resourceExecutionSource).toContain(
      'constructionCleanupRetainsRetryableExecutorAndAdapter: true',
    );
    expect(resourceExecutionSource).toContain(
      'class ArenaV2CollectionFormalPreviewResourceExecutionConstructionCleanupFailureCandidateV1',
    );
    const leaseOwnerSource = readFileSync(new URL(
      '../src/arena-v2-collection-formal-preview-lease-owner-candidate-v1.ts',
      import.meta.url,
    ), 'utf8');
    expect(leaseOwnerSource).toContain('cleanupRetriesOnlyIncompleteResources: true');
    expect(leaseOwnerSource).toContain('failedDisposeRetainsHandleForRetry: true');
    expect(leaseOwnerSource).toContain('destroyIncompleteRetainsResourceLedger: true');
    const lazyAdapterSource = readFileSync(new URL(
      '../src/arena-v2-collection-preview-lazy-gltf-loader-adapter-candidate-v1.ts',
      import.meta.url,
    ), 'utf8');
    expect(lazyAdapterSource).toContain(
      'taskDestroyRetriesOnlyIncompleteSettledCleanup: true',
    );
    expect(lazyAdapterSource).toContain('destroyIncompleteRetainsTaskRecords: true');
    expect(lazyAdapterSource).toContain('record.retainedInvalidLeaseOwner = value');
    expect(lazyAdapterSource).toContain('#retryRetainedInvalidLeaseCleanup(record');
    const mountLifecycleSource = readFileSync(new URL(
      '../src/arena-v2-collection-preview-mount-lifecycle-destroy-proof-owner-candidate-v1.ts',
      import.meta.url,
    ), 'utf8');
    expect(mountLifecycleSource).toContain(
      'ownerDestroyPreparationRetriesOnlyIncompleteMountCleanup: true',
    );
    expect(mountLifecycleSource).toContain(
      'destroyIncompleteResultIsDiagnosticNotTerminal: true',
    );
    expect(mountLifecycleSource).toContain(
      "const retryingIncompleteDestroy = this.#state === 'destroy-incomplete'",
    );
    const mountOwnerSource = readFileSync(new URL(
      '../src/arena-v2-weapon-collection-preview-three-mount-owner-candidate-v1.ts',
      import.meta.url,
    ), 'utf8');
    expect(mountOwnerSource).toContain(
      'mountCleanupUsesPerResourceCompletionWatermarks: true',
    );
    expect(mountOwnerSource).toContain(
      'failedBuildCleanupDebtRetainedForDestroyRetry: true',
    );
    expect(mountOwnerSource).toContain('readonly #cleanupDebts = new Set<OwnedMountObjectsV1>()');
    expect(bridgeSource).toContain(
      ':a6.15-preview-aware:${parsed.viewport.viewportId}',
    );
    expect(rootSource).toContain("decorativeAssetState: 'missing'");
    expect(rootSource).toContain('#collectionPreviewVisibilityRequested');
    expect(rootSource).not.toContain(
      'this.#collectionPreviewSurface.getSnapshot().collectionPageVisible',
    );
  });
});
