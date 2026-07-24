import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_V1_DEFAULT_PRESENTATION_QUALITY,
  ARENA_V1_PRESENTATION_QUALITY_ID,
  ARENA_V1_PRESENTATION_QUALITY_REGISTRY,
  PRESENTATION_QUALITY_DEFINITION_SCHEMA_VERSION,
  PresentationRenderPacer,
  createPresentationMemorySnapshot,
  createPresentationQualityDefinition,
  createPresentationQualityRegistry,
  mergePresentationMemorySnapshot,
  PresentationPerformanceProbe,
} from '@number-strategy-jump/arena-presentation-runtime';

function qualityValue(overrides = {}) {
  return {
    schemaVersion: PRESENTATION_QUALITY_DEFINITION_SCHEMA_VERSION,
    id: 'quality.test.v1',
    contentVersion: 1,
    targetFramesPerSecond: 30,
    maximumPixelRatio: 1,
    antialiasEnabled: false,
    shadowsEnabled: false,
    maximumEffects: 8,
    trailsEnabled: false,
    outlinesEnabled: false,
    ...overrides,
  };
}

test('presentation quality definitions are immutable, hashed and registry-owned', () => {
  const source = qualityValue();
  const definition = createPresentationQualityDefinition(source);
  source.maximumEffects = 99;
  assert.equal(definition.maximumEffects, 8);
  assert.equal(definition.getContentHash().length, 8);
  assert.ok(Object.isFrozen(definition));
  assert.throws(
    () => createPresentationQualityDefinition(qualityValue({ targetFramesPerSecond: 24 })),
    /整数约数/,
  );
  assert.throws(
    () => createPresentationQualityRegistry([definition, definition]),
    /重复/,
  );
  assert.equal(
    ARENA_V1_PRESENTATION_QUALITY_REGISTRY.require(
      ARENA_V1_PRESENTATION_QUALITY_ID.LOW,
    ).targetFramesPerSecond,
    30,
  );
  assert.equal(ARENA_V1_DEFAULT_PRESENTATION_QUALITY.targetFramesPerSecond, 60);
});

test('30 FPS render pacing never suppresses 60 Hz host callbacks', () => {
  const pacer = new PresentationRenderPacer({
    qualityDefinition: ARENA_V1_PRESENTATION_QUALITY_REGISTRY.require(
      ARENA_V1_PRESENTATION_QUALITY_ID.LOW,
    ),
  });
  const decisions = Array.from({ length: 6 }, () => pacer.shouldRender(1 / 60));
  assert.deepEqual(decisions, [false, true, false, true, false, true]);
  assert.equal(pacer.shouldRender(0, { force: true }), true);
  assert.deepEqual(pacer.getDebugSnapshot(), {
    intervalSeconds: 1 / 30,
    accumulatedSeconds: 0,
    renderedFrameCount: 4,
    skippedFrameCount: 3,
  });
  assert.throws(() => pacer.shouldRender(-1), /非负有限数/);
  assert.equal(pacer.shouldRender(Number.MAX_VALUE), true);
  assert.equal(Number.isFinite(pacer.getDebugSnapshot().accumulatedSeconds), true);
});

test('performance probe records bounded immutable frame and resource evidence', () => {
  const probe = new PresentationPerformanceProbe({
    maximumFrameSamples: 2,
    maximumResourceSamples: 1,
    resourceSampleIntervalFrames: 2,
  });
  assert.equal(probe.start(100), true);
  assert.equal(probe.start(100), false);
  assert.equal(probe.markMilestone('interactive', 120), true);
  assert.equal(probe.markMilestone('interactive', 121), false);
  assert.equal(probe.shouldSampleResources(), true);
  const resources = {
    drawCalls: 4,
    triangles: 100,
    points: 0,
    lines: 0,
    programs: 2,
    geometries: 8,
    textures: 3,
    jsHeapBytes: null,
    processMemoryBytes: null,
  };
  probe.recordFrame({
    timestampMs: 130,
    deltaSeconds: 1 / 60,
    coreSteps: 1,
    droppedSeconds: 0,
    rendered: true,
    renderDurationMs: 2.25,
    resources,
  });
  assert.equal(probe.shouldSampleResources(), true);
  probe.recordFrame({
    timestampMs: 146,
    deltaSeconds: 1 / 60,
    coreSteps: 1,
    droppedSeconds: 0,
    rendered: false,
    renderDurationMs: null,
    resources,
  });
  assert.equal(probe.shouldSampleResources(), false);
  probe.recordFrame({
    timestampMs: 162,
    deltaSeconds: 1 / 60,
    coreSteps: 1,
    droppedSeconds: 0.001,
    rendered: true,
    renderDurationMs: 3,
    resources,
  });
  assert.equal(probe.stop(170), true);
  assert.equal(probe.stop(171), false);
  const snapshot = probe.getSnapshot();
  assert.equal(snapshot.durationMs, 70);
  assert.equal(snapshot.observedFrameCount, 3);
  assert.equal(snapshot.recordedFrameCount, 2);
  assert.equal(snapshot.droppedFrameSampleCount, 1);
  const frames = snapshot.frames;
  const resourceSamples = snapshot.resources;
  assert.ok(Array.isArray(frames));
  assert.ok(Array.isArray(resourceSamples));
  const [firstFrame] = frames;
  assert.ok(typeof firstFrame === 'object' && firstFrame !== null);
  assert.equal(Reflect.get(firstFrame, 'renderDurationMicroseconds'), 2250);
  assert.equal(resourceSamples.length, 1);
  assert.equal(snapshot.droppedResourceSampleCount, 1);
  assert.ok(Object.isFrozen(frames));
  assert.throws(
    () => Object.defineProperty(firstFrame, 'coreSteps', { value: 9 }),
    TypeError,
  );
  probe.destroy();
  assert.deepEqual({
    state: probe.getSnapshot().state,
    observedFrameCount: probe.getSnapshot().observedFrameCount,
    recordedFrameCount: probe.getSnapshot().recordedFrameCount,
  }, {
    state: 'destroyed',
    observedFrameCount: 0,
    recordedFrameCount: 0,
  });
});

test('performance probe rejects ambiguous or time-travelling samples', () => {
  const probe = new PresentationPerformanceProbe();
  assert.throws(() => probe.recordFrame({}), /running/);
  probe.start(10);
  assert.throws(() => probe.recordFrame({
    timestampMs: 9,
    deltaSeconds: 0,
    coreSteps: 0,
    droppedSeconds: 0,
    rendered: false,
    renderDurationMs: null,
    resources: null,
  }), /不能倒退/);
  assert.throws(() => probe.recordFrame({
    timestampMs: 10,
    deltaSeconds: 0,
    coreSteps: 0,
    droppedSeconds: 0,
    rendered: false,
    renderDurationMs: 0,
    resources: null,
  }), /未渲染帧/);
  assert.throws(() => probe.recordFrame({
    timestampMs: 11,
    deltaSeconds: Number.MAX_VALUE,
    coreSteps: 0,
    droppedSeconds: 0,
    rendered: false,
    renderDurationMs: null,
    resources: null,
  }), /换算后必须是非负安全整数/);
  probe.recordFrame({
    timestampMs: 10,
    deltaSeconds: 0,
    coreSteps: 0,
    droppedSeconds: 0,
    rendered: false,
    renderDurationMs: null,
    resources: null,
  });
  assert.equal(probe.getSnapshot().observedFrameCount, 1);
});

test('performance memory samples preserve missing data and reject ambiguous host values', () => {
  assert.equal(createPresentationMemorySnapshot(null), null);
  const memory = createPresentationMemorySnapshot({
    jsHeapBytes: 1024,
    processMemoryBytes: null,
  });
  assert.deepEqual(memory, { jsHeapBytes: 1024, processMemoryBytes: null });
  assert.deepEqual(mergePresentationMemorySnapshot({ drawCalls: 3 }, memory), {
    drawCalls: 3,
    jsHeapBytes: 1024,
    processMemoryBytes: null,
  });
  assert.throws(
    () => createPresentationMemorySnapshot({ jsHeapBytes: 1.5 }),
    /安全整数/,
  );
  assert.throws(
    () => createPresentationMemorySnapshot({ residentSetBytes: 1024 }),
    /不支持字段/,
  );
  const accessor = {};
  Object.defineProperty(accessor, 'jsHeapBytes', { enumerable: true, get: () => 1024 });
  assert.throws(() => createPresentationMemorySnapshot(accessor), /数据字段/);
});
