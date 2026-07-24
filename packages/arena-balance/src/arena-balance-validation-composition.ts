import { assertKnownKeys } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_STAGE9_BALANCE_VALIDATION_CASE_COUNT,
  createArenaStage9BalanceValidationSeeds,
} from '@number-strategy-jump/arena-experiment';
import { ARENA_V1_BALANCE_DEFINITION } from '@number-strategy-jump/arena-v1-content';
import { createArenaBalanceCandidateExperimentDefinition } from './arena-balance-experiment-definition.js';
import { createArenaStage9BalanceBotGatePolicy, createArenaStage9BalancePolicy } from './arena-stage9-balance-policies.js';

export const ARENA_STAGE9_BALANCE_VALIDATION_EXPERIMENT_ID = 'arena.stage9.s9.3b.balance-lives-11-validation.v1';
export const ARENA_STAGE9_BALANCE_VALIDATION_CANDIDATE_ID = 'arena-v1.balance-lives-11.validation.v1';
export const ARENA_STAGE9_BALANCE_VALIDATION_REPLAY_SAMPLE_COUNT = 5;
export const ARENA_STAGE9_BALANCE_SELECTION_BUNDLE_HASH = '6322f4fa';
export const ARENA_STAGE9_BALANCE_VALIDATION_CONFIG = ARENA_V1_BALANCE_DEFINITION.matchConfig;
const DEFINITION_OPTIONS_KEYS: ReadonlySet<string> = new Set(['sourceCommit', 'sourceDirty']);

export function createArenaStage9BalanceValidationExperimentDefinition(value: unknown = {}) {
  assertKnownKeys(value, DEFINITION_OPTIONS_KEYS, 'Arena balance validation options');
  const seeds = createArenaStage9BalanceValidationSeeds();
  if (seeds.length !== ARENA_STAGE9_BALANCE_VALIDATION_CASE_COUNT) {
    throw new Error('Arena balance validation seed cohort 数量漂移。');
  }
  return createArenaBalanceCandidateExperimentDefinition({
    sourceCommit: value.sourceCommit,
    sourceDirty: value.sourceDirty,
    experimentId: ARENA_STAGE9_BALANCE_VALIDATION_EXPERIMENT_ID,
    description: `Arena V1 S9.3b 由 exploration Bundle ${ARENA_STAGE9_BALANCE_SELECTION_BUNDLE_HASH} 选择的 11 条命隔离验证。`,
    candidateId: ARENA_STAGE9_BALANCE_VALIDATION_CANDIDATE_ID,
    config: ARENA_STAGE9_BALANCE_VALIDATION_CONFIG,
    seeds,
    replaySampleCount: ARENA_STAGE9_BALANCE_VALIDATION_REPLAY_SAMPLE_COUNT,
    balancePolicy: createArenaStage9BalancePolicy(ARENA_STAGE9_BALANCE_VALIDATION_CASE_COUNT),
    botGatePolicy: createArenaStage9BalanceBotGatePolicy(ARENA_STAGE9_BALANCE_VALIDATION_CASE_COUNT),
    maximumEventsPerCase: 100_000,
  });
}
