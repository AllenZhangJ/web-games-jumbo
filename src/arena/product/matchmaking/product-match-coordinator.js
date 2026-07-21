import {
  combineCleanupFailure,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import { createProductPublicMatchInfo } from '@number-strategy-jump/arena-product-contracts';
import { validateProductMatchRuntime } from './product-match-runtime.js';

export const PRODUCT_MATCH_COORDINATOR_STATE = Object.freeze({
  IDLE: 'idle',
  PREPARING: 'preparing',
  READY: 'ready',
  RUNNING: 'running',
  PAUSED: 'paused',
  RESULT: 'result',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
});

export const PRODUCT_MATCH_COORDINATOR_SNAPSHOT_SCHEMA_VERSION = 1;

function validateFactory(value) {
  if (!value || typeof value.create !== 'function') {
    throw new TypeError('ProductMatchCoordinator 需要 matchFactory.create()。');
  }
  return value;
}

function cleanupError(error, message) {
  return normalizeThrownError(error, message);
}

export class ProductMatchCoordinator {
  #factory;
  #runtime;
  #state;
  #generation;
  #preparePromise;
  #pauseRequested;
  #publicInfo;
  #result;
  #lastError;
  #cleanupIncomplete;
  #stepping;

  constructor({ matchFactory }) {
    this.#factory = validateFactory(matchFactory);
    this.#runtime = null;
    this.#state = PRODUCT_MATCH_COORDINATOR_STATE.IDLE;
    this.#generation = 0;
    this.#preparePromise = null;
    this.#pauseRequested = false;
    this.#publicInfo = null;
    this.#result = null;
    this.#lastError = null;
    this.#cleanupIncomplete = false;
    this.#stepping = false;
    Object.freeze(this);
  }

  get state() {
    return this.#state;
  }

  #assertUsable() {
    if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED) {
      throw new Error('ProductMatchCoordinator 已销毁。');
    }
    if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.FAILED) {
      const error = new Error('ProductMatchCoordinator 已失败。');
      error.cause = this.#lastError;
      throw error;
    }
  }

  #retainCleanupFailure(runtime, error, message) {
    if (this.#runtime === null) this.#runtime = runtime;
    this.#cleanupIncomplete = true;
    this.#lastError = cleanupError(error, message);
    return this.#lastError;
  }

  #destroyCandidate(runtime, message) {
    if (!runtime || typeof runtime.destroy !== 'function') return null;
    try {
      runtime.destroy();
      return null;
    } catch (error) {
      return this.#retainCleanupFailure(runtime, error, message);
    }
  }

  prepare() {
    this.#assertUsable();
    if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.PREPARING) {
      return this.#preparePromise;
    }
    if (this.#state !== PRODUCT_MATCH_COORDINATOR_STATE.IDLE) {
      throw new Error(`ProductMatchCoordinator 无法从 ${this.#state} prepare。`);
    }

    this.#state = PRODUCT_MATCH_COORDINATOR_STATE.PREPARING;
    this.#lastError = null;
    const generation = this.#generation + 1;
    this.#generation = generation;
    let candidate = null;
    let operation;
    operation = Promise.resolve()
      .then(() => this.#factory.create())
      .then((runtimeValue) => Promise.resolve(runtimeValue))
      .then((runtimeValue) => {
        candidate = runtimeValue;
        const runtime = validateProductMatchRuntime(runtimeValue);
        if (
          this.#generation !== generation
          || this.#state === PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED
        ) {
          this.#destroyCandidate(runtime, '已取消 ProductMatchRuntime 清理失败');
          return this.getSnapshot();
        }
        if (this.#pauseRequested) runtime.setPaused(true);
        this.#runtime = runtime;
        candidate = null;
        this.#publicInfo = createProductPublicMatchInfo(runtime.getPublicInfo());
        this.#state = PRODUCT_MATCH_COORDINATOR_STATE.READY;
        this.#cleanupIncomplete = false;
        return this.getSnapshot();
      })
      .catch((error) => {
        if (
          this.#generation !== generation
          || this.#state === PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED
        ) {
          this.#destroyCandidate(candidate, '已取消 ProductMatchRuntime 清理失败');
          return this.getSnapshot();
        }
        const failure = normalizeThrownError(error, 'ProductMatchCoordinator 准备失败');
        const cleanupFailure = this.#destroyCandidate(
          candidate,
          '准备失败后的 ProductMatchRuntime 清理失败',
        );
        this.#state = PRODUCT_MATCH_COORDINATOR_STATE.FAILED;
        this.#lastError = combineCleanupFailure(
          failure,
          cleanupFailure ? [cleanupFailure] : [],
          'ProductMatchCoordinator 准备失败且清理未完整完成。',
        );
        throw this.#lastError;
      })
      .finally(() => {
        if (this.#preparePromise === operation) this.#preparePromise = null;
      });
    this.#preparePromise = operation;
    return operation;
  }

  start() {
    this.#assertUsable();
    if (
      this.#state === PRODUCT_MATCH_COORDINATOR_STATE.RUNNING
      || this.#state === PRODUCT_MATCH_COORDINATOR_STATE.PAUSED
    ) return this.getSnapshot();
    if (this.#state !== PRODUCT_MATCH_COORDINATOR_STATE.READY) {
      throw new Error(`ProductMatchCoordinator 无法从 ${this.#state} start。`);
    }
    try {
      this.#runtime.start();
      this.#state = this.#pauseRequested
        ? PRODUCT_MATCH_COORDINATOR_STATE.PAUSED
        : PRODUCT_MATCH_COORDINATOR_STATE.RUNNING;
      return this.getSnapshot();
    } catch (error) {
      this.#state = PRODUCT_MATCH_COORDINATOR_STATE.FAILED;
      this.#lastError = normalizeThrownError(error, 'ProductMatchCoordinator 启动比赛失败');
      throw this.#lastError;
    }
  }

  setPaused(paused) {
    if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED) return this.getSnapshot();
    this.#assertUsable();
    if (typeof paused !== 'boolean') throw new TypeError('paused 必须是布尔值。');
    if (this.#stepping) throw new Error('step() 期间不能暂停 ProductMatchCoordinator。');
    this.#pauseRequested = paused;
    if (
      this.#state === PRODUCT_MATCH_COORDINATOR_STATE.IDLE
      || this.#state === PRODUCT_MATCH_COORDINATOR_STATE.PREPARING
      || this.#state === PRODUCT_MATCH_COORDINATOR_STATE.RESULT
    ) return this.getSnapshot();
    try {
      this.#runtime.setPaused(paused);
      if (
        this.#state === PRODUCT_MATCH_COORDINATOR_STATE.RUNNING
        || this.#state === PRODUCT_MATCH_COORDINATOR_STATE.PAUSED
      ) {
        this.#state = paused
          ? PRODUCT_MATCH_COORDINATOR_STATE.PAUSED
          : PRODUCT_MATCH_COORDINATOR_STATE.RUNNING;
      }
      return this.getSnapshot();
    } catch (error) {
      this.#state = PRODUCT_MATCH_COORDINATOR_STATE.FAILED;
      this.#lastError = normalizeThrownError(error, 'ProductMatchCoordinator 暂停切换失败');
      throw this.#lastError;
    }
  }

  step(playerFrame = null) {
    this.#assertUsable();
    if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.PAUSED) {
      return Object.freeze({
        events: Object.freeze([]),
        snapshot: this.#runtime.getSnapshot(),
        result: null,
      });
    }
    if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.RESULT) {
      return Object.freeze({
        events: Object.freeze([]),
        snapshot: this.#runtime.getSnapshot(),
        result: this.#result,
      });
    }
    if (this.#state !== PRODUCT_MATCH_COORDINATOR_STATE.RUNNING) {
      throw new Error(`ProductMatchCoordinator 无法在 ${this.#state} 状态 step。`);
    }
    if (this.#stepping) throw new Error('ProductMatchCoordinator.step() 不可重入。');
    this.#stepping = true;
    try {
      const outcome = this.#runtime.step(playerFrame);
      const result = this.#runtime.getResult();
      if (result !== null) {
        this.#result = result;
        this.#state = PRODUCT_MATCH_COORDINATOR_STATE.RESULT;
      }
      return outcome;
    } catch (error) {
      this.#state = PRODUCT_MATCH_COORDINATOR_STATE.FAILED;
      this.#lastError = normalizeThrownError(error, 'ProductMatchCoordinator 比赛 step 失败');
      throw this.#lastError;
    } finally {
      this.#stepping = false;
    }
  }

  getMatchSnapshot() {
    this.#assertUsable();
    if (!this.#runtime) return null;
    return this.#runtime.getSnapshot();
  }

  getResult() {
    if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED) return null;
    return this.#result;
  }

  #releaseRuntime() {
    if (!this.#runtime) return;
    this.#runtime.destroy();
    this.#runtime = null;
    this.#publicInfo = null;
    this.#result = null;
    this.#cleanupIncomplete = false;
  }

  release() {
    if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED) {
      throw new Error('ProductMatchCoordinator 已销毁。');
    }
    if (this.#stepping) throw new Error('step() 期间不能释放 ProductMatchCoordinator。');
    if (this.#state === PRODUCT_MATCH_COORDINATOR_STATE.PREPARING) {
      throw new Error('准备中的 ProductMatchCoordinator 不能同步释放。');
    }
    try {
      this.#releaseRuntime();
      this.#state = PRODUCT_MATCH_COORDINATOR_STATE.IDLE;
      this.#pauseRequested = false;
      this.#lastError = null;
      return this.getSnapshot();
    } catch (error) {
      this.#state = PRODUCT_MATCH_COORDINATOR_STATE.FAILED;
      this.#cleanupIncomplete = true;
      this.#lastError = normalizeThrownError(error, 'ProductMatchCoordinator 释放失败');
      throw this.#lastError;
    }
  }

  resetFailure() {
    if (this.#state !== PRODUCT_MATCH_COORDINATOR_STATE.FAILED) {
      throw new Error('只有失败的 ProductMatchCoordinator 可以 resetFailure。');
    }
    return this.release();
  }

  destroy() {
    if (this.#stepping) throw new Error('step() 期间不能销毁 ProductMatchCoordinator。');
    this.#generation += 1;
    this.#pauseRequested = true;
    this.#state = PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED;
    try {
      this.#releaseRuntime();
      this.#factory = null;
      this.#lastError = null;
    } catch (error) {
      this.#cleanupIncomplete = true;
      this.#lastError = normalizeThrownError(error, 'ProductMatchCoordinator 销毁失败');
      throw this.#lastError;
    }
  }

  getSnapshot() {
    return Object.freeze({
      schemaVersion: PRODUCT_MATCH_COORDINATOR_SNAPSHOT_SCHEMA_VERSION,
      state: this.#state,
      hasRuntime: this.#runtime !== null,
      preparing: this.#preparePromise !== null,
      paused: this.#pauseRequested,
      cleanupIncomplete: this.#cleanupIncomplete,
      publicMatchInfo: this.#publicInfo,
      result: this.#result,
    });
  }
}
