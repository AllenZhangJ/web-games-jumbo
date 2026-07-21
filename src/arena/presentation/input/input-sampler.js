import { normalizeInputFrame } from '@number-strategy-jump/arena-contracts';
import { GestureRecognizer } from './gesture-recognizer.js';
import {
  copyMapperActionAffordance,
  createMappedSemanticInput,
} from './input-mapper-contract.js';
import { integerAtLeast } from './input-validation.js';
import { RawControlState } from './raw-control-state.js';

function participantIdValue(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('InputSampler.participantId 必须是非空字符串。');
  }
  return value;
}

function mapperValue(value) {
  if (!value || typeof value.id !== 'string' || typeof value.map !== 'function') {
    throw new TypeError('InputSampler.mapper 必须实现 id/map。');
  }
  return value;
}

export class InputSampler {
  #participantId;
  #mapper;
  #raw;
  #gestures;
  #lastTick;
  #suspended;
  #sampling;
  #failure;
  #destroyed;

  constructor({
    participantId,
    viewport,
    mapper,
    layout = {},
    gesture = {},
  }) {
    this.#participantId = participantIdValue(participantId);
    this.#mapper = mapperValue(mapper);
    this.#raw = new RawControlState({ viewport, layout });
    this.#gestures = new GestureRecognizer(gesture);
    this.#lastTick = -1;
    this.#suspended = false;
    this.#sampling = false;
    this.#failure = null;
    this.#destroyed = false;
    Object.freeze(this);
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('InputSampler 已销毁。');
    if (this.#failure) {
      const error = new Error('InputSampler 已因采样失败关闭。');
      error.cause = this.#failure;
      throw error;
    }
  }

  #fail(error) {
    this.#failure = error instanceof Error ? error : new Error(String(error));
    this.#suspended = true;
    try { this.#raw.suspend(); } catch { /* terminal failure already recorded */ }
    try { this.#gestures.reset(); } catch { /* terminal failure already recorded */ }
  }

  pointerStart(point) {
    this.#assertUsable();
    return this.#raw.pointerStart(point);
  }

  pointerMove(point) {
    this.#assertUsable();
    return this.#raw.pointerMove(point);
  }

  pointerEnd(point) {
    this.#assertUsable();
    return this.#raw.pointerEnd(point);
  }

  pointerCancel(point) {
    this.#assertUsable();
    return this.#raw.pointerCancel(point);
  }

  resize(viewport) {
    this.#assertUsable();
    const changed = this.#raw.resize(viewport);
    if (changed) this.#gestures.reset();
    return changed;
  }

  suspend() {
    this.#assertUsable();
    if (this.#sampling) throw new Error('InputSampler.sample() 期间不能暂停。');
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

  resume() {
    this.#assertUsable();
    if (this.#sampling) throw new Error('InputSampler.sample() 期间不能恢复。');
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

  sample(tick, { actionAffordance = null } = {}) {
    this.#assertUsable();
    integerAtLeast(tick, 0, 'InputSampler.tick');
    if (this.#suspended) throw new Error('InputSampler 暂停时不能采样。');
    if (this.#sampling) throw new Error('InputSampler.sample() 不可重入。');
    if (this.#lastTick >= 0 && tick !== this.#lastTick + 1) {
      throw new RangeError(`InputSampler tick 必须连续：上次 ${this.#lastTick}，本次 ${tick}。`);
    }
    const copiedAffordance = copyMapperActionAffordance(actionAffordance, {
      tick,
      participantId: this.#participantId,
    });
    this.#sampling = true;
    try {
      const raw = this.#raw.consumeSnapshot();
      const gestures = this.#gestures.sample(tick, raw);
      const mapped = createMappedSemanticInput(this.#mapper.map(Object.freeze({
        tick,
        participantId: this.#participantId,
        raw,
        gestures,
        actionAffordance: copiedAffordance,
      })), `InputSampler(${this.#mapper.id})`);
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
    }
  }

  getDebugSnapshot() {
    this.#assertUsable();
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

  destroy() {
    if (this.#destroyed) return;
    if (this.#sampling) throw new Error('InputSampler.sample() 期间不能销毁。');
    this.#destroyed = true;
    this.#suspended = true;
    this.#raw.destroy();
    this.#gestures.destroy();
  }
}
