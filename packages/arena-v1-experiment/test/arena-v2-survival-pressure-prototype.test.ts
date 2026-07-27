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

  it('keeps tiered offer attributes visible while marking combat scaling as not yet wired', () => {
    const result = runArenaV2SurvivalPressurePrototype();
    expect(result.tieredOfferTelemetryOnly).toBe(true);
    const offer = result.scenarios[0]?.offers[0];
    expect(offer?.survivalLevel).toBe(1);
    expect(offer?.offerTier).toBe(1);
    expect(offer?.controlPowerMultiplier).toBe(1);
    expect(Object.keys(offer?.temporaryControlPower ?? {})).toHaveLength(3);
  });

  it('is deterministic for the same seed', () => {
    expect(runArenaV2SurvivalPressurePrototype()).toEqual(runArenaV2SurvivalPressurePrototype());
  });
});
