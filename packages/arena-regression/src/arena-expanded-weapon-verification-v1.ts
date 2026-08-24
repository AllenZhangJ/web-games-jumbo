import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_EXPANDED_WEAPONS_CANDIDATE_V1,
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1,
  ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  runArenaWeaponBundleConsequenceScenariosCandidateV1,
  type ArenaBaselineWeaponBundleV1,
  type ArenaBaselineWeaponConsequenceScenarioV1,
} from './arena-baseline-weapon-consequence-verification-v1.js';
import {
  runArenaWeaponBundleMatchCoreReplayCandidateV1,
  type ArenaBaselineWeaponMatchCoreReplayRunV1,
} from './arena-baseline-weapon-matchcore-replay-verification-v1.js';

export const ARENA_EXPANDED_WEAPON_VERIFICATION_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_EXPANDED_WEAPON_VERIFICATION_V1_CANDIDATE_STATUS =
  'production-unreachable' as const;

export interface ArenaExpandedWeaponVerificationReportV1 {
  readonly schemaVersion: typeof ARENA_EXPANDED_WEAPON_VERIFICATION_V1_SCHEMA_VERSION;
  readonly candidateStatus: typeof ARENA_EXPANDED_WEAPON_VERIFICATION_V1_CANDIDATE_STATUS;
  readonly hardGate: false;
  readonly defaultRegistryWired: false;
  readonly mapDefinitionId: string;
  readonly characterDefinitionId: string;
  readonly weaponCount: 14;
  readonly usesSharedRulePhysicsExecutor: true;
  readonly usesMatchCoreReplayCheckpointExecutor: true;
  readonly exercisesGroundAndAerialContexts: true;
  readonly exercisesEdgeAndNarrowPathSituations: true;
  readonly exercisesP2ModeLifecycle: false;
  readonly weaponContentHashes: readonly Readonly<{
    readonly weaponId: string;
    readonly contentHash: string;
  }>[];
  readonly consequenceScenarios: readonly ArenaBaselineWeaponConsequenceScenarioV1[];
  readonly replayRuns: readonly ArenaBaselineWeaponMatchCoreReplayRunV1[];
  readonly resultHash: string;
}

const WEAPONS: readonly ArenaBaselineWeaponBundleV1[] = Object.freeze(
  ARENA_V2_EXPANDED_WEAPONS_CANDIDATE_V1.map((weapon) => Object.freeze({
    id: weapon.id,
    actions: weapon.actions,
    equipment: weapon.equipment,
    grammar: weapon.grammar,
    contentHash: weapon.contentHash,
  })),
);

if (WEAPONS.length !== 14 || new Set(WEAPONS.map(({ id }) => id)).size !== 14) {
  throw new RangeError('Arena扩展武器验证必须精确覆盖14把唯一武器。');
}

export const ARENA_EXPANDED_WEAPON_VERIFICATION_PLAN_CANDIDATE_V1 = Object.freeze({
  schemaVersion: ARENA_EXPANDED_WEAPON_VERIFICATION_V1_SCHEMA_VERSION,
  candidateStatus: ARENA_EXPANDED_WEAPON_VERIFICATION_V1_CANDIDATE_STATUS,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  weaponIds: Object.freeze(WEAPONS.map(({ id }) => id)),
  expectedConsequenceScenarioCount: 56 as const,
  expectedReplayRunCount: 14 as const,
});

export function runArenaExpandedWeaponVerificationCandidateV1():
ArenaExpandedWeaponVerificationReportV1 {
  const consequenceScenarios = Object.freeze(WEAPONS.flatMap((weapon) => (
    runArenaWeaponBundleConsequenceScenariosCandidateV1(weapon)
  )));
  const replayRuns = Object.freeze(
    WEAPONS.map(runArenaWeaponBundleMatchCoreReplayCandidateV1),
  );
  if (consequenceScenarios.length
      !== ARENA_EXPANDED_WEAPON_VERIFICATION_PLAN_CANDIDATE_V1
        .expectedConsequenceScenarioCount
    || replayRuns.length
      !== ARENA_EXPANDED_WEAPON_VERIFICATION_PLAN_CANDIDATE_V1.expectedReplayRunCount) {
    throw new RangeError('Arena扩展武器验证执行结果未闭合到56个场景和14条回放。');
  }
  const authority = Object.freeze({
    schemaVersion: ARENA_EXPANDED_WEAPON_VERIFICATION_V1_SCHEMA_VERSION,
    candidateStatus: ARENA_EXPANDED_WEAPON_VERIFICATION_V1_CANDIDATE_STATUS,
    hardGate: false as const,
    defaultRegistryWired: false as const,
    mapDefinitionId: ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.mapDefinition.id,
    characterDefinitionId: ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1.id,
    weaponCount: 14 as const,
    usesSharedRulePhysicsExecutor: true as const,
    usesMatchCoreReplayCheckpointExecutor: true as const,
    exercisesGroundAndAerialContexts: true as const,
    exercisesEdgeAndNarrowPathSituations: true as const,
    exercisesP2ModeLifecycle: false as const,
    weaponContentHashes: Object.freeze(WEAPONS.map(({ id, contentHash }) => Object.freeze({
      weaponId: id,
      contentHash,
    }))),
    consequenceScenarios,
    replayRuns,
  });
  return Object.freeze({
    ...authority,
    resultHash: createDeterministicDataHash(
      authority,
      'Arena Expanded Weapon Verification V1',
    ),
  });
}
