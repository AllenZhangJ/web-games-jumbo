import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_DEFINITION_PROTOTYPE,
  createArenaV2WeaponTrueHadesHookScytheNumericOverview,
} from '../src/index.js';

describe('Arena V2 true Hades hook scythe Definition prototype', () => {
  it('keeps stage commitment and support-sensitive ground/aerial values distinct', () => {
    const prototype = ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_DEFINITION_PROTOTYPE;
    expect(prototype.status).toBe('research-only');
    expect(prototype.numericStatus).toBe('definition-projected-hypothesis');
    expect(prototype.researchSignals).toEqual([
      'stage-confirmation',
      'support-surface',
      'nonlethal-commitment',
    ]);
    expect(prototype.groundAction.commitment).toMatchObject({
      commitTicks: 8,
      expireTicks: 14,
      expireOutcome: 'cancel',
      canTurn: false,
    });
    expect(prototype.groundAction.targeting.kind).toBe('facing-cone');
    expect(prototype.aerialAction.targeting.kind).toBe('downward-cylinder');
    expect(prototype.groundStats).toMatchObject({
      range: 2.8,
      windupTicks: 16,
      recoveryTicks: 28,
      selfMovementImpulse: 1.1,
      heightGap: 1.3,
    });
    expect(prototype.aerialStats).toMatchObject({
      range: 2.6,
      windupTicks: 10,
      recoveryTicks: 30,
      verticalImpulse: 6.1,
      heightGap: 2.5,
    });
    expect(prototype.groundStats.impactDistance).toBeCloseTo(2.2, 8);
    expect(prototype.aerialStats.impactDistance).toBeCloseTo(1.7, 8);
  });

  it('projects the weapon beside the existing research candidates', () => {
    const overview = createArenaV2WeaponTrueHadesHookScytheNumericOverview();
    expect(overview.contexts.map(({ id }) => id)).toEqual(['ground', 'aerial']);
    expect(overview.comparisonWeaponIds).toEqual([
      'research-line-pressure',
      'research-read-punish',
      'research-flank',
      'research-phantom-tiger-fist',
      'research-blood-shadow-hook-blade',
      'research-true-hades-hook-scythe',
    ]);
    expect(overview.contexts.every(({ stats, contextStats, behaviorStats }) => (
      stats.length === 9 && contextStats.length === 6 && behaviorStats.length === 2
    ))).toBe(true);
  });

  it('keeps the research Definition and projection deeply frozen', () => {
    const prototype = ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_DEFINITION_PROTOTYPE;
    const overview = createArenaV2WeaponTrueHadesHookScytheNumericOverview();
    expect(Object.isFrozen(prototype)).toBe(true);
    expect(Object.isFrozen(prototype.groundAction)).toBe(true);
    expect(Object.isFrozen(prototype.groundAction.commitment)).toBe(true);
    expect(Object.isFrozen(prototype.measurementPlan)).toBe(true);
    expect(Object.isFrozen(overview)).toBe(true);
    expect(Object.isFrozen(overview.contexts[1]?.stats)).toBe(true);
  });
});
