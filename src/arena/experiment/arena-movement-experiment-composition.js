import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_EXPERIMENT_DEFINITION_SCHEMA_VERSION,
  ARENA_EXPERIMENT_SEED_SET_KIND,
  createArenaExperimentDefinition,
} from '@number-strategy-jump/arena-experiment';
import {
  assertArenaExperimentCaseCount,
  createArenaExperimentReplaySeeds,
  createSortedArenaExperimentSeeds,
} from '@number-strategy-jump/arena-experiment';
import { MetricCollectorRegistry } from './metric-collector-registry.js';
import { SimulationWorkloadRegistry } from './simulation-workload-registry.js';
import {
  ARENA_MOVEMENT_STRESS_COLLECTOR_ID,
  ARENA_MOVEMENT_STRESS_COLLECTOR_VERSION,
  createArenaMovementStressCollectorEntry,
} from './arena-movement-stress-collector.js';
import {
  ARENA_V1_MOVEMENT_STRESS_DEFAULT_PARAMETERS,
  ARENA_V1_MOVEMENT_STRESS_WORKLOAD_ID,
  ARENA_V1_MOVEMENT_STRESS_WORKLOAD_VERSION,
  createArenaV1MovementStressWorkloadEntry,
} from './arena-v1-movement-stress-workload.js';

export const ARENA_STAGE9_MOVEMENT_EXPERIMENT_ID = 'arena.stage9.s9.1.movement-stress.v1';
export const ARENA_STAGE9_MOVEMENT_SEED_BASE = 0x6d560000;
export const ARENA_STAGE9_MOVEMENT_SEED_STEP = 2_654_435_761;

export const ARENA_STAGE9_MOVEMENT_DEFAULT_CONFIG = Object.freeze({
  preparingTicks: 0,
  livesPerParticipant: 99,
  suddenDeathStartTick: 4_000,
  hardLimitTicks: 4_200,
  equipment: Object.freeze({ initialSpawns: Object.freeze([]) }),
});

function createMovementSeeds(caseCountValue) {
  const caseCount = assertArenaExperimentCaseCount(caseCountValue);
  return createSortedArenaExperimentSeeds(Array.from(
    { length: caseCount },
    (_, index) => (ARENA_STAGE9_MOVEMENT_SEED_BASE
      + index * ARENA_STAGE9_MOVEMENT_SEED_STEP) >>> 0,
  ), 'movement experiment seeds');
}

function readProbeMetadata({ seed, config }) {
  const core = createArenaV1MatchCore({ seed, config });
  try {
    return core.getReplayMetadata();
  } finally {
    core.destroy();
  }
}

export function createArenaStage9MovementExperimentDefinition({
  sourceCommit,
  sourceDirty,
  caseCount = 100,
  replaySampleCount = 3,
  config = ARENA_STAGE9_MOVEMENT_DEFAULT_CONFIG,
  input = ARENA_V1_MOVEMENT_STRESS_DEFAULT_PARAMETERS.input,
  replayCheckpointInterval =
    ARENA_V1_MOVEMENT_STRESS_DEFAULT_PARAMETERS.replayCheckpointInterval,
  maximumEventsPerCase = ARENA_V1_MOVEMENT_STRESS_DEFAULT_PARAMETERS.maximumEventsPerCase,
  maximumFailedCases = 0,
} = {}) {
  const seeds = createMovementSeeds(caseCount);
  const replaySeeds = createArenaExperimentReplaySeeds(seeds, replaySampleCount);
  const metadata = readProbeMetadata({ seed: seeds[0], config });
  return createArenaExperimentDefinition({
    schemaVersion: ARENA_EXPERIMENT_DEFINITION_SCHEMA_VERSION,
    id: ARENA_STAGE9_MOVEMENT_EXPERIMENT_ID,
    description: 'Arena V1 走跑、跳跃、蹲跳、二段跳、下砸、移动状态边界与回放实验。',
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
      id: ARENA_V1_MOVEMENT_STRESS_WORKLOAD_ID,
      version: ARENA_V1_MOVEMENT_STRESS_WORKLOAD_VERSION,
      parameters: {
        input,
        replaySeeds,
        replayCheckpointInterval,
        maximumEventsPerCase,
      },
    },
    collectors: [{
      id: ARENA_MOVEMENT_STRESS_COLLECTOR_ID,
      version: ARENA_MOVEMENT_STRESS_COLLECTOR_VERSION,
    }],
    limits: {
      maximumTicksPerCase: metadata.config.preparingTicks + metadata.config.hardLimitTicks + 1,
      maximumFailedCases,
    },
  });
}

export function createArenaStage9MovementExperimentRegistries() {
  return Object.freeze({
    workloadRegistry: new SimulationWorkloadRegistry([
      createArenaV1MovementStressWorkloadEntry(),
    ]),
    collectorRegistry: new MetricCollectorRegistry([
      createArenaMovementStressCollectorEntry(),
    ]),
  });
}
