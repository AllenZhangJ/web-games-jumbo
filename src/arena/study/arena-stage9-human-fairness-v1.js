import { BOT_DIFFICULTY_ID, BOT_DIFFICULTY_PROFILES } from '../ai/bot-difficulty.js';
import { ARENA_V1_BALANCE_DEFINITION } from '../content/arena-v1-balance.js';
import { ARENA_REPLAY_SCHEMA_VERSION } from '@number-strategy-jump/arena-match';
import {
  HUMAN_MATCH_STUDY_DEFINITION_SCHEMA_VERSION,
  createHumanMatchStudyDefinition,
} from './human-match-study-definition.js';
import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';

export const ARENA_STAGE9_HUMAN_FAIRNESS_V1_ID = 'arena.stage9.human-fairness.v1';

export const ARENA_STAGE9_HUMAN_FAIRNESS_ARM_ID = Object.freeze({
  EASY: 'hidden-difficulty-easy',
  NORMAL: 'hidden-difficulty-normal',
  HARD: 'hidden-difficulty-hard',
});

export function createArenaStage9HumanFairnessV1Definition() {
  return createHumanMatchStudyDefinition({
    schemaVersion: HUMAN_MATCH_STUDY_DEFINITION_SCHEMA_VERSION,
    id: ARENA_STAGE9_HUMAN_FAIRNESS_V1_ID,
    stage: 'stage9.s9.5',
    contentVersion: 1,
    participantPrompt: '完成三局 1v1 对局，尽可能利用装备和地图将对手击出平台。',
    assignmentSeed: 0x95050001,
    matchesPerParticipant: 3,
    candidate: {
      balanceDefinitionId: ARENA_V1_BALANCE_DEFINITION.id,
      balanceDefinitionHash: createDeterministicDataHash(
        ARENA_V1_BALANCE_DEFINITION,
        'Arena V1 balance definition',
      ),
      botDifficultyProfilesHash: createDeterministicDataHash(
        BOT_DIFFICULTY_PROFILES,
        'Arena Bot difficulty profiles',
      ),
      replaySchemaVersion: ARENA_REPLAY_SCHEMA_VERSION,
    },
    arms: [
      {
        id: ARENA_STAGE9_HUMAN_FAIRNESS_ARM_ID.EASY,
        difficultyId: BOT_DIFFICULTY_ID.EASY,
        botStrengthRank: 1,
        minimumSessionWinRate: 0.5,
        maximumSessionWinRate: 0.8,
      },
      {
        id: ARENA_STAGE9_HUMAN_FAIRNESS_ARM_ID.NORMAL,
        difficultyId: BOT_DIFFICULTY_ID.NORMAL,
        botStrengthRank: 2,
        minimumSessionWinRate: 0.3,
        maximumSessionWinRate: 0.7,
      },
      {
        id: ARENA_STAGE9_HUMAN_FAIRNESS_ARM_ID.HARD,
        difficultyId: BOT_DIFFICULTY_ID.HARD,
        botStrengthRank: 3,
        minimumSessionWinRate: 0.2,
        maximumSessionWinRate: 0.5,
      },
    ],
    environment: {
      platform: 'web',
      formFactor: 'phone',
      orientation: 'portrait',
      inputMode: 'touch',
    },
    thresholds: {
      minimumEligibleParticipantsPerArm: 30,
      minimumCompletionRate: 0.85,
      maximumInvalidationRate: 0.1,
      minimumAggregateSessionWinRate: 0.4,
      maximumAggregateSessionWinRate: 0.6,
      maximumAggregateWilsonIntervalWidth: 0.25,
      minimumExtremeSessionWinRateDelta: 0.15,
      maximumAdjacentSessionWinRateInversion: 0.1,
      targetMinimumTicks: 7_200,
      targetMaximumTicks: 10_800,
      minimumTargetDurationShare: 0.6,
      maximumBotGuessRate: 0.5,
      minimumFairnessRatingAverage: 3,
      minimumNaturalnessRatingAverage: 3,
      minimumRematchRate: 0.6,
    },
  });
}
