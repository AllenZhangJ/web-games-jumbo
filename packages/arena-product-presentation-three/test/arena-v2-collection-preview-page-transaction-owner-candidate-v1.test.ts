import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1,
  createArenaV2A6CurrentFormalPreviewAvailabilityV1,
} from '../src/arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';
import {
  ArenaV2CollectionFourScreenReadOwnerCandidateV1,
  type ArenaV2CollectionFourScreenReadSnapshotV1,
} from '../src/arena-v2-collection-four-screen-read-owner-candidate-v1.js';
import {
  ARENA_V2_COLLECTION_PREVIEW_PAGE_TRANSACTION_OWNER_CANDIDATE_V1,
  ArenaV2CollectionPreviewPageTransactionOwnerCandidateV1,
} from '../src/arena-v2-collection-preview-page-transaction-owner-candidate-v1.js';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function collectionContent() {
  const weapons = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
    .filter(({ kind }) => kind === 'weapon');
  const maps = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
    .filter(({ kind }) => kind === 'map');
  const authority = {
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSurfaceWired: false,
    ownerId: 'p5-content',
    weapons: weapons.map(({ definitionId }, index) => ({
      weaponDefinitionId: definitionId,
      collectionOrder: index + 1,
      displayName: `A6.12c Weapon ${index + 1}`,
      learningFocus: `Focus ${index + 1}`,
      coreVerb: 'read-shape',
    })),
    maps: maps.map(({ definitionId }, mapIndex) => ({
      mapDefinitionId: definitionId,
      displayName: `A6.12c Map ${mapIndex + 1}`,
      participantRange: '2–4人',
      segments: Array.from({ length: 10 }, (_, segmentIndex) => ({
        segmentDefinitionId: `a6.12c.map.${mapIndex}.segment.${segmentIndex}`,
        ordinal: segmentIndex + 1,
        displayName: `Segment ${mapIndex}-${segmentIndex}`,
        learningFocus: 'route',
        segmentKind: 'route',
        survivalRole: 'shared',
      })),
    })),
    sourceContentHash: 'a612c001',
  } as const;
  return {
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena V2 Information Collection Content Projection V1',
    ),
  };
}

function readSnapshot(): Readonly<{
  owner: ArenaV2CollectionFourScreenReadOwnerCandidateV1;
  snapshot: ArenaV2CollectionFourScreenReadSnapshotV1;
}> {
  const owner = new ArenaV2CollectionFourScreenReadOwnerCandidateV1({ epochId: 'epoch-a' });
  const snapshot = owner.consume({
    schemaVersion: 1,
    screenId: 'weapon-index',
    profileCollectionProgressInput: {
      schemaVersion: 1,
      epochId: 'epoch-a',
      tick: 0,
      locale: 'zh-CN',
      sourceState: 'loading',
      collectionContent: collectionContent(),
      profileDefinition: null,
      profile: null,
      eligibleWeaponDefinitionIds: null,
      diagnosticCode: null,
      observedProfileSchemaVersion: null,
      reducedMotion: true,
      muted: true,
      decorativeAssetState: 'missing',
    },
    detail: null,
    formalAssetCatalog: clone(ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1),
    availability: clone(createArenaV2A6CurrentFormalPreviewAvailabilityV1()),
  });
  return Object.freeze({ owner, snapshot });
}

describe('Arena V2 A6.12c page transaction current approval closure（未运行）', () => {
  it('P6.221 publishes the page step Owner before A6.11c and guards terminal commits', () => {
    const source = readFileSync(new URL(
      '../src/arena-v2-collection-preview-page-transaction-owner-candidate-v1.ts',
      import.meta.url,
    ), 'utf8');
    expect(source).toMatch(/#operation: string \| null = null/u);
    expect(source).toMatch(/#reentrySequence = 0/u);
    expect(source).toMatch(/#reentryError: Error \| null = null/u);
    expect(source).not.toMatch(/#reentryAttempted/u);
    for (const operation of [
      'step',
      'resource-fulfilled',
      'resource-rejected',
      'snapshot-refresh',
      'mount-snapshot-read',
      'render-facts-read',
      'destroy',
    ]) expect(source).toContain(`#runSynchronousOperation('${operation}'`);
    expect(source).toMatch(
      /this\.#inFlightPromise = operation;[\s\S]*?resourcePromise = this\.#resourceOwner\.execute\(\{/u,
    );
    expect(source).toMatch(/resource完成时拒绝状态\$\{this\.#state\}复活/u);
    for (const marker of [
      'synchronousLifecycleOperationReentryRejected: true',
      'swallowedChildReentryRejectedBeforeSuccessCommit: true',
      'stepOwnerPublishedBeforeResourceExecute: true',
      'resourceSettlementCommitsUnderOperationGuard: true',
      'failedOwnerCannotBeRevivedByLateFulfillment: true',
      'publicReadsRejectedDuringOperationCommit: true',
      'stickyReentryUsesMonotonicSequenceAndFirstError: true',
      'layoutPlannerMountResourceAndSnapshotCallbacksCheckedBeforeStateCommit: true',
      'asyncResourceSubmissionCapturedBeforeCommitCheck: true',
      'destroyReentryRetainsCurrentAndLaterOwners: true',
    ]) expect(source).toContain(marker);
  });

  it('当前20武器页面只提交fallback，零loader、零租约、零mount', async () => {
    const fixture = readSnapshot();
    let loaderCalls = 0;
    const owner = new ArenaV2CollectionPreviewPageTransactionOwnerCandidateV1({
      schemaVersion: 1,
      bindingSnapshot: fixture.snapshot.formalAssetLeaseBinding,
      underlyingLoader: Object.freeze({
        load(): never {
          loaderCalls += 1;
          throw new Error('当前许可数0不得调用底层loader。');
        },
      }),
    });
    const slotLayouts = fixture.snapshot.previewSlots.map((slot, index) => Object.freeze({
      kind: slot.kind,
      definitionId: slot.definitionId,
      assetId: slot.assetId,
      ordinal: slot.ordinal,
      previewRectCssPixels: index < 2
        ? Object.freeze({ x: 24 + index * 96, y: 120, width: 80, height: 80 })
        : Object.freeze({ x: 24, y: 900 + index * 90, width: 80, height: 80 }),
    }));
    const result = await owner.step({
      schemaVersion: 1,
      epochId: fixture.snapshot.epochId,
      tick: fixture.snapshot.tick,
      screenId: fixture.snapshot.screenId,
      viewport: Object.freeze({
        viewportId: '390x844',
        widthCssPixels: 390,
        heightCssPixels: 844,
      }),
      readSnapshot: fixture.snapshot,
      contentClipRectCssPixels: Object.freeze({ x: 12, y: 96, width: 366, height: 600 }),
      slotLayouts: Object.freeze(slotLayouts),
    });

    expect(result.plan.acquireCommands).toHaveLength(0);
    expect(result.plan.nextActiveLeaseLedger).toHaveLength(0);
    expect(result.plan.fallbackSlots).toHaveLength(2);
    expect(result.executionResult.activeRecords).toHaveLength(0);
    expect(result.mountSnapshot).toMatchObject({ mountedCount: 0, readyLeaseCount: 0 });
    expect(owner.getSnapshot()).toMatchObject({
      state: 'active',
      activeLeaseCount: 0,
      pendingLeaseCount: 0,
      readyLeaseCount: 0,
      mountedCount: 0,
      staticFallbackCount: 2,
    });
    expect(loaderCalls).toBe(0);
  });

  it('公开治理状态不把未来资源生命周期冒充当前许可', () => {
    expect(ARENA_V2_COLLECTION_PREVIEW_PAGE_TRANSACTION_OWNER_CANDIDATE_V1)
      .toMatchObject({
        implementationStatus: 'code-written-not-run',
        validationStatus: 'not-run',
        hardGate: false,
        defaultSurfaceWired: false,
      });
  });
});
