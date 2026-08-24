import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1,
  type ArenaV2SurvivalWeaponRuntimeVariantCandidateV1,
} from '@number-strategy-jump/arena-product-content';
import {
  runArenaWeaponBundleConsequenceScenariosCandidateV1,
  type ArenaBaselineWeaponBundleV1,
} from './arena-baseline-weapon-consequence-verification-v1.js';

export const ARENA_SURVIVAL_WEAPON_TIER_CONSEQUENCE_VERIFICATION_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_SURVIVAL_WEAPON_TIER_CONSEQUENCE_VERIFICATION_V1_CANDIDATE_STATUS =
  'production-unreachable' as const;

const LEVELS = Object.freeze([1, 10] as const);
const CATALOG = ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1;

export interface ArenaSurvivalWeaponTierConsequenceRunV1 {
  readonly weaponId: string;
  readonly survivalLevel: 1 | 10;
  readonly runtimeEquipmentDefinitionId: string;
  readonly runtimeGrammarDefinitionId: string;
  readonly runtimeContentHash: string;
  readonly scenarioCount: number;
  readonly actionStartedCount: number;
  readonly hitCount: number;
  readonly whiffHitCount: number;
  readonly cooldownRejectedCount: number;
  readonly interruptCommittedCount: number;
  readonly movementCommandExecutedCount: number;
  readonly maximumHorizontalDisplacement: number;
  readonly hitstunTicks: readonly number[];
  readonly scenarioHashes: readonly string[];
  readonly resultHash: string;
}

export interface ArenaSurvivalWeaponTierConsequenceVerificationReportV1 {
  readonly schemaVersion:
    typeof ARENA_SURVIVAL_WEAPON_TIER_CONSEQUENCE_VERIFICATION_V1_SCHEMA_VERSION;
  readonly candidateStatus:
    typeof ARENA_SURVIVAL_WEAPON_TIER_CONSEQUENCE_VERIFICATION_V1_CANDIDATE_STATUS;
  readonly hardGate: false;
  readonly usesRealRulePhysicsConsequenceRunner: true;
  readonly comparesLevels: readonly [1, 10];
  readonly semanticsLocked: true;
  readonly addsInput: false;
  readonly addsAction: false;
  readonly exercisesP2ModeLifecycle: false;
  readonly runs: readonly ArenaSurvivalWeaponTierConsequenceRunV1[];
  readonly resultHash: string;
}

function variant(
  weaponId: ArenaV2SurvivalWeaponRuntimeVariantCandidateV1['weaponId'],
  level: 1 | 10,
): ArenaV2SurvivalWeaponRuntimeVariantCandidateV1 {
  const result = CATALOG.runtimeVariants.find((candidate) => (
    candidate.weaponId === weaponId && candidate.level === level
  ));
  if (!result) throw new Error(`${weaponId} Survival level ${level} runtime缺失。`);
  return result;
}

function runVariant(
  runtime: ArenaV2SurvivalWeaponRuntimeVariantCandidateV1,
): ArenaSurvivalWeaponTierConsequenceRunV1 {
  if (runtime.level !== 1 && runtime.level !== 10) {
    throw new RangeError('P4 tier consequence只比较level 1/10。');
  }
  const bundle: ArenaBaselineWeaponBundleV1 = Object.freeze({
    id: `${runtime.weaponId}.survival.level-${runtime.level}`,
    actions: runtime.actions,
    equipment: runtime.equipment,
    grammar: runtime.grammar,
    contentHash: runtime.contentHash,
  });
  const scenarios = runArenaWeaponBundleConsequenceScenariosCandidateV1(bundle);
  const authority = Object.freeze({
    weaponId: runtime.weaponId,
    survivalLevel: runtime.level,
    runtimeEquipmentDefinitionId: runtime.equipment.id,
    runtimeGrammarDefinitionId: runtime.grammar.id,
    runtimeContentHash: runtime.contentHash,
    scenarioCount: scenarios.length,
    actionStartedCount: scenarios.filter(({ actionStarted }) => actionStarted).length,
    hitCount: scenarios.reduce((total, scenario) => total + scenario.hitCount, 0),
    whiffHitCount: scenarios.reduce((total, scenario) => total + scenario.whiffHitCount, 0),
    cooldownRejectedCount: scenarios.filter(({ cooldownRejected }) => cooldownRejected).length,
    interruptCommittedCount: scenarios.filter(({ interruptCommitted }) => interruptCommitted).length,
    movementCommandExecutedCount: scenarios.filter(({ movementCommandExecuted }) => (
      movementCommandExecuted
    )).length,
    maximumHorizontalDisplacement: Math.max(...scenarios.map(
      ({ targetMaximumHorizontalDisplacement }) => targetMaximumHorizontalDisplacement,
    )),
    hitstunTicks: Object.freeze(scenarios.map(({ hitstunTicks }) => hitstunTicks ?? 0)),
    scenarioHashes: Object.freeze(scenarios.map(({ resultHash }) => resultHash)),
  });
  return Object.freeze({
    ...authority,
    resultHash: createDeterministicDataHash(
      authority,
      `Arena Survival ${runtime.weaponId} Level ${runtime.level} Consequence`,
    ),
  });
}

export function runArenaSurvivalWeaponTierConsequenceVerificationCandidateV1():
ArenaSurvivalWeaponTierConsequenceVerificationReportV1 {
  const weaponIds = Object.freeze([
    'heavy-hammer', 'gravity-chain', 'charge-shield',
  ] as const);
  const runs = Object.freeze(weaponIds.flatMap((weaponId) => LEVELS.map((level) => (
    runVariant(variant(weaponId, level))
  ))));
  const authority = Object.freeze({
    schemaVersion: ARENA_SURVIVAL_WEAPON_TIER_CONSEQUENCE_VERIFICATION_V1_SCHEMA_VERSION,
    candidateStatus: ARENA_SURVIVAL_WEAPON_TIER_CONSEQUENCE_VERIFICATION_V1_CANDIDATE_STATUS,
    hardGate: false as const,
    usesRealRulePhysicsConsequenceRunner: true as const,
    comparesLevels: LEVELS,
    semanticsLocked: true as const,
    addsInput: false as const,
    addsAction: false as const,
    exercisesP2ModeLifecycle: false as const,
    runs,
  });
  return Object.freeze({
    ...authority,
    resultHash: createDeterministicDataHash(
      authority,
      'Arena Survival Weapon Tier Consequence Verification V1',
    ),
  });
}
