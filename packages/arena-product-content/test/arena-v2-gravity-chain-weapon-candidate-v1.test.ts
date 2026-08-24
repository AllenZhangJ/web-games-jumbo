import { describe, expect, it } from 'vitest';
import {
  ARENA_GAMEPLAY_V2_TUNING,
  ActionRegistry,
  EquipmentRegistry,
  WEAPON_CORE_VERB_V1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_GRAVITY_CHAIN_WEAPON_CANDIDATE_V1,
} from '../src/arena-v2-gravity-chain-weapon-candidate-v1.js';

describe('Arena V2 Gravity Chain weapon candidate V1', () => {
  it('closes registry identities without production wiring', () => {
    const candidate = ARENA_V2_GRAVITY_CHAIN_WEAPON_CANDIDATE_V1;
    const actions = new ActionRegistry(candidate.actions);
    const equipment = new EquipmentRegistry({ definitions: [candidate.equipment], actionRegistry: actions });
    expect(equipment.require(candidate.equipment.id)).toBe(candidate.equipment);
    expect(candidate).toMatchObject({
      status: 'production-unreachable', hardGate: false, defaultRegistryWired: false,
    });
    expect(candidate.grammar.coreVerb).toBe(WEAPON_CORE_VERB_V1.PULL);
    expect(candidate.grammar.contexts.map(({ actionDefinitionId }) => actionDefinitionId))
      .toEqual([candidate.equipment.actionDefinitionId, candidate.equipment.aerialActionDefinitionId]);
  });

  it('keeps pull as the ground verb and canonical aerial displacement', () => {
    const [ground, aerial] = ARENA_V2_GRAVITY_CHAIN_WEAPON_CANDIDATE_V1.actions;
    expect(ground?.timing).toEqual(ARENA_GAMEPLAY_V2_TUNING.attacks['chain-pull'].timing);
    expect(aerial?.timing).toEqual(ARENA_GAMEPLAY_V2_TUNING.attacks['chain-air-lash'].timing);
    expect(ground?.effects.map(({ kind }) => kind))
      .toEqual(['interrupt-action', 'apply-hitstun', 'pull-to-source']);
    expect(aerial?.effects.some(({ kind }) => kind === 'apply-directional-impulse')).toBe(true);
    expect(ARENA_V2_GRAVITY_CHAIN_WEAPON_CANDIDATE_V1.grammar.modeConsequences)
      .toHaveLength(3);
  });
});
