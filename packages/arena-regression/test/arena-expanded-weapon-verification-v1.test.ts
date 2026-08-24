import { describe, expect, it } from 'vitest';
import {
  ARENA_EXPANDED_WEAPON_VERIFICATION_PLAN_CANDIDATE_V1,
  runArenaExpandedWeaponVerificationCandidateV1,
} from '../src/arena-expanded-weapon-verification-v1.js';

describe('Arena expanded weapon verification candidate V1', () => {
  it('declares one closed verification lane for all fourteen collection variants', () => {
    expect(ARENA_EXPANDED_WEAPON_VERIFICATION_PLAN_CANDIDATE_V1).toMatchObject({
      candidateStatus: 'production-unreachable',
      hardGate: false,
      defaultRegistryWired: false,
      expectedConsequenceScenarioCount: 56,
      expectedReplayRunCount: 14,
    });
    expect(ARENA_EXPANDED_WEAPON_VERIFICATION_PLAN_CANDIDATE_V1.weaponIds).toHaveLength(14);
    expect(new Set(ARENA_EXPANDED_WEAPON_VERIFICATION_PLAN_CANDIDATE_V1.weaponIds).size).toBe(14);
  });

  it('runs ground/aerial map consequences and MatchCore Replay for every variant', () => {
    const report = runArenaExpandedWeaponVerificationCandidateV1();
    expect(report.weaponCount).toBe(14);
    expect(report.consequenceScenarios).toHaveLength(56);
    expect(report.replayRuns).toHaveLength(14);
    expect(report.consequenceScenarios.every(({ hitCount, recordedHitCount }) => (
      hitCount > 0 && recordedHitCount === hitCount
    ))).toBe(true);
    expect(report.replayRuns.every((run) => (
      run.replayedFinalHash === run.replayFinalHash
      && run.restoredFinalHash === run.replayFinalHash
      && run.feedbackEventHash === run.replayedFeedbackEventHash
    ))).toBe(true);
    expect(report.resultHash).toMatch(/^[0-9a-f]{8}$/);
  });
});
