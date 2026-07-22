import { normalizeThrownError } from '@number-strategy-jump/arena-contracts';
import {
  PRODUCT_INPUT_ROUTER_MODE,
  createProductUiIntent,
  createProductUiIntentKey,
} from '@number-strategy-jump/arena-presentation-contracts';
import { clonePoint, cloneViewport } from '../input/input-validation.js';
export { PRODUCT_INPUT_ROUTER_MODE } from '@number-strategy-jump/arena-presentation-contracts';

const MODES = new Set(Object.values(PRODUCT_INPUT_ROUTER_MODE));

function requiredFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value;
}

function validateSampler(value) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('ProductInputRouter.sampler 无效。');
  }
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
  ]) requiredFunction(value[method], `ProductInputRouter.sampler.${method}`);
  return value;
}

function normalizeHit(value) {
  return value === null || value === undefined
    ? null
    : createProductUiIntent(value);
}

export class ProductInputRouter {
  #sampler;
  #hitTestUi;
  #onIntent;
  #onIntentRejected;
  #mode;
  #viewport;
  #lifecycleSuspended;
  #samplerSuspended;
  #uiPointer;
  #sampling;
  #destroyed;

  constructor({ sampler, viewport, hitTestUi, onIntent, onIntentRejected = () => {} }) {
    this.#sampler = validateSampler(sampler);
    this.#hitTestUi = requiredFunction(hitTestUi, 'ProductInputRouter.hitTestUi');
    this.#onIntent = requiredFunction(onIntent, 'ProductInputRouter.onIntent');
    this.#onIntentRejected = requiredFunction(
      onIntentRejected,
      'ProductInputRouter.onIntentRejected',
    );
    this.#mode = PRODUCT_INPUT_ROUTER_MODE.INACTIVE;
    this.#viewport = cloneViewport(viewport, 'ProductInputRouter.viewport');
    this.#lifecycleSuspended = false;
    this.#samplerSuspended = false;
    this.#uiPointer = null;
    this.#sampling = false;
    this.#destroyed = false;
    this.#sampler.resize(this.#viewport);
    this.#syncSamplerSuspension();
    Object.freeze(this);
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('ProductInputRouter 已销毁。');
  }

  #shouldSuspendSampler(mode = this.#mode) {
    return this.#lifecycleSuspended || mode !== PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY;
  }

  #setSamplerSuspended(value) {
    if (value === this.#samplerSuspended) return false;
    if (this.#sampling) throw new Error('ProductInputRouter.sample() 期间不能切换暂停。');
    if (value) this.#sampler.suspend();
    else this.#sampler.resume();
    this.#samplerSuspended = value;
    return true;
  }

  #syncSamplerSuspension() {
    return this.#setSamplerSuspended(this.#shouldSuspendSampler());
  }

  #hit(point) {
    return normalizeHit(this.#hitTestUi(point, this.#viewport));
  }

  #dispatchIntent(intent) {
    let outcome;
    try {
      outcome = this.#onIntent(intent);
    } catch (error) {
      this.#reportIntentRejection(error, intent);
      return;
    }
    Promise.resolve(outcome).catch((error) => this.#reportIntentRejection(error, intent));
  }

  #reportIntentRejection(error, intent) {
    try { this.#onIntentRejected(error, intent); } catch {
      // Rejection reporting is observational and cannot own input lifecycle.
    }
  }

  setMode(mode) {
    this.#assertUsable();
    if (!MODES.has(mode)) throw new RangeError(`未知 ProductInputRouter mode ${String(mode)}。`);
    if (this.#mode === mode) return false;
    if (this.#sampling) throw new Error('ProductInputRouter.sample() 期间不能切换 mode。');
    this.#setSamplerSuspended(this.#shouldSuspendSampler(mode));
    this.#mode = mode;
    this.#uiPointer = null;
    return true;
  }

  pointerStart(pointValue) {
    this.#assertUsable();
    if (this.#lifecycleSuspended || this.#mode === PRODUCT_INPUT_ROUTER_MODE.INACTIVE) {
      return false;
    }
    if (this.#mode === PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY) {
      return this.#sampler.pointerStart(pointValue);
    }
    const point = clonePoint(pointValue, 'ProductInputRouter.pointerStart');
    if (this.#uiPointer !== null) return false;
    const intent = this.#hit(point);
    if (intent === null) return false;
    this.#uiPointer = Object.freeze({
      pointerId: point.pointerId,
      intentKey: createProductUiIntentKey(intent),
    });
    return true;
  }

  pointerMove(pointValue) {
    this.#assertUsable();
    if (this.#lifecycleSuspended || this.#mode === PRODUCT_INPUT_ROUTER_MODE.INACTIVE) {
      return false;
    }
    if (this.#mode === PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY) {
      return this.#sampler.pointerMove(pointValue);
    }
    const point = clonePoint(pointValue, 'ProductInputRouter.pointerMove');
    return point.pointerId === this.#uiPointer?.pointerId;
  }

  pointerEnd(pointValue) {
    this.#assertUsable();
    if (this.#lifecycleSuspended || this.#mode === PRODUCT_INPUT_ROUTER_MODE.INACTIVE) {
      return false;
    }
    if (this.#mode === PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY) {
      return this.#sampler.pointerEnd(pointValue);
    }
    const point = clonePoint(pointValue, 'ProductInputRouter.pointerEnd');
    const pointer = this.#uiPointer;
    if (point.pointerId !== pointer?.pointerId) return false;
    this.#uiPointer = null;
    const intent = this.#hit(point);
    if (intent === null || createProductUiIntentKey(intent) !== pointer.intentKey) return false;
    this.#dispatchIntent(intent);
    return true;
  }

  pointerCancel(pointValue) {
    this.#assertUsable();
    if (this.#lifecycleSuspended || this.#mode === PRODUCT_INPUT_ROUTER_MODE.INACTIVE) {
      return false;
    }
    if (this.#mode === PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY) {
      return this.#sampler.pointerCancel(pointValue);
    }
    const point = clonePoint(pointValue, 'ProductInputRouter.pointerCancel');
    if (point.pointerId !== this.#uiPointer?.pointerId) return false;
    this.#uiPointer = null;
    return true;
  }

  resize(viewportValue) {
    this.#assertUsable();
    const viewport = cloneViewport(viewportValue, 'ProductInputRouter.viewport');
    this.#viewport = viewport;
    this.#uiPointer = null;
    return this.#sampler.resize(viewport);
  }

  suspend() {
    this.#assertUsable();
    if (this.#lifecycleSuspended) return false;
    this.#setSamplerSuspended(true);
    this.#lifecycleSuspended = true;
    this.#uiPointer = null;
    return true;
  }

  resume() {
    this.#assertUsable();
    if (!this.#lifecycleSuspended) return false;
    this.#setSamplerSuspended(this.#mode !== PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY);
    this.#lifecycleSuspended = false;
    this.#uiPointer = null;
    return true;
  }

  sample(tick, options) {
    this.#assertUsable();
    if (
      this.#lifecycleSuspended
      || this.#mode !== PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY
      || this.#samplerSuspended
    ) throw new Error('ProductInputRouter 仅能在活跃 gameplay 模式采样。');
    if (this.#sampling) throw new Error('ProductInputRouter.sample() 不可重入。');
    this.#sampling = true;
    try {
      return this.#sampler.sample(tick, options);
    } finally {
      this.#sampling = false;
    }
  }

  replaceSampler(samplerValue) {
    this.#assertUsable();
    if (this.#sampling) throw new Error('ProductInputRouter.sample() 期间不能替换 sampler。');
    let replacement;
    try {
      replacement = validateSampler(samplerValue);
    } catch (error) {
      const failure = normalizeThrownError(error, 'Product sampler 候选无效');
      try { samplerValue?.destroy?.(); } catch (cleanupError) {
        failure.cleanupError = normalizeThrownError(cleanupError, 'Product sampler 候选清理失败');
      }
      throw failure;
    }
    if (replacement === this.#sampler) return false;
    const shouldSuspend = this.#shouldSuspendSampler();
    try {
      replacement.resize(this.#viewport);
      if (shouldSuspend) replacement.suspend();
    } catch (error) {
      const failure = normalizeThrownError(error, 'Product sampler 准备失败');
      try { replacement.destroy(); } catch (cleanupError) {
        failure.cleanupError = normalizeThrownError(cleanupError, 'Product sampler 清理失败');
      }
      throw failure;
    }
    const previous = this.#sampler;
    try {
      previous.destroy();
    } catch (error) {
      const failure = normalizeThrownError(error, '旧 Product sampler 清理失败');
      try { replacement.destroy(); } catch (cleanupError) {
        failure.cleanupError = normalizeThrownError(cleanupError, '替换 Product sampler 清理失败');
      }
      throw failure;
    }
    this.#sampler = replacement;
    this.#samplerSuspended = shouldSuspend;
    this.#uiPointer = null;
    return true;
  }

  getDebugSnapshot() {
    this.#assertUsable();
    return Object.freeze({
      mode: this.#mode,
      viewport: this.#viewport,
      lifecycleSuspended: this.#lifecycleSuspended,
      samplerSuspended: this.#samplerSuspended,
      uiPointer: this.#uiPointer,
      sampling: this.#sampling,
      sampler: this.#sampler.getDebugSnapshot?.() ?? null,
    });
  }

  destroy() {
    if (this.#destroyed) return;
    if (this.#sampling) throw new Error('sample() 期间不能销毁 ProductInputRouter。');
    this.#lifecycleSuspended = true;
    this.#uiPointer = null;
    this.#sampler.destroy();
    this.#sampler = null;
    this.#destroyed = true;
  }
}
