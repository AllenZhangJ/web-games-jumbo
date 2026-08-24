import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
  ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
  createArenaV2LearningProfileDefinitionV1,
  createArenaV2LearningProfileV1,
  type ArenaV2LearningProfileDefinitionV1,
  type ArenaV2LearningProfileV1,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  ARENA_V2_COLLECTION_MASTERY_DETAIL_FACTS_PROJECTION_V1_METADATA,
  projectArenaV2CollectionMasteryDetailFactsV1,
} from '../src/arena-v2-collection-mastery-detail-facts-projection-v1.js';
import {
  projectArenaV2MapRouteResearchMilestoneV1,
} from '../src/arena-v2-map-route-research-milestone-projection-v1.js';

function definitionFixture(
  overrides: Readonly<Record<string, unknown>> = {},
): ArenaV2LearningProfileDefinitionV1 {
  return createArenaV2LearningProfileDefinitionV1({
    schemaVersion: ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
    id: 'collection-detail.test.v1',
    contentVersion: 1,
    currentProfileSchemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
    status: 'production-unreachable',
    hardGate: false,
    defaultProfileServiceWired: false,
    limits: {
      maxIdentifierLength: 96,
      maxCommittedGrantIds: 16,
      maxCounterValue: 1_000,
      maxCollectedWeaponIds: 8,
      maxCollectedMapIds: 8,
      maxWeaponMasteryRecords: 8,
      maxMapSegmentMasteryRecords: 16,
      maxModeRecords: 4,
      maxChallengeRecords: 8,
    },
    masteryRequirements: {
      weaponCollectionUseEvidence: 120,
      weaponContextEvidence: {
        ground: 2,
        aerial: 2,
        edge: 2,
        'duel-counterplay': 2,
        survival: 2,
      },
      mapSegmentCompletionEvidence: 2,
      modeCompletionEvidence: 2,
    },
    defaultProfileId: 'local',
    initiallyCollectedWeaponDefinitionIds: [],
    initiallyCollectedMapDefinitionIds: [],
    weaponDefinitionIds: ['weapon.alpha', 'weapon.beta'],
    mapDefinitions: [{
      mapDefinitionId: 'map.alpha',
      segmentDefinitionIds: ['segment.alpha', 'segment.beta'],
    }],
    modeDefinitions: [
      { modeDefinitionId: 'mode.duel', kind: 'duel' },
      { modeDefinitionId: 'mode.race', kind: 'race' },
      { modeDefinitionId: 'mode.survival', kind: 'survival' },
    ],
    challengeDefinitions: [],
    ...overrides,
  });
}

function profileFixture(
  definition: ArenaV2LearningProfileDefinitionV1,
): ArenaV2LearningProfileV1 {
  return createArenaV2LearningProfileV1(definition, {
    schemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
    profileDefinitionId: definition.id,
    profileDefinitionContentVersion: definition.contentVersion,
    profileId: 'local',
    revision: 7,
    committedGrantIds: [],
    collections: {
      weaponDefinitionIds: ['weapon.alpha'],
      mapDefinitionIds: ['map.alpha'],
    },
    weaponMastery: [{
      weaponDefinitionId: 'weapon.alpha',
      useCount: 9,
      contexts: [
        { context: 'ground', evidenceCount: 2, completedAtRevision: 3 },
        { context: 'aerial', evidenceCount: 1, completedAtRevision: null },
        { context: 'edge', evidenceCount: 0, completedAtRevision: null },
        { context: 'duel-counterplay', evidenceCount: 2, completedAtRevision: 5 },
        { context: 'survival', evidenceCount: 1, completedAtRevision: null },
      ],
    }],
    mapSegmentMastery: [
      {
        mapDefinitionId: 'map.alpha',
        segmentDefinitionId: 'segment.alpha',
        completionEvidenceCount: 2,
        completedAtRevision: 4,
        bestRaceFinishTicks: null,
        bestSurvivalTicks: null,
      },
      {
        mapDefinitionId: 'map.alpha',
        segmentDefinitionId: 'segment.beta',
        completionEvidenceCount: 1,
        completedAtRevision: null,
        bestRaceFinishTicks: null,
        bestSurvivalTicks: null,
      },
    ],
    modeRecords: [],
    challenges: [],
  });
}

function project(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  kind: 'weapon' | 'map',
  targetDefinitionId: string,
) {
  return projectArenaV2CollectionMasteryDetailFactsV1({
    profileDefinition: definition,
    profile,
    selection: { kind, targetDefinitionId },
  });
}

describe('Arena V2 P6 collection mastery detail facts projection V1', () => {
  it('projects the five weapon contexts in Definition order without inferring missing detail', () => {
    const definition = definitionFixture();
    const facts = project(definition, profileFixture(definition), 'weapon', 'weapon.alpha');
    expect(facts).toEqual({
      schemaVersion: 1,
      ownerId: 'p6-profile',
      kind: 'weapon',
      profileRevision: 7,
      weaponDefinitionId: 'weapon.alpha',
      collected: true,
      useCount: 9,
      collectionEvidenceTarget: 120,
      contexts: [
        { context: 'ground', evidenceCount: 2, completedAtRevision: 3 },
        { context: 'aerial', evidenceCount: 1, completedAtRevision: null },
        { context: 'edge', evidenceCount: 0, completedAtRevision: null },
        { context: 'duel-counterplay', evidenceCount: 2, completedAtRevision: 5 },
        { context: 'survival', evidenceCount: 1, completedAtRevision: null },
      ],
    });
    expect(Object.isFrozen(facts)).toBe(true);
    expect(Object.isFrozen(facts.kind === 'weapon' ? facts.contexts : [])).toBe(true);
  });

  it('projects map segment facts in the selected dynamic Definition order', () => {
    const definition = definitionFixture();
    expect(project(definition, profileFixture(definition), 'map', 'map.alpha')).toEqual({
      schemaVersion: 1,
      ownerId: 'p6-profile',
      kind: 'map',
      profileRevision: 7,
      mapDefinitionId: 'map.alpha',
      routeResearch: projectArenaV2MapRouteResearchMilestoneV1({
        evidenceCount: 3,
        completedSegmentCount: 1,
        segmentCount: 2,
        evidencePerSegmentTarget: 2,
      }),
      segments: [
        {
          segmentDefinitionId: 'segment.alpha',
          completionEvidenceCount: 2,
          completedAtRevision: 4,
        },
        {
          segmentDefinitionId: 'segment.beta',
          completionEvidenceCount: 1,
          completedAtRevision: null,
        },
      ],
    });
  });

  it('emits legal zero facts for catalog targets without mastery records', () => {
    const definition = definitionFixture();
    const profile = createArenaV2LearningProfileV1(definition, {
      ...createArenaV2LearningProfileV1(definition),
      revision: 3,
      collections: {
        weaponDefinitionIds: ['weapon.alpha'],
        mapDefinitionIds: ['map.alpha'],
      },
    });
    expect(project(definition, profile, 'weapon', 'weapon.alpha')).toMatchObject({
      kind: 'weapon',
      collected: true,
      useCount: 0,
      collectionEvidenceTarget: 120,
      contexts: [
        { context: 'ground', evidenceCount: 0, completedAtRevision: null },
        { context: 'aerial', evidenceCount: 0, completedAtRevision: null },
        { context: 'edge', evidenceCount: 0, completedAtRevision: null },
        { context: 'duel-counterplay', evidenceCount: 0, completedAtRevision: null },
        { context: 'survival', evidenceCount: 0, completedAtRevision: null },
      ],
    });
    expect(project(definition, profile, 'map', 'map.alpha')).toMatchObject({
      kind: 'map',
      segments: [
        { segmentDefinitionId: 'segment.alpha', completionEvidenceCount: 0 },
        { segmentDefinitionId: 'segment.beta', completionEvidenceCount: 0 },
      ],
    });
  });

  it('uses replacement Definition identities rather than a built-in catalog', () => {
    const definition = definitionFixture({
      id: 'collection-detail.dynamic.v1',
      weaponDefinitionIds: ['weapon.dynamic'],
      mapDefinitions: [{
        mapDefinitionId: 'map.dynamic',
        segmentDefinitionIds: ['segment.z', 'segment.a'],
      }],
    });
    const profile = createArenaV2LearningProfileV1(definition);
    expect(project(definition, profile, 'weapon', 'weapon.dynamic')).toMatchObject({
      weaponDefinitionId: 'weapon.dynamic',
    });
    expect(project(definition, profile, 'map', 'map.dynamic')).toMatchObject({
      mapDefinitionId: 'map.dynamic',
      segments: [
        { segmentDefinitionId: 'segment.a' },
        { segmentDefinitionId: 'segment.z' },
      ],
    });
    expect(() => project(definition, profile, 'weapon', 'weapon.alpha')).toThrow(/未知武器/);
  });

  it('fails closed for unknown targets and contradictory Profile records', () => {
    const definition = definitionFixture();
    const profile = profileFixture(definition);
    expect(() => definitionFixture({
      weaponDefinitionIds: ['weapon.alpha', 'weapon.alpha'],
    })).toThrow(/重复/);
    expect(() => project(definition, profile, 'map', 'map.unknown')).toThrow(/未知地图/);
    expect(() => projectArenaV2CollectionMasteryDetailFactsV1({
      profileDefinition: definition,
      profile: { ...profile, profileDefinitionContentVersion: 999 },
      selection: { kind: 'weapon', targetDefinitionId: 'weapon.alpha' },
    })).toThrow(/Definition不一致/);
    expect(() => projectArenaV2CollectionMasteryDetailFactsV1({
      profileDefinition: definition,
      profile: {
        ...profile,
        weaponMastery: [{
          ...profile.weaponMastery[0]!,
          contexts: [...profile.weaponMastery[0]!.contexts].reverse(),
        }],
      },
      selection: { kind: 'weapon', targetDefinitionId: 'weapon.alpha' },
    })).toThrow(/顺序或身份不一致/);
    expect(() => projectArenaV2CollectionMasteryDetailFactsV1({
      profileDefinition: definition,
      profile: {
        ...profile,
        mapSegmentMastery: [...profile.mapSegmentMastery].reverse(),
      },
      selection: { kind: 'map', targetDefinitionId: 'map.alpha' },
    })).toThrow(/稳定升序且唯一/);
  });

  it('rejects future fields, accessors and thenables without invoking user code', () => {
    const definition = definitionFixture();
    const profile = profileFixture(definition);
    expect(() => projectArenaV2CollectionMasteryDetailFactsV1({
      profileDefinition: definition,
      profile,
      selection: { kind: 'weapon', targetDefinitionId: 'weapon.alpha', future: true },
    })).toThrow(/不支持字段 future/);
    expect(() => projectArenaV2CollectionMasteryDetailFactsV1({
      profileDefinition: definition,
      profile,
      selection: { kind: 'weapon', targetDefinitionId: 'weapon.alpha' },
      future: true,
    })).toThrow(/不支持字段 future/);
    expect(() => projectArenaV2CollectionMasteryDetailFactsV1({
      profileDefinition: definition,
      profile: { ...profile, schemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION + 1 },
      selection: { kind: 'weapon', targetDefinitionId: 'weapon.alpha' },
    })).toThrow(/schema 不受支持/);

    let getterCalls = 0;
    const selection = Object.defineProperty({}, 'kind', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'weapon';
      },
    });
    Object.defineProperty(selection, 'targetDefinitionId', {
      enumerable: true,
      value: 'weapon.alpha',
    });
    expect(() => projectArenaV2CollectionMasteryDetailFactsV1({
      profileDefinition: definition,
      profile,
      selection,
    })).toThrow(/必须是可枚举数据字段/);
    expect(getterCalls).toBe(0);

    let thenCalls = 0;
    expect(() => projectArenaV2CollectionMasteryDetailFactsV1({
      profileDefinition: definition,
      profile,
      selection: {
        kind: 'weapon',
        targetDefinitionId: 'weapon.alpha',
        then() {
          thenCalls += 1;
        },
      },
    })).toThrow(/不支持字段 then/);
    expect(thenCalls).toBe(0);
  });

  it('returns deterministic frozen facts detached from later caller mutation', () => {
    const definition = definitionFixture();
    const source = JSON.parse(JSON.stringify(profileFixture(definition))) as Record<string, unknown>;
    const first = projectArenaV2CollectionMasteryDetailFactsV1({
      profileDefinition: definition,
      profile: source,
      selection: { kind: 'weapon', targetDefinitionId: 'weapon.alpha' },
    });
    const second = projectArenaV2CollectionMasteryDetailFactsV1({
      profileDefinition: definition,
      profile: source,
      selection: { kind: 'weapon', targetDefinitionId: 'weapon.alpha' },
    });
    expect(second).toEqual(first);
    (source.weaponMastery as Array<Record<string, unknown>>)[0]!.useCount = 99;
    expect(first.kind === 'weapon' ? first.useCount : null).toBe(9);
    expect(ARENA_V2_COLLECTION_MASTERY_DETAIL_FACTS_PROJECTION_V1_METADATA).toEqual({
      status: 'production-unreachable',
      defaultSurfaceWired: false,
      validationStatus: 'not-run',
    });
  });
});
