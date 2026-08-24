import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  createDefaultTargetingRegistry,
} from '@number-strategy-jump/arena-core';
import {
  ARENA_GAMEPLAY_V2_TUNING,
  projectArenaWeaponPublicNumbers,
  type ActionDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_FLANK_BLADE_WEAPON_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  runArenaWeaponBundleConsequenceScenariosCandidateV1,
  type ArenaBaselineWeaponBundleV1,
} from './arena-baseline-weapon-consequence-verification-v1.js';
import {
  runArenaWeaponBundleMatchCoreReplayCandidateV1,
} from './arena-baseline-weapon-matchcore-replay-verification-v1.js';

export const ARENA_FLANK_BLADE_VERIFICATION_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_FLANK_BLADE_VERIFICATION_V1_CANDIDATE_STATUS =
  'production-unreachable' as const;

const CANDIDATE = ARENA_V2_FLANK_BLADE_WEAPON_CANDIDATE_V1;
const BUNDLE: ArenaBaselineWeaponBundleV1 = Object.freeze({
  id: 'flank-blade',
  actions: CANDIDATE.actions,
  equipment: CANDIDATE.equipment,
  grammar: CANDIDATE.grammar,
  contentHash: CANDIDATE.contentHash,
});

function targetingProbe(action: ActionDefinition) {
  const registry = createDefaultTargetingRegistry();
  const source = Object.freeze({
    id: 'flank-source',
    position: Object.freeze({ x: -1, y: 0, z: 0 }),
    facing: Object.freeze({ x: 1, z: 0 }),
  });
  const behindTargetIds = registry.resolve({
    definition: action,
    source,
    candidates: [Object.freeze({
      id: 'flank-target',
      position: Object.freeze({ x: 0, y: 0, z: 0 }),
      facing: Object.freeze({ x: 4, z: 0 }),
    })],
  });
  const frontTargetIds = registry.resolve({
    definition: action,
    source,
    candidates: [Object.freeze({
      id: 'flank-target',
      position: Object.freeze({ x: 0, y: 0, z: 0 }),
      facing: Object.freeze({ x: -4, z: 0 }),
    })],
  });
  return Object.freeze({
    actionDefinitionId: action.id,
    targetingKind: action.targeting.kind,
    behindTargetIds,
    frontTargetIds,
  });
}

export function runArenaFlankBladeVerificationCandidateV1() {
  const scenarios = runArenaWeaponBundleConsequenceScenariosCandidateV1(BUNDLE);
  const targetingProbes = Object.freeze(CANDIDATE.actions.map(targetingProbe));
  const matchCoreReplay = runArenaWeaponBundleMatchCoreReplayCandidateV1(BUNDLE);
  const authority = Object.freeze({
    schemaVersion: ARENA_FLANK_BLADE_VERIFICATION_V1_SCHEMA_VERSION,
    candidateStatus: ARENA_FLANK_BLADE_VERIFICATION_V1_CANDIDATE_STATUS,
    hardGate: false as const,
    defaultRegistryWired: false as const,
    weaponId: BUNDLE.id,
    weaponContentHash: BUNDLE.contentHash,
    coreVerb: BUNDLE.grammar.coreVerb,
    requiredInput: BUNDLE.grammar.requiredInput,
    groundPublicNumbers: projectArenaWeaponPublicNumbers(
      ARENA_GAMEPLAY_V2_TUNING.attacks['flank-blade-ground'],
    ),
    aerialPublicNumbers: projectArenaWeaponPublicNumbers(
      ARENA_GAMEPLAY_V2_TUNING.attacks['flank-blade-aerial'],
    ),
    usesNormalizedTargetFacing: true as const,
    usesRealTargetingRegistry: true as const,
    usesRealRulePhysicsConsequenceRunner: true as const,
    usesRealMatchCoreReplayRunner: true as const,
    scenarioCount: scenarios.length,
    scenarios,
    targetingProbes,
    matchCoreReplay,
    exercisesP2ModeLifecycle: false as const,
  });
  return Object.freeze({
    ...authority,
    resultHash: createDeterministicDataHash(
      authority,
      'Arena Flank Blade Verification Candidate V1',
    ),
  });
}
