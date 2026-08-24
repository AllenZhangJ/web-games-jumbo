import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
  ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1,
  ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1,
  type ArenaV2FullCatalogReplayCombinationV1,
  type ArenaV2NextLearningGoalContinuationRouteV1,
} from '@number-strategy-jump/arena-product-progression';
import type {
  ArenaV2InformationFieldSourceV1,
} from './arena-v2-information-field-composition-v1.js';
import type {
  ArenaV2InformationFieldValueV1,
} from './arena-v2-information-screen-view-model-v1.js';
import {
  projectArenaV2MapRouteSkeletonReadV1,
  projectArenaV2WeaponCoreFightReadV1,
} from './arena-v2-information-content-read-projection-v1.js';
import {
  ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
} from './arena-v2-information-presentation-content-v1.js';

export interface ArenaV2HomeNextLearningSignatureInformationProjectionInputCandidateV1 {
  readonly schemaVersion: 1;
  readonly fieldSource: ArenaV2InformationFieldSourceV1;
  readonly weaponDefinitionId: string | null;
  readonly mapDefinitionId: string | null;
  readonly segmentDefinitionId: string | null;
  readonly continuationRoute: ArenaV2NextLearningGoalContinuationRouteV1;
  readonly fullCatalogReplayCombination: ArenaV2FullCatalogReplayCombinationV1 | null;
}

export interface ArenaV2FullCatalogReplayCombinationInformationProjectionInputCandidateV1 {
  readonly schemaVersion: 1;
  readonly fieldSource: ArenaV2InformationFieldSourceV1;
  readonly continuationRoute: ArenaV2NextLearningGoalContinuationRouteV1;
  readonly fullCatalogReplayCombination: ArenaV2FullCatalogReplayCombinationV1 | null;
}

export interface ArenaV2NextLearningSignatureReadCandidateV1 {
  readonly schemaVersion: 1;
  readonly weaponDefinitionId: string | null;
  readonly weaponDisplayName: string | null;
  readonly mapDefinitionId: string | null;
  readonly mapDisplayName: string | null;
  readonly segmentDefinitionId: string | null;
  readonly segmentDisplayName: string | null;
  readonly segmentOrdinal: number | null;
  readonly segmentLearningFocus: string | null;
  readonly compactText: string;
  readonly expandedText: string;
  readonly accessibilityText: string;
}

const INPUT_KEYS = new Set([
  'schemaVersion', 'fieldSource', 'weaponDefinitionId', 'mapDefinitionId',
  'segmentDefinitionId',
  'continuationRoute',
  'fullCatalogReplayCombination',
]);
const REPLAY_FIELD_INPUT_KEYS = new Set([
  'schemaVersion', 'fieldSource', 'continuationRoute', 'fullCatalogReplayCombination',
]);
const FIELD_SOURCE_KEYS = new Set(['ownerId', 'fieldValues']);
const FIELD_VALUE_KEYS = new Set([
  'fieldId', 'labelMessageId', 'valueText', 'accessibilityText', 'fixedWidthNumeric',
]);
const TARGET_FIELD_ID = 'next-goal';
const TARGET_LABEL_MESSAGE_ID = 'arena.v2.field.next-goal';
const LEARNING_IDENTITY_KEYS = new Set([
  'weaponDefinitionId', 'mapDefinitionId', 'segmentDefinitionId',
]);
const CONTINUATION_ROUTE_KEYS = new Set([
  'schemaVersion', 'goalId', 'goalKind', 'continuationKind',
  'recommendedModeDefinitionId', 'recommendedModeKind', 'targetWeaponDefinitionId',
  'targetMapDefinitionId', 'requiresTargetWeaponSelection',
  'targetWeaponRequiresWorldPickup', 'requiresTargetMapSelection',
]);
const REPLAY_COMBINATION_KEYS = new Set([
  'schemaVersion', 'profileRevision', 'modeDefinitionId', 'modeKind', 'modePlayCount',
  'weaponDefinitionId', 'weaponRotationOrdinal', 'eligibleWeaponCount',
  'mapDefinitionId', 'mapRotationOrdinal', 'mapCount', 'weaponMapRotationCycleLength',
  'survivalWeaponRequiresWorldPickup',
]);
const GOAL_KINDS = new Set([
  'collect-map', 'collect-weapon', 'weapon-context', 'map-segment', 'mode-mastery',
  'cross-challenge', 'record-improvement', 'catalog-complete',
]);
const CONTINUATION_KINDS = new Set([
  'explicit-mode', 'deterministic-weapon-loadout', 'map-route-practice',
  'conditional-survival-supply', 'free-choice',
]);

function exactRecord(value: unknown, keys: ReadonlySet<string>, name: string): PlainRecord {
  const source = cloneFrozenData(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  return source;
}

function fieldValue(value: unknown, index: number): ArenaV2InformationFieldValueV1 {
  const name = `Arena首页下一目标学习签名字段[${index}]`;
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

function learningFieldSource(value: unknown): ArenaV2InformationFieldSourceV1 {
  const source = exactRecord(value, FIELD_SOURCE_KEYS, 'Arena首页下一目标学习签名字段Owner');
  if (source.ownerId !== 'p6-learning-profile') {
    throw new RangeError('Arena首页下一目标学习签名只能增强学习档案字段Owner。');
  }
  if (!Array.isArray(source.fieldValues)) {
    throw new TypeError('Arena首页下一目标学习签名fieldValues必须是数组。');
  }
  const fields = Object.freeze(source.fieldValues.map(fieldValue));
  if (new Set(fields.map(({ fieldId }) => fieldId)).size !== fields.length) {
    throw new RangeError('Arena首页下一目标学习签名字段ID不得重复。');
  }
  const targets = fields.filter(({ fieldId }) => fieldId === TARGET_FIELD_ID);
  if (targets.length !== 1
    || targets[0]!.labelMessageId !== TARGET_LABEL_MESSAGE_ID
    || targets[0]!.fixedWidthNumeric !== true) {
    throw new RangeError('Arena首页下一目标学习签名必须精确复用一个next-goal数值字段。');
  }
  return Object.freeze({ ownerId: source.ownerId, fieldValues: fields });
}

function nullableDefinitionId(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

function continuationCopy(value: unknown): Readonly<{
  readonly goalKind: string;
  readonly goalId: string;
  readonly fullCatalogComplete: boolean;
  readonly activeLearningComplete: boolean;
  readonly compactText: string;
  readonly accessibilityText: string;
  readonly targetWeaponDefinitionId: string | null;
  readonly targetMapDefinitionId: string | null;
}> {
  const source = exactRecord(value, CONTINUATION_ROUTE_KEYS, 'Arena首页下一目标续玩路由');
  if (source.schemaVersion !== 1) throw new RangeError('Arena首页下一目标续玩路由版本无效。');
  const goalId = assertNonEmptyString(source.goalId, 'Arena首页下一目标续玩路由.goalId');
  if (typeof source.goalKind !== 'string' || !GOAL_KINDS.has(source.goalKind)) {
    throw new RangeError('Arena首页下一目标续玩路由.goalKind未知。');
  }
  const goalKind = source.goalKind;
  const fullCatalogComplete = goalKind === 'catalog-complete'
    && goalId === ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1;
  const activeLearningComplete = goalKind === 'catalog-complete'
    && goalId === ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1;
  if (goalKind === 'catalog-complete'
    && !fullCatalogComplete
    && !activeLearningComplete) {
    throw new RangeError('Arena首页目录范围完成续玩路由目标ID无效。');
  }
  if (goalKind !== 'catalog-complete'
    && (goalId === ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1
      || goalId === ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1)) {
    throw new RangeError('Arena首页非目录完成目标不得冒充范围完成续玩路由。');
  }
  if (typeof source.continuationKind !== 'string'
    || !CONTINUATION_KINDS.has(source.continuationKind)) {
    throw new RangeError('Arena首页下一目标续玩路由.continuationKind未知。');
  }
  const recommendedModeKind = source.recommendedModeKind;
  const recommendedModeDefinitionId = nullableDefinitionId(
    source.recommendedModeDefinitionId,
    'Arena首页下一目标续玩路由.recommendedModeDefinitionId',
  );
  const targetWeaponDefinitionId = nullableDefinitionId(
    source.targetWeaponDefinitionId,
    'Arena首页下一目标续玩路由.targetWeaponDefinitionId',
  );
  const targetMapDefinitionId = nullableDefinitionId(
    source.targetMapDefinitionId,
    'Arena首页下一目标续玩路由.targetMapDefinitionId',
  );
  for (const key of [
    'requiresTargetWeaponSelection', 'targetWeaponRequiresWorldPickup',
    'requiresTargetMapSelection',
  ] as const) {
    if (typeof source[key] !== 'boolean') {
      throw new TypeError(`Arena首页下一目标续玩路由.${key}必须是布尔值。`);
    }
  }
  if (source.requiresTargetWeaponSelection === true
    && source.targetWeaponRequiresWorldPickup === true) {
    throw new RangeError('Arena首页下一目标续玩路由不能同时要求预选武器与世界拾取。');
  }
  if (source.requiresTargetWeaponSelection !== (targetWeaponDefinitionId !== null
      && source.targetWeaponRequiresWorldPickup !== true)
    || source.requiresTargetMapSelection !== (targetMapDefinitionId !== null)) {
    throw new RangeError('Arena首页下一目标续玩路由选择要求与目标身份漂移。');
  }
  if (recommendedModeKind === null) {
    if (recommendedModeDefinitionId !== null
      || source.continuationKind !== 'free-choice'
      || targetWeaponDefinitionId !== null
      || targetMapDefinitionId !== null
      || (!fullCatalogComplete && !activeLearningComplete)) {
      throw new RangeError('Arena首页自由挑战续玩路由身份不闭合。');
    }
    return Object.freeze({
      goalKind,
      goalId,
      fullCatalogComplete,
      activeLearningComplete,
      compactText: activeLearningComplete
        ? '下一局：自由练习当前开放内容'
        : '下一局：自由挑战',
      accessibilityText: activeLearningComplete
        ? `目标${goalId}表示当前开放内容已完成，但完整目录尚未闭合；可任选模式继续练习。`
        : `目标${goalId}已进入自由挑战，可任选模式刷新个人记录。`,
      targetWeaponDefinitionId,
      targetMapDefinitionId,
    });
  }
  if (fullCatalogComplete || activeLearningComplete) {
    throw new RangeError('Arena首页目录范围完成续玩路由不得指定推荐模式。');
  }
  if (recommendedModeKind !== 'duel'
    && recommendedModeKind !== 'race'
    && recommendedModeKind !== 'survival') {
    throw new RangeError('Arena首页下一目标续玩路由模式kind无效。');
  }
  if (recommendedModeDefinitionId === null) {
    throw new RangeError('Arena首页下一目标续玩路由模式身份无效。');
  }
  const modeLabel = recommendedModeKind === 'duel'
    ? '常规1v1'
    : recommendedModeKind === 'race'
      ? '竞速'
      : '生存';
  if (ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1[recommendedModeKind]
    !== recommendedModeDefinitionId) {
    throw new RangeError('Arena首页下一目标续玩路由模式Definition与kind漂移。');
  }
  const conditionalSupply = source.targetWeaponRequiresWorldPickup === true;
  if (conditionalSupply !== (recommendedModeKind === 'survival'
      && targetWeaponDefinitionId !== null)
    || conditionalSupply !== (source.continuationKind === 'conditional-survival-supply')) {
    throw new RangeError('Arena首页生存拾取续玩语义漂移。');
  }
  if ((source.continuationKind === 'map-route-practice' && recommendedModeKind !== 'race')
    || (source.continuationKind === 'deterministic-weapon-loadout'
      && recommendedModeKind !== 'duel')
    || source.continuationKind === 'free-choice') {
    throw new RangeError('Arena首页下一目标续玩类别与模式漂移。');
  }
  return Object.freeze({
    goalKind,
    goalId,
    fullCatalogComplete,
    activeLearningComplete,
    compactText: conditionalSupply
      ? `下一局：${modeLabel}·局内遇到目标武器再拾取`
      : `下一局：${modeLabel}`,
    accessibilityText: conditionalSupply
      ? `下一局建议进入${modeLabel}。目标武器需要在局内等待实体供给后靠近拾取，供给不保证本局一定出现。`
      : `下一局建议进入${modeLabel}，并按目标切换所需武器或地图。`,
    targetWeaponDefinitionId,
    targetMapDefinitionId,
  });
}

function fullCatalogReplayCopy(
  value: unknown,
  continuation: ReturnType<typeof continuationCopy>,
): Readonly<{ readonly compactText: string; readonly accessibilityText: string }> {
  if (value === null) {
    if (continuation.fullCatalogComplete) {
      throw new RangeError('Arena首页完整目录终态缺少复练组合。');
    }
    return Object.freeze({ compactText: '', accessibilityText: '' });
  }
  if (!continuation.fullCatalogComplete || continuation.activeLearningComplete) {
    throw new RangeError('Arena首页非完整目录终态不得夹带复练组合。');
  }
  const source = exactRecord(value, REPLAY_COMBINATION_KEYS, 'Arena首页完整目录复练组合');
  if (source.schemaVersion !== 1) {
    throw new RangeError('Arena首页完整目录复练组合schemaVersion无效。');
  }
  const profileRevision = assertIntegerAtLeast(
    source.profileRevision,
    0,
    'Arena首页复练组合profileRevision',
  );
  const modeKind = source.modeKind;
  if (modeKind !== 'duel' && modeKind !== 'race' && modeKind !== 'survival') {
    throw new RangeError('Arena首页复练组合模式kind无效。');
  }
  const modeDefinitionId = assertNonEmptyString(
    source.modeDefinitionId,
    'Arena首页复练组合modeDefinitionId',
  );
  if (modeDefinitionId !== ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1[modeKind]) {
    throw new RangeError('Arena首页复练组合模式Definition与kind漂移。');
  }
  const modePlayCount = assertIntegerAtLeast(
    source.modePlayCount,
    0,
    'Arena首页复练组合modePlayCount',
  );
  const weaponDefinitionId = assertNonEmptyString(
    source.weaponDefinitionId,
    'Arena首页复练组合weaponDefinitionId',
  );
  const weapon = projectArenaV2WeaponCoreFightReadV1(
    ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
    ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
    weaponDefinitionId,
  );
  const eligibleWeaponCount = assertIntegerAtLeast(
    source.eligibleWeaponCount,
    1,
    'Arena首页复练组合eligibleWeaponCount',
  );
  const weaponRotationOrdinal = assertIntegerAtLeast(
    source.weaponRotationOrdinal,
    1,
    'Arena首页复练组合weaponRotationOrdinal',
  );
  if (eligibleWeaponCount > ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons.length
    || weaponRotationOrdinal > eligibleWeaponCount) {
    throw new RangeError('Arena首页复练组合武器轮转序号越界。');
  }
  if (weaponRotationOrdinal !== (profileRevision % eligibleWeaponCount) + 1) {
    throw new RangeError('Arena首页复练组合武器轮转序号与Profile revision漂移。');
  }
  const mapDefinitionId = assertNonEmptyString(
    source.mapDefinitionId,
    'Arena首页复练组合mapDefinitionId',
  );
  const route = projectArenaV2MapRouteSkeletonReadV1(
    ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
    ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
    mapDefinitionId,
  );
  const mapCount = assertIntegerAtLeast(source.mapCount, 1, 'Arena首页复练组合mapCount');
  const mapRotationOrdinal = assertIntegerAtLeast(
    source.mapRotationOrdinal,
    1,
    'Arena首页复练组合mapRotationOrdinal',
  );
  if (mapCount > ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps.length
    || mapRotationOrdinal > mapCount) {
    throw new RangeError('Arena首页复练组合地图轮转序号越界。');
  }
  if (mapRotationOrdinal !== (
    Math.floor(profileRevision / eligibleWeaponCount) % mapCount
  ) + 1) {
    throw new RangeError('Arena首页复练组合地图轮转序号与Profile revision漂移。');
  }
  const cycleLength = assertIntegerAtLeast(
    source.weaponMapRotationCycleLength,
    1,
    'Arena首页复练组合weaponMapRotationCycleLength',
  );
  if (cycleLength !== eligibleWeaponCount * mapCount) {
    throw new RangeError('Arena首页复练组合武器地图轮转周期不闭合。');
  }
  const cycleOrdinal = ((mapRotationOrdinal - 1) * eligibleWeaponCount)
    + weaponRotationOrdinal;
  if (cycleOrdinal > cycleLength) {
    throw new RangeError('Arena首页复练组合轮转位置越界。');
  }
  if (typeof source.survivalWeaponRequiresWorldPickup !== 'boolean'
    || source.survivalWeaponRequiresWorldPickup !== (modeKind === 'survival')) {
    throw new RangeError('Arena首页复练组合生存拾取语义漂移。');
  }
  const modeLabel = modeKind === 'duel' ? '常规1v1' : modeKind === 'race' ? '竞速' : '生存';
  const compactText = modeKind === 'survival'
    ? `复练 ${cycleOrdinal}/${cycleLength}：${modeLabel}·${route.displayName}·${
      weapon.displayName
    }遇到再拾取`
    : `复练 ${cycleOrdinal}/${cycleLength}：${modeLabel}·${weapon.displayName}·${
      route.displayName
    }`;
  return Object.freeze({
    compactText,
    accessibilityText: modeKind === 'survival'
      ? `完整目录第${cycleOrdinal}组，共${cycleLength}组。本轮建议为${modeLabel}和${
        route.displayName
      }；目标武器${
        weapon.displayName
      }只在局内实体实际出现时靠近拾取，不保证本局供给。该模式当前累计${
        modePlayCount
      }局；完成第${cycleLength}组后从第一组继续。`
      : `完整目录第${cycleOrdinal}组，共${cycleLength}组。本轮建议为${modeLabel}、${
        weapon.displayName
      }和${
        route.displayName
      }。该模式当前累计${modePlayCount}局；武器与地图组合按${
        cycleLength
      }组一轮覆盖后重复。`,
  });
}

export function projectArenaV2FullCatalogReplayCombinationInformationFieldSourceCandidateV1(
  value: ArenaV2FullCatalogReplayCombinationInformationProjectionInputCandidateV1,
): ArenaV2InformationFieldSourceV1 {
  const source = exactRecord(
    value,
    REPLAY_FIELD_INPUT_KEYS,
    'Arena完整目录复练组合字段投影输入',
  );
  if (source.schemaVersion !== 1) {
    throw new RangeError('Arena完整目录复练组合字段投影schemaVersion无效。');
  }
  const fields = learningFieldSource(source.fieldSource);
  const replay = fullCatalogReplayCopy(
    source.fullCatalogReplayCombination,
    continuationCopy(source.continuationRoute),
  );
  if (replay.compactText.length === 0) return fields;
  return Object.freeze({
    ownerId: fields.ownerId,
    fieldValues: Object.freeze(fields.fieldValues.map((field) => (
      field.fieldId !== TARGET_FIELD_ID
        ? field
        : Object.freeze({
          ...field,
          valueText: `${field.valueText}；${replay.compactText}`,
          accessibilityText: `${field.accessibilityText} ${replay.accessibilityText}`,
        })
    ))),
  });
}

export function projectArenaV2NextLearningSignatureReadCandidateV1(value: Readonly<{
  readonly weaponDefinitionId: string | null;
  readonly mapDefinitionId: string | null;
  readonly segmentDefinitionId: string | null;
}>): ArenaV2NextLearningSignatureReadCandidateV1 | null {
  const source = exactRecord(
    value,
    LEARNING_IDENTITY_KEYS,
    'Arena下一目标学习签名读取输入',
  );
  const weaponDefinitionId = nullableDefinitionId(
    source.weaponDefinitionId,
    'Arena下一目标学习签名weaponDefinitionId',
  );
  const mapDefinitionId = nullableDefinitionId(
    source.mapDefinitionId,
    'Arena下一目标学习签名mapDefinitionId',
  );
  const segmentDefinitionId = nullableDefinitionId(
    source.segmentDefinitionId,
    'Arena下一目标学习签名segmentDefinitionId',
  );
  if (segmentDefinitionId !== null && mapDefinitionId === null) {
    throw new RangeError('Arena下一目标学习签名路段必须隶属于目标地图。');
  }
  if (weaponDefinitionId === null && mapDefinitionId === null) return null;

  let weaponDisplayName: string | null = null;
  let mapDisplayName: string | null = null;
  let segmentDisplayName: string | null = null;
  let segmentOrdinal: number | null = null;
  let segmentLearningFocus: string | null = null;
  const compactSignatures: string[] = [];
  const expandedSignatures: string[] = [];
  const accessibilitySignatures: string[] = [];
  if (weaponDefinitionId !== null) {
    const coreFight = projectArenaV2WeaponCoreFightReadV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      weaponDefinitionId,
    );
    weaponDisplayName = coreFight.displayName;
    const weaponSignature = `打法：${coreFight.coreVerb}·${coreFight.operation.compactText}`;
    compactSignatures.push(weaponSignature);
    expandedSignatures.push(`核心：${coreFight.compactText}`);
    accessibilitySignatures.push(`目标武器核心打法：${coreFight.accessibilityText}`);
  }
  if (mapDefinitionId !== null) {
    const route = projectArenaV2MapRouteSkeletonReadV1(
      ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
      ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
      mapDefinitionId,
    );
    const routeStart = route.anchors[0];
    const routeFinish = route.anchors[route.anchors.length - 1];
    if (routeStart === undefined || routeFinish === undefined) {
      throw new RangeError('Arena下一目标地图路线缺少首尾锚点。');
    }
    mapDisplayName = route.displayName;
    if (segmentDefinitionId !== null) {
      const map = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps.find(
        (entry) => entry.mapDefinitionId === mapDefinitionId,
      );
      const segment = map?.segments.find(
        (entry) => entry.segmentDefinitionId === segmentDefinitionId,
      );
      if (segment === undefined) {
        throw new RangeError('Arena下一目标学习签名路段不属于目标地图。');
      }
      segmentDisplayName = ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
        segment.nameMessageId,
      );
      segmentOrdinal = segment.ordinal;
      segmentLearningFocus = ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
        segment.lessonMessageId,
      );
      compactSignatures.push(`下一段：${segmentOrdinal}.${segmentDisplayName}`);
      expandedSignatures.push(
        `下一段：第${segmentOrdinal}段${segmentDisplayName}，${segmentLearningFocus}`,
      );
      accessibilitySignatures.push(
        `目标路段是第${segmentOrdinal}段${segmentDisplayName}：${segmentLearningFocus}`,
      );
    }
    compactSignatures.push(`路线：${routeStart.displayName}→${routeFinish.displayName}`);
    expandedSignatures.push(`路线：${route.compactText}`);
    accessibilitySignatures.push(`目标地图${route.displayName}路线骨架：${
      route.accessibilityText
    }`);
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    weaponDefinitionId,
    weaponDisplayName,
    mapDefinitionId,
    mapDisplayName,
    segmentDefinitionId,
    segmentDisplayName,
    segmentOrdinal,
    segmentLearningFocus,
    compactText: compactSignatures.join('；'),
    expandedText: expandedSignatures.join('；'),
    accessibilityText: accessibilitySignatures.join(' '),
  });
}

export function projectArenaV2HomeNextLearningSignatureInformationFieldSourceCandidateV1(
  value: ArenaV2HomeNextLearningSignatureInformationProjectionInputCandidateV1,
): ArenaV2InformationFieldSourceV1 {
  const source = exactRecord(value, INPUT_KEYS, 'Arena首页下一目标学习签名投影输入');
  if (source.schemaVersion !== 1) {
    throw new RangeError('Arena首页下一目标学习签名schemaVersion无效。');
  }
  const fields = learningFieldSource(source.fieldSource);
  const continuation = continuationCopy(source.continuationRoute);
  const fullCatalogReplay = fullCatalogReplayCopy(
    source.fullCatalogReplayCombination,
    continuation,
  );
  const weaponDefinitionId = nullableDefinitionId(
    source.weaponDefinitionId,
    'Arena首页下一目标学习签名weaponDefinitionId',
  );
  const mapDefinitionId = nullableDefinitionId(
    source.mapDefinitionId,
    'Arena首页下一目标学习签名mapDefinitionId',
  );
  const segmentDefinitionId = nullableDefinitionId(
    source.segmentDefinitionId,
    'Arena首页下一目标学习签名segmentDefinitionId',
  );
  if (continuation.goalKind === 'map-segment' && segmentDefinitionId === null) {
    throw new RangeError('Arena首页地图路段目标缺少精确路段身份。');
  }
  if (segmentDefinitionId !== null
    && continuation.goalKind !== 'map-segment'
    && continuation.goalKind !== 'cross-challenge') {
    throw new RangeError('Arena首页非路段目标不得夹带精确路段身份。');
  }
  if (continuation.targetWeaponDefinitionId !== weaponDefinitionId
    || continuation.targetMapDefinitionId !== mapDefinitionId) {
    throw new RangeError('Arena首页下一目标学习签名与续玩路由目标身份漂移。');
  }
  const signature = projectArenaV2NextLearningSignatureReadCandidateV1({
    weaponDefinitionId,
    mapDefinitionId,
    segmentDefinitionId,
  });
  return Object.freeze({
    ownerId: fields.ownerId,
    fieldValues: Object.freeze(fields.fieldValues.map((field) => (
      field.fieldId !== TARGET_FIELD_ID
        ? field
        : Object.freeze({
          ...field,
          valueText: `${field.valueText}；${
            signature === null ? '' : `${signature.compactText}；`
          }${continuation.compactText}${
            fullCatalogReplay.compactText.length === 0
              ? ''
              : `；${fullCatalogReplay.compactText}`
          }`,
          accessibilityText: `${field.accessibilityText} ${
            signature === null ? '' : `${signature.accessibilityText} `
          }${continuation.accessibilityText}${
            fullCatalogReplay.accessibilityText.length === 0
              ? ''
              : ` ${fullCatalogReplay.accessibilityText}`
          }`,
        })
    ))),
  });
}

export const ARENA_V2_HOME_NEXT_LEARNING_SIGNATURE_INFORMATION_PROJECTION_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    defaultSurfaceWired: false as const,
    targetScreenId: 'home' as const,
    targetOwnerId: 'p6-learning-profile' as const,
    targetFieldId: TARGET_FIELD_ID,
    goalIdentitySource:
      'p6-learning-profile.next-goal.weapon-map-and-segment-definition-ids' as const,
    scopeCompletionIdentitySource: 'p6-next-goal-continuation-route' as const,
    weaponCoreFightSource: 'shared-weapon-core-fight-read-projection' as const,
    mapRouteSource: 'shared-map-route-skeleton-read-projection' as const,
    readProjectionSharedByHomeAndResult: true as const,
    maximumVisibleWeaponSignatureCount: 1 as const,
    maximumVisibleMapSignatureCount: 1 as const,
    maximumVisibleMapSegmentSignatureCount: 1 as const,
    homeUsesCompactStartFinishRoute: true as const,
    exactMapSegmentGoalPrecedesRouteSkeleton: true as const,
    homeShowsOneNextMatchContinuationRoute: true as const,
    scopeCompletionUsesStableGoalIds: true as const,
    unknownFreeChoiceGoalRejected: true as const,
    duplicatesScopeCompletionResolution: false as const,
    continuationRouteDoesNotMutateSelectionOrNavigation: true as const,
    survivalContinuationNeverPromisesWeaponSupply: true as const,
    resultCanUseExpandedFourAnchorRoute: true as const,
    nullLearningIdentityStillShowsContinuationRoute: true as const,
    fullCatalogReplayCombinationUsesExistingNextGoalField: true as const,
    fullCatalogReplayCombinationShowsDerivedCycleOrdinal: true as const,
    replayRotationOrdinalsRevalidatedAgainstProfileRevision: true as const,
    survivalReplayWeaponIsConditionalWorldPickup: true as const,
    fieldCountAdded: 0 as const,
    pageCountAdded: 0 as const,
    actionCountAdded: 0 as const,
    writesGoalProfileAuthorityRewardOrTask: false as const,
  });

export const ARENA_V2_FULL_CATALOG_REPLAY_COMBINATION_INFORMATION_PROJECTION_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    defaultSurfaceWired: false as const,
    targetScreenIds: Object.freeze(['home', 'result-reward'] as const),
    targetOwnerId: 'p6-learning-profile' as const,
    targetFieldId: TARGET_FIELD_ID,
    sharedCombinationSource: 'p6-full-catalog-replay-combination-v1' as const,
    resultReusesExistingNextGoalField: true as const,
    resultDoesNotDuplicateHomeLearningSignature: true as const,
    survivalReplayWeaponIsConditionalWorldPickup: true as const,
    fieldCountAdded: 0 as const,
    pageCountAdded: 0 as const,
    actionCountAdded: 0 as const,
    writesGoalProfileAuthorityRewardOrTask: false as const,
  });
