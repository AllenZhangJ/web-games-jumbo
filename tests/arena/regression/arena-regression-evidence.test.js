import assert from 'node:assert/strict';
import test from 'node:test';
import { ARENA_INPUT_MAPPER_ID } from '@number-strategy-jump/arena-presentation-runtime';
import {
  ARENA_REGRESSION_COMPONENT_ID,
  createArenaRegressionEvidenceReport,
  createArenaStage9RegressionEvidenceV1Definition,
  createArenaStage9RegressionEvidenceV1DefinitionHash,
  readArenaRegressionEvidenceReport,
} from '../../../src/arena/regression/arena-regression-evidence.js';

const COMMIT = 'a'.repeat(40);

function validComponents() {
  return [
    {
      id: ARENA_REGRESSION_COMPONENT_ID.INPUT_FUZZ,
      matchesPerMapper: 40,
      totalMatches: 80,
      replaySamplesPerMapper: 2,
      verifiedReplays: 4,
      uniqueFinalHashes: 80,
      mappers: [
        {
          id: ARENA_INPUT_MAPPER_ID.GESTURE_MOBILITY,
          matches: 40,
          uniqueFinalHashes: 40,
          replayChecks: 2,
        },
        {
          id: ARENA_INPUT_MAPPER_ID.CONTEXT_PRIMARY,
          matches: 40,
          uniqueFinalHashes: 40,
          replayChecks: 2,
        },
      ],
      operations: { startAccepted: 20, suspendResume: 4 },
      frameCounts: { primaryPressed: 10, jumpPressed: 5 },
    },
    {
      id: ARENA_REGRESSION_COMPONENT_ID.LIFECYCLE_TESTS,
      testFileCount: 6,
      testCount: 88,
      passCount: 88,
      failCount: 0,
      cancelledCount: 0,
      skippedCount: 0,
      todoCount: 0,
    },
    {
      id: ARENA_REGRESSION_COMPONENT_ID.PRESENTATION_SESSION_SOAK,
      matches: 100,
      uniqueMatchSeeds: 100,
      heapGrowthBytes: 1024,
      heapGrowthBudgetBytes: 8 * 1024 * 1024,
      remainingFrames: 0,
      remainingLifecycleListeners: 0,
      remainingCanvasListeners: 0,
      inputBound: false,
      diagnostics: 0,
    },
    {
      id: ARENA_REGRESSION_COMPONENT_ID.PRODUCT_PRESENTATION_SESSION_SOAK,
      ok: true,
      matches: 100,
      uniqueMatchSeeds: 100,
      uniqueAuthorityHashes: 100,
      heapGrowthBytes: -1024,
      heapGrowthBudgetBytes: 8 * 1024 * 1024,
      remainingFrames: 0,
      remainingLifecycleListeners: 0,
      remainingCanvasListeners: 0,
      inputBound: false,
      diagnostics: 100,
    },
    {
      id: ARENA_REGRESSION_COMPONENT_ID.PRODUCT_SESSION_STRESS,
      ok: true,
      matches: 200,
      authorityHashCount: 200,
      contentHashCount: 4,
      lifecycleTransitions: 200,
      rematches: 99,
      maximumTicks: 60,
      restarts: 7,
      experience: 2000,
      latestGrantId: 'grant-200',
    },
  ];
}

function validInput(overrides = {}) {
  return {
    sourceCommit: COMMIT,
    sourceDirty: false,
    generatedAt: '2026-07-18T01:02:03.004Z',
    runtime: {
      name: 'node',
      version: 'v22.16.0',
      platform: 'darwin',
      architecture: 'arm64',
    },
    components: validComponents(),
    ...overrides,
  };
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

test('Regression Evidence V1 固定组件身份、阈值与 Definition hash', () => {
  const definition = createArenaStage9RegressionEvidenceV1Definition();
  assert.equal(definition.id, 'arena.stage9.regression-evidence.v1');
  assert.equal(definition.components.length, 5);
  assert.equal(createArenaStage9RegressionEvidenceV1DefinitionHash(), '053703df');
  assert.ok(Object.isFrozen(definition));
  assert.ok(Object.isFrozen(definition.components));
  assert.deepEqual(
    definition.components.find(({ id }) => id === ARENA_REGRESSION_COMPONENT_ID.INPUT_FUZZ)
      .mapperIds,
    [
      ARENA_INPUT_MAPPER_ID.CONTEXT_PRIMARY,
      ARENA_INPUT_MAPPER_ID.GESTURE_MOBILITY,
    ].sort(),
  );
  assert.deepEqual(
    definition.components.find(({ id }) => id === ARENA_REGRESSION_COMPONENT_ID.LIFECYCLE_TESTS)
      .testFiles,
    [...definition.components.find(({ id }) => (
      id === ARENA_REGRESSION_COMPONENT_ID.LIFECYCLE_TESTS
    )).testFiles].sort(),
  );
});

test('Regression Evidence 归一化顺序并严格往返验证', () => {
  const input = validInput();
  input.components.reverse();
  input.components[4].mappers.reverse();
  input.components[4].operations = { suspendResume: 4, startAccepted: 20 };
  const report = createArenaRegressionEvidenceReport(input);
  assert.equal(report.status, 'passed');
  assert.equal(report.definitionHash, '053703df');
  assert.deepEqual(report.components.map(({ id }) => id), [
    ARENA_REGRESSION_COMPONENT_ID.INPUT_FUZZ,
    ARENA_REGRESSION_COMPONENT_ID.LIFECYCLE_TESTS,
    ARENA_REGRESSION_COMPONENT_ID.PRESENTATION_SESSION_SOAK,
    ARENA_REGRESSION_COMPONENT_ID.PRODUCT_PRESENTATION_SESSION_SOAK,
    ARENA_REGRESSION_COMPONENT_ID.PRODUCT_SESSION_STRESS,
  ]);
  assert.equal(readArenaRegressionEvidenceReport(copy(report)).resultHash, report.resultHash);
  assert.equal(
    createArenaRegressionEvidenceReport(validInput({
      generatedAt: '2027-01-01T00:00:00.000Z',
      runtime: { ...validInput().runtime, version: 'v24.0.0' },
    })).resultHash,
    report.resultHash,
  );
  assert.ok(Object.isFrozen(report.components[0].mappers[0]));
});

test('Regression Evidence 拒绝未知、重复、缺失组件与非数组 mapper', () => {
  assert.throws(
    () => createArenaRegressionEvidenceReport({ ...validInput(), unexpected: true }),
    /不支持字段 unexpected/,
  );
  const duplicated = validInput();
  duplicated.components[4] = copy(duplicated.components[0]);
  assert.throws(() => createArenaRegressionEvidenceReport(duplicated), /重复 Regression component/);
  assert.throws(
    () => createArenaRegressionEvidenceReport({
      ...validInput(),
      components: validComponents().slice(0, 4),
    }),
    /必须精确覆盖/,
  );
  const invalidMapper = validInput();
  invalidMapper.components[0].mappers = {};
  assert.throws(() => createArenaRegressionEvidenceReport(invalidMapper), /mappers 必须是数组/);
});

test('Regression Evidence 拒绝 fuzz 数量注水、部分回放与非唯一 hash', () => {
  for (const mutate of [
    (component) => { component.matchesPerMapper = 41; },
    (component) => { component.totalMatches = 79; },
    (component) => { component.verifiedReplays = 3; },
    (component) => { component.uniqueFinalHashes = 79; },
    (component) => { component.mappers[0].replayChecks = 1; },
  ]) {
    const input = validInput();
    mutate(input.components[0]);
    assert.throws(() => createArenaRegressionEvidenceReport(input), /Input fuzz evidence/);
  }
});

test('Regression Evidence 拒绝部分 lifecycle、资源残留、超预算和 stress 注水', () => {
  const cases = [
    [1, (component) => { component.passCount = 87; component.failCount = 1; }, /Lifecycle/],
    [2, (component) => { component.remainingLifecycleListeners = 1; }, /session-soak/],
    [2, (component) => { component.inputBound = true; }, /session-soak/],
    [3, (component) => { component.heapGrowthBytes = component.heapGrowthBudgetBytes + 1; }, /soak/],
    [4, (component) => { component.matches = 201; component.authorityHashCount = 201; }, /stress/],
    [4, (component) => { component.authorityHashCount = 199; }, /stress/],
  ];
  for (const [index, mutate, pattern] of cases) {
    const input = validInput();
    mutate(input.components[index]);
    assert.throws(() => createArenaRegressionEvidenceReport(input), pattern);
  }
});

test('Regression Evidence reader 拒绝 dirty、非法时间、未知字段与篡改 hash', () => {
  assert.throws(
    () => createArenaRegressionEvidenceReport({
      ...validInput(),
      sourceCommit: 'A'.repeat(40),
    }),
    /小写 Git commit/,
  );
  assert.throws(
    () => createArenaRegressionEvidenceReport({ ...validInput(), sourceDirty: true }),
    /clean source/,
  );
  assert.throws(
    () => createArenaRegressionEvidenceReport({
      ...validInput(),
      generatedAt: '2026-02-30T00:00:00.000Z',
    }),
    /有效 UTC 时间/,
  );
  const report = copy(createArenaRegressionEvidenceReport(validInput()));
  report.unknown = true;
  assert.throws(() => readArenaRegressionEvidenceReport(report), /不支持字段 unknown/);
  delete report.unknown;
  report.components[0].operations = {};
  assert.throws(() => readArenaRegressionEvidenceReport(report), /不能为空/);
  report.components[0].operations = { startAccepted: 20, suspendResume: 4 };
  report.resultHash = 'ffffffff';
  assert.throws(() => readArenaRegressionEvidenceReport(report), /resultHash 校验失败/);
});
