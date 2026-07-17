import test from 'node:test';
import assert from 'node:assert/strict';
import { createGestureInputMapperA } from '../../../src/arena/presentation/input/gesture-input-mapper-a.js';
import { InputSampler } from '../../../src/arena/presentation/input/input-sampler.js';
import { PointerInputAdapter } from '../../../src/arena/presentation/input/pointer-input-adapter.js';

const point = (pointerId, x, y) => ({ pointerId, x, y });

function platformHarness({ failAt = null } = {}) {
  const handlers = {};
  const active = new Set();
  const bind = (name, callback) => {
    if (failAt === name) throw new Error(`${name} failed`);
    handlers[name] = callback;
    active.add(name);
    return () => {
      active.delete(name);
      if (handlers[name] === callback) delete handlers[name];
    };
  };
  return {
    handlers,
    active,
    platform: {
      bindInput: (callbacks) => bind('input', callbacks),
      onResize: (callback) => bind('resize', callback),
      onHide: (callback) => bind('hide', callback),
      onShow: (callback) => bind('show', callback),
    },
  };
}

test('PointerInputAdapter binds move/multitouch and clears ownership across hide/show', () => {
  const harness = platformHarness();
  const errors = [];
  let viewport = { width: 400, height: 800 };
  const sampler = new InputSampler({
    participantId: 'player-1',
    viewport,
    mapper: createGestureInputMapperA(),
  });
  const adapter = new PointerInputAdapter({
    platform: harness.platform,
    sampler,
    viewportProvider: () => viewport,
    onError: (error) => errors.push(error),
  });
  assert.equal(adapter.start(), true);
  assert.equal(adapter.start(), false);
  assert.equal(harness.active.size, 4);
  harness.handlers.input.onStart(point(1, 80, 600));
  harness.handlers.input.onStart(point(2, 320, 600));
  harness.handlers.input.onMove(point(1, 140, 560));
  const first = sampler.sample(0);
  assert.ok(first.moveX > 0);
  assert.equal(first.primaryPressed, true);

  harness.handlers.hide();
  assert.throws(() => sampler.sample(1), /暂停/);
  assert.equal(harness.handlers.input.onEnd(point(1, 140, 560)), false);
  harness.handlers.show();
  assert.equal(harness.handlers.input.onMove(point(1, 150, 550)), false);
  assert.deepEqual(sampler.sample(1), {
    tick: 1,
    participantId: 'player-1',
    moveX: 0,
    moveZ: 0,
    primaryPressed: false,
    primaryHeld: false,
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: false,
  });

  viewport = { width: 800, height: 400 };
  harness.handlers.resize();
  assert.deepEqual(sampler.getDebugSnapshot().controls.viewport, viewport);
  assert.deepEqual(errors, []);
  const staleInput = harness.handlers.input;
  assert.equal(adapter.stop(), true);
  assert.equal(adapter.stop(), false);
  assert.equal(harness.active.size, 0);
  assert.equal(staleInput.onStart(point(3, 80, 200)), false);
  adapter.destroy();
  adapter.destroy();
  assert.throws(() => adapter.start(), /已销毁/);
  sampler.destroy();
});

test('PointerInputAdapter rolls back partial binding and contains late/error callbacks', () => {
  const harness = platformHarness({ failAt: 'hide' });
  const sampler = new InputSampler({
    participantId: 'player-1',
    viewport: { width: 400, height: 800 },
    mapper: createGestureInputMapperA(),
  });
  const adapter = new PointerInputAdapter({
    platform: harness.platform,
    sampler,
    viewportProvider: () => ({ width: 400, height: 800 }),
  });
  assert.throws(() => adapter.start(), /hide failed/);
  assert.equal(harness.active.size, 0);
  assert.deepEqual(adapter.getDebugSnapshot(), {
    state: 'idle',
    cleanupCount: 0,
    destroyRequested: false,
  });
  adapter.destroy();
  sampler.destroy();
});

test('PointerInputAdapter contains destroy reentry during start and stop cleanup', () => {
  const createSampler = () => new InputSampler({
    participantId: 'player-1',
    viewport: { width: 400, height: 800 },
    mapper: createGestureInputMapperA(),
  });

  const startingSampler = createSampler();
  let startingAdapter;
  let startingCleanupCalls = 0;
  const startingPlatform = {
    bindInput() {
      startingAdapter.destroy();
      return () => { startingCleanupCalls += 1; };
    },
    onResize() { throw new Error('destroy 后不应继续绑定 resize'); },
    onHide() { throw new Error('destroy 后不应继续绑定 hide'); },
    onShow() { throw new Error('destroy 后不应继续绑定 show'); },
  };
  startingAdapter = new PointerInputAdapter({
    platform: startingPlatform,
    sampler: startingSampler,
    viewportProvider: () => ({ width: 400, height: 800 }),
  });
  assert.throws(() => startingAdapter.start(), /请求销毁/);
  assert.equal(startingCleanupCalls, 1);
  assert.equal(startingAdapter.getDebugSnapshot().state, 'destroyed');
  startingAdapter.destroy();
  startingSampler.destroy();

  const stoppingSampler = createSampler();
  let stoppingAdapter;
  let cleanupCalls = 0;
  const cleanup = () => { cleanupCalls += 1; };
  const stoppingPlatform = {
    bindInput: () => () => {
      cleanup();
      stoppingAdapter.destroy();
    },
    onResize: () => cleanup,
    onHide: () => cleanup,
    onShow: () => cleanup,
  };
  stoppingAdapter = new PointerInputAdapter({
    platform: stoppingPlatform,
    sampler: stoppingSampler,
    viewportProvider: () => ({ width: 400, height: 800 }),
  });
  assert.equal(stoppingAdapter.start(), true);
  assert.equal(stoppingAdapter.stop(), true);
  assert.equal(cleanupCalls, 4);
  assert.equal(stoppingAdapter.getDebugSnapshot().state, 'destroyed');
  stoppingAdapter.destroy();
  stoppingSampler.destroy();
});
