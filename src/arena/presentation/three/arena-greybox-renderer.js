import * as THREE from 'three';
import { ArenaHudLayer } from './arena-hud-layer.js';
import { ARENA_GREYBOX_COLOR, ARENA_GREYBOX_DESIGN } from './greybox-style.js';
import { ArenaWorldStage } from './arena-world-stage.js';

function requiredFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value;
}

function validatePlatform(value) {
  if (!value || typeof value !== 'object') throw new TypeError('ArenaGreyboxRenderer.platform 无效。');
  for (const method of ['getWebGLContext', 'getViewport', 'createOffscreenCanvas']) {
    requiredFunction(value[method], `ArenaGreyboxRenderer.platform.${method}`);
  }
  return value;
}

function normalizeViewport(value) {
  if (!value || !Number.isFinite(value.width) || !Number.isFinite(value.height)) {
    throw new TypeError('Arena viewport width/height 必须是有限数。');
  }
  if (value.width <= 0 || value.height <= 0) {
    throw new RangeError('Arena viewport width/height 必须大于 0。');
  }
  return Object.freeze({
    width: value.width,
    height: value.height,
    pixelRatio: Math.max(0.5, Math.min(
      ARENA_GREYBOX_DESIGN.maximumPixelRatio,
      Number.isFinite(value.pixelRatio) ? value.pixelRatio : 1,
    )),
    safeArea: value.safeArea ?? null,
  });
}

export const ARENA_GREYBOX_RENDERER_STATE = Object.freeze({
  CREATED: 'created',
  READY: 'ready',
  CONTEXT_LOST: 'context-lost',
  FAILED: 'failed',
  DISPOSED: 'disposed',
});

export class ArenaGreyboxRenderer {
  #platform;
  #renderer;
  #stage;
  #hud;
  #state;
  #viewport;
  #rendering;
  #lastError;

  constructor({ canvas, platform, webglRendererFactory = (options) => new THREE.WebGLRenderer(options) }) {
    if (!canvas || typeof canvas.getContext !== 'function') {
      throw new TypeError('ArenaGreyboxRenderer 需要 Canvas。');
    }
    this.canvas = canvas;
    this.#platform = validatePlatform(platform);
    this.#renderer = null;
    this.#stage = null;
    this.#hud = null;
    this.#state = ARENA_GREYBOX_RENDERER_STATE.CREATED;
    this.#viewport = null;
    this.#rendering = false;
    this.#lastError = null;
    try {
      const contextAttributes = {
        alpha: false,
        antialias: true,
        depth: true,
        stencil: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
      };
      const context = this.#platform.getWebGLContext(canvas, contextAttributes);
      this.#renderer = webglRendererFactory({
        canvas,
        context,
        ...contextAttributes,
      });
      for (const method of ['setPixelRatio', 'setSize', 'render', 'clear', 'clearDepth', 'dispose']) {
        requiredFunction(this.#renderer?.[method], `WebGLRenderer.${method}`);
      }
      this.#renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.#renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.#renderer.toneMappingExposure = 1.05;
      this.#renderer.shadowMap.enabled = true;
      this.#renderer.shadowMap.type = THREE.PCFShadowMap;
      this.#renderer.setClearColor?.(ARENA_GREYBOX_COLOR.background, 1);
      this.#renderer.autoClear = false;
      this.#stage = new ArenaWorldStage();
      this.#hud = new ArenaHudLayer(platform);
    } catch (error) {
      this.#lastError = error;
      this.#state = ARENA_GREYBOX_RENDERER_STATE.FAILED;
      try { this.dispose(); } catch { /* preserve initialization cause */ }
      const failure = new Error('竞技场灰盒 Renderer 初始化失败。');
      failure.cause = error;
      throw failure;
    }
  }

  get state() {
    return this.#state;
  }

  async load() {
    if (this.#state === ARENA_GREYBOX_RENDERER_STATE.DISPOSED) {
      throw new Error('ArenaGreyboxRenderer 已销毁。');
    }
    if (this.#state === ARENA_GREYBOX_RENDERER_STATE.FAILED) {
      const error = new Error('ArenaGreyboxRenderer 已失败。');
      error.cause = this.#lastError;
      throw error;
    }
    if (this.#state === ARENA_GREYBOX_RENDERER_STATE.READY) return this;
    try {
      this.resize(this.#platform.getViewport());
      this.#state = ARENA_GREYBOX_RENDERER_STATE.READY;
      return this;
    } catch (error) {
      this.#lastError = error;
      this.#state = ARENA_GREYBOX_RENDERER_STATE.FAILED;
      const failure = new Error('竞技场灰盒 Renderer 加载失败。');
      failure.cause = error;
      throw failure;
    }
  }

  resize(viewport = this.#platform.getViewport()) {
    if (
      this.#state === ARENA_GREYBOX_RENDERER_STATE.DISPOSED
      || this.#state === ARENA_GREYBOX_RENDERER_STATE.FAILED
    ) return false;
    const normalized = normalizeViewport(viewport);
    this.#viewport = normalized;
    this.#renderer.setPixelRatio(normalized.pixelRatio);
    this.#renderer.setSize(normalized.width, normalized.height, false);
    if (this.canvas.style) {
      this.canvas.style.width = `${normalized.width}px`;
      this.canvas.style.height = `${normalized.height}px`;
    }
    this.#stage.resize(normalized);
    this.#hud.resize(normalized);
    return true;
  }

  render(frame, { deltaSeconds = 0, mode = 'match', mapperLabel = '' } = {}) {
    if (frame === null || frame === undefined) {
      throw new TypeError('ArenaGreyboxRenderer.render() 需要比赛表现帧。');
    }
    return this.#renderFrame(frame, null, { deltaSeconds, mode, mapperLabel });
  }

  renderComposite(
    frame,
    overlay,
    { deltaSeconds = 0, mode = 'match', mapperLabel = '' } = {},
  ) {
    if (!overlay || typeof overlay.present !== 'function') {
      throw new TypeError('ArenaGreyboxRenderer.renderComposite() 需要 overlay.present()。');
    }
    return this.#renderFrame(frame, overlay, { deltaSeconds, mode, mapperLabel });
  }

  #renderFrame(frame, overlay, { deltaSeconds, mode, mapperLabel }) {
    if (this.#state === ARENA_GREYBOX_RENDERER_STATE.CONTEXT_LOST) return false;
    if (this.#state !== ARENA_GREYBOX_RENDERER_STATE.READY) {
      throw new Error(`ArenaGreyboxRenderer 无法在 ${this.#state} 状态 render。`);
    }
    if (this.#rendering) throw new Error('ArenaGreyboxRenderer.render() 不可重入。');
    this.#rendering = true;
    try {
      this.#renderer.clear(true, true, true);
      if (frame !== null && frame !== undefined) {
        this.#stage.sync(frame);
        this.#stage.update(deltaSeconds);
        this.#hud.sync(frame, { mode, mapperLabel });
        this.#renderer.render(this.#stage.scene, this.#stage.camera);
        this.#renderer.clearDepth();
        this.#hud.render(this.#renderer);
      }
      if (overlay !== null) {
        this.#renderer.clearDepth();
        if (overlay.present(this.#renderer) === false) return false;
      }
      return true;
    } catch (error) {
      this.#lastError = error;
      throw error;
    } finally {
      this.#rendering = false;
    }
  }

  handleContextLost(event) {
    event?.preventDefault?.();
    if (
      this.#state === ARENA_GREYBOX_RENDERER_STATE.DISPOSED
      || this.#state === ARENA_GREYBOX_RENDERER_STATE.FAILED
    ) return false;
    this.#state = ARENA_GREYBOX_RENDERER_STATE.CONTEXT_LOST;
    return true;
  }

  handleContextRestored() {
    if (this.#state !== ARENA_GREYBOX_RENDERER_STATE.CONTEXT_LOST) return false;
    this.#stage.resetTransient();
    this.resize(this.#viewport ?? this.#platform.getViewport());
    this.#state = ARENA_GREYBOX_RENDERER_STATE.READY;
    return true;
  }

  hitTestRematch(point) {
    if (!this.#viewport || !this.#hud) return false;
    return this.#hud.hitTestRematch(point, this.getInputViewport());
  }

  getInputViewport() {
    if (!this.#viewport) throw new Error('ArenaGreyboxRenderer 尚未 resize。');
    return Object.freeze({
      width: Math.max(1, Number(this.canvas.width) || this.#viewport.width),
      height: Math.max(1, Number(this.canvas.height) || this.#viewport.height),
    });
  }

  getDebugSnapshot() {
    if (this.#state === ARENA_GREYBOX_RENDERER_STATE.DISPOSED) {
      return Object.freeze({ state: this.#state, viewport: this.#viewport, lastError: this.#lastError });
    }
    return Object.freeze({
      state: this.#state,
      viewport: this.#viewport,
      inputViewport: this.#viewport ? this.getInputViewport() : null,
      lastError: this.#lastError,
      stage: this.#stage?.getDebugSnapshot() ?? null,
      hud: this.#hud?.getDebugSnapshot() ?? null,
    });
  }

  dispose() {
    if (this.#state === ARENA_GREYBOX_RENDERER_STATE.DISPOSED) return;
    if (this.#rendering) throw new Error('render() 期间不能销毁 ArenaGreyboxRenderer。');
    const errors = [];
    for (const value of [this.#hud, this.#stage, this.#renderer]) {
      try { value?.dispose?.(); } catch (error) { errors.push(error); }
    }
    try { this.#renderer?.forceContextLoss?.(); } catch (error) { errors.push(error); }
    this.#hud = null;
    this.#stage = null;
    this.#renderer = null;
    this.#state = ARENA_GREYBOX_RENDERER_STATE.DISPOSED;
    if (errors.length > 0) {
      const failure = new Error('ArenaGreyboxRenderer 清理未完整完成。');
      failure.causes = errors;
      throw failure;
    }
  }
}
