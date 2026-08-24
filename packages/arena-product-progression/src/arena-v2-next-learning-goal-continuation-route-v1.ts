import {
  assertKnownKeys,
  assertPlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaV2LearningProfileDefinitionV1,
  type ArenaV2LearningModeKindV1,
  type ArenaV2WeaponLearningContextV1,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1,
  ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1,
  type ArenaV2NextLearningGoalKindV1,
  type ArenaV2NextLearningGoalV1,
} from './arena-v2-next-learning-goal-v1.js';
import { readDataField } from './options.js';

export type ArenaV2NextLearningGoalContinuationKindV1 =
  | 'explicit-mode'
  | 'deterministic-weapon-loadout'
  | 'map-route-practice'
  | 'conditional-survival-supply'
  | 'free-choice';

export interface ArenaV2NextLearningGoalContinuationRouteV1 {
  readonly schemaVersion: 1;
  readonly goalId: string;
  readonly goalKind: ArenaV2NextLearningGoalKindV1;
  readonly continuationKind: ArenaV2NextLearningGoalContinuationKindV1;
  readonly recommendedModeDefinitionId: string | null;
  readonly recommendedModeKind: ArenaV2LearningModeKindV1 | null;
  readonly targetWeaponDefinitionId: string | null;
  readonly targetMapDefinitionId: string | null;
  readonly requiresTargetWeaponSelection: boolean;
  readonly targetWeaponRequiresWorldPickup: boolean;
  readonly requiresTargetMapSelection: boolean;
}

export const ARENA_V2_NEXT_LEARNING_GOAL_CONTINUATION_ROUTE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  reusesResolvedUniqueNextGoal: true as const,
  genericWeaponGoalUsesDeterministicDuelLoadout: true as const,
  mapGoalUsesRaceRoutePractice: true as const,
  survivalWeaponGoalRequiresWorldPickup: true as const,
  neverPromisesTargetWeaponSupply: true as const,
  activeLearningCompletionUsesFreeChoiceWithoutFullCatalogClaim: true as const,
  freeChoiceUsesStableScopeCompletionGoalIds: true as const,
  freeChoiceDoesNotUseCatalogKindAlone: true as const,
  scopeCompletionIdentityDerivedOnce: true as const,
  writesSelectionNavigationProfileRewardOrTask: false as const,
  addsPagesFieldsActionsOrCurrencies: false as const,
});

const INPUT_KEYS = new Set(['profileDefinition', 'nextGoal']);
const GOAL_KEYS = new Set([
  'schemaVersion', 'profileRevision', 'kind', 'goalId', 'question', 'actionLabel',
  'currentProgress', 'targetProgress', 'weaponDefinitionId', 'mapDefinitionId',
  'segmentDefinitionId', 'modeDefinitionId', 'challengeDefinitionId', 'context',
  'effectiveLearningRequired',
]);
const GOAL_KINDS = new Set<ArenaV2NextLearningGoalKindV1>([
  'collect-map', 'collect-weapon', 'weapon-context', 'map-segment', 'mode-mastery',
  'cross-challenge', 'record-improvement', 'catalog-complete',
]);
const WEAPON_CONTEXTS = new Set<ArenaV2WeaponLearningContextV1>([
  'ground', 'aerial', 'edge', 'duel-counterplay', 'survival',
]);

type ArenaV2ScopeCompletionIdentityV1 = 'full-catalog' | 'active-learning' | null;

interface ArenaV2ValidatedContinuationGoalV1 {
  readonly nextGoal: ArenaV2NextLearningGoalV1;
  readonly scopeCompletion: ArenaV2ScopeCompletionIdentityV1;
}

function scopeCompletionIdentity(goalId: unknown): ArenaV2ScopeCompletionIdentityV1 {
  if (goalId === ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1) return 'full-catalog';
  if (goalId === ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1) return 'active-learning';
  return null;
}

function requiredText(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 300) {
    throw new TypeError(`${name}必须是非空有界字符串。`);
  }
  return value;
}

function safeCounter(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name}必须是非负安全整数。`);
  }
  return value as number;
}

function nullableKnownId(
  value: unknown,
  known: ReadonlySet<string>,
  name: string,
): string | null {
  if (value === null) return null;
  const id = requiredText(value, name);
  if (!known.has(id)) throw new RangeError(`${name}不在当前Learning Definition。`);
  return id;
}

function requireGoal(
  value: unknown,
  definitionValue: unknown,
): ArenaV2ValidatedContinuationGoalV1 {
  const definition = createArenaV2LearningProfileDefinitionV1(definitionValue);
  const source = assertPlainRecord(value, 'Arena下一学习目标续玩路由.nextGoal');
  assertKnownKeys(source, GOAL_KEYS, 'Arena下一学习目标续玩路由.nextGoal');
  for (const key of GOAL_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena下一学习目标续玩路由.nextGoal缺少${key}。`);
    }
  }
  if (readDataField(source, 'schemaVersion', 'Arena下一学习目标续玩路由.nextGoal') !== 1) {
    throw new RangeError('Arena下一学习目标续玩路由goal schemaVersion必须为1。');
  }
  safeCounter(readDataField(source, 'profileRevision', 'Arena下一学习目标续玩路由.nextGoal'), 'profileRevision');
  const kind = readDataField(source, 'kind', 'Arena下一学习目标续玩路由.nextGoal');
  if (typeof kind !== 'string' || !GOAL_KINDS.has(kind as ArenaV2NextLearningGoalKindV1)) {
    throw new RangeError('Arena下一学习目标续玩路由goal kind未知。');
  }
  requiredText(readDataField(source, 'goalId', 'Arena下一学习目标续玩路由.nextGoal'), 'goalId');
  requiredText(readDataField(source, 'question', 'Arena下一学习目标续玩路由.nextGoal'), 'question');
  requiredText(readDataField(source, 'actionLabel', 'Arena下一学习目标续玩路由.nextGoal'), 'actionLabel');
  const currentProgress = safeCounter(
    readDataField(source, 'currentProgress', 'Arena下一学习目标续玩路由.nextGoal'),
    'currentProgress',
  );
  const targetProgress = safeCounter(
    readDataField(source, 'targetProgress', 'Arena下一学习目标续玩路由.nextGoal'),
    'targetProgress',
  );
  if (targetProgress < 1 || currentProgress > targetProgress) {
    throw new RangeError('Arena下一学习目标续玩路由goal进度越界。');
  }
  const weaponDefinitionId = nullableKnownId(
    readDataField(source, 'weaponDefinitionId', 'Arena下一学习目标续玩路由.nextGoal'),
    new Set(definition.weaponDefinitionIds),
    'weaponDefinitionId',
  );
  const maps = new Map(definition.mapDefinitions.map((map) => [map.mapDefinitionId, map]));
  const mapDefinitionId = nullableKnownId(
    readDataField(source, 'mapDefinitionId', 'Arena下一学习目标续玩路由.nextGoal'),
    new Set(maps.keys()),
    'mapDefinitionId',
  );
  const segmentDefinitionIdValue = readDataField(
    source,
    'segmentDefinitionId',
    'Arena下一学习目标续玩路由.nextGoal',
  );
  const segmentDefinitionId = segmentDefinitionIdValue === null
    ? null
    : requiredText(segmentDefinitionIdValue, 'segmentDefinitionId');
  if (segmentDefinitionId !== null
    && (mapDefinitionId === null
      || !maps.get(mapDefinitionId)!.segmentDefinitionIds.includes(segmentDefinitionId))) {
    throw new RangeError('Arena下一学习目标续玩路由segment不属于目标地图。');
  }
  const modeDefinitionId = nullableKnownId(
    readDataField(source, 'modeDefinitionId', 'Arena下一学习目标续玩路由.nextGoal'),
    new Set(definition.modeDefinitions.map((mode) => mode.modeDefinitionId)),
    'modeDefinitionId',
  );
  const challengeDefinitionId = nullableKnownId(
    readDataField(source, 'challengeDefinitionId', 'Arena下一学习目标续玩路由.nextGoal'),
    new Set(definition.challengeDefinitions.map((challenge) => challenge.challengeDefinitionId)),
    'challengeDefinitionId',
  );
  const contextValue = readDataField(source, 'context', 'Arena下一学习目标续玩路由.nextGoal');
  const context = contextValue === null
    ? null
    : typeof contextValue === 'string'
      && WEAPON_CONTEXTS.has(contextValue as ArenaV2WeaponLearningContextV1)
      ? contextValue as ArenaV2WeaponLearningContextV1
      : (() => { throw new RangeError('Arena下一学习目标续玩路由context未知。'); })();
  const effectiveLearningRequired = readDataField(
    source,
    'effectiveLearningRequired',
    'Arena下一学习目标续玩路由.nextGoal',
  );
  if (typeof effectiveLearningRequired !== 'boolean'
    || effectiveLearningRequired !== (kind !== 'record-improvement' && kind !== 'catalog-complete')) {
    throw new RangeError('Arena下一学习目标续玩路由effectiveLearningRequired漂移。');
  }
  const exactIdentity = (conditions: readonly boolean[], label: string): void => {
    if (conditions.some((condition) => !condition)) {
      throw new RangeError(`Arena下一学习目标续玩路由${label}身份不闭合。`);
    }
  };
  const goalId = readDataField(
    source,
    'goalId',
    'Arena下一学习目标续玩路由.nextGoal',
  );
  const scopeCompletion = scopeCompletionIdentity(goalId);
  if (kind === 'collect-map') {
    exactIdentity([mapDefinitionId !== null, weaponDefinitionId === null,
      segmentDefinitionId === null, modeDefinitionId === null,
      challengeDefinitionId === null, context === null,
      goalId === `collect-map:${mapDefinitionId}`], 'collect-map');
  } else if (kind === 'collect-weapon') {
    exactIdentity([weaponDefinitionId !== null, mapDefinitionId === null,
      segmentDefinitionId === null, modeDefinitionId === null,
      challengeDefinitionId === null, context === null,
      goalId === `collect-weapon:${weaponDefinitionId}`], 'collect-weapon');
  } else if (kind === 'weapon-context') {
    exactIdentity([weaponDefinitionId !== null, context !== null, mapDefinitionId === null,
      segmentDefinitionId === null, modeDefinitionId === null,
      challengeDefinitionId === null,
      goalId === `weapon-context:${weaponDefinitionId}:${context}`], 'weapon-context');
  } else if (kind === 'map-segment') {
    exactIdentity([mapDefinitionId !== null, segmentDefinitionId !== null,
      weaponDefinitionId === null, modeDefinitionId === null,
      challengeDefinitionId === null, context === null,
      goalId === `map-segment:${mapDefinitionId}:${segmentDefinitionId}`], 'map-segment');
  } else if (kind === 'mode-mastery' || kind === 'record-improvement') {
    exactIdentity([modeDefinitionId !== null, weaponDefinitionId === null,
      mapDefinitionId === null, segmentDefinitionId === null,
      challengeDefinitionId === null, context === null,
      kind === 'record-improvement'
        ? goalId === `record-improvement:${modeDefinitionId}`
        : goalId === `mode-first-completion:${modeDefinitionId}`
          || goalId === `mode-mastery:${modeDefinitionId}`], kind);
  } else if (kind === 'cross-challenge') {
    exactIdentity([challengeDefinitionId !== null, context === null,
      goalId === `cross-challenge:${challengeDefinitionId}`],
      'cross-challenge');
    const challenge = definition.challengeDefinitions.find((candidate) => (
      candidate.challengeDefinitionId === challengeDefinitionId
    ))!;
    exactIdentity([
      challenge.modeDefinitionId === modeDefinitionId,
      challenge.weaponDefinitionId === weaponDefinitionId,
      challenge.mapDefinitionId === mapDefinitionId,
      challenge.segmentDefinitionId === segmentDefinitionId,
    ], 'cross-challenge Definition');
  } else {
    exactIdentity([weaponDefinitionId === null, mapDefinitionId === null,
      segmentDefinitionId === null, modeDefinitionId === null,
      challengeDefinitionId === null, context === null,
      scopeCompletion !== null],
    'catalog-complete');
  }
  return Object.freeze({
    nextGoal: source as unknown as ArenaV2NextLearningGoalV1,
    scopeCompletion,
  });
}

export function resolveArenaV2NextLearningGoalContinuationRouteV1(
  value: unknown,
): ArenaV2NextLearningGoalContinuationRouteV1 {
  const source = assertPlainRecord(value, 'Arena下一学习目标续玩路由 options');
  assertKnownKeys(source, INPUT_KEYS, 'Arena下一学习目标续玩路由 options');
  for (const key of INPUT_KEYS) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`Arena下一学习目标续玩路由缺少${key}。`);
  }
  const definitionValue = readDataField(source, 'profileDefinition', 'Arena下一学习目标续玩路由');
  const definition = createArenaV2LearningProfileDefinitionV1(definitionValue);
  const validatedGoal = requireGoal(
    readDataField(source, 'nextGoal', 'Arena下一学习目标续玩路由'),
    definition,
  );
  const { nextGoal, scopeCompletion } = validatedGoal;
  if ((nextGoal.kind === 'catalog-complete') !== (scopeCompletion !== null)) {
    throw new RangeError('Arena下一学习目标续玩路由范围完成kind与稳定goalId不闭合。');
  }
  const modeByKind = (kind: ArenaV2LearningModeKindV1) => {
    const mode = definition.modeDefinitions.find((candidate) => candidate.kind === kind);
    if (mode === undefined) throw new RangeError(`Arena下一学习目标续玩路由缺少${kind}模式。`);
    return mode;
  };
  const explicitMode = nextGoal.modeDefinitionId === null
    ? null
    : definition.modeDefinitions.find((mode) => (
      mode.modeDefinitionId === nextGoal.modeDefinitionId
    ))!;
  const recommendedMode = scopeCompletion !== null
    ? null
    : explicitMode
      ?? (nextGoal.context === 'survival'
          ? modeByKind('survival')
          : nextGoal.kind === 'collect-map'
              || nextGoal.kind === 'map-segment'
              || (nextGoal.weaponDefinitionId === null && nextGoal.mapDefinitionId !== null)
            ? modeByKind('race')
            : modeByKind('duel'));
  const targetWeaponRequiresWorldPickup = nextGoal.weaponDefinitionId !== null
    && recommendedMode?.kind === 'survival';
  const continuationKind: ArenaV2NextLearningGoalContinuationKindV1 = recommendedMode === null
    ? 'free-choice'
    : targetWeaponRequiresWorldPickup
      ? 'conditional-survival-supply'
      : explicitMode !== null
        ? 'explicit-mode'
        : nextGoal.kind === 'collect-map' || nextGoal.kind === 'map-segment'
          ? 'map-route-practice'
          : 'deterministic-weapon-loadout';
  return Object.freeze({
    schemaVersion: 1 as const,
    goalId: nextGoal.goalId,
    goalKind: nextGoal.kind,
    continuationKind,
    recommendedModeDefinitionId: recommendedMode?.modeDefinitionId ?? null,
    recommendedModeKind: recommendedMode?.kind ?? null,
    targetWeaponDefinitionId: nextGoal.weaponDefinitionId,
    targetMapDefinitionId: nextGoal.mapDefinitionId,
    requiresTargetWeaponSelection: nextGoal.weaponDefinitionId !== null
      && !targetWeaponRequiresWorldPickup,
    targetWeaponRequiresWorldPickup,
    requiresTargetMapSelection: nextGoal.mapDefinitionId !== null,
  });
}
