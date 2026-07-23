import {
  PRODUCT_PRESENTATION_SESSION_STATE,
} from '@number-strategy-jump/arena-product-presentation';
import {
  createProductPresentationSession,
} from '@number-strategy-jump/arena-v1-application-session';
import { PRODUCT_UI_INTENT_ID } from '@number-strategy-jump/arena-presentation-contracts';
import { PRODUCT_SESSION_STATE } from '@number-strategy-jump/arena-product-state';

type FrameCallback = (timestamp: number) => void;
type LifecycleCallback = () => void;
type CanvasCallback = (event: unknown) => void;
type LifecycleName = 'resize' | 'hide' | 'show';

function positiveIntegerArgument(name: string, fallback: number): number {
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
  let input: unknown = null;
  const frames = new Map<number, FrameCallback>();
  const storage = new Map<string, unknown>();
  const lifecycle = {
    resize: new Set<LifecycleCallback>(),
    hide: new Set<LifecycleCallback>(),
    show: new Set<LifecycleCallback>(),
  };
  const canvasListeners = new Map<string, Set<CanvasCallback>>();
  const canvas = {
    width: 400,
    height: 800,
    style: {},
    getContext: () => ({}),
    addEventListener(type: string, callback: CanvasCallback): void {
      let listeners = canvasListeners.get(type);
      if (!listeners) {
        listeners = new Set();
        canvasListeners.set(type, listeners);
      }
      listeners.add(callback);
    },
    removeEventListener(type: string, callback: CanvasCallback): void {
      canvasListeners.get(type)?.delete(callback);
    },
  };
  const bindLifecycle = (name: LifecycleName, callback: LifecycleCallback): (() => boolean) => {
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
      requestFrame(callback: FrameCallback): number {
        const token = nextFrameToken;
        nextFrameToken += 1;
        frames.set(token, callback);
        return token;
      },
      cancelFrame(token: number): void { frames.delete(token); },
      now: () => now,
      wallNow: () => 50_000 + Math.floor(now),
      bindInput(callbacks: unknown): () => void {
        input = callbacks;
        return () => { if (input === callbacks) input = null; };
      },
      onResize: (callback: LifecycleCallback) => bindLifecycle('resize', callback),
      onHide: (callback: LifecycleCallback) => bindLifecycle('hide', callback),
      onShow: (callback: LifecycleCallback) => bindLifecycle('show', callback),
      storageRead(key: string) {
        return storage.has(key)
          ? { ok: true, found: true, value: structuredClone(storage.get(key)) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key: string, value: unknown): boolean {
        storage.set(key, structuredClone(value));
        return true;
      },
      storageDelete(key: string): boolean {
        storage.delete(key);
        return true;
      },
    },
    fireFrame() {
      const entry = frames.entries().next().value;
      if (!entry) throw new Error('Product Presentation soak 缺少待执行帧。');
      const [token, callback] = entry;
      if (!callback) throw new Error('Product Presentation soak 缺少待执行帧。');
      frames.delete(token);
      now += 17;
      callback(now);
    },
    emitLifecycle(name: LifecycleName): void {
      for (const callback of [...lifecycle[name]]) callback();
    },
    emitCanvas(type: string, event: unknown = {}): void {
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
    handleContextLost(event: unknown): boolean {
      if (
        event !== null
        && typeof event === 'object'
        && 'preventDefault' in event
        && typeof event.preventDefault === 'function'
      ) event.preventDefault();
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

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) throw new Error(message);
}

function readMatchFrameSource(value: unknown): Readonly<{ matchSeed: number; tick: number }> {
  if (
    value === null
    || typeof value !== 'object'
    || !('source' in value)
    || value.source === null
    || typeof value.source !== 'object'
    || !('matchSeed' in value.source)
    || !Number.isSafeInteger(value.source.matchSeed)
    || !('tick' in value.source)
    || !Number.isSafeInteger(value.source.tick)
  ) throw new Error('Product Presentation soak matchFrame.source 缺少有效 matchSeed/tick。');
  return {
    matchSeed: value.source.matchSeed as number,
    tick: value.source.tick as number,
  };
}

async function main(): Promise<void> {
  const matches = positiveIntegerArgument('matches', 100);
  const harness = platformHarness();
  const renderer = rendererHarness();
  const diagnostics: unknown[] = [];
  const session = createProductPresentationSession(harness.platform, {
    ownerId: 'product-presentation-soak-owner',
    keyPrefix: 'stress.product-presentation-session',
    initialSeed: 90_000,
    rendererFactory: () => renderer,
    onDiagnostic: (value: unknown) => diagnostics.push(value),
    matchConfig: {
      preparingTicks: 0,
      suddenDeathStartTick: 30,
      hardLimitTicks: 60,
    },
  });
  globalThis.gc?.();
  const startHeapUsedBytes = process.memoryUsage().heapUsed;
  const startedAt = performance.now();
  const matchSeeds = new Set<number>();
  const authorityHashes = new Set<string>();
  let pauseResumeCycles = 0;
  let contextRestoreCycles = 0;
  let resizeCycles = 0;
  let maximumTicks = 0;
  await session.start();

  for (let index = 0; index < matches; index += 1) {
    const intentId = index === 0
      ? PRODUCT_UI_INTENT_ID.START_MATCH
      : PRODUCT_UI_INTENT_ID.REQUEST_REMATCH;
    let snapshot: ReturnType<typeof session.getLastSnapshot> = await session.dispatch({
      id: intentId,
      characterDefinitionId: null,
    });
    assert(snapshot !== null && snapshot.viewModel !== null, `第 ${index + 1} 局缺少活动快照。`);
    assert(
      snapshot.viewModel.activeState === PRODUCT_SESSION_STATE.IN_MATCH,
      `第 ${index + 1} 局没有进入 in-match。`,
    );
    const matchSeed = readMatchFrameSource(snapshot.matchFrame).matchSeed;
    assert(!matchSeeds.has(matchSeed), `第 ${index + 1} 局复用了 match seed。`);
    matchSeeds.add(matchSeed);

    if (index % 11 === 0) {
      const tick = session.getDebugSnapshot().matchTick;
      harness.emitLifecycle('hide');
      assertEqual(session.state, PRODUCT_PRESENTATION_SESSION_STATE.PAUSED, 'hide 未暂停 Session。');
      assert(harness.frames.size === 0, 'hide 后仍有待执行帧。');
      harness.emitLifecycle('show');
      assertEqual(session.state, PRODUCT_PRESENTATION_SESSION_STATE.RUNNING, 'show 未恢复 Session。');
      assert(session.getDebugSnapshot().matchTick === tick, 'hide/show 推进了权威 tick。');
      pauseResumeCycles += 1;
    }
    if (index % 17 === 0) {
      let prevented = false;
      harness.emitCanvas('webglcontextlost', {
        preventDefault: () => { prevented = true; },
      });
      assert(prevented, 'context lost 未 preventDefault。');
      assertEqual(session.state, PRODUCT_PRESENTATION_SESSION_STATE.PAUSED, 'context lost 未暂停。');
      harness.emitCanvas('webglcontextrestored');
      assertEqual(session.state, PRODUCT_PRESENTATION_SESSION_STATE.RUNNING, 'context 未恢复。');
      contextRestoreCycles += 1;
    }
    if (index % 7 === 0) {
      harness.emitLifecycle('resize');
      resizeCycles += 1;
    }

    for (let frame = 0; frame < 400; frame += 1) {
      snapshot = session.getLastSnapshot();
      assert(
        snapshot !== null && snapshot.viewModel !== null,
        `第 ${index + 1} 局 Session 丢失快照：${JSON.stringify({
          session: session.getDebugSnapshot(),
          diagnostics: diagnostics.slice(-3),
        })}`,
      );
      if (snapshot.viewModel.activeState !== PRODUCT_SESSION_STATE.IN_MATCH) break;
      harness.fireFrame();
    }
    snapshot = session.getLastSnapshot();
    assert(snapshot !== null && snapshot.viewModel !== null, `第 ${index + 1} 局缺少结算快照。`);
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
    maximumTicks = Math.max(maximumTicks, readMatchFrameSource(snapshot.matchFrame).tick);
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

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
