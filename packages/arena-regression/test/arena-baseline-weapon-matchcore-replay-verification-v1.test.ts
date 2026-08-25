import { describe, expect, it } from 'vitest';
import {
  ARENA_BASELINE_WEAPON_MATCHCORE_REPLAY_VERIFICATION_V1_CANDIDATE_STATUS,
  ARENA_BASELINE_WEAPON_MATCHCORE_REPLAY_VERIFICATION_V1_SCHEMA_VERSION,
  runArenaBaselineWeaponMatchCoreReplayVerificationCandidateV1,
} from '../src/arena-baseline-weapon-matchcore-replay-verification-v1.js';

describe('Arena P4 baseline weapon MatchCore replay verification candidate v1', () => {
  it('keeps all three weapon runs deterministic across replay and checkpoint restore', () => {
    const report = runArenaBaselineWeaponMatchCoreReplayVerificationCandidateV1();

    expect(report.schemaVersion).toBe(
      ARENA_BASELINE_WEAPON_MATCHCORE_REPLAY_VERIFICATION_V1_SCHEMA_VERSION,
    );
    expect(report.candidateStatus).toBe(
      ARENA_BASELINE_WEAPON_MATCHCORE_REPLAY_VERIFICATION_V1_CANDIDATE_STATUS,
    );
    expect(report.hardGate).toBe(false);
    expect(report.usesMatchCoreV5Authority).toBe(true);
    expect(report.usesHeadlessReplay).toBe(true);
    expect(report.exercisesReplayVerification).toBe(true);
    expect(report.exercisesInternalCheckpointRestore).toBe(true);
    expect(report.usesMatchCoreWeaponFeedbackAdapterV1).toBe(true);
    expect(report.exercisesP2ModeLifecycle).toBe(false);
    expect(report.runs.map((run) => run.weaponId)).toEqual([
      'heavy-hammer',
      'gravity-chain',
      'charge-shield',
    ]);

    for (const run of report.runs) {
      expect(run.replayFinalHash).toBe(run.replayedFinalHash);
      expect(run.checkpointStateHash).toBe(run.restoredInitialHash);
      expect(run.replayFinalHash).toBe(run.restoredFinalHash);
      expect(run.checkpointTick).toBe(40);
      expect(run.replayCheckpointCount).toBeGreaterThanOrEqual(5);
      expect(run.replayInputFrameCount).toBeGreaterThan(0);
      expect(run.replayEventCount).toBeGreaterThan(0);
      expect(run.actionStartedCount).toBeGreaterThanOrEqual(1);
      expect(run.hitResolvedCount).toBeGreaterThanOrEqual(1);
      expect(run.knockbackAppliedCount).toBeGreaterThanOrEqual(1);
      expect(run.feedbackEventCount).toBeGreaterThanOrEqual(1);
      expect(run.feedbackKinds.every((kind) => [
        'hit-confirm',
        'hit-surface-transfer',
        'hit-ring-out',
      ].includes(kind))).toBe(true);
      expect(run.feedbackEventHash).toBe(run.replayedFeedbackEventHash);
      expect(run.resultReason).toBe('timeout-draw');
      expect(run.resultHash).toMatch(/^[0-9a-f]{8}$/);
    }
    expect(report.resultHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('repeats to the same aggregate and per-weapon hashes', () => {
    const first = runArenaBaselineWeaponMatchCoreReplayVerificationCandidateV1();
    const second = runArenaBaselineWeaponMatchCoreReplayVerificationCandidateV1();

    expect(second.resultHash).toBe(first.resultHash);
    expect(second.runs.map((run) => run.resultHash)).toEqual(
      first.runs.map((run) => run.resultHash),
    );
  });
});
