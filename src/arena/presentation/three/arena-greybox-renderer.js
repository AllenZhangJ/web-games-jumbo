import * as THREE from 'three';
import {
  ARENA_V1_DEFAULT_PRESENTATION_QUALITY,
  createPresentationQualityDefinition,
} from '@number-strategy-jump/arena-presentation-runtime';
import { ArenaImpactAudio } from '../audio/arena-impact-audio.js';
import {
  ARENA_GREYBOX_COLOR,
  ArenaHudLayer,
  ArenaWorldStage,
  GltfPresentationAssetLoader,
} from '@number-strategy-jump/arena-presentation-three';
import { ARENA_V1_GREYBOX_CONTENT } from '../content/arena-v1-greybox-content.js';

const EMPTY_EVENTS = Object.freeze([]);

function feedbackEventsAfter(events, sequence) {
  let result = null;
  for (const event of events) {
    if (!Number.isInteger(event.sequence) || event.sequence <= sequence) continue;
    if (result === null) result = [];
    result.push(event);
  }
  return result ?? EMPTY_EVENTS;
}

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

function normalizeViewport(value, maximumPixelRatio) {
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
      maximumPixelRatio,
      Number.isFinite(value.pixelRatio) ? value.pixelRatio : 1,
    )),
    safeArea: value.safeArea ?? null,
  });
}

export const ARENA_GREYBOX_RENDERER_STATE = Object.freeze({
  CREATED: 'created',
  LOADING: 'loading',
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
  #qualityDefinition;
  #lastFeedbackMatchSeed;
  #lastFeedbackTick;
  #lastFeedbackSequence;
  #impactAudio;
  #loadPromise;
  #resourcesLoaded;

  constructor({
    canvas,
    platform,
    qualityDefinition = ARENA_V1_DEFAULT_PRESENTATION_QUALITY,
    content = ARENA_V1_GREYBOX_CONTENT,
    webglRendererFactory = (options) => new THREE.WebGLRenderer(options),
  }) {
    if (!canvas || typeof canvas.getContext !== 'function') {
      throw new TypeError('ArenaGreyboxRenderer 需要 Canvas。');
    }
    this.canvas = canvas;
    this.#platform = validatePlatform(platform);
    this.#qualityDefinition = createPresentationQualityDefinition(qualityDefinition);
    this.#renderer = null;
    this.#stage = null;
    this.#hud = null;
    this.#state = ARENA_GREYBOX_RENDERER_STATE.CREATED;
    this.#viewport = null;
    this.#rendering = false;
    this.#lastError = null;
    this.#lastFeedbackMatchSeed = null;
    this.#lastFeedbackTick = -1;
    this.#lastFeedbackSequence = -1;
    this.#impactAudio = null;
    this.#loadPromise = null;
    this.#resourcesLoaded = false;
    try {
      const contextAttributes = {
        alpha: false,
        antialias: this.#qualityDefinition.antialiasEnabled,
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
      this.#renderer.shadowMap.enabled = this.#qualityDefinition.shadowsEnabled;
      this.#renderer.shadowMap.type = THREE.PCFShadowMap;
      this.#renderer.setClearColor?.(ARENA_GREYBOX_COLOR.background, 1);
      this.#renderer.autoClear = false;
      this.#stage = new ArenaWorldStage({
        content,
        maximumEffects: this.#qualityDefinition.maximumEffects,
        presentationAssetLoader: typeof this.#platform.readAssetBytes === 'function'
          ? new GltfPresentationAssetLoader({
            readAssetBytes: this.#platform.readAssetBytes.bind(this.#platform),
            createImage: typeof this.#platform.createImage === 'function'
              ? this.#platform.createImage.bind(this.#platform)
              : null,
          })
          : null,
      });
      this.#hud = new ArenaHudLayer(platform);
      this.#impactAudio = new ArenaImpactAudio({
        createAudio: typeof this.#platform.createAudio === 'function'
          ? this.#platform.createAudio.bind(this.#platform)
          : () => null,
      });
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

  load() {
    if (this.#state === ARENA_GREYBOX_RENDERER_STATE.DISPOSED) {
      return Promise.reject(new Error('ArenaGreyboxRenderer 已销毁。'));
    }
    if (this.#state === ARENA_GREYBOX_RENDERER_STATE.FAILED) {
      const error = new Error('ArenaGreyboxRenderer 已失败。');
      error.cause = this.#lastError;
      return Promise.reject(error);
    }
    if (this.#resourcesLoaded) return Promise.resolve(this);
    if (this.#loadPromise) return this.#loadPromise;
    this.#state = ARENA_GREYBOX_RENDERER_STATE.LOADING;
    let operation;
    operation = Promise.resolve()
      .then(() => this.#stage.load?.())
      .then(() => {
        if (this.#state === ARENA_GREYBOX_RENDERER_STATE.DISPOSED) {
          throw new Error('ArenaGreyboxRenderer 加载已取消。');
        }
        this.#impactAudio.load();
        this.#resourcesLoaded = true;
        this.resize(this.#platform.getViewport());
        if (this.#state !== ARENA_GREYBOX_RENDERER_STATE.CONTEXT_LOST) {
          this.#state = ARENA_GREYBOX_RENDERER_STATE.READY;
        }
        return this;
      })
      .catch((error) => {
        if (this.#state === ARENA_GREYBOX_RENDERER_STATE.DISPOSED) throw error;
        this.#lastError = error;
        this.#state = ARENA_GREYBOX_RENDERER_STATE.FAILED;
        const failure = new Error('竞技场灰盒 Renderer 加载失败。');
        failure.cause = error;
        throw failure;
      })
      .finally(() => {
        if (this.#loadPromise === operation) this.#loadPromise = null;
      });
    this.#loadPromise = operation;
    return operation;
  }

  resize(viewport = this.#platform.getViewport()) {
    if (
      this.#state === ARENA_GREYBOX_RENDERER_STATE.DISPOSED
      || this.#state === ARENA_GREYBOX_RENDERER_STATE.FAILED
    ) return false;
    const normalized = normalizeViewport(viewport, this.#qualityDefinition.maximumPixelRatio);
    this.#viewport = normalized;
    if (this.#state !== ARENA_GREYBOX_RENDERER_STATE.CONTEXT_LOST) {
      this.#renderer.setPixelRatio(normalized.pixelRatio);
      this.#renderer.setSize(normalized.width, normalized.height, false);
    }
    if (this.canvas.style) {
      this.canvas.style.width = `${normalized.width}px`;
      this.canvas.style.height = `${normalized.height}px`;
    }
    this.#stage.resize(normalized);
    this.#hud.resize(normalized);
    return true;
  }

  render(
    frame,
    {
      deltaSeconds = 0,
      mode = 'match',
      mapperLabel = '',
      soundEnabled = true,
      reducedMotion = false,
    } = {},
  ) {
    if (frame === null || frame === undefined) {
      throw new TypeError('ArenaGreyboxRenderer.render() 需要比赛表现帧。');
    }
    return this.#renderFrame(frame, null, {
      deltaSeconds,
      mode,
      mapperLabel,
      soundEnabled,
      reducedMotion,
    });
  }

  renderComposite(
    frame,
    overlay,
    {
      deltaSeconds = 0,
      mode = 'match',
      mapperLabel = '',
      soundEnabled = true,
      reducedMotion = false,
    } = {},
  ) {
    if (!overlay || typeof overlay.present !== 'function') {
      throw new TypeError('ArenaGreyboxRenderer.renderComposite() 需要 overlay.present()。');
    }
    return this.#renderFrame(frame, overlay, {
      deltaSeconds,
      mode,
      mapperLabel,
      soundEnabled,
      reducedMotion,
    });
  }

  #renderFrame(
    frame,
    overlay,
    { deltaSeconds, mode, mapperLabel, soundEnabled, reducedMotion },
  ) {
    if (this.#state === ARENA_GREYBOX_RENDERER_STATE.CONTEXT_LOST) return false;
    if (this.#state !== ARENA_GREYBOX_RENDERER_STATE.READY) {
      throw new Error(`ArenaGreyboxRenderer 无法在 ${this.#state} 状态 render。`);
    }
    if (this.#rendering) throw new Error('ArenaGreyboxRenderer.render() 不可重入。');
    this.#rendering = true;
    try {
      this.#renderer.clear(true, true, true);
      if (frame !== null && frame !== undefined) {
        if (typeof soundEnabled !== 'boolean' || typeof reducedMotion !== 'boolean') {
          throw new TypeError('ArenaGreyboxRenderer soundEnabled/reducedMotion 必须是布尔值。');
        }
        this.#emitEventFeedback(frame, { soundEnabled, reducedMotion });
        this.#stage.sync(frame, { reducedMotion });
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

  #emitEventFeedback(frame, { soundEnabled, reducedMotion }) {
    if (!frame?.source || !Array.isArray(frame.events)) return;
    const matchChanged = this.#lastFeedbackMatchSeed !== frame.source.matchSeed
      || frame.source.tick < this.#lastFeedbackTick;
    if (matchChanged) this.#lastFeedbackSequence = -1;
    const unseenEvents = feedbackEventsAfter(frame.events, this.#lastFeedbackSequence);
    for (const event of unseenEvents) {
      if (event.type === 'HitResolved') {
        const heavy = event.action === 'hammer-smash' || event.action === 'shield-charge';
        try {
          this.#platform.vibrate?.(heavy && !reducedMotion ? 'heavy' : 'light');
        } catch { /* optional feedback */ }
        this.#impactAudio.play(event.action, { enabled: soundEnabled });
      }
      this.#lastFeedbackSequence = Math.max(this.#lastFeedbackSequence, event.sequence);
    }
    this.#lastFeedbackMatchSeed = frame.source.matchSeed;
    this.#lastFeedbackTick = frame.source.tick;
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
    if (!this.#resourcesLoaded) {
      this.#state = ARENA_GREYBOX_RENDERER_STATE.LOADING;
      return true;
    }
    this.#stage.resetTransient();
    this.#lastFeedbackMatchSeed = null;
    this.#lastFeedbackTick = -1;
    this.#lastFeedbackSequence = -1;
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
    if (this.#state === ARENA_GREYBOX_RENDERER_STATE.CONTEXT_LOST) {
      return Object.freeze({
        width: Math.max(1, Math.round(this.#viewport.width * this.#viewport.pixelRatio)),
        height: Math.max(1, Math.round(this.#viewport.height * this.#viewport.pixelRatio)),
      });
    }
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
      qualityDefinitionId: this.#qualityDefinition.id,
      qualityDefinitionHash: this.#qualityDefinition.getContentHash(),
      viewport: this.#viewport,
      inputViewport: this.#viewport ? this.getInputViewport() : null,
      lastError: this.#lastError,
      stage: this.#stage?.getDebugSnapshot() ?? null,
      hud: this.#hud?.getDebugSnapshot() ?? null,
      audio: this.#impactAudio?.getDebugSnapshot() ?? null,
    });
  }

  getPerformanceSnapshot() {
    if (this.#state === ARENA_GREYBOX_RENDERER_STATE.DISPOSED) return null;
    const info = this.#renderer?.info ?? null;
    const render = info?.render ?? null;
    const memory = info?.memory ?? null;
    const programs = info?.programs;
    const integerOrNull = (value) => (
      Number.isSafeInteger(value) && value >= 0 ? value : null
    );
    return Object.freeze({
      drawCalls: integerOrNull(render?.calls),
      triangles: integerOrNull(render?.triangles),
      points: integerOrNull(render?.points),
      lines: integerOrNull(render?.lines),
      programs: Array.isArray(programs) ? programs.length : integerOrNull(programs),
      geometries: integerOrNull(memory?.geometries),
      textures: integerOrNull(memory?.textures),
      jsHeapBytes: null,
      processMemoryBytes: null,
    });
  }

  dispose() {
    if (this.#state === ARENA_GREYBOX_RENDERER_STATE.DISPOSED) return;
    if (this.#rendering) throw new Error('render() 期间不能销毁 ArenaGreyboxRenderer。');
    const errors = [];
    for (const value of [this.#impactAudio, this.#hud, this.#stage, this.#renderer]) {
      try { value?.dispose?.(); } catch (error) { errors.push(error); }
    }
    try { this.#renderer?.forceContextLoss?.(); } catch (error) { errors.push(error); }
    this.#hud = null;
    this.#stage = null;
    this.#impactAudio = null;
    this.#renderer = null;
    this.#resourcesLoaded = false;
    this.#state = ARENA_GREYBOX_RENDERER_STATE.DISPOSED;
    if (errors.length > 0) {
      const failure = new Error('ArenaGreyboxRenderer 清理未完整完成。');
      failure.causes = errors;
      throw failure;
    }
  }
}
