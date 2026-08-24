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
  ARENA_V2_COLLECTION_PROGRESS_SUMMARY_FACTS_PROJECTION_V1_METADATA,
  projectArenaV2CollectionProgressSummaryFactsV1,
} from '../src/arena-v2-collection-progress-summary-facts-projection-v1.js';
import {
  ARENA_V2_MAP_ROUTE_SEGMENT_PRACTICE_INSTRUCTION_V1,
  projectArenaV2MapRouteResearchMilestoneV1,
  resolveArenaV2MapRouteSegmentFocusV1,
} from '../src/arena-v2-map-route-research-milestone-projection-v1.js';

function definitionFixture(
  overrides: Readonly<Record<string, unknown>> = {},
): ArenaV2LearningProfileDefinitionV1 {
  return createArenaV2LearningProfileDefinitionV1({
    schemaVersion: ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
    id: 'collection-summary.dynamic.v1',
    contentVersion: 4,
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
    weaponDefinitionIds: ['weapon.alpha', 'weapon.beta', 'weapon.gamma'],
    mapDefinitions: [
      {
        mapDefinitionId: 'map.alpha',
        segmentDefinitionIds: ['segment.alpha.1', 'segment.alpha.2', 'segment.alpha.3'],
      },
      {
        mapDefinitionId: 'map.beta',
        segmentDefinitionIds: ['segment.beta.1'],
      },
      {
        mapDefinitionId: 'map.gamma',
        segmentDefinitionIds: ['segment.gamma.1', 'segment.gamma.2'],
      },
    ],
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
    revision: 6,
    committedGrantIds: [],
    collections: {
      weaponDefinitionIds: ['weapon.alpha', 'weapon.beta'],
      mapDefinitionIds: ['map.alpha'],
    },
    weaponMastery: [
      {
        weaponDefinitionId: 'weapon.alpha',
        useCount: 12,
        contexts: [
          { context: 'ground', evidenceCount: 2, completedAtRevision: 2 },
          { context: 'aerial', evidenceCount: 1, completedAtRevision: null },
          { context: 'edge', evidenceCount: 2, completedAtRevision: 3 },
          { context: 'duel-counterplay', evidenceCount: 0, completedAtRevision: null },
          { context: 'survival', evidenceCount: 2, completedAtRevision: 5 },
        ],
      },
      {
        weaponDefinitionId: 'weapon.beta',
        useCount: 20,
        contexts: [
          { context: 'ground', evidenceCount: 2, completedAtRevision: 2 },
          { context: 'aerial', evidenceCount: 2, completedAtRevision: 3 },
          { context: 'edge', evidenceCount: 2, completedAtRevision: 3 },
          { context: 'duel-counterplay', evidenceCount: 2, completedAtRevision: 4 },
          { context: 'survival', evidenceCount: 2, completedAtRevision: 5 },
        ],
      },
    ],
    mapSegmentMastery: [
      {
        mapDefinitionId: 'map.alpha',
        segmentDefinitionId: 'segment.alpha.1',
        completionEvidenceCount: 2,
        completedAtRevision: 4,
        bestRaceFinishTicks: null,
        bestSurvivalTicks: null,
      },
      {
        mapDefinitionId: 'map.alpha',
        segmentDefinitionId: 'segment.alpha.2',
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

function orderedDirectory() {
  return {
    weaponDefinitionIds: ['weapon.beta', 'weapon.gamma', 'weapon.alpha'],
    maps: [
      {
        mapDefinitionId: 'map.gamma',
        segmentDefinitionIds: ['segment.gamma.2', 'segment.gamma.1'],
      },
      {
        mapDefinitionId: 'map.alpha',
        segmentDefinitionIds: ['segment.alpha.3', 'segment.alpha.1', 'segment.alpha.2'],
      },
      {
        mapDefinitionId: 'map.beta',
        segmentDefinitionIds: ['segment.beta.1'],
      },
    ],
  };
}

function project(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  directory: unknown = orderedDirectory(),
) {
  return projectArenaV2CollectionProgressSummaryFactsV1({
    profileDefinition: definition,
    profile,
    orderedDirectory: directory,
  });
}

describe('Arena V2 P6 collection progress summary facts projection V1', () => {
  it('shares one least-practiced route focus with stable Definition-order ties', () => {
    const input = {
      evidencePerSegmentTarget: 2,
      segments: [
        { segmentDefinitionId: 'segment.a', completionEvidenceCount: 1 },
        { segmentDefinitionId: 'segment.b', completionEvidenceCount: 0 },
        { segmentDefinitionId: 'segment.c', completionEvidenceCount: 0 },
      ],
    };
    const first = resolveArenaV2MapRouteSegmentFocusV1(input);
    expect(first).toEqual({
      segmentDefinitionId: 'segment.b',
      ordinal: 2,
      currentProgress: 0,
      targetProgress: 2,
      practiceInstruction: ARENA_V2_MAP_ROUTE_SEGMENT_PRACTICE_INSTRUCTION_V1,
    });
    expect(resolveArenaV2MapRouteSegmentFocusV1(input)).toEqual(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(resolveArenaV2MapRouteSegmentFocusV1({
      evidencePerSegmentTarget: 1,
      segments: input.segments.map(({ segmentDefinitionId }) => ({
        segmentDefinitionId,
        completionEvidenceCount: 1,
      })),
    })).toBeNull();
    expect(() => resolveArenaV2MapRouteSegmentFocusV1({
      evidencePerSegmentTarget: 1,
      segments: [
        { segmentDefinitionId: 'segment.a', completionEvidenceCount: 0 },
        { segmentDefinitionId: 'segment.a', completionEvidenceCount: 0 },
      ],
    })).toThrow(/重复路段/);
  });

  it('preserves the P5 directory order for a dynamic 3-weapon/3-map catalog', () => {
    const definition = definitionFixture();
    const facts = project(definition, profileFixture(definition));
    expect(facts).toEqual({
      schemaVersion: 1,
      weapons: [
        {
          weaponDefinitionId: 'weapon.beta',
          collected: true,
          collectionEvidenceCount: 20,
          collectionEvidenceTarget: 120,
          completedContextCount: 5,
          mastered: true,
        },
        {
          weaponDefinitionId: 'weapon.gamma',
          collected: false,
          collectionEvidenceCount: 0,
          collectionEvidenceTarget: 120,
          completedContextCount: 0,
          mastered: false,
        },
        {
          weaponDefinitionId: 'weapon.alpha',
          collected: true,
          collectionEvidenceCount: 12,
          collectionEvidenceTarget: 120,
          completedContextCount: 3,
          mastered: false,
        },
      ],
      maps: [
        {
          mapDefinitionId: 'map.gamma',
          collected: false,
          completedSegmentCount: 0,
          totalSegmentCount: 2,
          routeResearch: projectArenaV2MapRouteResearchMilestoneV1({
            evidenceCount: 0,
            completedSegmentCount: 0,
            segmentCount: 2,
            evidencePerSegmentTarget: 2,
          }),
        },
        {
          mapDefinitionId: 'map.alpha',
          collected: true,
          completedSegmentCount: 1,
          totalSegmentCount: 3,
          routeResearch: projectArenaV2MapRouteResearchMilestoneV1({
            evidenceCount: 3,
            completedSegmentCount: 1,
            segmentCount: 3,
            evidencePerSegmentTarget: 2,
          }),
        },
        {
          mapDefinitionId: 'map.beta',
          collected: false,
          completedSegmentCount: 0,
          totalSegmentCount: 1,
          routeResearch: projectArenaV2MapRouteResearchMilestoneV1({
            evidenceCount: 0,
            completedSegmentCount: 0,
            segmentCount: 1,
            evidencePerSegmentTarget: 2,
          }),
        },
      ],
      weaponJourney: {
        currentMainResearch: 32,
        targetMainResearch: 360,
        remainingMainResearch: 328,
        minimumRemainingEffectiveMatchCount: 328,
        collectedWeaponCount: 2,
        weaponCount: 3,
        averageMatchMinutesAssumption: 5,
        estimatedRemainingMinutes: 1_640,
        estimateKind: 'capacity-hypothesis-not-player-promise',
      },
      challengeJourney: {
        currentProgress: 0,
        targetProgress: 0,
        remainingProgress: 0,
        completedChallengeCount: 0,
        challengeCount: 0,
        estimateKind: 'overlapping-progress-no-match-count-estimate',
      },
    });
    expect(Object.isFrozen(facts)).toBe(true);
    expect(Object.isFrozen(facts.weapons)).toBe(true);
    expect(Object.isFrozen(facts.maps)).toBe(true);
  });

  it('summarizes overlapping cross-challenge progress without inventing a match estimate', () => {
    const definition = definitionFixture({
      challengeDefinitions: [
        {
          challengeDefinitionId: 'challenge.alpha',
          targetProgress: 3,
          weaponDefinitionId: 'weapon.alpha',
          mapDefinitionId: 'map.alpha',
          segmentDefinitionId: 'segment.alpha.1',
          modeDefinitionId: 'mode.duel',
        },
        {
          challengeDefinitionId: 'challenge.beta',
          targetProgress: 5,
          weaponDefinitionId: 'weapon.beta',
          mapDefinitionId: 'map.beta',
          segmentDefinitionId: 'segment.beta.1',
          modeDefinitionId: 'mode.survival',
        },
      ],
    });
    const profile = createArenaV2LearningProfileV1(definition, {
      ...profileFixture(definition),
      challenges: [
        { challengeDefinitionId: 'challenge.alpha', progress: 3, completedAtRevision: 6 },
        { challengeDefinitionId: 'challenge.beta', progress: 2, completedAtRevision: null },
      ],
    });
    expect(project(definition, profile).challengeJourney).toEqual({
      currentProgress: 5,
      targetProgress: 8,
      remainingProgress: 3,
      completedChallengeCount: 1,
      challengeCount: 2,
      estimateKind: 'overlapping-progress-no-match-count-estimate',
    });
  });

  it('emits zero facts for collected catalog entries without mastery records', () => {
    const definition = definitionFixture();
    const empty = createArenaV2LearningProfileV1(definition);
    const profile = createArenaV2LearningProfileV1(definition, {
      ...empty,
      revision: 2,
      collections: {
        weaponDefinitionIds: ['weapon.alpha'],
        mapDefinitionIds: ['map.alpha'],
      },
    });
    const facts = project(definition, profile);
    expect(facts.weapons.find(({ weaponDefinitionId }) => (
      weaponDefinitionId === 'weapon.alpha'
    ))).toEqual({
      weaponDefinitionId: 'weapon.alpha',
      collected: true,
      completedContextCount: 0,
      mastered: false,
    });
    expect(facts.maps.find(({ mapDefinitionId }) => mapDefinitionId === 'map.alpha')).toEqual({
      mapDefinitionId: 'map.alpha',
      collected: true,
      completedSegmentCount: 0,
      totalSegmentCount: 3,
      routeResearch: projectArenaV2MapRouteResearchMilestoneV1({
        evidenceCount: 0,
        completedSegmentCount: 0,
        segmentCount: 3,
        evidencePerSegmentTarget: 2,
      }),
    });
  });

  it('accepts a wholly replaced dynamic Definition and matching ordered directory', () => {
    const definition = definitionFixture({
      id: 'collection-summary.replacement.v1',
      weaponDefinitionIds: ['weapon.replacement'],
      mapDefinitions: [{
        mapDefinitionId: 'map.replacement',
        segmentDefinitionIds: ['segment.replacement.2', 'segment.replacement.1'],
      }],
    });
    const facts = project(definition, createArenaV2LearningProfileV1(definition), {
      weaponDefinitionIds: ['weapon.replacement'],
      maps: [{
        mapDefinitionId: 'map.replacement',
        segmentDefinitionIds: ['segment.replacement.2', 'segment.replacement.1'],
      }],
    });
    expect(facts).toMatchObject({
      weapons: [{ weaponDefinitionId: 'weapon.replacement' }],
      maps: [{ mapDefinitionId: 'map.replacement', totalSegmentCount: 2 }],
    });
  });

  it('rejects directory omissions, duplicates, unknown identities and wrong segment ownership', () => {
    const definition = definitionFixture();
    const profile = profileFixture(definition);
    expect(() => project(definition, profile, {
      ...orderedDirectory(),
      weaponDefinitionIds: ['weapon.alpha', 'weapon.beta'],
    })).toThrow(/遗漏/);
    expect(() => project(definition, profile, {
      ...orderedDirectory(),
      weaponDefinitionIds: ['weapon.alpha', 'weapon.alpha', 'weapon.gamma'],
    })).toThrow(/重复/);
    expect(() => project(definition, profile, {
      ...orderedDirectory(),
      weaponDefinitionIds: ['weapon.alpha', 'weapon.beta', 'weapon.unknown'],
    })).toThrow(/未知身份/);
    expect(() => project(definition, profile, {
      ...orderedDirectory(),
      maps: orderedDirectory().maps.map((map) => (
        map.mapDefinitionId === 'map.alpha'
          ? { ...map, segmentDefinitionIds: ['segment.alpha.1', 'segment.alpha.2', 'segment.beta.1'] }
          : map.mapDefinitionId === 'map.beta'
            ? { ...map, segmentDefinitionIds: ['segment.alpha.3'] }
            : map
      )),
    })).toThrow(/未知身份/);
  });

  it('rejects contradictory Profile mastery instead of inferring collection or completion', () => {
    const definition = definitionFixture();
    const profile = profileFixture(definition);
    expect(() => projectArenaV2CollectionProgressSummaryFactsV1({
      profileDefinition: definition,
      profile: {
        ...profile,
        collections: { ...profile.collections, weaponDefinitionIds: [] },
      },
      orderedDirectory: orderedDirectory(),
    })).toThrow(/武器尚未收藏/);
    expect(() => projectArenaV2CollectionProgressSummaryFactsV1({
      profileDefinition: definition,
      profile: {
        ...profile,
        weaponMastery: [{
          ...profile.weaponMastery[0]!,
          contexts: profile.weaponMastery[0]!.contexts.map((context) => (
            context.context === 'aerial'
              ? { ...context, completedAtRevision: 6 }
              : context
          )),
        }, profile.weaponMastery[1]!],
      },
      orderedDirectory: orderedDirectory(),
    })).toThrow(/完成状态不一致/);
  });

  it('rejects future fields, accessors and thenables without invoking user code', () => {
    const definition = definitionFixture();
    const profile = profileFixture(definition);
    expect(() => projectArenaV2CollectionProgressSummaryFactsV1({
      profileDefinition: definition,
      profile,
      orderedDirectory: { ...orderedDirectory(), future: true },
    })).toThrow(/不支持字段 future/);

    let getterCalls = 0;
    const directory = Object.defineProperty({}, 'weaponDefinitionIds', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return orderedDirectory().weaponDefinitionIds;
      },
    });
    Object.defineProperty(directory, 'maps', {
      enumerable: true,
      value: orderedDirectory().maps,
    });
    expect(() => project(definition, profile, directory)).toThrow(/必须是可枚举数据字段/);
    expect(getterCalls).toBe(0);

    let thenCalls = 0;
    expect(() => project(definition, profile, {
      ...orderedDirectory(),
      then() {
        thenCalls += 1;
      },
    })).toThrow(/只能包含可序列化数据|不支持字段 then/);
    expect(thenCalls).toBe(0);
    expect(ARENA_V2_COLLECTION_PROGRESS_SUMMARY_FACTS_PROJECTION_V1_METADATA).toEqual({
      status: 'production-unreachable',
      defaultSurfaceWired: false,
      maximumMainResearchGrantedPerEffectiveMatch: 1,
      minimumMatchCountIsNotCompletionPromise: true,
      challengeMatchCountEstimateAllowed: false,
      averageMatchMinutesSource: 'arena-v2-learning-capacity-report-v1',
      validationStatus: 'not-run',
    });
  });

  it('is deterministic, deeply frozen and detached from caller mutation', () => {
    const definition = definitionFixture();
    const profile = profileFixture(definition);
    const directory = orderedDirectory();
    const first = project(definition, profile, directory);
    const second = project(definition, profile, directory);
    expect(second).toEqual(first);
    directory.weaponDefinitionIds.reverse();
    expect(first.weapons.map(({ weaponDefinitionId }) => weaponDefinitionId)).toEqual([
      'weapon.beta', 'weapon.gamma', 'weapon.alpha',
    ]);
    expect(first.weapons.every(Object.isFrozen)).toBe(true);
    expect(first.maps.every(Object.isFrozen)).toBe(true);
  });
});
