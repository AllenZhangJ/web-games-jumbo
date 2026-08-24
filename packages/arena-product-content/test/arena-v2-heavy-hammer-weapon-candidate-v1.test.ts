import { describe, expect, it } from 'vitest';
import {
  ARENA_GAMEPLAY_V2_TUNING,
  ActionRegistry,
  EquipmentRegistry,
  WEAPON_CORE_VERB_V1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1,
} from '../src/arena-v2-heavy-hammer-weapon-candidate-v1.js';

describe('Arena V2 Heavy Hammer weapon candidate V1', () => {
  it('closes registry identities without production wiring', () => {
    const candidate = ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1;
    const actions = new ActionRegistry(candidate.actions);
    const equipment = new EquipmentRegistry({ definitions: [candidate.equipment], actionRegistry: actions });
    expect(equipment.require(candidate.equipment.id)).toBe(candidate.equipment);
    expect(candidate).toMatchObject({
      status: 'production-unreachable', hardGate: false, defaultRegistryWired: false,
    });
    expect(candidate.grammar.coreVerb).toBe(WEAPON_CORE_VERB_V1.PUSH);
    expect(candidate.grammar.contexts.map(({ actionDefinitionId }) => actionDefinitionId))
      .toEqual([candidate.equipment.actionDefinitionId, candidate.equipment.aerialActionDefinitionId]);
  });

  it('maps canonical hammer tuning into ground and aerial actions', () => {
    const [ground, aerial] = ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1.actions;
    expect(ground?.timing).toEqual(ARENA_GAMEPLAY_V2_TUNING.attacks['hammer-smash'].timing);
    expect(aerial?.timing).toEqual(ARENA_GAMEPLAY_V2_TUNING.attacks['hammer-air-smash'].timing);
    expect(ground?.effects.map(({ kind }) => kind))
      .toEqual(['interrupt-action', 'apply-hitstun', 'apply-directional-impulse']);
    expect(ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1.grammar.modeConsequences)
      .toHaveLength(3);
  });
});
