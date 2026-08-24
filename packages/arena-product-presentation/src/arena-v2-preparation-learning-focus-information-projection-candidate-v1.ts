import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1,
  ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1,
  type ArenaV2PreparationLearningFocusV1,
} from '@number-strategy-jump/arena-product-progression';
import type {
  ArenaV2InformationFieldSourceV1,
} from './arena-v2-information-field-composition-v1.js';
import {
  ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
} from './arena-v2-information-presentation-content-v1.js';
import type {
  ArenaV2InformationFieldValueV1,
} from './arena-v2-information-screen-view-model-v1.js';
import {
  projectArenaV2MapRouteSkeletonReadV1,
} from './arena-v2-information-content-read-projection-v1.js';

export interface ArenaV2PreparationLearningFocusInformationInputCandidateV1 {
  readonly schemaVersion: 1;
  readonly profileRevision: number;
  readonly modeKind: 'duel' | 'race' | 'survival';
  readonly weaponDefinitionId: string | null;
  readonly mapDefinitionId: string;
  readonly fieldSource: ArenaV2InformationFieldSourceV1;
  readonly focus: ArenaV2PreparationLearningFocusV1;
  readonly globalGoalFit: ArenaV2PreparationGlobalLearningGoalFitCandidateV1;
}

export interface ArenaV2PreparationGlobalLearningGoalFitCandidateV1 {
  readonly schemaVersion: 1;
  readonly profileRevision: number;
  readonly kind: 'stable-current-combination' | 'adjust-before-next-match'
    | 'conditional-survival-supply' | 'free-challenge';
  readonly goalId: string;
  readonly goalActionLabel: string;
  readonly sourceModeKind: 'duel' | 'race' | 'survival';
  readonly recommendedModeKind: 'duel' | 'race' | 'survival';
  readonly targetWeaponDefinitionId: string | null;
  readonly targetMapDefinitionId: string | null;
  readonly requiresModeChange: boolean;
  readonly requiresWeaponChange: boolean;
  readonly requiresMapChange: boolean;
  readonly deterministicCurrentReplayCanAdvance: boolean;
  readonly conditionalCurrentReplayCanAdvance: boolean;
}

type ArenaV2PreparationModeKind =
  ArenaV2PreparationLearningFocusInformationInputCandidateV1['modeKind'];

const INPUT_KEYS = new Set([
  'schemaVersion', 'profileRevision', 'modeKind', 'weaponDefinitionId', 'mapDefinitionId',
  'fieldSource', 'focus', 'globalGoalFit',
]);
const FIELD_SOURCE_KEYS = new Set(['ownerId', 'fieldValues']);
const FIELD_VALUE_KEYS = new Set([
  'fieldId', 'labelMessageId', 'valueText', 'accessibilityText', 'fixedWidthNumeric',
]);
const FOCUS_KEYS = new Set([
  'schemaVersion', 'profileRevision', 'modeKind', 'weaponContextFocus', 'mapSegmentFocus',
]);
const WEAPON_FOCUS_KEYS = new Set([
  'weaponDefinitionId', 'context', 'currentProgress', 'targetProgress',
  'practiceInstruction',
]);
const MAP_FOCUS_KEYS = new Set([
  'segmentDefinitionId', 'ordinal', 'currentProgress', 'targetProgress',
  'practiceInstruction',
]);
const GLOBAL_GOAL_FIT_KEYS = new Set([
  'schemaVersion', 'profileRevision', 'kind', 'goalId', 'goalActionLabel',
  'sourceModeKind', 'recommendedModeKind', 'targetWeaponDefinitionId',
  'targetMapDefinitionId', 'requiresModeChange', 'requiresWeaponChange',
  'requiresMapChange', 'deterministicCurrentReplayCanAdvance',
  'conditionalCurrentReplayCanAdvance',
]);
const MODE_KINDS: ReadonlySet<string> = new Set(['duel', 'race', 'survival']);
const CONTEXT_LABELS = Object.freeze({
  ground: '地面',
  aerial: '空中',
  edge: '边缘',
  'duel-counterplay': '1v1反制',
  survival: '生存',
});
const MODE_CONTEXTS: Readonly<Record<string, ReadonlySet<string>>> = Object.freeze({
  duel: new Set(['ground', 'aerial', 'edge', 'duel-counterplay']),
  race: new Set(['ground', 'aerial', 'edge']),
  survival: new Set<string>(),
});

function exactRecord(value: unknown, keys: ReadonlySet<string>, name: string): PlainRecord {
  const source = cloneFrozenData(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(name + '缺少' + key + '。');
  }
  return source;
}

function isArenaV2PreparationModeKind(
  value: unknown,
): value is ArenaV2PreparationModeKind {
  return typeof value === 'string' && MODE_KINDS.has(value);
}

function fieldValue(value: unknown, index: number): ArenaV2InformationFieldValueV1 {
  const name = 'Arena准备学习目标字段[' + index + ']';
  const source = exactRecord(value, FIELD_VALUE_KEYS, name);
  if (typeof source.fixedWidthNumeric !== 'boolean') {
    throw new TypeError(name + '.fixedWidthNumeric必须是布尔值。');
  }
  return Object.freeze({
    fieldId: assertNonEmptyString(source.fieldId, name + '.fieldId'),
    labelMessageId: assertNonEmptyString(source.labelMessageId, name + '.labelMessageId'),
    valueText: assertNonEmptyString(source.valueText, name + '.valueText'),
    accessibilityText: assertNonEmptyString(
      source.accessibilityText,
      name + '.accessibilityText',
    ),
    fixedWidthNumeric: source.fixedWidthNumeric,
  });
}

function fieldSource(value: unknown): ArenaV2InformationFieldSourceV1 {
  const source = exactRecord(value, FIELD_SOURCE_KEYS, 'Arena准备学习目标字段Owner');
  if (source.ownerId !== 'p5-mode-content') {
    throw new RangeError('Arena准备学习目标只能原位增强Mode Content字段Owner。');
  }
  if (!Array.isArray(source.fieldValues)) {
    throw new TypeError('Arena准备学习目标fieldValues必须是数组。');
  }
  const fields = Object.freeze(source.fieldValues.map(fieldValue));
  if (new Set(fields.map(({ fieldId }) => fieldId)).size !== fields.length) {
    throw new RangeError('Arena准备学习目标字段ID不得重复。');
  }
  return Object.freeze({ ownerId: source.ownerId, fieldValues: fields });
}

function progress(currentValue: unknown, targetValue: unknown, name: string): Readonly<{
  readonly current: number;
  readonly target: number;
}> {
  const current = assertIntegerAtLeast(currentValue, 0, name + '.currentProgress');
  const target = assertIntegerAtLeast(targetValue, 1, name + '.targetProgress');
  if (current >= target) throw new RangeError(name + '必须指向尚未完成的目标。');
  return Object.freeze({ current, target });
}

function globalLearningGoalFitText(
  value: unknown,
  profileRevision: number,
  modeKind: 'duel' | 'race' | 'survival',
): Readonly<{ readonly visibleText: string; readonly accessibilityText: string }> {
  const fit = exactRecord(value, GLOBAL_GOAL_FIT_KEYS, 'Arena准备全局学习目标适配');
  if (fit.schemaVersion !== 1) throw new RangeError('Arena准备全局学习目标版本无效。');
  if (assertIntegerAtLeast(
    fit.profileRevision,
    0,
    'Arena准备全局学习目标.profileRevision',
  ) !== profileRevision) {
    throw new RangeError('Arena准备全局学习目标与当前Profile revision不一致。');
  }
  const kind = fit.kind;
  if (kind !== 'stable-current-combination'
    && kind !== 'adjust-before-next-match'
    && kind !== 'conditional-survival-supply'
    && kind !== 'free-challenge') {
    throw new RangeError('Arena准备全局学习目标适配类型无效。');
  }
  const sourceModeKind = fit.sourceModeKind;
  const recommendedModeKind = fit.recommendedModeKind;
  if (!isArenaV2PreparationModeKind(sourceModeKind) || sourceModeKind !== modeKind
    || !isArenaV2PreparationModeKind(recommendedModeKind)) {
    throw new RangeError('Arena准备全局学习目标模式身份不闭合。');
  }
  const goalId = assertNonEmptyString(
    fit.goalId,
    'Arena准备全局学习目标.goalId',
  );
  const fullCatalogComplete = kind === 'free-challenge'
    && goalId === ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1;
  const activeLearningComplete = kind === 'free-challenge'
    && goalId === ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1;
  if (kind === 'free-challenge'
    && !fullCatalogComplete
    && !activeLearningComplete) {
    throw new RangeError('Arena准备页自由挑战不是已注册的范围完成身份。');
  }
  if (kind !== 'free-challenge'
    && (goalId === ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1
      || goalId === ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1)) {
    throw new RangeError('Arena准备页非自由挑战路由不得冒充范围完成身份。');
  }
  const goalActionLabel = assertNonEmptyString(
    fit.goalActionLabel,
    'Arena准备全局学习目标.goalActionLabel',
  );
  const targetWeaponDefinitionId = fit.targetWeaponDefinitionId === null
    ? null
    : assertNonEmptyString(
      fit.targetWeaponDefinitionId,
      'Arena准备全局学习目标.targetWeaponDefinitionId',
    );
  const targetWeaponEntry = targetWeaponDefinitionId === null
    ? null
    : ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons.find((entry) => (
      entry.weaponDefinitionId === targetWeaponDefinitionId
    ));
  if (targetWeaponDefinitionId !== null && targetWeaponEntry === undefined) {
    throw new RangeError('Arena准备全局学习目标武器不在内容目录中。');
  }
  const targetWeapon = targetWeaponEntry ?? null;
  const targetMapDefinitionId = fit.targetMapDefinitionId === null
    ? null
    : assertNonEmptyString(
      fit.targetMapDefinitionId,
      'Arena准备全局学习目标.targetMapDefinitionId',
    );
  const targetMapEntry = targetMapDefinitionId === null
    ? null
    : ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps.find((entry) => (
      entry.mapDefinitionId === targetMapDefinitionId
    ));
  if (targetMapDefinitionId !== null && targetMapEntry === undefined) {
    throw new RangeError('Arena准备全局学习目标地图不在内容目录中。');
  }
  const targetMap = targetMapEntry ?? null;
  const flags = [
    fit.requiresModeChange,
    fit.requiresWeaponChange,
    fit.requiresMapChange,
    fit.deterministicCurrentReplayCanAdvance,
    fit.conditionalCurrentReplayCanAdvance,
  ];
  if (flags.some((flag) => typeof flag !== 'boolean')) {
    throw new TypeError('Arena准备全局学习目标适配标志必须是布尔值。');
  }
  const requiresModeChange = fit.requiresModeChange as boolean;
  const requiresWeaponChange = fit.requiresWeaponChange as boolean;
  const requiresMapChange = fit.requiresMapChange as boolean;
  const deterministic = fit.deterministicCurrentReplayCanAdvance as boolean;
  const conditional = fit.conditionalCurrentReplayCanAdvance as boolean;
  const requiresAnyChange = requiresModeChange || requiresWeaponChange || requiresMapChange;
  if ((kind === 'stable-current-combination'
      && (requiresAnyChange || !deterministic || conditional))
    || (kind === 'adjust-before-next-match'
      && (!requiresAnyChange || deterministic || conditional))
    || (kind === 'conditional-survival-supply'
      && (targetWeapon === null || recommendedModeKind !== 'survival'
        || requiresWeaponChange || deterministic
        || conditional === requiresAnyChange))
    || (kind === 'free-challenge'
      && (requiresAnyChange || !deterministic || conditional
        || targetWeapon !== null || targetMap !== null))) {
    throw new RangeError('Arena准备全局学习目标适配事实相互矛盾。');
  }
  const modeLabels = Object.freeze({ duel: '常规1v1', race: '竞速', survival: '生存' });
  const adjustments: string[] = [];
  if (requiresModeChange) adjustments.push(`切换到${modeLabels[recommendedModeKind as keyof typeof modeLabels]}`);
  if (requiresWeaponChange && targetWeapon !== null) {
    adjustments.push(`改选${ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      targetWeapon.nameMessageId,
    )}`);
  }
  if (requiresMapChange && targetMap !== null) {
    adjustments.push(`改选${ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      targetMap.nameMessageId,
    )}`);
  }
  if ((requiresWeaponChange && targetWeapon === null)
    || (requiresMapChange && targetMap === null)) {
    throw new RangeError('Arena准备全局学习目标调整缺少目标内容身份。');
  }
  const conditionalWeaponName = kind !== 'conditional-survival-supply'
    ? null
    : targetWeapon === null
      ? (() => { throw new RangeError('Arena准备条件目标缺少补给武器身份。'); })()
      : ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
        targetWeapon.nameMessageId,
      );
  const text = kind === 'free-challenge'
    ? '长期目标：当前开放内容已闭合，可自由挑战或刷新记录'
    : kind === 'stable-current-combination'
      ? `长期目标：当前组合可稳定推进；${goalActionLabel}`
      : kind === 'adjust-before-next-match'
        ? `长期目标：当前组合不能推进；先${adjustments.join('、')}；${goalActionLabel}`
        : `长期目标：条件推进；${adjustments.length === 0
          ? ''
          : `先${adjustments.join('、')}；`}等待${conditionalWeaponName}刷新并拾取；${
          goalActionLabel
        }`;
  return Object.freeze({
    visibleText: text,
    accessibilityText: `唯一长期目标。${text}。`,
  });
}

export function projectArenaV2PreparationLearningFocusInformationFieldSourceCandidateV1(
  value: ArenaV2PreparationLearningFocusInformationInputCandidateV1,
): ArenaV2InformationFieldSourceV1 {
  const source = exactRecord(value, INPUT_KEYS, 'Arena准备学习目标投影输入');
  if (source.schemaVersion !== 1) {
    throw new RangeError('Arena准备学习目标投影schemaVersion无效。');
  }
  const profileRevision = assertIntegerAtLeast(
    source.profileRevision,
    0,
    'Arena准备学习目标profileRevision',
  );
  if (!isArenaV2PreparationModeKind(source.modeKind)) {
    throw new RangeError('Arena准备学习目标输入模式无效。');
  }
  const expectedModeKind = source.modeKind;
  const weaponDefinitionId = source.weaponDefinitionId === null
    ? null
    : assertNonEmptyString(
      source.weaponDefinitionId,
      'Arena准备学习目标weaponDefinitionId',
    );
  if (expectedModeKind === 'survival' && weaponDefinitionId !== null) {
    throw new RangeError('Arena生存准备不能携带预选武器身份。');
  }
  if (expectedModeKind !== 'survival'
    && (weaponDefinitionId === null
      || !ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons.some(
        (entry) => entry.weaponDefinitionId === weaponDefinitionId,
      ))) {
    throw new RangeError('Arena竞技准备武器不在内容目录中。');
  }
  const mapDefinitionId = assertNonEmptyString(
    source.mapDefinitionId,
    'Arena准备学习目标mapDefinitionId',
  );
  const map = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps.find(
    (entry) => entry.mapDefinitionId === mapDefinitionId,
  );
  if (map === undefined) throw new RangeError('Arena准备学习目标地图不在内容目录中。');
  const parsedFields = fieldSource(source.fieldSource);
  const focus = exactRecord(source.focus, FOCUS_KEYS, 'Arena准备学习目标focus');
  if (focus.schemaVersion !== 1) throw new RangeError('Arena准备学习目标focus版本无效。');
  if (assertIntegerAtLeast(
    focus.profileRevision,
    0,
    'Arena准备学习目标focus.profileRevision',
  ) !== profileRevision) {
    throw new RangeError('Arena准备学习目标与当前Profile revision不一致。');
  }
  if (!isArenaV2PreparationModeKind(focus.modeKind)) {
    throw new RangeError('Arena准备学习目标模式无效。');
  }
  const modeKind = focus.modeKind;
  if (modeKind !== expectedModeKind) {
    throw new RangeError('Arena准备学习目标与当前模式不一致。');
  }
  const targetFieldId = modeKind === 'survival' ? 'pressure-summary' : 'weapon-map-plan';
  const targetLabelMessageId = modeKind === 'survival'
    ? 'arena.v2.field.pressure-summary'
    : 'arena.v2.field.weapon-map-plan';
  const targetFixedWidthNumeric = modeKind === 'survival';
  const targetFields = parsedFields.fieldValues.filter(({ fieldId }) => (
    fieldId === targetFieldId
  ));
  if (targetFields.length !== 1
    || targetFields[0]!.labelMessageId !== targetLabelMessageId
    || targetFields[0]!.fixedWidthNumeric !== targetFixedWidthNumeric) {
    throw new RangeError('Arena准备学习目标缺少唯一可增强字段。');
  }

  const routeSkeleton = projectArenaV2MapRouteSkeletonReadV1(
    ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
    ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
    mapDefinitionId,
  );
  const globalGoalFit = globalLearningGoalFitText(
    source.globalGoalFit,
    profileRevision,
    modeKind,
  );
  const learningParts: string[] = [
    globalGoalFit.visibleText,
    `路线骨架：${routeSkeleton.compactText}`,
  ];
  const accessibilityLearningParts: string[] = [
    globalGoalFit.accessibilityText,
    `路线骨架：${routeSkeleton.accessibilityText}`,
  ];
  if (focus.weaponContextFocus !== null) {
    if (modeKind === 'survival') {
      throw new RangeError('Arena生存准备不能承诺预选武器学习目标。');
    }
    const weapon = exactRecord(
      focus.weaponContextFocus,
      WEAPON_FOCUS_KEYS,
      'Arena准备武器情境目标',
    );
    const weaponDefinitionId = assertNonEmptyString(
      weapon.weaponDefinitionId,
      'Arena准备武器情境目标.weaponDefinitionId',
    );
    if (weaponDefinitionId !== source.weaponDefinitionId) {
      throw new RangeError('Arena准备武器情境目标与当前武器不一致。');
    }
    if (!ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons.some(
      (entry) => entry.weaponDefinitionId === weaponDefinitionId,
    )) {
      throw new RangeError('Arena准备武器情境目标不在内容目录中。');
    }
    const context = assertNonEmptyString(
      weapon.context,
      'Arena准备武器情境目标.context',
    );
    if (!MODE_CONTEXTS[modeKind]!.has(context)
      || !Object.hasOwn(CONTEXT_LABELS, context)) {
      throw new RangeError('Arena准备武器情境目标不能在当前模式形成证据。');
    }
    const counts = progress(
      weapon.currentProgress,
      weapon.targetProgress,
      'Arena准备武器情境目标',
    );
    const weaponFocusText = '武器目标：'
        + CONTEXT_LABELS[context as keyof typeof CONTEXT_LABELS]
        + counts.current + '/' + counts.target + '，'
        + assertNonEmptyString(
          weapon.practiceInstruction,
          'Arena准备武器情境目标.practiceInstruction',
        );
    learningParts.push(weaponFocusText);
    accessibilityLearningParts.push(weaponFocusText);
  }
  if (focus.mapSegmentFocus !== null) {
    const segmentFocus = exactRecord(
      focus.mapSegmentFocus,
      MAP_FOCUS_KEYS,
      'Arena准备地图路段目标',
    );
    const segmentDefinitionId = assertNonEmptyString(
      segmentFocus.segmentDefinitionId,
      'Arena准备地图路段目标.segmentDefinitionId',
    );
    const ordinal = assertIntegerAtLeast(
      segmentFocus.ordinal,
      1,
      'Arena准备地图路段目标.ordinal',
    );
    const segment = map.segments[ordinal - 1];
    if (segment === undefined || segment.segmentDefinitionId !== segmentDefinitionId) {
      throw new RangeError('Arena准备地图路段目标与内容目录顺序不闭合。');
    }
    const counts = progress(
      segmentFocus.currentProgress,
      segmentFocus.targetProgress,
      'Arena准备地图路段目标',
    );
    const displayName = ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      segment.nameMessageId,
    );
    const mapFocusText = '路线目标：第' + ordinal + '段·' + displayName
        + counts.current + '/' + counts.target + '，'
        + assertNonEmptyString(
          segmentFocus.practiceInstruction,
          'Arena准备地图路段目标.practiceInstruction',
        );
    learningParts.push(mapFocusText);
    accessibilityLearningParts.push(mapFocusText);
  }
  const suffix = '；' + learningParts.join('；');
  const accessibilitySuffix = '；' + accessibilityLearningParts.join('；');
  return Object.freeze({
    ownerId: parsedFields.ownerId,
    fieldValues: Object.freeze(parsedFields.fieldValues.map((field) => (
      field.fieldId !== targetFieldId
        ? field
        : Object.freeze({
          ...field,
          valueText: field.valueText + suffix,
          accessibilityText: field.accessibilityText + accessibilitySuffix + '。',
        })
    ))),
  });
}

export const ARENA_V2_PREPARATION_LEARNING_FOCUS_INFORMATION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  targetOwnerId: 'p5-mode-content' as const,
  competitiveTargetFieldId: 'weapon-map-plan' as const,
  survivalTargetFieldId: 'pressure-summary' as const,
  mapRouteSkeletonAlwaysVisibleBeforePrimaryAction: true as const,
  mapRouteSkeletonUsesSharedDetailDirectoryProjection: true as const,
  uniqueLongTermGoalFitVisibleBeforePrimaryAction: true as const,
  uniqueLongTermGoalFitReusesProgressionRouteFit: true as const,
  scopeCompletionIdentitySource: 'result-next-goal-route-fit' as const,
  freeChallengeUsesStableScopeCompletionGoalIds: true as const,
  nonFreeChallengeCannotClaimScopeCompletionGoalId: true as const,
  duplicatesScopeCompletionResolution: false as const,
  incompatibleCombinationDoesNotBlockFreeStart: true as const,
  conditionalSurvivalSupplyNeverPromisesSpawn: true as const,
  validatesTargetNumericLayoutByMode: true as const,
  addsPagesFieldsActionsOrTasks: false as const,
  mutatesProfileRewardSelectionOrAuthority: false as const,
});
