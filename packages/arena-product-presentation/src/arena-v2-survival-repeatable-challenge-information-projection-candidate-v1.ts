import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_GAMEPLAY_V2_TUNING,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_SURVIVAL_PRESSURE_POLICY_DEFINITION_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_PRESSURE_STAGE_INTERVAL_TICKS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import type {
  ArenaV2InformationFieldSourceV1,
} from './arena-v2-information-field-composition-v1.js';
import type {
  ArenaV2InformationFieldValueV1,
} from './arena-v2-information-screen-view-model-v1.js';

export interface ArenaV2SurvivalRepeatableChallengeInformationProjectionInputCandidateV1 {
  readonly schemaVersion: 1;
  readonly fieldSource: ArenaV2InformationFieldSourceV1;
  readonly bestSurvivalTicks: number | null;
}

const INPUT_KEYS = new Set(['schemaVersion', 'fieldSource', 'bestSurvivalTicks']);
const FIELD_SOURCE_KEYS = new Set(['ownerId', 'fieldValues']);
const FIELD_VALUE_KEYS = new Set([
  'fieldId', 'labelMessageId', 'valueText', 'accessibilityText', 'fixedWidthNumeric',
]);
const TARGET_FIELD_ID = 'best-survival-record';
const TARGET_LABEL_MESSAGE_ID = 'arena.v2.field.best-survival-record';
const TICK_RATE_HZ = ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz;
const PRESSURE_STAGE_INTERVAL_TICKS =
  ARENA_V2_SURVIVAL_PRESSURE_STAGE_INTERVAL_TICKS_CANDIDATE_V1;
const PRESSURE_STAGES =
  ARENA_V2_SURVIVAL_PRESSURE_POLICY_DEFINITION_CANDIDATE_V1.stages;

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

function fieldValue(value: unknown, index: number): ArenaV2InformationFieldValueV1 {
  const name = `Arena Survival重复挑战字段[${index}]`;
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
  const source = exactRecord(value, FIELD_SOURCE_KEYS, 'Arena Survival重复挑战字段Owner');
  if (source.ownerId !== 'p6-learning-profile') {
    throw new RangeError('Arena Survival重复挑战只能改写学习档案字段Owner。');
  }
  if (!Array.isArray(source.fieldValues)) {
    throw new TypeError('Arena Survival重复挑战fieldValues必须是数组。');
  }
  const fields = Object.freeze(source.fieldValues.map(fieldValue));
  if (new Set(fields.map(({ fieldId }) => fieldId)).size !== fields.length) {
    throw new RangeError('Arena Survival重复挑战字段ID不得重复。');
  }
  const targets = fields.filter(({ fieldId }) => fieldId === TARGET_FIELD_ID);
  if (targets.length !== 1
    || targets[0]!.labelMessageId !== TARGET_LABEL_MESSAGE_ID
    || targets[0]!.fixedWidthNumeric !== true) {
    throw new RangeError(
      'Arena Survival重复挑战必须精确复用一个best-survival-record数值字段。',
    );
  }
  return Object.freeze({ ownerId: source.ownerId, fieldValues: fields });
}

function assertPressureDirectory(): void {
  if (!Number.isSafeInteger(TICK_RATE_HZ) || TICK_RATE_HZ <= 0
    || !Number.isSafeInteger(PRESSURE_STAGE_INTERVAL_TICKS)
    || PRESSURE_STAGE_INTERVAL_TICKS <= 0
    || PRESSURE_STAGE_INTERVAL_TICKS % TICK_RATE_HZ !== 0
    || PRESSURE_STAGES.length !== 10) {
    throw new RangeError('Arena Survival重复挑战压力目录时间单位不闭合。');
  }
  PRESSURE_STAGES.forEach((stage, index) => {
    if (stage.stage !== index
      || stage.startActiveTick !== index * PRESSURE_STAGE_INTERVAL_TICKS) {
      throw new RangeError('Arena Survival重复挑战必须复用连续正式压力目录。');
    }
  });
}

function clockText(ticks: number): string {
  const safeTicks = assertIntegerAtLeast(ticks, 0, 'Arena Survival重复挑战tick');
  const totalSeconds = Math.floor(safeTicks / TICK_RATE_HZ);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function challengeCopy(bestSurvivalTicks: number | null): Readonly<{
  readonly valueText: string;
  readonly accessibilityText: string;
}> {
  assertPressureDirectory();
  if (bestSurvivalTicks !== null) {
    assertIntegerAtLeast(bestSurvivalTicks, 0, 'Arena Survival个人最佳tick');
  }
  const comparisonTick = bestSurvivalTicks ?? 0;
  const nextPressureStage = PRESSURE_STAGES.find(({ startActiveTick }) => (
    startActiveTick > comparisonTick
  ));
  const currentRecordText = bestSurvivalTicks === null
    ? '尚无生存记录'
    : `最佳${clockText(bestSurvivalTicks)}`;
  if (nextPressureStage !== undefined) {
    const targetText = clockText(nextPressureStage.startActiveTick);
    const playerFacingStage = nextPressureStage.stage + 1;
    return Object.freeze({
      valueText:
        `${currentRecordText} · 本局挑战${targetText} · 将进入压力第${playerFacingStage}档`,
      accessibilityText:
        `${currentRecordText}。本局可重复挑战目标是坚持到${targetText}，`
        + `届时将进入压力第${playerFacingStage}档。`,
    });
  }
  if (bestSurvivalTicks === null
    || bestSurvivalTicks > Number.MAX_SAFE_INTEGER - PRESSURE_STAGE_INTERVAL_TICKS) {
    throw new RangeError('Arena Survival重复挑战目标tick超出安全整数范围。');
  }
  const targetTicks = bestSurvivalTicks + PRESSURE_STAGE_INTERVAL_TICKS;
  const targetText = clockText(targetTicks);
  const intervalSeconds = PRESSURE_STAGE_INTERVAL_TICKS / TICK_RATE_HZ;
  return Object.freeze({
    valueText: `${currentRecordText} · 本局挑战${targetText} · 再坚持${intervalSeconds}秒`,
    accessibilityText:
      `${currentRecordText}。已进入最后压力档，本局可重复挑战目标是`
      + `在个人最佳上再坚持${intervalSeconds}秒，达到${targetText}。`,
  });
}

export function projectArenaV2SurvivalRepeatableChallengeInformationFieldSourceCandidateV1(
  value: ArenaV2SurvivalRepeatableChallengeInformationProjectionInputCandidateV1,
): ArenaV2InformationFieldSourceV1 {
  const source = exactRecord(value, INPUT_KEYS, 'Arena Survival重复挑战投影输入');
  if (source.schemaVersion !== 1) {
    throw new RangeError('Arena Survival重复挑战投影schemaVersion无效。');
  }
  if (source.bestSurvivalTicks !== null && !Number.isSafeInteger(source.bestSurvivalTicks)) {
    throw new RangeError('Arena Survival重复挑战bestSurvivalTicks必须是安全整数或null。');
  }
  const parsedFieldSource = fieldSource(source.fieldSource);
  const copy = challengeCopy(source.bestSurvivalTicks as number | null);
  return Object.freeze({
    ownerId: parsedFieldSource.ownerId,
    fieldValues: Object.freeze(parsedFieldSource.fieldValues.map((field) => (
      field.fieldId !== TARGET_FIELD_ID
        ? field
        : Object.freeze({ ...field, ...copy })
    ))),
  });
}

export const ARENA_V2_SURVIVAL_REPEATABLE_CHALLENGE_INFORMATION_PROJECTION_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    defaultSurfaceWired: false as const,
    targetScreenId: 'survival-prep' as const,
    targetOwnerId: 'p6-learning-profile' as const,
    targetFieldId: TARGET_FIELD_ID,
    fieldCountAdded: 0 as const,
    pageCountAdded: 0 as const,
    actionCountAdded: 0 as const,
    bestRecordSource: 'validated-learning-profile.mode-records.survival' as const,
    pressureDirectorySource: 'formal-survival-pressure-policy-definition' as const,
    pressureStageCount: PRESSURE_STAGES.length,
    stageIntervalTicks: PRESSURE_STAGE_INTERVAL_TICKS,
    tickRateHz: TICK_RATE_HZ,
    writesAuthorityProfileRewardOrTask: false as const,
    usesWallClockTimerOrAsyncOwner: false as const,
  });
