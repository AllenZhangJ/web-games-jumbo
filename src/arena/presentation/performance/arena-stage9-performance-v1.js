import {
  ARENA_DEVICE_ACCEPTANCE_PLATFORM,
} from '@number-strategy-jump/arena-device-acceptance';
import {
  ARENA_V1_PRESENTATION_QUALITY_ID,
  ARENA_V1_PRESENTATION_QUALITY_REGISTRY,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  ARENA_PERFORMANCE_DEVICE_CLASS,
  ARENA_PERFORMANCE_GATE_OPERATOR,
  ARENA_PERFORMANCE_POLICY_SCHEMA_VERSION,
  createArenaPerformancePolicyDefinition,
} from './arena-performance-policy-definition.js';

export const ARENA_STAGE9_PERFORMANCE_V1_ID = 'arena.stage9.performance.v1';

export const ARENA_STAGE9_PERFORMANCE_TARGET_ID = Object.freeze({
  WEB_LOW: 'web-low-device',
  WEB_MAINSTREAM: 'web-mainstream-device',
  WECHAT_LOW: 'wechat-low-device',
  WECHAT_MAINSTREAM: 'wechat-mainstream-device',
  DOUYIN_LOW: 'douyin-low-device',
  DOUYIN_MAINSTREAM: 'douyin-mainstream-device',
});

function gate(id, collectorId, operator, threshold, parameters = {}, required = true) {
  return { id, collectorId, operator, threshold, required, parameters };
}

const EQUAL = ARENA_PERFORMANCE_GATE_OPERATOR.EQUAL;
const LTE = ARENA_PERFORMANCE_GATE_OPERATOR.LESS_THAN_OR_EQUAL;
const GTE = ARENA_PERFORMANCE_GATE_OPERATOR.GREATER_THAN_OR_EQUAL;

function commonGates({
  renderedFrames,
  interactiveMs,
  firstMatchMs,
  frameIntervalP95Ms,
  longFrameThresholdMs,
  longFrameShare,
  renderDurationP95Ms,
  catchUpShare,
  droppedCoreTimeMs,
}) {
  return [
    gate('capture.observer-errors', 'observer-error-count', EQUAL, 0),
    gate('capture.soak-duration', 'soak-duration-ms', GTE, 600_000),
    gate('capture.match-count', 'observed-match-count', GTE, 3),
    gate('capture.frame-samples', 'recorded-frame-count', GTE, renderedFrames),
    gate('capture.no-frame-sample-loss', 'dropped-frame-sample-count', EQUAL, 0),
    gate('capture.no-resource-sample-loss', 'dropped-resource-sample-count', EQUAL, 0),
    gate('capture.resource-samples', 'recorded-resource-sample-count', GTE, 100),
    gate('capture.memory-samples', 'memory-sample-count', GTE, 100),
    gate('startup.interactive', 'milestone-duration-ms', LTE, interactiveMs, {
      endId: 'interactive',
    }),
    gate('startup.first-match-ready', 'milestone-duration-ms', LTE, firstMatchMs, {
      startId: 'first-match-requested',
      endId: 'first-match-ready',
    }),
    gate('frame.rendered-count', 'rendered-frame-count', GTE, renderedFrames),
    gate('frame.interval-p95', 'rendered-frame-interval-p95-ms', LTE, frameIntervalP95Ms),
    gate('frame.long-share', 'long-rendered-frame-share', LTE, longFrameShare, {
      thresholdMs: longFrameThresholdMs,
    }),
    gate('frame.render-duration-p95', 'render-duration-p95-ms', LTE, renderDurationP95Ms),
    gate('core.catch-up-share', 'core-catch-up-frame-share', LTE, catchUpShare),
    gate('core.dropped-time', 'dropped-core-time-ms', LTE, droppedCoreTimeMs),
    gate('render.draw-calls', 'resource-peak', LTE, 50, { field: 'drawCalls' }),
    gate('render.triangles', 'resource-peak', LTE, 30_000, { field: 'triangles' }),
    gate('render.programs', 'resource-peak', LTE, 16, { field: 'programs' }),
    gate('render.geometries', 'resource-peak', LTE, 128, { field: 'geometries' }),
    gate('render.textures', 'resource-peak', LTE, 64, { field: 'textures' }),
    gate('steady.geometries-growth', 'resource-tail-growth', LTE, 2, {
      field: 'geometries',
    }),
    gate('steady.textures-growth', 'resource-tail-growth', LTE, 1, {
      field: 'textures',
    }),
    gate('steady.programs-growth', 'resource-tail-growth', LTE, 1, {
      field: 'programs',
    }),
    gate('memory.js-heap-peak', 'resource-peak', LTE, 128 * 1024 * 1024, {
      field: 'jsHeapBytes',
    }, false),
    gate('memory.process-peak', 'resource-peak', LTE, 256 * 1024 * 1024, {
      field: 'processMemoryBytes',
    }, false),
    gate('memory.available-budget', 'memory-budget-ratio', LTE, 1, {
      maximumJsHeapBytes: 128 * 1024 * 1024,
      maximumProcessMemoryBytes: 256 * 1024 * 1024,
    }),
    gate('memory.tail-growth', 'memory-tail-growth-budget-ratio', LTE, 0.05, {
      maximumJsHeapBytes: 128 * 1024 * 1024,
      maximumProcessMemoryBytes: 256 * 1024 * 1024,
    }),
    gate('lifecycle.hide', 'lifecycle-counter', GTE, 1, { field: 'hideCount' }),
    gate('lifecycle.show', 'lifecycle-counter', GTE, 1, { field: 'showCount' }),
    gate('lifecycle.context-lost', 'lifecycle-counter', GTE, 1, {
      field: 'contextLostCount',
    }),
    gate('lifecycle.context-restored', 'lifecycle-counter', GTE, 1, {
      field: 'contextRestoredCount',
    }),
  ];
}

function target({ id, platform, deviceClass, osName, qualityId }) {
  const quality = ARENA_V1_PRESENTATION_QUALITY_REGISTRY.require(qualityId);
  const low = deviceClass === ARENA_PERFORMANCE_DEVICE_CLASS.LOW;
  return {
    id,
    platform,
    deviceClass,
    requiredOsNames: [osName],
    qualityDefinitionId: quality.id,
    qualityDefinitionHash: quality.getContentHash(),
    gates: commonGates(low ? {
      renderedFrames: 15_000,
      interactiveMs: 4_000,
      firstMatchMs: 2_000,
      frameIntervalP95Ms: 40,
      longFrameThresholdMs: 50,
      longFrameShare: 0.05,
      renderDurationP95Ms: 28,
      catchUpShare: 0.05,
      droppedCoreTimeMs: 250,
    } : {
      renderedFrames: 30_000,
      interactiveMs: 2_500,
      firstMatchMs: 1_200,
      frameIntervalP95Ms: 20,
      longFrameThresholdMs: 100 / 3,
      longFrameShare: 0.01,
      renderDurationP95Ms: 14,
      catchUpShare: 0.02,
      droppedCoreTimeMs: 100,
    }),
  };
}

export function createArenaStage9PerformanceV1Policy() {
  return createArenaPerformancePolicyDefinition({
    schemaVersion: ARENA_PERFORMANCE_POLICY_SCHEMA_VERSION,
    id: ARENA_STAGE9_PERFORMANCE_V1_ID,
    stage: 'stage9.s9.4',
    contentVersion: 1,
    targets: [
      target({
        id: ARENA_STAGE9_PERFORMANCE_TARGET_ID.DOUYIN_LOW,
        platform: ARENA_DEVICE_ACCEPTANCE_PLATFORM.DOUYIN,
        deviceClass: ARENA_PERFORMANCE_DEVICE_CLASS.LOW,
        osName: 'Android',
        qualityId: ARENA_V1_PRESENTATION_QUALITY_ID.LOW,
      }),
      target({
        id: ARENA_STAGE9_PERFORMANCE_TARGET_ID.DOUYIN_MAINSTREAM,
        platform: ARENA_DEVICE_ACCEPTANCE_PLATFORM.DOUYIN,
        deviceClass: ARENA_PERFORMANCE_DEVICE_CLASS.MAINSTREAM,
        osName: 'iOS',
        qualityId: ARENA_V1_PRESENTATION_QUALITY_ID.HIGH,
      }),
      target({
        id: ARENA_STAGE9_PERFORMANCE_TARGET_ID.WECHAT_LOW,
        platform: ARENA_DEVICE_ACCEPTANCE_PLATFORM.WECHAT,
        deviceClass: ARENA_PERFORMANCE_DEVICE_CLASS.LOW,
        osName: 'Android',
        qualityId: ARENA_V1_PRESENTATION_QUALITY_ID.LOW,
      }),
      target({
        id: ARENA_STAGE9_PERFORMANCE_TARGET_ID.WECHAT_MAINSTREAM,
        platform: ARENA_DEVICE_ACCEPTANCE_PLATFORM.WECHAT,
        deviceClass: ARENA_PERFORMANCE_DEVICE_CLASS.MAINSTREAM,
        osName: 'iOS',
        qualityId: ARENA_V1_PRESENTATION_QUALITY_ID.HIGH,
      }),
      target({
        id: ARENA_STAGE9_PERFORMANCE_TARGET_ID.WEB_LOW,
        platform: ARENA_DEVICE_ACCEPTANCE_PLATFORM.WEB,
        deviceClass: ARENA_PERFORMANCE_DEVICE_CLASS.LOW,
        osName: 'Android',
        qualityId: ARENA_V1_PRESENTATION_QUALITY_ID.LOW,
      }),
      target({
        id: ARENA_STAGE9_PERFORMANCE_TARGET_ID.WEB_MAINSTREAM,
        platform: ARENA_DEVICE_ACCEPTANCE_PLATFORM.WEB,
        deviceClass: ARENA_PERFORMANCE_DEVICE_CLASS.MAINSTREAM,
        osName: 'iOS',
        qualityId: ARENA_V1_PRESENTATION_QUALITY_ID.HIGH,
      }),
    ],
  });
}
