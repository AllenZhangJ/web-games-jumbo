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

type ProductRendererOperation =
  | 'state-read'
  | 'load-request'
  | 'load-gameplay-launch'
  | 'load-ui-launch'
  | 'load-publication'
  | 'load-failure'
  | 'render'
  | 'resize'
  | 'input-viewport-read'
  | 'ui-hit-test'
  | 'intent-bind'
  | 'context-lost'
  | 'context-restored'
  | 'debug-read'
  | 'performance-read'
  | 'dispose';

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

function nativePromise<T>(value: unknown, name: string): Promise<T> {
  if (!(value instanceof Promise)) {
    rejectThenable(value, name);
    throw new TypeError(`${name} 必须返回 Promise。`);
  }
  return value as Promise<T>;
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
  #operation: ProductRendererOperation | null;
  #operationSequence: number;
  #reentrySequence: number;
  #reentryError: Error | null;
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
    this.#operation = null;
    this.#operationSequence = 0;
    this.#reentrySequence = 0;
    this.#reentryError = null;
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
    return this.#runOperation('state-read', () => this.#state);
  }

  #guardReentry(operation: ProductRendererOperation): void {
    if (this.#operation === null) return;
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `ProductRenderer ${this.#operation}期间拒绝${operation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertCurrentOperationCommit(
    sequence: number,
    operation: ProductRendererOperation,
    label: string,
  ): void {
    if (this.#operation !== operation || this.#operationSequence !== sequence) {
      throw new Error(`${label}缺少当前ProductRenderer operation所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runOperation<T>(operation: ProductRendererOperation, run: (sequence: number) => T): T {
    this.#guardReentry(operation);
    this.#operation = operation;
    this.#operationSequence += 1;
    const sequence = this.#operationSequence;
    this.#reentryError = null;
    let result!: T;
    let failure: unknown = null;
    let failed = false;
    try {
      result = run(sequence);
      this.#assertCurrentOperationCommit(sequence, operation, `ProductRenderer ${operation}`);
    } catch (error) {
      failed = true;
      failure = error;
    } finally {
      const reentryError = this.#reentryError;
      this.#operation = null;
      this.#reentryError = null;
      if (reentryError !== null && failure !== reentryError) {
        throw new AggregateError(
          failed ? [failure, reentryError] : [reentryError],
          `ProductRenderer ${operation}失败且发生同步重入。`,
        );
      }
    }
    if (failed) throw failure;
    return result;
  }

  #callChecked<T>(
    sequence: number,
    operation: ProductRendererOperation,
    callback: () => T,
    label: string,
  ): T {
    try {
      const result = synchronousResult(callback(), label);
      this.#assertCurrentOperationCommit(sequence, operation, label);
      return result;
    } catch (error) {
      try {
        this.#assertCurrentOperationCommit(sequence, operation, label);
      } catch (reentryError) {
        if (error !== reentryError) {
          throw new AggregateError(
            [error, reentryError],
            `${label}失败且发生ProductRenderer重入。`,
          );
        }
        throw reentryError;
      }
      throw error;
    }
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
      let gameplayLoadOwner: Promise<unknown> | null = null;
      try {
        gameplayLoadOwner = this.#runOperation('load-gameplay-launch', () => {
          const owner = nativePromise(
            gameplayRenderer.load(),
            'ProductRenderer.gameplayRenderer.load()',
          );
          gameplayLoadOwner = owner;
          return owner;
        });
      } catch (error) {
        if (gameplayLoadOwner !== null) void gameplayLoadOwner.catch(() => undefined);
        throw error;
      }
      await gameplayLoadOwner;
      if (generation !== this.#loadGeneration) throw new Error('ProductRenderer 加载已取消。');
      let uiLoadOwner: Promise<unknown> | null = null;
      try {
        uiLoadOwner = this.#runOperation('load-ui-launch', () => {
          const owner = nativePromise(
            uiSurface.load(),
            'ProductRenderer.uiSurface.load()',
          );
          uiLoadOwner = owner;
          return owner;
        });
      } catch (error) {
        if (uiLoadOwner !== null) void uiLoadOwner.catch(() => undefined);
        throw error;
      }
      await uiLoadOwner;
      if (generation !== this.#loadGeneration) throw new Error('ProductRenderer 加载已取消。');
      return this.#runOperation('load-publication', (sequence) => {
        if (generation !== this.#loadGeneration) {
          throw new Error('ProductRenderer 加载已取消。');
        }
        const contextLost = this.#contextLost;
        if (contextLost) {
          booleanResult(
            this.#callChecked(
              sequence,
              'load-publication',
              () => gameplayRenderer.handleContextLost(),
              'ProductRenderer.gameplayRenderer.handleContextLost() after load',
            ),
            'ProductRenderer.gameplayRenderer.handleContextLost() after load',
          );
        }
        this.#loaded = true;
        this.#state = contextLost
          ? PRODUCT_RENDERER_STATE.CONTEXT_LOST
          : PRODUCT_RENDERER_STATE.READY;
        return this;
      });
    } catch (error) {
      if (generation !== this.#loadGeneration) throw error;
      return this.#runOperation('load-failure', () => {
        this.#lastError = normalizeThrownError(error, 'ProductRenderer 加载失败');
        this.#state = PRODUCT_RENDERER_STATE.FAILED;
        const failure = new Error('ProductRenderer 加载失败。');
        failure.cause = this.#lastError;
        throw failure;
      });
    }
  }

  load() {
    if (this.#loadPromise !== null) return this.#loadPromise;
    return this.#runOperation('load-request', () => {
      this.#assertUsable();
      if (
        this.#loaded
        && (
          this.#state === PRODUCT_RENDERER_STATE.READY
          || this.#state === PRODUCT_RENDERER_STATE.CONTEXT_LOST
        )
      ) return Promise.resolve(this);
      const generation = this.#loadGeneration;
      const [gameplayRenderer, uiSurface] = this.#resources();
      const operation: Promise<this> = Promise.resolve()
        .then(() => this.#performLoad(generation, gameplayRenderer, uiSurface))
        .finally(() => {
          if (this.#loadPromise === operation) this.#loadPromise = null;
        });
      this.#loadPromise = operation;
      return operation;
    });
  }

  render(frameValue: unknown, optionsValue: unknown = {}) {
    return this.#runOperation('render', (sequence) => {
      this.#assertUsable();
      if (this.#state === PRODUCT_RENDERER_STATE.CONTEXT_LOST) return false;
      if (this.#state !== PRODUCT_RENDERER_STATE.READY) {
        throw new Error(`ProductRenderer 无法在 ${this.#state} 状态 render。`);
      }
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
      try {
        const surfaceRendered = this.#callChecked(
          sequence,
          'render',
          () => uiSurface.render(frame.viewModel, options),
          'ProductRenderer.uiSurface.render()',
        );
        if (surfaceRendered === false) return false;
        const requiresCompositeFrame = booleanResult(
          this.#callChecked(
            sequence,
            'render',
            () => uiSurface.requiresCompositeFrame(),
            'ProductRenderer.uiSurface.requiresCompositeFrame()',
          ),
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
        const rendered = this.#callChecked(
          sequence,
          'render',
          () => gameplayRenderer.renderComposite(
            frame.matchFrame ?? null,
            uiSurface,
            gameplayOptions,
          ),
          'ProductRenderer.gameplayRenderer.renderComposite()',
        );
        return rendered !== false;
      } catch (error) {
        this.#lastError = normalizeThrownError(error, 'ProductRenderer 渲染失败');
        throw error;
      }
    });
  }

  resize(viewport: unknown) {
    return this.#runOperation('resize', (sequence) => {
      this.#assertUsable();
      const [gameplayRenderer, uiSurface] = this.#resources();
      const gameplayResized = this.#callChecked(
        sequence,
        'resize',
        () => gameplayRenderer.resize(viewport),
        'ProductRenderer.gameplayRenderer.resize()',
      );
      if (gameplayResized === false) return false;
      const inputViewport = this.#callChecked(
        sequence,
        'resize',
        () => gameplayRenderer.getInputViewport(),
        'ProductRenderer.gameplayRenderer.getInputViewport()',
      );
      const resized = this.#callChecked(
        sequence,
        'resize',
        () => uiSurface.resize(viewport, inputViewport),
        'ProductRenderer.uiSurface.resize()',
      );
      return resized !== false;
    });
  }

  getInputViewport() {
    return this.#runOperation('input-viewport-read', (sequence) => {
      this.#assertUsable();
      const [gameplayRenderer, uiSurface] = this.#resources();
      const gameplayViewport = this.#callChecked(
        sequence,
        'input-viewport-read',
        () => gameplayRenderer.getInputViewport(),
        'ProductRenderer.gameplayRenderer.getInputViewport()',
      );
      return this.#callChecked(
        sequence,
        'input-viewport-read',
        () => uiSurface.getInputViewport(gameplayViewport),
        'ProductRenderer.uiSurface.getInputViewport()',
      );
    });
  }

  hitTestUi(point: unknown, viewport: unknown, viewModel: unknown) {
    return this.#runOperation('ui-hit-test', (sequence) => {
      this.#assertUsable();
      const [, uiSurface] = this.#resources();
      return this.#callChecked(
        sequence,
        'ui-hit-test',
        () => uiSurface.hitTestUi(point, viewport, viewModel),
        'ProductRenderer.uiSurface.hitTestUi()',
      );
    });
  }

  bindUiIntent(handlers: unknown) {
    return this.#runOperation('intent-bind', (sequence) => {
      this.#assertUsable();
      const [, uiSurface] = this.#resources();
      const cleanup = this.#callChecked(
        sequence,
        'intent-bind',
        () => uiSurface.bindIntent(handlers),
        'ProductRenderer.uiSurface.bindIntent()',
      );
      if (typeof cleanup !== 'function') {
        throw new TypeError('ProductRenderer.uiSurface.bindIntent() 必须返回 cleanup 函数。');
      }
      return cleanup;
    });
  }

  handleContextLost(event?: unknown) {
    return this.#runOperation('context-lost', (sequence) => {
      if (
        this.#state === PRODUCT_RENDERER_STATE.DISPOSED
        || this.#state === PRODUCT_RENDERER_STATE.FAILED
        || this.#state === PRODUCT_RENDERER_STATE.DISPOSE_INCOMPLETE
      ) return false;
      const gameplayRenderer = this.#gameplayRenderer;
      const handled = booleanResult(
        gameplayRenderer === null
          ? false
          : this.#callChecked(
            sequence,
            'context-lost',
            () => gameplayRenderer.handleContextLost(event),
            'ProductRenderer.gameplayRenderer.handleContextLost()',
          ),
        'ProductRenderer.gameplayRenderer.handleContextLost()',
      );
      this.#contextLost = true;
      this.#state = PRODUCT_RENDERER_STATE.CONTEXT_LOST;
      return handled;
    });
  }

  handleContextRestored() {
    return this.#runOperation('context-restored', (sequence) => {
      if (!this.#contextLost || this.#state !== PRODUCT_RENDERER_STATE.CONTEXT_LOST) return false;
      const gameplayRenderer = this.#gameplayRenderer;
      if (gameplayRenderer === null) return false;
      const restored = booleanResult(
        this.#callChecked(
          sequence,
          'context-restored',
          () => gameplayRenderer.handleContextRestored(),
          'ProductRenderer.gameplayRenderer.handleContextRestored()',
        ),
        'ProductRenderer.gameplayRenderer.handleContextRestored()',
      );
      if (restored) {
        this.#contextLost = false;
        this.#state = PRODUCT_RENDERER_STATE.READY;
      }
      return restored;
    });
  }

  getDebugSnapshot() {
    return this.#runOperation('debug-read', (sequence) => {
      const gameplayDebug = this.#gameplayRenderer?.getDebugSnapshot ?? null;
      const uiDebug = this.#uiSurface?.getDebugSnapshot ?? null;
      return Object.freeze({
        state: this.#state,
        contextLost: this.#contextLost,
        loaded: this.#loaded,
        rendering: this.#operation === 'render',
        lastError: this.#lastError,
        gameplay: gameplayDebug === null
          ? null
          : this.#callChecked(
            sequence,
            'debug-read',
            gameplayDebug,
            'ProductRenderer.gameplayRenderer.getDebugSnapshot()',
          ),
        ui: uiDebug === null
          ? null
          : this.#callChecked(
            sequence,
            'debug-read',
            uiDebug,
            'ProductRenderer.uiSurface.getDebugSnapshot()',
          ),
      });
    });
  }

  getPerformanceSnapshot() {
    return this.#runOperation('performance-read', (sequence) => {
      this.#assertUsable();
      const read = this.#gameplayRenderer?.getPerformanceSnapshot ?? null;
      return read === null
        ? null
        : this.#callChecked(
          sequence,
          'performance-read',
          read,
          'ProductRenderer.gameplayRenderer.getPerformanceSnapshot()',
        );
    });
  }

  dispose() {
    return this.#runOperation('dispose', (sequence) => {
      if (this.#state === PRODUCT_RENDERER_STATE.DISPOSED) return;
      this.#loadGeneration += 1;
      const errors: unknown[] = [];
      const uiSurface = this.#uiSurface;
      if (uiSurface !== null) {
        try {
          this.#callChecked(
            sequence,
            'dispose',
            uiSurface.dispose,
            'ProductRenderer.uiSurface.dispose()',
          );
          this.#uiSurface = null;
        } catch (error) {
          errors.push(error);
        }
      }
      if (this.#reentryError === null) {
        const gameplayRenderer = this.#gameplayRenderer;
        if (gameplayRenderer !== null) {
          try {
            this.#callChecked(
              sequence,
              'dispose',
              gameplayRenderer.dispose,
              'ProductRenderer.gameplayRenderer.dispose()',
            );
            this.#gameplayRenderer = null;
          } catch (error) {
            errors.push(error);
          }
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
    });
  }
}

export const PRODUCT_RENDERER_OPERATION_POLICY = Object.freeze({
  loadPromisePublishesBeforeChildLoadInvocation: true as const,
  asynchronousLoadUsesGameplayUiAndPublicationSegments: true as const,
  contextLossAndDisposeRemainAvailableBetweenAsyncLoadSegments: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  childCallbacksCheckedBeforeCrossChildAndStatePublication: true as const,
  publicStateDebugAndPerformanceReadsRejectIntermediateOperations: true as const,
  cleanupReentryRetainsCurrentAndLaterRendererOwners: true as const,
  ordinaryCleanupFailureRetainsExactRetryOwner: true as const,
  frameCompositionContextAndCleanupOrderRemainUnchanged: true as const,
  validationStatus: 'not-run' as const,
});
