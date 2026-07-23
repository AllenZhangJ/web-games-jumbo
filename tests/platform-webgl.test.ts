import test from 'node:test';
import assert from 'node:assert/strict';
import { createMiniGamePlatform } from '@number-strategy-jump/arena-platform-runtime/mini-game';
import {
  createFrameScheduler,
  createPlatformContract,
} from '@number-strategy-jump/arena-platform-contracts';
import { createWebPlatform } from '@number-strategy-jump/arena-platform-runtime/web';

type EventCallback = (event?: unknown) => unknown;
type FrameCallback = (timestamp?: number) => unknown;
interface PointerPoint { readonly pointerId: number; readonly x: number; readonly y: number }

interface WebGLContextLike {
  getContextAttributes: () => Readonly<Record<string, unknown>>;
  getParameter: () => string;
  texStorage2D?: () => void;
  createVertexArray?: () => void;
}

interface MockCanvas {
  width: number;
  height: number;
  id?: string;
  calls: Array<Readonly<{ type: string; attributes: unknown }>>;
  getContext: (type: string, attributes?: unknown) => WebGLContextLike | null;
  getBoundingClientRect?: () => Readonly<Record<string, number>>;
  addEventListener?: (type: string, callback: EventCallback) => void;
  removeEventListener?: (type: string, callback: EventCallback) => void;
  setPointerCapture?: (pointerId?: number) => void;
  requestAnimationFrame?: (callback: FrameCallback) => unknown;
  cancelAnimationFrame?: (id: unknown) => unknown;
}

function required<T>(value: T, name: string): NonNullable<T> {
  assert.ok(value != null, `${name} 不存在。`);
  return value as NonNullable<T>;
}

function record(value: unknown, name: string): Record<string, unknown> {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value), `${name} 必须是对象。`);
  return value as Record<string, unknown>;
}

function webGL2Context(): WebGLContextLike {
  return {
    getContextAttributes: () => ({ alpha: false }),
    getParameter: () => 'WebGL 2.0',
    texStorage2D() {},
    createVertexArray() {},
  };
}

function canvasWithContext(context: WebGLContextLike = webGL2Context()): MockCanvas {
  const calls: MockCanvas['calls'] = [];
  return {
    width: 1,
    height: 1,
    calls,
    getContext(type: string, attributes?: unknown) {
      calls.push({ type, attributes });
      return type === 'webgl2' ? context : null;
    },
  };
}

interface MiniGameApiOptions {
  readonly id?: 'wechat' | 'douyin';
  readonly withNativeOffscreen?: boolean;
}

function miniGameApi({ id = 'wechat', withNativeOffscreen = true }: MiniGameApiOptions = {}) {
  const mainCanvas = canvasWithContext();
  const fallbackCanvas = canvasWithContext();
  const nativeOffscreen = canvasWithContext();
  const offscreenCalls: unknown[][] = [];
  const storageValues = new Map<string, unknown>();
  let createCanvasCalls = 0;
  const safeArea = { left: 0, top: 42, right: 390, bottom: 820, width: 390, height: 778 };
  const api: Record<string, unknown> = {
    createCanvas() {
      createCanvasCalls += 1;
      return createCanvasCalls === 1 ? mainCanvas : fallbackCanvas;
    },
    createImage: () => ({}),
    getWindowInfo: () => ({ windowWidth: 390, windowHeight: 844, pixelRatio: 3, safeArea }),
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    onTouchStart() {},
    offTouchStart() {},
    onTouchMove() {},
    offTouchMove() {},
    onTouchEnd() {},
    offTouchEnd() {},
    getStorageSync(key: string) {
      return storageValues.get(key);
    },
    getStorageInfoSync() {
      return { keys: [...storageValues.keys()] };
    },
    setStorageSync(key: string, value: unknown) {
      storageValues.set(key, value);
    },
    removeStorageSync(key: string) {
      storageValues.delete(key);
    },
  };
  if (withNativeOffscreen) {
    api.createOffscreenCanvas = (...args: unknown[]) => {
      offscreenCalls.push(args);
      return nativeOffscreen;
    };
  }
  return {
    id,
    api,
    mainCanvas,
    fallbackCanvas,
    nativeOffscreen,
    offscreenCalls,
    safeArea,
    storageValues,
    createCanvasCalls: () => createCanvasCalls,
  };
}

test('platform contract adds WebGL capabilities without changing existing defaults', () => {
  const platform = createPlatformContract({ id: 'test' });
  assert.equal(platform.id, 'test');
  assert.equal(platform.storageConcurrency, 'multi-runtime');
  assert.equal(typeof platform.createCanvas, 'function');
  assert.equal(typeof platform.createOffscreenCanvas, 'function');
  assert.equal(typeof platform.getWebGLContext, 'function');
  assert.equal(typeof platform.wallNow, 'function');
  assert.equal(platform.storageSet('missing', {}), false);
  assert.equal(platform.storageRemove('missing'), false);
  assert.throws(
    () => platform.createOffscreenCanvas(16, 16),
    /\[test\].*createOffscreenCanvas/,
  );
  assert.throws(
    () => createPlatformContract({
      id: 'test',
      storageConcurrency: 'unknown',
    } as unknown as Parameters<typeof createPlatformContract>[0]),
    /storageConcurrency/,
  );
});

test('WeChat uses its options-based offscreen API and preserves viewport safe area', () => {
  const fixture = miniGameApi({ id: 'wechat' });
  const platform = createMiniGamePlatform(fixture.api, fixture.id);
  const offscreen = platform.createOffscreenCanvas(128.9, 64.2);

  assert.equal(platform.createCanvas(), fixture.mainCanvas);
  assert.equal(platform.storageConcurrency, 'single-active-runtime');
  assert.equal(offscreen, fixture.nativeOffscreen);
  assert.deepEqual(fixture.offscreenCalls, [[{ type: '2d', width: 128, height: 64 }]]);
  assert.equal(offscreen.width, 128);
  assert.equal(offscreen.height, 64);
  assert.deepEqual(platform.getViewport(), {
    width: 390,
    height: 844,
    pixelRatio: 2,
    safeArea: fixture.safeArea,
  });
});

test('Douyin uses the no-argument native offscreen API', () => {
  const fixture = miniGameApi({ id: 'douyin' });
  const platform = createMiniGamePlatform(fixture.api, fixture.id);
  const offscreen = platform.createOffscreenCanvas(96, 48);

  assert.equal(offscreen, fixture.nativeOffscreen);
  assert.deepEqual(fixture.offscreenCalls, [[]]);
  assert.equal(offscreen.width, 96);
  assert.equal(offscreen.height, 48);
});

test('mini-game storage distinguishes missing values, commits synchronously and deletes explicitly', () => {
  const fixture = miniGameApi({ id: 'wechat' });
  const platform = createMiniGamePlatform(fixture.api, fixture.id);
  assert.deepEqual(platform.storageRead('pilot'), {
    ok: true,
    found: false,
    value: undefined,
  });
  assert.equal(platform.storageWrite('pilot', { revision: 1 }), true);
  assert.deepEqual(platform.storageRead('pilot'), {
    ok: true,
    found: true,
    value: { revision: 1 },
  });
  assert.deepEqual(platform.storageGet('pilot'), { revision: 1 });
  assert.equal(platform.storageDelete('pilot'), true);
  assert.equal(fixture.storageValues.has('pilot'), false);
  assert.equal(platform.storageWrite('pilot', undefined), false);
  assert.equal(fixture.storageValues.has('pilot'), false);

  fixture.storageValues.set('inconsistent', undefined);
  assert.deepEqual(platform.storageRead('inconsistent'), {
    ok: false,
    found: false,
    value: undefined,
  });

  fixture.storageValues.set('pilot', { revision: 1 });
  fixture.api.getStorageSync = () => { throw new Error('blocked'); };
  fixture.api.setStorageSync = () => { throw new Error('full'); };
  fixture.api.removeStorageSync = () => { throw new Error('blocked'); };
  assert.deepEqual(platform.storageRead('pilot'), {
    ok: true,
    found: true,
    value: { revision: 1 },
  });
  assert.equal(platform.storageWrite('pilot', { revision: 2 }), true);
  assert.equal(platform.storageDelete('pilot'), true);

  const failedFixture = miniGameApi({ id: 'wechat' });
  failedFixture.api.getStorageSync = () => { throw new Error('blocked'); };
  failedFixture.api.setStorageSync = () => { throw new Error('full'); };
  failedFixture.api.removeStorageSync = () => { throw new Error('blocked'); };
  failedFixture.storageValues.set('pilot', { revision: 0 });
  const failedPlatform = createMiniGamePlatform(failedFixture.api, 'wechat');
  assert.deepEqual(failedPlatform.storageRead('pilot'), {
    ok: false,
    found: false,
    value: undefined,
  });
  assert.equal(failedPlatform.storageWrite('pilot', { revision: 2 }), false);
  assert.equal(failedPlatform.storageDelete('pilot'), false);
});

test('mini-game storage recognizes the documented Douyin missing-key error', () => {
  const fixture = miniGameApi({ id: 'douyin' });
  delete fixture.api.getStorageInfoSync;
  fixture.api.getStorageSync = () => {
    throw Object.assign(new Error('data not found, key == pilot'), { errorCode: 100599 });
  };
  const platform = createMiniGamePlatform(fixture.api, fixture.id);
  assert.deepEqual(platform.storageRead('pilot'), {
    ok: true,
    found: false,
    value: undefined,
  });
  fixture.api.getStorageSync = () => {
    throw Object.assign(new Error('storage unavailable'), { errorCode: 100500 });
  };
  assert.deepEqual(platform.storageRead('pilot'), {
    ok: true,
    found: false,
    value: undefined,
  });

  const failedFixture = miniGameApi({ id: 'douyin' });
  delete failedFixture.api.getStorageInfoSync;
  failedFixture.api.getStorageSync = () => {
    throw Object.assign(new Error('storage unavailable'), { errorCode: 100500 });
  };
  const failedPlatform = createMiniGamePlatform(failedFixture.api, 'douyin');
  assert.deepEqual(failedPlatform.storageRead('pilot'), {
    ok: false,
    found: false,
    value: undefined,
  });
});

test('mini-game platform reads packaged GLB bytes through FileSystemManager with path fallback', async () => {
  const fixture = miniGameApi({ id: 'wechat' });
  const reads: string[] = [];
  fixture.api.getFileSystemManager = () => ({
    readFile({
      filePath,
      success,
      fail,
    }: {
      filePath: string;
      success: (value: unknown) => void;
      fail: (error: Error) => void;
    }) {
      reads.push(filePath);
      if (filePath.startsWith('./')) fail(new Error('prefixed path unsupported'));
      else success({ data: new Uint8Array([4, 8, 15, 16]) });
    },
  });
  const platform = createMiniGamePlatform(fixture.api, fixture.id);
  const bytes = await platform.readAssetBytes('./assets/arena/character.glb');
  assert.deepEqual([...new Uint8Array(bytes)], [4, 8, 15, 16]);
  assert.deepEqual(reads, [
    './assets/arena/character.glb',
    'assets/arena/character.glb',
  ]);
  await assert.rejects(
    platform.readAssetBytes('./assets/../secret.glb'),
    /路径逃逸/,
  );
});

test('mini-game packaged asset reader supports synchronous host file systems', async () => {
  const fixture = miniGameApi({ id: 'douyin' });
  fixture.api.getFileSystemManager = () => ({
    readFileSync(filePath: string) {
      assert.equal(filePath, './assets/arena/character.glb');
      return new Uint8Array([23, 42]).buffer;
    },
  });
  const platform = createMiniGamePlatform(fixture.api, fixture.id);
  assert.deepEqual(
    [...new Uint8Array(await platform.readAssetBytes('./assets/arena/character.glb'))],
    [23, 42],
  );
});

test('offscreen Canvas rejects invalid dimensions before calling a host API', () => {
  const fixture = miniGameApi({ id: 'wechat' });
  const platform = createMiniGamePlatform(fixture.api, fixture.id);
  assert.throws(() => platform.createOffscreenCanvas(Number.NaN, 64), /\[wechat\].*Canvas 尺寸/);
  assert.deepEqual(fixture.offscreenCalls, []);
});

test('mini-game offscreen creation falls back to the second createCanvas call without DOM', () => {
  const fixture = miniGameApi({ id: 'douyin', withNativeOffscreen: false });
  const platform = createMiniGamePlatform(fixture.api, fixture.id);
  const offscreen = platform.createOffscreenCanvas(32, 24);

  assert.equal(offscreen, fixture.fallbackCanvas);
  assert.equal(fixture.createCanvasCalls(), 2);
  assert.equal(offscreen.width, 32);
  assert.equal(offscreen.height, 24);
});

test('mini-game platform requests a WebGL2 context and makes Canvas Three-compatible', () => {
  const fixture = miniGameApi({ id: 'wechat' });
  const platform = createMiniGamePlatform(fixture.api, fixture.id);
  const attributes = { alpha: false, antialias: true };
  const context = platform.getWebGLContext(fixture.mainCanvas, attributes);

  const contextRecord = record(context, '小游戏 WebGL2 上下文');
  if (typeof contextRecord.getParameter !== 'function') {
    throw new TypeError('小游戏 WebGL2 getParameter 必须是函数。');
  }
  assert.equal(contextRecord.getParameter(), 'WebGL 2.0');
  assert.deepEqual(fixture.mainCanvas.calls, [{ type: 'webgl2', attributes }]);
  assert.equal(typeof fixture.mainCanvas.addEventListener, 'function');
  assert.equal(typeof fixture.mainCanvas.removeEventListener, 'function');
});

test('legacy webgl token is accepted only when the returned context reports WebGL2', () => {
  const context = webGL2Context();
  const canvas = canvasWithContext();
  canvas.getContext = (type) => (type === 'webgl' ? context : null);
  const platform = createPlatformContract({ id: 'adapter' });
  assert.equal(platform.getWebGLContext(canvas), context);

  const webGL1Canvas = canvasWithContext();
  webGL1Canvas.getContext = (type) => (type === 'webgl'
    ? { getContextAttributes: () => ({}), getParameter: () => 'WebGL 1.0' }
    : null);
  assert.throws(
    () => platform.getWebGLContext(webGL1Canvas),
    /\[adapter\].*WebGL2.*WebGL1/,
  );
});

test('Web platform creates native offscreen Canvas and keeps browser viewport behavior', () => {
  const mainCanvas = canvasWithContext();
  mainCanvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 390, height: 844 });
  mainCanvas.addEventListener = () => {};
  mainCanvas.removeEventListener = () => {};

  class MockOffscreenCanvas {
    width!: number;
    height!: number;

    constructor(width: number, height: number) {
      Object.assign(this, canvasWithContext(), { width, height });
    }
  }

  const environment = {
    OffscreenCanvas: MockOffscreenCanvas,
    document: {
      hidden: false,
      querySelector: (selector: string) => (selector === '#game' ? mainCanvas : null),
      createElement: () => canvasWithContext(),
      addEventListener() {},
      removeEventListener() {},
    },
    window: {
      innerWidth: 390,
      innerHeight: 844,
      devicePixelRatio: 3,
      requestAnimationFrame: () => 1,
      cancelAnimationFrame() {},
      addEventListener() {},
      removeEventListener() {},
    },
    performance: { now: () => 123 },
  };

  const platform = createWebPlatform(environment);
  const offscreen = platform.createOffscreenCanvas(80, 40);
  assert.ok(offscreen instanceof MockOffscreenCanvas);
  assert.equal(offscreen.width, 80);
  assert.equal(offscreen.height, 40);
  assert.deepEqual(platform.getViewport(), {
    width: 390,
    height: 844,
    pixelRatio: 2,
    safeArea: null,
  });
  assert.equal(platform.now(), 123);
  assert.equal(platform.getWebGLContext(mainCanvas), mainCanvas.getContext('webgl2'));
});

test('Web platform reads GLB assets as ArrayBuffer and rejects failed responses', async () => {
  const mainCanvas = canvasWithContext();
  mainCanvas.addEventListener = () => {};
  mainCanvas.removeEventListener = () => {};
  const paths: string[] = [];
  const environment = {
    document: {
      querySelector: () => mainCanvas,
      createElement: () => canvasWithContext(),
    },
    window: {},
    async fetch(sourceKey: string) {
      paths.push(sourceKey);
      return sourceKey.endsWith('ok.glb')
        ? { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }
        : { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
    },
  };
  const platform = createWebPlatform(environment);
  assert.deepEqual(
    [...new Uint8Array(await platform.readAssetBytes('./assets/ok.glb'))],
    [1, 2, 3],
  );
  await assert.rejects(platform.readAssetBytes('./assets/missing.glb'), /404/);
  await assert.rejects(platform.readAssetBytes('../escape.glb'), /\.\/assets/);
  await assert.rejects(platform.readAssetBytes('./assets/../escape.glb'), /路径逃逸/);
  assert.deepEqual(paths, ['./assets/ok.glb', './assets/missing.glb']);
});

test('Web platform fails clearly when initialized without a DOM or #game Canvas', () => {
  assert.throws(() => createWebPlatform({}), /\[web\].*DOM/);
  assert.throws(
    () => createWebPlatform({ document: { querySelector: () => null }, window: {} }),
    /\[web\].*Canvas/,
  );
});

test('frame scheduler treats an undefined host ID as successfully scheduled and cancels late callbacks', () => {
  let hostCallback: FrameCallback | undefined;
  const cancelled: unknown[] = [];
  const scheduler = createFrameScheduler({
    request(callback: FrameCallback) {
      hostCallback = callback;
      return undefined;
    },
    cancel: (id: unknown) => { cancelled.push(id); },
    now: () => 42,
  });
  let calls = 0;
  const first = scheduler.requestFrame((time) => {
    calls += 1;
    assert.equal(time, 42);
  });
  required(hostCallback, '首个宿主帧回调')(999999);
  assert.equal(calls, 1);

  const second = scheduler.requestFrame(() => { calls += 1; });
  assert.equal(scheduler.cancelFrame(second), true);
  required(hostCallback, '第二个宿主帧回调')(999999);
  assert.equal(calls, 1);
  assert.deepEqual(cancelled, [undefined]);
  assert.equal(scheduler.cancelFrame(first), false);
});

test('mini-game RAF uses one host scheduler even when requestAnimationFrame returns undefined', () => {
  const fixture = miniGameApi({ id: 'wechat' });
  let hostCallback: FrameCallback | undefined;
  let apiRequests = 0;
  let canvasRequests = 0;
  const cancelled: unknown[] = [];
  fixture.api.getPerformance = () => ({ now: () => 73 });
  fixture.api.requestAnimationFrame = (callback: FrameCallback) => {
    apiRequests += 1;
    hostCallback = callback;
    return undefined;
  };
  fixture.api.cancelAnimationFrame = (id: unknown) => { cancelled.push(id); };
  fixture.mainCanvas.requestAnimationFrame = () => {
    canvasRequests += 1;
    return 9;
  };
  const platform = createMiniGamePlatform(fixture.api, 'wechat');
  let observedTime = null;
  const token = platform.requestFrame((time) => { observedTime = time; });
  assert.equal(apiRequests, 1);
  assert.equal(canvasRequests, 0);
  required(hostCallback, '小游戏首个宿主帧回调')(100000);
  assert.equal(observedTime, 73);

  const cancelledToken = platform.requestFrame(() => { throw new Error('late frame must be inert'); });
  platform.cancelFrame(cancelledToken);
  required(hostCallback, '小游戏取消后的宿主帧回调')();
  assert.deepEqual(cancelled, [undefined]);
  assert.equal(platform.cancelFrame(token), false);
});

test('Douyin mini-game normalizes its microsecond performance clock to milliseconds', () => {
  const fixture = miniGameApi({ id: 'douyin' });
  fixture.api.getPerformance = () => ({ now: () => 1_250_000 });
  const platform = createMiniGamePlatform(fixture.api, 'douyin');

  assert.equal(platform.now(), 1_250);
});

test('mini-game RAF falls back to Canvas and cancellation suppresses a late host callback', () => {
  const fixture = miniGameApi({ id: 'douyin' });
  delete fixture.api.requestAnimationFrame;
  delete fixture.api.cancelAnimationFrame;
  let callback: FrameCallback | undefined;
  const cancelled: unknown[] = [];
  fixture.mainCanvas.requestAnimationFrame = (next: FrameCallback) => {
    callback = next;
    return 88;
  };
  fixture.mainCanvas.cancelAnimationFrame = (id: unknown) => { cancelled.push(id); };
  const platform = createMiniGamePlatform(fixture.api, 'douyin');
  let called = false;
  const token = platform.requestFrame(() => { called = true; });
  platform.cancelFrame(token);
  required(callback, 'Canvas 宿主帧回调')();
  assert.equal(called, false);
  assert.deepEqual(cancelled, [88]);
});

test('mini-game rejects missing required touch APIs before renderer startup', () => {
  const fixture = miniGameApi({ id: 'wechat' });
  delete fixture.api.onTouchEnd;
  assert.throws(
    () => createMiniGamePlatform(fixture.api, 'wechat'),
    /\[wechat\].*onTouchEnd/,
  );
});

test('mini-game requires touch move and dispatches every changed touch independently', () => {
  const missing = miniGameApi({ id: 'wechat' });
  delete missing.api.onTouchMove;
  assert.throws(
    () => createMiniGamePlatform(missing.api, 'wechat'),
    /\[wechat\].*onTouchMove/,
  );

  const fixture = miniGameApi({ id: 'wechat' });
  const handlers: Record<string, EventCallback> = {};
  for (const name of ['Start', 'Move', 'End', 'Cancel']) {
    fixture.api[`onTouch${name}`] = (callback: EventCallback) => {
      handlers[name.toLowerCase()] = callback;
    };
    fixture.api[`offTouch${name}`] = (callback: EventCallback) => {
      if (handlers[name.toLowerCase()] === callback) delete handlers[name.toLowerCase()];
    };
  }
  const platform = createMiniGamePlatform(fixture.api, 'wechat');
  const observed: [string, number][] = [];
  const cleanup = platform.bindInput({
    onStart: (value: Readonly<{ pointerId: number }>) => { observed.push(['start', value.pointerId]); },
    onMove: (value: Readonly<{ pointerId: number }>) => { observed.push(['move', value.pointerId]); },
    onEnd: (value: Readonly<{ pointerId: number }>) => { observed.push(['end', value.pointerId]); },
    onCancel: (value: Readonly<{ pointerId: number }>) => { observed.push(['cancel', value.pointerId]); },
  });
  const touches = [
    { identifier: 4, clientX: 20, clientY: 30 },
    { identifier: 7, clientX: 300, clientY: 500 },
  ];
  required(handlers.start, '触摸开始处理器')({ changedTouches: touches });
  required(handlers.move, '触摸移动处理器')({ changedTouches: touches });
  required(handlers.end, '触摸结束处理器')({ changedTouches: touches });
  assert.deepEqual(observed, [
    ['start', 4], ['start', 7],
    ['move', 4], ['move', 7],
    ['end', 4], ['end', 7],
  ]);
  required(handlers.end, '空触摸结束处理器')({ changedTouches: [], touches: [touches[0]] });
  required(handlers.start, '无效触摸开始处理器')({
    changedTouches: [{ identifier: -1, clientX: 0, clientY: 0 }],
  });
  assert.equal(observed.length, 6);
  cleanup();
  assert.deepEqual(handlers, {});
});

test('mini-game offscreen fallback never resizes a main Canvas returned twice', () => {
  const fixture = miniGameApi({ id: 'wechat', withNativeOffscreen: false });
  fixture.api.createCanvas = () => fixture.mainCanvas;
  const platform = createMiniGamePlatform(fixture.api, 'wechat');
  assert.throws(() => platform.createOffscreenCanvas(300, 200), /主 Canvas|离屏 Canvas/);
  assert.equal(fixture.mainCanvas.width, 1);
  assert.equal(fixture.mainCanvas.height, 1);
});

test('mini-game tries the alternate native offscreen signature when the preferred result is invalid', () => {
  const fixture = miniGameApi({ id: 'wechat' });
  fixture.api.createOffscreenCanvas = (...args: unknown[]) => (
    args.length > 0 ? {} : fixture.nativeOffscreen
  );
  const platform = createMiniGamePlatform(fixture.api, 'wechat');
  assert.equal(platform.createOffscreenCanvas(30, 20), fixture.nativeOffscreen);
  assert.equal(fixture.nativeOffscreen.width, 30);
  assert.equal(fixture.nativeOffscreen.height, 20);
});

test('Web input remains finite on a zero-size Canvas and window completion is de-duplicated', () => {
  const canvasListeners = new Map<string, EventCallback>();
  const windowListeners = new Map<string, EventCallback>();
  const mainCanvas = canvasWithContext();
  mainCanvas.width = 0;
  mainCanvas.height = 0;
  mainCanvas.getBoundingClientRect = () => ({ left: 5, top: 7, width: 0, height: Number.NaN });
  mainCanvas.addEventListener = (type: string, callback: EventCallback) => {
    canvasListeners.set(type, callback);
  };
  mainCanvas.removeEventListener = (type: string, callback: EventCallback) => {
    if (canvasListeners.get(type) === callback) canvasListeners.delete(type);
  };
  mainCanvas.setPointerCapture = () => { throw new Error('capture unavailable'); };
  const environment = {
    document: {
      hidden: false,
      querySelector: () => mainCanvas,
      createElement: () => canvasWithContext(),
      addEventListener() {},
      removeEventListener() {},
    },
    window: {
      innerWidth: 390,
      innerHeight: 844,
      requestAnimationFrame: () => undefined,
      cancelAnimationFrame() {},
      addEventListener: (type: string, callback: EventCallback) => {
        windowListeners.set(type, callback);
      },
      removeEventListener: (type: string, callback: EventCallback) => {
        if (windowListeners.get(type) === callback) windowListeners.delete(type);
      },
    },
  };
  const platform = createWebPlatform(environment);
  const starts: PointerPoint[] = [];
  const moves: PointerPoint[] = [];
  const ends: PointerPoint[] = [];
  const cleanup = platform.bindInput({
    onStart: (point: PointerPoint) => { starts.push(point); },
    onMove: (point: PointerPoint) => { moves.push(point); },
    onEnd: (point: PointerPoint) => { ends.push(point); },
    onCancel() {},
  });
  let prevented = 0;
  const event = {
    pointerId: 4,
    clientX: Number.POSITIVE_INFINITY,
    clientY: Number.NaN,
    cancelable: true,
    preventDefault: () => { prevented += 1; },
  };
  required(canvasListeners.get('contextmenu'), 'contextmenu 监听器')(event);
  required(canvasListeners.get('selectstart'), 'selectstart 监听器')(event);
  required(canvasListeners.get('dragstart'), 'dragstart 监听器')(event);
  required(canvasListeners.get('gesturestart'), 'gesturestart 监听器')(event);
  required(canvasListeners.get('pointerdown'), 'pointerdown 监听器')(event);
  required(windowListeners.get('pointermove'), 'window pointermove 监听器')(event);
  required(windowListeners.get('pointerup'), 'window pointerup 监听器')(event);
  required(canvasListeners.get('pointerup'), 'canvas pointerup 监听器')(event);
  assert.equal(starts.length, 1);
  assert.equal(moves.length, 1);
  assert.equal(ends.length, 1);
  assert.equal(prevented, 8);
  assert.ok([
    required(starts[0], '首个开始点').x,
    required(starts[0], '首个开始点').y,
    required(moves[0], '首个移动点').x,
    required(moves[0], '首个移动点').y,
    required(ends[0], '首个结束点').x,
    required(ends[0], '首个结束点').y,
  ].every(Number.isFinite));
  cleanup();
  assert.equal(canvasListeners.has('pointerdown'), false);
  assert.equal(canvasListeners.has('contextmenu'), false);
  assert.equal(canvasListeners.has('selectstart'), false);
  assert.equal(canvasListeners.has('dragstart'), false);
  assert.equal(canvasListeners.has('gesturestart'), false);
  assert.equal(windowListeners.has('pointerup'), false);
  assert.equal(windowListeners.has('pointermove'), false);
});

test('Web input rejects malformed pointer IDs and rolls back partial required bindings', () => {
  const canvasListeners = new Map<string, EventCallback>();
  const windowListeners = new Map<string, EventCallback>();
  const mainCanvas = canvasWithContext();
  mainCanvas.addEventListener = (type: string, callback: EventCallback) => {
    canvasListeners.set(type, callback);
  };
  mainCanvas.removeEventListener = (type: string, callback: EventCallback) => {
    if (canvasListeners.get(type) === callback) canvasListeners.delete(type);
  };
  const environment = {
    document: {
      hidden: false,
      querySelector: () => mainCanvas,
      createElement: () => canvasWithContext(),
      addEventListener() {},
      removeEventListener() {},
    },
    window: {
      addEventListener(type: string, callback: EventCallback) {
        if (type === 'pointermove') throw new Error('blocked pointermove');
        windowListeners.set(type, callback);
      },
      removeEventListener(type: string, callback: EventCallback) {
        if (windowListeners.get(type) === callback) windowListeners.delete(type);
      },
    },
  };
  const platform = createWebPlatform(environment);
  assert.throws(() => platform.bindInput(), /pointermove/);
  assert.equal(canvasListeners.size, 0);
  assert.equal(windowListeners.size, 0);

  environment.window.addEventListener = (type: string, callback: EventCallback) => {
    windowListeners.set(type, callback);
  };
  let starts = 0;
  const cleanup = platform.bindInput({ onStart: () => { starts += 1; } });
  required(canvasListeners.get('pointerdown'), '无效 pointerdown 监听器')({ pointerId: -1 });
  required(canvasListeners.get('pointerdown'), '非整数 pointerdown 监听器')({ pointerId: 1.5 });
  assert.equal(starts, 0);
  cleanup();
});

test('Web storage and share failures return safe values without rejection', async () => {
  const mainCanvas = canvasWithContext();
  mainCanvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1, height: 1 });
  mainCanvas.addEventListener = () => {};
  mainCanvas.removeEventListener = () => {};
  const environment = {
    document: {
      querySelector: () => mainCanvas,
      createElement: () => canvasWithContext(),
      addEventListener() {},
      removeEventListener() {},
    },
    window: {
      innerWidth: 1,
      innerHeight: 1,
      requestAnimationFrame: () => 1,
      cancelAnimationFrame() {},
      addEventListener() {},
      removeEventListener() {},
    },
    localStorage: {
      getItem: () => '{broken json',
      setItem: () => { throw new Error('quota'); },
      removeItem: () => { throw new Error('blocked'); },
    },
    navigator: {
      share: async () => { throw Object.assign(new Error('cancel'), { name: 'AbortError' }); },
    },
  };
  const platform = createWebPlatform(environment);
  assert.equal(platform.storageGet('save'), undefined);
  assert.equal(platform.storageSet('save', { score: 1 }), false);
  assert.equal(platform.storageRemove('save'), false);
  assert.deepEqual(platform.storageRead('save'), {
    ok: false,
    found: false,
    value: undefined,
  });
  assert.equal(platform.storageWrite('save', { score: 1 }), false);
  assert.equal(platform.storageDelete('save'), false);
  assert.equal(await platform.share({ title: 'test' }), false);
});

test('Web storage distinguishes missing values and round-trips JSON before deletion', () => {
  const values = new Map<string, string>();
  const mainCanvas = canvasWithContext();
  mainCanvas.addEventListener = () => {};
  mainCanvas.removeEventListener = () => {};
  const platform = createWebPlatform({
    document: {
      querySelector: () => mainCanvas,
      createElement: () => canvasWithContext(),
    },
    window: {},
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); },
    },
  });
  assert.deepEqual(platform.storageRead('pilot'), {
    ok: true,
    found: false,
    value: undefined,
  });
  assert.equal(platform.storageWrite('pilot', { revision: 1 }), true);
  assert.deepEqual(platform.storageRead('pilot'), {
    ok: true,
    found: true,
    value: { revision: 1 },
  });
  assert.equal(platform.storageDelete('pilot'), true);
  assert.equal(values.has('pilot'), false);
  assert.equal(platform.storageWrite('pilot', undefined), false);
  assert.equal(values.has('pilot'), false);
});

test('Web platform creates and mounts a fallback main Canvas when #game is missing', () => {
  const appended: MockCanvas[] = [];
  const fallbackCanvas = canvasWithContext();
  fallbackCanvas.addEventListener = () => {};
  fallbackCanvas.removeEventListener = () => {};
  const environment = {
    document: {
      querySelector: () => null,
      createElement: (tag: string) => {
        assert.equal(tag, 'canvas');
        return fallbackCanvas;
      },
      body: { appendChild: (node: MockCanvas) => { appended.push(node); } },
    },
    window: {},
  };
  const platform = createWebPlatform(environment);
  assert.equal(platform.createCanvas(), fallbackCanvas);
  assert.deepEqual(appended, [fallbackCanvas]);
  assert.equal(fallbackCanvas.id, 'game');
});

test('explicit webgl2 token is rejected when a host returns a WebGL1 context', () => {
  const context = {
    getContextAttributes: () => ({}),
    getParameter: () => 'WebGL 1.0',
  };
  const canvas = canvasWithContext(context);
  assert.throws(
    () => createPlatformContract({ id: 'broken-host' }).getWebGLContext(canvas),
    /\[broken-host\].*(?:非 WebGL2|WebGL2)/,
  );
});
