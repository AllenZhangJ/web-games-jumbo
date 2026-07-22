import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ProductCanvasUiSurface,
} from '@number-strategy-jump/arena-product-presentation-three';
import {
  createProductCanvasLayout,
} from '@number-strategy-jump/arena-product-presentation';
import {
  createProductUiSceneModel,
} from '@number-strategy-jump/arena-product-presentation';
import {
  PRODUCT_PRESENTATION_SESSION_STATE,
} from '@number-strategy-jump/arena-product-presentation';
import {
  createProductPresentationSession,
} from '@number-strategy-jump/arena-v1-application-session';
import { PRODUCT_SESSION_STATE } from '@number-strategy-jump/arena-product-state';
import { createArenaProductRendererFactory } from '../src/entry/create-arena-product-renderer.js';
import { createMiniGamePlatform } from '@number-strategy-jump/arena-platform-runtime/mini-game';

function fake2dContext() {
  return Object.fromEntries([
    'setTransform',
    'clearRect',
    'beginPath',
    'moveTo',
    'lineTo',
    'quadraticCurveTo',
    'closePath',
    'fill',
    'stroke',
    'arc',
    'fillRect',
    'fillText',
  ].map((name) => [name, () => {}]));
}

function miniHostHarness() {
  const viewport = {
    width: 390,
    height: 844,
    pixelRatio: 2,
    safeArea: { left: 0, top: 42, right: 390, bottom: 820, width: 390, height: 778 },
  };
  const mainCanvas = {
    width: 1,
    height: 1,
    getContext: (kind) => kind === 'webgl2' ? {
      getContextAttributes: () => ({ alpha: false }),
      getParameter: () => 'WebGL 2.0',
      texStorage2D() {},
      createVertexArray() {},
    } : null,
  };
  const input = {};
  const lifecycle = {};
  const storage = new Map();
  let frameId = 0;
  let now = 10_000;
  const bind = (bucket, name) => (callback) => { bucket[name] = callback; };
  const unbind = (bucket, name) => (callback) => {
    if (bucket[name] === callback) delete bucket[name];
  };
  const api = {
    createCanvas: () => mainCanvas,
    createOffscreenCanvas: ({ width, height } = {}) => ({
      width: width ?? 2,
      height: height ?? 2,
      getContext: (kind) => kind === '2d' ? fake2dContext() : null,
    }),
    getWindowInfo: () => ({
      windowWidth: viewport.width,
      windowHeight: viewport.height,
      pixelRatio: viewport.pixelRatio,
      safeArea: viewport.safeArea,
    }),
    getPerformance: () => ({ now: () => now }),
    requestAnimationFrame: () => { frameId += 1; return frameId; },
    cancelAnimationFrame() {},
    onTouchStart: bind(input, 'start'),
    offTouchStart: unbind(input, 'start'),
    onTouchMove: bind(input, 'move'),
    offTouchMove: unbind(input, 'move'),
    onTouchEnd: bind(input, 'end'),
    offTouchEnd: unbind(input, 'end'),
    onTouchCancel: bind(input, 'cancel'),
    offTouchCancel: unbind(input, 'cancel'),
    onWindowResize: bind(lifecycle, 'resize'),
    offWindowResize: unbind(lifecycle, 'resize'),
    onShow: bind(lifecycle, 'show'),
    offShow: unbind(lifecycle, 'show'),
    onHide: bind(lifecycle, 'hide'),
    offHide: unbind(lifecycle, 'hide'),
    getStorageSync: (key) => storage.get(key),
    getStorageInfoSync: () => ({ keys: [...storage.keys()] }),
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: (key) => storage.delete(key),
  };
  return {
    api,
    input,
    lifecycle,
    mainCanvas,
    storage,
    viewport,
    advanceNow(milliseconds) { now += milliseconds; },
  };
}

function fakeGameplayRenderer({ canvas }, resources) {
  const target = { render() { resources.overlayRenders += 1; } };
  let contextLost = false;
  return {
    async load() { resources.loaded += 1; return this; },
    render() { return !contextLost; },
    renderComposite(frame, overlay) {
      resources.frames.push(frame);
      if (contextLost) return false;
      return overlay.present(target);
    },
    resize(viewport) {
      canvas.width = Math.round(viewport.width * viewport.pixelRatio);
      canvas.height = Math.round(viewport.height * viewport.pixelRatio);
      resources.resizes += 1;
      return true;
    },
    getInputViewport: () => ({ width: canvas.width, height: canvas.height }),
    handleContextLost(event) {
      event?.preventDefault?.();
      contextLost = true;
      return true;
    },
    handleContextRestored() {
      if (!contextLost) return false;
      contextLost = false;
      return true;
    },
    getDebugSnapshot: () => ({ contextLost }),
    dispose() { resources.disposed += 1; },
  };
}

async function flushIntents() {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

test('mini-game Product composition routes Canvas touch intent and owns host lifecycle cleanup', async () => {
  const host = miniHostHarness();
  const platform = createMiniGamePlatform(host.api, 'wechat');
  const resources = {
    loaded: 0,
    resizes: 0,
    overlayRenders: 0,
    disposed: 0,
    frames: [],
  };
  const rendererFactory = createArenaProductRendererFactory({
    gameplayRendererFactory: (args) => fakeGameplayRenderer(args, resources),
    uiSurfaceFactory: (args) => new ProductCanvasUiSurface(args),
  });
  const session = createProductPresentationSession(platform, {
    initialSeed: 0x855_0001,
    ownerId: 'mini-host-smoke',
    rendererFactory,
  });

  await session.start();
  assert.equal(session.state, PRODUCT_PRESENTATION_SESSION_STATE.RUNNING);
  const ready = session.getLastSnapshot();
  assert.equal(ready.viewModel.activeState, PRODUCT_SESSION_STATE.READY);
  assert.ok(resources.overlayRenders > 0);
  assert.equal(resources.loaded, 1);
  assert.ok(resources.resizes >= 1);

  const layout = createProductCanvasLayout(
    createProductUiSceneModel(ready.viewModel),
    host.viewport,
  );
  const secondary = layout.actions.find(({ kind }) => kind === 'secondary');
  assert.ok(secondary);
  const point = {
    identifier: 11,
    clientX: secondary.rect.x + secondary.rect.width / 2,
    clientY: secondary.rect.y + secondary.rect.height / 2,
  };
  host.input.start({ changedTouches: [point] });
  host.input.end({ changedTouches: [point] });
  await flushIntents();
  assert.equal(
    session.getLastSnapshot().viewModel.activeState,
    PRODUCT_SESSION_STATE.CHARACTER_SELECT,
  );

  host.lifecycle.hide();
  assert.equal(session.state, PRODUCT_PRESENTATION_SESSION_STATE.PAUSED);
  host.advanceNow(500);
  host.lifecycle.show();
  assert.equal(session.state, PRODUCT_PRESENTATION_SESSION_STATE.RUNNING);
  assert.equal(
    session.getLastSnapshot().viewModel.activeState,
    PRODUCT_SESSION_STATE.CHARACTER_SELECT,
  );

  session.destroy();
  session.destroy();
  assert.equal(session.state, PRODUCT_PRESENTATION_SESSION_STATE.DESTROYED);
  assert.equal(resources.disposed, 1);
  assert.deepEqual(host.input, {});
  assert.deepEqual(host.lifecycle, {});
  assert.equal(
    [...host.storage.keys()].some((key) => key.includes('.lease')),
    false,
  );
});
