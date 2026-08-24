import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  createAerialWeaponActionCandidateV1,
  createGroundWeaponActionCandidateV1,
} from './arena-v2-baseline-weapon-candidate-support-v1.js';

export const ARENA_V2_UNARMED_ACTION_CANDIDATE_V1_ID = Object.freeze({
  groundAction: 'arena-v2.action.unarmed-push.ground.candidate.v1',
  aerialAction: 'arena-v2.action.unarmed-strike.aerial.candidate.v1',
});

export const ARENA_V2_UNARMED_ACTION_DEFINITIONS_CANDIDATE_V1 = Object.freeze([
  createGroundWeaponActionCandidateV1({
    id: ARENA_V2_UNARMED_ACTION_CANDIDATE_V1_ID.groundAction,
    tuningId: 'base-push',
    impactEffectKind: 'apply-directional-impulse',
    tags: ['arena-v2', 'unarmed', 'base-action', 'push'],
  }),
  createAerialWeaponActionCandidateV1({
    id: ARENA_V2_UNARMED_ACTION_CANDIDATE_V1_ID.aerialAction,
    tuningId: 'base-air-strike',
    impactEffectKind: 'apply-directional-impulse',
    tags: ['arena-v2', 'unarmed', 'base-action', 'push'],
  }),
]);

const AUTHORITY = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  requiredInput: 'primary' as const,
  addsInput: false as const,
  guardEnabled: false as const,
  actions: ARENA_V2_UNARMED_ACTION_DEFINITIONS_CANDIDATE_V1,
});

export const ARENA_V2_UNARMED_ACTION_CANDIDATE_V1 = Object.freeze({
  ...AUTHORITY,
  contentHash: createDeterministicDataHash(AUTHORITY, 'Arena V2 Unarmed Action Candidate V1'),
});
