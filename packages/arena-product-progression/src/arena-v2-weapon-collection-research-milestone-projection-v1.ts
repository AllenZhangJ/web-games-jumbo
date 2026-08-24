import { readExactOptions } from './options.js';

export const ARENA_V2_WEAPON_COLLECTION_RESEARCH_MILESTONE_PROJECTION_V1_SCHEMA_VERSION =
  1 as const;

export const ARENA_V2_WEAPON_COLLECTION_RESEARCH_MILESTONE_THRESHOLDS_V1 = Object.freeze([
  30,
  60,
  90,
  120,
] as const);

export const ARENA_V2_WEAPON_COLLECTION_RESEARCH_STAGES_V1 = Object.freeze([
  '初识',
  '熟悉',
  '熟练',
  '精通',
  '主研究完成',
] as const);

export const ARENA_V2_WEAPON_COLLECTION_RESEARCH_MILESTONE_PROJECTION_V1_METADATA =
  Object.freeze({
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    defaultSurfaceWired: false as const,
    mutatesProfile: false as const,
    grantsRewards: false as const,
    maximumEvidenceGrantedPerEffectiveMatch: 1 as const,
    minimumMatchCountIsNotCompletionPromise: true as const,
    ownershipAndMainResearchStageAreIndependent: true as const,
    mainResearchCompletesOnlyAtEvidenceTarget: true as const,
    validationStatus: 'not-run' as const,
  });

export type ArenaV2WeaponCollectionResearchMilestoneThresholdV1 =
  typeof ARENA_V2_WEAPON_COLLECTION_RESEARCH_MILESTONE_THRESHOLDS_V1[number];

export type ArenaV2WeaponCollectionResearchStageV1 =
  typeof ARENA_V2_WEAPON_COLLECTION_RESEARCH_STAGES_V1[number];

export type ArenaV2WeaponCollectionResearchNextStageV1 = Exclude<
  ArenaV2WeaponCollectionResearchStageV1,
  '初识'
>;

export interface ArenaV2WeaponCollectionResearchMilestoneFactV1 {
  readonly threshold: ArenaV2WeaponCollectionResearchMilestoneThresholdV1;
  readonly reached: boolean;
}

export interface ArenaV2WeaponCollectionResearchMilestoneProjectionV1 {
  readonly schemaVersion:
    typeof ARENA_V2_WEAPON_COLLECTION_RESEARCH_MILESTONE_PROJECTION_V1_SCHEMA_VERSION;
  readonly count: number;
  readonly target: 120;
  readonly collected: boolean;
  readonly stage: ArenaV2WeaponCollectionResearchStageV1;
  readonly milestones: readonly ArenaV2WeaponCollectionResearchMilestoneFactV1[];
  readonly nextStage: ArenaV2WeaponCollectionResearchNextStageV1 | null;
  readonly nextThreshold: ArenaV2WeaponCollectionResearchMilestoneThresholdV1 | null;
  readonly remainingEvidenceCount: number;
  readonly minimumEffectiveMainResearchMatchCount: number;
}

const PROJECTION_KEYS = new Set(['count', 'target', 'collected']);
const CROSSING_KEYS = new Set(['previousCount', 'currentCount']);
const FORMAL_COLLECTION_RESEARCH_TARGET = 120 as const;

function boundedCount(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name} 必须是非负安全整数。`);
  }
  if ((value as number) > FORMAL_COLLECTION_RESEARCH_TARGET) {
    throw new RangeError(`${name} 不能超过正式收藏研究目标120。`);
  }
  return value as number;
}

function researchStage(
  count: number,
): ArenaV2WeaponCollectionResearchStageV1 {
  if (count >= FORMAL_COLLECTION_RESEARCH_TARGET) return '主研究完成';
  if (count >= 90) return '精通';
  if (count >= 60) return '熟练';
  if (count >= 30) return '熟悉';
  return '初识';
}

export function arenaV2WeaponCollectionResearchStageForThresholdV1(
  threshold: ArenaV2WeaponCollectionResearchMilestoneThresholdV1,
): ArenaV2WeaponCollectionResearchNextStageV1 {
  if (threshold === 30) return '熟悉';
  if (threshold === 60) return '熟练';
  if (threshold === 90) return '精通';
  if (threshold === 120) return '主研究完成';
  throw new RangeError('武器收藏研究门槛必须是30、60、90或120。');
}

/**
 * Projects display-neutral research milestone facts from the already validated
 * collection count/target/collected facts. It never reads or mutates Profile.
 */
export function projectArenaV2WeaponCollectionResearchMilestoneV1(
  value: unknown,
): ArenaV2WeaponCollectionResearchMilestoneProjectionV1 {
  const source = readExactOptions(
    value,
    PROJECTION_KEYS,
    'ArenaV2WeaponCollectionResearchMilestoneProjectionV1 options',
  );
  const count = boundedCount(source.count, 'collection research count');
  if (source.target !== FORMAL_COLLECTION_RESEARCH_TARGET) {
    throw new RangeError('collection research target 必须精确等于正式阈值120。');
  }
  if (typeof source.collected !== 'boolean') {
    throw new TypeError('collection research collected 必须是boolean。');
  }
  if (!source.collected && count >= FORMAL_COLLECTION_RESEARCH_TARGET) {
    throw new RangeError('未收藏武器不能达到正式收藏研究目标120。');
  }
  const milestones = ARENA_V2_WEAPON_COLLECTION_RESEARCH_MILESTONE_THRESHOLDS_V1
    .map((threshold) => Object.freeze({
      threshold,
      reached: count >= threshold,
    }));
  const nextMilestone = milestones.find(({ reached }) => !reached) ?? null;
  if (!source.collected && nextMilestone === null) {
    throw new RangeError('未收藏武器缺少下一收藏研究门槛。');
  }
  const nextStage = nextMilestone === null
    ? null
    : arenaV2WeaponCollectionResearchStageForThresholdV1(nextMilestone.threshold);
  const remainingEvidenceCount = nextMilestone === null
    ? 0
    : nextMilestone.threshold - count;
  return Object.freeze({
    schemaVersion: ARENA_V2_WEAPON_COLLECTION_RESEARCH_MILESTONE_PROJECTION_V1_SCHEMA_VERSION,
    count,
    target: FORMAL_COLLECTION_RESEARCH_TARGET,
    collected: source.collected,
    stage: researchStage(count),
    milestones: Object.freeze(milestones),
    nextStage,
    nextThreshold: nextMilestone?.threshold ?? null,
    remainingEvidenceCount,
    minimumEffectiveMainResearchMatchCount: remainingEvidenceCount,
  });
}

/** Returns only the highest milestone crossed by a monotonic count transition. */
export function deriveArenaV2HighestCrossedWeaponCollectionResearchMilestoneV1(
  value: unknown,
): ArenaV2WeaponCollectionResearchMilestoneThresholdV1 | null {
  const source = readExactOptions(
    value,
    CROSSING_KEYS,
    'deriveArenaV2HighestCrossedWeaponCollectionResearchMilestoneV1 options',
  );
  const previousCount = boundedCount(source.previousCount, 'previous collection research count');
  const currentCount = boundedCount(source.currentCount, 'current collection research count');
  if (currentCount < previousCount) {
    throw new RangeError('collection research count 不能倒退。');
  }
  for (
    let index = ARENA_V2_WEAPON_COLLECTION_RESEARCH_MILESTONE_THRESHOLDS_V1.length - 1;
    index >= 0;
    index -= 1
  ) {
    const threshold = ARENA_V2_WEAPON_COLLECTION_RESEARCH_MILESTONE_THRESHOLDS_V1[index]!;
    if (previousCount < threshold && currentCount >= threshold) return threshold;
  }
  return null;
}
