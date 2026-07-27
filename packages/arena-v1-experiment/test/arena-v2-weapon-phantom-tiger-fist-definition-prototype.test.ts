import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_DEFINITION_PROTOTYPE,
  createArenaV2WeaponPhantomTigerFistNumericOverview,
} from '../src/index.js';

describe('Arena V2 phantom tiger fist Definition prototype', () => {
  it('projects a ground/aerial Definition into the public numeric contract', () => {
    const prototype = ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_DEFINITION_PROTOTYPE;
    expect(prototype.status).toBe('research-only');
    expect(prototype.numericStatus).toBe('definition-projected-hypothesis');
    expect(prototype.publicOverviewAxes).toHaveLength(9);
    expect(prototype.publicBehaviorAxes).toEqual(['active-frames', 'direction-tolerance']);
    expect(prototype.groundStats).toMatchObject({
      range: 3.4,
      windupTicks: 20,
      recoveryTicks: 26,
      cooldownTicks: 84,
      impactDistance: 2.6,
      selfMovementImpulse: 1.1,
      heightGap: 1.2,
    });
    expect(prototype.aerialStats).toMatchObject({
      range: 2.8,
      windupTicks: 14,
      recoveryTicks: 28,
      heightGap: 2.4,
      verticalImpulse: 5.6,
      selfMovementImpulse: 0.7,
    });
    expect(prototype.groundAction.commitment).toMatchObject({
      commitTicks: 12,
      expireTicks: 18,
      canTurn: true,
    });
  });

  it('shows numeric differences in the same overview shape as the three launch candidates', () => {
    const overview = createArenaV2WeaponPhantomTigerFistNumericOverview();
    expect(overview.contexts).toHaveLength(2);
    expect(overview.contexts.map(({ id }) => id)).toEqual(['ground', 'aerial']);
    expect(overview.comparisonWeaponIds).toEqual([
      'research-line-pressure',
      'research-read-punish',
      'research-flank',
      'research-phantom-tiger-fist',
    ]);
    expect(overview.contexts.every(({ stats, contextStats, behaviorStats }) => (
      stats.length === 9
      && contextStats.length === 6
      && behaviorStats.length === 2
      && stats.every(({ value, maxValue, unit, playerMeaning }) => (
        Number.isFinite(value)
        && value >= 0
        && maxValue > value
        && unit.length > 0
        && playerMeaning.length > 0
      ))
    ))).toBe(true);
    expect(overview.contexts[0]?.stats.find(({ id }) => id === 'startup')?.value)
      .toBe(20);
    expect(overview.contexts[0]?.contextStats.find(({ id }) => id === 'height-gap')?.value)
      .toBe(1.2);
    expect(overview.contexts[1]?.contextStats.find(({ id }) => id === 'height-gap')?.value)
      .toBe(2.4);
    expect(overview.numericReadoutReason).toContain('权威投影');
  });

  it('keeps the research Definition and numeric readout deeply frozen', () => {
    const prototype = ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_DEFINITION_PROTOTYPE;
    const overview = createArenaV2WeaponPhantomTigerFistNumericOverview();
    expect(Object.isFrozen(prototype)).toBe(true);
    expect(Object.isFrozen(prototype.groundAction)).toBe(true);
    expect(Object.isFrozen(prototype.aerialStats)).toBe(true);
    expect(Object.isFrozen(prototype.measurementPlan)).toBe(true);
    expect(Object.isFrozen(overview)).toBe(true);
    expect(Object.isFrozen(overview.contexts)).toBe(true);
    expect(Object.isFrozen(overview.contexts[0]?.stats)).toBe(true);
    expect(Object.isFrozen(overview.contexts[0]?.contextStats)).toBe(true);
  });
});
