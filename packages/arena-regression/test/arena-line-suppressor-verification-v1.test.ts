import { describe, expect, it } from 'vitest';
import {
  runArenaLineSuppressorVerificationCandidateV1,
} from '../src/arena-line-suppressor-verification-v1.js';

describe('Arena line suppressor verification candidate V1', () => {
  it('uses real Rule/Physics and MatchCore Replay across ground/aerial map consequences', () => {
    const report = runArenaLineSuppressorVerificationCandidateV1();
    expect(report).toMatchObject({
      candidateStatus: 'production-unreachable',
      hardGate: false,
      defaultRegistryWired: false,
      weaponId: 'line-suppressor',
      coreVerb: 'suppress',
      requiredInput: 'primary',
      usesRealRulePhysicsConsequenceRunner: true,
      usesRealMatchCoreReplayRunner: true,
      scenarioCount: 4,
      exercisesP2ModeLifecycle: false,
    });
    expect(new Set(report.scenarios.map(({ context }) => context)))
      .toEqual(new Set(['ground', 'aerial']));
    expect(new Set(report.scenarios.map(({ mapSituation }) => mapSituation)))
      .toEqual(new Set(['edge', 'narrow-path']));
    expect(report.scenarios.every(({ hitCount }) => hitCount === 1)).toBe(true);
    expect(report.scenarios.filter(({ context }) => context === 'aerial').every(
      ({ movementCommandExecuted }) => movementCommandExecuted === false,
    )).toBe(true);
    expect(report.matchCoreReplay.replayFinalHash).toBe(report.matchCoreReplay.replayedFinalHash);
    expect(report.matchCoreReplay.feedbackEventHash)
      .toBe(report.matchCoreReplay.replayedFeedbackEventHash);
    expect(report.resultHash).toMatch(/^[0-9a-f]{8}$/);
  });
});
