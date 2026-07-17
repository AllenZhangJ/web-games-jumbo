import { clonePoint, cloneViewport } from './input-validation.js';

export const ARENA_INPUT_ROUTER_MODE = Object.freeze({
  INACTIVE: 'inactive',
  GAMEPLAY: 'gameplay',
  RESULT: 'result',
});

const ROUTER_MODES = new Set(Object.values(ARENA_INPUT_ROUTER_MODE));

function requiredFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value;
}

function validateSampler(value) {
  if (!value || typeof value !== 'object') throw new TypeError('ArenaInputRouter.sampler 无效。');
  for (const method of [
    'pointerStart',
    'pointerMove',
    'pointerEnd',
    'pointerCancel',
    'resize',
    'suspend',
    'resume',
    'sample',
    'destroy',
  ]) requiredFunction(value[method], `ArenaInputRouter.sampler.${method}`);
  return value;
}

export class ArenaInputRouter {
  #sampler;
  #hitTestRematch;
  #onRematchRequested;
  #mode;
  #viewport;
  #lifecycleSuspended;
  #samplerSuspended;
  #resultPointerId;
  #sampling;
  #destroyed;

  constructor({ sampler, viewport, hitTestRematch, onRematchRequested }) {
    this.#sampler = validateSampler(sampler);
    this.#hitTestRematch = requiredFunction(
      hitTestRematch,
      'ArenaInputRouter.hitTestRematch',
    );
    this.#onRematchRequested = requiredFunction(
      onRematchRequested,
      'ArenaInputRouter.onRematchRequested',
    );
    this.#mode = ARENA_INPUT_ROUTER_MODE.INACTIVE;
    this.#viewport = cloneViewport(viewport, 'ArenaInputRouter.viewport');
    this.#lifecycleSuspended = false;
    this.#samplerSuspended = false;
    this.#resultPointerId = null;
    this.#sampling = false;
    this.#destroyed = false;
    this.#sampler.resize(this.#viewport);
    this.#syncSamplerSuspension();
    Object.freeze(this);
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('ArenaInputRouter 已销毁。');
  }

  #shouldSuspendSampler() {
    return this.#lifecycleSuspended || this.#mode !== ARENA_INPUT_ROUTER_MODE.GAMEPLAY;
  }

  #setSamplerSuspended(shouldSuspend) {
    if (shouldSuspend === this.#samplerSuspended) return false;
    if (this.#sampling) throw new Error('ArenaInputRouter.sample() 期间不能切换暂停。');
    if (shouldSuspend) this.#sampler.suspend();
    else this.#sampler.resume();
    this.#samplerSuspended = shouldSuspend;
    return true;
  }

  #syncSamplerSuspension() {
    return this.#setSamplerSuspended(this.#shouldSuspendSampler());
  }

  setMode(mode) {
    this.#assertUsable();
    if (!ROUTER_MODES.has(mode)) throw new RangeError(`未知 ArenaInputRouter mode ${String(mode)}。`);
    if (this.#mode === mode) return false;
    if (this.#sampling) throw new Error('ArenaInputRouter.sample() 期间不能切换 mode。');
    const shouldSuspend = this.#lifecycleSuspended
      || mode !== ARENA_INPUT_ROUTER_MODE.GAMEPLAY;
    this.#setSamplerSuspended(shouldSuspend);
    this.#mode = mode;
    this.#resultPointerId = null;
    return true;
  }

  pointerStart(point) {
    this.#assertUsable();
    if (this.#lifecycleSuspended || this.#mode === ARENA_INPUT_ROUTER_MODE.INACTIVE) return false;
    if (this.#mode === ARENA_INPUT_ROUTER_MODE.GAMEPLAY) {
      return this.#sampler.pointerStart(point);
    }
    const value = clonePoint(point, 'ArenaInputRouter.pointerStart');
    if (this.#resultPointerId !== null || !this.#hitTestRematch(value, this.#viewport)) {
      return false;
    }
    this.#resultPointerId = value.pointerId;
    return true;
  }

  pointerMove(point) {
    this.#assertUsable();
    if (this.#lifecycleSuspended || this.#mode === ARENA_INPUT_ROUTER_MODE.INACTIVE) return false;
    if (this.#mode === ARENA_INPUT_ROUTER_MODE.GAMEPLAY) {
      return this.#sampler.pointerMove(point);
    }
    const value = clonePoint(point, 'ArenaInputRouter.pointerMove');
    return value.pointerId === this.#resultPointerId;
  }

  pointerEnd(point) {
    this.#assertUsable();
    if (this.#lifecycleSuspended || this.#mode === ARENA_INPUT_ROUTER_MODE.INACTIVE) return false;
    if (this.#mode === ARENA_INPUT_ROUTER_MODE.GAMEPLAY) {
      return this.#sampler.pointerEnd(point);
    }
    const value = clonePoint(point, 'ArenaInputRouter.pointerEnd');
    if (value.pointerId !== this.#resultPointerId) return false;
    this.#resultPointerId = null;
    if (!this.#hitTestRematch(value, this.#viewport)) return false;
    this.#onRematchRequested();
    return true;
  }

  pointerCancel(point) {
    this.#assertUsable();
    if (this.#lifecycleSuspended || this.#mode === ARENA_INPUT_ROUTER_MODE.INACTIVE) return false;
    if (this.#mode === ARENA_INPUT_ROUTER_MODE.GAMEPLAY) {
      return this.#sampler.pointerCancel(point);
    }
    const value = clonePoint(point, 'ArenaInputRouter.pointerCancel');
    if (value.pointerId !== this.#resultPointerId) return false;
    this.#resultPointerId = null;
    return true;
  }

  resize(viewport) {
    this.#assertUsable();
    const value = cloneViewport(viewport, 'ArenaInputRouter.viewport');
    this.#viewport = value;
    this.#resultPointerId = null;
    return this.#sampler.resize(value);
  }

  suspend() {
    this.#assertUsable();
    if (this.#lifecycleSuspended) return false;
    this.#setSamplerSuspended(true);
    this.#lifecycleSuspended = true;
    this.#resultPointerId = null;
    return true;
  }

  resume() {
    this.#assertUsable();
    if (!this.#lifecycleSuspended) return false;
    this.#setSamplerSuspended(this.#mode !== ARENA_INPUT_ROUTER_MODE.GAMEPLAY);
    this.#lifecycleSuspended = false;
    this.#resultPointerId = null;
    return true;
  }

  sample(tick, options) {
    this.#assertUsable();
    if (
      this.#lifecycleSuspended
      || this.#mode !== ARENA_INPUT_ROUTER_MODE.GAMEPLAY
      || this.#samplerSuspended
    ) throw new Error('ArenaInputRouter 仅能在活跃 gameplay 模式采样。');
    if (this.#sampling) throw new Error('ArenaInputRouter.sample() 不可重入。');
    this.#sampling = true;
    try {
      return this.#sampler.sample(tick, options);
    } finally {
      this.#sampling = false;
    }
  }

  replaceSampler(sampler) {
    this.#assertUsable();
    if (this.#sampling) throw new Error('ArenaInputRouter.sample() 期间不能替换 sampler。');
    const replacement = validateSampler(sampler);
    if (replacement === this.#sampler) return false;
    const shouldSuspend = this.#shouldSuspendSampler();
    try {
      replacement.resize(this.#viewport);
      if (shouldSuspend) replacement.suspend();
    } catch (error) {
      try { replacement.destroy(); } catch { /* preserve preparation cause */ }
      throw error;
    }
    const previous = this.#sampler;
    try {
      previous.destroy();
    } catch (error) {
      try { replacement.destroy(); } catch { /* preserve previous cleanup cause */ }
      throw error;
    }
    this.#sampler = replacement;
    this.#samplerSuspended = shouldSuspend;
    this.#resultPointerId = null;
    return true;
  }

  getDebugSnapshot() {
    this.#assertUsable();
    return Object.freeze({
      mode: this.#mode,
      viewport: this.#viewport,
      lifecycleSuspended: this.#lifecycleSuspended,
      samplerSuspended: this.#samplerSuspended,
      resultPointerId: this.#resultPointerId,
      sampling: this.#sampling,
      sampler: this.#sampler.getDebugSnapshot?.() ?? null,
    });
  }

  destroy() {
    if (this.#destroyed) return;
    if (this.#sampling) throw new Error('sample() 期间不能销毁 ArenaInputRouter。');
    this.#lifecycleSuspended = true;
    this.#resultPointerId = null;
    this.#sampler.destroy();
    this.#sampler = null;
    this.#destroyed = true;
  }
}
