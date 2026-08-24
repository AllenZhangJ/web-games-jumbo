import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1,
  createArenaV2LearningProfileDefinitionV1,
  createArenaV2LearningProfileV1,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  projectArenaV2MapRouteResearchMilestoneV1,
  type ArenaV2MapRouteResearchMilestoneProjectionV1,
} from './arena-v2-map-route-research-milestone-projection-v1.js';
import {
  ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1,
} from './arena-v2-learning-capacity-report-v1.js';
import { readExactOptions } from './options.js';

export const ARENA_V2_COLLECTION_PROGRESS_SUMMARY_FACTS_PROJECTION_V1_SCHEMA_VERSION = 1 as const;

export const ARENA_V2_COLLECTION_PROGRESS_SUMMARY_FACTS_PROJECTION_V1_METADATA = Object.freeze({
  status: 'production-unreachable' as const,
  defaultSurfaceWired: false as const,
  maximumMainResearchGrantedPerEffectiveMatch: 1 as const,
  minimumMatchCountIsNotCompletionPromise: true as const,
  challengeMatchCountEstimateAllowed: false as const,
  averageMatchMinutesSource: 'arena-v2-learning-capacity-report-v1' as const,
  validationStatus: 'not-run' as const,
});

export interface ArenaV2CollectionProgressOrderedMapDirectoryV1 {
  readonly mapDefinitionId: string;
  readonly segmentDefinitionIds: readonly string[];
}

export interface ArenaV2CollectionProgressOrderedDirectoryV1 {
  readonly weaponDefinitionIds: readonly string[];
  readonly maps: readonly ArenaV2CollectionProgressOrderedMapDirectoryV1[];
}

export interface ArenaV2WeaponCollectionProgressSummaryFactV1 {
  readonly weaponDefinitionId: string;
  readonly collected: boolean;
  readonly collectionEvidenceCount: number;
  readonly collectionEvidenceTarget: number;
  readonly completedContextCount: number;
  readonly mastered: boolean;
}

export interface ArenaV2MapCollectionProgressSummaryFactV1 {
  readonly mapDefinitionId: string;
  readonly collected: boolean;
  readonly completedSegmentCount: number;
  readonly totalSegmentCount: number;
  readonly routeResearch: ArenaV2MapRouteResearchMilestoneProjectionV1;
}

export interface ArenaV2WeaponCollectionJourneySummaryFactV1 {
  readonly currentMainResearch: number;
  readonly targetMainResearch: number;
  readonly remainingMainResearch: number;
  readonly minimumRemainingEffectiveMatchCount: number;
  readonly collectedWeaponCount: number;
  readonly weaponCount: number;
  readonly averageMatchMinutesAssumption:
    typeof ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1;
  readonly estimatedRemainingMinutes: number;
  readonly estimateKind: 'capacity-hypothesis-not-player-promise';
}

export interface ArenaV2ChallengeCollectionJourneySummaryFactV1 {
  readonly currentProgress: number;
  readonly targetProgress: number;
  readonly remainingProgress: number;
  readonly completedChallengeCount: number;
  readonly challengeCount: number;
  readonly estimateKind: 'overlapping-progress-no-match-count-estimate';
}

export interface ArenaV2CollectionProgressSummaryFactsProjectionV1 {
  readonly schemaVersion:
    typeof ARENA_V2_COLLECTION_PROGRESS_SUMMARY_FACTS_PROJECTION_V1_SCHEMA_VERSION;
  readonly weapons: readonly ArenaV2WeaponCollectionProgressSummaryFactV1[];
  readonly maps: readonly ArenaV2MapCollectionProgressSummaryFactV1[];
  readonly weaponJourney: ArenaV2WeaponCollectionJourneySummaryFactV1;
  readonly challengeJourney: ArenaV2ChallengeCollectionJourneySummaryFactV1;
}

const OPTION_KEYS = new Set(['profileDefinition', 'profile', 'orderedDirectory']);
const DIRECTORY_KEYS = new Set(['weaponDefinitionIds', 'maps']);
const MAP_DIRECTORY_KEYS = new Set(['mapDefinitionId', 'segmentDefinitionIds']);

function identifier(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  return value;
}

function identifiers(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} 必须是数组。`);
  const result = value.map((entry, index) => identifier(entry, `${name}[${index}]`));
  if (new Set(result).size !== result.length) throw new RangeError(`${name} 不能包含重复身份。`);
  return Object.freeze(result);
}

function assertSameIdentitySet(
  actual: readonly string[],
  expected: readonly string[],
  name: string,
): void {
  const expectedSet = new Set(expected);
  const unknown = actual.find((identity) => !expectedSet.has(identity));
  if (unknown !== undefined) throw new RangeError(`${name} 包含未知身份 ${unknown}。`);
  if (actual.length !== expected.length) throw new RangeError(`${name} 存在遗漏。`);
  const actualSet = new Set(actual);
  const missing = expected.find((identity) => !actualSet.has(identity));
  if (missing !== undefined) throw new RangeError(`${name} 遗漏身份 ${missing}。`);
}

function readOrderedDirectory(
  value: unknown,
  definition: ReturnType<typeof createArenaV2LearningProfileDefinitionV1>,
): ArenaV2CollectionProgressOrderedDirectoryV1 {
  const cloned = cloneFrozenData(value, 'ArenaV2CollectionProgressOrderedDirectoryV1');
  const source = readExactOptions(
    cloned,
    DIRECTORY_KEYS,
    'ArenaV2CollectionProgressOrderedDirectoryV1',
  );
  const weaponDefinitionIds = identifiers(
    source.weaponDefinitionIds,
    'orderedDirectory.weaponDefinitionIds',
  );
  assertSameIdentitySet(
    weaponDefinitionIds,
    definition.weaponDefinitionIds,
    'orderedDirectory.weaponDefinitionIds',
  );

  if (!Array.isArray(source.maps)) throw new TypeError('orderedDirectory.maps 必须是数组。');
  const maps = source.maps.map((value, index) => {
    const mapSource = readExactOptions(
      value,
      MAP_DIRECTORY_KEYS,
      `orderedDirectory.maps[${index}]`,
    );
    return Object.freeze({
      mapDefinitionId: identifier(
        mapSource.mapDefinitionId,
        `orderedDirectory.maps[${index}].mapDefinitionId`,
      ),
      segmentDefinitionIds: identifiers(
        mapSource.segmentDefinitionIds,
        `orderedDirectory.maps[${index}].segmentDefinitionIds`,
      ),
    });
  });
  const mapDefinitionIds = maps.map(({ mapDefinitionId }) => mapDefinitionId);
  if (new Set(mapDefinitionIds).size !== mapDefinitionIds.length) {
    throw new RangeError('orderedDirectory.maps 不能包含重复地图身份。');
  }
  assertSameIdentitySet(
    mapDefinitionIds,
    definition.mapDefinitions.map(({ mapDefinitionId }) => mapDefinitionId),
    'orderedDirectory.maps',
  );

  const allDirectoryIdentities = new Set<string>();
  const registerIdentity = (identity: string, name: string) => {
    if (allDirectoryIdentities.has(identity)) {
      throw new RangeError(`${name} 与orderedDirectory中的其他身份重复。`);
    }
    allDirectoryIdentities.add(identity);
  };
  weaponDefinitionIds.forEach((identity, index) => {
    registerIdentity(identity, `orderedDirectory.weaponDefinitionIds[${index}]`);
  });
  maps.forEach((map, mapIndex) => {
    registerIdentity(map.mapDefinitionId, `orderedDirectory.maps[${mapIndex}].mapDefinitionId`);
    const definitionMap = definition.mapDefinitions.find(({ mapDefinitionId }) => (
      mapDefinitionId === map.mapDefinitionId
    ));
    if (!definitionMap) throw new RangeError('orderedDirectory.maps 引用了未知地图。');
    assertSameIdentitySet(
      map.segmentDefinitionIds,
      definitionMap.segmentDefinitionIds,
      `orderedDirectory.maps[${mapIndex}].segmentDefinitionIds`,
    );
    map.segmentDefinitionIds.forEach((identity, segmentIndex) => {
      registerIdentity(
        identity,
        `orderedDirectory.maps[${mapIndex}].segmentDefinitionIds[${segmentIndex}]`,
      );
    });
  });

  return Object.freeze({
    weaponDefinitionIds,
    maps: Object.freeze(maps),
  });
}

export function projectArenaV2CollectionProgressSummaryFactsV1(
  value: unknown,
): ArenaV2CollectionProgressSummaryFactsProjectionV1 {
  const options = readExactOptions(
    value,
    OPTION_KEYS,
    'ArenaV2CollectionProgressSummaryFactsProjectionV1 options',
  );
  const definition = createArenaV2LearningProfileDefinitionV1(options.profileDefinition);
  const profile = createArenaV2LearningProfileV1(definition, options.profile);
  const directory = readOrderedDirectory(options.orderedDirectory, definition);
  const collectedWeaponIds = new Set(profile.collections.weaponDefinitionIds);
  const weaponRecordById = new Map(
    profile.weaponMastery.map((record) => [record.weaponDefinitionId, record] as const),
  );
  const weapons = directory.weaponDefinitionIds.map((weaponDefinitionId) => {
    const record = weaponRecordById.get(weaponDefinitionId);
    const completedContextCount = record?.contexts.filter(({ completedAtRevision }) => (
      completedAtRevision !== null
    )).length ?? 0;
    return Object.freeze({
      weaponDefinitionId,
      collected: collectedWeaponIds.has(weaponDefinitionId),
      collectionEvidenceCount: record?.useCount ?? 0,
      collectionEvidenceTarget: definition.masteryRequirements.weaponCollectionUseEvidence,
      completedContextCount,
      mastered: completedContextCount === ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.length,
    });
  });

  const collectedMapIds = new Set(profile.collections.mapDefinitionIds);
  const completedSegmentIdsByMap = new Map<string, Set<string>>();
  profile.mapSegmentMastery.forEach((record) => {
    if (record.completedAtRevision === null) return;
    const completed = completedSegmentIdsByMap.get(record.mapDefinitionId) ?? new Set<string>();
    completed.add(record.segmentDefinitionId);
    completedSegmentIdsByMap.set(record.mapDefinitionId, completed);
  });
  const maps = directory.maps.map(({ mapDefinitionId, segmentDefinitionIds }) => {
    const completedSegmentCount = completedSegmentIdsByMap.get(mapDefinitionId)?.size ?? 0;
    const evidenceCount = profile.mapSegmentMastery.reduce((total, record) => (
      record.mapDefinitionId === mapDefinitionId
        ? total + record.completionEvidenceCount
        : total
    ), 0);
    return Object.freeze({
      mapDefinitionId,
      collected: collectedMapIds.has(mapDefinitionId),
      completedSegmentCount,
      totalSegmentCount: segmentDefinitionIds.length,
      routeResearch: projectArenaV2MapRouteResearchMilestoneV1({
        evidenceCount,
        completedSegmentCount,
        segmentCount: segmentDefinitionIds.length,
        evidencePerSegmentTarget: definition.masteryRequirements.mapSegmentCompletionEvidence,
      }),
    });
  });

  const targetMainResearch = weapons.reduce((total, weapon) => (
    total + weapon.collectionEvidenceTarget
  ), 0);
  const currentMainResearch = weapons.reduce((total, weapon) => (
    total + weapon.collectionEvidenceCount
  ), 0);
  const remainingMainResearch = targetMainResearch - currentMainResearch;
  if (remainingMainResearch < 0) {
    throw new RangeError('Arena V2武器收藏旅程当前主研究不能超过目录目标。');
  }
  const challengeRecordById = new Map(
    profile.challenges.map((record) => [record.challengeDefinitionId, record] as const),
  );
  const targetChallengeProgress = definition.challengeDefinitions.reduce((total, challenge) => (
    total + challenge.targetProgress
  ), 0);
  const currentChallengeProgress = definition.challengeDefinitions.reduce((total, challenge) => (
    total + (challengeRecordById.get(challenge.challengeDefinitionId)?.progress ?? 0)
  ), 0);
  if (!Number.isSafeInteger(targetChallengeProgress)
    || !Number.isSafeInteger(currentChallengeProgress)) {
    throw new RangeError('Arena V2挑战收藏旅程累计进度超过安全整数范围。');
  }
  const remainingChallengeProgress = targetChallengeProgress - currentChallengeProgress;
  if (remainingChallengeProgress < 0) {
    throw new RangeError('Arena V2挑战收藏旅程当前进度不能超过目录目标。');
  }

  return Object.freeze({
    schemaVersion: ARENA_V2_COLLECTION_PROGRESS_SUMMARY_FACTS_PROJECTION_V1_SCHEMA_VERSION,
    weapons: Object.freeze(weapons),
    maps: Object.freeze(maps),
    weaponJourney: Object.freeze({
      currentMainResearch,
      targetMainResearch,
      remainingMainResearch,
      minimumRemainingEffectiveMatchCount: remainingMainResearch,
      collectedWeaponCount: weapons.filter(({ collected }) => collected).length,
      weaponCount: weapons.length,
      averageMatchMinutesAssumption: ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1,
      estimatedRemainingMinutes: remainingMainResearch
        * ARENA_V2_LEARNING_CAPACITY_AVERAGE_MATCH_MINUTES_V1,
      estimateKind: 'capacity-hypothesis-not-player-promise' as const,
    }),
    challengeJourney: Object.freeze({
      currentProgress: currentChallengeProgress,
      targetProgress: targetChallengeProgress,
      remainingProgress: remainingChallengeProgress,
      completedChallengeCount: profile.challenges.filter(({ completedAtRevision }) => (
        completedAtRevision !== null
      )).length,
      challengeCount: definition.challengeDefinitions.length,
      estimateKind: 'overlapping-progress-no-match-count-estimate' as const,
    }),
  });
}
