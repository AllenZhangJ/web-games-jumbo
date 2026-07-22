import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_INPUT_ROUTER_MODE,
  ArenaInputRouter,
} from '../../../src/arena/presentation/input/arena-input-router.js';
import {
  createGestureInputMapperA,
  InputSampler,
} from '@number-strategy-jump/arena-presentation-runtime';

const VIEWPORT = Object.freeze({ width: 400, height: 800 });
const point = (pointerId, x, y) => ({ pointerId, x, y });

function createSampler() {
  return new InputSampler({
    participantId: 'player-1',
    viewport: VIEWPORT,
    mapper: createGestureInputMapperA(),
  });
}

test('ArenaInputRouter isolates gameplay input, result hit testing and sampler replacement', () => {
  const firstSampler = createSampler();
  let rematches = 0;
  const router = new ArenaInputRouter({
    sampler: firstSampler,
    viewport: VIEWPORT,
    hitTestRematch: ({ x, y }) => x >= 120 && x <= 280 && y >= 350 && y <= 450,
    onRematchRequested: () => { rematches += 1; },
  });
  assert.equal(router.getDebugSnapshot().samplerSuspended, true);
  assert.throws(() => router.sample(0), /gameplay/);

  assert.equal(router.setMode(ARENA_INPUT_ROUTER_MODE.GAMEPLAY), true);
  assert.equal(router.pointerStart(point(1, 80, 600)), true);
  assert.equal(router.pointerMove(point(1, 130, 600)), true);
  assert.ok(router.sample(0).moveX > 0);
  assert.equal(router.setMode(ARENA_INPUT_ROUTER_MODE.RESULT), true);
  assert.equal(router.getDebugSnapshot().samplerSuspended, true);
  assert.throws(() => router.sample(1), /gameplay/);

  assert.equal(router.pointerStart(point(2, 20, 20)), false);
  assert.equal(router.pointerStart(point(3, 200, 400)), true);
  assert.equal(router.pointerEnd(point(4, 200, 400)), false);
  assert.equal(router.pointerEnd(point(3, 200, 400)), true);
  assert.equal(rematches, 1);
  assert.equal(router.pointerStart(point(5, 200, 400)), true);
  assert.equal(router.pointerCancel(point(5, 200, 400)), true);
  assert.equal(router.pointerEnd(point(5, 200, 400)), false);
  assert.equal(rematches, 1);

  const replacement = createSampler();
  assert.equal(router.replaceSampler(replacement), true);
  assert.throws(() => firstSampler.getDebugSnapshot(), /已销毁/);
  assert.equal(router.setMode(ARENA_INPUT_ROUTER_MODE.GAMEPLAY), true);
  assert.equal(router.sample(0).tick, 0);

  assert.equal(router.suspend(), true);
  assert.equal(router.suspend(), false);
  assert.throws(() => router.sample(1), /gameplay/);
  assert.equal(router.resume(), true);
  assert.equal(router.resume(), false);
  assert.equal(router.sample(1).tick, 1);
  router.destroy();
  router.destroy();
  assert.throws(() => router.setMode(ARENA_INPUT_ROUTER_MODE.RESULT), /已销毁/);
});

test('ArenaInputRouter rejects a failed replacement without losing the current sampler', () => {
  const current = createSampler();
  const router = new ArenaInputRouter({
    sampler: current,
    viewport: VIEWPORT,
    hitTestRematch: () => false,
    onRematchRequested: () => {},
  });
  const broken = {
    pointerStart() {},
    pointerMove() {},
    pointerEnd() {},
    pointerCancel() {},
    resize() { throw new Error('replacement resize failed'); },
    suspend() {},
    resume() {},
    sample() {},
    destroy() { this.destroyed = true; },
  };
  assert.throws(() => router.replaceSampler(broken), /replacement resize failed/);
  assert.equal(broken.destroyed, true);
  assert.equal(router.setMode(ARENA_INPUT_ROUTER_MODE.GAMEPLAY), true);
  assert.equal(router.sample(0).tick, 0);
  router.destroy();
});

test('ArenaInputRouter commits mode only after sampler resume succeeds', () => {
  const delegate = createSampler();
  let failResume = true;
  const sampler = {
    pointerStart: (value) => delegate.pointerStart(value),
    pointerMove: (value) => delegate.pointerMove(value),
    pointerEnd: (value) => delegate.pointerEnd(value),
    pointerCancel: (value) => delegate.pointerCancel(value),
    resize: (value) => delegate.resize(value),
    suspend: () => delegate.suspend(),
    resume() {
      if (failResume) throw new Error('resume failed');
      return delegate.resume();
    },
    sample: (tick, options) => delegate.sample(tick, options),
    destroy: () => delegate.destroy(),
  };
  const router = new ArenaInputRouter({
    sampler,
    viewport: VIEWPORT,
    hitTestRematch: () => false,
    onRematchRequested: () => {},
  });

  assert.throws(
    () => router.setMode(ARENA_INPUT_ROUTER_MODE.GAMEPLAY),
    /resume failed/,
  );
  assert.equal(router.getDebugSnapshot().mode, ARENA_INPUT_ROUTER_MODE.INACTIVE);
  assert.equal(router.getDebugSnapshot().samplerSuspended, true);
  failResume = false;
  assert.equal(router.setMode(ARENA_INPUT_ROUTER_MODE.GAMEPLAY), true);
  assert.equal(router.sample(0).tick, 0);
  router.destroy();
});
