import {
  combineCleanupFailure,
  normalizeThrownError,
} from '@number-strategy-jump/arena-contracts';
import {
  rejectThenable,
  snapshotFunction,
  snapshotMethod,
  type UnknownMethod,
} from './capability-utils.js';
import {
  cloneKnownRecord,
  clonePoint,
  cloneViewport,
  type PresentationInputViewport,
} from './input-validation.js';

export const ARENA_INPUT_ROUTER_MODE = Object.freeze({
  INACTIVE: 'inactive',
  GAMEPLAY: 'gameplay',
  RESULT: 'result',
} as const);

export type ArenaInputRouterMode = typeof ARENA_INPUT_ROUTER_MODE[
  keyof typeof ARENA_INPUT_ROUTER_MODE
];

interface SamplerPort {
  readonly identity: object;
  readonly pointerStart: UnknownMethod;
  readonly pointerMove: UnknownMethod;
  readonly pointerEnd: UnknownMethod;
  readonly pointerCancel: UnknownMethod;
  readonly resize: UnknownMethod;
  readonly suspend: UnknownMethod;
  readonly resume: UnknownMethod;
  readonly sample: UnknownMethod;
  readonly destroy: UnknownMethod;
  readonly getDebugSnapshot: UnknownMethod | null;
}

export interface ArenaInputRouterDebugSnapshot {
  readonly mode: ArenaInputRouterMode;
  readonly viewport: PresentationInputViewport;
  readonly lifecycleSuspended: boolean;
  readonly samplerSuspended: boolean;
  readonly resultPointerId: number | null;
  readonly sampling: boolean;
  readonly failed: boolean;
  readonly sampler: unknown;
}

const OPTION_KEYS = new Set([
  'sampler',
  'viewport',
  'hitTestRematch',
  'onRematchRequested',
]);
const ROUTER_MODES = new Set<ArenaInputRouterMode>(Object.values(ARENA_INPUT_ROUTER_MODE));

function validateSampler(value: unknown): SamplerPort {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('ArenaInputRouter.sampler 必须是对象。');
  }
  return Object.freeze({
    identity: value,
    pointerStart: snapshotMethod(value, 'ArenaInputRouter.sampler', 'pointerStart')!,
    pointerMove: snapshotMethod(value, 'ArenaInputRouter.sampler', 'pointerMove')!,
    pointerEnd: snapshotMethod(value, 'ArenaInputRouter.sampler', 'pointerEnd')!,
    pointerCancel: snapshotMethod(value, 'ArenaInputRouter.sampler', 'pointerCancel')!,
    resize: snapshotMethod(value, 'ArenaInputRouter.sampler', 'resize')!,
    suspend: snapshotMethod(value, 'ArenaInputRouter.sampler', 'suspend')!,
    resume: snapshotMethod(value, 'ArenaInputRouter.sampler', 'resume')!,
    sample: snapshotMethod(value, 'ArenaInputRouter.sampler', 'sample')!,
    destroy: snapshotMethod(value, 'ArenaInputRouter.sampler', 'destroy')!,
    getDebugSnapshot: snapshotMethod(
      value,
      'ArenaInputRouter.sampler',
      'getDebugSnapshot',
      false,
    ),
  });
}

function callSync(method: UnknownMethod, name: string, ...args: unknown[]): unknown {
  const result = method(...args);
  rejectThenable(result, name);
  return result;
}

export class ArenaInputRouter {
  #sampler: SamplerPort | null;
  readonly #hitTestRematch: UnknownMethod;
  readonly #onRematchRequested: UnknownMethod;
  #mode: ArenaInputRouterMode;
  #viewport: PresentationInputViewport;
  #lifecycleSuspended: boolean;
  #samplerSuspended: boolean;
  #resultPointerId: number | null;
  #sampling: boolean;
  #failure: Error | null;
  #destroyed: boolean;

  constructor(options: unknown) {
    const source = cloneKnownRecord(options, OPTION_KEYS, 'ArenaInputRouter options');
    const sampler = validateSampler(source.sampler);
    this.#sampler = sampler;
    this.#hitTestRematch = snapshotFunction(
      source.hitTestRematch,
      'ArenaInputRouter.hitTestRematch',
    );
    this.#onRematchRequested = snapshotFunction(
      source.onRematchRequested,
      'ArenaInputRouter.onRematchRequested',
    );
    this.#mode = ARENA_INPUT_ROUTER_MODE.INACTIVE;
    this.#viewport = cloneViewport(source.viewport, 'ArenaInputRouter.viewport');
    this.#lifecycleSuspended = false;
    this.#samplerSuspended = false;
    this.#resultPointerId = null;
    this.#sampling = false;
    this.#failure = null;
    this.#destroyed = false;
    try {
      callSync(sampler.resize, 'ArenaInputRouter.sampler.resize', this.#viewport);
      callSync(sampler.suspend, 'ArenaInputRouter.sampler.suspend');
      this.#samplerSuspended = true;
    } catch (error) {
      const original = normalizeThrownError(error, 'ArenaInputRouter 构造失败');
      const cleanupErrors: Error[] = [];
      try {
        callSync(sampler.destroy, 'ArenaInputRouter.sampler.destroy');
      } catch (cleanupError) {
        cleanupErrors.push(normalizeThrownError(
          cleanupError,
          'ArenaInputRouter 构造回滚失败',
        ));
      }
      throw combineCleanupFailure(original, cleanupErrors, 'ArenaInputRouter 构造与回滚均失败。');
    }
    Object.freeze(this);
  }

  #assertUsable(): SamplerPort {
    if (this.#destroyed || this.#sampler === null) throw new Error('ArenaInputRouter 已销毁。');
    if (this.#failure) {
      const error = new Error('ArenaInputRouter 已因生命周期失败关闭。');
      error.cause = this.#failure;
      throw error;
    }
    return this.#sampler;
  }

  #shouldSuspendSampler(): boolean {
    return this.#lifecycleSuspended || this.#mode !== ARENA_INPUT_ROUTER_MODE.GAMEPLAY;
  }

  #setSamplerSuspended(shouldSuspend: boolean): boolean {
    if (shouldSuspend === this.#samplerSuspended) return false;
    if (this.#sampling) throw new Error('ArenaInputRouter.sample() 期间不能切换暂停。');
    const sampler = this.#assertUsable();
    callSync(
      shouldSuspend ? sampler.suspend : sampler.resume,
      shouldSuspend ? 'ArenaInputRouter.sampler.suspend' : 'ArenaInputRouter.sampler.resume',
    );
    this.#samplerSuspended = shouldSuspend;
    return true;
  }

  setMode(mode: unknown): boolean {
    this.#assertUsable();
    if (!ROUTER_MODES.has(mode as ArenaInputRouterMode)) {
      throw new RangeError(`未知 ArenaInputRouter mode ${String(mode)}。`);
    }
    const nextMode = mode as ArenaInputRouterMode;
    if (this.#mode === nextMode) return false;
    if (this.#sampling) throw new Error('ArenaInputRouter.sample() 期间不能切换 mode。');
    this.#setSamplerSuspended(
      this.#lifecycleSuspended || nextMode !== ARENA_INPUT_ROUTER_MODE.GAMEPLAY,
    );
    this.#mode = nextMode;
    this.#resultPointerId = null;
    return true;
  }

  #isInactive(): boolean {
    return this.#lifecycleSuspended || this.#mode === ARENA_INPUT_ROUTER_MODE.INACTIVE;
  }

  pointerStart(point: unknown): unknown {
    const sampler = this.#assertUsable();
    if (this.#isInactive()) return false;
    if (this.#mode === ARENA_INPUT_ROUTER_MODE.GAMEPLAY) {
      return callSync(sampler.pointerStart, 'ArenaInputRouter.sampler.pointerStart', point);
    }
    const value = clonePoint(point, 'ArenaInputRouter.pointerStart');
    if (this.#resultPointerId !== null) return false;
    const hit = callSync(
      this.#hitTestRematch,
      'ArenaInputRouter.hitTestRematch',
      value,
      this.#viewport,
    );
    if (typeof hit !== 'boolean') {
      throw new TypeError('ArenaInputRouter.hitTestRematch 必须返回布尔值。');
    }
    if (!hit) return false;
    this.#resultPointerId = value.pointerId;
    return true;
  }

  pointerMove(point: unknown): unknown {
    const sampler = this.#assertUsable();
    if (this.#isInactive()) return false;
    if (this.#mode === ARENA_INPUT_ROUTER_MODE.GAMEPLAY) {
      return callSync(sampler.pointerMove, 'ArenaInputRouter.sampler.pointerMove', point);
    }
    return clonePoint(point, 'ArenaInputRouter.pointerMove').pointerId === this.#resultPointerId;
  }

  pointerEnd(point: unknown): unknown {
    const sampler = this.#assertUsable();
    if (this.#isInactive()) return false;
    if (this.#mode === ARENA_INPUT_ROUTER_MODE.GAMEPLAY) {
      return callSync(sampler.pointerEnd, 'ArenaInputRouter.sampler.pointerEnd', point);
    }
    const value = clonePoint(point, 'ArenaInputRouter.pointerEnd');
    if (value.pointerId !== this.#resultPointerId) return false;
    this.#resultPointerId = null;
    const hit = callSync(
      this.#hitTestRematch,
      'ArenaInputRouter.hitTestRematch',
      value,
      this.#viewport,
    );
    if (typeof hit !== 'boolean') {
      throw new TypeError('ArenaInputRouter.hitTestRematch 必须返回布尔值。');
    }
    if (!hit) return false;
    callSync(this.#onRematchRequested, 'ArenaInputRouter.onRematchRequested');
    return true;
  }

  pointerCancel(point: unknown): unknown {
    const sampler = this.#assertUsable();
    if (this.#isInactive()) return false;
    if (this.#mode === ARENA_INPUT_ROUTER_MODE.GAMEPLAY) {
      return callSync(sampler.pointerCancel, 'ArenaInputRouter.sampler.pointerCancel', point);
    }
    const value = clonePoint(point, 'ArenaInputRouter.pointerCancel');
    if (value.pointerId !== this.#resultPointerId) return false;
    this.#resultPointerId = null;
    return true;
  }

  resize(viewport: unknown): unknown {
    const sampler = this.#assertUsable();
    const value = cloneViewport(viewport, 'ArenaInputRouter.viewport');
    const result = callSync(sampler.resize, 'ArenaInputRouter.sampler.resize', value);
    this.#viewport = value;
    this.#resultPointerId = null;
    return result;
  }

  suspend(): boolean {
    this.#assertUsable();
    if (this.#lifecycleSuspended) return false;
    this.#setSamplerSuspended(true);
    this.#lifecycleSuspended = true;
    this.#resultPointerId = null;
    return true;
  }

  resume(): boolean {
    this.#assertUsable();
    if (!this.#lifecycleSuspended) return false;
    this.#setSamplerSuspended(this.#mode !== ARENA_INPUT_ROUTER_MODE.GAMEPLAY);
    this.#lifecycleSuspended = false;
    this.#resultPointerId = null;
    return true;
  }

  sample(tick: unknown, options?: unknown): unknown {
    const sampler = this.#assertUsable();
    if (
      this.#lifecycleSuspended
      || this.#mode !== ARENA_INPUT_ROUTER_MODE.GAMEPLAY
      || this.#samplerSuspended
    ) throw new Error('ArenaInputRouter 仅能在活跃 gameplay 模式采样。');
    if (this.#sampling) throw new Error('ArenaInputRouter.sample() 不可重入。');
    this.#sampling = true;
    try {
      return callSync(sampler.sample, 'ArenaInputRouter.sampler.sample', tick, options);
    } finally {
      this.#sampling = false;
    }
  }

  replaceSampler(value: unknown): boolean {
    const current = this.#assertUsable();
    if (this.#sampling) throw new Error('ArenaInputRouter.sample() 期间不能替换 sampler。');
    const replacement = validateSampler(value);
    if (replacement.identity === current.identity) return false;
    const shouldSuspend = this.#shouldSuspendSampler();
    try {
      callSync(replacement.resize, 'ArenaInputRouter replacement.resize', this.#viewport);
      if (shouldSuspend) {
        callSync(replacement.suspend, 'ArenaInputRouter replacement.suspend');
      }
    } catch (error) {
      try { callSync(replacement.destroy, 'ArenaInputRouter replacement.destroy'); } catch { /* preserve cause */ }
      throw error;
    }
    try {
      callSync(current.destroy, 'ArenaInputRouter previous.destroy');
    } catch (error) {
      try { callSync(replacement.destroy, 'ArenaInputRouter replacement.destroy'); } catch { /* preserve cause */ }
      this.#failure = normalizeThrownError(error, 'ArenaInputRouter 旧 sampler 清理失败');
      throw error;
    }
    this.#sampler = replacement;
    this.#samplerSuspended = shouldSuspend;
    this.#resultPointerId = null;
    return true;
  }

  getDebugSnapshot(): ArenaInputRouterDebugSnapshot {
    const sampler = this.#assertUsable();
    const samplerSnapshot = sampler.getDebugSnapshot
      ? callSync(sampler.getDebugSnapshot, 'ArenaInputRouter.sampler.getDebugSnapshot')
      : null;
    return Object.freeze({
      mode: this.#mode,
      viewport: this.#viewport,
      lifecycleSuspended: this.#lifecycleSuspended,
      samplerSuspended: this.#samplerSuspended,
      resultPointerId: this.#resultPointerId,
      sampling: this.#sampling,
      failed: this.#failure !== null,
      sampler: samplerSnapshot,
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    if (this.#sampling) throw new Error('sample() 期间不能销毁 ArenaInputRouter。');
    const sampler = this.#sampler;
    if (sampler === null) return;
    this.#lifecycleSuspended = true;
    this.#resultPointerId = null;
    callSync(sampler.destroy, 'ArenaInputRouter.sampler.destroy');
    this.#sampler = null;
    this.#destroyed = true;
  }
}
