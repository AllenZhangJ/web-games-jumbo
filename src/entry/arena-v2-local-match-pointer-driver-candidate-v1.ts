import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertPlainRecord,
  assertSynchronousReturn,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_INPUT_MAPPER_ID,
  ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1,
  FixedTickAccumulator,
  InputSampler,
  PointerInputAdapter,
  PresentationFrameLoop,
  createSimpleThreeConceptMapper,
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
type VisibilityState = 'hidden' | 'visible';
type SyncMethod = (...arguments_: readonly unknown[]) => unknown;
type Cleanup = () => void;

interface MatchInputContext {
  readonly generation: number;
  readonly state: 'running' | 'paused' | 'settlement-pending';
  readonly tick: number;
  readonly localParticipantId: string;
}

const DRIVER_OPTION_KEYS = new Set([
  'binding',
  'platform',
  'viewportProvider',
  'requestFrame',
  'cancelFrame',
  'now',
  'layout',
  'onStep',
  'onStateChange',
  'onError',
  'fixedDeltaSeconds',
  'maximumCatchUpSteps',
  'ownsBinding',
]);
const DRIVER_REQUIRED_OPTION_KEYS = Object.freeze([
  'binding',
  'platform',
  'viewportProvider',
  'requestFrame',
  'cancelFrame',
  'now',
] as const);
export const ARENA_V2_SIMPLE_POINTER_CONTROL_CONTRACT_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  concepts: ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.concepts,
  mapperId: ARENA_INPUT_MAPPER_ID.SIMPLE_THREE_CONCEPT,
  contentContractHash: ARENA_V2_THREE_CONCEPT_INPUT_CONTRACT_CANDIDATE_V1.contentHash,
  supportsPrimaryPressHoldRelease: true as const,
  hiddenGestureActionsEnabled: false as const,
  movementControlLabel:
    ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1.movementControlLabel,
  jumpControlLabel:
    ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1.jumpControlLabel,
  primaryAttackControlLabel:
    ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1.primaryAttackControlLabel,
  visibleText: ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1.visibleText,
  accessibilityText:
    ARENA_V2_SIMPLE_THREE_CONCEPT_POINTER_BINDING_V1.accessibilityText,
});

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

function call(method: SyncMethod, arguments_: readonly unknown[], name: string): unknown {
  const result = method(...arguments_);
  assertSynchronousReturn(result, name);
  return result;
}

function optionalDataMethod(target: unknown, key: string, name: string): SyncMethod | null {
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
  return null;
}

function platformPort(value: unknown): Readonly<{
  readonly isHidden: SyncMethod | null;
  readonly onResize: SyncMethod;
  readonly onHide: SyncMethod;
  readonly onShow: SyncMethod;
}> {
  return Object.freeze({
    isHidden: optionalDataMethod(value, 'isHidden', 'Arena V2 pointer platform'),
    onResize: dataMethod(value, 'onResize', 'Arena V2 pointer platform'),
    onHide: dataMethod(value, 'onHide', 'Arena V2 pointer platform'),
    onShow: dataMethod(value, 'onShow', 'Arena V2 pointer platform'),
  });
}

/**
 * Touch input owns only platform sampling. It maps the existing move zone,
 * jump button and primary button to one immutable ArenaInputFrame per tick.
 * Lifecycle signals are forwarded to the driver; they never advance authority.
 */
export class ArenaV2SimplePointerInputCandidateV1 {
  readonly #sampler: InputSampler;
  readonly #adapter: PointerInputAdapter;
  readonly #platform: ReturnType<typeof platformPort>;
  readonly #viewportProvider: SyncMethod;
  readonly #onVisibility: SyncMethod;
  readonly #onError: SyncMethod;
  #cleanups: Cleanup[] = [];
  #bindingLifecycle = false;
  #platformHidden = false;
  #started = false;
  #suspended = false;
  #adapterDestroyed = false;
  #samplerDestroyed = false;
  #destroyed = false;

  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'Arena V2 simple pointer input options');
    const optionKeys = new Set([
      'participantId',
      'platform',
      'viewportProvider',
      'layout',
      'onVisibility',
      'onError',
    ]);
    assertKnownKeys(source, optionKeys, 'Arena V2 simple pointer input options');
    for (const key of ['participantId', 'platform', 'viewportProvider'] as const) {
      if (!Object.hasOwn(source, key)) {
        throw new TypeError(`Arena V2 simple pointer input缺少${key}。`);
      }
    }
    for (const key of Object.keys(source)) dataField(source, key, 'Arena V2 simple pointer input options');
    if (typeof source.participantId !== 'string' || source.participantId.length === 0) {
      throw new TypeError('Arena V2 simple pointer input participantId必须是非空字符串。');
    }
    this.#platform = platformPort(source.platform);
    this.#viewportProvider = syncFunction(
      source.viewportProvider,
      'Arena V2 simple pointer input viewportProvider',
    );
    this.#onVisibility = source.onVisibility === undefined
      ? () => undefined
      : syncFunction(source.onVisibility, 'Arena V2 simple pointer input onVisibility');
    this.#onError = source.onError === undefined
      ? () => undefined
      : syncFunction(source.onError, 'Arena V2 simple pointer input onError');
    const initialViewport = call(
      this.#viewportProvider,
      [],
      'Arena V2 simple pointer input viewportProvider',
    );
    this.#sampler = new InputSampler({
      participantId: source.participantId,
      viewport: initialViewport,
      mapper: createSimpleThreeConceptMapper(),
      ...(source.layout === undefined ? {} : { layout: source.layout }),
    });
    this.#adapter = new PointerInputAdapter({
      platform: source.platform,
      sampler: this.#sampler,
      viewportProvider: this.#viewportProvider,
      manageLifecycle: false,
      onError: (error: unknown) => this.#report(error),
    });
    Object.freeze(this);
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('Arena V2 simple pointer input已销毁。');
  }

  #report(error: unknown): void {
    try { call(this.#onError, [error], 'Arena V2 simple pointer input onError'); }
    catch { /* 诊断回调不能改变输入清理。 */ }
  }

  #registerLifecycle(method: SyncMethod, callback: SyncMethod, name: string): Cleanup {
    const cleanup = call(method, [callback], name);
    if (typeof cleanup !== 'function') throw new TypeError(`${name}必须返回cleanup函数。`);
    let active = true;
    return () => {
      if (!active) return;
      call(cleanup as SyncMethod, [], `${name} cleanup`);
      active = false;
    };
  }

  readonly #onResize = (): void => {
    if (this.#bindingLifecycle || !this.#started || this.#destroyed) return;
    try {
      const viewport = call(
        this.#viewportProvider,
        [],
        'Arena V2 simple pointer input viewportProvider',
      );
      this.#sampler.resize(viewport);
    } catch (error) { this.#report(error); }
  };

  readonly #onHide = (): void => {
    if (this.#destroyed) return;
    this.#platformHidden = true;
    if (this.#bindingLifecycle || !this.#started) return;
    try {
      this.suspend();
      call(this.#onVisibility, ['hidden'], 'Arena V2 simple pointer input onVisibility');
    } catch (error) { this.#report(error); }
  };

  readonly #onShow = (): void => {
    if (this.#destroyed) return;
    this.#platformHidden = false;
    if (this.#bindingLifecycle || !this.#started) return;
    try {
      call(this.#onVisibility, ['visible'], 'Arena V2 simple pointer input onVisibility');
    } catch (error) { this.#report(error); }
  };

  bind(): boolean {
    this.#assertUsable();
    if (this.#started) return false;
    const cleanups: Cleanup[] = [];
    this.#bindingLifecycle = true;
    try {
      this.#adapter.start();
      cleanups.push(() => { this.#adapter.stop(); });
      cleanups.push(this.#registerLifecycle(
        this.#platform.onResize,
        this.#onResize,
        'Arena V2 pointer platform.onResize',
      ));
      cleanups.push(this.#registerLifecycle(
        this.#platform.onHide,
        this.#onHide,
        'Arena V2 pointer platform.onHide',
      ));
      cleanups.push(this.#registerLifecycle(
        this.#platform.onShow,
        this.#onShow,
        'Arena V2 pointer platform.onShow',
      ));
      this.#cleanups = cleanups;
      this.#started = true;
      if (this.#platformHidden) {
        const changed = this.#sampler.suspend();
        this.#suspended = this.#suspended || changed || this.#platformHidden;
      }
      return true;
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
      if (cleanups.length === 0) {
        try {
          assertSynchronousReturn(
            this.#adapter.stop(),
            'Arena V2 pointer bind rollback adapter.stop()',
          );
        } catch (cleanupError) { errors.push(cleanupError); }
      }
      this.#cleanups = retained;
      throw errors.length === 1
        ? error
        : new AggregateError(errors, 'Arena V2 pointer绑定失败且回滚不完整。');
    } finally {
      this.#bindingLifecycle = false;
    }
  }

  sample(tick: unknown): ArenaInputFrame {
    this.#assertUsable();
    return this.#sampler.sample(tick);
  }

  suspend(): boolean {
    this.#assertUsable();
    if (this.#suspended) return false;
    const changed = this.#sampler.suspend();
    this.#suspended = true;
    return changed;
  }

  resume(): boolean {
    this.#assertUsable();
    if (!this.#suspended) return false;
    const changed = this.#sampler.resume();
    this.#suspended = false;
    return changed;
  }

  isHidden(): boolean {
    this.#assertUsable();
    return this.#platformHidden;
  }

  getDebugSnapshot(): Readonly<{
    readonly started: boolean;
    readonly suspended: boolean;
    readonly sampler: ReturnType<InputSampler['getDebugSnapshot']>;
    readonly adapter: ReturnType<PointerInputAdapter['getDebugSnapshot']>;
  }> {
    this.#assertUsable();
    return Object.freeze({
      started: this.#started,
      suspended: this.#suspended,
      sampler: this.#sampler.getDebugSnapshot(),
      adapter: this.#adapter.getDebugSnapshot(),
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    const errors: unknown[] = [];
    this.#started = false;
    const retained: Cleanup[] = [];
    const cleanups = [...this.#cleanups];
    for (let index = cleanups.length - 1; index >= 0; index -= 1) {
      try { cleanups[index]!(); } catch (error) {
        retained.unshift(...cleanups.slice(0, index + 1));
        errors.push(error);
        break;
      }
    }
    this.#cleanups = retained;
    if (this.#cleanups.length === 0 && !this.#adapterDestroyed) {
      try {
        assertSynchronousReturn(
          this.#adapter.destroy(),
          'Arena V2 pointer input adapter.destroy()',
        );
        this.#adapterDestroyed = true;
      } catch (error) { errors.push(error); }
    }
    if (this.#cleanups.length === 0 && this.#adapterDestroyed && !this.#samplerDestroyed) {
      try {
        assertSynchronousReturn(
          this.#sampler.destroy(),
          'Arena V2 pointer input sampler.destroy()',
        );
        this.#samplerDestroyed = true;
      } catch (error) { errors.push(error); }
    }
    this.#suspended = true;
    this.#bindingLifecycle = false;
    this.#destroyed = this.#cleanups.length === 0
      && this.#adapterDestroyed
      && this.#samplerDestroyed;
    if (errors.length === 0 && !this.#destroyed) {
      errors.push(new Error('Arena V2 pointer输入清理依赖尚未收敛。'));
    }
    if (errors.length > 0) throw new AggregateError(errors, 'Arena V2 pointer输入清理不完整。');
  }
}

/**
 * Mobile/mini-game fixed-tick host. The platform frame cadence only schedules
 * work; authority receives integer-tick input and read-only match context.
 */
export class ArenaV2LocalMatchPointerDriverCandidateV1 {
  readonly #binding: ArenaV2InformationLocalPlayableSurfaceBindingCandidateV1;
  readonly #platform: unknown;
  readonly #platformPort: ReturnType<typeof platformPort>;
  readonly #viewportProvider: SyncMethod;
  readonly #layout: unknown;
  readonly #loop: PresentationFrameLoop;
  readonly #accumulator: FixedTickAccumulator;
  readonly #onStep: SyncMethod;
  readonly #onStateChange: SyncMethod;
  readonly #onError: SyncMethod;
  readonly #ownsBinding: boolean;
  #input: ArenaV2SimplePointerInputCandidateV1 | null = null;
  #inputGeneration: number | null = null;
  #inputParticipantId: string | null = null;
  #state: DriverState = 'idle';
  #transitioning = false;
  #transitionOperation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #transitionFailure: unknown = null;
  #visibilityPaused = false;
  #platformHidden = false;
  #loopQuiesced = false;
  #loopDestroyed = false;
  #bindingDisposed = false;

  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'Arena V2 local match pointer driver options');
    assertKnownKeys(source, DRIVER_OPTION_KEYS, 'Arena V2 local match pointer driver options');
    for (const key of DRIVER_REQUIRED_OPTION_KEYS) {
      if (!Object.hasOwn(source, key)) {
        throw new TypeError(`Arena V2 local match pointer driver缺少${key}。`);
      }
    }
    for (const key of Object.keys(source)) {
      dataField(source, key, 'Arena V2 local match pointer driver options');
    }
    if (!(source.binding instanceof ArenaV2InformationLocalPlayableSurfaceBindingCandidateV1)) {
      throw new TypeError('Arena V2 local match pointer driver需要V2本地Surface Binding。');
    }
    const ownsBinding = source.ownsBinding ?? true;
    if (typeof ownsBinding !== 'boolean') {
      throw new TypeError('Arena V2 local match pointer driver ownsBinding必须是boolean。');
    }
    const fixedDeltaSeconds = source.fixedDeltaSeconds ?? 1 / 60;
    if (typeof fixedDeltaSeconds !== 'number' || !Number.isFinite(fixedDeltaSeconds)
      || fixedDeltaSeconds <= 0) {
      throw new RangeError('Arena V2 local match pointer driver fixedDeltaSeconds无效。');
    }
    const maximumCatchUpSteps = assertIntegerAtLeast(
      source.maximumCatchUpSteps ?? 5,
      1,
      'Arena V2 local match pointer driver maximumCatchUpSteps',
    );
    if (maximumCatchUpSteps > 10) {
      throw new RangeError('Arena V2 local match pointer driver单帧追赶不得超过10 tick。');
    }
    const platform = platformPort(source.platform);
    this.#binding = source.binding;
    this.#platform = source.platform;
    this.#platformPort = platform;
    this.#viewportProvider = syncFunction(
      source.viewportProvider,
      'Arena V2 local match pointer driver viewportProvider',
    );
    this.#layout = source.layout;
    this.#onStep = source.onStep === undefined
      ? () => undefined
      : syncFunction(source.onStep, 'Arena V2 local match pointer driver onStep');
    this.#onStateChange = source.onStateChange === undefined
      ? () => undefined
      : syncFunction(source.onStateChange, 'Arena V2 local match pointer driver onStateChange');
    this.#onError = source.onError === undefined
      ? () => undefined
      : syncFunction(source.onError, 'Arena V2 local match pointer driver onError');
    this.#ownsBinding = ownsBinding;
    this.#accumulator = new FixedTickAccumulator({
      fixedDeltaSeconds,
      maximumSteps: maximumCatchUpSteps,
    });
    this.#loop = new PresentationFrameLoop({
      requestFrame: syncFunction(
        source.requestFrame,
        'Arena V2 local match pointer driver requestFrame',
      ),
      cancelFrame: syncFunction(
        source.cancelFrame,
        'Arena V2 local match pointer driver cancelFrame',
      ),
      now: syncFunction(source.now, 'Arena V2 local match pointer driver now'),
      onError: (error: unknown) => this.#fail(error),
      maxDeltaSeconds: fixedDeltaSeconds * maximumCatchUpSteps,
    });
    if (this.#ownsBinding) this.#binding.attachMatchDriver(this);
    Object.freeze(this);
  }

  get state(): DriverState {
    this.#assertNoTransition('Arena V2 local match pointer driver state read');
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
      throw new Error('Arena V2 local match pointer driver缺少当前转换所有权。');
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
    try { call(method, arguments_, 'Arena V2 local match pointer driver observer'); }
    catch (error) {
      try { call(this.#onError, [error], 'Arena V2 local match pointer driver error observer'); }
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

  #replaceInput(context: MatchInputContext): void {
    if (
      this.#input !== null
      && this.#inputGeneration === context.generation
      && this.#inputParticipantId === context.localParticipantId
    ) return;
    this.#destroyInput();
    const input = new ArenaV2SimplePointerInputCandidateV1({
      participantId: context.localParticipantId,
      platform: this.#platform,
      viewportProvider: this.#viewportProvider,
      ...(this.#layout === undefined ? {} : { layout: this.#layout }),
      onVisibility: (visibility: VisibilityState) => this.#handleVisibility(visibility),
      onError: (error: unknown) => this.#fail(error),
    });
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
        throw new AggregateError([error, cleanupError], 'Arena V2 pointer输入切换失败且清理不完整。');
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

  #handleVisibility(visibility: VisibilityState): void {
    if (visibility === 'hidden') {
      this.#platformHidden = true;
      if (this.#state !== 'running') return;
      this.pause();
      this.#visibilityPaused = true;
      return;
    }
    this.#platformHidden = false;
    if (!this.#visibilityPaused || this.#state !== 'paused') return;
    this.#visibilityPaused = false;
    this.resume();
  }

  #readPlatformHidden(): boolean {
    const inputHidden = this.#input?.isHidden() ?? false;
    this.#assertTransitionCommit();
    if (this.#platformPort.isHidden === null) {
      this.#platformHidden = this.#platformHidden || inputHidden;
      return this.#platformHidden;
    }
    const hidden = call(
      this.#platformPort.isHidden,
      [],
      'Arena V2 pointer platform.isHidden',
    );
    this.#assertTransitionCommit();
    if (typeof hidden !== 'boolean') {
      throw new TypeError('Arena V2 pointer platform.isHidden必须返回boolean。');
    }
    this.#platformHidden = this.#platformHidden || hidden || inputHidden;
    return this.#platformHidden;
  }

  #runCleanupStep(
    run: () => unknown,
    commit: () => void,
    errors: unknown[],
  ): boolean {
    const sequence = this.#reentrySequence;
    try {
      assertSynchronousReturn(run(), 'Arena V2 local match pointer driver cleanup callback');
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
    this.#beginTransition('Arena V2 local match pointer driver frame');
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
      this.#endTransition('Arena V2 local match pointer driver frame');
    }
  };

  #fail(error: unknown): void {
    const ownsTransition = !this.#transitioning;
    if (ownsTransition) this.#beginTransition('Arena V2 local match pointer driver failure');
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
      if (mayContinue && this.#ownsBinding && !this.#bindingDisposed
        && this.#loopQuiesced && this.#input === null) {
        this.#runCleanupStep(
          () => this.#binding.dispose(),
          () => { this.#bindingDisposed = true; },
          errors,
        );
      }
      this.#visibilityPaused = false;
      const failure = errors.length === 1
        ? error
        : new AggregateError(errors, 'Arena V2 local match pointer driver失败且清理不完整。');
      try { call(this.#onError, [failure], 'Arena V2 local match pointer driver onError'); }
      catch { /* 失败报告不能重启驱动。 */ }
    } finally {
      if (ownsTransition) this.#endTransition('Arena V2 local match pointer driver failure');
    }
  }

  start(): boolean {
    this.#assertUsable('Arena V2 local match pointer driver start');
    if (this.#state === 'running') return false;
    this.#beginTransition('Arena V2 local match pointer driver start');
    try {
      if (this.#readPlatformHidden()) {
        throw new Error('Arena V2 local match pointer driver不能在平台隐藏时启动。');
      }
      const context = this.#context();
      if (context.state !== 'running') {
        throw new Error(`Arena V2 local match pointer driver不能从${context.state}启动。`);
      }
      this.#replaceInput(context);
      if (this.#readPlatformHidden()) {
        throw new Error('Arena V2 local match pointer driver绑定输入后平台已隐藏。');
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
      this.#endTransition('Arena V2 local match pointer driver start');
    }
  }

  pause(): boolean {
    this.#assertUsable('Arena V2 local match pointer driver pause');
    if (this.#state === 'paused') {
      this.#visibilityPaused = false;
      return false;
    }
    if (this.#state !== 'running') throw new Error(`Arena V2触控驱动状态${this.#state}不能暂停。`);
    this.#visibilityPaused = false;
    this.#beginTransition('Arena V2 local match pointer driver pause');
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
      this.#endTransition('Arena V2 local match pointer driver pause');
    }
  }

  resume(): boolean {
    this.#assertUsable('Arena V2 local match pointer driver resume');
    if (this.#state === 'running') return false;
    if (this.#state !== 'paused') throw new Error(`Arena V2触控驱动状态${this.#state}不能恢复。`);
    this.#visibilityPaused = false;
    this.#beginTransition('Arena V2 local match pointer driver resume');
    try {
      if (this.#readPlatformHidden()) {
        throw new Error('Arena V2 local match pointer driver不能在平台隐藏时恢复。');
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
      this.#endTransition('Arena V2 local match pointer driver resume');
    }
  }

  settle(): unknown {
    this.#assertUsable('Arena V2 local match pointer driver settle');
    if (this.#state !== 'settlement-pending') {
      throw new Error(`Arena V2触控驱动状态${this.#state}不能结算。`);
    }
    this.#beginTransition('Arena V2 local match pointer driver settle');
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
      this.#endTransition('Arena V2 local match pointer driver settle');
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
    this.#assertNoTransition('Arena V2 local match pointer driver snapshot read');
    this.#beginTransition('Arena V2 local match pointer driver snapshot read');
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
      this.#endTransition('Arena V2 local match pointer driver snapshot read');
    }
  }

  dispose(): void {
    this.#assertNoTransition('Arena V2 local match pointer driver dispose');
    if (this.#state === 'destroyed') return;
    this.#beginTransition('Arena V2 local match pointer driver dispose');
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
      if (mayContinue && this.#ownsBinding && !this.#bindingDisposed
        && this.#loopQuiesced && this.#input === null) {
        this.#runCleanupStep(
          () => this.#binding.dispose(),
          () => { this.#bindingDisposed = true; },
          errors,
        );
      }
      this.#visibilityPaused = false;
      const cleanupComplete = this.#loopDestroyed
        && this.#input === null
        && (!this.#ownsBinding || this.#bindingDisposed);
      this.#state = errors.length === 0 && cleanupComplete ? 'destroyed' : 'failed';
      if (errors.length === 0 && !cleanupComplete) {
        errors.push(new Error('Arena V2 local match pointer driver清理依赖尚未收敛。'));
      }
      if (errors.length > 0) {
        throw new AggregateError(errors, 'Arena V2 local match pointer driver清理不完整。');
      }
    } catch (error) {
      this.#transitionFailure ??= error;
      throw error;
    } finally {
      this.#endTransition('Arena V2 local match pointer driver dispose');
    }
  }
}

export const ARENA_V2_LOCAL_MATCH_POINTER_DRIVER_CANDIDATE_V1 = Object.freeze({
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
  platformVisibilityPausesAuthority: true as const,
  hiddenPlatformCannotStartOrResumeAuthority: true as const,
  failedInputCleanupRetainsRetryOwnership: true as const,
  failedInputBindRollbackRetainsRetryOwnership: true as const,
  pointerInputCleanupDependencyOrderPreserved: true as const,
  driverCleanupRetriesOnlyIncompleteOwnedResources: true as const,
  bindingCleanupWaitsForLoopAndInputQuiescence: true as const,
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
  pointerInputVisibilityAndCleanupUseSequenceOwnership: true as const,
  idempotentLifecycleChecksFollowTransitionGuard: true as const,
  pointerDragDoesNotCreateSlam: true as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
});
