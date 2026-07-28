import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_DEFINITION_PROTOTYPE,
  createArenaV2WeaponWhitePlatinumDualGunsNumericOverview,
} from '../src/index.js';

describe('Arena V2 white platinum dual guns Definition prototype', () => {
  it('projects independent ground and aerial shot Definitions into public numeric axes', () => {
    const prototype = ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_DEFINITION_PROTOTYPE;
    expect(prototype.status).toBe('research-only');
    expect(prototype.numericStatus).toBe('definition-projected-hypothesis');
    expect(prototype.groundAction.id).toBe('research-white-platinum-dual-guns-ground');
    expect(prototype.aerialAction.id).toBe('research-white-platinum-dual-guns-aerial');
    expect(prototype.groundStats).toMatchObject({
      range: 5.5,
      windupTicks: 12,
      recoveryTicks: 16,
      cooldownTicks: 48,
      impactDistance: 0.65,
      selfMovementImpulse: 0.05,
      heightGap: 1.25,
    });
    expect(prototype.aerialStats).toMatchObject({
      range: 3.6,
      windupTicks: 5,
      recoveryTicks: 22,
      cooldownTicks: 56,
      impactDistance: expect.closeTo(0.9, 10),
      selfMovementImpulse: 0.3,
      heightGap: 3.2,
    });
    expect(prototype.researchSignals).toEqual(['line-shot', 'height-branch', 'landing-risk']);
  });

  it('keeps numerical differences visible without using the generic line-pressure identity as its own row', () => {
    const overview = createArenaV2WeaponWhitePlatinumDualGunsNumericOverview();
    expect(overview.contexts.map(({ id }) => id)).toEqual(['ground', 'aerial']);
    expect(overview.comparisonWeaponIds).toContain('research-white-platinum-dual-guns');
    expect(overview.comparisonWeaponIds).not.toContain('research-line-pressure');
    expect(overview.contexts.every(({ stats, contextStats, behaviorStats }) => (
      stats.length === 9
      && contextStats.length === 6
      && behaviorStats.length === 2
      && stats.every(({ value, maxValue, playerMeaning }) => (
        Number.isFinite(value) && value >= 0 && maxValue > value && playerMeaning.length > 0
      ))
    ))).toBe(true);
    expect(overview.contexts[0]?.stats.find(({ id }) => id === 'range')?.value).toBe(5.5);
    expect(overview.contexts[1]?.contextStats.find(({ id }) => id === 'height-gap')?.value).toBe(3.2);
    expect(overview.numericReadoutReason).toContain('独立研究 Definition');
  });

  it('deep-freezes the independent research content', () => {
    const prototype = ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_DEFINITION_PROTOTYPE;
    const overview = createArenaV2WeaponWhitePlatinumDualGunsNumericOverview();
    expect(Object.isFrozen(prototype)).toBe(true);
    expect(Object.isFrozen(prototype.groundAction)).toBe(true);
    expect(Object.isFrozen(prototype.equipment)).toBe(true);
    expect(Object.isFrozen(overview)).toBe(true);
    expect(Object.isFrozen(overview.contexts[0]?.stats)).toBe(true);
  });
});
