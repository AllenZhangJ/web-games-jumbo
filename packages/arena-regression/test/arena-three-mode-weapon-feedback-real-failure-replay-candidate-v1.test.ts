import { describe, expect, it } from 'vitest';
import {
  ARENA_THREE_MODE_AUTHORITATIVE_REPLAY_LOCAL_PARTICIPANT_IDS_V1,
  ARENA_THREE_MODE_AUTHORITATIVE_REPLAY_RUNTIME_CANDIDATE_V1,
  createArenaThreeModeAuthoritativeReplayRuntimeCandidateV1,
} from '../src/arena-three-mode-authoritative-quick-match-composition-candidate-v1.js';
import {
  ARENA_THREE_MODE_WEAPON_FEEDBACK_REAL_FAILURE_REPLAY_CANDIDATE_V1,
  runArenaThreeModeWeaponFeedbackRealFailureReplayCandidateV1,
} from '../src/arena-three-mode-weapon-feedback-real-failure-replay-candidate-v1.js';

describe('Arena three-mode real failure replay candidate V1', () => {
  it('keeps the real runtime ownership seam production-unreachable', () => {
    expect(ARENA_THREE_MODE_AUTHORITATIVE_REPLAY_RUNTIME_CANDIDATE_V1).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      usesAuthoritativeQuickMatchRosterAndContentRules: true,
      startsRuntimeBeforeTransfer: true,
      callerOwnsReturnedRuntime: true,
      defaultRegistryWired: false,
      defaultCompositionWired: false,
      defaultEntryWired: false,
      validationStatus: 'not-run',
    });
    expect(ARENA_THREE_MODE_AUTHORITATIVE_REPLAY_LOCAL_PARTICIPANT_IDS_V1).toEqual({
      duel: 'arena-duel-player-01',
      race: 'arena-race-vertical-player-01',
      survival: 'arena-p3-survival-shared-player',
    });
  });

  it('creates already-started real mode runtimes whose ownership returns to zero', () => {
    for (const [modeDefinitionId, matchSeed] of [
      ['arena-v2.mode.duel.candidate.v1', 11],
      ['arena-v2.mode.race.candidate.v1', 12],
      ['arena-v2.mode.survival.candidate.v1', 13],
    ] as const) {
      const runtime = createArenaThreeModeAuthoritativeReplayRuntimeCandidateV1({
        modeDefinitionId,
        matchSeed,
        raceParticipantCount: 4,
        survivalEnemyCount: 16,
      });
      expect(runtime.getRetainedResourceSnapshot?.()).toMatchObject({
        authorityOwned: true,
        modeDriverOwned: true,
        ownedResourceCount: 2,
      });
      runtime.destroy();
      expect(runtime.getRetainedResourceSnapshot?.()).toEqual({
        authorityOwned: false,
        modeDriverOwned: false,
        ownedResourceCount: 0,
        committedRecordCount: 0,
      });
    }
  });

  const runRealFailureMatrix = process.env.ARENA_P4_REAL_FAILURE_REPLAY_EXTERNAL === '1'
    ? it.skip
    : it;

  runRealFailureMatrix('assembles all 33 fixed real-runtime failure cases', () => {
    const report = runArenaThreeModeWeaponFeedbackRealFailureReplayCandidateV1();
    expect(ARENA_THREE_MODE_WEAPON_FEEDBACK_REAL_FAILURE_REPLAY_CANDIDATE_V1)
      .toMatchObject({
        status: 'production-unreachable',
        implementationStatus: 'code-written-not-run',
        comparedTickCount: 120,
        totalScenarioCount: 33,
        inputPolicy: 'fixed-neutral-local-input',
        runtimePolicy: 'started-real-three-mode-authority',
        defaultRegistryWired: false,
        defaultCompositionWired: false,
        defaultEntryWired: false,
        validationStatus: 'not-run',
      });
    expect(report.caseCount).toBe(33);
    expect(report.expectedFailureObservedCount).toBe(33);
    expect(report.allExpectedFailuresObserved).toBe(true);
    expect(report.cases.every(({ status }) => status === 'expected-failure-observed'))
      .toBe(true);
  });
});
