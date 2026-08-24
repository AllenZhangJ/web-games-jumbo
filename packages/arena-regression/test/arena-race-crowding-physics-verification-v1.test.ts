import { describe, expect, it } from 'vitest';
import {
  ARENA_RACE_CROWDING_PHYSICS_VERIFICATION_PLAN_CANDIDATE_V1,
  runArenaRaceCrowdingPhysicsVerificationCandidateV1,
} from '../src/arena-race-crowding-physics-verification-v1.js';

describe('Arena Race crowding physics verification candidate V1', () => {
  it('declares 2/3/4-player shared-physics scenarios without overclaiming combat or lifecycle', () => {
    expect(ARENA_RACE_CROWDING_PHYSICS_VERIFICATION_PLAN_CANDIDATE_V1).toMatchObject({
      status: 'production-unreachable',
      hardGate: false,
      participantCounts: [2, 3, 4],
      usesSharedPhysics: true,
      usesModeMapAdapter: true,
      usesOnlyDirectionAndJump: true,
      exercisesCombatResolution: false,
      exercisesRaceModeLifecycle: false,
    });
  });

  it('runs preparation, crowding, safe-anchor, fall/re-entry and finish facts on the formal map', () => {
    const report = runArenaRaceCrowdingPhysicsVerificationCandidateV1();
    expect(report.scenarios.map(({ participantCount }) => participantCount)).toEqual([2, 3, 4]);
    for (const scenario of report.scenarios) {
      expect(scenario.participants).toHaveLength(scenario.participantCount);
      expect(scenario.allFinished).toBe(true);
      expect(scenario.finishClaimCount).toBe(scenario.participantCount);
      expect(scenario.inputFrameSequenceHash).toMatch(/^[0-9a-f]{8}$/u);
      expect(scenario.retainedResourceCountAfterDestroy).toBe(0);
      expect(scenario.fallFactCount).toBe(
        scenario.participants.reduce((total, participant) => total + participant.fallCount, 0),
      );
      expect(scenario.participants.every(({ safeAnchorClaimCount }) => (
        safeAnchorClaimCount > 0
      ))).toBe(true);
      expect(new Set(scenario.participants.map(({ rank }) => rank)).size)
        .toBe(scenario.participantCount);
      expect(scenario.participants.every(({ finalSupportSurfaceId }) => (
        finalSupportSurfaceId === 'kz-s12-finish'
      ))).toBe(true);
      expect(scenario.participants.every(({ lastCrowdingObservation }) => (
        lastCrowdingObservation.nearestNeighbor.distance === null
        || lastCrowdingObservation.nearestNeighbor.distance
          >= ARENA_RACE_CROWDING_PHYSICS_VERIFICATION_PLAN_CANDIDATE_V1
            .minimumSettledCharacterSeparation
      ))).toBe(true);
    }
  });

  it('keeps multi-player route outcomes deterministic', () => {
    const first = runArenaRaceCrowdingPhysicsVerificationCandidateV1();
    const second = runArenaRaceCrowdingPhysicsVerificationCandidateV1();
    expect(second).toEqual(first);
    expect(second.resultHash).toBe(first.resultHash);
    expect(second.scenarios.map(({ inputFrameSequenceHash }) => inputFrameSequenceHash))
      .toEqual(first.scenarios.map(({ inputFrameSequenceHash }) => inputFrameSequenceHash));
  });
});
