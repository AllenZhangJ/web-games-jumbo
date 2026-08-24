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
const NATIVE_PROMISE_THEN = Promise.prototype.then;

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
  let result: unknown;
  try {
    result = method(...args);
  } catch (error) {
    observeNativePromise(error);
    throw error;
  }
  rejectThenable(result, name);
  return result;
}

function observeNativePromise(
  value: unknown,
  onRejected: (error: unknown) => void = () => {},
): boolean {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return false;
  try {
    Reflect.apply(NATIVE_PROMISE_THEN, value, [
      () => undefined,
      (error: unknown) => {
        try { onRejected(error); } catch { /* rejection observers never own input state */ }
      },
    ]);
    return true;
  } catch {
    return false;
  }
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
      callSync(pointerStart, 'ProductInputRouter.sampler.pointerStart()', point),
      'ProductInputRouter.sampler.pointerStart()',
    ),
    pointerMove: (point: unknown) => booleanResult(
      callSync(pointerMove, 'ProductInputRouter.sampler.pointerMove()', point),
      'ProductInputRouter.sampler.pointerMove()',
    ),
    pointerEnd: (point: unknown) => booleanResult(
      callSync(pointerEnd, 'ProductInputRouter.sampler.pointerEnd()', point),
      'ProductInputRouter.sampler.pointerEnd()',
    ),
    pointerCancel: (point: unknown) => booleanResult(
      callSync(pointerCancel, 'ProductInputRouter.sampler.pointerCancel()', point),
      'ProductInputRouter.sampler.pointerCancel()',
    ),
    resize: (viewport: PresentationInputViewport) => booleanResult(
      callSync(resize, 'ProductInputRouter.sampler.resize()', viewport),
      'ProductInputRouter.sampler.resize()',
    ),
    suspend: () => booleanResult(
      callSync(suspend, 'ProductInputRouter.sampler.suspend()'),
      'ProductInputRouter.sampler.suspend()',
    ),
    resume: () => booleanResult(
      callSync(resume, 'ProductInputRouter.sampler.resume()'),
      'ProductInputRouter.sampler.resume()',
    ),
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
  #cleanupSamplers: SamplerAdapter[] = [];
  readonly #hitTestUi: (point: PresentationInputPoint, viewport: PresentationInputViewport) => unknown;
  readonly #onIntent: (intent: ProductUiIntent) => unknown;
  readonly #onIntentRejected: (error: unknown, intent: ProductUiIntent) => unknown;
  #mode: ProductInputRouterMode;
  #viewport: PresentationInputViewport;
  #lifecycleSuspended = false;
  #samplerSuspended = false;
  #uiPointer: Readonly<{ pointerId: number; intentKey: string }> | null = null;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
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
    if (this.#operation !== null) {
      this.#reentrySequence += 1;
      this.#reentryError ??= new Error(
        `ProductInputRouter.${operation}() 不可在 ${this.#operation}() 中重入。`,
      );
      throw this.#reentryError;
    }
    const sampler = this.#assertUsable();
    this.#operation = operation;
    this.#reentryError = null;
    return sampler;
  }

  #leave(): void {
    const operation = this.#operation;
    const reentryError = this.#reentryError;
    this.#operation = null;
    this.#reentryError = null;
    if (reentryError === null) return;
    this.#destroyed = true;
    this.#lifecycleSuspended = true;
    this.#uiPointer = null;
    throw new Error(
      `ProductInputRouter.${operation ?? 'operation'}() 检测到宿主重入并已失败关闭。`,
      { cause: reentryError },
    );
  }

  #assertCurrentOperationCommit(operation: string): void {
    if (this.#operation === null) throw new Error(`${operation}缺少当前操作所有权。`);
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #retainCleanupSampler(sampler: SamplerAdapter): void {
    if (this.#cleanupSamplers.some((candidate) => candidate.source === sampler.source)) return;
    this.#cleanupSamplers.push(sampler);
  }

  #removeCleanupSampler(sampler: SamplerAdapter): void {
    this.#cleanupSamplers = this.#cleanupSamplers.filter(
      (candidate) => candidate.source !== sampler.source,
    );
  }

  #cleanupSampler(sampler: SamplerAdapter): readonly unknown[] {
    try {
      sampler.destroy();
      this.#assertCurrentOperationCommit('ProductInputRouter sampler destroy');
      if (this.#sampler?.source === sampler.source) this.#sampler = null;
      this.#removeCleanupSampler(sampler);
      return [];
    } catch (error) {
      return [error];
    }
  }

  #cleanupPendingSamplers(): readonly unknown[] {
    const candidates: SamplerAdapter[] = [];
    if (this.#sampler !== null) candidates.push(this.#sampler);
    for (const candidate of this.#cleanupSamplers) {
      if (!candidates.some((owned) => owned.source === candidate.source)) candidates.push(candidate);
    }
    const failures: unknown[] = [];
    for (const candidate of candidates) {
      failures.push(...this.#cleanupSampler(candidate));
      if (this.#reentryError !== null) break;
    }
    return failures;
  }

  #shouldSuspendSampler(mode: ProductInputRouterMode = this.#mode): boolean {
    return this.#lifecycleSuspended || mode !== PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY;
  }

  #setSamplerSuspended(sampler: SamplerAdapter, value: boolean): boolean {
    if (value === this.#samplerSuspended) return false;
    if (value) sampler.suspend();
    else sampler.resume();
    this.#assertCurrentOperationCommit('ProductInputRouter sampler suspend state');
    this.#samplerSuspended = value;
    return true;
  }

  #hit(point: PresentationInputPoint): ProductUiIntent | null {
    let value: unknown;
    try {
      value = this.#hitTestUi(point, this.#viewport);
    } catch (error) {
      observeNativePromise(error);
      throw error;
    }
    rejectThenable(value, 'ProductInputRouter.hitTestUi()');
    this.#assertCurrentOperationCommit('ProductInputRouter hitTestUi');
    if (value === null || value === undefined) return null;
    const intent = createProductUiIntent(value);
    this.#assertCurrentOperationCommit('ProductInputRouter UI intent normalization');
    return intent;
  }

  #reportIntentRejection(error: unknown, intent: ProductUiIntent): void {
    observeNativePromise(error);
    try {
      const result = this.#onIntentRejected(error, intent);
      rejectThenable(result, 'ProductInputRouter.onIntentRejected()');
    } catch (observerError) {
      observeNativePromise(observerError);
      // Observational reporting never owns input lifecycle.
    }
    if (this.#operation !== null) {
      this.#assertCurrentOperationCommit('ProductInputRouter onIntentRejected');
    }
  }

  #dispatchIntent(intent: ProductUiIntent): void {
    let outcome: unknown;
    try {
      outcome = this.#onIntent(intent);
    } catch (error) {
      this.#assertCurrentOperationCommit('ProductInputRouter onIntent');
      this.#reportIntentRejection(error, intent);
      return;
    }
    this.#assertCurrentOperationCommit('ProductInputRouter onIntent');
    if (observeNativePromise(
      outcome,
      (error) => this.#reportIntentRejection(error, intent),
    )) return;
    try {
      rejectThenable(outcome, 'ProductInputRouter.onIntent()');
    } catch (error) {
      this.#reportIntentRejection(error, intent);
    }
  }

  setMode(modeValue: unknown): boolean {
    const sampler = this.#enter('setMode');
    try {
      if (typeof modeValue !== 'string' || !MODES.has(modeValue)) {
        throw new RangeError('未知 ProductInputRouter mode。');
      }
      const mode = modeValue as ProductInputRouterMode;
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
      this.#assertCurrentOperationCommit(`ProductInputRouter ${operation} point normalization`);
      if (this.#mode === PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY) {
        const handled = sampler[operation](point);
        this.#assertCurrentOperationCommit(`ProductInputRouter sampler ${operation}`);
        return handled;
      }
      if (operation === 'pointerStart') {
        if (this.#uiPointer !== null) return false;
        const intent = this.#hit(point);
        if (intent === null) return false;
        const intentKey = createProductUiIntentKey(intent);
        this.#assertCurrentOperationCommit('ProductInputRouter UI pointer identity');
        this.#uiPointer = Object.freeze({
          pointerId: point.pointerId,
          intentKey,
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
      if (intent === null) return false;
      const intentKey = createProductUiIntentKey(intent);
      this.#assertCurrentOperationCommit('ProductInputRouter released UI pointer identity');
      if (intentKey !== pointer.intentKey) return false;
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
      this.#assertCurrentOperationCommit('ProductInputRouter viewport normalization');
      const changed = sampler.resize(viewport);
      this.#assertCurrentOperationCommit('ProductInputRouter sampler resize');
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
      const input = sampler.sample(tick, options);
      this.#assertCurrentOperationCommit('ProductInputRouter sampler sample');
      return input;
    } finally {
      this.#leave();
    }
  }

  replaceSampler(samplerValue: unknown): boolean {
    const previous = this.#enter('replaceSampler');
    try {
      const replacement = normalizeOwnedSampler(samplerValue);
      this.#assertCurrentOperationCommit('ProductInputRouter replacement normalization');
      if (replacement.source === previous.source) return false;
      const shouldSuspend = this.#shouldSuspendSampler();
      try {
        replacement.resize(this.#viewport);
        this.#assertCurrentOperationCommit('ProductInputRouter replacement resize');
        if (shouldSuspend) replacement.suspend();
        this.#assertCurrentOperationCommit('ProductInputRouter replacement suspend');
      } catch (error) {
        this.#retainCleanupSampler(replacement);
        if (this.#reentryError !== null) throw error;
        const cleanupFailures = this.#cleanupSampler(replacement);
        if (cleanupFailures.length > 0) {
          this.#destroyed = true;
          this.#lifecycleSuspended = true;
          this.#uiPointer = null;
          throw new AggregateError(
            [error, ...cleanupFailures],
            'Product sampler 准备失败且清理失败。',
          );
        }
        throw error;
      }
      try {
        previous.destroy();
        this.#assertCurrentOperationCommit('ProductInputRouter previous sampler destroy');
      } catch (error) {
        this.#destroyed = true;
        this.#lifecycleSuspended = true;
        this.#uiPointer = null;
        this.#retainCleanupSampler(replacement);
        if (this.#reentryError !== null) throw error;
        const cleanupFailures = this.#cleanupSampler(replacement);
        if (cleanupFailures.length > 0) {
          throw new AggregateError(
            [error, ...cleanupFailures],
            '旧 Product sampler 清理失败且清理失败。',
          );
        }
        throw error;
      }
      this.#removeCleanupSampler(replacement);
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
          : (() => {
            const snapshot = sampler.getDebugSnapshot!();
            this.#assertCurrentOperationCommit('ProductInputRouter sampler debug snapshot');
            return cloneFrozenData(snapshot, 'ProductInputRouter sampler debug snapshot');
          })(),
      });
    } finally {
      this.#leave();
    }
  }

  destroy(): void {
    if (this.#operation !== null) {
      this.#reentrySequence += 1;
      this.#reentryError ??= new Error(
        `ProductInputRouter.destroy() 不可在 ${this.#operation}() 中重入。`,
      );
      throw this.#reentryError;
    }
    if (this.#destroyed && this.#sampler === null && this.#cleanupSamplers.length === 0) return;
    this.#operation = 'destroy';
    this.#reentryError = null;
    this.#destroyed = true;
    this.#lifecycleSuspended = true;
    this.#uiPointer = null;
    let cleanupFailures: readonly unknown[] = [];
    try {
      cleanupFailures = this.#cleanupPendingSamplers();
    } finally {
      this.#operation = null;
    }
    const reentryFailure = this.#reentryError;
    this.#reentryError = null;
    const failures = reentryFailure === null
      ? cleanupFailures
      : [reentryFailure, ...cleanupFailures.filter((failure) => failure !== reentryFailure)];
    if (failures.length === 1) throw failures[0];
    if (failures.length > 1) {
      throw new AggregateError(
        failures,
        'ProductInputRouter 资源清理未完整完成。',
      );
    }
  }
}

export const PRODUCT_INPUT_ROUTER_OPERATION_POLICY = Object.freeze({
  operationGuardPrecedesLifecycleAndInputValidation: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  samplerCallbacksCheckedBeforeInputStateCommit: true as const,
  uiHitAndIntentCallbacksCheckedBeforeRouterCommit: true as const,
  cleanupReentryRetainsCurrentAndLaterSamplerOwners: true as const,
  gameplaySampleDoesNotChangeActionVocabulary: true as const,
  validationStatus: 'not-run' as const,
});
