import { BOT_DIFFICULTY_IDS } from '@number-strategy-jump/arena-bot';
import { assertIntegerAtLeast, assertNonEmptyString } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_EXPERIMENT_DEFINITION_SCHEMA_VERSION,
  ARENA_EXPERIMENT_SEED_SET_KIND,
  createArenaBotCapabilityGatePolicyDefinition,
  createArenaExperimentDefinition,
  createArenaExperimentReplaySeeds,
  createArenaBalancePolicy,
  createSortedArenaExperimentSeeds,
} from '@number-strategy-jump/arena-experiment';
import type { ArenaExperimentDefinition } from '@number-strategy-jump/arena-experiment';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import { STAGE4_EQUIPMENT_DEFINITIONS } from '@number-strategy-jump/arena-v1-content';
import { ARENA_V1_BENCHMARK_PLAYER_DEFAULT_TUNING } from './arena-benchmark-player-tuning.js';

export const ARENA_BALANCE_CANDIDATE_COLLECTOR_ID = 'arena.stage9.balance-candidate';
export const ARENA_BALANCE_CANDIDATE_COLLECTOR_VERSION = 1;
export const ARENA_BOT_ASSIGNMENT_DISTRIBUTION_COLLECTOR_ID = 'arena.stage9.bot-assignment-distribution';
export const ARENA_BOT_ASSIGNMENT_DISTRIBUTION_COLLECTOR_VERSION = 1;
export const ARENA_BOT_CAPABILITY_COLLECTOR_ID = 'arena.stage9.bot-capability';
export const ARENA_BOT_CAPABILITY_COLLECTOR_VERSION = 1;
export const ARENA_V1_BOT_CAPABILITY_WORKLOAD_ID = 'arena.stage9.bot-capability';
export const ARENA_V1_BOT_CAPABILITY_WORKLOAD_VERSION = 1;
export const ARENA_V1_BOT_CAPABILITY_DEFAULT_PARAMETERS = Object.freeze({
  difficultyIds: BOT_DIFFICULTY_IDS,
  benchmarkPlayer: ARENA_V1_BENCHMARK_PLAYER_DEFAULT_TUNING,
  replaySeeds: Object.freeze([]),
  maximumEventsPerCase: 20_000,
});

function readProbeMetadata(options: { readonly seed: number; readonly config: unknown }) {
  const core = createArenaV1MatchCore(options);
  try {
    return core.getReplayMetadata();
  } finally {
    core.destroy();
  }
}

function assertPolicyMatchesCandidate(
  metadata: ReturnType<ReturnType<typeof createArenaV1MatchCore>['getReplayMetadata']>,
  policy: ReturnType<typeof createArenaBalancePolicy>,
): void {
  const equipment = metadata.config.equipment;
  if (!equipment || !Array.isArray(equipment.initialSpawns)) {
    throw new TypeError('Arena 平衡候选 metadata 缺少完整 equipment.initialSpawns。');
  }
  const configured = [...new Set(equipment.initialSpawns.map(
    ({ definitionId }) => definitionId,
  ))].sort();
  const planned = policy.equipment.actionBindings.map(({ equipmentDefinitionId }) => equipmentDefinitionId).sort();
  if (configured.length !== planned.length || configured.some((id, index) => id !== planned[index])) {
    throw new Error('Arena 平衡 Policy 未与候选初始装备池完全对齐。');
  }
  const registered = STAGE4_EQUIPMENT_DEFINITIONS
    .map(({ id, actionDefinitionId }) => `${id}:${actionDefinitionId}`).sort();
  const plannedBindings = policy.equipment.actionBindings
    .map(({ equipmentDefinitionId, actionDefinitionId }) => `${equipmentDefinitionId}:${actionDefinitionId}`).sort();
  if (registered.length !== plannedBindings.length
    || registered.some((binding, index) => binding !== plannedBindings[index])) {
    throw new Error('Arena 平衡 Policy 未与候选装备 Registry 的动作绑定完全对齐。');
  }
}

export interface ArenaBalanceCandidateExperimentDefinitionOptions {
  readonly sourceCommit: unknown;
  readonly sourceDirty: unknown;
  readonly experimentId: unknown;
  readonly description: unknown;
  readonly candidateId: unknown;
  readonly config?: unknown;
  readonly seeds: unknown;
  readonly replaySampleCount: unknown;
  readonly balancePolicy: unknown;
  readonly botGatePolicy: unknown;
  readonly maximumEventsPerCase?: unknown;
}

export function createArenaBalanceCandidateExperimentDefinition(
  options: ArenaBalanceCandidateExperimentDefinitionOptions,
): ArenaExperimentDefinition {
  const seeds = createSortedArenaExperimentSeeds(options.seeds, 'Arena balance candidate seeds');
  const balancePolicy = createArenaBalancePolicy(options.balancePolicy);
  const botGatePolicy = createArenaBotCapabilityGatePolicyDefinition(options.botGatePolicy);
  if (balancePolicy.minimumCompletedPairedCases !== seeds.length) {
    throw new Error('Arena balance Policy 样本门必须等于 Definition seed 数量。');
  }
  if (botGatePolicy.minimumCompletedPairedCases !== seeds.length) {
    throw new Error('Arena balance Bot 样本门必须等于 Definition seed 数量。');
  }
  const replaySeeds = createArenaExperimentReplaySeeds(seeds, options.replaySampleCount);
  const metadata = readProbeMetadata({ seed: seeds[0] as number, config: options.config ?? {} });
  assertPolicyMatchesCandidate(metadata, balancePolicy);
  const preparingTicks = assertIntegerAtLeast(
    metadata.config.preparingTicks,
    0,
    'Arena balance metadata.config.preparingTicks',
  );
  const hardLimitTicks = assertIntegerAtLeast(
    metadata.config.hardLimitTicks,
    1,
    'Arena balance metadata.config.hardLimitTicks',
  );
  return createArenaExperimentDefinition({
    schemaVersion: ARENA_EXPERIMENT_DEFINITION_SCHEMA_VERSION,
    id: assertNonEmptyString(options.experimentId, 'Arena balance experimentId'),
    description: assertNonEmptyString(options.description, 'Arena balance description'),
    metricSchemaVersion: 1,
    candidate: {
      id: assertNonEmptyString(options.candidateId, 'Arena balance candidateId'),
      sourceCommit: options.sourceCommit,
      sourceDirty: options.sourceDirty,
      matchConfig: metadata.config,
      authority: {
        matchSchemaVersion: metadata.schemaVersion,
        physicsBackendVersion: metadata.physicsBackendVersion,
        configHash: metadata.configHash,
        ruleContentHash: metadata.ruleContentHash,
      },
    },
    seedSet: { kind: ARENA_EXPERIMENT_SEED_SET_KIND.EXPLICIT, values: seeds },
    workload: {
      id: ARENA_V1_BOT_CAPABILITY_WORKLOAD_ID,
      version: ARENA_V1_BOT_CAPABILITY_WORKLOAD_VERSION,
      parameters: {
        difficultyIds: BOT_DIFFICULTY_IDS,
        benchmarkPlayer: ARENA_V1_BOT_CAPABILITY_DEFAULT_PARAMETERS.benchmarkPlayer,
        replaySeeds,
        maximumEventsPerCase: assertIntegerAtLeast(
          options.maximumEventsPerCase ?? ARENA_V1_BOT_CAPABILITY_DEFAULT_PARAMETERS.maximumEventsPerCase,
          1,
          'Arena balance maximumEventsPerCase',
        ),
      },
    },
    collectors: [
      { id: ARENA_BOT_ASSIGNMENT_DISTRIBUTION_COLLECTOR_ID, version: ARENA_BOT_ASSIGNMENT_DISTRIBUTION_COLLECTOR_VERSION, parameters: {} },
      { id: ARENA_BOT_CAPABILITY_COLLECTOR_ID, version: ARENA_BOT_CAPABILITY_COLLECTOR_VERSION, parameters: { gatePolicy: botGatePolicy } },
      { id: ARENA_BALANCE_CANDIDATE_COLLECTOR_ID, version: ARENA_BALANCE_CANDIDATE_COLLECTOR_VERSION, parameters: { policy: balancePolicy } },
    ],
    limits: {
      maximumTicksPerCase: BOT_DIFFICULTY_IDS.length
        * (preparingTicks + hardLimitTicks + 1),
      maximumFailedCases: 0,
    },
  });
}
