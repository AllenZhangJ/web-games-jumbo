import {
  ARENA_GAMEPLAY_V2_TUNING,
  WEAPON_ACTION_CONTEXT_V1,
  WEAPON_COMBAT_GRAMMAR_DEFINITION_V1_SCHEMA_VERSION,
  WEAPON_CORE_VERB_V1,
  WEAPON_COUNTER_INPUT_V1,
  WEAPON_FAILURE_RISK_V1,
  WEAPON_MAP_SITUATION_V1,
  WEAPON_MODE_KIND_V1,
  WEAPON_TUNING_FIELD_V1,
  createWeaponCombatGrammarDefinitionV1,
} from '@number-strategy-jump/arena-definitions';
import {
  createAerialWeaponActionCandidateV1,
  createGroundWeaponActionCandidateV1,
  createWeaponEquipmentCandidateV1,
  validateWeaponCandidateBundleV1,
} from './arena-v2-baseline-weapon-candidate-support-v1.js';

export const ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1_ID = Object.freeze({
  equipment: 'arena-v2.weapon.charge-shield.candidate.v1',
  groundAction: 'arena-v2.action.charge-shield.ground.candidate.v1',
  aerialAction: 'arena-v2.action.charge-shield.aerial.candidate.v1',
  grammar: 'arena-v2.weapon-grammar.charge-shield.candidate.v1',
});

const IDS = ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1_ID;
const SHIELD_SELF_MOVEMENT = ARENA_GAMEPLAY_V2_TUNING.attacks['shield-charge'].selfMovement;
if (SHIELD_SELF_MOVEMENT === null) {
  throw new Error('Charge Shield candidate需要显式selfMovement。');
}

export const ARENA_V2_CHARGE_SHIELD_ACTION_DEFINITIONS_CANDIDATE_V1 = Object.freeze([
  createGroundWeaponActionCandidateV1({
    id: IDS.groundAction,
    tuningId: 'shield-charge',
    impactEffectKind: 'apply-directional-impulse',
    selfHorizontalImpulse: SHIELD_SELF_MOVEMENT.horizontalImpulse,
    tags: ['arena-v2', 'equipment', 'charge-shield', 'charge', 'no-guard'],
  }),
  createAerialWeaponActionCandidateV1({
    id: IDS.aerialAction,
    tuningId: 'shield-air-drop',
    impactEffectKind: 'apply-directional-impulse',
    tags: ['arena-v2', 'equipment', 'charge-shield', 'charge', 'no-guard'],
  }),
]);

export const ARENA_V2_CHARGE_SHIELD_EQUIPMENT_DEFINITION_CANDIDATE_V1 =
  createWeaponEquipmentCandidateV1({
    id: IDS.equipment,
    category: 'charge',
    groundActionDefinitionId: IDS.groundAction,
    aerialActionDefinitionId: IDS.aerialAction,
    presentationSemantic: 'charge-shield',
    tags: ['arena-v2', 'baseline-weapon', 'charge-shield', 'no-guard'],
  });

export const ARENA_V2_CHARGE_SHIELD_GRAMMAR_DEFINITION_CANDIDATE_V1 =
  createWeaponCombatGrammarDefinitionV1({
    schemaVersion: WEAPON_COMBAT_GRAMMAR_DEFINITION_V1_SCHEMA_VERSION,
    id: IDS.grammar,
    equipmentDefinitionId: IDS.equipment,
    coreVerb: WEAPON_CORE_VERB_V1.CHARGE,
    requiredInput: 'primary',
    contexts: [{
      kind: WEAPON_ACTION_CONTEXT_V1.GROUND,
      actionDefinitionId: IDS.groundAction,
      intendedResult: 'self-displace-and-push-target',
      mapSituations: [
        WEAPON_MAP_SITUATION_V1.NARROW_PATH,
        WEAPON_MAP_SITUATION_V1.PLATFORM_ENTRY,
        WEAPON_MAP_SITUATION_V1.EDGE,
      ],
      failureRisk: WEAPON_FAILURE_RISK_V1.SELF_OVERSHOOT,
      counterInputs: [WEAPON_COUNTER_INPUT_V1.DIRECTION, WEAPON_COUNTER_INPUT_V1.JUMP],
    }, {
      kind: WEAPON_ACTION_CONTEXT_V1.AERIAL,
      actionDefinitionId: IDS.aerialAction,
      intendedResult: 'downward-route-entry',
      mapSituations: [
        WEAPON_MAP_SITUATION_V1.HEIGHT_TRANSITION,
        WEAPON_MAP_SITUATION_V1.GAP,
        WEAPON_MAP_SITUATION_V1.OPEN_PLATFORM,
      ],
      failureRisk: WEAPON_FAILURE_RISK_V1.LANDING_COMMITMENT,
      counterInputs: [WEAPON_COUNTER_INPUT_V1.DIRECTION],
    }],
    modeConsequences: [{
      modeKind: WEAPON_MODE_KIND_V1.DUEL,
      mapSituations: [WEAPON_MAP_SITUATION_V1.NARROW_PATH, WEAPON_MAP_SITUATION_V1.EDGE],
      intendedOutcomes: ['take-space-quickly', 'risk-self-elimination-on-read'],
    }, {
      modeKind: WEAPON_MODE_KIND_V1.RACE,
      mapSituations: [WEAPON_MAP_SITUATION_V1.PLATFORM_ENTRY, WEAPON_MAP_SITUATION_V1.GAP],
      intendedOutcomes: ['contest-straight-line', 'overshoot-loses-route-progress'],
    }, {
      modeKind: WEAPON_MODE_KIND_V1.SURVIVAL,
      mapSituations: [WEAPON_MAP_SITUATION_V1.NARROW_PATH, WEAPON_MAP_SITUATION_V1.OPEN_PLATFORM],
      intendedOutcomes: ['escape-pressure-line', 'push-one-enemy-from-route'],
    }],
    survivalGrowth: {
      semanticsLocked: true,
      addsInput: false,
      addsAction: false,
      permittedTuningFields: [
        WEAPON_TUNING_FIELD_V1.HORIZONTAL_IMPULSE,
        WEAPON_TUNING_FIELD_V1.COOLDOWN_TICKS,
        WEAPON_TUNING_FIELD_V1.HITSTUN_TICKS,
      ],
    },
    tags: ['arena-v2', 'baseline-weapon', 'charge-shield', 'no-guard'],
  });

export const ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  guardEnabled: false as const,
  actions: ARENA_V2_CHARGE_SHIELD_ACTION_DEFINITIONS_CANDIDATE_V1,
  equipment: ARENA_V2_CHARGE_SHIELD_EQUIPMENT_DEFINITION_CANDIDATE_V1,
  grammar: ARENA_V2_CHARGE_SHIELD_GRAMMAR_DEFINITION_CANDIDATE_V1,
  contentHash: validateWeaponCandidateBundleV1({
    actions: ARENA_V2_CHARGE_SHIELD_ACTION_DEFINITIONS_CANDIDATE_V1,
    equipment: ARENA_V2_CHARGE_SHIELD_EQUIPMENT_DEFINITION_CANDIDATE_V1,
    grammar: ARENA_V2_CHARGE_SHIELD_GRAMMAR_DEFINITION_CANDIDATE_V1,
    forbiddenEffectKinds: ['front-guard', 'guard', 'damage-reduction', 'invulnerability'],
  }),
});
