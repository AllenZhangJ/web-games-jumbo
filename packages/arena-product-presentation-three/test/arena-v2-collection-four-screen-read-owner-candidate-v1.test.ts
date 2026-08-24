import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1,
  createArenaV2A6CurrentFormalPreviewAvailabilityV1,
} from '../src/arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';
import {
  ArenaV2CollectionFormalPreviewLeaseOwnerCandidateV1,
} from '../src/arena-v2-collection-formal-preview-lease-owner-candidate-v1.js';
import {
  ARENA_V2_COLLECTION_FOUR_SCREEN_READ_OWNER_CANDIDATE_V1,
  ARENA_V2_COLLECTION_FOUR_SCREEN_READ_OWNER_STATE_V1,
  ArenaV2CollectionFourScreenReadOwnerCandidateV1,
  type ArenaV2CollectionFourScreenIdV1,
} from '../src/arena-v2-collection-four-screen-read-owner-candidate-v1.js';

const WEAPON_CONTEXTS = Object.freeze([
  'ground', 'aerial', 'edge', 'duel-counterplay', 'survival',
] as const);
const WEAPON_FIELDS = Object.freeze([
  'range-coverage', 'timing-risk', 'ground-aerial', 'counter-inputs', 'map-consequences',
] as const);
const MAP_FIELDS = Object.freeze([
  'route-goal', 'hazard-summary', 'full-route', 'weapon-consequences',
] as const);
const WEAPON_IDS = Object.freeze(
  ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
    .filter(({ kind }) => kind === 'weapon')
    .map(({ definitionId }) => definitionId),
);
const MAP_IDS = Object.freeze(
  ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
    .filter(({ kind }) => kind === 'map')
    .map(({ definitionId }) => definitionId),
);
const MAP_DEFINITIONS = Object.freeze(MAP_IDS.map((mapDefinitionId, mapIndex) => Object.freeze({
  mapDefinitionId,
  segmentDefinitionIds: Object.freeze(Array.from(
    { length: 10 },
    (_, segmentIndex) => `a6.8.map.${mapIndex}.segment.${String(segmentIndex).padStart(2, '0')}`,
  )),
})));

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function profileDefinition() {
  return {
    schemaVersion: 1,
    id: 'arena-v2.learning-profile.candidate.v1',
    contentVersion: 5,
    currentProfileSchemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultProfileServiceWired: false,
    limits: {
      maxIdentifierLength: 256,
      maxCommittedGrantIds: 64,
      maxCounterValue: 10_000,
      maxCollectedWeaponIds: 20,
      maxCollectedMapIds: 2,
      maxWeaponMasteryRecords: 20,
      maxMapSegmentMasteryRecords: 20,
      maxModeRecords: 3,
      maxChallengeRecords: 16,
    },
    masteryRequirements: {
      weaponCollectionUseEvidence: 120,
      weaponContextEvidence: {
        ground: 1,
        aerial: 1,
        edge: 1,
        'duel-counterplay': 1,
        survival: 1,
      },
      mapSegmentCompletionEvidence: 1,
      modeCompletionEvidence: 1,
    },
    defaultProfileId: 'local',
    initiallyCollectedWeaponDefinitionIds: [],
    initiallyCollectedMapDefinitionIds: [],
    weaponDefinitionIds: [...WEAPON_IDS],
    mapDefinitions: MAP_DEFINITIONS.map(({ mapDefinitionId, segmentDefinitionIds }) => ({
      mapDefinitionId,
      segmentDefinitionIds: [...segmentDefinitionIds],
    })),
    modeDefinitions: [
      { modeDefinitionId: 'a6.8.mode.duel', kind: 'duel' },
      { modeDefinitionId: 'a6.8.mode.race', kind: 'race' },
      { modeDefinitionId: 'a6.8.mode.survival', kind: 'survival' },
    ],
    challengeDefinitions: [],
  };
}

function profile(revision = 7) {
  return {
    schemaVersion: 1,
    profileDefinitionId: 'arena-v2.learning-profile.candidate.v1',
    profileDefinitionContentVersion: 5,
    profileId: 'a6.8.profile.local',
    revision,
    committedGrantIds: [] as string[],
    collections: {
      weaponDefinitionIds: [WEAPON_IDS[0]!],
      mapDefinitionIds: [MAP_IDS[0]!],
    },
    weaponMastery: [{
      weaponDefinitionId: WEAPON_IDS[0]!,
      useCount: 5,
      contexts: WEAPON_CONTEXTS.map((context, index) => ({
        context,
        evidenceCount: index < 2 ? 1 : 0,
        completedAtRevision: index < 2 ? index + 1 : null,
      })),
    }],
    mapSegmentMastery: MAP_DEFINITIONS[0]!.segmentDefinitionIds.slice(0, 2).map(
      (segmentDefinitionId, index) => ({
        mapDefinitionId: MAP_IDS[0]!,
        segmentDefinitionId,
        completionEvidenceCount: 1,
        completedAtRevision: index + 1,
        bestRaceFinishTicks: null,
        bestSurvivalTicks: null,
      }),
    ),
    modeRecords: [],
    challenges: [],
  };
}

function collectionContent() {
  const authority = {
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSurfaceWired: false,
    ownerId: 'p5-content',
    weapons: WEAPON_IDS.map((weaponDefinitionId, index) => ({
      weaponDefinitionId,
      collectionOrder: index + 1,
      displayName: `A6.8 Weapon ${index + 1}`,
      learningFocus: `Learning ${index + 1}`,
      coreVerb: 'control-space',
    })),
    maps: MAP_DEFINITIONS.map((map, mapIndex) => ({
      mapDefinitionId: map.mapDefinitionId,
      displayName: `A6.8 Map ${mapIndex + 1}`,
      participantRange: '2–4人',
      segments: map.segmentDefinitionIds.map((segmentDefinitionId, segmentIndex) => ({
        segmentDefinitionId,
        ordinal: segmentIndex + 1,
        displayName: `Segment ${mapIndex + 1}-${segmentIndex + 1}`,
        learningFocus: 'route control',
        segmentKind: 'route',
        survivalRole: 'shared',
      })),
    })),
    sourceContentHash: 'a680c0de',
  };
  return {
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena V2 Information Collection Content Projection V1',
    ),
  };
}

function rawProfileInput(options: Readonly<{
  epochId?: string;
  tick?: number;
  sourceState?: 'ready' | 'loading' | 'empty' | 'error' | 'future-profile';
  revision?: number;
}> = {}) {
  const sourceState = options.sourceState ?? 'ready';
  const ready = sourceState === 'ready';
  return {
    schemaVersion: 1,
    epochId: options.epochId ?? 'epoch-a',
    tick: options.tick ?? 0,
    locale: 'zh-CN',
    sourceState,
    collectionContent: collectionContent(),
    profileDefinition: ready ? profileDefinition() : null,
    profile: ready ? profile(options.revision ?? 7) : null,
    eligibleWeaponDefinitionIds: null,
    diagnosticCode: sourceState === 'empty'
      ? 'profile-empty'
      : sourceState === 'error'
        ? 'profile-read-failed'
        : sourceState === 'future-profile'
          ? 'unsupported-profile-version'
          : null,
    observedProfileSchemaVersion: sourceState === 'future-profile' ? 2 : ready ? 1 : null,
    reducedMotion: false,
    muted: false,
    decorativeAssetState: 'ready',
  };
}

function detailPackage(screenId: 'weapon-detail' | 'map-detail') {
  const kind = screenId === 'weapon-detail' ? 'weapon' as const : 'map' as const;
  const targetDefinitionId = kind === 'weapon' ? WEAPON_IDS[0]! : MAP_IDS[0]!;
  const selection = { kind, screenId, targetDefinitionId };
  const fieldIds = kind === 'weapon' ? WEAPON_FIELDS : MAP_FIELDS;
  const authority = {
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSurfaceWired: false,
    ownerId: 'p5-content',
    screenId,
    targetDefinitionId,
    sourceContentHash: 'a680c0de',
    fieldValues: fieldIds.map((fieldId) => ({
      fieldId,
      labelMessageId: `a6.8.field.${fieldId}`,
      valueText: `value:${fieldId}`,
      accessibilityText: `accessible:${fieldId}`,
      fixedWidthNumeric: fieldId === 'timing-risk' || fieldId === 'route-goal',
    })),
  };
  const p5DetailContent = {
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena V2 A6.3 P5 Detail Content Envelope V1',
    ),
  };
  return {
    selection,
    p5DetailContent,
    existingSelectionAction: {
      intentId: kind === 'weapon'
        ? 'use-selected-weapon-next-match'
        : 'use-selected-map-next-match',
      labelMessageId: kind === 'weapon'
        ? 'arena.v2.action.use-weapon-next-match'
        : 'arena.v2.action.use-map-next-match',
      labelText: '下局使用',
      accessibilityText: `下局使用${targetDefinitionId}`,
      targetDefinitionId,
      enabled: true,
      disabledReason: null,
    },
  };
}

function ownerInput(
  screenId: ArenaV2CollectionFourScreenIdV1,
  options: Readonly<{
    epochId?: string;
    tick?: number;
    sourceState?: 'ready' | 'loading' | 'empty' | 'error' | 'future-profile';
    missingAssetIds?: readonly string[];
  }> = {},
) {
  return {
    schemaVersion: 1,
    screenId,
    profileCollectionProgressInput: rawProfileInput(options),
    detail: screenId === 'weapon-detail' || screenId === 'map-detail'
      ? detailPackage(screenId)
      : null,
    formalAssetCatalog: clone(ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1),
    availability: clone(createArenaV2A6CurrentFormalPreviewAvailabilityV1(
      options.missingAssetIds ?? [],
    )),
  };
}

describe('Arena V2 A6.8 collection four-screen read owner candidate V1', () => {
  it('projects the four existing pages with exactly current-page preview slots', () => {
    const owner = new ArenaV2CollectionFourScreenReadOwnerCandidateV1({ epochId: 'epoch-a' });
    const weaponIndex = owner.consume(ownerInput('weapon-index', { tick: 0 }));
    expect(weaponIndex.indexPage).not.toBeNull();
    expect(weaponIndex.detailPage).toBeNull();
    expect(weaponIndex.previewSlots).toHaveLength(20);
    expect(weaponIndex.previewSlots.every(({ previewStrategy }) => (
      previewStrategy.screenId === 'weapon-index'
    ))).toBe(true);
    expect(weaponIndex.formalAssetLeaseBinding.slots).toHaveLength(22);
    expect(Object.isFrozen(weaponIndex.formalAssetLeaseBinding)).toBe(true);
    expect(weaponIndex.formalAssetGovernance.contentIdentity)
      .toBe(weaponIndex.formalAssetLeaseBinding.contentIdentity);
    const leaseOwner = new ArenaV2CollectionFormalPreviewLeaseOwnerCandidateV1({
      schemaVersion: 1,
      bindingSnapshot: weaponIndex.formalAssetLeaseBinding,
      loader: {
        load() {
          throw new Error('A6.8 compatibility assertion must not load resources.');
        },
      },
      disposer: { dispose() {} },
    });
    expect(leaseOwner.getSnapshot()).toMatchObject({
      epochId: 'epoch-a',
      activeLeaseCount: 0,
    });
    leaseOwner.destroy();

    const mapIndex = owner.consume(ownerInput('map-index', { tick: 1 }));
    expect(mapIndex.previewSlots).toHaveLength(2);
    expect(mapIndex.previewSlots.every((slot) => (
      slot.previewStrategy.screenId === 'map-index'
      && slot.fallback.active
      && !slot.lifecycle.requestPermitted
      && slot.lifecycle.requestToken === null
    ))).toBe(true);

    const weaponDetail = owner.consume(ownerInput('weapon-detail', { tick: 2 }));
    expect(weaponDetail.indexPage).toBeNull();
    expect(weaponDetail.detailPage).toMatchObject({
      screenId: 'weapon-detail',
      targetDefinitionId: WEAPON_IDS[0],
    });
    expect(weaponDetail.previewSlots).toHaveLength(1);
    expect(weaponDetail.previewSlots[0]).toMatchObject({
      definitionId: WEAPON_IDS[0],
      assetUsePermitted: false,
      lifecycle: { requestPermitted: false, requestToken: null, releaseToken: null },
      fallback: { active: true },
      previewStrategy: { screenId: 'weapon-detail' },
    });

    const mapDetail = owner.consume(ownerInput('map-detail', { tick: 3 }));
    expect(mapDetail.detailPage).toMatchObject({
      screenId: 'map-detail',
      targetDefinitionId: MAP_IDS[0],
    });
    expect(mapDetail.previewSlots).toHaveLength(1);
    expect(mapDetail.previewSlots[0]).toMatchObject({
      definitionId: MAP_IDS[0],
      fallback: { active: true },
      lifecycle: { requestPermitted: false, requestToken: null },
    });
    expect(mapDetail.formalAssetGovernance).toMatchObject({
      loadsResourcesHere: false,
      ownsThreeResourcesHere: false,
      governance: { pageCountAdded: 0, actionCountAdded: 0 },
    });
  });

  it('keeps non-ready index and detail pages free of stale Profile facts', () => {
    const indexOwner = new ArenaV2CollectionFourScreenReadOwnerCandidateV1({ epochId: 'epoch-a' });
    const index = indexOwner.consume(ownerInput('weapon-index', {
      tick: 0,
      sourceState: 'loading',
    }));
    expect(index.sourceState).toBe('loading');
    expect(index.indexPage?.profileIdentity).toBeNull();

    const detailOwner = new ArenaV2CollectionFourScreenReadOwnerCandidateV1({ epochId: 'epoch-a' });
    const detail = detailOwner.consume(ownerInput('weapon-detail', {
      tick: 0,
      sourceState: 'future-profile',
    }));
    expect(detail.sourceState).toBe('future-profile');
    expect(detail.detailPage?.profileIdentity).toBeNull();
    expect(detail.detailPage?.rows).toEqual([]);
  });

  it('keeps missing weapons and all maps on token-free fallback', () => {
    const weaponAssetId = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
      .find(({ kind, definitionId }) => kind === 'weapon' && definitionId === WEAPON_IDS[0])!
      .assetId;
    const owner = new ArenaV2CollectionFourScreenReadOwnerCandidateV1({ epochId: 'epoch-a' });
    const missing = owner.consume(ownerInput('weapon-detail', {
      tick: 0,
      missingAssetIds: [weaponAssetId],
    }));
    expect(missing.previewSlots[0]).toMatchObject({
      availability: 'missing',
      assetUsePermitted: false,
      previewSourceUse: 'text-shape-pattern-fallback-only',
      lifecycle: { requestPermitted: false, requestToken: null, releaseToken: null },
      fallback: { active: true },
    });
  });

  it('permits high-tick screen switching from A to B to A', () => {
    const owner = new ArenaV2CollectionFourScreenReadOwnerCandidateV1({ epochId: 'epoch-a' });
    const first = owner.consume(ownerInput('weapon-index', { tick: 0 }));
    const second = owner.consume(ownerInput('map-detail', { tick: 1_000_000 }));
    const third = owner.consume(ownerInput('weapon-index', { tick: 1_000_001 }));
    expect(first.screenId).toBe('weapon-index');
    expect(second.screenId).toBe('map-detail');
    expect(third.screenId).toBe('weapon-index');
    expect(third.previewSlots.map(({ definitionId }) => definitionId))
      .toEqual(first.previewSlots.map(({ definitionId }) => definitionId));
  });

  it('rejects screen/detail mismatch and recoverable input errors without losing the snapshot', () => {
    const owner = new ArenaV2CollectionFourScreenReadOwnerCandidateV1({ epochId: 'epoch-a' });
    const validInput = ownerInput('weapon-index', { tick: 2 });
    const valid = owner.consume(validInput);
    expect(owner.consume(validInput)).toBe(valid);

    expect(() => owner.consume({
      ...ownerInput('weapon-index', { tick: 3 }),
      detail: detailPackage('weapon-detail'),
    })).toThrow(/index\/detail包与screenId不闭合/);
    const mismatch = ownerInput('weapon-detail', { tick: 3 });
    mismatch.detail!.selection.screenId = 'map-detail';
    expect(() => owner.consume(mismatch)).toThrow(/selection与当前screenId不闭合/);
    expect(() => owner.consume(ownerInput('map-index', { tick: 1 }))).toThrow(/tick回退/);
    expect(() => owner.consume({ ...ownerInput('map-index', { tick: 3 }), future: true }))
      .toThrow(/不支持字段 future/);
    expect(owner.state).toBe(ARENA_V2_COLLECTION_FOUR_SCREEN_READ_OWNER_STATE_V1.ACTIVE);
    expect(owner.getSnapshot()).toBe(valid);
  });

  it('rejects accessors, thenables and same-epoch identity drift', () => {
    let getterCalls = 0;
    const hostile = Object.defineProperty({}, 'schemaVersion', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    });
    for (const [key, value] of Object.entries(ownerInput('weapon-index'))) {
      if (key === 'schemaVersion') continue;
      Object.defineProperty(hostile, key, { enumerable: true, value });
    }
    expect(() => new ArenaV2CollectionFourScreenReadOwnerCandidateV1({
      epochId: 'epoch-a',
    }).consume(hostile)).toThrow(/必须是可枚举数据字段/);
    expect(getterCalls).toBe(0);

    let thenCalls = 0;
    expect(() => new ArenaV2CollectionFourScreenReadOwnerCandidateV1({
      epochId: 'epoch-a',
    }).consume({
      ...ownerInput('weapon-index'),
      then() {
        thenCalls += 1;
      },
    })).toThrow(/只能包含可序列化数据|不支持字段 then/);
    expect(thenCalls).toBe(0);

    const contentOwner = new ArenaV2CollectionFourScreenReadOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    contentOwner.consume(ownerInput('weapon-index', { tick: 0 }));
    const changedContent = ownerInput('weapon-index', { tick: 1 });
    changedContent.profileCollectionProgressInput.collectionContent.weapons[0]!.displayName =
      'changed';
    const contentAuthority = {
      schemaVersion: changedContent.profileCollectionProgressInput.collectionContent.schemaVersion,
      status: changedContent.profileCollectionProgressInput.collectionContent.status,
      hardGate: changedContent.profileCollectionProgressInput.collectionContent.hardGate,
      defaultSurfaceWired:
        changedContent.profileCollectionProgressInput.collectionContent.defaultSurfaceWired,
      ownerId: changedContent.profileCollectionProgressInput.collectionContent.ownerId,
      weapons: changedContent.profileCollectionProgressInput.collectionContent.weapons,
      maps: changedContent.profileCollectionProgressInput.collectionContent.maps,
      sourceContentHash:
        changedContent.profileCollectionProgressInput.collectionContent.sourceContentHash,
    };
    changedContent.profileCollectionProgressInput.collectionContent.contentHash =
      createDeterministicDataHash(
        contentAuthority,
        'Arena V2 Information Collection Content Projection V1',
      );
    expect(() => contentOwner.consume(changedContent)).toThrow(/collection content身份漂移/);

    const profileOwner = new ArenaV2CollectionFourScreenReadOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    profileOwner.consume(ownerInput('weapon-index', { tick: 0 }));
    const changedProfile = ownerInput('weapon-index', { tick: 1 });
    changedProfile.profileCollectionProgressInput.profile!.profileId = 'other.profile';
    expect(() => profileOwner.consume(changedProfile)).toThrow(/Profile身份漂移/);

    const catalogOwner = new ArenaV2CollectionFourScreenReadOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    catalogOwner.consume(ownerInput('weapon-index', { tick: 0 }));
    const changedCatalog = ownerInput('weapon-index', { tick: 1 });
    (changedCatalog.formalAssetCatalog as unknown as { contentHash: string }).contentHash =
      '00000000';
    expect(() => catalogOwner.consume(changedCatalog)).toThrow(/catalog.*hash|catalog身份/u);

    const bindingOwner = new ArenaV2CollectionFourScreenReadOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    bindingOwner.consume(ownerInput('weapon-index', { tick: 0 }));
    const weaponAssetId = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
      .find(({ kind }) => kind === 'weapon')!.assetId;
    expect(() => bindingOwner.consume(ownerInput('weapon-index', {
      tick: 1,
      missingAssetIds: [weaponAssetId],
    }))).toThrow(/formal asset lease binding身份漂移/u);
    expect(bindingOwner.getSnapshot()?.tick).toBe(0);
  });

  it('resets and destroys without wiring a surface or resource loader', () => {
    const owner = new ArenaV2CollectionFourScreenReadOwnerCandidateV1({ epochId: 'epoch-a' });
    owner.consume(ownerInput('weapon-index', { tick: 5 }));
    owner.resetPresentationEpoch({ epochId: 'epoch-b' });
    expect(owner.getSnapshot()).toBeNull();
    expect(owner.consume(ownerInput('map-index', { epochId: 'epoch-b', tick: 0 })).screenId)
      .toBe('map-index');
    owner.destroy();
    owner.destroy();
    expect(owner.state).toBe(ARENA_V2_COLLECTION_FOUR_SCREEN_READ_OWNER_STATE_V1.DESTROYED);
    expect(() => owner.getSnapshot()).toThrow(/拒绝状态destroyed/);
    expect(ARENA_V2_COLLECTION_FOUR_SCREEN_READ_OWNER_CANDIDATE_V1).toEqual({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      hardGate: false,
      defaultSurfaceWired: false,
      loadsResources: false,
      ownsThreeResources: false,
      completeFormalAssetLeaseBindingForwarded: true,
      formalAssetLeaseBindingSlotCount: 22,
      pageCountAdded: 0,
      actionCountAdded: 0,
      inheritedUnreachableGoalKinds: [],
      inheritedUnreachableGoalReason: null,
      catalogCompleteReachable: true,
      catalogCompleteKindMeaning: 'resolved-learning-scope-complete',
      fullCatalogTerminalGoalId: 'catalog-complete',
      activeLearningCompletionGoalId: 'active-learning-complete',
      fullCatalogTerminalMeaning: 'free-challenge-or-record-refresh',
    });
  });
});
