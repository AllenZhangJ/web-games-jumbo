import { BOT_DIFFICULTY_IDS } from '@number-strategy-jump/arena-bot';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_EXPERIMENT_DEFINITION_SCHEMA_VERSION,
  ARENA_EXPERIMENT_SEED_SET_KIND,
  createArenaExperimentDefinition,
} from '@number-strategy-jump/arena-experiment';
import {
  createArenaExperimentReplaySeeds,
} from '@number-strategy-jump/arena-experiment';
import {
  ARENA_STAGE9_BOT_SEED_BASE,
  ARENA_STAGE9_BOT_SEED_STEP,
  createArenaStage9BotSeeds,
} from '@number-strategy-jump/arena-experiment';
import { MetricCollectorRegistry } from '@number-strategy-jump/arena-experiment';
import { SimulationWorkloadRegistry } from '@number-strategy-jump/arena-experiment';
import {
  ARENA_BOT_ASSIGNMENT_DISTRIBUTION_COLLECTOR_ID,
  ARENA_BOT_ASSIGNMENT_DISTRIBUTION_COLLECTOR_VERSION,
  createArenaBotAssignmentDistributionCollectorEntry,
} from '@number-strategy-jump/arena-v1-experiment';
import {
  ARENA_BOT_CAPABILITY_COLLECTOR_ID,
  ARENA_BOT_CAPABILITY_COLLECTOR_VERSION,
  createArenaBotCapabilityCollectorEntry,
} from './arena-bot-capability-collector.js';
import {
  ARENA_V1_BOT_CAPABILITY_DEFAULT_PARAMETERS,
  ARENA_V1_BOT_CAPABILITY_WORKLOAD_ID,
  ARENA_V1_BOT_CAPABILITY_WORKLOAD_VERSION,
  createArenaV1BotCapabilityWorkloadEntry,
} from './arena-v1-bot-capability-workload.js';

export const ARENA_STAGE9_BOT_EXPERIMENT_ID = 'arena.stage9.s9.1.bot-capability.v1';
export { ARENA_STAGE9_BOT_SEED_BASE, ARENA_STAGE9_BOT_SEED_STEP };
export const ARENA_STAGE9_BOT_DEFAULT_CONFIG = Object.freeze({ preparingTicks: 0 });

function readProbeMetadata({ seed, config }) {
  const core = createArenaV1MatchCore({ seed, config });
  try {
    return core.getReplayMetadata();
  } finally {
    core.destroy();
  }
}

export function createArenaStage9BotExperimentDefinition({
  sourceCommit,
  sourceDirty,
  caseCount = 300,
  replaySampleCount = 3,
  config = ARENA_STAGE9_BOT_DEFAULT_CONFIG,
  benchmarkPlayer = ARENA_V1_BOT_CAPABILITY_DEFAULT_PARAMETERS.benchmarkPlayer,
  maximumEventsPerCase = ARENA_V1_BOT_CAPABILITY_DEFAULT_PARAMETERS.maximumEventsPerCase,
  maximumFailedCases = 0,
} = {}) {
  const seeds = createArenaStage9BotSeeds(caseCount);
  const replaySeeds = createArenaExperimentReplaySeeds(seeds, replaySampleCount);
  const metadata = readProbeMetadata({ seed: seeds[0], config });
  return createArenaExperimentDefinition({
    schemaVersion: ARENA_EXPERIMENT_DEFINITION_SCHEMA_VERSION,
    id: ARENA_STAGE9_BOT_EXPERIMENT_ID,
    description: 'Arena V1 同 seed 三档隐藏 Bot 配对能力、人类输入边界、分布与回放实验。',
    metricSchemaVersion: 1,
    candidate: {
      id: 'arena-v1.current',
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
        benchmarkPlayer,
        replaySeeds,
        maximumEventsPerCase,
      },
    },
    collectors: [
      {
        id: ARENA_BOT_ASSIGNMENT_DISTRIBUTION_COLLECTOR_ID,
        version: ARENA_BOT_ASSIGNMENT_DISTRIBUTION_COLLECTOR_VERSION,
      },
      {
        id: ARENA_BOT_CAPABILITY_COLLECTOR_ID,
        version: ARENA_BOT_CAPABILITY_COLLECTOR_VERSION,
      },
    ],
    limits: {
      maximumTicksPerCase: BOT_DIFFICULTY_IDS.length
        * (metadata.config.preparingTicks + metadata.config.hardLimitTicks + 1),
      maximumFailedCases,
    },
  });
}

export function createArenaStage9BotExperimentRegistries() {
  return Object.freeze({
    workloadRegistry: new SimulationWorkloadRegistry([
      createArenaV1BotCapabilityWorkloadEntry(),
    ]),
    collectorRegistry: new MetricCollectorRegistry([
      createArenaBotAssignmentDistributionCollectorEntry(),
      createArenaBotCapabilityCollectorEntry(),
    ]),
  });
}
