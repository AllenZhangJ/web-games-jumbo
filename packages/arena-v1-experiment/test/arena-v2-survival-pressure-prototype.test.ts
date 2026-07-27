import { describe, expect, it } from 'vitest';
import { runArenaV2SurvivalPressurePrototype } from '../src/arena-v2-survival-pressure-prototype.js';

describe('Arena V2 survival pressure prototype', () => {
  it('runs one enemy family with bounded input decisions and shared rule/physics boundaries', () => {
    const result = runArenaV2SurvivalPressurePrototype();
    expect(result.enemyDefinitionId).toBe('single-enemy-family');
    expect(result.enemyInputPolicy).toBe('bounded-pursuit-with-supply-priority');
    expect(result.sharedMovementAndCombatRules).toBe(true);
    expect(result.scenarios.map(({ enemyCount }) => enemyCount)).toEqual([1, 2, 4]);
    expect(result.scenarios.every(({ firstEnemyContactTick }) => firstEnemyContactTick !== null)).toBe(true);
  });

  it('shows measurable crowd pressure and a real 20-second three-weapon supply route', () => {
    const result = runArenaV2SurvivalPressurePrototype();
    const oneEnemy = result.scenarios[0];
    const fourEnemies = result.scenarios[2];
    expect(oneEnemy).toBeDefined();
    expect(fourEnemies).toBeDefined();
    expect(fourEnemies!.crowdPressurePeak).toBeGreaterThan(oneEnemy!.crowdPressurePeak);
    expect(oneEnemy!.enemyAttackIntentCount).toBeGreaterThan(0);
    expect(fourEnemies!.enemyAttackIntentCount).toBeGreaterThan(0);
    expect(result.scenarios.every(({ offers }) => offers.length >= 1)).toBe(true);
    expect(result.scenarios.every(({ offers }) => offers[0]?.weaponIds)).toBe(true);
    expect(result.scenarios.every(({ offers }) => offers[0]?.weaponIds.length === 3)).toBe(true);
    expect(result.scenarios.every(({ offers }) => offers[0]?.offerTick === 1200)).toBe(true);
  });

  it('wires tiered offer attributes into actual combat definitions', () => {
    const result = runArenaV2SurvivalPressurePrototype();
    expect(result.tieredOfferCombatWired).toBe(true);
    const offer = result.scenarios[0]?.offers[0];
    const secondOffer = result.scenarios[0]?.offers[1];
    expect(offer?.survivalLevel).toBe(1);
    expect(offer?.offerTier).toBe(1);
    expect(offer?.offerTierMultiplier).toBe(1);
    expect(offer?.definitionBundleHash).toHaveLength(8);
    expect(Object.keys(offer?.temporaryControlPower ?? {})).toHaveLength(3);
    expect(secondOffer?.offerTier).toBe(5);
    expect(secondOffer?.weaponControlPowerMultiplier.chain).toBe(1.32);
    expect(secondOffer?.temporaryControlPower.chain).toBe(13.2);
    expect(secondOffer?.pickups.every(({ weaponId }) => (
      ['hammer', 'chain', 'shield'].includes(weaponId)
    ))).toBe(true);
  });

  it('is deterministic for the same seed', () => {
    expect(runArenaV2SurvivalPressurePrototype()).toEqual(runArenaV2SurvivalPressurePrototype());
  });
});
