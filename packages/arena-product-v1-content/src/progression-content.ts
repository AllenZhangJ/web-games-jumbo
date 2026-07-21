import {
  MATCH_REWARD_DEFINITION_SCHEMA_VERSION,
  createMatchRewardDefinition,
  createProgressionRegistry,
} from '@number-strategy-jump/arena-progression';

export const ARENA_V1_MATCH_REWARD_ID = 'arena-v1-match-reward';

export const ARENA_V1_MATCH_REWARD_DEFINITION = createMatchRewardDefinition({
  schemaVersion: MATCH_REWARD_DEFINITION_SCHEMA_VERSION,
  id: ARENA_V1_MATCH_REWARD_ID,
  contentVersion: 1,
  participantId: 'player-1',
  completionExperience: 100,
  winnerBonusExperience: 25,
  drawBonusExperience: 10,
});

// Stage 8.3 ships fully unlocked; future unlocks extend the Registry, not the writer.
export const ARENA_V1_PROGRESSION_REGISTRY = createProgressionRegistry({
  rewards: [ARENA_V1_MATCH_REWARD_DEFINITION],
  unlocks: [],
});
