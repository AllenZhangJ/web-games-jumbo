import * as THREE from 'three';
import { createProductUiSceneModel } from '@number-strategy-jump/arena-product-presentation';
import { disposeThreeObject } from '@number-strategy-jump/arena-presentation-three';
import {
  createProductCanvasLayout,
  pointInProductCanvasRect,
} from './product-canvas-layout.js';
import { paintProductCanvasScene } from './product-canvas-painter.js';

export const PRODUCT_CANVAS_UI_SURFACE_STATE = Object.freeze({
  CREATED: 'created',
  READY: 'ready',
  DISPOSED: 'disposed',
});

function requiredFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value;
}

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function positive(value, fallback = 1) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function createSurface(platform) {
  if (typeof platform?.createOffscreenCanvas !== 'function') {
    throw new TypeError('ProductCanvasUiSurface 需要 createOffscreenCanvas。');
  }
  let canvas;
  try {
    canvas = platform.createOffscreenCanvas(2, 2);
  } catch {
    canvas = platform.createOffscreenCanvas({ width: 2, height: 2 });
  }
  const context = canvas?.getContext?.('2d');
  const required = [
    'setTransform',
    'clearRect',
    'beginPath',
    'moveTo',
    'lineTo',
    'quadraticCurveTo',
    'closePath',
    'fill',
    'stroke',
    'arc',
    'fillRect',
    'fillText',
  ];
  if (!context || required.some((name) => typeof context[name] !== 'function')) {
    throw new Error('Canvas Product UI 需要完整的 2D Canvas 文本与路径能力。');
  }
  return { canvas, context };
}

function renderSignature(model, viewport) {
  return JSON.stringify([
    viewport.width,
    viewport.height,
    viewport.safeArea,
    model.revision,
    model.scene,
    model.busy,
    model.inputEnabled,
    model.title,
    model.body,
    model.selectedCharacter?.id ?? '',
    model.opponentName,
    model.characterCards.map(({ id, selected, enabled }) => [id, selected, enabled]),
    model.primaryAction,
    model.secondaryAction,
    model.outcome,
    model.experienceDelta,
    model.unlock?.id ?? '',
    model.errorMessage,
  ]);
}

export class ProductCanvasUiSurface {
  #canvas;
  #context;
  #texture;
  #viewport;
  #inputViewport;
  #textureScale;
  #state;
  #viewModel;
  #model;
  #layout;
  #signature;
  #visible;
  #bindingCleanup;

  constructor({ platform }) {
    const surface = createSurface(platform);
    this.#canvas = surface.canvas;
    this.#context = surface.context;
    this.#texture = null;
    this.scene = null;
    this.camera = null;
    this.quad = null;
    this.#viewport = Object.freeze({ width: 1, height: 1, pixelRatio: 1, safeArea: null });
    this.#inputViewport = Object.freeze({ width: 1, height: 1 });
    this.#textureScale = 1;
    this.#state = PRODUCT_CANVAS_UI_SURFACE_STATE.CREATED;
    this.#viewModel = null;
    this.#model = null;
    this.#layout = null;
    this.#signature = '';
    this.#visible = false;
    this.#bindingCleanup = null;
    let material = null;
    let geometry = null;
    try {
      this.#texture = new THREE.CanvasTexture(this.#canvas);
      this.#texture.name = 'ProductCanvasUiTexture';
      this.#texture.colorSpace = THREE.SRGBColorSpace;
      this.#texture.minFilter = THREE.LinearFilter;
      this.#texture.magFilter = THREE.LinearFilter;
      this.#texture.generateMipmaps = false;
      this.scene = new THREE.Scene();
      this.scene.name = 'ProductCanvasUiScene';
      this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
      this.camera.position.z = 1;
      material = new THREE.MeshBasicMaterial({
        map: this.#texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      });
      geometry = new THREE.PlaneGeometry(2, 2);
      this.quad = new THREE.Mesh(geometry, material);
      this.quad.name = 'ProductCanvasUiQuad';
      this.quad.renderOrder = 2000;
      this.scene.add(this.quad);
    } catch (error) {
      const cleanupErrors = [];
      for (const resource of [material, geometry, this.#texture]) {
        try { resource?.dispose?.(); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
      }
      try { this.scene?.clear?.(); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
      this.#state = PRODUCT_CANVAS_UI_SURFACE_STATE.DISPOSED;
      const failure = new Error('ProductCanvasUiSurface 初始化失败。');
      failure.cause = error;
      if (cleanupErrors.length > 0) failure.cleanupErrors = cleanupErrors;
      throw failure;
    }
    Object.freeze(this);
  }

  get state() {
    return this.#state;
  }

  #assertReady() {
    if (this.#state !== PRODUCT_CANVAS_UI_SURFACE_STATE.READY) {
      throw new Error(`ProductCanvasUiSurface 当前状态不可用：${this.#state}。`);
    }
  }

  async load() {
    if (this.#state === PRODUCT_CANVAS_UI_SURFACE_STATE.DISPOSED) {
      throw new Error('ProductCanvasUiSurface 已销毁。');
    }
    this.#state = PRODUCT_CANVAS_UI_SURFACE_STATE.READY;
    return this;
  }

  #draw(force = false) {
    if (!this.#model) return;
    const signature = renderSignature(this.#model, this.#viewport);
    if (!force && signature === this.#signature) return;
    this.#signature = signature;
    this.#layout = createProductCanvasLayout(this.#model, this.#viewport);
    this.#visible = !this.#model.gameplay;
    const context = this.#context;
    context.setTransform(this.#textureScale, 0, 0, this.#textureScale, 0, 0);
    context.clearRect(0, 0, this.#viewport.width, this.#viewport.height);
    if (this.#visible) {
      paintProductCanvasScene(context, this.#model, this.#layout, this.#viewport);
    }
    this.#texture.needsUpdate = true;
  }

  render(viewModel) {
    this.#assertReady();
    this.#viewModel = viewModel;
    this.#model = createProductUiSceneModel(viewModel);
    this.#draw();
    return true;
  }

  resize(viewportValue, inputViewportValue) {
    if (this.#state === PRODUCT_CANVAS_UI_SURFACE_STATE.DISPOSED) return false;
    const width = positive(viewportValue?.width);
    const height = positive(viewportValue?.height);
    const pixelRatio = Math.max(0.5, Math.min(2, positive(viewportValue?.pixelRatio)));
    const textureScale = Math.max(0.5, Math.min(pixelRatio, 2048 / Math.max(width, height)));
    this.#viewport = Object.freeze({
      width,
      height,
      pixelRatio,
      safeArea: viewportValue?.safeArea ?? null,
    });
    this.#inputViewport = Object.freeze({
      width: positive(inputViewportValue?.width, width),
      height: positive(inputViewportValue?.height, height),
    });
    this.#textureScale = textureScale;
    this.#canvas.width = Math.max(1, Math.round(width * textureScale));
    this.#canvas.height = Math.max(1, Math.round(height * textureScale));
    this.#signature = '';
    this.#texture.needsUpdate = true;
    this.#draw(true);
    return true;
  }

  getInputViewport(fallback) {
    if (this.#inputViewport.width > 1 || this.#inputViewport.height > 1) return this.#inputViewport;
    return Object.freeze({
      width: positive(fallback?.width),
      height: positive(fallback?.height),
    });
  }

  hitTestUi(point, inputViewport, viewModel = this.#viewModel) {
    this.#assertReady();
    if (!point || !viewModel) return null;
    const model = createProductUiSceneModel(viewModel);
    if (model.gameplay || !model.inputEnabled) return null;
    const layout = model.revision === this.#model?.revision && model.scene === this.#model?.scene
      ? this.#layout
      : createProductCanvasLayout(model, this.#viewport);
    if (!layout) return null;
    const sourceWidth = positive(inputViewport?.width, this.#inputViewport.width);
    const sourceHeight = positive(inputViewport?.height, this.#inputViewport.height);
    const mapped = {
      x: finite(point.x, -1) / sourceWidth * this.#viewport.width,
      y: finite(point.y, -1) / sourceHeight * this.#viewport.height,
    };
    const hit = layout.hits.find(({ rect: target }) => pointInProductCanvasRect(mapped, target));
    return hit?.intent ?? null;
  }

  bindIntent({ onIntent, onRejected = () => {} } = {}) {
    this.#assertReady();
    requiredFunction(onIntent, 'ProductCanvasUiSurface.onIntent');
    requiredFunction(onRejected, 'ProductCanvasUiSurface.onRejected');
    if (this.#bindingCleanup !== null) {
      throw new Error('ProductCanvasUiSurface intent 已绑定。');
    }
    let active = true;
    const cleanup = () => {
      if (!active) return;
      active = false;
      if (this.#bindingCleanup === cleanup) this.#bindingCleanup = null;
    };
    this.#bindingCleanup = cleanup;
    return cleanup;
  }

  requiresCompositeFrame() {
    this.#assertReady();
    return this.#visible;
  }

  present(renderer) {
    this.#assertReady();
    requiredFunction(renderer?.render, 'ProductCanvasUiSurface renderer.render');
    if (!this.#visible) return true;
    renderer.render(this.scene, this.camera);
    return true;
  }

  getDebugSnapshot() {
    return Object.freeze({
      state: this.#state,
      scene: this.#model?.scene ?? null,
      visible: this.#visible,
      textureWidth: this.#canvas.width,
      textureHeight: this.#canvas.height,
      hitCount: this.#layout?.hits.length ?? 0,
      bound: this.#bindingCleanup !== null,
      viewport: this.#viewport,
      inputViewport: this.#inputViewport,
    });
  }

  dispose() {
    if (this.#state === PRODUCT_CANVAS_UI_SURFACE_STATE.DISPOSED) return;
    this.#bindingCleanup?.();
    disposeThreeObject(this.quad);
    this.scene.clear();
    this.#viewModel = null;
    this.#model = null;
    this.#layout = null;
    this.#signature = '';
    this.#visible = false;
    this.#state = PRODUCT_CANVAS_UI_SURFACE_STATE.DISPOSED;
  }
}
