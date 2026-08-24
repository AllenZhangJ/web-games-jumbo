import {
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
} from './arena-v2-next-learning-goal-v1.js';
import {
  resolveArenaV2NextLearningGoalContinuationRouteV1,
} from './arena-v2-next-learning-goal-continuation-route-v1.js';
import { readDataField, readExactOptions } from './options.js';

export interface ArenaV2FullCatalogReplayCombinationV1 {
  readonly schemaVersion: 1;
  readonly profileRevision: number;
  readonly modeDefinitionId: string;
  readonly modeKind: ArenaV2LearningModeKindV1;
  readonly modePlayCount: number;
  readonly weaponDefinitionId: string;
  readonly weaponRotationOrdinal: number;
  readonly eligibleWeaponCount: number;
  readonly mapDefinitionId: string;
  readonly mapRotationOrdinal: number;
  readonly mapCount: number;
  readonly weaponMapRotationCycleLength: number;
  readonly survivalWeaponRequiresWorldPickup: boolean;
}

const INPUT_KEYS = new Set([
  'profileDefinition', 'profile', 'nextGoal', 'eligibleWeaponDefinitionIds',
  'eligibleMapDefinitionIds',
]);
const MODE_ORDER = Object.freeze(['duel', 'race', 'survival'] as const);

function eligibleWeaponDefinitionIds(
  definitionIds: readonly string[],
  value: unknown,
): readonly string[] {
  if (value === null) return definitionIds;
  if (!Array.isArray(value) || value.length === 0) {
    throw new RangeError('Arena完整目录复练组合可用武器必须是非空数组或null。');
  }
  const known = new Set(definitionIds);
  const requested = new Set<string>();
  value.forEach((entry, index) => {
    if (typeof entry !== 'string' || !known.has(entry)) {
      throw new RangeError(`Arena完整目录复练组合可用武器[${index}]不在Definition中。`);
    }
    if (requested.has(entry)) {
      throw new RangeError(`Arena完整目录复练组合重复可用武器${entry}。`);
    }
    requested.add(entry);
  });
  return Object.freeze(definitionIds.filter((id) => requested.has(id)));
}

function eligibleMapDefinitionIds(
  definitionIds: readonly string[],
  value: unknown,
): readonly string[] {
  if (value === null) return definitionIds;
  if (!Array.isArray(value) || value.length === 0) {
    throw new RangeError('Arena完整目录复练组合可用地图必须是非空数组或null。');
  }
  const known = new Set(definitionIds);
  const requested = new Set<string>();
  value.forEach((entry, index) => {
    if (typeof entry !== 'string' || !known.has(entry)) {
      throw new RangeError(`Arena完整目录复练组合可用地图[${index}]不在Definition中。`);
    }
    if (requested.has(entry)) {
      throw new RangeError(`Arena完整目录复练组合重复可用地图${entry}。`);
    }
    requested.add(entry);
  });
  return Object.freeze(definitionIds.filter((id) => requested.has(id)));
}

export function projectArenaV2FullCatalogReplayCombinationV1(
  value: unknown,
): ArenaV2FullCatalogReplayCombinationV1 | null {
  const options = readExactOptions(
    value,
    INPUT_KEYS,
    'ArenaV2FullCatalogReplayCombinationV1 options',
  );
  const definition = createArenaV2LearningProfileDefinitionV1(options.profileDefinition);
  const profile = createArenaV2LearningProfileV1(definition, options.profile);
  const eligibleWeapons = eligibleWeaponDefinitionIds(
    definition.weaponDefinitionIds,
    options.eligibleWeaponDefinitionIds,
  );
  const eligibleMaps = eligibleMapDefinitionIds(
    definition.mapDefinitions.map(({ mapDefinitionId }) => mapDefinitionId),
    options.eligibleMapDefinitionIds,
  );
  const route = resolveArenaV2NextLearningGoalContinuationRouteV1({
    profileDefinition: definition,
    nextGoal: options.nextGoal,
  });
  const goalRecord = assertPlainRecord(
    options.nextGoal,
    'Arena完整目录复练组合nextGoal',
  );
  const goalProfileRevision = readDataField(
    goalRecord,
    'profileRevision',
    'Arena完整目录复练组合nextGoal',
  );
  if (goalProfileRevision !== profile.revision) {
    throw new RangeError('Arena完整目录复练组合nextGoal与Profile revision漂移。');
  }
  const authoritativeGoal = resolveArenaV2NextLearningGoalV1({
    profileDefinition: definition,
    profile,
    ...(options.eligibleWeaponDefinitionIds === null
      ? {}
      : { eligibleWeaponDefinitionIds: eligibleWeapons }),
  });
  if (route.goalId !== authoritativeGoal.goalId
    || route.goalKind !== authoritativeGoal.kind
    || authoritativeGoal.profileRevision !== profile.revision) {
    throw new RangeError('Arena完整目录复练组合nextGoal不是当前Profile权威唯一目标。');
  }
  if (route.goalKind !== 'catalog-complete') return null;
  if (route.goalId === ARENA_V2_ACTIVE_LEARNING_COMPLETE_GOAL_ID_V1) return null;
  if (route.goalId !== ARENA_V2_FULL_CATALOG_COMPLETE_GOAL_ID_V1
    || route.continuationKind !== 'free-choice') {
    throw new RangeError('Arena完整目录复练组合只接受完整catalog-complete终态。');
  }

  for (const weaponDefinitionId of eligibleWeapons) {
    if (!profile.collections.weaponDefinitionIds.includes(weaponDefinitionId)) {
      throw new RangeError('Arena完整目录复练组合不能推荐未收藏武器。');
    }
  }
  for (const mapDefinitionId of eligibleMaps) {
    if (!profile.collections.mapDefinitionIds.includes(mapDefinitionId)) {
      throw new RangeError('Arena完整目录复练组合不能推荐未收藏地图。');
    }
  }
  const modes = MODE_ORDER.map((kind) => {
    const mode = definition.modeDefinitions.find((entry) => entry.kind === kind);
    const record = mode === undefined
      ? undefined
      : profile.modeRecords.find((entry) => (
        entry.modeDefinitionId === mode.modeDefinitionId
      ));
    if (mode === undefined || record === undefined || record.kind !== kind
      || record.bestPerformanceTicks === null) {
      throw new RangeError(`Arena完整目录复练组合缺少${kind}可比较记录。`);
    }
    return Object.freeze({
      modeDefinitionId: mode.modeDefinitionId,
      modeKind: kind,
      modePlayCount: record.playCount,
    });
  });
  const recommendedMode = modes.reduce((selected, candidate) => (
    candidate.modePlayCount < selected.modePlayCount ? candidate : selected
  ), modes[0]!);

  const weaponRotationIndex = profile.revision % eligibleWeapons.length;
  const mapRotationIndex = Math.floor(
    profile.revision / eligibleWeapons.length,
  ) % eligibleMaps.length;
  const weaponMapRotationCycleLength = eligibleWeapons.length
    * eligibleMaps.length;
  if (!Number.isSafeInteger(weaponMapRotationCycleLength)
    || weaponMapRotationCycleLength < 1) {
    throw new RangeError('Arena完整目录复练组合轮转周期无效。');
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    profileRevision: profile.revision,
    ...recommendedMode,
    weaponDefinitionId: eligibleWeapons[weaponRotationIndex]!,
    weaponRotationOrdinal: weaponRotationIndex + 1,
    eligibleWeaponCount: eligibleWeapons.length,
    mapDefinitionId: eligibleMaps[mapRotationIndex]!,
    mapRotationOrdinal: mapRotationIndex + 1,
    mapCount: eligibleMaps.length,
    weaponMapRotationCycleLength,
    survivalWeaponRequiresWorldPickup: recommendedMode.modeKind === 'survival',
  });
}

export const ARENA_V2_FULL_CATALOG_REPLAY_COMBINATION_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  modePolicy: 'least-played-fixed-duel-race-survival-tie-break' as const,
  weaponPolicy: 'profile-revision-modulo-eligible-weapon-catalog' as const,
  mapPolicy:
    'profile-revision-quotient-eligible-weapon-catalog-modulo-eligible-map-catalog' as const,
  excludesUnavailableWeaponsAndMaps: true as const,
  fullWeaponMapCycleBeforeRepeat: true as const,
  addsPersistedRotationState: false as const,
  writesProfileAuthorityRewardOrTask: false as const,
});
