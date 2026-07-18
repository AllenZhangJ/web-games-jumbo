import {
  createArenaBalanceCandidateExperimentDefinition,
  createArenaBalanceCandidateExperimentRegistries,
} from './arena-balance-experiment-factory.js';
import { createArenaStage9BotSeedCohort } from './arena-bot-capability-seeds.js';
import {
  createArenaStage9BalanceBotGatePolicy,
  createArenaStage9BalancePolicy,
} from './arena-stage9-balance-policies.js';

export const ARENA_STAGE9_BALANCE_EXPLORATION_ID =
  'arena.stage9.s9.3b.lives-exploration.v1';
export const ARENA_STAGE9_BALANCE_EXPLORATION_FIRST_SEED_INDEX = 10_000;
export const ARENA_STAGE9_BALANCE_EXPLORATION_CASE_COUNT = 60;
export const ARENA_STAGE9_BALANCE_EXPLORATION_REPLAY_SAMPLE_COUNT = 2;
export const ARENA_STAGE9_BALANCE_VALIDATION_FIRST_SEED_INDEX = 20_000;
export const ARENA_STAGE9_BALANCE_VALIDATION_CASE_COUNT = 300;

export const ARENA_STAGE9_BALANCE_EXPLORATION_CANDIDATES = Object.freeze([
  Object.freeze({
    candidateId: 'arena-v1.balance-lives-09.explore.v1',
    experimentId: 'arena.stage9.s9.3b.explore.lives-09.v1',
    livesPerParticipant: 9,
  }),
  Object.freeze({
    candidateId: 'arena-v1.balance-lives-11.explore.v1',
    experimentId: 'arena.stage9.s9.3b.explore.lives-11.v1',
    livesPerParticipant: 11,
  }),
  Object.freeze({
    candidateId: 'arena-v1.balance-lives-13.explore.v1',
    experimentId: 'arena.stage9.s9.3b.explore.lives-13.v1',
    livesPerParticipant: 13,
  }),
]);

export function createArenaStage9BalanceExplorationSeeds() {
  return createArenaStage9BotSeedCohort({
    firstIndex: ARENA_STAGE9_BALANCE_EXPLORATION_FIRST_SEED_INDEX,
    caseCount: ARENA_STAGE9_BALANCE_EXPLORATION_CASE_COUNT,
  });
}

export function createArenaStage9BalanceValidationSeeds() {
  return createArenaStage9BotSeedCohort({
    firstIndex: ARENA_STAGE9_BALANCE_VALIDATION_FIRST_SEED_INDEX,
    caseCount: ARENA_STAGE9_BALANCE_VALIDATION_CASE_COUNT,
  });
}

export function createArenaStage9BalanceExplorationDefinitions({
  sourceCommit,
  sourceDirty,
} = {}) {
  const seeds = createArenaStage9BalanceExplorationSeeds();
  const balancePolicy = createArenaStage9BalancePolicy(seeds.length);
  const botGatePolicy = createArenaStage9BalanceBotGatePolicy(seeds.length);
  return Object.freeze(ARENA_STAGE9_BALANCE_EXPLORATION_CANDIDATES.map((candidate) => (
    createArenaBalanceCandidateExperimentDefinition({
      sourceCommit,
      sourceDirty,
      experimentId: candidate.experimentId,
      description: `Arena V1 S9.3b ${candidate.livesPerParticipant} 条命隔离 seed 探索候选。`,
      candidateId: candidate.candidateId,
      config: { livesPerParticipant: candidate.livesPerParticipant },
      seeds,
      replaySampleCount: ARENA_STAGE9_BALANCE_EXPLORATION_REPLAY_SAMPLE_COUNT,
      balancePolicy,
      botGatePolicy,
      maximumEventsPerCase: 100_000,
    })
  )));
}

export function createArenaStage9BalanceExplorationRegistries() {
  return createArenaBalanceCandidateExperimentRegistries();
}
