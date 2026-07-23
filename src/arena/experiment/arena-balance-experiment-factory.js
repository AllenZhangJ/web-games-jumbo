import { BOT_DIFFICULTY_IDS } from '@number-strategy-jump/arena-bot';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import { STAGE4_EQUIPMENT_DEFINITIONS } from '@number-strategy-jump/arena-v1-content';
import {
  assertIntegerAtLeast,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_BALANCE_CANDIDATE_COLLECTOR_ID,
  ARENA_BALANCE_CANDIDATE_COLLECTOR_VERSION,
  createArenaBalanceCandidateCollectorEntry,
} from './arena-balance-candidate-collector.js';
import { createArenaBalancePolicy } from '@number-strategy-jump/arena-experiment';
import {
  ARENA_BOT_ASSIGNMENT_DISTRIBUTION_COLLECTOR_ID,
  ARENA_BOT_ASSIGNMENT_DISTRIBUTION_COLLECTOR_VERSION,
  createArenaBotAssignmentDistributionCollectorEntry,
} from './arena-bot-assignment-distribution-collector.js';
import {
  ARENA_BOT_CAPABILITY_COLLECTOR_ID,
  ARENA_BOT_CAPABILITY_COLLECTOR_VERSION,
  createArenaBotCapabilityCollectorEntry,
} from './arena-bot-capability-collector.js';
import {
  createArenaBotCapabilityGatePolicyDefinition,
} from './arena-bot-capability-metrics.js';
import {
  ARENA_EXPERIMENT_DEFINITION_SCHEMA_VERSION,
  ARENA_EXPERIMENT_SEED_SET_KIND,
  createArenaExperimentDefinition,
} from '@number-strategy-jump/arena-experiment';
import {
  createArenaExperimentReplaySeeds,
  createSortedArenaExperimentSeeds,
} from '@number-strategy-jump/arena-experiment';
import { MetricCollectorRegistry } from '@number-strategy-jump/arena-experiment';
import { SimulationWorkloadRegistry } from '@number-strategy-jump/arena-experiment';
import {
  ARENA_V1_BOT_CAPABILITY_DEFAULT_PARAMETERS,
  ARENA_V1_BOT_CAPABILITY_WORKLOAD_ID,
  ARENA_V1_BOT_CAPABILITY_WORKLOAD_VERSION,
  createArenaV1BotCapabilityWorkloadEntry,
} from './arena-v1-bot-capability-workload.js';

function readProbeMetadata({ seed, config }) {
  const core = createArenaV1MatchCore({ seed, config });
  try {
    return core.getReplayMetadata();
  } finally {
    core.destroy();
  }
}

function assertPolicyMatchesCandidate(metadata, policy) {
  const configured = [...new Set(metadata.config.equipment.initialSpawns.map(
    ({ definitionId }) => definitionId,
  ))].sort();
  const planned = policy.equipment.actionBindings
    .map(({ equipmentDefinitionId }) => equipmentDefinitionId)
    .sort();
  if (configured.length !== planned.length || configured.some((id, index) => id !== planned[index])) {
    throw new Error('Arena 平衡 Policy 未与候选初始装备池完全对齐。');
  }
  const registered = STAGE4_EQUIPMENT_DEFINITIONS
    .map(({ id, actionDefinitionId }) => `${id}:${actionDefinitionId}`)
    .sort();
  const plannedBindings = policy.equipment.actionBindings
    .map(({ equipmentDefinitionId, actionDefinitionId }) => (
      `${equipmentDefinitionId}:${actionDefinitionId}`
    ))
    .sort();
  if (
    registered.length !== plannedBindings.length
    || registered.some((binding, index) => binding !== plannedBindings[index])
  ) {
    throw new Error('Arena 平衡 Policy 未与候选装备 Registry 的动作绑定完全对齐。');
  }
}

export function createArenaBalanceCandidateExperimentDefinition({
  sourceCommit,
  sourceDirty,
  experimentId,
  description,
  candidateId,
  config = {},
  seeds: seedValues,
  replaySampleCount,
  balancePolicy: balancePolicyValue,
  botGatePolicy: botGatePolicyValue,
  maximumEventsPerCase = ARENA_V1_BOT_CAPABILITY_DEFAULT_PARAMETERS.maximumEventsPerCase,
}) {
  const seeds = createSortedArenaExperimentSeeds(seedValues, 'Arena balance candidate seeds');
  const balancePolicy = createArenaBalancePolicy(balancePolicyValue);
  const botGatePolicy = createArenaBotCapabilityGatePolicyDefinition(botGatePolicyValue);
  if (balancePolicy.minimumCompletedPairedCases !== seeds.length) {
    throw new Error('Arena balance Policy 样本门必须等于 Definition seed 数量。');
  }
  if (botGatePolicy.minimumCompletedPairedCases !== seeds.length) {
    throw new Error('Arena balance Bot 样本门必须等于 Definition seed 数量。');
  }
  const replaySeeds = createArenaExperimentReplaySeeds(seeds, replaySampleCount);
  const metadata = readProbeMetadata({ seed: seeds[0], config });
  assertPolicyMatchesCandidate(metadata, balancePolicy);
  return createArenaExperimentDefinition({
    schemaVersion: ARENA_EXPERIMENT_DEFINITION_SCHEMA_VERSION,
    id: assertNonEmptyString(experimentId, 'Arena balance experimentId'),
    description: assertNonEmptyString(description, 'Arena balance description'),
    metricSchemaVersion: 1,
    candidate: {
      id: assertNonEmptyString(candidateId, 'Arena balance candidateId'),
      sourceCommit,
      sourceDirty,
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
          maximumEventsPerCase,
          1,
          'Arena balance maximumEventsPerCase',
        ),
      },
    },
    collectors: [
      {
        id: ARENA_BOT_ASSIGNMENT_DISTRIBUTION_COLLECTOR_ID,
        version: ARENA_BOT_ASSIGNMENT_DISTRIBUTION_COLLECTOR_VERSION,
        parameters: {},
      },
      {
        id: ARENA_BOT_CAPABILITY_COLLECTOR_ID,
        version: ARENA_BOT_CAPABILITY_COLLECTOR_VERSION,
        parameters: { gatePolicy: botGatePolicy },
      },
      {
        id: ARENA_BALANCE_CANDIDATE_COLLECTOR_ID,
        version: ARENA_BALANCE_CANDIDATE_COLLECTOR_VERSION,
        parameters: { policy: balancePolicy },
      },
    ],
    limits: {
      maximumTicksPerCase: BOT_DIFFICULTY_IDS.length
        * (metadata.config.preparingTicks + metadata.config.hardLimitTicks + 1),
      maximumFailedCases: 0,
    },
  });
}

export function createArenaBalanceCandidateExperimentRegistries() {
  return Object.freeze({
    workloadRegistry: new SimulationWorkloadRegistry([
      createArenaV1BotCapabilityWorkloadEntry(),
    ]),
    collectorRegistry: new MetricCollectorRegistry([
      createArenaBotAssignmentDistributionCollectorEntry(),
      createArenaBotCapabilityCollectorEntry(),
      createArenaBalanceCandidateCollectorEntry(),
    ]),
  });
}
