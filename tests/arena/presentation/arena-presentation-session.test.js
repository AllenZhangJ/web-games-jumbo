import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_PRESENTATION_SESSION_STATE,
  ArenaPresentationSession,
} from '../../../src/arena/presentation/session/arena-presentation-session.js';

function platformHarness({ failBinding = null, failCanvasCleanupOnce = false } = {}) {
  let nextFrameToken = 1;
  const frames = new Map();
  const lifecycle = {
    resize: new Set(),
    hide: new Set(),
    show: new Set(),
  };
  const canvasListeners = new Map();
  let canvasCleanupAttempts = 0;
  let input = null;
  let now = 0;
  const canvas = {
    width: 400,
    height: 800,
    style: {},
    getContext: () => ({}),
    addEventListener(type, callback) {
      let listeners = canvasListeners.get(type);
      if (!listeners) {
        listeners = new Set();
        canvasListeners.set(type, listeners);
      }
      listeners.add(callback);
    },
    removeEventListener(type, callback) {
      canvasCleanupAttempts += 1;
      if (failCanvasCleanupOnce && canvasCleanupAttempts === 1) {
        throw new Error('canvas cleanup failed once');
      }
      canvasListeners.get(type)?.delete(callback);
    },
  };
  const bindLifecycle = (name, callback) => {
    if (failBinding === name) throw new Error(`${name} binding failed`);
    lifecycle[name].add(callback);
    return () => lifecycle[name].delete(callback);
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
      requestFrame(callback) {
        const token = nextFrameToken;
        nextFrameToken += 1;
        frames.set(token, callback);
        return token;
      },
      cancelFrame(token) { frames.delete(token); },
      now: () => now,
      bindInput(callbacks) {
        if (failBinding === 'input') throw new Error('input binding failed');
        input = callbacks;
        return () => { if (input === callbacks) input = null; };
      },
      onResize: (callback) => bindLifecycle('resize', callback),
      onHide: (callback) => bindLifecycle('hide', callback),
      onShow: (callback) => bindLifecycle('show', callback),
    },
    fireFrame(timestamp = now + 1000 / 60) {
      const [token, callback] = frames.entries().next().value ?? [];
      if (!callback) throw new Error('没有待执行帧。');
      frames.delete(token);
      now = timestamp;
      callback(timestamp);
    },
    emitLifecycle(name) {
      for (const callback of [...lifecycle[name]]) callback();
    },
    emitCanvas(type, event = {}) {
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

function rendererHarness({ loadPromise = null, onRender = null } = {}) {
  const renderer = {
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
    render(frame, options) {
      this.frames.push(frame);
      this.renderOptions.push(options);
      onRender?.(frame, options);
      return !this.contextLost;
    },
    getInputViewport: () => ({ width: 400, height: 800 }),
    hitTestRematch: ({ x, y }) => x >= 120 && x <= 280 && y >= 350 && y <= 500,
    handleContextLost(event) {
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

function sessionOptions(renderer, overrides = {}) {
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

function fireUntil(harness, predicate, limit = 30) {
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
  assert.ok(harness.input);
  assert.match(
    renderer.frames[0].world.participants[1].appearance.modelAssetId,
    /wind-up-cube\.programmatic\.v1$/,
  );

  fireUntil(harness, () => session.state === ARENA_PRESENTATION_SESSION_STATE.RESULT);
  const resultFrame = session.getLastPresentationFrame();
  assert.equal(resultFrame.phase, 'ended');
  assert.equal(JSON.stringify(resultFrame).includes('difficulty'), false);
  assert.doesNotMatch(JSON.stringify(resultFrame), /"(?:bot|botProfile|difficultyId)"/i);
  const firstSeed = session.getDebugSnapshot().snapshot.matchSeed;
  const bindingsBefore = {
    lifecycle: harness.activeLifecycleCount(),
    canvas: harness.activeCanvasCount(),
  };

  harness.input.onStart({ pointerId: 1, x: 200, y: 420 });
  harness.input.onEnd({ pointerId: 1, x: 200, y: 420 });
  assert.equal(session.getDebugSnapshot().pendingRematch, true);
  harness.fireFrame();
  assert.equal(session.getDebugSnapshot().matchCount, 2);
  assert.notEqual(session.getDebugSnapshot().snapshot.matchSeed, firstSeed);
  assert.deepEqual({
    lifecycle: harness.activeLifecycleCount(),
    canvas: harness.activeCanvasCount(),
  }, bindingsBefore);
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.RUNNING);

  const tickBeforeHide = session.getDebugSnapshot().snapshot.tick;
  const staleFrame = harness.frames.values().next().value;
  harness.emitLifecycle('hide');
  assert.equal(session.state, ARENA_PRESENTATION_SESSION_STATE.PAUSED);
  assert.equal(harness.frames.size, 0);
  staleFrame(500);
  assert.equal(session.getDebugSnapshot().snapshot.tick, tickBeforeHide);
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
  const staleInput = harness.input;
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
  const progress = [];
  const session = new ArenaPresentationSession(
    harness.platform,
    sessionOptions(renderer, {
      onMatchProgress(value) {
        progress.push(value);
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
  assert.equal(progress.at(-1).phase, 'ended');
  assert.throws(() => { progress[0].tick = 999; }, /read only|Cannot assign/i);
  session.destroy();
});

test('ArenaPresentationSession destroys a pending async start and ignores late completion', async () => {
  const harness = platformHarness();
  let resolveLoad;
  const loadPromise = new Promise((resolve) => { resolveLoad = resolve; });
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
  let session;
  let destroyOnNextRender = false;
  const renderer = rendererHarness({
    onRender: () => {
      if (!destroyOnNextRender) return;
      destroyOnNextRender = false;
      session.destroy();
    },
  });
  session = new ArenaPresentationSession(harness.platform, sessionOptions(renderer));
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
      harness.input.onStart({ pointerId: Number.NaN, x: 10, y: 10 });
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
  harness.platform.onShow = (callback) => {
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
