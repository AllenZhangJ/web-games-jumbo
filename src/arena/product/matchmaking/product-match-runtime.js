import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import { createMatchContentPublicView } from '@number-strategy-jump/arena-contracts';
import {
  assertProductMatchSeed,
  createProductMatchResult,
  createProductPublicOpponent,
} from './product-match-result.js';

export const PRODUCT_MATCH_RUNTIME_STATE = Object.freeze({
  CREATED: 'created',
  RUNNING: 'running',
  PAUSED: 'paused',
  ENDED: 'ended',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
});

function validateLocalMatch(localMatch) {
  if (!localMatch || typeof localMatch !== 'object') {
    throw new TypeError('ProductMatchRuntime 需要本地匹配结果。');
  }
  if (!localMatch.session || typeof localMatch.session !== 'object') {
    throw new TypeError('ProductMatchRuntime 缺少 LocalMatchSession。');
  }
  for (const method of [
    'start',
    'setPaused',
    'step',
    'getSnapshot',
    'exportReplay',
    'destroy',
  ]) {
    if (typeof localMatch.session[method] !== 'function') {
      throw new TypeError(`ProductMatchRuntime LocalMatchSession 缺少 ${method}()。`);
    }
  }
  return localMatch;
}

function validateCompletionSink(value) {
  if (value !== null && typeof value !== 'function') {
    throw new TypeError('ProductMatchRuntime completionSink 必须是函数或 null。');
  }
  return value;
}

export class ProductMatchRuntime {
  #session;
  #matchSeed;
  #opponent;
  #content;
  #state;
  #pauseRequested;
  #stepping;
  #result;
  #completionSink;

  constructor(localMatchValue, { completionSink = null } = {}) {
    const localMatch = validateLocalMatch(localMatchValue);
    this.#session = localMatch.session;
    this.#matchSeed = assertProductMatchSeed(localMatch.matchSeed);
    this.#opponent = createProductPublicOpponent(localMatch.opponent);
    this.#content = createMatchContentPublicView(localMatch.content);
    this.#state = PRODUCT_MATCH_RUNTIME_STATE.CREATED;
    this.#pauseRequested = false;
    this.#stepping = false;
    this.#result = null;
    this.#completionSink = validateCompletionSink(completionSink);
    Object.freeze(this);
  }

  get state() {
    return this.#state;
  }

  #assertUsable() {
    if (this.#state === PRODUCT_MATCH_RUNTIME_STATE.DESTROYED) {
      throw new Error('ProductMatchRuntime 已销毁。');
    }
    if (this.#state === PRODUCT_MATCH_RUNTIME_STATE.FAILED) {
      throw new Error('ProductMatchRuntime 已失败关闭。');
    }
  }

  start() {
    this.#assertUsable();
    if (
      this.#state === PRODUCT_MATCH_RUNTIME_STATE.RUNNING
      || this.#state === PRODUCT_MATCH_RUNTIME_STATE.PAUSED
    ) return;
    if (this.#state !== PRODUCT_MATCH_RUNTIME_STATE.CREATED) {
      throw new Error(`ProductMatchRuntime 无法从 ${this.#state} start。`);
    }
    try {
      this.#session.start();
      this.#state = this.#pauseRequested
        ? PRODUCT_MATCH_RUNTIME_STATE.PAUSED
        : PRODUCT_MATCH_RUNTIME_STATE.RUNNING;
    } catch (error) {
      this.#state = PRODUCT_MATCH_RUNTIME_STATE.FAILED;
      throw error;
    }
  }

  setPaused(paused) {
    this.#assertUsable();
    if (typeof paused !== 'boolean') throw new TypeError('paused 必须是布尔值。');
    if (this.#stepping) throw new Error('step() 期间不能切换 ProductMatchRuntime 暂停状态。');
    if (this.#state === PRODUCT_MATCH_RUNTIME_STATE.ENDED) return;
    try {
      this.#session.setPaused(paused);
      this.#pauseRequested = paused;
      if (this.#state !== PRODUCT_MATCH_RUNTIME_STATE.CREATED) {
        this.#state = paused
          ? PRODUCT_MATCH_RUNTIME_STATE.PAUSED
          : PRODUCT_MATCH_RUNTIME_STATE.RUNNING;
      }
    } catch (error) {
      this.#state = PRODUCT_MATCH_RUNTIME_STATE.FAILED;
      throw error;
    }
  }

  step(playerFrame = null) {
    this.#assertUsable();
    if (this.#state !== PRODUCT_MATCH_RUNTIME_STATE.RUNNING) {
      throw new Error(`ProductMatchRuntime 无法在 ${this.#state} 状态 step。`);
    }
    if (this.#stepping) throw new Error('ProductMatchRuntime.step() 不可重入。');
    this.#stepping = true;
    try {
      const outcome = this.#session.step(playerFrame);
      if (this.#session.state === 'ended') {
        const replay = cloneFrozenData(
          this.#session.exportReplay(),
          'ProductMatchRuntime completion replay',
        );
        const result = createProductMatchResult({
          matchSeed: this.#matchSeed,
          opponent: this.#opponent,
          content: this.#content,
          replay,
        });
        const completion = this.#completionSink?.(Object.freeze({ result, replay }));
        if (completion && typeof completion.then === 'function') {
          Promise.resolve(completion).catch(() => {
            // ProductMatchRuntime is synchronous; contain a late rejection after rejecting the port.
          });
          throw new TypeError('ProductMatchRuntime completionSink 必须同步完成。');
        }
        this.#result = result;
        this.#state = PRODUCT_MATCH_RUNTIME_STATE.ENDED;
      }
      return Object.freeze({
        events: cloneFrozenData(outcome.events, 'ProductMatchRuntime events'),
        snapshot: cloneFrozenData(outcome.snapshot, 'ProductMatchRuntime snapshot'),
        result: this.#result,
      });
    } catch (error) {
      this.#state = PRODUCT_MATCH_RUNTIME_STATE.FAILED;
      throw error;
    } finally {
      this.#stepping = false;
    }
  }

  getSnapshot() {
    this.#assertUsable();
    return cloneFrozenData(this.#session.getSnapshot(), 'ProductMatchRuntime snapshot');
  }

  getPublicInfo() {
    this.#assertUsable();
    return Object.freeze({
      matchSeed: this.#matchSeed,
      opponent: this.#opponent,
      content: this.#content,
    });
  }

  getResult() {
    this.#assertUsable();
    return this.#result;
  }

  destroy() {
    if (
      this.#state === PRODUCT_MATCH_RUNTIME_STATE.DESTROYED
      && this.#session === null
    ) return;
    if (this.#stepping) throw new Error('step() 期间不能销毁 ProductMatchRuntime。');
    this.#session.destroy();
    this.#session = null;
    this.#opponent = null;
    this.#content = null;
    this.#result = null;
    this.#completionSink = null;
    this.#pauseRequested = true;
    this.#state = PRODUCT_MATCH_RUNTIME_STATE.DESTROYED;
  }
}

export function validateProductMatchRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') {
    throw new TypeError('ProductMatchFactory 必须返回 ProductMatchRuntime 合同。');
  }
  for (const method of [
    'start',
    'setPaused',
    'step',
    'getSnapshot',
    'getPublicInfo',
    'getResult',
    'destroy',
  ]) {
    if (typeof runtime[method] !== 'function') {
      throw new TypeError(`ProductMatchRuntime 合同缺少 ${method}()。`);
    }
  }
  return runtime;
}
