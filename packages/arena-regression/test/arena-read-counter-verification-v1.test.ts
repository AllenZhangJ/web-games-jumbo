import { describe, expect, it } from 'vitest';
import {
  runArenaReadCounterVerificationCandidateV1,
} from '../src/arena-read-counter-verification-v1.js';

describe('Arena read counter verification candidate V1', () => {
  it('routes primary hold, early cancellation and commitment through real authority', () => {
    const report = runArenaReadCounterVerificationCandidateV1();
    expect(report).toMatchObject({
      candidateStatus: 'production-unreachable',
      hardGate: false,
      defaultRegistryWired: false,
      weaponId: 'read-counter',
      coreVerb: 'counter',
      requiredInput: 'primary',
      usesPrimaryHold: true,
      usesRealRulePhysicsConsequenceRunner: true,
      usesRealActionCommitmentCancellation: true,
      usesRealMatchCoreReplayRunner: true,
      scenarioCount: 4,
      exercisesP2ModeLifecycle: false,
    });
    expect(report.cancellationProbes).toHaveLength(2);
    expect(report.cancellationProbes.every((probe) => (
      probe.started
      && probe.cancellationEventCount === 1
      && probe.actionDefinitionIdAfterCancellation === null
    ))).toBe(true);
    expect(report.scenarios.every(({ commitmentCommittedCount }) => (
      commitmentCommittedCount === 1
    ))).toBe(true);
    expect(report.scenarios.every(({ commitmentCancelledCount }) => (
      commitmentCancelledCount === 0
    ))).toBe(true);
    expect(report.matchCoreReplay.actionCommitmentCommittedCount).toBe(1);
    expect(report.matchCoreReplay.actionCommitmentCancelledCount).toBe(0);
    expect(report.matchCoreReplay.replayFinalHash).toBe(report.matchCoreReplay.replayedFinalHash);
    expect(report.resultHash).toMatch(/^[0-9a-f]{8}$/);
  });
});
