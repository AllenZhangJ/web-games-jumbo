import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_CONTROL_ID,
  controlAtPoint,
  createArenaControlLayout,
  joystickRadius,
  RawControlState,
} from '@number-strategy-jump/arena-presentation-runtime';

const viewport = Object.freeze({ width: 400, height: 800 });
const point = (pointerId: number, x: number, y: number) => ({ pointerId, x, y });

test('control layout is strict and separates move, attack and jump controls', () => {
  const layout = createArenaControlLayout({ moveZoneFraction: 0.6 });
  assert.equal(controlAtPoint(point(1, 239, 400), viewport, layout), ARENA_CONTROL_ID.MOVE);
  assert.equal(controlAtPoint(point(1, 336, 608), viewport, layout), ARENA_CONTROL_ID.PRIMARY);
  assert.equal(controlAtPoint(point(1, 272, 688), viewport, layout), ARENA_CONTROL_ID.JUMP);
  assert.equal(controlAtPoint(point(1, 320, 300), viewport, layout), null);
  assert.equal(controlAtPoint(point(1, -1, 400), viewport, layout), null);
  assert.ok(Math.abs(joystickRadius(viewport, layout) - 56) < 1e-12);
  assert.throws(() => createArenaControlLayout({ moveZoneFraction: 1 }), /moveZoneFraction/);
  assert.throws(() => createArenaControlLayout({ future: true }), /future/);
  const hostile = {};
  Object.defineProperty(hostile, 'moveZoneFraction', { get: () => 0.5, enumerable: true });
  assert.throws(() => createArenaControlLayout(hostile), /访问器/);
});

test('RawControlState owns each pointer/control once and consumes edges exactly once', () => {
  const state = new RawControlState({ viewport });
  assert.equal(state.pointerStart(point(1, 80, 600)), true);
  assert.equal(state.pointerStart(point(1, 320, 600)), false);
  assert.equal(state.pointerStart(point(2, 100, 600)), false);
  assert.equal(state.pointerStart(point(2, 320, 600)), true);
  assert.equal(state.pointerStart(point(3, 272, 688)), true);
  assert.equal(state.pointerMove(point(99, 0, 0)), false);
  assert.equal(state.pointerEnd(point(99, 0, 0)), false);
  assert.equal(state.pointerMove(point(1, 180, 500)), true);

  const first = state.consumeSnapshot();
  assert.equal(first.move.active, true);
  assert.equal(first.move.pointerId, 1);
  assert.equal(first.move.edges.started, true);
  assert.equal(first.primary.active, true);
  assert.equal(first.primary.edges.started, true);
  assert.equal(first.jump.active, true);
  assert.equal(first.jump.edges.started, true);
  assert.ok(Math.hypot(first.move.vector.x, first.move.vector.z) <= 1 + 1e-12);
  assert.ok(first.move.vector.x > 0);
  assert.ok(first.move.vector.z > 0);
  assert.ok(Object.isFrozen(first.move.delta));

  const second = state.consumeSnapshot();
  assert.equal(second.move.edges.started, false);
  assert.equal(second.primary.edges.started, false);
  assert.equal(second.jump.edges.started, false);
  assert.equal(second.move.active, true);
  assert.equal(state.pointerCancel(point(2, 330, 610)), true);
  assert.equal(state.pointerEnd(point(3, 272, 688)), true);
  assert.equal(state.pointerEnd(point(1, 180, 500)), true);
  const released = state.consumeSnapshot();
  assert.equal(released.move.active, false);
  assert.equal(released.move.vector.x, 0);
  assert.equal(released.move.edges.ended, true);
  assert.equal(released.primary.edges.cancelled, true);
  assert.equal(released.primary.edges.ended, false);
  assert.equal(released.jump.edges.ended, true);
  state.destroy();
  state.destroy();
  assert.throws(() => state.consumeSnapshot(), /已销毁/);
});

test('same-frame tap preserves both edges while suspend/resize require a new touch', () => {
  const state = new RawControlState({ viewport });
  assert.equal(state.pointerStart(point(3, 330, 650)), true);
  assert.equal(state.pointerEnd(point(3, 331, 651)), true);
  assert.equal(state.pointerStart(point(33, 330, 650)), false);
  const tap = state.consumeSnapshot();
  assert.equal(tap.primary.active, false);
  assert.equal(tap.primary.edges.started, true);
  assert.equal(tap.primary.edges.ended, true);
  assert.equal(state.pointerStart(point(33, 330, 650)), true);
  assert.equal(state.pointerCancel(point(33, 330, 650)), true);
  state.consumeSnapshot();

  assert.equal(state.pointerStart(point(4, 80, 650)), true);
  assert.equal(state.suspend(), true);
  assert.equal(state.suspend(), false);
  const suspended = state.consumeSnapshot();
  assert.equal(suspended.suspended, true);
  assert.equal(suspended.move.active, false);
  assert.deepEqual(suspended.move.edges, { started: false, ended: false, cancelled: false });
  assert.equal(state.pointerEnd(point(4, 80, 650)), false);
  assert.equal(state.resume(), true);
  assert.equal(state.resume(), false);
  assert.equal(state.pointerMove(point(4, 100, 600)), false);
  assert.equal(state.pointerStart(point(5, 80, 650)), true);
  assert.equal(state.resize({ width: 800, height: 400 }), true);
  assert.equal(state.getDebugSnapshot().move.active, false);
  assert.equal(state.pointerEnd(point(5, 80, 650)), false);
  state.destroy();
});
