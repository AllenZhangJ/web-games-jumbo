import { ARENA_MATCH_PHASE } from '../../config.js';
import {
  combineCleanupFailure,
  normalizeThrownError,
} from '../../lifecycle-error.js';

function requiredMethod(value, method, name) {
  if (typeof value?.[method] !== 'function') {
    throw new TypeError(`${name} 缺少 ${method}()。`);
  }
}

function validateSession(value) {
  if (!value || typeof value !== 'object') throw new TypeError('pilot delegate session 无效。');
  for (const method of [
    'start',
    'setPaused',
    'step',
    'getSnapshot',
    'getPublicMatchInfo',
    'exportReplay',
    'destroy',
  ]) requiredMethod(value, method, 'pilot delegate session');
  return value;
}

function validateCollector(value) {
  requiredMethod(value, 'observeStep', 'pilot metric collector');
  return value;
}

function freezeObservation(value, name, active = new WeakSet()) {
  if (value === null || typeof value !== 'object') return value;
  if (active.has(value)) throw new TypeError(`${name} 不能包含循环引用。`);
  active.add(value);
  try {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        freezeObservation(value[index], `${name}[${index}]`, active);
      }
    } else {
      for (const [key, child] of Object.entries(value)) {
        freezeObservation(child, `${name}.${key}`, active);
      }
    }
    return Object.freeze(value);
  } finally {
    active.delete(value);
  }
}

export class InputPilotObservedSession {
  #delegate;
  #collector;
  #stepping;
  #destroyed;

  constructor({ session, collector }) {
    this.#delegate = validateSession(session);
    this.#collector = validateCollector(collector);
    this.#stepping = false;
    this.#destroyed = false;
    Object.freeze(this);
  }

  get state() {
    return this.#delegate?.state ?? 'destroyed';
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('InputPilotObservedSession 已销毁。');
  }

  #fail(error, operation) {
    const failure = normalizeThrownError(
      error,
      `InputPilotObservedSession ${operation} 失败`,
    );
    const cleanupErrors = [];
    try {
      this.#delegate?.destroy();
    } catch (cleanupError) {
      cleanupErrors.push(normalizeThrownError(
        cleanupError,
        'InputPilotObservedSession delegate 清理失败',
      ));
    }
    this.#delegate = null;
    this.#collector = null;
    this.#destroyed = true;
    return combineCleanupFailure(
      failure,
      cleanupErrors,
      `InputPilotObservedSession ${operation} 失败且清理未完整完成。`,
    );
  }

  start() {
    this.#assertUsable();
    try {
      return this.#delegate.start();
    } catch (error) {
      throw this.#fail(error, 'start');
    }
  }

  setPaused(paused) {
    this.#assertUsable();
    if (typeof paused !== 'boolean') throw new TypeError('paused 必须是布尔值。');
    if (this.#stepping) throw new Error('step() 期间不能暂停 InputPilotObservedSession。');
    try {
      return this.#delegate.setPaused(paused);
    } catch (error) {
      throw this.#fail(error, 'setPaused');
    }
  }

  step(input = null) {
    this.#assertUsable();
    if (this.#stepping) throw new Error('InputPilotObservedSession.step() 不可重入。');
    this.#stepping = true;
    try {
      try {
        const beforeSnapshot = this.#delegate.getSnapshot();
        const result = this.#delegate.step(input);
        if (result?.snapshot?.tick === beforeSnapshot.tick) {
          if (result.input !== null || !Array.isArray(result.events) || result.events.length > 0) {
            throw new RangeError('未推进的 pilot step 不能消费输入或产生事件。');
          }
          return Object.freeze({
            events: freezeObservation(result.events, 'pilot paused events'),
            snapshot: freezeObservation(result.snapshot, 'pilot paused snapshot'),
            input: null,
          });
        }
        const observedResult = Object.freeze({
          events: freezeObservation(result?.events, 'pilot observed events'),
          snapshot: freezeObservation(result?.snapshot, 'pilot observed snapshot'),
          input: freezeObservation(result?.input, 'pilot observed input'),
        });
        this.#collector.observeStep({
          beforeSnapshot: freezeObservation(beforeSnapshot, 'pilot before snapshot'),
          input: observedResult.input,
          result: observedResult,
        });
        return observedResult;
      } catch (error) {
        throw this.#fail(error, 'step');
      }
    } finally {
      this.#stepping = false;
    }
  }

  runUntilEnded(inputProvider = () => null, { maxTicks = 100_000 } = {}) {
    this.#assertUsable();
    if (typeof inputProvider !== 'function') {
      throw new TypeError('inputProvider 必须是函数。');
    }
    if (!Number.isSafeInteger(maxTicks) || maxTicks < 1) {
      throw new RangeError('maxTicks 必须是正安全整数。');
    }
    this.start();
    let steps = 0;
    while (this.getSnapshot().phase !== ARENA_MATCH_PHASE.ENDED && steps < maxTicks) {
      const input = inputProvider(this.getSnapshot());
      this.step(input ?? null);
      steps += 1;
    }
    if (this.getSnapshot().phase !== ARENA_MATCH_PHASE.ENDED) {
      throw new Error(`pilot match 在 ${maxTicks} tick 内未结束。`);
    }
    return this.exportReplay();
  }

  getSnapshot() {
    this.#assertUsable();
    return freezeObservation(this.#delegate.getSnapshot(), 'pilot public snapshot');
  }

  getPublicMatchInfo() {
    this.#assertUsable();
    return freezeObservation(
      this.#delegate.getPublicMatchInfo(),
      'pilot public match info',
    );
  }

  exportReplay() {
    this.#assertUsable();
    return this.#delegate.exportReplay();
  }

  destroy() {
    if (this.#destroyed) return;
    if (this.#stepping) throw new Error('step() 期间不能销毁 InputPilotObservedSession。');
    try {
      this.#delegate.destroy();
    } finally {
      this.#delegate = null;
      this.#collector = null;
      this.#destroyed = true;
    }
  }
}
