import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_DEFINITION_PROTOTYPE,
  createArenaV2WeaponMammothStoneAxeNumericOverview,
} from '../src/index.js';

describe('Arena V2 mammoth stone axe Definition prototype', () => {
  it('exposes heavy ground/aerial numbers and keeps delayed impact research-only', () => {
    const prototype = ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_DEFINITION_PROTOTYPE;
    expect(prototype.status).toBe('research-only');
    expect(prototype.groundAction.id).toBe('research-mammoth-stone-axe-ground');
    expect(prototype.aerialAction.id).toBe('research-mammoth-stone-axe-aerial');
    expect(prototype.groundStats.recoveryTicks).toBeGreaterThan(prototype.aerialStats.recoveryTicks - 4);
    expect(prototype.groundStats.impactDistance).toBeGreaterThan(prototype.aerialStats.impactDistance);
    expect(prototype.aerialStats.heightGap).toBeGreaterThan(prototype.groundStats.heightGap);
    expect(prototype.warningHypothesis).toMatchObject({
      delayTicks: 18,
      warningTicks: 18,
      activeTicks: 2,
      status: 'research-only',
    });
    const overview = createArenaV2WeaponMammothStoneAxeNumericOverview();
    expect(overview.contexts.map(({ id }) => id)).toEqual(['ground', 'aerial']);
    expect(overview.comparisonWeaponIds).toContain(prototype.weaponId);
    expect(Object.isFrozen(prototype)).toBe(true);
  });
});
