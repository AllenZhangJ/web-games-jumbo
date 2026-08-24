import {
  createArenaV2LearningProfileDefinitionV1,
} from '@number-strategy-jump/arena-profile-contracts';

export const ARENA_V2_LEARNING_CAPACITY_TARGET_MINUTES_V1 = 12_000 as const;
export const ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1 = 5 as const;

export interface ArenaV2LearningCapacityProjectionV1 {
  readonly weaponCount: number;
  readonly mapSegmentCount: number;
  readonly modeCount: number;
  readonly challengeCount: number;
  readonly collectionEvidencePerWeapon: number;
  readonly averageMatchMinutes: typeof ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1;
  readonly aggregationModel: 'parallel-overlapping-tracks';
  readonly weaponCollectionMinutes: number;
  readonly weaponContextMinutes: number;
  readonly mapSegmentMinutes: number;
  readonly modeRecordMinutes: number;
  readonly crossChallengeMinutes: number;
  readonly totalMinutes: number;
  readonly totalHours: number;
  readonly targetDeltaMinutes: number;
}

export interface ArenaV2LearningCapacityReportV1 {
  readonly schemaVersion: 1;
  readonly status: 'capacity-hypothesis';
  readonly productionReady: false;
  readonly longitudinalEvidence: 'not-run';
  readonly targetMinutes: typeof ARENA_V2_LEARNING_CAPACITY_TARGET_MINUTES_V1;
  readonly duplicateDropMinutes: 0;
  readonly waitingMinutes: 0;
  readonly implementedCatalog: ArenaV2LearningCapacityProjectionV1;
  readonly plannedBaseline: ArenaV2LearningCapacityProjectionV1;
  readonly weaponSensitivity: readonly ArenaV2LearningCapacityProjectionV1[];
}

function projection(
  weaponCount: number,
  mapSegmentCount: number,
  modeCount: number,
  challengeCount: number,
  collectionEvidencePerWeapon: number,
): ArenaV2LearningCapacityProjectionV1 {
  const weaponCollectionMinutes = weaponCount
    * collectionEvidencePerWeapon
    * ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1;
  const weaponContextMinutes = weaponCount * 5 * 60;
  const mapSegmentMinutes = mapSegmentCount * 120;
  const modeRecordMinutes = modeCount * 480;
  const crossChallengeMinutes = challengeCount * 120;
  const totalMinutes = Math.max(
    weaponCollectionMinutes,
    weaponContextMinutes,
    mapSegmentMinutes,
    modeRecordMinutes,
    crossChallengeMinutes,
  );
  return Object.freeze({
    weaponCount,
    mapSegmentCount,
    modeCount,
    challengeCount,
    collectionEvidencePerWeapon,
    averageMatchMinutes: ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1,
    aggregationModel: 'parallel-overlapping-tracks' as const,
    weaponCollectionMinutes,
    weaponContextMinutes,
    mapSegmentMinutes,
    modeRecordMinutes,
    crossChallengeMinutes,
    totalMinutes,
    totalHours: totalMinutes / 60,
    targetDeltaMinutes: totalMinutes - ARENA_V2_LEARNING_CAPACITY_TARGET_MINUTES_V1,
  });
}

/** Reports capacity only; it never claims observed player retention. */
export function createArenaV2LearningCapacityReportV1(
  profileDefinitionValue: unknown,
): ArenaV2LearningCapacityReportV1 {
  const definition = createArenaV2LearningProfileDefinitionV1(profileDefinitionValue);
  const implementedSegmentCount = definition.mapDefinitions.reduce(
    (total, map) => total + map.segmentDefinitionIds.length,
    0,
  );
  const implementedCatalog = projection(
    definition.weaponDefinitionIds.length,
    implementedSegmentCount,
    definition.modeDefinitions.length,
    definition.challengeDefinitions.length,
    definition.masteryRequirements.weaponCollectionUseEvidence,
  );
  const collectionEvidence = definition.masteryRequirements.weaponCollectionUseEvidence;
  const plannedBaseline = projection(20, 20, 3, 20, collectionEvidence);
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'capacity-hypothesis' as const,
    productionReady: false as const,
    longitudinalEvidence: 'not-run' as const,
    targetMinutes: ARENA_V2_LEARNING_CAPACITY_TARGET_MINUTES_V1,
    duplicateDropMinutes: 0 as const,
    waitingMinutes: 0 as const,
    implementedCatalog,
    plannedBaseline,
    weaponSensitivity: Object.freeze([
      projection(12, 20, 3, 20, collectionEvidence),
      plannedBaseline,
      projection(28, 20, 3, 20, collectionEvidence),
    ]),
  });
}
