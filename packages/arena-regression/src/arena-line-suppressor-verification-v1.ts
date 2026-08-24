import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_GAMEPLAY_V2_TUNING,
  projectArenaWeaponPublicNumbers,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_LINE_SUPPRESSOR_WEAPON_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  runArenaWeaponBundleConsequenceScenariosCandidateV1,
  type ArenaBaselineWeaponBundleV1,
} from './arena-baseline-weapon-consequence-verification-v1.js';
import {
  runArenaWeaponBundleMatchCoreReplayCandidateV1,
} from './arena-baseline-weapon-matchcore-replay-verification-v1.js';

export const ARENA_LINE_SUPPRESSOR_VERIFICATION_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_LINE_SUPPRESSOR_VERIFICATION_V1_CANDIDATE_STATUS =
  'production-unreachable' as const;

const CANDIDATE = ARENA_V2_LINE_SUPPRESSOR_WEAPON_CANDIDATE_V1;
const BUNDLE: ArenaBaselineWeaponBundleV1 = Object.freeze({
  id: 'line-suppressor',
  actions: CANDIDATE.actions,
  equipment: CANDIDATE.equipment,
  grammar: CANDIDATE.grammar,
  contentHash: CANDIDATE.contentHash,
});

export function runArenaLineSuppressorVerificationCandidateV1() {
  const scenarios = runArenaWeaponBundleConsequenceScenariosCandidateV1(BUNDLE);
  const matchCoreReplay = runArenaWeaponBundleMatchCoreReplayCandidateV1(BUNDLE);
  const authority = Object.freeze({
    schemaVersion: ARENA_LINE_SUPPRESSOR_VERIFICATION_V1_SCHEMA_VERSION,
    candidateStatus: ARENA_LINE_SUPPRESSOR_VERIFICATION_V1_CANDIDATE_STATUS,
    hardGate: false as const,
    defaultRegistryWired: false as const,
    weaponId: BUNDLE.id,
    weaponContentHash: BUNDLE.contentHash,
    coreVerb: BUNDLE.grammar.coreVerb,
    requiredInput: BUNDLE.grammar.requiredInput,
    groundPublicNumbers: projectArenaWeaponPublicNumbers(
      ARENA_GAMEPLAY_V2_TUNING.attacks['line-suppressor-ground'],
    ),
    aerialPublicNumbers: projectArenaWeaponPublicNumbers(
      ARENA_GAMEPLAY_V2_TUNING.attacks['line-suppressor-aerial'],
    ),
    usesRealRulePhysicsConsequenceRunner: true as const,
    usesRealMatchCoreReplayRunner: true as const,
    scenarioCount: scenarios.length,
    scenarios,
    matchCoreReplay,
    exercisesP2ModeLifecycle: false as const,
  });
  return Object.freeze({
    ...authority,
    resultHash: createDeterministicDataHash(
      authority,
      'Arena Line Suppressor Verification Candidate V1',
    ),
  });
}
