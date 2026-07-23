import { createArenaStage9BotSeedCohort } from './arena-bot-capability-seeds.js';

export const ARENA_STAGE9_BALANCE_EXPLORATION_FIRST_SEED_INDEX = 10_000;
export const ARENA_STAGE9_BALANCE_EXPLORATION_CASE_COUNT = 60;
export const ARENA_STAGE9_BALANCE_VALIDATION_FIRST_SEED_INDEX = 20_000;
export const ARENA_STAGE9_BALANCE_VALIDATION_CASE_COUNT = 300;
export function createArenaStage9BalanceExplorationSeeds(): readonly number[] {
  return createArenaStage9BotSeedCohort({
    firstIndex: ARENA_STAGE9_BALANCE_EXPLORATION_FIRST_SEED_INDEX,
    caseCount: ARENA_STAGE9_BALANCE_EXPLORATION_CASE_COUNT,
  });
}
export function createArenaStage9BalanceValidationSeeds(): readonly number[] {
  return createArenaStage9BotSeedCohort({
    firstIndex: ARENA_STAGE9_BALANCE_VALIDATION_FIRST_SEED_INDEX,
    caseCount: ARENA_STAGE9_BALANCE_VALIDATION_CASE_COUNT,
  });
}
