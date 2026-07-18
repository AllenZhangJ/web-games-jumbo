import {
  assertArenaExperimentCaseCount,
  createSortedArenaExperimentSeeds,
} from './experiment-seed-utils.js';

export const ARENA_STAGE9_BOT_SEED_BASE = 0x6d2b79f5;
export const ARENA_STAGE9_BOT_SEED_STEP = 2_654_435_761;

export function createArenaStage9BotSeeds(caseCountValue) {
  const caseCount = assertArenaExperimentCaseCount(caseCountValue);
  return createSortedArenaExperimentSeeds(Array.from(
    { length: caseCount },
    (_, index) => (index * ARENA_STAGE9_BOT_SEED_STEP + ARENA_STAGE9_BOT_SEED_BASE) >>> 0,
  ), 'bot experiment seeds');
}
