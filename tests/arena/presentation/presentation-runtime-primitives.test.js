import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FixedTickAccumulator,
  PresentationFrameLoop,
} from '@number-strategy-jump/arena-presentation-runtime';

function schedulerHarness() {
  let nextToken = 1;
  const callbacks = new Map();
  return {
    callbacks,
    request(callback) {
      const token = nextToken;
      nextToken += 1;
      callbacks.set(token, callback);
      return token;
    },
    cancel(token) {
      callbacks.delete(token);
    },
    fire(timestamp) {
      const [token, callback] = callbacks.entries().next().value ?? [];
      if (!callback) throw new Error('no frame');
      callbacks.delete(token);
      callback(timestamp);
    },
  };
}

test('PresentationFrameLoop owns one frame, clamps wall time and suppresses late callbacks', () => {
  const scheduler = schedulerHarness();
  const errors = [];
  const frames = [];
  const loop = new PresentationFrameLoop({
    requestFrame: (callback) => scheduler.request(callback),
    cancelFrame: (token) => scheduler.cancel(token),
    now: () => 0,
    onError: (error) => errors.push(error),
    maxDeltaSeconds: 0.1,
  });
  assert.equal(loop.start((frame) => { frames.push(frame); }), true);
  assert.equal(loop.start(() => {}), false);
  assert.equal(scheduler.callbacks.size, 1);
  scheduler.fire(1_000);
  scheduler.fire(1_500);
  assert.deepEqual(frames.map(({ deltaSeconds }) => deltaSeconds), [0, 0.1]);
  assert.equal(scheduler.callbacks.size, 1);

  const stale = scheduler.callbacks.values().next().value;
  assert.equal(loop.stop(), true);
  assert.equal(scheduler.callbacks.size, 0);
  stale(2_000);
  assert.equal(frames.length, 2);
  assert.equal(loop.stop(), false);
  assert.deepEqual(errors, []);
  loop.destroy();
  loop.destroy();
  assert.throws(() => loop.start(() => {}), /已销毁/);
});

test('PresentationFrameLoop rejects synchronous hosts and contains callback failure', () => {
  const synchronousErrors = [];
  const synchronous = new PresentationFrameLoop({
    requestFrame(callback) { callback(0); return 7; },
    cancelFrame() {},
    now: () => 0,
    onError: (error) => synchronousErrors.push(error),
  });
  assert.throws(() => synchronous.start(() => {}), /同步 requestFrame/);
  assert.equal(synchronous.getDebugSnapshot().state, 'failed');
  assert.equal(synchronousErrors.length, 1);
  synchronous.destroy();

  const scheduler = schedulerHarness();
  const callbackErrors = [];
  const broken = new PresentationFrameLoop({
    requestFrame: (callback) => scheduler.request(callback),
    cancelFrame: (token) => scheduler.cancel(token),
    now: () => 0,
    onError: (error) => callbackErrors.push(error),
  });
  broken.start(() => { throw new Error('frame failed'); });
  scheduler.fire(16);
  assert.equal(broken.getDebugSnapshot().state, 'failed');
  assert.equal(scheduler.callbacks.size, 0);
  assert.match(callbackErrors[0].message, /frame failed/);
  broken.destroy();
});

test('FixedTickAccumulator preserves remainder and drops only excess catch-up ticks', () => {
  const accumulator = new FixedTickAccumulator({
    fixedDeltaSeconds: 1 / 60,
    maximumSteps: 4,
  });
  assert.deepEqual(accumulator.push(1 / 120), { steps: 0, droppedSeconds: 0 });
  assert.deepEqual(accumulator.push(1 / 120), { steps: 1, droppedSeconds: 0 });
  const catchUp = accumulator.push(10 / 60 + 0.004);
  assert.equal(catchUp.steps, 4);
  assert.ok(Math.abs(catchUp.droppedSeconds - 6 / 60) < 1e-12);
  assert.ok(Math.abs(accumulator.getDebugSnapshot().accumulatedSeconds - 0.004) < 1e-12);
  accumulator.reset();
  assert.equal(accumulator.getDebugSnapshot().accumulatedSeconds, 0);
  assert.ok(accumulator.getDebugSnapshot().droppedSeconds > 0);
});
