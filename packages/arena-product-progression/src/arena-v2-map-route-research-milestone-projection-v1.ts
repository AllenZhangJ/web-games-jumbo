import {
  assertIntegerAtLeast,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import { readExactOptions } from './options.js';

export const ARENA_V2_MAP_ROUTE_RESEARCH_MILESTONE_PROJECTION_V1_SCHEMA_VERSION =
  1 as const;

export const ARENA_V2_MAP_ROUTE_RESEARCH_MILESTONE_PERCENTAGES_V1 = Object.freeze([
  25,
  50,
  75,
  100,
] as const);

export const ARENA_V2_MAP_ROUTE_RESEARCH_STAGES_V1 = Object.freeze([
  '初识',
  '熟悉',
  '熟练',
  '掌握',
  '路线全通',
] as const);

export const ARENA_V2_MAP_ROUTE_SEGMENT_PRACTICE_INSTRUCTION_V1 =
  '经过这段路线的安全落点，或在这段路线形成一次有效命中反馈' as const;

export const ARENA_V2_MAP_ROUTE_RESEARCH_MILESTONE_PROJECTION_V1_METADATA =
  Object.freeze({
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    defaultSurfaceWired: false as const,
    mutatesProfile: false as const,
    grantsRewards: false as const,
    addsPages: false as const,
    addsActions: false as const,
    validationStatus: 'not-run' as const,
  });

export type ArenaV2MapRouteResearchMilestonePercentageV1 =
  typeof ARENA_V2_MAP_ROUTE_RESEARCH_MILESTONE_PERCENTAGES_V1[number];

export type ArenaV2MapRouteResearchStageV1 =
  typeof ARENA_V2_MAP_ROUTE_RESEARCH_STAGES_V1[number];

export interface ArenaV2MapRouteResearchMilestoneFactV1 {
  readonly percentage: ArenaV2MapRouteResearchMilestonePercentageV1;
  readonly evidenceThreshold: number;
  readonly reached: boolean;
}

export interface ArenaV2MapRouteResearchMilestoneProjectionV1 {
  readonly schemaVersion:
    typeof ARENA_V2_MAP_ROUTE_RESEARCH_MILESTONE_PROJECTION_V1_SCHEMA_VERSION;
  readonly evidenceCount: number;
  readonly evidenceTarget: number;
  readonly completedSegmentCount: number;
  readonly segmentCount: number;
  readonly evidencePerSegmentTarget: number;
  readonly stage: ArenaV2MapRouteResearchStageV1;
  readonly milestones: readonly ArenaV2MapRouteResearchMilestoneFactV1[];
  readonly nextMilestonePercentage: ArenaV2MapRouteResearchMilestonePercentageV1 | null;
  readonly nextMilestoneEvidenceThreshold: number | null;
  readonly remainingEvidenceCount: number;
}

export interface ArenaV2MapRouteSegmentFocusV1 {
  readonly segmentDefinitionId: string;
  readonly ordinal: number;
  readonly currentProgress: number;
  readonly targetProgress: number;
  readonly practiceInstruction:
    typeof ARENA_V2_MAP_ROUTE_SEGMENT_PRACTICE_INSTRUCTION_V1;
}

const PROJECTION_KEYS = new Set([
  'evidenceCount',
  'completedSegmentCount',
  'segmentCount',
  'evidencePerSegmentTarget',
]);
const CROSSING_KEYS = new Set([
  'previousEvidenceCount',
  'currentEvidenceCount',
  'segmentCount',
  'evidencePerSegmentTarget',
]);
const SEGMENT_FOCUS_KEYS = new Set(['segments', 'evidencePerSegmentTarget']);
const SEGMENT_FOCUS_ITEM_KEYS = new Set([
  'segmentDefinitionId', 'completionEvidenceCount',
]);

function safeProduct(left: number, right: number, name: string): number {
  if (left === 0 || right === 0) return 0;
  if (left > Math.floor(Number.MAX_SAFE_INTEGER / right)) {
    throw new RangeError(`${name}超过安全整数范围。`);
  }
  return left * right;
}

function milestoneThreshold(
  evidenceTarget: number,
  percentage: ArenaV2MapRouteResearchMilestonePercentageV1,
): number {
  const hundreds = Math.floor(evidenceTarget / 100);
  const remainder = evidenceTarget % 100;
  return safeProduct(hundreds, percentage, '地图路线里程碑阈值')
    + Math.ceil((remainder * percentage) / 100);
}

function readRouteResearchCounts(
  value: Readonly<Record<string, unknown>>,
  prefix: string,
): Readonly<{
  evidenceCount: number;
  evidenceTarget: number;
  completedSegmentCount: number;
  segmentCount: number;
  evidencePerSegmentTarget: number;
}> {
  const segmentCount = assertIntegerAtLeast(value.segmentCount, 1, `${prefix}.segmentCount`);
  const evidencePerSegmentTarget = assertIntegerAtLeast(
    value.evidencePerSegmentTarget,
    1,
    `${prefix}.evidencePerSegmentTarget`,
  );
  const evidenceTarget = safeProduct(
    segmentCount,
    evidencePerSegmentTarget,
    `${prefix}.evidenceTarget`,
  );
  const evidenceCount = assertIntegerAtLeast(value.evidenceCount, 0, `${prefix}.evidenceCount`);
  if (evidenceCount > evidenceTarget) {
    throw new RangeError(`${prefix}.evidenceCount超过地图路线研究总目标。`);
  }
  const completedSegmentCount = assertIntegerAtLeast(
    value.completedSegmentCount,
    0,
    `${prefix}.completedSegmentCount`,
  );
  if (completedSegmentCount > segmentCount) {
    throw new RangeError(`${prefix}.completedSegmentCount超过地图段落数量。`);
  }
  const minimumEvidence = safeProduct(
    completedSegmentCount,
    evidencePerSegmentTarget,
    `${prefix}.minimumEvidence`,
  );
  const remainingSegmentCount = segmentCount - completedSegmentCount;
  const maximumIncompleteEvidence = safeProduct(
    remainingSegmentCount,
    evidencePerSegmentTarget - 1,
    `${prefix}.maximumIncompleteEvidence`,
  );
  if (evidenceCount < minimumEvidence
    || evidenceCount > minimumEvidence + maximumIncompleteEvidence) {
    throw new RangeError(`${prefix}总证据与已完成段落数量不闭合。`);
  }
  if ((evidenceCount === evidenceTarget) !== (completedSegmentCount === segmentCount)) {
    throw new RangeError(`${prefix}路线全通状态与总证据不闭合。`);
  }
  return Object.freeze({
    evidenceCount,
    evidenceTarget,
    completedSegmentCount,
    segmentCount,
    evidencePerSegmentTarget,
  });
}

function routeResearchStage(
  evidenceCount: number,
  milestones: readonly ArenaV2MapRouteResearchMilestoneFactV1[],
): ArenaV2MapRouteResearchStageV1 {
  if (milestones[3]!.reached) return '路线全通';
  if (milestones[2]!.reached) return '掌握';
  if (milestones[1]!.reached) return '熟练';
  if (milestones[0]!.reached) return '熟悉';
  return '初识';
}

/**
 * Projects a map's existing per-segment evidence into four readable route
 * milestones. It neither changes collection ownership nor writes Profile.
 */
export function projectArenaV2MapRouteResearchMilestoneV1(
  value: unknown,
): ArenaV2MapRouteResearchMilestoneProjectionV1 {
  const source = readExactOptions(
    value,
    PROJECTION_KEYS,
    'ArenaV2MapRouteResearchMilestoneProjectionV1 options',
  );
  const counts = readRouteResearchCounts(source, 'map route research');
  const milestones = ARENA_V2_MAP_ROUTE_RESEARCH_MILESTONE_PERCENTAGES_V1.map(
    (percentage) => {
      const evidenceThreshold = milestoneThreshold(counts.evidenceTarget, percentage);
      return Object.freeze({
        percentage,
        evidenceThreshold,
        reached: counts.evidenceCount >= evidenceThreshold,
      });
    },
  );
  const nextMilestone = milestones.find(({ reached }) => !reached) ?? null;
  return Object.freeze({
    schemaVersion: ARENA_V2_MAP_ROUTE_RESEARCH_MILESTONE_PROJECTION_V1_SCHEMA_VERSION,
    ...counts,
    stage: routeResearchStage(counts.evidenceCount, milestones),
    milestones: Object.freeze(milestones),
    nextMilestonePercentage: nextMilestone?.percentage ?? null,
    nextMilestoneEvidenceThreshold: nextMilestone?.evidenceThreshold ?? null,
    remainingEvidenceCount: nextMilestone === null
      ? 0
      : nextMilestone.evidenceThreshold - counts.evidenceCount,
  });
}

/**
 * Selects the least-practiced incomplete segment. Input order is the stable
 * route-definition tie-breaker, so callers do not need rotation state.
 */
export function resolveArenaV2MapRouteSegmentFocusV1(
  value: unknown,
): ArenaV2MapRouteSegmentFocusV1 | null {
  const source = readExactOptions(
    value,
    SEGMENT_FOCUS_KEYS,
    'ArenaV2MapRouteSegmentFocusV1 options',
  );
  const targetProgress = assertIntegerAtLeast(
    source.evidencePerSegmentTarget,
    1,
    'ArenaV2MapRouteSegmentFocusV1.evidencePerSegmentTarget',
  );
  if (!Array.isArray(source.segments) || source.segments.length === 0) {
    throw new RangeError('ArenaV2MapRouteSegmentFocusV1.segments必须是非空数组。');
  }
  const knownIds = new Set<string>();
  let selected: ArenaV2MapRouteSegmentFocusV1 | null = null;
  source.segments.forEach((entry, index) => {
    const segment = readExactOptions(
      entry,
      SEGMENT_FOCUS_ITEM_KEYS,
      `ArenaV2MapRouteSegmentFocusV1.segments[${index}]`,
    );
    const segmentDefinitionId = assertNonEmptyString(
      segment.segmentDefinitionId,
      `ArenaV2MapRouteSegmentFocusV1.segments[${index}].segmentDefinitionId`,
    );
    if (knownIds.has(segmentDefinitionId)) {
      throw new RangeError('ArenaV2MapRouteSegmentFocusV1不能包含重复路段。');
    }
    knownIds.add(segmentDefinitionId);
    const currentProgress = assertIntegerAtLeast(
      segment.completionEvidenceCount,
      0,
      `ArenaV2MapRouteSegmentFocusV1.segments[${index}].completionEvidenceCount`,
    );
    if (currentProgress > targetProgress) {
      throw new RangeError('ArenaV2MapRouteSegmentFocusV1路段进度超过目标。');
    }
    if (currentProgress >= targetProgress
      || (selected !== null && currentProgress >= selected.currentProgress)) {
      return;
    }
    selected = Object.freeze({
      segmentDefinitionId,
      ordinal: index + 1,
      currentProgress,
      targetProgress,
      practiceInstruction: ARENA_V2_MAP_ROUTE_SEGMENT_PRACTICE_INSTRUCTION_V1,
    });
  });
  return selected;
}

/** Returns only the highest map-route milestone crossed by a monotonic transition. */
export function deriveArenaV2HighestCrossedMapRouteResearchMilestoneV1(
  value: unknown,
): ArenaV2MapRouteResearchMilestonePercentageV1 | null {
  const source = readExactOptions(
    value,
    CROSSING_KEYS,
    'deriveArenaV2HighestCrossedMapRouteResearchMilestoneV1 options',
  );
  const segmentCount = assertIntegerAtLeast(
    source.segmentCount,
    1,
    'map route research crossing.segmentCount',
  );
  const evidencePerSegmentTarget = assertIntegerAtLeast(
    source.evidencePerSegmentTarget,
    1,
    'map route research crossing.evidencePerSegmentTarget',
  );
  const evidenceTarget = safeProduct(
    segmentCount,
    evidencePerSegmentTarget,
    'map route research crossing.evidenceTarget',
  );
  const currentEvidenceCount = assertIntegerAtLeast(
    source.currentEvidenceCount,
    0,
    'current map route research evidenceCount',
  );
  if (currentEvidenceCount > evidenceTarget) {
    throw new RangeError('当前地图路线研究证据超过总目标。');
  }
  const previousEvidenceCount = assertIntegerAtLeast(
    source.previousEvidenceCount,
    0,
    'previous map route research evidenceCount',
  );
  if (previousEvidenceCount > currentEvidenceCount) {
    throw new RangeError('地图路线研究证据不能倒退。');
  }
  for (
    let index = ARENA_V2_MAP_ROUTE_RESEARCH_MILESTONE_PERCENTAGES_V1.length - 1;
    index >= 0;
    index -= 1
  ) {
    const percentage = ARENA_V2_MAP_ROUTE_RESEARCH_MILESTONE_PERCENTAGES_V1[index]!;
    const threshold = milestoneThreshold(evidenceTarget, percentage);
    if (previousEvidenceCount < threshold && currentEvidenceCount >= threshold) {
      return percentage;
    }
  }
  return null;
}
