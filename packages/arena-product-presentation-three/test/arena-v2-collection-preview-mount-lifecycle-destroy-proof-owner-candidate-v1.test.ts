import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1,
  ArenaV2CollectionFormalAssetReuseBindingCandidateV1,
  createArenaV2A6CurrentFormalPreviewAvailabilityV1,
  type ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1,
} from '../src/arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';
import type {
  ArenaV2CollectionFourScreenIdV1,
  ArenaV2CollectionFourScreenReadSnapshotV1,
} from '../src/arena-v2-collection-four-screen-read-owner-candidate-v1.js';
import {
  ARENA_V2_COLLECTION_PREVIEW_MOUNT_LIFECYCLE_DESTROY_PROOF_OWNER_CANDIDATE_V1,
  ArenaV2CollectionPreviewMountLifecycleDestroyProofOwnerCandidateV1,
} from '../src/arena-v2-collection-preview-mount-lifecycle-destroy-proof-owner-candidate-v1.js';
import type {
  ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1,
} from '../src/arena-v2-collection-visible-preview-lease-command-execution-owner-candidate-v1.js';
import {
  ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1,
  type ArenaV2CollectionPreviewSlotLayoutObservationInputV1,
  type ArenaV2CollectionVisibleLayoutObservationSnapshotV1,
} from '../src/arena-v2-collection-visible-layout-observation-owner-candidate-v1.js';
import type {
  ArenaV2A6WeaponPreviewViewportV1,
} from '../src/arena-v2-weapon-collection-preview-three-mount-owner-candidate-v1.js';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

it('P6.320 isolates mount/proof lifecycle commits with sticky child reentry facts', () => {
  const source = readFileSync(new URL(
    '../src/arena-v2-collection-preview-mount-lifecycle-destroy-proof-owner-candidate-v1.ts',
    import.meta.url,
  ), 'utf8');
  expect(source).toMatch(/#operation: string \| null = null/u);
  expect(source).toMatch(/#reentrySequence = 0/u);
  expect(source).toMatch(/#reentryError: Error \| null = null/u);
  expect(source).not.toMatch(/#reentryAttempted/u);
  for (const operation of [
    'constructor-snapshot', 'commit-execution', 'prepare-release',
    'read-destroyed-proof', 'commit-release', 'rollback-release',
    'prepare-owner-destroy', 'finalize-destroy', 'reset-epoch',
    'snapshot-read', 'lease-settled', 'lease-rejected',
  ]) expect(source).toMatch(new RegExp(
    `#runSynchronousOperation\\(\\s*'${operation}'`,
    'u',
  ));
  for (const marker of [
    'synchronousLifecycleOperationReentryRejected: true',
    'swallowedA6_9CallbackReentryFailsMountLifecycleOwner: true',
    'leaseSettlementCommitsUnderOperationGuard: true',
    'proofReadAndReleaseCommitAreOperationIsolated: true',
    'publicReadsRejectedDuringOperationCommit: true',
    'stickyReentryUsesMonotonicSequenceAndFirstError: true',
    'mountProofSettlementAndSnapshotCallbacksCheckedBeforeStateCommit: true',
    'cleanupReentryRetainsCurrentAndLaterOwners: true',
  ]) expect(source).toContain(marker);
});

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
      displayName: `A6.12b Weapon ${index + 1}`,
      learningFocus: `Focus ${index + 1}`,
      coreVerb: 'control-space',
    })),
    maps: maps.map(({ definitionId }, mapIndex) => ({
      mapDefinitionId: definitionId,
      displayName: `A6.12b Map ${mapIndex + 1}`,
      participantRange: '2–4人',
      segments: Array.from({ length: mapIndex === 0 ? 12 : 8 }, (_, segmentIndex) => ({
        segmentDefinitionId: `a6.12b.map.${mapIndex}.segment.${segmentIndex}`,
        ordinal: segmentIndex + 1,
        displayName: `Segment ${mapIndex}-${segmentIndex}`,
        learningFocus: 'route-control',
        segmentKind: 'route',
        survivalRole: 'shared',
      })),
    })),
    sourceContentHash: 'a612b001',
  };
  return {
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena V2 Information Collection Content Projection V1',
    ),
  };
}

function bindingSnapshot(
  epochId: string,
  tick: number,
): ArenaV2A6CollectionFormalAssetReuseBindingSnapshotV1 {
  const owner = new ArenaV2CollectionFormalAssetReuseBindingCandidateV1({ epochId });
  const snapshot = owner.consume({
    schemaVersion: 1,
    collectionProgressInput: {
      schemaVersion: 1,
      epochId,
      tick,
      locale: 'zh-CN',
      sourceState: 'loading',
      profileIdentity: null,
      collectionContent: collectionContent(),
      progressFacts: null,
      nextGoalIdentity: null,
      diagnosticCode: null,
      observedProfileSchemaVersion: null,
      reducedMotion: true,
      muted: true,
      decorativeAssetState: 'missing',
    },
    formalAssetCatalog: clone(ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1),
    availability: clone(createArenaV2A6CurrentFormalPreviewAvailabilityV1()),
  });
  owner.destroy();
  return snapshot;
}

function readSnapshot(
  screenId: ArenaV2CollectionFourScreenIdV1,
  tick: number,
  epochId = 'epoch-a',
): ArenaV2CollectionFourScreenReadSnapshotV1 {
  const binding = bindingSnapshot(epochId, tick);
  const kind = screenId.startsWith('weapon') ? 'weapon' : 'map';
  const detail = screenId.endsWith('-detail');
  const slots = binding.slots
    .filter((slot) => slot.kind === kind)
    .filter((_, index) => !detail || index === 0)
    .map((slot) => {
      const previewStrategy = slot.previewStrategies
        .find((candidate) => candidate.screenId === screenId)!;
      const { previewStrategies: _strategies, ...base } = slot;
      void _strategies;
      return Object.freeze({ ...base, previewStrategy });
    });
  const page = Object.freeze({
    ...(detail ? { screenId, targetDefinitionId: slots[0]!.definitionId } : {}),
    profileIdentity: null,
  });
  return Object.freeze({
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSurfaceWired: false,
    validationStatus: 'not-run',
    epochId,
    tick,
    screenId,
    sourceState: 'loading',
    indexPage: detail ? null : page,
    detailPage: detail ? page : null,
    previewSlots: Object.freeze(slots),
    formalAssetLeaseBinding: binding,
    formalAssetGovernance: Object.freeze({
      contentIdentity: binding.contentIdentity,
      budget: binding.budget,
      layouts: binding.layouts,
      accessibility: binding.accessibility,
      governance: binding.governance,
      loadsResourcesHere: false,
      ownsThreeResourcesHere: false,
    }),
  }) as unknown as ArenaV2CollectionFourScreenReadSnapshotV1;
}

function viewport(id: '390x844' | '1440x900'): ArenaV2A6WeaponPreviewViewportV1 {
  return id === '390x844'
    ? Object.freeze({ viewportId: id, widthCssPixels: 390, heightCssPixels: 844 })
    : Object.freeze({ viewportId: id, widthCssPixels: 1440, heightCssPixels: 900 });
}

function layoutSnapshot(options: Readonly<{
  tick: number;
  screenId: 'weapon-index' | 'weapon-detail';
  viewportId: '390x844' | '1440x900';
  epochId?: string;
}>): ArenaV2CollectionVisibleLayoutObservationSnapshotV1 {
  const epochId = options.epochId ?? 'epoch-a';
  const read = readSnapshot(options.screenId, options.tick, epochId);
  const detail = options.screenId === 'weapon-detail';
  const slotLayouts: readonly ArenaV2CollectionPreviewSlotLayoutObservationInputV1[] =
    Object.freeze(read.previewSlots.map((slot, index) => Object.freeze({
      kind: slot.kind,
      definitionId: slot.definitionId,
      assetId: slot.assetId,
      ordinal: slot.ordinal,
      previewRectCssPixels: detail
        ? options.viewportId === '390x844'
          ? Object.freeze({ x: 95, y: 220, width: 200, height: 200 })
          : Object.freeze({ x: 590, y: 210, width: 260, height: 260 })
        : Object.freeze({
          x: 24 + (index % 10) * 132,
          y: 120 + Math.floor(index / 10) * 132,
          width: 112,
          height: 112,
        }),
    })));
  const owner = new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({ epochId });
  const result = owner.observe({
    schemaVersion: 1,
    epochId,
    tick: options.tick,
    screenId: options.screenId,
    viewport: viewport(options.viewportId),
    readSnapshot: read,
    previousActiveLeaseLedger: [],
    contentClipRectCssPixels: options.viewportId === '390x844'
      ? Object.freeze({ x: 12, y: 96, width: 366, height: 600 })
      : Object.freeze({ x: 12, y: 96, width: 1416, height: 520 }),
    slotLayouts,
  });
  owner.destroy();
  return result;
}

function fallbackExecution(
  layout: ArenaV2CollectionVisibleLayoutObservationSnapshotV1,
): ArenaV2CollectionVisiblePreviewLeaseCommandExecutionResultV1 {
  return Object.freeze({
    schemaVersion: 1,
    status: 'production-unreachable',
    validationStatus: 'not-run',
    productionReachable: false,
    defaultSurfaceWired: false,
    epochId: layout.epochId,
    tick: layout.tick,
    screenId: layout.screenId,
    planIdentity: `fallback-plan-${layout.tick}`,
    releaseBarrierProofs: Object.freeze([]),
    activeRecords: Object.freeze([]),
    fallbackSlots: Object.freeze(layout.visibleStaticFallbackLayouts.map((fallback) => Object.freeze({
      schemaVersion: 1 as const,
      kind: fallback.kind,
      definitionId: fallback.definitionId,
      assetId: fallback.assetId,
      ordinal: fallback.ordinal,
      reason: fallback.reason,
      previewSourceUse: fallback.previewSourceUse,
      fallbackContent: fallback.fallbackContent,
      requestPermitted: false as const,
    }))),
    assetReadyCount: 0,
    leaseFallbackCount: 0,
    staticFallbackCount: layout.visibleStaticFallbackLayouts.length,
  });
}

function ownerFor(layout: ArenaV2CollectionVisibleLayoutObservationSnapshotV1) {
  return new ArenaV2CollectionPreviewMountLifecycleDestroyProofOwnerCandidateV1({
    schemaVersion: 1,
    bindingSnapshot: layout.plannerInput.readSnapshot.formalAssetLeaseBinding,
  });
}

describe('Arena V2 A6.12b current production approval boundary', () => {
  it('commits one visible weapon as static fallback with zero lease or mount', () => {
    const layout = layoutSnapshot({ tick: 10, screenId: 'weapon-detail', viewportId: '390x844' });
    expect(layout.visibleWeaponMountLayouts).toEqual([]);
    expect(layout.visibleStaticFallbackLayouts).toHaveLength(1);
    const owner = ownerFor(layout);
    const input = Object.freeze({
      schemaVersion: 1 as const,
      executionResult: fallbackExecution(layout),
      layoutSnapshot: layout,
    });
    const first = owner.commitExecution(input);
    expect(first).toMatchObject({
      activeLeaseCount: 0,
      pendingLeaseCount: 0,
      readyLeaseCount: 0,
      mountedCount: 0,
      staticFallbackCount: 1,
    });
    expect(owner.commitExecution(input)).toBe(first);
  });

  it('commits all twenty desktop weapon cards as fallback without resource ownership', () => {
    const layout = layoutSnapshot({ tick: 10, screenId: 'weapon-index', viewportId: '1440x900' });
    expect(layout.visibleWeaponMountLayouts).toEqual([]);
    expect(layout.visibleStaticFallbackLayouts).toHaveLength(20);
    const owner = ownerFor(layout);
    expect(owner.commitExecution({
      schemaVersion: 1,
      executionResult: fallbackExecution(layout),
      layoutSnapshot: layout,
    })).toMatchObject({
      activeLeaseCount: 0,
      mountedCount: 0,
      staticFallbackCount: 20,
      loadsGltf: false,
    });
  });

  it('prepares and finalizes zero-resource owner destroy without forging proofs', () => {
    const layout = layoutSnapshot({ tick: 10, screenId: 'weapon-detail', viewportId: '390x844' });
    const owner = ownerFor(layout);
    owner.commitExecution({
      schemaVersion: 1,
      executionResult: fallbackExecution(layout),
      layoutSnapshot: layout,
    });
    expect(owner.prepareAllForOwnerDestroy({ schemaVersion: 1, tick: 11 }))
      .toMatchObject({
        state: 'destroy-prepared',
        preparedLeaseCount: 0,
        proofCount: 0,
        failedMountLeaseIds: [],
      });
    expect(owner.finalizeDestroy({
      schemaVersion: 1,
      tick: 11,
      resourceOwnerState: 'destroyed',
    })).toMatchObject({ state: 'destroyed', activeLeaseCount: 0, mountedCount: 0 });
  });

  it('resets an empty owner into an independent epoch time domain', () => {
    const layout = layoutSnapshot({ tick: 10, screenId: 'weapon-detail', viewportId: '390x844' });
    const owner = ownerFor(layout);
    expect(owner.resetPresentationEpoch({
      schemaVersion: 1,
      tick: 10,
      nextBindingSnapshot: bindingSnapshot('epoch-b', 0),
    })).toMatchObject({ epochId: 'epoch-b', lastTick: 0, activeLeaseCount: 0 });
  });

  it('rejects future fields and accessors before replacing the current fallback snapshot', () => {
    const layout = layoutSnapshot({ tick: 10, screenId: 'weapon-detail', viewportId: '390x844' });
    const owner = ownerFor(layout);
    const valid = {
      schemaVersion: 1 as const,
      executionResult: fallbackExecution(layout),
      layoutSnapshot: layout,
    };
    const committed = owner.commitExecution(valid);
    expect(() => owner.commitExecution({ ...valid, future: true }))
      .toThrow(/exact-key|future/u);
    let getterCalls = 0;
    const hostile = Object.defineProperty({}, 'schemaVersion', {
      enumerable: true,
      get() { getterCalls += 1; return 1; },
    });
    expect(() => owner.commitExecution(hostile)).toThrow(/exact-key|数据|getter|accessor/u);
    expect(getterCalls).toBe(0);
    expect(owner.getSnapshot()).toBe(committed);
  });

  it('publishes the current zero-permission governance boundary', () => {
    expect(ARENA_V2_COLLECTION_PREVIEW_MOUNT_LIFECYCLE_DESTROY_PROOF_OWNER_CANDIDATE_V1)
      .toMatchObject({
        status: 'production-unreachable',
        implementationStatus: 'code-written-not-run',
        validationStatus: 'not-run',
        hardGate: false,
        defaultSurfaceWired: false,
        ownsA6_9MountOwner: true,
        ownsOrReleasesA6_6: false,
        loadsGltf: false,
        createsRenderer: false,
        maximumActiveWeaponLeases: 20,
      });
  });
});
