import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCT_SESSION_STATE } from '@number-strategy-jump/arena-product-state';
import {
  PRODUCT_INPUT_ROUTER_MODE,
  ProductPresentationFlow,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT,
  ARENA_V1_PRODUCT_PRESENTATION_CONTENT,
  projectArenaPresentationFrame,
} from '@number-strategy-jump/arena-v1-presentation-content';
import {
  ARENA_V1_PRESENTATION_QUALITY_ID,
  ARENA_V1_PRESENTATION_QUALITY_REGISTRY,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  PRODUCT_PRESENTATION_SESSION_STATE,
} from '@number-strategy-jump/arena-product-presentation';
import {
  createProductPresentationSession,
} from '../../../src/arena/presentation/session/product-presentation-session-composition.js';

function platformHarness({
  failBinding = null,
  emitOnBind = null,
  failInputCleanupOnce = false,
  failCanvasCleanupOnce = false,
} = {}) {
  let nextFrameToken = 1;
  let now = 0;
  let wallNow = 10_000;
  let input = null;
  let inputCleanupAttempts = 0;
  let canvasCleanupAttempts = 0;
  const frames = new Map();
  const storage = new Map();
  const lifecycle = {
    resize: new Set(),
    hide: new Set(),
    show: new Set(),
  };
  const canvasListeners = new Map();
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
    if (emitOnBind === name) callback();
    return () => lifecycle[name].delete(callback);
  };
  const platform = {
    id: 'product-session-test',
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
    wallNow: () => wallNow,
    bindInput(callbacks) {
      if (failBinding === 'input') throw new Error('input binding failed');
      input = callbacks;
      return () => {
        inputCleanupAttempts += 1;
        if (failInputCleanupOnce && inputCleanupAttempts === 1) {
          throw new Error('input cleanup failed once');
        }
        if (input === callbacks) input = null;
      };
    },
    onResize: (callback) => bindLifecycle('resize', callback),
    onHide: (callback) => bindLifecycle('hide', callback),
    onShow: (callback) => bindLifecycle('show', callback),
    storageRead(key) {
      return storage.has(key)
        ? { ok: true, found: true, value: structuredClone(storage.get(key)) }
        : { ok: true, found: false, value: undefined };
    },
    storageWrite(key, value) {
      storage.set(key, structuredClone(value));
      return true;
    },
    storageDelete(key) {
      storage.delete(key);
      return true;
    },
  };
  return {
    canvas,
    canvasListeners,
    frames,
    lifecycle,
    platform,
    get input() { return input; },
    get inputCleanupAttempts() { return inputCleanupAttempts; },
    get canvasCleanupAttempts() { return canvasCleanupAttempts; },
    fireFrame(timestamp = now + 1000 / 60) {
      const [token, callback] = frames.entries().next().value ?? [];
      if (!callback) throw new Error('没有待执行 Product 帧。');
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
    tap(x, y = 650, pointerId = 1) {
      if (!input) throw new Error('Product input 尚未绑定。');
      input.onStart({ x, y, pointerId });
      input.onEnd({ x, y, pointerId });
    },
    advanceWall(milliseconds) { wallNow += milliseconds; },
    activeLifecycleCount() {
      return Object.values(lifecycle).reduce((sum, values) => sum + values.size, 0);
    },
    activeCanvasCount() {
      return [...canvasListeners.values()].reduce((sum, values) => sum + values.size, 0);
    },
  };
}

function rendererHarness({
  loadPromise = null,
  disposeFailures = 0,
  resizeFailures = 0,
  onRender = null,
  performanceSnapshot = null,
} = {}) {
  let remainingDisposeFailures = disposeFailures;
  let remainingResizeFailures = resizeFailures;
  return {
    frames: [],
    options: [],
    resizeCount: 0,
    performanceReadCount: 0,
    disposeAttempts: 0,
    disposed: false,
    contextLost: false,
    async load() {
      if (loadPromise) await loadPromise;
      return this;
    },
    render(frame, options) {
      this.frames.push(frame);
      this.options.push(options);
      onRender?.(frame, options);
      return !this.contextLost;
    },
    resize() {
      this.resizeCount += 1;
      if (remainingResizeFailures > 0) {
        remainingResizeFailures -= 1;
        return false;
      }
      return true;
    },
    getInputViewport: () => ({ width: 400, height: 800 }),
    hitTestUi(point, viewport, viewModel) {
      if (!viewModel?.inputEnabled) return null;
      const action = point.x < viewport.width / 2
        ? viewModel.screen.primaryAction
        : viewModel.screen.secondaryAction;
      return action?.enabled ? action.intent : null;
    },
    bindUiIntent(handlers) {
      this.uiIntentHandlers = handlers;
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        if (this.uiIntentHandlers === handlers) this.uiIntentHandlers = null;
      };
    },
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
    getPerformanceSnapshot() {
      this.performanceReadCount += 1;
      return performanceSnapshot;
    },
    dispose() {
      this.disposeAttempts += 1;
      if (remainingDisposeFailures > 0) {
        remainingDisposeFailures -= 1;
        throw new Error('renderer dispose failed once');
      }
      this.disposed = true;
    },
  };
}

let sessionSequence = 0;

function sessionOptions(renderer, overrides = {}) {
  sessionSequence += 1;
  return {
    ownerId: `product-presentation-session-${sessionSequence}`,
    keyPrefix: `test.product-presentation-session.${sessionSequence}`,
    initialSeed: 41_000 + sessionSequence * 10,
    rendererFactory: () => renderer,
    matchConfig: {
      preparingTicks: 0,
      suddenDeathStartTick: 3,
      hardLimitTicks: 6,
    },
    ...overrides,
  };
}

async function settleUntil(predicate, limit = 80) {
  for (let index = 0; index < limit; index += 1) {
    if (predicate()) return index;
    await Promise.resolve();
  }
  throw new Error('异步 Product 状态未在限制内到达。');
}

function fireUntil(harness, predicate, limit = 40) {
  for (let index = 0; index < limit; index += 1) {
    if (predicate()) return index;
    harness.fireFrame((index + 1) * (1000 / 60));
  }
  throw new Error('Product 状态未在限制帧数内到达。');
}

test('ProductPresentationSession closes UI tap → real match → reward → rematch with one host ownership graph', async () => {
  const harness = platformHarness();
  const renderer = rendererHarness();
  const session = createProductPresentationSession(
    harness.platform,
    sessionOptions(renderer),
  );
  await session.start();
  assert.equal(session.state, PRODUCT_PRESENTATION_SESSION_STATE.RUNNING);
  assert.equal(session.getLastSnapshot().viewModel.activeState, PRODUCT_SESSION_STATE.READY);
  assert.equal(session.getDebugSnapshot().input.mode, PRODUCT_INPUT_ROUTER_MODE.UI);
  assert.equal(harness.frames.size, 1);
  assert.equal(harness.activeLifecycleCount(), 3);
  assert.equal(harness.activeCanvasCount(), 2);

  harness.tap(100);
  await settleUntil(() => (
    session.getLastSnapshot()?.viewModel.activeState === PRODUCT_SESSION_STATE.IN_MATCH
  ));
  assert.equal(session.getDebugSnapshot().input.mode, PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY);
  const firstSeed = session.getLastSnapshot().matchFrame.source.matchSeed;
  fireUntil(harness, () => (
    session.getLastSnapshot().viewModel.activeState === PRODUCT_SESSION_STATE.REWARD
  ));
  const reward = session.getLastSnapshot();
  assert.equal(reward.viewModel.reward.committed, true);
  assert.equal(reward.viewModel.result !== null, true);
  assert.equal(reward.matchFrame.hud.result !== null, true);
  assert.equal(session.getDebugSnapshot().input.mode, PRODUCT_INPUT_ROUTER_MODE.UI);
  assert.doesNotMatch(JSON.stringify(reward), /difficulty|difficultyId|机器人|简单|普通|困难/i);

  const bindingCounts = {
    lifecycle: harness.activeLifecycleCount(),
    canvas: harness.activeCanvasCount(),
  };
  harness.tap(100, 650, 2);
  await settleUntil(() => (
    session.getLastSnapshot()?.viewModel.activeState === PRODUCT_SESSION_STATE.IN_MATCH
  ));
  assert.notEqual(session.getLastSnapshot().matchFrame.source.matchSeed, firstSeed);
  fireUntil(harness, () => (
    session.getLastSnapshot()?.viewModel.activeState === PRODUCT_SESSION_STATE.REWARD
  ));
  assert.equal(session.state, PRODUCT_PRESENTATION_SESSION_STATE.RUNNING);
  assert.equal(session.getLastSnapshot().viewModel.reward.committed, true);
  assert.deepEqual({
    lifecycle: harness.activeLifecycleCount(),
    canvas: harness.activeCanvasCount(),
  }, bindingCounts);
  assert.equal(session.getPerformanceSnapshot().observedMatchCount, 2);

  const staleInput = harness.input;
  session.destroy();
  session.destroy();
  assert.equal(session.state, PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED);
  assert.equal(harness.frames.size, 0);
  assert.equal(harness.activeLifecycleCount(), 0);
  assert.equal(harness.activeCanvasCount(), 0);
  assert.equal(harness.input, null);
  assert.equal(renderer.disposed, true);
  assert.equal(staleInput.onStart({ pointerId: 8, x: 1, y: 1 }), false);
});

test('30 FPS presentation pacing preserves the same 60 Hz authority frames as high quality', async () => {
  async function run(qualityId) {
    const harness = platformHarness();
    const renderer = rendererHarness({ performanceSnapshot: {} });
    const session = createProductPresentationSession(harness.platform, sessionOptions(renderer, {
      initialSeed: 77_001,
      qualityDefinition: ARENA_V1_PRESENTATION_QUALITY_REGISTRY.require(qualityId),
      matchConfig: {
        preparingTicks: 0,
        suddenDeathStartTick: 120,
        hardLimitTicks: 180,
      },
    }));
    await session.start();
    harness.tap(100);
    await settleUntil(() => (
      session.getLastSnapshot()?.viewModel.activeState === PRODUCT_SESSION_STATE.IN_MATCH
    ));
    const rendersBeforeFrames = renderer.frames.length;
    const performanceReadsBeforeFrames = renderer.performanceReadCount;
    for (let index = 1; index <= 8; index += 1) {
      harness.fireFrame(index * (1000 / 60));
    }
    const result = {
      frame: structuredClone(session.getLastSnapshot().matchFrame),
      runtimeRenderCount: renderer.frames.length - rendersBeforeFrames,
      performance: session.finishPerformanceCapture(),
      performanceReadCount: renderer.performanceReadCount - performanceReadsBeforeFrames,
    };
    session.destroy();
    return result;
  }

  const high = await run(ARENA_V1_PRESENTATION_QUALITY_ID.HIGH);
  const low = await run(ARENA_V1_PRESENTATION_QUALITY_ID.LOW);
  assert.deepEqual(low.frame, high.frame);
  assert.equal(high.frame.source.tick, 7);
  assert.equal(high.runtimeRenderCount, 7);
  assert.equal(low.runtimeRenderCount, 3);
  assert.equal(high.performance.observerErrorCount, 0);
  assert.equal(low.performance.observerErrorCount, 0);
  assert.equal(low.performance.probe.state, 'stopped');
  assert.equal(low.performance.probe.observedFrameCount, 8);
  assert.equal(low.performance.probe.frames.filter(({ rendered }) => rendered).length, 3);
  assert.ok(high.performanceReadCount < high.runtimeRenderCount);
  assert.ok(low.performanceReadCount < low.runtimeRenderCount);
});

test('ProductPresentationSession records injected memory evidence without giving the observer lifecycle ownership', async () => {
  const harness = platformHarness();
  const renderer = rendererHarness({
    performanceSnapshot: {
      drawCalls: 4,
      triangles: 100,
      points: 0,
      lines: 0,
      programs: 2,
      geometries: 8,
      textures: 3,
      jsHeapBytes: null,
      processMemoryBytes: null,
    },
  });
  const session = createProductPresentationSession(harness.platform, sessionOptions(renderer, {
    performanceMemoryProvider: () => ({
      jsHeapBytes: 12_345,
      processMemoryBytes: 67_890,
    }),
  }));
  await session.start();
  harness.fireFrame();
  harness.fireFrame();
  const capture = session.finishPerformanceCapture();
  assert.equal(capture.observerErrorCount, 0);
  assert.equal(capture.probe.resources[0].drawCalls, 4);
  assert.equal(capture.probe.resources[0].jsHeapBytes, 12_345);
  assert.equal(capture.probe.resources[0].processMemoryBytes, 67_890);
  session.destroy();

  const failingHarness = platformHarness();
  const failingSession = createProductPresentationSession(
    failingHarness.platform,
    sessionOptions(rendererHarness(), {
      performanceMemoryProvider: () => ({ unknownBytes: 1 }),
    }),
  );
  await failingSession.start();
  failingHarness.fireFrame();
  failingHarness.fireFrame();
  assert.equal(failingSession.state, PRODUCT_PRESENTATION_SESSION_STATE.RUNNING);
  assert.ok(failingSession.getPerformanceSnapshot().observerErrorCount > 0);
  failingSession.destroy();
});

test('ProductPresentationSession pauses authority across hide/show and WebGL context loss without catch-up', async () => {
  const harness = platformHarness();
  const renderer = rendererHarness();
  const session = createProductPresentationSession(harness.platform, sessionOptions(renderer));
  await session.start();
  harness.tap(100);
  await settleUntil(() => session.getLastSnapshot().viewModel.activeState === PRODUCT_SESSION_STATE.IN_MATCH);
  harness.fireFrame(1000 / 60);
  harness.fireFrame(2000 / 60);
  const tickBeforeHide = session.getDebugSnapshot().matchTick;
  const staleFrame = harness.frames.values().next().value;
  harness.emitLifecycle('hide');
  assert.equal(session.state, PRODUCT_PRESENTATION_SESSION_STATE.PAUSED);
  assert.equal(session.getLastSnapshot().viewModel.suspended, true);
  assert.equal(harness.frames.size, 0);
  staleFrame(10_000);
  assert.equal(session.getDebugSnapshot().matchTick, tickBeforeHide);

  harness.emitLifecycle('show');
  assert.equal(session.state, PRODUCT_PRESENTATION_SESSION_STATE.RUNNING);
  assert.equal(session.getLastSnapshot().viewModel.suspended, false);
  harness.fireFrame(10_000);
  assert.equal(session.getDebugSnapshot().matchTick, tickBeforeHide);
  harness.fireFrame(10_020);
  assert.equal(session.getDebugSnapshot().matchTick, tickBeforeHide + 1);

  let prevented = false;
  harness.emitCanvas('webglcontextlost', { preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(session.state, PRODUCT_PRESENTATION_SESSION_STATE.PAUSED);
  assert.equal(harness.frames.size, 0);
  const resizeBefore = renderer.resizeCount;
  harness.emitCanvas('webglcontextrestored');
  assert.equal(session.state, PRODUCT_PRESENTATION_SESSION_STATE.RUNNING);
  assert.equal(renderer.resizeCount, resizeBefore + 1);
  assert.equal(harness.frames.size, 1);
  session.destroy();
});

test('ProductPresentationSession checks lease before foreground resume and blocks an expired match', async () => {
  const harness = platformHarness();
  const renderer = rendererHarness();
  const session = createProductPresentationSession(harness.platform, sessionOptions(renderer));
  await session.start();
  harness.tap(100);
  await settleUntil(() => session.getLastSnapshot().viewModel.activeState === PRODUCT_SESSION_STATE.IN_MATCH);
  const tickBeforeHide = session.getDebugSnapshot().matchTick;
  harness.emitLifecycle('hide');
  harness.advanceWall(60_001);
  harness.emitLifecycle('show');

  const snapshot = session.getLastSnapshot();
  assert.equal(session.state, PRODUCT_PRESENTATION_SESSION_STATE.RUNNING);
  assert.equal(snapshot.viewModel.activeState, PRODUCT_SESSION_STATE.FATAL_ERROR);
  assert.equal(snapshot.viewModel.terminal, true);
  assert.equal(snapshot.viewModel.error.code, 'profile-save-failed');
  assert.equal(session.getDebugSnapshot().matchTick, tickBeforeHide);
  assert.equal(session.getDebugSnapshot().input.mode, PRODUCT_INPUT_ROUTER_MODE.INACTIVE);
  assert.equal(harness.frames.size, 0);
  session.destroy();
});

test('ProductPresentationSession serializes a synchronous hide binding with async boot', async () => {
  const harness = platformHarness({ emitOnBind: 'hide' });
  const renderer = rendererHarness();
  const session = createProductPresentationSession(harness.platform, sessionOptions(renderer));
  await session.start();
  assert.equal(session.state, PRODUCT_PRESENTATION_SESSION_STATE.PAUSED);
  assert.equal(session.getLastSnapshot().viewModel.activeState, PRODUCT_SESSION_STATE.READY);
  assert.equal(session.getLastSnapshot().viewModel.suspended, true);
  assert.equal(harness.frames.size, 0);

  harness.emitLifecycle('show');
  assert.equal(session.state, PRODUCT_PRESENTATION_SESSION_STATE.RUNNING);
  assert.equal(session.getLastSnapshot().viewModel.suspended, false);
  assert.equal(harness.frames.size, 1);
  session.destroy();

  const loadingHarness = platformHarness();
  let resolveLoad;
  const loadingRenderer = rendererHarness({
    loadPromise: new Promise((resolve) => { resolveLoad = resolve; }),
  });
  const loadingSession = createProductPresentationSession(
    loadingHarness.platform,
    sessionOptions(loadingRenderer),
  );
  const starting = loadingSession.start();
  assert.equal(loadingHarness.activeLifecycleCount(), 3);
  assert.equal(loadingHarness.activeCanvasCount(), 2);
  loadingHarness.emitLifecycle('hide');
  resolveLoad();
  await starting;
  assert.equal(loadingSession.state, PRODUCT_PRESENTATION_SESSION_STATE.PAUSED);
  assert.equal(loadingSession.getLastSnapshot().viewModel.suspended, true);
  assert.equal(loadingHarness.frames.size, 0);
  loadingSession.destroy();
});

test('ProductPresentationSession destroys a pending Renderer load and ignores late completion', async () => {
  const harness = platformHarness();
  let resolveLoad;
  const loadPromise = new Promise((resolve) => { resolveLoad = resolve; });
  const renderer = rendererHarness({ loadPromise });
  const session = createProductPresentationSession(harness.platform, sessionOptions(renderer));
  const starting = session.start();
  assert.equal(session.state, PRODUCT_PRESENTATION_SESSION_STATE.STARTING);
  session.destroy();
  assert.equal(session.state, PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED);
  assert.equal(renderer.disposed, true);
  resolveLoad();
  await assert.rejects(starting, /启动已取消/);
  assert.equal(harness.frames.size, 0);
  assert.equal(harness.activeLifecycleCount(), 0);
  assert.equal(harness.activeCanvasCount(), 0);
});

test('ProductPresentationSession rolls back partial lifecycle binding and invalid owned candidates', async () => {
  const bindingHarness = platformHarness({ failBinding: 'show' });
  const bindingRenderer = rendererHarness();
  const bindingSession = createProductPresentationSession(
    bindingHarness.platform,
    sessionOptions(bindingRenderer),
  );
  await assert.rejects(bindingSession.start(), /show binding failed/);
  assert.equal(bindingSession.state, PRODUCT_PRESENTATION_SESSION_STATE.FAILED);
  assert.equal(bindingHarness.activeLifecycleCount(), 0);
  assert.equal(bindingHarness.activeCanvasCount(), 0);
  assert.equal(bindingHarness.input, null);
  assert.equal(bindingRenderer.disposed, true);
  bindingSession.destroy();

  const resizeHarness = platformHarness();
  const resizeRenderer = rendererHarness({ resizeFailures: 1 });
  const resizeSession = createProductPresentationSession(
    resizeHarness.platform,
    sessionOptions(resizeRenderer),
  );
  await assert.rejects(resizeSession.start(), /Renderer resize 失败/);
  assert.equal(resizeRenderer.disposed, true);
  assert.equal(resizeHarness.activeLifecycleCount(), 0);
  assert.equal(resizeHarness.activeCanvasCount(), 0);
  resizeSession.destroy();

  const candidateHarness = platformHarness();
  const candidateRenderer = rendererHarness();
  let candidateDestroyCalls = 0;
  const candidateSession = createProductPresentationSession(
    candidateHarness.platform,
    sessionOptions(candidateRenderer, {
      controllerFactory: () => ({
        destroy() { candidateDestroyCalls += 1; },
      }),
    }),
  );
  await assert.rejects(candidateSession.start(), /controller 不符合合同/);
  assert.equal(candidateDestroyCalls, 1);
  assert.equal(candidateRenderer.disposed, true);
  assert.equal(candidateSession.state, PRODUCT_PRESENTATION_SESSION_STATE.FAILED);
  candidateSession.destroy();

  const probeHarness = platformHarness();
  const probeRenderer = rendererHarness();
  let probeDestroyCalls = 0;
  const probeSession = createProductPresentationSession(
    probeHarness.platform,
    sessionOptions(probeRenderer, {
      performanceProbeFactory: () => ({
        destroy() { probeDestroyCalls += 1; },
      }),
    }),
  );
  await assert.rejects(probeSession.start(), /performanceProbe 缺少 start/);
  assert.equal(probeDestroyCalls, 1);
  assert.equal(probeRenderer.disposed, false);
  assert.equal(probeSession.state, PRODUCT_PRESENTATION_SESSION_STATE.FAILED);
  probeSession.destroy();

  const retryHarness = platformHarness();
  const retryRenderer = rendererHarness();
  let retryDestroyCalls = 0;
  const retrySession = createProductPresentationSession(
    retryHarness.platform,
    sessionOptions(retryRenderer, {
      controllerFactory: () => ({
        destroy() {
          retryDestroyCalls += 1;
          if (retryDestroyCalls === 1) throw new Error('candidate cleanup failed once');
        },
      }),
    }),
  );
  await assert.rejects(retrySession.start(), /失败且清理未完整完成/);
  assert.equal(retrySession.state, PRODUCT_PRESENTATION_SESSION_STATE.FAILED);
  assert.equal(retrySession.getDebugSnapshot().cleanupIncomplete, true);
  assert.equal(retryDestroyCalls, 1);
  retrySession.destroy();
  assert.equal(retryDestroyCalls, 2);
  assert.equal(retrySession.getDebugSnapshot().cleanupIncomplete, false);
});

test('ProductPresentationSession fails closed on invalid host input and clears every resource', async () => {
  const harness = platformHarness();
  const renderer = rendererHarness();
  const session = createProductPresentationSession(harness.platform, sessionOptions(renderer));
  await session.start();
  assert.equal(harness.input.onStart({ pointerId: 1, x: Number.NaN, y: 2 }), false);
  assert.equal(session.state, PRODUCT_PRESENTATION_SESSION_STATE.FAILED);
  assert.equal(harness.frames.size, 0);
  assert.equal(harness.activeLifecycleCount(), 0);
  assert.equal(harness.activeCanvasCount(), 0);
  assert.equal(harness.input, null);
  assert.equal(renderer.disposed, true);
  session.destroy();
});

test('ProductPresentationSession rejects invalid UI races but closes on Flow infrastructure failure', async () => {
  const harness = platformHarness();
  const renderer = rendererHarness();
  const session = createProductPresentationSession(harness.platform, sessionOptions(renderer));
  await assert.rejects(session.dispatch({ id: 'boot' }), /尚未完成启动/);
  await session.start();
  await assert.rejects(session.dispatch({ id: 'continue-reward' }), /需要 reward/);
  assert.equal(session.state, PRODUCT_PRESENTATION_SESSION_STATE.RUNNING);
  session.destroy();

  const failedHarness = platformHarness();
  const failedRenderer = rendererHarness();
  const failedSession = createProductPresentationSession(
    failedHarness.platform,
    sessionOptions(failedRenderer, {
      flowFactory: (args) => new ProductPresentationFlow({
        ...args,
        presentationContent: ARENA_V1_PRODUCT_PRESENTATION_CONTENT,
        matchPresentationContent: ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT,
        frameProjector: projectArenaPresentationFrame,
        matchRuntimeFactory: () => ({ destroy() {} }),
      }),
    }),
  );
  await failedSession.start();
  await assert.rejects(
    failedSession.dispatch({ id: 'start-match' }),
    /matchRuntime 不符合合同/,
  );
  assert.equal(failedSession.state, PRODUCT_PRESENTATION_SESSION_STATE.FAILED);
  assert.equal(failedRenderer.disposed, true);
  assert.equal(failedHarness.frames.size, 0);
  assert.equal(failedHarness.activeLifecycleCount(), 0);
  failedSession.destroy();
});

test('ProductPresentationSession retries input and Renderer cleanup failures without double ownership', async () => {
  const inputHarness = platformHarness({ failInputCleanupOnce: true });
  const inputRenderer = rendererHarness();
  const inputSession = createProductPresentationSession(
    inputHarness.platform,
    sessionOptions(inputRenderer),
  );
  await inputSession.start();
  const staleInput = inputHarness.input;
  assert.throws(() => inputSession.destroy(), /清理未完整完成/);
  assert.equal(inputSession.state, PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED);
  assert.equal(inputSession.getDebugSnapshot().cleanupIncomplete, true);
  assert.equal(inputHarness.inputCleanupAttempts, 1);
  assert.equal(staleInput.onStart({ pointerId: 9, x: 1, y: 1 }), false);
  inputSession.destroy();
  assert.equal(inputHarness.inputCleanupAttempts, 2);
  assert.equal(inputHarness.input, null);
  assert.equal(inputSession.getDebugSnapshot().cleanupIncomplete, false);

  const rendererHarnessValue = platformHarness();
  const failingRenderer = rendererHarness({ disposeFailures: 1 });
  const rendererSession = createProductPresentationSession(
    rendererHarnessValue.platform,
    sessionOptions(failingRenderer),
  );
  await rendererSession.start();
  assert.throws(() => rendererSession.destroy(), /清理未完整完成/);
  assert.equal(failingRenderer.disposeAttempts, 1);
  assert.equal(failingRenderer.disposed, false);
  assert.equal(rendererSession.getDebugSnapshot().cleanupIncomplete, true);
  rendererSession.destroy();
  assert.equal(failingRenderer.disposeAttempts, 2);
  assert.equal(failingRenderer.disposed, true);
  assert.equal(rendererSession.getDebugSnapshot().cleanupIncomplete, false);
});

test('ProductPresentationSession retains Canvas ownership until a failed listener cleanup succeeds', async () => {
  const harness = platformHarness({ failCanvasCleanupOnce: true });
  const renderer = rendererHarness();
  const session = createProductPresentationSession(harness.platform, sessionOptions(renderer));
  await session.start();
  assert.throws(() => session.destroy(), /清理未完整完成/);
  assert.equal(renderer.disposed, true);
  assert.equal(session.getDebugSnapshot().bindingCount, 1);
  assert.equal(harness.activeCanvasCount(), 1);
  assert.equal(harness.canvasCleanupAttempts, 2);

  session.destroy();
  assert.equal(session.getDebugSnapshot().bindingCount, 0);
  assert.equal(harness.activeCanvasCount(), 0);
  assert.equal(harness.canvasCleanupAttempts, 3);
  assert.equal(session.getDebugSnapshot().cleanupIncomplete, false);
});

test('ProductPresentationSession fails closed when Renderer swallows a frame reentry error', async () => {
  const harness = platformHarness();
  let hostile = false;
  let session = null;
  const renderer = rendererHarness({
    onRender() {
      if (!hostile) return;
      try { session.getDebugSnapshot(); } catch { /* hostile Renderer swallows reentry */ }
    },
  });
  session = createProductPresentationSession(harness.platform, sessionOptions(renderer));
  await session.start();
  hostile = true;
  for (
    let index = 0;
    index < 4 && session.state !== PRODUCT_PRESENTATION_SESSION_STATE.FAILED;
    index += 1
  ) harness.fireFrame((index + 1) * (1000 / 60));
  assert.equal(session.state, PRODUCT_PRESENTATION_SESSION_STATE.FAILED);
  assert.equal(renderer.disposed, true);
});
