import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceGitCommit,
  assertEvidenceUtcInstant,
} from '@number-strategy-jump/arena-evidence-contracts';
import { createArenaPerformancePolicyDefinition } from './arena-performance-policy-definition.js';
import type { ArenaPerformanceTargetDefinition } from './arena-performance-policy-definition.js';

export const ARENA_PERFORMANCE_RECORD_SCHEMA_VERSION = 1;

export interface ArenaPerformanceLifecycleCapture {
  readonly hideCount: number;
  readonly showCount: number;
  readonly contextLostCount: number;
  readonly contextRestoredCount: number;
}

export interface ArenaPerformanceMilestone {
  readonly id: string;
  readonly elapsedMs: number;
}

export interface ArenaPerformanceFrameSample {
  readonly sequence: number;
  readonly elapsedMs: number;
  readonly deltaMicroseconds: number;
  readonly coreSteps: number;
  readonly droppedMicroseconds: number;
  readonly rendered: boolean;
  readonly renderDurationMicroseconds: number | null;
}

export interface ArenaPerformanceResourceSample {
  readonly frameSequence: number;
  readonly elapsedMs: number;
  readonly drawCalls: number | null;
  readonly triangles: number | null;
  readonly points: number | null;
  readonly lines: number | null;
  readonly programs: number | null;
  readonly geometries: number | null;
  readonly textures: number | null;
  readonly jsHeapBytes: number | null;
  readonly processMemoryBytes: number | null;
}

export interface ArenaPerformanceProbeCapture {
  readonly schemaVersion: 1;
  readonly state: 'stopped';
  readonly durationMs: number;
  readonly maximumFrameSamples: number;
  readonly maximumResourceSamples: number;
  readonly resourceSampleIntervalFrames: number;
  readonly observedFrameCount: number;
  readonly recordedFrameCount: number;
  readonly droppedFrameSampleCount: number;
  readonly droppedResourceSampleCount: number;
  readonly milestones: readonly ArenaPerformanceMilestone[];
  readonly frames: readonly ArenaPerformanceFrameSample[];
  readonly resources: readonly ArenaPerformanceResourceSample[];
}

export interface ArenaPerformanceCapture {
  readonly qualityDefinitionId: string;
  readonly qualityDefinitionHash: string;
  readonly observerErrorCount: number;
  readonly observedMatchCount: number;
  readonly lifecycle: ArenaPerformanceLifecycleCapture;
  readonly probe: ArenaPerformanceProbeCapture;
}

export interface ArenaPerformanceRecord {
  readonly schemaVersion: typeof ARENA_PERFORMANCE_RECORD_SCHEMA_VERSION;
  readonly recordId: string;
  readonly policyId: string;
  readonly policyHash: string;
  readonly commit: string;
  readonly buildId: string;
  readonly targetId: string;
  readonly runId: string;
  readonly performedAt: string;
  readonly capture: ArenaPerformanceCapture;
}

const RECORD_KEYS = new Set([
  'schemaVersion',
  'recordId',
  'policyId',
  'policyHash',
  'commit',
  'buildId',
  'targetId',
  'runId',
  'performedAt',
  'capture',
]);
const CAPTURE_KEYS = new Set([
  'qualityDefinitionId',
  'qualityDefinitionHash',
  'observerErrorCount',
  'observedMatchCount',
  'lifecycle',
  'probe',
]);
const LIFECYCLE_KEYS = new Set([
  'hideCount',
  'showCount',
  'contextLostCount',
  'contextRestoredCount',
]);
const PROBE_KEYS = new Set([
  'schemaVersion',
  'state',
  'durationMs',
  'maximumFrameSamples',
  'maximumResourceSamples',
  'resourceSampleIntervalFrames',
  'observedFrameCount',
  'recordedFrameCount',
  'droppedFrameSampleCount',
  'droppedResourceSampleCount',
  'milestones',
  'frames',
  'resources',
]);
const MILESTONE_KEYS = new Set(['id', 'elapsedMs']);
const FRAME_KEYS = new Set([
  'sequence',
  'elapsedMs',
  'deltaMicroseconds',
  'coreSteps',
  'droppedMicroseconds',
  'rendered',
  'renderDurationMicroseconds',
]);
const RESOURCE_KEYS = new Set([
  'frameSequence',
  'elapsedMs',
  'drawCalls',
  'triangles',
  'points',
  'lines',
  'programs',
  'geometries',
  'textures',
  'jsHeapBytes',
  'processMemoryBytes',
]);
const HASH_PATTERN = /^[0-9a-f]{8}$/;
const MAXIMUM_FRAMES = 1_000_000;
const MAXIMUM_RESOURCES = 100_000;
const MAXIMUM_MILESTONES = 128;

function boundedString(value: unknown, maximumLength: number, name: string): string {
  const text = assertNonEmptyString(value, name);
  if (text.length > maximumLength) throw new RangeError(`${name} 不能超过 ${maximumLength} 字符。`);
  return text;
}

function hashValue(value: unknown, name: string): string {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name} 必须是 8 位小写十六进制 hash。`);
  }
  return value;
}

function finiteAtLeast(value: unknown, minimum: number, name: string): number {
  if (!Number.isFinite(value) || (value as number) < minimum) {
    throw new RangeError(`${name} 必须大于等于 ${minimum}。`);
  }
  return value as number;
}

function nullableInteger(value: unknown, name: string): number | null {
  return value === null ? null : assertIntegerAtLeast(value, 0, name);
}

function cloneLifecycle(value: unknown): ArenaPerformanceLifecycleCapture {
  assertKnownKeys(value, LIFECYCLE_KEYS, 'ArenaPerformanceRecord.capture.lifecycle');
  return Object.freeze({
    hideCount: assertIntegerAtLeast(value.hideCount, 0, 'ArenaPerformanceRecord.capture.lifecycle.hideCount'),
    showCount: assertIntegerAtLeast(value.showCount, 0, 'ArenaPerformanceRecord.capture.lifecycle.showCount'),
    contextLostCount: assertIntegerAtLeast(
      value.contextLostCount,
      0,
      'ArenaPerformanceRecord.capture.lifecycle.contextLostCount',
    ),
    contextRestoredCount: assertIntegerAtLeast(
      value.contextRestoredCount,
      0,
      'ArenaPerformanceRecord.capture.lifecycle.contextRestoredCount',
    ),
  });
}

function cloneMilestones(values: unknown, durationMs: number): readonly ArenaPerformanceMilestone[] {
  if (!Array.isArray(values)) throw new TypeError('performance milestones 必须是数组。');
  if (values.length > MAXIMUM_MILESTONES) {
    throw new RangeError(`performance milestones 不能超过 ${MAXIMUM_MILESTONES} 项。`);
  }
  const ids = new Set<string>();
  return Object.freeze(values.map((value: unknown, index): ArenaPerformanceMilestone => {
    const name = `performance milestones[${index}]`;
    assertKnownKeys(value, MILESTONE_KEYS, name);
    const id = boundedString(value.id, 128, `${name}.id`);
    if (ids.has(id)) throw new RangeError(`重复 performance milestone ${id}。`);
    ids.add(id);
    const elapsedMs = finiteAtLeast(value.elapsedMs, 0, `${name}.elapsedMs`);
    if (elapsedMs > durationMs) throw new RangeError(`${name}.elapsedMs 超过 capture duration。`);
    return Object.freeze({ id, elapsedMs });
  }).sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)));
}

function cloneFrames(
  values: unknown,
  durationMs: number,
  recordedFrameCount: number,
): readonly ArenaPerformanceFrameSample[] {
  if (!Array.isArray(values) || values.length !== recordedFrameCount) {
    throw new RangeError('performance frames 数量与 recordedFrameCount 不一致。');
  }
  if (values.length > MAXIMUM_FRAMES) throw new RangeError('performance frames 过多。');
  let previousElapsed = -1;
  return Object.freeze(values.map((value: unknown, index): ArenaPerformanceFrameSample => {
    const name = `performance frames[${index}]`;
    assertKnownKeys(value, FRAME_KEYS, name);
    const sequence = assertIntegerAtLeast(value.sequence, 1, `${name}.sequence`);
    if (sequence !== index + 1) throw new RangeError(`${name}.sequence 必须严格连续。`);
    const elapsedMs = finiteAtLeast(value.elapsedMs, 0, `${name}.elapsedMs`);
    if (elapsedMs < previousElapsed || elapsedMs > durationMs) {
      throw new RangeError(`${name}.elapsedMs 必须单调且不超过 duration。`);
    }
    previousElapsed = elapsedMs;
    if (typeof value.rendered !== 'boolean') throw new TypeError(`${name}.rendered 必须是布尔值。`);
    const renderDurationMicroseconds = nullableInteger(
      value.renderDurationMicroseconds,
      `${name}.renderDurationMicroseconds`,
    );
    if (!value.rendered && renderDurationMicroseconds !== null) {
      throw new RangeError(`${name} 未渲染时不能记录 render duration。`);
    }
    return Object.freeze({
      sequence,
      elapsedMs,
      deltaMicroseconds: assertIntegerAtLeast(
        value.deltaMicroseconds,
        0,
        `${name}.deltaMicroseconds`,
      ),
      coreSteps: assertIntegerAtLeast(value.coreSteps, 0, `${name}.coreSteps`),
      droppedMicroseconds: assertIntegerAtLeast(
        value.droppedMicroseconds,
        0,
        `${name}.droppedMicroseconds`,
      ),
      rendered: value.rendered,
      renderDurationMicroseconds,
    });
  }));
}

function cloneResources(
  values: unknown,
  durationMs: number,
  observedFrameCount: number,
): readonly ArenaPerformanceResourceSample[] {
  if (!Array.isArray(values)) throw new TypeError('performance resources 必须是数组。');
  if (values.length > MAXIMUM_RESOURCES) throw new RangeError('performance resources 过多。');
  let previousSequence = 0;
  let previousElapsed = -1;
  return Object.freeze(values.map((value: unknown, index): ArenaPerformanceResourceSample => {
    const name = `performance resources[${index}]`;
    assertKnownKeys(value, RESOURCE_KEYS, name);
    const frameSequence = assertIntegerAtLeast(value.frameSequence, 1, `${name}.frameSequence`);
    if (frameSequence <= previousSequence || frameSequence > observedFrameCount) {
      throw new RangeError(`${name}.frameSequence 必须严格递增且属于 capture。`);
    }
    previousSequence = frameSequence;
    const elapsedMs = finiteAtLeast(value.elapsedMs, 0, `${name}.elapsedMs`);
    if (elapsedMs < previousElapsed || elapsedMs > durationMs) {
      throw new RangeError(`${name}.elapsedMs 必须单调且不超过 duration。`);
    }
    previousElapsed = elapsedMs;
    return Object.freeze({
      frameSequence,
      elapsedMs,
      drawCalls: nullableInteger(value.drawCalls, `${name}.drawCalls`),
      triangles: nullableInteger(value.triangles, `${name}.triangles`),
      points: nullableInteger(value.points, `${name}.points`),
      lines: nullableInteger(value.lines, `${name}.lines`),
      programs: nullableInteger(value.programs, `${name}.programs`),
      geometries: nullableInteger(value.geometries, `${name}.geometries`),
      textures: nullableInteger(value.textures, `${name}.textures`),
      jsHeapBytes: nullableInteger(value.jsHeapBytes, `${name}.jsHeapBytes`),
      processMemoryBytes: nullableInteger(
        value.processMemoryBytes,
        `${name}.processMemoryBytes`,
      ),
    });
  }));
}

function cloneProbe(value: unknown): ArenaPerformanceProbeCapture {
  assertKnownKeys(value, PROBE_KEYS, 'ArenaPerformanceRecord.capture.probe');
  if (value.schemaVersion !== 1) throw new RangeError('只接受 performance probe schema 1。');
  if (value.state !== 'stopped') throw new RangeError('performance capture 必须先停止。');
  const durationMs = finiteAtLeast(value.durationMs, 0, 'performance probe.durationMs');
  const maximumFrameSamples = assertIntegerAtLeast(
    value.maximumFrameSamples,
    1,
    'performance probe.maximumFrameSamples',
  );
  if (maximumFrameSamples > MAXIMUM_FRAMES) {
    throw new RangeError(`maximumFrameSamples 不能超过 ${MAXIMUM_FRAMES}。`);
  }
  const maximumResourceSamples = assertIntegerAtLeast(
    value.maximumResourceSamples,
    1,
    'performance probe.maximumResourceSamples',
  );
  if (maximumResourceSamples > MAXIMUM_RESOURCES) {
    throw new RangeError(`maximumResourceSamples 不能超过 ${MAXIMUM_RESOURCES}。`);
  }
  const observedFrameCount = assertIntegerAtLeast(
    value.observedFrameCount,
    0,
    'performance probe.observedFrameCount',
  );
  const recordedFrameCount = assertIntegerAtLeast(
    value.recordedFrameCount,
    0,
    'performance probe.recordedFrameCount',
  );
  const droppedFrameSampleCount = assertIntegerAtLeast(
    value.droppedFrameSampleCount,
    0,
    'performance probe.droppedFrameSampleCount',
  );
  if (recordedFrameCount > maximumFrameSamples) {
    throw new RangeError('recordedFrameCount 超过 maximumFrameSamples。');
  }
  const accountedFrameCount = recordedFrameCount + droppedFrameSampleCount;
  if (
    !Number.isSafeInteger(accountedFrameCount)
    || observedFrameCount !== accountedFrameCount
  ) {
    throw new RangeError('observedFrameCount 必须等于 recorded + dropped。');
  }
  const resources = cloneResources(value.resources, durationMs, observedFrameCount);
  if (resources.length > maximumResourceSamples) {
    throw new RangeError('resource samples 超过 maximumResourceSamples。');
  }
  return Object.freeze({
    schemaVersion: 1,
    state: 'stopped',
    durationMs,
    maximumFrameSamples,
    maximumResourceSamples,
    resourceSampleIntervalFrames: assertIntegerAtLeast(
      value.resourceSampleIntervalFrames,
      1,
      'performance probe.resourceSampleIntervalFrames',
    ),
    observedFrameCount,
    recordedFrameCount,
    droppedFrameSampleCount,
    droppedResourceSampleCount: assertIntegerAtLeast(
      value.droppedResourceSampleCount,
      0,
      'performance probe.droppedResourceSampleCount',
    ),
    milestones: cloneMilestones(value.milestones, durationMs),
    frames: cloneFrames(value.frames, durationMs, recordedFrameCount),
    resources,
  });
}

function cloneCapture(value: unknown, target: ArenaPerformanceTargetDefinition): ArenaPerformanceCapture {
  assertKnownKeys(value, CAPTURE_KEYS, 'ArenaPerformanceRecord.capture');
  const qualityDefinitionId = boundedString(
    value.qualityDefinitionId,
    128,
    'ArenaPerformanceRecord.capture.qualityDefinitionId',
  );
  const qualityDefinitionHash = hashValue(
    value.qualityDefinitionHash,
    'ArenaPerformanceRecord.capture.qualityDefinitionHash',
  );
  if (
    qualityDefinitionId !== target.qualityDefinitionId
    || qualityDefinitionHash !== target.qualityDefinitionHash
  ) throw new RangeError(`target ${target.id} 使用了错误的表现质量 Definition。`);
  return Object.freeze({
    qualityDefinitionId,
    qualityDefinitionHash,
    observerErrorCount: assertIntegerAtLeast(
      value.observerErrorCount,
      0,
      'ArenaPerformanceRecord.capture.observerErrorCount',
    ),
    observedMatchCount: assertIntegerAtLeast(
      value.observedMatchCount,
      0,
      'ArenaPerformanceRecord.capture.observedMatchCount',
    ),
    lifecycle: cloneLifecycle(value.lifecycle),
    probe: cloneProbe(value.probe),
  });
}

export function createArenaPerformanceRecord(
  policyValue: unknown,
  value: unknown,
): ArenaPerformanceRecord {
  const policy = createArenaPerformancePolicyDefinition(policyValue);
  const source = cloneFrozenData(value, 'ArenaPerformanceRecord');
  assertKnownKeys(source, RECORD_KEYS, 'ArenaPerformanceRecord');
  if (source.schemaVersion !== ARENA_PERFORMANCE_RECORD_SCHEMA_VERSION) {
    throw new RangeError(`不支持 ArenaPerformanceRecord schema ${String(source.schemaVersion)}。`);
  }
  if (source.policyId !== policy.id || source.policyHash !== policy.getContentHash()) {
    throw new RangeError('ArenaPerformanceRecord Policy 身份不一致。');
  }
  const commit = assertEvidenceGitCommit(source.commit, 'ArenaPerformanceRecord.commit');
  const targetId = boundedString(source.targetId, 128, 'ArenaPerformanceRecord.targetId');
  const target = policy.getTarget(targetId);
  if (!target) throw new RangeError(`未知 performance target ${targetId}。`);
  return Object.freeze({
    schemaVersion: ARENA_PERFORMANCE_RECORD_SCHEMA_VERSION,
    recordId: boundedString(source.recordId, 128, 'ArenaPerformanceRecord.recordId'),
    policyId: policy.id,
    policyHash: policy.getContentHash(),
    commit,
    buildId: boundedString(source.buildId, 128, 'ArenaPerformanceRecord.buildId'),
    targetId,
    runId: boundedString(source.runId, 128, 'ArenaPerformanceRecord.runId'),
    performedAt: assertEvidenceUtcInstant(
      source.performedAt,
      'ArenaPerformanceRecord.performedAt',
    ),
    capture: cloneCapture(source.capture, target),
  });
}

export function getArenaPerformanceRecordHash(policyValue: unknown, value: unknown): string {
  return createDeterministicDataHash(
    createArenaPerformanceRecord(policyValue, value),
    'ArenaPerformanceRecord',
  );
}
