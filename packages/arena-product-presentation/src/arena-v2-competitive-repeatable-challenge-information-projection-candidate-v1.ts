import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_GAMEPLAY_V2_TUNING } from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1,
  ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import type {
  ArenaV2InformationFieldSourceV1,
} from './arena-v2-information-field-composition-v1.js';
import type {
  ArenaV2InformationFieldValueV1,
} from './arena-v2-information-screen-view-model-v1.js';

export type ArenaV2CompetitiveRepeatableChallengeModeKindCandidateV1 = 'duel' | 'race';

export interface ArenaV2CompetitiveRepeatableChallengeInformationProjectionInputCandidateV1 {
  readonly schemaVersion: 1;
  readonly modeDefinitionId: string;
  readonly modeKind: ArenaV2CompetitiveRepeatableChallengeModeKindCandidateV1;
  readonly fieldSource: ArenaV2InformationFieldSourceV1;
  readonly bestPerformanceTicks: number | null;
}

const INPUT_KEYS = new Set([
  'schemaVersion', 'modeDefinitionId', 'modeKind', 'fieldSource', 'bestPerformanceTicks',
]);
const FIELD_SOURCE_KEYS = new Set(['ownerId', 'fieldValues']);
const FIELD_VALUE_KEYS = new Set([
  'fieldId', 'labelMessageId', 'valueText', 'accessibilityText', 'fixedWidthNumeric',
]);
const TARGET_FIELD_ID = 'mode-goal';
const TARGET_LABEL_MESSAGE_ID = 'arena.v2.field.mode-goal';
const TICK_RATE_HZ = ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz;
const PROFILE_MAX_COUNTER_VALUE =
  ARENA_V2_LEARNING_PROFILE_DEFINITION_CANDIDATE_V1.limits.maxCounterValue;

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): PlainRecord {
  const source = cloneFrozenData(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  return source;
}

function modeKind(value: unknown): ArenaV2CompetitiveRepeatableChallengeModeKindCandidateV1 {
  if (value !== 'duel' && value !== 'race') {
    throw new RangeError('Arena竞技重复挑战仅支持常规1v1或竞速。');
  }
  return value;
}

function fieldValue(value: unknown, index: number): ArenaV2InformationFieldValueV1 {
  const name = `Arena竞技重复挑战字段[${index}]`;
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

function fieldSource(value: unknown): ArenaV2InformationFieldSourceV1 {
  const source = exactRecord(value, FIELD_SOURCE_KEYS, 'Arena竞技重复挑战字段Owner');
  if (source.ownerId !== 'p5-mode-content') {
    throw new RangeError('Arena竞技重复挑战只能原位改写Mode Content字段Owner。');
  }
  if (!Array.isArray(source.fieldValues)) {
    throw new TypeError('Arena竞技重复挑战fieldValues必须是数组。');
  }
  const fields = Object.freeze(source.fieldValues.map(fieldValue));
  if (new Set(fields.map(({ fieldId }) => fieldId)).size !== fields.length) {
    throw new RangeError('Arena竞技重复挑战字段ID不得重复。');
  }
  const targets = fields.filter(({ fieldId }) => fieldId === TARGET_FIELD_ID);
  if (targets.length !== 1
    || targets[0]!.labelMessageId !== TARGET_LABEL_MESSAGE_ID
    || targets[0]!.fixedWidthNumeric !== false) {
    throw new RangeError('Arena竞技重复挑战必须精确复用一个mode-goal文本字段。');
  }
  return Object.freeze({ ownerId: source.ownerId, fieldValues: fields });
}

function clockText(ticks: number): string {
  const safeTicks = assertIntegerAtLeast(ticks, 0, 'Arena竞技重复挑战最佳成绩tick');
  if (!Number.isSafeInteger(TICK_RATE_HZ) || TICK_RATE_HZ <= 0) {
    throw new RangeError('Arena竞技重复挑战缺少正式tick频率。');
  }
  const totalSeconds = Math.floor(safeTicks / TICK_RATE_HZ);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function challengeCopy(
  kind: ArenaV2CompetitiveRepeatableChallengeModeKindCandidateV1,
  bestPerformanceTicks: number | null,
): Readonly<{ readonly valueText: string; readonly accessibilityText: string }> {
  if (bestPerformanceTicks === null) {
    return kind === 'duel'
      ? Object.freeze({
        valueText: '本局挑战：完成常规1v1并争取首胜',
        accessibilityText: '本局可重复挑战目标：完成常规1对1，把对手击落到场外并争取首次胜利。',
      })
      : Object.freeze({
        valueText: '本局挑战：沿完整路线到达终点',
        accessibilityText: '本局可重复挑战目标：沿完整路线前进并到达终点。',
      });
  }
  const bestText = clockText(bestPerformanceTicks);
  return kind === 'duel'
    ? Object.freeze({
      valueText: `最快胜利 ${bestText} · 本局挑战：争取刷新`,
      accessibilityText:
        `常规1对1个人最快胜利是${bestText}。本局可重复挑战目标：争取刷新最快胜利。`,
    })
    : Object.freeze({
      valueText: `最快到达 ${bestText} · 本局挑战：争取刷新`,
      accessibilityText:
        `竞速个人最快到达是${bestText}。本局可重复挑战目标：争取刷新最快到达。`,
    });
}

export function projectArenaV2CompetitiveRepeatableChallengeInformationFieldSourceCandidateV1(
  value: ArenaV2CompetitiveRepeatableChallengeInformationProjectionInputCandidateV1,
): ArenaV2InformationFieldSourceV1 {
  const source = exactRecord(value, INPUT_KEYS, 'Arena竞技重复挑战投影输入');
  if (source.schemaVersion !== 1) {
    throw new RangeError('Arena竞技重复挑战投影schemaVersion无效。');
  }
  const kind = modeKind(source.modeKind);
  const definitionId = assertNonEmptyString(
    source.modeDefinitionId,
    'Arena竞技重复挑战modeDefinitionId',
  );
  if (definitionId !== ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1[kind]) {
    throw new RangeError('Arena竞技重复挑战模式Definition身份漂移。');
  }
  const bestPerformanceTicks = source.bestPerformanceTicks === null
    ? null
    : assertIntegerAtLeast(
      source.bestPerformanceTicks,
      0,
      'Arena竞技重复挑战bestPerformanceTicks',
    );
  if (bestPerformanceTicks !== null && bestPerformanceTicks > PROFILE_MAX_COUNTER_VALUE) {
    throw new RangeError('Arena竞技重复挑战bestPerformanceTicks超出正式Profile计数上限。');
  }
  const parsedFieldSource = fieldSource(source.fieldSource);
  const copy = challengeCopy(kind, bestPerformanceTicks);
  return Object.freeze({
    ownerId: parsedFieldSource.ownerId,
    fieldValues: Object.freeze(parsedFieldSource.fieldValues.map((field) => (
      field.fieldId === TARGET_FIELD_ID
        ? Object.freeze({ ...field, ...copy })
        : field
    ))),
  });
}

export const ARENA_V2_COMPETITIVE_REPEATABLE_CHALLENGE_INFORMATION_PROJECTION_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    defaultSurfaceWired: false as const,
    targetScreenId: 'match-prep' as const,
    targetOwnerId: 'p5-mode-content' as const,
    targetFieldId: TARGET_FIELD_ID,
    supportedModeKinds: Object.freeze(['duel', 'race'] as const),
    improvementStepPolicy: 'no-formal-step-do-not-invent-exact-tick' as const,
    bestRecordSource: 'validated-learning-profile.mode-records.duel-or-race' as const,
    tickRateHz: TICK_RATE_HZ,
    fieldCountAdded: 0 as const,
    pageCountAdded: 0 as const,
    actionCountAdded: 0 as const,
    writesAuthorityProfileRewardOrTask: false as const,
    usesWallClockTimerOrAsyncOwner: false as const,
  });
