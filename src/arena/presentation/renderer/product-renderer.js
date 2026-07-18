import { normalizeThrownError } from '../../lifecycle-error.js';
import { ArenaGreyboxRenderer } from '../three/arena-greybox-renderer.js';

export const PRODUCT_RENDERER_STATE = Object.freeze({
  CREATED: 'created',
  READY: 'ready',
  CONTEXT_LOST: 'context-lost',
  FAILED: 'failed',
  DISPOSE_INCOMPLETE: 'dispose-incomplete',
  DISPOSED: 'disposed',
});

function requiredFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value;
}

function validateSurface(value) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('ProductRenderer.uiSurface 无效。');
  }
  for (const method of [
    'load',
    'render',
    'resize',
    'getInputViewport',
    'hitTestUi',
    'bindIntent',
    'requiresCompositeFrame',
    'present',
    'dispose',
  ]) requiredFunction(value[method], `ProductRenderer.uiSurface.${method}`);
  return value;
}

function validateGameplayRenderer(value) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('ProductRenderer.gameplayRenderer 无效。');
  }
  for (const method of [
    'load',
    'render',
    'renderComposite',
    'resize',
    'getInputViewport',
    'handleContextLost',
    'handleContextRestored',
    'dispose',
  ]) requiredFunction(value[method], `ProductRenderer.gameplayRenderer.${method}`);
  return value;
}

function validateFrame(value) {
  if (!value || typeof value !== 'object' || !value.viewModel) {
    throw new TypeError('ProductRenderer frame 必须包含 viewModel。');
  }
  return value;
}

function cleanupFailure(errors) {
  if (errors.length === 0) return null;
  const failure = new Error('ProductRenderer 清理未完整完成。');
  failure.cleanupErrors = errors.map((error) => normalizeThrownError(
    error,
    'ProductRenderer 子资源清理失败',
  ));
  return failure;
}

/**
 * Host-neutral product compositor. Product chrome and gameplay rendering have
 * separate ownership and both consume read-only presentation snapshots.
 */
export class ProductRenderer {
  #gameplayRenderer;
  #uiSurface;
  #state;
  #contextLost;
  #loadPromise;
  #loadGeneration;
  #loaded;
  #rendering;
  #lastError;

  constructor({
    canvas,
    platform,
    gameplayRendererFactory = (args) => new ArenaGreyboxRenderer(args),
    uiSurfaceFactory,
  }) {
    if (!canvas || typeof canvas.getContext !== 'function') {
      throw new TypeError('ProductRenderer 需要 Canvas。');
    }
    requiredFunction(gameplayRendererFactory, 'ProductRenderer.gameplayRendererFactory');
    requiredFunction(uiSurfaceFactory, 'ProductRenderer.uiSurfaceFactory');
    this.#gameplayRenderer = null;
    this.#uiSurface = null;
    this.#state = PRODUCT_RENDERER_STATE.CREATED;
    this.#contextLost = false;
    this.#loadPromise = null;
    this.#loadGeneration = 0;
    this.#loaded = false;
    this.#rendering = false;
    this.#lastError = null;
    try {
      this.#gameplayRenderer = gameplayRendererFactory({
        canvas,
        platform,
      });
      validateGameplayRenderer(this.#gameplayRenderer);
      this.#uiSurface = uiSurfaceFactory({ canvas, platform });
      validateSurface(this.#uiSurface);
    } catch (error) {
      const cause = normalizeThrownError(error, 'ProductRenderer 初始化失败');
      this.#lastError = cause;
      this.#state = PRODUCT_RENDERER_STATE.FAILED;
      try { this.dispose(); } catch { /* preserve construction cause */ }
      const failure = new Error('ProductRenderer 初始化失败。');
      failure.cause = cause;
      throw failure;
    }
    Object.freeze(this);
  }

  get state() {
    return this.#state;
  }

  #assertUsable() {
    if (this.#state === PRODUCT_RENDERER_STATE.DISPOSED) {
      throw new Error('ProductRenderer 已销毁。');
    }
    if (
      this.#state === PRODUCT_RENDERER_STATE.FAILED
      || this.#state === PRODUCT_RENDERER_STATE.DISPOSE_INCOMPLETE
    ) {
      const failure = new Error(`ProductRenderer 当前状态不可用：${this.#state}。`);
      failure.cause = this.#lastError;
      throw failure;
    }
  }

  async #performLoad(generation, gameplayRenderer, uiSurface) {
    try {
      await gameplayRenderer.load();
      if (generation !== this.#loadGeneration) throw new Error('ProductRenderer 加载已取消。');
      await uiSurface.load();
      if (generation !== this.#loadGeneration) throw new Error('ProductRenderer 加载已取消。');
      this.#loaded = true;
      if (this.#contextLost) {
        gameplayRenderer.handleContextLost();
        this.#state = PRODUCT_RENDERER_STATE.CONTEXT_LOST;
      } else {
        this.#state = PRODUCT_RENDERER_STATE.READY;
      }
      return this;
    } catch (error) {
      if (generation !== this.#loadGeneration) throw error;
      this.#lastError = normalizeThrownError(error, 'ProductRenderer 加载失败');
      this.#state = PRODUCT_RENDERER_STATE.FAILED;
      const failure = new Error('ProductRenderer 加载失败。');
      failure.cause = this.#lastError;
      throw failure;
    }
  }

  load() {
    this.#assertUsable();
    if (
      this.#loaded
      && (
        this.#state === PRODUCT_RENDERER_STATE.READY
        || this.#state === PRODUCT_RENDERER_STATE.CONTEXT_LOST
      )
    ) return Promise.resolve(this);
    if (this.#loadPromise !== null) return this.#loadPromise;
    const generation = this.#loadGeneration;
    let operation;
    operation = this.#performLoad(
      generation,
      this.#gameplayRenderer,
      this.#uiSurface,
    ).finally(() => {
      if (this.#loadPromise === operation) this.#loadPromise = null;
    });
    this.#loadPromise = operation;
    return operation;
  }

  render(frameValue, options = {}) {
    this.#assertUsable();
    if (this.#state === PRODUCT_RENDERER_STATE.CONTEXT_LOST) return false;
    if (this.#state !== PRODUCT_RENDERER_STATE.READY) {
      throw new Error(`ProductRenderer 无法在 ${this.#state} 状态 render。`);
    }
    if (this.#rendering) throw new Error('ProductRenderer.render() 不可重入。');
    const frame = validateFrame(frameValue);
    this.#rendering = true;
    try {
      const surfaceRendered = this.#uiSurface.render(frame.viewModel, options);
      if (surfaceRendered === false) return false;
      if (
        (frame.matchFrame === null || frame.matchFrame === undefined)
        && this.#uiSurface.requiresCompositeFrame() === false
      ) return true;
      return this.#gameplayRenderer.renderComposite(
        frame.matchFrame ?? null,
        this.#uiSurface,
        options,
      ) !== false;
    } catch (error) {
      this.#lastError = normalizeThrownError(error, 'ProductRenderer 渲染失败');
      throw error;
    } finally {
      this.#rendering = false;
    }
  }

  resize(viewport) {
    this.#assertUsable();
    const gameplayResized = this.#gameplayRenderer.resize(viewport);
    if (gameplayResized === false) return false;
    const inputViewport = this.#gameplayRenderer.getInputViewport();
    return this.#uiSurface.resize(viewport, inputViewport) !== false;
  }

  getInputViewport() {
    this.#assertUsable();
    return this.#uiSurface.getInputViewport(this.#gameplayRenderer.getInputViewport());
  }

  hitTestUi(point, viewport, viewModel) {
    this.#assertUsable();
    return this.#uiSurface.hitTestUi(point, viewport, viewModel);
  }

  bindUiIntent(handlers) {
    this.#assertUsable();
    return this.#uiSurface.bindIntent(handlers);
  }

  handleContextLost(event) {
    if (
      this.#state === PRODUCT_RENDERER_STATE.DISPOSED
      || this.#state === PRODUCT_RENDERER_STATE.FAILED
      || this.#state === PRODUCT_RENDERER_STATE.DISPOSE_INCOMPLETE
    ) return false;
    const handled = this.#gameplayRenderer?.handleContextLost(event) ?? false;
    this.#contextLost = true;
    this.#state = PRODUCT_RENDERER_STATE.CONTEXT_LOST;
    return handled;
  }

  handleContextRestored() {
    if (!this.#contextLost || this.#state !== PRODUCT_RENDERER_STATE.CONTEXT_LOST) return false;
    const restored = this.#gameplayRenderer.handleContextRestored();
    if (restored) {
      this.#contextLost = false;
      this.#state = PRODUCT_RENDERER_STATE.READY;
    }
    return restored;
  }

  getDebugSnapshot() {
    return Object.freeze({
      state: this.#state,
      contextLost: this.#contextLost,
      loaded: this.#loaded,
      rendering: this.#rendering,
      lastError: this.#lastError,
      gameplay: this.#gameplayRenderer?.getDebugSnapshot?.() ?? null,
      ui: this.#uiSurface?.getDebugSnapshot?.() ?? null,
    });
  }

  dispose() {
    if (this.#state === PRODUCT_RENDERER_STATE.DISPOSED) return;
    if (this.#rendering) throw new Error('render() 期间不能销毁 ProductRenderer。');
    this.#loadGeneration += 1;
    const errors = [];
    if (this.#uiSurface !== null) {
      try {
        this.#uiSurface.dispose();
        this.#uiSurface = null;
      } catch (error) {
        errors.push(error);
      }
    }
    if (this.#gameplayRenderer !== null) {
      try {
        this.#gameplayRenderer.dispose();
        this.#gameplayRenderer = null;
      } catch (error) {
        errors.push(error);
      }
    }
    const failure = cleanupFailure(errors);
    if (failure) {
      this.#lastError = failure;
      this.#state = PRODUCT_RENDERER_STATE.DISPOSE_INCOMPLETE;
      throw failure;
    }
    this.#lastError = null;
    this.#contextLost = false;
    this.#loaded = false;
    this.#state = PRODUCT_RENDERER_STATE.DISPOSED;
  }
}
