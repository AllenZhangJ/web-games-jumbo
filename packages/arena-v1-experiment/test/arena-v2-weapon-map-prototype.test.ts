import { describe, expect, it } from 'vitest';
import { runArenaV2WeaponMapPrototype } from '../src/index.js';

describe('Arena V2 weapon map-edge prototype', () => {
  it('routes real rule knockback into deterministic physics and separates map outcomes', () => {
    const first = runArenaV2WeaponMapPrototype();
    const second = runArenaV2WeaponMapPrototype();

    expect(first).toEqual(second);
    expect(first).toHaveLength(9);
    expect(first.every(({ hit, horizontalImpulse }) => hit && horizontalImpulse > 0)).toBe(true);
    expect(first.filter(({ mapKind }) => mapKind === 'wide-platform')
      .every(({ outcome }) => outcome === 'hit-safe')).toBe(true);
    expect(first.find(({ mapKind, weaponId }) => mapKind === 'narrow-path' && weaponId === 'hammer')?.outcome)
      .toBe('hit-ring-out');
    expect(first.find(({ mapKind, weaponId }) => mapKind === 'narrow-path' && weaponId === 'chain')?.outcome)
      .toBe('hit-ring-out');
    expect(first.find(({ mapKind, weaponId }) => mapKind === 'narrow-path' && weaponId === 'shield')?.outcome)
      .toBe('hit-safe');
    expect(first.find(({ mapKind, weaponId }) => mapKind === 'edge-platform' && weaponId === 'hammer')?.outcome)
      .toBe('hit-ring-out');
    expect(first.find(({ mapKind, weaponId }) => mapKind === 'edge-platform' && weaponId === 'chain')?.outcome)
      .toBe('hit-safe');
    expect(first.find(({ mapKind, weaponId }) => mapKind === 'edge-platform' && weaponId === 'shield')?.outcome)
      .toBe('hit-ring-out');
    expect(first.filter(({ mapKind }) => mapKind === 'edge-platform')
      .filter(({ targetFell }) => targetFell)).toHaveLength(2);
  });
});
