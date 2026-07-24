import {
  combineCleanupFailure,
  cloneFrozenData,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import {
  PRODUCT_INPUT_ROUTER_MODE,
  createProductUiIntent,
  createProductUiIntentKey,
  type ProductInputRouterMode,
  type ProductUiIntent,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  clonePoint,
  cloneViewport,
  type PresentationInputPoint,
  type PresentationInputViewport,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  booleanResult,
  ownOptions,
  rejectThenable,
  snapshotMethod,
} from './capability-utils.js';

export { PRODUCT_INPUT_ROUTER_MODE } from '@number-strategy-jump/arena-presentation-contracts';

const OPTION_KEYS = new Set(['sampler', 'viewport', 'hitTestUi', 'onIntent', 'onIntentRejected']);
const MODES = new Set<string>(Object.values(PRODUCT_INPUT_ROUTER_MODE));

export interface ProductInputSamplerPort {
  pointerStart(point: unknown): boolean;
  pointerMove(point: unknown): boolean;
  pointerEnd(point: unknown): boolean;
  pointerCancel(point: unknown): boolean;
  resize(viewport: PresentationInputViewport): boolean;
  suspend(): boolean;
  resume(): boolean;
  sample(tick: number, options?: unknown): unknown;
  destroy(): void;
  getDebugSnapshot?(): unknown;
}

interface SamplerAdapter extends ProductInputSamplerPort {
  readonly source: object;
}

export interface ProductInputRouterOptions {
  readonly sampler: ProductInputSamplerPort;
  readonly viewport: PresentationInputViewport;
  readonly hitTestUi: (
    point: PresentationInputPoint,
    viewport: PresentationInputViewport,
  ) => unknown;
  readonly onIntent: (intent: ProductUiIntent) => unknown;
  readonly onIntentRejected?: (error: unknown, intent: ProductUiIntent) => unknown;
}

function requiredFunction(value: unknown, name: string): (...args: unknown[]) => unknown {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value as (...args: unknown[]) => unknown;
}

function callSync(method: (...args: unknown[]) => unknown, name: string, ...args: unknown[]): unknown {
  const result = method(...args);
  rejectThenable(result, name);
  return result;
}

function normalizeSampler(value: unknown): SamplerAdapter {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('ProductInputRouter.sampler 无效。');
  }
  const pointerStart = snapshotMethod(value, 'ProductInputRouter.sampler', 'pointerStart')!;
  const pointerMove = snapshotMethod(value, 'ProductInputRouter.sampler', 'pointerMove')!;
  const pointerEnd = snapshotMethod(value, 'ProductInputRouter.sampler', 'pointerEnd')!;
  const pointerCancel = snapshotMethod(value, 'ProductInputRouter.sampler', 'pointerCancel')!;
  const resize = snapshotMethod(value, 'ProductInputRouter.sampler', 'resize')!;
  const suspend = snapshotMethod(value, 'ProductInputRouter.sampler', 'suspend')!;
  const resume = snapshotMethod(value, 'ProductInputRouter.sampler', 'resume')!;
  const sample = snapshotMethod(value, 'ProductInputRouter.sampler', 'sample')!;
  const destroy = snapshotMethod(value, 'ProductInputRouter.sampler', 'destroy')!;
  const getDebugSnapshot = snapshotMethod(
    value,
    'ProductInputRouter.sampler',
    'getDebugSnapshot',
    false,
  );
  const adapter = {
    source: value,
    pointerStart: (point: unknown) => booleanResult(
      pointerStart(point),
      'ProductInputRouter.sampler.pointerStart()',
    ),
    pointerMove: (point: unknown) => booleanResult(
      pointerMove(point),
      'ProductInputRouter.sampler.pointerMove()',
    ),
    pointerEnd: (point: unknown) => booleanResult(
      pointerEnd(point),
      'ProductInputRouter.sampler.pointerEnd()',
    ),
    pointerCancel: (point: unknown) => booleanResult(
      pointerCancel(point),
      'ProductInputRouter.sampler.pointerCancel()',
    ),
    resize: (viewport: PresentationInputViewport) => booleanResult(
      resize(viewport),
      'ProductInputRouter.sampler.resize()',
    ),
    suspend: () => booleanResult(suspend(), 'ProductInputRouter.sampler.suspend()'),
    resume: () => booleanResult(resume(), 'ProductInputRouter.sampler.resume()'),
    sample: (tick: number, options?: unknown) => callSync(
      sample,
      'ProductInputRouter.sampler.sample()',
      tick,
      options,
    ),
    destroy: () => {
      callSync(destroy, 'ProductInputRouter.sampler.destroy()');
    },
    ...(getDebugSnapshot === null ? {} : {
      getDebugSnapshot: () => callSync(
        getDebugSnapshot,
        'ProductInputRouter.sampler.getDebugSnapshot()',
      ),
    }),
  };
  return Object.freeze(adapter);
}

function cleanupCandidate(candidate: SamplerAdapter, message: string, error: unknown): Error {
  const failure = normalizeThrownError(error, message);
  try {
    candidate.destroy();
    return failure;
  } catch (cleanupError) {
    return combineCleanupFailure(
      failure,
      [normalizeThrownError(cleanupError, `${message}清理失败`)],
      `${message}且清理失败。`,
    );
  }
}

function normalizeOwnedSampler(value: unknown): SamplerAdapter {
  try {
    return normalizeSampler(value);
  } catch (error) {
    const failure = normalizeThrownError(error, 'Product sampler 候选无效');
    if (!value || typeof value !== 'object') throw failure;
    let destroy: ((...args: unknown[]) => unknown) | null;
    try {
      destroy = snapshotMethod(value, 'Product sampler 候选', 'destroy', false);
    } catch (cleanupBoundaryError) {
      throw combineCleanupFailure(
        failure,
        [normalizeThrownError(cleanupBoundaryError, 'Product sampler 清理边界无效')],
        'Product sampler 候选无效且无法取得清理能力。',
      );
    }
    if (destroy === null) throw failure;
    try {
      callSync(destroy, 'Product sampler 候选.destroy()');
    } catch (cleanupError) {
      throw combineCleanupFailure(
        failure,
        [normalizeThrownError(cleanupError, 'Product sampler 候选清理失败')],
        'Product sampler 候选无效且清理失败。',
      );
    }
    throw failure;
  }
}

export class ProductInputRouter {
  #sampler: SamplerAdapter | null;
  readonly #hitTestUi: (point: PresentationInputPoint, viewport: PresentationInputViewport) => unknown;
  readonly #onIntent: (intent: ProductUiIntent) => unknown;
  readonly #onIntentRejected: (error: unknown, intent: ProductUiIntent) => unknown;
  #mode: ProductInputRouterMode;
  #viewport: PresentationInputViewport;
  #lifecycleSuspended = false;
  #samplerSuspended = false;
  #uiPointer: Readonly<{ pointerId: number; intentKey: string }> | null = null;
  #operation: string | null = null;
  #reentryAttempted = false;
  #destroyed = false;

  constructor(optionsValue: ProductInputRouterOptions) {
    const options = ownOptions(optionsValue, OPTION_KEYS, 'ProductInputRouter options');
    const sampler = normalizeOwnedSampler(options.sampler);
    try {
      this.#hitTestUi = requiredFunction(
        options.hitTestUi,
        'ProductInputRouter.hitTestUi',
      ) as (point: PresentationInputPoint, viewport: PresentationInputViewport) => unknown;
      this.#onIntent = requiredFunction(
        options.onIntent,
        'ProductInputRouter.onIntent',
      ) as (intent: ProductUiIntent) => unknown;
      this.#onIntentRejected = (options.onIntentRejected === undefined
        ? () => {}
        : requiredFunction(
          options.onIntentRejected,
          'ProductInputRouter.onIntentRejected',
        )) as (error: unknown, intent: ProductUiIntent) => unknown;
      this.#viewport = cloneViewport(options.viewport, 'ProductInputRouter.viewport');
      sampler.resize(this.#viewport);
      sampler.suspend();
    } catch (error) {
      throw cleanupCandidate(sampler, 'ProductInputRouter 初始化失败', error);
    }
    this.#sampler = sampler;
    this.#mode = PRODUCT_INPUT_ROUTER_MODE.INACTIVE;
    this.#samplerSuspended = true;
    Object.freeze(this);
  }

  #assertUsable(): SamplerAdapter {
    if (this.#destroyed || this.#sampler === null) throw new Error('ProductInputRouter 已销毁。');
    return this.#sampler;
  }

  #enter(operation: string): SamplerAdapter {
    const sampler = this.#assertUsable();
    if (this.#operation !== null) {
      this.#reentryAttempted = true;
      throw new Error(`ProductInputRouter.${operation}() 不可在 ${this.#operation}() 中重入。`);
    }
    this.#operation = operation;
    return sampler;
  }

  #leave(): void {
    const operation = this.#operation;
    this.#operation = null;
    if (!this.#reentryAttempted) return;
    this.#reentryAttempted = false;
    const sampler = this.#sampler;
    this.#sampler = null;
    this.#destroyed = true;
    const failure = new Error(`ProductInputRouter.${operation ?? 'operation'}() 检测到宿主重入并已失败关闭。`);
    if (sampler === null) throw failure;
    try {
      sampler.destroy();
    } catch (cleanupError) {
      throw combineCleanupFailure(
        failure,
        [normalizeThrownError(cleanupError, 'ProductInputRouter 重入清理失败')],
        'ProductInputRouter 重入且清理失败。',
      );
    }
    throw failure;
  }

  #shouldSuspendSampler(mode: ProductInputRouterMode = this.#mode): boolean {
    return this.#lifecycleSuspended || mode !== PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY;
  }

  #setSamplerSuspended(sampler: SamplerAdapter, value: boolean): boolean {
    if (value === this.#samplerSuspended) return false;
    if (value) sampler.suspend();
    else sampler.resume();
    this.#samplerSuspended = value;
    return true;
  }

  #hit(point: PresentationInputPoint): ProductUiIntent | null {
    const value = this.#hitTestUi(point, this.#viewport);
    rejectThenable(value, 'ProductInputRouter.hitTestUi()');
    return value === null || value === undefined ? null : createProductUiIntent(value);
  }

  #reportIntentRejection(error: unknown, intent: ProductUiIntent): void {
    try {
      const result = this.#onIntentRejected(error, intent);
      rejectThenable(result, 'ProductInputRouter.onIntentRejected()');
    } catch {
      // Observational reporting never owns input lifecycle.
    }
  }

  #dispatchIntent(intent: ProductUiIntent): void {
    let outcome: unknown;
    try {
      outcome = this.#onIntent(intent);
    } catch (error) {
      this.#reportIntentRejection(error, intent);
      return;
    }
    Promise.resolve(outcome).catch((error: unknown) => this.#reportIntentRejection(error, intent));
  }

  setMode(modeValue: unknown): boolean {
    if (typeof modeValue !== 'string' || !MODES.has(modeValue)) {
      throw new RangeError(`未知 ProductInputRouter mode ${String(modeValue)}。`);
    }
    const mode = modeValue as ProductInputRouterMode;
    const sampler = this.#enter('setMode');
    try {
      if (this.#mode === mode) return false;
      this.#setSamplerSuspended(sampler, this.#shouldSuspendSampler(mode));
      this.#mode = mode;
      this.#uiPointer = null;
      return true;
    } finally {
      this.#leave();
    }
  }

  #routePointer(operation: 'pointerStart' | 'pointerMove' | 'pointerEnd' | 'pointerCancel', pointValue: unknown): boolean {
    const sampler = this.#enter(operation);
    try {
      if (this.#lifecycleSuspended || this.#mode === PRODUCT_INPUT_ROUTER_MODE.INACTIVE) {
        return false;
      }
      const point = clonePoint(pointValue, `ProductInputRouter.${operation}`);
      if (this.#mode === PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY) {
        return sampler[operation](point);
      }
      if (operation === 'pointerStart') {
        if (this.#uiPointer !== null) return false;
        const intent = this.#hit(point);
        if (intent === null) return false;
        this.#uiPointer = Object.freeze({
          pointerId: point.pointerId,
          intentKey: createProductUiIntentKey(intent),
        });
        return true;
      }
      if (operation === 'pointerMove') return point.pointerId === this.#uiPointer?.pointerId;
      if (operation === 'pointerCancel') {
        if (point.pointerId !== this.#uiPointer?.pointerId) return false;
        this.#uiPointer = null;
        return true;
      }
      const pointer = this.#uiPointer;
      if (point.pointerId !== pointer?.pointerId) return false;
      this.#uiPointer = null;
      const intent = this.#hit(point);
      if (intent === null || createProductUiIntentKey(intent) !== pointer.intentKey) return false;
      this.#dispatchIntent(intent);
      return true;
    } finally {
      this.#leave();
    }
  }

  pointerStart(point: unknown): boolean { return this.#routePointer('pointerStart', point); }
  pointerMove(point: unknown): boolean { return this.#routePointer('pointerMove', point); }
  pointerEnd(point: unknown): boolean { return this.#routePointer('pointerEnd', point); }
  pointerCancel(point: unknown): boolean { return this.#routePointer('pointerCancel', point); }

  resize(viewportValue: unknown): boolean {
    const sampler = this.#enter('resize');
    try {
      const viewport = cloneViewport(viewportValue, 'ProductInputRouter.viewport');
      const changed = sampler.resize(viewport);
      this.#viewport = viewport;
      this.#uiPointer = null;
      return changed;
    } finally {
      this.#leave();
    }
  }

  suspend(): boolean {
    const sampler = this.#enter('suspend');
    try {
      if (this.#lifecycleSuspended) return false;
      this.#setSamplerSuspended(sampler, true);
      this.#lifecycleSuspended = true;
      this.#uiPointer = null;
      return true;
    } finally {
      this.#leave();
    }
  }

  resume(): boolean {
    const sampler = this.#enter('resume');
    try {
      if (!this.#lifecycleSuspended) return false;
      this.#setSamplerSuspended(
        sampler,
        this.#mode !== PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY,
      );
      this.#lifecycleSuspended = false;
      this.#uiPointer = null;
      return true;
    } finally {
      this.#leave();
    }
  }

  sample(tick: number, options?: unknown): unknown {
    const sampler = this.#enter('sample');
    try {
      if (
        this.#lifecycleSuspended
        || this.#mode !== PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY
        || this.#samplerSuspended
      ) throw new Error('ProductInputRouter 仅能在活跃 gameplay 模式采样。');
      return sampler.sample(tick, options);
    } finally {
      this.#leave();
    }
  }

  replaceSampler(samplerValue: unknown): boolean {
    const previous = this.#enter('replaceSampler');
    try {
      const replacement = normalizeOwnedSampler(samplerValue);
      if (replacement.source === previous.source) return false;
      const shouldSuspend = this.#shouldSuspendSampler();
      try {
        replacement.resize(this.#viewport);
        if (shouldSuspend) replacement.suspend();
      } catch (error) {
        throw cleanupCandidate(replacement, 'Product sampler 准备失败', error);
      }
      try {
        previous.destroy();
      } catch (error) {
        throw cleanupCandidate(replacement, '旧 Product sampler 清理失败', error);
      }
      this.#sampler = replacement;
      this.#samplerSuspended = shouldSuspend;
      this.#uiPointer = null;
      return true;
    } finally {
      this.#leave();
    }
  }

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    const sampler = this.#enter('getDebugSnapshot');
    try {
      return Object.freeze({
        mode: this.#mode,
        viewport: this.#viewport,
        lifecycleSuspended: this.#lifecycleSuspended,
        samplerSuspended: this.#samplerSuspended,
        uiPointer: this.#uiPointer,
        sampling: this.#operation === 'sample',
        sampler: sampler.getDebugSnapshot === undefined
          ? null
          : cloneFrozenData(
            sampler.getDebugSnapshot(),
            'ProductInputRouter sampler debug snapshot',
          ),
      });
    } finally {
      this.#leave();
    }
  }

  destroy(): void {
    if (this.#destroyed && this.#sampler === null) return;
    const sampler = this.#enter('destroy');
    try {
      this.#lifecycleSuspended = true;
      this.#uiPointer = null;
      sampler.destroy();
      this.#sampler = null;
      this.#destroyed = true;
    } finally {
      this.#leave();
    }
  }
}
