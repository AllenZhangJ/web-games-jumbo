import { normalizeThrownError } from '@number-strategy-jump/arena-contracts';
import {
  createProductCanvasLayout,
  createProductUiSceneModel,
  paintProductCanvasScene,
  pointInProductCanvasRect,
  type ProductCanvasLayout,
  type ProductCanvasPaintContext,
  type ProductUiSceneModel,
} from '@number-strategy-jump/arena-product-presentation';
import {
  createThreeObjectDisposalLease,
  type ThreeObjectDisposalLease,
} from '@number-strategy-jump/arena-presentation-three';
import * as THREE from 'three';

export const PRODUCT_CANVAS_UI_SURFACE_STATE = Object.freeze({
  CREATED: 'created',
  READY: 'ready',
  DISPOSE_INCOMPLETE: 'dispose-incomplete',
  DISPOSED: 'disposed',
} as const);

type ProductCanvasUiSurfaceState = typeof PRODUCT_CANVAS_UI_SURFACE_STATE[
  keyof typeof PRODUCT_CANVAS_UI_SURFACE_STATE
];
type UnknownMethod = (...args: unknown[]) => unknown;

interface CanvasLike {
  width: number;
  height: number;
}

interface ProductPaintContext extends ProductCanvasPaintContext {
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  clearRect(x: number, y: number, width: number, height: number): void;
}

interface SurfaceViewport {
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
  readonly safeArea: Readonly<Record<string, number>> | null;
}

interface InputViewport {
  readonly width: number;
  readonly height: number;
}

const OPTION_KEYS = new Set<PropertyKey>(['canvas', 'platform']);
const VIEWPORT_KEYS = new Set<PropertyKey>(['width', 'height', 'pixelRatio', 'safeArea']);
const SAFE_AREA_KEYS = new Set<PropertyKey>(['left', 'top', 'right', 'bottom', 'width', 'height']);
const INPUT_VIEWPORT_KEYS = new Set<PropertyKey>(['width', 'height']);
const POINT_KEYS = new Set<PropertyKey>(['x', 'y', 'pointerId']);
const BINDING_KEYS = new Set<PropertyKey>(['onIntent', 'onRejected']);
const CONTEXT_METHODS = Object.freeze([
  'setTransform', 'clearRect', 'beginPath', 'moveTo', 'lineTo', 'quadraticCurveTo',
  'closePath', 'fill', 'stroke', 'arc', 'fillRect', 'fillText',
] as const);

function assertRecord(value: unknown, name: string): asserts value is object {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
}

function assertKnownKeys(value: unknown, allowed: ReadonlySet<PropertyKey>, name: string): void {
  assertRecord(value, name);
  const unknown = Reflect.ownKeys(value).find((key) => !allowed.has(key));
  if (unknown !== undefined) throw new TypeError(`${name} 包含未知字段 ${String(unknown)}。`);
}

function ownData(
  value: unknown,
  field: PropertyKey,
  name: string,
  required = true,
): unknown {
  assertRecord(value, name);
  const descriptor = Object.getOwnPropertyDescriptor(value, field);
  if (!descriptor) {
    if (!required) return undefined;
    throw new TypeError(`${name}.${String(field)} 缺失。`);
  }
  if (!Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${String(field)} 必须是数据字段。`);
  }
  return descriptor.value;
}

function snapshotMethod(value: unknown, name: string, methodName: string): UnknownMethod {
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
  throw new TypeError(`${name} 缺少 ${methodName}()。`);
}

function rejectThenable(value: unknown, name: string): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
  let owner: object | null = value as object;
  while (owner) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, 'then');
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value')) {
        throw new TypeError(`${name} 返回了访问器 then。`);
      }
      if (typeof descriptor.value === 'function') {
        if (value instanceof Promise) void value.catch(() => {});
        throw new TypeError(`${name} 必须同步完成。`);
      }
      return;
    }
    owner = Object.getPrototypeOf(owner) as object | null;
  }
}

function finite(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} 必须是有限数。`);
  }
  return value;
}

function positive(value: unknown, name: string): number {
  const result = finite(value, name);
  if (result <= 0) throw new RangeError(`${name} 必须大于 0。`);
  return result;
}

function functionValue(value: unknown, name: string): UnknownMethod {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value as UnknownMethod;
}

function normalizeSafeArea(value: unknown): Readonly<Record<string, number>> | null {
  if (value === null || value === undefined) return null;
  assertKnownKeys(value, SAFE_AREA_KEYS, 'ProductCanvasUiSurface viewport.safeArea');
  const result: Record<string, number> = {};
  for (const field of SAFE_AREA_KEYS) {
    const fieldValue = ownData(
      value,
      field,
      'ProductCanvasUiSurface viewport.safeArea',
      false,
    );
    if (fieldValue !== undefined) {
      result[field as string] = finite(
        fieldValue,
        `ProductCanvasUiSurface viewport.safeArea.${String(field)}`,
      );
    }
  }
  return Object.freeze(result);
}

function normalizeViewport(value: unknown): SurfaceViewport {
  assertKnownKeys(value, VIEWPORT_KEYS, 'ProductCanvasUiSurface viewport');
  const ratioValue = ownData(value, 'pixelRatio', 'ProductCanvasUiSurface viewport', false);
  return Object.freeze({
    width: positive(
      ownData(value, 'width', 'ProductCanvasUiSurface viewport'),
      'ProductCanvasUiSurface viewport.width',
    ),
    height: positive(
      ownData(value, 'height', 'ProductCanvasUiSurface viewport'),
      'ProductCanvasUiSurface viewport.height',
    ),
    pixelRatio: Math.max(0.5, Math.min(
      2,
      ratioValue === undefined ? 1 : positive(ratioValue, 'ProductCanvasUiSurface viewport.pixelRatio'),
    )),
    safeArea: normalizeSafeArea(
      ownData(value, 'safeArea', 'ProductCanvasUiSurface viewport', false),
    ),
  });
}

function normalizeInputViewport(value: unknown, fallback: InputViewport): InputViewport {
  if (value === null || value === undefined) return fallback;
  assertKnownKeys(value, INPUT_VIEWPORT_KEYS, 'ProductCanvasUiSurface inputViewport');
  return Object.freeze({
    width: positive(
      ownData(value, 'width', 'ProductCanvasUiSurface inputViewport'),
      'ProductCanvasUiSurface inputViewport.width',
    ),
    height: positive(
      ownData(value, 'height', 'ProductCanvasUiSurface inputViewport'),
      'ProductCanvasUiSurface inputViewport.height',
    ),
  });
}

function point(value: unknown): Readonly<{ x: number; y: number }> | null {
  try {
    assertKnownKeys(value, POINT_KEYS, 'ProductCanvasUiSurface point');
    return Object.freeze({
      x: finite(ownData(value, 'x', 'ProductCanvasUiSurface point'), 'ProductCanvasUiSurface point.x'),
      y: finite(ownData(value, 'y', 'ProductCanvasUiSurface point'), 'ProductCanvasUiSurface point.y'),
    });
  } catch {
    return null;
  }
}

function snapshotContext(value: unknown): ProductPaintContext {
  assertRecord(value, 'ProductCanvasUiSurface 2D context');
  const methods = Object.fromEntries(CONTEXT_METHODS.map((name) => [
    name,
    snapshotMethod(value, 'ProductCanvasUiSurface 2D context', name),
  ])) as Record<typeof CONTEXT_METHODS[number], UnknownMethod>;
  const invoke = (name: typeof CONTEXT_METHODS[number], args: readonly unknown[]): void => {
    rejectThenable(methods[name](...args), `ProductCanvasUiSurface 2D context.${name}()`);
  };
  const set = (name: string, fieldValue: unknown): void => {
    if (!Reflect.set(value, name, fieldValue)) {
      throw new Error(`ProductCanvasUiSurface 2D context.${name} 写入失败。`);
    }
  };
  return {
    setTransform: (...args: [number, number, number, number, number, number]) => invoke('setTransform', args),
    clearRect: (...args: [number, number, number, number]) => invoke('clearRect', args),
    beginPath: () => invoke('beginPath', []),
    moveTo: (...args: [number, number]) => invoke('moveTo', args),
    lineTo: (...args: [number, number]) => invoke('lineTo', args),
    quadraticCurveTo: (...args: [number, number, number, number]) => invoke('quadraticCurveTo', args),
    closePath: () => invoke('closePath', []),
    fill: () => invoke('fill', []),
    stroke: () => invoke('stroke', []),
    arc: (...args: [number, number, number, number, number]) => invoke('arc', args),
    fillRect: (...args: [number, number, number, number]) => invoke('fillRect', args),
    fillText: (...args: [string, number, number]) => invoke('fillText', args),
    get fillStyle() { return undefined; },
    set fillStyle(fieldValue: unknown) { set('fillStyle', fieldValue); },
    get strokeStyle() { return undefined; },
    set strokeStyle(fieldValue: unknown) { set('strokeStyle', fieldValue); },
    get lineWidth() { return 0; },
    set lineWidth(fieldValue: number) { set('lineWidth', fieldValue); },
    get textAlign() { return ''; },
    set textAlign(fieldValue: string) { set('textAlign', fieldValue); },
    get textBaseline() { return ''; },
    set textBaseline(fieldValue: string) { set('textBaseline', fieldValue); },
    get font() { return ''; },
    set font(fieldValue: string) { set('font', fieldValue); },
  };
}

function surfaceFromPlatform(platform: unknown): Readonly<{
  canvas: CanvasLike;
  context: ProductPaintContext;
}> {
  const createCanvas = snapshotMethod(
    platform,
    'ProductCanvasUiSurface platform',
    'createOffscreenCanvas',
  );
  const failures: unknown[] = [];
  for (const args of [[2, 2], [Object.freeze({ width: 2, height: 2 })]] as const) {
    try {
      const candidate = createCanvas(...args);
      rejectThenable(candidate, 'ProductCanvasUiSurface platform.createOffscreenCanvas()');
      assertRecord(candidate, 'ProductCanvasUiSurface canvas');
      const getContext = snapshotMethod(candidate, 'ProductCanvasUiSurface canvas', 'getContext');
      const contextValue = getContext('2d');
      rejectThenable(contextValue, 'ProductCanvasUiSurface canvas.getContext()');
      return Object.freeze({
        canvas: candidate as unknown as CanvasLike,
        context: snapshotContext(contextValue),
      });
    } catch (error) {
      failures.push(error);
    }
  }
  const failure = new Error('ProductCanvasUiSurface 无法创建完整的离屏 2D Canvas。');
  Object.defineProperty(failure, 'causes', { value: Object.freeze(failures) });
  throw failure;
}

function setCanvasSize(canvas: CanvasLike, width: number, height: number): void {
  if (!Reflect.set(canvas, 'width', width) || !Reflect.set(canvas, 'height', height)) {
    throw new Error('ProductCanvasUiSurface Canvas 尺寸写入失败。');
  }
}

function cleanupConstruction(
  scene: THREE.Scene | null,
  geometry: THREE.BufferGeometry | null,
  material: THREE.Material | null,
  texture: THREE.Texture | null,
): readonly unknown[] {
  const errors: unknown[] = [];
  for (const resource of [material, geometry, texture]) {
    if (!resource) continue;
    try { resource.dispose(); } catch (error) { errors.push(error); }
  }
  try { scene?.clear(); } catch (error) { errors.push(error); }
  return Object.freeze(errors);
}

function cleanupFailure(cause: unknown, cleanupErrors: readonly unknown[]): Error {
  const failure = new Error('ProductCanvasUiSurface 失败关闭。');
  failure.cause = normalizeThrownError(cause, 'ProductCanvasUiSurface 操作失败');
  Object.defineProperty(failure, 'cleanupErrors', {
    value: Object.freeze(cleanupErrors.map((error) => normalizeThrownError(
      error,
      'ProductCanvasUiSurface 清理失败',
    ))),
  });
  return failure;
}

export class ProductCanvasUiSurface {
  readonly scene: THREE.Scene;
  readonly camera: THREE.OrthographicCamera;
  readonly quad: THREE.Mesh;

  readonly #canvas: CanvasLike;
  readonly #context: ProductPaintContext;
  readonly #texture: THREE.CanvasTexture;
  #textureWidth = 2;
  #textureHeight = 2;
  #resourceLease: ThreeObjectDisposalLease | null;
  #sceneCleared = false;
  #viewport: SurfaceViewport = Object.freeze({ width: 1, height: 1, pixelRatio: 1, safeArea: null });
  #inputViewport: InputViewport = Object.freeze({ width: 1, height: 1 });
  #textureScale = 1;
  #viewportRevision = 0;
  #drawnViewportRevision = -1;
  #state: ProductCanvasUiSurfaceState = PRODUCT_CANVAS_UI_SURFACE_STATE.CREATED;
  #viewModel: unknown = null;
  #model: ProductUiSceneModel | null = null;
  #drawnModel: ProductUiSceneModel | null = null;
  #layout: ProductCanvasLayout | null = null;
  #visible = false;
  #bindingCleanup: (() => void) | null = null;
  #rendererTarget: object | null = null;
  #rendererRender: UnknownMethod | null = null;
  #operating = false;
  #operationName = '';
  #reentryDetected = false;

  constructor(optionsValue: unknown) {
    assertKnownKeys(optionsValue, OPTION_KEYS, 'ProductCanvasUiSurface options');
    const platform = ownData(optionsValue, 'platform', 'ProductCanvasUiSurface options');
    const surface = surfaceFromPlatform(platform);
    this.#canvas = surface.canvas;
    this.#context = surface.context;

    let texture: THREE.CanvasTexture | null = null;
    let scene: THREE.Scene | null = null;
    let material: THREE.MeshBasicMaterial | null = null;
    let geometry: THREE.PlaneGeometry | null = null;
    let camera: THREE.OrthographicCamera | null = null;
    let quad: THREE.Mesh | null = null;
    try {
      texture = new THREE.CanvasTexture(this.#canvas as unknown as HTMLCanvasElement);
      texture.name = 'ProductCanvasUiTexture';
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      scene = new THREE.Scene();
      scene.name = 'ProductCanvasUiScene';
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
      camera.position.z = 1;
      material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      });
      geometry = new THREE.PlaneGeometry(2, 2);
      quad = new THREE.Mesh(geometry, material);
      quad.name = 'ProductCanvasUiQuad';
      quad.renderOrder = 2000;
      scene.add(quad);
      this.#resourceLease = createThreeObjectDisposalLease(quad);
    } catch (error) {
      const cleanupErrors = cleanupConstruction(scene, geometry, material, texture);
      const failure = new Error('ProductCanvasUiSurface 初始化失败。');
      failure.cause = normalizeThrownError(error, 'ProductCanvasUiSurface Three 初始化失败');
      Object.defineProperty(failure, 'cleanupErrors', { value: cleanupErrors });
      throw failure;
    }
    this.#texture = texture;
    this.scene = scene;
    this.camera = camera;
    this.quad = quad;
    Object.freeze(this);
  }

  get state(): ProductCanvasUiSurfaceState {
    return this.#state;
  }

  #rejectReentry(operation: string): void {
    if (!this.#operating) return;
    this.#reentryDetected = true;
    throw new Error(
      `ProductCanvasUiSurface ${operation} 不得重入 ${this.#operationName}。`,
    );
  }

  #assertReady(operation: string): void {
    this.#rejectReentry(operation);
    if (this.#state !== PRODUCT_CANVAS_UI_SURFACE_STATE.READY) {
      throw new Error(`ProductCanvasUiSurface 当前状态不可用：${this.#state}。`);
    }
  }

  #begin(operation: string): void {
    this.#rejectReentry(operation);
    this.#operating = true;
    this.#operationName = operation;
    this.#reentryDetected = false;
  }

  #end(): void {
    this.#operating = false;
    this.#operationName = '';
  }

  #assertNoSwallowedReentry(): void {
    if (this.#reentryDetected) {
      throw new Error('ProductCanvasUiSurface 宿主回调吞掉了重入异常。');
    }
  }

  #disposeResources(): readonly unknown[] {
    const errors: unknown[] = [];
    this.#bindingCleanup?.();
    if (this.#resourceLease) {
      try {
        this.#resourceLease.dispose();
        this.#resourceLease = null;
      } catch (error) {
        errors.push(error);
      }
    }
    if (!this.#sceneCleared) {
      try {
        this.scene.clear();
        this.#sceneCleared = true;
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length === 0) {
      this.#viewModel = null;
      this.#model = null;
      this.#drawnModel = null;
      this.#layout = null;
      this.#rendererTarget = null;
      this.#rendererRender = null;
      this.#visible = false;
      this.#state = PRODUCT_CANVAS_UI_SURFACE_STATE.DISPOSED;
    } else {
      this.#state = PRODUCT_CANVAS_UI_SURFACE_STATE.DISPOSE_INCOMPLETE;
    }
    return Object.freeze(errors);
  }

  #failClosed(cause: unknown): Error {
    const cleanupErrors = this.#disposeResources();
    return cleanupFailure(cause, cleanupErrors);
  }

  #paint(
    model: ProductUiSceneModel,
    viewport: SurfaceViewport,
    textureScale: number,
    viewportRevision: number,
    force: boolean,
  ): Readonly<{ layout: ProductCanvasLayout; visible: boolean }> {
    if (
      !force
      && model === this.#drawnModel
      && viewportRevision === this.#drawnViewportRevision
      && this.#layout
    ) {
      return Object.freeze({ layout: this.#layout, visible: this.#visible });
    }
    const layout = createProductCanvasLayout(model, viewport);
    const visible = !model.gameplay;
    this.#context.setTransform(textureScale, 0, 0, textureScale, 0, 0);
    this.#context.clearRect(0, 0, viewport.width, viewport.height);
    if (visible) paintProductCanvasScene(this.#context, model, layout, viewport);
    this.#assertNoSwallowedReentry();
    this.#texture.needsUpdate = true;
    this.#drawnModel = model;
    this.#drawnViewportRevision = viewportRevision;
    return Object.freeze({ layout, visible });
  }

  async load(): Promise<this> {
    this.#rejectReentry('load');
    if (this.#state === PRODUCT_CANVAS_UI_SURFACE_STATE.DISPOSED) {
      throw new Error('ProductCanvasUiSurface 已销毁。');
    }
    if (this.#state === PRODUCT_CANVAS_UI_SURFACE_STATE.DISPOSE_INCOMPLETE) {
      throw new Error('ProductCanvasUiSurface 清理未完整完成。');
    }
    this.#state = PRODUCT_CANVAS_UI_SURFACE_STATE.READY;
    return this;
  }

  render(viewModel: unknown): boolean {
    this.#assertReady('render');
    const model = createProductUiSceneModel(viewModel);
    this.#begin('render');
    try {
      const painted = this.#paint(
        model,
        this.#viewport,
        this.#textureScale,
        this.#viewportRevision,
        false,
      );
      this.#assertNoSwallowedReentry();
      this.#viewModel = viewModel;
      this.#model = model;
      this.#layout = painted.layout;
      this.#visible = painted.visible;
      return true;
    } catch (error) {
      throw this.#failClosed(error);
    } finally {
      this.#end();
    }
  }

  resize(viewportValue: unknown, inputViewportValue?: unknown): boolean {
    this.#rejectReentry('resize');
    if (this.#state === PRODUCT_CANVAS_UI_SURFACE_STATE.DISPOSED) return false;
    if (this.#state === PRODUCT_CANVAS_UI_SURFACE_STATE.DISPOSE_INCOMPLETE) {
      throw new Error('ProductCanvasUiSurface 清理未完整完成。');
    }
    const viewport = normalizeViewport(viewportValue);
    const inputViewport = normalizeInputViewport(inputViewportValue, viewport);
    const textureScale = Math.max(
      0.5,
      Math.min(viewport.pixelRatio, 2048 / Math.max(viewport.width, viewport.height)),
    );
    const canvasWidth = Math.max(1, Math.round(viewport.width * textureScale));
    const canvasHeight = Math.max(1, Math.round(viewport.height * textureScale));
    const viewportRevision = this.#viewportRevision + 1;
    this.#begin('resize');
    try {
      setCanvasSize(this.#canvas, canvasWidth, canvasHeight);
      let painted: Readonly<{ layout: ProductCanvasLayout; visible: boolean }> | null = null;
      if (this.#model) {
        painted = this.#paint(
          this.#model,
          viewport,
          textureScale,
          viewportRevision,
          true,
        );
      } else {
        this.#texture.needsUpdate = true;
      }
      this.#assertNoSwallowedReentry();
      this.#viewport = viewport;
      this.#inputViewport = inputViewport;
      this.#textureScale = textureScale;
      this.#textureWidth = canvasWidth;
      this.#textureHeight = canvasHeight;
      this.#viewportRevision = viewportRevision;
      if (painted) {
        this.#layout = painted.layout;
        this.#visible = painted.visible;
      }
      return true;
    } catch (error) {
      throw this.#failClosed(error);
    } finally {
      this.#end();
    }
  }

  getInputViewport(fallbackValue?: unknown): InputViewport {
    this.#rejectReentry('getInputViewport');
    if (this.#state === PRODUCT_CANVAS_UI_SURFACE_STATE.DISPOSED) {
      throw new Error('ProductCanvasUiSurface 已销毁。');
    }
    if (this.#inputViewport.width > 1 || this.#inputViewport.height > 1) {
      return this.#inputViewport;
    }
    return normalizeInputViewport(fallbackValue, this.#inputViewport);
  }

  hitTestUi(
    pointValue: unknown,
    inputViewportValue: unknown,
    viewModel: unknown = this.#viewModel,
  ): Readonly<Record<string, unknown>> | null {
    this.#assertReady('hitTestUi');
    const normalizedPoint = point(pointValue);
    if (!normalizedPoint || !viewModel) return null;
    const inputViewport = normalizeInputViewport(inputViewportValue, this.#inputViewport);
    const model = createProductUiSceneModel(viewModel);
    if (model.gameplay || !model.inputEnabled) return null;
    const layout = model === this.#model && this.#layout
      ? this.#layout
      : createProductCanvasLayout(model, this.#viewport);
    const mapped = Object.freeze({
      x: normalizedPoint.x / inputViewport.width * this.#viewport.width,
      y: normalizedPoint.y / inputViewport.height * this.#viewport.height,
    });
    for (const hit of layout.hits) {
      if (pointInProductCanvasRect(mapped, hit.rect)) return hit.intent;
    }
    return null;
  }

  bindIntent(optionsValue: unknown = {}): () => void {
    this.#assertReady('bindIntent');
    assertKnownKeys(optionsValue, BINDING_KEYS, 'ProductCanvasUiSurface intent options');
    functionValue(
      ownData(optionsValue, 'onIntent', 'ProductCanvasUiSurface intent options'),
      'ProductCanvasUiSurface.onIntent',
    );
    const rejectedValue = ownData(
      optionsValue,
      'onRejected',
      'ProductCanvasUiSurface intent options',
      false,
    );
    if (rejectedValue !== undefined) {
      functionValue(rejectedValue, 'ProductCanvasUiSurface.onRejected');
    }
    if (this.#bindingCleanup) throw new Error('ProductCanvasUiSurface intent 已绑定。');
    let active = true;
    const cleanup = (): void => {
      if (!active) return;
      active = false;
      if (this.#bindingCleanup === cleanup) this.#bindingCleanup = null;
    };
    this.#bindingCleanup = cleanup;
    return cleanup;
  }

  requiresCompositeFrame(): boolean {
    this.#assertReady('requiresCompositeFrame');
    return this.#visible;
  }

  present(rendererValue: unknown): boolean {
    this.#assertReady('present');
    if (!this.#visible) return true;
    assertRecord(rendererValue, 'ProductCanvasUiSurface renderer');
    if (rendererValue !== this.#rendererTarget) {
      this.#rendererRender = snapshotMethod(
        rendererValue,
        'ProductCanvasUiSurface renderer',
        'render',
      );
      this.#rendererTarget = rendererValue;
    }
    this.#begin('present');
    try {
      const result = this.#rendererRender?.(this.scene, this.camera);
      rejectThenable(result, 'ProductCanvasUiSurface renderer.render()');
      this.#assertNoSwallowedReentry();
      return true;
    } catch (error) {
      if (this.#reentryDetected) throw this.#failClosed(error);
      throw error;
    } finally {
      this.#end();
    }
  }

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    this.#rejectReentry('getDebugSnapshot');
    return Object.freeze({
      state: this.#state,
      scene: this.#model?.scene ?? null,
      visible: this.#visible,
      textureWidth: this.#textureWidth,
      textureHeight: this.#textureHeight,
      hitCount: this.#layout?.hits.length ?? 0,
      bound: this.#bindingCleanup !== null,
      viewport: this.#viewport,
      inputViewport: this.#inputViewport,
      viewportRevision: this.#viewportRevision,
    });
  }

  dispose(): void {
    this.#rejectReentry('dispose');
    if (this.#state === PRODUCT_CANVAS_UI_SURFACE_STATE.DISPOSED) return;
    this.#begin('dispose');
    try {
      const errors = this.#disposeResources();
      this.#assertNoSwallowedReentry();
      if (errors.length > 0) {
        const failure = new Error('ProductCanvasUiSurface 清理未完整完成。');
        Object.defineProperty(failure, 'causes', { value: errors });
        throw failure;
      }
    } finally {
      this.#end();
    }
  }
}
