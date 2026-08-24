import {
  assertKnownKeys,
  assertPlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaV2LearningProfileDefinitionV1,
  createArenaV2LearningProfileV1,
  type ArenaV2LearningModeKindV1,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1,
  ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1,
  resolveArenaV2NextLearningGoalV1,
  type ArenaV2NextLearningGoalV1,
} from './arena-v2-next-learning-goal-v1.js';
import { readDataField } from './options.js';

export type ArenaV2ResultNextGoalRouteFitKindV1 =
  | 'settlement-pending'
  | 'stable-current-combination'
  | 'adjust-before-next-match'
  | 'conditional-survival-supply'
  | 'free-challenge';

export interface ArenaV2ResultNextGoalRouteFitV1 {
  readonly schemaVersion: 1;
  readonly profileRevision: number;
  readonly eligibleWeaponDefinitionIds: readonly string[] | null;
  readonly kind: ArenaV2ResultNextGoalRouteFitKindV1;
  readonly nextGoal: ArenaV2NextLearningGoalV1;
  readonly sourceModeDefinitionId: string | null;
  readonly sourceModeKind: ArenaV2LearningModeKindV1 | null;
  readonly recommendedModeDefinitionId: string | null;
  readonly recommendedModeKind: ArenaV2LearningModeKindV1 | null;
  readonly targetWeaponDefinitionId: string | null;
  readonly targetMapDefinitionId: string | null;
  readonly requiresModeChange: boolean;
  readonly requiresWeaponChange: boolean;
  readonly requiresMapChange: boolean;
  readonly deterministicCurrentReplayCanAdvance: boolean;
  readonly conditionalCurrentReplayCanAdvance: boolean;
  readonly defaultResultDecision: 'play-again' | 'next-goal';
}

export const ARENA_V2_RESULT_NEXT_GOAL_ROUTE_FIT_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  reusesUniqueNextGoalResolver: true as const,
  freeChallengeUsesStableScopeCompletionGoalIds: true as const,
  scopeCompletionIdentitySource: 'unique-next-goal-resolver' as const,
  duplicatesScopeCompletionResolution: false as const,
  genericWeaponGoalDeterministicModeOrder: Object.freeze(['duel', 'race'] as const),
  survivalSupplyPathIsConditional: true as const,
  freezesEligibleWeaponScopeForNavigation: true as const,
  nullEligibleWeaponScopeMeansFullDefinition: true as const,
  doesNotMutateSelectionNavigationProfileOrReward: true as const,
  defaultEntryWired: false as const,
  validationStatus: 'not-run' as const,
});

const OPTION_KEYS = new Set([
  'profileDefinition',
  'profile',
  'eligibleWeaponDefinitionIds',
  'selectedWeaponDefinitionId',
  'selectedMapDefinitionId',
  'sourceModeDefinitionId',
]);

function optionalKnownId(
  value: unknown,
  allowed: ReadonlySet<string>,
  name: string,
): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !allowed.has(value)) {
    throw new RangeError(`${name}必须是已注册Definition ID或null。`);
  }
  return value;
}

function eligibleWeaponScope(
  value: unknown,
  definitionWeaponDefinitionIds: readonly string[],
): readonly string[] | null {
  if (value === undefined) return null;
  if (!Array.isArray(value) || value.length === 0) {
    throw new RangeError(
      'ArenaV2ResultNextGoalRouteFitV1 eligibleWeaponDefinitionIds必须是非空数组或undefined。',
    );
  }
  const known = new Set(definitionWeaponDefinitionIds);
  const supplied = new Set<string>();
  value.forEach((entry, index) => {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      throw new TypeError(
        `ArenaV2ResultNextGoalRouteFitV1 eligibleWeaponDefinitionIds[${index}]无效。`,
      );
    }
    if (!known.has(entry)) {
      throw new RangeError(`ArenaV2ResultNextGoalRouteFitV1包含目录外武器${entry}。`);
    }
    if (supplied.has(entry)) {
      throw new RangeError(`ArenaV2ResultNextGoalRouteFitV1重复声明武器${entry}。`);
    }
    supplied.add(entry);
  });
  return Object.freeze(definitionWeaponDefinitionIds.filter((weaponDefinitionId) => (
    supplied.has(weaponDefinitionId)
  )));
}

export function resolveArenaV2ResultNextGoalRouteFitV1(
  value: unknown,
): ArenaV2ResultNextGoalRouteFitV1 {
  const name = 'ArenaV2ResultNextGoalRouteFitV1 options';
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, OPTION_KEYS, name);
  for (const key of OPTION_KEYS) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  const profileDefinitionValue = readDataField(source, 'profileDefinition', name);
  const profileValue = readDataField(source, 'profile', name);
  const definition = createArenaV2LearningProfileDefinitionV1(profileDefinitionValue);
  const profile = createArenaV2LearningProfileV1(definition, profileValue);
  const normalizedEligibleWeaponDefinitionIds = eligibleWeaponScope(
    readDataField(source, 'eligibleWeaponDefinitionIds', name),
    definition.weaponDefinitionIds,
  );
  const nextGoal = resolveArenaV2NextLearningGoalV1({
    profileDefinition: definition,
    profile,
    ...(normalizedEligibleWeaponDefinitionIds === null
      ? {}
      : { eligibleWeaponDefinitionIds: normalizedEligibleWeaponDefinitionIds }),
  });
  const fullCatalogComplete = nextGoal.kind === 'catalog-complete'
    && nextGoal.goalId === ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1;
  const activeLearningComplete = nextGoal.kind === 'catalog-complete'
    && nextGoal.goalId === ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1;
  if (nextGoal.kind === 'catalog-complete'
    && !fullCatalogComplete
    && !activeLearningComplete) {
    throw new RangeError('Arena结果自由挑战目标不是已注册的范围完成身份。');
  }
  if (nextGoal.kind !== 'catalog-complete'
    && (nextGoal.goalId === ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1
      || nextGoal.goalId === ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1)) {
    throw new RangeError('Arena结果自由挑战稳定目标ID与目标类型不闭合。');
  }
  const selectedWeaponDefinitionId = optionalKnownId(
    readDataField(source, 'selectedWeaponDefinitionId', name),
    new Set(definition.weaponDefinitionIds),
    `${name}.selectedWeaponDefinitionId`,
  );
  const selectedMapDefinitionId = optionalKnownId(
    readDataField(source, 'selectedMapDefinitionId', name),
    new Set(definition.mapDefinitions.map(({ mapDefinitionId }) => mapDefinitionId)),
    `${name}.selectedMapDefinitionId`,
  );
  const sourceModeDefinitionId = optionalKnownId(
    readDataField(source, 'sourceModeDefinitionId', name),
    new Set(definition.modeDefinitions.map(({ modeDefinitionId }) => modeDefinitionId)),
    `${name}.sourceModeDefinitionId`,
  );
  const sourceMode = sourceModeDefinitionId === null
    ? null
    : definition.modeDefinitions.find(({ modeDefinitionId }) => (
      modeDefinitionId === sourceModeDefinitionId
    ))!;
  const explicitMode = nextGoal.modeDefinitionId !== null
    ? definition.modeDefinitions.find(({ modeDefinitionId }) => (
      modeDefinitionId === nextGoal.modeDefinitionId
    ))
    : nextGoal.context === 'duel-counterplay'
      ? definition.modeDefinitions.find(({ kind }) => kind === 'duel')
      : nextGoal.context === 'survival'
        ? definition.modeDefinitions.find(({ kind }) => kind === 'survival')
        : null;
  if (explicitMode === undefined) {
    throw new RangeError('Arena结果长期目标缺少所需模式Definition。');
  }
  const deterministicWeaponMode = nextGoal.weaponDefinitionId === null
    || explicitMode !== null
    || sourceMode?.kind !== 'survival'
      ? null
      : definition.modeDefinitions.find(({ kind }) => kind === 'duel')
        ?? definition.modeDefinitions.find(({ kind }) => kind === 'race');
  if (nextGoal.weaponDefinitionId !== null
    && explicitMode === null
    && sourceMode?.kind === 'survival'
    && deterministicWeaponMode === undefined) {
    throw new RangeError('Arena通用武器目标缺少可稳定携带武器的模式。');
  }
  const recommendedMode = explicitMode
    ?? deterministicWeaponMode
    ?? sourceMode;
  const conditionalSurvivalSupply = nextGoal.weaponDefinitionId !== null
    && explicitMode?.kind === 'survival';
  const requiresModeChange = sourceMode !== null
    && recommendedMode !== null
    && sourceMode.modeDefinitionId !== recommendedMode.modeDefinitionId;
  const requiresMapChange = nextGoal.mapDefinitionId !== null
    && nextGoal.mapDefinitionId !== selectedMapDefinitionId;
  const requiresWeaponChange = !conditionalSurvivalSupply
    && nextGoal.weaponDefinitionId !== null
    && nextGoal.weaponDefinitionId !== selectedWeaponDefinitionId;
  const requiresAdjustment = requiresModeChange
    || requiresMapChange
    || requiresWeaponChange;
  const kind: ArenaV2ResultNextGoalRouteFitKindV1 = sourceMode === null
    ? 'settlement-pending'
    : fullCatalogComplete || activeLearningComplete
      ? 'free-challenge'
      : conditionalSurvivalSupply
        ? 'conditional-survival-supply'
        : requiresAdjustment
          ? 'adjust-before-next-match'
          : 'stable-current-combination';
  const conditionalCurrentReplayCanAdvance = kind === 'conditional-survival-supply'
    && !requiresModeChange
    && !requiresMapChange;
  const deterministicCurrentReplayCanAdvance = kind === 'stable-current-combination'
    || kind === 'free-challenge';
  return Object.freeze({
    schemaVersion: 1 as const,
    profileRevision: profile.revision,
    eligibleWeaponDefinitionIds: normalizedEligibleWeaponDefinitionIds,
    kind,
    nextGoal,
    sourceModeDefinitionId,
    sourceModeKind: sourceMode?.kind ?? null,
    recommendedModeDefinitionId: recommendedMode?.modeDefinitionId ?? null,
    recommendedModeKind: recommendedMode?.kind ?? null,
    targetWeaponDefinitionId: nextGoal.weaponDefinitionId,
    targetMapDefinitionId: nextGoal.mapDefinitionId,
    requiresModeChange,
    requiresWeaponChange,
    requiresMapChange,
    deterministicCurrentReplayCanAdvance,
    conditionalCurrentReplayCanAdvance,
    defaultResultDecision: requiresAdjustment ? 'next-goal' : 'play-again',
  });
}
