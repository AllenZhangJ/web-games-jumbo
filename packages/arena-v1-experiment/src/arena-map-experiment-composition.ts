import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import { assertIntegerAtLeast } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_EXPERIMENT_DEFINITION_SCHEMA_VERSION,
  ARENA_EXPERIMENT_SEED_SET_KIND,
  createArenaExperimentDefinition,
} from '@number-strategy-jump/arena-experiment';
import {
  createArenaExperimentReplaySeeds,
  createContiguousArenaExperimentSeedRange,
} from '@number-strategy-jump/arena-experiment';
import { MetricCollectorRegistry } from '@number-strategy-jump/arena-experiment';
import { SimulationWorkloadRegistry } from '@number-strategy-jump/arena-experiment';
import {
  ARENA_MAP_TIMELINE_COLLECTOR_ID,
  ARENA_MAP_TIMELINE_COLLECTOR_VERSION,
  createArenaMapTimelineCollectorEntry,
} from './arena-map-timeline-collector.js';
import {
  ARENA_V1_MAP_TIMELINE_DEFAULT_PARAMETERS,
  ARENA_V1_MAP_TIMELINE_WORKLOAD_ID,
  ARENA_V1_MAP_TIMELINE_WORKLOAD_VERSION,
  createArenaV1MapTimelineWorkloadEntry,
} from './arena-v1-map-timeline-workload.js';

export const ARENA_STAGE9_MAP_EXPERIMENT_ID = 'arena.stage9.s9.1.map-timeline.v1';

export const ARENA_STAGE9_MAP_DEFAULT_CONFIG = Object.freeze({
  preparingTicks: 0,
  livesPerParticipant: 99,
  suddenDeathStartTick: 7_200,
  hardLimitTicks: 7_201,
});

function readProbeMetadata({ seed, config }: { readonly seed: number; readonly config: unknown }) {
  const core = createArenaV1MatchCore({ seed, config });
  try {
    return core.getReplayMetadata();
  } finally {
    core.destroy();
  }
}

export interface ArenaStage9MapExperimentOptions {
  readonly sourceCommit?: unknown;
  readonly sourceDirty?: unknown;
  readonly firstSeed?: number;
  readonly caseCount?: number;
  readonly replaySampleCount?: number;
  readonly config?: unknown;
  readonly replayCheckpointInterval?: number;
  readonly maximumEventsPerCase?: number;
  readonly maximumFailedCases?: number;
}

export function createArenaStage9MapExperimentDefinition({
  sourceCommit,
  sourceDirty,
  firstSeed = 0x5a6e0000,
  caseCount = 100,
  replaySampleCount = 3,
  config = ARENA_STAGE9_MAP_DEFAULT_CONFIG,
  replayCheckpointInterval = ARENA_V1_MAP_TIMELINE_DEFAULT_PARAMETERS.replayCheckpointInterval,
  maximumEventsPerCase = ARENA_V1_MAP_TIMELINE_DEFAULT_PARAMETERS.maximumEventsPerCase,
  maximumFailedCases = 0,
}: ArenaStage9MapExperimentOptions = {}) {
  const range = createContiguousArenaExperimentSeedRange(firstSeed, caseCount);
  const plannedSeeds = Array.from(
    { length: range.caseCount },
    (_, index) => range.firstSeed + index,
  );
  const replaySeeds = createArenaExperimentReplaySeeds(plannedSeeds, replaySampleCount);
  const metadata = readProbeMetadata({ seed: range.firstSeed, config });
  const preparingTicks = assertIntegerAtLeast(
    metadata.config.preparingTicks,
    0,
    'Map experiment replay metadata preparingTicks',
  );
  const hardLimitTicks = assertIntegerAtLeast(
    metadata.config.hardLimitTicks,
    1,
    'Map experiment replay metadata hardLimitTicks',
  );
  return createArenaExperimentDefinition({
    schemaVersion: ARENA_EXPERIMENT_DEFINITION_SCHEMA_VERSION,
    id: ARENA_STAGE9_MAP_EXPERIMENT_ID,
    description: 'Arena V1 地图时间轴、公开快照、最终安全面、事件数量与回放实验。',
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
      id: ARENA_V1_MAP_TIMELINE_WORKLOAD_ID,
      version: ARENA_V1_MAP_TIMELINE_WORKLOAD_VERSION,
      parameters: {
        ...ARENA_V1_MAP_TIMELINE_DEFAULT_PARAMETERS,
        replaySeeds,
        replayCheckpointInterval,
        maximumEventsPerCase,
      },
    },
    collectors: [{
      id: ARENA_MAP_TIMELINE_COLLECTOR_ID,
      version: ARENA_MAP_TIMELINE_COLLECTOR_VERSION,
    }],
    limits: {
      maximumTicksPerCase: preparingTicks + hardLimitTicks + 1,
      maximumFailedCases,
    },
  });
}

export function createArenaStage9MapExperimentRegistries() {
  return Object.freeze({
    workloadRegistry: new SimulationWorkloadRegistry([
      createArenaV1MapTimelineWorkloadEntry(),
    ]),
    collectorRegistry: new MetricCollectorRegistry([
      createArenaMapTimelineCollectorEntry(),
    ]),
  });
}
