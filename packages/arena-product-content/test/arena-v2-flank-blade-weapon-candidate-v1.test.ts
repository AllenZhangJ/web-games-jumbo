import { describe, expect, it } from 'vitest';
import {
  ARENA_GAMEPLAY_V2_TUNING,
  ActionRegistry,
  EquipmentRegistry,
  WEAPON_CORE_VERB_V1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_FLANK_BLADE_WEAPON_CANDIDATE_V1,
} from '../src/arena-v2-flank-blade-weapon-candidate-v1.js';

describe('Arena V2 Flank Blade weapon candidate V1', () => {
  it('closes a rear-position weapon without adding a button or production wiring', () => {
    const candidate = ARENA_V2_FLANK_BLADE_WEAPON_CANDIDATE_V1;
    const actions = new ActionRegistry(candidate.actions);
    const equipment = new EquipmentRegistry({ definitions: [candidate.equipment], actionRegistry: actions });
    expect(equipment.require(candidate.equipment.id)).toBe(candidate.equipment);
    expect(candidate).toMatchObject({
      status: 'production-unreachable', hardGate: false, defaultRegistryWired: false,
      addsInput: false, requiresRearPosition: true,
    });
    expect(candidate.grammar.coreVerb).toBe(WEAPON_CORE_VERB_V1.FLANK);
    expect(candidate.actions.every(({ input }) => input.channel === 'primary')).toBe(true);
    expect(candidate.actions.every(({ targeting }) => targeting.kind === 'rear-cone')).toBe(true);
  });

  it('keeps ground and aerial rear-angle tuning distinct without forced descent', () => {
    const [ground, aerial] = ARENA_V2_FLANK_BLADE_WEAPON_CANDIDATE_V1.actions;
    expect(ground?.timing).toEqual(ARENA_GAMEPLAY_V2_TUNING.attacks['flank-blade-ground'].timing);
    expect(aerial?.timing).toEqual(ARENA_GAMEPLAY_V2_TUNING.attacks['flank-blade-aerial'].timing);
    expect(ground?.targeting.parameters).toMatchObject({ range: 1.9, minimumFacingDot: 0.45 });
    expect(aerial?.targeting.parameters).toMatchObject({ range: 2.15, minimumFacingDot: 0.35 });
    expect(aerial?.effects.some(({ kind }) => kind === 'begin-down-smash')).toBe(false);
  });
});
