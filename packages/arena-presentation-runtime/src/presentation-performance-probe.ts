import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';

export const PRESENTATION_PERFORMANCE_PROBE_SCHEMA_VERSION = 1 as const;

const OPTION_KEYS = new Set([
  'maximumFrameSamples',
  'maximumResourceSamples',
  'resourceSampleIntervalFrames',
]);
const FRAME_KEYS = new Set([
  'timestampMs', 'deltaSeconds', 'coreSteps', 'droppedSeconds',
  'rendered', 'renderDurationMs', 'resources',
]);
const RESOURCE_KEYS = new Set([
  'drawCalls', 'triangles', 'points', 'lines', 'programs',
  'geometries', 'textures', 'jsHeapBytes', 'processMemoryBytes',
]);

type ProbeState = 'created' | 'destroyed' | 'running' | 'stopped';

interface FrameRecord {
  readonly sequence: number;
  readonly elapsedMs: number;
  readonly deltaMicroseconds: number;
  readonly coreSteps: number;
  readonly droppedMicroseconds: number;
  readonly rendered: boolean;
  readonly renderDurationMicroseconds: number | null;
}

interface ResourceRecord {
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

function inputRecord(value: unknown, keys: ReadonlySet<string>, name: string): PlainRecord {
  const source = cloneFrozenData(value, name);
  assertKnownKeys(source, keys, name);
  return assertPlainRecord(source, name);
}

function optionalData(record: PlainRecord, key: string): unknown {
  return Object.getOwnPropertyDescriptor(record, key)?.value;
}

function finiteAtLeast(value: unknown, minimum: number, name: string): number {
  if (!Number.isFinite(value) || (value as number) < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的有限数。`);
  }
  return value as number;
}

function nullableFiniteAtLeast(value: unknown, minimum: number, name: string): number | null {
  return value === null ? null : finiteAtLeast(value, minimum, name);
}

function nullableInteger(value: unknown, name: string): number | null {
  return value === null ? null : assertIntegerAtLeast(value, 0, name);
}

function roundedSafeInteger(value: number, multiplier: number, name: string): number {
  const result = Math.round(value * multiplier);
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new RangeError(`${name} 换算后必须是非负安全整数。`);
  }
  return result;
}

function cloneResources(value: unknown, name: string): Omit<ResourceRecord, 'elapsedMs' | 'frameSequence'> | null {
  if (value === null) return null;
  // recordFrame already cloned the complete caller-owned frame. Revalidate the
  // trusted nested copy without cloning it a second time on the sampling path.
  assertKnownKeys(value, RESOURCE_KEYS, name);
  const source = assertPlainRecord(value, name);
  return Object.freeze({
    drawCalls: nullableInteger(optionalData(source, 'drawCalls') ?? null, `${name}.drawCalls`),
    triangles: nullableInteger(optionalData(source, 'triangles') ?? null, `${name}.triangles`),
    points: nullableInteger(optionalData(source, 'points') ?? null, `${name}.points`),
    lines: nullableInteger(optionalData(source, 'lines') ?? null, `${name}.lines`),
    programs: nullableInteger(optionalData(source, 'programs') ?? null, `${name}.programs`),
    geometries: nullableInteger(optionalData(source, 'geometries') ?? null, `${name}.geometries`),
    textures: nullableInteger(optionalData(source, 'textures') ?? null, `${name}.textures`),
    jsHeapBytes: nullableInteger(optionalData(source, 'jsHeapBytes') ?? null, `${name}.jsHeapBytes`),
    processMemoryBytes: nullableInteger(
      optionalData(source, 'processMemoryBytes') ?? null,
      `${name}.processMemoryBytes`,
    ),
  });
}

export interface PresentationPerformanceProbeOptions {
  readonly maximumFrameSamples?: number;
  readonly maximumResourceSamples?: number;
  readonly resourceSampleIntervalFrames?: number;
}

function normalizeOptions(value: unknown): Required<PresentationPerformanceProbeOptions> {
  if (value === undefined) {
    return Object.freeze({
      maximumFrameSamples: 100_000,
      maximumResourceSamples: 10_000,
      resourceSampleIntervalFrames: 60,
    });
  }
  const source = inputRecord(value, OPTION_KEYS, 'PresentationPerformanceProbe options');
  const maximumFrameSamples = assertIntegerAtLeast(
    optionalData(source, 'maximumFrameSamples') ?? 100_000,
    1,
    'PresentationPerformanceProbe.maximumFrameSamples',
  );
  if (maximumFrameSamples > 1_000_000) {
    throw new RangeError('PresentationPerformanceProbe.maximumFrameSamples 不能超过 1000000。');
  }
  const maximumResourceSamples = assertIntegerAtLeast(
    optionalData(source, 'maximumResourceSamples') ?? 10_000,
    1,
    'PresentationPerformanceProbe.maximumResourceSamples',
  );
  if (maximumResourceSamples > 100_000) {
    throw new RangeError('PresentationPerformanceProbe.maximumResourceSamples 不能超过 100000。');
  }
  return Object.freeze({
    maximumFrameSamples,
    maximumResourceSamples,
    resourceSampleIntervalFrames: assertIntegerAtLeast(
      optionalData(source, 'resourceSampleIntervalFrames') ?? 60,
      1,
      'PresentationPerformanceProbe.resourceSampleIntervalFrames',
    ),
  });
}

export class PresentationPerformanceProbe {
  readonly #maximumFrameSamples: number;
  readonly #maximumResourceSamples: number;
  readonly #resourceSampleIntervalFrames: number;
  #state: ProbeState = 'created';
  #startedAtMs: number | null = null;
  #endedAtMs: number | null = null;
  #lastTimestampMs: number | null = null;
  #frames: FrameRecord[] = [];
  #resources: ResourceRecord[] = [];
  readonly #milestones = new Map<string, number>();
  #droppedFrameSampleCount = 0;
  #droppedResourceSampleCount = 0;
  #frameSequence = 0;

  constructor(options?: PresentationPerformanceProbeOptions) {
    const normalized = normalizeOptions(options);
    this.#maximumFrameSamples = normalized.maximumFrameSamples;
    this.#maximumResourceSamples = normalized.maximumResourceSamples;
    this.#resourceSampleIntervalFrames = normalized.resourceSampleIntervalFrames;
  }

  start(timestampMs: number): boolean {
    if (this.#state === 'destroyed') throw new Error('PresentationPerformanceProbe 已销毁。');
    if (this.#state === 'running') return false;
    if (this.#state !== 'created') throw new Error(`无法从 ${this.#state} 启动 Probe。`);
    const timestamp = finiteAtLeast(timestampMs, 0, 'PresentationPerformanceProbe.timestampMs');
    this.#startedAtMs = timestamp;
    this.#lastTimestampMs = timestamp;
    this.#state = 'running';
    return true;
  }

  #assertRunning(): void {
    if (this.#state !== 'running') {
      throw new Error(`PresentationPerformanceProbe 当前不是 running：${this.#state}。`);
    }
  }

  #relativeTimestamp(timestampMs: number, name: string): number {
    const timestamp = finiteAtLeast(timestampMs, 0, name);
    if (this.#lastTimestampMs === null || this.#startedAtMs === null) {
      throw new Error('PresentationPerformanceProbe 缺少运行时钟。');
    }
    if (timestamp < this.#lastTimestampMs) throw new RangeError(`${name} 不能倒退。`);
    this.#lastTimestampMs = timestamp;
    return timestamp - this.#startedAtMs;
  }

  markMilestone(id: string, timestampMs: number): boolean {
    this.#assertRunning();
    const milestoneId = assertNonEmptyString(id, 'PresentationPerformanceProbe.milestoneId');
    if (this.#milestones.has(milestoneId)) return false;
    this.#milestones.set(
      milestoneId,
      this.#relativeTimestamp(timestampMs, 'PresentationPerformanceProbe.milestoneTimestampMs'),
    );
    return true;
  }

  shouldSampleResources(): boolean {
    this.#assertRunning();
    const nextFrameSequence = this.#frameSequence + 1;
    if (!Number.isSafeInteger(nextFrameSequence)) {
      throw new RangeError('PresentationPerformanceProbe observedFrameCount 已达到安全上限。');
    }
    return this.#resources.length === 0
      || nextFrameSequence % this.#resourceSampleIntervalFrames === 0;
  }

  recordFrame(value: unknown): void {
    this.#assertRunning();
    const source = inputRecord(value, FRAME_KEYS, 'PresentationPerformanceProbe.frame');
    const timestampMs = finiteAtLeast(
      optionalData(source, 'timestampMs'),
      0,
      'PresentationPerformanceProbe.frame.timestampMs',
    );
    if (this.#lastTimestampMs === null || this.#startedAtMs === null) {
      throw new Error('PresentationPerformanceProbe 缺少运行时钟。');
    }
    if (timestampMs < this.#lastTimestampMs) {
      throw new RangeError('PresentationPerformanceProbe.frame.timestampMs 不能倒退。');
    }
    const elapsedMs = timestampMs - this.#startedAtMs;
    const deltaSeconds = finiteAtLeast(
      optionalData(source, 'deltaSeconds'), 0, 'PresentationPerformanceProbe.frame.deltaSeconds',
    );
    const coreSteps = assertIntegerAtLeast(
      optionalData(source, 'coreSteps'), 0, 'PresentationPerformanceProbe.frame.coreSteps',
    );
    const droppedSeconds = finiteAtLeast(
      optionalData(source, 'droppedSeconds'), 0, 'PresentationPerformanceProbe.frame.droppedSeconds',
    );
    const rendered = optionalData(source, 'rendered');
    if (typeof rendered !== 'boolean') {
      throw new TypeError('PresentationPerformanceProbe.frame.rendered 必须是布尔值。');
    }
    const renderDurationMs = nullableFiniteAtLeast(
      optionalData(source, 'renderDurationMs'),
      0,
      'PresentationPerformanceProbe.frame.renderDurationMs',
    );
    if (!rendered && renderDurationMs !== null) {
      throw new RangeError('未渲染帧不能包含 renderDurationMs。');
    }
    const resources = cloneResources(
      optionalData(source, 'resources') ?? null,
      'PresentationPerformanceProbe.frame.resources',
    );
    const deltaMicroseconds = roundedSafeInteger(
      deltaSeconds, 1_000_000, 'PresentationPerformanceProbe.frame.deltaSeconds',
    );
    const droppedMicroseconds = roundedSafeInteger(
      droppedSeconds, 1_000_000, 'PresentationPerformanceProbe.frame.droppedSeconds',
    );
    const renderDurationMicroseconds = renderDurationMs === null
      ? null
      : roundedSafeInteger(
        renderDurationMs, 1_000, 'PresentationPerformanceProbe.frame.renderDurationMs',
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
        rendered,
        renderDurationMicroseconds,
      }));
    } else {
      this.#droppedFrameSampleCount += 1;
    }
    if (samplesResources) {
      if (recordsResources) {
        this.#resources.push(Object.freeze({ frameSequence, elapsedMs, ...resources! }));
      } else {
        this.#droppedResourceSampleCount += 1;
      }
    }
  }

  stop(timestampMs: number): boolean {
    if (this.#state === 'destroyed') throw new Error('PresentationPerformanceProbe 已销毁。');
    if (this.#state === 'stopped') return false;
    this.#assertRunning();
    const endedAtMs = finiteAtLeast(
      timestampMs,
      this.#lastTimestampMs!,
      'PresentationPerformanceProbe.stopTimestampMs',
    );
    this.#endedAtMs = endedAtMs;
    this.#lastTimestampMs = endedAtMs;
    this.#state = 'stopped';
    return true;
  }

  getSnapshot(): Readonly<Record<string, unknown>> {
    const milestones = [...this.#milestones]
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([id, elapsedMs]) => Object.freeze({ id, elapsedMs }));
    return cloneFrozenData({
      schemaVersion: PRESENTATION_PERFORMANCE_PROBE_SCHEMA_VERSION,
      state: this.#state,
      durationMs: this.#startedAtMs === null
        ? 0
        : (this.#endedAtMs ?? this.#lastTimestampMs!) - this.#startedAtMs,
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

  destroy(): void {
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
