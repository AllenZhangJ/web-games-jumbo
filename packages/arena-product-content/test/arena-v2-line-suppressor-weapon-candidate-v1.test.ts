import { describe, expect, it } from 'vitest';
import {
  ARENA_GAMEPLAY_V2_TUNING,
  ActionRegistry,
  EquipmentRegistry,
  WEAPON_CORE_VERB_V1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_LINE_SUPPRESSOR_WEAPON_CANDIDATE_V1,
} from '../src/arena-v2-line-suppressor-weapon-candidate-v1.js';

describe('Arena V2 Line Suppressor weapon candidate V1', () => {
  it('closes a long narrow primary-only weapon without production wiring', () => {
    const candidate = ARENA_V2_LINE_SUPPRESSOR_WEAPON_CANDIDATE_V1;
    const actions = new ActionRegistry(candidate.actions);
    const equipment = new EquipmentRegistry({ definitions: [candidate.equipment], actionRegistry: actions });
    expect(equipment.require(candidate.equipment.id)).toBe(candidate.equipment);
    expect(candidate).toMatchObject({
      status: 'production-unreachable', hardGate: false, defaultRegistryWired: false,
      addsInput: false,
    });
    expect(candidate.grammar.coreVerb).toBe(WEAPON_CORE_VERB_V1.SUPPRESS);
    expect(candidate.actions.every(({ input }) => input.channel === 'primary')).toBe(true);
    expect(candidate.actions.every(({ targeting }) => targeting.kind === 'facing-capsule')).toBe(true);
  });

  it('keeps range high, coverage narrow and aerial use free from forced descent', () => {
    const [ground, aerial] = ARENA_V2_LINE_SUPPRESSOR_WEAPON_CANDIDATE_V1.actions;
    expect(ground?.timing).toEqual(ARENA_GAMEPLAY_V2_TUNING.attacks['line-suppressor-ground'].timing);
    expect(aerial?.timing).toEqual(ARENA_GAMEPLAY_V2_TUNING.attacks['line-suppressor-aerial'].timing);
    expect(ground?.targeting.parameters).toMatchObject({ range: 6.4, radius: 0.42 });
    expect(aerial?.effects.some(({ kind }) => kind === 'begin-down-smash')).toBe(false);
  });
});
