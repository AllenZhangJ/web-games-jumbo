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
  type ActionCommitmentDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  createAerialWeaponActionCandidateV1,
  createGroundWeaponActionCandidateV1,
  createWeaponEquipmentCandidateV1,
  validateWeaponCandidateBundleV1,
} from './arena-v2-baseline-weapon-candidate-support-v1.js';

export const ARENA_V2_READ_COUNTER_WEAPON_CANDIDATE_V1_ID = Object.freeze({
  equipment: 'arena-v2.weapon.read-counter.candidate.v1',
  groundAction: 'arena-v2.action.read-counter.ground.candidate.v1',
  aerialAction: 'arena-v2.action.read-counter.aerial.candidate.v1',
  grammar: 'arena-v2.weapon-grammar.read-counter.candidate.v1',
});

const IDS = ARENA_V2_READ_COUNTER_WEAPON_CANDIDATE_V1_ID;
const GROUND_COMMITMENT = Object.freeze({
  commitTicks: 8,
  expireTicks: 12,
  expireOutcome: 'release',
  canTurn: false,
  levelThresholds: Object.freeze([8]),
}) satisfies ActionCommitmentDefinition;
const AERIAL_COMMITMENT = Object.freeze({
  commitTicks: 6,
  expireTicks: 10,
  expireOutcome: 'release',
  canTurn: false,
  levelThresholds: Object.freeze([6]),
}) satisfies ActionCommitmentDefinition;

export const ARENA_V2_READ_COUNTER_ACTION_DEFINITIONS_CANDIDATE_V1 = Object.freeze([
  createGroundWeaponActionCandidateV1({
    id: IDS.groundAction,
    tuningId: 'read-counter-ground',
    impactEffectKind: 'apply-directional-impulse',
    commitment: GROUND_COMMITMENT,
    tags: ['arena-v2', 'equipment', 'read-counter', 'hold-commitment'],
  }),
  createAerialWeaponActionCandidateV1({
    id: IDS.aerialAction,
    tuningId: 'read-counter-aerial',
    impactEffectKind: 'apply-directional-impulse',
    commitment: AERIAL_COMMITMENT,
    beginsDescent: false,
    tags: ['arena-v2', 'equipment', 'read-counter', 'hold-commitment'],
  }),
]);

export const ARENA_V2_READ_COUNTER_EQUIPMENT_DEFINITION_CANDIDATE_V1 =
  createWeaponEquipmentCandidateV1({
    id: IDS.equipment,
    category: 'read-punish',
    groundActionDefinitionId: IDS.groundAction,
    aerialActionDefinitionId: IDS.aerialAction,
    presentationSemantic: 'read-counter',
    tags: ['arena-v2', 'launch-weapon', 'read-counter'],
  });

export const ARENA_V2_READ_COUNTER_GRAMMAR_DEFINITION_CANDIDATE_V1 =
  createWeaponCombatGrammarDefinitionV1({
    schemaVersion: WEAPON_COMBAT_GRAMMAR_DEFINITION_V1_SCHEMA_VERSION,
    id: IDS.grammar,
    equipmentDefinitionId: IDS.equipment,
    coreVerb: WEAPON_CORE_VERB_V1.COUNTER,
    requiredInput: 'primary',
    contexts: [{
      kind: WEAPON_ACTION_CONTEXT_V1.GROUND,
      actionDefinitionId: IDS.groundAction,
      intendedResult: 'commit-to-high-reward-punish',
      mapSituations: [
        WEAPON_MAP_SITUATION_V1.EDGE,
        WEAPON_MAP_SITUATION_V1.PLATFORM_ENTRY,
        WEAPON_MAP_SITUATION_V1.OPEN_PLATFORM,
      ],
      failureRisk: WEAPON_FAILURE_RISK_V1.HOLD_COMMITMENT,
      counterInputs: [WEAPON_COUNTER_INPUT_V1.DIRECTION, WEAPON_COUNTER_INPUT_V1.JUMP],
    }, {
      kind: WEAPON_ACTION_CONTEXT_V1.AERIAL,
      actionDefinitionId: IDS.aerialAction,
      intendedResult: 'read-air-route-and-punish',
      mapSituations: [
        WEAPON_MAP_SITUATION_V1.GAP,
        WEAPON_MAP_SITUATION_V1.HEIGHT_TRANSITION,
        WEAPON_MAP_SITUATION_V1.PLATFORM_ENTRY,
      ],
      failureRisk: WEAPON_FAILURE_RISK_V1.HOLD_COMMITMENT,
      counterInputs: [WEAPON_COUNTER_INPUT_V1.DIRECTION, WEAPON_COUNTER_INPUT_V1.JUMP],
    }],
    modeConsequences: [{
      modeKind: WEAPON_MODE_KIND_V1.DUEL,
      mapSituations: [WEAPON_MAP_SITUATION_V1.EDGE, WEAPON_MAP_SITUATION_V1.OPEN_PLATFORM],
      intendedOutcomes: ['punish-readable-entry', 'give-opponent-a-dodge-window'],
    }, {
      modeKind: WEAPON_MODE_KIND_V1.RACE,
      mapSituations: [WEAPON_MAP_SITUATION_V1.PLATFORM_ENTRY, WEAPON_MAP_SITUATION_V1.NARROW_PATH],
      intendedOutcomes: ['read-route-intercept', 'lose-progress-on-wrong-read'],
    }, {
      modeKind: WEAPON_MODE_KIND_V1.SURVIVAL,
      mapSituations: [WEAPON_MAP_SITUATION_V1.PLATFORM_ENTRY, WEAPON_MAP_SITUATION_V1.EDGE],
      intendedOutcomes: ['remove-one-priority-enemy', 'expose-user-during-commitment'],
    }],
    survivalGrowth: {
      semanticsLocked: true,
      addsInput: false,
      addsAction: false,
      permittedTuningFields: [
        WEAPON_TUNING_FIELD_V1.RANGE,
        WEAPON_TUNING_FIELD_V1.HORIZONTAL_IMPULSE,
        WEAPON_TUNING_FIELD_V1.HITSTUN_TICKS,
      ],
    },
    tags: ['arena-v2', 'launch-weapon', 'read-counter'],
  });

export const ARENA_V2_READ_COUNTER_WEAPON_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  addsInput: false as const,
  usesPrimaryHold: true as const,
  actions: ARENA_V2_READ_COUNTER_ACTION_DEFINITIONS_CANDIDATE_V1,
  equipment: ARENA_V2_READ_COUNTER_EQUIPMENT_DEFINITION_CANDIDATE_V1,
  grammar: ARENA_V2_READ_COUNTER_GRAMMAR_DEFINITION_CANDIDATE_V1,
  contentHash: validateWeaponCandidateBundleV1({
    actions: ARENA_V2_READ_COUNTER_ACTION_DEFINITIONS_CANDIDATE_V1,
    equipment: ARENA_V2_READ_COUNTER_EQUIPMENT_DEFINITION_CANDIDATE_V1,
    grammar: ARENA_V2_READ_COUNTER_GRAMMAR_DEFINITION_CANDIDATE_V1,
  }),
});
