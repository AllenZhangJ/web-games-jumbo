import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_EXPERIMENT_DEFINITION_SCHEMA_VERSION,
  ARENA_EXPERIMENT_SEED_SET_KIND,
  createArenaExperimentDefinition,
} from '@number-strategy-jump/arena-experiment';
import { MetricCollectorRegistry } from './metric-collector-registry.js';
import { SimulationWorkloadRegistry } from './simulation-workload-registry.js';
import {
  ARENA_MATCH_SUMMARY_COLLECTOR_ID,
  ARENA_MATCH_SUMMARY_COLLECTOR_VERSION,
  createArenaMatchSummaryCollectorEntry,
} from './arena-match-summary-collector.js';
import {
  ARENA_V1_SCRIPTED_PRESSURE_DEFAULT_PARAMETERS,
  ARENA_V1_SCRIPTED_PRESSURE_WORKLOAD_ID,
  ARENA_V1_SCRIPTED_PRESSURE_WORKLOAD_VERSION,
  createArenaV1ScriptedPressureWorkloadEntry,
} from './arena-v1-scripted-pressure-workload.js';

export const ARENA_STAGE9_S9_1_EXPERIMENT_ID =
  'arena.stage9.s9.1.scripted-pressure.v1';

function readProbeMetadata({ seed, config }) {
  const core = createArenaV1MatchCore({ seed, config });
  try {
    return core.getReplayMetadata();
  } finally {
    core.destroy();
  }
}

export function createArenaStage9S91ExperimentDefinition({
  sourceCommit,
  sourceDirty,
  firstSeed = 0x9a110000,
  caseCount = 30,
  config = {},
  workloadParameters = ARENA_V1_SCRIPTED_PRESSURE_DEFAULT_PARAMETERS,
  maximumFailedCases = 0,
} = {}) {
  if (!Number.isSafeInteger(caseCount) || caseCount < 1) {
    throw new RangeError('caseCount 必须是正安全整数。');
  }
  const lastSeed = firstSeed + caseCount - 1;
  if (!Number.isSafeInteger(lastSeed) || lastSeed > 0xffffffff) {
    throw new RangeError('firstSeed + caseCount 超出 uint32。');
  }
  const metadata = readProbeMetadata({ seed: firstSeed, config });
  return createArenaExperimentDefinition({
    schemaVersion: ARENA_EXPERIMENT_DEFINITION_SCHEMA_VERSION,
    id: ARENA_STAGE9_S9_1_EXPERIMENT_ID,
    description: 'Arena V1 版本化脚本压力输入的无渲染确定性与基础结果实验。',
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
      first: firstSeed,
      last: lastSeed,
    },
    workload: {
      id: ARENA_V1_SCRIPTED_PRESSURE_WORKLOAD_ID,
      version: ARENA_V1_SCRIPTED_PRESSURE_WORKLOAD_VERSION,
      parameters: workloadParameters,
    },
    collectors: [{
      id: ARENA_MATCH_SUMMARY_COLLECTOR_ID,
      version: ARENA_MATCH_SUMMARY_COLLECTOR_VERSION,
    }],
    limits: {
      maximumTicksPerCase: metadata.config.preparingTicks + metadata.config.hardLimitTicks + 1,
      maximumFailedCases,
    },
  });
}

export function createArenaStage9S91ExperimentRegistries() {
  return Object.freeze({
    workloadRegistry: new SimulationWorkloadRegistry([
      createArenaV1ScriptedPressureWorkloadEntry(),
    ]),
    collectorRegistry: new MetricCollectorRegistry([
      createArenaMatchSummaryCollectorEntry(),
    ]),
  });
}
