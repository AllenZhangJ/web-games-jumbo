import { describe, expect, it } from 'vitest';
import { createWebPlatform } from '../src/web-platform.js';

type HostCallback = (...args: unknown[]) => unknown;

function eventTarget() {
  const listeners = new Map<string, Set<HostCallback>>();
  return {
    listeners,
    addEventListener(type: unknown, callback: unknown) {
      const key = String(type);
      const bucket = listeners.get(key) ?? new Set<HostCallback>();
      bucket.add(callback as HostCallback);
      listeners.set(key, bucket);
    },
    removeEventListener(type: unknown, callback: unknown) {
      const key = String(type);
      const bucket = listeners.get(key);
      bucket?.delete(callback as HostCallback);
      if (bucket?.size === 0) listeners.delete(key);
    },
    emit(type: string, event: unknown) {
      for (const callback of [...(listeners.get(type) ?? [])]) callback(event);
    },
  };
}

function webFixture() {
  const canvasEvents = eventTarget();
  const windowEvents = eventTarget();
  const documentEvents = eventTarget();
  const canvas = {
    ...canvasEvents,
    width: 100,
    height: 100,
    clientWidth: 100,
    clientHeight: 100,
    getContext() { return {}; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
    setPointerCapture() {},
    releasePointerCapture() {},
  };
  const windowObject = {
    ...windowEvents,
    innerWidth: 100,
    innerHeight: 100,
  };
  const documentObject = {
    ...documentEvents,
    hidden: false,
    querySelector() { return canvas; },
    createElement() { return canvas; },
  };
  return {
    canvas,
    windowObject,
    documentObject,
    environment: { window: windowObject, document: documentObject },
  };
}

describe('strict Web platform host boundaries', () => {
  it('rejects input accessors and unknown fields before registering listeners', () => {
    const fixture = webFixture();
    const platform = createWebPlatform(fixture.environment);
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
    expect(() => platform.bindInput({ futureCallback() {} })).toThrow(/未知字段 futureCallback/);
    expect(fixture.canvas.listeners.size).toBe(0);
    expect(fixture.windowObject.listeners.size).toBe(0);
  });

  it('snapshots listener methods and retains only failed cleanup work for retry', () => {
    const fixture = webFixture();
    const platform = createWebPlatform(fixture.environment);
    const originalRemove = fixture.canvas.removeEventListener;
    let pointerDownFailures = 1;
    let originalPointerDownRemoves = 0;
    fixture.canvas.removeEventListener = function remove(type, callback) {
      if (type === 'pointerdown') {
        originalPointerDownRemoves += 1;
        if (pointerDownFailures > 0) {
          pointerDownFailures -= 1;
          throw new Error('pointerdown cleanup failed');
        }
      }
      return originalRemove.call(this, type, callback);
    };
    let starts = 0;
    const cleanup = platform.bindInput({ onStart() { starts += 1; } });
    let mutatedRemoves = 0;
    fixture.canvas.removeEventListener = () => {
      mutatedRemoves += 1;
      throw new Error('mutated removal must not run');
    };

    expect(() => cleanup()).toThrow(/pointerdown cleanup failed/);
    expect(fixture.canvas.listeners.size).toBe(1);
    expect(fixture.canvas.listeners.has('pointerdown')).toBe(true);
    fixture.canvas.emit('pointerdown', {
      pointerId: 3,
      clientX: 1,
      clientY: 2,
      preventDefault() {},
    });
    expect(starts).toBe(0);
    expect(() => cleanup()).not.toThrow();
    expect(fixture.canvas.listeners.size).toBe(0);
    expect(originalPointerDownRemoves).toBe(2);
    expect(mutatedRemoves).toBe(0);
  });

  it('suppresses late resize delivery while retrying a failed observer cleanup', () => {
    const fixture = webFixture();
    let observerCallback = () => {};
    let disconnectFailures = 1;
    let disconnects = 0;
    class MockResizeObserver {
      constructor(callback: () => void) {
        observerCallback = callback;
      }

      observe() {}

      disconnect() {
        disconnects += 1;
        if (disconnectFailures > 0) {
          disconnectFailures -= 1;
          throw new Error('observer cleanup failed');
        }
      }
    }
    const platform = createWebPlatform({
      ...fixture.environment,
      ResizeObserver: MockResizeObserver,
    });
    let resizes = 0;
    const cleanup = platform.onResize(() => { resizes += 1; });
    observerCallback();
    expect(resizes).toBe(1);

    expect(() => cleanup()).toThrow(/observer cleanup failed/);
    observerCallback();
    fixture.windowObject.emit('resize', {});
    expect(resizes).toBe(1);
    expect(() => cleanup()).not.toThrow();
    expect(disconnects).toBe(2);
  });

  it('rejects asynchronous required registration and rolls back every partial listener', () => {
    const fixture = webFixture();
    const originalAdd = fixture.windowObject.addEventListener;
    fixture.windowObject.addEventListener = function add(type, callback) {
      originalAdd.call(this, type, callback);
      if (type === 'pointermove') return Promise.resolve();
      return undefined;
    };
    const platform = createWebPlatform(fixture.environment);

    expect(() => platform.bindInput()).toThrow(/pointermove/);
    expect(fixture.canvas.listeners.size).toBe(0);
    expect(fixture.windowObject.listeners.size).toBe(0);
  });

  it('rolls lifecycle listeners back when a later optional host registration is asynchronous', () => {
    const fixture = webFixture();
    const originalAdd = fixture.windowObject.addEventListener;
    fixture.windowObject.addEventListener = function add(type, callback) {
      originalAdd.call(this, type, callback);
      if (type === 'focus') return Promise.resolve();
      return undefined;
    };
    const platform = createWebPlatform(fixture.environment);

    expect(() => platform.onShow(() => {})).toThrow(/focus/);
    expect(fixture.documentObject.listeners.size).toBe(0);
    expect(fixture.windowObject.listeners.size).toBe(0);
  });

  it('rolls pointer ownership back when an input callback throws', () => {
    const fixture = webFixture();
    const platform = createWebPlatform(fixture.environment);
    let starts = 0;
    const cleanup = platform.bindInput({
      onStart() {
        starts += 1;
        throw new Error('consumer failed');
      },
    });
    const event = { pointerId: 7, clientX: 10, clientY: 20, preventDefault() {} };

    expect(() => fixture.canvas.emit('pointerdown', event)).toThrow(/consumer failed/);
    expect(() => fixture.canvas.emit('pointerdown', event)).toThrow(/consumer failed/);
    expect(starts).toBe(2);
    cleanup();
  });

  it('snapshots storage methods and consumes unsupported asynchronous results safely', async () => {
    const fixture = webFixture();
    const storage: {
      getItem(): unknown;
      setItem(): unknown;
      removeItem(): unknown;
    } = {
      getItem() { return Promise.resolve('{"revision":1}'); },
      setItem() { return Promise.resolve(); },
      removeItem() { return Promise.reject(new Error('late removal failure')); },
    };
    const platform = createWebPlatform({ ...fixture.environment, localStorage: storage });
    let mutatedCalls = 0;
    storage.getItem = () => { mutatedCalls += 1; return Promise.resolve('{}'); };
    storage.setItem = () => { mutatedCalls += 1; return Promise.resolve(); };
    storage.removeItem = () => { mutatedCalls += 1; return Promise.resolve(); };

    expect(platform.storageRead('save')).toEqual({ ok: false, found: false, value: undefined });
    expect(platform.storageWrite('save', { revision: 1 })).toBe(false);
    expect(platform.storageDelete('save')).toBe(false);
    await Promise.resolve();
    expect(mutatedCalls).toBe(0);
  });
});
