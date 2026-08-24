import { describe, expect, it } from 'vitest';
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
} from '../src/weapon-combat-grammar-definition-v1.js';

function validGrammar(): Record<string, unknown> {
  return {
    schemaVersion: WEAPON_COMBAT_GRAMMAR_DEFINITION_V1_SCHEMA_VERSION,
    id: 'weapon-grammar.test.v1',
    equipmentDefinitionId: 'weapon.test.v1',
    coreVerb: WEAPON_CORE_VERB_V1.PUSH,
    requiredInput: 'primary',
    contexts: [{
      kind: WEAPON_ACTION_CONTEXT_V1.GROUND,
      actionDefinitionId: 'action.ground.test.v1',
      intendedResult: 'push-from-edge',
      mapSituations: [WEAPON_MAP_SITUATION_V1.EDGE],
      failureRisk: WEAPON_FAILURE_RISK_V1.LONG_RECOVERY,
      counterInputs: [WEAPON_COUNTER_INPUT_V1.DIRECTION, WEAPON_COUNTER_INPUT_V1.JUMP],
    }, {
      kind: WEAPON_ACTION_CONTEXT_V1.AERIAL,
      actionDefinitionId: 'action.aerial.test.v1',
      intendedResult: 'deny-gap-entry',
      mapSituations: [WEAPON_MAP_SITUATION_V1.GAP],
      failureRisk: WEAPON_FAILURE_RISK_V1.LANDING_COMMITMENT,
      counterInputs: [WEAPON_COUNTER_INPUT_V1.DIRECTION],
    }],
    modeConsequences: [{
      modeKind: WEAPON_MODE_KIND_V1.DUEL,
      mapSituations: [WEAPON_MAP_SITUATION_V1.EDGE, WEAPON_MAP_SITUATION_V1.OPEN_PLATFORM],
      intendedOutcomes: ['force-edge-respect', 'punish-whiff'],
    }, {
      modeKind: WEAPON_MODE_KIND_V1.RACE,
      mapSituations: [WEAPON_MAP_SITUATION_V1.NARROW_PATH, WEAPON_MAP_SITUATION_V1.GAP],
      intendedOutcomes: ['contest-route', 'lose-progress-on-miss'],
    }, {
      modeKind: WEAPON_MODE_KIND_V1.SURVIVAL,
      mapSituations: [WEAPON_MAP_SITUATION_V1.PLATFORM_ENTRY, WEAPON_MAP_SITUATION_V1.EDGE],
      intendedOutcomes: ['open-recovery-window', 'eject-one-enemy'],
    }],
    survivalGrowth: {
      semanticsLocked: true,
      addsInput: false,
      addsAction: false,
      permittedTuningFields: [
        WEAPON_TUNING_FIELD_V1.RANGE,
        WEAPON_TUNING_FIELD_V1.COOLDOWN_TICKS,
      ],
    },
    tags: ['arena-v2', 'candidate'],
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe('WeaponCombatGrammarDefinitionV1', () => {
  it('freezes exact ground/aerial contexts and Duel/Race/Survival consequences', () => {
    const definition = createWeaponCombatGrammarDefinitionV1(validGrammar());
    expect(definition.contexts.map(({ kind }) => kind)).toEqual(['ground', 'aerial']);
    expect(definition.modeConsequences.map(({ modeKind }) => modeKind))
      .toEqual(['duel', 'race', 'survival']);
    expect(definition.requiredInput).toBe('primary');
    expect(definition.survivalGrowth).toMatchObject({
      semanticsLocked: true,
      addsInput: false,
      addsAction: false,
    });
    expect(Object.isFrozen(definition)).toBe(true);
    expect(Object.isFrozen(definition.contexts[0]?.mapSituations)).toBe(true);
    expect(Object.isFrozen(definition.modeConsequences[2]?.intendedOutcomes)).toBe(true);
  });

  it('fails closed on unknown fields, new input or incomplete context/mode coverage', () => {
    const unknownField = validGrammar();
    unknownField.unknown = true;
    expect(() => createWeaponCombatGrammarDefinitionV1(unknownField)).toThrow(/unknown|不支持字段/);

    const newInput = validGrammar();
    newInput.requiredInput = 'block';
    expect(() => createWeaponCombatGrammarDefinitionV1(newInput)).toThrow(/primary/);

    const missingContext = clone(validGrammar());
    (missingContext.contexts as unknown[]).pop();
    expect(() => createWeaponCombatGrammarDefinitionV1(missingContext)).toThrow(/ground\/aerial/);

    const missingMode = clone(validGrammar());
    (missingMode.modeConsequences as unknown[]).pop();
    expect(() => createWeaponCombatGrammarDefinitionV1(missingMode)).toThrow(/duel\/race\/survival/);
  });

  it('rejects survival growth that adds an input, action or unknown tuning axis', () => {
    for (const field of ['addsInput', 'addsAction'] as const) {
      const value = clone(validGrammar());
      (value.survivalGrowth as Record<string, unknown>)[field] = true;
      expect(() => createWeaponCombatGrammarDefinitionV1(value)).toThrow(/不得增加输入或动作/);
    }

    const unknownTuning = clone(validGrammar());
    (unknownTuning.survivalGrowth as Record<string, unknown>).permittedTuningFields = ['new-action'];
    expect(() => createWeaponCombatGrammarDefinitionV1(unknownTuning)).toThrow(/不受支持/);
  });
});
