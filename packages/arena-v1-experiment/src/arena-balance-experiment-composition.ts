import {
  createArenaBalanceCandidateExperimentDefinition,
  createArenaBalanceCandidateExperimentRegistries,
} from './arena-balance-experiment-factory.js';
import { createArenaStage9BotSeeds } from '@number-strategy-jump/arena-experiment';
import {
  ARENA_STAGE9_BALANCE_BASELINE_CASE_COUNT,
  ARENA_STAGE9_BALANCE_BOT_GATE_POLICY_V1,
  ARENA_STAGE9_BALANCE_POLICY_V1,
} from '@number-strategy-jump/arena-balance';

export const ARENA_STAGE9_BALANCE_EXPERIMENT_ID =
  'arena.stage9.s9.3.balance-baseline.v1';
export const ARENA_STAGE9_BALANCE_CASE_COUNT =
  ARENA_STAGE9_BALANCE_BASELINE_CASE_COUNT;
export const ARENA_STAGE9_BALANCE_REPLAY_SAMPLE_COUNT = 5;
export const ARENA_STAGE9_BALANCE_DEFAULT_CONFIG = Object.freeze({});

export {
  ARENA_STAGE9_BALANCE_BOT_GATE_POLICY_V1,
  ARENA_STAGE9_BALANCE_POLICY_V1,
};

export interface ArenaStage9BalanceExperimentOptions {
  readonly sourceCommit?: unknown;
  readonly sourceDirty?: unknown;
  readonly config?: unknown;
}

export function createArenaStage9BalanceExperimentDefinition({
  sourceCommit,
  sourceDirty,
  config = ARENA_STAGE9_BALANCE_DEFAULT_CONFIG,
}: ArenaStage9BalanceExperimentOptions = {}) {
  return createArenaBalanceCandidateExperimentDefinition({
    sourceCommit,
    sourceDirty,
    experimentId: ARENA_STAGE9_BALANCE_EXPERIMENT_ID,
    description: 'Arena V1 S9.3 预注册三档配对、时长、装备争夺与淘汰来源基线候选。',
    candidateId: 'arena-v1.balance-baseline.v1',
    config,
    seeds: createArenaStage9BotSeeds(ARENA_STAGE9_BALANCE_CASE_COUNT),
    replaySampleCount: ARENA_STAGE9_BALANCE_REPLAY_SAMPLE_COUNT,
    balancePolicy: ARENA_STAGE9_BALANCE_POLICY_V1,
    botGatePolicy: ARENA_STAGE9_BALANCE_BOT_GATE_POLICY_V1,
  });
}

export function createArenaStage9BalanceExperimentRegistries() {
  return createArenaBalanceCandidateExperimentRegistries();
}
