import { normalizeThrownError } from '@number-strategy-jump/arena-contracts';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import {
  booleanResult,
  ownOptions,
  rejectThenable,
  snapshotMethod,
} from './capability-utils.js';

type UnknownMethod = (...args: unknown[]) => unknown;

interface ProductRendererFrame {
  readonly viewModel: object;
  readonly matchFrame: unknown;
}

interface ProductUiSurfacePort {
  readonly load: () => unknown;
  readonly render: (viewModel: object, options: unknown) => unknown;
  readonly resize: (viewport: unknown, inputViewport: unknown) => unknown;
  readonly getInputViewport: (fallback: unknown) => unknown;
  readonly hitTestUi: (point: unknown, viewport: unknown, viewModel: unknown) => unknown;
  readonly bindIntent: (handlers: unknown) => unknown;
  readonly requiresCompositeFrame: () => unknown;
  readonly present: UnknownMethod;
  readonly dispose: () => unknown;
  readonly getDebugSnapshot: (() => unknown) | null;
}

interface ProductGameplayRendererPort {
  readonly load: () => unknown;
  readonly render: UnknownMethod;
  readonly renderComposite: (frame: unknown, overlay: ProductUiSurfacePort, options: unknown) => unknown;
  readonly resize: (viewport: unknown) => unknown;
  readonly getInputViewport: () => unknown;
  readonly handleContextLost: (event?: unknown) => unknown;
  readonly handleContextRestored: () => unknown;
  readonly dispose: () => unknown;
  readonly getDebugSnapshot: (() => unknown) | null;
  readonly getPerformanceSnapshot: (() => unknown) | null;
}

const CONSTRUCTOR_OPTION_KEYS = new Set([
  'canvas',
  'platform',
  'qualityDefinition',
  'gameplayRendererFactory',
  'uiSurfaceFactory',
]);

export const PRODUCT_RENDERER_STATE = Object.freeze({
  CREATED: 'created',
  READY: 'ready',
  CONTEXT_LOST: 'context-lost',
  FAILED: 'failed',
  DISPOSE_INCOMPLETE: 'dispose-incomplete',
  DISPOSED: 'disposed',
});

function requiredFunction(value: unknown, name: string): UnknownMethod {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value as UnknownMethod;
}

function method(value: unknown, name: string, methodName: string): UnknownMethod {
  return snapshotMethod(value, name, methodName)!;
}

function optionalMethod(value: unknown, name: string, methodName: string): UnknownMethod | null {
  return snapshotMethod(value, name, methodName, false);
}

function synchronousResult<T>(value: T, name: string): T {
  rejectThenable(value, name);
  return value;
}

function validateSurface(value: unknown): ProductUiSurfacePort {
  return Object.freeze({
    load: method(value, 'ProductRenderer.uiSurface', 'load') as () => unknown,
    render: method(value, 'ProductRenderer.uiSurface', 'render') as ProductUiSurfacePort['render'],
    resize: method(value, 'ProductRenderer.uiSurface', 'resize') as ProductUiSurfacePort['resize'],
    getInputViewport: method(value, 'ProductRenderer.uiSurface', 'getInputViewport') as ProductUiSurfacePort['getInputViewport'],
    hitTestUi: method(value, 'ProductRenderer.uiSurface', 'hitTestUi') as ProductUiSurfacePort['hitTestUi'],
    bindIntent: method(value, 'ProductRenderer.uiSurface', 'bindIntent') as ProductUiSurfacePort['bindIntent'],
    requiresCompositeFrame: method(value, 'ProductRenderer.uiSurface', 'requiresCompositeFrame') as () => unknown,
    present: method(value, 'ProductRenderer.uiSurface', 'present'),
    dispose: method(value, 'ProductRenderer.uiSurface', 'dispose') as () => unknown,
    getDebugSnapshot: optionalMethod(value, 'ProductRenderer.uiSurface', 'getDebugSnapshot') as (() => unknown) | null,
  });
}

function validateGameplayRenderer(value: unknown): ProductGameplayRendererPort {
  return Object.freeze({
    load: method(value, 'ProductRenderer.gameplayRenderer', 'load') as () => unknown,
    render: method(value, 'ProductRenderer.gameplayRenderer', 'render'),
    renderComposite: method(value, 'ProductRenderer.gameplayRenderer', 'renderComposite') as ProductGameplayRendererPort['renderComposite'],
    resize: method(value, 'ProductRenderer.gameplayRenderer', 'resize') as ProductGameplayRendererPort['resize'],
    getInputViewport: method(value, 'ProductRenderer.gameplayRenderer', 'getInputViewport') as () => unknown,
    handleContextLost: method(value, 'ProductRenderer.gameplayRenderer', 'handleContextLost') as ProductGameplayRendererPort['handleContextLost'],
    handleContextRestored: method(value, 'ProductRenderer.gameplayRenderer', 'handleContextRestored') as () => unknown,
    dispose: method(value, 'ProductRenderer.gameplayRenderer', 'dispose') as () => unknown,
    getDebugSnapshot: optionalMethod(value, 'ProductRenderer.gameplayRenderer', 'getDebugSnapshot') as (() => unknown) | null,
    getPerformanceSnapshot: optionalMethod(value, 'ProductRenderer.gameplayRenderer', 'getPerformanceSnapshot') as (() => unknown) | null,
  });
}

function ownData(value: object, key: string, name: string, required = true): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) {
    if (!required) return undefined;
    throw new TypeError(`${name} 缺少 ${key}。`);
  }
  if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${name}.${key} 必须是数据字段。`);
  return descriptor.value;
}

function validateFrame(value: unknown): ProductRendererFrame {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('ProductRenderer frame 必须包含 viewModel。');
  }
  const viewModel = ownData(value, 'viewModel', 'ProductRenderer frame');
  if (!viewModel || typeof viewModel !== 'object' || Array.isArray(viewModel)) {
    throw new TypeError('ProductRenderer frame 必须包含 viewModel。');
  }
  return Object.freeze({
    viewModel,
    matchFrame: ownData(value, 'matchFrame', 'ProductRenderer frame', false) ?? null,
  });
}

function cleanupFailure(errors: readonly unknown[]): (Error & { cleanupErrors: readonly Error[] }) | null {
  if (errors.length === 0) return null;
  const failure = new Error('ProductRenderer 清理未完整完成。') as Error & {
    cleanupErrors: readonly Error[];
  };
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
  #gameplayRenderer: ProductGameplayRendererPort | null;
  #uiSurface: ProductUiSurfacePort | null;
  #state: typeof PRODUCT_RENDERER_STATE[keyof typeof PRODUCT_RENDERER_STATE];
  #contextLost: boolean;
  #loadPromise: Promise<this> | null;
  #loadGeneration: number;
  #loaded: boolean;
  #rendering: boolean;
  #lastError: Error | null;

  constructor(optionsValue: unknown) {
    const options = ownOptions(optionsValue, CONSTRUCTOR_OPTION_KEYS, 'ProductRenderer options');
    const canvas = options.canvas;
    const platform = options.platform;
    const qualityDefinition = options.qualityDefinition;
    const gameplayRendererFactory = requiredFunction(
      options.gameplayRendererFactory,
      'ProductRenderer.gameplayRendererFactory',
    );
    const uiSurfaceFactory = requiredFunction(
      options.uiSurfaceFactory,
      'ProductRenderer.uiSurfaceFactory',
    );
    if (!canvas || typeof canvas !== 'object' || snapshotMethod(
      canvas,
      'ProductRenderer Canvas',
      'getContext',
    ) === null) {
      throw new TypeError('ProductRenderer 需要 Canvas。');
    }
    this.#gameplayRenderer = null;
    this.#uiSurface = null;
    this.#state = PRODUCT_RENDERER_STATE.CREATED;
    this.#contextLost = false;
    this.#loadPromise = null;
    this.#loadGeneration = 0;
    this.#loaded = false;
    this.#rendering = false;
    this.#lastError = null;
    let gameplayCandidate: unknown = null;
    let surfaceCandidate: unknown = null;
    try {
      gameplayCandidate = gameplayRendererFactory({
        canvas,
        platform,
        ...(qualityDefinition === undefined ? {} : { qualityDefinition }),
      });
      this.#gameplayRenderer = validateGameplayRenderer(gameplayCandidate);
      surfaceCandidate = uiSurfaceFactory({ canvas, platform });
      this.#uiSurface = validateSurface(surfaceCandidate);
    } catch (error) {
      const cause = normalizeThrownError(error, 'ProductRenderer 初始化失败');
      this.#lastError = cause;
      this.#state = PRODUCT_RENDERER_STATE.FAILED;
      try {
        const surfaceDispose = optionalMethod(surfaceCandidate, 'ProductRenderer.uiSurface', 'dispose');
        if (surfaceDispose) rejectThenable(surfaceDispose(), 'ProductRenderer.uiSurface.dispose()');
      } catch { /* preserve construction cause */ }
      try {
        const gameplayDispose = optionalMethod(
          gameplayCandidate,
          'ProductRenderer.gameplayRenderer',
          'dispose',
        );
        if (gameplayDispose) {
          rejectThenable(gameplayDispose(), 'ProductRenderer.gameplayRenderer.dispose()');
        }
      } catch { /* preserve construction cause */ }
      this.#uiSurface = null;
      this.#gameplayRenderer = null;
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

  #resources(): readonly [ProductGameplayRendererPort, ProductUiSurfacePort] {
    const gameplayRenderer = this.#gameplayRenderer;
    const uiSurface = this.#uiSurface;
    if (gameplayRenderer === null || uiSurface === null) {
      throw new Error('ProductRenderer 子资源不完整。');
    }
    return [gameplayRenderer, uiSurface];
  }

  async #performLoad(
    generation: number,
    gameplayRenderer: ProductGameplayRendererPort,
    uiSurface: ProductUiSurfacePort,
  ): Promise<this> {
    try {
      await gameplayRenderer.load();
      if (generation !== this.#loadGeneration) throw new Error('ProductRenderer 加载已取消。');
      await uiSurface.load();
      if (generation !== this.#loadGeneration) throw new Error('ProductRenderer 加载已取消。');
      this.#loaded = true;
      if (this.#contextLost) {
        booleanResult(
          gameplayRenderer.handleContextLost(),
          'ProductRenderer.gameplayRenderer.handleContextLost()',
        );
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
    const [gameplayRenderer, uiSurface] = this.#resources();
    const operation = this.#performLoad(
      generation,
      gameplayRenderer,
      uiSurface,
    ).finally(() => {
      if (this.#loadPromise === operation) this.#loadPromise = null;
    });
    this.#loadPromise = operation;
    return operation;
  }

  render(frameValue: unknown, optionsValue: unknown = {}) {
    this.#assertUsable();
    if (this.#state === PRODUCT_RENDERER_STATE.CONTEXT_LOST) return false;
    if (this.#state !== PRODUCT_RENDERER_STATE.READY) {
      throw new Error(`ProductRenderer 无法在 ${this.#state} 状态 render。`);
    }
    if (this.#rendering) throw new Error('ProductRenderer.render() 不可重入。');
    const frame = validateFrame(frameValue);
    if (!optionsValue || typeof optionsValue !== 'object' || Array.isArray(optionsValue)) {
      throw new TypeError('ProductRenderer render options 必须是普通对象。');
    }
    const optionsPrototype = Object.getPrototypeOf(optionsValue) as object | null;
    if (optionsPrototype !== Object.prototype && optionsPrototype !== null) {
      throw new TypeError('ProductRenderer render options 必须是普通对象。');
    }
    const options = cloneFrozenData(
      optionsValue as Record<string, unknown>,
      'ProductRenderer render options',
    );
    const [gameplayRenderer, uiSurface] = this.#resources();
    this.#rendering = true;
    try {
      const surfaceRendered = uiSurface.render(frame.viewModel, options);
      rejectThenable(surfaceRendered, 'ProductRenderer.uiSurface.render()');
      if (surfaceRendered === false) return false;
      const requiresCompositeFrame = booleanResult(
        uiSurface.requiresCompositeFrame(),
        'ProductRenderer.uiSurface.requiresCompositeFrame()',
      );
      if (
        (frame.matchFrame === null || frame.matchFrame === undefined)
        && !requiresCompositeFrame
      ) return true;
      const profile = ownData(frame.viewModel, 'profile', 'ProductRenderer viewModel', false);
      const soundEnabled = profile && typeof profile === 'object' && !Array.isArray(profile)
        ? ownData(profile, 'soundEnabled', 'ProductRenderer profile', false) ?? true
        : true;
      const reducedMotion = profile && typeof profile === 'object' && !Array.isArray(profile)
        ? ownData(profile, 'reducedMotion', 'ProductRenderer profile', false) ?? false
        : false;
      if (typeof soundEnabled !== 'boolean' || typeof reducedMotion !== 'boolean') {
        throw new TypeError('ProductRenderer profile 声音与减少动效字段必须是布尔值。');
      }
      const gameplayOptions = {
        ...options,
        soundEnabled,
        reducedMotion,
      };
      const rendered = gameplayRenderer.renderComposite(
        frame.matchFrame ?? null,
        uiSurface,
        gameplayOptions,
      );
      rejectThenable(rendered, 'ProductRenderer.gameplayRenderer.renderComposite()');
      return rendered !== false;
    } catch (error) {
      this.#lastError = normalizeThrownError(error, 'ProductRenderer 渲染失败');
      throw error;
    } finally {
      this.#rendering = false;
    }
  }

  resize(viewport: unknown) {
    this.#assertUsable();
    const [gameplayRenderer, uiSurface] = this.#resources();
    const gameplayResized = gameplayRenderer.resize(viewport);
    rejectThenable(gameplayResized, 'ProductRenderer.gameplayRenderer.resize()');
    if (gameplayResized === false) return false;
    const inputViewport = synchronousResult(
      gameplayRenderer.getInputViewport(),
      'ProductRenderer.gameplayRenderer.getInputViewport()',
    );
    const resized = uiSurface.resize(viewport, inputViewport);
    rejectThenable(resized, 'ProductRenderer.uiSurface.resize()');
    return resized !== false;
  }

  getInputViewport() {
    this.#assertUsable();
    const [gameplayRenderer, uiSurface] = this.#resources();
    const gameplayViewport = synchronousResult(
      gameplayRenderer.getInputViewport(),
      'ProductRenderer.gameplayRenderer.getInputViewport()',
    );
    return synchronousResult(
      uiSurface.getInputViewport(gameplayViewport),
      'ProductRenderer.uiSurface.getInputViewport()',
    );
  }

  hitTestUi(point: unknown, viewport: unknown, viewModel: unknown) {
    this.#assertUsable();
    const [, uiSurface] = this.#resources();
    return synchronousResult(
      uiSurface.hitTestUi(point, viewport, viewModel),
      'ProductRenderer.uiSurface.hitTestUi()',
    );
  }

  bindUiIntent(handlers: unknown) {
    this.#assertUsable();
    const [, uiSurface] = this.#resources();
    const cleanup = synchronousResult(
      uiSurface.bindIntent(handlers),
      'ProductRenderer.uiSurface.bindIntent()',
    );
    if (typeof cleanup !== 'function') {
      throw new TypeError('ProductRenderer.uiSurface.bindIntent() 必须返回 cleanup 函数。');
    }
    return cleanup;
  }

  handleContextLost(event?: unknown) {
    if (
      this.#state === PRODUCT_RENDERER_STATE.DISPOSED
      || this.#state === PRODUCT_RENDERER_STATE.FAILED
      || this.#state === PRODUCT_RENDERER_STATE.DISPOSE_INCOMPLETE
    ) return false;
    const gameplayRenderer = this.#gameplayRenderer;
    const handled = booleanResult(
      gameplayRenderer?.handleContextLost(event) ?? false,
      'ProductRenderer.gameplayRenderer.handleContextLost()',
    );
    this.#contextLost = true;
    this.#state = PRODUCT_RENDERER_STATE.CONTEXT_LOST;
    return handled;
  }

  handleContextRestored() {
    if (!this.#contextLost || this.#state !== PRODUCT_RENDERER_STATE.CONTEXT_LOST) return false;
    const gameplayRenderer = this.#gameplayRenderer;
    if (gameplayRenderer === null) return false;
    const restored = booleanResult(
      gameplayRenderer.handleContextRestored(),
      'ProductRenderer.gameplayRenderer.handleContextRestored()',
    );
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
      gameplay: synchronousResult(
        this.#gameplayRenderer?.getDebugSnapshot?.() ?? null,
        'ProductRenderer.gameplayRenderer.getDebugSnapshot()',
      ),
      ui: synchronousResult(
        this.#uiSurface?.getDebugSnapshot?.() ?? null,
        'ProductRenderer.uiSurface.getDebugSnapshot()',
      ),
    });
  }

  getPerformanceSnapshot() {
    this.#assertUsable();
    return synchronousResult(
      this.#gameplayRenderer?.getPerformanceSnapshot?.() ?? null,
      'ProductRenderer.gameplayRenderer.getPerformanceSnapshot()',
    );
  }

  dispose() {
    if (this.#state === PRODUCT_RENDERER_STATE.DISPOSED) return;
    if (this.#rendering) throw new Error('render() 期间不能销毁 ProductRenderer。');
    this.#loadGeneration += 1;
    const errors = [];
    if (this.#uiSurface !== null) {
      try {
        rejectThenable(
          this.#uiSurface.dispose(),
          'ProductRenderer.uiSurface.dispose()',
        );
        this.#uiSurface = null;
      } catch (error) {
        errors.push(error);
      }
    }
    if (this.#gameplayRenderer !== null) {
      try {
        rejectThenable(
          this.#gameplayRenderer.dispose(),
          'ProductRenderer.gameplayRenderer.dispose()',
        );
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
