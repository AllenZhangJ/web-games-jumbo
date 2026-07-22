import { performance } from 'node:perf_hooks';
import {
  ARENA_PRESENTATION_SESSION_STATE,
  ArenaPresentationSession,
} from '@number-strategy-jump/arena-v1-greybox-session';

function readPositiveInteger(name, fallback) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} 必须是正安全整数。`);
  }
  return value;
}

function createPlatformHarness() {
  let nextFrameToken = 1;
  let now = 0;
  let input = null;
  const frames = new Map();
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
    get input() { return input; },
    platform: {
      id: 'session-soak',
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
        input = callbacks;
        return () => { if (input === callbacks) input = null; };
      },
      onResize: (callback) => bindLifecycle('resize', callback),
      onHide: (callback) => bindLifecycle('hide', callback),
      onShow: (callback) => bindLifecycle('show', callback),
    },
    fireFrame() {
      const entry = frames.entries().next().value;
      if (!entry) throw new Error('Session soak 缺少待执行帧。');
      const [token, callback] = entry;
      frames.delete(token);
      now += 1000 / 60;
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

function createRendererHarness() {
  return {
    renderCount: 0,
    resizeCount: 0,
    disposed: false,
    contextLost: false,
    async load() { return this; },
    resize() { this.resizeCount += 1; return true; },
    render() {
      this.renderCount += 1;
      return !this.contextLost;
    },
    getInputViewport: () => ({ width: 400, height: 800 }),
    hitTestRematch: () => true,
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
      return { disposed: this.disposed, renderCount: this.renderCount };
    },
    dispose() { this.disposed = true; },
  };
}

function assertStableOwnership(session, harness) {
  const debug = session.getDebugSnapshot();
  if (harness.frames.size !== 1) throw new Error(`RAF 数量失控：${harness.frames.size}。`);
  if (harness.activeLifecycleCount() !== 3) {
    throw new Error(`生命周期监听器数量失控：${harness.activeLifecycleCount()}。`);
  }
  if (harness.activeCanvasCount() !== 2) {
    throw new Error(`Canvas 监听器数量失控：${harness.activeCanvasCount()}。`);
  }
  if (!harness.input) throw new Error('输入绑定意外丢失。');
  if (debug.bindingCount !== 5) throw new Error(`Session bindingCount 失控：${debug.bindingCount}。`);
  if (debug.cleanupIncomplete) throw new Error('Session 报告未完成清理。');
}

function runUntilResult(session, harness, limit = 30) {
  for (let index = 0; index < limit; index += 1) {
    if (session.state === ARENA_PRESENTATION_SESSION_STATE.RESULT) return index;
    harness.fireFrame();
  }
  throw new Error(`Session 未在 ${limit} 帧内进入结果态。`);
}

if (typeof globalThis.gc !== 'function') {
  throw new Error('arena:session:soak 必须使用 node --expose-gc 运行。');
}

const matches = readPositiveInteger('matches', 100);
const heapGrowthBudgetBytes = 8 * 1024 * 1024;
const harness = createPlatformHarness();
const renderer = createRendererHarness();
const diagnostics = [];
const session = new ArenaPresentationSession(harness.platform, {
  initialSeed: 0x65050000,
  matchingDurationSeconds: 0,
  rendererFactory: () => renderer,
  onDiagnostic: (event) => diagnostics.push(event),
  matchConfig: {
    preparingTicks: 0,
    suddenDeathStartTick: 2,
    hardLimitTicks: 3,
  },
});
const matchSeeds = new Set();
let pauseResumeCycles = 0;
let contextRestoreCycles = 0;
let resizeCycles = 0;
const startedAt = performance.now();

await session.start();
globalThis.gc();
const startMemory = process.memoryUsage();

try {
  for (let index = 0; index < matches; index += 1) {
    if (index > 0 && index % 10 === 0) {
      const tickBefore = session.getDebugSnapshot().snapshot.tick;
      const staleFrame = harness.frames.values().next().value;
      harness.emitLifecycle('hide');
      if (session.state !== ARENA_PRESENTATION_SESSION_STATE.PAUSED) {
        throw new Error('hide 后 Session 未暂停。');
      }
      staleFrame(performance.now());
      if (session.getDebugSnapshot().snapshot.tick !== tickBefore) {
        throw new Error('取消后的迟到 RAF 推进了 tick。');
      }
      harness.emitLifecycle('show');
      pauseResumeCycles += 1;
    }
    if (index > 0 && index % 15 === 0) {
      let prevented = false;
      harness.emitCanvas('webglcontextlost', { preventDefault: () => { prevented = true; } });
      if (!prevented || session.state !== ARENA_PRESENTATION_SESSION_STATE.PAUSED) {
        throw new Error('WebGL context loss 未进入统一暂停状态。');
      }
      harness.emitCanvas('webglcontextrestored');
      contextRestoreCycles += 1;
    }
    if (index > 0 && index % 7 === 0) {
      harness.emitLifecycle('resize');
      resizeCycles += 1;
    }

    runUntilResult(session, harness);
    const debug = session.getDebugSnapshot();
    const serializedFrame = JSON.stringify(session.getLastPresentationFrame());
    if (/"(?:bot|botProfile|difficulty|difficultyId)"/i.test(serializedFrame)) {
      throw new Error(`第 ${index + 1} 局表现帧泄漏 Bot 或难度。`);
    }
    if (matchSeeds.has(debug.snapshot.matchSeed)) {
      throw new Error(`第 ${index + 1} 局复用了 matchSeed ${debug.snapshot.matchSeed}。`);
    }
    matchSeeds.add(debug.snapshot.matchSeed);
    assertStableOwnership(session, harness);

    if (index === matches - 1) break;
    if (!session.requestRematch()) throw new Error(`第 ${index + 1} 局无法请求重赛。`);
    harness.fireFrame();
    if (session.getDebugSnapshot().matchCount !== index + 2) {
      throw new Error(`第 ${index + 1} 次重赛没有且仅创建一局。`);
    }
    assertStableOwnership(session, harness);
  }
} finally {
  session.destroy();
}

globalThis.gc();
const endMemory = process.memoryUsage();
const heapGrowthBytes = endMemory.heapUsed - startMemory.heapUsed;
const elapsedMs = performance.now() - startedAt;

if (session.state !== ARENA_PRESENTATION_SESSION_STATE.DESTROYED) {
  throw new Error('Session soak 结束后未销毁。');
}
if (
  harness.frames.size !== 0
  || harness.activeLifecycleCount() !== 0
  || harness.activeCanvasCount() !== 0
  || harness.input !== null
) throw new Error('Session soak 结束后仍有宿主资源残留。');
if (!renderer.disposed) throw new Error('Session soak 结束后 Renderer 未销毁。');
if (matchSeeds.size !== matches) throw new Error(`只完成 ${matchSeeds.size}/${matches} 个唯一比赛。`);
if (diagnostics.some(({ type }) => type === 'session-failed')) {
  throw new Error('Session soak 期间出现 session-failed 诊断。');
}
if (heapGrowthBytes > heapGrowthBudgetBytes) {
  throw new Error(`回收后堆增长 ${heapGrowthBytes}B 超过 ${heapGrowthBudgetBytes}B 预算。`);
}

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  matches,
  uniqueMatchSeeds: matchSeeds.size,
  elapsedMs,
  renderCount: renderer.renderCount,
  pauseResumeCycles,
  contextRestoreCycles,
  resizeCycles,
  diagnostics: diagnostics.length,
  startHeapUsedBytes: startMemory.heapUsed,
  endHeapUsedBytes: endMemory.heapUsed,
  heapGrowthBytes,
  heapGrowthBudgetBytes,
  remainingFrames: harness.frames.size,
  remainingLifecycleListeners: harness.activeLifecycleCount(),
  remainingCanvasListeners: harness.activeCanvasCount(),
  inputBound: harness.input !== null,
}, null, 2));
