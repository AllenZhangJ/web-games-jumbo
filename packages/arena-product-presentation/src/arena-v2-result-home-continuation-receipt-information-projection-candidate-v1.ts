import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaV2InformationFieldSourceV1,
} from './arena-v2-information-field-composition-v1.js';
import type {
  ArenaV2InformationFieldValueV1,
} from './arena-v2-information-screen-view-model-v1.js';

export type ArenaV2ResultHomeContinuationReceiptKindCandidateV1 =
  | 'suggested-combination'
  | 'adjusted-combination';

export type ArenaV2ResultContinuationReceiptSourceCandidateV1 = 'home' | 'result';

export interface ArenaV2ResultHomeContinuationReceiptInformationInputCandidateV1 {
  readonly schemaVersion: 1;
  readonly fieldSource: ArenaV2InformationFieldSourceV1;
  readonly sourceKind: ArenaV2ResultContinuationReceiptSourceCandidateV1;
  readonly receiptKind: ArenaV2ResultHomeContinuationReceiptKindCandidateV1;
}

const INPUT_KEYS = new Set(['schemaVersion', 'fieldSource', 'sourceKind', 'receiptKind']);
const FIELD_SOURCE_KEYS = new Set(['ownerId', 'fieldValues']);
const FIELD_VALUE_KEYS = new Set([
  'fieldId', 'labelMessageId', 'valueText', 'accessibilityText', 'fixedWidthNumeric',
]);
const TARGET_FIELD_ID = 'earned-progress';
const TARGET_LABEL_MESSAGE_ID = 'arena.v2.field.earned-progress';

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

function receiptKind(
  value: unknown,
): ArenaV2ResultHomeContinuationReceiptKindCandidateV1 {
  if (value !== 'suggested-combination' && value !== 'adjusted-combination') {
    throw new RangeError('Arena首页续玩结果回执kind无效。');
  }
  return value;
}

function sourceKind(
  value: unknown,
): ArenaV2ResultContinuationReceiptSourceCandidateV1 {
  if (value !== 'home' && value !== 'result') {
    throw new RangeError('Arena目标续玩结果回执sourceKind无效。');
  }
  return value;
}

function fieldValue(value: unknown, index: number): ArenaV2InformationFieldValueV1 {
  const name = `Arena首页续玩结果回执字段[${index}]`;
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
  const source = exactRecord(value, FIELD_SOURCE_KEYS, 'Arena首页续玩结果回执字段Owner');
  if (source.ownerId !== 'p6-learning-profile') {
    throw new RangeError('Arena首页续玩结果回执只能原位改写Learning Profile字段Owner。');
  }
  if (!Array.isArray(source.fieldValues)) {
    throw new TypeError('Arena首页续玩结果回执fieldValues必须是数组。');
  }
  const fields = Object.freeze(source.fieldValues.map(fieldValue));
  if (new Set(fields.map(({ fieldId }) => fieldId)).size !== fields.length) {
    throw new RangeError('Arena首页续玩结果回执字段ID不得重复。');
  }
  const targets = fields.filter(({ fieldId }) => fieldId === TARGET_FIELD_ID);
  if (targets.length !== 1
    || targets[0]!.labelMessageId !== TARGET_LABEL_MESSAGE_ID
    || targets[0]!.fixedWidthNumeric !== false) {
    throw new RangeError('Arena首页续玩结果回执必须精确复用一个earned-progress字段。');
  }
  return Object.freeze({ ownerId: source.ownerId, fieldValues: fields });
}

export function projectArenaV2ResultHomeContinuationReceiptInformationFieldSourceCandidateV1(
  value: ArenaV2ResultHomeContinuationReceiptInformationInputCandidateV1,
): ArenaV2InformationFieldSourceV1 {
  const source = exactRecord(value, INPUT_KEYS, 'Arena首页续玩结果回执投影输入');
  if (source.schemaVersion !== 1) {
    throw new RangeError('Arena首页续玩结果回执schemaVersion无效。');
  }
  const fields = fieldSource(source.fieldSource);
  const origin = sourceKind(source.sourceKind);
  const kind = receiptKind(source.receiptKind);
  const originLabel = origin === 'home' ? '首页目标' : '上局目标';
  const originAccessibility = origin === 'home' ? '首页目标回执' : '上局结算目标回执';
  const valueSuffix = kind === 'suggested-combination'
    ? `${originLabel}：已按建议组合开局`
    : `${originLabel}：已按你的改选组合开局`;
  const accessibilitySuffix = kind === 'suggested-combination'
    ? `${originAccessibility}：本局已按建议组合开局；这只表示开局组合一致，不表示目标已经完成。`
    : `${originAccessibility}：本局已按你在模式页调整后的组合开局；这只表示采用了改选组合，不表示目标已经完成。`;
  return Object.freeze({
    ownerId: fields.ownerId,
    fieldValues: Object.freeze(fields.fieldValues.map((field) => (
      field.fieldId !== TARGET_FIELD_ID
        ? field
        : Object.freeze({
          ...field,
          valueText: `${field.valueText}；${valueSuffix}`,
          accessibilityText: `${field.accessibilityText} ${accessibilitySuffix}`,
        })
    ))),
  });
}

export const ARENA_V2_RESULT_HOME_CONTINUATION_RECEIPT_INFORMATION_PROJECTION_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    targetScreenId: 'result-reward' as const,
    targetOwnerId: 'p6-learning-profile' as const,
    targetFieldId: TARGET_FIELD_ID,
    source: 'validated-match-start-scene-only' as const,
    acceptedSources: Object.freeze(['home', 'result'] as const),
    sourceCopyNeverInferredFromGoalOrSelection: true as const,
    neverClaimsGoalCompletion: true as const,
    independentFromRetentionCollector: true as const,
    projectionFailureNeverBlocksMatch: true as const,
    fieldCountAdded: 0 as const,
    pageCountAdded: 0 as const,
    actionCountAdded: 0 as const,
    writesAuthorityProfileRewardOrTask: false as const,
  });
