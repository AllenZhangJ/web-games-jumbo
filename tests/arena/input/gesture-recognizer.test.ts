import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GestureRecognizer,
  RawControlState,
} from '@number-strategy-jump/arena-presentation-runtime';

const viewport = Object.freeze({ width: 400, height: 800 });
const point = (pointerId: number, x: number, y: number) => ({ pointerId, x, y });

function sample(recognizer: GestureRecognizer, raw: RawControlState, tick: number) {
  return recognizer.sample(tick, raw.consumeSnapshot());
}

test('GestureRecognizer distinguishes quick swipe, long directional hold and cancel', () => {
  const raw = new RawControlState({ viewport });
  const recognizer = new GestureRecognizer({ holdActivationTicks: 3 });

  raw.pointerStart(point(1, 100, 600));
  sample(recognizer, raw, 0);
  raw.pointerMove(point(1, 100, 540));
  const up = sample(recognizer, raw, 1);
  assert.equal(up.move.directionPressed, 'up');
  assert.equal(up.move.directionHeld, null);
  raw.pointerEnd(point(1, 100, 540));
  const quickRelease = sample(recognizer, raw, 2);
  assert.equal(quickRelease.move.directionReleased, 'up');
  assert.equal(quickRelease.move.wasDirectionHeld, false);

  raw.pointerStart(point(2, 100, 600));
  sample(recognizer, raw, 3);
  raw.pointerMove(point(2, 100, 540));
  sample(recognizer, raw, 4);
  const held = sample(recognizer, raw, 5);
  assert.equal(held.move.contactHoldStarted, true);
  assert.equal(held.move.directionHoldStarted, 'up');
  assert.equal(held.move.directionHeld, 'up');
  assert.equal(sample(recognizer, raw, 6).move.directionHeld, 'up');
  raw.pointerEnd(point(2, 100, 540));
  const heldRelease = sample(recognizer, raw, 7);
  assert.equal(heldRelease.move.directionReleased, 'up');
  assert.equal(heldRelease.move.wasDirectionHeld, true);

  raw.pointerStart(point(3, 320, 600));
  sample(recognizer, raw, 8);
  raw.pointerMove(point(3, 320, 670));
  assert.equal(sample(recognizer, raw, 9).primary.directionPressed, 'down');
  raw.pointerCancel(point(3, 320, 670));
  const cancelled = sample(recognizer, raw, 10);
  assert.equal(cancelled.primary.cancelled, true);
  assert.equal(cancelled.primary.contactReleased, false);
  assert.equal(cancelled.primary.directionReleased, null);
  raw.destroy();
  recognizer.destroy();
});

test('GestureRecognizer handles same-tick tap and rejects gaps, duplicates and stale ownership', () => {
  const raw = new RawControlState({ viewport });
  const recognizer = new GestureRecognizer();
  raw.pointerStart(point(8, 320, 600));
  raw.pointerEnd(point(8, 321, 601));
  const tap = sample(recognizer, raw, 20);
  assert.equal(tap.primary.contactPressed, true);
  assert.equal(tap.primary.contactReleased, true);
  assert.equal(tap.primary.tapReleased, true);
  assert.equal(tap.primary.heldTicks, 1);
  assert.throws(() => sample(recognizer, raw, 20), /tick 必须连续/);
  assert.throws(() => sample(recognizer, raw, 22), /tick 必须连续/);
  recognizer.reset();
  recognizer.destroy();
  recognizer.destroy();
  assert.throws(() => recognizer.sample(21, raw.consumeSnapshot()), /已销毁/);
  raw.destroy();
});

test('GestureRecognizer validates a complete sample before committing sessions or tick', () => {
  const raw = new RawControlState({ viewport });
  const recognizer = new GestureRecognizer();
  raw.pointerStart(point(10, 100, 600));
  const valid = raw.consumeSnapshot();
  const hostilePrimary = { ...valid.primary };
  Object.defineProperty(hostilePrimary, 'active', {
    enumerable: true,
    get: () => {
      throw new Error('hostile getter must not run');
    },
  });
  assert.throws(() => recognizer.sample(0, {
    ...valid,
    primary: hostilePrimary,
  }), /访问器/);
  assert.deepEqual(recognizer.getDebugSnapshot(), {
    lastTick: -1,
    activeControls: [],
  });

  const accepted = recognizer.sample(0, valid);
  assert.equal(accepted.move.contactPressed, true);
  assert.deepEqual(recognizer.getDebugSnapshot().activeControls, ['move']);
  raw.destroy();
  recognizer.destroy();
});
