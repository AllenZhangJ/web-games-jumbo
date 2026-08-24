import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
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
import type {
  ArenaV2A6WeaponPreviewRectCssPixelsV1,
  ArenaV2A6WeaponPreviewViewportV1,
} from '../src/arena-v2-weapon-collection-preview-three-mount-owner-candidate-v1.js';
import {
  ARENA_V2_COLLECTION_VISIBLE_LAYOUT_OBSERVATION_OWNER_CANDIDATE_V1,
  ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1,
  type ArenaV2CollectionPreviewSlotLayoutObservationInputV1,
} from '../src/arena-v2-collection-visible-layout-observation-owner-candidate-v1.js';
import {
  ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1,
} from '../src/arena-v2-collection-visible-preview-lease-command-planning-owner-candidate-v1.js';

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
      displayName: `A6.12a Weapon ${index + 1}`,
      learningFocus: `Focus ${index + 1}`,
      coreVerb: 'control-space',
    })),
    maps: maps.map(({ definitionId }, mapIndex) => ({
      mapDefinitionId: definitionId,
      displayName: `A6.12a Map ${mapIndex + 1}`,
      participantRange: '2–4人',
      segments: Array.from({ length: 10 }, (_, segmentIndex) => ({
        segmentDefinitionId: `a6.12a.map.${mapIndex}.segment.${segmentIndex}`,
        ordinal: segmentIndex + 1,
        displayName: `Segment ${mapIndex}-${segmentIndex}`,
        learningFocus: 'route-control',
        segmentKind: 'route',
        survivalRole: 'shared',
      })),
    })),
    sourceContentHash: 'a612cafe',
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
  missingAssetIds: readonly string[] = [],
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
    availability: clone(createArenaV2A6CurrentFormalPreviewAvailabilityV1(missingAssetIds)),
  });
  owner.destroy();
  return snapshot;
}

function readSnapshot(
  screenId: ArenaV2CollectionFourScreenIdV1,
  tick: number,
  options: Readonly<{
    epochId?: string;
    missingAssetIds?: readonly string[];
    detailOrdinal?: number;
  }> = {},
): ArenaV2CollectionFourScreenReadSnapshotV1 {
  const epochId = options.epochId ?? 'epoch-a';
  const binding = bindingSnapshot(epochId, tick, options.missingAssetIds);
  const kind = screenId.startsWith('weapon') ? 'weapon' : 'map';
  const detail = screenId.endsWith('-detail');
  const slots = binding.slots
    .filter((slot) => slot.kind === kind)
    .filter((_, index) => !detail || index === (options.detailOrdinal ?? 1) - 1)
    .map((slot) => {
      const previewStrategy = slot.previewStrategies
        .find((candidate) => candidate.screenId === screenId)!;
      const { previewStrategies: _strategies, ...base } = slot;
      void _strategies;
      return Object.freeze({ ...base, previewStrategy });
    });
  const page = Object.freeze({
    ...(detail ? {
      screenId,
      targetDefinitionId: slots[0]!.definitionId,
    } : {}),
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

function clip(id: '390x844' | '1440x900'): ArenaV2A6WeaponPreviewRectCssPixelsV1 {
  return id === '390x844'
    ? Object.freeze({ x: 12, y: 96, width: 366, height: 600 })
    : Object.freeze({ x: 12, y: 96, width: 1416, height: 520 });
}

function slotLayouts(
  snapshot: ArenaV2CollectionFourScreenReadSnapshotV1,
  viewportId: '390x844' | '1440x900',
): ArenaV2CollectionPreviewSlotLayoutObservationInputV1[] {
  const detail = snapshot.screenId.endsWith('-detail');
  return snapshot.previewSlots.map((slot, index) => {
    const rect = detail
      ? viewportId === '390x844'
        ? { x: 95, y: 220, width: 200, height: 200 }
        : { x: 590, y: 210, width: 260, height: 260 }
      : viewportId === '390x844'
        ? { x: 24, y: 120 + index * 96, width: 80, height: 80 }
        : {
          x: 24 + (index % 10) * 132,
          y: 120 + Math.floor(index / 10) * 132,
          width: 112,
          height: 112,
        };
    return {
      kind: slot.kind,
      definitionId: slot.definitionId,
      assetId: slot.assetId,
      ordinal: slot.ordinal,
      previewRectCssPixels: rect,
    };
  });
}

function input(
  snapshot: ArenaV2CollectionFourScreenReadSnapshotV1,
  viewportId: '390x844' | '1440x900',
  layouts = slotLayouts(snapshot, viewportId),
  previousActiveLeaseLedger: readonly unknown[] = [],
) {
  return {
    schemaVersion: 1,
    epochId: snapshot.epochId,
    tick: snapshot.tick,
    screenId: snapshot.screenId,
    viewport: viewport(viewportId),
    readSnapshot: snapshot,
    previousActiveLeaseLedger,
    contentClipRectCssPixels: clip(viewportId),
    slotLayouts: layouts,
  };
}

describe('Arena V2 A6.12a visible layout observation owner candidate V1', () => {
  it('classifies the mobile weapon index and emits planner/mount inputs without resources', () => {
    const snapshot = readSnapshot('weapon-index', 10);
    const owner = new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    const result = owner.observe(input(snapshot, '390x844'));
    expect(result.plannerViewport).toBe('390x844');
    expect(result.mountViewport).toEqual(viewport('390x844'));
    expect(result.allSlotVisibility).toHaveLength(20);
    expect(result.plannerInput.visibleDefinitionIds).toEqual(
      result.allSlotVisibility
        .filter(({ visibility }) => visibility === 'fully-visible')
        .map(({ definitionId }) => definitionId),
    );
    expect(result.visibleWeaponMountLayouts).toEqual([]);
    expect(result.visibleStaticFallbackLayouts).toHaveLength(6);
    expect(result.allSlotVisibility[6]?.visibility).toBe('outside');
    expect(result.bindingValidation).toEqual({
      validator: 'A6.6-rejecting-short-lifecycle',
      validatedSlotCount: 22,
      loaderCallCount: 0,
      disposerCallCount: 0,
      activeLeaseCount: 0,
    });
    const planner = new ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    const plan = planner.plan(result.plannerInput);
    expect(plan.acquireCommands).toEqual([]);
    expect(plan.nextActiveLeaseLedger).toEqual([]);
    expect(plan.fallbackSlots).toHaveLength(6);
    planner.destroy();
    expect(ARENA_V2_COLLECTION_VISIBLE_LAYOUT_OBSERVATION_OWNER_CANDIDATE_V1)
      .toMatchObject({ readsDom: false, createsThree: false, loadsResources: false });
  });

  it('uses desktop layout minimums and supports a high-tick scrolling row change', () => {
    const owner = new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    const firstSnapshot = readSnapshot('weapon-index', 10);
    const first = owner.observe(input(firstSnapshot, '1440x900'));
    expect(first.allSlotVisibility.every(({ requiredMinimumSlotCssPixels }) => (
      requiredMinimumSlotCssPixels === 96
    ))).toBe(true);
    expect(first.visibleWeaponMountLayouts).toEqual([]);
    expect(first.visibleStaticFallbackLayouts).toHaveLength(20);

    const nextSnapshot = readSnapshot('weapon-index', 11);
    const nextLayouts = slotLayouts(nextSnapshot, '1440x900').map((layout, index) => ({
      ...layout,
      previewRectCssPixels: {
        ...layout.previewRectCssPixels,
        y: layout.previewRectCssPixels.y - (index < 10 ? 700 : 132),
      },
    }));
    const next = owner.observe(input(nextSnapshot, '1440x900', nextLayouts));
    expect(next.plannerInput.visibleDefinitionIds).toEqual(
      nextSnapshot.previewSlots.slice(10).map(({ definitionId }) => definitionId),
    );
  });

  it('keeps clipped slots out and requires the unique detail selection fully visible', () => {
    const indexSnapshot = readSnapshot('weapon-index', 1);
    const indexLayouts = slotLayouts(indexSnapshot, '390x844');
    indexLayouts[0] = {
      ...indexLayouts[0]!,
      previewRectCssPixels: { x: 24, y: 60, width: 80, height: 80 },
    };
    const indexOwner = new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    const indexResult = indexOwner.observe(input(indexSnapshot, '390x844', indexLayouts));
    expect(indexResult.allSlotVisibility[0]?.visibility).toBe('clipped');
    expect(indexResult.plannerInput.visibleDefinitionIds).not.toContain(
      indexSnapshot.previewSlots[0]?.definitionId,
    );

    const detailSnapshot = readSnapshot('weapon-detail', 1);
    const detailOwner = new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    expect(detailOwner.observe(input(detailSnapshot, '390x844')).visibleWeaponMountLayouts)
      .toEqual([]);
    const clippedDetail = slotLayouts(detailSnapshot, '390x844');
    clippedDetail[0] = {
      ...clippedDetail[0]!,
      previewRectCssPixels: { x: 95, y: 40, width: 200, height: 200 },
    };
    const rejectedOwner = new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    expect(() => rejectedOwner.observe(input(detailSnapshot, '390x844', clippedDetail)))
      .toThrow(/detail.*fully-visible/);
  });

  it('routes maps and missing weapons to static fallback only', () => {
    const mapSnapshot = readSnapshot('map-index', 0);
    const mapOwner = new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    const maps = mapOwner.observe(input(mapSnapshot, '1440x900'));
    expect(maps.visibleWeaponMountLayouts).toEqual([]);
    expect(maps.visibleStaticFallbackLayouts).toHaveLength(2);
    expect(maps.visibleStaticFallbackLayouts.every(({ requestPermitted, reason }) => (
      requestPermitted === false && reason === 'map-formal-preview-not-approved'
    ))).toBe(true);

    const firstWeapon = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
      .find(({ kind }) => kind === 'weapon')!;
    const missingSnapshot = readSnapshot('weapon-index', 0, {
      missingAssetIds: [firstWeapon.assetId],
    });
    const missingOwner = new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    const missing = missingOwner.observe(input(missingSnapshot, '390x844'));
    expect(missing.visibleStaticFallbackLayouts[0]).toMatchObject({
      definitionId: firstWeapon.definitionId,
      reason: 'missing-or-unapproved-weapon',
      requestPermitted: false,
    });
    expect(missing.visibleWeaponMountLayouts.some(({ assetId }) => (
      assetId === firstWeapon.assetId
    ))).toBe(false);
  });

  it('rejects undersized/safe-inset, duplicate, missing and unknown current-page layouts', () => {
    const snapshot = readSnapshot('weapon-index', 0);
    const layouts = slotLayouts(snapshot, '1440x900');
    const tooSmall = clone(layouts);
    tooSmall[0] = {
      ...tooSmall[0]!,
      previewRectCssPixels: { x: 24, y: 120, width: 95, height: 96 },
    };
    expect(() => new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({
      epochId: 'epoch-a',
    }).observe(input(snapshot, '1440x900', tooSmall))).toThrow(/minimumSlot|safeInset/);

    const duplicate = clone(layouts);
    duplicate[1] = clone(duplicate[0]!);
    expect(() => new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({
      epochId: 'epoch-a',
    }).observe(input(snapshot, '1440x900', duplicate))).toThrow(/重复|错序|漂移/);
    expect(() => new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({
      epochId: 'epoch-a',
    }).observe(input(snapshot, '1440x900', layouts.slice(1)))).toThrow(/一一对应/);
    const unknown = clone(layouts);
    unknown[0] = { ...unknown[0]!, definitionId: 'unknown.weapon' };
    expect(() => new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({
      epochId: 'epoch-a',
    }).observe(input(snapshot, '1440x900', unknown))).toThrow(/未知|漂移/);

    const detail = readSnapshot('weapon-detail', 0);
    const desktopDetail = slotLayouts(detail, '1440x900');
    desktopDetail[0] = {
      ...desktopDetail[0]!,
      previewRectCssPixels: { x: 590, y: 210, width: 239, height: 240 },
    };
    expect(() => new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({
      epochId: 'epoch-a',
    }).observe(input(detail, '1440x900', desktopDetail))).toThrow(/minimumSlot|safeInset/);
    const validDesktopDetail = slotLayouts(detail, '1440x900');
    validDesktopDetail[0] = {
      ...validDesktopDetail[0]!,
      previewRectCssPixels: { x: 590, y: 210, width: 240, height: 240 },
    };
    expect(new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({
      epochId: 'epoch-a',
    }).observe(input(detail, '1440x900', validDesktopDetail)).visibleWeaponMountLayouts)
      .toHaveLength(1);

    const fractional = clone(layouts);
    fractional[0] = {
      ...fractional[0]!,
      previewRectCssPixels: { x: 24.5, y: 120, width: 112, height: 112 },
    };
    expect(() => new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({
      epochId: 'epoch-a',
    }).observe(input(snapshot, '1440x900', fractional))).toThrow(/安全整数/);

    const outsideClip = input(snapshot, '1440x900', layouts);
    outsideClip.contentClipRectCssPixels = { x: -1, y: 96, width: 1416, height: 520 };
    expect(() => new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({
      epochId: 'epoch-a',
    }).observe(outsideClip)).toThrow(/完整位于viewport/);
  });

  it('is same-tick idempotent, rejects same-tick rect conflict and permits high-tick screen changes', () => {
    const owner = new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    const firstSnapshot = readSnapshot('weapon-index', 4);
    const firstInput = input(firstSnapshot, '390x844');
    const first = owner.observe(firstInput);
    expect(owner.observe(firstInput)).toBe(first);
    const conflict = clone(firstInput);
    conflict.slotLayouts = conflict.slotLayouts.map((layout, index) => index === 0
      ? {
        ...layout,
        previewRectCssPixels: {
          ...layout.previewRectCssPixels,
          y: layout.previewRectCssPixels.y + 1,
        },
      }
      : layout);
    expect(() => owner.observe(conflict)).toThrow(/同tick.*冲突/);
    expect(owner.getSnapshot()).toBe(first);

    const mapSnapshot = readSnapshot('map-index', 5);
    const map = owner.observe(input(mapSnapshot, '1440x900'));
    expect(map.screenId).toBe('map-index');
    expect(map.mountViewport.viewportId).toBe('1440x900');
    expect(() => owner.observe(input(readSnapshot('weapon-index', 3), '390x844')))
      .toThrow(/tick回退/);
    expect(owner.getSnapshot()).toBe(map);

    const detailOwner = new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    const detailA = detailOwner.observe(input(
      readSnapshot('weapon-detail', 8, { detailOrdinal: 1 }),
      '390x844',
    ));
    const detailB = detailOwner.observe(input(
      readSnapshot('weapon-detail', 9, { detailOrdinal: 2 }),
      '390x844',
    ));
    expect(detailB.plannerInput.visibleDefinitionIds[0])
      .not.toBe(detailA.plannerInput.visibleDefinitionIds[0]);
  });

  it('rejects same-epoch binding drift and keeps the last valid snapshot', () => {
    const owner = new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    const firstSnapshot = readSnapshot('weapon-index', 0);
    const first = owner.observe(input(firstSnapshot, '390x844'));
    const firstWeapon = firstSnapshot.previewSlots[0]!;
    const drifted = readSnapshot('weapon-index', 1, {
      missingAssetIds: [firstWeapon.assetId],
    });
    expect(() => owner.observe(input(drifted, '390x844')))
      .toThrow(/租约\/视觉合同漂移/);
    expect(owner.getSnapshot()).toBe(first);
  });

  it('rejects getter/thenable/future fields and destroys idempotently', () => {
    const owner = new ArenaV2CollectionVisibleLayoutObservationOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    const snapshot = readSnapshot('weapon-detail', 0);
    const first = owner.observe(input(snapshot, '390x844'));
    let getterCalls = 0;
    const hostile = Object.defineProperty({}, 'schemaVersion', {
      enumerable: true,
      get() { getterCalls += 1; return 1; },
    });
    expect(() => owner.observe(hostile)).toThrow(/data|getter|accessor|数据/i);
    expect(getterCalls).toBe(0);
    let thenCalls = 0;
    expect(() => owner.observe({
      ...input(readSnapshot('weapon-detail', 1), '390x844'),
      then() { thenCalls += 1; },
    })).toThrow(/thenable|不支持字段 then|数据/i);
    expect(thenCalls).toBe(0);
    expect(() => owner.observe({
      ...input(readSnapshot('weapon-detail', 1), '390x844'),
      future: true,
    })).toThrow(/不支持字段 future/);
    expect(owner.getSnapshot()).toBe(first);
    owner.destroy();
    owner.destroy();
    expect(owner.state).toBe('destroyed');
    expect(() => owner.getSnapshot()).toThrow(/destroyed/);
  });
});
