import {
  MATCH_REWARD_DEFINITION_SCHEMA_VERSION,
  createMatchRewardDefinition,
} from '../progression/match-reward-definition.js';
import { createProgressionRegistry } from '../progression/progression-registry.js';

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

// All Stage 8.3 content remains unlocked. New content can add UnlockDefinitions
// without changing the reward resolver or persistence writer.
export const ARENA_V1_PROGRESSION_REGISTRY = createProgressionRegistry({
  rewards: [ARENA_V1_MATCH_REWARD_DEFINITION],
  unlocks: [],
});
