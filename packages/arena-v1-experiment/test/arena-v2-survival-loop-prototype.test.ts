import { describe, expect, it } from 'vitest';
import { runArenaV2SurvivalLoopPrototype } from '../src/index.js';

describe('Arena V2 survival 1vE loop prototype', () => {
  it('keeps the simple repeatable loop deterministic and visibly escalating', () => {
    const first = runArenaV2SurvivalLoopPrototype();
    const second = runArenaV2SurvivalLoopPrototype();

    expect(first).toEqual(second);
    expect(first.modeId).toBe('survival-1ve');
    expect(first.initialWeaponId).toBeNull();
    expect(first.offerIntervalSeconds).toBe(20);
    expect(first.totalRounds).toBe(10);
    expect(first.survivalSeconds).toBe(200);
    expect(first.rounds.every(({ offers }) => offers.length === 3)).toBe(true);
    expect(first.rounds[0]?.offers[0]?.survivalLevel).toBe(1);
    expect(first.rounds[9]?.offers[0]?.survivalLevel).toBe(10);
    expect(first.rounds[9]?.offers[0]?.temporaryControlPower)
      .toBeGreaterThan(first.rounds[0]?.offers[0]?.temporaryControlPower ?? 0);
    expect(first.rounds[9]?.enemyCount).toBeGreaterThan(first.rounds[0]?.enemyCount ?? 0);
    expect(first.firstDownRound).toBe(3);
    expect(first.secondDownRound).toBe(10);
    expect(first.reviveCount).toBe(1);
    expect(first.ended).toBe(true);
    expect(first.endReason).toBe('second-knockdown');
    expect(first.rounds[2]?.revivedAfterDown).toBe(true);
    expect(first.rounds[9]?.revivedAfterDown).toBe(false);
    expect(first.collection.offersSeen).toBe(30);
    expect(first.collection.uniqueWeaponsSeen).toBe(3);
    expect(first.collection.repeatedOffers).toBe(27);
    expect(first.rounds.some(({ usedMapAvoidance }) => usedMapAvoidance)).toBe(true);
    expect(first.reward.survivalTokens).toBeGreaterThan(0);
  });
});
