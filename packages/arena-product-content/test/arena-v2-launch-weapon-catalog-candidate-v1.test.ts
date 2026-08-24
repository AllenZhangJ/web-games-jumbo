import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_LAUNCH_WEAPON_CATALOG_CANDIDATE_V1,
} from '../src/arena-v2-launch-weapon-catalog-candidate-v1.js';

describe('Arena V2 launch weapon catalog candidate V1', () => {
  it('closes six independent combat languages in the fixed migration order', () => {
    const catalog = ARENA_V2_LAUNCH_WEAPON_CATALOG_CANDIDATE_V1;
    expect(catalog).toMatchObject({
      status: 'production-unreachable', hardGate: false, defaultRegistryWired: false,
      weaponCount: 6,
    });
    expect(catalog.migrationOrder).toEqual([
      'charge-shield', 'heavy-hammer', 'gravity-chain',
      'line-suppressor', 'read-counter', 'flank-blade',
    ]);
    expect(new Set(catalog.weapons.map(({ grammar }) => grammar.coreVerb)).size).toBe(6);
    expect(catalog.weapons.every(({ actions, grammar }) => (
      grammar.requiredInput === 'primary'
      && actions.length === 2
      && actions.every(({ input }) => input.channel === 'primary')
    ))).toBe(true);
    expect(catalog.contentHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('keeps every authority identity unique', () => {
    const weapons = ARENA_V2_LAUNCH_WEAPON_CATALOG_CANDIDATE_V1.weapons;
    const ids = [
      ...weapons.map(({ id }) => id),
      ...weapons.map(({ equipment }) => equipment.id),
      ...weapons.map(({ grammar }) => grammar.id),
      ...weapons.flatMap(({ actions }) => actions.map(({ id }) => id)),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
