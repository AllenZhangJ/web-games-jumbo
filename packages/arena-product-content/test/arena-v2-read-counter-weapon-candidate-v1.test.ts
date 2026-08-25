import { describe, expect, it } from 'vitest';
import {
  ARENA_GAMEPLAY_V2_TUNING,
  ActionRegistry,
  EquipmentRegistry,
  WEAPON_CORE_VERB_V1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_READ_COUNTER_WEAPON_CANDIDATE_V1,
} from '../src/arena-v2-read-counter-weapon-candidate-v1.js';

describe('Arena V2 Read Counter weapon candidate V1', () => {
  it('reuses primary hold as a fail-closed commitment instead of adding an input', () => {
    const candidate = ARENA_V2_READ_COUNTER_WEAPON_CANDIDATE_V1;
    const actions = new ActionRegistry(candidate.actions);
    const equipment = new EquipmentRegistry({ definitions: [candidate.equipment], actionRegistry: actions });
    expect(equipment.require(candidate.equipment.id)).toStrictEqual(candidate.equipment);
    expect(candidate).toMatchObject({
      status: 'production-unreachable', hardGate: false, defaultRegistryWired: false,
      addsInput: false, usesPrimaryHold: true,
    });
    expect(candidate.grammar.coreVerb).toBe(WEAPON_CORE_VERB_V1.COUNTER);
    expect(candidate.actions.map(({ input }) => input.channel)).toEqual(['primary', 'primary']);
    expect(candidate.actions.map(({ commitment }) => commitment)).toEqual([
      expect.objectContaining({ commitTicks: 8, expireTicks: 12, expireOutcome: 'release', canTurn: false }),
      expect.objectContaining({ commitTicks: 6, expireTicks: 10, expireOutcome: 'release', canTurn: false }),
    ]);
  });

  it('keeps the commitment before active timing and pays for high impact with recovery', () => {
    const [ground, aerial] = ARENA_V2_READ_COUNTER_WEAPON_CANDIDATE_V1.actions;
    expect(ground?.timing).toEqual(ARENA_GAMEPLAY_V2_TUNING.attacks['read-counter-ground'].timing);
    expect(aerial?.timing).toEqual(ARENA_GAMEPLAY_V2_TUNING.attacks['read-counter-aerial'].timing);
    for (const action of ARENA_V2_READ_COUNTER_WEAPON_CANDIDATE_V1.actions) {
      expect(action.commitment!.expireTicks).toBeLessThan(action.timing.windupTicks);
      expect(action.effects.some(({ kind }) => kind === 'begin-down-smash')).toBe(false);
    }
  });
});
