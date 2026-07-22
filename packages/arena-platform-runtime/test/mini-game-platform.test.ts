import { describe, expect, it } from 'vitest';
import { createMiniGamePlatform } from '../src/mini-game-platform.js';
import { createDouyinPlatform } from '../src/douyin-platform.js';
import { createWeChatPlatform } from '../src/wechat-platform.js';

type HostCallback = (...args: unknown[]) => unknown;

function miniGameFixture() {
  const handlers = new Map<string, HostCallback>();
  const storage = new Map<string, unknown>();
  const canvas = {
    width: 100,
    height: 200,
    getContext() { return {}; },
  };
  const bind = (name: string) => (callback: unknown) => {
    handlers.set(name, callback as HostCallback);
  };
  const unbind = (name: string) => (callback: unknown) => {
    if (handlers.get(name) === callback) handlers.delete(name);
  };
  const api = {
    createCanvas() { return canvas; },
    getWindowInfo() { return { windowWidth: 100, windowHeight: 200, pixelRatio: 2 }; },
    onTouchStart: bind('start'),
    offTouchStart: unbind('start'),
    onTouchMove: bind('move'),
    offTouchMove: unbind('move'),
    onTouchEnd: bind('end'),
    offTouchEnd: unbind('end'),
    onTouchCancel: bind('cancel'),
    offTouchCancel: unbind('cancel'),
    getStorageInfoSync() { return { keys: [...storage.keys()] }; },
    getStorageSync(key: unknown) { return storage.get(String(key)); },
    setStorageSync(key: unknown, value: unknown) { storage.set(String(key), value); },
    removeStorageSync(key: unknown) { storage.delete(String(key)); },
  };
  return { api, canvas, handlers, storage };
}

describe('strict mini-game platform host boundaries', () => {
  it('validates platform identity and leaves the borrowed main Canvas unmodified', () => {
    const fixture = miniGameFixture();
    expect(() => createMiniGamePlatform(fixture.api, 'unknown')).toThrow(/未知小游戏平台/);
    expect(createWeChatPlatform(fixture.api).id).toBe('wechat');
    expect(createDouyinPlatform(fixture.api).id).toBe('douyin');
    expect(Object.hasOwn(fixture.canvas, '__platformApi')).toBe(false);
  });

  it('snapshots returned safe-area data and rejects share accessors without execution', async () => {
    const fixture = miniGameFixture();
    const safeArea = { left: 0, top: 40, right: 100, bottom: 190, width: 100, height: 150 };
    let shared: unknown = null;
    Object.assign(fixture.api, {
      getWindowInfo: () => ({
        windowWidth: 100,
        windowHeight: 200,
        pixelRatio: 2,
        safeArea,
      }),
      shareAppMessage: (payload: unknown) => { shared = payload; },
    });
    const platform = createMiniGamePlatform(fixture.api, 'wechat');
    const viewport = platform.getViewport();
    expect(viewport.safeArea).toEqual(safeArea);
    expect(viewport.safeArea).not.toBe(safeArea);
    expect(Object.isFrozen(viewport.safeArea)).toBe(true);

    let reads = 0;
    const payload = {};
    Object.defineProperty(payload, 'title', {
      get() {
        reads += 1;
        return 'unsafe';
      },
    });
    expect(await platform.share(payload)).toBe(false);
    expect(reads).toBe(0);
    expect(await platform.share({ title: 'Arena', query: 'mode=quick' })).toBe(true);
    expect(shared).toEqual({ title: 'Arena', query: 'mode=quick' });
    expect(Object.isFrozen(shared)).toBe(true);
  });

  it('rejects input accessors and unknown fields before host registration', () => {
    const fixture = miniGameFixture();
    const platform = createMiniGamePlatform(fixture.api, 'wechat');
    let reads = 0;
    const bindings = {};
    Object.defineProperty(bindings, 'onStart', {
      enumerable: true,
      get() {
        reads += 1;
        return () => {};
      },
    });

    expect(() => platform.bindInput(bindings)).toThrow(/onStart.*数据字段/);
    expect(reads).toBe(0);
    expect(() => platform.bindInput({ future() {} })).toThrow(/未知字段 future/);
    expect(fixture.handlers.size).toBe(0);
  });

  it('makes late touch delivery inert and retries only a failed cleanup', () => {
    const fixture = miniGameFixture();
    const originalOffStart = fixture.api.offTouchStart;
    let failures = 1;
    let startRemovals = 0;
    fixture.api.offTouchStart = (callback) => {
      startRemovals += 1;
      if (failures > 0) {
        failures -= 1;
        throw new Error('start cleanup failed');
      }
      originalOffStart(callback);
    };
    const platform = createMiniGamePlatform(fixture.api, 'wechat');
    let starts = 0;
    const cleanup = platform.bindInput({ onStart() { starts += 1; } });

    expect(() => cleanup()).toThrow(/start cleanup failed/);
    expect([...fixture.handlers.keys()]).toEqual(['start']);
    fixture.handlers.get('start')?.({
      changedTouches: [{ identifier: 1, clientX: 2, clientY: 3 }],
    });
    expect(starts).toBe(0);
    expect(() => cleanup()).not.toThrow();
    expect(fixture.handlers.size).toBe(0);
    expect(startRemovals).toBe(2);
  });

  it('rejects asynchronous touch registration and rolls back the partial binding once', () => {
    const fixture = miniGameFixture();
    const originalOnMove = fixture.api.onTouchMove;
    const originalOffMove = fixture.api.offTouchMove;
    let moveRemovals = 0;
    fixture.api.onTouchMove = (callback) => {
      originalOnMove(callback);
      return Promise.resolve();
    };
    fixture.api.offTouchMove = (callback) => {
      moveRemovals += 1;
      originalOffMove(callback);
    };
    const platform = createMiniGamePlatform(fixture.api, 'wechat');

    expect(() => platform.bindInput()).toThrow(/onTouchMove/);
    expect(fixture.handlers.size).toBe(0);
    expect(moveRemovals).toBe(1);
  });

  it('bounds hostile touch collections while dispatching ordinary changed touches independently', () => {
    const fixture = miniGameFixture();
    const platform = createMiniGamePlatform(fixture.api, 'wechat');
    const points: unknown[] = [];
    const cleanup = platform.bindInput({ onStart(point: unknown) { points.push(point); } });
    const start = fixture.handlers.get('start');
    start?.({
      changedTouches: Array.from({ length: 33 }, (_, identifier) => ({ identifier })),
    });
    expect(points).toEqual([]);
    start?.({
      changedTouches: [
        { identifier: 4, clientX: 10, clientY: 20 },
        { identifier: 7, clientX: 90, clientY: 180 },
      ],
    });
    expect(points).toEqual([
      { pointerId: 4, x: 10, y: 20 },
      { pointerId: 7, x: 90, y: 180 },
    ]);
    cleanup();
  });

  it('snapshots synchronous storage and safely consumes later asynchronous host results', async () => {
    const fixture = miniGameFixture();
    const platform = createMiniGamePlatform(fixture.api, 'wechat');
    let mutatedCalls = 0;
    fixture.api.getStorageSync = () => { mutatedCalls += 1; return Promise.resolve('late'); };
    fixture.api.setStorageSync = () => { mutatedCalls += 1; return Promise.resolve(); };
    fixture.api.removeStorageSync = () => { mutatedCalls += 1; return Promise.reject(new Error('late')); };

    expect(platform.storageWrite('save', { revision: 1 })).toBe(true);
    expect(platform.storageRead('save')).toEqual({
      ok: true,
      found: true,
      value: { revision: 1 },
    });
    expect(platform.storageDelete('save')).toBe(true);
    await Promise.resolve();
    expect(mutatedCalls).toBe(0);

    const asynchronous = miniGameFixture();
    asynchronous.api.getStorageSync = () => Promise.resolve('late');
    asynchronous.api.setStorageSync = () => Promise.resolve();
    asynchronous.api.removeStorageSync = () => Promise.reject(new Error('late'));
    const asynchronousPlatform = createMiniGamePlatform(asynchronous.api, 'wechat');
    expect(asynchronousPlatform.storageRead('save')).toEqual({ ok: true, found: false, value: undefined });
    asynchronous.storage.set('save', 'known');
    expect(asynchronousPlatform.storageRead('save')).toEqual({ ok: false, found: false, value: undefined });
    expect(asynchronousPlatform.storageWrite('save', 'value')).toBe(false);
    expect(asynchronousPlatform.storageDelete('save')).toBe(false);
    await Promise.resolve();
  });

  it('rejects a thenable callback-style file read even after a synchronous success callback', async () => {
    const fixture = miniGameFixture();
    Object.assign(fixture.api, {
      getFileSystemManager: () => ({
        readFile({ success }: { success: (value: unknown) => void }) {
          success({ data: new Uint8Array([1, 2, 3]) });
          return Promise.reject(new Error('ambiguous async result'));
        },
      }),
    });
    const platform = createMiniGamePlatform(fixture.api, 'wechat');

    await expect(platform.readAssetBytes('./assets/model.glb')).rejects.toThrow(/读取本地资产失败/);
    await Promise.resolve();
  });
});
