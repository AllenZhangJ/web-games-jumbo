import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_EXPERIMENT_DEFINITION_SCHEMA_VERSION,
  ARENA_EXPERIMENT_SEED_SET_KIND,
  createArenaExperimentDefinition,
} from '../../../src/arena/experiment/experiment-definition.js';
import {
  ARENA_EXPERIMENT_OUTCOME,
} from '../../../src/arena/experiment/experiment-report.js';
import { MetricCollectorRegistry } from '../../../src/arena/experiment/metric-collector-registry.js';
import {
  SIMULATION_EXPERIMENT_RUNNER_STATE,
  SimulationExperimentRunner,
} from '../../../src/arena/experiment/simulation-runner.js';
import { SimulationWorkloadRegistry } from '../../../src/arena/experiment/simulation-workload-registry.js';
import {
  ARENA_MATCH_SUMMARY_COLLECTOR_ID,
} from '../../../src/arena/experiment/arena-match-summary-collector.js';
import {
  createArenaStage9S91ExperimentDefinition,
  createArenaStage9S91ExperimentRegistries,
} from '../../../src/arena/experiment/arena-v1-experiment-composition.js';

const COMMIT = 'c'.repeat(40);
const AUTHORITY = Object.freeze({
  matchSchemaVersion: 5,
  physicsBackendVersion: 'fake-v1',
  configHash: '1234abcd',
  ruleContentHash: '5678abcd',
});
const ENVIRONMENT = Object.freeze({
  runtimeName: 'test-runtime',
  runtimeVersion: '1.0.0',
  platform: 'test-os',
  architecture: 'test-arch',
});

function definitionValue(overrides = {}) {
  return {
    schemaVersion: ARENA_EXPERIMENT_DEFINITION_SCHEMA_VERSION,
    id: 'arena.stage9.test.v1',
    description: '固定测试实验。',
    metricSchemaVersion: 1,
    candidate: {
      id: 'candidate.test',
      sourceCommit: COMMIT,
      sourceDirty: false,
      matchConfig: { preparingTicks: 0 },
      authority: AUTHORITY,
    },
    seedSet: { kind: ARENA_EXPERIMENT_SEED_SET_KIND.EXPLICIT, values: [1, 2] },
    workload: { id: 'workload.test', version: 1, parameters: { steps: 2 } },
    collectors: [{ id: 'collector.test', version: 1 }],
    limits: { maximumTicksPerCase: 10, maximumFailedCases: 0 },
    ...overrides,
  };
}

function createFakeCase(seed, { steps = 2, onDestroy = () => {} } = {}) {
  let tick = 0;
  let destroyed = false;
  return {
    getMetadata() {
      return { matchSeed: seed, ...AUTHORITY };
    },
    getSnapshot() {
      return { tick, phase: tick >= steps ? 'ended' : 'running' };
    },
    isComplete() {
      return tick >= steps;
    },
    step() {
      tick += 1;
      return {
        inputFrames: [{ participantId: 'player-1', primaryPressed: tick === 1 }],
        events: [{ type: tick === steps ? 'MatchEnded' : 'Ticked' }],
        snapshot: this.getSnapshot(),
      };
    },
    exportResult() {
      return {
        finalHash: seed.toString(16).padStart(8, '0'),
        result: { reason: 'timeout', winnerId: null },
      };
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      onDestroy(seed);
    },
  };
}

function createFakeCollectorEntry({ throwOnObserve = false, onDestroy = () => {} } = {}) {
  return {
    id: 'collector.test',
    version: 1,
    create() {
      let completed = 0;
      let failed = 0;
      let steps = 0;
      return {
        beginCase() {},
        observeStep() {
          if (throwOnObserve) throw new Error('forced collector failure');
          steps += 1;
        },
        completeCase() {
          completed += 1;
        },
        failCase() {
          failed += 1;
        },
        getResult() {
          return { completed, failed, steps, denominators: { completed } };
        },
        destroy: onDestroy,
      };
    },
  };
}

function createRunner(definition, createCase, collectorEntry = createFakeCollectorEntry()) {
  return new SimulationExperimentRunner({
    definition,
    workloadRegistry: new SimulationWorkloadRegistry([{
      id: 'workload.test',
      version: 1,
      validateParameters() {},
      createCase,
    }]),
    collectorRegistry: new MetricCollectorRegistry([collectorEntry]),
  });
}

test('ExperimentDefinition freezes candidate, seed, workload and collector identities', () => {
  const definition = createArenaExperimentDefinition(definitionValue());
  assert.deepEqual(definition.getSeeds(), [1, 2]);
  assert.equal(Object.isFrozen(definition.candidate.matchConfig), true);
  assert.equal(definition.getContentHash(), definition.getContentHash());
  assert.throws(() => {
    definition.candidate.matchConfig.preparingTicks = 9;
  }, /read only|Cannot assign/i);
  assert.throws(() => createArenaExperimentDefinition(definitionValue({
    seedSet: { kind: 'explicit', values: [2, 1] },
  })), /严格递增/);
  assert.throws(() => createArenaExperimentDefinition(definitionValue({
    workload: { id: 'workload.test', version: 1, parameters: {}, future: true },
  })), /不支持字段 future/);
  const accessor = definitionValue();
  Object.defineProperty(accessor.candidate, 'sourceCommit', { enumerable: true, get() {
    throw new Error('accessor must not run');
  } });
  assert.throws(() => createArenaExperimentDefinition(accessor), /数据字段|访问器/);
});

test('SimulationRunner produces the same deterministic result across environment metadata', () => {
  const definition = createArenaExperimentDefinition(definitionValue());
  const destroyed = [];
  const first = createRunner(definition, ({ seed, parameters }) => createFakeCase(seed, {
    steps: parameters.steps,
    onDestroy: (value) => destroyed.push(value),
  }));
  const reportA = first.run({
    generatedAt: '2026-07-18T00:00:00.000Z',
    environment: ENVIRONMENT,
  });
  assert.equal(reportA.outcome, ARENA_EXPERIMENT_OUTCOME.PASSED);
  assert.equal(reportA.freezeEligible, true);
  assert.equal(reportA.completedCaseCount, 2);
  assert.deepEqual(destroyed, [1, 2]);
  assert.equal(first.state, SIMULATION_EXPERIMENT_RUNNER_STATE.COMPLETED);
  assert.throws(() => first.run({
    generatedAt: '2026-07-18T00:00:00.000Z',
    environment: ENVIRONMENT,
  }), /无法从 completed 运行/);
  first.destroy();
  first.destroy();

  const second = createRunner(definition, ({ seed, parameters }) => createFakeCase(seed, {
    steps: parameters.steps,
  }));
  const reportB = second.run({
    generatedAt: '2026-07-19T00:00:00.000Z',
    environment: { ...ENVIRONMENT, runtimeVersion: '2.0.0' },
  });
  assert.equal(reportA.resultHash, reportB.resultHash);
  assert.notEqual(reportA.generatedAt, reportB.generatedAt);
  second.destroy();
});

test('case failure is reported, partial metrics are discarded and the failure threshold stops seeds', () => {
  const definition = createArenaExperimentDefinition(definitionValue({
    seedSet: { kind: 'explicit', values: [1, 2, 3] },
  }));
  const runner = createRunner(definition, ({ seed }) => {
    if (seed === 2) throw new Error('forced case failure');
    return createFakeCase(seed);
  });
  const report = runner.run({
    generatedAt: '2026-07-18T00:00:00.000Z',
    environment: ENVIRONMENT,
  });
  assert.equal(report.outcome, ARENA_EXPERIMENT_OUTCOME.FAILED);
  assert.equal(report.executedCaseCount, 2);
  assert.equal(report.failedCaseCount, 1);
  assert.equal(report.remainingCaseCount, 1);
  assert.equal(report.stoppedEarly, true);
  assert.match(report.cases[1].failure.message, /forced case failure/);
  assert.deepEqual(report.metrics[0].data, {
    completed: 1,
    denominators: { completed: 1 },
    failed: 1,
    steps: 2,
  });
  runner.destroy();
});

test('dirty candidates and malformed completion ports cannot become freeze-eligible reports', () => {
  const dirtyValue = definitionValue({
    seedSet: { kind: 'explicit', values: [1] },
  });
  dirtyValue.candidate.sourceDirty = true;
  const dirtyRunner = createRunner(
    createArenaExperimentDefinition(dirtyValue),
    ({ seed }) => createFakeCase(seed),
  );
  const dirtyReport = dirtyRunner.run({
    generatedAt: '2026-07-18T00:00:00.000Z',
    environment: ENVIRONMENT,
  });
  assert.equal(dirtyReport.outcome, ARENA_EXPERIMENT_OUTCOME.PASSED);
  assert.equal(dirtyReport.freezeEligible, false);
  dirtyRunner.destroy();

  const malformedRunner = createRunner(
    createArenaExperimentDefinition(definitionValue({
      seedSet: { kind: 'explicit', values: [1] },
    })),
    ({ seed }) => ({ ...createFakeCase(seed), isComplete: () => 'yes' }),
  );
  const malformedReport = malformedRunner.run({
    generatedAt: '2026-07-18T00:00:00.000Z',
    environment: ENVIRONMENT,
  });
  assert.equal(malformedReport.outcome, ARENA_EXPERIMENT_OUTCOME.FAILED);
  assert.match(malformedReport.cases[0].failure.message, /必须返回布尔值/);
  malformedRunner.destroy();
});

test('collector failure is terminal and still destroys the active case and all collectors', () => {
  let caseDestroyCount = 0;
  let collectorDestroyCount = 0;
  const runner = createRunner(
    createArenaExperimentDefinition(definitionValue()),
    ({ seed }) => createFakeCase(seed, { onDestroy: () => { caseDestroyCount += 1; } }),
    createFakeCollectorEntry({
      throwOnObserve: true,
      onDestroy: () => { collectorDestroyCount += 1; },
    }),
  );
  assert.throws(() => runner.run({
    generatedAt: '2026-07-18T00:00:00.000Z',
    environment: ENVIRONMENT,
  }), /MetricCollector collector.test.observeStep 执行失败/);
  assert.equal(runner.state, SIMULATION_EXPERIMENT_RUNNER_STATE.FAILED);
  assert.equal(caseDestroyCount, 1);
  assert.equal(collectorDestroyCount, 1);
  runner.destroy();
});

test('registries reject duplicate or drifted versions before experiment mutation', () => {
  assert.throws(() => new SimulationWorkloadRegistry([
    { id: 'duplicate', version: 1, validateParameters() {}, createCase() {} },
    { id: 'duplicate', version: 1, validateParameters() {}, createCase() {} },
  ]), /重复 id duplicate/);
  const definition = createArenaExperimentDefinition(definitionValue());
  assert.throws(() => new SimulationExperimentRunner({
    definition,
    workloadRegistry: new SimulationWorkloadRegistry([{
      id: 'workload.test', version: 2, validateParameters() {}, createCase() {},
    }]),
    collectorRegistry: new MetricCollectorRegistry([createFakeCollectorEntry()]),
  }), /版本 2 与 Definition 1 不一致/);
  const collectorDriftValue = definitionValue();
  collectorDriftValue.collectors = [{ id: 'collector.test', version: 2 }];
  assert.throws(() => new SimulationExperimentRunner({
    definition: createArenaExperimentDefinition(collectorDriftValue),
    workloadRegistry: new SimulationWorkloadRegistry([{
      id: 'workload.test', version: 1, validateParameters() {}, createCase() {},
    }]),
    collectorRegistry: new MetricCollectorRegistry([createFakeCollectorEntry()]),
  }), /MetricCollector collector.test 版本 1 与 Definition 2 不一致/);
  const registry = new SimulationWorkloadRegistry([{
    id: 'safe-reference', version: 1, validateParameters() {}, createCase() {},
  }]);
  const accessor = { version: 1 };
  Object.defineProperty(accessor, 'id', { enumerable: true, get() {
    throw new Error('reference accessor must not run');
  } });
  assert.throws(() => registry.require(accessor), /数据字段|访问器/);

  const invalidWorkloadDefinition = createArenaStage9S91ExperimentDefinition({
    sourceCommit: COMMIT,
    sourceDirty: false,
    caseCount: 1,
    workloadParameters: {
      cadenceTicks: [31, 43],
      cadenceJitterTicks: [0, 5],
      attackOffsetTicks: [0, 13],
      strafePeriodTicks: 90,
      strafeMagnitude: 0.16,
      attackRangeScale: 0.98,
    },
  });
  assert.throws(() => new SimulationExperimentRunner({
    definition: invalidWorkloadDefinition,
    ...createArenaStage9S91ExperimentRegistries(),
  }), /cadenceJitterTicks\[0\].*大于等于 1/);
});

test('Arena V1 S9.1 composition runs headlessly with explicit denominators and stable hashes', () => {
  const definition = createArenaStage9S91ExperimentDefinition({
    sourceCommit: COMMIT,
    sourceDirty: false,
    firstSeed: 101,
    caseCount: 2,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 120,
      hardLimitTicks: 180,
    },
  });
  const run = (generatedAt) => {
    const runner = new SimulationExperimentRunner({
      definition,
      ...createArenaStage9S91ExperimentRegistries(),
    });
    try {
      return runner.run({ generatedAt, environment: ENVIRONMENT });
    } finally {
      runner.destroy();
    }
  };
  const first = run('2026-07-18T00:00:00.000Z');
  const second = run('2026-07-19T00:00:00.000Z');
  assert.equal(first.outcome, ARENA_EXPERIMENT_OUTCOME.PASSED);
  assert.equal(first.resultHash, second.resultHash);
  assert.equal(first.metrics[0].id, ARENA_MATCH_SUMMARY_COLLECTOR_ID);
  assert.equal(first.metrics[0].data.denominators.completedCases, 2);
  assert.equal(first.metrics[0].data.denominators.plannedCases, 2);
  assert.ok(first.metrics[0].data.denominators.totalTicks > 0);
  assert.equal(first.metrics[0].data.raw.failedCases, 0);
});
