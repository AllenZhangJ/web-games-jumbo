import { describe, expect, it } from 'vitest';
import {
  ARENA_MODE_VERIFICATION_PLAN_V1_CANDIDATE_STATUS,
  ARENA_MODE_VERIFICATION_PLAN_V1_LONG_RUN_TICKS,
  createArenaModeVerificationPlanV1,
  validateArenaModeVerificationPlanV1,
} from '../src/arena-mode-verification-plan-v1.js';

type DataRecord = Record<string, unknown>;
type ModeKind = 'duel' | 'race' | 'survival';
type Profile = 'correctness' | 'long-run' | 'rematch';

function verificationCase(
  profile: Profile,
  modeKind: ModeKind,
  participantCount: number,
  enemySlotCount: number,
  ordinal: number,
): DataRecord {
  return {
    id: `arena.p2.${profile}.${modeKind}-${participantCount}-${enemySlotCount}`,
    profile,
    modeKind,
    modeDefinitionId: `arena.mode.${modeKind}.v6`,
    fixtureDefinitionId: modeKind === 'duel'
      ? null
      : `arena.mode.${modeKind}.test.fixture.v1`,
    participantCount,
    enemySlotCount,
    seedStart: ordinal * 100,
    seedCount: profile === 'correctness' ? 30 : 1,
    runnerTickBudget: profile === 'long-run'
      ? ARENA_MODE_VERIFICATION_PLAN_V1_LONG_RUN_TICKS
      : 1_000,
    rematchCount: profile === 'rematch' ? 100 : 1,
    requireDoubleRun: true,
  };
}

function options(): DataRecord {
  const cases = [
    verificationCase('correctness', 'duel', 2, 0, 1),
    verificationCase('correctness', 'race', 2, 0, 2),
    verificationCase('correctness', 'race', 3, 0, 3),
    verificationCase('correctness', 'race', 4, 0, 4),
    verificationCase('correctness', 'survival', 5, 4, 5),
    verificationCase('correctness', 'survival', 9, 8, 6),
    verificationCase('correctness', 'survival', 13, 12, 7),
    verificationCase('correctness', 'survival', 17, 16, 8),
    verificationCase('long-run', 'duel', 2, 0, 9),
    verificationCase('long-run', 'race', 4, 0, 10),
    verificationCase('long-run', 'survival', 5, 4, 11),
    verificationCase('rematch', 'duel', 2, 0, 12),
    verificationCase('rematch', 'race', 4, 0, 13),
    verificationCase('rematch', 'survival', 5, 4, 14),
  ].sort((left, right) => {
    const leftId = String(left.id);
    const rightId = String(right.id);
    return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
  });
  return {
    schemaVersion: 1,
    candidateStatus: ARENA_MODE_VERIFICATION_PLAN_V1_CANDIDATE_STATUS,
    id: 'arena.p2.mode-verification.test.v1',
    sourceCommit: 'b'.repeat(40),
    cases,
  };
}

function mutableCases(value: DataRecord): DataRecord[] {
  return value.cases as DataRecord[];
}

describe('Arena Mode Verification Plan V1 candidate', () => {
  it('pre-registers the full correctness, long-run and rematch matrix', () => {
    const plan = createArenaModeVerificationPlanV1(options());
    expect(plan.cases).toHaveLength(14);
    expect(plan.cases.filter(({ profile }) => profile === 'correctness')).toHaveLength(8);
    expect(plan.candidateStatus).toBe('production-unreachable');
    expect(validateArenaModeVerificationPlanV1(plan)).toEqual(plan);
    expect(Object.isFrozen(plan.cases)).toBe(true);
  });

  it('requires 2/3/4-player Race and 4/8/12/16-slot Survival coverage', () => {
    const missing = options();
    missing.cases = mutableCases(missing).filter(({ id }) => !String(id).endsWith('17-16'));
    expect(() => createArenaModeVerificationPlanV1(missing)).toThrow(/survival:17:16/);

    const weakSeedMatrix = options();
    const correctnessRace = mutableCases(weakSeedMatrix).find(
      ({ id }) => id === 'arena.p2.correctness.race-4-0',
    )!;
    correctnessRace.seedCount = 29;
    expect(() => createArenaModeVerificationPlanV1(weakSeedMatrix)).toThrow(/30个seed/);
  });

  it('requires each mode to cover 30-minute equivalent and 100-rematch profiles', () => {
    const shortRun = options();
    const longRunDuel = mutableCases(shortRun).find(
      ({ id }) => id === 'arena.p2.long-run.duel-2-0',
    )!;
    longRunDuel.runnerTickBudget = ARENA_MODE_VERIFICATION_PLAN_V1_LONG_RUN_TICKS - 1;
    expect(() => createArenaModeVerificationPlanV1(shortRun)).toThrow(/30分钟/);

    const shortRematch = options();
    const rematchRace = mutableCases(shortRematch).find(
      ({ id }) => id === 'arena.p2.rematch.race-4-0',
    )!;
    rematchRace.rematchCount = 99;
    expect(() => createArenaModeVerificationPlanV1(shortRematch)).toThrow(/100局/);

    const mixedLongRun = options();
    const longRunRace = mutableCases(mixedLongRun).find(
      ({ id }) => id === 'arena.p2.long-run.race-4-0',
    )!;
    longRunRace.rematchCount = 2;
    expect(() => createArenaModeVerificationPlanV1(mixedLongRun)).toThrow(/不得混入/);

    const multiSeedRematch = options();
    const rematchDuel = mutableCases(multiSeedRematch).find(
      ({ id }) => id === 'arena.p2.rematch.duel-2-0',
    )!;
    rematchDuel.seedCount = 2;
    expect(() => createArenaModeVerificationPlanV1(multiSeedRematch)).toThrow(/单个预注册seed/);
  });

  it('keeps unresolved mode fixtures explicit and requires deterministic double runs', () => {
    const fixture = options();
    const race = mutableCases(fixture).find(
      ({ id }) => id === 'arena.p2.correctness.race-2-0',
    )!;
    race.fixtureDefinitionId = 'arena.mode.race.fixture.v1';
    expect(() => createArenaModeVerificationPlanV1(fixture)).toThrow(/test.*fixture/);

    const singleRun = options();
    mutableCases(singleRun)[0]!.requireDoubleRun = false;
    expect(() => createArenaModeVerificationPlanV1(singleRun)).toThrow(/requireDoubleRun/);
  });

  it('rejects future fields, source drift, caller mutation and tampered result hash', () => {
    expect(() => createArenaModeVerificationPlanV1({
      ...options(),
      future: true,
    })).toThrow(/future/);
    expect(() => createArenaModeVerificationPlanV1({
      ...options(),
      sourceCommit: 'dirty',
    })).toThrow(/sourceCommit/);

    const source = options();
    const plan = createArenaModeVerificationPlanV1(source);
    mutableCases(source)[0]!.seedCount = 999;
    expect(plan.cases[0]!.seedCount).not.toBe(999);
    expect(() => validateArenaModeVerificationPlanV1({
      ...plan,
      resultHash: '00000000',
    })).toThrow(/resultHash/);
  });
});
