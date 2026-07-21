import { describe, expect, it } from 'vitest';
import {
  BOT_DIFFICULTY_IDS,
  BOT_DIFFICULTY_PROFILES,
  createBotPersonality,
  getBotDifficultyProfile,
  selectHighestUtility,
  type UtilityEvaluator,
} from '../src/index.js';

interface MarkerPlan {
  readonly marker: string;
}

function evaluator(
  id: string,
  score: number,
  priority = 0,
): UtilityEvaluator<object, MarkerPlan> {
  return {
    id,
    priority,
    score: () => score,
    createPlan: () => ({ marker: id }),
  };
}

describe('arena-bot deterministic foundation', () => {
  it('keeps all difficulty values centralized, validated and immutable', () => {
    expect(BOT_DIFFICULTY_IDS).toEqual(['easy', 'normal', 'hard']);
    expect(BOT_DIFFICULTY_PROFILES.hard.observationDelayTicks).toBe(6);
    expect(BOT_DIFFICULTY_PROFILES.normal.replanIntervalTicks).toBe(7);
    expect(Object.isFrozen(BOT_DIFFICULTY_IDS)).toBe(true);
    expect(Object.isFrozen(BOT_DIFFICULTY_PROFILES)).toBe(true);
    expect(Object.isFrozen(getBotDifficultyProfile('easy'))).toBe(true);
    expect(() => getBotDifficultyProfile('impossible')).toThrow(/未知机器人难度/);
  });

  it('derives personality only from the injected uint32 seed', () => {
    const first = createBotPersonality(0x12345678);
    expect(createBotPersonality(0x12345678)).toEqual(first);
    expect(createBotPersonality(0x12345679)).not.toEqual(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(() => createBotPersonality(-1)).toThrow(/uint32/);
    expect(() => createBotPersonality(0x100000000)).toThrow(/uint32/);
  });

  it('uses stable score, priority and ID ordering without mutating candidates', () => {
    const candidates = [
      evaluator('z-goal', 0.5, 2),
      evaluator('a-goal', 0.5, 2),
      evaluator('low', 0.2, 99),
    ];
    const decision = selectHighestUtility(candidates, {});
    expect(decision).toEqual({
      goalId: 'a-goal',
      score: 0.5,
      plan: { marker: 'a-goal', goalId: 'a-goal' },
    });
    expect(Object.isFrozen(decision)).toBe(true);
    expect(Object.isFrozen(decision.plan)).toBe(true);
  });

  it('rejects accessors and malformed output without executing caller getters', () => {
    let getterCalls = 0;
    const malicious = Object.defineProperty({}, 'id', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'malicious';
      },
    });
    expect(() => selectHighestUtility([malicious as never], {})).toThrow(/访问器/);
    expect(getterCalls).toBe(0);

    const plan = Object.defineProperty({}, 'marker', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'malicious';
      },
    });
    expect(() => selectHighestUtility([{
      id: 'plan-getter',
      score: () => 1,
      createPlan: () => plan,
    }], {})).toThrow(/计划字段不得是访问器/);
    expect(getterCalls).toBe(0);
  });
});
