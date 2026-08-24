import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1,
  ArenaV2CollectionFormalAssetReuseBindingCandidateV1,
  createArenaV2A6CurrentFormalPreviewAvailabilityV1,
  type ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1,
} from '../src/arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';
import {
  ARENA_V2_A6_WEAPON_COLLECTION_PREVIEW_THREE_MOUNT_OWNER_CANDIDATE_V1,
  ArenaV2WeaponCollectionPreviewThreeMountOwnerCandidateV1,
} from '../src/arena-v2-weapon-collection-preview-three-mount-owner-candidate-v1.js';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function collectionContent() {
  const weaponBindings = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
    .filter(({ kind }) => kind === 'weapon');
  const mapBindings = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
    .filter(({ kind }) => kind === 'map');
  const authority = {
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSurfaceWired: false,
    ownerId: 'p5-content',
    weapons: weaponBindings.map(({ definitionId }, index) => ({
      weaponDefinitionId: definitionId,
      collectionOrder: index + 1,
      displayName: `A6.9 Weapon ${index + 1}`,
      learningFocus: `Focus ${index + 1}`,
      coreVerb: 'read-shape',
    })),
    maps: mapBindings.map(({ definitionId }, mapIndex) => ({
      mapDefinitionId: definitionId,
      displayName: `A6.9 Map ${mapIndex + 1}`,
      participantRange: '2–4人',
      segments: Array.from({ length: 10 }, (_, segmentIndex) => ({
        segmentDefinitionId: `a6.9.map.${mapIndex}.segment.${segmentIndex}`,
        ordinal: segmentIndex + 1,
        displayName: `Segment ${mapIndex}-${segmentIndex}`,
        learningFocus: 'route',
        segmentKind: 'route',
        survivalRole: 'shared',
      })),
    })),
    sourceContentHash: 'a6900001',
  } as const;
  return {
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena V2 Information Collection Content Projection V1',
    ),
  };
}

function bindingSnapshot(): ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1 {
  const owner = new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({ epochId: 'a6.9-test' });
  const snapshot = owner.consume({
    schemaVersion: 1,
    collectionProgressInput: {
      schemaVersion: 1,
      epochId: 'a6.9-test',
      tick: 10,
      locale: 'zh-CN',
      sourceState: 'loading',
      profileIdentity: null,
      collectionContent: collectionContent(),
      progressFacts: null,
      nextGoalIdentity: null,
      diagnosticCode: null,
      observedProfileSchemaVersion: null,
      reducedMotion: false,
      muted: true,
      decorativeAssetState: 'missing',
    },
    formalAssetCatalog: clone(ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1),
    availability: clone(createArenaV2A6CurrentFormalPreviewAvailabilityV1()),
  });
  owner.destroy();
  return snapshot;
}

describe('ArenaV2WeaponCollectionPreviewThreeMountOwnerCandidateV1（未运行候选）', () => {
  it('P6.324 keeps Three build and cleanup callbacks from publishing partial ownership', () => {
    const source = readFileSync(new URL(
      '../src/arena-v2-weapon-collection-preview-three-mount-owner-candidate-v1.ts',
      import.meta.url,
    ), 'utf8');
    expect(source).toMatch(/#operation: string \| null = null/u);
    expect(source).toMatch(/#reentrySequence = 0/u);
    expect(source).toMatch(/#reentryError: Error \| null = null/u);
    expect(source).not.toMatch(/#reentryAttempted/u);
    for (const operation of ['mount', 'destroy-mount', 'snapshot-read', 'destroy']) {
      expect(source).toContain(`#runSynchronousOperation('${operation}'`);
    }
    expect(source).toMatch(
      /built = buildMount\(parsed\);[\s\S]*?cleanupOwnedMountObjects\(built\.cleanup\)[\s\S]*?this\.#mounts\.set/u,
    );
    expect(source.indexOf('cleanupOwnedMountObjects(built.cleanup)'))
      .toBeLessThan(source.indexOf('this.#mounts.set(parsed.mountId'));
    for (const marker of [
      'swallowedThreeCallbackReentryFailsClosed: true',
      'failedMountReentryDoesNotPublishRecord: true',
      'destroyReentryCannotPublishDestroyedSuccess: true',
      'partialMutationSnapshotReadRejected: true',
      'stickyReentryUsesMonotonicSequenceAndFirstError: true',
      'mountBuildCheckedBeforeRecordPublication: true',
      'mountCleanupCheckedBeforeOwnershipRelease: true',
      'destroyReentryRetainsCurrentAndLaterMountOwners: true',
    ]) expect(source).toContain(marker);
  });

  it('当前生产批准账本允许构造零mount Owner，但任何武器都在clone前拒绝', () => {
    class CountingGroup extends THREE.Group {
      cloneCount = 0;

      override clone(recursive?: boolean): this {
        this.cloneCount += 1;
        return super.clone(recursive) as this;
      }
    }
    const snapshot = bindingSnapshot();
    const slot = snapshot.slots.find(({ kind }) => kind === 'weapon');
    if (slot === undefined) throw new Error('测试快照缺少武器slot。');
    const source = new CountingGroup();
    const owner = new ArenaV2WeaponCollectionPreviewThreeMountOwnerCandidateV1({
      schemaVersion: 1,
      bindingSnapshot: snapshot,
    });

    expect(() => owner.mount({
      schemaVersion: 1,
      mountId: 'forged-current-mount',
      tick: 11,
      bindingSnapshot: snapshot,
      slot,
      leaseResult: {
        schemaVersion: 1,
        status: 'ready',
        visibleSlotLeaseId: 'forged-lease',
        requestIdentity: '0'.repeat(64),
        assetId: slot.assetId,
        handle: source,
        fallbackActive: false,
      },
      screenId: 'weapon-index',
      viewport: { viewportId: '390x844', widthCssPixels: 390, heightCssPixels: 844 },
      previewRectCssPixels: { x: 16, y: 120, width: 96, height: 96 },
      reducedMotion: false,
    })).toThrow(/许可数为0|独立gate/u);
    expect(source.cloneCount).toBe(0);
    expect(owner.getSnapshot()).toMatchObject({ state: 'active', activeMountCount: 0 });
    owner.destroy();
    expect(owner.getSnapshot()).toMatchObject({ state: 'destroyed', activeMountCount: 0 });
  });

  it('生产批准账本identity漂移在Owner构造阶段失败关闭', () => {
    const snapshot = bindingSnapshot();
    const forged = {
      ...snapshot,
      contentIdentity: {
        ...snapshot.contentIdentity,
        productionApprovalLedgerContentHash: 'f'.repeat(64),
      },
    };
    expect(() => new ArenaV2WeaponCollectionPreviewThreeMountOwnerCandidateV1({
      schemaVersion: 1,
      bindingSnapshot: forged,
    })).toThrow(/生产批准账本|identity/u);
  });

  it('公开元数据固定当前0挂载与未来新账本独立门', () => {
    expect(ARENA_V2_A6_WEAPON_COLLECTION_PREVIEW_THREE_MOUNT_OWNER_CANDIDATE_V1)
      .toMatchObject({
        implementationStatus: 'code-written-not-run',
        validationStatus: 'not-run',
        hardGate: false,
        defaultSurfaceWired: false,
        currentProductionApprovedWeaponCount: 0,
        currentMountPermittedWeaponCount: 0,
        futureEnablementRequiresNewApprovalLedgerVersionAndIndependentGate: true,
        createsProgrammaticFormalModel: false,
        mountCleanupUsesPerResourceCompletionWatermarks: true,
        failedBuildCleanupDebtRetainedForDestroyRetry: true,
        destroyRetriesOnlyIncompleteMountCleanup: true,
        mutationReentrancyRejected: true,
        partialMutationSnapshotReadRejected: true,
      });
  });
});
