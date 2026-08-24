import { describe, expect, it } from 'vitest';
import {
  ARENA_GAMEPLAY_V2_TUNING,
  ActionRegistry,
  EquipmentRegistry,
  WEAPON_CORE_VERB_V1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1,
} from '../src/arena-v2-charge-shield-weapon-candidate-v1.js';

const FORBIDDEN_GUARD_EFFECTS = new Set([
  'front-guard', 'guard', 'damage-reduction', 'invulnerability',
]);

describe('Arena V2 Charge Shield weapon candidate V1', () => {
  it('closes registry identities as a no-guard charge weapon', () => {
    const candidate = ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1;
    const actions = new ActionRegistry(candidate.actions);
    const equipment = new EquipmentRegistry({ definitions: [candidate.equipment], actionRegistry: actions });
    expect(equipment.require(candidate.equipment.id)).toBe(candidate.equipment);
    expect(candidate).toMatchObject({
      status: 'production-unreachable', hardGate: false, defaultRegistryWired: false,
      guardEnabled: false,
    });
    expect(candidate.equipment.category).toBe('charge');
    expect(candidate.grammar.coreVerb).toBe(WEAPON_CORE_VERB_V1.CHARGE);
  });

  it('moves the user on ground attack without adding block or damage reduction', () => {
    const [ground, aerial] = ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1.actions;
    expect(ground?.timing).toEqual(ARENA_GAMEPLAY_V2_TUNING.attacks['shield-charge'].timing);
    expect(aerial?.timing).toEqual(ARENA_GAMEPLAY_V2_TUNING.attacks['shield-air-drop'].timing);
    expect(ground?.effects.some(({ kind }) => kind === 'apply-self-impulse')).toBe(true);
    for (const action of ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1.actions) {
      expect(action.effects.some(({ kind }) => FORBIDDEN_GUARD_EFFECTS.has(kind))).toBe(false);
    }
    expect(ARENA_V2_CHARGE_SHIELD_WEAPON_CANDIDATE_V1.grammar.modeConsequences)
      .toHaveLength(3);
  });
});
