import { ARENA_FIXED_DT, ARENA_MATCH_PHASE } from '@number-strategy-jump/arena-match';
import {
  cloneFrozenData,
  normalizeThrownError,
  type ArenaMatchSnapshot,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_INPUT_ROUTER_MODE } from '@number-strategy-jump/arena-presentation-runtime';
import {
  createArenaMatchResources,
  destroyArenaMatchCandidate,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  projectArenaPresentationFrame,
  type ArenaPresentationPublicMatchInfo,
} from '@number-strategy-jump/arena-v1-presentation-content';
import {
  createArenaGreyboxSessionComposition,
  type ArenaGreyboxSessionComposition,
} from './greybox-session-composition.js';

type UnknownMethod = (...args: unknown[]) => unknown;
type Cleanup = () => unknown;
type PresentationFrameData = ReturnType<typeof projectArenaPresentationFrame>;

interface ArenaSessionError extends Error {
  causes?: readonly unknown[];
  cleanupCause?: unknown;
  cleanupCauses?: readonly unknown[];
}

interface CanvasLease {
  readonly value: object;
  readonly addEventListener: UnknownMethod;
  readonly removeEventListener: UnknownMethod;
}

interface AccumulatorPort {
  readonly push: (deltaSeconds: unknown) => Readonly<{ steps: number; droppedSeconds: number }>;
  readonly reset: () => unknown;
  readonly getDebugSnapshot?: () => unknown;
}

interface FrameLoopPort {
  readonly start: (callback: (frame: Readonly<{ deltaSeconds: number }>) => boolean) => boolean;
  readonly stop: () => unknown;
  readonly destroy: () => unknown;
  readonly getDebugSnapshot?: () => unknown;
}

interface RendererPort {
  readonly load: () => unknown;
  readonly render: (frame: PresentationFrameData, options: Readonly<Record<string, unknown>>) => unknown;
  readonly dispose: () => unknown;
  readonly getInputViewport: () => unknown;
  readonly hitTestRematch: (point: unknown) => unknown;
  readonly handleContextLost: (event: unknown) => unknown;
  readonly handleContextRestored: () => unknown;
  readonly resize: (viewport: unknown) => unknown;
  readonly getDebugSnapshot?: () => unknown;
}

interface MatchSessionPort {
  readonly start: () => unknown;
  readonly setPaused: (paused: boolean) => unknown;
  readonly step: (input: unknown) => unknown;
  readonly getSnapshot: () => unknown;
  readonly destroy: () => unknown;
}

interface EventWindowPort {
  readonly consume: (events: readonly unknown[]) => unknown;
  readonly destroy: () => unknown;
}

interface InputRouterPort {
  readonly pointerStart: UnknownMethod;
  readonly pointerMove: UnknownMethod;
  readonly pointerEnd: UnknownMethod;
  readonly pointerCancel: UnknownMethod;
  readonly sample: (tick: number, context: Readonly<Record<string, unknown>>) => unknown;
  readonly replaceSampler: (sampler: unknown) => unknown;
  readonly setMode: (mode: string) => unknown;
  readonly resize: (viewport: unknown) => unknown;
  readonly suspend: () => unknown;
  readonly resume: () => unknown;
  readonly destroy: () => unknown;
  readonly getDebugSnapshot?: () => unknown;
}

interface InputAdapterPort {
  readonly start: () => unknown;
  readonly destroy: () => unknown;
  readonly getDebugSnapshot?: () => unknown;
}

export const ARENA_PRESENTATION_SESSION_STATE = Object.freeze({
  CREATED: 'created',
  STARTING: 'starting',
  MATCHING: 'matching',
  RUNNING: 'running',
  PAUSED: 'paused',
  RESULT: 'result',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
});

export type ArenaPresentationSessionState =
  typeof ARENA_PRESENTATION_SESSION_STATE[keyof typeof ARENA_PRESENTATION_SESSION_STATE];

const MODE = Object.freeze({
  MATCHING: 'matching',
  MATCH: 'match',
  RESULT: 'result',
});

type ArenaPresentationMode = typeof MODE[keyof typeof MODE];

function descriptorInPrototypeChain(
  value: object,
  key: string,
  name: string,
): PropertyDescriptor | null {
  const visited = new Set<object>();
  let current: object | null = value;
  while (current !== null) {
    if (visited.has(current) || visited.size >= 32) throw new TypeError(`${name} 原型链无效。`);
    visited.add(current);
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor) return descriptor;
    current = Object.getPrototypeOf(current) as object | null;
  }
  return null;
}

function snapshotMethod(value: unknown, key: string, name: string): UnknownMethod {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  const descriptor = descriptorInPrototypeChain(value, key, name);
  if (!descriptor) throw new TypeError(`${name} 缺少 ${key}()。`);
  if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
    throw new TypeError(`${name}.${key} 必须是数据方法。`);
  }
  return descriptor.value.bind(value) as UnknownMethod;
}

function rejectThenable<T>(value: T, name: string): T {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return value;
  const descriptor = descriptorInPrototypeChain(value as object, 'then', name);
  if (!descriptor) return value;
  if (!Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name} 返回了访问器 thenable。`);
  }
  if (typeof descriptor.value !== 'function') return value;
  try {
    Promise.prototype.then.call(value, undefined, () => {});
  } catch { /* non-Promise thenables are rejected without executing their then method */ }
  throw new TypeError(`${name} 必须同步完成。`);
}

function callSync<TArguments extends unknown[], TResult>(
  method: (...args: TArguments) => TResult,
  name: string,
  ...args: TArguments
): TResult {
  return rejectThenable(method(...args), name);
}

function containObserverThenable(value: unknown): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
  const descriptor = descriptorInPrototypeChain(value as object, 'then', 'observer result');
  if (!descriptor || !Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
    return;
  }
  try {
    Promise.prototype.then.call(value, undefined, () => {});
  } catch { /* non-Promise thenables are ignored without executing their then method */ }
}

function optionalSnapshotMethod(value: unknown, key: string, name: string): UnknownMethod | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  const descriptor = descriptorInPrototypeChain(value, key, name);
  if (!descriptor) return undefined;
  if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
    throw new TypeError(`${name}.${key} 必须是数据方法。`);
  }
  return descriptor.value.bind(value) as UnknownMethod;
}

function snapshotPort<T extends object>(
  value: unknown,
  methods: readonly string[],
  optionalMethods: readonly string[],
  name: string,
): T {
  rejectThenable(value, name);
  const result: Record<string, UnknownMethod> = {};
  for (const method of methods) result[method] = snapshotMethod(value, method, name);
  for (const method of optionalMethods) {
    const snapshot = optionalSnapshotMethod(value, method, name);
    if (snapshot) result[method] = snapshot;
  }
  return Object.freeze(result) as T;
}

function snapshotOwnedPort<T extends object>(
  value: unknown,
  methods: readonly string[],
  optionalMethods: readonly string[],
  name: string,
  cleanupMethod: string,
): T {
  try {
    return snapshotPort<T>(value, methods, optionalMethods, name);
  } catch (error) {
    try {
      const cleanup = optionalSnapshotMethod(value, cleanupMethod, name);
      if (cleanup) callSync(cleanup, `${name}.${cleanupMethod}`);
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        `${name} 合同无效且清理失败。`,
      );
    }
    throw error;
  }
}

function eventArray(value: unknown, name: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} 必须是数组。`);
  return value;
}

function recordData(value: unknown, name: string): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function dataField(value: Readonly<Record<string, unknown>>, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key} 必须是自有数据字段。`);
  }
  return descriptor.value;
}

function arenaSnapshot(value: unknown, name: string): ArenaMatchSnapshot {
  const cloned = cloneFrozenData(value, name);
  if (!cloned || typeof cloned !== 'object' || Array.isArray(cloned)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  return cloned as ArenaMatchSnapshot;
}

function accumulatorBatch(
  value: unknown,
  maximumSteps: number,
): Readonly<{ steps: number; droppedSeconds: number }> {
  const record = recordData(value, 'Arena accumulator.push 返回值');
  const steps = dataField(record, 'steps', 'Arena accumulator.push 返回值');
  const droppedSeconds = dataField(record, 'droppedSeconds', 'Arena accumulator.push 返回值');
  if (!Number.isSafeInteger(steps) || (steps as number) < 0 || (steps as number) > maximumSteps) {
    throw new RangeError(`Arena accumulator steps 必须是 0～${maximumSteps} 的安全整数。`);
  }
  if (!Number.isFinite(droppedSeconds) || (droppedSeconds as number) < 0) {
    throw new RangeError('Arena accumulator droppedSeconds 必须是非负有限数。');
  }
  return Object.freeze({
    steps: steps as number,
    droppedSeconds: droppedSeconds as number,
  });
}

function validateCanvas(value: unknown): CanvasLease {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('ArenaPresentationSession platform.createCanvas() 未返回 Canvas。');
  }
  snapshotMethod(value, 'getContext', 'Arena Canvas');
  return Object.freeze({
    value,
    addEventListener: snapshotMethod(value, 'addEventListener', 'Arena Canvas'),
    removeEventListener: snapshotMethod(value, 'removeEventListener', 'Arena Canvas'),
  });
}

function cleanupFailure(errors: readonly unknown[]): ArenaSessionError | null {
  if (errors.length === 0) return null;
  const error: ArenaSessionError = new Error('ArenaPresentationSession 清理未完整完成。');
  error.causes = errors;
  return error;
}

export class ArenaPresentationSession {
  readonly #composition: ArenaGreyboxSessionComposition;
  readonly #frameLoop: FrameLoopPort;
  readonly #accumulator: AccumulatorPort;
  #state: ArenaPresentationSessionState;
  #mode: ArenaPresentationMode;
  #startPromise: Promise<this> | null;
  #destroyRequested: boolean;
  #processingFrame: boolean;
  #cleaningUp: boolean;
  #cleanupObservedErrors: unknown[] | null;
  #cleanupIncomplete: boolean;
  #deferredFailureCleanup: boolean;
  #hidden: boolean;
  #contextLost: boolean;
  #externallyPaused: boolean;
  #resizePending: boolean;
  #pendingRematch: boolean;
  #matchingElapsed: number;
  #matchCount: number;
  #lastError: Error | null;
  #canvas: CanvasLease | null;
  #renderer: RendererPort | null;
  #matchSession: MatchSessionPort | null;
  #eventWindow: EventWindowPort | null;
  #inputRouter: InputRouterPort | null;
  #inputAdapter: InputAdapterPort | null;
  #publicMatchInfo: ArenaPresentationPublicMatchInfo | null;
  #snapshot: ArenaMatchSnapshot | null;
  #lastPresentationFrame: PresentationFrameData | null;
  #bindings: Cleanup[];

  constructor(platform: unknown, options: unknown = {}) {
    this.#composition = createArenaGreyboxSessionComposition(platform, options);
    this.#state = ARENA_PRESENTATION_SESSION_STATE.CREATED;
    this.#mode = MODE.MATCHING;
    this.#startPromise = null;
    this.#destroyRequested = false;
    this.#processingFrame = false;
    this.#cleaningUp = false;
    this.#cleanupObservedErrors = null;
    this.#cleanupIncomplete = false;
    this.#deferredFailureCleanup = false;
    this.#hidden = false;
    this.#contextLost = false;
    this.#externallyPaused = false;
    this.#resizePending = false;
    this.#pendingRematch = false;
    this.#matchingElapsed = 0;
    this.#matchCount = 0;
    this.#lastError = null;
    this.#canvas = null;
    this.#renderer = null;
    this.#matchSession = null;
    this.#eventWindow = null;
    this.#inputRouter = null;
    this.#inputAdapter = null;
    this.#publicMatchInfo = null;
    this.#snapshot = null;
    this.#lastPresentationFrame = null;
    this.#bindings = [];
    this.#accumulator = snapshotPort<AccumulatorPort>(this.#composition.accumulatorFactory({
      fixedDeltaSeconds: ARENA_FIXED_DT,
      maximumSteps: this.#composition.maximumCatchUpTicks,
    }), ['push', 'reset'], ['getDebugSnapshot'], 'accumulatorFactory 返回值');
    this.#frameLoop = snapshotOwnedPort<FrameLoopPort>(this.#composition.frameLoopFactory({
      requestFrame: (callback: unknown) => callSync(
        this.#composition.platform.requestFrame,
        'Arena platform.requestFrame',
        callback,
      ),
      cancelFrame: (token: unknown) => callSync(
        this.#composition.platform.cancelFrame,
        'Arena platform.cancelFrame',
        token,
      ),
      now: () => callSync(this.#composition.platform.now, 'Arena platform.now'),
      onError: (error: unknown) => this.#handleLoopFailure(error),
      maxDeltaSeconds: 0.1,
    }), ['start', 'stop', 'destroy'], ['getDebugSnapshot'], 'frameLoopFactory 返回值', 'destroy');
  }

  get state() {
    return this.#state;
  }

  #isTerminal() {
    return this.#state === ARENA_PRESENTATION_SESSION_STATE.FAILED
      || this.#state === ARENA_PRESENTATION_SESSION_STATE.DESTROYED;
  }

  #report(type: string, detail: Readonly<Record<string, unknown>> = {}): void {
    try {
      containObserverThenable(this.#composition.onDiagnostic(Object.freeze({ type, ...detail })));
    } catch {
      // Diagnostics are observational and never own gameplay lifecycle.
    }
  }

  #stateForMode() {
    if (this.#mode === MODE.MATCHING) return ARENA_PRESENTATION_SESSION_STATE.MATCHING;
    if (this.#mode === MODE.MATCH) return ARENA_PRESENTATION_SESSION_STATE.RUNNING;
    return ARENA_PRESENTATION_SESSION_STATE.RESULT;
  }

  #assertStartedResource<T>(value: T | null, name: string): T {
    if (!value) throw new Error(`ArenaPresentationSession 缺少 ${name}。`);
    return value;
  }

  #guardHost(callback: UnknownMethod): UnknownMethod {
    return (...args: unknown[]) => {
      if (this.#isTerminal() || this.#destroyRequested) return false;
      try {
        callback(...args);
        return true;
      } catch (error) {
        this.#failFromHost(error);
        return false;
      }
    };
  }

  #registerCleanup(cleanup: unknown, name: string): void {
    rejectThenable(cleanup, name);
    if (typeof cleanup !== 'function') throw new TypeError(`${name} 必须返回 cleanup 函数。`);
    this.#bindings.push(cleanup as Cleanup);
  }

  #bindCanvasEvent(type: string, callback: UnknownMethod): Cleanup {
    const canvas = this.#assertStartedResource(this.#canvas, 'canvas');
    try {
      callSync(canvas.addEventListener, `Arena Canvas.addEventListener(${type})`, type, callback, false);
    } catch (error) {
      try {
        callSync(
          canvas.removeEventListener,
          `Arena Canvas.removeEventListener(${type})`,
          type,
          callback,
          false,
        );
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          `Arena Canvas ${type} 绑定失败且回滚失败。`,
        );
      }
      throw error;
    }
    let active = true;
    return () => {
      if (!active) return;
      callSync(
        canvas.removeEventListener,
        `Arena Canvas.removeEventListener(${type})`,
        type,
        callback,
        false,
      );
      active = false;
    };
  }

  #bindLifecycle(): void {
    const platform = this.#composition.platform;
    const renderer = this.#assertStartedResource(this.#renderer, 'renderer');
    const inputRouter = this.#assertStartedResource(this.#inputRouter, 'inputRouter');
    this.#registerCleanup(callSync(
      platform.onResize,
      'Arena platform.onResize',
      this.#guardHost(() => this.#handleResize()),
    ), 'onResize');
    this.#registerCleanup(callSync(platform.onHide, 'Arena platform.onHide', this.#guardHost(() => {
      this.#hidden = true;
      this.#syncPauseState();
    })), 'onHide');
    this.#registerCleanup(callSync(platform.onShow, 'Arena platform.onShow', this.#guardHost(() => {
      this.#hidden = false;
      this.#syncPauseState();
    })), 'onShow');
    this.#registerCleanup(this.#bindCanvasEvent(
      'webglcontextlost',
      this.#guardHost((event: unknown) => {
        callSync(renderer.handleContextLost, 'Arena Renderer.handleContextLost', event);
        this.#contextLost = true;
        this.#syncPauseState();
      }),
    ), 'webglcontextlost');
    this.#registerCleanup(this.#bindCanvasEvent(
      'webglcontextrestored',
      this.#guardHost(() => {
        if (!callSync(renderer.handleContextRestored, 'Arena Renderer.handleContextRestored')) return;
        this.#contextLost = false;
        callSync(
          inputRouter.resize,
          'Arena inputRouter.resize',
          callSync(renderer.getInputViewport, 'Arena Renderer.getInputViewport'),
        );
        this.#syncPauseState();
      }),
    ), 'webglcontextrestored');
  }

  #createFrame(events: readonly unknown[] = []): PresentationFrameData {
    const eventWindow = this.#assertStartedResource(this.#eventWindow, 'eventWindow');
    const snapshot = this.#assertStartedResource(this.#snapshot, 'snapshot');
    const publicMatchInfo = this.#assertStartedResource(this.#publicMatchInfo, 'publicMatchInfo');
    const accepted = eventArray(
      callSync(eventWindow.consume, 'PresentationEventWindow.consume', events),
      'PresentationEventWindow.consume',
    );
    const frame = projectArenaPresentationFrame({
      snapshot,
      events: accepted,
      publicMatchInfo,
      content: this.#composition.presentationContent,
    });
    this.#lastPresentationFrame = frame;
    return frame;
  }

  #renderCurrent(events: readonly unknown[] = [], deltaSeconds = 0): unknown {
    const renderer = this.#assertStartedResource(this.#renderer, 'renderer');
    const frame = this.#createFrame(events);
    const rendered = rejectThenable(renderer.render(frame, {
      deltaSeconds,
      mode: this.#mode === MODE.MATCHING ? 'matching' : 'match',
      mapperLabel: this.#composition.experimentLabel,
    }), 'Arena Renderer.render');
    if (rendered === false) {
      this.#contextLost = true;
      this.#syncPauseState();
    }
    return rendered;
  }

  async #initialize(): Promise<void> {
    this.#canvas = validateCanvas(callSync(
      this.#composition.platform.createCanvas,
      'Arena platform.createCanvas',
    ));
    this.#renderer = snapshotOwnedPort<RendererPort>(this.#composition.rendererFactory({
      canvas: this.#canvas.value,
      platform: this.#composition.platform,
    }), [
      'load',
      'render',
      'dispose',
      'getInputViewport',
      'hitTestRematch',
      'handleContextLost',
      'handleContextRestored',
      'resize',
    ], ['getDebugSnapshot'], 'rendererFactory 返回值', 'dispose');
    await this.#renderer.load();
    if (this.#destroyRequested || this.#state === ARENA_PRESENTATION_SESSION_STATE.DESTROYED) {
      throw new Error('ArenaPresentationSession 启动已取消。');
    }

    const candidate = createArenaMatchResources(
      this.#composition,
      callSync(this.#renderer.getInputViewport, 'Arena Renderer.getInputViewport'),
    );
    let router: InputRouterPort | null = null;
    try {
      router = snapshotOwnedPort<InputRouterPort>(this.#composition.inputRouterFactory({
        sampler: candidate.sampler,
        viewport: callSync(this.#renderer.getInputViewport, 'Arena Renderer.getInputViewport'),
        hitTestRematch: (point: unknown) => this.#renderer
          ? callSync(this.#renderer.hitTestRematch, 'Arena Renderer.hitTestRematch', point)
          : false,
        onRematchRequested: () => this.requestRematch(),
      }), [
        'pointerStart',
        'pointerMove',
        'pointerEnd',
        'pointerCancel',
        'sample',
        'replaceSampler',
        'setMode',
        'resize',
        'suspend',
        'resume',
        'destroy',
      ], ['getDebugSnapshot'], 'inputRouterFactory 返回值', 'destroy');
      candidate.sampler = null;
    } catch (error) {
      destroyArenaMatchCandidate(candidate);
      throw error;
    }

    this.#matchSession = candidate.session as MatchSessionPort;
    this.#eventWindow = candidate.eventWindow as EventWindowPort;
    this.#publicMatchInfo = candidate.publicMatchInfo as unknown as ArenaPresentationPublicMatchInfo;
    this.#snapshot = candidate.snapshot as unknown as ArenaMatchSnapshot;
    this.#inputRouter = router;
    this.#inputAdapter = snapshotOwnedPort<InputAdapterPort>(this.#composition.inputAdapterFactory({
      platform: this.#composition.platform,
      sampler: this.#inputRouter,
      viewportProvider: () => this.#renderer
        ? callSync(this.#renderer.getInputViewport, 'Arena Renderer.getInputViewport')
        : undefined,
      manageLifecycle: false,
      onError: (error: unknown) => this.#failFromHost(error),
    }), ['start', 'destroy'], ['getDebugSnapshot'], 'inputAdapterFactory 返回值', 'destroy');

    this.#mode = MODE.MATCHING;
    this.#matchingElapsed = 0;
    this.#matchCount = 1;
    this.#state = ARENA_PRESENTATION_SESSION_STATE.MATCHING;
    this.#renderCurrent([], 0);
    this.#bindLifecycle();
    rejectThenable(this.#inputAdapter.start(), 'Arena inputAdapter.start');
    if (this.#hidden || this.#contextLost || this.#externallyPaused) this.#syncPauseState();
    else this.#startFrameLoop();
  }

  start(): Promise<this> {
    if (this.#state === ARENA_PRESENTATION_SESSION_STATE.DESTROYED) {
      return Promise.reject(new Error('ArenaPresentationSession 已销毁。'));
    }
    if (this.#state === ARENA_PRESENTATION_SESSION_STATE.FAILED) {
      const error = new Error('ArenaPresentationSession 已失败。');
      error.cause = this.#lastError;
      return Promise.reject(error);
    }
    if (this.#startPromise) return this.#startPromise;
    if (this.#state !== ARENA_PRESENTATION_SESSION_STATE.CREATED) return Promise.resolve(this);
    this.#state = ARENA_PRESENTATION_SESSION_STATE.STARTING;
    this.#startPromise = this.#initialize()
      .then(() => this)
      .catch((error) => {
        if (this.#state === ARENA_PRESENTATION_SESSION_STATE.DESTROYED) throw error;
        throw this.#fail(error);
      })
      .finally(() => {
        this.#startPromise = null;
      });
    return this.#startPromise;
  }

  #startFrameLoop(): boolean {
    if (
      this.#isTerminal()
      || this.#hidden
      || this.#contextLost
      || this.#externallyPaused
      || this.#destroyRequested
    ) return false;
    return rejectThenable(
      this.#frameLoop.start(({ deltaSeconds }) => this.#onFrame(deltaSeconds)),
      'Arena frameLoop.start',
    );
  }

  #activateMatch(): boolean {
    if (this.#mode !== MODE.MATCHING) return false;
    const matchSession = this.#assertStartedResource(this.#matchSession, 'matchSession');
    const inputRouter = this.#assertStartedResource(this.#inputRouter, 'inputRouter');
    rejectThenable(matchSession.start(), 'Arena matchSession.start');
    rejectThenable(
      inputRouter.setMode(ARENA_INPUT_ROUTER_MODE.GAMEPLAY),
      'Arena inputRouter.setMode',
    );
    this.#mode = MODE.MATCH;
    this.#state = ARENA_PRESENTATION_SESSION_STATE.RUNNING;
    rejectThenable(this.#accumulator.reset(), 'Arena accumulator.reset');
    return true;
  }

  #stepMatch(): readonly unknown[] {
    const matchSession = this.#assertStartedResource(this.#matchSession, 'matchSession');
    const inputRouter = this.#assertStartedResource(this.#inputRouter, 'inputRouter');
    const before = arenaSnapshot(
      callSync(matchSession.getSnapshot, 'Arena matchSession.getSnapshot'),
      'Arena matchSession snapshot',
    );
    const local = before.participants.find(({ id }) => id === 'player-1');
    if (!local) throw new RangeError('Arena local participant player-1 不存在。');
    const input = rejectThenable(inputRouter.sample(before.tick, {
      actionAffordance: local.actionAffordance,
    }), 'Arena inputRouter.sample');
    const result = recordData(
      rejectThenable(matchSession.step(input), 'Arena matchSession.step'),
      'Arena match step result',
    );
    const snapshot = arenaSnapshot(
      dataField(result, 'snapshot', 'Arena match step result'),
      'Arena match step snapshot',
    );
    const events = eventArray(
      dataField(result, 'events', 'Arena match step result'),
      'Arena match step events',
    );
    this.#snapshot = snapshot;
    if (this.#snapshot.phase === ARENA_MATCH_PHASE.ENDED) {
      this.#mode = MODE.RESULT;
      this.#state = ARENA_PRESENTATION_SESSION_STATE.RESULT;
      rejectThenable(inputRouter.setMode(ARENA_INPUT_ROUTER_MODE.RESULT), 'Arena inputRouter.setMode');
      rejectThenable(this.#accumulator.reset(), 'Arena accumulator.reset');
    }
    rejectThenable(this.#composition.onMatchProgress(Object.freeze({
      matchSeed: this.#snapshot.matchSeed,
      tick: this.#snapshot.tick,
      phase: this.#snapshot.phase,
    })), 'Arena onMatchProgress');
    return events;
  }

  #performRematch(): boolean {
    if (!this.#pendingRematch || this.#mode !== MODE.RESULT) return false;
    this.#pendingRematch = false;
    let candidate;
    try {
      candidate = createArenaMatchResources(
        this.#composition,
        callSync(
          this.#assertStartedResource(this.#renderer, 'renderer').getInputViewport,
          'Arena Renderer.getInputViewport',
        ),
      );
    } catch (error) {
      this.#report('rematch-create-failed', {
        message: normalizeThrownError(error, 'Arena rematch 创建失败').message,
      });
      return false;
    }

    try {
      const inputRouter = this.#assertStartedResource(this.#inputRouter, 'inputRouter');
      rejectThenable(
        inputRouter.setMode(ARENA_INPUT_ROUTER_MODE.INACTIVE),
        'Arena inputRouter.setMode',
      );
      rejectThenable(
        this.#assertStartedResource(this.#matchSession, 'matchSession').destroy(),
        'Arena matchSession.destroy',
      );
      this.#matchSession = null;
      rejectThenable(
        this.#assertStartedResource(this.#eventWindow, 'eventWindow').destroy(),
        'Arena eventWindow.destroy',
      );
      this.#eventWindow = null;
      rejectThenable(inputRouter.replaceSampler(candidate.sampler), 'Arena inputRouter.replaceSampler');
      candidate.sampler = null;
    } catch (error) {
      const normalized = normalizeThrownError(error, 'Arena rematch 切换失败');
      try { destroyArenaMatchCandidate(candidate); } catch (cleanupError) {
        (normalized as ArenaSessionError).cleanupCause = cleanupError;
      }
      throw normalized;
    }

    this.#matchSession = candidate.session as MatchSessionPort;
    this.#eventWindow = candidate.eventWindow as EventWindowPort;
    this.#publicMatchInfo = candidate.publicMatchInfo as unknown as ArenaPresentationPublicMatchInfo;
    this.#snapshot = candidate.snapshot as unknown as ArenaMatchSnapshot;
    this.#lastPresentationFrame = null;
    this.#matchingElapsed = 0;
    rejectThenable(this.#accumulator.reset(), 'Arena accumulator.reset');
    this.#mode = MODE.MATCHING;
    this.#state = ARENA_PRESENTATION_SESSION_STATE.MATCHING;
    this.#matchCount += 1;
    return true;
  }

  #applyResize(): void {
    const renderer = this.#assertStartedResource(this.#renderer, 'renderer');
    const inputRouter = this.#assertStartedResource(this.#inputRouter, 'inputRouter');
    rejectThenable(
      renderer.resize(callSync(
        this.#composition.platform.getViewport,
        'Arena platform.getViewport',
      )),
      'Arena Renderer.resize',
    );
    rejectThenable(inputRouter.resize(callSync(
      renderer.getInputViewport,
      'Arena Renderer.getInputViewport',
    )), 'Arena inputRouter.resize');
    this.#resizePending = false;
  }

  #handleResize(): void {
    if (!this.#renderer || !this.#inputRouter) return;
    if (this.#processingFrame) {
      this.#resizePending = true;
      return;
    }
    this.#applyResize();
    if (this.#lastPresentationFrame && !this.#hidden && !this.#contextLost) {
      this.#renderCurrent([], 0);
    }
  }

  #onFrame(deltaSeconds: number): boolean {
    if (this.#destroyRequested) return false;
    if (this.#processingFrame) throw new Error('ArenaPresentationSession frame 不可重入。');
    this.#processingFrame = true;
    try {
      if (this.#resizePending) this.#applyResize();
      this.#performRematch();
      let gameplayDeltaSeconds = deltaSeconds;
      if (this.#mode === MODE.MATCHING) {
        const previousElapsed = this.#matchingElapsed;
        this.#matchingElapsed += deltaSeconds;
        if (this.#matchingElapsed >= this.#composition.matchingDurationSeconds) {
          this.#activateMatch();
          gameplayDeltaSeconds = Math.max(
            0,
            previousElapsed + deltaSeconds - this.#composition.matchingDurationSeconds,
          );
        } else {
          gameplayDeltaSeconds = 0;
        }
      }

      const events: unknown[] = [];
      if (this.#mode === MODE.MATCH) {
        const batch = accumulatorBatch(
          rejectThenable(
            this.#accumulator.push(gameplayDeltaSeconds),
            'Arena accumulator.push',
          ),
          this.#composition.maximumCatchUpTicks,
        );
        if (batch.droppedSeconds > 0) {
          this.#report('presentation-backlog-dropped', {
            droppedSeconds: batch.droppedSeconds,
          });
        }
        for (let index = 0; index < batch.steps && this.#mode === MODE.MATCH; index += 1) {
          events.push(...this.#stepMatch());
        }
      }
      this.#renderCurrent(events, deltaSeconds);
      return !this.#hidden
        && !this.#contextLost
        && !this.#externallyPaused
        && !this.#destroyRequested
        && !this.#isTerminal();
    } finally {
      this.#processingFrame = false;
      if (this.#destroyRequested && this.#state !== ARENA_PRESENTATION_SESSION_STATE.DESTROYED) {
        const errors = this.#cleanupResources();
        this.#state = ARENA_PRESENTATION_SESSION_STATE.DESTROYED;
        const failure = cleanupFailure(errors);
        if (failure) this.#lastError = failure;
      } else if (this.#deferredFailureCleanup) {
        this.#completeFailureCleanup();
      }
    }
  }

  #syncPauseState(): void {
    if (!this.#matchSession || !this.#inputRouter || this.#isTerminal()) return;
    const paused = this.#hidden || this.#contextLost || this.#externallyPaused;
    if (paused) {
      rejectThenable(this.#inputRouter.suspend(), 'Arena inputRouter.suspend');
      rejectThenable(this.#matchSession.setPaused(true), 'Arena matchSession.setPaused');
      rejectThenable(this.#frameLoop.stop(), 'Arena frameLoop.stop');
      rejectThenable(this.#accumulator.reset(), 'Arena accumulator.reset');
      this.#state = ARENA_PRESENTATION_SESSION_STATE.PAUSED;
      return;
    }
    rejectThenable(this.#matchSession.setPaused(false), 'Arena matchSession.setPaused');
    rejectThenable(this.#inputRouter.resume(), 'Arena inputRouter.resume');
    rejectThenable(this.#accumulator.reset(), 'Arena accumulator.reset');
    this.#state = this.#stateForMode();
    this.#startFrameLoop();
  }

  #handleLoopFailure(error: unknown): void {
    if (this.#isTerminal() || this.#destroyRequested) return;
    this.#fail(error);
  }

  #failFromHost(error: unknown): void {
    if (this.#cleaningUp) {
      this.#cleanupObservedErrors?.push(normalizeThrownError(
        error,
        'ArenaPresentationSession 清理回调失败',
      ));
      return;
    }
    if (this.#isTerminal() || this.#destroyRequested) return;
    this.#fail(error);
  }

  #cleanupResources(): unknown[] {
    if (this.#cleaningUp) {
      const error = new Error('ArenaPresentationSession 清理不可重入。');
      this.#cleanupObservedErrors?.push(error);
      return [error];
    }
    this.#cleaningUp = true;
    const errors: unknown[] = [];
    this.#cleanupObservedErrors = errors;
    try {
      try {
        rejectThenable(this.#frameLoop.destroy(), 'Arena frameLoop.destroy');
      } catch (error) { errors.push(error); }
      try {
        if (this.#inputAdapter) {
          rejectThenable(this.#inputAdapter.destroy(), 'Arena inputAdapter.destroy');
        }
        this.#inputAdapter = null;
      } catch (error) { errors.push(error); }
      const bindings = this.#bindings.splice(0);
      const failedBindings: Cleanup[] = [];
      for (const cleanup of bindings.reverse()) {
        try { rejectThenable(cleanup(), 'Arena lifecycle cleanup'); } catch (error) {
          errors.push(error);
          failedBindings.push(cleanup);
        }
      }
      this.#bindings.push(...failedBindings.reverse());
      try {
        if (this.#inputRouter) {
          rejectThenable(this.#inputRouter.destroy(), 'Arena inputRouter.destroy');
        }
        this.#inputRouter = null;
      } catch (error) { errors.push(error); }
      try {
        if (this.#eventWindow) {
          rejectThenable(this.#eventWindow.destroy(), 'Arena eventWindow.destroy');
        }
        this.#eventWindow = null;
      } catch (error) { errors.push(error); }
      try {
        if (this.#matchSession) {
          rejectThenable(this.#matchSession.destroy(), 'Arena matchSession.destroy');
        }
        this.#matchSession = null;
      } catch (error) { errors.push(error); }
      try {
        if (this.#renderer) {
          rejectThenable(this.#renderer.dispose(), 'Arena Renderer.dispose');
        }
        this.#renderer = null;
      } catch (error) { errors.push(error); }
      this.#publicMatchInfo = null;
      this.#snapshot = null;
      this.#lastPresentationFrame = null;
    } finally {
      this.#cleanupObservedErrors = null;
      this.#cleaningUp = false;
      this.#cleanupIncomplete = errors.length > 0;
    }
    return errors;
  }

  #completeFailureCleanup(): Error | null {
    this.#deferredFailureCleanup = false;
    const cleanupErrors = this.#cleanupResources();
    if (cleanupErrors.length === 0) return this.#lastError;
    const failure: ArenaSessionError = new Error(
      'ArenaPresentationSession 失败且清理未完整完成。',
    );
    failure.cause = this.#lastError;
    failure.cleanupCauses = cleanupErrors;
    this.#lastError = failure;
    return failure;
  }

  #fail(error: unknown): Error {
    let normalized = normalizeThrownError(error, 'ArenaPresentationSession 失败');
    if (this.#state === ARENA_PRESENTATION_SESSION_STATE.FAILED) {
      return this.#lastError ?? normalized;
    }
    if (this.#state === ARENA_PRESENTATION_SESSION_STATE.DESTROYED) return normalized;
    try {
      rejectThenable(this.#frameLoop.stop(), 'Arena frameLoop.stop');
    } catch (stopError) {
      normalized = new AggregateError(
        [normalized, normalizeThrownError(stopError, 'Arena frameLoop 停止失败')],
        'ArenaPresentationSession 失败且 FrameLoop 停止失败。',
      );
    }
    this.#lastError = normalized;
    this.#state = ARENA_PRESENTATION_SESSION_STATE.FAILED;
    this.#report('session-failed', { message: normalized.message });
    if (this.#processingFrame) {
      this.#deferredFailureCleanup = true;
      return normalized;
    }
    return this.#completeFailureCleanup() ?? normalized;
  }

  requestRematch(): boolean {
    if (
      this.#isTerminal()
      || this.#destroyRequested
      || this.#mode !== MODE.RESULT
      || this.#pendingRematch
    ) return false;
    this.#pendingRematch = true;
    return true;
  }

  setPaused(paused: unknown): boolean {
    if (typeof paused !== 'boolean') throw new TypeError('paused 必须是布尔值。');
    if (this.#isTerminal() || this.#destroyRequested) return false;
    if (this.#externallyPaused === paused) return false;
    this.#externallyPaused = paused;
    this.#syncPauseState();
    return true;
  }

  getLastPresentationFrame(): PresentationFrameData | null {
    return this.#lastPresentationFrame;
  }

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    return Object.freeze({
      state: this.#state,
      mode: this.#mode,
      matchCount: this.#matchCount,
      hidden: this.#hidden,
      contextLost: this.#contextLost,
      externallyPaused: this.#externallyPaused,
      resizePending: this.#resizePending,
      pendingRematch: this.#pendingRematch,
      cleaningUp: this.#cleaningUp,
      cleanupIncomplete: this.#cleanupIncomplete,
      deferredFailureCleanup: this.#deferredFailureCleanup,
      bindingCount: this.#bindings.length,
      publicMatchInfo: this.#publicMatchInfo,
      snapshot: this.#snapshot ? Object.freeze({
        matchSeed: this.#snapshot.matchSeed,
        tick: this.#snapshot.tick,
        phase: this.#snapshot.phase,
      }) : null,
      lastError: this.#lastError ? Object.freeze({
        name: this.#lastError.name,
        message: this.#lastError.message,
      }) : null,
      frameLoop: this.#frameLoop?.getDebugSnapshot?.() ?? null,
      accumulator: this.#accumulator?.getDebugSnapshot?.() ?? null,
      input: this.#inputRouter?.getDebugSnapshot?.() ?? null,
      inputAdapter: this.#inputAdapter?.getDebugSnapshot?.() ?? null,
      renderer: this.#renderer?.getDebugSnapshot?.() ?? null,
    });
  }

  destroy(): void {
    if (
      this.#state === ARENA_PRESENTATION_SESSION_STATE.DESTROYED
      && !this.#cleanupIncomplete
    ) return;
    this.#destroyRequested = true;
    if (this.#processingFrame) return;
    const errors = this.#cleanupResources();
    this.#state = ARENA_PRESENTATION_SESSION_STATE.DESTROYED;
    const failure = cleanupFailure(errors);
    if (failure) {
      this.#lastError = failure;
      throw failure;
    }
  }
}

export function createArenaGame(platform: unknown, options?: unknown): ArenaPresentationSession {
  return new ArenaPresentationSession(platform, options);
}
