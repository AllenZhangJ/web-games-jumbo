import test from 'node:test';
import assert from 'node:assert/strict';
import type { ArenaInputFrame } from '@number-strategy-jump/arena-contracts';
import {
  ARENA_INPUT_ROUTER_MODE,
  ArenaInputRouter,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  createGestureInputMapperA,
  InputSampler,
} from '@number-strategy-jump/arena-presentation-runtime';

const VIEWPORT = Object.freeze({ width: 400, height: 800 });
interface TestPoint {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
}

const point = (pointerId: number, x: number, y: number): TestPoint => ({ pointerId, x, y });

function sample(router: ArenaInputRouter, tick: number): ArenaInputFrame {
  return router.sample(tick) as ArenaInputFrame;
}

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
    hitTestRematch: ({ x, y }: TestPoint) => x >= 120 && x <= 280 && y >= 350 && y <= 450,
    onRematchRequested: () => { rematches += 1; },
  });
  assert.equal(router.getDebugSnapshot().samplerSuspended, true);
  assert.throws(() => router.sample(0), /gameplay/);

  assert.equal(router.setMode(ARENA_INPUT_ROUTER_MODE.GAMEPLAY), true);
  assert.equal(router.pointerStart(point(1, 80, 600)), true);
  assert.equal(router.pointerMove(point(1, 130, 600)), true);
  assert.ok(sample(router, 0).moveX > 0);
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
  assert.equal(sample(router, 0).tick, 0);

  assert.equal(router.suspend(), true);
  assert.equal(router.suspend(), false);
  assert.throws(() => router.sample(1), /gameplay/);
  assert.equal(router.resume(), true);
  assert.equal(router.resume(), false);
  assert.equal(sample(router, 1).tick, 1);
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
  const broken: {
    destroyed: boolean;
    pointerStart(): void;
    pointerMove(): void;
    pointerEnd(): void;
    pointerCancel(): void;
    resize(): never;
    suspend(): void;
    resume(): void;
    sample(): void;
    destroy(): void;
  } = {
    destroyed: false,
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
  assert.equal(sample(router, 0).tick, 0);
  router.destroy();
});

test('ArenaInputRouter commits mode only after sampler resume succeeds', () => {
  const delegate = createSampler();
  let failResume = true;
  const sampler = {
    pointerStart: (value: unknown) => delegate.pointerStart(value),
    pointerMove: (value: unknown) => delegate.pointerMove(value),
    pointerEnd: (value: unknown) => delegate.pointerEnd(value),
    pointerCancel: (value: unknown) => delegate.pointerCancel(value),
    resize: (value: unknown) => delegate.resize(value),
    suspend: () => delegate.suspend(),
    resume() {
      if (failResume) throw new Error('resume failed');
      return delegate.resume();
    },
    sample: (tick: unknown, options: unknown) => delegate.sample(tick, options),
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
  assert.equal(sample(router, 0).tick, 0);
  router.destroy();
});
