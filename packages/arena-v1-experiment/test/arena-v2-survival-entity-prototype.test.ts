import { describe, expect, it } from 'vitest';
import { runArenaV2SurvivalEntityPrototype } from '../src/arena-v2-survival-entity-prototype.js';

describe('Arena V2 survival entity prototype', () => {
  it('uses the same rule and physics boundary for player and one enemy family', () => {
    const result = runArenaV2SurvivalEntityPrototype();
    expect(result.enemyEntityId).toBe('enemy-1');
    expect(result.enemyDefinitionId).toBe('single-enemy-family');
    expect(result.sharedMovementAndCombatRules).toBe(true);
    expect(result.encounters).toHaveLength(3);
    expect(result.encounters.every(({ firstHitTick, fallTick }) => (
      firstHitTick !== null && fallTick !== null
    ))).toBe(true);
  });

  it('records enemy knockdown, first revive and terminal second knockdown', () => {
    const result = runArenaV2SurvivalEntityPrototype();
    expect(result.encounters.map(({ targetOutcome }) => targetOutcome)).toEqual([
      'enemy-removed',
      'player-revived',
      'player-eliminated',
    ]);
    expect(result.reviveCount).toBe(1);
    expect(result.playerDowns).toBe(2);
    expect(result.enemyKnockdowns).toBe(1);
    expect(result.ended).toBe(true);
    expect(result.endReason).toBe('second-knockdown');
    expect(result.encounters[1]?.revivedAt).toMatchObject({ x: 0, z: 0 });
    expect(result.encounters[1]?.revivedAt?.y).toBeGreaterThan(0);
  });

  it('is deterministic for the same seed and encounter order', () => {
    expect(runArenaV2SurvivalEntityPrototype()).toEqual(runArenaV2SurvivalEntityPrototype());
  });
});
