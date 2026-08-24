import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-presentation';
import * as THREE from 'three';
import {
  ARENA_V2_FORMAL_THREE_ASSET_PRELOADER_CANDIDATE_V1,
  ArenaV2FormalThreeAssetPreloaderCandidateV1,
} from '../src/arena-v2-formal-three-asset-preloader-candidate-v1.js';

class FakeLoader {
  readonly loadedAssetIds: string[] = [];
  readonly releasedAssetIds: string[] = [];

  load(definition: Readonly<{ readonly id: string; readonly sourceKey: string }>) {
    this.loadedAssetIds.push(definition.id);
    return Object.freeze({
      assetId: definition.id,
      value: Object.freeze({
        assetId: definition.id,
        scene: new THREE.Group(),
        animations: Object.freeze([]),
        sourceKey: definition.sourceKey,
      }),
      release: () => { this.releasedAssetIds.push(definition.id); },
    });
  }
}

describe('Arena V2 formal Three asset preloader production approval gate (not run)', () => {
  it('keeps the default GLTF loader owned until every task has settled', () => {
    expect(ARENA_V2_FORMAL_THREE_ASSET_PRELOADER_CANDIDATE_V1).toMatchObject({
      defaultUnderlyingLoaderOwnedAndDestroyedAfterTasks: true,
      defaultUnderlyingLoaderAcceptsCancellableAssetReadAndImagePorts: true,
      defaultUnderlyingLoaderShutdownRequestedBeforeTaskSettlementWait: true,
      validationStatus: 'not-run',
    });
  });

  it('fails closed before invoking the loader when no visual asset is production approved', async () => {
    const loader = new FakeLoader();
    const preloader = new ArenaV2FormalThreeAssetPreloaderCandidateV1({ loader });

    await expect(preloader.load()).rejects.toThrow(/零|未获生产批准|不会发起任何GLB加载/u);

    expect(loader.loadedAssetIds).toEqual([]);
    expect(loader.releasedAssetIds).toEqual([]);
    expect(preloader.getSnapshot()).toMatchObject({
      state: 'failed',
      approvalMode: 'production-approved-only',
      productionApprovedAssetIds: [],
      loadedAssetIds: [],
      pendingTaskCount: 0,
      loadPending: false,
    });
    expect(preloader.getSnapshot().blockedAssetIds).toEqual(
      ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1
        .visualAssetRegistry.list().map(({ id }) => id).sort(),
    );

    preloader.dispose();
    expect(preloader.state).toBe('disposed');
  });

  it('loads and releases the complete catalog only after isolated development opts in', async () => {
    const loader = new FakeLoader();
    const preloader = new ArenaV2FormalThreeAssetPreloaderCandidateV1({
      loader,
      allowUnapprovedCandidates: true,
    });
    const expectedAssetIds = ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1
      .visualAssetRegistry.list().map(({ id }) => id).sort();

    await preloader.load();

    expect(preloader.getSnapshot()).toMatchObject({
      state: 'ready',
      approvalMode: 'isolated-unapproved-candidates',
      productionApprovedAssetIds: [],
      blockedAssetIds: [],
      loadedAssetIds: expectedAssetIds,
      pendingTaskCount: expectedAssetIds.length,
      loadPending: false,
    });
    expect([...loader.loadedAssetIds].sort()).toEqual(expectedAssetIds);

    preloader.dispose();
    expect(preloader.state).toBe('disposed');
    expect([...loader.releasedAssetIds].sort()).toEqual(expectedAssetIds);
  });
});
