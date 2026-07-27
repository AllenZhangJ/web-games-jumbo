import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_PROTOTYPE,
  createArenaV2WeaponMagicBloodScytheNumericOverview,
} from '../src/index.js';

describe('Arena V2 magic blood scythe Definition prototype', () => {
  it('exposes distinct ground/aerial public numbers and keeps warning separate', () => {
    const prototype = ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_PROTOTYPE;
    expect(prototype.status).toBe('research-only');
    expect(prototype.groundAction.id).toBe('research-magic-blood-scythe-ground');
    expect(prototype.aerialAction.id).toBe('research-magic-blood-scythe-aerial');
    expect(prototype.groundStats.range).toBeGreaterThan(prototype.aerialStats.range);
    expect(prototype.groundStats.coverage).toBeLessThan(prototype.aerialStats.coverage);
    expect(prototype.groundStats.cooldownTicks).toBe(prototype.aerialStats.cooldownTicks);
    expect(prototype.warningHypothesis).toMatchObject({
      delayTicks: 18,
      warningTicks: 18,
      activeTicks: 6,
      status: 'research-only',
    });
    const overview = createArenaV2WeaponMagicBloodScytheNumericOverview();
    expect(overview.contexts.map(({ id }) => id)).toEqual(['ground', 'aerial']);
    expect(overview.comparisonWeaponIds).toContain(prototype.weaponId);
    expect(Object.isFrozen(prototype)).toBe(true);
    expect(Object.isFrozen(overview.contexts)).toBe(true);
  });
});
