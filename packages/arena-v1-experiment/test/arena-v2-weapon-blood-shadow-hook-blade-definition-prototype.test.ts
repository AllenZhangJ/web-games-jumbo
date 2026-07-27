import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_DEFINITION_PROTOTYPE,
  createArenaV2WeaponBloodShadowHookBladeNumericOverview,
} from '../src/index.js';

describe('Arena V2 blood shadow hook blade Definition prototype', () => {
  it('projects a rear-entry ground action and an aerial pull action into public numbers', () => {
    const prototype = ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_DEFINITION_PROTOTYPE;
    expect(prototype.status).toBe('research-only');
    expect(prototype.numericStatus).toBe('definition-projected-hypothesis');
    expect(prototype.groundAction.targeting).toEqual({
      kind: 'rear-cone',
      parameters: { range: 3.6, minimumFacingDot: 0.72, maximumVerticalDifference: 1.4 },
    });
    expect(prototype.groundAction.effects.some(({ kind }) => kind === 'pull-to-source')).toBe(true);
    expect(prototype.groundStats).toMatchObject({
      range: 3.6,
      windupTicks: 10,
      recoveryTicks: 24,
      selfMovementImpulse: 0.8,
      heightGap: 1.4,
    });
    expect(prototype.groundStats.impactDistance).toBeCloseTo(1.8, 8);
    expect(prototype.aerialStats).toMatchObject({
      range: 2.8,
      windupTicks: 12,
      recoveryTicks: 27,
      verticalImpulse: 3.8,
      heightGap: 2.4,
    });
    expect(prototype.aerialStats.impactDistance).toBeCloseTo(1.5, 8);
  });

  it('shows the blood shadow candidate beside the existing research candidates', () => {
    const overview = createArenaV2WeaponBloodShadowHookBladeNumericOverview();
    expect(overview.contexts.map(({ id }) => id)).toEqual(['ground', 'aerial']);
    expect(overview.comparisonWeaponIds).toEqual([
      'research-line-pressure',
      'research-read-punish',
      'research-flank',
      'research-phantom-tiger-fist',
      'research-blood-shadow-hook-blade',
    ]);
    expect(overview.contexts.every(({ stats, contextStats, behaviorStats }) => (
      stats.length === 9
      && contextStats.length === 6
      && behaviorStats.length === 2
      && stats.every(({ value, unit, playerMeaning }) => (
        Number.isFinite(value) && value >= 0 && unit.length > 0 && playerMeaning.length > 0
      ))
    ))).toBe(true);
  });

  it('keeps the research Definition and projection deeply frozen', () => {
    const prototype = ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_DEFINITION_PROTOTYPE;
    const overview = createArenaV2WeaponBloodShadowHookBladeNumericOverview();
    expect(Object.isFrozen(prototype)).toBe(true);
    expect(Object.isFrozen(prototype.groundAction)).toBe(true);
    expect(Object.isFrozen(prototype.aerialStats)).toBe(true);
    expect(Object.isFrozen(prototype.measurementPlan)).toBe(true);
    expect(Object.isFrozen(overview)).toBe(true);
    expect(Object.isFrozen(overview.contexts)).toBe(true);
    expect(Object.isFrozen(overview.contexts[0]?.stats)).toBe(true);
  });
});
