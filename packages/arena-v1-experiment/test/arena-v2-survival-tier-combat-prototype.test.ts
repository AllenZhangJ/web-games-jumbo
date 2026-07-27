import { describe, expect, it } from 'vitest';
import { runArenaV2SurvivalTierCombatPrototype } from '../src/arena-v2-survival-tier-combat-prototype.js';

describe('Arena V2 survival tier combat prototype', () => {
  it('applies tier scaling through the research impulse port without adding input buttons', () => {
    const result = runArenaV2SurvivalTierCombatPrototype();
    expect(result.scalingBoundary).toBe('research-impulse-port');
    expect(result.inputGrammarUnchanged).toBe(true);
    expect(result.weaponIds).toEqual(['hammer', 'chain', 'shield']);
    expect(result.tiers).toEqual([1, 5, 10]);
    expect(result.probes).toHaveLength(9);
    expect(result.probes.every(({ firstHitTick }) => firstHitTick !== null)).toBe(true);
  });

  it('makes higher tiers produce a measurable stronger horizontal control result', () => {
    const result = runArenaV2SurvivalTierCombatPrototype();
    expect(result.sameWeaponTier10DisplacementExceedsTier1).toBe(true);
    for (const weaponId of result.weaponIds) {
      const tier1 = result.probes.find(({ weaponId: id, tier }) => id === weaponId && tier === 1);
      const tier10 = result.probes.find(({ weaponId: id, tier }) => id === weaponId && tier === 10);
      expect(tier10?.controlPowerMultiplier).toBe(1.72);
      expect(tier10?.appliedHorizontalControlPower).toBeGreaterThan(
        tier1?.appliedHorizontalControlPower ?? 0,
      );
      expect(tier10?.targetFell).toBe(false);
    }
  });

  it('keeps weapon base values and tier multiplier separately visible', () => {
    const result = runArenaV2SurvivalTierCombatPrototype();
    const hammerTier1 = result.probes.find(({ weaponId, tier }) => weaponId === 'hammer' && tier === 1);
    const hammerTier10 = result.probes.find(({ weaponId, tier }) => weaponId === 'hammer' && tier === 10);
    expect(hammerTier1?.baseControlPower).toBeCloseTo(15, 6);
    expect(hammerTier10?.baseControlPower).toBeCloseTo(15, 6);
    expect(hammerTier10?.appliedHorizontalControlPower).toBeGreaterThan(
      hammerTier10?.baseControlPower ?? 0,
    );
  });

  it('is deterministic', () => {
    expect(runArenaV2SurvivalTierCombatPrototype()).toEqual(
      runArenaV2SurvivalTierCombatPrototype(),
    );
  });
});
