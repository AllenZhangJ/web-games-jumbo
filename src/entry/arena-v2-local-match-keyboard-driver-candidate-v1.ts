import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertPlainRecord,
  assertSynchronousReturn,
  normalizeInputFrame,
  normalizeThrownError,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_SIMPLE_THREE_CONCEPT_KEYBOARD_BINDING_V1,
  FixedTickAccumulator,
  PresentationFrameLoop,
  type PresentationFrame,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import { ArenaV2InformationLocalPlayableSurfaceBindingCandidateV1 } from './arena-v2-information-local-playable-surface-binding-candidate-v1.js';

type DriverState =
  | 'idle'
  | 'running'
  | 'paused'
  | 'settlement-pending'
  | 'information'
  | 'failed'
  | 'destroyed';
type SyncMethod = (...arguments_: readonly unknown[]) => unknown;
type Cleanup = () => void;
type VisibilityState = 'hidden' | 'visible';

interface EventTargetPort {
  readonly addEventListener: SyncMethod;
  readonly removeEventListener: SyncMethod;
}

interface VisibilityPlatformPort {
  readonly isHidden: SyncMethod;
  readonly onHide: SyncMethod;
  readonly onShow: SyncMethod;
}

interface MatchInputContext {
  readonly generation: number;
  readonly state: 'running' | 'paused' | 'settlement-pending';
  readonly tick: number;
  readonly localParticipantId: string;
}

export class ArenaV2KeyboardVisibilityRegistrationCleanupFailureCandidateV1
  extends AggregateError {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  #cleanup: Cleanup | null;

  constructor(originalError: unknown, cleanupError: unknown, cleanup: Cleanup) {
    super(
      [originalError, cleanupError],
      'Arena V2 keyboard可见性监听注册失败且回滚不完整。',
    );
    this.name =
      'ArenaV2KeyboardVisibilityRegistrationCleanupFailureCandidateV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#cleanup = cleanup;
  }

  get cleanupComplete(): boolean {
    return this.#cleanup === null;
  }

  retryCleanup(): void {
    if (this.#cleanup === null) return;
    assertSynchronousReturn(
      this.#cleanup(),
      'Arena V2 keyboard visibility registration debt cleanup',
    );
    this.#cleanup = null;
  }
}

const DRIVER_OPTION_KEYS = new Set([
  'binding',
  'eventTarget',
  'requestFrame',
  'cancelFrame',
  'now',
  'onStep',
  'onStateChange',
  'onError',
  'fixedDeltaSeconds',
  'maximumCatchUpSteps',
  'ownsBinding',
  'visibilityPlatform',
]);
const DRIVER_REQUIRED_OPTION_KEYS = Object.freeze([
  'binding',
  'eventTarget',
  'requestFrame',
  'cancelFrame',
  'now',
] as const);

export const ARENA_V2_SIMPLE_KEYBOARD_CONTROL_CONTRACT_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  concepts: ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.concepts,
  contentContractHash: ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.contentHash,
  moveLeftCodes: ARENA_V2_SIMPLE_THREE_CONCEPT_KEYBOARD_BINDING_V1.moveLeftCodes,
  moveRightCodes: ARENA_V2_SIMPLE_THREE_CONCEPT_KEYBOARD_BINDING_V1.moveRightCodes,
  moveForwardCodes: ARENA_V2_SIMPLE_THREE_CONCEPT_KEYBOARD_BINDING_V1.moveForwardCodes,
  moveBackwardCodes: ARENA_V2_SIMPLE_THREE_CONCEPT_KEYBOARD_BINDING_V1.moveBackwardCodes,
  jumpCodes: ARENA_V2_SIMPLE_THREE_CONCEPT_KEYBOARD_BINDING_V1.jumpCodes,
  primaryAttackCodes:
    ARENA_V2_SIMPLE_THREE_CONCEPT_KEYBOARD_BINDING_V1.primaryAttackCodes,
  visibleText: ARENA_V2_SIMPLE_THREE_CONCEPT_KEYBOARD_BINDING_V1.visibleText,
  accessibilityText:
    ARENA_V2_SIMPLE_THREE_CONCEPT_KEYBOARD_BINDING_V1.accessibilityText,
  crouchEnabled: false as const,
  blockEnabled: false as const,
  slamEnabled: false as const,
});

const LEFT_CODES = new Set(ARENA_V2_SIMPLE_KEYBOARD_CONTROL_CONTRACT_CANDIDATE_V1.moveLeftCodes);
const RIGHT_CODES = new Set(ARENA_V2_SIMPLE_KEYBOARD_CONTROL_CONTRACT_CANDIDATE_V1.moveRightCodes);
const FORWARD_CODES = new Set(
  ARENA_V2_SIMPLE_KEYBOARD_CONTROL_CONTRACT_CANDIDATE_V1.moveForwardCodes,
);
const BACKWARD_CODES = new Set(
  ARENA_V2_SIMPLE_KEYBOARD_CONTROL_CONTRACT_CANDIDATE_V1.moveBackwardCodes,
);
const JUMP_CODES = new Set(ARENA_V2_SIMPLE_KEYBOARD_CONTROL_CONTRACT_CANDIDATE_V1.jumpCodes);
const PRIMARY_CODES = new Set(
  ARENA_V2_SIMPLE_KEYBOARD_CONTROL_CONTRACT_CANDIDATE_V1.primaryAttackCodes,
);
const KNOWN_CODES: ReadonlySet<string> = new Set<string>([
  ...LEFT_CODES,
  ...RIGHT_CODES,
  ...FORWARD_CODES,
  ...BACKWARD_CODES,
  ...JUMP_CODES,
  ...PRIMARY_CODES,
]);
function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function dataMethod(target: unknown, key: string, name: string): SyncMethod {
  if ((typeof target !== 'object' || target === null) && typeof target !== 'function') {
    throw new TypeError(`${name}.${key}不存在。`);
  }
  const visited = new Set<object>();
  let cursor: object | null = target as object;
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) throw new TypeError(`${name}原型链无效。`);
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, key);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${key}必须是数据方法。`);
      }
      const method = descriptor.value as SyncMethod;
      return (...arguments_: readonly unknown[]) => Reflect.apply(method, target, arguments_);
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  throw new TypeError(`${name}.${key}不存在。`);
}

function syncFunction(value: unknown, name: string): SyncMethod {
  if (typeof value !== 'function') throw new TypeError(`${name}必须是函数。`);
  return value as SyncMethod;
}

function visibilityPlatformPort(value: unknown): VisibilityPlatformPort {
  return Object.freeze({
    isHidden: dataMethod(value, 'isHidden', 'Arena V2 keyboard visibility platform'),
    onHide: dataMethod(value, 'onHide', 'Arena V2 keyboard visibility platform'),
    onShow: dataMethod(value, 'onShow', 'Arena V2 keyboard visibility platform'),
  });
}

function call(method: SyncMethod, arguments_: readonly unknown[], name: string): unknown {
  const result = method(...arguments_);
  assertSynchronousReturn(result, name);
  return result;
}

function eventCode(value: unknown): string | null {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return null;
  try {
    const code = Reflect.get(value as object, 'code');
    return typeof code === 'string' ? code : null;
  } catch {
    return null;
  }
}

function eventRepeat(value: unknown): boolean {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return false;
  try { return Reflect.get(value as object, 'repeat') === true; } catch { return false; }
}

function preventDefault(value: unknown): void {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return;
  try {
    const candidate = Reflect.get(value as object, 'preventDefault');
    if (typeof candidate === 'function') Reflect.apply(candidate, value, []);
  } catch { /* 输入已经接受，平台默认行为失败不改变权威输入。 */ }
}

function hasAny(source: ReadonlySet<string>, values: ReadonlySet<string>): boolean {
  for (const value of values) if (source.has(value)) return true;
  return false;
}

/**
 * V2 only: all twenty weapons and all maps share exactly direction, jump and
 * primary attack. This adapter deliberately cannot emit legacy slam/block
 * input and does not infer any action from presentation state.
 */
export class ArenaV2SimpleKeyboardInputCandidateV1 {
  readonly #participantId: string;
  readonly #target: EventTargetPort;
  readonly #down = new Set<string>();
  readonly #pressed = new Set<string>();
  #cleanups: Cleanup[] = [];
  #lastTick = -1;
  #suspended = false;
  #destroyed = false;

  constructor(participantId: unknown, eventTarget: unknown) {
    if (typeof participantId !== 'string' || participantId.length === 0) {
      throw new TypeError('Arena V2 keyboard participantId必须是非空字符串。');
    }
    this.#participantId = participantId;
    this.#target = Object.freeze({
      addEventListener: dataMethod(eventTarget, 'addEventListener', 'Arena V2 keyboard target'),
      removeEventListener: dataMethod(eventTarget, 'removeEventListener', 'Arena V2 keyboard target'),
    });
    Object.freeze(this);
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('Arena V2 keyboard已销毁。');
  }

  #listen(type: string, listener: SyncMethod, cleanups: Cleanup[]): void {
    let active = true;
    cleanups.push(() => {
      if (!active) return;
      call(this.#target.removeEventListener, [type, listener], `Arena V2 keyboard unbind ${type}`);
      active = false;
    });
    call(this.#target.addEventListener, [type, listener], `Arena V2 keyboard bind ${type}`);
  }

  readonly #onKeyDown = (event: unknown): void => {
    if (this.#destroyed || this.#suspended || eventRepeat(event)) return;
    const code = eventCode(event);
    if (code === null || !KNOWN_CODES.has(code) || this.#down.has(code)) return;
    this.#down.add(code);
    this.#pressed.add(code);
    preventDefault(event);
  };

  readonly #onKeyUp = (event: unknown): void => {
    if (this.#destroyed) return;
    const code = eventCode(event);
    if (code === null || !KNOWN_CODES.has(code)) return;
    this.#down.delete(code);
    preventDefault(event);
  };

  readonly #onBlur = (): void => {
    this.#down.clear();
    this.#pressed.clear();
  };

  bind(): boolean {
    this.#assertUsable();
    if (this.#cleanups.length > 0) return false;
    const cleanups: Cleanup[] = [];
    try {
      this.#listen('keydown', this.#onKeyDown, cleanups);
      this.#listen('keyup', this.#onKeyUp, cleanups);
      this.#listen('blur', this.#onBlur, cleanups);
      this.#cleanups = cleanups;
      return true;
    } catch (error) {
      const cleanupErrors: Error[] = [];
      const retained: Cleanup[] = [];
      for (let index = cleanups.length - 1; index >= 0; index -= 1) {
        try { cleanups[index]!(); } catch (cleanupError) {
          retained.unshift(...cleanups.slice(0, index + 1));
          cleanupErrors.push(normalizeThrownError(cleanupError, 'Arena V2 keyboard回滚失败'));
          break;
        }
      }
      this.#cleanups = retained;
      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          [normalizeThrownError(error, 'Arena V2 keyboard绑定失败'), ...cleanupErrors],
          'Arena V2 keyboard绑定失败且回滚不完整。',
        );
      }
      throw error;
    }
  }

  sample(tickValue: unknown): ArenaInputFrame {
    this.#assertUsable();
    const tick = assertIntegerAtLeast(tickValue, 0, 'Arena V2 keyboard tick');
    if (this.#suspended) throw new Error('Arena V2 keyboard暂停时不能采样。');
    if (this.#lastTick >= 0 && tick !== this.#lastTick + 1) {
      throw new RangeError(
        `Arena V2 keyboard tick不连续：上次${this.#lastTick}，本次${tick}。`,
      );
    }
    const horizontal = Number(hasAny(this.#down, RIGHT_CODES))
      - Number(hasAny(this.#down, LEFT_CODES));
    const vertical = Number(hasAny(this.#down, FORWARD_CODES))
      - Number(hasAny(this.#down, BACKWARD_CODES));
    const magnitude = Math.hypot(horizontal, vertical);
    const scale = magnitude > 1 ? 1 / magnitude : 1;
    const input = normalizeInputFrame({
      tick,
      participantId: this.#participantId,
      moveX: horizontal * scale,
      moveZ: vertical * scale,
      primaryPressed: hasAny(this.#pressed, PRIMARY_CODES),
      primaryHeld: hasAny(this.#down, PRIMARY_CODES),
      jumpPressed: hasAny(this.#pressed, JUMP_CODES),
      jumpHeld: hasAny(this.#down, JUMP_CODES),
      slamPressed: false,
    }, {
      expectedTick: tick,
      participantIds: [this.#participantId],
    });
    this.#pressed.clear();
    this.#lastTick = tick;
    return input;
  }

  suspend(): boolean {
    this.#assertUsable();
    if (this.#suspended) return false;
    this.#suspended = true;
    this.#down.clear();
    this.#pressed.clear();
    return true;
  }

  resume(): boolean {
    this.#assertUsable();
    if (!this.#suspended) return false;
    this.#suspended = false;
    this.#down.clear();
    this.#pressed.clear();
    return true;
  }

  destroy(): void {
    if (this.#destroyed) return;
    const errors: Error[] = [];
    const retained: Cleanup[] = [];
    const cleanups = [...this.#cleanups];
    for (let index = cleanups.length - 1; index >= 0; index -= 1) {
      try { cleanups[index]!(); } catch (error) {
        retained.unshift(...cleanups.slice(0, index + 1));
        errors.push(normalizeThrownError(error, 'Arena V2 keyboard清理失败'));
        break;
      }
    }
    this.#cleanups = retained;
    this.#down.clear();
    this.#pressed.clear();
    this.#suspended = true;
    this.#destroyed = errors.length === 0;
    if (errors.length > 0) throw new AggregateError(errors, 'Arena V2 keyboard清理不完整。');
  }
}

/**
 * Platform-side driver. Wall-clock frame cadence only decides how many fixed
 * ticks to request; authoritative rules still receive integer-tick InputFrame
 * values and never observe the platform clock.
 */
export class ArenaV2LocalMatchKeyboardDriverCandidateV1 {
  readonly #binding: ArenaV2InformationLocalPlayableSurfaceBindingCandidateV1;
  readonly #eventTarget: unknown;
  readonly #visibilityPlatform: VisibilityPlatformPort | null;
  readonly #loop: PresentationFrameLoop;
  readonly #accumulator: FixedTickAccumulator;
  readonly #onStep: SyncMethod;
  readonly #onStateChange: SyncMethod;
  readonly #onError: SyncMethod;
  readonly #ownsBinding: boolean;
  #visibilityCleanups: Cleanup[] = [];
  #input: ArenaV2SimpleKeyboardInputCandidateV1 | null = null;
  #inputGeneration: number | null = null;
  #inputParticipantId: string | null = null;
  #state: DriverState = 'idle';
  #transitioning = false;
  #transitionOperation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #transitionFailure: unknown = null;
  #visibilityBinding = false;
  #visibilityPaused = false;
  #platformHidden = false;
  #loopQuiesced = false;
  #loopDestroyed = false;
  #bindingDisposed = false;

  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'Arena V2 local match keyboard driver options');
    assertKnownKeys(source, DRIVER_OPTION_KEYS, 'Arena V2 local match keyboard driver options');
    for (const key of DRIVER_REQUIRED_OPTION_KEYS) {
      if (!Object.hasOwn(source, key)) {
        throw new TypeError(`Arena V2 local match keyboard driver缺少${key}。`);
      }
    }
    for (const key of Object.keys(source)) {
      dataField(source, key, 'Arena V2 local match keyboard driver options');
    }
    if (!(source.binding instanceof ArenaV2InformationLocalPlayableSurfaceBindingCandidateV1)) {
      throw new TypeError('Arena V2 local match keyboard driver需要V2本地Surface Binding。');
    }
    const ownsBinding = source.ownsBinding ?? true;
    if (typeof ownsBinding !== 'boolean') {
      throw new TypeError('Arena V2 local match keyboard driver ownsBinding必须是boolean。');
    }
    const fixedDeltaSeconds = source.fixedDeltaSeconds ?? 1 / 60;
    if (typeof fixedDeltaSeconds !== 'number' || !Number.isFinite(fixedDeltaSeconds)
      || fixedDeltaSeconds <= 0) {
      throw new RangeError('Arena V2 local match keyboard driver fixedDeltaSeconds无效。');
    }
    const maximumCatchUpSteps = assertIntegerAtLeast(
      source.maximumCatchUpSteps ?? 5,
      1,
      'Arena V2 local match keyboard driver maximumCatchUpSteps',
    );
    if (maximumCatchUpSteps > 10) {
      throw new RangeError('Arena V2 local match keyboard driver单帧追赶不得超过10 tick。');
    }
    this.#binding = source.binding;
    this.#eventTarget = source.eventTarget;
    this.#visibilityPlatform = source.visibilityPlatform === undefined
      ? null
      : visibilityPlatformPort(source.visibilityPlatform);
    this.#onStep = source.onStep === undefined
      ? () => undefined
      : syncFunction(source.onStep, 'Arena V2 local match keyboard driver onStep');
    this.#onStateChange = source.onStateChange === undefined
      ? () => undefined
      : syncFunction(
        source.onStateChange,
        'Arena V2 local match keyboard driver onStateChange',
      );
    this.#onError = source.onError === undefined
      ? () => undefined
      : syncFunction(source.onError, 'Arena V2 local match keyboard driver onError');
    this.#ownsBinding = ownsBinding;
    this.#accumulator = new FixedTickAccumulator({ fixedDeltaSeconds, maximumSteps: maximumCatchUpSteps });
    this.#loop = new PresentationFrameLoop({
      requestFrame: syncFunction(
        source.requestFrame,
        'Arena V2 local match keyboard driver requestFrame',
      ),
      cancelFrame: syncFunction(
        source.cancelFrame,
        'Arena V2 local match keyboard driver cancelFrame',
      ),
      now: syncFunction(source.now, 'Arena V2 local match keyboard driver now'),
      onError: (error: unknown) => this.#fail(error),
      maxDeltaSeconds: fixedDeltaSeconds * maximumCatchUpSteps,
    });
    if (this.#ownsBinding) this.#binding.attachMatchDriver(this);
    Object.freeze(this);
  }

  get state(): DriverState {
    this.#assertNoTransition('Arena V2 local match keyboard driver state read');
    return this.#state;
  }

  #assertUsable(operation: string): void {
    this.#assertNoTransition(operation);
    if (this.#state === 'failed' || this.#state === 'destroyed') {
      throw new Error(`${operation}拒绝状态${this.#state}。`);
    }
  }

  #assertNoTransition(operation: string): void {
    if (!this.#transitioning) return;
    const error = new Error(
      `${operation}不可在${this.#transitionOperation ?? 'unknown'}转换期间重入。`,
    );
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #beginTransition(operation: string): void {
    this.#assertNoTransition(operation);
    this.#transitioning = true;
    this.#transitionOperation = operation;
    this.#reentryError = null;
    this.#transitionFailure = null;
  }

  #assertTransitionCommit(): void {
    if (!this.#transitioning || this.#transitionOperation === null) {
      throw new Error('Arena V2 local match keyboard driver缺少当前转换所有权。');
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #endTransition(operation: string): void {
    const reentryError = this.#reentryError;
    const transitionFailure = this.#transitionFailure;
    if (reentryError === null) {
      this.#transitioning = false;
      this.#transitionOperation = null;
      this.#transitionFailure = null;
      return;
    }
    const failure = transitionFailure !== null && transitionFailure !== reentryError
      ? new AggregateError(
        [transitionFailure, reentryError],
        `${operation}失败且检测到同步重入。`,
      )
      : reentryError;
    try {
      if (this.#state === 'destroyed') this.#state = 'failed';
      else if (this.#state !== 'failed') this.#fail(failure);
      throw failure;
    } finally {
      this.#transitioning = false;
      this.#transitionOperation = null;
      this.#reentryError = null;
      this.#transitionFailure = null;
    }
  }

  #observe(method: SyncMethod, arguments_: readonly unknown[]): void {
    try { call(method, arguments_, 'Arena V2 local match keyboard driver observer'); }
    catch (error) {
      try { call(this.#onError, [error], 'Arena V2 local match keyboard driver error observer'); }
      catch { /* 观察者不能反向改变对局。 */ }
    }
    this.#assertTransitionCommit();
  }

  #setState(state: DriverState): void {
    if (this.#state === state) return;
    this.#observe(this.#onStateChange, [Object.freeze({ state })]);
    this.#state = state;
  }

  #context(): MatchInputContext {
    const context = this.#binding.getMatchInputContext();
    this.#assertTransitionCommit();
    return context;
  }

  #registerVisibility(
    method: SyncMethod,
    callback: SyncMethod,
    name: string,
    cleanups: Cleanup[],
  ): void {
    let cleanup: unknown;
    try {
      cleanup = call(method, [callback], name);
    } catch (error) {
      if (error instanceof
        ArenaV2KeyboardVisibilityRegistrationCleanupFailureCandidateV1
        && !error.cleanupComplete) {
        let active = true;
        cleanups.push(() => {
          if (!active) return;
          error.retryCleanup();
          if (!error.cleanupComplete) {
            throw new Error(`${name}构造债务清理仍未完成。`);
          }
          active = false;
        });
      }
      throw error;
    }
    if (typeof cleanup !== 'function') throw new TypeError(`${name}必须返回cleanup函数。`);
    let active = true;
    cleanups.push(() => {
      if (!active) return;
      call(cleanup as SyncMethod, [], `${name} cleanup`);
      active = false;
    });
  }

  #bindVisibility(): void {
    if (this.#visibilityPlatform === null || this.#visibilityCleanups.length > 0) return;
    const cleanups: Cleanup[] = [];
    let observedHidden = this.#platformHidden;
    this.#visibilityBinding = true;
    try {
      this.#registerVisibility(
        this.#visibilityPlatform.onHide,
        () => {
          if (this.#visibilityBinding) {
            observedHidden = true;
            return;
          }
          try { this.#handleVisibility('hidden'); } catch (error) { this.#fail(error); }
        },
        'Arena V2 keyboard visibility platform.onHide',
        cleanups,
      );
      this.#assertTransitionCommit();
      this.#registerVisibility(
        this.#visibilityPlatform.onShow,
        () => {
          if (this.#visibilityBinding) {
            observedHidden = false;
            return;
          }
          try { this.#handleVisibility('visible'); } catch (error) { this.#fail(error); }
        },
        'Arena V2 keyboard visibility platform.onShow',
        cleanups,
      );
      this.#assertTransitionCommit();
      const hidden = call(
        this.#visibilityPlatform.isHidden,
        [],
        'Arena V2 keyboard visibility platform.isHidden',
      );
      this.#assertTransitionCommit();
      if (typeof hidden !== 'boolean') {
        throw new TypeError('Arena V2 keyboard visibility platform.isHidden必须返回boolean。');
      }
      this.#platformHidden = observedHidden || hidden;
      this.#visibilityCleanups = cleanups;
    } catch (error) {
      const errors: unknown[] = [error];
      const retained: Cleanup[] = [];
      for (let index = cleanups.length - 1; index >= 0; index -= 1) {
        try { cleanups[index]!(); } catch (cleanupError) {
          retained.unshift(...cleanups.slice(0, index + 1));
          errors.push(cleanupError);
          break;
        }
      }
      this.#visibilityCleanups = retained;
      throw errors.length === 1
        ? error
        : new AggregateError(errors, 'Arena V2 keyboard可见性绑定失败且回滚不完整。');
    } finally {
      this.#visibilityBinding = false;
    }
  }

  #cleanupVisibility(): void {
    const cleanups = [...this.#visibilityCleanups];
    const retained: Cleanup[] = [];
    const errors: unknown[] = [];
    for (let index = cleanups.length - 1; index >= 0; index -= 1) {
      const cleanup = cleanups[index]!;
      const sequence = this.#reentrySequence;
      try {
        cleanup();
        if (this.#reentrySequence !== sequence) {
          retained.unshift(...cleanups.slice(0, index + 1));
          break;
        }
      } catch (error) {
        retained.unshift(...cleanups.slice(0, index + 1));
        errors.push(error);
        break;
      }
    }
    this.#visibilityCleanups = retained;
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Arena V2 keyboard可见性监听清理不完整。');
    }
  }

  #handleVisibility(visibility: VisibilityState): void {
    if (visibility === 'hidden') {
      this.#platformHidden = true;
      this.#input?.suspend();
      if (this.#state !== 'running') return;
      this.pause();
      this.#visibilityPaused = true;
      return;
    }
    this.#platformHidden = false;
    if (!this.#visibilityPaused || this.#state !== 'paused') return;
    this.#visibilityPaused = false;
    this.#visibilityBinding = false;
    this.resume();
  }

  #readPlatformHidden(): boolean {
    if (this.#visibilityPlatform === null) return this.#platformHidden;
    const hidden = call(
      this.#visibilityPlatform.isHidden,
      [],
      'Arena V2 keyboard visibility platform.isHidden',
    );
    this.#assertTransitionCommit();
    if (typeof hidden !== 'boolean') {
      throw new TypeError('Arena V2 keyboard visibility platform.isHidden必须返回boolean。');
    }
    this.#platformHidden = this.#platformHidden || hidden;
    return this.#platformHidden;
  }

  #replaceInput(context: MatchInputContext): void {
    if (
      this.#input !== null
      && this.#inputGeneration === context.generation
      && this.#inputParticipantId === context.localParticipantId
    ) return;
    this.#destroyInput();
    const input = new ArenaV2SimpleKeyboardInputCandidateV1(
      context.localParticipantId,
      this.#eventTarget,
    );
    try {
      input.bind();
      this.#assertTransitionCommit();
    } catch (error) {
      const cleanupSequence = this.#reentrySequence;
      try {
        input.destroy();
        if (this.#reentrySequence !== cleanupSequence) {
          this.#input = input;
          this.#inputGeneration = context.generation;
          this.#inputParticipantId = context.localParticipantId;
        }
      } catch (cleanupError) {
        this.#input = input;
        this.#inputGeneration = context.generation;
        this.#inputParticipantId = context.localParticipantId;
        throw new AggregateError([error, cleanupError], 'Arena V2输入切换失败且清理不完整。');
      }
      throw error;
    }
    this.#input = input;
    this.#inputGeneration = context.generation;
    this.#inputParticipantId = context.localParticipantId;
  }

  #destroyInput(): void {
    const input = this.#input;
    if (input === null) return;
    input.destroy();
    this.#assertTransitionCommit();
    this.#input = null;
    this.#inputGeneration = null;
    this.#inputParticipantId = null;
  }

  #runCleanupStep(
    run: () => unknown,
    commit: () => void,
    errors: unknown[],
  ): boolean {
    const sequence = this.#reentrySequence;
    try {
      assertSynchronousReturn(run(), 'Arena V2 local match keyboard driver cleanup callback');
      if (this.#reentrySequence !== sequence) return false;
      commit();
      return true;
    } catch (error) {
      errors.push(error);
      return false;
    }
  }

  readonly #frame = (frame: PresentationFrame): boolean => {
    if (this.#state !== 'running') return false;
    this.#beginTransition('Arena V2 local match keyboard driver frame');
    try {
      const { steps } = this.#accumulator.push(frame.deltaSeconds);
      for (let index = 0; index < steps; index += 1) {
        const before = this.#context();
        if (before.state !== 'running') {
          this.#input?.suspend();
          this.#assertTransitionCommit();
          this.#setState(before.state === 'paused' ? 'paused' : 'settlement-pending');
          return false;
        }
        this.#replaceInput(before);
        const localInput = this.#input!.sample(before.tick);
        this.#assertTransitionCommit();
        const outcome = this.#binding.stepMatch(localInput);
        this.#assertTransitionCommit();
        this.#observe(this.#onStep, [outcome]);
        const after = this.#context();
        if (after.state === 'settlement-pending') {
          this.#input?.suspend();
          this.#assertTransitionCommit();
          this.#setState('settlement-pending');
          return false;
        }
      }
      return true;
    } catch (error) {
      this.#fail(error);
      return false;
    } finally {
      this.#endTransition('Arena V2 local match keyboard driver frame');
    }
  };

  #fail(error: unknown): void {
    const ownsTransition = !this.#transitioning;
    if (ownsTransition) this.#beginTransition('Arena V2 local match keyboard driver failure');
    this.#transitionFailure ??= error;
    try {
      if (this.#state === 'failed' || this.#state === 'destroyed') return;
      this.#state = 'failed';
      const errors: unknown[] = [error];
      let mayContinue = true;
      if (!this.#loopDestroyed) {
        mayContinue = this.#runCleanupStep(
          () => this.#loop.stop(),
          () => { this.#loopQuiesced = true; },
          errors,
        );
      }
      if (mayContinue && this.#input !== null) {
        mayContinue = this.#runCleanupStep(
          () => this.#input!.destroy(),
          () => {
            this.#input = null;
            this.#inputGeneration = null;
            this.#inputParticipantId = null;
          },
          errors,
        );
      }
      if (mayContinue && this.#visibilityCleanups.length > 0) {
        const sequence = this.#reentrySequence;
        let cleanupFailed = false;
        try { this.#cleanupVisibility(); } catch (cleanupError) {
          errors.push(cleanupError);
          cleanupFailed = true;
        }
        mayContinue = !cleanupFailed && this.#reentrySequence === sequence;
      }
      if (mayContinue && this.#ownsBinding && !this.#bindingDisposed
        && this.#loopQuiesced && this.#input === null && this.#visibilityCleanups.length === 0) {
        this.#runCleanupStep(
          () => this.#binding.dispose(),
          () => { this.#bindingDisposed = true; },
          errors,
        );
      }
      this.#visibilityPaused = false;
      this.#visibilityBinding = false;
      const failure = errors.length === 1
        ? error
        : new AggregateError(errors, 'Arena V2 local match keyboard driver失败且清理不完整。');
      try { call(this.#onError, [failure], 'Arena V2 local match keyboard driver onError'); }
      catch { /* 失败报告不能重启驱动。 */ }
    } finally {
      if (ownsTransition) this.#endTransition('Arena V2 local match keyboard driver failure');
    }
  }

  start(): boolean {
    this.#assertUsable('Arena V2 local match keyboard driver start');
    if (this.#state === 'running') return false;
    this.#beginTransition('Arena V2 local match keyboard driver start');
    try {
      this.#bindVisibility();
      if (this.#readPlatformHidden()) {
        throw new Error('Arena V2 local match keyboard driver不能在平台隐藏时启动。');
      }
      const context = this.#context();
      if (context.state !== 'running') {
        throw new Error(`Arena V2 local match keyboard driver不能从${context.state}启动。`);
      }
      this.#replaceInput(context);
      if (this.#readPlatformHidden()) {
        throw new Error('Arena V2 local match keyboard driver绑定输入后平台已隐藏。');
      }
      this.#input!.resume();
      this.#assertTransitionCommit();
      this.#accumulator.reset();
      this.#visibilityPaused = false;
      this.#setState('running');
      this.#loop.start(this.#frame);
      this.#assertTransitionCommit();
      this.#loopQuiesced = false;
      return true;
    } catch (error) {
      this.#fail(error);
      throw error;
    } finally {
      this.#endTransition('Arena V2 local match keyboard driver start');
    }
  }

  pause(): boolean {
    this.#assertUsable('Arena V2 local match keyboard driver pause');
    if (this.#state === 'paused') {
      this.#visibilityPaused = false;
      return false;
    }
    if (this.#state !== 'running') throw new Error(`Arena V2驱动状态${this.#state}不能暂停。`);
    this.#visibilityPaused = false;
    this.#beginTransition('Arena V2 local match keyboard driver pause');
    try {
      this.#loop.stop();
      this.#assertTransitionCommit();
      this.#loopQuiesced = true;
      this.#input?.suspend();
      this.#assertTransitionCommit();
      this.#binding.pauseMatch();
      this.#assertTransitionCommit();
      this.#accumulator.reset();
      this.#setState('paused');
      return true;
    } catch (error) {
      this.#fail(error);
      throw error;
    } finally {
      this.#endTransition('Arena V2 local match keyboard driver pause');
    }
  }

  resume(): boolean {
    this.#assertUsable('Arena V2 local match keyboard driver resume');
    if (this.#state === 'running') return false;
    if (this.#state !== 'paused') throw new Error(`Arena V2驱动状态${this.#state}不能恢复。`);
    this.#visibilityPaused = false;
    this.#beginTransition('Arena V2 local match keyboard driver resume');
    try {
      if (this.#readPlatformHidden()) {
        throw new Error('Arena V2 local match keyboard driver不能在平台隐藏时恢复。');
      }
      this.#binding.resumeMatch();
      this.#assertTransitionCommit();
      const context = this.#context();
      this.#replaceInput(context);
      this.#input!.resume();
      this.#assertTransitionCommit();
      this.#accumulator.reset();
      this.#setState('running');
      this.#loop.start(this.#frame);
      this.#assertTransitionCommit();
      this.#loopQuiesced = false;
      return true;
    } catch (error) {
      this.#fail(error);
      throw error;
    } finally {
      this.#endTransition('Arena V2 local match keyboard driver resume');
    }
  }

  settle(): unknown {
    this.#assertUsable('Arena V2 local match keyboard driver settle');
    if (this.#state !== 'settlement-pending') {
      throw new Error(`Arena V2驱动状态${this.#state}不能结算。`);
    }
    this.#beginTransition('Arena V2 local match keyboard driver settle');
    try {
      this.#loop.stop();
      this.#assertTransitionCommit();
      this.#loopQuiesced = true;
      this.#destroyInput();
      const outcome = this.#binding.settleMatch();
      this.#assertTransitionCommit();
      this.#accumulator.reset();
      this.#visibilityPaused = false;
      this.#setState('information');
      return outcome;
    } catch (error) {
      this.#fail(error);
      throw error;
    } finally {
      this.#endTransition('Arena V2 local match keyboard driver settle');
    }
  }

  getSnapshot(): Readonly<{
    readonly state: DriverState;
    readonly visibilityPaused: boolean;
    readonly platformHidden: boolean;
    readonly inputGeneration: number | null;
    readonly inputParticipantId: string | null;
    readonly loop: ReturnType<PresentationFrameLoop['getDebugSnapshot']>;
    readonly accumulator: ReturnType<FixedTickAccumulator['getDebugSnapshot']>;
  }> {
    this.#assertNoTransition('Arena V2 local match keyboard driver snapshot read');
    this.#beginTransition('Arena V2 local match keyboard driver snapshot read');
    try {
      const loop = this.#loop.getDebugSnapshot();
      this.#assertTransitionCommit();
      const accumulator = this.#accumulator.getDebugSnapshot();
      this.#assertTransitionCommit();
      return Object.freeze({
        state: this.#state,
        visibilityPaused: this.#visibilityPaused,
        platformHidden: this.#platformHidden,
        inputGeneration: this.#inputGeneration,
        inputParticipantId: this.#inputParticipantId,
        loop,
        accumulator,
      });
    } catch (error) {
      this.#transitionFailure ??= error;
      throw error;
    } finally {
      this.#endTransition('Arena V2 local match keyboard driver snapshot read');
    }
  }

  dispose(): void {
    this.#assertNoTransition('Arena V2 local match keyboard driver dispose');
    if (this.#state === 'destroyed') return;
    this.#beginTransition('Arena V2 local match keyboard driver dispose');
    try {
      const errors: unknown[] = [];
      let mayContinue = true;
      if (!this.#loopDestroyed) {
        mayContinue = this.#runCleanupStep(
          () => this.#loop.destroy(),
          () => {
            this.#loopDestroyed = true;
            this.#loopQuiesced = true;
          },
          errors,
        );
      }
      if (mayContinue && this.#input !== null) {
        mayContinue = this.#runCleanupStep(
          () => this.#input!.destroy(),
          () => {
            this.#input = null;
            this.#inputGeneration = null;
            this.#inputParticipantId = null;
          },
          errors,
        );
      }
      if (mayContinue && this.#visibilityCleanups.length > 0) {
        const sequence = this.#reentrySequence;
        let cleanupFailed = false;
        try { this.#cleanupVisibility(); } catch (error) {
          errors.push(error);
          cleanupFailed = true;
        }
        mayContinue = !cleanupFailed && this.#reentrySequence === sequence;
      }
      if (mayContinue && this.#ownsBinding && !this.#bindingDisposed
        && this.#loopQuiesced && this.#input === null && this.#visibilityCleanups.length === 0) {
        this.#runCleanupStep(
          () => this.#binding.dispose(),
          () => { this.#bindingDisposed = true; },
          errors,
        );
      }
      this.#visibilityPaused = false;
      const cleanupComplete = this.#loopDestroyed
        && this.#input === null
        && this.#visibilityCleanups.length === 0
        && (!this.#ownsBinding || this.#bindingDisposed);
      this.#state = errors.length === 0 && cleanupComplete ? 'destroyed' : 'failed';
      if (errors.length === 0 && !cleanupComplete) {
        errors.push(new Error('Arena V2 local match keyboard driver清理依赖尚未收敛。'));
      }
      if (errors.length > 0) {
        throw new AggregateError(errors, 'Arena V2 local match keyboard driver清理不完整。');
      }
    } catch (error) {
      this.#transitionFailure ??= error;
      throw error;
    } finally {
      this.#endTransition('Arena V2 local match keyboard driver dispose');
    }
  }
}

export const ARENA_V2_LOCAL_MATCH_KEYBOARD_DRIVER_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  defaultNavigationWired: false as const,
  autoStartsAfterInformationSurfaceEntersMatch: true as const,
  inputConceptCount: 3 as const,
  directionJumpAndPrimaryOnly: true as const,
  fixedTickAuthorityBoundaryPreserved: true as const,
  platformClockVisibleToAuthority: false as const,
  sharedSynchronousReturnBoundaryWired: true as const,
  optionalPlatformVisibilityPausesAuthority: true as const,
  hiddenPlatformCannotBeManuallyResumed: true as const,
  failedInputCleanupRetainsRetryOwnership: true as const,
  failedInputBindRollbackRetainsRetryOwnership: true as const,
  keyboardInputListenerPotentialOwnersRecordedBeforeRegistration: true as const,
  keyboardInputPartialListenerRegistrationRemainsRetryable: true as const,
  driverCleanupRetriesOnlyIncompleteOwnedResources: true as const,
  bindingCleanupWaitsForLoopInputAndVisibilityQuiescence: true as const,
  swallowedBindingInputLoopOrObserverReentryFailsClosed: true as const,
  stateAndSnapshotReadsRejectedDuringTransition: true as const,
  disposeCommitsUnderStickyTransitionGuard: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  bindingInputLoopAndObserverCallbacksCheckedBeforeStateCommit: true as const,
  cleanupReentryRetainsCurrentAndLaterOwners: true as const,
  ordinaryCleanupFailureRetainsCurrentAndLaterOwners: true as const,
  cleanupCallbacksMustCompleteSynchronously: true as const,
  listenerCleanupStopsAtFirstIncompleteRecord: true as const,
  snapshotChildrenCheckedBeforeAggregatePublication: true as const,
  visibilityRegistrationAndCleanupUseSequenceOwnership: true as const,
  visibilityRegistrationCleanupDebtRetainedByDriver: true as const,
  visibilityRegistrationRollbackRetriesOnlyOwnedListeners: true as const,
  idempotentLifecycleChecksFollowTransitionGuard: true as const,
  blockCrouchAndSlamDisabled: true as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
});
