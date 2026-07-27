import { describe, expect, it } from 'vitest';
import {
  runArenaV2WeaponContestPrototype,
} from '../src/arena-v2-weapon-contest-prototype.js';

describe('Arena V2 weapon contest prototype', () => {
  it('keeps attacker displacement, aerial context, and mutual attacks deterministic', () => {
    const first = runArenaV2WeaponContestPrototype();
    expect(first).toEqual(runArenaV2WeaponContestPrototype());
    expect(first).toHaveLength(9);
  });

  it('makes self-displacement a measurable risk instead of a hidden shield property', () => {
    const results = runArenaV2WeaponContestPrototype().filter(({ scenario }) => (
      scenario === 'self-displacement'
    ));
    const hammer = results.find(({ actorA }) => actorA.weaponId === 'hammer')?.actorA;
    const chain = results.find(({ actorA }) => actorA.weaponId === 'chain')?.actorA;
    const shield = results.find(({ actorA }) => actorA.weaponId === 'shield')?.actorA;
    expect(hammer?.selfImpulse).toBe(0);
    expect(chain?.selfImpulse).toBe(0);
    expect(shield?.selfImpulse).toBeCloseTo(6.5, 6);
    expect(shield?.horizontalDisplacement).toBeGreaterThan(0.1);
  });

  it('keeps aerial actions and simultaneous two-player attacks observable', () => {
    const results = runArenaV2WeaponContestPrototype();
    const aerial = results.filter(({ scenario }) => scenario === 'aerial-context');
    expect(aerial.every(({ actorA }) => actorA.firstHitTick !== null)).toBe(true);
    const mutual = results.filter(({ scenario }) => scenario === 'mutual-attack');
    expect(mutual.every(({ actorA, actorB }) => (
      actorB !== null
      && actorA.started
      && actorB.started
      && actorA.hitCount + actorB.hitCount > 0
    ))).toBe(true);
  });
});
