import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_PRESENTATION_SESSION_STATE,
  ArenaPresentationSession,
} from '@number-strategy-jump/arena-v1-greybox-session';

type FrameCallback = (timestamp: number) => void;
type LifecycleName = 'resize' | 'hide' | 'show';
type LifecycleCallback = () => void;
type CanvasEvent = Readonly<{ preventDefault?: () => void }>;
type CanvasCallback = (event: CanvasEvent) => unknown;
type PointerEvent = Readonly<{ pointerId: number; x: number; y: number }>;

interface InputCallbacks {
  readonly onStart: (event: PointerEvent) => boolean;
  readonly onEnd: (event: PointerEvent) => boolean;
}

interface PlatformHarnessOptions {
  readonly failBinding?: LifecycleName | 'input' | null;
  readonly failCanvasCleanupOnce?: boolean;
}

interface TestCanvas {
  width: number;
  height: number;
  style: Record<string, unknown>;
  getContext: () => object;
  addEventListener: (type: string, callback: CanvasCallback) => void;
  removeEventListener: (type: string, callback: CanvasCallback) => void;
}

function required<T>(value: T | null | undefined, name: string): T {
  assert.ok(value != null, `${name} 不存在。`);
  return value;
}

function record(value: unknown, name: string): Readonly<Record<string, unknown>> {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value), `${name} 必须是对象。`);
  return value as Readonly<Record<string, unknown>>;
}

function platformHarness({
  failBinding = null,
  failCanvasCleanupOnce = false,
}: PlatformHarnessOptions = {}) {
  let nextFrameToken = 1;
  const frames = new Map<number, FrameCallback>();
  const lifecycle = {
    resize: new Set<LifecycleCallback>(),
    hide: new Set<LifecycleCallback>(),
    show: new Set<LifecycleCallback>(),
  };
  const canvasListeners = new Map<string, Set<CanvasCallback>>();
  let canvasCleanupAttempts = 0;
  let input: InputCallbacks | null = null;
  let now = 0;
  const canvas: TestCanvas = {
    width: 400,
    height: 800,
    style: {},
    getContext: () => ({}),
    addEventListener(type: string, callback: CanvasCallback) {
      let listeners = canvasListeners.get(type);
      if (!listeners) {
        listeners = new Set();
        canvasListeners.set(type, listeners);
      }
      listeners.add(callback);
    },
    removeEventListener(type: string, callback: CanvasCallback) {
      canvasCleanupAttempts += 1;
      if (failCanvasCleanupOnce && canvasCleanupAttempts === 1) {
        throw new Error('canvas cleanup failed once');
      }
      canvasListeners.get(type)?.delete(callback);
    },
  };
  const bindLifecycle = (name: LifecycleName, callback: LifecycleCallback) => {
    if (failBinding === name) throw new Error(`${name} binding failed`);
    lifecycle[name].add(callback);
    return () => { lifecycle[name].delete(callback); };
  };
  return {
    canvas,
    frames,
    lifecycle,
    canvasListeners,
    get input() { return input; },
    platform: {
      id: 'test',
      createCanvas: () => canvas,
      getViewport: () => ({ width: 400, height: 800, pixelRatio: 1, safeArea: null }),
      requestFrame(callback: FrameCallback) {
        const token = nextFrameToken;
        nextFrameToken += 1;
        frames.set(token, callback);
        return token;
      },
      cancelFrame(token: number) { frames.delete(token); },
      now: () => now,
      bindInput(callbacks: InputCallbacks) {
        if (failBinding === 'input') throw new Error('input binding failed');
        input = callbacks;
        return () => { if (input === callbacks) input = null; };
      },
      onResize: (callback: LifecycleCallback) => bindLifecycle('resize', callback),
      onHide: (callback: LifecycleCallback) => bindLifecycle('hide', callback),
      onShow: (callback: LifecycleCallback) => bindLifecycle('show', callback),
    },
    fireFrame(timestamp = now + 1000 / 60) {
      const entry = frames.entries().next().value;
      if (!entry) throw new Error('没有待执行帧。');
      const [token, callback] = entry;
      frames.delete(token);
      now = timestamp;
      callback(timestamp);
    },
    emitLifecycle(name: LifecycleName) {
      for (const callback of [...lifecycle[name]]) callback();
    },
    emitCanvas(type: string, event: CanvasEvent = {}) {
      for (const callback of [...(canvasListeners.get(type) ?? [])]) callback(event);
    },
    activeLifecycleCount() {
      return Object.values(lifecycle).reduce((sum, values) => sum + values.size, 0);
    },
    activeCanvasCount() {
      return [...canvasListeners.values()].reduce((sum, values) => sum + values.size, 0);
    },
    get canvasCleanupAttempts() { return canvasCleanupAttempts; },
  };
}

type RenderObserver = (frame: unknown, options: unknown) => void;

interface RendererHarnessOptions {
  readonly loadPromise?: Promise<unknown> | null;
  readonly onRender?: RenderObserver | null;
}

interface RendererHarness {
  frames: unknown[];
  renderOptions: unknown[];
  resizeCount: number;
  disposed: boolean;
  contextLost: boolean;
  load: () => Promise<RendererHarness>;
  resize: () => boolean;
  render: (frame: unknown, options: unknown) => unknown;
  getInputViewport: () => Readonly<{ width: number; height: number }>;
  hitTestRematch: (point: Readonly<{ x: number; y: number }>) => boolean;
  handleContextLost: (event?: CanvasEvent) => unknown;
  handleContextRestored: () => unknown;
  getDebugSnapshot: () => Readonly<{ disposed: boolean; frameCount: number }>;
  dispose: () => void;
}

function rendererHarness({ loadPromise = null, onRender = null }: RendererHarnessOptions = {}) {
  const renderer: RendererHarness = {
    frames: [],
    renderOptions: [],
    resizeCount: 0,
    disposed: false,
    contextLost: false,
    async load() {
      if (loadPromise) await loadPromise;
      return this;
    },
    resize() { this.resizeCount += 1; return true; },
    render(frame: unknown, options: unknown) {
      this.frames.push(frame);
      this.renderOptions.push(options);
      onRender?.(frame, options);
      return !this.contextLost;
    },
    getInputViewport: () => ({ width: 400, height: 800 }),
    hitTestRematch: ({ x, y }: Readonly<{ x: number; y: number }>) => (
      x >= 120 && x <= 280 && y >= 350 && y <= 500
    ),
    handleContextLost(event?: CanvasEvent) {
      event?.preventDefault?.();
      this.contextLost = true;
      return true;
    },
    handleContextRestored() {
      if (!this.contextLost) return false;
      this.contextLost = false;
      return true;
    },
    getDebugSnapshot() {
      return { disposed: this.disposed, frameCount: this.frames.length };
    },
    dispose() { this.disposed = true; },
  };
  return renderer;
}

function sessionOptions(
  renderer: RendererHarness,
  overrides: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, unknown>> {
  return {
    initialSeed: 6_503,
    matchingDurationSeconds: 0,
    rendererFactory: () => renderer,
    matchConfig: {
      preparingTicks: 0,
      suddenDeathStartTick: 2,
      hardLimitTicks: 3,
    },
    ...overrides,
  };
}

function fireUntil(
  harness: ReturnType<typeof platformHarness>,
  predicate: () => boolean,
  limit = 30,
) {
  for (let index = 0; index < limit; index += 1) {
    if (predicate()) return index;
    harness.fireFrame((index + 1) * (1000 / 60));
  }
  throw new Error('状态未在限制帧数内到达。');
}

test('ArenaPresentationSession closes match → result → rematch without rebinding resources', async () => {
  const harness = platformHarness();
  const renderer = rendererHarness();
  const session = new ArenaPresentationSession(
    harness.platform,
    sessionOptions(renderer),
  );
  await session.start();
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.MATCHING);
  assert.equal(harness.frames.size, 1);
  assert.equal(harness.activeLifecycleCount(), 3);
  assert.equal(harness.activeCanvasCount(), 2);
  const initialInput = required(harness.input, '已绑定输入');
  const firstFrame = record(required(renderer.frames[0], '首个渲染帧'), '首个渲染帧');
  const world = record(firstFrame.world, '首个渲染帧.world');
  assert.ok(Array.isArray(world.participants), '首个渲染帧.participants 必须是数组。');
  const opponent = record(required(world.participants[1], '对手表现'), '对手表现');
  const appearance = record(opponent.appearance, '对手表现.appearance');
  assert.match(
    String(appearance.modelAssetId),
    /wind-up-cube\.programmatic\.v1$/,
  );

  fireUntil(harness, () => session.state === ARENA_PRESENTATION_SESSION_STATE.RESULT);
  const resultFrame = required(session.getLastPresentationFrame(), '结果表现帧');
  assert.equal(resultFrame.phase, 'ended');
  assert.equal(JSON.stringify(resultFrame).includes('difficulty'), false);
  assert.doesNotMatch(JSON.stringify(resultFrame), /"(?:bot|botProfile|difficultyId)"/i);
  const firstSnapshot = record(session.getDebugSnapshot().snapshot, '首局调试快照');
  const firstSeed = firstSnapshot.matchSeed;
  const bindingsBefore = {
    lifecycle: harness.activeLifecycleCount(),
    canvas: harness.activeCanvasCount(),
  };

  initialInput.onStart({ pointerId: 1, x: 200, y: 420 });
  initialInput.onEnd({ pointerId: 1, x: 200, y: 420 });
  assert.equal(session.getDebugSnapshot().pendingRematch, true);
  harness.fireFrame();
  assert.equal(session.getDebugSnapshot().matchCount, 2);
  assert.notEqual(record(session.getDebugSnapshot().snapshot, '次局调试快照').matchSeed, firstSeed);
  assert.deepEqual({
    lifecycle: harness.activeLifecycleCount(),
    canvas: harness.activeCanvasCount(),
  }, bindingsBefore);
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.RUNNING);

  const tickBeforeHide = record(session.getDebugSnapshot().snapshot, '隐藏前调试快照').tick;
  const staleFrame = required(harness.frames.values().next().value, '隐藏前待执行帧');
  harness.emitLifecycle('hide');
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.PAUSED);
  assert.equal(harness.frames.size, 0);
  staleFrame(500);
  assert.equal(record(session.getDebugSnapshot().snapshot, '隐藏后调试快照').tick, tickBeforeHide);
  harness.emitLifecycle('show');
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.RUNNING);
  assert.equal(harness.frames.size, 1);

  let prevented = false;
  harness.emitCanvas('webglcontextlost', { preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.PAUSED);
  assert.equal(harness.frames.size, 0);
  harness.emitCanvas('webglcontextrestored');
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.RUNNING);
  assert.equal(harness.frames.size, 1);

  const resizeBefore = renderer.resizeCount;
  harness.emitLifecycle('resize');
  assert.equal(renderer.resizeCount, resizeBefore + 1);
  const staleInput = required(harness.input, '销毁前输入');
  session.destroy();
  session.destroy();
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.DESTROYED);
  assert.equal(harness.frames.size, 0);
  assert.equal(harness.activeLifecycleCount(), 0);
  assert.equal(harness.activeCanvasCount(), 0);
  assert.equal(harness.input, null);
  assert.equal(renderer.disposed, true);
  assert.equal(staleInput.onStart({ pointerId: 9, x: 200, y: 420 }), false);
});

test('ArenaPresentationSession exposes a read-only progress signal and explicit pause ownership', async () => {
  const harness = platformHarness();
  const renderer = rendererHarness();
  const progress: Readonly<Record<string, unknown>>[] = [];
  const session = new ArenaPresentationSession(
    harness.platform,
    sessionOptions(renderer, {
      onMatchProgress(value: unknown) {
        progress.push(record(value, '对局进度'));
      },
    }),
  );
  await session.start();
  assert.equal(session.setPaused(true), true);
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.PAUSED);
  assert.equal(session.getDebugSnapshot().externallyPaused, true);
  assert.equal(harness.frames.size, 0);
  assert.equal(session.setPaused(true), false);
  assert.equal(session.setPaused(false), true);
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.MATCHING);
  assert.equal(harness.frames.size, 1);

  fireUntil(harness, () => session.state === ARENA_PRESENTATION_SESSION_STATE.RESULT);
  assert.ok(progress.length > 0);
  assert.equal(required(progress.at(-1), '最终对局进度').phase, 'ended');
  assert.throws(
    () => Object.assign(required(progress[0], '首个对局进度'), { tick: 999 }),
    /read only|Cannot assign/i,
  );
  session.destroy();
});

test('ArenaPresentationSession destroys a pending async start and ignores late completion', async () => {
  const harness = platformHarness();
  let resolveLoad!: () => void;
  const loadPromise = new Promise<void>((resolve) => { resolveLoad = resolve; });
  const renderer = rendererHarness({ loadPromise });
  const session = new ArenaPresentationSession(
    harness.platform,
    sessionOptions(renderer),
  );
  const starting = session.start();
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.STARTING);
  session.destroy();
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.DESTROYED);
  assert.equal(renderer.disposed, true);
  resolveLoad();
  await assert.rejects(starting, /启动已取消/);
  assert.equal(harness.frames.size, 0);
  assert.equal(harness.activeLifecycleCount(), 0);
  assert.equal(harness.activeCanvasCount(), 0);
});

test('ArenaPresentationSession rolls back partial lifecycle binding failure', async () => {
  const harness = platformHarness({ failBinding: 'show' });
  const renderer = rendererHarness();
  const session = new ArenaPresentationSession(
    harness.platform,
    sessionOptions(renderer),
  );
  await assert.rejects(session.start(), /show binding failed/);
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.FAILED);
  assert.equal(harness.activeLifecycleCount(), 0);
  assert.equal(harness.activeCanvasCount(), 0);
  assert.equal(harness.input, null);
  assert.equal(harness.frames.size, 0);
  assert.equal(renderer.disposed, true);
  session.destroy();
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.DESTROYED);
});

test('ArenaPresentationSession retains Canvas cleanup ownership until retry succeeds', async () => {
  const harness = platformHarness({ failCanvasCleanupOnce: true });
  const renderer = rendererHarness();
  const session = new ArenaPresentationSession(harness.platform, sessionOptions(renderer));
  await session.start();
  assert.throws(() => session.destroy(), /清理未完整完成/);
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.DESTROYED);
  assert.equal(session.getDebugSnapshot().cleanupIncomplete, true);
  assert.equal(session.getDebugSnapshot().bindingCount, 1);
  assert.equal(harness.activeCanvasCount(), 1);
  assert.equal(harness.canvasCleanupAttempts, 2);

  session.destroy();
  assert.equal(session.getDebugSnapshot().cleanupIncomplete, false);
  assert.equal(session.getDebugSnapshot().bindingCount, 0);
  assert.equal(harness.activeCanvasCount(), 0);
  assert.equal(harness.canvasCleanupAttempts, 3);
});

test('ArenaPresentationSession defers destroy requested from inside Renderer.render', async () => {
  const harness = platformHarness();
  const sessionOwner: { value?: ArenaPresentationSession } = {};
  let destroyOnNextRender = false;
  const renderer = rendererHarness({
    onRender: () => {
      if (!destroyOnNextRender) return;
      destroyOnNextRender = false;
      required(sessionOwner.value, '渲染期会话').destroy();
    },
  });
  const session = new ArenaPresentationSession(harness.platform, sessionOptions(renderer));
  sessionOwner.value = session;
  await session.start();
  destroyOnNextRender = true;
  harness.fireFrame(16);
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.DESTROYED);
  assert.equal(renderer.disposed, true);
  assert.equal(harness.frames.size, 0);
  assert.equal(harness.activeLifecycleCount(), 0);
});

test('ArenaPresentationSession defers host input failure raised during Renderer.render', async () => {
  const harness = platformHarness();
  let injectBrokenInput = false;
  const renderer = rendererHarness({
    onRender: () => {
      if (!injectBrokenInput) return;
      injectBrokenInput = false;
      required(harness.input, '渲染期输入').onStart({ pointerId: Number.NaN, x: 10, y: 10 });
    },
  });
  const session = new ArenaPresentationSession(harness.platform, sessionOptions(renderer));
  await session.start();
  injectBrokenInput = true;
  harness.fireFrame(16);

  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.FAILED);
  assert.equal(session.getDebugSnapshot().deferredFailureCleanup, false);
  assert.equal(renderer.disposed, true);
  assert.equal(harness.frames.size, 0);
  assert.equal(harness.activeLifecycleCount(), 0);
  assert.equal(harness.activeCanvasCount(), 0);
  assert.equal(harness.input, null);
  session.destroy();
});

test('ArenaPresentationSession retries a lifecycle cleanup that failed once', async () => {
  const harness = platformHarness();
  const bindShow = harness.platform.onShow;
  let showCleanupAttempts = 0;
  harness.platform.onShow = (callback: LifecycleCallback) => {
    const cleanup = bindShow(callback);
    return () => {
      showCleanupAttempts += 1;
      if (showCleanupAttempts === 1) throw new Error('show cleanup failed once');
      cleanup();
    };
  };
  const renderer = rendererHarness();
  const session = new ArenaPresentationSession(harness.platform, sessionOptions(renderer));
  await session.start();

  assert.throws(() => session.destroy(), /清理未完整完成/);
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.DESTROYED);
  assert.equal(session.getDebugSnapshot().cleanupIncomplete, true);
  assert.equal(session.getDebugSnapshot().bindingCount, 1);
  assert.equal(harness.activeLifecycleCount(), 1);

  session.destroy();
  assert.equal(showCleanupAttempts, 2);
  assert.equal(session.getDebugSnapshot().cleanupIncomplete, false);
  assert.equal(session.getDebugSnapshot().bindingCount, 0);
  assert.equal(harness.activeLifecycleCount(), 0);
});

test('ArenaPresentationSession rejects renderer method accessors without execution and disposes ownership', async () => {
  const harness = platformHarness();
  const renderer = rendererHarness();
  let reads = 0;
  Object.defineProperty(renderer, 'render', {
    configurable: true,
    get() {
      reads += 1;
      return () => true;
    },
  });
  const session = new ArenaPresentationSession(harness.platform, sessionOptions(renderer));

  await assert.rejects(session.start(), /render 必须是数据方法/);
  assert.equal(reads, 0);
  assert.equal(renderer.disposed, true);
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.FAILED);
  assert.equal(harness.frames.size, 0);
  assert.equal(harness.activeLifecycleCount(), 0);
  assert.equal(harness.activeCanvasCount(), 0);
  session.destroy();
});

test('ArenaPresentationSession rolls back a Canvas listener that throws after registration', async () => {
  const harness = platformHarness();
  const renderer = rendererHarness();
  const addEventListener = harness.canvas.addEventListener;
  harness.canvas.addEventListener = function addThenThrow(type, callback) {
    addEventListener.call(this, type, callback);
    throw new Error('canvas add failed after mutation');
  };
  const session = new ArenaPresentationSession(harness.platform, sessionOptions(renderer));

  await assert.rejects(session.start(), /canvas add failed after mutation/);
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.FAILED);
  assert.equal(renderer.disposed, true);
  assert.equal(harness.frames.size, 0);
  assert.equal(harness.activeLifecycleCount(), 0);
  assert.equal(harness.activeCanvasCount(), 0);
  assert.equal(harness.input, null);
  session.destroy();
});

test('ArenaPresentationSession rejects an async non-load lifecycle before publishing success', async () => {
  const harness = platformHarness();
  const renderer = rendererHarness();
  let destroyCount = 0;
  const session = new ArenaPresentationSession(harness.platform, sessionOptions(renderer, {
    inputAdapterFactory: () => ({
      async start() {},
      destroy() { destroyCount += 1; },
    }),
  }));

  await assert.rejects(session.start(), /inputAdapter\.start 必须同步完成/);
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.FAILED);
  assert.equal(destroyCount, 1);
  assert.equal(renderer.disposed, true);
  assert.equal(harness.frames.size, 0);
  assert.equal(harness.activeLifecycleCount(), 0);
  assert.equal(harness.activeCanvasCount(), 0);
  session.destroy();
});

test('ArenaPresentationSession fails closed when context restoration becomes asynchronous', async () => {
  const harness = platformHarness();
  const renderer = rendererHarness();
  renderer.handleContextRestored = async () => true;
  const session = new ArenaPresentationSession(harness.platform, sessionOptions(renderer));
  await session.start();

  harness.emitCanvas('webglcontextlost');
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.PAUSED);
  harness.emitCanvas('webglcontextrestored');

  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.FAILED);
  assert.equal(renderer.disposed, true);
  assert.equal(harness.frames.size, 0);
  assert.equal(harness.activeLifecycleCount(), 0);
  assert.equal(harness.activeCanvasCount(), 0);
  assert.equal(harness.input, null);
  session.destroy();
});
