import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_EXPERIMENT_DEFINITION_LEGACY_SCHEMA_VERSION,
  ARENA_EXPERIMENT_DEFINITION_SCHEMA_VERSION,
  ARENA_EXPERIMENT_SEED_SET_KIND,
  createArenaExperimentDefinition,
} from '../../../src/arena/experiment/experiment-definition.js';
import {
  ARENA_EXPERIMENT_OUTCOME,
} from '../../../src/arena/experiment/experiment-report.js';
import {
  createArenaExperimentReportBundle,
  readArenaExperimentReportBundle,
} from '../../../src/arena/experiment/experiment-report-bundle.js';
import { MetricCollectorRegistry } from '../../../src/arena/experiment/metric-collector-registry.js';
import {
  SIMULATION_EXPERIMENT_RUNNER_STATE,
  SimulationExperimentRunner,
} from '../../../src/arena/experiment/simulation-runner.js';
import { SimulationWorkloadRegistry } from '../../../src/arena/experiment/simulation-workload-registry.js';
import { createArenaMetricGate } from '../../../src/arena/experiment/metric-gate.js';
import {
  ARENA_MATCH_SUMMARY_COLLECTOR_ID,
} from '../../../src/arena/experiment/arena-match-summary-collector.js';
import {
  createArenaStage9S91ExperimentDefinition,
  createArenaStage9S91ExperimentRegistries,
} from '../../../src/arena/experiment/arena-v1-experiment-composition.js';
import {
  createArenaStage9MatchCoreExperimentDefinition,
  createArenaStage9MatchCoreExperimentRegistries,
} from '../../../src/arena/experiment/arena-matchcore-experiment-composition.js';
import {
  ARENA_V1_MATCHCORE_STRESS_INPUT_DEFAULT_TUNING,
  createArenaV1MatchCoreStressInputStrategy,
} from '../../../src/arena/experiment/arena-v1-matchcore-stress-strategy.js';
import {
  createArenaStage9MapExperimentDefinition,
  createArenaStage9MapExperimentRegistries,
} from '../../../src/arena/experiment/arena-map-experiment-composition.js';
import {
  createArenaStage9MovementExperimentDefinition,
  createArenaStage9MovementExperimentRegistries,
} from '../../../src/arena/experiment/arena-movement-experiment-composition.js';
import {
  createArenaStage9BotExperimentDefinition,
  createArenaStage9BotExperimentRegistries,
} from '../../../src/arena/experiment/arena-bot-experiment-composition.js';
import {
  ARENA_STAGE9_BALANCE_CASE_COUNT,
  ARENA_STAGE9_BALANCE_EXPERIMENT_ID,
  ARENA_STAGE9_BALANCE_POLICY_V1,
  createArenaStage9BalanceExperimentDefinition,
} from '../../../src/arena/experiment/arena-balance-experiment-composition.js';
import {
  ARENA_BALANCE_CANDIDATE_COLLECTOR_ID,
  ARENA_BALANCE_CANDIDATE_COLLECTOR_VERSION,
  createArenaBalanceCandidateCollectorEntry,
  createArenaBalanceCandidateCollectorParameters,
} from '../../../src/arena/experiment/arena-balance-candidate-collector.js';
import { createArenaBalancePolicy } from '../../../src/arena/experiment/arena-balance-policy.js';
import { parseArenaStressIntegerOptions } from '../../../scripts/arena-stress-cli.mjs';

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
  assert.equal(Object.isFrozen(definition.collectors[0].parameters), true);
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
  const withCollectorPolicy = createArenaExperimentDefinition(definitionValue({
    collectors: [{
      id: 'collector.test',
      version: 1,
      parameters: { threshold: 0.5 },
    }],
  }));
  assert.notEqual(withCollectorPolicy.getContentHash(), definition.getContentHash());
  const legacy = createArenaExperimentDefinition({
    ...definitionValue(),
    schemaVersion: ARENA_EXPERIMENT_DEFINITION_LEGACY_SCHEMA_VERSION,
  });
  assert.equal(legacy.schemaVersion, ARENA_EXPERIMENT_DEFINITION_LEGACY_SCHEMA_VERSION);
  assert.equal(Object.hasOwn(legacy.collectors[0], 'parameters'), false);
  assert.throws(() => createArenaExperimentDefinition({
    ...definitionValue(),
    schemaVersion: ARENA_EXPERIMENT_DEFINITION_LEGACY_SCHEMA_VERSION,
    collectors: [{ id: 'collector.test', version: 1, parameters: {} }],
  }), /不支持字段 parameters/);
  const accessor = definitionValue();
  Object.defineProperty(accessor.candidate, 'sourceCommit', { enumerable: true, get() {
    throw new Error('accessor must not run');
  } });
  assert.throws(() => createArenaExperimentDefinition(accessor), /数据字段|访问器/);
});

test('MetricCollectorRegistry validates and injects pre-registered collector parameters', () => {
  let received = null;
  const definition = createArenaExperimentDefinition(definitionValue({
    seedSet: { kind: 'explicit', values: [1] },
    collectors: [{
      id: 'collector.test',
      version: 1,
      parameters: { threshold: 0.5 },
    }],
  }));
  const registry = new MetricCollectorRegistry([{
    id: 'collector.test',
    version: 1,
    validateParameters(parameters) {
      assert.deepEqual(parameters, { threshold: 0.5 });
      return parameters;
    },
    create({ parameters }) {
      received = parameters;
      return createFakeCollectorEntry().create();
    },
  }]);
  const created = registry.createCollectors(definition);
  assert.deepEqual(received, { threshold: 0.5 });
  assert.equal(Object.isFrozen(received), true);
  created[0].instance.destroy();

  const rejectingDefault = new MetricCollectorRegistry([createFakeCollectorEntry()]);
  assert.throws(() => rejectingDefault.assertDefinition(definition), /不支持字段 threshold/);
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

test('versioned experiment report bundle reconstructs derived fields and rejects tampering', () => {
  const definition = createArenaExperimentDefinition(definitionValue({
    seedSet: { kind: 'explicit', values: [1] },
  }));
  const runner = createRunner(definition, ({ seed }) => createFakeCase(seed));
  const report = runner.run({
    generatedAt: '2026-07-18T00:00:00.000Z',
    environment: ENVIRONMENT,
  });
  runner.destroy();
  const bundle = createArenaExperimentReportBundle({
    suite: 'test-suite',
    definition,
    report,
  });
  assert.equal(readArenaExperimentReportBundle(bundle).bundleHash, bundle.bundleHash);

  const tamperedResult = structuredClone(bundle);
  tamperedResult.report.outcome = 'failed';
  assert.throws(() => readArenaExperimentReportBundle(tamperedResult), /漂移|bundleHash/);
  const tamperedMetric = structuredClone(bundle);
  tamperedMetric.report.metrics[0].data.completed = 99;
  assert.throws(() => readArenaExperimentReportBundle(tamperedMetric), /漂移|bundleHash/);
  assert.throws(() => readArenaExperimentReportBundle({
    ...bundle,
    future: true,
  }), /不支持字段 future/);
});

test('SimulationRunner clones case-owned step data once and exposes a deeply frozen observation', () => {
  const definition = createArenaExperimentDefinition(definitionValue({
    seedSet: { kind: 'explicit', values: [1] },
  }));
  let caseOwnedEvent = null;
  let observedEventType = null;
  const runner = createRunner(
    definition,
    ({ seed }) => {
      const simulationCase = createFakeCase(seed, { steps: 1 });
      const originalStep = simulationCase.step.bind(simulationCase);
      simulationCase.step = () => {
        const step = originalStep();
        caseOwnedEvent = step.events[0];
        return step;
      };
      return simulationCase;
    },
    {
      id: 'collector.test',
      version: 1,
      create() {
        return {
          beginCase(context) {
            assert.equal(Object.isFrozen(context), true);
            assert.equal(Object.isFrozen(context.initialSnapshot), true);
          },
          observeStep(observation) {
            assert.equal(Object.isFrozen(observation), true);
            assert.equal(Object.isFrozen(observation.inputFrames), true);
            assert.equal(Object.isFrozen(observation.inputFrames[0]), true);
            assert.equal(Object.isFrozen(observation.events), true);
            assert.equal(Object.isFrozen(observation.events[0]), true);
            assert.equal(Object.isFrozen(observation.snapshot), true);
            assert.throws(() => {
              observation.events[0].type = 'Mutated';
            }, /read only|Cannot assign/i);
            observedEventType = observation.events[0].type;
          },
          completeCase() {},
          failCase() {},
          getResult() { return { observedEventType }; },
          destroy() {},
        };
      },
    },
  );
  const report = runner.run({
    generatedAt: '2026-07-18T00:00:00.000Z',
    environment: ENVIRONMENT,
  });
  caseOwnedEvent.type = 'CaseOwnedMutation';
  assert.equal(report.metrics[0].data.observedEventType, 'MatchEnded');
  runner.destroy();
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

test('a failed collector metric gate makes an otherwise complete report non-freezable', () => {
  const runner = createRunner(
    createArenaExperimentDefinition(definitionValue({
      seedSet: { kind: 'explicit', values: [1] },
    })),
    ({ seed }) => createFakeCase(seed),
    {
      id: 'collector.test',
      version: 1,
      create() {
        return {
          beginCase() {},
          observeStep() {},
          completeCase() {},
          failCase() {},
          getResult() {
            return {
              gate: createArenaMetricGate([
                { id: 'coverage.complete', passed: true },
                { id: 'ordering.capability', passed: false },
              ]),
            };
          },
          destroy() {},
        };
      },
    },
  );
  const report = runner.run({
    generatedAt: '2026-07-18T00:00:00.000Z',
    environment: ENVIRONMENT,
  });
  assert.equal(report.outcome, ARENA_EXPERIMENT_OUTCOME.FAILED);
  assert.equal(report.freezeEligible, false);
  assert.equal(report.failedCaseCount, 0);
  assert.deepEqual(report.failedMetricGates, [{
    collectorId: 'collector.test',
    failedCheckIds: ['ordering.capability'],
  }]);
  runner.destroy();
});

test('metric gates reject inconsistent summaries and duplicate checks', () => {
  assert.throws(() => createArenaMetricGate([
    { id: 'same', passed: true },
    { id: 'same', passed: false },
  ]), /重复 check same/);

  const runner = createRunner(
    createArenaExperimentDefinition(definitionValue({
      seedSet: { kind: 'explicit', values: [1] },
    })),
    ({ seed }) => createFakeCase(seed),
    {
      id: 'collector.test',
      version: 1,
      create() {
        return {
          beginCase() {},
          observeStep() {},
          completeCase() {},
          failCase() {},
          getResult() {
            return {
              gate: {
                schemaVersion: 1,
                passed: true,
                checks: [{ id: 'failed', passed: false }],
              },
            };
          },
          destroy() {},
        };
      },
    },
  );
  assert.throws(() => runner.run({
    generatedAt: '2026-07-18T00:00:00.000Z',
    environment: ENVIRONMENT,
  }), /passed 与 checks/);
  runner.destroy();
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

test('runner destroys a factory result when SimulationCase interface validation fails', () => {
  let caseDestroyCount = 0;
  const runner = createRunner(
    createArenaExperimentDefinition(definitionValue()),
    () => ({
      destroy() {
        caseDestroyCount += 1;
      },
    }),
  );
  const report = runner.run({
    generatedAt: '2026-07-18T00:00:00.000Z',
    environment: ENVIRONMENT,
  });
  assert.equal(report.outcome, ARENA_EXPERIMENT_OUTCOME.FAILED);
  assert.equal(report.failedCaseCount, 1);
  assert.equal(caseDestroyCount, 1);
  runner.destroy();
});

test('collector registry destroys a factory result when interface validation fails', () => {
  let collectorDestroyCount = 0;
  const runner = createRunner(
    createArenaExperimentDefinition(definitionValue()),
    ({ seed }) => createFakeCase(seed),
    {
      id: 'collector.test',
      version: 1,
      create() {
        return {
          destroy() {
            collectorDestroyCount += 1;
          },
        };
      },
    },
  );
  assert.throws(() => runner.run({
    generatedAt: '2026-07-18T00:00:00.000Z',
    environment: ENVIRONMENT,
  }), /beginCase 必须是函数/);
  assert.equal(runner.state, SIMULATION_EXPERIMENT_RUNNER_STATE.FAILED);
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

test('scripted-pressure v1 keeps its golden default seed after Strategy extraction', () => {
  const definition = createArenaStage9S91ExperimentDefinition({
    sourceCommit: COMMIT,
    sourceDirty: false,
    caseCount: 1,
  });
  const runner = new SimulationExperimentRunner({
    definition,
    ...createArenaStage9S91ExperimentRegistries(),
  });
  const report = runner.run({
    generatedAt: '2026-07-18T00:00:00.000Z',
    environment: ENVIRONMENT,
  });
  assert.equal(report.cases[0].finalHash, '4347a2ff');
  assert.equal(report.cases[0].ticks, 878);
  runner.destroy();
});

test('MatchCore invariant suite preserves professional assertions and sampled replay deterministically', () => {
  const definition = createArenaStage9MatchCoreExperimentDefinition({
    sourceCommit: COMMIT,
    sourceDirty: false,
    firstSeed: 201,
    caseCount: 2,
    replaySampleCount: 1,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 120,
      hardLimitTicks: 180,
    },
  });
  const run = (generatedAt) => {
    const runner = new SimulationExperimentRunner({
      definition,
      ...createArenaStage9MatchCoreExperimentRegistries(),
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
  assert.equal(first.completedCaseCount, 2);
  assert.equal(first.metrics[0].data.raw.verifiedReplays, 1);
  assert.equal(first.metrics[0].data.raw.uniqueFinalHashes, 2);
  assert.equal(first.metrics[0].data.derived.allFinalHashesUnique, true);
  assert.equal(first.metrics[0].data.derived.replayVerificationRate, 1);
  assert.equal(first.cases[0].result.replayVerified, true);
  assert.equal(first.cases[1].result.replayVerified, false);
});

test('MatchCore stress strategy preserves the legacy sequence-index cadence', () => {
  const participantIds = ['player-1', 'player-2'];
  const createSnapshot = (tick) => ({
    tick,
    participants: [
      {
        id: 'player-1',
        status: 'active',
        position: { x: -0.5, z: 0 },
        facing: { x: 1, z: 0 },
      },
      {
        id: 'player-2',
        status: 'active',
        position: { x: 0.5, z: 0 },
        facing: { x: -1, z: 0 },
      },
    ],
  });
  const firstSeed = 0xa11e0000;
  const parameters = {
    ...ARENA_V1_MATCHCORE_STRESS_INPUT_DEFAULT_TUNING,
    sequenceFirstSeed: firstSeed,
  };
  const first = createArenaV1MatchCoreStressInputStrategy({
    matchSeed: firstSeed,
    participantIds,
    parameters,
  });
  const firstFrames = first.createFrames(createSnapshot(0));
  assert.equal(firstFrames[0].primaryPressed, true);
  assert.equal(firstFrames[1].primaryPressed, false);

  const second = createArenaV1MatchCoreStressInputStrategy({
    matchSeed: firstSeed + 1,
    participantIds,
    parameters,
  });
  assert.equal(second.createFrames(createSnapshot(25))[0].primaryPressed, true);
  assert.equal(second.createFrames(createSnapshot(24))[1].primaryPressed, true);
});

test('MatchCore invariant suite records an event ceiling breach as a case failure', () => {
  const definition = createArenaStage9MatchCoreExperimentDefinition({
    sourceCommit: COMMIT,
    sourceDirty: false,
    firstSeed: 301,
    caseCount: 1,
    replaySampleCount: 0,
    maximumEventsPerCase: 1,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 120,
      hardLimitTicks: 180,
    },
  });
  const runner = new SimulationExperimentRunner({
    definition,
    ...createArenaStage9MatchCoreExperimentRegistries(),
  });
  const report = runner.run({
    generatedAt: '2026-07-18T00:00:00.000Z',
    environment: ENVIRONMENT,
  });
  assert.equal(report.outcome, ARENA_EXPERIMENT_OUTCOME.FAILED);
  assert.equal(report.failedCaseCount, 1);
  assert.match(report.cases[0].failure.message, /事件数超过 1/);
  assert.equal(report.metrics[0].data.raw.failedCases, 1);
  assert.equal(report.metrics[0].data.raw.totalEvents, 0);
  assert.equal(report.metrics[0].data.derived.allFinalHashesUnique, null);
  runner.destroy();
});

test('MatchCore experiment composition rejects ambiguous replay sampling before probing cases', () => {
  assert.throws(() => createArenaStage9MatchCoreExperimentDefinition({
    sourceCommit: COMMIT,
    sourceDirty: false,
    caseCount: 2,
    replaySampleCount: 3,
  }), /replaySampleCount/);

  const accessor = { ...ARENA_V1_MATCHCORE_STRESS_INPUT_DEFAULT_TUNING };
  Object.defineProperty(accessor, 'cadenceTicks', { enumerable: true, get() {
    throw new Error('input tuning accessor must not run');
  } });
  assert.throws(() => createArenaStage9MatchCoreExperimentDefinition({
    sourceCommit: COMMIT,
    sourceDirty: false,
    caseCount: 1,
    replaySampleCount: 0,
    inputParameters: accessor,
  }), /数据字段|访问器/);
  assert.throws(() => createArenaStage9MatchCoreExperimentDefinition({
    sourceCommit: COMMIT,
    sourceDirty: false,
    caseCount: 1,
    replaySampleCount: 0,
    inputParameters: {
      ...ARENA_V1_MATCHCORE_STRESS_INPUT_DEFAULT_TUNING,
      sequenceFirstSeed: 1,
    },
  }), /不能覆盖 sequenceFirstSeed/);
});

function runDefinition(definition, registries, generatedAt) {
  const runner = new SimulationExperimentRunner({ definition, ...registries });
  try {
    return runner.run({ generatedAt, environment: ENVIRONMENT });
  } finally {
    runner.destroy();
  }
}

test('Map timeline suite preserves final topology, exact events and replay deterministically', () => {
  const definition = createArenaStage9MapExperimentDefinition({
    sourceCommit: COMMIT,
    sourceDirty: false,
    caseCount: 1,
    replaySampleCount: 1,
  });
  const first = runDefinition(
    definition,
    createArenaStage9MapExperimentRegistries(),
    '2026-07-18T00:00:00.000Z',
  );
  const second = runDefinition(
    definition,
    createArenaStage9MapExperimentRegistries(),
    '2026-07-19T00:00:00.000Z',
  );
  assert.equal(first.outcome, ARENA_EXPERIMENT_OUTCOME.PASSED);
  assert.equal(first.resultHash, second.resultHash);
  assert.equal(first.cases[0].ticks, 7_201);
  assert.deepEqual(first.cases[0].result.enabledSurfaceIds, ['tile-center']);
  assert.equal(first.cases[0].result.occurrenceCount, 13);
  assert.equal(first.cases[0].result.replayVerified, true);
  assert.equal(first.metrics[0].data.gate.passed, true);
});

test('Movement suite covers professional actions and state boundaries with stable paired evidence', () => {
  const definition = createArenaStage9MovementExperimentDefinition({
    sourceCommit: COMMIT,
    sourceDirty: false,
    caseCount: 1,
    replaySampleCount: 1,
  });
  const first = runDefinition(
    definition,
    createArenaStage9MovementExperimentRegistries(),
    '2026-07-18T00:00:00.000Z',
  );
  const second = runDefinition(
    definition,
    createArenaStage9MovementExperimentRegistries(),
    '2026-07-19T00:00:00.000Z',
  );
  assert.equal(first.outcome, ARENA_EXPERIMENT_OUTCOME.PASSED);
  assert.equal(first.resultHash, second.resultHash);
  assert.equal(first.cases[0].ticks, 4_200);
  assert.equal(first.cases[0].result.replayVerified, true);
  assert.equal(first.metrics[0].data.gate.passed, true);
  assert.ok(first.metrics[0].data.raw.inputCounts.walk > 0);
  assert.ok(first.metrics[0].data.raw.inputCounts.run > 0);
  assert.ok(first.metrics[0].data.raw.downSmashLandings > 0);
});

test('Bot suite runs easy/normal/hard as same-seed paired matches and keeps deterministic reports', () => {
  const definition = createArenaStage9BotExperimentDefinition({
    sourceCommit: COMMIT,
    sourceDirty: false,
    caseCount: 1,
    replaySampleCount: 1,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 400,
      hardLimitTicks: 500,
    },
  });
  const first = runDefinition(
    definition,
    createArenaStage9BotExperimentRegistries(),
    '2026-07-18T00:00:00.000Z',
  );
  const second = runDefinition(
    definition,
    createArenaStage9BotExperimentRegistries(),
    '2026-07-19T00:00:00.000Z',
  );
  assert.equal(first.resultHash, second.resultHash);
  assert.equal(first.completedCaseCount, 1);
  assert.equal(first.failedCaseCount, 0);
  assert.equal(first.cases[0].ticks, 1_500);
  assert.deepEqual(
    first.cases[0].result.difficulties.map(({ difficultyId }) => difficultyId),
    ['easy', 'normal', 'hard'],
  );
  assert.deepEqual(
    first.cases[0].result.difficulties.map(({ replayVerified }) => replayVerified),
    [true, true, true],
  );
  assert.equal(first.metrics[0].data.gate.passed, true);
  assert.equal(first.outcome, ARENA_EXPERIMENT_OUTCOME.FAILED);
  assert.deepEqual(first.failedMetricGates.map(({ collectorId }) => collectorId), [
    'arena.stage9.bot-capability',
  ]);
});

test('S9.3 balance definition pre-registers immutable fixed samples and feasible policy ranges', () => {
  const definition = createArenaStage9BalanceExperimentDefinition({
    sourceCommit: COMMIT,
    sourceDirty: false,
  });
  assert.equal(definition.id, ARENA_STAGE9_BALANCE_EXPERIMENT_ID);
  assert.equal(definition.getSeeds().length, ARENA_STAGE9_BALANCE_CASE_COUNT);
  assert.equal(definition.schemaVersion, 2);
  assert.equal(definition.limits.maximumFailedCases, 0);
  assert.deepEqual(
    definition.collectors.find(({ id }) => id === ARENA_BALANCE_CANDIDATE_COLLECTOR_ID)
      .parameters.policy,
    ARENA_STAGE9_BALANCE_POLICY_V1,
  );
  assert.equal(Object.isFrozen(definition.collectors[0].parameters), true);

  const impossible = structuredClone(ARENA_STAGE9_BALANCE_POLICY_V1);
  impossible.equipment.minimumPickupSharePerDefinition = 0.4;
  assert.throws(() => createArenaBalancePolicy(impossible), /最小占比总和不可实现/);
  const unknown = structuredClone(ARENA_STAGE9_BALANCE_POLICY_V1);
  unknown.duration.futureThreshold = 1;
  assert.throws(() => createArenaBalancePolicy(unknown), /不支持字段 futureThreshold/);
});

function createSyntheticBalancePolicy() {
  return {
    schemaVersion: 1,
    minimumCompletedPairedCases: 1,
    duration: {
      targetMinimumTicks: 50,
      targetMaximumTicks: 150,
      minimumTargetShare: 1,
      ultraShortMaximumTicks: 10,
      maximumUltraShortShare: 0,
      maximumTimeoutShare: 1,
    },
    equipment: {
      actionBindings: [{
        equipmentDefinitionId: 'chain',
        actionDefinitionId: 'chain-pull',
      }],
      minimumPickupsPerDefinition: 1,
      minimumActionsPerDefinition: 1,
      minimumHitsPerDefinition: 1,
      minimumPickupSharePerDefinition: 1,
      maximumPickupSharePerDefinition: 1,
      minimumActionSharePerDefinition: 1,
      maximumActionSharePerDefinition: 1,
      minimumHitSharePerDefinition: 1,
      maximumHitSharePerDefinition: 1,
    },
    elimination: {
      minimumCreditedShare: 0.4,
      minimumEquipmentAttributedShare: 0.4,
      maximumEquipmentAttributedShare: 0.6,
      minimumEnvironmentShare: 0.4,
    },
  };
}

function createSyntheticBalanceCollector() {
  const policy = createSyntheticBalancePolicy();
  const parameters = createArenaBalanceCandidateCollectorParameters({ policy });
  const definition = createArenaExperimentDefinition(definitionValue({
    seedSet: { kind: 'explicit', values: [1] },
    candidate: {
      ...definitionValue().candidate,
      matchConfig: { preparingTicks: 0, lastHitCreditTicks: 30 },
    },
    collectors: [{
      id: ARENA_BALANCE_CANDIDATE_COLLECTOR_ID,
      version: ARENA_BALANCE_CANDIDATE_COLLECTOR_VERSION,
      parameters,
    }],
  }));
  return createArenaBalanceCandidateCollectorEntry().create({ definition, parameters });
}

function observeSyntheticBalanceDifficulty(collector, difficultyId, {
  creditedEliminationTick = 2,
} = {}) {
  collector.observeStep({
    seed: 1,
    snapshot: { tick: 1, difficultyId, matchTick: 1 },
    inputFrames: [],
    events: [
      {
        type: 'EquipmentSpawned',
        tick: 0,
        equipmentDefinitionId: 'chain',
      },
      {
        type: 'EquipmentPickedUp',
        tick: 0,
        equipmentDefinitionId: 'chain',
      },
      { type: 'ActionStarted', tick: 1, action: 'chain-pull' },
      {
        type: 'HitResolved',
        tick: 1,
        action: 'chain-pull',
        attackerId: 'player-2',
        targetId: 'player-1',
      },
      {
        type: 'PlayerEliminated',
        tick: creditedEliminationTick,
        participantId: 'player-1',
        creditedAttackerId: 'player-2',
      },
      {
        type: 'PlayerEliminated',
        tick: 3,
        participantId: 'player-2',
        creditedAttackerId: null,
      },
    ],
  });
}

test('balance collector attributes equipment/environment eliminations and discards failed partial cases', () => {
  const collector = createSyntheticBalanceCollector();
  collector.beginCase({ seed: 1 });
  for (const difficultyId of ['easy', 'normal', 'hard']) {
    observeSyntheticBalanceDifficulty(collector, difficultyId);
  }
  collector.completeCase({
    seed: 1,
    eventCount: 18,
    result: {
      difficulties: ['easy', 'normal', 'hard'].map((difficultyId) => ({
        difficultyId,
        ticks: 100,
        outcome: {
          reason: 'lives-exhausted',
          winnerId: 'player-2',
          isDraw: false,
        },
      })),
    },
  });
  const result = collector.getResult();
  assert.equal(result.gate.passed, true);
  assert.equal(result.denominators.completedMatches, 3);
  assert.equal(result.denominators.totalEliminations, 6);
  assert.equal(result.derived.overall.equipmentAttributedEliminations, 3);
  assert.equal(result.derived.overall.uncreditedEnvironmentEliminations, 3);
  assert.equal(result.derived.overall.equipment.definitions.chain.hits, 3);
  collector.destroy();

  const failed = createSyntheticBalanceCollector();
  failed.beginCase({ seed: 1 });
  observeSyntheticBalanceDifficulty(failed, 'easy');
  failed.failCase({ seed: 1, failure: { name: 'ForcedFailure' } });
  const failedResult = failed.getResult();
  assert.equal(failedResult.raw.failedPairedCases, 1);
  assert.equal(failedResult.denominators.totalEliminations, 0);
  assert.equal(failedResult.derived.overall.equipment.definitions.chain.hits, 0);
  failed.destroy();

  const outOfOrder = createSyntheticBalanceCollector();
  outOfOrder.beginCase({ seed: 1 });
  for (const difficultyId of ['easy', 'normal', 'hard']) {
    observeSyntheticBalanceDifficulty(outOfOrder, difficultyId, {
      creditedEliminationTick: 0,
    });
  }
  outOfOrder.completeCase({
    seed: 1,
    eventCount: 18,
    result: {
      difficulties: ['easy', 'normal', 'hard'].map((difficultyId) => ({
        difficultyId,
        ticks: 100,
        outcome: {
          reason: 'lives-exhausted',
          winnerId: 'player-2',
          isDraw: false,
        },
      })),
    },
  });
  assert.equal(
    outOfOrder.getResult().derived.overall.equipmentAttributedEliminations,
    0,
  );
  outOfOrder.destroy();
});

test('professional experiment compositions reject ambiguous sampling and CLI drift', () => {
  assert.throws(() => createArenaStage9MapExperimentDefinition({
    sourceCommit: COMMIT,
    sourceDirty: false,
    caseCount: 1,
    replaySampleCount: 2,
  }), /replaySampleCount/);
  const invalidMovement = createArenaStage9MovementExperimentDefinition({
    sourceCommit: COMMIT,
    sourceDirty: false,
    caseCount: 1,
    replaySampleCount: 0,
    input: {
      minimumSteerTicks: 7,
      maximumSteerTicks: 24,
      towardCenterProbability: 0.42,
      walkInputProbability: 0.4,
      minimumWalkMagnitude: 0.8,
      maximumWalkMagnitude: 0.9,
      minimumRunMagnitude: 0.7,
      maximumRunMagnitude: 1,
      randomSlamProbability: 0.002,
      randomPrimaryProbability: 0.003,
    },
  });
  assert.throws(() => new SimulationExperimentRunner({
    definition: invalidMovement,
    ...createArenaStage9MovementExperimentRegistries(),
  }), /walk < run/);
  assert.throws(() => createArenaStage9BotExperimentDefinition({
    sourceCommit: COMMIT,
    sourceDirty: false,
    caseCount: 1,
    replaySampleCount: 2,
  }), /replaySampleCount/);
  assert.throws(() => parseArenaStressIntegerOptions(['--matche=1'], {
    matches: { fallback: 1 },
  }), /未知参数 --matche=1/);
  assert.throws(() => parseArenaStressIntegerOptions(['--matches=1', '--matches=2'], {
    matches: { fallback: 1 },
  }), /不能重复/);
});
