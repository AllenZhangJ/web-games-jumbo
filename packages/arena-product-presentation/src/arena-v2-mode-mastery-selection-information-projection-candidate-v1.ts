import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1,
  ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1,
  type ArenaV2HomeRecordSummaryReadV1,
  type ArenaV2NextLearningGoalV1,
  type ArenaV2NextLearningGoalKindV1,
} from '@number-strategy-jump/arena-product-progression';
import { ARENA_GAMEPLAY_V2_TUNING } from '@number-strategy-jump/arena-definitions';
import type {
  ArenaV2InformationFieldSourceV1,
} from './arena-v2-information-field-composition-v1.js';
import type {
  ArenaV2InformationFieldValueV1,
} from './arena-v2-information-screen-view-model-v1.js';
import type {
  ArenaV2ProductSessionInformationModeKindCandidateV1,
} from './arena-v2-product-session-information-projection-candidate-v1.js';

export interface ArenaV2ModeMasterySelectionInformationProjectionInputCandidateV1 {
  readonly schemaVersion: 1;
  readonly fieldSource: ArenaV2InformationFieldSourceV1;
  readonly selectedModeKind: ArenaV2ProductSessionInformationModeKindCandidateV1;
  readonly nextGoal: ArenaV2NextLearningGoalV1;
  readonly summary: ArenaV2HomeRecordSummaryReadV1;
}

const INPUT_KEYS = new Set([
  'schemaVersion', 'fieldSource', 'selectedModeKind', 'nextGoal', 'summary',
]);
const NEXT_GOAL_KEYS = new Set([
  'schemaVersion', 'profileRevision', 'kind', 'goalId', 'question', 'actionLabel',
  'currentProgress', 'targetProgress', 'weaponDefinitionId', 'mapDefinitionId',
  'segmentDefinitionId', 'modeDefinitionId', 'challengeDefinitionId', 'context',
  'effectiveLearningRequired',
]);
const FIELD_SOURCE_KEYS = new Set(['ownerId', 'fieldValues']);
const FIELD_VALUE_KEYS = new Set([
  'fieldId', 'labelMessageId', 'valueText', 'accessibilityText', 'fixedWidthNumeric',
]);
const SUMMARY_KEYS = new Set([
  'schemaVersion', 'modeRecords', 'modeMasteryProgress', 'modeMasteryTarget',
  'collectedWeaponCount', 'weaponCount',
  'weaponMainResearchProgress', 'weaponMainResearchTarget',
  'completedWeaponContextCount', 'weaponContextCount',
  'weaponContextEvidenceProgress', 'weaponContextEvidenceTarget',
  'completedWeaponContextEvidence',
  'collectedMapCount', 'mapCount', 'completedMapSegmentCount', 'mapSegmentCount',
  'mapRouteResearchProgress', 'mapRouteResearchTarget',
  'completedChallengeCount', 'challengeCount', 'challengeProgress',
  'challengeProgressTarget', 'compactText', 'accessibilityText',
]);
const MODE_RECORD_KEYS = new Set([
  'kind', 'modeDefinitionId', 'playCount', 'completionCount', 'winCount',
  'bestPerformanceTicks', 'compactText', 'accessibilityText',
]);
const MODE_ORDER = Object.freeze(['duel', 'race', 'survival'] as const);
const NEXT_GOAL_KINDS = new Set<ArenaV2NextLearningGoalKindV1>([
  'collect-map', 'collect-weapon', 'weapon-context', 'map-segment',
  'mode-mastery', 'cross-challenge', 'record-improvement', 'catalog-complete',
]);
const MODE_LABELS = Object.freeze({
  duel: '常规1v1',
  race: '竞速',
  survival: '生存',
} as const);
const PERSONAL_RECORD_TARGET_LABELS = Object.freeze({
  duel: '1v1最快胜利',
  race: '竞速最快到达',
  survival: '生存最长坚持',
} as const);
const TICK_RATE_HZ = ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz;
const TARGET_FIELD_ID = 'record-type';
const TARGET_LABEL_MESSAGE_ID = 'arena.v2.field.record-type';

function exactRecord(value: unknown, keys: ReadonlySet<string>, name: string): PlainRecord {
  const source = cloneFrozenData(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  return source;
}

function modeKind(value: unknown): ArenaV2ProductSessionInformationModeKindCandidateV1 {
  if (value !== 'duel' && value !== 'race' && value !== 'survival') {
    throw new RangeError('Arena模式选择熟练摘要selectedModeKind无效。');
  }
  return value;
}

function nextGoalKind(value: unknown): ArenaV2NextLearningGoalKindV1 {
  if (!NEXT_GOAL_KINDS.has(value as ArenaV2NextLearningGoalKindV1)) {
    throw new RangeError('Arena模式选择熟练摘要nextGoalKind无效。');
  }
  return value as ArenaV2NextLearningGoalKindV1;
}

function nullableIdentity(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

function nextGoalFact(value: unknown): Readonly<{
  readonly kind: ArenaV2NextLearningGoalKindV1;
  readonly goalId: string;
  readonly actionLabel: string;
  readonly fullCatalogComplete: boolean;
  readonly activeLearningComplete: boolean;
}> {
  const source = exactRecord(value, NEXT_GOAL_KEYS, 'Arena模式选择熟练摘要nextGoal');
  if (source.schemaVersion !== 1) {
    throw new RangeError('Arena模式选择熟练摘要nextGoal.schemaVersion无效。');
  }
  assertIntegerAtLeast(
    source.profileRevision,
    0,
    'Arena模式选择熟练摘要nextGoal.profileRevision',
  );
  const kind = nextGoalKind(source.kind);
  const goalId = assertNonEmptyString(
    source.goalId,
    'Arena模式选择熟练摘要nextGoal.goalId',
  );
  assertNonEmptyString(source.question, 'Arena模式选择熟练摘要nextGoal.question');
  const actionLabel = assertNonEmptyString(
    source.actionLabel,
    'Arena模式选择熟练摘要nextGoal.actionLabel',
  );
  const currentProgress = assertIntegerAtLeast(
    source.currentProgress,
    0,
    'Arena模式选择熟练摘要nextGoal.currentProgress',
  );
  const targetProgress = assertIntegerAtLeast(
    source.targetProgress,
    0,
    'Arena模式选择熟练摘要nextGoal.targetProgress',
  );
  if (currentProgress > targetProgress) {
    throw new RangeError('Arena模式选择熟练摘要nextGoal进度不得超过目标。');
  }
  const targetIdentities = Object.freeze([
    nullableIdentity(
      source.weaponDefinitionId,
      'Arena模式选择熟练摘要nextGoal.weaponDefinitionId',
    ),
    nullableIdentity(
      source.mapDefinitionId,
      'Arena模式选择熟练摘要nextGoal.mapDefinitionId',
    ),
    nullableIdentity(
      source.segmentDefinitionId,
      'Arena模式选择熟练摘要nextGoal.segmentDefinitionId',
    ),
    nullableIdentity(
      source.modeDefinitionId,
      'Arena模式选择熟练摘要nextGoal.modeDefinitionId',
    ),
    nullableIdentity(
      source.challengeDefinitionId,
      'Arena模式选择熟练摘要nextGoal.challengeDefinitionId',
    ),
    nullableIdentity(source.context, 'Arena模式选择熟练摘要nextGoal.context'),
  ]);
  if (typeof source.effectiveLearningRequired !== 'boolean') {
    throw new TypeError('Arena模式选择熟练摘要nextGoal.effectiveLearningRequired必须是布尔值。');
  }
  const fullCatalogComplete = kind === 'catalog-complete'
    && goalId === ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1;
  const activeLearningComplete = kind === 'catalog-complete'
    && goalId === ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1;
  if (kind === 'catalog-complete'
    && ((!fullCatalogComplete && !activeLearningComplete)
      || currentProgress !== 1
      || targetProgress !== 1
      || source.effectiveLearningRequired
      || targetIdentities.some((identity) => identity !== null))) {
    throw new RangeError('Arena模式选择熟练摘要目录范围完成身份不闭合。');
  }
  if (kind !== 'catalog-complete'
    && (goalId === ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1
      || goalId === ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1)) {
    throw new RangeError('Arena模式选择熟练摘要非目录完成目标不得冒充完成身份。');
  }
  return Object.freeze({
    kind,
    goalId,
    actionLabel,
    fullCatalogComplete,
    activeLearningComplete,
  });
}

function elapsedClockText(ticks: number): string {
  const totalSeconds = Math.floor(ticks / TICK_RATE_HZ);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function fieldValue(value: unknown, index: number): ArenaV2InformationFieldValueV1 {
  const name = `Arena模式选择熟练摘要字段[${index}]`;
  const source = exactRecord(value, FIELD_VALUE_KEYS, name);
  if (typeof source.fixedWidthNumeric !== 'boolean') {
    throw new TypeError(`${name}.fixedWidthNumeric必须是布尔值。`);
  }
  return Object.freeze({
    fieldId: assertNonEmptyString(source.fieldId, `${name}.fieldId`),
    labelMessageId: assertNonEmptyString(source.labelMessageId, `${name}.labelMessageId`),
    valueText: assertNonEmptyString(source.valueText, `${name}.valueText`),
    accessibilityText: assertNonEmptyString(
      source.accessibilityText,
      `${name}.accessibilityText`,
    ),
    fixedWidthNumeric: source.fixedWidthNumeric,
  });
}

function modeContentFieldSource(value: unknown): ArenaV2InformationFieldSourceV1 {
  const source = exactRecord(value, FIELD_SOURCE_KEYS, 'Arena模式选择熟练摘要字段Owner');
  if (source.ownerId !== 'p5-mode-content') {
    throw new RangeError('Arena模式选择熟练摘要只能增强Mode Content字段Owner。');
  }
  if (!Array.isArray(source.fieldValues)) {
    throw new TypeError('Arena模式选择熟练摘要fieldValues必须是数组。');
  }
  const fields = Object.freeze(source.fieldValues.map(fieldValue));
  if (new Set(fields.map(({ fieldId }) => fieldId)).size !== fields.length) {
    throw new RangeError('Arena模式选择熟练摘要字段ID不得重复。');
  }
  const targets = fields.filter(({ fieldId }) => fieldId === TARGET_FIELD_ID);
  if (targets.length !== 1
    || targets[0]!.labelMessageId !== TARGET_LABEL_MESSAGE_ID
    || targets[0]!.fixedWidthNumeric) {
    throw new RangeError('Arena模式选择熟练摘要必须精确复用一个record-type字段。');
  }
  return Object.freeze({ ownerId: source.ownerId, fieldValues: fields });
}

function masteryPosition(
  value: unknown,
  selectedModeKind: ArenaV2ProductSessionInformationModeKindCandidateV1,
  includePersonalRecords: boolean,
): Readonly<{
  readonly currentModeProgress: number;
  readonly targetPerMode: number;
  readonly overallProgress: number;
  readonly overallTarget: number;
  readonly terminalPersonalRecords: readonly Readonly<{
    readonly kind: ArenaV2ProductSessionInformationModeKindCandidateV1;
    readonly bestPerformanceTicks: number;
  }>[] | null;
  readonly terminalReplayRecommendation: Readonly<{
    readonly kind: ArenaV2ProductSessionInformationModeKindCandidateV1;
    readonly playCount: number;
  }> | null;
}> {
  const source = exactRecord(value, SUMMARY_KEYS, 'Arena模式选择熟练摘要读取');
  if (source.schemaVersion !== 1) {
    throw new RangeError('Arena模式选择熟练摘要schemaVersion无效。');
  }
  if (!Array.isArray(source.modeRecords) || source.modeRecords.length !== MODE_ORDER.length) {
    throw new RangeError('Arena模式选择熟练摘要必须按固定顺序包含三种模式。');
  }
  const records = source.modeRecords.map((value, index) => {
    const name = `Arena模式选择熟练摘要模式[${index}]`;
    const record = exactRecord(value, MODE_RECORD_KEYS, name);
    const kind = MODE_ORDER[index]!;
    if (record.kind !== kind) throw new RangeError(`${name}.kind顺序无效。`);
    const playCount = assertIntegerAtLeast(record.playCount, 0, `${name}.playCount`);
    const completionCount = assertIntegerAtLeast(
      record.completionCount,
      0,
      `${name}.completionCount`,
    );
    if (completionCount > playCount) {
      throw new RangeError(`${name}.completionCount不得超过playCount。`);
    }
    const bestPerformanceTicks = record.bestPerformanceTicks === null
      ? null
      : assertIntegerAtLeast(
        record.bestPerformanceTicks,
        0,
        `${name}.bestPerformanceTicks`,
      );
    return Object.freeze({ kind, playCount, completionCount, bestPerformanceTicks });
  });
  const overallTarget = assertIntegerAtLeast(
    source.modeMasteryTarget,
    1,
    'Arena模式选择熟练摘要modeMasteryTarget',
  );
  if (overallTarget % MODE_ORDER.length !== 0) {
    throw new RangeError('Arena模式选择熟练摘要总目标必须由三种模式等分。');
  }
  const targetPerMode = overallTarget / MODE_ORDER.length;
  const overallProgress = assertIntegerAtLeast(
    source.modeMasteryProgress,
    0,
    'Arena模式选择熟练摘要modeMasteryProgress',
  );
  const expectedOverallProgress = records.reduce((total, record) => (
    total + Math.min(record.completionCount, targetPerMode)
  ), 0);
  if (overallProgress > overallTarget || overallProgress !== expectedOverallProgress) {
    throw new RangeError('Arena模式选择熟练累计进度与三模式记录不闭合。');
  }
  const terminalPersonalRecords = includePersonalRecords
    ? Object.freeze(records.map(({ kind, bestPerformanceTicks }) => {
      if (bestPerformanceTicks === null) {
        throw new RangeError('Arena目录完成目标要求三种模式都具备可刷新的个人记录。');
      }
      return Object.freeze({ kind, bestPerformanceTicks });
    }))
    : null;
  const leastPlayedMode = records.reduce((selected, candidate) => (
    candidate.playCount < selected.playCount ? candidate : selected
  ), records[0]!);
  const terminalReplayRecommendation = includePersonalRecords
    ? Object.freeze({ kind: leastPlayedMode.kind, playCount: leastPlayedMode.playCount })
    : null;
  const selected = records.find(({ kind }) => kind === selectedModeKind)!;
  return Object.freeze({
    currentModeProgress: Math.min(selected.completionCount, targetPerMode),
    targetPerMode,
    overallProgress,
    overallTarget,
    terminalPersonalRecords,
    terminalReplayRecommendation,
  });
}

export function projectArenaV2ModeMasterySelectionInformationFieldSourceCandidateV1(
  value: ArenaV2ModeMasterySelectionInformationProjectionInputCandidateV1,
): ArenaV2InformationFieldSourceV1 {
  const source = exactRecord(value, INPUT_KEYS, 'Arena模式选择熟练摘要投影输入');
  if (source.schemaVersion !== 1) {
    throw new RangeError('Arena模式选择熟练摘要投影schemaVersion无效。');
  }
  const selectedModeKind = modeKind(source.selectedModeKind);
  const resolvedNextGoal = nextGoalFact(source.nextGoal);
  const { fullCatalogComplete, activeLearningComplete } = resolvedNextGoal;
  const fields = modeContentFieldSource(source.fieldSource);
  const position = masteryPosition(
    source.summary,
    selectedModeKind,
    fullCatalogComplete,
  );
  const modeLabel = MODE_LABELS[selectedModeKind];
  const terminalValueText = fullCatalogComplete
    ? `；学习目录已完成·${resolvedNextGoal.actionLabel}`
    : activeLearningComplete
      ? `；当前开放内容已完成·${resolvedNextGoal.actionLabel}`
    : '';
  const terminalRecordValueText = position.terminalPersonalRecords === null
    ? ''
    : `；可刷新：${position.terminalPersonalRecords.map(({ kind, bestPerformanceTicks }) => (
      `${PERSONAL_RECORD_TARGET_LABELS[kind]}${elapsedClockText(bestPerformanceTicks)}`
    )).join('·')}`;
  const terminalRecordAccessibilityText = position.terminalPersonalRecords === null
    ? ''
    : ` 当前可刷新的三种个人记录为：${position.terminalPersonalRecords.map(({
      kind,
      bestPerformanceTicks,
    }) => `${PERSONAL_RECORD_TARGET_LABELS[kind]}${elapsedClockText(bestPerformanceTicks)}`
    ).join('；')}。`;
  const terminalReplayRecommendationValueText = position.terminalReplayRecommendation === null
    ? ''
    : `；本轮建议：${MODE_LABELS[position.terminalReplayRecommendation.kind]}·累计${
      position.terminalReplayRecommendation.playCount
    }局`;
  const terminalReplayRecommendationAccessibilityText =
    position.terminalReplayRecommendation === null
      ? ''
      : ` 为保持三种模式熟悉度，本轮建议优先游玩累计局数最少的${
        MODE_LABELS[position.terminalReplayRecommendation.kind]
      }；当前累计${position.terminalReplayRecommendation.playCount}局。`;
  const terminalAccessibilityText = fullCatalogComplete
    ? ` 唯一学习目标已经进入完整目录终态，现在可${resolvedNextGoal.actionLabel}。`
    : activeLearningComplete
      ? ` 唯一学习目标已经进入当前开放范围终态，但未声称完整20武器目录完成；现在可${
        resolvedNextGoal.actionLabel
      }。`
    : '';
  return Object.freeze({
    ownerId: fields.ownerId,
    fieldValues: Object.freeze(fields.fieldValues.map((field) => (
      field.fieldId !== TARGET_FIELD_ID
        ? field
        : Object.freeze({
          ...field,
          valueText: `${field.valueText}；${modeLabel}熟练${
            position.currentModeProgress
          }/${position.targetPerMode}·整体${position.overallProgress}/${
            position.overallTarget
          }${terminalRecordValueText}${terminalReplayRecommendationValueText}${terminalValueText}`,
          accessibilityText: `${field.accessibilityText} 当前${modeLabel}模式熟练进度${
            position.currentModeProgress
          }/${position.targetPerMode}；三种模式整体熟练进度${
            position.overallProgress
          }/${position.overallTarget}。超过单模式目标后的完成局数仍保留在模式记录中，但不扩大熟练目标。${
            terminalRecordAccessibilityText
          }${
            terminalReplayRecommendationAccessibilityText
          }${
            terminalAccessibilityText
          }`,
        })
    ))),
  });
}

export const ARENA_V2_MODE_MASTERY_SELECTION_INFORMATION_PROJECTION_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    targetScreenId: 'mode-select' as const,
    targetOwnerId: 'p5-mode-content' as const,
    targetFieldId: TARGET_FIELD_ID,
    source: 'validated-learning-profile-home-record-summary-and-next-goal' as const,
    terminalSource: 'validated-next-learning-goal-fact' as const,
    catalogCompleteFreeChallengeCopyWired: true as const,
    catalogCompletePersonalRecordTargetsWired: true as const,
    catalogCompleteLeastPlayedModeReplayRecommendationWired: true as const,
    replayRecommendationTieBreakOrder: MODE_ORDER,
    replayRecommendationAddsPersistedRotationState: false as const,
    activeLearningCompletionDoesNotClaimFullCatalogTerminal: true as const,
    terminalRecordOrderFromValidatedSummary: true as const,
    duplicatesNextGoalResolution: false as const,
    catalogCompletionAlgorithmCopied: false as const,
    reusesExistingField: true as const,
    infersOrAccumulatesProgress: false as const,
    fieldCountAdded: 0 as const,
    pageCountAdded: 0 as const,
    actionCountAdded: 0 as const,
    writesProfileAuthorityRewardOrTask: false as const,
  });
