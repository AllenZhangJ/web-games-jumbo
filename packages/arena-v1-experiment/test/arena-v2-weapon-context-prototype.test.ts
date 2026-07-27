import { describe, expect, it } from 'vitest';
import { runArenaV2WeaponContextPrototype } from '../src/index.js';

describe('Arena V2 weapon context prototype', () => {
  it('keeps the three weapon contexts deterministic and distinguishable', () => {
    const first = runArenaV2WeaponContextPrototype();
    const second = runArenaV2WeaponContextPrototype();

    expect(first).toEqual(second);
    expect(first).toHaveLength(12);
    expect(first.filter(({ distance }) => distance === 'in-range').every(({ starts, hits, whiffRate }) => (
      starts === 3 && hits === 3 && whiffRate === 0
    ))).toBe(true);
    expect(first.filter(({ distance }) => distance === 'out-of-range').every(({ starts, hits, whiffRate }) => (
      starts === 3 && hits === 0 && whiffRate === 1
    ))).toBe(true);

    const result = (weaponId: string, mode: 'ground' | 'aerial', distance: 'in-range' | 'out-of-range') => {
      const value = first.find((entry) => (
        entry.weaponId === weaponId && entry.mode === mode && entry.distance === distance
      ));
      if (!value) throw new Error(`缺少 probe result ${weaponId}/${mode}/${distance}`);
      return value;
    };
    expect(result('hammer', 'ground', 'in-range').timeToFirstHitTicks).toBe(18);
    expect(result('chain', 'ground', 'in-range').timeToFirstHitTicks).toBe(12);
    expect(result('shield', 'ground', 'in-range').timeToFirstHitTicks).toBe(5);
    expect(result('hammer', 'ground', 'in-range').averageHorizontalImpulse).toBeCloseTo(15);
    expect(result('chain', 'ground', 'in-range').averageHorizontalImpulse).toBeCloseTo(10);
    expect(result('shield', 'ground', 'in-range').averageHorizontalImpulse).toBeCloseTo(7.5);
    expect(result('shield', 'ground', 'out-of-range').hits).toBe(0);
  });
});
