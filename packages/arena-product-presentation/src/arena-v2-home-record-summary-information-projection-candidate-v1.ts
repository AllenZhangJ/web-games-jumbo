import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_GAMEPLAY_V2_TUNING } from '@number-strategy-jump/arena-definitions';
import type {
  ArenaV2HomeRecordSummaryReadV1,
} from '@number-strategy-jump/arena-product-progression';
import type {
  ArenaV2InformationFieldSourceV1,
} from './arena-v2-information-field-composition-v1.js';
import type {
  ArenaV2InformationFieldValueV1,
} from './arena-v2-information-screen-view-model-v1.js';

export interface ArenaV2HomeRecordSummaryInformationProjectionInputCandidateV1 {
  readonly schemaVersion: 1;
  readonly fieldSource: ArenaV2InformationFieldSourceV1;
  readonly summary: ArenaV2HomeRecordSummaryReadV1;
}

const INPUT_KEYS = new Set(['schemaVersion', 'fieldSource', 'summary']);
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
  'challengeProgressTarget',
  'compactText', 'accessibilityText',
]);
const MODE_RECORD_KEYS = new Set([
  'kind', 'modeDefinitionId', 'playCount', 'completionCount', 'winCount',
  'bestPerformanceTicks', 'compactText', 'accessibilityText',
]);
const TARGET_FIELD_ID = 'recent-records';
const TARGET_LABEL_MESSAGE_ID = 'arena.v2.field.recent-records';
const MODE_ORDER = Object.freeze(['duel', 'race', 'survival'] as const);
const MODE_LABELS = Object.freeze({ duel: '1v1', race: '竞速', survival: '生存' } as const);
const TICK_RATE_HZ = ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz;

function exactRecord(value: unknown, keys: ReadonlySet<string>, name: string): PlainRecord {
  const source = cloneFrozenData(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  return source;
}

function fieldValue(value: unknown, index: number): ArenaV2InformationFieldValueV1 {
  const name = `Arena首页记录总览字段[${index}]`;
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

function rewardFieldSource(value: unknown): ArenaV2InformationFieldSourceV1 {
  const source = exactRecord(value, FIELD_SOURCE_KEYS, 'Arena首页记录总览字段Owner');
  if (source.ownerId !== 'p6-reward-profile') {
    throw new RangeError('Arena首页记录总览只能增强Reward Profile字段Owner。');
  }
  if (!Array.isArray(source.fieldValues)) {
    throw new TypeError('Arena首页记录总览fieldValues必须是数组。');
  }
  const fields = Object.freeze(source.fieldValues.map(fieldValue));
  if (new Set(fields.map(({ fieldId }) => fieldId)).size !== fields.length) {
    throw new RangeError('Arena首页记录总览字段ID不得重复。');
  }
  const targets = fields.filter(({ fieldId }) => fieldId === TARGET_FIELD_ID);
  if (targets.length !== 1
    || targets[0]!.labelMessageId !== TARGET_LABEL_MESSAGE_ID
    || targets[0]!.fixedWidthNumeric !== true) {
    throw new RangeError('Arena首页记录总览必须精确复用一个recent-records数值字段。');
  }
  return Object.freeze({ ownerId: source.ownerId, fieldValues: fields });
}

function boundedCount(value: unknown, maximum: number | null, name: string): number {
  const result = assertIntegerAtLeast(value, 0, name);
  if (maximum !== null && result > maximum) {
    throw new RangeError(`${name}不得超过总量。`);
  }
  return result;
}

function elapsedClockText(ticks: number): string {
  const totalSeconds = Math.floor(ticks / TICK_RATE_HZ);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function summary(value: unknown): ArenaV2HomeRecordSummaryReadV1 {
  const source = exactRecord(value, SUMMARY_KEYS, 'Arena首页记录总览读取');
  if (source.schemaVersion !== 1) {
    throw new RangeError('Arena首页记录总览schemaVersion无效。');
  }
  if (!Array.isArray(source.modeRecords) || source.modeRecords.length !== MODE_ORDER.length) {
    throw new RangeError('Arena首页记录总览必须按固定顺序包含三种模式。');
  }
  const modeRecords = Object.freeze(source.modeRecords.map((value, index) => {
    const name = `Arena首页记录总览模式[${index}]`;
    const record = exactRecord(value, MODE_RECORD_KEYS, name);
    const kind = MODE_ORDER[index]!;
    if (record.kind !== kind) throw new RangeError(`${name}.kind顺序无效。`);
    const playCount = boundedCount(record.playCount, null, `${name}.playCount`);
    const completionCount = boundedCount(
      record.completionCount,
      playCount,
      `${name}.completionCount`,
    );
    const winCount = boundedCount(record.winCount, completionCount, `${name}.winCount`);
    const bestPerformanceTicks = record.bestPerformanceTicks === null
      ? null
      : boundedCount(record.bestPerformanceTicks, null, `${name}.bestPerformanceTicks`);
    const compactText = assertNonEmptyString(record.compactText, `${name}.compactText`);
    const expectedCompactText = `${MODE_LABELS[kind]} ${
      bestPerformanceTicks === null ? '--' : elapsedClockText(bestPerformanceTicks)
    }`;
    if (compactText !== expectedCompactText) {
      throw new RangeError(`${name}.compactText与个人最佳事实不一致。`);
    }
    return Object.freeze({
      kind,
      modeDefinitionId: assertNonEmptyString(
        record.modeDefinitionId,
        `${name}.modeDefinitionId`,
      ),
      playCount,
      completionCount,
      winCount,
      bestPerformanceTicks,
      compactText,
      accessibilityText: assertNonEmptyString(
        record.accessibilityText,
        `${name}.accessibilityText`,
      ),
    });
  }));
  const modeMasteryTarget = boundedCount(
    source.modeMasteryTarget,
    null,
    'Arena首页记录总览modeMasteryTarget',
  );
  const modeMasteryProgress = boundedCount(
    source.modeMasteryProgress,
    modeMasteryTarget,
    'Arena首页记录总览modeMasteryProgress',
  );
  if (modeMasteryTarget === 0
    || modeMasteryTarget % MODE_ORDER.length !== 0
    || modeMasteryProgress !== modeRecords.reduce((total, record) => (
      total + Math.min(record.completionCount, modeMasteryTarget / MODE_ORDER.length)
    ), 0)) {
    throw new RangeError('Arena首页记录总览模式熟练累计进度与三模式记录不闭合。');
  }
  const weaponCount = boundedCount(source.weaponCount, null, 'Arena首页记录总览weaponCount');
  const collectedWeaponCount = boundedCount(
    source.collectedWeaponCount,
    weaponCount,
    'Arena首页记录总览collectedWeaponCount',
  );
  const weaponMainResearchTarget = boundedCount(
    source.weaponMainResearchTarget,
    null,
    'Arena首页记录总览weaponMainResearchTarget',
  );
  const weaponMainResearchProgress = boundedCount(
    source.weaponMainResearchProgress,
    weaponMainResearchTarget,
    'Arena首页记录总览weaponMainResearchProgress',
  );
  if ((weaponCount === 0) !== (weaponMainResearchTarget === 0)
    || weaponMainResearchTarget % (weaponCount === 0 ? 1 : weaponCount) !== 0
    || (weaponMainResearchProgress === weaponMainResearchTarget
      && collectedWeaponCount !== weaponCount)) {
    throw new RangeError('Arena首页记录总览武器主研究累计进度与收藏事实不闭合。');
  }
  const weaponContextCount = boundedCount(
    source.weaponContextCount,
    null,
    'Arena首页记录总览weaponContextCount',
  );
  const completedWeaponContextCount = boundedCount(
    source.completedWeaponContextCount,
    weaponContextCount,
    'Arena首页记录总览completedWeaponContextCount',
  );
  if (weaponContextCount !== weaponCount * 5) {
    throw new RangeError('Arena首页记录总览武器情境总量必须与每把五情境闭合。');
  }
  const weaponContextEvidenceTarget = boundedCount(
    source.weaponContextEvidenceTarget,
    null,
    'Arena首页记录总览weaponContextEvidenceTarget',
  );
  const weaponContextEvidenceProgress = boundedCount(
    source.weaponContextEvidenceProgress,
    weaponContextEvidenceTarget,
    'Arena首页记录总览weaponContextEvidenceProgress',
  );
  const completedWeaponContextEvidence = boundedCount(
    source.completedWeaponContextEvidence,
    weaponContextEvidenceProgress,
    'Arena首页记录总览completedWeaponContextEvidence',
  );
  if ((weaponContextCount === 0) !== (weaponContextEvidenceTarget === 0)
    || completedWeaponContextEvidence < completedWeaponContextCount
    || (completedWeaponContextCount === 0) !== (completedWeaponContextEvidence === 0)
    || (completedWeaponContextEvidence === weaponContextEvidenceTarget)
      !== (completedWeaponContextCount === weaponContextCount)
    || (weaponContextEvidenceProgress === weaponContextEvidenceTarget)
      !== (completedWeaponContextCount === weaponContextCount)) {
    throw new RangeError('Arena首页记录总览武器情境研究累计进度与完成情境事实不闭合。');
  }
  const mapCount = boundedCount(source.mapCount, null, 'Arena首页记录总览mapCount');
  const collectedMapCount = boundedCount(
    source.collectedMapCount,
    mapCount,
    'Arena首页记录总览collectedMapCount',
  );
  const mapSegmentCount = boundedCount(
    source.mapSegmentCount,
    null,
    'Arena首页记录总览mapSegmentCount',
  );
  const completedMapSegmentCount = boundedCount(
    source.completedMapSegmentCount,
    mapSegmentCount,
    'Arena首页记录总览completedMapSegmentCount',
  );
  const mapRouteResearchTarget = boundedCount(
    source.mapRouteResearchTarget,
    null,
    'Arena首页记录总览mapRouteResearchTarget',
  );
  const mapRouteResearchProgress = boundedCount(
    source.mapRouteResearchProgress,
    mapRouteResearchTarget,
    'Arena首页记录总览mapRouteResearchProgress',
  );
  const mapSegmentEvidenceTarget = mapSegmentCount === 0
    ? 0
    : mapRouteResearchTarget / mapSegmentCount;
  if ((mapSegmentCount === 0) !== (mapRouteResearchTarget === 0)
    || !Number.isInteger(mapSegmentEvidenceTarget)
    || mapSegmentEvidenceTarget < (mapSegmentCount === 0 ? 0 : 1)
    || mapRouteResearchProgress < completedMapSegmentCount * mapSegmentEvidenceTarget
    || (mapRouteResearchProgress === mapRouteResearchTarget)
      !== (completedMapSegmentCount === mapSegmentCount)) {
    throw new RangeError('Arena首页记录总览路线研究累计进度与完整路段事实不闭合。');
  }
  const challengeCount = boundedCount(
    source.challengeCount,
    null,
    'Arena首页记录总览challengeCount',
  );
  const completedChallengeCount = boundedCount(
    source.completedChallengeCount,
    challengeCount,
    'Arena首页记录总览completedChallengeCount',
  );
  const challengeProgressTarget = boundedCount(
    source.challengeProgressTarget,
    null,
    'Arena首页记录总览challengeProgressTarget',
  );
  const challengeProgress = boundedCount(
    source.challengeProgress,
    challengeProgressTarget,
    'Arena首页记录总览challengeProgress',
  );
  if ((challengeCount === 0) !== (challengeProgressTarget === 0)) {
    throw new RangeError('Arena首页记录总览挑战数量与累计目标必须同时为空或同时存在。');
  }
  if (completedChallengeCount > challengeProgress
    || (challengeProgress === 0 && completedChallengeCount !== 0)
    || (challengeProgress === challengeProgressTarget)
      !== (completedChallengeCount === challengeCount)) {
    throw new RangeError('Arena首页记录总览挑战完成数与累计进度不闭合。');
  }
  const compactText = assertNonEmptyString(
    source.compactText,
    'Arena首页记录总览compactText',
  );
  const expectedCompact = `${modeRecords.map((record) => record.compactText).join('｜')}`
    + `；模式熟练${modeMasteryProgress}/${modeMasteryTarget}`
    + `·武器${collectedWeaponCount}/${weaponCount}`
    + `·主研究${weaponMainResearchProgress}/${weaponMainResearchTarget}`
    + `·情境${completedWeaponContextCount}/${weaponContextCount}`
    + `·情境研究${weaponContextEvidenceProgress}/${weaponContextEvidenceTarget}`
    + `·地图${collectedMapCount}/${mapCount}`
    + `·路线${completedMapSegmentCount}/${mapSegmentCount}`
    + `·路线研究${mapRouteResearchProgress}/${mapRouteResearchTarget}`
    + (challengeCount === 0
      ? ''
      : `·挑战${completedChallengeCount}/${challengeCount}`
        + `·挑战进度${challengeProgress}/${challengeProgressTarget}`);
  if (compactText !== expectedCompact) {
    throw new RangeError('Arena首页记录总览紧凑文案与读取事实不一致。');
  }
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
    completedMapSegmentCount,
    mapSegmentCount,
    mapRouteResearchProgress,
    mapRouteResearchTarget,
    completedChallengeCount,
    challengeCount,
    challengeProgress,
    challengeProgressTarget,
    compactText,
    accessibilityText: assertNonEmptyString(
      source.accessibilityText,
      'Arena首页记录总览accessibilityText',
    ),
  });
}

export function projectArenaV2HomeRecordSummaryInformationFieldSourceCandidateV1(
  value: ArenaV2HomeRecordSummaryInformationProjectionInputCandidateV1,
): ArenaV2InformationFieldSourceV1 {
  const source = exactRecord(value, INPUT_KEYS, 'Arena首页记录总览投影输入');
  if (source.schemaVersion !== 1) {
    throw new RangeError('Arena首页记录总览投影schemaVersion无效。');
  }
  const fields = rewardFieldSource(source.fieldSource);
  const recordSummary = summary(source.summary);
  return Object.freeze({
    ownerId: fields.ownerId,
    fieldValues: Object.freeze(fields.fieldValues.map((field) => (
      field.fieldId !== TARGET_FIELD_ID
        ? field
        : Object.freeze({
          ...field,
          valueText: `${field.valueText}；${recordSummary.compactText}`,
          accessibilityText: `${field.accessibilityText} ${recordSummary.accessibilityText}`,
        })
    ))),
  });
}

export const ARENA_V2_HOME_RECORD_SUMMARY_INFORMATION_PROJECTION_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    targetScreenId: 'home' as const,
    targetOwnerId: 'p6-reward-profile' as const,
    targetFieldId: TARGET_FIELD_ID,
    focusSource: 'existing-bottom-navigation-records-focus' as const,
    learningSource: 'validated-learning-profile-home-record-summary' as const,
    reusesOneExistingRecentRecordsField: true as const,
    infersOrAccumulatesProgress: false as const,
    compactAndAccessibilityFactsShareOneSummary: true as const,
    recordFieldCountAdded: 0 as const,
    pageCountAdded: 0 as const,
    actionCountAdded: 0 as const,
    writesProfileAuthorityRewardOrTask: false as const,
  });
