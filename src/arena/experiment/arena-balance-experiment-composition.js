import { BOT_DIFFICULTY_IDS } from '../ai/bot-difficulty.js';
import { createArenaV1MatchCore } from '../arena-v1-match-core.js';
import {
  STAGE4_ACTION_ID,
  STAGE4_EQUIPMENT_DEFINITIONS,
  STAGE4_EQUIPMENT_ID,
} from '../content/stage4-equipment.js';
import {
  ARENA_EXPERIMENT_DEFINITION_SCHEMA_VERSION,
  ARENA_EXPERIMENT_SEED_SET_KIND,
  createArenaExperimentDefinition,
} from './experiment-definition.js';
import { createArenaExperimentReplaySeeds } from './experiment-seed-utils.js';
import { MetricCollectorRegistry } from './metric-collector-registry.js';
import { SimulationWorkloadRegistry } from './simulation-workload-registry.js';
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
  ARENA_BALANCE_CANDIDATE_COLLECTOR_ID,
  ARENA_BALANCE_CANDIDATE_COLLECTOR_VERSION,
  createArenaBalanceCandidateCollectorEntry,
} from './arena-balance-candidate-collector.js';
import { ARENA_BALANCE_POLICY_SCHEMA_VERSION } from './arena-balance-policy.js';
import { createArenaStage9BotSeeds } from './arena-bot-capability-seeds.js';
import {
  ARENA_V1_BOT_CAPABILITY_DEFAULT_PARAMETERS,
  ARENA_V1_BOT_CAPABILITY_WORKLOAD_ID,
  ARENA_V1_BOT_CAPABILITY_WORKLOAD_VERSION,
  createArenaV1BotCapabilityWorkloadEntry,
} from './arena-v1-bot-capability-workload.js';

export const ARENA_STAGE9_BALANCE_EXPERIMENT_ID =
  'arena.stage9.s9.3.balance-baseline.v1';
export const ARENA_STAGE9_BALANCE_CASE_COUNT = 300;
export const ARENA_STAGE9_BALANCE_REPLAY_SAMPLE_COUNT = 5;
export const ARENA_STAGE9_BALANCE_DEFAULT_CONFIG = Object.freeze({});

export const ARENA_STAGE9_BALANCE_POLICY_V1 = Object.freeze({
  schemaVersion: ARENA_BALANCE_POLICY_SCHEMA_VERSION,
  minimumCompletedPairedCases: ARENA_STAGE9_BALANCE_CASE_COUNT,
  duration: Object.freeze({
    targetMinimumTicks: 7_200,
    targetMaximumTicks: 10_800,
    minimumTargetShare: 0.6,
    ultraShortMaximumTicks: 2_700,
    maximumUltraShortShare: 0.1,
    maximumTimeoutShare: 0.65,
  }),
  equipment: Object.freeze({
    actionBindings: Object.freeze([
      Object.freeze({
        equipmentDefinitionId: STAGE4_EQUIPMENT_ID.CHAIN,
        actionDefinitionId: STAGE4_ACTION_ID.CHAIN_PULL,
      }),
      Object.freeze({
        equipmentDefinitionId: STAGE4_EQUIPMENT_ID.HAMMER,
        actionDefinitionId: STAGE4_ACTION_ID.HAMMER_SMASH,
      }),
      Object.freeze({
        equipmentDefinitionId: STAGE4_EQUIPMENT_ID.SHIELD,
        actionDefinitionId: STAGE4_ACTION_ID.SHIELD_CHARGE,
      }),
    ]),
    minimumPickupsPerDefinition: 100,
    minimumActionsPerDefinition: 100,
    minimumHitsPerDefinition: 10,
    minimumPickupSharePerDefinition: 0.15,
    maximumPickupSharePerDefinition: 0.5,
    minimumActionSharePerDefinition: 0.05,
    maximumActionSharePerDefinition: 0.75,
    minimumHitSharePerDefinition: 0.01,
    maximumHitSharePerDefinition: 0.85,
  }),
  elimination: Object.freeze({
    minimumCreditedShare: 0.4,
    minimumEquipmentAttributedShare: 0.05,
    maximumEquipmentAttributedShare: 0.8,
    minimumEnvironmentShare: 0.05,
  }),
});

export const ARENA_STAGE9_BALANCE_BOT_GATE_POLICY_V1 = Object.freeze({
  minimumCompletedPairedCases: ARENA_STAGE9_BALANCE_CASE_COUNT,
  maximumAverageUncreditedDeaths: 0.5,
  minimumCapabilityIndexDelta: 0.25,
  minimumLifePressureDelta: 0.05,
  scoreRateToleranceScale: 0.5,
});

function readProbeMetadata({ seed, config }) {
  const core = createArenaV1MatchCore({ seed, config });
  try {
    return core.getReplayMetadata();
  } finally {
    core.destroy();
  }
}

function assertPolicyMatchesCandidate(metadata) {
  const configured = [...new Set(metadata.config.equipment.initialSpawns.map(
    ({ definitionId }) => definitionId,
  ))].sort();
  const planned = ARENA_STAGE9_BALANCE_POLICY_V1.equipment.actionBindings
    .map(({ equipmentDefinitionId }) => equipmentDefinitionId)
    .sort();
  if (configured.length !== planned.length || configured.some((id, index) => id !== planned[index])) {
    throw new Error('S9.3 平衡 Policy 未与候选初始装备池完全对齐。');
  }
  const registered = STAGE4_EQUIPMENT_DEFINITIONS
    .map(({ id, actionDefinitionId }) => `${id}:${actionDefinitionId}`)
    .sort();
  const plannedBindings = ARENA_STAGE9_BALANCE_POLICY_V1.equipment.actionBindings
    .map(({ equipmentDefinitionId, actionDefinitionId }) => (
      `${equipmentDefinitionId}:${actionDefinitionId}`
    ))
    .sort();
  if (
    registered.length !== plannedBindings.length
    || registered.some((binding, index) => binding !== plannedBindings[index])
  ) {
    throw new Error('S9.3 平衡 Policy 未与候选装备 Registry 的动作绑定完全对齐。');
  }
}

export function createArenaStage9BalanceExperimentDefinition({
  sourceCommit,
  sourceDirty,
  config = ARENA_STAGE9_BALANCE_DEFAULT_CONFIG,
} = {}) {
  const seeds = createArenaStage9BotSeeds(ARENA_STAGE9_BALANCE_CASE_COUNT);
  const replaySeeds = createArenaExperimentReplaySeeds(
    seeds,
    ARENA_STAGE9_BALANCE_REPLAY_SAMPLE_COUNT,
  );
  const metadata = readProbeMetadata({ seed: seeds[0], config });
  assertPolicyMatchesCandidate(metadata);
  return createArenaExperimentDefinition({
    schemaVersion: ARENA_EXPERIMENT_DEFINITION_SCHEMA_VERSION,
    id: ARENA_STAGE9_BALANCE_EXPERIMENT_ID,
    description: 'Arena V1 S9.3 预注册三档配对、时长、装备争夺与淘汰来源基线候选。',
    metricSchemaVersion: 1,
    candidate: {
      id: 'arena-v1.balance-baseline.v1',
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
        maximumEventsPerCase: ARENA_V1_BOT_CAPABILITY_DEFAULT_PARAMETERS.maximumEventsPerCase,
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
        parameters: { gatePolicy: ARENA_STAGE9_BALANCE_BOT_GATE_POLICY_V1 },
      },
      {
        id: ARENA_BALANCE_CANDIDATE_COLLECTOR_ID,
        version: ARENA_BALANCE_CANDIDATE_COLLECTOR_VERSION,
        parameters: { policy: ARENA_STAGE9_BALANCE_POLICY_V1 },
      },
    ],
    limits: {
      maximumTicksPerCase: BOT_DIFFICULTY_IDS.length
        * (metadata.config.preparingTicks + metadata.config.hardLimitTicks + 1),
      maximumFailedCases: 0,
    },
  });
}

export function createArenaStage9BalanceExperimentRegistries() {
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
