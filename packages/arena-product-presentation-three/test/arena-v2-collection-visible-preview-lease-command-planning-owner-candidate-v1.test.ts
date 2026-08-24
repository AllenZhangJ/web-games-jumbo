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
import {
  ARENA_V2_COLLECTION_VISIBLE_PREVIEW_LEASE_COMMAND_PLANNING_OWNER_CANDIDATE_V1,
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
      displayName: `A6.10 Weapon ${index + 1}`,
      learningFocus: `Focus ${index + 1}`,
      coreVerb: 'control-space',
    })),
    maps: maps.map(({ definitionId }, mapIndex) => ({
      mapDefinitionId: definitionId,
      displayName: `A6.10 Map ${mapIndex + 1}`,
      participantRange: '2–4人',
      segments: Array.from({ length: 10 }, (_, segmentIndex) => ({
        segmentDefinitionId: `a6.10.map.${mapIndex}.segment.${segmentIndex}`,
        ordinal: segmentIndex + 1,
        displayName: `Segment ${mapIndex}-${segmentIndex}`,
        learningFocus: 'route-control',
        segmentKind: 'route',
        survivalRole: 'shared',
      })),
    })),
    sourceContentHash: 'a610cafe',
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
    profileDefinitionId?: string;
    profileId?: string;
    profileRevision?: number;
  }> = {},
): ArenaV2CollectionFourScreenReadSnapshotV1 {
  const epochId = options.epochId ?? 'epoch-a';
  const binding = bindingSnapshot(epochId, tick, options.missingAssetIds);
  const kind = screenId.startsWith('weapon') ? 'weapon' : 'map';
  const detail = screenId.endsWith('-detail');
  const slots = binding.slots
    .filter((slot) => slot.kind === kind)
    .filter((_, index) => !detail || index === 0)
    .map((slot) => {
      const strategy = slot.previewStrategies.find((candidate) => candidate.screenId === screenId)!;
      const { previewStrategies: _strategies, ...base } = slot;
      void _strategies;
      return Object.freeze({ ...base, previewStrategy: strategy });
    });
  const page = Object.freeze({
    ...(detail ? {
      screenId,
      targetDefinitionId: slots[0]!.definitionId,
    } : {}),
    profileIdentity: options.profileRevision === undefined
      ? null
      : Object.freeze({
        profileSchemaVersion: 1,
        profileDefinitionId: options.profileDefinitionId
          ?? 'arena-v2.learning-profile.candidate.v1',
        profileDefinitionContentVersion: 5,
        profileId: options.profileId ?? 'a6.10.profile.local',
        profileRevision: options.profileRevision,
      }),
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

function input(
  snapshot: ArenaV2CollectionFourScreenReadSnapshotV1,
  visibleDefinitionIds: readonly string[],
  previousActiveLeaseLedger: readonly unknown[] = [],
) {
  return {
    schemaVersion: 1,
    epochId: snapshot.epochId,
    tick: snapshot.tick,
    screenId: snapshot.screenId,
    viewport: '390x844',
    readSnapshot: snapshot,
    visibleDefinitionIds,
    previousActiveLeaseLedger,
  };
}

describe('Arena V2 A6.10 visible preview lease command planning owner candidate V1', () => {
  it('keeps all 20 visible weapons in fallback with zero A6.6 commands', () => {
    const snapshot = readSnapshot('weapon-index', 0);
    const ids = snapshot.previewSlots.map(({ definitionId }) => definitionId);
    const owner = new ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    const plan = owner.plan(input(snapshot, ids));
    expect(plan.acquireCommands).toEqual([]);
    expect(plan.releaseCommands).toEqual([]);
    expect(plan.retainLeases).toEqual([]);
    expect(plan.fallbackSlots).toHaveLength(20);
    expect(plan.nextActiveLeaseLedger).toEqual([]);
    expect(Object.keys(plan).indexOf('releaseCommands'))
      .toBeLessThan(Object.keys(plan).indexOf('acquireCommands'));
    expect(ARENA_V2_COLLECTION_VISIBLE_PREVIEW_LEASE_COMMAND_PLANNING_OWNER_CANDIDATE_V1)
      .toMatchObject({
        loadsResources: false,
        createsThree: false,
        executesLeaseCommands: false,
        sameEpochFormalAssetLeaseBindingImmutable: true,
        samePlanLeaseIdCollisionFailClosed: true,
        leaseIdentityEncoding: 'structured-screen-asset-activation-sequence',
        leaseIdentityMaximumLength: 200,
        retainsHistoricalLeaseIds: false,
      });
  });

  it('releases a sliding subset before retaining and acquiring in ordinal order', () => {
    const owner = new ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    const firstSnapshot = readSnapshot('weapon-index', 0);
    const allIds = firstSnapshot.previewSlots.map(({ definitionId }) => definitionId);
    const first = owner.plan(input(firstSnapshot, allIds.slice(0, 10)));
    const secondSnapshot = readSnapshot('weapon-index', 1);
    const second = owner.plan(input(
      secondSnapshot,
      allIds.slice(5, 15),
      first.nextActiveLeaseLedger,
    ));
    expect(first.nextActiveLeaseLedger).toEqual([]);
    expect(second.releaseCommands).toEqual([]);
    expect(second.retainLeases).toEqual([]);
    expect(second.acquireCommands).toEqual([]);
    expect(second.nextActiveLeaseLedger).toEqual([]);
    expect(second.fallbackSlots).toHaveLength(10);
  });

  it('keeps both maps and missing weapons token-free in fallback only', () => {
    const mapOwner = new ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    const mapSnapshot = readSnapshot('map-index', 0);
    const mapPlan = mapOwner.plan(input(
      mapSnapshot,
      mapSnapshot.previewSlots.map(({ definitionId }) => definitionId),
    ));
    expect(mapPlan.acquireCommands).toEqual([]);
    expect(mapPlan.nextActiveLeaseLedger).toEqual([]);
    expect(mapPlan.fallbackSlots).toHaveLength(2);
    expect(mapPlan.fallbackSlots.every((slot) => !Object.hasOwn(slot, 'requestToken'))).toBe(true);

    const firstWeapon = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
      .find(({ kind }) => kind === 'weapon')!;
    const missingOwner = new ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    const missingSnapshot = readSnapshot('weapon-index', 0, {
      missingAssetIds: [firstWeapon.assetId],
    });
    const missingPlan = missingOwner.plan(input(
      missingSnapshot,
      missingSnapshot.previewSlots.slice(0, 2).map(({ definitionId }) => definitionId),
    ));
    expect(missingPlan.acquireCommands).toEqual([]);
    expect(missingPlan.fallbackSlots).toHaveLength(2);
    expect(missingPlan.fallbackSlots[0]?.definitionId).toBe(firstWeapon.definitionId);
  });

  it('plans exactly one detail slot and supports high-tick A to B to A transitions', () => {
    const owner = new ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    const weaponA = readSnapshot('weapon-detail', 0);
    const first = owner.plan(input(weaponA, [weaponA.previewSlots[0]!.definitionId]));
    expect(first.acquireCommands).toEqual([]);
    expect(first.fallbackSlots).toHaveLength(1);

    const mapB = readSnapshot('map-detail', 1_000_000);
    const second = owner.plan(input(
      mapB,
      [mapB.previewSlots[0]!.definitionId],
      first.nextActiveLeaseLedger,
    ));
    expect(second.releaseCommands).toEqual([]);
    expect(second.fallbackSlots).toHaveLength(1);
    expect(second.nextActiveLeaseLedger).toEqual([]);

    const weaponAgain = readSnapshot('weapon-detail', 1_000_001);
    const third = owner.plan(input(weaponAgain, [weaponAgain.previewSlots[0]!.definitionId], []));
    expect(third.acquireCommands).toEqual([]);
    expect(third.nextActiveLeaseLedger).toEqual([]);
    expect(third.fallbackSlots).toHaveLength(1);
  });

  it('crosses the former 128-entry history boundary without retaining lease tombstones', () => {
    const owner = new ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    let tick = 0;
    let weapon = readSnapshot('weapon-detail', tick);
    const weaponId = weapon.previewSlots[0]!.definitionId;
    const assetId = weapon.previewSlots[0]!.assetId;
    let plan = owner.plan(input(weapon, [weaponId]));
    for (let activationSequence = 2; activationSequence <= 130; activationSequence += 1) {
      const map = readSnapshot('map-detail', tick += 1);
      const released = owner.plan(input(
        map,
        [map.previewSlots[0]!.definitionId],
        plan.nextActiveLeaseLedger,
      ));
      expect(released.nextActiveLeaseLedger).toEqual([]);
      weapon = readSnapshot('weapon-detail', tick += 1);
      plan = owner.plan(input(weapon, [weaponId], released.nextActiveLeaseLedger));
      expect(plan.nextActiveLeaseLedger[0]?.activationSequence).toBe(activationSequence);
    }
    expect(plan.nextActiveLeaseLedger[0]?.visibleSlotLeaseId).toBe(
      `a6.10:weapon-detail:${assetId}:130`,
    );
  });

  it('is same-tick idempotent and retains across Profile revision-only progress', () => {
    const owner = new ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    const firstSnapshot = readSnapshot('weapon-index', 0, { profileRevision: 1 });
    const ids = firstSnapshot.previewSlots.slice(0, 2).map(({ definitionId }) => definitionId);
    const sameInput = input(firstSnapshot, ids);
    const first = owner.plan(sameInput);
    expect(owner.plan(sameInput)).toBe(first);
    expect(first.nextActiveLeaseLedger.every(({ activationSequence }) => (
      activationSequence === 1
    ))).toBe(true);

    const advanced = readSnapshot('weapon-index', 1, { profileRevision: 2 });
    const second = owner.plan(input(advanced, ids, first.nextActiveLeaseLedger));
    expect(second.retainLeases).toHaveLength(2);
    expect(second.acquireCommands).toEqual([]);
    expect(second.releaseCommands).toEqual([]);
  });

  it('keeps the Profile waterline through non-ready null and rejects revision rollback', () => {
    const owner = new ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    const ready = readSnapshot('weapon-index', 0, { profileRevision: 2 });
    const id = ready.previewSlots[0]!.definitionId;
    const first = owner.plan(input(ready, [id]));
    const nonReady = readSnapshot('weapon-index', 1);
    const second = owner.plan(input(nonReady, [id], first.nextActiveLeaseLedger));
    expect(second.retainLeases).toHaveLength(1);

    const rollback = readSnapshot('weapon-index', 2, { profileRevision: 1 });
    expect(() => owner.plan(input(
      rollback,
      [id],
      second.nextActiveLeaseLedger,
    ))).toThrow(/Profile revision回退/);
    expect(owner.getPlan()).toBe(second);
  });

  it('uses canonical structured Profile identity instead of delimiter-joined fields', () => {
    const owner = new ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    const firstSnapshot = readSnapshot('weapon-index', 0, {
      profileDefinitionId: 'profile|definition',
      profileId: 'local',
      profileRevision: 1,
    });
    const id = firstSnapshot.previewSlots[0]!.definitionId;
    const first = owner.plan(input(firstSnapshot, [id]));
    const delimiterCollision = readSnapshot('weapon-index', 1, {
      profileDefinitionId: 'profile',
      profileId: 'definition|local',
      profileRevision: 2,
    });
    expect(() => owner.plan(input(
      delimiterCollision,
      [id],
      first.nextActiveLeaseLedger,
    ))).toThrow(/Profile身份漂移/);
    expect(owner.getPlan()).toBe(first);
  });

  it('rejects same-epoch availability and token binding drift while preserving the prior plan', () => {
    const owner = new ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    const firstSnapshot = readSnapshot('weapon-index', 0);
    const firstSlot = firstSnapshot.previewSlots[0]!;
    const first = owner.plan(input(firstSnapshot, [firstSlot.definitionId]));
    const drifted = readSnapshot('weapon-index', 1, {
      missingAssetIds: [firstSlot.assetId],
    });
    expect(() => owner.plan(input(
      drifted,
      [firstSlot.definitionId],
      first.nextActiveLeaseLedger,
    ))).toThrow(/formalAssetLeaseBinding.*漂移/);
    expect(owner.getPlan()).toBe(first);
  });

  it('reuses the A6.6 binding validator before planning forged tokens or coherent substitutions', () => {
    const snapshot = readSnapshot('weapon-index', 0);
    const visibleId = snapshot.previewSlots[0]!.definitionId;
    const forgedToken = clone(input(snapshot, [visibleId])) as unknown as {
      readSnapshot: {
        formalAssetLeaseBinding: {
          slots: Array<{ lifecycle: { requestToken: string | null } }>;
        };
      };
    };
    forgedToken.readSnapshot.formalAssetLeaseBinding.slots[0]!.lifecycle.requestToken =
      'forged-request-token';
    const tokenOwner = new ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    expect(() => tokenOwner.plan(forgedToken)).toThrow(/A6\.6.*请求合同|requestToken/);
    expect(tokenOwner.getPlan()).toBeNull();

    const substituted = clone(input(snapshot, [visibleId])) as unknown as {
      readSnapshot: {
        formalAssetLeaseBinding: {
          slots: Array<Record<string, unknown> & { definitionId: string; ordinal: number }>;
        };
      };
    };
    const first = substituted.readSnapshot.formalAssetLeaseBinding.slots[0]!;
    const replacement = clone(substituted.readSnapshot.formalAssetLeaseBinding.slots[1]!);
    replacement.definitionId = first.definitionId;
    replacement.ordinal = first.ordinal;
    substituted.readSnapshot.formalAssetLeaseBinding.slots[0] = replacement;
    const substitutionOwner =
      new ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1({
        epochId: 'epoch-a',
      });
    expect(() => substitutionOwner.plan(substituted)).toThrow(/A6\.6.*Definition\/asset|coherent substitution/);
    expect(substitutionOwner.getPlan()).toBeNull();
  });

  it('rejects forged ledgers, hidden IDs, duplicates, wrong order and same-tick conflicts', () => {
    const owner = new ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    const snapshot = readSnapshot('weapon-index', 0);
    const ids = snapshot.previewSlots.slice(0, 2).map(({ definitionId }) => definitionId);
    const first = owner.plan(input(snapshot, ids));
    expect(() => owner.plan(input(snapshot, ids.slice(0, 1)))).toThrow(/同tick输入冲突/);

    const next = readSnapshot('weapon-index', 1);
    const forged = clone(first.nextActiveLeaseLedger);
    forged[0]!.assetId = 'forged.asset';
    expect(() => owner.plan(input(next, ids, forged))).toThrow(/伪造|asset/);
    expect(() => owner.plan(input(
      next,
      ids,
      [first.nextActiveLeaseLedger[0]!, first.nextActiveLeaseLedger[0]!],
    ))).toThrow(/重复lease/);
    expect(() => owner.plan(input(next, ['hidden.definition'], first.nextActiveLeaseLedger)))
      .toThrow(/当前页/);
    expect(() => owner.plan(input(next, [ids[0]!, ids[0]!], first.nextActiveLeaseLedger)))
      .toThrow(/唯一子集/);
    expect(() => owner.plan(input(next, [...ids].reverse(), first.nextActiveLeaseLedger)))
      .toThrow(/ordinal/);
    expect(owner.getPlan()).toBe(first);
  });

  it('rejects hostile/future/drift input while supporting reset and idempotent destroy', () => {
    const owner = new ArenaV2CollectionVisiblePreviewLeaseCommandPlanningOwnerCandidateV1({
      epochId: 'epoch-a',
    });
    const snapshot = readSnapshot('weapon-index', 0);
    const id = snapshot.previewSlots[0]!.definitionId;
    const first = owner.plan(input(snapshot, [id]));
    let getterCalls = 0;
    const hostile = Object.defineProperty({}, 'schemaVersion', {
      enumerable: true,
      get() { getterCalls += 1; return 1; },
    });
    expect(() => owner.plan(hostile)).toThrow(/data|getter|数据字段|accessor/i);
    expect(getterCalls).toBe(0);
    let thenCalls = 0;
    expect(() => owner.plan({
      ...input(readSnapshot('weapon-index', 1), [id], first.nextActiveLeaseLedger),
      then() { thenCalls += 1; },
    })).toThrow(/thenable|不支持字段 then|可序列化数据/i);
    expect(thenCalls).toBe(0);
    expect(() => owner.plan({
      ...input(readSnapshot('weapon-index', 1), [id], first.nextActiveLeaseLedger),
      future: true,
    })).toThrow(/不支持字段 future/);
    expect(owner.getPlan()).toBe(first);

    owner.resetPresentationEpoch({ epochId: 'epoch-b' });
    expect(owner.getPlan()).toBeNull();
    const resetSnapshot = readSnapshot('map-index', 0, { epochId: 'epoch-b' });
    expect(owner.plan(input(
      resetSnapshot,
      resetSnapshot.previewSlots.map(({ definitionId }) => definitionId),
    )).fallbackSlots).toHaveLength(2);
    owner.destroy();
    owner.destroy();
    expect(() => owner.getPlan()).toThrow(/destroyed/);
  });
});
