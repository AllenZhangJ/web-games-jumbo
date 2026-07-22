import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_DEVICE_ACCEPTANCE_PLATFORM,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  ARENA_DEVICE_ACCEPTANCE_BUNDLE_SCHEMA_VERSION,
} from '../../../src/arena/presentation/acceptance/arena-device-acceptance-bundle.js';
import {
  ARENA_DEVICE_ACCEPTANCE_CHECK_RESULT,
  ARENA_DEVICE_ACCEPTANCE_RECORD_SCHEMA_VERSION,
} from '../../../src/arena/presentation/acceptance/arena-device-acceptance-record.js';
import {
  ARENA_STAGE9_PERFORMANCE_DEVICE_CHECK_ID,
  createArenaStage9PerformanceDeviceAcceptanceV1Definition,
} from '../../../src/arena/presentation/acceptance/arena-stage9-performance-device-acceptance-v1.js';
import {
  ARENA_PERFORMANCE_DEVICE_CLASS,
  ARENA_PERFORMANCE_GATE_OPERATOR,
  ARENA_PERFORMANCE_POLICY_SCHEMA_VERSION,
  createArenaPerformancePolicyDefinition,
} from '../../../src/arena/presentation/performance/arena-performance-policy-definition.js';
import {
  ARENA_PERFORMANCE_RECORD_SCHEMA_VERSION,
  createArenaPerformanceRecord,
} from '../../../src/arena/presentation/performance/arena-performance-record.js';
import {
  createArenaPerformanceReport,
} from '../../../src/arena/presentation/performance/arena-performance-report.js';
import {
  createArenaPerformanceEvidenceReport,
} from '../../../src/arena/presentation/performance/arena-performance-evidence.js';
import {
  ARENA_STAGE9_PERFORMANCE_TARGET_ID,
  createArenaStage9PerformanceV1Policy,
} from '../../../src/arena/presentation/performance/arena-stage9-performance-v1.js';
import {
  ARENA_V1_PRESENTATION_QUALITY_ID,
  ARENA_V1_PRESENTATION_QUALITY_REGISTRY,
} from '@number-strategy-jump/arena-presentation-runtime';

const COMMIT = '1'.repeat(40);

function gate(id, collectorId, operator, threshold, parameters = {}, required = true) {
  return { id, collectorId, operator, threshold, parameters, required };
}

function testPolicy() {
  const quality = ARENA_V1_PRESENTATION_QUALITY_REGISTRY.require(
    ARENA_V1_PRESENTATION_QUALITY_ID.LOW,
  );
  return createArenaPerformancePolicyDefinition({
    schemaVersion: ARENA_PERFORMANCE_POLICY_SCHEMA_VERSION,
    id: 'arena.performance.test.v1',
    stage: 'test',
    contentVersion: 1,
    targets: [{
      id: 'web-low-test',
      platform: ARENA_DEVICE_ACCEPTANCE_PLATFORM.WEB,
      deviceClass: ARENA_PERFORMANCE_DEVICE_CLASS.LOW,
      requiredOsNames: ['Android'],
      qualityDefinitionId: quality.id,
      qualityDefinitionHash: quality.getContentHash(),
      gates: [
        gate('errors', 'observer-error-count', ARENA_PERFORMANCE_GATE_OPERATOR.EQUAL, 0),
        gate('duration', 'soak-duration-ms', ARENA_PERFORMANCE_GATE_OPERATOR.GREATER_THAN_OR_EQUAL, 100),
        gate('startup', 'milestone-duration-ms', ARENA_PERFORMANCE_GATE_OPERATOR.LESS_THAN_OR_EQUAL, 20, {
          endId: 'interactive',
        }),
        gate('frame-p95', 'rendered-frame-interval-p95-ms', ARENA_PERFORMANCE_GATE_OPERATOR.LESS_THAN_OR_EQUAL, 34),
        gate('long-share', 'long-rendered-frame-share', ARENA_PERFORMANCE_GATE_OPERATOR.LESS_THAN_OR_EQUAL, 0, {
          thresholdMs: 40,
        }),
        gate('draws', 'resource-peak', ARENA_PERFORMANCE_GATE_OPERATOR.LESS_THAN_OR_EQUAL, 10, {
          field: 'drawCalls',
        }),
        gate('hide', 'lifecycle-counter', ARENA_PERFORMANCE_GATE_OPERATOR.GREATER_THAN_OR_EQUAL, 1, {
          field: 'hideCount',
        }),
        gate('optional-memory', 'resource-peak', ARENA_PERFORMANCE_GATE_OPERATOR.LESS_THAN_OR_EQUAL, 1, {
          field: 'processMemoryBytes',
        }, false),
      ],
    }],
  });
}

function captureValue(quality) {
  const frames = [0, 33, 66, 99].map((elapsedMs, index) => ({
    sequence: index + 1,
    elapsedMs,
    deltaMicroseconds: index === 0 ? 0 : 33_000,
    coreSteps: index === 0 ? 0 : 2,
    droppedMicroseconds: 0,
    rendered: true,
    renderDurationMicroseconds: 4_000,
  }));
  return {
    qualityDefinitionId: quality.id,
    qualityDefinitionHash: quality.getContentHash(),
    observerErrorCount: 0,
    observedMatchCount: 1,
    lifecycle: {
      hideCount: 1,
      showCount: 1,
      contextLostCount: 1,
      contextRestoredCount: 1,
    },
    probe: {
      schemaVersion: 1,
      state: 'stopped',
      durationMs: 120,
      maximumFrameSamples: 10,
      maximumResourceSamples: 10,
      resourceSampleIntervalFrames: 1,
      observedFrameCount: frames.length,
      recordedFrameCount: frames.length,
      droppedFrameSampleCount: 0,
      droppedResourceSampleCount: 0,
      milestones: [{ id: 'interactive', elapsedMs: 10 }],
      frames,
      resources: [1, 2, 3, 4].map((frameSequence) => ({
        frameSequence,
        elapsedMs: frames[frameSequence - 1].elapsedMs,
        drawCalls: 8,
        triangles: 1_000,
        points: 0,
        lines: 0,
        programs: 2,
        geometries: 10,
        textures: 4,
        jsHeapBytes: null,
        processMemoryBytes: null,
      })),
    },
  };
}

function recordValue(policy, overrides = {}) {
  const target = policy.getTarget('web-low-test');
  const quality = ARENA_V1_PRESENTATION_QUALITY_REGISTRY.require(target.qualityDefinitionId);
  return {
    schemaVersion: ARENA_PERFORMANCE_RECORD_SCHEMA_VERSION,
    recordId: 'performance-record-1',
    policyId: policy.id,
    policyHash: policy.getContentHash(),
    commit: COMMIT,
    buildId: 'build-1',
    targetId: target.id,
    runId: 'run-1',
    performedAt: '2026-07-18T00:00:00.000Z',
    capture: captureValue(quality),
    ...overrides,
  };
}

test('Stage 9 performance policy fixes six low/mainstream target classes and quality hashes', () => {
  const policy = createArenaStage9PerformanceV1Policy();
  assert.equal(policy.targets.length, 6);
  assert.equal(new Set(policy.targets.map(({ platform }) => platform)).size, 3);
  assert.equal(policy.getTarget(
    ARENA_STAGE9_PERFORMANCE_TARGET_ID.WEB_LOW,
  ).qualityDefinitionId, ARENA_V1_PRESENTATION_QUALITY_ID.LOW);
  assert.equal(policy.getTarget(
    ARENA_STAGE9_PERFORMANCE_TARGET_ID.WEB_MAINSTREAM,
  ).qualityDefinitionId, ARENA_V1_PRESENTATION_QUALITY_ID.HIGH);
  assert.equal(policy.getContentHash().length, 8);
  assert.ok(Object.isFrozen(policy.targets[0].gates));
  assert.equal(policy.targets.every(({ gates }) => (
    gates.find(({ id }) => id === 'memory.available-budget')?.required === true
  )), true);
  assert.equal(policy.targets.every(({ gates }) => (
    gates.find(({ id }) => id === 'capture.memory-samples')?.threshold === 100
    && gates.find(({ id }) => id === 'capture.resource-samples')?.threshold === 100
  )), true);
});

test('performance Record rejects identity, truncation and quality ambiguity before reporting', () => {
  const policy = testPolicy();
  const record = createArenaPerformanceRecord(policy, recordValue(policy));
  assert.ok(Object.isFrozen(record.capture.probe.frames));
  assert.throws(() => createArenaPerformanceRecord(policy, recordValue(policy, {
    policyHash: '00000000',
  })), /Policy 身份/);
  const wrongQuality = recordValue(policy);
  wrongQuality.capture.qualityDefinitionId = ARENA_V1_PRESENTATION_QUALITY_ID.HIGH;
  assert.throws(() => createArenaPerformanceRecord(policy, wrongQuality), /错误的表现质量/);
  const truncated = recordValue(policy);
  truncated.capture.probe.recordedFrameCount = 5;
  assert.throws(() => createArenaPerformanceRecord(policy, truncated), /recorded|数量/);
  const running = recordValue(policy);
  running.capture.probe.state = 'running';
  assert.throws(() => createArenaPerformanceRecord(policy, running), /必须先停止/);
  assert.throws(() => createArenaPerformanceRecord(policy, recordValue(policy, {
    performedAt: '2026-02-31T00:00:00.000Z',
  })), /有效 UTC 时间/);
});

test('performance Report recomputes metrics, treats optional unknown as pass and hashes the result', () => {
  const policy = testPolicy();
  const report = createArenaPerformanceReport(policy, recordValue(policy));
  assert.equal(report.status, 'passed');
  assert.equal(report.failedGateIds.length, 0);
  assert.equal(report.gates.find(({ id }) => id === 'frame-p95').metric.value, 33);
  const optional = report.gates.find(({ id }) => id === 'optional-memory');
  assert.equal(optional.metric.available, false);
  assert.equal(optional.passed, true);
  assert.equal(report.resultHash.length, 8);

  const slow = recordValue(policy);
  slow.capture.probe.frames[3].elapsedMs = 150;
  slow.capture.probe.durationMs = 160;
  slow.capture.probe.resources[3].elapsedMs = 150;
  const failed = createArenaPerformanceReport(policy, slow);
  assert.equal(failed.status, 'failed');
  assert.deepEqual(failed.failedGateIds, ['frame-p95', 'long-share']);
});

test('performance Report rejects unsafe aggregate arithmetic instead of rounding evidence', () => {
  const source = structuredClone(testPolicy().toJSON());
  source.targets[0].gates.push(gate(
    'dropped-time',
    'dropped-core-time-ms',
    ARENA_PERFORMANCE_GATE_OPERATOR.LESS_THAN_OR_EQUAL,
    1,
  ));
  const policy = createArenaPerformancePolicyDefinition(source);
  const record = recordValue(policy);
  record.capture.probe.frames[0].droppedMicroseconds = Number.MAX_SAFE_INTEGER;
  record.capture.probe.frames[1].droppedMicroseconds = 1;
  assert.throws(() => createArenaPerformanceReport(policy, record), /求和溢出/);
});

test('performance policies reject duplicate platform/class ownership and unknown collector use', () => {
  const policy = testPolicy();
  const duplicate = structuredClone(policy.toJSON());
  duplicate.targets = [
    structuredClone(duplicate.targets[0]),
    { ...structuredClone(duplicate.targets[0]), id: 'duplicate-target' },
  ];
  assert.throws(() => createArenaPerformancePolicyDefinition(duplicate), /重复定义/);

  const unknown = structuredClone(policy.toJSON());
  unknown.targets[0].gates[0].collectorId = 'missing-collector';
  const unknownPolicy = createArenaPerformancePolicyDefinition(unknown);
  assert.throws(
    () => createArenaPerformanceReport(unknownPolicy, recordValue(unknownPolicy)),
    /未知性能 Metric collector/,
  );
});

test('combined evidence binds one trace to the exact device run and rejects operator/report conflict', () => {
  const definition = createArenaStage9PerformanceDeviceAcceptanceV1Definition();
  const policy = createArenaStage9PerformanceV1Policy();
  const targetId = ARENA_STAGE9_PERFORMANCE_TARGET_ID.WEB_LOW;
  const target = definition.getTarget(targetId);
  const runId = 'web-low-run-1';
  const performedAt = '2026-07-18T00:00:00.000Z';
  const artifacts = target.requiredArtifactKinds.map((kind, index) => ({
    id: `artifact-${index}`,
    kind,
    path: `${runId}/artifact-${index}.bin`,
    sha256: String(index).padStart(64, '0'),
    byteLength: 1,
  }));
  const deviceRecord = {
    schemaVersion: ARENA_DEVICE_ACCEPTANCE_RECORD_SCHEMA_VERSION,
    recordId: 'device-web-low-1',
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit: COMMIT,
    buildId: 'build-1',
    targetId,
    runId,
    performedAt,
    operatorId: 'operator-1',
    client: { name: 'Chrome', version: '1', baseLibraryVersion: null },
    device: {
      manufacturer: 'Test',
      model: 'Low Android',
      osName: 'Android',
      osVersion: '1',
    },
    orientation: 'portrait',
    inputMode: 'touch',
    checks: target.requiredCheckIds.map((id) => ({
      id,
      result: id === ARENA_STAGE9_PERFORMANCE_DEVICE_CHECK_ID.PERFORMANCE_BUDGET
        ? ARENA_DEVICE_ACCEPTANCE_CHECK_RESULT.FAILED
        : ARENA_DEVICE_ACCEPTANCE_CHECK_RESULT.PASSED,
      notes: 'test evidence',
      artifactIds: artifacts.map(({ id }) => id),
    })),
    artifacts,
  };
  const deviceBundle = {
    schemaVersion: ARENA_DEVICE_ACCEPTANCE_BUNDLE_SCHEMA_VERSION,
    definitionId: definition.id,
    definitionHash: definition.getContentHash(),
    commit: COMMIT,
    buildId: 'build-1',
    createdAt: performedAt,
    records: [deviceRecord],
  };
  const quality = ARENA_V1_PRESENTATION_QUALITY_REGISTRY.require(
    ARENA_V1_PRESENTATION_QUALITY_ID.LOW,
  );
  const performanceRecord = {
    schemaVersion: ARENA_PERFORMANCE_RECORD_SCHEMA_VERSION,
    recordId: 'performance-web-low-1',
    policyId: policy.id,
    policyHash: policy.getContentHash(),
    commit: COMMIT,
    buildId: 'build-1',
    targetId,
    runId,
    performedAt,
    capture: captureValue(quality),
  };
  const report = createArenaPerformanceEvidenceReport({
    deviceDefinition: definition.toJSON(),
    deviceBundle,
    performancePolicy: policy,
    performanceRecords: [performanceRecord],
  });
  assert.equal(report.status, 'failed');
  assert.deepEqual(report.failedTargetIds, [targetId]);
  assert.equal(report.performanceReports[0].report.status, 'failed');

  const contradiction = structuredClone(deviceBundle);
  contradiction.records[0].checks.find(({ id }) => (
    id === ARENA_STAGE9_PERFORMANCE_DEVICE_CHECK_ID.PERFORMANCE_BUDGET
  )).result = ARENA_DEVICE_ACCEPTANCE_CHECK_RESULT.PASSED;
  assert.throws(() => createArenaPerformanceEvidenceReport({
    deviceDefinition: definition,
    deviceBundle: contradiction,
    performancePolicy: policy,
    performanceRecords: [performanceRecord],
  }), /机器报告冲突/);

  const wrongRun = structuredClone(performanceRecord);
  wrongRun.runId = 'other-run';
  assert.throws(() => createArenaPerformanceEvidenceReport({
    deviceDefinition: definition,
    deviceBundle,
    performancePolicy: policy,
    performanceRecords: [wrongRun],
  }), /没有对应 Device Record/);
});
