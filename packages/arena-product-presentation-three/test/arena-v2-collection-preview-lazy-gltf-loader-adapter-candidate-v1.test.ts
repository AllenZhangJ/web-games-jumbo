import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1,
} from '../src/arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';
import type {
  ArenaV2A6FormalPreviewLoadRequestV1,
} from '../src/arena-v2-collection-formal-preview-lease-owner-candidate-v1.js';
import {
  ARENA_V2_A6_COLLECTION_PREVIEW_LAZY_GLTF_LOADER_ADAPTER_CANDIDATE_V1,
  ArenaV2CollectionPreviewLazyGltfLoaderAdapterCandidateV1,
} from '../src/arena-v2-collection-preview-lazy-gltf-loader-adapter-candidate-v1.js';

class NeverCalledGltfLoaderV1 {
  callCount = 0;

  load(): never {
    this.callCount += 1;
    throw new Error('当前生产批准账本下不得调用底层GLTF loader。');
  }
}

function forgedRequest(assetId: string, sha256: string): ArenaV2A6FormalPreviewLoadRequestV1 {
  return Object.freeze({
    schemaVersion: 1 as const,
    requestIdentity: 'deadbeef',
    epochId: 'a6.11a-current-ledger-epoch',
    catalogContentHash: ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.contentHash,
    assetId,
    sha256,
    requestToken: 'a6.4:request:forged-production-approval',
  });
}

describe('Arena V2 A6.11a current production approval boundary（未运行）', () => {
  it('P6.225 publishes the task operation before task.load and guards settlement', () => {
    const source = readFileSync(new URL(
      '../src/arena-v2-collection-preview-lazy-gltf-loader-adapter-candidate-v1.ts',
      import.meta.url,
    ), 'utf8');
    expect(source).toMatch(/#operation: string \| null = null/u);
    expect(source).toMatch(/检测到被回调吞掉的重入异常/u);
    for (const operation of [
      'load',
      'cancel',
      'dispose',
      'snapshot-read',
      'destroy',
      'task-resolved',
      'task-rejected',
    ]) expect(source).toMatch(new RegExp(
      `#runSynchronousOperation\\(\\s*'${operation}'`,
      'u',
    ));
    expect(source).toMatch(
      /const operation = Object\.freeze\([\s\S]*?this\.#tasks\.set\([\s\S]*?taskOperation = task\.load\(\)/u,
    );
    expect(source).toMatch(
      /const handle = this\.#runSynchronousOperation\([\s\S]*?record\.resolveOperation\(handle\)/u,
    );
    expect(source).toMatch(/record\.state === 'cancelled' \|\| this\.#state === 'destroyed'/u);
    for (const marker of [
      'synchronousLifecycleOperationReentryRejected: true',
      'swallowedCallbackReentryFailsClosed: true',
      'taskOperationOwnerPublishedBeforeTaskLoad: true',
      'taskSettlementCommitsUnderOperationGuard: true',
      'successfulTaskPromiseResolvesAfterGuardedStateCommit: true',
      'releasedOrDestroyedTaskCannotBeRevivedByLateLoad: true',
      'publicReadsRejectedDuringOperationCommit: true',
    ]) expect(source).toContain(marker);
  });

  it('rejects all 20 weapons and 2 maps before the injected loader', () => {
    const loader = new NeverCalledGltfLoaderV1();
    const adapter = new ArenaV2CollectionPreviewLazyGltfLoaderAdapterCandidateV1({
      schemaVersion: 1,
      loader,
    });

    expect(ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings).toHaveLength(22);
    for (const binding of ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings) {
      const record = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.records.find(
        ({ assetId }) => assetId === binding.assetId,
      )!;
      expect(() => adapter.load(forgedRequest(record.assetId, record.sha256))).toThrow(
        /允许的收藏GLB预览数量为0/u,
      );
    }
    expect(loader.callCount).toBe(0);
    expect(adapter.getSnapshot()).toMatchObject({
      state: 'active',
      productionApprovedWeaponAssetCount: 0,
      activeTaskCount: 0,
      loadingTaskCount: 0,
      readyTaskCount: 0,
      cleanupFailureCount: 0,
    });
    adapter.destroy();
  });

  it('rejects unknown, future-field and accessor requests without loader calls', () => {
    const loader = new NeverCalledGltfLoaderV1();
    const adapter = new ArenaV2CollectionPreviewLazyGltfLoaderAdapterCandidateV1({
      schemaVersion: 1,
      loader,
    });
    const first = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.records[0]!;

    expect(() => adapter.load({
      ...forgedRequest('arena.asset.unknown.v1', first.sha256),
      futureApproval: true,
    } as unknown as ArenaV2A6FormalPreviewLoadRequestV1)).toThrow(/未知字段/u);
    expect(() => adapter.load(Object.defineProperty({}, 'assetId', {
      enumerable: true,
      get: () => first.assetId,
    }) as ArenaV2A6FormalPreviewLoadRequestV1)).toThrow(/数据字段|必填/u);
    expect(loader.callCount).toBe(0);
    adapter.destroy();
  });

  it('keeps the adapter closed until a new ledger version and independent gate', () => {
    expect(ARENA_V2_A6_COLLECTION_PREVIEW_LAZY_GLTF_LOADER_ADAPTER_CANDIDATE_V1)
      .toMatchObject({
        status: 'production-unreachable',
        implementationStatus: 'code-written-not-run',
        hardGate: false,
        defaultSurfaceWired: false,
        productionApprovedWeaponAssetCount: 0,
        currentLoaderReachableAssetCount: 0,
        currentLoadsBytesHere: false,
        futureEnablementRequiresNewApprovalLedgerVersionAndIndependentGate: true,
        preloadsCatalog: false,
        defaultUnderlyingLoaderOwnedUntilAllTasksSettle: true,
        successfulOwnedLoaderRetryPublishesDestroyed: true,
        thrownNullAndUndefinedRemainLifecycleFailures: true,
        taskDestroyAndCleanupCheckShareFailureWatermark: true,
        validationStatus: 'not-run',
      });
  });
});
