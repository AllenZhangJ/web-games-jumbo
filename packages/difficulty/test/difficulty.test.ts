import { describe, expect, it } from 'vitest';
import {
  BUILTIN_DIFFICULTIES,
  DifficultyRegistry,
  NORMAL_DIFFICULTY,
  createBuiltinDifficultyRegistry,
  toLegacyGameRules,
  toLegacyJumpPhysics,
  validateDifficultyProfile,
} from '../src/index.js';

describe('difficulty profiles', () => {
  it('validates and freezes every builtin profile', () => {
    for (const profile of BUILTIN_DIFFICULTIES) {
      expect(validateDifficultyProfile(profile)).toEqual({ valid: true, issues: [] });
      expect(Object.isFrozen(profile)).toBe(true);
      expect(Object.isFrozen(profile.gameplay)).toBe(true);
      expect(Object.isFrozen(profile.world.layout)).toBe(true);
    }
  });

  it('projects normal@1 to the exact legacy rules and physics', () => {
    expect(toLegacyGameRules(NORMAL_DIFFICULTY)).toMatchObject({
      startingValueMin: 6,
      startingValueMax: 18,
      targetMin: 28,
      targetMax: 72,
      movesPerRound: 7,
      minValue: -99,
      maxValue: 199,
      chargeMinMs: 80,
      chargeMaxMs: 1200,
      landingDurationMs: 520,
    });
    expect(toLegacyJumpPhysics(NORMAL_DIFFICULTY)).toEqual({
      minChargeMs: 80,
      maxChargeMs: 1200,
      minRange: 0.8,
      maxRange: 7.6,
      rangeExponent: 1.18,
      durationMinMs: 520,
      durationMaxMs: 820,
      heightMin: 1.1,
      heightMax: 2.2,
    });
  });

  it('rejects invalid or duplicate profiles at the registry boundary', () => {
    const invalid = {
      ...NORMAL_DIFFICULTY,
      timing: { ...NORMAL_DIFFICULTY.timing, chargeMaxMs: 0 },
    };
    expect(validateDifficultyProfile(invalid).valid).toBe(false);
    const missingLayoutValue = {
      ...NORMAL_DIFFICULTY,
      world: {
        ...NORMAL_DIFFICULTY.world,
        layout: { ...NORMAL_DIFFICULTY.world.layout, commonRangeMax: undefined },
      },
    };
    expect(validateDifficultyProfile(missingLayoutValue).valid).toBe(false);

    const registry = new DifficultyRegistry().register(NORMAL_DIFFICULTY);
    expect(() => registry.register(NORMAL_DIFFICULTY)).toThrow(/重复注册/);
    expect(() => registry.get('missing')).toThrow(/未注册/);
  });

  it('registers easy, normal and hard while exposing only normal', () => {
    const profiles = createBuiltinDifficultyRegistry().list();
    expect(profiles.map(({ id }) => id)).toEqual(['easy', 'normal', 'hard']);
    expect(profiles.filter(({ exposed }) => exposed).map(({ id }) => id)).toEqual(['normal']);
  });
});
