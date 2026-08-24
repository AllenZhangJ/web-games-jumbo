import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
  ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
  ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1,
  createArenaV2LearningProfileDefinitionV1,
  createArenaV2LearningProfileV1,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  ARENA_V2_FULL_CATALOG_REPLAY_COMBINATION_V1,
  projectArenaV2FullCatalogReplayCombinationV1,
  resolveArenaV2NextLearningGoalV1,
} from '../src/index.js';

const WEAPON_IDS = Object.freeze(Array.from(
  { length: 20 },
  (_, index) => `weapon.${String(index + 1).padStart(2, '0')}`,
));
const MAPS = Object.freeze([
  Object.freeze({ mapDefinitionId: 'map.kz-forward', segmentDefinitionIds: ['segment.a'] }),
  Object.freeze({ mapDefinitionId: 'map.kz-return', segmentDefinitionIds: ['segment.b'] }),
]);

const DEFINITION = createArenaV2LearningProfileDefinitionV1({
  schemaVersion: ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
  id: 'full-catalog-replay-combination.test.v1',
  contentVersion: 1,
  currentProfileSchemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
  status: 'production-unreachable',
  hardGate: false,
  defaultProfileServiceWired: false,
  limits: {
    maxIdentifierLength: 96,
    maxCommittedGrantIds: 16,
    maxCounterValue: 10_000,
    maxCollectedWeaponIds: 20,
    maxCollectedMapIds: 2,
    maxWeaponMasteryRecords: 20,
    maxMapSegmentMasteryRecords: 2,
    maxModeRecords: 3,
    maxChallengeRecords: 1,
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
    modeCompletionEvidence: 2,
  },
  defaultProfileId: 'local',
  initiallyCollectedWeaponDefinitionIds: [],
  initiallyCollectedMapDefinitionIds: [],
  weaponDefinitionIds: WEAPON_IDS,
  mapDefinitions: MAPS,
  modeDefinitions: [
    { modeDefinitionId: 'mode.duel', kind: 'duel' },
    { modeDefinitionId: 'mode.race', kind: 'race' },
    { modeDefinitionId: 'mode.survival', kind: 'survival' },
  ],
  challengeDefinitions: [],
});

function completeProfile(
  revision: number,
  weaponDefinitionIds: readonly string[] = WEAPON_IDS,
) {
  return createArenaV2LearningProfileV1(DEFINITION, {
    schemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
    profileDefinitionId: DEFINITION.id,
    profileDefinitionContentVersion: DEFINITION.contentVersion,
    profileId: 'local',
    revision,
    committedGrantIds: [],
    collections: {
      weaponDefinitionIds,
      mapDefinitionIds: MAPS.map(({ mapDefinitionId }) => mapDefinitionId),
    },
    weaponMastery: weaponDefinitionIds.map((weaponDefinitionId) => ({
      weaponDefinitionId,
      useCount: 120,
      contexts: ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.map((context) => ({
        context,
        evidenceCount: 1,
        completedAtRevision: 1,
      })),
    })),
    mapSegmentMastery: MAPS.flatMap(({ mapDefinitionId, segmentDefinitionIds }) => (
      segmentDefinitionIds.map((segmentDefinitionId) => ({
        mapDefinitionId,
        segmentDefinitionId,
        completionEvidenceCount: 1,
        completedAtRevision: 1,
        bestRaceFinishTicks: null,
        bestSurvivalTicks: null,
      }))
    )),
    modeRecords: [
      {
        modeDefinitionId: 'mode.duel', kind: 'duel', playCount: 9,
        completionCount: 2, winCount: 1, completedAtRevision: 1,
        bestPerformanceTicks: 600,
      },
      {
        modeDefinitionId: 'mode.race', kind: 'race', playCount: 2,
        completionCount: 2, winCount: 1, completedAtRevision: 1,
        bestPerformanceTicks: 600,
      },
      {
        modeDefinitionId: 'mode.survival', kind: 'survival', playCount: 5,
        completionCount: 2, winCount: 0, completedAtRevision: 1,
        bestPerformanceTicks: 600,
      },
    ],
    challenges: [],
  });
}

function project(
  revision: number,
  profileWeaponDefinitionIds: readonly string[] = WEAPON_IDS,
  eligibleWeaponDefinitionIds: readonly string[] | null = null,
  eligibleMapDefinitionIds: readonly string[] | null = null,
) {
  const profile = completeProfile(revision, profileWeaponDefinitionIds);
  const nextGoal = resolveArenaV2NextLearningGoalV1({
    profileDefinition: DEFINITION,
    profile,
    ...(eligibleWeaponDefinitionIds === null ? {} : { eligibleWeaponDefinitionIds }),
  });
  return projectArenaV2FullCatalogReplayCombinationV1({
    profileDefinition: DEFINITION,
    profile,
    nextGoal,
    eligibleWeaponDefinitionIds,
    eligibleMapDefinitionIds,
  });
}

describe('Arena V2 full-catalog replay combination V1', () => {
  it('covers all 20 weapon by 2 map combinations before repeating', () => {
    const combinations = Array.from({ length: 40 }, (_, offset) => project(120 + offset));
    expect(combinations.every((entry) => entry !== null)).toBe(true);
    expect(new Set(combinations.map((entry) => (
      `${entry?.weaponDefinitionId}:${entry?.mapDefinitionId}`
    ))).size).toBe(40);
    expect(combinations[0]).toMatchObject({
      modeKind: 'race',
      modePlayCount: 2,
      weaponDefinitionId: 'weapon.01',
      weaponRotationOrdinal: 1,
      eligibleWeaponCount: 20,
      mapDefinitionId: 'map.kz-forward',
      mapRotationOrdinal: 1,
      mapCount: 2,
      weaponMapRotationCycleLength: 40,
      survivalWeaponRequiresWorldPickup: false,
    });
    expect(project(160)).toMatchObject({
      weaponDefinitionId: 'weapon.01',
      mapDefinitionId: 'map.kz-forward',
    });
  });

  it('excludes unavailable weapons and keeps active-scope completion out of full replay', () => {
    const eligibleWeapons = WEAPON_IDS.slice(0, -1);
    expect(project(120, WEAPON_IDS, eligibleWeapons)).toMatchObject({
      eligibleWeaponCount: 19,
      weaponMapRotationCycleLength: 38,
    });
    expect(project(120, eligibleWeapons, eligibleWeapons)).toBeNull();
  });

  it('excludes unavailable maps from the mixed-radix replay cycle', () => {
    expect(project(120, WEAPON_IDS, null, ['map.kz-forward'])).toMatchObject({
      mapDefinitionId: 'map.kz-forward',
      mapCount: 1,
      weaponMapRotationCycleLength: 20,
    });
  });

  it('rejects a forged full-catalog goal against an incomplete profile', () => {
    const complete = completeProfile(120);
    const fullGoal = resolveArenaV2NextLearningGoalV1({
      profileDefinition: DEFINITION,
      profile: complete,
    });
    expect(() => projectArenaV2FullCatalogReplayCombinationV1({
      profileDefinition: DEFINITION,
      profile: completeProfile(120, WEAPON_IDS.slice(0, -1)),
      nextGoal: fullGoal,
      eligibleWeaponDefinitionIds: null,
      eligibleMapDefinitionIds: null,
    })).toThrow(/权威唯一目标/);
  });

  it('keeps the development and validation gates deferred', () => {
    expect(ARENA_V2_FULL_CATALOG_REPLAY_COMBINATION_V1).toMatchObject({
      status: 'production-unreachable',
      hardGate: false,
      implementationStatus: 'code-written-not-run',
      validationStatus: 'not-run',
      defaultSurfaceWired: false,
      fullWeaponMapCycleBeforeRepeat: true,
      excludesUnavailableWeaponsAndMaps: true,
      addsPersistedRotationState: false,
      writesProfileAuthorityRewardOrTask: false,
    });
  });
});
