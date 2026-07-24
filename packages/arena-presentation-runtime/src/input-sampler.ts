import {
  combineCleanupFailure,
  normalizeInputFrame,
  normalizeThrownError,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  copyMapperActionAffordance,
  createMappedSemanticInput,
} from './arena-input-mapper.js';
import { GestureRecognizer } from './gesture-recognizer.js';
import { cloneKnownRecord, integerAtLeast } from './input-validation.js';
import { RawControlState } from './raw-control-state.js';

interface InputMapperPort {
  readonly id: string;
  readonly map: (context: unknown) => unknown;
}

export interface InputSamplerDebugSnapshot {
  readonly participantId: string;
  readonly mapperId: string;
  readonly lastTick: number;
  readonly suspended: boolean;
  readonly sampling: boolean;
  readonly controls: ReturnType<RawControlState['getDebugSnapshot']>;
  readonly gestures: ReturnType<GestureRecognizer['getDebugSnapshot']>;
}

const OPTION_KEYS = new Set(['participantId', 'viewport', 'mapper', 'layout', 'gesture']);
const MAPPER_KEYS = new Set(['id', 'map']);
const SAMPLE_OPTION_KEYS = new Set(['actionAffordance']);

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  return value;
}

function mapperValue(value: unknown): InputMapperPort {
  const source = cloneKnownRecord(value, MAPPER_KEYS, 'InputSampler.mapper');
  const id = nonEmptyString(source.id, 'InputSampler.mapper.id');
  if (typeof source.map !== 'function') {
    throw new TypeError('InputSampler.mapper 必须实现 id/map。');
  }
  return Object.freeze({ id, map: source.map as (context: unknown) => unknown });
}

export class InputSampler {
  readonly #participantId: string;
  readonly #mapper: InputMapperPort;
  readonly #raw: RawControlState;
  readonly #gestures: GestureRecognizer;
  #lastTick: number;
  #suspended: boolean;
  #sampling: boolean;
  #reentryAttempted: boolean;
  #failure: Error | null;
  #destroyed: boolean;

  constructor(options: unknown) {
    const source = cloneKnownRecord(options, OPTION_KEYS, 'InputSampler options');
    const participantId = nonEmptyString(source.participantId, 'InputSampler.participantId');
    const mapper = mapperValue(source.mapper);
    let raw: RawControlState | null = null;
    try {
      raw = new RawControlState({ viewport: source.viewport, layout: source.layout ?? {} });
      const gestures = new GestureRecognizer(source.gesture ?? {});
      this.#participantId = participantId;
      this.#mapper = mapper;
      this.#raw = raw;
      this.#gestures = gestures;
    } catch (error) {
      const original = normalizeThrownError(error, 'InputSampler 构造失败');
      const cleanupErrors: Error[] = [];
      try { raw?.destroy(); } catch (cleanupError) {
        cleanupErrors.push(normalizeThrownError(
          cleanupError,
          'InputSampler RawControlState 回滚失败',
        ));
      }
      throw combineCleanupFailure(original, cleanupErrors, 'InputSampler 构造与回滚均失败。');
    }
    this.#lastTick = -1;
    this.#suspended = false;
    this.#sampling = false;
    this.#reentryAttempted = false;
    this.#failure = null;
    this.#destroyed = false;
    Object.freeze(this);
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('InputSampler 已销毁。');
    if (this.#failure) {
      const error = new Error('InputSampler 已因采样失败关闭。');
      error.cause = this.#failure;
      throw error;
    }
  }

  #assertNotSampling(operation: string): void {
    if (!this.#sampling) return;
    this.#reentryAttempted = true;
    throw new Error(`InputSampler.sample() 期间不能${operation}。`);
  }

  #fail(error: unknown): void {
    this.#failure = normalizeThrownError(error, 'InputSampler 采样失败');
    this.#suspended = true;
    try { this.#raw.suspend(); } catch { /* terminal failure already recorded */ }
    try { this.#gestures.reset(); } catch { /* terminal failure already recorded */ }
  }

  pointerStart(point: unknown): boolean {
    this.#assertUsable();
    this.#assertNotSampling('接收 pointerStart');
    return this.#raw.pointerStart(point);
  }

  pointerMove(point: unknown): boolean {
    this.#assertUsable();
    this.#assertNotSampling('接收 pointerMove');
    return this.#raw.pointerMove(point);
  }

  pointerEnd(point: unknown): boolean {
    this.#assertUsable();
    this.#assertNotSampling('接收 pointerEnd');
    return this.#raw.pointerEnd(point);
  }

  pointerCancel(point: unknown): boolean {
    this.#assertUsable();
    this.#assertNotSampling('接收 pointerCancel');
    return this.#raw.pointerCancel(point);
  }

  resize(viewport: unknown): boolean {
    this.#assertUsable();
    this.#assertNotSampling('调整尺寸');
    const changed = this.#raw.resize(viewport);
    if (changed) this.#gestures.reset();
    return changed;
  }

  suspend(): boolean {
    this.#assertUsable();
    this.#assertNotSampling('暂停');
    if (this.#suspended) return false;
    try {
      this.#raw.suspend();
      this.#gestures.reset();
      this.#suspended = true;
      return true;
    } catch (error) {
      this.#fail(error);
      throw error;
    }
  }

  resume(): boolean {
    this.#assertUsable();
    this.#assertNotSampling('恢复');
    if (!this.#suspended) return false;
    try {
      this.#raw.resume();
      this.#gestures.reset();
      this.#suspended = false;
      return true;
    } catch (error) {
      this.#fail(error);
      throw error;
    }
  }

  sample(tickValue: unknown, options: unknown = {}): ArenaInputFrame {
    this.#assertUsable();
    if (this.#sampling) {
      this.#reentryAttempted = true;
      throw new Error('InputSampler.sample() 不可重入。');
    }
    const tick = integerAtLeast(tickValue, 0, 'InputSampler.tick');
    if (this.#suspended) throw new Error('InputSampler 暂停时不能采样。');
    if (this.#lastTick >= 0 && tick !== this.#lastTick + 1) {
      throw new RangeError(`InputSampler tick 必须连续：上次 ${this.#lastTick}，本次 ${tick}。`);
    }
    const sampleOptions = cloneKnownRecord(options, SAMPLE_OPTION_KEYS, 'InputSampler sample options');
    const copiedAffordance = copyMapperActionAffordance(
      sampleOptions.actionAffordance ?? null,
      { tick, participantId: this.#participantId },
    );
    this.#sampling = true;
    this.#reentryAttempted = false;
    try {
      const raw = this.#raw.consumeSnapshot();
      const gestures = this.#gestures.sample(tick, raw);
      const mappedCandidate = this.#mapper.map(Object.freeze({
        tick,
        participantId: this.#participantId,
        raw,
        gestures,
        actionAffordance: copiedAffordance,
      }));
      if (this.#reentryAttempted) {
        throw new Error('InputSampler mapper 尝试重入采样或生命周期。');
      }
      const mapped = createMappedSemanticInput(
        mappedCandidate,
        `InputSampler(${this.#mapper.id})`,
      );
      const frame = normalizeInputFrame({
        tick,
        participantId: this.#participantId,
        ...mapped,
      }, {
        expectedTick: tick,
        participantIds: [this.#participantId],
      });
      this.#lastTick = tick;
      return frame;
    } catch (error) {
      this.#fail(error);
      throw error;
    } finally {
      this.#sampling = false;
      this.#reentryAttempted = false;
    }
  }

  getDebugSnapshot(): InputSamplerDebugSnapshot {
    this.#assertUsable();
    this.#assertNotSampling('读取调试快照');
    return Object.freeze({
      participantId: this.#participantId,
      mapperId: this.#mapper.id,
      lastTick: this.#lastTick,
      suspended: this.#suspended,
      sampling: this.#sampling,
      controls: this.#raw.getDebugSnapshot(),
      gestures: this.#gestures.getDebugSnapshot(),
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#assertNotSampling('销毁');
    this.#destroyed = true;
    this.#suspended = true;
    const cleanupErrors: Error[] = [];
    try { this.#raw.destroy(); } catch (error) {
      cleanupErrors.push(normalizeThrownError(error, 'InputSampler RawControlState 销毁失败'));
    }
    try { this.#gestures.destroy(); } catch (error) {
      cleanupErrors.push(normalizeThrownError(error, 'InputSampler GestureRecognizer 销毁失败'));
    }
    if (cleanupErrors.length > 0) {
      throw combineCleanupFailure(
        cleanupErrors[0]!,
        cleanupErrors.slice(1),
        'InputSampler 资源销毁不完整。',
      );
    }
  }
}
