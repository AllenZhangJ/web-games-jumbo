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

export const ARENA_V2_LINE_SUPPRESSOR_WEAPON_CANDIDATE_V1_ID = Object.freeze({
  equipment: 'arena-v2.weapon.line-suppressor.candidate.v1',
  groundAction: 'arena-v2.action.line-suppressor.ground.candidate.v1',
  aerialAction: 'arena-v2.action.line-suppressor.aerial.candidate.v1',
  grammar: 'arena-v2.weapon-grammar.line-suppressor.candidate.v1',
});

const IDS = ARENA_V2_LINE_SUPPRESSOR_WEAPON_CANDIDATE_V1_ID;

export const ARENA_V2_LINE_SUPPRESSOR_ACTION_DEFINITIONS_CANDIDATE_V1 = Object.freeze([
  createGroundWeaponActionCandidateV1({
    id: IDS.groundAction,
    tuningId: 'line-suppressor-ground',
    impactEffectKind: 'apply-directional-impulse',
    tags: ['arena-v2', 'equipment', 'line-suppressor', 'line-pressure'],
  }),
  createAerialWeaponActionCandidateV1({
    id: IDS.aerialAction,
    tuningId: 'line-suppressor-aerial',
    impactEffectKind: 'apply-directional-impulse',
    beginsDescent: false,
    tags: ['arena-v2', 'equipment', 'line-suppressor', 'line-pressure'],
  }),
]);

export const ARENA_V2_LINE_SUPPRESSOR_EQUIPMENT_DEFINITION_CANDIDATE_V1 =
  createWeaponEquipmentCandidateV1({
    id: IDS.equipment,
    category: 'line-pressure',
    groundActionDefinitionId: IDS.groundAction,
    aerialActionDefinitionId: IDS.aerialAction,
    presentationSemantic: 'line-suppressor',
    tags: ['arena-v2', 'launch-weapon', 'line-suppressor'],
  });

export const ARENA_V2_LINE_SUPPRESSOR_GRAMMAR_DEFINITION_CANDIDATE_V1 =
  createWeaponCombatGrammarDefinitionV1({
    schemaVersion: WEAPON_COMBAT_GRAMMAR_DEFINITION_V1_SCHEMA_VERSION,
    id: IDS.grammar,
    equipmentDefinitionId: IDS.equipment,
    coreVerb: WEAPON_CORE_VERB_V1.SUPPRESS,
    requiredInput: 'primary',
    contexts: [{
      kind: WEAPON_ACTION_CONTEXT_V1.GROUND,
      actionDefinitionId: IDS.groundAction,
      intendedResult: 'pressure-long-straight-route',
      mapSituations: [
        WEAPON_MAP_SITUATION_V1.NARROW_PATH,
        WEAPON_MAP_SITUATION_V1.PLATFORM_ENTRY,
        WEAPON_MAP_SITUATION_V1.OPEN_PLATFORM,
      ],
      failureRisk: WEAPON_FAILURE_RISK_V1.NARROW_COVERAGE,
      counterInputs: [WEAPON_COUNTER_INPUT_V1.DIRECTION, WEAPON_COUNTER_INPUT_V1.JUMP],
    }, {
      kind: WEAPON_ACTION_CONTEXT_V1.AERIAL,
      actionDefinitionId: IDS.aerialAction,
      intendedResult: 'hold-air-route-line',
      mapSituations: [
        WEAPON_MAP_SITUATION_V1.GAP,
        WEAPON_MAP_SITUATION_V1.HEIGHT_TRANSITION,
        WEAPON_MAP_SITUATION_V1.PLATFORM_ENTRY,
      ],
      failureRisk: WEAPON_FAILURE_RISK_V1.NARROW_COVERAGE,
      counterInputs: [WEAPON_COUNTER_INPUT_V1.DIRECTION, WEAPON_COUNTER_INPUT_V1.JUMP],
    }],
    modeConsequences: [{
      modeKind: WEAPON_MODE_KIND_V1.DUEL,
      mapSituations: [WEAPON_MAP_SITUATION_V1.OPEN_PLATFORM, WEAPON_MAP_SITUATION_V1.PLATFORM_ENTRY],
      intendedOutcomes: ['tax-straight-approach', 'lose-pressure-to-side-step'],
    }, {
      modeKind: WEAPON_MODE_KIND_V1.RACE,
      mapSituations: [WEAPON_MAP_SITUATION_V1.NARROW_PATH, WEAPON_MAP_SITUATION_V1.GAP],
      intendedOutcomes: ['contest-route-line', 'force-jump-timing-change'],
    }, {
      modeKind: WEAPON_MODE_KIND_V1.SURVIVAL,
      mapSituations: [WEAPON_MAP_SITUATION_V1.PLATFORM_ENTRY, WEAPON_MAP_SITUATION_V1.OPEN_PLATFORM],
      intendedOutcomes: ['thin-incoming-column', 'trade-low-impact-for-repeat-pressure'],
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
    tags: ['arena-v2', 'launch-weapon', 'line-suppressor'],
  });

export const ARENA_V2_LINE_SUPPRESSOR_WEAPON_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  addsInput: false as const,
  actions: ARENA_V2_LINE_SUPPRESSOR_ACTION_DEFINITIONS_CANDIDATE_V1,
  equipment: ARENA_V2_LINE_SUPPRESSOR_EQUIPMENT_DEFINITION_CANDIDATE_V1,
  grammar: ARENA_V2_LINE_SUPPRESSOR_GRAMMAR_DEFINITION_CANDIDATE_V1,
  contentHash: validateWeaponCandidateBundleV1({
    actions: ARENA_V2_LINE_SUPPRESSOR_ACTION_DEFINITIONS_CANDIDATE_V1,
    equipment: ARENA_V2_LINE_SUPPRESSOR_EQUIPMENT_DEFINITION_CANDIDATE_V1,
    grammar: ARENA_V2_LINE_SUPPRESSOR_GRAMMAR_DEFINITION_CANDIDATE_V1,
  }),
});
