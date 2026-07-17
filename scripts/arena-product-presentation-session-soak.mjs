import {
  PRODUCT_PRESENTATION_SESSION_STATE,
  ProductPresentationSession,
} from '../src/arena/presentation/session/product-presentation-session.js';
import { PRODUCT_UI_INTENT_ID } from '../src/arena/presentation/product/product-ui-intent.js';
import { PRODUCT_SESSION_STATE } from '../src/arena/product/state/product-session-transition-definition.js';

function positiveIntegerArgument(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find((argument) => argument.startsWith(prefix));
  if (!value) return fallback;
  const parsed = Number(value.slice(prefix.length));
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new RangeError(`${name} 必须是正安全整数。`);
  }
  return parsed;
}

function platformHarness() {
  let nextFrameToken = 1;
  let now = 0;
  let input = null;
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
      canvasListeners.get(type)?.delete(callback);
    },
  };
  const bindLifecycle = (name, callback) => {
    lifecycle[name].add(callback);
    return () => lifecycle[name].delete(callback);
  };
  return {
    frames,
    lifecycle,
    canvasListeners,
    get input() { return input; },
    platform: {
      id: 'product-presentation-soak',
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
      wallNow: () => 50_000 + Math.floor(now),
      bindInput(callbacks) {
        input = callbacks;
        return () => { if (input === callbacks) input = null; };
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
    },
    fireFrame() {
      const [token, callback] = frames.entries().next().value ?? [];
      if (!callback) throw new Error('Product Presentation soak 缺少待执行帧。');
      frames.delete(token);
      now += 17;
      callback(now);
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
  };
}

function rendererHarness() {
  return {
    renderCount: 0,
    resizeCount: 0,
    contextLost: false,
    disposed: false,
    async load() { return this; },
    render() {
      this.renderCount += 1;
      return !this.contextLost;
    },
    resize() {
      this.resizeCount += 1;
      return true;
    },
    getInputViewport: () => ({ width: 400, height: 800 }),
    hitTestUi: () => null,
    bindUiIntent: () => () => {},
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
    dispose() { this.disposed = true; },
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const matches = positiveIntegerArgument('matches', 100);
  const harness = platformHarness();
  const renderer = rendererHarness();
  const diagnostics = [];
  const session = new ProductPresentationSession(harness.platform, {
    ownerId: 'product-presentation-soak-owner',
    keyPrefix: 'stress.product-presentation-session',
    initialSeed: 90_000,
    rendererFactory: () => renderer,
    onDiagnostic: (value) => diagnostics.push(value),
    matchConfig: {
      preparingTicks: 0,
      suddenDeathStartTick: 30,
      hardLimitTicks: 60,
    },
  });
  globalThis.gc?.();
  const startHeapUsedBytes = process.memoryUsage().heapUsed;
  const startedAt = performance.now();
  const matchSeeds = new Set();
  const authorityHashes = new Set();
  let pauseResumeCycles = 0;
  let contextRestoreCycles = 0;
  let resizeCycles = 0;
  let maximumTicks = 0;
  await session.start();

  for (let index = 0; index < matches; index += 1) {
    const intentId = index === 0
      ? PRODUCT_UI_INTENT_ID.START_MATCH
      : PRODUCT_UI_INTENT_ID.REQUEST_REMATCH;
    let snapshot = await session.dispatch({ id: intentId });
    assert(
      snapshot.viewModel.activeState === PRODUCT_SESSION_STATE.IN_MATCH,
      `第 ${index + 1} 局没有进入 in-match。`,
    );
    const matchSeed = snapshot.matchFrame.source.matchSeed;
    assert(!matchSeeds.has(matchSeed), `第 ${index + 1} 局复用了 match seed。`);
    matchSeeds.add(matchSeed);

    if (index % 11 === 0) {
      const tick = session.getDebugSnapshot().matchTick;
      harness.emitLifecycle('hide');
      assert(session.state === PRODUCT_PRESENTATION_SESSION_STATE.PAUSED, 'hide 未暂停 Session。');
      assert(harness.frames.size === 0, 'hide 后仍有待执行帧。');
      harness.emitLifecycle('show');
      assert(session.state === PRODUCT_PRESENTATION_SESSION_STATE.RUNNING, 'show 未恢复 Session。');
      assert(session.getDebugSnapshot().matchTick === tick, 'hide/show 推进了权威 tick。');
      pauseResumeCycles += 1;
    }
    if (index % 17 === 0) {
      let prevented = false;
      harness.emitCanvas('webglcontextlost', {
        preventDefault: () => { prevented = true; },
      });
      assert(prevented, 'context lost 未 preventDefault。');
      assert(session.state === PRODUCT_PRESENTATION_SESSION_STATE.PAUSED, 'context lost 未暂停。');
      harness.emitCanvas('webglcontextrestored');
      assert(session.state === PRODUCT_PRESENTATION_SESSION_STATE.RUNNING, 'context 未恢复。');
      contextRestoreCycles += 1;
    }
    if (index % 7 === 0) {
      harness.emitLifecycle('resize');
      resizeCycles += 1;
    }

    for (let frame = 0; frame < 400; frame += 1) {
      snapshot = session.getLastSnapshot();
      assert(
        snapshot !== null,
        `第 ${index + 1} 局 Session 丢失快照：${JSON.stringify({
          session: session.getDebugSnapshot(),
          diagnostics: diagnostics.slice(-3),
        })}`,
      );
      if (snapshot.viewModel.activeState !== PRODUCT_SESSION_STATE.IN_MATCH) break;
      harness.fireFrame();
    }
    snapshot = session.getLastSnapshot();
    assert(
      snapshot.viewModel.activeState === PRODUCT_SESSION_STATE.REWARD,
      `第 ${index + 1} 局没有进入 reward：${JSON.stringify({
        activeState: snapshot.viewModel.activeState,
        error: snapshot.viewModel.error,
        diagnostics: diagnostics.slice(-3),
      })}`,
    );
    assert(snapshot.viewModel.reward?.committed === true, `第 ${index + 1} 局奖励未提交。`);
    const authorityHash = snapshot.viewModel.result?.authorityHash;
    assert(typeof authorityHash === 'string', `第 ${index + 1} 局缺少 authority hash。`);
    assert(!authorityHashes.has(authorityHash), `第 ${index + 1} 局复用了 authority hash。`);
    authorityHashes.add(authorityHash);
    maximumTicks = Math.max(maximumTicks, snapshot.matchFrame.source.tick);
  }

  const elapsedMs = performance.now() - startedAt;
  session.destroy();
  globalThis.gc?.();
  const endHeapUsedBytes = process.memoryUsage().heapUsed;
  const heapGrowthBytes = endHeapUsedBytes - startHeapUsedBytes;
  const heapGrowthBudgetBytes = 8 * 1024 * 1024;
  assert(session.state === PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED, 'Session 未销毁。');
  assert(renderer.disposed, 'Renderer 未销毁。');
  assert(harness.frames.size === 0, '销毁后仍有帧。');
  assert(harness.activeLifecycleCount() === 0, '销毁后仍有生命周期监听。');
  assert(harness.activeCanvasCount() === 0, '销毁后仍有 Canvas 监听。');
  assert(harness.input === null, '销毁后输入仍绑定。');
  assert(heapGrowthBytes <= heapGrowthBudgetBytes, 'Product Session heap 增长超过预算。');

  console.log(JSON.stringify({
    ok: true,
    matches,
    uniqueMatchSeeds: matchSeeds.size,
    uniqueAuthorityHashes: authorityHashes.size,
    maximumTicks,
    elapsedMs,
    renderCount: renderer.renderCount,
    resizeCount: renderer.resizeCount,
    pauseResumeCycles,
    contextRestoreCycles,
    resizeCycles,
    diagnostics: diagnostics.length,
    startHeapUsedBytes,
    endHeapUsedBytes,
    heapGrowthBytes,
    heapGrowthBudgetBytes,
    remainingFrames: harness.frames.size,
    remainingLifecycleListeners: harness.activeLifecycleCount(),
    remainingCanvasListeners: harness.activeCanvasCount(),
    inputBound: harness.input !== null,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
