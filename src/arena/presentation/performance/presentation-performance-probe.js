import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const PRESENTATION_PERFORMANCE_PROBE_SCHEMA_VERSION = 1;

const FRAME_KEYS = new Set([
  'timestampMs',
  'deltaSeconds',
  'coreSteps',
  'droppedSeconds',
  'rendered',
  'renderDurationMs',
  'resources',
]);
const RESOURCE_KEYS = new Set([
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

function finiteAtLeast(value, minimum, name) {
  if (!Number.isFinite(value) || value < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的有限数。`);
  }
  return value;
}

function nullableFiniteAtLeast(value, minimum, name) {
  return value === null ? null : finiteAtLeast(value, minimum, name);
}

function nullableInteger(value, name) {
  return value === null ? null : assertIntegerAtLeast(value, 0, name);
}

function roundedSafeInteger(value, multiplier, name) {
  const result = Math.round(value * multiplier);
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new RangeError(`${name} 换算后必须是非负安全整数。`);
  }
  return result;
}

function cloneResources(value, name) {
  if (value === null) return null;
  assertKnownKeys(value, RESOURCE_KEYS, name);
  const result = {};
  for (const key of RESOURCE_KEYS) {
    result[key] = nullableInteger(value[key] ?? null, `${name}.${key}`);
  }
  return Object.freeze(result);
}

export class PresentationPerformanceProbe {
  #maximumFrameSamples;
  #maximumResourceSamples;
  #resourceSampleIntervalFrames;
  #state;
  #startedAtMs;
  #endedAtMs;
  #lastTimestampMs;
  #frames;
  #resources;
  #milestones;
  #droppedFrameSampleCount;
  #droppedResourceSampleCount;
  #frameSequence;

  constructor({
    maximumFrameSamples = 100_000,
    maximumResourceSamples = 10_000,
    resourceSampleIntervalFrames = 60,
  } = {}) {
    this.#maximumFrameSamples = assertIntegerAtLeast(
      maximumFrameSamples,
      1,
      'PresentationPerformanceProbe.maximumFrameSamples',
    );
    if (this.#maximumFrameSamples > 1_000_000) {
      throw new RangeError('PresentationPerformanceProbe.maximumFrameSamples 不能超过 1000000。');
    }
    this.#maximumResourceSamples = assertIntegerAtLeast(
      maximumResourceSamples,
      1,
      'PresentationPerformanceProbe.maximumResourceSamples',
    );
    if (this.#maximumResourceSamples > 100_000) {
      throw new RangeError('PresentationPerformanceProbe.maximumResourceSamples 不能超过 100000。');
    }
    this.#resourceSampleIntervalFrames = assertIntegerAtLeast(
      resourceSampleIntervalFrames,
      1,
      'PresentationPerformanceProbe.resourceSampleIntervalFrames',
    );
    this.#state = 'created';
    this.#startedAtMs = null;
    this.#endedAtMs = null;
    this.#lastTimestampMs = null;
    this.#frames = [];
    this.#resources = [];
    this.#milestones = new Map();
    this.#droppedFrameSampleCount = 0;
    this.#droppedResourceSampleCount = 0;
    this.#frameSequence = 0;
  }

  start(timestampMs) {
    if (this.#state === 'destroyed') throw new Error('PresentationPerformanceProbe 已销毁。');
    if (this.#state === 'running') return false;
    if (this.#state !== 'created') throw new Error(`无法从 ${this.#state} 启动 Probe。`);
    const timestamp = finiteAtLeast(timestampMs, 0, 'PresentationPerformanceProbe.timestampMs');
    this.#startedAtMs = timestamp;
    this.#lastTimestampMs = timestamp;
    this.#state = 'running';
    return true;
  }

  #assertRunning() {
    if (this.#state !== 'running') {
      throw new Error(`PresentationPerformanceProbe 当前不是 running：${this.#state}。`);
    }
  }

  #relativeTimestamp(timestampMs, name) {
    const timestamp = finiteAtLeast(timestampMs, 0, name);
    if (timestamp < this.#lastTimestampMs) {
      throw new RangeError(`${name} 不能倒退。`);
    }
    this.#lastTimestampMs = timestamp;
    return timestamp - this.#startedAtMs;
  }

  markMilestone(id, timestampMs) {
    this.#assertRunning();
    const milestoneId = assertNonEmptyString(id, 'PresentationPerformanceProbe.milestoneId');
    if (this.#milestones.has(milestoneId)) return false;
    this.#milestones.set(
      milestoneId,
      this.#relativeTimestamp(timestampMs, 'PresentationPerformanceProbe.milestoneTimestampMs'),
    );
    return true;
  }

  shouldSampleResources() {
    this.#assertRunning();
    const nextFrameSequence = this.#frameSequence + 1;
    return this.#resources.length === 0
      || nextFrameSequence % this.#resourceSampleIntervalFrames === 0;
  }

  recordFrame(value) {
    this.#assertRunning();
    assertKnownKeys(value, FRAME_KEYS, 'PresentationPerformanceProbe.frame');
    const timestampMs = finiteAtLeast(
      value.timestampMs,
      0,
      'PresentationPerformanceProbe.frame.timestampMs',
    );
    if (timestampMs < this.#lastTimestampMs) {
      throw new RangeError('PresentationPerformanceProbe.frame.timestampMs 不能倒退。');
    }
    const elapsedMs = timestampMs - this.#startedAtMs;
    const deltaSeconds = finiteAtLeast(
      value.deltaSeconds,
      0,
      'PresentationPerformanceProbe.frame.deltaSeconds',
    );
    const coreSteps = assertIntegerAtLeast(
      value.coreSteps,
      0,
      'PresentationPerformanceProbe.frame.coreSteps',
    );
    const droppedSeconds = finiteAtLeast(
      value.droppedSeconds,
      0,
      'PresentationPerformanceProbe.frame.droppedSeconds',
    );
    if (typeof value.rendered !== 'boolean') {
      throw new TypeError('PresentationPerformanceProbe.frame.rendered 必须是布尔值。');
    }
    const renderDurationMs = nullableFiniteAtLeast(
      value.renderDurationMs,
      0,
      'PresentationPerformanceProbe.frame.renderDurationMs',
    );
    if (!value.rendered && renderDurationMs !== null) {
      throw new RangeError('未渲染帧不能包含 renderDurationMs。');
    }
    const resources = cloneResources(
      value.resources ?? null,
      'PresentationPerformanceProbe.frame.resources',
    );
    const deltaMicroseconds = roundedSafeInteger(
      deltaSeconds,
      1_000_000,
      'PresentationPerformanceProbe.frame.deltaSeconds',
    );
    const droppedMicroseconds = roundedSafeInteger(
      droppedSeconds,
      1_000_000,
      'PresentationPerformanceProbe.frame.droppedSeconds',
    );
    const renderDurationMicroseconds = renderDurationMs === null
      ? null
      : roundedSafeInteger(
        renderDurationMs,
        1_000,
        'PresentationPerformanceProbe.frame.renderDurationMs',
      );
    const frameSequence = this.#frameSequence + 1;
    if (!Number.isSafeInteger(frameSequence)) {
      throw new RangeError('PresentationPerformanceProbe observedFrameCount 已达到安全上限。');
    }
    const recordsFrame = this.#frames.length < this.#maximumFrameSamples;
    const samplesResources = resources !== null && (
      this.#resources.length === 0
      || frameSequence % this.#resourceSampleIntervalFrames === 0
    );
    const recordsResources = samplesResources
      && this.#resources.length < this.#maximumResourceSamples;
    this.#lastTimestampMs = timestampMs;
    this.#frameSequence = frameSequence;
    if (recordsFrame) {
      this.#frames.push(Object.freeze({
        sequence: frameSequence,
        elapsedMs,
        deltaMicroseconds,
        coreSteps,
        droppedMicroseconds,
        rendered: value.rendered,
        renderDurationMicroseconds,
      }));
    } else {
      this.#droppedFrameSampleCount += 1;
    }
    if (samplesResources) {
      if (recordsResources) {
        this.#resources.push(Object.freeze({
          frameSequence,
          elapsedMs,
          ...resources,
        }));
      } else {
        this.#droppedResourceSampleCount += 1;
      }
    }
  }

  stop(timestampMs) {
    if (this.#state === 'destroyed') throw new Error('PresentationPerformanceProbe 已销毁。');
    if (this.#state === 'stopped') return false;
    this.#assertRunning();
    this.#endedAtMs = finiteAtLeast(
      timestampMs,
      this.#lastTimestampMs,
      'PresentationPerformanceProbe.stopTimestampMs',
    );
    this.#lastTimestampMs = this.#endedAtMs;
    this.#state = 'stopped';
    return true;
  }

  getSnapshot() {
    const milestones = [...this.#milestones]
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([id, elapsedMs]) => Object.freeze({ id, elapsedMs }));
    return cloneFrozenData({
      schemaVersion: PRESENTATION_PERFORMANCE_PROBE_SCHEMA_VERSION,
      state: this.#state,
      durationMs: this.#startedAtMs === null
        ? 0
        : (this.#endedAtMs ?? this.#lastTimestampMs) - this.#startedAtMs,
      maximumFrameSamples: this.#maximumFrameSamples,
      maximumResourceSamples: this.#maximumResourceSamples,
      resourceSampleIntervalFrames: this.#resourceSampleIntervalFrames,
      observedFrameCount: this.#frameSequence,
      recordedFrameCount: this.#frames.length,
      droppedFrameSampleCount: this.#droppedFrameSampleCount,
      droppedResourceSampleCount: this.#droppedResourceSampleCount,
      milestones,
      frames: this.#frames,
      resources: this.#resources,
    }, 'PresentationPerformanceProbe snapshot');
  }

  destroy() {
    if (this.#state === 'destroyed') return;
    this.#state = 'destroyed';
    this.#frames = [];
    this.#resources = [];
    this.#milestones.clear();
    this.#droppedFrameSampleCount = 0;
    this.#droppedResourceSampleCount = 0;
    this.#frameSequence = 0;
  }
}
