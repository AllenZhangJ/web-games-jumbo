import {
  ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
  ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
  createArenaV2LearningProfileDefinitionV1,
  type ArenaV2LearningChallengeDefinitionV1,
  type ArenaV2LearningModeKindV1,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
} from './arena-v2-kz-base-map-candidate-v1.js';
import {
  ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID,
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
} from './arena-v2-kz-switchback-map-candidate-v1.js';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
} from './arena-v2-collection-weapon-catalog-candidate-v1.js';

export const ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1 = Object.freeze({
  duel: 'arena-v2.mode.duel.candidate.v1',
  race: 'arena-v2.mode.race.candidate.v1',
  survival: 'arena-v2.mode.survival.candidate.v1',
} as const satisfies Readonly<Record<ArenaV2LearningModeKindV1, string>>);

const WEAPON_DEFINITION_IDS = Object.freeze(
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map(({ equipment }) => equipment.id),
);
const SEGMENT_DEFINITION_IDS = Object.freeze(
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2.segments.map(({ id }) => id),
);
const SWITCHBACK_SEGMENT_DEFINITION_IDS = Object.freeze(
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2.segments.map(({ id }) => id),
);
const FIRST_SIXTEEN_CROSS_CHALLENGE_TARGETS = Array.from({ length: 16 }, (_, index) => {
  const useSwitchback = index % 2 === 1;
  const segmentDefinitionIds = useSwitchback
    ? SWITCHBACK_SEGMENT_DEFINITION_IDS
    : SEGMENT_DEFINITION_IDS;
  return Object.freeze({
    mapDefinitionId: useSwitchback
      ? ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID
      : ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
    segmentDefinitionId: segmentDefinitionIds[
      Math.floor(index / 2) % segmentDefinitionIds.length
    ]!,
  });
});

const CROSS_CHALLENGE_TARGETS = Object.freeze([
  ...FIRST_SIXTEEN_CROSS_CHALLENGE_TARGETS,
  ...SEGMENT_DEFINITION_IDS.slice(8).map((segmentDefinitionId) => Object.freeze({
    mapDefinitionId: ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
    segmentDefinitionId,
  })),
]);

const CROSS_CHALLENGE_SEGMENT_IDENTITIES = CROSS_CHALLENGE_TARGETS.map((target) => (
  `${target.mapDefinitionId}:${target.segmentDefinitionId}`
));
if (CROSS_CHALLENGE_TARGETS.length !== WEAPON_DEFINITION_IDS.length
  || CROSS_CHALLENGE_TARGETS.length !== 20
  || new Set(CROSS_CHALLENGE_SEGMENT_IDENTITIES).size !== 20) {
  throw new RangeError('Arena V2交叉挑战必须精确一一覆盖20把武器与20个地图段落。');
}

function challenge(
  ordinal: number,
  weaponDefinitionId: string,
  kind: ArenaV2LearningModeKindV1,
): ArenaV2LearningChallengeDefinitionV1 {
  const target = CROSS_CHALLENGE_TARGETS[ordinal - 1];
  if (target === undefined) throw new RangeError(`未知的交叉挑战序号${ordinal}。`);
  return Object.freeze({
    challengeDefinitionId: `arena-v2.learning.cross-${String(ordinal).padStart(2, '0')}.candidate.v1`,
    targetProgress: 3,
    weaponDefinitionId,
    mapDefinitionId: target.mapDefinitionId,
    segmentDefinitionId: target.segmentDefinitionId,
    modeDefinitionId: ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1[kind],
  });
}

const CHALLENGES = Object.freeze([
  ...WEAPON_DEFINITION_IDS.slice(0, 6).map((weaponDefinitionId, index) => challenge(
    index + 1,
    weaponDefinitionId,
    'duel',
  )),
  ...WEAPON_DEFINITION_IDS.slice(6, 12).map((weaponDefinitionId, index) => challenge(
    index + 7,
    weaponDefinitionId,
    'survival',
  )),
  ...WEAPON_DEFINITION_IDS.slice(12).map((weaponDefinitionId, index) => challenge(
    index + 13,
    weaponDefinitionId,
    'race',
  )),
]);

export const ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1 =
  createArenaV2LearningProfileDefinitionV1({
    schemaVersion: ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
    id: 'arena-v2.learning-profile.candidate.v1',
    contentVersion: 5,
    currentProfileSchemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
    status: 'production-unreachable',
    hardGate: false,
    defaultProfileServiceWired: false,
    limits: {
      maxIdentifierLength: 160,
      maxCommittedGrantIds: 16_384,
      maxCounterValue: 1_000_000_000,
      maxCollectedWeaponIds: 28,
      maxCollectedMapIds: 16,
      maxWeaponMasteryRecords: 28,
      maxMapSegmentMasteryRecords: 256,
      maxModeRecords: 8,
      maxChallengeRecords: 256,
    },
    masteryRequirements: {
      weaponCollectionUseEvidence: 120,
      weaponContextEvidence: {
        ground: 3,
        aerial: 3,
        edge: 3,
        'duel-counterplay': 3,
        survival: 3,
      },
      mapSegmentCompletionEvidence: 3,
      modeCompletionEvidence: 5,
    },
    defaultProfileId: 'arena-v2-local-learning-profile.candidate.v1',
    initiallyCollectedWeaponDefinitionIds: [],
    initiallyCollectedMapDefinitionIds: [],
    weaponDefinitionIds: WEAPON_DEFINITION_IDS,
    mapDefinitions: [
      {
        mapDefinitionId: ARENA_V2_KZ_BASE_MAP_CANDIDATE_ID,
        segmentDefinitionIds: SEGMENT_DEFINITION_IDS,
      },
      {
        mapDefinitionId: ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID,
        segmentDefinitionIds: SWITCHBACK_SEGMENT_DEFINITION_IDS,
      },
    ],
    modeDefinitions: [
      { modeDefinitionId: ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.duel, kind: 'duel' },
      { modeDefinitionId: ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.race, kind: 'race' },
      { modeDefinitionId: ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.survival, kind: 'survival' },
    ],
    challengeDefinitions: CHALLENGES,
  });

export const ARENA_V2_LEARNING_PROFILE_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultProfileServiceWired: false as const,
  weaponCount: WEAPON_DEFINITION_IDS.length,
  mapCount: 2 as const,
  mapSegmentCount: SEGMENT_DEFINITION_IDS.length
    + ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2.segments.length,
  modeCount: 3 as const,
  crossChallengeCount: CHALLENGES.length,
  definition: ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
});
