import { createArenaBalanceCandidateExperimentRegistries } from './arena-balance-experiment-factory.js';

export {
  ARENA_STAGE9_BALANCE_SELECTION_BUNDLE_HASH,
  ARENA_STAGE9_BALANCE_VALIDATION_CANDIDATE_ID,
  ARENA_STAGE9_BALANCE_VALIDATION_CONFIG,
  ARENA_STAGE9_BALANCE_VALIDATION_EXPERIMENT_ID,
  ARENA_STAGE9_BALANCE_VALIDATION_REPLAY_SAMPLE_COUNT,
  createArenaStage9BalanceValidationExperimentDefinition,
} from '@number-strategy-jump/arena-balance';

export function createArenaStage9BalanceValidationExperimentRegistries() {
  return createArenaBalanceCandidateExperimentRegistries();
}
