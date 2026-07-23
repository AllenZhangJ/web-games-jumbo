import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_EXPERIMENT_DEFINITION_SCHEMA_VERSION,
  ARENA_EXPERIMENT_SEED_SET_KIND,
  createArenaExperimentDefinition,
} from '@number-strategy-jump/arena-experiment';
import { MetricCollectorRegistry } from './metric-collector-registry.js';
import { SimulationWorkloadRegistry } from './simulation-workload-registry.js';
import {
  ARENA_MATCHCORE_INVARIANT_COLLECTOR_ID,
  ARENA_MATCHCORE_INVARIANT_COLLECTOR_VERSION,
  createArenaMatchCoreInvariantCollectorEntry,
} from './arena-matchcore-invariant-collector.js';
import {
  ARENA_V1_MATCHCORE_INVARIANT_DEFAULT_PARAMETERS,
  ARENA_V1_MATCHCORE_INVARIANT_WORKLOAD_ID,
  ARENA_V1_MATCHCORE_INVARIANT_WORKLOAD_VERSION,
  createArenaV1MatchCoreInvariantWorkloadEntry,
} from './arena-v1-matchcore-invariant-workload.js';
import { ARENA_V1_MATCHCORE_STRESS_INPUT_DEFAULT_TUNING } from './arena-v1-matchcore-stress-strategy.js';
import {
  createArenaExperimentReplaySeeds,
  createContiguousArenaExperimentSeedRange,
} from '@number-strategy-jump/arena-experiment';

export const ARENA_STAGE9_MATCHCORE_EXPERIMENT_ID =
  'arena.stage9.s9.1.matchcore-invariants.v1';

function readProbeMetadata({ seed, config }) {
  const core = createArenaV1MatchCore({ seed, config });
  try {
    return core.getReplayMetadata();
  } finally {
    core.destroy();
  }
}

export function createArenaStage9MatchCoreExperimentDefinition({
  sourceCommit,
  sourceDirty,
  firstSeed = 0xa11e0000,
  caseCount = 1_000,
  replaySampleCount = 5,
  config = {},
  inputParameters = ARENA_V1_MATCHCORE_STRESS_INPUT_DEFAULT_TUNING,
  replayCheckpointInterval =
    ARENA_V1_MATCHCORE_INVARIANT_DEFAULT_PARAMETERS.replayCheckpointInterval,
  maximumEventsPerCase = ARENA_V1_MATCHCORE_INVARIANT_DEFAULT_PARAMETERS.maximumEventsPerCase,
  maximumFailedCases = 0,
} = {}) {
  const range = createContiguousArenaExperimentSeedRange(firstSeed, caseCount);
  const clonedInputParameters = cloneFrozenData(
    inputParameters,
    'MatchCore experiment inputParameters',
  );
  if (Object.prototype.hasOwnProperty.call(clonedInputParameters, 'sequenceFirstSeed')) {
    throw new RangeError('MatchCore experiment inputParameters 不能覆盖 sequenceFirstSeed。');
  }
  const metadata = readProbeMetadata({ seed: range.firstSeed, config });
  const plannedSeeds = Array.from(
    { length: range.caseCount },
    (_, index) => range.firstSeed + index,
  );
  const replaySeeds = createArenaExperimentReplaySeeds(plannedSeeds, replaySampleCount);
  return createArenaExperimentDefinition({
    schemaVersion: ARENA_EXPERIMENT_DEFINITION_SCHEMA_VERSION,
    id: ARENA_STAGE9_MATCHCORE_EXPERIMENT_ID,
    description: 'Arena V1 MatchCore 状态不变量、事件上限、seed 隔离与抽样回放实验。',
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
    seedSet: {
      kind: ARENA_EXPERIMENT_SEED_SET_KIND.RANGE,
      first: range.firstSeed,
      last: range.lastSeed,
    },
    workload: {
      id: ARENA_V1_MATCHCORE_INVARIANT_WORKLOAD_ID,
      version: ARENA_V1_MATCHCORE_INVARIANT_WORKLOAD_VERSION,
      parameters: {
        input: { ...clonedInputParameters, sequenceFirstSeed: range.firstSeed },
        replaySeeds,
        replayCheckpointInterval,
        maximumEventsPerCase,
      },
    },
    collectors: [{
      id: ARENA_MATCHCORE_INVARIANT_COLLECTOR_ID,
      version: ARENA_MATCHCORE_INVARIANT_COLLECTOR_VERSION,
    }],
    limits: {
      maximumTicksPerCase: metadata.config.preparingTicks + metadata.config.hardLimitTicks + 1,
      maximumFailedCases,
    },
  });
}

export function createArenaStage9MatchCoreExperimentRegistries() {
  return Object.freeze({
    workloadRegistry: new SimulationWorkloadRegistry([
      createArenaV1MatchCoreInvariantWorkloadEntry(),
    ]),
    collectorRegistry: new MetricCollectorRegistry([
      createArenaMatchCoreInvariantCollectorEntry(),
    ]),
  });
}
