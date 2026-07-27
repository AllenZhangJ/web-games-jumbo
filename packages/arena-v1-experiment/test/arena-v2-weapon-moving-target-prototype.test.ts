import { describe, expect, it } from 'vitest';
import { runArenaV2WeaponMovingTargetPrototype } from '../src/index.js';

describe('Arena V2 weapon moving-target prototype', () => {
  it('keeps stationary baselines and exposes readable sidestep counterplay', () => {
    const first = runArenaV2WeaponMovingTargetPrototype();
    const second = runArenaV2WeaponMovingTargetPrototype();

    expect(first).toEqual(second);
    expect(first).toHaveLength(6);
    expect(first.filter(({ motion }) => motion === 'stationary')
      .every(({ outcome }) => outcome === 'hit')).toBe(true);
    expect(first.find(({ motion, weaponId }) => motion === 'sidestep' && weaponId === 'hammer'))
      .toMatchObject({ outcome: 'whiff', firstHitTick: null });
    const chain = first.find(({ motion, weaponId }) => motion === 'sidestep' && weaponId === 'chain');
    expect(chain).toMatchObject({ outcome: 'hit' });
    expect(chain?.targetSideDisplacementAtHit).toBeCloseTo(0.79625, 4);
    const shield = first.find(({ motion, weaponId }) => motion === 'sidestep' && weaponId === 'shield');
    expect(shield).toMatchObject({ outcome: 'hit' });
    expect(shield?.targetSideDisplacementAtHit).toBeCloseTo(0.1641146, 4);
  });
});
