import {
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

export const ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1_ID = Object.freeze({
  equipment: 'arena-v2.weapon.heavy-hammer.candidate.v1',
  groundAction: 'arena-v2.action.heavy-hammer.ground.candidate.v1',
  aerialAction: 'arena-v2.action.heavy-hammer.aerial.candidate.v1',
  grammar: 'arena-v2.weapon-grammar.heavy-hammer.candidate.v1',
});

const IDS = ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1_ID;

export const ARENA_V2_HEAVY_HAMMER_ACTION_DEFINITIONS_CANDIDATE_V1 = Object.freeze([
  createGroundWeaponActionCandidateV1({
    id: IDS.groundAction,
    tuningId: 'hammer-smash',
    impactEffectKind: 'apply-directional-impulse',
    tags: ['arena-v2', 'equipment', 'heavy-hammer', 'push'],
  }),
  createAerialWeaponActionCandidateV1({
    id: IDS.aerialAction,
    tuningId: 'hammer-air-smash',
    impactEffectKind: 'apply-directional-impulse',
    tags: ['arena-v2', 'equipment', 'heavy-hammer', 'push'],
  }),
]);

export const ARENA_V2_HEAVY_HAMMER_EQUIPMENT_DEFINITION_CANDIDATE_V1 =
  createWeaponEquipmentCandidateV1({
    id: IDS.equipment,
    category: 'heavy-knockback',
    groundActionDefinitionId: IDS.groundAction,
    aerialActionDefinitionId: IDS.aerialAction,
    presentationSemantic: 'heavy-smash',
    tags: ['arena-v2', 'baseline-weapon', 'heavy-hammer'],
  });

export const ARENA_V2_HEAVY_HAMMER_GRAMMAR_DEFINITION_CANDIDATE_V1 =
  createWeaponCombatGrammarDefinitionV1({
    schemaVersion: WEAPON_COMBAT_GRAMMAR_DEFINITION_V1_SCHEMA_VERSION,
    id: IDS.grammar,
    equipmentDefinitionId: IDS.equipment,
    coreVerb: WEAPON_CORE_VERB_V1.PUSH,
    requiredInput: 'primary',
    contexts: [{
      kind: WEAPON_ACTION_CONTEXT_V1.GROUND,
      actionDefinitionId: IDS.groundAction,
      intendedResult: 'high-horizontal-knockback',
      mapSituations: [
        WEAPON_MAP_SITUATION_V1.EDGE,
        WEAPON_MAP_SITUATION_V1.NARROW_PATH,
        WEAPON_MAP_SITUATION_V1.PLATFORM_ENTRY,
      ],
      failureRisk: WEAPON_FAILURE_RISK_V1.LONG_RECOVERY,
      counterInputs: [WEAPON_COUNTER_INPUT_V1.DIRECTION, WEAPON_COUNTER_INPUT_V1.JUMP],
    }, {
      kind: WEAPON_ACTION_CONTEXT_V1.AERIAL,
      actionDefinitionId: IDS.aerialAction,
      intendedResult: 'downward-area-knockback',
      mapSituations: [
        WEAPON_MAP_SITUATION_V1.EDGE,
        WEAPON_MAP_SITUATION_V1.HEIGHT_TRANSITION,
        WEAPON_MAP_SITUATION_V1.GAP,
      ],
      failureRisk: WEAPON_FAILURE_RISK_V1.LANDING_COMMITMENT,
      counterInputs: [WEAPON_COUNTER_INPUT_V1.DIRECTION],
    }],
    modeConsequences: [{
      modeKind: WEAPON_MODE_KIND_V1.DUEL,
      mapSituations: [WEAPON_MAP_SITUATION_V1.EDGE, WEAPON_MAP_SITUATION_V1.OPEN_PLATFORM],
      intendedOutcomes: ['force-edge-respect', 'punish-whiffed-approach'],
    }, {
      modeKind: WEAPON_MODE_KIND_V1.RACE,
      mapSituations: [WEAPON_MAP_SITUATION_V1.NARROW_PATH, WEAPON_MAP_SITUATION_V1.PLATFORM_ENTRY],
      intendedOutcomes: ['clear-route-space', 'risk-long-recovery-position-loss'],
    }, {
      modeKind: WEAPON_MODE_KIND_V1.SURVIVAL,
      mapSituations: [WEAPON_MAP_SITUATION_V1.EDGE, WEAPON_MAP_SITUATION_V1.GAP],
      intendedOutcomes: ['eject-clustered-enemy', 'create-recovery-window'],
    }],
    survivalGrowth: {
      semanticsLocked: true,
      addsInput: false,
      addsAction: false,
      permittedTuningFields: [
        WEAPON_TUNING_FIELD_V1.RANGE,
        WEAPON_TUNING_FIELD_V1.HORIZONTAL_IMPULSE,
        WEAPON_TUNING_FIELD_V1.COOLDOWN_TICKS,
      ],
    },
    tags: ['arena-v2', 'baseline-weapon', 'heavy-hammer'],
  });

export const ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  actions: ARENA_V2_HEAVY_HAMMER_ACTION_DEFINITIONS_CANDIDATE_V1,
  equipment: ARENA_V2_HEAVY_HAMMER_EQUIPMENT_DEFINITION_CANDIDATE_V1,
  grammar: ARENA_V2_HEAVY_HAMMER_GRAMMAR_DEFINITION_CANDIDATE_V1,
  contentHash: validateWeaponCandidateBundleV1({
    actions: ARENA_V2_HEAVY_HAMMER_ACTION_DEFINITIONS_CANDIDATE_V1,
    equipment: ARENA_V2_HEAVY_HAMMER_EQUIPMENT_DEFINITION_CANDIDATE_V1,
    grammar: ARENA_V2_HEAVY_HAMMER_GRAMMAR_DEFINITION_CANDIDATE_V1,
  }),
});
