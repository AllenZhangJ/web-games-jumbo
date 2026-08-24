import { describe, expect, it } from 'vitest';
import {
  ARENA_MODE_VERIFICATION_PLAN_V1_CANDIDATE_STATUS,
  ARENA_MODE_VERIFICATION_PLAN_V1_LONG_RUN_TICKS,
  createArenaModeVerificationPlanV1,
} from '../src/arena-mode-verification-plan-v1.js';
import {
  runArenaModeVerificationPlanV1,
  validateArenaModeVerificationReportV1,
  type ArenaModeVerificationRunRequestV1,
} from '../src/arena-mode-verification-runner-v1.js';

type ModeKind = 'duel' | 'race' | 'survival';
type Profile = 'correctness' | 'long-run' | 'rematch';

function verificationCase(
  profile: Profile,
  modeKind: ModeKind,
  participantCount: number,
  enemySlotCount: number,
  ordinal: number,
): Record<string, unknown> {
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

function plan(): unknown {
  return createArenaModeVerificationPlanV1({
    schemaVersion: 1,
    candidateStatus: ARENA_MODE_VERIFICATION_PLAN_V1_CANDIDATE_STATUS,
    id: 'arena.p2.mode-verification.runner.test.v1',
    sourceCommit: 'c'.repeat(40),
    cases: [
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
    ].sort((left, right) => String(left.id).localeCompare(String(right.id))),
  });
}

function output(request: Readonly<ArenaModeVerificationRunRequestV1>) {
  const suffix = request.matchSeed.toString(16).padStart(8, '0').slice(-8);
  return {
    executedTicks: request.profile === 'long-run'
      ? request.runnerTickBudget
      : request.rematchCount,
    maximumTicksPerMatch: request.profile === 'long-run' ? request.runnerTickBudget : 1,
    completedRematches: request.rematchCount,
    authorityHash: suffix,
    replayIdentityHash: suffix,
    checkpointSequenceHash: suffix,
    modeResultHash: suffix,
    finalHash: suffix,
  } as const;
}

describe('Arena Mode Verification Runner V1 candidate', () => {
  it('executes every pre-registered seed twice and returns a frozen report', () => {
    let runCount = 0;
    let destroyCount = 0;
    const verificationPlan = plan();
    const report = runArenaModeVerificationPlanV1(verificationPlan, (request) => ({
      run: () => {
        runCount += 1;
        return output(request);
      },
      destroy: () => {
        destroyCount += 1;
      },
      getRetainedResourceCount: () => 0,
    }));

    expect(report.caseReports).toHaveLength(14);
    expect(runCount).toBe(492);
    expect(destroyCount).toBe(runCount);
    expect(report.candidateStatus).toBe('production-unreachable');
    expect(Object.isFrozen(report.caseReports)).toBe(true);
    expect(validateArenaModeVerificationReportV1(report, verificationPlan)).toEqual(report);
  });

  it('fails closed on deterministic drift and destroys both runtimes', () => {
    let ordinal = 0;
    let destroyCount = 0;
    expect(() => runArenaModeVerificationPlanV1(plan(), (request) => ({
      run: () => {
        ordinal += 1;
        return {
          ...output(request),
          finalHash: ordinal === 2 ? 'ffffffff' : output(request).finalHash,
        };
      },
      destroy: () => {
        destroyCount += 1;
      },
      getRetainedResourceCount: () => 0,
    }))).toThrow(/双跑确定性漂移/);
    expect(destroyCount).toBe(2);
  });

  it('still destroys the runtime when execution fails', () => {
    let destroyCount = 0;
    expect(() => runArenaModeVerificationPlanV1(plan(), () => ({
      run: () => {
        throw new Error('hostile run');
      },
      destroy: () => {
        destroyCount += 1;
      },
      getRetainedResourceCount: () => 0,
    }))).toThrow(/无渲染执行失败/);
    expect(destroyCount).toBe(1);
  });

  it('cleans a partially valid runtime when port capture fails', () => {
    let destroyCount = 0;
    expect(() => runArenaModeVerificationPlanV1(plan(), () => ({
      destroy: () => {
        destroyCount += 1;
      },
      getRetainedResourceCount: () => 0,
    }))).toThrow(/无渲染执行失败/);
    expect(destroyCount).toBe(1);
  });

  it('contains a rejected Promise returned by a factory', async () => {
    expect(() => runArenaModeVerificationPlanV1(
      plan(),
      () => Promise.reject(new Error('late rejection')),
    )).toThrow(/无渲染执行失败/);
    await Promise.resolve();
  });

  it('rejects a declared data then field before runtime execution and cleans once', () => {
    let runCount = 0;
    let destroyCount = 0;
    let retainedReads = 0;
    expect(() => runArenaModeVerificationPlanV1(plan(), () => ({
      then: null,
      run() {
        runCount += 1;
        throw new Error('must-not-run');
      },
      destroy() {
        destroyCount += 1;
      },
      getRetainedResourceCount() {
        retainedReads += 1;
        return 0;
      },
    }))).toThrow(/then字段.*同步完成|无渲染执行失败/);
    expect(runCount).toBe(0);
    expect(destroyCount).toBe(1);
    expect(retainedReads).toBe(0);
  });

  it('rejects incomplete long-run, rematch and retained-resource outputs', () => {
    expect(() => runArenaModeVerificationPlanV1(plan(), (request) => ({
      run: () => ({
        ...output(request),
        executedTicks: request.profile === 'long-run'
          ? request.runnerTickBudget - 1
          : output(request).executedTicks,
        maximumTicksPerMatch: request.profile === 'long-run'
          ? request.runnerTickBudget - 1
          : output(request).maximumTicksPerMatch,
      }),
      destroy: () => undefined,
      getRetainedResourceCount: () => 0,
    }))).toThrow(/long-run必须完整执行|无渲染执行失败/);

    expect(() => runArenaModeVerificationPlanV1(plan(), (request) => ({
      run: () => ({ ...output(request), completedRematches: 0 }),
      destroy: () => undefined,
      getRetainedResourceCount: () => 0,
    }))).toThrow(/completedRematches|rematchCount|无渲染执行失败/);

    expect(() => runArenaModeVerificationPlanV1(plan(), (request) => ({
      run: () => output(request),
      destroy: () => undefined,
      getRetainedResourceCount: () => 1,
    }))).toThrow(/资源归零复核失败/);
  });

  it('rejects tampered persisted report identities against the supplied plan', () => {
    const verificationPlan = plan();
    const report = runArenaModeVerificationPlanV1(verificationPlan, (request) => ({
      run: () => output(request),
      destroy: () => undefined,
      getRetainedResourceCount: () => 0,
    }));
    const firstCase = report.caseReports[0]!;
    const firstSeed = firstCase.seedReports[0]!;
    expect(() => validateArenaModeVerificationReportV1({
      ...report,
      caseReports: [{
        ...firstCase,
        seedReports: [{
          ...firstSeed,
          deterministicIdentityHash: 'ffffffff',
        }, ...firstCase.seedReports.slice(1)],
      }, ...report.caseReports.slice(1)],
    }, verificationPlan)).toThrow(/deterministicIdentityHash/);

    expect(() => validateArenaModeVerificationReportV1({
      ...report,
      caseReports: [...report.caseReports].reverse(),
    }, verificationPlan)).toThrow(/identity|计划/);

    expect(() => validateArenaModeVerificationReportV1({
      ...report,
      planResultHash: '00000000',
    }, verificationPlan)).toThrow(/plan\/source identity/);
  });
});
