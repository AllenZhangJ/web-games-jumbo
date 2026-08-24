import {
  createNeutralInputFrame,
  type ArenaInputFrame,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1,
} from './arena-duel-authoritative-runtime-candidate-v1.js';
import {
  ARENA_RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_V1,
} from './arena-race-vertical-integration-verification-v1.js';
import {
  ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1,
} from './arena-survival-shared-world-authority-verification-v1.js';
import {
  ARENA_THREE_MODE_AUTHORITATIVE_REPLAY_LOCAL_PARTICIPANT_IDS_V1,
  createArenaThreeModeAuthoritativeReplayRuntimeCandidateV1,
} from './arena-three-mode-authoritative-quick-match-composition-candidate-v1.js';
import {
  ARENA_THREE_MODE_WEAPON_FEEDBACK_SCHEDULED_FAILURE_REPLAY_MANIFEST_V1,
  runArenaThreeModeWeaponFeedbackScheduledFailureReplayReportCandidateV1,
  type ArenaThreeModeWeaponFeedbackScheduledFailureReplayModeDefinitionIdV1,
  type ArenaThreeModeWeaponFeedbackScheduledFailureReplayReportV1,
  type ArenaThreeModeWeaponFeedbackScheduledFailureReplayScenarioV1,
} from './arena-three-mode-weapon-feedback-scheduled-failure-replay-report-candidate-v1.js';

const MODE_IDS = Object.freeze({
  duel: ARENA_DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.modeDefinitionId,
  race: ARENA_RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.modeDefinitionId,
  survival: ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.modeDefinitionId,
});

const MATCH_SEEDS = Object.freeze({
  duel: 0x44_55_45_4c,
  race: 0x52_41_43_45,
  survival: 0x53_55_52_56,
});

export const ARENA_THREE_MODE_WEAPON_FEEDBACK_REAL_FAILURE_REPLAY_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1,
    status: 'production-unreachable',
    implementationStatus: 'code-written-not-run',
    hardGate: false,
    manifestIdentityHash:
      ARENA_THREE_MODE_WEAPON_FEEDBACK_SCHEDULED_FAILURE_REPLAY_MANIFEST_V1
        .manifestIdentityHash,
    comparedTickCount:
      ARENA_THREE_MODE_WEAPON_FEEDBACK_SCHEDULED_FAILURE_REPLAY_MANIFEST_V1
        .comparedTickCount,
    totalScenarioCount:
      ARENA_THREE_MODE_WEAPON_FEEDBACK_SCHEDULED_FAILURE_REPLAY_MANIFEST_V1
        .totalScenarioCount,
    inputPolicy: 'fixed-neutral-local-input',
    runtimePolicy: 'started-real-three-mode-authority',
    raceParticipantCount: 4,
    survivalEnemyCount: 16,
    defaultRegistryWired: false,
    defaultCompositionWired: false,
    defaultEntryWired: false,
    validationStatus: 'not-run',
  } as const);

function localParticipantId(
  modeDefinitionId: ArenaThreeModeWeaponFeedbackScheduledFailureReplayModeDefinitionIdV1,
): string {
  if (modeDefinitionId === MODE_IDS.duel) {
    return ARENA_THREE_MODE_AUTHORITATIVE_REPLAY_LOCAL_PARTICIPANT_IDS_V1.duel;
  }
  if (modeDefinitionId === MODE_IDS.race) {
    return ARENA_THREE_MODE_AUTHORITATIVE_REPLAY_LOCAL_PARTICIPANT_IDS_V1.race;
  }
  return ARENA_THREE_MODE_AUTHORITATIVE_REPLAY_LOCAL_PARTICIPANT_IDS_V1.survival;
}

function matchSeed(
  modeDefinitionId: ArenaThreeModeWeaponFeedbackScheduledFailureReplayModeDefinitionIdV1,
): number {
  if (modeDefinitionId === MODE_IDS.duel) return MATCH_SEEDS.duel;
  if (modeDefinitionId === MODE_IDS.race) return MATCH_SEEDS.race;
  return MATCH_SEEDS.survival;
}

function createLocalInputs(
  modeDefinitionId: ArenaThreeModeWeaponFeedbackScheduledFailureReplayModeDefinitionIdV1,
  scenario: ArenaThreeModeWeaponFeedbackScheduledFailureReplayScenarioV1,
): readonly ArenaInputFrame[] {
  const participantId = localParticipantId(modeDefinitionId);
  return Object.freeze(Array.from(
    { length: scenario.comparedTickCount },
    (_, tick) => createNeutralInputFrame(tick, participantId),
  ));
}

/**
 * Explicitly executes P4.4bl against the real Duel/Race/Survival authority
 * runtimes. Importing this module has no side effects; callers opt in by
 * invoking the function and own the returned immutable report only.
 */
export function runArenaThreeModeWeaponFeedbackRealFailureReplayCandidateV1():
DeepReadonly<ArenaThreeModeWeaponFeedbackScheduledFailureReplayReportV1> {
  return runArenaThreeModeWeaponFeedbackScheduledFailureReplayReportCandidateV1({
    createRuntime(modeDefinitionId) {
      return createArenaThreeModeAuthoritativeReplayRuntimeCandidateV1({
        modeDefinitionId,
        matchSeed: matchSeed(modeDefinitionId),
        raceParticipantCount:
          ARENA_THREE_MODE_WEAPON_FEEDBACK_REAL_FAILURE_REPLAY_CANDIDATE_V1
            .raceParticipantCount,
        survivalEnemyCount:
          ARENA_THREE_MODE_WEAPON_FEEDBACK_REAL_FAILURE_REPLAY_CANDIDATE_V1
            .survivalEnemyCount,
      });
    },
    createLocalInputs,
  });
}
