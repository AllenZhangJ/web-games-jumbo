import {
  assertKnownKeys,
  assertPlainRecord,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_GAMEPLAY_V2_TUNING } from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1,
  advanceArenaV2LearningProfileV1,
  createArenaV2LearningGrantV1,
  createArenaV2LearningProfileDefinitionV1,
  createArenaV2LearningProfileV1,
  type ArenaV2LearningProfileDefinitionV1,
  type ArenaV2LearningProfileV1,
  type ArenaV2LearningProgressKindV1,
  type ArenaV2ChallengeProgressAppliedDeltaV1,
  type ArenaV2MapRouteEvidenceDeltaV1,
  type ArenaV2MapSegmentEvidenceAppliedDeltaV1,
  type ArenaV2ModeCompletionAppliedDeltaV1,
  type ArenaV2WeaponContextEvidenceAppliedDeltaV1,
} from '@number-strategy-jump/arena-profile-contracts';
import { readDataField, readExactOptions } from './options.js';
import {
  projectArenaV2CollectionProgressSummaryFactsV1,
  type ArenaV2ChallengeCollectionJourneySummaryFactV1,
  type ArenaV2CollectionProgressSummaryFactsProjectionV1,
} from './arena-v2-collection-progress-summary-facts-projection-v1.js';
import {
  ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1,
  ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1,
  ARENA_V2_MAP_LEARNING_COMPLETE_GOAL_ID_V1,
  ARENA_V2_WEAPON_LEARNING_COMPLETE_GOAL_ID_V1,
  resolveArenaV2MapLearningGoalV1,
  resolveArenaV2UncollectedWeaponResearchFocusV1,
  resolveArenaV2WeaponContextLearningFocusV1,
  resolveArenaV2WeaponContextLearningFocusForModeV1,
  resolveArenaV2WeaponLearningGoalV1,
  type ArenaV2NextLearningGoalV1,
} from './arena-v2-next-learning-goal-v1.js';
import {
  arenaV2WeaponCollectionResearchStageForThresholdV1,
  deriveArenaV2HighestCrossedWeaponCollectionResearchMilestoneV1,
  projectArenaV2WeaponCollectionResearchMilestoneV1,
} from './arena-v2-weapon-collection-research-milestone-projection-v1.js';
import {
  deriveArenaV2HighestCrossedMapRouteResearchMilestoneV1,
  projectArenaV2MapRouteResearchMilestoneV1,
  resolveArenaV2MapRouteSegmentFocusV1,
} from './arena-v2-map-route-research-milestone-projection-v1.js';
import {
  resolveArenaV2ResultNextGoalRouteFitV1,
  type ArenaV2ResultNextGoalRouteFitV1,
} from './arena-v2-result-next-goal-route-fit-v1.js';

export type ArenaV2LearningInformationScreenIdV1 =
  | 'home'
  | 'survival-prep'
  | 'weapon-index'
  | 'weapon-detail'
  | 'map-index'
  | 'map-detail'
  | 'result-reward';

export interface ArenaV2LearningInformationFieldPatchV1 {
  readonly fieldId: string;
  readonly labelMessageId: string;
  readonly valueText: string;
  readonly accessibilityText: string;
  readonly fixedWidthNumeric: boolean;
}

export interface ArenaV2LearningInformationScreenPatchV1 {
  readonly screenId: ArenaV2LearningInformationScreenIdV1;
  readonly fieldValues: readonly ArenaV2LearningInformationFieldPatchV1[];
}

export type ArenaV2LearningSettlementProjectionStatusV1 =
  | 'not-settled'
  | 'committed'
  | 'duplicate';

export interface ArenaV2LearningSettlementProjectionV1 {
  readonly status: ArenaV2LearningSettlementProjectionStatusV1;
  readonly grantId: string | null;
  readonly profileRevision: number | null;
  readonly sourceModeDefinitionId: string | null;
  readonly effectiveLearningProgress: boolean;
  readonly progressKinds: readonly ArenaV2LearningProgressKindV1[];
  readonly researchedWeaponDefinitionId: string | null;
  readonly weaponContextEvidenceDeltas:
    readonly ArenaV2WeaponContextEvidenceAppliedDeltaV1[];
  readonly mapSegmentEvidenceDeltas: readonly ArenaV2MapSegmentEvidenceAppliedDeltaV1[];
  readonly mapRouteEvidenceDeltas: readonly ArenaV2MapRouteEvidenceDeltaV1[];
  readonly modeCompletionDeltas: readonly ArenaV2ModeCompletionAppliedDeltaV1[];
  readonly challengeProgressDeltas: readonly ArenaV2ChallengeProgressAppliedDeltaV1[];
  readonly newlyCollectedWeaponDefinitionIds: readonly string[];
  readonly newlyCollectedMapDefinitionIds: readonly string[];
}

export interface RecoverArenaV2DuplicateLearningSettlementProjectionV1Options {
  readonly profileDefinition: unknown;
  readonly baselineProfile: unknown;
  readonly currentProfile: unknown;
  readonly grant: unknown;
}

export interface ArenaV2LearningInformationProjectionV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly defaultSurfaceWired: false;
  readonly profileRevision: number;
  readonly selectedWeaponDefinitionId: string | null;
  readonly selectedMapDefinitionId: string | null;
  readonly nextGoal: ArenaV2NextLearningGoalV1;
  readonly weaponGoal: ArenaV2NextLearningGoalV1;
  readonly mapGoal: ArenaV2NextLearningGoalV1;
  readonly homeRecordSummary: ArenaV2HomeRecordSummaryReadV1;
  readonly screens: readonly ArenaV2LearningInformationScreenPatchV1[];
}

export interface ArenaV2HomeRecordModeSummaryReadV1 {
  readonly kind: 'duel' | 'race' | 'survival';
  readonly modeDefinitionId: string;
  readonly playCount: number;
  readonly completionCount: number;
  readonly winCount: number;
  readonly bestPerformanceTicks: number | null;
  readonly compactText: string;
  readonly accessibilityText: string;
}

export interface ArenaV2HomeRecordSummaryReadV1 {
  readonly schemaVersion: 1;
  readonly modeRecords: readonly ArenaV2HomeRecordModeSummaryReadV1[];
  readonly modeMasteryProgress: number;
  readonly modeMasteryTarget: number;
  readonly collectedWeaponCount: number;
  readonly weaponCount: number;
  readonly weaponMainResearchProgress: number;
  readonly weaponMainResearchTarget: number;
  readonly completedWeaponContextCount: number;
  readonly weaponContextCount: number;
  readonly weaponContextEvidenceProgress: number;
  readonly weaponContextEvidenceTarget: number;
  readonly completedWeaponContextEvidence: number;
  readonly collectedMapCount: number;
  readonly mapCount: number;
  readonly completedMapSegmentCount: number;
  readonly mapSegmentCount: number;
  readonly mapRouteResearchProgress: number;
  readonly mapRouteResearchTarget: number;
  readonly completedChallengeCount: number;
  readonly challengeCount: number;
  readonly challengeProgress: number;
  readonly challengeProgressTarget: number;
  readonly compactText: string;
  readonly accessibilityText: string;
}

export const ARENA_V2_LEARNING_RESULT_PROGRESS_READABILITY_CONTRACT_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  visibleCopyPolicy: 'compact-player-summary' as const,
  accessibilityCopyPolicy: 'full-evidence-progress-and-continuation' as const,
  visibleCopyOwnsEvidenceJudgement: false as const,
  accessibilityCopyRetainsFullEvidence: true as const,
  mapRouteSettlementShowsAppliedDeltaAndCumulativePosition: true as const,
  mapRouteCumulativePositionSource:
    'validated-map-route-delta-and-collection-progress-route-research' as const,
  modeCompletionSettlementShowsAppliedDeltaAndOverallPosition: true as const,
  modeCompletionCumulativePositionSource:
    'reducer-applied-mode-completion-delta-and-validated-mode-record' as const,
  allEffectiveProgressReceiptsVisible: true as const,
  weaponResearchSettlementShowsCatalogJourney: true as const,
  weaponContextSettlementShowsCatalogJourney: true as const,
  detailAndMapModeMasteryUseSharedJourney: true as const,
  weaponDetailShowsCatalogJourneys: true as const,
  mapDetailShowsCatalogRouteJourney: true as const,
  personalBestSettlementExplicitlyMarksNewRecord: true as const,
  matchStartLearningGoalAttemptReceiptWired: true as const,
  matchStartLearningGoalAttemptUsesReducerAppliedIdentityOnly: true as const,
  missedGoalReceiptNeverInfersFailureCause: true as const,
  catalogCompleteFreePracticeDoesNotPublishMissedGoal: true as const,
  scopeCompletionCopyUsesStableGoalIds: true as const,
  unknownScopeCompletionCopyRejected: true as const,
  nonScopeCompletionCannotClaimStableCompletionGoalId: true as const,
  duplicatesScopeCompletionResolution: false as const,
  visibleAndAccessibilityScopeCompletionDerivedOncePerGoalCopy: true as const,
  visibleAndAccessibilityShareNormalizedGoalCopy: true as const,
  laneCompletionGoalIdsFromSingleResolverSource: true as const,
  laneCompletionKindAndSourceValidatedBeforeCopy: true as const,
  attemptReceiptScopeCompletionUsesStableGlobalGoalIds: true as const,
  laneOrUnknownCompletionCannotSuppressAttemptReceipt: true as const,
  resultGoalHintUsesStableScopeCompletionGoalIds: true as const,
  resultGoalHintHasNoImplicitFullCatalogFallback: true as const,
  ownsLayoutOrLineBudget: false as const,
  addsFieldsPagesTasksOrRewards: false as const,
  validationStatus: 'not-run' as const,
});

export const ARENA_V2_LEARNING_RESULT_GOAL_ROUTE_HINT_CONTRACT_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  readsSettledModeAndCurrentSelectionOnly: true as const,
  doesNotResolveOrReplaceNextGoal: true as const,
  doesNotMutateSelectionOrNavigation: true as const,
  survivalWeaponRequiresWorldPickup: true as const,
  genericWeaponGoalsPreferDeterministicLoadoutModes: true as const,
  explicitSurvivalWeaponGoalsAreConditional: true as const,
  neverPromisesTargetWeaponWillSpawnThisMatch: true as const,
  addsFieldsPagesTasksOrRewards: false as const,
  validationStatus: 'not-run' as const,
});

export const ARENA_V2_HOME_RECORD_SUMMARY_READ_CONTRACT_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  source: 'validated-learning-profile-and-collection-progress-summary' as const,
  modeOrder: Object.freeze(['duel', 'race', 'survival'] as const),
  derivesModeMasteryFromModeRecords: true as const,
  derivesWeaponMainResearchFromWeaponJourney: true as const,
  derivesWeaponContextEvidenceFromProfileRecords: true as const,
  derivesMapRouteEvidenceFromRouteResearch: true as const,
  derivesChallengeProgressFromChallengeJourney: true as const,
  presentationMayAccumulateOrInferProgress: false as const,
  staticCapacityIsNotRetentionPromise: true as const,
  recordFieldCountAdded: 0 as const,
  pageCountAdded: 0 as const,
  actionCountAdded: 0 as const,
  writesProfileAuthorityRewardOrTask: false as const,
  ownsNavigationOrFocus: false as const,
  validationStatus: 'not-run' as const,
});

const OPTION_KEYS = new Set([
  'profileDefinition',
  'profile',
  'selectedWeaponDefinitionId',
  'selectedMapDefinitionId',
  'settlement',
  'attemptedGoal',
  'eligibleWeaponDefinitionIds',
  'weaponDisplayNames',
  'mapDisplayNames',
]);
const REQUIRED_OPTION_KEYS = Object.freeze([
  'profileDefinition',
  'profile',
  'selectedWeaponDefinitionId',
  'selectedMapDefinitionId',
  'settlement',
  'eligibleWeaponDefinitionIds',
] as const);
const WEAPON_DISPLAY_NAME_KEYS = new Set(['weaponDefinitionId', 'displayName']);
const MAP_DISPLAY_NAME_KEYS = new Set(['mapDefinitionId', 'displayName', 'segments']);
const SEGMENT_DISPLAY_NAME_KEYS = new Set(['segmentDefinitionId', 'displayName']);
const SETTLEMENT_KEYS = new Set([
  'status', 'grantId', 'profileRevision', 'sourceModeDefinitionId',
  'effectiveLearningProgress', 'progressKinds',
  'researchedWeaponDefinitionId', 'weaponContextEvidenceDeltas',
  'mapSegmentEvidenceDeltas', 'mapRouteEvidenceDeltas', 'modeCompletionDeltas',
  'challengeProgressDeltas',
  'newlyCollectedWeaponDefinitionIds', 'newlyCollectedMapDefinitionIds',
]);
const MAP_ROUTE_EVIDENCE_DELTA_KEYS = new Set([
  'mapDefinitionId', 'completionEvidenceDelta',
]);
const MAP_SEGMENT_EVIDENCE_DELTA_KEYS = new Set([
  'mapDefinitionId', 'segmentDefinitionId', 'completionEvidenceDelta',
]);
const MODE_COMPLETION_DELTA_KEYS = new Set([
  'modeDefinitionId', 'completionCountDelta',
]);
const WEAPON_CONTEXT_EVIDENCE_DELTA_KEYS = new Set([
  'weaponDefinitionId', 'context', 'evidenceDelta',
]);
const CHALLENGE_PROGRESS_DELTA_KEYS = new Set([
  'challengeDefinitionId', 'progressDelta',
]);
const ATTEMPTED_GOAL_KEYS = new Set([
  'schemaVersion', 'profileRevision', 'kind', 'goalId', 'question', 'actionLabel',
  'currentProgress', 'targetProgress', 'weaponDefinitionId', 'mapDefinitionId',
  'segmentDefinitionId', 'modeDefinitionId', 'challengeDefinitionId', 'context',
  'effectiveLearningRequired',
]);
const DUPLICATE_RECOVERY_OPTION_KEYS = new Set([
  'profileDefinition', 'baselineProfile', 'currentProfile', 'grant',
]);
const PROGRESS_KIND_ORDER = Object.freeze([
  'challenge',
  'map-collected',
  'map-segment',
  'mode-mastery',
  'personal-best',
  'statistics',
  'weapon-collected',
  'weapon-collection-research',
  'weapon-context',
] as const satisfies readonly ArenaV2LearningProgressKindV1[]);
const EFFECTIVE_PROGRESS_KINDS = new Set<ArenaV2LearningProgressKindV1>([
  'weapon-collected',
  'weapon-collection-research',
  'map-collected',
  'weapon-context',
  'map-segment',
  'mode-mastery',
  'challenge',
  'personal-best',
]);
const PLAYER_VISIBLE_TICK_RATE_HZ = ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz;

function learningInformationOptions(value: unknown): Readonly<Record<string, unknown>> {
  const name = 'ArenaV2LearningInformationV1 options';
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, OPTION_KEYS, name);
  const result: Record<string, unknown> = {};
  for (const key of REQUIRED_OPTION_KEYS) result[key] = readDataField(source, key, name);
  result.weaponDisplayNames = Object.hasOwn(source, 'weaponDisplayNames')
    ? readDataField(source, 'weaponDisplayNames', name)
    : undefined;
  result.mapDisplayNames = Object.hasOwn(source, 'mapDisplayNames')
    ? readDataField(source, 'mapDisplayNames', name)
    : undefined;
  result.attemptedGoal = Object.hasOwn(source, 'attemptedGoal')
    ? readDataField(source, 'attemptedGoal', name)
    : undefined;
  return Object.freeze(result);
}

function weaponDisplayNames(
  value: unknown,
  definition: ArenaV2LearningProfileDefinitionV1,
): ReadonlyMap<string, string> {
  if (value === undefined) return new Map();
  if (!Array.isArray(value) || value.length !== definition.weaponDefinitionIds.length) {
    throw new RangeError('Learning information武器显示名必须与Definition目录等长。');
  }
  const names = new Map<string, string>();
  value.forEach((entry, index) => {
    const item = readExactOptions(
      entry,
      WEAPON_DISPLAY_NAME_KEYS,
      `Learning information weaponDisplayNames[${index}]`,
    );
    const weaponDefinitionId = item.weaponDefinitionId;
    const displayName = item.displayName;
    if (
      typeof weaponDefinitionId !== 'string'
      || weaponDefinitionId !== definition.weaponDefinitionIds[index]
    ) {
      throw new RangeError('Learning information武器显示名必须按Definition顺序完整提供。');
    }
    if (typeof displayName !== 'string' || displayName.trim() !== displayName
      || displayName.length < 1 || displayName.length > 24 || /[\u0000-\u001f\u007f]/u.test(displayName)) {
      throw new RangeError('Learning information武器显示名必须是1..24字符纯显示文本。');
    }
    names.set(weaponDefinitionId, displayName);
  });
  return names;
}

interface ArenaV2MapDisplayLabelsV1 {
  readonly displayName: string;
  readonly segmentDisplayNames: ReadonlyMap<string, string>;
}

function displayName(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() !== value
    || value.length < 1 || value.length > 24 || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new RangeError(`${name}必须是1..24字符纯显示文本。`);
  }
  return value;
}

function mapDisplayNames(
  value: unknown,
  definition: ArenaV2LearningProfileDefinitionV1,
): ReadonlyMap<string, ArenaV2MapDisplayLabelsV1> {
  if (value === undefined) return new Map();
  if (!Array.isArray(value) || value.length !== definition.mapDefinitions.length) {
    throw new RangeError('Learning information地图显示名必须与Definition目录等长。');
  }
  const names = new Map<string, ArenaV2MapDisplayLabelsV1>();
  value.forEach((entry, mapIndex) => {
    const item = readExactOptions(
      entry,
      MAP_DISPLAY_NAME_KEYS,
      `Learning information mapDisplayNames[${mapIndex}]`,
    );
    const definitionMap = definition.mapDefinitions[mapIndex]!;
    if (item.mapDefinitionId !== definitionMap.mapDefinitionId) {
      throw new RangeError('Learning information地图显示名必须按Definition顺序完整提供。');
    }
    if (!Array.isArray(item.segments)
      || item.segments.length !== definitionMap.segmentDefinitionIds.length) {
      throw new RangeError('Learning information路段显示名必须与地图Definition等长。');
    }
    const segmentDisplayNames = new Map<string, string>();
    item.segments.forEach((segment, segmentIndex) => {
      const segmentItem = readExactOptions(
        segment,
        SEGMENT_DISPLAY_NAME_KEYS,
        `Learning information mapDisplayNames[${mapIndex}].segments[${segmentIndex}]`,
      );
      const segmentDefinitionId = definitionMap.segmentDefinitionIds[segmentIndex]!;
      if (segmentItem.segmentDefinitionId !== segmentDefinitionId) {
        throw new RangeError('Learning information路段显示名必须按Definition顺序完整提供。');
      }
      segmentDisplayNames.set(
        segmentDefinitionId,
        displayName(segmentItem.displayName, 'Learning information路段显示名'),
      );
    });
    names.set(definitionMap.mapDefinitionId, Object.freeze({
      displayName: displayName(item.displayName, 'Learning information地图显示名'),
      segmentDisplayNames,
    }));
  });
  return names;
}

function elapsedClockText(ticks: number): string {
  if (ticks < 0) throw new RangeError('Arena V2 Learning展示时间不能为负tick。');
  const totalSeconds = Math.floor(ticks / PLAYER_VISIBLE_TICK_RATE_HZ);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function modeMasteryJourney(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
): Readonly<{
  progress: number;
  target: number;
  targetPerMode: number;
}> {
  const targetPerMode = definition.masteryRequirements.modeCompletionEvidence;
  const progress = definition.modeDefinitions.reduce((total, mode) => {
    const record = profile.modeRecords.find(({ modeDefinitionId }) => (
      modeDefinitionId === mode.modeDefinitionId
    ));
    return total + Math.min(record?.completionCount ?? 0, targetPerMode);
  }, 0);
  const target = definition.modeDefinitions.length * targetPerMode;
  if (!Number.isSafeInteger(progress)
    || !Number.isSafeInteger(target)
    || progress < 0
    || progress > target) {
    throw new RangeError('Learning information模式熟练累计进度超过安全整数范围。');
  }
  return Object.freeze({ progress, target, targetPerMode });
}

function assertWeaponMainResearchJourney(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  journey: ArenaV2CollectionProgressSummaryFactsProjectionV1['weaponJourney'],
): void {
  const expectedCurrent = profile.weaponMastery.reduce((total, record) => (
    total + record.useCount
  ), 0);
  const expectedTarget = definition.weaponDefinitionIds.length
    * definition.masteryRequirements.weaponCollectionUseEvidence;
  if (!Number.isSafeInteger(expectedCurrent)
    || !Number.isSafeInteger(expectedTarget)
    || journey.weaponCount !== definition.weaponDefinitionIds.length
    || journey.collectedWeaponCount !== profile.collections.weaponDefinitionIds.length
    || journey.currentMainResearch !== expectedCurrent
    || journey.targetMainResearch !== expectedTarget
    || journey.remainingMainResearch !== expectedTarget - expectedCurrent
    || journey.minimumRemainingEffectiveMatchCount !== journey.remainingMainResearch
    || expectedCurrent < 0
    || expectedCurrent > expectedTarget
    || (expectedCurrent === expectedTarget
      && journey.collectedWeaponCount !== journey.weaponCount)) {
    throw new RangeError('Learning information全武器主研究旅程与Definition/Profile不闭合。');
  }
}

function weaponContextEvidenceJourney(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
): Readonly<{
  progress: number;
  target: number;
  completedEvidence: number;
}> {
  const progress = profile.weaponMastery.reduce((total, weapon) => (
    total + weapon.contexts.reduce((weaponTotal, context) => (
      weaponTotal + context.evidenceCount
    ), 0)
  ), 0);
  const completedEvidence = profile.weaponMastery.reduce((total, weapon) => (
    total + weapon.contexts.reduce((weaponTotal, context) => (
      weaponTotal + (context.completedAtRevision === null ? 0 : context.evidenceCount)
    ), 0)
  ), 0);
  const targetPerWeapon = ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.reduce(
    (total, context) => (
      total + definition.masteryRequirements.weaponContextEvidence[context]
    ),
    0,
  );
  const target = definition.weaponDefinitionIds.length * targetPerWeapon;
  if (!Number.isSafeInteger(progress)
    || !Number.isSafeInteger(target)
    || !Number.isSafeInteger(completedEvidence)
    || progress < 0
    || progress > target
    || completedEvidence < 0
    || completedEvidence > progress) {
    throw new RangeError('Learning information武器情境研究累计事实无效。');
  }
  return Object.freeze({ progress, target, completedEvidence });
}

function homeRecordSummary(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  collectionProgress: ArenaV2CollectionProgressSummaryFactsProjectionV1,
): ArenaV2HomeRecordSummaryReadV1 {
  const modeKinds = Object.freeze(['duel', 'race', 'survival'] as const);
  const labels = Object.freeze({ duel: '1v1', race: '竞速', survival: '生存' } as const);
  const bestLabels = Object.freeze({
    duel: '最快胜利', race: '最快到达', survival: '最长坚持',
  } as const);
  const modeRecords = Object.freeze(modeKinds.map((kind) => {
    const definitions = definition.modeDefinitions.filter((entry) => entry.kind === kind);
    if (definitions.length !== 1) {
      throw new RangeError(`Learning information记录总览必须精确包含一个${kind}模式Definition。`);
    }
    const modeDefinition = definitions[0]!;
    const records = profile.modeRecords.filter((entry) => entry.kind === kind);
    if (records.length > 1) {
      throw new RangeError(`Learning information记录总览的${kind}模式记录不得重复。`);
    }
    const record = records[0];
    if (record !== undefined && record.modeDefinitionId !== modeDefinition.modeDefinitionId) {
      throw new RangeError(`Learning information记录总览的${kind}模式身份漂移。`);
    }
    const playCount = record?.playCount ?? 0;
    const completionCount = record?.completionCount ?? 0;
    const winCount = record?.winCount ?? 0;
    const bestPerformanceTicks = record?.bestPerformanceTicks ?? null;
    const bestText = bestPerformanceTicks === null
      ? '--'
      : elapsedClockText(bestPerformanceTicks);
    const completionText = `${labels[kind]}游玩${playCount}局，完成${completionCount}局`;
    return Object.freeze({
      kind,
      modeDefinitionId: modeDefinition.modeDefinitionId,
      playCount,
      completionCount,
      winCount,
      bestPerformanceTicks,
      compactText: `${labels[kind]} ${bestText}`,
      accessibilityText: `${completionText}${kind === 'duel' ? `，获胜${winCount}局` : ''}，${
        bestLabels[kind]
      }${bestPerformanceTicks === null ? '暂无记录' : bestText}。`,
    });
  }));
  const collectedWeaponCount = profile.collections.weaponDefinitionIds.length;
  const modeMastery = modeMasteryJourney(definition, profile);
  const modeMasteryTargetPerMode = modeMastery.targetPerMode;
  const modeMasteryProgress = modeMastery.progress;
  const modeMasteryTarget = modeMastery.target;
  const weaponCount = definition.weaponDefinitionIds.length;
  const weaponMainResearchProgress = collectionProgress.weaponJourney.currentMainResearch;
  const weaponMainResearchTarget = collectionProgress.weaponJourney.targetMainResearch;
  const completedWeaponContextCount = collectionProgress.weapons.reduce((total, weapon) => (
    total + weapon.completedContextCount
  ), 0);
  const weaponContextCount = weaponCount * ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.length;
  const weaponContextEvidence = weaponContextEvidenceJourney(definition, profile);
  const weaponContextEvidenceProgress = weaponContextEvidence.progress;
  const weaponContextEvidenceTarget = weaponContextEvidence.target;
  const completedWeaponContextEvidence = weaponContextEvidence.completedEvidence;
  const collectedMapCount = profile.collections.mapDefinitionIds.length;
  const mapCount = definition.mapDefinitions.length;
  const completedMapSegmentCountValue = completedMapSegmentCount(profile);
  const mapSegmentCount = totalMapSegmentCount(definition);
  const mapRouteResearchProgress = collectionProgress.maps.reduce((total, map) => (
    total + map.routeResearch.evidenceCount
  ), 0);
  const mapRouteResearchTarget = collectionProgress.maps.reduce((total, map) => (
    total + map.routeResearch.evidenceTarget
  ), 0);
  if (!Number.isSafeInteger(mapRouteResearchProgress)
    || !Number.isSafeInteger(mapRouteResearchTarget)) {
    throw new RangeError('Learning information首页累计路线研究超过安全整数范围。');
  }
  const {
    completedChallengeCount,
    challengeCount,
    currentProgress: challengeProgress,
    targetProgress: challengeProgressTarget,
  } = collectionProgress.challengeJourney;
  const challengeCompactText = challengeCount === 0
    ? ''
    : `·挑战${completedChallengeCount}/${challengeCount}·挑战进度${
      challengeProgress
    }/${challengeProgressTarget}`;
  const challengeAccessibilityText = challengeCount === 0
    ? ''
    : ` 已完成${completedChallengeCount}/${challengeCount}项交叉挑战，累计挑战进度${
      challengeProgress
    }/${challengeProgressTarget}；多项挑战可在同一局重叠推进，因此不推算剩余局数。`;
  return Object.freeze({
    schemaVersion: 1 as const,
    modeRecords,
    modeMasteryProgress,
    modeMasteryTarget,
    collectedWeaponCount,
    weaponCount,
    weaponMainResearchProgress,
    weaponMainResearchTarget,
    completedWeaponContextCount,
    weaponContextCount,
    weaponContextEvidenceProgress,
    weaponContextEvidenceTarget,
    completedWeaponContextEvidence,
    collectedMapCount,
    mapCount,
    completedMapSegmentCount: completedMapSegmentCountValue,
    mapSegmentCount,
    mapRouteResearchProgress,
    mapRouteResearchTarget,
    completedChallengeCount,
    challengeCount,
    challengeProgress,
    challengeProgressTarget,
    compactText: `${modeRecords.map(({ compactText }) => compactText).join('｜')}；模式熟练${
      modeMasteryProgress
    }/${modeMasteryTarget}·武器${
      collectedWeaponCount
    }/${weaponCount}·主研究${weaponMainResearchProgress}/${weaponMainResearchTarget}·情境${
      completedWeaponContextCount
    }/${weaponContextCount}·情境研究${
      weaponContextEvidenceProgress
    }/${weaponContextEvidenceTarget}·地图${
      collectedMapCount
    }/${mapCount}·路线${
      completedMapSegmentCountValue
    }/${mapSegmentCount}·路线研究${mapRouteResearchProgress}/${
      mapRouteResearchTarget
    }${challengeCompactText}`,
    accessibilityText: `${modeRecords.map(({ accessibilityText }) => accessibilityText).join(' ')}三种模式累计熟练进度${
      modeMasteryProgress
    }/${modeMasteryTarget}；每种模式最多计入${modeMasteryTargetPerMode}次有效完成。已收藏${
      collectedWeaponCount
    }/${weaponCount}把武器，全部武器主研究进度${weaponMainResearchProgress}/${
      weaponMainResearchTarget
    }；每局最多一把主研究武器增加1点。已完成${completedWeaponContextCount}/${
      weaponContextCount
    }项武器实战情境，全部武器累计情境研究进度${weaponContextEvidenceProgress}/${
      weaponContextEvidenceTarget
    }；已收藏${collectedMapCount}/${mapCount}张地图；已完整理解${
      completedMapSegmentCountValue
    }/${mapSegmentCount}个地图路段，全部地图累计路线研究进度${
      mapRouteResearchProgress
    }/${mapRouteResearchTarget}。${challengeAccessibilityText}`,
  });
}

/**
 * Reconstructs the one result projection lost behind an indeterminate write.
 * It never writes Profile state: the existing pure reducer replays the exact
 * authority-linked Grant against the match-start baseline, and the result is
 * accepted only when it equals the repository's current canonical Profile.
 */
export function recoverArenaV2DuplicateLearningSettlementProjectionV1(
  value: RecoverArenaV2DuplicateLearningSettlementProjectionV1Options,
): ArenaV2LearningSettlementProjectionV1 {
  const options = readExactOptions(
    value,
    DUPLICATE_RECOVERY_OPTION_KEYS,
    'Arena V2 duplicate learning settlement recovery options',
  );
  const definition = createArenaV2LearningProfileDefinitionV1(options.profileDefinition);
  const baseline = createArenaV2LearningProfileV1(definition, options.baselineProfile);
  const current = createArenaV2LearningProfileV1(definition, options.currentProfile);
  const grant = createArenaV2LearningGrantV1(definition, options.grant);
  if (baseline.committedGrantIds.includes(grant.grantId)) {
    throw new RangeError('Arena V2 duplicate recovery基线已经包含目标Grant。');
  }
  if (!current.committedGrantIds.includes(grant.grantId)) {
    throw new RangeError('Arena V2 duplicate recovery当前Profile尚未包含目标Grant。');
  }
  const replay = advanceArenaV2LearningProfileV1(
    definition,
    baseline,
    grant,
    baseline.revision,
  );
  if (!replay.committed || replay.duplicate) {
    throw new Error('Arena V2 duplicate recovery未得到唯一原始提交结果。');
  }
  if (createDeterministicDataHash(
    replay.profile,
    'Arena V2 duplicate recovery replayed profile',
  ) !== createDeterministicDataHash(
    current,
    'Arena V2 duplicate recovery current profile',
  )) {
    throw new RangeError('Arena V2 duplicate recovery重放Profile与当前存档不一致。');
  }
  return Object.freeze({
    status: 'committed' as const,
    grantId: replay.grant.grantId,
    profileRevision: current.revision,
    sourceModeDefinitionId: replay.grant.modeDelta.modeDefinitionId,
    effectiveLearningProgress: replay.effectiveLearningProgress,
    progressKinds: replay.progressKinds,
    researchedWeaponDefinitionId: replay.researchedWeaponDefinitionId,
    weaponContextEvidenceDeltas: replay.weaponContextEvidenceDeltas,
    mapSegmentEvidenceDeltas: replay.mapSegmentEvidenceDeltas,
    mapRouteEvidenceDeltas: replay.mapRouteEvidenceDeltas,
    modeCompletionDeltas: replay.modeCompletionDeltas,
    challengeProgressDeltas: replay.challengeProgressDeltas,
    newlyCollectedWeaponDefinitionIds: replay.newlyCollectedWeaponDefinitionIds,
    newlyCollectedMapDefinitionIds: replay.newlyCollectedMapDefinitionIds,
  });
}
const PROGRESS_KIND_LABELS = Object.freeze({
  challenge: '交叉挑战',
  'map-collected': '地图收藏',
  'map-segment': '路线理解',
  'mode-mastery': '模式熟练',
  'personal-best': '个人最佳',
  statistics: '使用记录',
  'weapon-collected': '武器收藏',
  'weapon-collection-research': '武器收藏研究',
  'weapon-context': '武器情境',
} as const satisfies Readonly<Record<ArenaV2LearningProgressKindV1, string>>);

function optionalDefinitionId(
  value: unknown,
  allowed: ReadonlySet<string>,
  name: string,
): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !allowed.has(value)) {
    throw new RangeError(`${name}必须是当前学习目录中的Definition ID或null。`);
  }
  return value;
}

function attemptedLearningGoal(
  value: unknown,
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
): ArenaV2NextLearningGoalV1 | null {
  if (value === undefined || value === null) return null;
  const source = readExactOptions(
    value,
    ATTEMPTED_GOAL_KEYS,
    'Learning information attemptedGoal',
  );
  if (source.schemaVersion !== 1) {
    throw new RangeError('Learning information attemptedGoal schemaVersion必须为1。');
  }
  if (!Number.isSafeInteger(source.profileRevision)
    || (source.profileRevision as number) < 0
    || (source.profileRevision as number) > profile.revision) {
    throw new RangeError('Learning information attemptedGoal revision不能晚于当前Profile。');
  }
  const kinds = new Set<ArenaV2NextLearningGoalV1['kind']>([
    'collect-map',
    'collect-weapon',
    'weapon-context',
    'map-segment',
    'mode-mastery',
    'cross-challenge',
    'record-improvement',
    'catalog-complete',
  ]);
  if (!kinds.has(source.kind as ArenaV2NextLearningGoalV1['kind'])) {
    throw new RangeError('Learning information attemptedGoal kind未知。');
  }
  const kind = source.kind as ArenaV2NextLearningGoalV1['kind'];
  const text = (candidate: unknown, name: string): string => {
    if (typeof candidate !== 'string'
      || candidate.trim() !== candidate
      || candidate.length < 1
      || candidate.length > 256
      || /[\u0000-\u001f\u007f]/u.test(candidate)) {
      throw new RangeError(`Learning information attemptedGoal ${name}无效。`);
    }
    return candidate;
  };
  const counter = (candidate: unknown, name: string): number => {
    if (!Number.isSafeInteger(candidate) || (candidate as number) < 0) {
      throw new RangeError(`Learning information attemptedGoal ${name}无效。`);
    }
    return candidate as number;
  };
  const goalId = text(source.goalId, 'goalId');
  const question = text(source.question, 'question');
  const actionLabel = text(source.actionLabel, 'actionLabel');
  const currentProgress = counter(source.currentProgress, 'currentProgress');
  const targetProgress = counter(source.targetProgress, 'targetProgress');
  if (targetProgress < 1 || currentProgress > targetProgress) {
    throw new RangeError('Learning information attemptedGoal进度越界。');
  }
  const weaponDefinitionId = optionalDefinitionId(
    source.weaponDefinitionId,
    new Set(definition.weaponDefinitionIds),
    'Learning information attemptedGoal.weaponDefinitionId',
  );
  const mapDefinitionId = optionalDefinitionId(
    source.mapDefinitionId,
    new Set(definition.mapDefinitions.map(({ mapDefinitionId }) => mapDefinitionId)),
    'Learning information attemptedGoal.mapDefinitionId',
  );
  const rawSegmentDefinitionId = source.segmentDefinitionId;
  const segmentDefinitionId = rawSegmentDefinitionId === null
    ? null
    : (() => {
      if (typeof rawSegmentDefinitionId !== 'string' || mapDefinitionId === null) {
        throw new RangeError('Learning information attemptedGoal路段缺少地图身份。');
      }
      const map = definition.mapDefinitions.find((entry) => (
        entry.mapDefinitionId === mapDefinitionId
      ));
      if (!map?.segmentDefinitionIds.includes(rawSegmentDefinitionId)) {
        throw new RangeError('Learning information attemptedGoal路段不属于目标地图。');
      }
      return rawSegmentDefinitionId;
    })();
  const modeDefinitionId = optionalDefinitionId(
    source.modeDefinitionId,
    new Set(definition.modeDefinitions.map(({ modeDefinitionId }) => modeDefinitionId)),
    'Learning information attemptedGoal.modeDefinitionId',
  );
  const challengeDefinitionId = optionalDefinitionId(
    source.challengeDefinitionId,
    new Set(definition.challengeDefinitions.map(({ challengeDefinitionId }) => (
      challengeDefinitionId
    ))),
    'Learning information attemptedGoal.challengeDefinitionId',
  );
  const context = source.context === null
    ? null
    : ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.includes(
      source.context as (typeof ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1)[number],
    )
      ? source.context as (typeof ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1)[number]
      : (() => { throw new RangeError('Learning information attemptedGoal context未知。'); })();
  const effectiveLearningRequired = source.effectiveLearningRequired;
  if (typeof effectiveLearningRequired !== 'boolean'
    || effectiveLearningRequired !== (kind !== 'record-improvement'
      && kind !== 'catalog-complete')) {
    throw new RangeError('Learning information attemptedGoal有效学习要求与目标类型漂移。');
  }
  const requireOnly = (
    expectedWeaponDefinitionId: string | null,
    expectedMapDefinitionId: string | null,
    expectedSegmentDefinitionId: string | null,
    expectedModeDefinitionId: string | null,
    expectedChallengeDefinitionId: string | null,
    expectedContext: typeof context,
  ): void => {
    if (weaponDefinitionId !== expectedWeaponDefinitionId
      || mapDefinitionId !== expectedMapDefinitionId
      || segmentDefinitionId !== expectedSegmentDefinitionId
      || modeDefinitionId !== expectedModeDefinitionId
      || challengeDefinitionId !== expectedChallengeDefinitionId
      || context !== expectedContext) {
      throw new RangeError('Learning information attemptedGoal身份组合不闭合。');
    }
  };
  if (kind === 'collect-map') {
    if (mapDefinitionId === null || goalId !== `collect-map:${mapDefinitionId}`
      || currentProgress !== 0 || targetProgress !== 1) {
      throw new RangeError('Learning information collect-map attemptedGoal无效。');
    }
    requireOnly(null, mapDefinitionId, null, null, null, null);
  } else if (kind === 'collect-weapon') {
    if (weaponDefinitionId === null || goalId !== `collect-weapon:${weaponDefinitionId}`
      || targetProgress !== definition.masteryRequirements.weaponCollectionUseEvidence
      || currentProgress >= targetProgress) {
      throw new RangeError('Learning information collect-weapon attemptedGoal无效。');
    }
    requireOnly(weaponDefinitionId, null, null, null, null, null);
  } else if (kind === 'weapon-context') {
    if (weaponDefinitionId === null || context === null
      || goalId !== `weapon-context:${weaponDefinitionId}:${context}`
      || targetProgress !== definition.masteryRequirements.weaponContextEvidence[context]
      || currentProgress >= targetProgress) {
      throw new RangeError('Learning information weapon-context attemptedGoal无效。');
    }
    requireOnly(weaponDefinitionId, null, null, null, null, context);
  } else if (kind === 'map-segment') {
    if (mapDefinitionId === null || segmentDefinitionId === null
      || goalId !== `map-segment:${mapDefinitionId}:${segmentDefinitionId}`
      || targetProgress !== definition.masteryRequirements.mapSegmentCompletionEvidence
      || currentProgress >= targetProgress) {
      throw new RangeError('Learning information map-segment attemptedGoal无效。');
    }
    requireOnly(null, mapDefinitionId, segmentDefinitionId, null, null, null);
  } else if (kind === 'mode-mastery') {
    if (modeDefinitionId === null
      || (goalId !== `mode-first-completion:${modeDefinitionId}`
        && goalId !== `mode-mastery:${modeDefinitionId}`)
      || currentProgress >= targetProgress
      || (goalId.startsWith('mode-first-completion:')
        ? currentProgress !== 0 || targetProgress !== 1
        : targetProgress !== definition.masteryRequirements.modeCompletionEvidence)) {
      throw new RangeError('Learning information mode-mastery attemptedGoal无效。');
    }
    requireOnly(null, null, null, modeDefinitionId, null, null);
  } else if (kind === 'cross-challenge') {
    const challenge = definition.challengeDefinitions.find((entry) => (
      entry.challengeDefinitionId === challengeDefinitionId
    ));
    if (challenge === undefined
      || goalId !== `cross-challenge:${challenge.challengeDefinitionId}`
      || currentProgress >= targetProgress
      || targetProgress !== challenge.targetProgress) {
      throw new RangeError('Learning information cross-challenge attemptedGoal无效。');
    }
    requireOnly(
      challenge.weaponDefinitionId,
      challenge.mapDefinitionId,
      challenge.segmentDefinitionId,
      challenge.modeDefinitionId,
      challenge.challengeDefinitionId,
      null,
    );
  } else if (kind === 'record-improvement') {
    if (modeDefinitionId === null
      || goalId !== `record-improvement:${modeDefinitionId}`
      || currentProgress !== 0 || targetProgress !== 1) {
      throw new RangeError('Learning information record-improvement attemptedGoal无效。');
    }
    requireOnly(null, null, null, modeDefinitionId, null, null);
  } else {
    if ((goalId !== ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1
        && goalId !== ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1)
      || currentProgress !== 1 || targetProgress !== 1) {
      throw new RangeError('Learning information catalog-complete attemptedGoal无效。');
    }
    requireOnly(null, null, null, null, null, null);
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    profileRevision: source.profileRevision as number,
    kind,
    goalId,
    question,
    actionLabel,
    currentProgress,
    targetProgress,
    weaponDefinitionId,
    mapDefinitionId,
    segmentDefinitionId,
    modeDefinitionId,
    challengeDefinitionId,
    context,
    effectiveLearningRequired,
  });
}

function settlement(
  value: unknown,
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
): ArenaV2LearningSettlementProjectionV1 {
  if (value === null) {
    return Object.freeze({
      status: 'not-settled' as const,
      grantId: null,
      profileRevision: null,
      sourceModeDefinitionId: null,
      effectiveLearningProgress: false,
      progressKinds: Object.freeze([]),
      researchedWeaponDefinitionId: null,
      weaponContextEvidenceDeltas: Object.freeze([]),
      mapSegmentEvidenceDeltas: Object.freeze([]),
      mapRouteEvidenceDeltas: Object.freeze([]),
      modeCompletionDeltas: Object.freeze([]),
      challengeProgressDeltas: Object.freeze([]),
      newlyCollectedWeaponDefinitionIds: Object.freeze([]),
      newlyCollectedMapDefinitionIds: Object.freeze([]),
    });
  }
  const record = readExactOptions(
    value,
    SETTLEMENT_KEYS,
    'Learning information settlement',
  );
  const status = record.status;
  if (status !== 'committed' && status !== 'duplicate' && status !== 'not-settled') {
    throw new RangeError('Learning information settlement.status不受支持。');
  }
  const grantId = record.grantId;
  if (grantId !== null && (typeof grantId !== 'string' || grantId.length === 0)) {
    throw new TypeError('Learning information settlement.grantId必须是非空字符串或null。');
  }
  const profileRevision = record.profileRevision;
  if (status === 'not-settled') {
    if (profileRevision !== null) {
      throw new RangeError('未结算状态不能携带Profile revision。');
    }
  } else if (!Number.isSafeInteger(profileRevision)
    || (profileRevision as number) < 0
    || profileRevision !== profile.revision) {
    throw new RangeError('Learning information settlement与当前Profile revision不一致。');
  }
  const sourceModeDefinitionId = optionalDefinitionId(
    record.sourceModeDefinitionId,
    new Set(definition.modeDefinitions.map(({ modeDefinitionId }) => modeDefinitionId)),
    'Learning information sourceModeDefinitionId',
  );
  const sourceModeDefinition = definition.modeDefinitions.find(({ modeDefinitionId }) => (
    modeDefinitionId === sourceModeDefinitionId
  ));
  const sourceModeRecord = profile.modeRecords.find(({ modeDefinitionId }) => (
    modeDefinitionId === sourceModeDefinitionId
  ));
  if (status === 'not-settled') {
    if (sourceModeDefinitionId !== null) {
      throw new RangeError('未结算状态不能携带来源模式身份。');
    }
  } else if (sourceModeDefinitionId === null
    || sourceModeDefinition === undefined) {
    throw new RangeError('Learning information settlement来源模式与Profile不闭合。');
  } else if (status === 'committed' && sourceModeRecord === undefined) {
    throw new RangeError('Learning information已提交结算缺少来源模式Profile记录。');
  } else if (sourceModeRecord !== undefined
    && sourceModeRecord.kind !== sourceModeDefinition.kind) {
    throw new RangeError('Learning information settlement来源模式种类与Profile不闭合。');
  }
  if (typeof record.effectiveLearningProgress !== 'boolean') {
    throw new TypeError('Learning information settlement.effectiveLearningProgress必须是布尔值。');
  }
  if (!Array.isArray(record.progressKinds)) {
    throw new TypeError('Learning information settlement.progressKinds必须是数组。');
  }
  const progressKinds = record.progressKinds.map((kind) => {
    if (!PROGRESS_KIND_ORDER.includes(kind as ArenaV2LearningProgressKindV1)) {
      throw new RangeError(`Learning information progress kind不受支持：${String(kind)}。`);
    }
    return kind as ArenaV2LearningProgressKindV1;
  });
  if (new Set(progressKinds).size !== progressKinds.length
    || progressKinds.some((kind, index) => PROGRESS_KIND_ORDER.indexOf(kind)
      <= PROGRESS_KIND_ORDER.indexOf(progressKinds[index - 1]!))) {
    throw new RangeError('Learning information progressKinds必须按固定顺序且唯一。');
  }
  if (progressKinds.includes('personal-best')
    && (sourceModeRecord === undefined || sourceModeRecord.bestPerformanceTicks === null)) {
    throw new RangeError('Learning information个人最佳缺少来源模式成绩记录。');
  }
  const definitionIds = (
    raw: unknown,
    allowed: ReadonlySet<string>,
    collected: readonly string[],
    name: string,
  ): readonly string[] => {
    if (!Array.isArray(raw)) throw new TypeError(`${name}必须是数组。`);
    const ids = raw.map((id, index) => {
      if (typeof id !== 'string' || !allowed.has(id)) {
        throw new RangeError(`${name}[${index}]不是当前学习目录身份。`);
      }
      if (!collected.includes(id)) throw new RangeError(`${name}[${index}]尚未写入Profile收藏。`);
      return id;
    });
    if (new Set(ids).size !== ids.length
      || ids.some((id, index) => index > 0 && id <= ids[index - 1]!)) {
      throw new RangeError(`${name}必须按Definition ID升序且唯一。`);
    }
    return Object.freeze(ids);
  };
  const newlyCollectedWeaponDefinitionIds = definitionIds(
    record.newlyCollectedWeaponDefinitionIds,
    new Set(definition.weaponDefinitionIds),
    profile.collections.weaponDefinitionIds,
    'Learning information newlyCollectedWeaponDefinitionIds',
  );
  const newlyCollectedMapDefinitionIds = definitionIds(
    record.newlyCollectedMapDefinitionIds,
    new Set(definition.mapDefinitions.map(({ mapDefinitionId }) => mapDefinitionId)),
    profile.collections.mapDefinitionIds,
    'Learning information newlyCollectedMapDefinitionIds',
  );
  const researchedWeaponDefinitionId = optionalDefinitionId(
    record.researchedWeaponDefinitionId,
    new Set(definition.weaponDefinitionIds),
    'Learning information researchedWeaponDefinitionId',
  );
  if (researchedWeaponDefinitionId !== null
    && !profile.weaponMastery.some((entry) => (
      entry.weaponDefinitionId === researchedWeaponDefinitionId && entry.useCount > 0
    ))) {
    throw new RangeError('Learning information主研究武器尚未写入有效收藏证据。');
  }
  if (!Array.isArray(record.weaponContextEvidenceDeltas)) {
    throw new TypeError(
      'Learning information settlement.weaponContextEvidenceDeltas必须是数组。',
    );
  }
  const contextOrder = new Map(ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.map(
    (context, index) => [context, index],
  ));
  const weaponContextEvidenceDeltas = record.weaponContextEvidenceDeltas.map(
    (value, index) => {
      const delta = readExactOptions(
        value,
        WEAPON_CONTEXT_EVIDENCE_DELTA_KEYS,
        `Learning information weaponContextEvidenceDeltas[${index}]`,
      );
      const weaponDefinitionId = delta.weaponDefinitionId;
      const context = delta.context;
      if (typeof weaponDefinitionId !== 'string'
        || !definition.weaponDefinitionIds.includes(weaponDefinitionId)) {
        throw new RangeError(
          `Learning information weaponContextEvidenceDeltas[${index}]武器身份无效。`,
        );
      }
      if (typeof context !== 'string'
        || !ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.includes(
          context as (typeof ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1)[number],
        )) {
        throw new RangeError(
          `Learning information weaponContextEvidenceDeltas[${index}]情境无效。`,
        );
      }
      const evidenceDelta = delta.evidenceDelta;
      const target = definition.masteryRequirements.weaponContextEvidence[
        context as (typeof ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1)[number]
      ];
      if (!Number.isSafeInteger(evidenceDelta)
        || (evidenceDelta as number) < 1
        || (evidenceDelta as number) > target) {
        throw new RangeError(
          `Learning information weaponContextEvidenceDeltas[${index}]增量越界。`,
        );
      }
      const current = profile.weaponMastery.find((entry) => (
        entry.weaponDefinitionId === weaponDefinitionId
      ))?.contexts.find((entry) => entry.context === context)?.evidenceCount;
      if (current === undefined || (evidenceDelta as number) > current) {
        throw new RangeError(
          `Learning information weaponContextEvidenceDeltas[${index}]超过当前武器情境证据。`,
        );
      }
      return Object.freeze({
        weaponDefinitionId,
        context: context as (typeof ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1)[number],
        evidenceDelta: evidenceDelta as number,
      });
    },
  );
  if (weaponContextEvidenceDeltas.some((entry, index) => {
    if (index === 0) return false;
    const previous = weaponContextEvidenceDeltas[index - 1]!;
    return entry.weaponDefinitionId < previous.weaponDefinitionId
      || (entry.weaponDefinitionId === previous.weaponDefinitionId
        && contextOrder.get(entry.context)! <= contextOrder.get(previous.context)!);
  })) {
    throw new RangeError(
      'Learning information weaponContextEvidenceDeltas必须按武器ID和固定情境顺序且唯一。',
    );
  }
  if (!Array.isArray(record.mapSegmentEvidenceDeltas)) {
    throw new TypeError('Learning information settlement.mapSegmentEvidenceDeltas必须是数组。');
  }
  const mapSegmentEvidenceDeltas = record.mapSegmentEvidenceDeltas.map((value, index) => {
    const delta = readExactOptions(
      value,
      MAP_SEGMENT_EVIDENCE_DELTA_KEYS,
      `Learning information mapSegmentEvidenceDeltas[${index}]`,
    );
    const mapDefinitionId = delta.mapDefinitionId;
    const segmentDefinitionId = delta.segmentDefinitionId;
    const map = definition.mapDefinitions.find((entry) => (
      entry.mapDefinitionId === mapDefinitionId
    ));
    if (typeof mapDefinitionId !== 'string' || map === undefined
      || typeof segmentDefinitionId !== 'string'
      || !map.segmentDefinitionIds.includes(segmentDefinitionId)) {
      throw new RangeError(
        `Learning information mapSegmentEvidenceDeltas[${index}]路段身份无效。`,
      );
    }
    const completionEvidenceDelta = delta.completionEvidenceDelta;
    const target = definition.masteryRequirements.mapSegmentCompletionEvidence;
    if (!Number.isSafeInteger(completionEvidenceDelta)
      || (completionEvidenceDelta as number) < 1
      || (completionEvidenceDelta as number) > target) {
      throw new RangeError(
        `Learning information mapSegmentEvidenceDeltas[${index}]增量越界。`,
      );
    }
    const current = profile.mapSegmentMastery.find((entry) => (
      entry.mapDefinitionId === mapDefinitionId
      && entry.segmentDefinitionId === segmentDefinitionId
    ))?.completionEvidenceCount;
    if (current === undefined || (completionEvidenceDelta as number) > current) {
      throw new RangeError(
        `Learning information mapSegmentEvidenceDeltas[${index}]超过当前路段证据。`,
      );
    }
    return Object.freeze({
      mapDefinitionId,
      segmentDefinitionId,
      completionEvidenceDelta: completionEvidenceDelta as number,
    });
  });
  if (mapSegmentEvidenceDeltas.some((entry, index) => {
    if (index === 0) return false;
    const previous = mapSegmentEvidenceDeltas[index - 1]!;
    return entry.mapDefinitionId < previous.mapDefinitionId
      || (entry.mapDefinitionId === previous.mapDefinitionId
        && entry.segmentDefinitionId <= previous.segmentDefinitionId);
  })) {
    throw new RangeError(
      'Learning information mapSegmentEvidenceDeltas必须按地图ID和路段ID升序且唯一。',
    );
  }
  if (!Array.isArray(record.mapRouteEvidenceDeltas)) {
    throw new TypeError('Learning information settlement.mapRouteEvidenceDeltas必须是数组。');
  }
  const mapRouteEvidenceDeltas = record.mapRouteEvidenceDeltas.map((value, index) => {
    const delta = readExactOptions(
      value,
      MAP_ROUTE_EVIDENCE_DELTA_KEYS,
      `Learning information mapRouteEvidenceDeltas[${index}]`,
    );
    const mapDefinitionId = delta.mapDefinitionId;
    const map = definition.mapDefinitions.find((entry) => (
      entry.mapDefinitionId === mapDefinitionId
    ));
    if (typeof mapDefinitionId !== 'string' || map === undefined) {
      throw new RangeError(`Learning information mapRouteEvidenceDeltas[${index}]地图身份无效。`);
    }
    const completionEvidenceDelta = delta.completionEvidenceDelta;
    if (!Number.isSafeInteger(completionEvidenceDelta)
      || (completionEvidenceDelta as number) < 1
      || (completionEvidenceDelta as number) > map.segmentDefinitionIds.length) {
      throw new RangeError(
        `Learning information mapRouteEvidenceDeltas[${index}]增量越界。`,
      );
    }
    const currentEvidenceCount = profile.mapSegmentMastery.reduce(
      (total, entry) => total + (
        entry.mapDefinitionId === mapDefinitionId ? entry.completionEvidenceCount : 0
      ),
      0,
    );
    if ((completionEvidenceDelta as number) > currentEvidenceCount) {
      throw new RangeError(
        `Learning information mapRouteEvidenceDeltas[${index}]超过当前地图路线证据。`,
      );
    }
    return Object.freeze({
      mapDefinitionId,
      completionEvidenceDelta: completionEvidenceDelta as number,
    });
  });
  if (mapRouteEvidenceDeltas.some((entry, index) => (
    index > 0 && entry.mapDefinitionId <= mapRouteEvidenceDeltas[index - 1]!.mapDefinitionId
  ))) {
    throw new RangeError('Learning information mapRouteEvidenceDeltas必须按地图ID升序且唯一。');
  }
  const exactRouteEvidenceByMap = new Map<string, number>();
  for (const delta of mapSegmentEvidenceDeltas) {
    exactRouteEvidenceByMap.set(
      delta.mapDefinitionId,
      (exactRouteEvidenceByMap.get(delta.mapDefinitionId) ?? 0)
        + delta.completionEvidenceDelta,
    );
  }
  if (mapRouteEvidenceDeltas.length !== exactRouteEvidenceByMap.size
    || mapRouteEvidenceDeltas.some((entry) => (
      exactRouteEvidenceByMap.get(entry.mapDefinitionId) !== entry.completionEvidenceDelta
    ))) {
    throw new RangeError('Learning information路段明细与地图路线汇总不一致。');
  }
  if (!Array.isArray(record.modeCompletionDeltas)) {
    throw new TypeError('Learning information settlement.modeCompletionDeltas必须是数组。');
  }
  if (record.modeCompletionDeltas.length > 1) {
    throw new RangeError('Learning information单局最多只能产生一个模式完成增量。');
  }
  const modeCompletionDeltas = record.modeCompletionDeltas.map((value, index) => {
    const delta = readExactOptions(
      value,
      MODE_COMPLETION_DELTA_KEYS,
      `Learning information modeCompletionDeltas[${index}]`,
    );
    const modeDefinitionId = delta.modeDefinitionId;
    if (typeof modeDefinitionId !== 'string'
      || modeDefinitionId !== sourceModeDefinitionId
      || !definition.modeDefinitions.some((entry) => (
        entry.modeDefinitionId === modeDefinitionId
      ))) {
      throw new RangeError('Learning information模式完成增量与来源模式身份不闭合。');
    }
    const completionCountDelta = delta.completionCountDelta;
    if (!Number.isSafeInteger(completionCountDelta)
      || (completionCountDelta as number) !== 1) {
      throw new RangeError('Learning information模式完成增量必须精确为1。');
    }
    const currentCompletionCount = profile.modeRecords.find((entry) => (
      entry.modeDefinitionId === modeDefinitionId
    ))?.completionCount;
    if (currentCompletionCount === undefined
      || currentCompletionCount < (completionCountDelta as number)
      || currentCompletionCount > definition.masteryRequirements.modeCompletionEvidence) {
      throw new RangeError('Learning information模式完成增量超过当前模式记录。');
    }
    return Object.freeze({
      modeDefinitionId,
      completionCountDelta: completionCountDelta as number,
    });
  });
  if (!Array.isArray(record.challengeProgressDeltas)) {
    throw new TypeError('Learning information settlement.challengeProgressDeltas必须是数组。');
  }
  const challengeProgressDeltas = record.challengeProgressDeltas.map((value, index) => {
    const delta = readExactOptions(
      value,
      CHALLENGE_PROGRESS_DELTA_KEYS,
      `Learning information challengeProgressDeltas[${index}]`,
    );
    const challengeDefinitionId = delta.challengeDefinitionId;
    const challenge = definition.challengeDefinitions.find((entry) => (
      entry.challengeDefinitionId === challengeDefinitionId
    ));
    if (typeof challengeDefinitionId !== 'string' || challenge === undefined) {
      throw new RangeError(
        `Learning information challengeProgressDeltas[${index}]挑战身份无效。`,
      );
    }
    const progressDelta = delta.progressDelta;
    if (!Number.isSafeInteger(progressDelta)
      || (progressDelta as number) < 1
      || (progressDelta as number) > challenge.targetProgress) {
      throw new RangeError(
        `Learning information challengeProgressDeltas[${index}]增量越界。`,
      );
    }
    const currentProgress = profile.challenges.find((entry) => (
      entry.challengeDefinitionId === challengeDefinitionId
    ))?.progress;
    if (currentProgress === undefined || (progressDelta as number) > currentProgress) {
      throw new RangeError(
        `Learning information challengeProgressDeltas[${index}]超过当前挑战进度。`,
      );
    }
    return Object.freeze({
      challengeDefinitionId,
      progressDelta: progressDelta as number,
    });
  });
  if (challengeProgressDeltas.some((entry, index) => (
    index > 0
    && entry.challengeDefinitionId <= challengeProgressDeltas[index - 1]!.challengeDefinitionId
  ))) {
    throw new RangeError('Learning information challengeProgressDeltas必须按挑战ID升序且唯一。');
  }
  const effective = progressKinds.some((kind) => EFFECTIVE_PROGRESS_KINDS.has(kind));
  if (effective !== record.effectiveLearningProgress) {
    throw new RangeError('Learning information settlement有效进度与progressKinds不一致。');
  }
  if (status === 'not-settled') {
    if (grantId !== null || progressKinds.length !== 0 || effective
      || newlyCollectedWeaponDefinitionIds.length !== 0
      || newlyCollectedMapDefinitionIds.length !== 0
      || researchedWeaponDefinitionId !== null
      || weaponContextEvidenceDeltas.length !== 0
      || mapSegmentEvidenceDeltas.length !== 0
      || mapRouteEvidenceDeltas.length !== 0
      || modeCompletionDeltas.length !== 0
      || challengeProgressDeltas.length !== 0) {
      throw new RangeError('未结算状态不能携带grant或进度。');
    }
  } else if (grantId === null || !profile.committedGrantIds.includes(grantId)) {
    throw new RangeError('已处理结算必须引用Profile中已提交的grant。');
  }
  if (status === 'duplicate' && (progressKinds.length !== 0 || effective
    || newlyCollectedWeaponDefinitionIds.length !== 0
    || newlyCollectedMapDefinitionIds.length !== 0
    || researchedWeaponDefinitionId !== null
    || weaponContextEvidenceDeltas.length !== 0
    || mapSegmentEvidenceDeltas.length !== 0
    || mapRouteEvidenceDeltas.length !== 0
    || modeCompletionDeltas.length !== 0
    || challengeProgressDeltas.length !== 0)) {
    throw new RangeError('重复结算不能再次展示进度。');
  }
  if (status === 'committed') {
    if (progressKinds.includes('weapon-collected')
      !== (newlyCollectedWeaponDefinitionIds.length > 0)
      || progressKinds.includes('map-collected')
      !== (newlyCollectedMapDefinitionIds.length > 0)) {
      throw new RangeError('Learning information收藏进度种类与具体新增身份不一致。');
    }
    if (progressKinds.includes('weapon-collection-research')
      !== (researchedWeaponDefinitionId !== null)) {
      throw new RangeError('Learning information武器收藏研究种类与具体武器身份不一致。');
    }
    if (progressKinds.includes('weapon-context')
      !== (weaponContextEvidenceDeltas.length > 0)) {
      throw new RangeError('Learning information武器情境种类与具体情境增量不一致。');
    }
    if (progressKinds.includes('map-segment') !== (mapSegmentEvidenceDeltas.length > 0)) {
      throw new RangeError('Learning information地图路线进度种类与具体路段增量不一致。');
    }
    if (progressKinds.includes('mode-mastery') !== (modeCompletionDeltas.length === 1)) {
      throw new RangeError('Learning information模式熟练种类与具体完成增量不一致。');
    }
    if (progressKinds.includes('challenge') !== (challengeProgressDeltas.length > 0)) {
      throw new RangeError('Learning information挑战进度种类与具体挑战增量不一致。');
    }
    if (newlyCollectedWeaponDefinitionIds.length > 0
      && newlyCollectedWeaponDefinitionIds[0] !== researchedWeaponDefinitionId) {
      throw new RangeError('Learning information新收藏武器必须是本局主研究武器。');
    }
  }
  return Object.freeze({
    status,
    grantId: grantId as string | null,
    profileRevision: profileRevision as number | null,
    sourceModeDefinitionId,
    effectiveLearningProgress: effective,
    progressKinds: Object.freeze(progressKinds),
    researchedWeaponDefinitionId,
    weaponContextEvidenceDeltas: Object.freeze(weaponContextEvidenceDeltas),
    mapSegmentEvidenceDeltas: Object.freeze(mapSegmentEvidenceDeltas),
    mapRouteEvidenceDeltas: Object.freeze(mapRouteEvidenceDeltas),
    modeCompletionDeltas: Object.freeze(modeCompletionDeltas),
    challengeProgressDeltas: Object.freeze(challengeProgressDeltas),
    newlyCollectedWeaponDefinitionIds,
    newlyCollectedMapDefinitionIds,
  });
}

function field(
  fieldId: string,
  valueText: string,
  accessibilityText = valueText,
  fixedWidthNumeric = false,
): ArenaV2LearningInformationFieldPatchV1 {
  if (valueText.length === 0 || accessibilityText.length === 0) {
    throw new RangeError(`Learning information field ${fieldId}不能为空。`);
  }
  return Object.freeze({
    fieldId,
    labelMessageId: `arena.v2.field.${fieldId}`,
    valueText,
    accessibilityText,
    fixedWidthNumeric,
  });
}

function screen(
  screenId: ArenaV2LearningInformationScreenIdV1,
  fieldValues: readonly ArenaV2LearningInformationFieldPatchV1[],
): ArenaV2LearningInformationScreenPatchV1 {
  return Object.freeze({ screenId, fieldValues: Object.freeze([...fieldValues]) });
}

function completedWeaponCount(profile: ArenaV2LearningProfileV1): number {
  return profile.weaponMastery.filter((record) => (
    profile.collections.weaponDefinitionIds.includes(record.weaponDefinitionId)
    && ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.every((context) => (
      typeof record.contexts.find((entry) => entry.context === context)?.completedAtRevision
        === 'number'
    ))
  )).length;
}

function completedMapSegmentCount(profile: ArenaV2LearningProfileV1): number {
  return profile.mapSegmentMastery.filter(({ completedAtRevision }) => (
    completedAtRevision !== null
  )).length;
}

function totalMapSegmentCount(definition: ArenaV2LearningProfileDefinitionV1): number {
  return definition.mapDefinitions.reduce(
    (total, map) => total + map.segmentDefinitionIds.length,
    0,
  );
}

function weaponOrdinal(
  definition: ArenaV2LearningProfileDefinitionV1,
  weaponDefinitionId: string,
  displayNames: ReadonlyMap<string, string> = new Map(),
): string {
  const index = definition.weaponDefinitionIds.indexOf(weaponDefinitionId);
  if (index < 0) throw new RangeError('Learning information目标引用未知武器。');
  const ordinal = `第${index + 1}把武器`;
  const displayName = displayNames.get(weaponDefinitionId);
  return displayName === undefined ? ordinal : `${displayName}（${ordinal}）`;
}

function mapOrdinal(
  definition: ArenaV2LearningProfileDefinitionV1,
  mapDefinitionId: string,
  displayNames: ReadonlyMap<string, ArenaV2MapDisplayLabelsV1> = new Map(),
): string {
  const index = definition.mapDefinitions.findIndex((entry) => (
    entry.mapDefinitionId === mapDefinitionId
  ));
  if (index < 0) throw new RangeError('Learning information目标引用未知地图。');
  const ordinal = `第${index + 1}张地图`;
  const displayName = displayNames.get(mapDefinitionId)?.displayName;
  return displayName === undefined ? ordinal : `${displayName}（${ordinal}）`;
}

function mapSegmentOrdinal(
  definition: ArenaV2LearningProfileDefinitionV1,
  mapDefinitionId: string,
  segmentDefinitionId: string,
  displayNames: ReadonlyMap<string, ArenaV2MapDisplayLabelsV1>,
): string {
  const map = definition.mapDefinitions.find((entry) => (
    entry.mapDefinitionId === mapDefinitionId
  ));
  const index = map?.segmentDefinitionIds.indexOf(segmentDefinitionId) ?? -1;
  if (map === undefined || index < 0) {
    throw new RangeError('Learning information目标引用未知地图路段。');
  }
  const ordinal = `第${index + 1}段路线`;
  const displayName = displayNames.get(mapDefinitionId)?.segmentDisplayNames.get(
    segmentDefinitionId,
  );
  return displayName === undefined ? ordinal : `${displayName}（${ordinal}）`;
}

function compactWeaponLabel(
  definition: ArenaV2LearningProfileDefinitionV1,
  weaponDefinitionId: string,
  displayNames: ReadonlyMap<string, string>,
): string {
  return displayNames.get(weaponDefinitionId)
    ?? weaponOrdinal(definition, weaponDefinitionId);
}

function compactMapLabel(
  definition: ArenaV2LearningProfileDefinitionV1,
  mapDefinitionId: string,
  displayNames: ReadonlyMap<string, ArenaV2MapDisplayLabelsV1>,
): string {
  return displayNames.get(mapDefinitionId)?.displayName
    ?? mapOrdinal(definition, mapDefinitionId);
}

function compactMapSegmentLabel(
  definition: ArenaV2LearningProfileDefinitionV1,
  mapDefinitionId: string,
  segmentDefinitionId: string,
  displayNames: ReadonlyMap<string, ArenaV2MapDisplayLabelsV1>,
): string {
  return displayNames.get(mapDefinitionId)?.segmentDisplayNames.get(segmentDefinitionId)
    ?? mapSegmentOrdinal(definition, mapDefinitionId, segmentDefinitionId, displayNames);
}

function modeLabel(
  definition: ArenaV2LearningProfileDefinitionV1,
  modeDefinitionId: string,
): string {
  const mode = definition.modeDefinitions.find((entry) => (
    entry.modeDefinitionId === modeDefinitionId
  ));
  if (!mode) throw new RangeError('Learning information目标引用未知模式。');
  if (mode.kind === 'duel') return '常规1v1';
  if (mode.kind === 'race') return '竞速';
  return '生存';
}

function challengeIdentityText(
  definition: ArenaV2LearningProfileDefinitionV1,
  challengeDefinitionId: string,
  displayNames: ReadonlyMap<string, string>,
  mapLabels: ReadonlyMap<string, ArenaV2MapDisplayLabelsV1>,
): string {
  const challengeIndex = definition.challengeDefinitions.findIndex((entry) => (
    entry.challengeDefinitionId === challengeDefinitionId
  ));
  const challenge = definition.challengeDefinitions[challengeIndex];
  if (challenge === undefined) {
    throw new RangeError('Learning information目标引用未知交叉挑战。');
  }
  const dimensions: string[] = [];
  if (challenge.weaponDefinitionId !== null) {
    dimensions.push(compactWeaponLabel(
      definition,
      challenge.weaponDefinitionId,
      displayNames,
    ));
  }
  if (challenge.mapDefinitionId !== null) {
    const map = compactMapLabel(definition, challenge.mapDefinitionId, mapLabels);
    dimensions.push(challenge.segmentDefinitionId === null
      ? map
      : `${map}·${compactMapSegmentLabel(
        definition,
        challenge.mapDefinitionId,
        challenge.segmentDefinitionId,
        mapLabels,
      )}`);
  }
  if (challenge.modeDefinitionId !== null) {
    dimensions.push(modeLabel(definition, challenge.modeDefinitionId));
  }
  return `第${challengeIndex + 1}项交叉挑战·${dimensions.join('·')}`;
}

function goalTargetText(
  definition: ArenaV2LearningProfileDefinitionV1,
  goal: ArenaV2NextLearningGoalV1,
  displayNames: ReadonlyMap<string, string>,
  mapLabels: ReadonlyMap<string, ArenaV2MapDisplayLabelsV1>,
): string {
  if (goal.goalId === ARENA_V2_WEAPON_LEARNING_COMPLETE_GOAL_ID_V1) {
    if (goal.kind !== 'catalog-complete') {
      throw new RangeError('Learning information非范围完成目标不得冒充武器学习范围完成。');
    }
    return '武器目录';
  }
  if (goal.goalId === ARENA_V2_MAP_LEARNING_COMPLETE_GOAL_ID_V1) {
    if (goal.kind !== 'catalog-complete') {
      throw new RangeError('Learning information非范围完成目标不得冒充地图学习范围完成。');
    }
    return '地图目录';
  }
  if (goal.goalId === ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1) {
    if (goal.kind !== 'catalog-complete') {
      throw new RangeError('Learning information非范围完成目标不得冒充active-learning-complete。');
    }
    return '当前开放学习内容';
  }
  if (goal.goalId === ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1) {
    if (goal.kind !== 'catalog-complete') {
      throw new RangeError('Learning information非范围完成目标不得冒充catalog-complete。');
    }
    return '完整收藏目录';
  }
  if (goal.kind === 'catalog-complete') {
    throw new RangeError('Learning information范围完成文案目标ID未注册。');
  }
  if (goal.kind === 'cross-challenge') {
    if (goal.challengeDefinitionId === null) {
      throw new RangeError('Learning information交叉挑战目标缺少挑战身份。');
    }
    return challengeIdentityText(
      definition,
      goal.challengeDefinitionId,
      displayNames,
      mapLabels,
    );
  }
  if (goal.weaponDefinitionId !== null) {
    const weapon = weaponOrdinal(definition, goal.weaponDefinitionId, displayNames);
    if (goal.context === null) return weapon;
    const context = {
      ground: '地面情境',
      aerial: '空中情境',
      edge: '边缘情境',
      'duel-counterplay': '1v1反制情境',
      survival: '生存情境',
    }[goal.context];
    return `${weapon}·${context}`;
  }
  if (goal.mapDefinitionId !== null) {
    const map = mapOrdinal(definition, goal.mapDefinitionId, mapLabels);
    if (goal.segmentDefinitionId === null) return map;
    const mapDefinition = definition.mapDefinitions.find((entry) => (
      entry.mapDefinitionId === goal.mapDefinitionId
    ))!;
    const segmentIndex = mapDefinition.segmentDefinitionIds.indexOf(goal.segmentDefinitionId);
    if (segmentIndex < 0) throw new RangeError('Learning information目标引用未知地图段落。');
    const segmentName = mapLabels.get(goal.mapDefinitionId)?.segmentDisplayNames.get(
      goal.segmentDefinitionId,
    );
    const segment = `第${segmentIndex + 1}段路线`;
    return `${map}·${segmentName === undefined ? segment : `${segmentName}（${segment}）`}`;
  }
  if (goal.modeDefinitionId !== null) return modeLabel(definition, goal.modeDefinitionId);
  return '下一项有效记录';
}

function assertLearningLaneGoalSource(
  goal: ArenaV2NextLearningGoalV1,
  lane: 'weapon' | 'map',
): void {
  const expectedGoalId = lane === 'weapon'
    ? ARENA_V2_WEAPON_LEARNING_COMPLETE_GOAL_ID_V1
    : ARENA_V2_MAP_LEARNING_COMPLETE_GOAL_ID_V1;
  const otherLaneGoalId = lane === 'weapon'
    ? ARENA_V2_MAP_LEARNING_COMPLETE_GOAL_ID_V1
    : ARENA_V2_WEAPON_LEARNING_COMPLETE_GOAL_ID_V1;
  if (goal.kind === 'catalog-complete') {
    if (goal.goalId !== expectedGoalId) {
      throw new RangeError(`Learning information ${lane}学习范围完成目标来源漂移。`);
    }
    return;
  }
  if (goal.goalId === expectedGoalId || goal.goalId === otherLaneGoalId) {
    throw new RangeError(`Learning information ${lane}非范围完成目标冒充学习范围完成。`);
  }
}

function scopedGoalCopy(
  definition: ArenaV2LearningProfileDefinitionV1,
  goal: ArenaV2NextLearningGoalV1,
  displayNames: ReadonlyMap<string, string>,
  mapLabels: ReadonlyMap<string, ArenaV2MapDisplayLabelsV1>,
  partialCatalogScope: boolean,
  weaponCollectionJourney: Readonly<{
    readonly collectedCount: number;
    readonly totalCount: number;
    readonly targetWeaponCollected: boolean;
  }> | null = null,
): Readonly<{
  readonly visibleText: string;
  readonly accessibilityText: string;
}> {
  const defaultTarget = goalTargetText(definition, goal, displayNames, mapLabels);
  if (weaponCollectionJourney !== null && (
    !Number.isSafeInteger(weaponCollectionJourney.collectedCount)
    || !Number.isSafeInteger(weaponCollectionJourney.totalCount)
    || weaponCollectionJourney.collectedCount < 0
    || weaponCollectionJourney.totalCount !== definition.weaponDefinitionIds.length
    || weaponCollectionJourney.collectedCount > weaponCollectionJourney.totalCount
    || typeof weaponCollectionJourney.targetWeaponCollected !== 'boolean'
    || (weaponCollectionJourney.targetWeaponCollected
      && weaponCollectionJourney.collectedCount < 1)
  )) {
    throw new RangeError('Learning information下一目标武器收藏旅程无效。');
  }
  const scopedCatalogCompletion = goal.kind === 'catalog-complete'
    && (goal.goalId === ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1
      || (partialCatalogScope
        && goal.goalId === ARENA_V2_WEAPON_LEARNING_COMPLETE_GOAL_ID_V1));
  if (!scopedCatalogCompletion) {
    const collectionDistance = goal.kind === 'collect-weapon'
      && weaponCollectionJourney !== null
      ? (() => {
        const remaining = goal.targetProgress - goal.currentProgress;
        if (!Number.isSafeInteger(remaining) || remaining <= 0) {
          throw new RangeError('Learning information收藏武器目标缺少正向剩余距离。');
        }
        const milestone = goal.targetProgress === 120
          ? projectArenaV2WeaponCollectionResearchMilestoneV1({
            count: goal.currentProgress,
            target: goal.targetProgress,
            collected: weaponCollectionJourney.targetWeaponCollected,
          })
          : null;
        const nextMilestoneVisibleText = milestone?.nextStage === null
          || milestone === null
          ? ''
          : `；当前${milestone.stage}；距${milestone.nextStage}${
            milestone.minimumEffectiveMainResearchMatchCount
          }次`;
        const nextMilestoneAccessibilityText = milestone?.nextStage === null
          || milestone === null
          ? ''
          : ` 当前主研究阶段是${milestone.stage}；距离下一阶段${milestone.nextStage}理论至少还需${
            milestone.minimumEffectiveMainResearchMatchCount
          }局有效主研究。`;
        const ownershipVisibleText = weaponCollectionJourney.targetWeaponCollected
          ? '；已收藏'
          : `；距收藏${remaining}次`;
        const ownershipAccessibilityText = weaponCollectionJourney.targetWeaponCollected
          ? ' 这把武器已经加入收藏，目前继续补主研究证据。'
          : ` 这把武器距离加入收藏理论至少还需${remaining}局有效主研究。`;
        return Object.freeze({
          visibleText: `${nextMilestoneVisibleText}${ownershipVisibleText}；收藏${
            weaponCollectionJourney.collectedCount
          }/${weaponCollectionJourney.totalCount}`,
          accessibilityText: `${nextMilestoneAccessibilityText}${ownershipAccessibilityText} 完整武器目录已收藏${
            weaponCollectionJourney.collectedCount
          }/${weaponCollectionJourney.totalCount}把。`,
        });
      })()
      : Object.freeze({ visibleText: '', accessibilityText: '' });
    return Object.freeze({
      visibleText: `${defaultTarget}：${goal.actionLabel}（${goal.currentProgress}/${goal.targetProgress}）${
        collectionDistance.visibleText
      }`,
      accessibilityText: `${goal.question} 目标是${defaultTarget}。${goal.actionLabel}，进度${goal.currentProgress}/${goal.targetProgress}。${
        collectionDistance.accessibilityText
      }`,
    });
  }
  const weaponScope = goal.goalId === ARENA_V2_WEAPON_LEARNING_COMPLETE_GOAL_ID_V1;
  const visibleTarget = weaponScope ? '当前可用武器' : '当前开放学习内容';
  const accessibilityTarget = weaponScope ? '当前可用武器池' : '当前开放学习内容';
  return Object.freeze({
    visibleText: `${visibleTarget}：${goal.actionLabel}（${goal.currentProgress}/${goal.targetProgress}）`,
    accessibilityText: `${accessibilityTarget}已经完成，但完整武器目录尚未全部开放。${goal.actionLabel}，进度${
      goal.currentProgress
    }/${goal.targetProgress}。`,
  });
}

function resultGoalRouteHint(
  definition: ArenaV2LearningProfileDefinitionV1,
  routeFit: ArenaV2ResultNextGoalRouteFitV1,
  displayNames: ReadonlyMap<string, string>,
  mapLabels: ReadonlyMap<string, ArenaV2MapDisplayLabelsV1>,
): Readonly<{
  readonly visibleText: string;
  readonly accessibilityText: string;
}> {
  const goal = routeFit.nextGoal;
  if (routeFit.kind === 'settlement-pending') {
    return Object.freeze({
      visibleText: '结算后确认续练组合',
      accessibilityText: '等待本局结算完成后，再确认当前组合能否直接推进长期目标。',
    });
  }
  if (routeFit.kind === 'free-challenge') {
    const fullCatalogCompletion = goal.kind === 'catalog-complete'
      && goal.goalId === ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1;
    const activeLearningCompletion = goal.kind === 'catalog-complete'
      && goal.goalId === ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1;
    if (!fullCatalogCompletion && !activeLearningCompletion) {
      throw new RangeError('Learning information结果目标提示收到未注册自由挑战终态身份。');
    }
    return Object.freeze({
      visibleText: activeLearningCompletion
        ? '当前开放内容已完成：当前组合可继续'
        : '自由挑战：当前组合可继续',
      accessibilityText: activeLearningCompletion
        ? '当前开放学习内容已经闭合，但完整武器目录尚未全部开放；当前组合可继续自由挑战或刷新记录。'
        : '完整学习目录已经闭合，当前模式、武器和地图可继续自由挑战或刷新记录。',
    });
  }
  const visibleActions: string[] = [];
  const accessibleActions: string[] = [];
  const targetWeaponVisible = goal.weaponDefinitionId === null
    ? null
    : compactWeaponLabel(definition, goal.weaponDefinitionId, displayNames);
  const targetWeaponAccessible = goal.weaponDefinitionId === null
    ? null
    : weaponOrdinal(definition, goal.weaponDefinitionId, displayNames);
  if (routeFit.requiresModeChange && routeFit.recommendedModeDefinitionId !== null) {
    const label = modeLabel(definition, routeFit.recommendedModeDefinitionId);
    visibleActions.push(`切换到${label}`);
    accessibleActions.push(`切换到${label}`);
  }
  if (routeFit.requiresMapChange && goal.mapDefinitionId !== null) {
    const visibleMap = compactMapLabel(definition, goal.mapDefinitionId, mapLabels);
    const accessibleMap = mapOrdinal(definition, goal.mapDefinitionId, mapLabels);
    visibleActions.push(`改选${visibleMap}`);
    accessibleActions.push(`选择${accessibleMap}`);
  }
  if (targetWeaponVisible !== null && targetWeaponAccessible !== null) {
    if (routeFit.kind === 'conditional-survival-supply') {
      visibleActions.push(`等待${targetWeaponVisible}刷新后拾取`);
      accessibleActions.push(`等待${targetWeaponAccessible}在生存补给中实际刷新后再拾取`);
    } else if (routeFit.requiresWeaponChange) {
      visibleActions.push(`改选${targetWeaponVisible}`);
      accessibleActions.push(`选择${targetWeaponAccessible}`);
    }
  }
  if (routeFit.kind === 'conditional-survival-supply') {
    return Object.freeze({
      visibleText: `条件推进：${visibleActions.join('、')}`,
      accessibilityText:
        `该目标明确要求生存模式，需要${accessibleActions.join('，并')}。`
        + '生存仍然空手开局，补给不会保证目标武器在本局出现。',
    });
  }
  if (visibleActions.length === 0) {
    return Object.freeze({
      visibleText: '稳定推进：当前组合可继续',
      accessibilityText: '当前模式、武器和地图可以直接继续推进这个长期目标。',
    });
  }
  return Object.freeze({
    visibleText: `稳定推进：${visibleActions.join('、')}`,
    accessibilityText: `要稳定推进这个长期目标，需要${accessibleActions.join('，并')}。`,
  });
}

function progressLabels(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  value: ArenaV2LearningSettlementProjectionV1,
  displayNames: ReadonlyMap<string, string>,
  mapLabels: ReadonlyMap<string, ArenaV2MapDisplayLabelsV1>,
  collectionProgress: ArenaV2CollectionProgressSummaryFactsProjectionV1,
  compact = false,
): readonly string[] {
  return Object.freeze(value.progressKinds.map((kind) => {
    if (kind === 'challenge') {
      return challengeProgressText(
        definition,
        profile,
        value.challengeProgressDeltas,
        displayNames,
        mapLabels,
        collectionProgress.challengeJourney,
        compact,
      );
    }
    if (kind === 'weapon-collection-research'
      && value.researchedWeaponDefinitionId !== null) {
      return weaponResearchProgressText(
        definition,
        profile,
        value.researchedWeaponDefinitionId,
        value.sourceModeDefinitionId,
        displayNames,
        collectionProgress.weaponJourney,
        compact,
      );
    }
    if (kind === 'personal-best' && value.sourceModeDefinitionId !== null) {
      return personalBestProgressText(
        definition,
        profile,
        value.sourceModeDefinitionId,
      );
    }
    if (kind === 'mode-mastery') {
      return modeCompletionProgressText(
        definition,
        profile,
        value.modeCompletionDeltas,
        compact,
      );
    }
    if (kind === 'map-segment') {
      return mapRouteProgressText(
        definition,
        profile,
        value.mapSegmentEvidenceDeltas,
        value.mapRouteEvidenceDeltas,
        collectionProgress.maps,
        mapLabels,
        compact,
      );
    }
    if (kind === 'weapon-context') {
      return weaponContextProgressText(
        definition,
        profile,
        value.weaponContextEvidenceDeltas,
        displayNames,
        compact,
      );
    }
    return PROGRESS_KIND_LABELS[kind];
  }));
}

function modeCompletionProgressText(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  deltas: readonly ArenaV2ModeCompletionAppliedDeltaV1[],
  compact: boolean,
): string {
  if (deltas.length !== 1) {
    throw new RangeError('Learning information模式熟练进度必须携带唯一生效增量。');
  }
  const delta = deltas[0]!;
  const record = profile.modeRecords.find(({ modeDefinitionId }) => (
    modeDefinitionId === delta.modeDefinitionId
  ));
  if (record === undefined || record.completionCount < delta.completionCountDelta) {
    throw new RangeError('Learning information模式熟练增量与当前Mode Record不闭合。');
  }
  const target = definition.masteryRequirements.modeCompletionEvidence;
  const current = Math.min(record.completionCount, target);
  const overall = modeMasteryJourney(definition, profile);
  return compact
    ? `${modeLabel(definition, delta.modeDefinitionId)}·本局+${
      delta.completionCountDelta
    }·当前${current}/${target}·整体${overall.progress}/${overall.target}`
    : `${modeLabel(definition, delta.modeDefinitionId)}：本局增加${
      delta.completionCountDelta
    }次有效模式完成，当前${current}/${target}；三种模式整体熟练进度${
      overall.progress
    }/${overall.target}`;
}

function challengeProgressText(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  deltas: readonly ArenaV2ChallengeProgressAppliedDeltaV1[],
  displayNames: ReadonlyMap<string, string>,
  mapLabels: ReadonlyMap<string, ArenaV2MapDisplayLabelsV1>,
  journey: ArenaV2ChallengeCollectionJourneySummaryFactV1,
  compact: boolean,
): string {
  if (deltas.length === 0) {
    throw new RangeError('Learning information挑战进度缺少具体生效增量。');
  }
  const receipts = deltas.map((delta) => {
    const challenge = definition.challengeDefinitions.find((entry) => (
      entry.challengeDefinitionId === delta.challengeDefinitionId
    ));
    const record = profile.challenges.find((entry) => (
      entry.challengeDefinitionId === delta.challengeDefinitionId
    ));
    if (challenge === undefined || record === undefined || record.progress < delta.progressDelta) {
      throw new RangeError('Learning information挑战进度与当前Profile不闭合。');
    }
    const identity = challengeIdentityText(
      definition,
      delta.challengeDefinitionId,
      displayNames,
      mapLabels,
    );
    return compact
      ? `${identity}+${delta.progressDelta}·${record.progress}/${challenge.targetProgress}${
        record.progress === challenge.targetProgress ? '已完成' : ''
      }`
      : `${identity}：本局推进${delta.progressDelta}次，当前${record.progress}/${challenge.targetProgress}${
        record.progress === challenge.targetProgress ? '，已完成' : ''
      }`;
  }).join('、');
  return compact
    ? `${receipts}·整体完成${journey.completedChallengeCount}/${journey.challengeCount}`
      + `·总进度${journey.currentProgress}/${journey.targetProgress}`
    : `${receipts}；交叉挑战整体已完成${journey.completedChallengeCount}/${
      journey.challengeCount
    }项，累计进度${journey.currentProgress}/${journey.targetProgress}`;
}

function weaponContextProgressText(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  deltas: readonly ArenaV2WeaponContextEvidenceAppliedDeltaV1[],
  displayNames: ReadonlyMap<string, string>,
  compact: boolean,
): string {
  if (deltas.length === 0) {
    throw new RangeError('Learning information武器情境进度缺少具体生效增量。');
  }
  const labels = {
    ground: '地面',
    aerial: '空中',
    edge: '边缘',
    'duel-counterplay': '1v1反制',
    survival: '生存',
  } as const;
  const evidenceLabels = {
    ground: '有效反馈',
    aerial: '有效反馈',
    edge: '边缘后果',
    'duel-counterplay': '完整避开窗口',
    survival: '武器应用',
  } as const;
  const receipts = deltas.map((delta) => {
    const current = profile.weaponMastery.find((entry) => (
      entry.weaponDefinitionId === delta.weaponDefinitionId
    ))?.contexts.find((entry) => entry.context === delta.context)?.evidenceCount;
    if (current === undefined || current < delta.evidenceDelta) {
      throw new RangeError('Learning information武器情境进度与当前Profile不闭合。');
    }
    const target = definition.masteryRequirements.weaponContextEvidence[delta.context];
    if (compact) {
      return `${compactWeaponLabel(definition, delta.weaponDefinitionId, displayNames)}·${
        labels[delta.context]
      }${evidenceLabels[delta.context]}${delta.evidenceDelta}次·${current}/${target}${
        current === target ? '已理解' : ''
      }`;
    }
    return `${weaponOrdinal(definition, delta.weaponDefinitionId, displayNames)}·${
      labels[delta.context]
    }：本局完成${delta.evidenceDelta}次${evidenceLabels[delta.context]}，当前${
      current
    }/${target}${
      current === target ? '，已理解' : ''
    }`;
  }).join('、');
  const journey = weaponContextEvidenceJourney(definition, profile);
  const appliedEvidence = deltas.reduce((total, delta) => total + delta.evidenceDelta, 0);
  if (!Number.isSafeInteger(appliedEvidence)
    || appliedEvidence < 1
    || journey.progress < appliedEvidence
    || (journey.progress === journey.target
      && journey.completedEvidence !== journey.target)) {
    throw new RangeError('Learning information本局武器情境增量与全目录旅程不闭合。');
  }
  return compact
    ? `${receipts}·全部武器情境研究${journey.progress}/${journey.target}`
    : `${receipts}；全部武器情境研究进度${journey.progress}/${journey.target}`;
}

function mapRouteProgressText(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  deltas: readonly ArenaV2MapSegmentEvidenceAppliedDeltaV1[],
  routeDeltas: readonly ArenaV2MapRouteEvidenceDeltaV1[],
  mapProgressFacts: ArenaV2CollectionProgressSummaryFactsProjectionV1['maps'],
  mapLabels: ReadonlyMap<string, ArenaV2MapDisplayLabelsV1>,
  compact: boolean,
): string {
  if (deltas.length === 0) {
    throw new RangeError('Learning information路线进度缺少具体路段增量。');
  }
  const progress = deltas.map((delta) => {
    const map = definition.mapDefinitions.find(({ mapDefinitionId }) => (
      mapDefinitionId === delta.mapDefinitionId
    ));
    if (map === undefined) throw new RangeError('Learning information路线进度引用未知地图。');
    const current = profile.mapSegmentMastery.find((record) => (
      record.mapDefinitionId === delta.mapDefinitionId
      && record.segmentDefinitionId === delta.segmentDefinitionId
    ))?.completionEvidenceCount;
    if (current === undefined || current < delta.completionEvidenceDelta) {
      throw new RangeError('Learning information路段进度与当前Profile不闭合。');
    }
    const target = definition.masteryRequirements.mapSegmentCompletionEvidence;
    if (compact) {
      return `${compactMapLabel(definition, delta.mapDefinitionId, mapLabels)}·${
        compactMapSegmentLabel(
          definition,
          delta.mapDefinitionId,
          delta.segmentDefinitionId,
          mapLabels,
        )}落点/命中${delta.completionEvidenceDelta}次·${current}/${target}${
        current === target ? '已理解' : ''
      }`;
    }
    return `${mapOrdinal(definition, delta.mapDefinitionId, mapLabels)}·${mapSegmentOrdinal(
      definition,
      delta.mapDefinitionId,
      delta.segmentDefinitionId,
      mapLabels,
    )}：本局完成${
      delta.completionEvidenceDelta
    }次安全落点或有效命中，当前${current}/${target}${
      current === target ? '，已理解' : ''
    }`;
  }).join('、');
  const mapDefinitionIds = [...new Set(deltas.map(({ mapDefinitionId }) => (
    mapDefinitionId
  )))];
  if (routeDeltas.length !== mapDefinitionIds.length) {
    throw new RangeError('Learning information路线进度缺少整图生效增量。');
  }
  const routePositions = routeDeltas.map((delta, index) => {
    if (delta.mapDefinitionId !== mapDefinitionIds[index]) {
      throw new RangeError('Learning information整图路线增量与路段增量身份不闭合。');
    }
    const mapProgress = mapProgressFacts.find(({ mapDefinitionId }) => (
      mapDefinitionId === delta.mapDefinitionId
    ));
    if (mapProgress === undefined
      || mapProgress.routeResearch.evidenceCount < delta.completionEvidenceDelta) {
      throw new RangeError('Learning information整图路线累计位置与本局增量不闭合。');
    }
    return compact
      ? `${compactMapLabel(
        definition,
        delta.mapDefinitionId,
        mapLabels,
      )}·整图路线本局+${delta.completionEvidenceDelta}·累计${
        mapProgress.routeResearch.evidenceCount
      }/${mapProgress.routeResearch.evidenceTarget}·理解${
        mapProgress.completedSegmentCount
      }/${mapProgress.totalSegmentCount}段`
      : `${mapOrdinal(definition, delta.mapDefinitionId, mapLabels)}整张路线：本局累计增加${
        delta.completionEvidenceDelta
      }点有效路线证据，当前${mapProgress.routeResearch.evidenceCount}/${
        mapProgress.routeResearch.evidenceTarget
      }，已完整理解${mapProgress.completedSegmentCount}/${
        mapProgress.totalSegmentCount
      }个路段`;
  });
  const continuations = mapDefinitionIds.flatMap((mapDefinitionId) => {
    const map = definition.mapDefinitions.find((entry) => (
      entry.mapDefinitionId === mapDefinitionId
    ));
    if (map === undefined) {
      throw new RangeError('Learning information路线续练引用未知地图。');
    }
    const focus = resolveArenaV2MapRouteSegmentFocusV1({
      evidencePerSegmentTarget: definition.masteryRequirements.mapSegmentCompletionEvidence,
      segments: map.segmentDefinitionIds.map((segmentDefinitionId) => ({
        segmentDefinitionId,
        completionEvidenceCount: profile.mapSegmentMastery.find((entry) => (
          entry.mapDefinitionId === mapDefinitionId
          && entry.segmentDefinitionId === segmentDefinitionId
        ))?.completionEvidenceCount ?? 0,
      })),
    });
    return focus === null
      ? []
      : [compact
        ? `下一段：${compactMapSegmentLabel(
          definition,
          mapDefinitionId,
          focus.segmentDefinitionId,
          mapLabels,
        )}${focus.currentProgress}/${focus.targetProgress}`
        : `下一局优先练${mapOrdinal(definition, mapDefinitionId, mapLabels)}·${
          mapSegmentOrdinal(
            definition,
            mapDefinitionId,
            focus.segmentDefinitionId,
            mapLabels,
          )
        }${focus.currentProgress}/${focus.targetProgress}：${focus.practiceInstruction}`];
  });
  return [progress, ...routePositions, ...continuations].join('；');
}

function personalBestProgressText(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  modeDefinitionId: string,
): string {
  const mode = definition.modeDefinitions.find((entry) => (
    entry.modeDefinitionId === modeDefinitionId
  ));
  const record = profile.modeRecords.find((entry) => (
    entry.modeDefinitionId === modeDefinitionId
  ));
  if (mode === undefined || record === undefined || record.kind !== mode.kind
    || record.bestPerformanceTicks === null) {
    throw new RangeError('Learning information个人最佳与来源模式记录不闭合。');
  }
  const clock = elapsedClockText(record.bestPerformanceTicks);
  if (mode.kind === 'duel') return `新个人最佳·常规1v1最快胜利 ${clock}`;
  if (mode.kind === 'race') return `新个人最佳·竞速最快到达 ${clock}`;
  return `新个人最佳·生存最长坚持 ${clock}`;
}

function weaponResearchProgressText(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  weaponDefinitionId: string,
  sourceModeDefinitionId: string | null,
  displayNames: ReadonlyMap<string, string>,
  journey: ArenaV2CollectionProgressSummaryFactsProjectionV1['weaponJourney'],
  compact: boolean,
): string {
  const record = profile.weaponMastery.find((entry) => (
    entry.weaponDefinitionId === weaponDefinitionId
  ));
  if (record === undefined || record.useCount < 1) {
    throw new RangeError('Learning information主研究结算缺少本次递增后的武器记录。');
  }
  assertWeaponMainResearchJourney(definition, profile, journey);
  if (journey.currentMainResearch < record.useCount) {
    throw new RangeError('Learning information主研究本局增量与全武器旅程不闭合。');
  }
  const journeyCompact = `·全武器主研究${journey.currentMainResearch}/${
    journey.targetMainResearch
  }`;
  const journeyAccessible = `；全武器主研究进度${journey.currentMainResearch}/${
    journey.targetMainResearch
  }`;
  const collected = profile.collections.weaponDefinitionIds.includes(weaponDefinitionId);
  const contextLabels = {
    ground: '地面',
    aerial: '空中',
    edge: '边缘',
    'duel-counterplay': '1v1反制',
    survival: '生存',
  } as const;
  const sourceMode = definition.modeDefinitions.find(({ modeDefinitionId }) => (
    modeDefinitionId === sourceModeDefinitionId
  ));
  if (sourceMode === undefined) {
    throw new RangeError('Learning information主研究结算缺少来源模式身份。');
  }
  const sameModeContextFocus = resolveArenaV2WeaponContextLearningFocusForModeV1({
    profileDefinition: definition,
    profile,
    weaponDefinitionId,
    modeKind: sourceMode.kind,
  });
  const globalContextFocus = resolveArenaV2WeaponContextLearningFocusV1({
    profileDefinition: definition,
    profile,
    weaponDefinitionId,
  });
  const practiceContinuation = sameModeContextFocus !== null
    ? `${sourceMode.kind === 'survival' ? '下一局若再次捡到这把武器，' : '下一局'}优先练${
      contextLabels[sameModeContextFocus.context]
    }情境：${sameModeContextFocus.practiceInstruction}`
    : globalContextFocus === null
      ? '五种情境已全部理解'
      : `当前模式可练情境已完成；后续切换到${
        globalContextFocus.context === 'duel-counterplay' ? '常规1v1' : '生存'
      }练${contextLabels[globalContextFocus.context]}情境：${
        globalContextFocus.practiceInstruction
      }`;
  const target = definition.masteryRequirements.weaponCollectionUseEvidence;
  if (record.useCount > target) {
    throw new RangeError('Learning information主研究进度超过收藏目标。');
  }
  const remainingToCollection = target - record.useCount;
  const collectionJourneyCompact = `·收藏${
    profile.collections.weaponDefinitionIds.length
  }/${definition.weaponDefinitionIds.length}${
    collected ? '' : `·距收藏${remainingToCollection}次`
  }`;
  const collectionJourneyAccessible = `；完整武器目录已收藏${
    profile.collections.weaponDefinitionIds.length
  }/${definition.weaponDefinitionIds.length}把${
    collected
      ? '，这把武器已经加入收藏'
      : `；这把武器距离加入收藏理论至少还需${remainingToCollection}局有效主研究`
  }`;
  if (target !== 120) {
    const mainResearchComplete = record.useCount === target;
    if (compact) {
      return `${compactWeaponLabel(definition, weaponDefinitionId, displayNames)}`
        + `·主研究1次·${record.useCount}/${target}${collected ? '·已收藏' : ''}`
        + `${mainResearchComplete ? '·主研究完成' : ''}`
        + journeyCompact
        + collectionJourneyCompact;
    }
    return `${weaponOrdinal(definition, weaponDefinitionId, displayNames)}`
      + `：本局完成1次有效主研究，当前${record.useCount}/${target}；${
        collected ? '已收藏；' : ''
      }${
        mainResearchComplete ? '主研究已完成' : practiceContinuation
      }${journeyAccessible}${collectionJourneyAccessible}`;
  }
  const milestone = projectArenaV2WeaponCollectionResearchMilestoneV1({
    count: record.useCount,
    target,
    collected,
  });
  const continuation = milestone.nextStage === null
    ? `${milestone.collected ? '已收藏，' : ''}主研究已完成`
    : `${milestone.collected ? '已收藏；' : ''}下一阶段${milestone.nextStage}（${
      milestone.nextThreshold
    }/120），至少还需${
      milestone.minimumEffectiveMainResearchMatchCount
    }局有效主研究；${practiceContinuation}`;
  if (compact) {
    return `${compactWeaponLabel(definition, weaponDefinitionId, displayNames)}`
      + `·主研究1次·${record.useCount}/120${milestone.collected ? '·已收藏' : ''}${
        milestone.nextStage === null
          ? '·主研究完成'
          : `·距${milestone.nextStage}${milestone.minimumEffectiveMainResearchMatchCount}次`
      }${journeyCompact}${collectionJourneyCompact}`;
  }
  return `${weaponOrdinal(definition, weaponDefinitionId, displayNames)}`
    + `：本局完成1次有效主研究，当前${record.useCount}/120；${continuation}`
    + journeyAccessible
    + collectionJourneyAccessible;
}

function newlyCollectedLabels(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  value: ArenaV2LearningSettlementProjectionV1,
  displayNames: ReadonlyMap<string, string>,
  mapLabels: ReadonlyMap<string, ArenaV2MapDisplayLabelsV1>,
): readonly string[] {
  const ordered = orderArenaV2NewCollectionDefinitionIdsV1(
    definition,
    value.newlyCollectedWeaponDefinitionIds,
    value.newlyCollectedMapDefinitionIds,
  );
  return Object.freeze([
    ...ordered.weaponDefinitionIds.map(
      (id) => `${weaponOrdinal(definition, id, displayNames)}已加入收藏（武器${
        profile.collections.weaponDefinitionIds.length
      }/${definition.weaponDefinitionIds.length}）`,
    ),
    ...ordered.mapDefinitionIds.map(
      (mapDefinitionId) => `${mapOrdinal(
        definition,
        mapDefinitionId,
        mapLabels,
      )}已加入收藏（地图${
        profile.collections.mapDefinitionIds.length
      }/${definition.mapDefinitions.length}）`,
    ),
  ]);
}

/**
 * Restores player-facing Learning Definition order without changing the
 * reducer's deterministic ID-sorted settlement payload.
 */
export function orderArenaV2NewCollectionDefinitionIdsV1(
  definition: ArenaV2LearningProfileDefinitionV1,
  newlyCollectedWeaponDefinitionIds: readonly string[],
  newlyCollectedMapDefinitionIds: readonly string[],
): Readonly<{
  readonly weaponDefinitionIds: readonly string[];
  readonly mapDefinitionIds: readonly string[];
}> {
  const identitySet = (
    value: readonly string[],
    allowed: ReadonlySet<string>,
    name: string,
  ): ReadonlySet<string> => {
    if (!Array.isArray(value)) throw new TypeError(`${name}必须是数组。`);
    const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
    if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, 'value')
      || !Number.isSafeInteger(lengthDescriptor.value) || lengthDescriptor.value < 0) {
      throw new TypeError(`${name}.length必须是非负安全整数数据字段。`);
    }
    const length = lengthDescriptor.value as number;
    if (length > allowed.size) {
      throw new RangeError(`${name}数量超过当前Learning Definition。`);
    }
    const expectedKeys = new Set<PropertyKey>(['length']);
    const identities = new Set<string>();
    for (let index = 0; index < length; index += 1) {
      const key = String(index);
      expectedKeys.add(key);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
        throw new TypeError(`${name}[${index}]必须是稠密数据字段。`);
      }
      const identity = descriptor.value;
      if (typeof identity !== 'string' || !allowed.has(identity)) {
        throw new RangeError(`${name}[${index}]不是当前Learning Definition身份。`);
      }
      if (identities.has(identity)) {
        throw new RangeError(`${name}[${index}]重复。`);
      }
      identities.add(identity);
    }
    if (Reflect.ownKeys(value).some((key) => !expectedKeys.has(key))) {
      throw new TypeError(`${name}不得包含额外或Symbol字段。`);
    }
    return identities;
  };
  const weaponIdentities = identitySet(
    newlyCollectedWeaponDefinitionIds,
    new Set(definition.weaponDefinitionIds),
    'Arena V2本局新收藏武器身份',
  );
  if (weaponIdentities.size > 1) {
    throw new RangeError('Arena V2本局新收藏武器每局最多只能有一把。');
  }
  const mapIdentities = identitySet(
    newlyCollectedMapDefinitionIds,
    new Set(definition.mapDefinitions.map(
      ({ mapDefinitionId }) => mapDefinitionId,
    )),
    'Arena V2本局新收藏地图身份',
  );
  return Object.freeze({
    weaponDefinitionIds: Object.freeze(definition.weaponDefinitionIds.filter(
      (definitionId) => weaponIdentities.has(definitionId),
    )),
    mapDefinitionIds: Object.freeze(definition.mapDefinitions
      .map(({ mapDefinitionId }) => mapDefinitionId)
      .filter((mapDefinitionId) => mapIdentities.has(mapDefinitionId))),
  });
}

function noEffectiveProgressContinuationText(
  definition: ArenaV2LearningProfileDefinitionV1,
  value: ArenaV2LearningSettlementProjectionV1,
): string {
  const mode = definition.modeDefinitions.find(({ modeDefinitionId }) => (
    modeDefinitionId === value.sourceModeDefinitionId
  ));
  if (mode === undefined) {
    throw new RangeError('Learning information无有效进度提示缺少来源模式。');
  }
  if (mode.kind === 'duel') {
    return '下一局继续完成1v1；获胜还能刷新最快胜利';
  }
  if (mode.kind === 'race') {
    return '下一局继续推进路线并到达终点；完成后还能刷新最快到达';
  }
  return '下一局继续延长坚持时间；跨过下一压力阶段并刷新最长坚持';
}

function settlementProgressText(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  value: ArenaV2LearningSettlementProjectionV1,
  displayNames: ReadonlyMap<string, string>,
  mapLabels: ReadonlyMap<string, ArenaV2MapDisplayLabelsV1>,
  collectionProgress: ArenaV2CollectionProgressSummaryFactsProjectionV1,
): string {
  if (value.status === 'not-settled') return '等待权威赛果结算';
  if (value.status === 'duplicate') return '本局已处理，不重复累计';
  const newlyCollected = newlyCollectedLabels(
    definition,
    profile,
    value,
    displayNames,
    mapLabels,
  );
  const collectionPrefix = newlyCollected.length === 0
    ? ''
    : `收藏完成：${newlyCollected.join('、')}`;
  if (value.progressKinds.length === 0) {
    return collectionPrefix.length === 0
      ? `本局结果已记录，暂未形成新的学习进度；${
        noEffectiveProgressContinuationText(definition, value)
      }`
      : collectionPrefix;
  }
  const effective = value.progressKinds.filter((kind) => EFFECTIVE_PROGRESS_KINDS.has(kind));
  if (effective.length === 0) {
    return collectionPrefix.length === 0
      ? `本局结果已记录，暂未形成新的学习进度；${
        noEffectiveProgressContinuationText(definition, value)
      }`
      : collectionPrefix;
  }
  const labels = progressLabels(
    definition,
    profile,
    value,
    displayNames,
    mapLabels,
    collectionProgress,
    true,
  );
  const prioritized = Object.freeze([
    ...(effective.includes('weapon-collection-research')
      ? ['weapon-collection-research' as const]
      : []),
    ...(effective.includes('weapon-context') ? ['weapon-context' as const] : []),
    ...(effective.includes('mode-mastery') ? ['mode-mastery' as const] : []),
    ...(effective.includes('challenge') ? ['challenge' as const] : []),
    ...(effective.includes('personal-best') ? ['personal-best' as const] : []),
    ...(effective.includes('map-segment') ? ['map-segment' as const] : []),
    ...effective.filter((kind) => (
      kind !== 'weapon-collection-research'
      && kind !== 'weapon-context'
      && kind !== 'mode-mastery'
      && kind !== 'challenge'
      && kind !== 'personal-best'
      && kind !== 'map-segment'
    )),
  ]);
  const consumed = new Set<ArenaV2LearningProgressKindV1>();
  if (value.newlyCollectedWeaponDefinitionIds.length > 0) consumed.add('weapon-collected');
  if (value.newlyCollectedMapDefinitionIds.length > 0) consumed.add('map-collected');
  const visible: string[] = [];
  if (effective.includes('weapon-collection-research')
    && effective.includes('weapon-context')) {
    visible.push(`${labels[value.progressKinds.indexOf('weapon-collection-research')]}；${
      labels[value.progressKinds.indexOf('weapon-context')]
    }`);
    consumed.add('weapon-collection-research');
    consumed.add('weapon-context');
  }
  for (const kind of prioritized) {
    if (consumed.has(kind)) continue;
    visible.push(labels[value.progressKinds.indexOf(kind)]!);
    consumed.add(kind);
  }
  if (visible.length === 0) {
    return collectionPrefix.length === 0
      ? `本局结果已记录，暂未形成新的学习进度；${
        noEffectiveProgressContinuationText(definition, value)
      }`
      : collectionPrefix;
  }
  const progress = `完成：${visible.join('；')}`;
  return collectionPrefix.length === 0 ? progress : `${collectionPrefix}；${progress}`;
}

function learningGoalAttemptAdvanced(
  goal: ArenaV2NextLearningGoalV1,
  value: ArenaV2LearningSettlementProjectionV1,
): boolean {
  if (value.status !== 'committed') return false;
  if (goal.kind === 'collect-weapon') {
    return value.researchedWeaponDefinitionId === goal.weaponDefinitionId;
  }
  if (goal.kind === 'weapon-context') {
    return value.weaponContextEvidenceDeltas.some((delta) => (
      delta.weaponDefinitionId === goal.weaponDefinitionId
      && delta.context === goal.context
    ));
  }
  if (goal.kind === 'collect-map') {
    return goal.mapDefinitionId !== null
      && value.newlyCollectedMapDefinitionIds.includes(goal.mapDefinitionId);
  }
  if (goal.kind === 'map-segment') {
    return value.mapSegmentEvidenceDeltas.some((delta) => (
      delta.mapDefinitionId === goal.mapDefinitionId
      && delta.segmentDefinitionId === goal.segmentDefinitionId
    ));
  }
  if (goal.kind === 'mode-mastery') {
    return value.modeCompletionDeltas.some((delta) => (
      delta.modeDefinitionId === goal.modeDefinitionId
    ));
  }
  if (goal.kind === 'cross-challenge') {
    return value.challengeProgressDeltas.some((delta) => (
      delta.challengeDefinitionId === goal.challengeDefinitionId
    ));
  }
  if (goal.kind === 'record-improvement') {
    return value.sourceModeDefinitionId === goal.modeDefinitionId
      && value.progressKinds.includes('personal-best');
  }
  return false;
}

function isAttemptedGlobalScopeCompletionGoal(
  goal: ArenaV2NextLearningGoalV1,
): boolean {
  const fullCatalogComplete = goal.goalId === ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1;
  const activeLearningComplete = goal.goalId
    === ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1;
  if (goal.kind === 'catalog-complete') {
    if (!fullCatalogComplete && !activeLearningComplete) {
      throw new RangeError('Learning information本局目标回执收到未注册范围完成ID。');
    }
    return true;
  }
  if (fullCatalogComplete || activeLearningComplete) {
    throw new RangeError('Learning information本局目标回执收到kind/范围完成ID错配。');
  }
  return false;
}

function learningGoalAttemptReceipt(
  definition: ArenaV2LearningProfileDefinitionV1,
  goal: ArenaV2NextLearningGoalV1 | null,
  value: ArenaV2LearningSettlementProjectionV1,
  displayNames: ReadonlyMap<string, string>,
  mapLabels: ReadonlyMap<string, ArenaV2MapDisplayLabelsV1>,
): Readonly<{
  readonly visibleText: string;
  readonly accessibilityText: string;
}> | null {
  if (goal === null || value.status !== 'committed') return null;
  if (isAttemptedGlobalScopeCompletionGoal(goal)) return null;
  const target = goalTargetText(definition, goal, displayNames, mapLabels);
  const advanced = learningGoalAttemptAdvanced(goal, value);
  return advanced
    ? Object.freeze({
      visibleText: `本局目标：${target}·已推进`,
      accessibilityText: `本局开局冻结的目标是${target}；权威结算已经记录该目标对应的有效推进。`,
    })
    : Object.freeze({
      visibleText: `本局目标：${target}·未推进；再试：${goal.actionLabel}`,
      accessibilityText: `本局开局冻结的目标是${target}；权威结算没有记录该目标对应的有效推进，但这不推断具体失败原因。下一局可以再次尝试：${goal.actionLabel}。`,
    });
}

function progressText(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  value: ArenaV2LearningSettlementProjectionV1,
  displayNames: ReadonlyMap<string, string>,
  mapLabels: ReadonlyMap<string, ArenaV2MapDisplayLabelsV1>,
  collectionProgress: ArenaV2CollectionProgressSummaryFactsProjectionV1,
  attemptedGoal: ArenaV2NextLearningGoalV1 | null,
): string {
  const progress = settlementProgressText(
    definition,
    profile,
    value,
    displayNames,
    mapLabels,
    collectionProgress,
  );
  const receipt = learningGoalAttemptReceipt(
    definition,
    attemptedGoal,
    value,
    displayNames,
    mapLabels,
  );
  return receipt === null ? progress : `${progress}；${receipt.visibleText}`;
}

function progressAccessibilityText(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  value: ArenaV2LearningSettlementProjectionV1,
  displayNames: ReadonlyMap<string, string>,
  mapLabels: ReadonlyMap<string, ArenaV2MapDisplayLabelsV1>,
  collectionProgress: ArenaV2CollectionProgressSummaryFactsProjectionV1,
  attemptedGoal: ArenaV2NextLearningGoalV1 | null,
): string {
  const receipt = learningGoalAttemptReceipt(
    definition,
    attemptedGoal,
    value,
    displayNames,
    mapLabels,
  );
  if (value.status !== 'committed' || !value.effectiveLearningProgress) {
    const progress = settlementProgressText(
      definition,
      profile,
      value,
      displayNames,
      mapLabels,
      collectionProgress,
    );
    return receipt === null ? progress : `${progress} ${receipt.accessibilityText}`;
  }
  const newlyCollected = newlyCollectedLabels(
    definition,
    profile,
    value,
    displayNames,
    mapLabels,
  );
  const labels = progressLabels(
    definition,
    profile,
    value,
    displayNames,
    mapLabels,
    collectionProgress,
  ).filter((_label, index) => {
    const kind = value.progressKinds[index];
    if (kind === 'weapon-collected') {
      return value.newlyCollectedWeaponDefinitionIds.length === 0;
    }
    if (kind === 'map-collected') {
      return value.newlyCollectedMapDefinitionIds.length === 0;
    }
    return true;
  });
  const collectionText = newlyCollected.length === 0
    ? ''
    : `本局完成收藏：${newlyCollected.join('，')}。`;
  const progress = labels.length === 0
    ? collectionText
    : `${collectionText}本局进度：${labels.join('，')}。`;
  return receipt === null ? progress : `${progress} ${receipt.accessibilityText}`;
}

function collectionChangeText(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  value: ArenaV2LearningSettlementProjectionV1,
  displayNames: ReadonlyMap<string, string>,
  mapLabels: ReadonlyMap<string, ArenaV2MapDisplayLabelsV1>,
): string {
  if (value.status === 'not-settled') return '等待结算后更新收藏状态';
  if (value.status === 'duplicate') return '收藏状态已处理，不重复变化';
  const milestoneChanges: string[] = [];
  if (
    definition.masteryRequirements.weaponCollectionUseEvidence === 120
    && value.progressKinds.includes('weapon-collection-research')
    && value.researchedWeaponDefinitionId !== null
    && (
      !profile.collections.weaponDefinitionIds.includes(value.researchedWeaponDefinitionId)
      || value.newlyCollectedWeaponDefinitionIds.includes(value.researchedWeaponDefinitionId)
    )
  ) {
    const record = profile.weaponMastery.find(({ weaponDefinitionId }) => (
      weaponDefinitionId === value.researchedWeaponDefinitionId
    ));
    if (record === undefined || record.useCount < 1) {
      throw new RangeError('Learning information主研究结算缺少本次递增后的武器记录。');
    }
    const crossed = deriveArenaV2HighestCrossedWeaponCollectionResearchMilestoneV1({
      previousCount: record.useCount - 1,
      currentCount: record.useCount,
    });
    if (crossed !== null) {
      const stage = arenaV2WeaponCollectionResearchStageForThresholdV1(crossed);
      milestoneChanges.push(
        `${weaponOrdinal(definition, value.researchedWeaponDefinitionId, displayNames)}`
          + `主研究达到${crossed}/120，进入${stage}阶段；阶段只表示熟悉度，不提升战斗数值`,
      );
    }
  }
  for (const delta of value.mapRouteEvidenceDeltas) {
    const map = definition.mapDefinitions.find(({ mapDefinitionId }) => (
      mapDefinitionId === delta.mapDefinitionId
    ))!;
    const currentEvidenceCount = profile.mapSegmentMastery.reduce(
      (total, record) => total + (
        record.mapDefinitionId === delta.mapDefinitionId
          ? record.completionEvidenceCount
          : 0
      ),
      0,
    );
    const previousEvidenceCount = currentEvidenceCount - delta.completionEvidenceDelta;
    if (previousEvidenceCount < 0) {
      throw new RangeError('Learning information地图路线结算增量超过当前证据。');
    }
    const crossed = deriveArenaV2HighestCrossedMapRouteResearchMilestoneV1({
      previousEvidenceCount,
      currentEvidenceCount,
      segmentCount: map.segmentDefinitionIds.length,
      evidencePerSegmentTarget: definition.masteryRequirements.mapSegmentCompletionEvidence,
    });
    if (crossed !== null) {
      milestoneChanges.push(`${mapOrdinal(
        definition,
        delta.mapDefinitionId,
        mapLabels,
      )}路线研究达到${crossed}%`);
    }
  }
  const changes = newlyCollectedLabels(definition, profile, value, displayNames, mapLabels);
  const visibleChanges = [...milestoneChanges, ...changes];
  return visibleChanges.length === 0
    ? value.effectiveLearningProgress
      ? '本局进度已记录，收藏阶段未变化'
      : '本局结果已记录，收藏阶段未变化'
    : visibleChanges.join('；');
}

function selectedWeaponFields(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  weaponDefinitionId: string | null,
  displayNames: ReadonlyMap<string, string>,
  collectionProgress: ArenaV2CollectionProgressSummaryFactsProjectionV1,
): readonly ArenaV2LearningInformationFieldPatchV1[] {
  if (weaponDefinitionId === null) return Object.freeze([]);
  const record = profile.weaponMastery.find((entry) => (
    entry.weaponDefinitionId === weaponDefinitionId
  ));
  const completeContexts = record?.contexts.filter(({ completedAtRevision }) => (
    completedAtRevision !== null
  )).length ?? 0;
  const contextLabels = {
    ground: '地面',
    aerial: '空中',
    edge: '边缘',
    'duel-counterplay': '1v1反制',
    survival: '生存',
  } as const;
  const contextEvidenceText = ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.map((context) => {
    const evidenceCount = record?.contexts.find((entry) => (
      entry.context === context
    ))?.evidenceCount ?? 0;
    const target = definition.masteryRequirements.weaponContextEvidence[context];
    return `${contextLabels[context]}${evidenceCount}/${target}${
      evidenceCount === target ? '已理解' : ''
    }`;
  }).join('、');
  const contextFocus = resolveArenaV2WeaponContextLearningFocusV1({
    profileDefinition: definition,
    profile,
    weaponDefinitionId,
  });
  const nextContextText = contextFocus === null
    ? '五种情境已全部理解'
    : `下一局优先练${contextLabels[contextFocus.context]}情境${
      contextFocus.currentProgress
    }/${contextFocus.targetProgress}：${contextFocus.practiceInstruction}`;
  const collected = profile.collections.weaponDefinitionIds.includes(weaponDefinitionId);
  const collectionEvidence = record?.useCount ?? 0;
  const collectionTarget = definition.masteryRequirements.weaponCollectionUseEvidence;
  const milestone = collectionTarget === 120
    ? projectArenaV2WeaponCollectionResearchMilestoneV1({
      count: collectionEvidence,
      target: collectionTarget,
      collected,
    })
    : null;
  const milestoneText = milestone === null
    ? `；主研究${collectionEvidence}/${collectionTarget}${
      collectionEvidence === collectionTarget ? '已完成' : ''
    }`
    : milestone.nextStage === null
      ? '；主研究阶段已完成'
      : `；当前主研究${milestone.stage}，下一阶段${
        milestone.nextStage
      }（${milestone.nextThreshold}/120），至少还需${
        milestone.minimumEffectiveMainResearchMatchCount
      }局有效主研究`;
  const weaponJourney = collectionProgress.weaponJourney;
  assertWeaponMainResearchJourney(definition, profile, weaponJourney);
  const contextJourney = weaponContextEvidenceJourney(definition, profile);
  const catalogJourneyText = `；全武器主研究${weaponJourney.currentMainResearch}/${
    weaponJourney.targetMainResearch
  }；全部武器情境研究${contextJourney.progress}/${contextJourney.target}`;
  return Object.freeze([
    field(
      'weapon-record',
      collected
        ? `已收藏${milestoneText}；${nextContextText}；完整理解${completeContexts}/${ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.length}种情境；${contextEvidenceText}${catalogJourneyText}`
        : `主研究${collectionEvidence}/${collectionTarget}${milestoneText}；${nextContextText}；已理解${completeContexts}/${ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.length}种情境；${contextEvidenceText}${catalogJourneyText}`,
      `${weaponOrdinal(definition, weaponDefinitionId, displayNames)}，${collected ? '已收藏' : '未收藏'}，主研究${
        collectionEvidence
      }/${collectionTarget}${milestoneText.replace('；', '，')}，完整理解${completeContexts}/${
        ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.length
      }种情境；${nextContextText}；${contextEvidenceText}；全武器主研究进度${
        weaponJourney.currentMainResearch
      }/${weaponJourney.targetMainResearch}；全部武器情境研究进度${
        contextJourney.progress
      }/${contextJourney.target}。`,
      true,
    ),
  ]);
}

function selectedMapFields(
  definition: ArenaV2LearningProfileDefinitionV1,
  profile: ArenaV2LearningProfileV1,
  mapDefinitionId: string | null,
  mapLabels: ReadonlyMap<string, ArenaV2MapDisplayLabelsV1>,
  collectionProgress: ArenaV2CollectionProgressSummaryFactsProjectionV1,
): readonly ArenaV2LearningInformationFieldPatchV1[] {
  if (mapDefinitionId === null) return Object.freeze([]);
  const map = definition.mapDefinitions.find((entry) => (
    entry.mapDefinitionId === mapDefinitionId
  ))!;
  const records = profile.mapSegmentMastery.filter((entry) => (
    entry.mapDefinitionId === mapDefinitionId
  ));
  const race = records.flatMap(({ bestRaceFinishTicks }) => (
    bestRaceFinishTicks === null ? [] : [bestRaceFinishTicks]
  ));
  const survival = records.flatMap(({ bestSurvivalTicks }) => (
    bestSurvivalTicks === null ? [] : [bestSurvivalTicks]
  ));
  const raceText = race.length === 0
    ? '竞速暂无记录'
    : `竞速最佳${elapsedClockText(Math.min(...race))}`;
  const survivalText = survival.length === 0
    ? '生存暂无记录'
    : `生存最佳${elapsedClockText(Math.max(...survival))}`;
  const completeSegments = records.filter(({ completedAtRevision }) => (
    completedAtRevision !== null
  )).length;
  const routeResearch = projectArenaV2MapRouteResearchMilestoneV1({
    evidenceCount: records.reduce(
      (total, { completionEvidenceCount }) => total + completionEvidenceCount,
      0,
    ),
    completedSegmentCount: completeSegments,
    segmentCount: map.segmentDefinitionIds.length,
    evidencePerSegmentTarget: definition.masteryRequirements.mapSegmentCompletionEvidence,
  });
  const selectedMapProgress = collectionProgress.maps.find((entry) => (
    entry.mapDefinitionId === mapDefinitionId
  ));
  if (selectedMapProgress === undefined
    || selectedMapProgress.routeResearch.evidenceCount !== routeResearch.evidenceCount
    || selectedMapProgress.routeResearch.evidenceTarget !== routeResearch.evidenceTarget
    || selectedMapProgress.completedSegmentCount !== completeSegments
    || selectedMapProgress.totalSegmentCount !== map.segmentDefinitionIds.length) {
    throw new RangeError('Learning information地图详情与全目录路线事实不闭合。');
  }
  const nextRouteMilestone = routeResearch.nextMilestonePercentage === null
    ? '路线研究里程碑已完成'
    : `下一里程碑${routeResearch.nextMilestonePercentage}%，还需${
      routeResearch.remainingEvidenceCount
    }次有效路线练习`;
  const modeMastery = modeMasteryJourney(definition, profile);
  const allRouteResearchProgress = collectionProgress.maps.reduce((total, entry) => (
    total + entry.routeResearch.evidenceCount
  ), 0);
  const allRouteResearchTarget = collectionProgress.maps.reduce((total, entry) => (
    total + entry.routeResearch.evidenceTarget
  ), 0);
  const allCompletedSegments = collectionProgress.maps.reduce((total, entry) => (
    total + entry.completedSegmentCount
  ), 0);
  const allSegmentCount = collectionProgress.maps.reduce((total, entry) => (
    total + entry.totalSegmentCount
  ), 0);
  if (!Number.isSafeInteger(allRouteResearchProgress)
    || !Number.isSafeInteger(allRouteResearchTarget)
    || !Number.isSafeInteger(allCompletedSegments)
    || !Number.isSafeInteger(allSegmentCount)
    || allRouteResearchProgress > allRouteResearchTarget
    || allCompletedSegments > allSegmentCount) {
    throw new RangeError('Learning information地图详情全目录路线事实无效。');
  }
  const evidenceTarget = definition.masteryRequirements.mapSegmentCompletionEvidence;
  const labels = mapLabels.get(mapDefinitionId);
  const segmentEvidence = map.segmentDefinitionIds.map((segmentDefinitionId, index) => {
    const evidenceCount = records.find((entry) => (
      entry.segmentDefinitionId === segmentDefinitionId
    ))?.completionEvidenceCount ?? 0;
    const segmentName = labels?.segmentDisplayNames.get(segmentDefinitionId);
    const ordinal = `第${index + 1}段`;
    const identity = segmentName === undefined ? ordinal : `${segmentName}（${ordinal}）`;
    return Object.freeze({ segmentDefinitionId, identity, evidenceCount });
  });
  const nextSegmentFocus = resolveArenaV2MapRouteSegmentFocusV1({
    evidencePerSegmentTarget: evidenceTarget,
    segments: segmentEvidence.map(({ segmentDefinitionId, evidenceCount }) => ({
      segmentDefinitionId,
      completionEvidenceCount: evidenceCount,
    })),
  });
  const nextSegment = nextSegmentFocus === null
    ? null
    : segmentEvidence[nextSegmentFocus.ordinal - 1]!;
  const nextSegmentText = nextSegmentFocus === null || nextSegment === null
    ? `全部${map.segmentDefinitionIds.length}段已理解`
    : `下一路段${nextSegment.identity}${nextSegmentFocus.currentProgress}/${
      nextSegmentFocus.targetProgress
    }：${nextSegmentFocus.practiceInstruction}`;
  const segmentEvidenceAccessibility = segmentEvidence.map(({ identity, evidenceCount }) => (
    `${identity}${evidenceCount}/${evidenceTarget}${
      evidenceCount === evidenceTarget ? '已理解' : ''
    }`
  )).join('、');
  const mapName = mapOrdinal(definition, mapDefinitionId, mapLabels);
  return Object.freeze([
    field('best-record', `${raceText}；${survivalText}`, undefined, true),
    field(
      'mode-records',
      `路线研究${routeResearch.evidenceCount}/${routeResearch.evidenceTarget}·${
        routeResearch.stage
      }；${nextRouteMilestone}；路线理解${completeSegments}/${
        map.segmentDefinitionIds.length
      }；模式熟练${modeMastery.progress}/${modeMastery.target}；全部地图路线研究${
        allRouteResearchProgress
      }/${allRouteResearchTarget}；全部路线理解${allCompletedSegments}/${
        allSegmentCount
      }；${nextSegmentText}`,
      `${mapName}路线研究进度${routeResearch.evidenceCount}/${
        routeResearch.evidenceTarget
      }，当前阶段${routeResearch.stage}；${nextRouteMilestone}；已完整理解${
        completeSegments
      }/${map.segmentDefinitionIds.length}段路线；三种模式整体熟练进度${
        modeMastery.progress
      }/${modeMastery.target}；全部地图路线研究进度${allRouteResearchProgress}/${
        allRouteResearchTarget
      }，已完整理解${allCompletedSegments}/${allSegmentCount}段；各路段进度：${
        segmentEvidenceAccessibility
      }。`,
      true,
    ),
  ]);
}

/**
 * Produces only the P6-owned fields of the P5 information screens. Content
 * explanations such as range, timing, hazards and route instructions remain
 * owned by their P5 content projections and must be merged explicitly later.
 */
export function projectArenaV2LearningInformationV1(
  value: unknown,
): ArenaV2LearningInformationProjectionV1 {
  const options = learningInformationOptions(value);
  const definition = createArenaV2LearningProfileDefinitionV1(options.profileDefinition);
  const profile = createArenaV2LearningProfileV1(definition, options.profile);
  const attemptedGoal = attemptedLearningGoal(options.attemptedGoal, definition, profile);
  const displayNames = weaponDisplayNames(options.weaponDisplayNames, definition);
  const mapLabels = mapDisplayNames(options.mapDisplayNames, definition);
  const collectionProgress = projectArenaV2CollectionProgressSummaryFactsV1({
    profileDefinition: definition,
    profile,
    orderedDirectory: {
      weaponDefinitionIds: definition.weaponDefinitionIds,
      maps: definition.mapDefinitions.map(({ mapDefinitionId, segmentDefinitionIds }) => ({
        mapDefinitionId,
        segmentDefinitionIds,
      })),
    },
  });
  const selectedWeaponDefinitionId = optionalDefinitionId(
    options.selectedWeaponDefinitionId,
    new Set(definition.weaponDefinitionIds),
    'selectedWeaponDefinitionId',
  );
  const selectedMapDefinitionId = optionalDefinitionId(
    options.selectedMapDefinitionId,
    new Set(definition.mapDefinitions.map(({ mapDefinitionId }) => mapDefinitionId)),
    'selectedMapDefinitionId',
  );
  const settled = settlement(options.settlement, definition, profile);
  const resultGoalRouteFit = resolveArenaV2ResultNextGoalRouteFitV1({
    profileDefinition: definition,
    profile,
    eligibleWeaponDefinitionIds: options.eligibleWeaponDefinitionIds,
    selectedWeaponDefinitionId,
    selectedMapDefinitionId,
    sourceModeDefinitionId: settled.sourceModeDefinitionId,
  });
  const nextGoal = resultGoalRouteFit.nextGoal;
  const weaponGoal = resolveArenaV2WeaponLearningGoalV1({
    profileDefinition: definition,
    profile,
    ...(options.eligibleWeaponDefinitionIds === undefined
      ? {}
      : { eligibleWeaponDefinitionIds: options.eligibleWeaponDefinitionIds }),
  });
  const mapGoal = resolveArenaV2MapLearningGoalV1({
    profileDefinition: definition,
    profile,
  });
  assertLearningLaneGoalSource(weaponGoal, 'weapon');
  assertLearningLaneGoalSource(mapGoal, 'map');
  const collectedWeapons = profile.collections.weaponDefinitionIds.length;
  const understoodWeapons = completedWeaponCount(profile);
  const nextWeapon = weaponGoal.kind === 'collect-weapon'
    ? weaponGoal.weaponDefinitionId
    : resolveArenaV2UncollectedWeaponResearchFocusV1(
      definition,
      profile,
      options.eligibleWeaponDefinitionIds as readonly string[] | undefined,
    );
  if (weaponGoal.kind === 'collect-weapon' && nextWeapon === null) {
    throw new RangeError('Learning information武器主研究目标缺少武器身份。');
  }
  const nextWeaponEvidence = nextWeapon === null
    ? null
    : profile.weaponMastery.find(({ weaponDefinitionId }) => (
      weaponDefinitionId === nextWeapon
    ))?.useCount ?? 0;
  const nextWeaponMilestone = nextWeapon === null
    || definition.masteryRequirements.weaponCollectionUseEvidence !== 120
    ? null
    : projectArenaV2WeaponCollectionResearchMilestoneV1({
      count: nextWeaponEvidence!,
      target: definition.masteryRequirements.weaponCollectionUseEvidence,
      collected: profile.collections.weaponDefinitionIds.includes(nextWeapon),
    });
  const nextWeaponAlreadyCollected = nextWeapon !== null
    && profile.collections.weaponDefinitionIds.includes(nextWeapon);
  const eligibleWeaponIds = options.eligibleWeaponDefinitionIds === undefined
    ? definition.weaponDefinitionIds
    : options.eligibleWeaponDefinitionIds as readonly string[];
  const partialCatalogScope = eligibleWeaponIds.length < definition.weaponDefinitionIds.length;
  const collectedEligibleWeaponCount = eligibleWeaponIds.filter((weaponDefinitionId) => (
    profile.collections.weaponDefinitionIds.includes(weaponDefinitionId)
  )).length;
  const nextUnownedCompleteText = collectedWeapons < definition.weaponDefinitionIds.length
    ? `当前可用武器已收齐${collectedEligibleWeaponCount}/${eligibleWeaponIds.length}；完整目录${
      collectedWeapons
    }/${definition.weaponDefinitionIds.length}，后续开放后继续主研究`
    : understoodWeapons < definition.weaponDefinitionIds.length
      ? `${definition.weaponDefinitionIds.length}把武器已全部收藏；五情境理解${
        understoodWeapons
      }/${definition.weaponDefinitionIds.length}`
      : '武器目录与五情境理解已全部完成';
  const nextUnownedCompleteAccessibilityText = collectedWeapons
    < definition.weaponDefinitionIds.length
    ? `当前可用武器池已收藏${collectedEligibleWeaponCount}/${eligibleWeaponIds.length}把；完整目录已收藏${
      collectedWeapons
    }/${definition.weaponDefinitionIds.length}把。当前开放池收齐不等于完整目录完成，后续武器进入可用池后继续主研究。`
    : understoodWeapons < definition.weaponDefinitionIds.length
      ? `完整目录${definition.weaponDefinitionIds.length}把武器已经全部收藏，其中${
        understoodWeapons
      }/${definition.weaponDefinitionIds.length}把完成五种实战情境理解；继续补齐未完成情境。`
      : `完整目录${definition.weaponDefinitionIds.length}把武器已经全部收藏，并全部完成五种实战情境理解。`;
  const collectedMaps = profile.collections.mapDefinitionIds.length;
  const understoodSegments = completedMapSegmentCount(profile);
  const segmentCount = totalMapSegmentCount(definition);
  const mapRouteEvidenceCount = profile.mapSegmentMastery.reduce(
    (total, { completionEvidenceCount }) => total + completionEvidenceCount,
    0,
  );
  const mapRouteEvidenceTarget = segmentCount
    * definition.masteryRequirements.mapSegmentCompletionEvidence;
  if (!Number.isSafeInteger(mapRouteEvidenceTarget)) {
    throw new RangeError('Learning information地图路线研究总目标超过安全整数范围。');
  }
  const modeMastery = modeMasteryJourney(definition, profile);
  const survivalRecord = profile.modeRecords.find(({ kind }) => kind === 'survival');
  const bestSurvivalRecord = survivalRecord?.bestPerformanceTicks === null
    || survivalRecord?.bestPerformanceTicks === undefined
    ? '尚无生存记录'
    : `最佳坚持${elapsedClockText(survivalRecord.bestPerformanceTicks)}`;
  const homeNextGoalCopy = scopedGoalCopy(
    definition,
    nextGoal,
    displayNames,
    mapLabels,
    partialCatalogScope,
    Object.freeze({
      collectedCount: collectedWeapons,
      totalCount: definition.weaponDefinitionIds.length,
      targetWeaponCollected: nextGoal.weaponDefinitionId !== null
        && profile.collections.weaponDefinitionIds.includes(nextGoal.weaponDefinitionId),
    }),
  );
  const resultNextGoalCopy = scopedGoalCopy(
    definition,
    nextGoal,
    displayNames,
    mapLabels,
    partialCatalogScope,
  );
  const weaponGoalCopy = scopedGoalCopy(
    definition,
    weaponGoal,
    displayNames,
    mapLabels,
    partialCatalogScope,
  );
  const mapGoalCopy = scopedGoalCopy(
    definition,
    mapGoal,
    displayNames,
    mapLabels,
    partialCatalogScope,
  );
  const resultGoalHint = resultGoalRouteHint(
    definition,
    resultGoalRouteFit,
    displayNames,
    mapLabels,
  );
  const recordSummary = homeRecordSummary(definition, profile, collectionProgress);
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    profileRevision: profile.revision,
    selectedWeaponDefinitionId,
    selectedMapDefinitionId,
    nextGoal,
    weaponGoal,
    mapGoal,
    homeRecordSummary: recordSummary,
    screens: Object.freeze([
      screen('home', [field(
        'next-goal',
        homeNextGoalCopy.visibleText,
        homeNextGoalCopy.accessibilityText,
        true,
      )]),
      screen('survival-prep', [
        field('best-survival-record', bestSurvivalRecord, undefined, true),
      ]),
      screen('weapon-index', [
        field(
          'owned-progress',
          `收藏${collectedWeapons}/${definition.weaponDefinitionIds.length}；主研究${
            collectionProgress.weaponJourney.currentMainResearch
          }/${collectionProgress.weaponJourney.targetMainResearch}；至少还需${
            collectionProgress.weaponJourney.minimumRemainingEffectiveMatchCount
          }局；阶段不加战力`,
          `已收藏${collectedWeapons}/${definition.weaponDefinitionIds.length}把武器，其中完整理解${understoodWeapons}把。全武器主研究进度${
            collectionProgress.weaponJourney.currentMainResearch
          }/${collectionProgress.weaponJourney.targetMainResearch}，理论最少还需${
            collectionProgress.weaponJourney.minimumRemainingEffectiveMatchCount
          }局有效主研究；该局数不是完成承诺。收藏研究阶段只表示熟悉度，不会提升武器战斗数值。`,
          true,
        ),
        field(
          'next-unowned',
          nextWeapon === null
            ? nextUnownedCompleteText
            : nextWeaponMilestone === null
              ? `${weaponOrdinal(definition, nextWeapon, displayNames)}·${
                nextWeaponAlreadyCollected ? '已收藏·' : ''
              }主研究${
                nextWeaponEvidence
              }/${definition.masteryRequirements.weaponCollectionUseEvidence}`
              : `${weaponOrdinal(definition, nextWeapon, displayNames)}·${
                nextWeaponMilestone.collected ? '已收藏·' : ''
              }${
                nextWeaponMilestone.stage
              }·主研究${nextWeaponMilestone.count}/${nextWeaponMilestone.target}`
                + `·距${nextWeaponMilestone.nextStage}至少${
                  nextWeaponMilestone.minimumEffectiveMainResearchMatchCount
                }局有效主研究`,
          nextWeapon === null
            ? nextUnownedCompleteAccessibilityText
            : `${weaponOrdinal(definition, nextWeapon, displayNames)}是当前武器主研究目标；${
              nextWeaponAlreadyCollected ? '已经拥有，但主研究证据仍未完成' : '尚未收藏'
            }。当前主研究${nextWeaponEvidence}/${
              definition.masteryRequirements.weaponCollectionUseEvidence
            }。`,
          true,
        ),
        field(
          'practice-target',
          weaponGoalCopy.visibleText,
          weaponGoalCopy.accessibilityText,
          true,
        ),
        field(
          'all-weapon-records',
          `${profile.weaponMastery.length}把武器产生研究记录；${understoodWeapons}把完成五情境理解`,
          undefined,
          true,
        ),
      ]),
      screen('weapon-detail', selectedWeaponFields(
        definition,
        profile,
        selectedWeaponDefinitionId,
        displayNames,
        collectionProgress,
      )),
      screen('map-index', [
        field(
          'segment-progress',
          `地图收藏${collectedMaps}/${definition.mapDefinitions.length}；路线研究${
            mapRouteEvidenceCount
          }/${mapRouteEvidenceTarget}；路线理解${understoodSegments}/${segmentCount}`,
          undefined,
          true,
        ),
        field(
          'next-map',
          mapGoalCopy.visibleText,
          mapGoalCopy.accessibilityText,
          true,
        ),
        field(
          'mode-coverage',
          `模式熟练${modeMastery.progress}/${modeMastery.target}`,
          undefined,
          true,
        ),
        field(
          'all-map-records',
          `${profile.mapSegmentMastery.length}段产生记录；${understoodSegments}段完成理解`,
          undefined,
          true,
        ),
      ]),
      screen('map-detail', selectedMapFields(
        definition,
        profile,
        selectedMapDefinitionId,
        mapLabels,
        collectionProgress,
      )),
      screen('result-reward', [
        field(
          'earned-progress',
          progressText(
            definition,
            profile,
            settled,
            displayNames,
            mapLabels,
            collectionProgress,
            attemptedGoal,
          ),
          progressAccessibilityText(
            definition,
            profile,
            settled,
            displayNames,
            mapLabels,
            collectionProgress,
            attemptedGoal,
          ),
        ),
        field(
          'next-goal',
          `${resultNextGoalCopy.visibleText}；${
            resultGoalHint.visibleText
          }`,
          `${resultNextGoalCopy.accessibilityText} ${
            resultGoalHint.accessibilityText
          }`,
          true,
        ),
        field(
          'collection-change',
          collectionChangeText(definition, profile, settled, displayNames, mapLabels),
        ),
      ]),
    ]),
  });
}
