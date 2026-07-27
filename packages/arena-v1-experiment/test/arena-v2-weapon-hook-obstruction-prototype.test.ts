import { describe, expect, it } from 'vitest';
import { runArenaV2WeaponHookObstructionPrototype } from '../src/index.js';

describe('Arena V2 hook obstruction prototype', () => {
  it('keeps clear, blocked and offset routes deterministic', () => {
    const first = runArenaV2WeaponHookObstructionPrototype();
    expect(first).toEqual(runArenaV2WeaponHookObstructionPrototype());
    expect(first).toHaveLength(4);
    expect(first.map(({ scenario }) => scenario)).toEqual([
      'clear-line',
      'pillar-blocks',
      'offset-route',
      'near-corner',
    ]);
  });

  it('makes physical obstruction change pull outcome instead of changing the label only', () => {
    const results = runArenaV2WeaponHookObstructionPrototype();
    const clear = results.find(({ scenario }) => scenario === 'clear-line');
    const blocked = results.find(({ scenario }) => scenario === 'pillar-blocks');
    const offset = results.find(({ scenario }) => scenario === 'offset-route');
    const corner = results.find(({ scenario }) => scenario === 'near-corner');
    expect(clear).toMatchObject({
      obstructionDetected: false,
      outcome: 'pull-succeeds',
      targetHorizontalDisplacement: 1.5,
    });
    expect(blocked).toMatchObject({
      obstructionDetected: true,
      outcome: 'pull-blocked',
      targetHorizontalDisplacement: 0,
    });
    expect(offset).toMatchObject({
      obstructionDetected: false,
      outcome: 'pull-succeeds',
      targetHorizontalDisplacement: 1.5,
    });
    expect(corner?.obstructionDetected).toBe(true);
    expect(corner?.targetHorizontalDisplacement).toBe(0);
  });

  it('keeps result data immutable and outside production registration', () => {
    const results = runArenaV2WeaponHookObstructionPrototype();
    expect(Object.isFrozen(results)).toBe(true);
    expect(results.every((result) => (
      Object.isFrozen(result)
      && Object.isFrozen(result.source)
      && Object.isFrozen(result.target)
      && (result.obstacle === null || (
        Object.isFrozen(result.obstacle)
        && Object.isFrozen(result.obstacle.center)
        && Object.isFrozen(result.obstacle.halfExtents)
      ))
    ))).toBe(true);
  });
});
