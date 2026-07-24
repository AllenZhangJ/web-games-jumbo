import { cloneFrozenData, normalizeThrownError } from '@number-strategy-jump/arena-contracts';
import {
  ArenaImpactAudio,
  ARENA_V1_DEFAULT_PRESENTATION_QUALITY,
  createPresentationQualityDefinition,
} from '@number-strategy-jump/arena-presentation-runtime';
import * as THREE from 'three';
import { ArenaHudLayer } from './arena-hud-layer.js';
import { ArenaWorldStage } from './arena-world-stage.js';
import { GltfPresentationAssetLoader } from './gltf-presentation-asset-loader.js';
import { ARENA_GREYBOX_COLOR } from './greybox-style.js';

type UnknownMethod = (...args: unknown[]) => unknown;

const OPTION_KEYS = new Set<PropertyKey>([
  'canvas', 'platform', 'qualityDefinition', 'content', 'webglRendererFactory',
]);
const RENDER_OPTION_KEYS = new Set<PropertyKey>([
  'deltaSeconds', 'mode', 'mapperLabel', 'soundEnabled', 'reducedMotion',
]);
const EMPTY_EVENTS = Object.freeze([]) as readonly FeedbackEvent[];

export const ARENA_GREYBOX_RENDERER_STATE = Object.freeze({
  CREATED: 'created',
  LOADING: 'loading',
  READY: 'ready',
  CONTEXT_LOST: 'context-lost',
  FAILED: 'failed',
  DISPOSE_INCOMPLETE: 'dispose-incomplete',
  DISPOSED: 'disposed',
} as const);

interface RendererPlatform {
  readonly getWebGLContext: UnknownMethod;
  readonly getViewport: UnknownMethod;
  readonly createOffscreenCanvas: UnknownMethod;
  readonly readAssetBytes: UnknownMethod | null;
  readonly createImage: UnknownMethod | null;
  readonly createAudio: UnknownMethod | null;
  readonly vibrate: UnknownMethod | null;
}

interface WebGlRendererPort {
  readonly value: Record<PropertyKey, unknown>;
  readonly setPixelRatio: UnknownMethod;
  readonly setSize: UnknownMethod;
  readonly render: UnknownMethod;
  readonly clear: UnknownMethod;
  readonly clearDepth: UnknownMethod;
  readonly dispose: UnknownMethod;
  readonly forceContextLoss: UnknownMethod | null;
  readonly setClearColor: UnknownMethod | null;
}

interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
  readonly safeArea: unknown;
}

interface RenderOptions {
  readonly deltaSeconds: number;
  readonly mode: string;
  readonly mapperLabel: string;
  readonly soundEnabled: boolean;
  readonly reducedMotion: boolean;
}

interface FeedbackEvent {
  readonly sequence: number;
  readonly type: string;
  readonly action: string | null;
}

interface FeedbackFrame {
  readonly matchSeed: number;
  readonly tick: number;
  readonly events: readonly FeedbackEvent[];
}

interface CleanupState {
  audio: boolean;
  hud: boolean;
  stage: boolean;
  renderer: boolean;
  context: boolean;
}

function assertRecord(value: unknown, name: string): asserts value is Record<PropertyKey, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
}

function assertKnownKeys(value: unknown, allowed: ReadonlySet<PropertyKey>, name: string): void {
  assertRecord(value, name);
  const unknown = Reflect.ownKeys(value).find((key) => !allowed.has(key));
  if (unknown !== undefined) throw new TypeError(`${name} 包含未知字段 ${String(unknown)}。`);
}

function ownData(value: unknown, key: PropertyKey, name: string, required = true): unknown {
  assertRecord(value, name);
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) {
    if (!required) return undefined;
    throw new TypeError(`${name}.${String(key)} 缺失。`);
  }
  if (!Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${String(key)} 必须是数据字段。`);
  }
  return descriptor.value;
}

function snapshotMethod(
  value: unknown,
  name: string,
  methodName: string,
  required = true,
): UnknownMethod | null {
  assertRecord(value, name);
  let owner: object | null = value;
  while (owner) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, methodName);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${methodName} 必须是数据方法。`);
      }
      const method = descriptor.value as UnknownMethod;
      return (...args: unknown[]) => method.call(value, ...args);
    }
    owner = Object.getPrototypeOf(owner) as object | null;
  }
  if (required) throw new TypeError(`${name} 缺少 ${methodName}()。`);
  return null;
}

function finiteNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} 必须是有限数。`);
  }
  return value;
}

function nonNegativeInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name} 必须是非负安全整数。`);
  }
  return value as number;
}

function aggregate(message: string, cause: unknown, cleanupCauses: readonly unknown[]): Error {
  const failure = new Error(message);
  failure.cause = normalizeThrownError(cause, message);
  Object.defineProperty(failure, 'cleanupCauses', {
    value: Object.freeze(cleanupCauses.map((value) => normalizeThrownError(value, `${message}清理失败`))),
  });
  return failure;
}

function snapshotPlatform(value: unknown): RendererPlatform {
  assertRecord(value, 'ArenaGreyboxRenderer.platform');
  return Object.freeze({
    getWebGLContext: snapshotMethod(value, 'ArenaGreyboxRenderer.platform', 'getWebGLContext')!,
    getViewport: snapshotMethod(value, 'ArenaGreyboxRenderer.platform', 'getViewport')!,
    createOffscreenCanvas: snapshotMethod(value, 'ArenaGreyboxRenderer.platform', 'createOffscreenCanvas')!,
    readAssetBytes: snapshotMethod(value, 'ArenaGreyboxRenderer.platform', 'readAssetBytes', false),
    createImage: snapshotMethod(value, 'ArenaGreyboxRenderer.platform', 'createImage', false),
    createAudio: snapshotMethod(value, 'ArenaGreyboxRenderer.platform', 'createAudio', false),
    vibrate: snapshotMethod(value, 'ArenaGreyboxRenderer.platform', 'vibrate', false),
  });
}

function snapshotRenderer(value: unknown): WebGlRendererPort {
  assertRecord(value, 'ArenaGreyboxRenderer WebGLRenderer');
  return Object.freeze({
    value,
    setPixelRatio: snapshotMethod(value, 'WebGLRenderer', 'setPixelRatio')!,
    setSize: snapshotMethod(value, 'WebGLRenderer', 'setSize')!,
    render: snapshotMethod(value, 'WebGLRenderer', 'render')!,
    clear: snapshotMethod(value, 'WebGLRenderer', 'clear')!,
    clearDepth: snapshotMethod(value, 'WebGLRenderer', 'clearDepth')!,
    dispose: snapshotMethod(value, 'WebGLRenderer', 'dispose')!,
    forceContextLoss: snapshotMethod(value, 'WebGLRenderer', 'forceContextLoss', false),
    setClearColor: snapshotMethod(value, 'WebGLRenderer', 'setClearColor', false),
  });
}

function normalizeViewport(value: unknown, maximumPixelRatio: number): Viewport {
  assertRecord(value, 'Arena viewport');
  const width = finiteNumber(ownData(value, 'width', 'Arena viewport'), 'Arena viewport.width');
  const height = finiteNumber(ownData(value, 'height', 'Arena viewport'), 'Arena viewport.height');
  if (width <= 0 || height <= 0) throw new RangeError('Arena viewport width/height 必须大于 0。');
  const pixelRatioValue = ownData(value, 'pixelRatio', 'Arena viewport', false);
  const pixelRatio = pixelRatioValue === undefined ? 1 : finiteNumber(pixelRatioValue, 'Arena viewport.pixelRatio');
  return Object.freeze({
    width,
    height,
    pixelRatio: Math.max(0.5, Math.min(maximumPixelRatio, pixelRatio)),
    safeArea: ownData(value, 'safeArea', 'Arena viewport', false) ?? null,
  });
}

function normalizeRenderOptions(value: unknown): RenderOptions {
  const options = value === undefined ? {} : value;
  assertKnownKeys(options, RENDER_OPTION_KEYS, 'ArenaGreyboxRenderer render options');
  const deltaValue = ownData(options, 'deltaSeconds', 'ArenaGreyboxRenderer render options', false);
  const modeValue = ownData(options, 'mode', 'ArenaGreyboxRenderer render options', false);
  const mapperValue = ownData(options, 'mapperLabel', 'ArenaGreyboxRenderer render options', false);
  const soundValue = ownData(options, 'soundEnabled', 'ArenaGreyboxRenderer render options', false);
  const motionValue = ownData(options, 'reducedMotion', 'ArenaGreyboxRenderer render options', false);
  const deltaSeconds = deltaValue === undefined ? 0 : finiteNumber(deltaValue, 'deltaSeconds');
  if (deltaSeconds < 0) throw new RangeError('deltaSeconds 不能小于 0。');
  const mode = modeValue ?? 'match';
  const mapperLabel = mapperValue ?? '';
  if (typeof mode !== 'string' || typeof mapperLabel !== 'string') {
    throw new TypeError('mode/mapperLabel 必须是字符串。');
  }
  const soundEnabled = soundValue ?? true;
  const reducedMotion = motionValue ?? false;
  if (typeof soundEnabled !== 'boolean' || typeof reducedMotion !== 'boolean') {
    throw new TypeError('soundEnabled/reducedMotion 必须是布尔值。');
  }
  return Object.freeze({ deltaSeconds, mode, mapperLabel, soundEnabled, reducedMotion });
}

function snapshotFeedbackFrame(value: unknown): FeedbackFrame {
  assertRecord(value, 'ArenaGreyboxRenderer frame');
  const source = ownData(value, 'source', 'ArenaGreyboxRenderer frame');
  const matchSeed = nonNegativeInteger(
    ownData(source, 'matchSeed', 'ArenaGreyboxRenderer frame.source'),
    'ArenaGreyboxRenderer frame.source.matchSeed',
  );
  const tick = nonNegativeInteger(
    ownData(source, 'tick', 'ArenaGreyboxRenderer frame.source'),
    'ArenaGreyboxRenderer frame.source.tick',
  );
  const eventValues = ownData(value, 'events', 'ArenaGreyboxRenderer frame');
  if (!Array.isArray(eventValues)) throw new TypeError('ArenaGreyboxRenderer frame.events 必须是数组。');
  const events = eventValues.map((event, index) => {
    assertRecord(event, `ArenaGreyboxRenderer frame.events[${index}]`);
    const type = ownData(event, 'type', `ArenaGreyboxRenderer frame.events[${index}]`);
    if (typeof type !== 'string' || type.length === 0) throw new TypeError('反馈事件 type 必须是非空字符串。');
    const actionValue = ownData(event, 'action', `ArenaGreyboxRenderer frame.events[${index}]`, false);
    if (actionValue !== undefined && actionValue !== null && typeof actionValue !== 'string') {
      throw new TypeError('反馈事件 action 必须是字符串或 null。');
    }
    return Object.freeze({
      sequence: nonNegativeInteger(
        ownData(event, 'sequence', `ArenaGreyboxRenderer frame.events[${index}]`),
        `ArenaGreyboxRenderer frame.events[${index}].sequence`,
      ),
      type,
      action: actionValue === undefined ? null : actionValue,
    }) as FeedbackEvent;
  });
  return Object.freeze({ matchSeed, tick, events: Object.freeze(events) });
}

function feedbackEventsAfter(events: readonly FeedbackEvent[], sequence: number): readonly FeedbackEvent[] {
  const result = events.filter((event) => event.sequence > sequence);
  return result.length === 0 ? EMPTY_EVENTS : result;
}

function tryRelease(release: UnknownMethod | null, errors: unknown[]): boolean {
  if (release === null) return true;
  try {
    release();
    return true;
  } catch (error) {
    errors.push(error);
    return false;
  }
}

/** Host-neutral Three compositor. It owns every resource it creates and fails closed. */
export class ArenaGreyboxRenderer {
  readonly canvas: Record<PropertyKey, unknown>;
  #platform: RendererPlatform;
  #renderer: WebGlRendererPort | null = null;
  #stage: ArenaWorldStage | null = null;
  #hud: ArenaHudLayer | null = null;
  #impactAudio: ArenaImpactAudio | null = null;
  #state: string = ARENA_GREYBOX_RENDERER_STATE.CREATED;
  #viewport: Viewport | null = null;
  #rendering = false;
  #callbackActive = false;
  #reentryAttempted = false;
  #lastError: unknown = null;
  #qualityDefinition: ReturnType<typeof createPresentationQualityDefinition>;
  #lastFeedbackMatchSeed: number | null = null;
  #lastFeedbackTick = -1;
  #lastFeedbackSequence = -1;
  #loadPromise: Promise<this> | null = null;
  #loadGeneration = 0;
  #resourcesLoaded = false;
  #destroyRequested = false;
  #cleanup: CleanupState = { audio: false, hud: false, stage: false, renderer: false, context: false };

  constructor(optionsValue: unknown) {
    assertKnownKeys(optionsValue, OPTION_KEYS, 'ArenaGreyboxRenderer options');
    const canvas = ownData(optionsValue, 'canvas', 'ArenaGreyboxRenderer options');
    assertRecord(canvas, 'ArenaGreyboxRenderer canvas');
    snapshotMethod(canvas, 'ArenaGreyboxRenderer canvas', 'getContext');
    this.canvas = canvas;
    this.#platform = snapshotPlatform(ownData(optionsValue, 'platform', 'ArenaGreyboxRenderer options'));
    const qualityValue = ownData(optionsValue, 'qualityDefinition', 'ArenaGreyboxRenderer options', false)
      ?? ARENA_V1_DEFAULT_PRESENTATION_QUALITY;
    this.#qualityDefinition = createPresentationQualityDefinition(qualityValue);
    const content = ownData(optionsValue, 'content', 'ArenaGreyboxRenderer options');
    const factoryValue = ownData(optionsValue, 'webglRendererFactory', 'ArenaGreyboxRenderer options', false);
    const rendererFactory = factoryValue === undefined
      ? (options: unknown) => new THREE.WebGLRenderer(options as THREE.WebGLRendererParameters)
      : factoryValue;
    if (typeof rendererFactory !== 'function') throw new TypeError('webglRendererFactory 必须是函数。');

    try {
      const contextAttributes = Object.freeze({
        alpha: false,
        antialias: this.#qualityDefinition.antialiasEnabled,
        depth: true,
        stencil: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
      });
      const context = this.#callExternal(this.#platform.getWebGLContext, canvas, contextAttributes);
      const rendererValue = this.#callExternal(rendererFactory as UnknownMethod, {
        canvas, context, ...contextAttributes,
      });
      this.#renderer = snapshotRenderer(rendererValue);
      this.#configureRenderer(this.#renderer.value);
      if (this.#renderer.setClearColor) this.#callExternal(this.#renderer.setClearColor, ARENA_GREYBOX_COLOR.background, 1);

      this.#stage = new ArenaWorldStage({
        content,
        maximumEffects: this.#qualityDefinition.maximumEffects,
        presentationAssetLoader: this.#platform.readAssetBytes
          ? new GltfPresentationAssetLoader({
            readAssetBytes: this.#platform.readAssetBytes,
            createImage: this.#platform.createImage,
          })
          : null,
      });
      this.#hud = new ArenaHudLayer({
        createOffscreenCanvas: this.#platform.createOffscreenCanvas,
      });
      this.#impactAudio = new ArenaImpactAudio({
        createAudio: this.#platform.createAudio ?? (() => null),
      });
    } catch (error) {
      this.#lastError = error;
      this.#state = ARENA_GREYBOX_RENDERER_STATE.FAILED;
      this.#destroyRequested = true;
      const cleanupErrors = this.#releaseOwnedResources();
      const secondCleanupErrors = cleanupErrors.length > 0 ? this.#releaseOwnedResources() : [];
      throw aggregate('竞技场灰盒 Renderer 初始化失败。', error, [...cleanupErrors, ...secondCleanupErrors]);
    }
    Object.freeze(this);
  }

  get state(): string { return this.#state; }

  #guardReentry(name: string): void {
    if (this.#callbackActive) {
      this.#reentryAttempted = true;
      throw new Error(`ArenaGreyboxRenderer 外部回调期间不能调用 ${name}。`);
    }
  }

  #callExternal(method: UnknownMethod, ...args: unknown[]): unknown {
    if (this.#callbackActive) {
      this.#reentryAttempted = true;
      throw new Error('ArenaGreyboxRenderer 外部回调不可嵌套。');
    }
    this.#callbackActive = true;
    this.#reentryAttempted = false;
    try {
      const result = method(...args);
      if (this.#reentryAttempted) throw new Error('ArenaGreyboxRenderer 检测到外部回调重入。');
      return result;
    } finally {
      this.#callbackActive = false;
    }
  }

  #configureRenderer(value: Record<PropertyKey, unknown>): void {
    value.outputColorSpace = THREE.SRGBColorSpace;
    value.toneMapping = THREE.ACESFilmicToneMapping;
    value.toneMappingExposure = 1.05;
    const shadowMap = ownData(value, 'shadowMap', 'WebGLRenderer');
    assertRecord(shadowMap, 'WebGLRenderer.shadowMap');
    shadowMap.enabled = this.#qualityDefinition.shadowsEnabled;
    shadowMap.type = THREE.PCFShadowMap;
    value.autoClear = false;
  }

  #assertUsable(): void {
    if (this.#state === ARENA_GREYBOX_RENDERER_STATE.DISPOSED) {
      throw new Error('ArenaGreyboxRenderer 已销毁。');
    }
    if (
      this.#state === ARENA_GREYBOX_RENDERER_STATE.FAILED
      || this.#state === ARENA_GREYBOX_RENDERER_STATE.DISPOSE_INCOMPLETE
    ) {
      const failure = new Error(`ArenaGreyboxRenderer 当前状态不可用：${this.#state}。`);
      failure.cause = this.#lastError;
      throw failure;
    }
  }

  async #performLoad(generation: number): Promise<this> {
    try {
      const stage = this.#stage;
      const audio = this.#impactAudio;
      if (!stage || !audio) throw new Error('ArenaGreyboxRenderer 资源未完整初始化。');
      await stage.load();
      if (generation !== this.#loadGeneration || this.#destroyRequested) {
        throw new Error('ArenaGreyboxRenderer 加载已取消。');
      }
      audio.load();
      if (generation !== this.#loadGeneration || this.#destroyRequested) {
        throw new Error('ArenaGreyboxRenderer 加载已取消。');
      }
      this.#resourcesLoaded = true;
      this.#resizeInternal(this.#platform.getViewport());
      this.#state = this.#state === ARENA_GREYBOX_RENDERER_STATE.CONTEXT_LOST
        ? ARENA_GREYBOX_RENDERER_STATE.CONTEXT_LOST
        : ARENA_GREYBOX_RENDERER_STATE.READY;
      return this;
    } catch (error) {
      if (generation !== this.#loadGeneration || this.#destroyRequested) throw error;
      throw this.#failClosed(error, '竞技场灰盒 Renderer 加载失败。');
    }
  }

  load(): Promise<this> {
    this.#guardReentry('load()');
    try { this.#assertUsable(); } catch (error) { return Promise.reject(error); }
    if (this.#resourcesLoaded) return Promise.resolve(this);
    if (this.#loadPromise) return this.#loadPromise;
    this.#state = ARENA_GREYBOX_RENDERER_STATE.LOADING;
    const generation = this.#loadGeneration;
    const operation = this.#performLoad(generation).finally(() => {
      if (this.#loadPromise === operation) this.#loadPromise = null;
      if (this.#destroyRequested) {
        const errors = this.#releaseOwnedResources();
        if (errors.length > 0) {
          this.#lastError = aggregate('ArenaGreyboxRenderer 迟到加载清理失败。', this.#lastError, errors);
          this.#state = ARENA_GREYBOX_RENDERER_STATE.DISPOSE_INCOMPLETE;
        }
      }
    });
    this.#loadPromise = operation;
    return operation;
  }

  #resizeInternal(viewportValue: unknown): boolean {
    const normalized = normalizeViewport(viewportValue, this.#qualityDefinition.maximumPixelRatio);
    const renderer = this.#renderer;
    const stage = this.#stage;
    const hud = this.#hud;
    if (!renderer || !stage || !hud) throw new Error('ArenaGreyboxRenderer 资源不可用。');
    if (this.#state !== ARENA_GREYBOX_RENDERER_STATE.CONTEXT_LOST) {
      this.#callExternal(renderer.setPixelRatio, normalized.pixelRatio);
      this.#callExternal(renderer.setSize, normalized.width, normalized.height, false);
    }
    // Canvas IDL properties are native prototype accessors in browsers and
    // mini-game hosts, so they are read only after the caller-owned options
    // boundary has already been validated and ownership has been established.
    const style = Reflect.get(this.canvas, 'style');
    if (style !== undefined && style !== null) {
      assertRecord(style, 'ArenaGreyboxRenderer canvas.style');
      style.width = `${normalized.width}px`;
      style.height = `${normalized.height}px`;
    }
    stage.resize(normalized);
    hud.resize(normalized);
    this.#viewport = normalized;
    return true;
  }

  resize(viewportValue?: unknown): boolean {
    this.#guardReentry('resize()');
    this.#assertUsable();
    try {
      return this.#resizeInternal(viewportValue === undefined ? this.#platform.getViewport() : viewportValue);
    } catch (error) {
      throw this.#failClosed(error, 'ArenaGreyboxRenderer resize 失败。');
    }
  }

  render(frame: unknown, options?: unknown): boolean {
    this.#guardReentry('render()');
    if (frame === null || frame === undefined) {
      throw new TypeError('ArenaGreyboxRenderer.render() 需要比赛表现帧。');
    }
    return this.#renderFrame(frame, null, normalizeRenderOptions(options));
  }

  renderComposite(frame: unknown, overlayValue: unknown, options?: unknown): boolean {
    this.#guardReentry('renderComposite()');
    const present = snapshotMethod(overlayValue, 'ArenaGreyboxRenderer overlay', 'present')!;
    return this.#renderFrame(frame, present, normalizeRenderOptions(options));
  }

  #renderFrame(frame: unknown, overlayPresent: UnknownMethod | null, options: RenderOptions): boolean {
    if (this.#state === ARENA_GREYBOX_RENDERER_STATE.CONTEXT_LOST) return false;
    this.#assertUsable();
    if (this.#state !== ARENA_GREYBOX_RENDERER_STATE.READY) {
      throw new Error(`ArenaGreyboxRenderer 无法在 ${this.#state} 状态 render。`);
    }
    if (this.#rendering) throw new Error('ArenaGreyboxRenderer.render() 不可重入。');
    const renderer = this.#renderer;
    const stage = this.#stage;
    const hud = this.#hud;
    if (!renderer || !stage || !hud) throw new Error('ArenaGreyboxRenderer 资源不可用。');
    const feedback = frame === null ? null : snapshotFeedbackFrame(frame);
    this.#rendering = true;
    try {
      this.#callExternal(renderer.clear, true, true, true);
      if (frame !== null) {
        stage.sync(frame, { reducedMotion: options.reducedMotion });
        stage.update(options.deltaSeconds);
        hud.sync(frame, { mode: options.mode, mapperLabel: options.mapperLabel });
        this.#emitEventFeedback(feedback!, options);
        this.#callExternal(renderer.render, stage.scene, stage.camera);
        this.#callExternal(renderer.clearDepth);
        hud.render(renderer.value as unknown as THREE.WebGLRenderer);
      }
      if (overlayPresent) {
        this.#callExternal(renderer.clearDepth);
        if (this.#callExternal(overlayPresent, renderer.value) === false) return false;
      }
      return true;
    } catch (error) {
      throw this.#failClosed(error, 'ArenaGreyboxRenderer render 失败。');
    } finally {
      this.#rendering = false;
    }
  }

  #emitEventFeedback(frame: FeedbackFrame, options: RenderOptions): void {
    const matchChanged = this.#lastFeedbackMatchSeed !== frame.matchSeed || frame.tick < this.#lastFeedbackTick;
    if (matchChanged) this.#lastFeedbackSequence = -1;
    for (const event of feedbackEventsAfter(frame.events, this.#lastFeedbackSequence)) {
      if (event.type === 'HitResolved') {
        const heavy = event.action === 'hammer-smash' || event.action === 'shield-charge';
        if (this.#platform.vibrate) {
          try {
            this.#callExternal(this.#platform.vibrate, heavy && !options.reducedMotion ? 'heavy' : 'light');
          } catch (error) {
            if (this.#reentryAttempted) throw error;
            // Optional host feedback must not block rendering.
          }
        }
        this.#impactAudio?.play(event.action, { enabled: options.soundEnabled });
      }
      this.#lastFeedbackSequence = Math.max(this.#lastFeedbackSequence, event.sequence);
    }
    this.#lastFeedbackMatchSeed = frame.matchSeed;
    this.#lastFeedbackTick = frame.tick;
  }

  handleContextLost(eventValue?: unknown): boolean {
    this.#guardReentry('handleContextLost()');
    if (
      this.#state === ARENA_GREYBOX_RENDERER_STATE.DISPOSED
      || this.#state === ARENA_GREYBOX_RENDERER_STATE.DISPOSE_INCOMPLETE
      || this.#state === ARENA_GREYBOX_RENDERER_STATE.FAILED
    ) return false;
    if (eventValue !== undefined && eventValue !== null) {
      const preventDefault = snapshotMethod(eventValue, 'WebGL context lost event', 'preventDefault', false);
      if (preventDefault) {
        try { this.#callExternal(preventDefault); }
        catch (error) {
          if (this.#reentryAttempted) throw error;
          // The context is lost regardless of host event behavior.
        }
      }
    }
    this.#state = ARENA_GREYBOX_RENDERER_STATE.CONTEXT_LOST;
    return true;
  }

  handleContextRestored(): boolean {
    this.#guardReentry('handleContextRestored()');
    if (this.#state !== ARENA_GREYBOX_RENDERER_STATE.CONTEXT_LOST) return false;
    if (!this.#resourcesLoaded) {
      this.#state = ARENA_GREYBOX_RENDERER_STATE.LOADING;
      return true;
    }
    try {
      this.#stage?.resetTransient();
      this.#lastFeedbackMatchSeed = null;
      this.#lastFeedbackTick = -1;
      this.#lastFeedbackSequence = -1;
      this.#state = ARENA_GREYBOX_RENDERER_STATE.READY;
      this.#resizeInternal(this.#viewport ?? this.#platform.getViewport());
      return true;
    } catch (error) {
      throw this.#failClosed(error, 'ArenaGreyboxRenderer context 恢复失败。');
    }
  }

  hitTestRematch(point: unknown): boolean {
    this.#guardReentry('hitTestRematch()');
    if (!this.#viewport || !this.#hud) return false;
    return this.#hud.hitTestRematch(point, this.getInputViewport());
  }

  getInputViewport(): Readonly<{ width: number; height: number }> {
    this.#guardReentry('getInputViewport()');
    if (!this.#viewport) throw new Error('ArenaGreyboxRenderer 尚未 resize。');
    if (this.#state === ARENA_GREYBOX_RENDERER_STATE.CONTEXT_LOST) {
      return Object.freeze({
        width: Math.max(1, Math.round(this.#viewport.width * this.#viewport.pixelRatio)),
        height: Math.max(1, Math.round(this.#viewport.height * this.#viewport.pixelRatio)),
      });
    }
    const width = Reflect.get(this.canvas, 'width');
    const height = Reflect.get(this.canvas, 'height');
    return Object.freeze({
      width: Math.max(1, typeof width === 'number' && Number.isFinite(width) ? width : this.#viewport.width),
      height: Math.max(1, typeof height === 'number' && Number.isFinite(height) ? height : this.#viewport.height),
    });
  }

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    this.#guardReentry('getDebugSnapshot()');
    const diagnostic = (callback: (() => unknown) | null): unknown => {
      if (!callback) return null;
      try { return cloneFrozenData(callback(), 'ArenaGreyboxRenderer diagnostic'); }
      catch (error) { return Object.freeze({ unavailable: true, error: normalizeThrownError(error, '诊断读取失败') }); }
    };
    return Object.freeze({
      state: this.#state,
      qualityDefinitionId: this.#qualityDefinition.id,
      qualityDefinitionHash: this.#qualityDefinition.getContentHash(),
      viewport: this.#viewport,
      inputViewport: this.#viewport ? diagnostic(() => this.getInputViewport()) : null,
      lastError: this.#lastError,
      stage: diagnostic(this.#stage ? () => this.#stage!.getDebugSnapshot() : null),
      hud: diagnostic(this.#hud ? () => this.#hud!.getDebugSnapshot() : null),
      audio: diagnostic(this.#impactAudio ? () => this.#impactAudio!.getDebugSnapshot() : null),
      cleanup: Object.freeze({ ...this.#cleanup }),
    });
  }

  getPerformanceSnapshot(): Readonly<Record<string, number | null>> | null {
    this.#guardReentry('getPerformanceSnapshot()');
    if (this.#state === ARENA_GREYBOX_RENDERER_STATE.DISPOSED) return null;
    try {
      const renderer = this.#renderer?.value;
      const info = renderer ? ownData(renderer, 'info', 'WebGLRenderer', false) : null;
      if (!info || typeof info !== 'object') return Object.freeze({
        drawCalls: null, triangles: null, points: null, lines: null, programs: null,
        geometries: null, textures: null, jsHeapBytes: null, processMemoryBytes: null,
      });
      const render = ownData(info, 'render', 'WebGLRenderer.info', false);
      const memory = ownData(info, 'memory', 'WebGLRenderer.info', false);
      const programs = ownData(info, 'programs', 'WebGLRenderer.info', false);
      const integer = (container: unknown, key: string): number | null => {
        if (!container || typeof container !== 'object') return null;
        const value = ownData(container, key, 'WebGLRenderer metric', false);
        return Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : null;
      };
      return Object.freeze({
        drawCalls: integer(render, 'calls'), triangles: integer(render, 'triangles'),
        points: integer(render, 'points'), lines: integer(render, 'lines'),
        programs: Array.isArray(programs) ? programs.length : (Number.isSafeInteger(programs) ? programs as number : null),
        geometries: integer(memory, 'geometries'), textures: integer(memory, 'textures'),
        jsHeapBytes: null, processMemoryBytes: null,
      });
    } catch { return null; }
  }

  #releaseOwnedResources(): unknown[] {
    const errors: unknown[] = [];
    if (!this.#cleanup.audio && tryRelease(
      this.#impactAudio ? () => this.#impactAudio!.dispose() : null,
      errors,
    )) this.#cleanup.audio = true;
    if (!this.#cleanup.hud && tryRelease(
      this.#hud ? () => this.#hud!.dispose() : null,
      errors,
    )) this.#cleanup.hud = true;
    if (!this.#cleanup.stage) {
      const released = tryRelease(this.#stage ? () => this.#stage!.dispose() : null, errors);
      if (released && this.#loadPromise === null) this.#cleanup.stage = true;
    }
    if (!this.#cleanup.renderer && tryRelease(this.#renderer?.dispose ?? null, errors)) {
      this.#cleanup.renderer = true;
    }
    if (!this.#cleanup.context && tryRelease(this.#renderer?.forceContextLoss ?? null, errors)) {
      this.#cleanup.context = true;
    }
    const complete = Object.values(this.#cleanup).every(Boolean);
    if (complete) {
      this.#resourcesLoaded = false;
      this.#state = ARENA_GREYBOX_RENDERER_STATE.DISPOSED;
    } else {
      this.#state = ARENA_GREYBOX_RENDERER_STATE.DISPOSE_INCOMPLETE;
    }
    return errors;
  }

  #failClosed(error: unknown, message: string): Error {
    this.#lastError = normalizeThrownError(error, message);
    this.#state = ARENA_GREYBOX_RENDERER_STATE.FAILED;
    this.#destroyRequested = true;
    this.#loadGeneration += 1;
    const cleanupErrors = this.#releaseOwnedResources();
    return aggregate(message, this.#lastError, cleanupErrors);
  }

  dispose(): void {
    this.#guardReentry('dispose()');
    if (this.#state === ARENA_GREYBOX_RENDERER_STATE.DISPOSED) return;
    if (this.#rendering) throw new Error('render() 期间不能销毁 ArenaGreyboxRenderer。');
    this.#destroyRequested = true;
    this.#loadGeneration += 1;
    const errors = this.#releaseOwnedResources();
    // A pending Stage load retains its own late-result cleanup lease. With no
    // concrete cleanup error, dispose is accepted and the load finally block
    // completes the exact remaining lease before publishing DISPOSED.
    if (errors.length > 0) {
      const failure = aggregate('ArenaGreyboxRenderer 清理未完整完成。', this.#lastError, errors);
      this.#lastError = failure;
      throw failure;
    }
  }
}
