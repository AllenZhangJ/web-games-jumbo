import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCT_RENDERER_STATE,
  ProductRenderer,
} from '../../../src/arena/presentation/renderer/product-renderer.js';

function childHarness({ disposeFailures = 0 } = {}) {
  let remainingDisposeFailures = disposeFailures;
  return {
    loaded: 0,
    rendered: [],
    resized: [],
    disposed: false,
    contextLost: false,
    async load() { this.loaded += 1; return this; },
    render(frame, options) { this.rendered.push({ frame, options }); return !this.contextLost; },
    renderComposite(frame, overlay, options) {
      this.rendered.push({ frame, overlay, options });
      if (this.contextLost) return false;
      return overlay.present({ render() {} });
    },
    resize(viewport) { this.resized.push(viewport); return true; },
    getInputViewport: () => ({ width: 800, height: 1600 }),
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
    dispose() {
      if (remainingDisposeFailures > 0) {
        remainingDisposeFailures -= 1;
        throw new Error('child dispose failed');
      }
      this.disposed = true;
    },
  };
}

function surfaceHarness({ disposeFailures = 0, loadPromise = null, composite = true } = {}) {
  let remainingDisposeFailures = disposeFailures;
  return {
    loaded: 0,
    rendered: [],
    resized: [],
    disposed: false,
    handlers: null,
    presented: 0,
    async load() { this.loaded += 1; if (loadPromise) await loadPromise; return this; },
    render(viewModel, options) { this.rendered.push({ viewModel, options }); return true; },
    resize(viewport, inputViewport) {
      this.resized.push({ viewport, inputViewport });
      return true;
    },
    getInputViewport: (fallback) => fallback,
    hitTestUi: (point, viewport, viewModel) => ({ point, viewport, viewModel }),
    requiresCompositeFrame: () => composite,
    present() { this.presented += 1; return true; },
    bindIntent(handlers) {
      this.handlers = handlers;
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        if (this.handlers === handlers) this.handlers = null;
      };
    },
    dispose() {
      if (remainingDisposeFailures > 0) {
        remainingDisposeFailures -= 1;
        throw new Error('surface dispose failed');
      }
      this.disposed = true;
    },
  };
}

function rendererHarness({ gameplay = childHarness(), surface = surfaceHarness() } = {}) {
  const renderer = new ProductRenderer({
    canvas: { getContext: () => ({}) },
    platform: {},
    gameplayRendererFactory: () => gameplay,
    uiSurfaceFactory: () => surface,
  });
  return { renderer, gameplay, surface };
}

test('ProductRenderer keeps product UI and gameplay frames on separate read-only ports', async () => {
  const { renderer, gameplay, surface } = rendererHarness();
  await renderer.load();
  assert.equal(renderer.state, PRODUCT_RENDERER_STATE.READY);
  const viewport = { width: 400, height: 800, pixelRatio: 2 };
  assert.equal(renderer.resize(viewport), true);
  assert.deepEqual(surface.resized[0], {
    viewport,
    inputViewport: { width: 800, height: 1600 },
  });

  const viewModel = { screen: { sceneId: 'home' } };
  assert.equal(renderer.render({ viewModel, matchFrame: null }, { deltaSeconds: 0 }), true);
  assert.equal(surface.rendered.length, 1);
  assert.equal(gameplay.rendered.length, 1);
  assert.equal(gameplay.rendered[0].frame, null);
  assert.equal(gameplay.rendered[0].overlay, surface);

  const matchFrame = { source: { tick: 4 } };
  renderer.render({ viewModel: { screen: { sceneId: 'gameplay' } }, matchFrame }, {
    deltaSeconds: 1 / 60,
  });
  assert.equal(surface.rendered.length, 2);
  assert.equal(surface.presented, 2);
  assert.equal(gameplay.rendered.length, 2);
  assert.equal(gameplay.rendered[1].frame, matchFrame);
  assert.deepEqual(renderer.getInputViewport(), { width: 800, height: 1600 });

  const handlers = { onIntent: () => {}, onRejected: () => {} };
  const cleanup = renderer.bindUiIntent(handlers);
  assert.equal(surface.handlers, handlers);
  cleanup();
  assert.equal(surface.handlers, null);
  renderer.dispose();
  renderer.dispose();
  assert.equal(gameplay.disposed, true);
  assert.equal(surface.disposed, true);
  assert.equal(renderer.state, PRODUCT_RENDERER_STATE.DISPOSED);
});

test('ProductRenderer propagates context loss and resumes only after child restoration', async () => {
  const { renderer, gameplay } = rendererHarness();
  await renderer.load();
  let prevented = false;
  assert.equal(renderer.handleContextLost({ preventDefault: () => { prevented = true; } }), true);
  assert.equal(prevented, true);
  assert.equal(renderer.state, PRODUCT_RENDERER_STATE.CONTEXT_LOST);
  assert.equal(renderer.render({ viewModel: {}, matchFrame: null }), false);
  assert.equal(renderer.handleContextRestored(), true);
  assert.equal(gameplay.contextLost, false);
  assert.equal(renderer.state, PRODUCT_RENDERER_STATE.READY);
  renderer.dispose();
});

test('ProductRenderer skips an empty canvas pass for host-native menu surfaces', async () => {
  const surface = surfaceHarness({ composite: false });
  const { renderer, gameplay } = rendererHarness({ surface });
  await renderer.load();
  renderer.render({ viewModel: { screen: { sceneId: 'home' } }, matchFrame: null });
  assert.equal(gameplay.rendered.length, 0);
  const matchFrame = { source: { tick: 1 } };
  renderer.render({ viewModel: { screen: { sceneId: 'gameplay' } }, matchFrame });
  assert.equal(gameplay.rendered.length, 1);
  assert.equal(gameplay.rendered[0].frame, matchFrame);
  renderer.dispose();
});

test('ProductRenderer preserves a context loss that races an asynchronous UI load', async () => {
  let releaseLoad;
  const loadPromise = new Promise((resolve) => { releaseLoad = resolve; });
  const gameplay = childHarness();
  const surface = surfaceHarness({ loadPromise });
  const { renderer } = rendererHarness({ gameplay, surface });
  const loading = renderer.load();
  await Promise.resolve();
  assert.equal(renderer.handleContextLost({ preventDefault() {} }), true);
  releaseLoad();
  await loading;
  assert.equal(renderer.state, PRODUCT_RENDERER_STATE.CONTEXT_LOST);
  assert.equal(gameplay.contextLost, true);
  assert.equal(renderer.handleContextRestored(), true);
  assert.equal(renderer.state, PRODUCT_RENDERER_STATE.READY);
  renderer.dispose();
});

test('ProductRenderer still performs initial load when context is lost before load starts', async () => {
  const { renderer, gameplay, surface } = rendererHarness();
  assert.equal(renderer.handleContextLost({ preventDefault() {} }), true);
  await renderer.load();
  assert.equal(gameplay.loaded, 1);
  assert.equal(surface.loaded, 1);
  assert.equal(renderer.state, PRODUCT_RENDERER_STATE.CONTEXT_LOST);
  assert.equal(renderer.handleContextRestored(), true);
  renderer.dispose();
});

test('ProductRenderer shares a pending load and preserves terminal disposal over late completion', async () => {
  let releaseLoad;
  const loadPromise = new Promise((resolve) => { releaseLoad = resolve; });
  const gameplay = childHarness();
  const surface = surfaceHarness({ loadPromise });
  const { renderer } = rendererHarness({ gameplay, surface });
  const first = renderer.load();
  const second = renderer.load();
  assert.equal(first, second);
  await Promise.resolve();
  renderer.dispose();
  assert.equal(renderer.state, PRODUCT_RENDERER_STATE.DISPOSED);
  releaseLoad();
  await assert.rejects(first, /加载已取消/);
  assert.equal(renderer.state, PRODUCT_RENDERER_STATE.DISPOSED);
  assert.equal(gameplay.disposed, true);
  assert.equal(surface.disposed, true);
});

test('ProductRenderer retains only failed children and completes cleanup on retry', async () => {
  const gameplay = childHarness({ disposeFailures: 1 });
  const surface = surfaceHarness();
  const { renderer } = rendererHarness({ gameplay, surface });
  await renderer.load();
  assert.throws(() => renderer.dispose(), /清理未完整完成/);
  assert.equal(renderer.state, PRODUCT_RENDERER_STATE.DISPOSE_INCOMPLETE);
  assert.equal(surface.disposed, true);
  assert.equal(gameplay.disposed, false);
  renderer.dispose();
  assert.equal(gameplay.disposed, true);
  assert.equal(renderer.state, PRODUCT_RENDERER_STATE.DISPOSED);
});

test('ProductRenderer rejects incomplete child contracts and clears owned candidates', () => {
  const gameplay = childHarness();
  let invalidSurfaceDisposed = false;
  assert.throws(
    () => new ProductRenderer({
      canvas: { getContext: () => ({}) },
      platform: {},
      gameplayRendererFactory: () => gameplay,
      uiSurfaceFactory: () => ({ dispose() { invalidSurfaceDisposed = true; } }),
    }),
    /初始化失败/,
  );
  assert.equal(gameplay.disposed, true);
  assert.equal(invalidSurfaceDisposed, true);
});
