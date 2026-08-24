import {
  assertKnownKeys,
  assertPlainRecord,
  assertSynchronousReturn as rejectThenable,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaV2UiViewportV1,
  decodeArenaV2CanonicalIntentComponentV1,
  projectArenaV2NextLearningSignatureReadCandidateV1,
  resolveArenaV2InformationDetailAdjacentBrowseTargetsCandidateV1,
  type ArenaV2UiRenderPlanV1,
  type ArenaV2UiViewportV1,
  type ArenaV2ResultNewCollectionDetailItemCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1,
  type ArenaThreeModeAuthoritativeLocalInformationProjectionCandidateV1Options,
} from '@number-strategy-jump/arena-regression';

export const ARENA_V2_INFORMATION_LOCAL_SURFACE_BINDING_STATE_CANDIDATE_V1 =
  Object.freeze({
    CREATED: 'created',
    INFORMATION: 'information',
    MATCH: 'match',
    FAILED: 'failed',
    DISPOSED: 'disposed',
  } as const);

type BindingState = typeof ARENA_V2_INFORMATION_LOCAL_SURFACE_BINDING_STATE_CANDIDATE_V1[
  keyof typeof ARENA_V2_INFORMATION_LOCAL_SURFACE_BINDING_STATE_CANDIDATE_V1
];
type ModeKind = 'duel' | 'race' | 'survival';
type ResultDecision = 'play-again' | 'next-goal';
interface ContentSelection {
  readonly selectedWeaponDefinitionId?: string | null;
  readonly selectedMapDefinitionId?: string | null;
}
type ResultTargetScreenId =
  'home' | 'map-detail' | 'mode-select' | 'weapon-detail' | 'weapon-index';
interface ResultPrimaryRouteIdentity {
  readonly goalId: string | null;
  readonly targetScreenId: ResultTargetScreenId | null;
  readonly targetModeKind: ModeKind | null;
  readonly playAgainFitKind:
    'stable-current-combination' | 'conditional-survival-supply' | null;
}
type ResultPrimaryRecommendation = ResultPrimaryRouteIdentity & (Readonly<{
  readonly kind: 'play-again';
  readonly decision: ResultDecision;
  readonly nextWeaponDefinitionId: string | null;
  readonly nextWeaponDisplayName: string | null;
  readonly nextMapDefinitionId: string | null;
  readonly nextMapDisplayName: string | null;
}> | Readonly<{
  readonly kind: 'next-goal';
  readonly decision: 'next-goal';
  readonly nextWeaponDefinitionId: string | null;
  readonly nextWeaponDisplayName: string | null;
  readonly nextMapDefinitionId: string | null;
  readonly nextMapDisplayName: string | null;
}> | Readonly<{
  readonly kind: 'prepare-next-goal';
  readonly decision: 'next-goal';
  readonly nextWeaponDefinitionId: string | null;
  readonly nextWeaponDisplayName: string | null;
  readonly nextMapDefinitionId: string | null;
  readonly nextMapDisplayName: string | null;
}> | Readonly<{
  readonly kind: 'next-weapon';
  readonly decision: 'next-goal';
  readonly nextWeaponDefinitionId: string;
  readonly nextWeaponDisplayName: string;
  readonly nextMapDefinitionId: null;
  readonly nextMapDisplayName: null;
}> | Readonly<{
  readonly kind: 'next-map';
  readonly decision: 'next-goal';
  readonly nextWeaponDefinitionId: null;
  readonly nextWeaponDisplayName: null;
  readonly nextMapDefinitionId: string;
  readonly nextMapDisplayName: string;
}>);
type HomeContinuationRoute = ReturnType<
  ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1[
    'getInformationHomeNextGoalContinuationRouteRead'
  ]
>;
type FullCatalogReplayCombination = NonNullable<NonNullable<ReturnType<
  ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1[
    'getInformationCurrentScreenPipelineBundle'
  ]
>>['fullCatalogReplayCombination']>;
type BottomNavigationItem = 'start' | 'weapons' | 'maps' | 'records';
type ModePreparationTargetScreenId = 'match-prep' | 'survival-prep';
type CompetitivePreparationTargetScreenId =
  | 'mode-select'
  | 'character-select'
  | 'weapon-detail'
  | 'map-detail';
type SurvivalPreparationTargetScreenId =
  | 'mode-select'
  | 'character-select'
  | 'weapon-index'
  | 'map-detail';
type DetailDirectoryTargetScreenId = 'weapon-index' | 'map-index';
type DetailAdjacentSelectionKind = 'weapon' | 'map';
type ResultNewCollectionDetailSelection = Readonly<{
  readonly kind: 'weapon' | 'map';
  readonly selectedDefinitionId: string;
}>;
type SyncFunction = (...args: readonly unknown[]) => unknown;

interface InformationSurfacePort {
  load(): unknown;
  bindIntent(value: unknown): unknown;
  revealActionPrimitive?(primitiveId: unknown): unknown;
  revealPrimitive?(primitiveId: unknown): unknown;
  render(plan: ArenaV2UiRenderPlanV1): unknown;
  resize?(value: unknown): unknown;
  dispose(): unknown;
}

interface MatchSurfacePort {
  load(value: unknown): unknown;
  render(value: unknown): unknown;
  pause(): unknown;
  resume(): unknown;
  leave(): unknown;
  dispose(): unknown;
}

interface SurfaceViewportEnvelopeV1 {
  readonly layout: ArenaV2UiViewportV1;
  readonly pixelRatio: number;
}

const OPTION_KEYS = new Set([
  'host',
  'hostOwner',
  'surface',
  'matchSurface',
  'initialScreenId',
  'viewportProvider',
  'selectedModeKind',
  'selectedWeaponDefinitionId',
  'selectedMapDefinitionId',
  'resultDecision',
  'preferGoalAlignedResultRecommendation',
  'matchStartGuard',
  'weaponAvailabilityChangeProvider',
  'onSurfaceChange',
  'onRejected',
]);
const REQUIRED_OPTION_KEYS = Object.freeze([
  'host',
  'surface',
  'initialScreenId',
  'viewportProvider',
  'selectedModeKind',
  'resultDecision',
  'onSurfaceChange',
] as const);
const VIEWPORT_ENVELOPE_KEYS = new Set(['layout', 'pixelRatio']);
const CONTENT_SELECTION_KEYS = new Set([
  'selectedWeaponDefinitionId',
  'selectedMapDefinitionId',
]);
const MATCH_START_GUARD_DECISION_KEYS = new Set(['allowed', 'reason']);
const BOTTOM_NAVIGATION_PREFIX = 'arena.v2.bottom-navigation.';
const SELECTION_PREFIX = 'arena.v2.selection.';
const MODE_PREPARATION_LINK_PREFIX = 'arena.v2.mode-preparation-link.';
const MODE_CHARACTER_LINK_INTENT = 'arena.v2.mode-character-link.character-select';
const COMPETITIVE_PREPARATION_LINK_PREFIX =
  'arena.v2.competitive-preparation-link.';
const SURVIVAL_PREPARATION_LINK_PREFIX = 'arena.v2.survival-preparation-link.';
const DETAIL_DIRECTORY_LINK_PREFIX = 'arena.v2.detail-directory-link.';
const DETAIL_ADJACENT_LINK_PREFIX = 'arena.v2.detail-adjacent.';
const RESULT_NEW_COLLECTION_LINK_PREFIX = 'arena.v2.result-new-collection.';
const PRIMARY_START_INTENTS = new Set([
  'start-selected-mode',
  'start-prepared-match',
  'start-survival',
]);
function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function syncFunction(value: unknown, name: string): SyncFunction {
  if (typeof value !== 'function') throw new TypeError(`${name}必须是函数。`);
  return value as SyncFunction;
}

function boundDataMethod(target: unknown, key: string, name: string): SyncFunction {
  if ((typeof target !== 'object' || target === null) && typeof target !== 'function') {
    throw new TypeError(`${name}.${key}不存在。`);
  }
  const visited = new Set<object>();
  let cursor: object | null = target as object;
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) throw new TypeError(`${name}原型链无效。`);
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, key);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${key}必须是数据方法。`);
      }
      const method = descriptor.value as SyncFunction;
      return (...args: readonly unknown[]) => Reflect.apply(method, target, args);
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  throw new TypeError(`${name}.${key}不存在。`);
}

function modeKind(value: unknown): ModeKind {
  if (value !== 'duel' && value !== 'race' && value !== 'survival') {
    throw new RangeError('Arena V2 local surface selectedModeKind无效。');
  }
  return value;
}

function resultDecision(value: unknown): ResultDecision {
  if (value !== 'play-again' && value !== 'next-goal') {
    throw new RangeError('Arena V2 local surface resultDecision无效。');
  }
  return value;
}

function resultModeDisplayName(value: ModeKind): string {
  return value === 'duel' ? '常规1v1' : value === 'race' ? '竞速' : '生存';
}

function resultPreparationTargetDisplayName(
  definitionId: string | null,
  displayName: string | null,
  name: string,
): string | null {
  if ((definitionId === null) !== (displayName === null)) {
    throw new RangeError(`Arena V2结果页${name}身份与名称必须成对出现。`);
  }
  if (displayName !== null && displayName.trim().length === 0) {
    throw new RangeError(`Arena V2结果页${name}名称不能为空。`);
  }
  return displayName;
}

function resultExplicitNextGoalCopy(
  recommendation: Extract<ResultPrimaryRecommendation, { readonly kind: 'next-goal' }>,
  learningSignature: ReturnType<
    typeof projectArenaV2NextLearningSignatureReadCandidateV1
  >,
): Readonly<{
  readonly label: string;
  readonly accessibilityText: string;
}> {
  const targetWeaponDisplayName = resultPreparationTargetDisplayName(
    recommendation.nextWeaponDefinitionId,
    recommendation.nextWeaponDisplayName,
    '显式目标武器',
  );
  const targetMapDisplayName = resultPreparationTargetDisplayName(
    recommendation.nextMapDefinitionId,
    recommendation.nextMapDisplayName,
    '显式目标地图',
  );
  if (recommendation.targetScreenId === 'mode-select') {
    if (recommendation.targetModeKind === null) {
      throw new RangeError('Arena V2结果页显式目标模式确认缺少模式身份。');
    }
    const compactTargets = [resultModeDisplayName(recommendation.targetModeKind)];
    const accessibleTargets = [`${compactTargets[0]}模式`];
    if (targetWeaponDisplayName !== null) {
      compactTargets.push(targetWeaponDisplayName);
      accessibleTargets.push(`武器${targetWeaponDisplayName}`);
    }
    if (targetMapDisplayName !== null) {
      compactTargets.push(targetMapDisplayName);
      accessibleTargets.push(`地图${targetMapDisplayName}`);
    }
    const survivalWorldPickup = recommendation.targetModeKind === 'survival'
      && targetWeaponDisplayName === null
      && targetMapDisplayName !== null
      ? learningSignature?.weaponDisplayName !== null
        && learningSignature?.weaponDisplayName !== undefined
        ? `；生存仍然空手开局，目标武器${
          learningSignature.weaponDisplayName
        }需要在场上遇到后拾取`
        : '；生存仍然空手开局，复练建议中的武器需要在场上遇到后拾取'
      : '';
    return Object.freeze({
      label: `确认${compactTargets.join('＋')}`,
      accessibilityText:
        `确认长期目标组合：${accessibleTargets.join('、')}；进入模式确认页后不会自动开局`
        + survivalWorldPickup,
    });
  }
  if (recommendation.targetScreenId === 'weapon-detail') {
    if (targetWeaponDisplayName === null
      || learningSignature?.weaponDefinitionId !== recommendation.nextWeaponDefinitionId
      || learningSignature.weaponDisplayName !== targetWeaponDisplayName) {
      throw new RangeError('Arena V2结果页显式目标武器详情与学习签名漂移。');
    }
    return Object.freeze({
      label: `了解目标武器：${targetWeaponDisplayName}`,
      accessibilityText: `查看目标武器${targetWeaponDisplayName}详情。${
        learningSignature.accessibilityText
      }`,
    });
  }
  if (recommendation.targetScreenId === 'map-detail') {
    if (targetMapDisplayName === null
      || learningSignature?.mapDefinitionId !== recommendation.nextMapDefinitionId
      || learningSignature.mapDisplayName !== targetMapDisplayName) {
      throw new RangeError('Arena V2结果页显式目标地图详情与学习签名漂移。');
    }
    return Object.freeze({
      label: `了解目标地图：${targetMapDisplayName}`,
      accessibilityText: `查看目标地图${targetMapDisplayName}详情。${
        learningSignature.accessibilityText
      }`,
    });
  }
  if (recommendation.targetScreenId === 'weapon-index') {
    if (recommendation.nextWeaponDefinitionId !== null
      || learningSignature === null
      || learningSignature.weaponDefinitionId === null
      || learningSignature.weaponDisplayName === null) {
      throw new RangeError('Arena V2结果页未开放目标武器目录缺少学习签名。');
    }
    return Object.freeze({
      label: `查看目标武器：${learningSignature.weaponDisplayName}`,
      accessibilityText:
        `进入武器目录查看目标武器${learningSignature.weaponDisplayName}。${
          learningSignature.accessibilityText
        }`,
    });
  }
  if (recommendation.targetScreenId === 'home') {
    if (recommendation.targetModeKind !== null
      || recommendation.nextWeaponDefinitionId !== null
      || recommendation.nextMapDefinitionId !== null) {
      throw new RangeError('Arena V2结果页返回首页目标不得夹带选择。');
    }
    return Object.freeze({
      label: '返回首页继续',
      accessibilityText: '当前学习目录已完成，返回首页自由挑战或刷新个人记录',
    });
  }
  throw new RangeError('Arena V2结果页显式下一目标缺少可达页面。');
}

function resultPrimaryActionRenderPlan(
  plan: ArenaV2UiRenderPlanV1,
  recommendation: ResultPrimaryRecommendation,
  recovery: Readonly<{
    readonly retryRequired: boolean;
    readonly restartRequired: boolean;
  }>,
  selectedModeKind: ModeKind,
  currentSelection: Readonly<{
    readonly weaponDefinitionId: string | null;
    readonly mapDefinitionId: string | null;
  }>,
  learningGoalIdentity: Readonly<{
    readonly weaponDefinitionId: string | null;
    readonly mapDefinitionId: string | null;
    readonly segmentDefinitionId: string | null;
  }>,
): ArenaV2UiRenderPlanV1 {
  if (plan.identity !== 'result-reward') return plan;
  const recoveryPending = recovery.retryRequired || recovery.restartRequired;
  const learningSignature = recoveryPending
    ? null
    : projectArenaV2NextLearningSignatureReadCandidateV1(learningGoalIdentity);
  if (recommendation.kind === 'next-weapon'
    && (learningSignature?.weaponDefinitionId !== recommendation.nextWeaponDefinitionId
      || learningSignature.weaponDisplayName !== recommendation.nextWeaponDisplayName)) {
    throw new RangeError('Arena V2结果页下一把武器推荐与成长目标签名漂移。');
  }
  if (recommendation.kind === 'next-map'
    && (learningSignature?.mapDefinitionId !== recommendation.nextMapDefinitionId
      || learningSignature.mapDisplayName !== recommendation.nextMapDisplayName)) {
    throw new RangeError('Arena V2结果页下一张地图推荐与成长目标签名漂移。');
  }
  const preparationCopy = recommendation.kind !== 'prepare-next-goal'
    ? null
    : (() => {
      if (recommendation.targetScreenId !== 'mode-select'
        || recommendation.targetModeKind === null) {
        throw new RangeError('Arena V2结果页具体调整必须进入已有模式确认页。');
      }
      const targetWeaponDisplayName = resultPreparationTargetDisplayName(
        recommendation.nextWeaponDefinitionId,
        recommendation.nextWeaponDisplayName,
        '调整武器',
      );
      const targetMapDisplayName = resultPreparationTargetDisplayName(
        recommendation.nextMapDefinitionId,
        recommendation.nextMapDisplayName,
        '调整地图',
      );
      const compactTargets: string[] = [];
      const accessibleTargets: string[] = [];
      if (recommendation.targetModeKind !== selectedModeKind) {
        const modeDisplayName = resultModeDisplayName(recommendation.targetModeKind);
        compactTargets.push(modeDisplayName);
        accessibleTargets.push(`${modeDisplayName}模式`);
      }
      if (recommendation.nextWeaponDefinitionId !== null
        && recommendation.nextWeaponDefinitionId !== currentSelection.weaponDefinitionId) {
        if (targetWeaponDisplayName === null) {
          throw new RangeError('Arena V2结果页实际武器调整缺少名称。');
        }
        compactTargets.push(targetWeaponDisplayName);
        accessibleTargets.push(`武器${targetWeaponDisplayName}`);
      }
      if (recommendation.nextMapDefinitionId !== null
        && recommendation.nextMapDefinitionId !== currentSelection.mapDefinitionId) {
        if (targetMapDisplayName === null) {
          throw new RangeError('Arena V2结果页实际地图调整缺少名称。');
        }
        compactTargets.push(targetMapDisplayName);
        accessibleTargets.push(`地图${targetMapDisplayName}`);
      }
      if (compactTargets.length === 0) {
        throw new RangeError('Arena V2结果页具体调整路线没有实际选择变化。');
      }
      const survivalWorldPickup = recommendation.targetModeKind === 'survival'
        && recommendation.nextWeaponDefinitionId === null
        && learningSignature !== null
        && learningSignature.weaponDefinitionId !== null
        && learningSignature.weaponDisplayName !== null
        ? `；生存仍然空手开局，目标武器${
          learningSignature.weaponDisplayName
        }需要在场上遇到后拾取`
        : '';
      return Object.freeze({
        label: `调整为${compactTargets.join('＋')}`,
        accessibilityText:
          `按长期目标调整为${accessibleTargets.join('、')}后进入模式确认页；`
          + '不会自动开局，也不会直接开始不能稳定推进目标的组合'
          + survivalWorldPickup,
      });
    })();
  const explicitNextGoalCopy = recommendation.kind === 'next-goal'
    ? resultExplicitNextGoalCopy(recommendation, learningSignature)
    : null;
  const playAgainCopy = selectedModeKind === 'survival'
    ? Object.freeze({
      label: '同地图再来一局',
      accessibilityText:
        '使用当前生存模式和地图再来一局，仍然空手开局，在场上拾取武器',
      longTermGoalPrefix:
        '主动作是同地图再来一局，仍然空手开局。长期成长目标：',
    })
    : Object.freeze({
      label: '同组合再来一局',
      accessibilityText: '同组合再来一局，保留当前模式、武器和地图',
      longTermGoalPrefix: '主动作是同组合再来一局。长期成长目标：',
    });
  const copy = recovery.restartRequired
    ? Object.freeze({
      label: '需要重启',
      accessibilityText: '需要重启以完成结算确认',
    })
    : recovery.retryRequired
      ? Object.freeze({
        label: '重试结算',
        accessibilityText: '重试结算，成功后可以再来一局',
      })
      : recommendation.kind === 'next-weapon'
        ? Object.freeze({
          label: `了解下一把：${recommendation.nextWeaponDisplayName}`,
          accessibilityText:
            `当前武器已经加入收藏，查看并选择下一把武器${
              recommendation.nextWeaponDisplayName
            }。${learningSignature!.accessibilityText}。随后可以进入模式选择`,
        })
        : recommendation.kind === 'next-map'
          ? Object.freeze({
            label: `了解下一张：${recommendation.nextMapDisplayName}`,
            accessibilityText:
              `当前地图已经加入收藏，查看并选择下一张地图${
                recommendation.nextMapDisplayName
              }。${learningSignature!.accessibilityText}。随后可以进入模式选择`,
          })
          : recommendation.kind === 'prepare-next-goal'
            ? preparationCopy!
            : recommendation.kind === 'next-goal'
              ? explicitNextGoalCopy!
            : recommendation.decision === 'play-again'
              ? playAgainCopy
              : null;
  if (copy === null) return plan;
  let primaryActionCount = 0;
  let nextGoalLabelCount = 0;
  let nextGoalValueCount = 0;
  let learningSignatureValueCount = 0;
  const primitives = plan.primitives.map((primitive) => {
    if (primitive.kind === 'action' && primitive.id === 'primary-action') {
      primaryActionCount += 1;
      if (primitive.intentId !== 'play-again-or-next') {
        throw new RangeError('Arena V2结果页主动作意图无效。');
      }
      return Object.freeze({
        ...primitive,
        label: copy.label,
        accessibilityText: primitive.disabledReason === null
          ? copy.accessibilityText
          : `${copy.accessibilityText}，${primitive.disabledReason}`,
      });
    }
    if (!recoveryPending
      && learningSignature !== null
      && primitive.kind === 'text' && primitive.id === 'first:next-goal:value') {
      learningSignatureValueCount += 1;
      if (recommendation.decision === 'play-again') nextGoalValueCount += 1;
      return Object.freeze({
        ...primitive,
        text: `${primitive.text}｜${learningSignature.expandedText}`,
        accessibilityText: `${recommendation.decision === 'play-again'
          ? playAgainCopy.longTermGoalPrefix
          : ''}${primitive.accessibilityText}。${
          learningSignature.accessibilityText
        }。`,
      });
    }
    if (!recovery.retryRequired && !recovery.restartRequired
      && recommendation.decision === 'play-again'
      && primitive.kind === 'text' && primitive.id === 'first:next-goal:label') {
      nextGoalLabelCount += 1;
      return Object.freeze({
        ...primitive,
        text: '长期目标',
        accessibilityText: '长期成长目标',
      });
    }
    if (!recovery.retryRequired && !recovery.restartRequired
      && recommendation.decision === 'play-again'
      && primitive.kind === 'text' && primitive.id === 'first:next-goal:value') {
      nextGoalValueCount += 1;
      return Object.freeze({
        ...primitive,
        text: primitive.text,
        accessibilityText: `${playAgainCopy.longTermGoalPrefix}${
          primitive.accessibilityText
        }`,
      });
    }
    return primitive;
  });
  if (primaryActionCount !== 1) {
    throw new RangeError('Arena V2结果页必须精确包含一个主动作。');
  }
  if (!recoveryPending
    && learningSignature !== null && learningSignatureValueCount !== 1) {
    throw new RangeError('Arena V2结果页学习签名必须精确复用一个下一目标字段。');
  }
  if (!recovery.retryRequired && !recovery.restartRequired
    && recommendation.decision === 'play-again'
    && (nextGoalLabelCount !== 1 || nextGoalValueCount !== 1)) {
    throw new RangeError('Arena V2结果页复玩说明必须精确复用一个下一目标字段。');
  }
  return Object.freeze({
    ...plan,
    primitives: Object.freeze(primitives),
  });
}

function homeContinuationPrimaryActionRenderPlan(
  plan: ArenaV2UiRenderPlanV1,
  route: HomeContinuationRoute | null,
  fullCatalogReplayCombination: FullCatalogReplayCombination | null,
): ArenaV2UiRenderPlanV1 {
  if (plan.identity !== 'home') {
    if (route !== null || fullCatalogReplayCombination !== null) {
      throw new RangeError('Arena V2非首页不得携带续玩主动作路由或复练组合。');
    }
    return plan;
  }
  if (route === null) throw new RangeError('Arena V2首页缺少续玩主动作路由。');
  if (fullCatalogReplayCombination !== null
    && (route.goalId !== 'catalog-complete'
      || route.goalKind !== 'catalog-complete'
      || route.continuationKind !== 'free-choice')) {
    throw new RangeError('Arena V2首页复练组合与完整目录续玩路由漂移。');
  }
  const effectiveModeKind = fullCatalogReplayCombination?.modeKind
    ?? route.recommendedModeKind;
  const modeLabel = effectiveModeKind === 'duel'
    ? '常规1v1'
    : effectiveModeKind === 'race'
      ? '竞速'
      : effectiveModeKind === 'survival'
        ? '生存'
        : null;
  if (fullCatalogReplayCombination === null
    && (modeLabel === null) !== (route.continuationKind === 'free-choice')) {
    throw new RangeError('Arena V2首页续玩按钮模式与路由类别漂移。');
  }
  if (fullCatalogReplayCombination !== null && modeLabel === null) {
    throw new RangeError('Arena V2首页完整目录复练组合缺少有效模式。');
  }
  let primaryActionCount = 0;
  const primitives = plan.primitives.map((primitive) => {
    if (primitive.kind !== 'action' || primitive.id !== 'primary-action') return primitive;
    primaryActionCount += 1;
    if (primitive.intentId !== 'open-mode-select') {
      throw new RangeError('Arena V2首页续玩按钮必须复用选择模式意图。');
    }
    const cycleOrdinal = fullCatalogReplayCombination === null
      ? null
      : ((fullCatalogReplayCombination.mapRotationOrdinal - 1)
        * fullCatalogReplayCombination.eligibleWeaponCount)
        + fullCatalogReplayCombination.weaponRotationOrdinal;
    const cycleLength = fullCatalogReplayCombination
      ?.weaponMapRotationCycleLength ?? null;
    if (cycleOrdinal !== null
      && (cycleLength === null || cycleOrdinal < 1 || cycleOrdinal > cycleLength)) {
      throw new RangeError('Arena V2首页完整目录复练按钮周期位置越界。');
    }
    const label = cycleOrdinal === null
      ? modeLabel === null ? '选择模式' : `去${modeLabel}`
      : `准备复练 ${cycleOrdinal}/${cycleLength}`;
    const targetWeaponRequiresWorldPickup = fullCatalogReplayCombination
      ?.survivalWeaponRequiresWorldPickup ?? route.targetWeaponRequiresWorldPickup;
    const requiresTargetWeaponSelection = fullCatalogReplayCombination === null
      ? route.requiresTargetWeaponSelection
      : !targetWeaponRequiresWorldPickup;
    const requiresTargetMapSelection = fullCatalogReplayCombination === null
      ? route.requiresTargetMapSelection
      : true;
    const selectionSummary = targetWeaponRequiresWorldPickup
      ? requiresTargetMapSelection
        ? '进入模式确认页并预选目标地图，仍然空手开局，目标武器需在局内遇到后拾取'
        : '进入模式确认页，仍然空手开局，目标武器需在局内遇到后拾取'
      : requiresTargetWeaponSelection && requiresTargetMapSelection
        ? '进入模式确认页并预选目标武器和地图'
        : requiresTargetWeaponSelection
          ? '进入模式确认页并预选目标武器'
          : requiresTargetMapSelection
            ? '进入模式确认页并预选目标地图'
            : '进入模式确认页，不覆盖当前武器和地图';
    const accessibilityText = modeLabel === null
      ? '选择模式并确认下一局，不会自动开始比赛'
      : `${selectionSummary}；再次确认后才开始${modeLabel}，不会自动开局`;
    return Object.freeze({
      ...primitive,
      label,
      accessibilityText: primitive.disabledReason === null
        ? accessibilityText
        : `${accessibilityText}，${primitive.disabledReason}`,
    });
  });
  if (primaryActionCount !== 1) {
    throw new RangeError('Arena V2首页必须精确包含一个续玩主动作。');
  }
  return Object.freeze({ ...plan, primitives: Object.freeze(primitives) });
}

function bottomNavigationItem(intentId: string): BottomNavigationItem | null {
  if (!intentId.startsWith(BOTTOM_NAVIGATION_PREFIX)) return null;
  const item = intentId.slice(BOTTOM_NAVIGATION_PREFIX.length);
  if (item !== 'start' && item !== 'weapons' && item !== 'maps' && item !== 'records') {
    throw new RangeError(`Arena V2 local surface底部导航意图无效：${intentId}。`);
  }
  return item;
}

function informationSelectionIntent(intentId: string): Readonly<{
  readonly kind: 'mode' | 'character' | 'weapon' | 'map';
  readonly selectedId: string;
}> | null {
  if (!intentId.startsWith(SELECTION_PREFIX)) return null;
  const payload = intentId.slice(SELECTION_PREFIX.length);
  const separator = payload.indexOf('.');
  if (separator <= 0 || separator === payload.length - 1) {
    throw new RangeError(`Arena V2 local surface选择意图无效：${intentId}。`);
  }
  const kind = payload.slice(0, separator);
  if (kind !== 'mode' && kind !== 'character' && kind !== 'weapon' && kind !== 'map') {
    throw new RangeError(`Arena V2 local surface选择类型无效：${intentId}。`);
  }
  const selectedId = decodeArenaV2CanonicalIntentComponentV1(
    payload.slice(separator + 1),
  );
  return Object.freeze({ kind, selectedId });
}

function modePreparationTargetScreenId(
  intentId: string,
): ModePreparationTargetScreenId | null {
  if (!intentId.startsWith(MODE_PREPARATION_LINK_PREFIX)) return null;
  const target = intentId.slice(MODE_PREPARATION_LINK_PREFIX.length);
  if (target !== 'match-prep' && target !== 'survival-prep') {
    throw new RangeError(`Arena V2 local surface声明链接无效：${intentId}。`);
  }
  return target;
}

function competitivePreparationTargetScreenId(
  intentId: string,
): CompetitivePreparationTargetScreenId | null {
  if (!intentId.startsWith(COMPETITIVE_PREPARATION_LINK_PREFIX)) return null;
  const target = intentId.slice(COMPETITIVE_PREPARATION_LINK_PREFIX.length);
  if (target !== 'mode-select' && target !== 'character-select'
    && target !== 'weapon-detail'
    && target !== 'map-detail') {
    throw new RangeError(`Arena V2 local surface竞技准备链接无效：${intentId}。`);
  }
  return target;
}

function survivalPreparationTargetScreenId(
  intentId: string,
): SurvivalPreparationTargetScreenId | null {
  if (!intentId.startsWith(SURVIVAL_PREPARATION_LINK_PREFIX)) return null;
  const target = intentId.slice(SURVIVAL_PREPARATION_LINK_PREFIX.length);
  if (target !== 'mode-select' && target !== 'character-select'
    && target !== 'weapon-index'
    && target !== 'map-detail') {
    throw new RangeError(`Arena V2 local surface生存准备链接无效：${intentId}。`);
  }
  return target;
}

function detailDirectoryTargetScreenId(
  intentId: string,
): DetailDirectoryTargetScreenId | null {
  if (!intentId.startsWith(DETAIL_DIRECTORY_LINK_PREFIX)) return null;
  const target = intentId.slice(DETAIL_DIRECTORY_LINK_PREFIX.length);
  if (target !== 'weapon-index' && target !== 'map-index') {
    throw new RangeError(`Arena V2 local surface详情目录链接无效：${intentId}。`);
  }
  return target;
}

function detailAdjacentSelection(
  intentId: string,
): Readonly<{
  readonly kind: DetailAdjacentSelectionKind;
  readonly selectedDefinitionId: string;
}> | null {
  if (!intentId.startsWith(DETAIL_ADJACENT_LINK_PREFIX)) return null;
  const payload = intentId.slice(DETAIL_ADJACENT_LINK_PREFIX.length);
  const separator = payload.indexOf('.');
  if (separator <= 0 || separator === payload.length - 1) {
    throw new RangeError(`Arena V2 local surface详情连续浏览意图无效：${intentId}。`);
  }
  const kind = payload.slice(0, separator);
  if (kind !== 'weapon' && kind !== 'map') {
    throw new RangeError(`Arena V2 local surface详情连续浏览类型无效：${intentId}。`);
  }
  const selectedDefinitionId = decodeArenaV2CanonicalIntentComponentV1(
    payload.slice(separator + 1),
  );
  return Object.freeze({ kind, selectedDefinitionId });
}

function resultNewCollectionDetailSelection(
  intentId: string,
): ResultNewCollectionDetailSelection | null {
  if (!intentId.startsWith(RESULT_NEW_COLLECTION_LINK_PREFIX)) return null;
  const payload = intentId.slice(RESULT_NEW_COLLECTION_LINK_PREFIX.length);
  const separator = payload.indexOf('.');
  if (separator <= 0 || separator === payload.length - 1) {
    throw new RangeError(`Arena V2 local surface本局新收藏详情意图无效：${intentId}。`);
  }
  const kind = payload.slice(0, separator);
  if (kind !== 'weapon' && kind !== 'map') {
    throw new RangeError(`Arena V2 local surface本局新收藏详情类型无效：${intentId}。`);
  }
  const selectedDefinitionId = decodeArenaV2CanonicalIntentComponentV1(
    payload.slice(separator + 1),
  );
  return Object.freeze({ kind, selectedDefinitionId });
}

function surfacePort(value: unknown): InformationSurfacePort {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Arena V2 local surface需要同步Surface端口。');
  }
  const target = value as InformationSurfacePort;
  syncFunction(target.load, 'Arena V2 local surface.load');
  syncFunction(target.bindIntent, 'Arena V2 local surface.bindIntent');
  syncFunction(target.render, 'Arena V2 local surface.render');
  syncFunction(target.dispose, 'Arena V2 local surface.dispose');
  if (target.revealActionPrimitive !== undefined) {
    syncFunction(
      target.revealActionPrimitive,
      'Arena V2 local surface.revealActionPrimitive',
    );
  }
  if (target.revealPrimitive !== undefined) {
    syncFunction(
      target.revealPrimitive,
      'Arena V2 local surface.revealPrimitive',
    );
  }
  if (target.resize !== undefined) syncFunction(target.resize, 'Arena V2 local surface.resize');
  return target;
}

function matchSurfacePort(value: unknown): MatchSurfacePort {
  return Object.freeze({
    load: boundDataMethod(value, 'load', 'Arena V2 local match surface'),
    render: boundDataMethod(value, 'render', 'Arena V2 local match surface'),
    pause: boundDataMethod(value, 'pause', 'Arena V2 local match surface'),
    resume: boundDataMethod(value, 'resume', 'Arena V2 local match surface'),
    leave: boundDataMethod(value, 'leave', 'Arena V2 local match surface'),
    dispose: boundDataMethod(value, 'dispose', 'Arena V2 local match surface'),
  });
}

function viewportEnvelope(value: unknown): SurfaceViewportEnvelopeV1 {
  const source = assertPlainRecord(value, 'Arena V2 local surface viewport envelope');
  assertKnownKeys(source, VIEWPORT_ENVELOPE_KEYS, 'Arena V2 local surface viewport envelope');
  for (const key of VIEWPORT_ENVELOPE_KEYS) dataField(source, key, 'Arena V2 local surface viewport envelope');
  if (typeof source.pixelRatio !== 'number' || !Number.isFinite(source.pixelRatio)
    || source.pixelRatio <= 0) {
    throw new RangeError('Arena V2 local surface pixelRatio必须是有限正数。');
  }
  return Object.freeze({
    layout: createArenaV2UiViewportV1(source.layout),
    pixelRatio: source.pixelRatio,
  });
}

function contentSelection(
  value: unknown,
): ContentSelection {
  const source = assertPlainRecord(value, 'Arena V2 local surface content selection');
  assertKnownKeys(source, CONTENT_SELECTION_KEYS, 'Arena V2 local surface content selection');
  for (const key of Object.keys(source)) dataField(source, key, 'Arena V2 local surface content selection');
  const selectedWeaponDefinitionId = source.selectedWeaponDefinitionId;
  const selectedMapDefinitionId = source.selectedMapDefinitionId;
  if (selectedWeaponDefinitionId !== undefined
    && selectedWeaponDefinitionId !== null
    && typeof selectedWeaponDefinitionId !== 'string') {
    throw new TypeError('Arena V2 local surface selectedWeaponDefinitionId必须是string或null。');
  }
  if (selectedMapDefinitionId !== undefined
    && selectedMapDefinitionId !== null
    && typeof selectedMapDefinitionId !== 'string') {
    throw new TypeError('Arena V2 local surface selectedMapDefinitionId必须是string或null。');
  }
  return Object.freeze({
    ...(selectedWeaponDefinitionId === undefined
      ? {}
      : { selectedWeaponDefinitionId }),
    ...(selectedMapDefinitionId === undefined
      ? {}
      : { selectedMapDefinitionId }),
  });
}

function matchStartGuardDecision(value: unknown): Readonly<{
  readonly allowed: boolean;
  readonly reason: string;
}> {
  const source = assertPlainRecord(value, 'Arena V2 local surface match start guard decision');
  assertKnownKeys(
    source,
    MATCH_START_GUARD_DECISION_KEYS,
    'Arena V2 local surface match start guard decision',
  );
  for (const key of MATCH_START_GUARD_DECISION_KEYS) {
    dataField(source, key, 'Arena V2 local surface match start guard decision');
  }
  if (typeof source.allowed !== 'boolean') {
    throw new TypeError('Arena V2 local surface match start guard.allowed必须是布尔值。');
  }
  if (typeof source.reason !== 'string' || source.reason.trim().length === 0) {
    throw new TypeError('Arena V2 local surface match start guard.reason不能为空。');
  }
  return Object.freeze({ allowed: source.allowed, reason: source.reason });
}

export class ArenaV2InformationLocalPlayableSurfaceBindingCandidateV1 {
  readonly #host: ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1;
  readonly #destroyHostOwner: SyncFunction;
  readonly #surface: InformationSurfacePort;
  readonly #matchSurface: MatchSurfacePort | null;
  readonly #initialScreenId: 'loading' | 'home';
  readonly #viewportProvider: SyncFunction;
  readonly #onSurfaceChange: SyncFunction;
  readonly #onRejected: SyncFunction | null;
  readonly #matchStartGuard: SyncFunction | null;
  readonly #weaponAvailabilityChangeProvider: SyncFunction | null;
  #preferGoalAlignedResultRecommendation: boolean;
  #selectedModeKind: ModeKind;
  #selection: ContentSelection;
  #resultDecision: ResultDecision;
  #unbindIntent: (() => void) | null = null;
  #state: BindingState = 'created';
  #transitioning = false;
  #transitionOperation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #transitionFailure: unknown = null;
  #lastRenderPlan: ArenaV2UiRenderPlanV1 | null = null;
  #lastRenderedResultPrimaryRecommendation: ResultPrimaryRecommendation | null = null;
  #lastRenderedResultNewCollectionDetailItems:
    readonly ArenaV2ResultNewCollectionDetailItemCandidateV1[] = Object.freeze([]);
  #lastRenderedHomeContinuationRoute: HomeContinuationRoute | null = null;
  #lastRenderedFullCatalogReplayCombination: FullCatalogReplayCombination | null = null;
  #matchDriverStart: SyncFunction | null = null;
  #matchSurfaceLoaded = false;
  #matchSurfaceActive = false;
  #surfaceDisposed = false;
  #matchSurfaceDisposed = false;
  #hostOwnerDestroyed = false;

  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'Arena V2 local playable surface binding options');
    assertKnownKeys(source, OPTION_KEYS, 'Arena V2 local playable surface binding options');
    for (const key of REQUIRED_OPTION_KEYS) {
      if (!Object.hasOwn(source, key)) {
        throw new TypeError(`Arena V2 local playable surface binding缺少${key}。`);
      }
    }
    for (const key of Object.keys(source)) {
      dataField(source, key, 'Arena V2 local playable surface binding options');
    }
    if (!(source.host instanceof ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1)) {
      throw new TypeError('Arena V2 local playable surface binding需要本地三模式Host。');
    }
    if (source.initialScreenId !== 'loading' && source.initialScreenId !== 'home') {
      throw new RangeError('Arena V2 local playable surface initialScreenId只能是loading或home。');
    }
    this.#host = source.host;
    this.#destroyHostOwner = source.hostOwner === undefined
      ? boundDataMethod(source.host, 'destroy', 'Arena V2 local playable host owner')
      : boundDataMethod(source.hostOwner, 'destroy', 'Arena V2 local playable host owner');
    this.#surface = surfacePort(source.surface);
    this.#matchSurface = source.matchSurface === undefined
      ? null
      : matchSurfacePort(source.matchSurface);
    this.#initialScreenId = source.initialScreenId;
    this.#viewportProvider = syncFunction(
      source.viewportProvider,
      'Arena V2 local playable surface viewportProvider',
    );
    this.#selectedModeKind = modeKind(source.selectedModeKind);
    this.#selection = contentSelection({
      ...(source.selectedWeaponDefinitionId === undefined
        ? {}
        : { selectedWeaponDefinitionId: source.selectedWeaponDefinitionId }),
      ...(source.selectedMapDefinitionId === undefined
        ? {}
        : { selectedMapDefinitionId: source.selectedMapDefinitionId }),
    });
    this.#resultDecision = resultDecision(source.resultDecision);
    if (source.preferGoalAlignedResultRecommendation !== undefined
      && typeof source.preferGoalAlignedResultRecommendation !== 'boolean') {
      throw new TypeError(
        'Arena V2 local surface preferGoalAlignedResultRecommendation必须是布尔值。',
      );
    }
    this.#preferGoalAlignedResultRecommendation =
      source.preferGoalAlignedResultRecommendation === true;
    this.#matchStartGuard = source.matchStartGuard === undefined
      ? null
      : syncFunction(
        source.matchStartGuard,
        'Arena V2 local playable surface matchStartGuard',
      );
    this.#weaponAvailabilityChangeProvider =
      !Object.hasOwn(source, 'weaponAvailabilityChangeProvider')
        ? null
        : syncFunction(
          dataField(
            source,
            'weaponAvailabilityChangeProvider',
            'Arena V2 local playable surface binding options',
          ),
          'Arena V2 local playable surface weaponAvailabilityChangeProvider',
        );
    this.#onSurfaceChange = syncFunction(
      source.onSurfaceChange,
      'Arena V2 local playable surface onSurfaceChange',
    );
    this.#onRejected = source.onRejected === undefined
      ? null
      : syncFunction(source.onRejected, 'Arena V2 local playable surface onRejected');
    Object.freeze(this);
  }

  get state(): BindingState {
    this.#assertNoTransition('Arena V2 local playable surface state read');
    return this.#state;
  }
  get lastRenderPlan(): ArenaV2UiRenderPlanV1 | null {
    this.#assertNoTransition('Arena V2 local playable surface last render plan read');
    return this.#lastRenderPlan;
  }

  #assertLive(operation: string): void {
    this.#assertNoTransition(operation);
    if (this.#state === 'failed' || this.#state === 'disposed') {
      throw new Error(`${operation}拒绝当前状态${this.#state}。`);
    }
  }

  #assertNoTransition(operation: string): void {
    if (!this.#transitioning) return;
    const error = new Error(
      `${operation}不可在${this.#transitionOperation ?? 'unknown'}事务期间重入。`,
    );
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #beginTransition(operation: string): void {
    this.#assertNoTransition(operation);
    this.#transitioning = true;
    this.#transitionOperation = operation;
    this.#reentryError = null;
    this.#transitionFailure = null;
  }

  #assertTransitionCommit(): void {
    if (!this.#transitioning || this.#transitionOperation === null) {
      throw new Error('Arena V2 local playable surface缺少当前事务所有权。');
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #endTransition(operation: string, intentId: string | null): void {
    const reentryError = this.#reentryError;
    const transitionFailure = this.#transitionFailure;
    if (reentryError === null) {
      this.#transitioning = false;
      this.#transitionOperation = null;
      this.#transitionFailure = null;
      return;
    }
    const failure = transitionFailure === null || transitionFailure === reentryError
      ? reentryError
      : new AggregateError(
        [transitionFailure, reentryError],
        `${operation}失败且检测到同步重入。`,
      );
    try {
      if (this.#state === 'disposed') {
        this.#state = 'failed';
        throw failure;
      }
      if (this.#state === 'failed') throw failure;
      this.#reject(failure, intentId);
    } finally {
      this.#transitioning = false;
      this.#transitionOperation = null;
      this.#reentryError = null;
      this.#transitionFailure = null;
    }
  }

  #runTransition<T>(
    operation: string,
    intentId: string | null,
    rejectOnFailure: boolean,
    action: () => T,
  ): T {
    this.#beginTransition(operation);
    try {
      const result = action();
      this.#assertTransitionCommit();
      return result;
    } catch (error) {
      this.#transitionFailure ??= error;
      if (rejectOnFailure && this.#state !== 'failed' && this.#state !== 'disposed') {
        return this.#reject(error, intentId);
      }
      throw error;
    } finally {
      this.#endTransition(operation, intentId);
    }
  }

  #viewport(): SurfaceViewportEnvelopeV1 {
    const value = this.#viewportProvider();
    rejectThenable(value, 'Arena V2 local playable surface viewportProvider');
    this.#assertTransitionCommit();
    return viewportEnvelope(value);
  }

  #informationProjectionOptions():
  ArenaThreeModeAuthoritativeLocalInformationProjectionCandidateV1Options {
    if (this.#weaponAvailabilityChangeProvider === null) return this.#selection;
    const weaponAvailabilityChange = this.#weaponAvailabilityChangeProvider();
    rejectThenable(
      weaponAvailabilityChange,
      'Arena V2 local playable surface weaponAvailabilityChangeProvider',
    );
    this.#assertTransitionCommit();
    return Object.freeze({ ...this.#selection, weaponAvailabilityChange });
  }

  #resultPrimaryRecommendation(
    isResultScreen: boolean,
    primaryRecommendation: ResultPrimaryRecommendation | null,
    nextGoalRecommendation: ResultPrimaryRecommendation | null,
  ): ResultPrimaryRecommendation {
    if (!isResultScreen) {
      return Object.freeze({
        kind: 'play-again' as const,
        decision: 'play-again' as const,
        goalId: null,
        targetScreenId: null,
        targetModeKind: null,
        playAgainFitKind: null,
        nextWeaponDefinitionId: null,
        nextWeaponDisplayName: null,
        nextMapDefinitionId: null,
        nextMapDisplayName: null,
      });
    }
    if (this.#resultDecision === 'next-goal') {
      if (nextGoalRecommendation === null) {
        throw new Error('Arena V2结果页缺少同批次显式下一目标推荐。');
      }
      return nextGoalRecommendation;
    }
    if (!this.#preferGoalAlignedResultRecommendation) {
      return Object.freeze({
        kind: 'play-again' as const,
        decision: 'play-again' as const,
        goalId: null,
        targetScreenId: null,
        targetModeKind: null,
        playAgainFitKind: null,
        nextWeaponDefinitionId: null,
        nextWeaponDisplayName: null,
        nextMapDefinitionId: null,
        nextMapDisplayName: null,
      });
    }
    if (primaryRecommendation === null) {
      throw new Error('Arena V2结果页缺少同批次默认推荐。');
    }
    return primaryRecommendation;
  }

  #bindSurfaceIntent(): void {
    if (this.#unbindIntent !== null) return;
    const unbind = this.#surface.bindIntent({
      onIntent: this.#handleIntent,
      onRejected: this.#handleRejected,
    });
    rejectThenable(unbind, 'Arena V2 local playable surface.bindIntent');
    this.#assertTransitionCommit();
    if (typeof unbind !== 'function') {
      throw new TypeError('Arena V2 local playable surface.bindIntent必须返回解绑函数。');
    }
    this.#unbindIntent = unbind as () => void;
  }

  #unbindSurfaceIntent(): void {
    if (this.#unbindIntent === null) return;
    const unbind = this.#unbindIntent;
    rejectThenable(unbind(), 'Arena V2 local playable surface unbindIntent');
    this.#assertTransitionCommit();
    if (this.#unbindIntent === unbind) this.#unbindIntent = null;
  }

  #renderCurrent(): ArenaV2UiRenderPlanV1 | null {
    this.#assertTransitionCommit();
    const view = this.#viewport();
    if (this.#surface.resize !== undefined) {
      rejectThenable(this.#surface.resize({
        width: view.layout.width,
        height: view.layout.height,
        pixelRatio: view.pixelRatio,
      }), 'Arena V2 local playable surface.resize');
      this.#assertTransitionCommit();
    }
    const informationProjectionOptions = this.#informationProjectionOptions();
    const pipelineBundle = this.#host.getInformationCurrentScreenPipelineBundle(
      view.layout,
      informationProjectionOptions,
    );
    this.#assertTransitionCommit();
    if (pipelineBundle === null) {
      this.#unbindSurfaceIntent();
      this.#lastRenderPlan = null;
      this.#lastRenderedResultPrimaryRecommendation = null;
      this.#lastRenderedResultNewCollectionDetailItems = Object.freeze([]);
      this.#lastRenderedHomeContinuationRoute = null;
      this.#lastRenderedFullCatalogReplayCombination = null;
      this.#state = 'match';
      return null;
    }
    const {
      pipeline,
      homeContinuationRoute,
      fullCatalogReplayCombination,
      learningSettlementRecovery: recovery,
      nextLearningGoal,
      resultPrimaryRecommendation,
      resultNextGoalRecommendation,
      resultNewCollectionDetailItems,
    } = pipelineBundle;
    const recommendation = recovery.retryRequired || recovery.restartRequired
      ? Object.freeze({
        kind: 'play-again' as const,
        decision: this.#resultDecision,
        goalId: null,
        targetScreenId: null,
        targetModeKind: null,
        playAgainFitKind: null,
        nextWeaponDefinitionId: null,
        nextWeaponDisplayName: null,
        nextMapDefinitionId: null,
        nextMapDisplayName: null,
      })
      : this.#resultPrimaryRecommendation(
        pipeline.renderPlan.identity === 'result-reward',
        resultPrimaryRecommendation,
        resultNextGoalRecommendation,
      );
    const resultLearningGoalIdentity = pipeline.renderPlan.identity !== 'result-reward'
      || recovery.retryRequired || recovery.restartRequired
      ? Object.freeze({
        weaponDefinitionId: null,
        mapDefinitionId: null,
        segmentDefinitionId: null,
      })
      : Object.freeze({
        weaponDefinitionId: nextLearningGoal.weaponDefinitionId,
        mapDefinitionId: nextLearningGoal.mapDefinitionId,
        segmentDefinitionId: nextLearningGoal.segmentDefinitionId,
      });
    const renderedHomeReplayCombination = pipeline.renderPlan.identity === 'home'
      ? fullCatalogReplayCombination
      : null;
    const renderPlan = homeContinuationPrimaryActionRenderPlan(
      resultPrimaryActionRenderPlan(
        pipeline.renderPlan,
        recommendation,
        recovery,
        this.#selectedModeKind,
        Object.freeze({
          weaponDefinitionId: this.#selection.selectedWeaponDefinitionId ?? null,
          mapDefinitionId: this.#selection.selectedMapDefinitionId ?? null,
        }),
        resultLearningGoalIdentity,
      ),
      homeContinuationRoute,
      renderedHomeReplayCombination,
    );
    if ((homeContinuationRoute !== null) !== (renderPlan.identity === 'home')) {
      throw new RangeError('Arena V2首页续玩路由与页面流水线身份发生漂移。');
    }
    rejectThenable(
      this.#surface.render(renderPlan),
      'Arena V2 local playable surface.render',
    );
    this.#assertTransitionCommit();
    this.#bindSurfaceIntent();
    this.#assertTransitionCommit();
    this.#lastRenderPlan = renderPlan;
    this.#lastRenderedResultPrimaryRecommendation = renderPlan.identity === 'result-reward'
      ? recommendation
      : null;
    this.#lastRenderedResultNewCollectionDetailItems = renderPlan.identity === 'result-reward'
      ? Object.freeze([...(resultNewCollectionDetailItems ?? [])])
      : Object.freeze([]);
    this.#lastRenderedHomeContinuationRoute = homeContinuationRoute;
    this.#lastRenderedFullCatalogReplayCombination = renderedHomeReplayCombination;
    this.#state = 'information';
    return renderPlan;
  }

  #notifySurface(surface: 'information' | 'match', outcome: unknown): void {
    rejectThenable(
      this.#onSurfaceChange(Object.freeze({ surface, outcome })),
      'Arena V2 local playable surface onSurfaceChange',
    );
    this.#assertTransitionCommit();
  }

  #revealCurrentDirectorySelection(
    targetScreenId: DetailDirectoryTargetScreenId,
    renderPlan: ArenaV2UiRenderPlanV1,
  ): void {
    if (this.#surface.revealActionPrimitive === undefined) return;
    const kind = targetScreenId === 'weapon-index' ? 'weapon' : 'map';
    const prefix = `selection:${kind}:`;
    const matches = renderPlan.primitives.filter((primitive) => (
      primitive.kind === 'action'
      && primitive.id.startsWith(prefix)
      && primitive.id.endsWith(':action')
      && !primitive.enabled
      && primitive.disabledReason === '已选择'
    ));
    if (matches.length !== 1 || matches[0]!.kind !== 'action') {
      throw new Error(`Arena V2 local surface返回${targetScreenId}后的选择动作身份漂移。`);
    }
    rejectThenable(
      this.#surface.revealActionPrimitive(matches[0]!.id),
      'Arena V2 local playable surface.revealActionPrimitive',
    );
    this.#assertTransitionCommit();
  }

  #revealFocusedInformationField(
    fieldId: 'recent-records',
    renderPlan: ArenaV2UiRenderPlanV1,
  ): void {
    if (this.#surface.revealPrimitive === undefined) {
      throw new Error('Arena V2 local surface不支持记录字段显示请求。');
    }
    const primitiveId = `deferred:${fieldId}:value`;
    const matches = renderPlan.primitives.filter((primitive) => (
      primitive.kind === 'text' && primitive.id === primitiveId
    ));
    if (matches.length !== 1) {
      throw new Error(`Arena V2 local surface记录字段${fieldId}的显示身份漂移。`);
    }
    rejectThenable(
      this.#surface.revealPrimitive(primitiveId),
      'Arena V2 local playable surface.revealPrimitive',
    );
    this.#assertTransitionCommit();
  }

  #assertNoSettlementRestartRequired(operation: string): void {
    const recovery = this.#host.getLearningSettlementRecoveryRead();
    this.#assertTransitionCommit();
    if (recovery.restartRequired) {
      throw new Error(`${operation}已失败关闭；请重启以完成结算确认。`);
    }
  }

  #assertNoPendingSettlementMutation(operation: string): void {
    const recovery = this.#host.getLearningSettlementRecoveryRead();
    this.#assertTransitionCommit();
    if (recovery.restartRequired) {
      throw new Error(`${operation}已失败关闭；请重启以完成结算确认。`);
    }
    if (recovery.retryRequired) {
      throw new Error(`${operation}拒绝待恢复结算；请先在结果页完成安全重试。`);
    }
  }

  #matchSurfaceEnvelope(outcome: unknown): Readonly<{
    readonly scene: unknown;
    readonly hud: unknown;
  }> {
    const source = assertPlainRecord(outcome, 'Arena V2 local match surface outcome');
    return Object.freeze({
      scene: dataField(source, 'scene', 'Arena V2 local match surface outcome'),
      hud: dataField(source, 'hud', 'Arena V2 local match surface outcome'),
    });
  }

  #renderMatchSurface(outcome: unknown): void {
    if (this.#matchSurface === null) return;
    const envelope = this.#matchSurfaceEnvelope(outcome);
    if (!this.#matchSurfaceLoaded) {
      rejectThenable(
        this.#matchSurface.load(envelope),
        'Arena V2 local match surface.load',
      );
      this.#assertTransitionCommit();
      this.#matchSurfaceLoaded = true;
    }
    rejectThenable(
      this.#matchSurface.render(envelope),
      'Arena V2 local match surface.render',
    );
    this.#assertTransitionCommit();
    this.#matchSurfaceActive = true;
  }

  #leaveMatchSurface(): void {
    if (this.#matchSurface === null || !this.#matchSurfaceActive) return;
    rejectThenable(this.#matchSurface.leave(), 'Arena V2 local match surface.leave');
    this.#assertTransitionCommit();
    this.#matchSurfaceActive = false;
  }

  #runCleanupStep(
    label: string,
    run: () => void,
    commit: () => void,
    errors: unknown[],
  ): boolean {
    const reentrySequence = this.#reentrySequence;
    try {
      run();
      if (this.#reentrySequence !== reentrySequence) {
        const error = this.#reentryError ?? new Error(`${label}清理期间发生同步重入。`);
        errors.push(error);
        this.#transitionFailure ??= error;
        return false;
      }
      commit();
      return true;
    } catch (error) {
      errors.push(error);
      if (this.#reentrySequence !== reentrySequence) {
        this.#transitionFailure ??= error;
      }
      return false;
    }
  }

  #cleanup(): readonly unknown[] {
    const errors: unknown[] = [];
    if (this.#unbindIntent !== null) {
      const unbind = this.#unbindIntent;
      if (!this.#runCleanupStep(
        'Arena V2 local playable surface intent binding',
        () => rejectThenable(
          unbind(),
          'Arena V2 local playable surface cleanup unbindIntent',
        ),
        () => { if (this.#unbindIntent === unbind) this.#unbindIntent = null; },
        errors,
      )) return Object.freeze(errors);
    }
    if (this.#unbindIntent === null && !this.#surfaceDisposed) {
      if (!this.#runCleanupStep(
        'Arena V2 local information surface',
        () => rejectThenable(this.#surface.dispose(), 'Arena V2 local surface.dispose'),
        () => { this.#surfaceDisposed = true; },
        errors,
      )) return Object.freeze(errors);
    }
    if (this.#surfaceDisposed && !this.#hostOwnerDestroyed) {
      if (!this.#runCleanupStep(
        'Arena V2 local playable host owner',
        () => rejectThenable(
          this.#destroyHostOwner(),
          'Arena V2 local playable host owner.destroy',
        ),
        () => { this.#hostOwnerDestroyed = true; },
        errors,
      )) return Object.freeze(errors);
    }
    if (this.#surfaceDisposed
      && this.#hostOwnerDestroyed
      && this.#matchSurface !== null
      && !this.#matchSurfaceDisposed) {
      if (!this.#runCleanupStep(
        'Arena V2 local match surface',
        () => rejectThenable(
          this.#matchSurface!.dispose(),
          'Arena V2 local match surface.dispose',
        ),
        () => {
          this.#matchSurfaceDisposed = true;
          this.#matchSurfaceLoaded = false;
          this.#matchSurfaceActive = false;
        },
        errors,
      )) return Object.freeze(errors);
    }
    this.#matchDriverStart = null;
    return Object.freeze(errors);
  }

  #reject(error: unknown, intentId: string | null): never {
    if (this.#transitioning) this.#transitionFailure ??= error;
    this.#state = 'failed';
    const cleanupSequence = this.#reentrySequence;
    const cleanupErrors = this.#cleanup();
    if (this.#reentrySequence !== cleanupSequence) {
      throw new AggregateError(
        cleanupErrors.length === 0 ? [error] : [error, ...cleanupErrors],
        'Arena V2 local playable surface失败清理期间发生同步重入。',
      );
    }
    if (this.#onRejected !== null) {
      const observerSequence = this.#reentrySequence;
      try {
        rejectThenable(
          this.#onRejected(error, intentId),
          'Arena V2 local playable surface onRejected',
        );
        if (this.#reentrySequence !== observerSequence) {
          throw this.#reentryError
            ?? new Error('Arena V2 local playable surface onRejected期间发生同步重入。');
        }
      } catch (rejectedHandlerError) {
        throw new AggregateError(
          [error, ...cleanupErrors, rejectedHandlerError],
          'Arena V2 local playable surface失败且错误回调失败。',
        );
      }
    }
    throw cleanupErrors.length === 0
      ? error
      : new AggregateError(
        [error, ...cleanupErrors],
        'Arena V2 local playable surface失败且清理不完整。',
      );
  }

  readonly #handleRejected = (error: unknown, intentId: string | null): never => {
    if (this.#state === 'failed' || this.#state === 'disposed') throw error;
    return this.#reject(error, intentId);
  };

  readonly #handleIntent = (intentValue: unknown): void => {
    const intentId = typeof intentValue === 'string' ? intentValue : '';
    this.#assertLive('Arena V2 local playable surface intent');
    if (intentId.length === 0) throw new TypeError('Arena V2 local playable surface intentId不能为空。');
    this.#beginTransition('Arena V2 local playable surface intent');
    let transitionSucceeded = false;
    try {
      const interactionGate = this.#host.getInformationInteractionGateRead();
      const information = interactionGate.information;
      const screenId = information.navigation.currentScreenId;
      if (screenId === null) throw new Error('Arena V2 local playable surface intent缺少当前页。');
      const recoveryAtIntentStart = interactionGate.learningSettlementRecovery;
      if (recoveryAtIntentStart.restartRequired) {
        const rendered = this.#renderCurrent();
        this.#notifySurface(rendered === null ? 'match' : 'information', Object.freeze({
          status: 'interaction-blocked' as const,
          reason: 'settlement-confirmation-restart-required' as const,
        }));
        transitionSucceeded = true;
        return;
      }
      if (recoveryAtIntentStart.retryRequired
        && !(screenId === 'result-reward' && intentId === 'play-again-or-next')
        && !(screenId === 'home'
          && intentId === 'open-mode-select'
          && recoveryAtIntentStart.startupRecoveryStatus
            === 'recovery-retry-required')) {
        const rendered = this.#renderCurrent();
        this.#notifySurface(rendered === null ? 'match' : 'information', Object.freeze({
          status: 'interaction-blocked' as const,
          reason: 'settlement-recovery-pending' as const,
        }));
        transitionSucceeded = true;
        return;
      }
      if (screenId === 'home'
        && intentId === 'open-mode-select'
        && recoveryAtIntentStart.startupRecoveryStatus
          === 'recovery-retry-required') {
        try {
          this.#host.retryLearningSettlementProjectionRecovery();
        } catch (error) {
          let recoveryAfterFailure: ReturnType<
            ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1[
              'getLearningSettlementRecoveryRead'
            ]
          >;
          try {
            recoveryAfterFailure = this.#host.getLearningSettlementRecoveryRead();
          } catch {
            throw error;
          }
          if (!recoveryAfterFailure.retryRequired
            && !recoveryAfterFailure.restartRequired) {
            throw error;
          }
          const rendered = this.#renderCurrent();
          this.#notifySurface(rendered === null ? 'match' : 'information', Object.freeze({
            status: recoveryAfterFailure.restartRequired
              ? 'settlement-restart-required' as const
              : 'learning-settlement-recovery-deferred' as const,
            settlement: null,
          }));
          transitionSucceeded = true;
          return;
        }
      }
      if (screenId === 'result-reward'
        && intentId === 'play-again-or-next'
        && recoveryAtIntentStart.retryRequired) {
        let recoveryStatus:
          | 'learning-settlement-recovered'
          | 'learning-settlement-recovery-deferred'
          | 'settlement-restart-required';
        let settlement: unknown = null;
        try {
          settlement = this.#host.retryLearningSettlementProjectionRecovery();
          recoveryStatus = 'learning-settlement-recovered';
        } catch (error) {
          let recoveryAfterFailure: ReturnType<
            ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1[
              'getLearningSettlementRecoveryRead'
            ]
          >;
          try {
            recoveryAfterFailure = this.#host.getLearningSettlementRecoveryRead();
          } catch {
            throw error;
          }
          if (!recoveryAfterFailure.retryRequired
            && !recoveryAfterFailure.restartRequired) {
            throw error;
          }
          recoveryStatus = recoveryAfterFailure.restartRequired
            ? 'settlement-restart-required'
            : 'learning-settlement-recovery-deferred';
        }
        const rendered = this.#renderCurrent();
        const outcome = Object.freeze({
          status: recoveryStatus,
          settlement,
        });
        this.#notifySurface(rendered === null ? 'match' : 'information', outcome);
        transitionSucceeded = true;
        return;
      }
      const selection = informationSelectionIntent(intentId);
      if (selection !== null) {
        const expectedScreen = selection.kind === 'mode'
          ? 'mode-select'
          : selection.kind === 'character'
            ? 'character-select'
          : selection.kind === 'weapon'
            ? 'weapon-index'
            : 'map-index';
        if (screenId !== expectedScreen) {
          throw new RangeError(
            `Arena V2 local playable surface不能在${screenId}处理${selection.kind}选择。`,
          );
        }
        if (selection.kind === 'mode') {
          this.#selectedModeKind = modeKind(selection.selectedId);
          this.#host.selectInformationMode(this.#selectedModeKind);
        } else if (selection.kind === 'character') {
          this.#host.selectInformationCharacter(selection.selectedId);
        } else if (selection.kind === 'weapon') {
          this.#host.selectInformationWeapon(selection.selectedId);
          this.#selection = Object.freeze({
            ...this.#selection,
            selectedWeaponDefinitionId: selection.selectedId,
          });
        } else {
          this.#host.selectInformationMap(selection.selectedId);
          this.#selection = Object.freeze({
            ...this.#selection,
            selectedMapDefinitionId: selection.selectedId,
          });
        }
        const rendered = this.#renderCurrent();
        const outcome = Object.freeze({
          status: 'selection-updated' as const,
          kind: selection.kind,
          selectedId: selection.selectedId,
        });
        this.#notifySurface(rendered === null ? 'match' : 'information', outcome);
        transitionSucceeded = true;
        return;
      }
      const preparationTarget = modePreparationTargetScreenId(intentId);
      if (preparationTarget !== null) {
        if (screenId !== 'mode-select') {
          throw new RangeError(
            `Arena V2 local surface不能在${screenId}打开模式准备规则。`,
          );
        }
        const expectedTarget = this.#selectedModeKind === 'survival'
          ? 'survival-prep'
          : 'match-prep';
        if (preparationTarget !== expectedTarget) {
          throw new RangeError('Arena V2 local surface模式准备规则与当前模式不一致。');
        }
        const outcome = this.#host.openDeclaredLink({
          expectedRevision: information.navigation.revision,
          targetScreenId: preparationTarget,
        });
        const rendered = this.#renderCurrent();
        this.#notifySurface(rendered === null ? 'match' : 'information', outcome);
        transitionSucceeded = true;
        return;
      }
      if (intentId === MODE_CHARACTER_LINK_INTENT) {
        if (screenId !== 'mode-select') {
          throw new RangeError(
            `Arena V2 local surface不能在${screenId}打开角色选择。`,
          );
        }
        const outcome = this.#host.openDeclaredLink({
          expectedRevision: information.navigation.revision,
          targetScreenId: 'character-select',
        });
        const rendered = this.#renderCurrent();
        this.#notifySurface(rendered === null ? 'match' : 'information', outcome);
        transitionSucceeded = true;
        return;
      }
      const competitivePreparationTarget = competitivePreparationTargetScreenId(intentId);
      if (competitivePreparationTarget !== null) {
        if (screenId !== 'match-prep' || this.#selectedModeKind === 'survival') {
          throw new RangeError(
            `Arena V2 local surface不能在${screenId}打开竞技准备详情。`,
          );
        }
        const outcome = this.#host.openDeclaredLink({
          expectedRevision: information.navigation.revision,
          targetScreenId: competitivePreparationTarget,
        });
        const rendered = this.#renderCurrent();
        this.#notifySurface(rendered === null ? 'match' : 'information', outcome);
        transitionSucceeded = true;
        return;
      }
      const survivalPreparationTarget = survivalPreparationTargetScreenId(intentId);
      if (survivalPreparationTarget !== null) {
        if (screenId !== 'survival-prep' || this.#selectedModeKind !== 'survival') {
          throw new RangeError(
            `Arena V2 local surface不能在${screenId}打开生存准备入口。`,
          );
        }
        const outcome = this.#host.openDeclaredLink({
          expectedRevision: information.navigation.revision,
          targetScreenId: survivalPreparationTarget,
        });
        const rendered = this.#renderCurrent();
        this.#notifySurface(rendered === null ? 'match' : 'information', outcome);
        transitionSucceeded = true;
        return;
      }
      const detailDirectoryTarget = detailDirectoryTargetScreenId(intentId);
      if (detailDirectoryTarget !== null) {
        const expectedScreen = detailDirectoryTarget === 'weapon-index'
          ? 'weapon-detail'
          : 'map-detail';
        if (screenId !== expectedScreen) {
          throw new RangeError(
            `Arena V2 local surface不能在${screenId}返回${detailDirectoryTarget}。`,
          );
        }
        const outcome = this.#host.openDeclaredLink({
          expectedRevision: information.navigation.revision,
          targetScreenId: detailDirectoryTarget,
        });
        const rendered = this.#renderCurrent();
        if (rendered !== null) {
          this.#revealCurrentDirectorySelection(detailDirectoryTarget, rendered);
        }
        this.#notifySurface(rendered === null ? 'match' : 'information', outcome);
        transitionSucceeded = true;
        return;
      }
      const adjacentSelection = detailAdjacentSelection(intentId);
      if (adjacentSelection !== null) {
        const expectedScreen = adjacentSelection.kind === 'weapon'
          ? 'weapon-detail'
          : 'map-detail';
        if (screenId !== expectedScreen) {
          throw new RangeError(
            `Arena V2 local surface不能在${screenId}连续浏览${adjacentSelection.kind}。`,
          );
        }
        const browseProjection = this.#host.getInformationCurrentDetailBrowseProjection();
        if (browseProjection.kind !== adjacentSelection.kind) {
          throw new RangeError('Arena V2 local surface详情连续浏览类型与当前投影漂移。');
        }
        const validTarget = resolveArenaV2InformationDetailAdjacentBrowseTargetsCandidateV1(
          browseProjection,
        ).some(({ item }) => item.definitionId === adjacentSelection.selectedDefinitionId);
        if (!validTarget) {
          throw new RangeError('Arena V2 local surface详情连续浏览目标已不是当前相邻项。');
        }
        if (adjacentSelection.kind === 'weapon') {
          this.#host.selectInformationWeapon(adjacentSelection.selectedDefinitionId);
          this.#selection = Object.freeze({
            ...this.#selection,
            selectedWeaponDefinitionId: adjacentSelection.selectedDefinitionId,
          });
        } else {
          this.#host.selectInformationMap(adjacentSelection.selectedDefinitionId);
          this.#selection = Object.freeze({
            ...this.#selection,
            selectedMapDefinitionId: adjacentSelection.selectedDefinitionId,
          });
        }
        const rendered = this.#renderCurrent();
        this.#notifySurface(rendered === null ? 'match' : 'information', Object.freeze({
          status: 'detail-selection-updated' as const,
          kind: adjacentSelection.kind,
          selectedDefinitionId: adjacentSelection.selectedDefinitionId,
        }));
        transitionSucceeded = true;
        return;
      }
      const newCollectionDetail = resultNewCollectionDetailSelection(intentId);
      if (newCollectionDetail !== null) {
        if (screenId !== 'result-reward') {
          throw new RangeError(
            `Arena V2 local surface不能在${screenId}打开本局新收藏详情。`,
          );
        }
        const renderedItem = this.#lastRenderedResultNewCollectionDetailItems.find(
          (item) => item.kind === newCollectionDetail.kind
            && item.definitionId === newCollectionDetail.selectedDefinitionId,
        );
        if (renderedItem === undefined) {
          throw new RangeError('Arena V2 local surface本局新收藏详情点击与已渲染条目漂移。');
        }
        const outcome = this.#host.openInformationResultNewCollectionDetail({
          expectedRevision: information.navigation.revision,
          kind: renderedItem.kind,
          definitionId: renderedItem.definitionId,
        });
        if (renderedItem.kind === 'weapon') {
          this.#selection = Object.freeze({
            ...this.#selection,
            selectedWeaponDefinitionId: renderedItem.definitionId,
          });
        } else {
          this.#selection = Object.freeze({
            ...this.#selection,
            selectedMapDefinitionId: renderedItem.definitionId,
          });
        }
        const rendered = this.#renderCurrent();
        this.#notifySurface(rendered === null ? 'match' : 'information', outcome);
        transitionSucceeded = true;
        return;
      }
      const navigationItem = bottomNavigationItem(intentId);
      const homeContinuationRoute = (() => {
        if (screenId !== 'home' || intentId !== 'open-mode-select') return null;
        if (this.#lastRenderedHomeContinuationRoute === null) {
          throw new Error('Arena V2首页主动作缺少已渲染续玩路由身份。');
        }
        return this.#lastRenderedHomeContinuationRoute;
      })();
      const homeReplayCombination = homeContinuationRoute === null
        ? null
        : this.#lastRenderedFullCatalogReplayCombination;
      if (homeContinuationRoute?.goalId === 'catalog-complete'
        && homeReplayCombination === null) {
        throw new Error('Arena V2首页完整目录主动作缺少已渲染复练组合身份。');
      }
      const resultPrimaryRecommendation = (() => {
        if (screenId !== 'result-reward' || intentId !== 'play-again-or-next') return null;
        if (this.#lastRenderedResultPrimaryRecommendation === null) {
          throw new Error('Arena V2结果页主动作缺少已渲染推荐身份。');
        }
        return this.#lastRenderedResultPrimaryRecommendation;
      })();
      const effectiveResultDecision = resultPrimaryRecommendation?.decision
        ?? this.#resultDecision;
      const startsMatch = PRIMARY_START_INTENTS.has(intentId)
        || (intentId === 'play-again-or-next' && effectiveResultDecision === 'play-again');
      if (startsMatch && recoveryAtIntentStart.retryRequired) {
        const rendered = this.#renderCurrent();
        const blockedOutcome = Object.freeze({
          status: 'match-start-blocked' as const,
          reason: 'settlement-recovery-pending',
        });
        this.#notifySurface(rendered === null ? 'match' : 'information', blockedOutcome);
        transitionSucceeded = true;
        return;
      }
      if (startsMatch && this.#matchStartGuard !== null) {
        const guardValue = this.#matchStartGuard(Object.freeze({
          intentId,
          screenId,
          selectedModeKind: this.#selectedModeKind,
        }));
        rejectThenable(guardValue, 'Arena V2 local playable surface matchStartGuard');
        const decision = matchStartGuardDecision(guardValue);
        if (!decision.allowed) {
          const rendered = this.#renderCurrent();
          const blockedOutcome = Object.freeze({
            status: 'match-start-blocked' as const,
            reason: decision.reason,
          });
          this.#notifySurface(rendered === null ? 'match' : 'information', blockedOutcome);
          transitionSucceeded = true;
          return;
        }
      }
      const outcome = navigationItem === null
        ? this.#host.dispatchPrimaryIntent({
          expectedRevision: information.navigation.revision,
          screenId,
          intentId,
          selectedModeKind: startsMatch
            ? this.#selectedModeKind
            : null,
          resultDecision: intentId === 'play-again-or-next'
            ? effectiveResultDecision
            : null,
          expectedResultCollectionTargetKind:
            resultPrimaryRecommendation?.kind === 'next-weapon'
              || resultPrimaryRecommendation?.kind === 'next-map'
              ? resultPrimaryRecommendation.kind
              : null,
          expectedResultCollectionTargetDefinitionId:
            resultPrimaryRecommendation?.kind === 'next-weapon'
              ? resultPrimaryRecommendation.nextWeaponDefinitionId
              : resultPrimaryRecommendation?.kind === 'next-map'
                ? resultPrimaryRecommendation.nextMapDefinitionId
                : null,
          expectedResultRecommendationKind:
            resultPrimaryRecommendation?.decision === 'next-goal'
              ? resultPrimaryRecommendation.kind
              : null,
          expectedResultGoalId:
            resultPrimaryRecommendation?.decision === 'next-goal'
              ? resultPrimaryRecommendation.goalId
              : null,
          expectedResultTargetScreenId:
            resultPrimaryRecommendation?.decision === 'next-goal'
              ? resultPrimaryRecommendation.targetScreenId
              : null,
          expectedResultTargetModeKind:
            resultPrimaryRecommendation?.decision === 'next-goal'
              ? resultPrimaryRecommendation.targetModeKind
              : null,
          expectedResultTargetWeaponDefinitionId:
            resultPrimaryRecommendation?.decision === 'next-goal'
              ? resultPrimaryRecommendation.nextWeaponDefinitionId
              : null,
          expectedResultTargetMapDefinitionId:
            resultPrimaryRecommendation?.decision === 'next-goal'
              ? resultPrimaryRecommendation.nextMapDefinitionId
              : null,
          expectedResultPlayAgainFitKind:
            resultPrimaryRecommendation?.kind === 'play-again'
              && resultPrimaryRecommendation.goalId !== null
              ? resultPrimaryRecommendation.playAgainFitKind
              : null,
          expectedResultPlayAgainGoalId:
            resultPrimaryRecommendation?.kind === 'play-again'
              ? resultPrimaryRecommendation.goalId
              : null,
          expectedResultPlayAgainModeKind:
            resultPrimaryRecommendation?.kind === 'play-again'
              ? resultPrimaryRecommendation.targetModeKind
              : null,
          expectedResultPlayAgainTargetWeaponDefinitionId:
            resultPrimaryRecommendation?.kind === 'play-again'
              ? resultPrimaryRecommendation.nextWeaponDefinitionId
              : null,
          expectedResultPlayAgainTargetMapDefinitionId:
            resultPrimaryRecommendation?.kind === 'play-again'
              ? resultPrimaryRecommendation.nextMapDefinitionId
              : null,
          ...(homeContinuationRoute === null
            ? {}
            : {
              expectedHomeContinuationGoalId: homeContinuationRoute.goalId,
              expectedHomeContinuationKind: homeContinuationRoute.continuationKind,
              expectedHomeContinuationModeDefinitionId:
                homeContinuationRoute.recommendedModeDefinitionId,
              expectedHomeContinuationModeKind: homeContinuationRoute.recommendedModeKind,
              expectedHomeContinuationTargetWeaponDefinitionId:
                homeContinuationRoute.targetWeaponDefinitionId,
              expectedHomeContinuationTargetMapDefinitionId:
                homeContinuationRoute.targetMapDefinitionId,
            }),
          ...(homeReplayCombination === null
            ? {}
            : {
              expectedHomeReplayProfileRevision: homeReplayCombination.profileRevision,
              expectedHomeReplayModeDefinitionId: homeReplayCombination.modeDefinitionId,
              expectedHomeReplayModeKind: homeReplayCombination.modeKind,
              expectedHomeReplayWeaponDefinitionId:
                homeReplayCombination.weaponDefinitionId,
              expectedHomeReplayWeaponRotationOrdinal:
                homeReplayCombination.weaponRotationOrdinal,
              expectedHomeReplayEligibleWeaponCount:
                homeReplayCombination.eligibleWeaponCount,
              expectedHomeReplayMapDefinitionId: homeReplayCombination.mapDefinitionId,
              expectedHomeReplayMapRotationOrdinal:
                homeReplayCombination.mapRotationOrdinal,
              expectedHomeReplayMapCount: homeReplayCombination.mapCount,
              expectedHomeReplayCycleLength:
                homeReplayCombination.weaponMapRotationCycleLength,
              expectedHomeReplaySurvivalWeaponRequiresWorldPickup:
                homeReplayCombination.survivalWeaponRequiresWorldPickup,
            }),
        })
        : this.#host.openBottomNavigation({
          expectedRevision: information.navigation.revision,
          itemId: navigationItem,
        });
      const focusedRecordFieldId: 'recent-records' | null = navigationItem === 'records'
        ? (() => {
          const source = assertPlainRecord(
            outcome,
            'Arena V2 local records navigation outcome',
          );
          const focusFieldId = dataField(
            source,
            'focusFieldId',
            'Arena V2 local records navigation outcome',
          );
          const targetScreenId = dataField(
            source,
            'screenId',
            'Arena V2 local records navigation outcome',
          );
          if (focusFieldId !== 'recent-records' || targetScreenId !== 'home') {
            throw new Error('Arena V2 local records导航目标或焦点漂移。');
          }
          return 'recent-records' as const;
        })()
        : null;
      this.#assertTransitionCommit();
      if ((intentId === 'play-again-or-next' && effectiveResultDecision === 'next-goal')
        || (screenId === 'home' && intentId === 'open-mode-select')) {
        const routedSelection = this.#host.getInformationNavigationSelectionRead();
        this.#assertTransitionCommit();
        this.#selection = contentSelection({
          selectedWeaponDefinitionId: routedSelection.selectedWeaponDefinitionId,
          selectedMapDefinitionId: routedSelection.selectedMapDefinitionId,
        });
        if (routedSelection.selectedModeKind !== null) {
          this.#selectedModeKind = modeKind(routedSelection.selectedModeKind);
        }
      }
      const rendered = this.#renderCurrent();
      if (focusedRecordFieldId !== null) {
        if (rendered === null) {
          throw new Error('Arena V2 local records导航不得进入比赛Surface。');
        }
        this.#revealFocusedInformationField(focusedRecordFieldId, rendered);
      }
      if (rendered === null) this.#renderMatchSurface(outcome);
      this.#notifySurface(rendered === null ? 'match' : 'information', outcome);
      transitionSucceeded = true;
    } catch (error) {
      if (this.#state === 'failed' || this.#state === 'disposed') throw error;
      this.#reject(error, intentId);
    } finally {
      this.#endTransition('Arena V2 local playable surface intent', intentId);
      if (transitionSucceeded && this.#state === 'match' && this.#matchDriverStart !== null) {
        try {
          this.#runTransition(
            'Arena V2 local playable surface attached match driver start',
            intentId,
            true,
            () => {
              rejectThenable(
                this.#matchDriverStart!(),
                'Arena V2 local playable surface attached match driver start',
              );
              this.#assertTransitionCommit();
            },
          );
        } catch (error) {
          const stateAfterDriverStartFailure = this.#state as BindingState;
          if (stateAfterDriverStartFailure !== 'disposed'
            && stateAfterDriverStartFailure !== 'failed') {
            this.#reject(error, intentId);
          }
          throw error;
        }
      }
    }
  };

  load(): this {
    this.#assertLive('Arena V2 local playable surface load');
    if (this.#state !== 'created') return this;
    this.#beginTransition('Arena V2 local playable surface load');
    try {
      rejectThenable(this.#surface.load(), 'Arena V2 local playable surface.load');
      this.#assertTransitionCommit();
      this.#bindSurfaceIntent();
      const recovery = this.#host.getLearningSettlementRecoveryRead();
      this.#assertTransitionCommit();
      if (!recovery.restartRequired && !recovery.retryRequired) {
        this.#host.selectInformationMode(this.#selectedModeKind);
        this.#assertTransitionCommit();
        if (this.#selection.selectedWeaponDefinitionId !== undefined) {
          this.#host.selectInformationWeapon(this.#selection.selectedWeaponDefinitionId);
          this.#assertTransitionCommit();
        }
        if (this.#selection.selectedMapDefinitionId !== undefined) {
          this.#host.selectInformationMap(this.#selection.selectedMapDefinitionId);
          this.#assertTransitionCommit();
        }
      }
      const started = this.#host.start({ initialScreenId: this.#initialScreenId });
      this.#assertTransitionCommit();
      this.#renderCurrent();
      this.#notifySurface('information', started);
      return this;
    } catch (error) {
      return this.#reject(error, null);
    } finally {
      this.#endTransition('Arena V2 local playable surface load', null);
    }
  }

  renderCurrent(): ArenaV2UiRenderPlanV1 | null {
    const operation = 'Arena V2 local playable surface renderCurrent';
    this.#assertLive(operation);
    return this.#runTransition(operation, null, true, () => this.#renderCurrent());
  }

  getLearningSettlementRecoveryRead(): ReturnType<
    ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1[
      'getLearningSettlementRecoveryRead'
    ]
  > {
    const operation = 'Arena V2 local playable surface learning settlement recovery read';
    this.#assertLive(operation);
    return this.#runTransition(
      operation,
      null,
      false,
      () => this.#host.getLearningSettlementRecoveryRead(),
    );
  }

  selectMode(value: unknown): void {
    const operation = 'Arena V2 local playable surface selectMode';
    this.#assertLive(operation);
    this.#runTransition(operation, null, false, () => {
      this.#assertNoPendingSettlementMutation(operation);
      try {
        this.#selectedModeKind = modeKind(value);
        this.#host.selectInformationMode(this.#selectedModeKind);
        if (this.#state === 'information') this.#renderCurrent();
      } catch (error) {
        this.#reject(error, null);
      }
    });
  }

  selectContent(value: unknown): void {
    const operation = 'Arena V2 local playable surface selectContent';
    this.#assertLive(operation);
    this.#runTransition(operation, null, false, () => {
      this.#assertNoPendingSettlementMutation(operation);
      try {
        const selection = contentSelection(value);
        if (selection.selectedWeaponDefinitionId !== undefined) {
          this.#host.selectInformationWeapon(selection.selectedWeaponDefinitionId);
        }
        if (selection.selectedMapDefinitionId !== undefined) {
          this.#host.selectInformationMap(selection.selectedMapDefinitionId);
        }
        this.#selection = selection;
        if (this.#state === 'information') this.#renderCurrent();
      } catch (error) {
        this.#reject(error, null);
      }
    });
  }

  chooseResultDecision(value: unknown): void {
    const operation = 'Arena V2 local playable surface chooseResultDecision';
    this.#assertLive(operation);
    this.#runTransition(operation, null, false, () => {
      this.#assertNoPendingSettlementMutation(operation);
      try {
        this.#resultDecision = resultDecision(value);
        this.#preferGoalAlignedResultRecommendation = false;
        if (this.#state === 'information') this.#renderCurrent();
      } catch (error) {
        this.#reject(error, null);
      }
    });
  }

  attachMatchDriver(value: unknown): void {
    const operation = 'Arena V2 local playable surface attachMatchDriver';
    this.#assertLive(operation);
    this.#runTransition(operation, null, false, () => {
      this.#assertNoPendingSettlementMutation(operation);
      if (this.#state !== 'created' && this.#state !== 'information') {
        throw new Error('Arena V2 local playable surface只能在对局前附加Match Driver。');
      }
      if (this.#matchDriverStart !== null) {
        throw new Error('Arena V2 local playable surface已经附加Match Driver。');
      }
      this.#matchDriverStart = boundDataMethod(
        value,
        'start',
        'Arena V2 local playable surface match driver',
      );
    });
  }

  loadingReady(): unknown {
    const operation = 'Arena V2 local playable surface loadingReady';
    this.#assertLive(operation);
    return this.#runTransition(operation, null, false, () => {
      this.#assertNoPendingSettlementMutation(operation);
      try {
        const information = this.#host.getInformationSnapshot();
        const outcome = this.#host.loadingReady({
          expectedRevision: information.navigation.revision,
        });
        this.#renderCurrent();
        this.#notifySurface('information', outcome);
        return outcome;
      } catch (error) {
        return this.#reject(error, null);
      }
    });
  }

  openDeclaredLink(targetScreenId: unknown): unknown {
    const operation = 'Arena V2 local playable surface openDeclaredLink';
    this.#assertLive(operation);
    return this.#runTransition(operation, null, false, () => {
      this.#assertNoPendingSettlementMutation(operation);
      try {
        const information = this.#host.getInformationSnapshot();
        const outcome = this.#host.openDeclaredLink({
          expectedRevision: information.navigation.revision,
          targetScreenId,
        });
        this.#renderCurrent();
        this.#notifySurface('information', outcome);
        return outcome;
      } catch (error) {
        return this.#reject(error, null);
      }
    });
  }

  stepMatch(value: unknown): unknown {
    const operation = 'Arena V2 local playable surface stepMatch';
    this.#assertLive(operation);
    return this.#runTransition(operation, null, false, () => {
      this.#assertNoPendingSettlementMutation(operation);
      if (this.#state !== 'match') {
        throw new Error('Arena V2 local playable surface当前不在对局。');
      }
      try {
        const outcome = this.#host.stepMatch(value);
        this.#renderMatchSurface(outcome);
        return outcome;
      } catch (error) {
        return this.#reject(error, null);
      }
    });
  }

  getMatchInputContext(): ReturnType<
    ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1['getMatchInputContext']
  > {
    const operation = 'Arena V2 local playable surface getMatchInputContext';
    this.#assertLive(operation);
    return this.#runTransition(operation, null, false, () => {
      if (this.#state !== 'match') {
        throw new Error('Arena V2 local playable surface当前不在对局。');
      }
      return this.#host.getMatchInputContext();
    });
  }

  pauseMatch(): unknown {
    const operation = 'Arena V2 local playable surface pauseMatch';
    this.#assertLive(operation);
    return this.#runTransition(operation, null, false, () => {
      this.#assertNoPendingSettlementMutation(operation);
      if (this.#state !== 'match') {
        throw new Error('Arena V2 local playable surface当前不在对局。');
      }
      try {
        const outcome = this.#host.pauseMatch();
        if (this.#matchSurface !== null && this.#matchSurfaceActive) {
          rejectThenable(this.#matchSurface.pause(), 'Arena V2 local match surface.pause');
        }
        return outcome;
      } catch (error) {
        return this.#reject(error, null);
      }
    });
  }

  resumeMatch(): unknown {
    const operation = 'Arena V2 local playable surface resumeMatch';
    this.#assertLive(operation);
    return this.#runTransition(operation, null, false, () => {
      this.#assertNoPendingSettlementMutation(operation);
      if (this.#state !== 'match') {
        throw new Error('Arena V2 local playable surface当前不在对局。');
      }
      try {
        const outcome = this.#host.resumeMatch();
        if (this.#matchSurface !== null && this.#matchSurfaceActive) {
          rejectThenable(this.#matchSurface.resume(), 'Arena V2 local match surface.resume');
        }
        return outcome;
      } catch (error) {
        return this.#reject(error, null);
      }
    });
  }

  settleMatch(): unknown {
    const operation = 'Arena V2 local playable surface settleMatch';
    this.#assertLive(operation);
    return this.#runTransition(operation, null, false, () => {
      if (this.#state !== 'match') {
        throw new Error('Arena V2 local playable surface当前不在对局。');
      }
      try {
        const outcome = this.#host.settleMatch();
        this.#leaveMatchSurface();
        this.#renderCurrent();
        this.#notifySurface('information', outcome);
        return outcome;
      } catch (error) {
        let recovery: ReturnType<
          ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1[
            'getLearningSettlementRecoveryRead'
          ]
        >;
        try {
          recovery = this.#host.getLearningSettlementRecoveryRead();
        } catch (recoveryReadError) {
          return this.#reject(new AggregateError(
            [error, recoveryReadError],
            'Arena V2 local playable surface结算失败且恢复状态读取失败。',
          ), null);
        }
        if (recovery.restartRequired || recovery.retryRequired) {
          try {
            this.#leaveMatchSurface();
            this.#renderCurrent();
            const outcome = Object.freeze({
              status: recovery.restartRequired
                ? 'settlement-restart-required' as const
                : 'settlement-recovery-pending' as const,
              reason: recovery.restartRequired
                ? recovery.restartReason
                : 'recoverable-profile-write' as const,
            });
            this.#notifySurface('information', outcome);
            return outcome;
          } catch (recoverySurfaceError) {
            return this.#reject(new AggregateError(
              [error, recoverySurfaceError],
              'Arena V2 local playable surface结算恢复页面提交失败。',
            ), null);
          }
        }
        return this.#reject(error, null);
      }
    });
  }

  retryLearningSettlementProjectionRecovery(): ReturnType<
    ArenaThreeModeAuthoritativeLocalPlayableHostCandidateV1[
      'retryLearningSettlementProjectionRecovery'
    ]
  > {
    const operation = 'Arena V2 local playable surface retry learning settlement recovery';
    this.#assertLive(operation);
    return this.#runTransition(operation, null, false, () => {
      this.#assertNoSettlementRestartRequired(operation);
      if (this.#state !== 'information') {
        throw new Error('Arena V2 local playable surface只能在结算信息页重试学习结算恢复。');
      }
      const settlement = this.#host.retryLearningSettlementProjectionRecovery();
      try {
        this.#renderCurrent();
        this.#notifySurface('information', Object.freeze({
          status: 'learning-settlement-recovered' as const,
          settlement,
        }));
        return settlement;
      } catch (error) {
        return this.#reject(error, null);
      }
    });
  }

  dispose(): void {
    this.#assertNoTransition('Arena V2 local playable surface dispose');
    if (this.#state === 'disposed') return;
    const operation = 'Arena V2 local playable surface dispose';
    this.#beginTransition(operation);
    try {
      const errors = this.#cleanup();
      this.#assertTransitionCommit();
      const complete = this.#unbindIntent === null
        && this.#surfaceDisposed
        && (this.#matchSurface === null || this.#matchSurfaceDisposed)
        && this.#hostOwnerDestroyed;
      this.#state = errors.length === 0 && complete ? 'disposed' : 'failed';
      this.#lastRenderPlan = null;
      this.#lastRenderedResultPrimaryRecommendation = null;
      this.#lastRenderedResultNewCollectionDetailItems = Object.freeze([]);
      this.#lastRenderedHomeContinuationRoute = null;
      this.#lastRenderedFullCatalogReplayCombination = null;
      if (errors.length > 0) {
        throw new AggregateError(errors, 'Arena V2 local playable surface清理不完整。');
      }
      if (!complete) throw new Error('Arena V2 local playable surface清理未收敛。');
    } catch (error) {
      this.#transitionFailure ??= error;
      throw error;
    } finally {
      this.#endTransition(operation, null);
    }
  }
}

export const ARENA_V2_INFORMATION_LOCAL_PLAYABLE_SURFACE_BINDING_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultEntryWired: false as const,
    defaultNavigationWired: false as const,
    ownsLocalPlayableHost: true as const,
    supportsExternalLocalPlayableLifecycleOwner: true as const,
    ownsSurface: true as const,
    failedIntentUnbindRetainsRetryOwnership: true as const,
    intentUnbindMustCompleteSynchronously: true as const,
    synchronousSurfaceReturnsUseDescriptorOnlyBoundary: true as const,
    cleanupRetriesOnlyIncompleteOwnedResources: true as const,
    cleanupRespectsInformationHostAndMatchProducerDependencyOrder: true as const,
    failedInformationCleanupRetainsHostAndMatchAssetOwners: true as const,
    failedHostCleanupRetainsMatchAudioAndVfxProducer: true as const,
    disposeRequiresAllOwnedResourcesToReachCompletion: true as const,
    intentTransactionFailureClosesBindingWithoutSurfaceRejectedCallback: true as const,
    surfaceRejectedCallbackDoesNotRepeatClosedBindingFailure: true as const,
    settlementRecoverySurfaceFailureClosesBinding: true as const,
    allPublicHostSurfaceAndMatchCallsCommitUnderStickyTransition: true as const,
    swallowedHostSurfaceMatchDriverOrObserverReentryFailsClosed: true as const,
    stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
    hostSurfaceMatchAndObserverCallbacksCheckedBeforeStateCommit: true as const,
    cleanupReentryRetainsCurrentAndLaterOwners: true as const,
    ordinaryCleanupFailureRetainsCurrentAndLaterOwners: true as const,
    cleanupCallbacksMustCompleteSynchronously: true as const,
    attachedMatchDriverStartUsesIndependentGuardedTransition: true as const,
    stateAndLastRenderPlanReadsRejectedDuringTransition: true as const,
    idempotentLoadAndDisposeCheckReentryBeforeFastPath: true as const,
    matchDriverStartsOnlyAfterIntentTransitionCommits: true as const,
    exposesReadOnlyMatchInputContext: true as const,
    startsAttachedMatchDriverAfterSurfaceTransition: true as const,
    supportsNonDestructiveMatchStartGuard: true as const,
    supportsRecoverableLearningSettlementProjectionRetry: true as const,
    blocksMatchStartWhileLearningSettlementRecoveryIsPending: true as const,
    reusesResultPrimaryActionForPendingLearningSettlementRecovery: true as const,
    settlementAcknowledgementFailureRendersReadOnlyResult: true as const,
    settlementRestartRequiredBlocksSurfaceInteractions: true as const,
    restartRequiredSettlementUsesDistinctSurfaceOutcome: true as const,
    startupSettlementRecoveryNoticeRenderedOnExistingHomePage: true as const,
    ownsOptionalMatchSurfaceLifecycle: true as const,
    bottomNavigationInteractive: true as const,
    recordsBottomNavigationFocusConsumed: true as const,
    recordsFocusUsesRenderedPrimitiveGeometry: true as const,
    recordsFocusAddsNoPageOrAction: true as const,
    modeCharacterWeaponAndMapSelectionInteractive: true as const,
    modePreparationRuleDetailSecondaryActionWired: true as const,
    modePreparationRuleDetailReusesExistingPages: true as const,
    modeCharacterSelectionSecondaryActionWired: true as const,
    modeCharacterSelectionReturnsThroughExistingSaveAction: true as const,
    competitivePreparationOptionalDetailActionsWired: true as const,
    competitivePreparationPrimaryStartRemainsDirect: true as const,
    preparationPagesCanReturnToModeSelectWithoutStarting: true as const,
    survivalPreparationRemainsUnarmedWithoutWeaponSelectionAction: true as const,
    survivalPreparationOptionalCollectionActionsWired: true as const,
    survivalPreparationWeaponActionCannotEquipLoadout: true as const,
    survivalPreparationPrimaryStartRemainsDirect: true as const,
    detailDirectorySecondaryActionWired: true as const,
    detailDirectoryActionPreservesSelection: true as const,
    detailDirectoryReturnRevealsCurrentSelection: true as const,
    detailDirectoryRevealUsesRenderedSelectionActionIdentity: true as const,
    detailAdjacentBrowseActionsWired: true as const,
    detailAdjacentBrowseReusesCurrentDetailScreen: true as const,
    modePrimaryStartRemainsDirect: true as const,
    selectedWeaponFrozenIntoNextDuelOrRace: true as const,
    survivalIgnoresLoadoutAndStartsUnarmed: true as const,
    resultPrimaryLabelFollowsDecision: true as const,
    playAgainAccessibilityExplainsContentContinuity: true as const,
    playAgainCopyRespectsSurvivalUnarmedRule: true as const,
    competitivePlayAgainCopyRetainsSelectedWeapon: true as const,
    playAgainResultGoalCopyExplainsGrowthContinuity: true as const,
    playAgainImmediateActionAndLongTermGoalStaySeparate: true as const,
    resultPrimaryClickUsesLastRenderedRecommendation: true as const,
    resultNewCollectionDetailUsesLastRenderedIdentity: true as const,
    resultNewCollectionDetailRevalidatesCommittedSettlement: true as const,
    resultNewCollectionDetailReusesExistingWeaponAndMapPages: true as const,
    resultNewCollectionDetailPreservesLongTermGoalPrimaryAction: true as const,
    resultNewCollectionDetailSelectionRequiresExplicitRenderedAction: true as const,
    resultNewCollectionDetailNeverStartsMatch: true as const,
    resultCollectionTargetIdentityRevalidatedBeforeNavigation: true as const,
    resultGoalRouteIdentityRevalidatedBeforeNavigation: true as const,
    resultGoalRouteModeSynchronizesFromHostAfterNavigation: true as const,
    homePrimaryActionSynchronizesAcceptedContinuationFromHost: true as const,
    navigationSelectionSynchronizesFromSingleNarrowHostRead: true as const,
    homePrimaryClickRevalidatesLastRenderedContinuationIdentity: true as const,
    homePrimaryLabelNamesRecommendedExistingMode: true as const,
    homePrimaryAccessibilityExplainsSelectionAndConfirmation: true as const,
    homeAcceptedContinuationStillStopsAtModeConfirmation: true as const,
    homeSurvivalContinuationPreservesUnarmedMatchStart: true as const,
    homeFullCatalogReplayButtonNamesCyclePosition: true as const,
    homeFullCatalogReplayClickUsesLastRenderedIdentity: true as const,
    homeFullCatalogReplayReusesPrimaryAction: true as const,
    activeScopeCompletionKeepsFreeChoiceHomeAction: true as const,
    resultNextMapRouteSkeletonUsesExistingGoalValue: true as const,
    resultNextMapRouteSkeletonUsesSharedMapProjection: true as const,
    resultNextWeaponCoreFightUsesExistingGoalValue: true as const,
    resultNextWeaponCoreFightUsesSharedWeaponProjection: true as const,
    resultLearningSignatureUsesProfileNextGoalIdentity: true as const,
    resultLearningSignatureUsesSharedHomeReadProjection: true as const,
    resultCrossChallengeCanShowWeaponAndMapSignature: true as const,
    resultNavigationRecommendationDoesNotSelectLearningSignature: true as const,
    settlementRecoverySkipsNextContentRead: true as const,
    renderReusesPipelineRecoveryAndNextGoalRead: true as const,
    renderReusesPipelineResultRecommendations: true as const,
    interactionGateReusesSingleRecoveryRead: true as const,
    interactionGateUsesAggregateInformationAndRecoveryRead: true as const,
    resultNextWeaponDisplayNameRevalidatedAgainstSharedProjection: true as const,
    resultNextMapDisplayNameRevalidatedAgainstSharedProjection: true as const,
    supportsDefaultNextCollectionTargetAfterCollectionRecommendation: true as const,
    supportsDefaultGoalAlignedResultRecommendation: true as const,
    stableOrCurrentEligibleConditionalReplayKeepsPlayAgain: true as const,
    routeAdjustmentReusesSingleResultPrimaryAction: true as const,
    resultRouteAdjustmentNamesExactChangedModeWeaponAndMap: true as const,
    resultRouteAdjustmentStopsAtExistingModeConfirmation: true as const,
    resultSurvivalAdjustmentPreservesUnarmedWorldPickupCopy: true as const,
    explicitNextGoalNamesExactExistingDestination: true as const,
    explicitNextGoalReusesModeWeaponMapAndHomePages: true as const,
    explicitNextGoalAddsNoPageOrAction: true as const,
    fullCatalogExplicitNextGoalReusesExistingAction: true as const,
    fullCatalogExplicitNextGoalStopsAtModeConfirmation: true as const,
    fullCatalogSurvivalExplicitNextGoalKeepsUnarmedStart: true as const,
    resultLearningSignaturePreservesExactMapSegmentGoal: true as const,
    defaultGoalAdjustmentCanEnterModeSelectDirectly: true as const,
    settledExplicitNextGoalRouteIdentityAlsoFrozen: true as const,
    explicitResultDecisionDisablesDefaultRecommendation: true as const,
    settlementRecoveryOverridesResultPrimaryLabel: true as const,
    formalVisualAssetsReady: false as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
  });
