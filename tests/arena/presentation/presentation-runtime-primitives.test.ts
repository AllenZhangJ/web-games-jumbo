import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FixedTickAccumulator,
  type PresentationFrame,
  PresentationFrameLoop,
} from '@number-strategy-jump/arena-presentation-runtime';

function schedulerHarness() {
  type FrameCallback = (timestamp: unknown) => void;
  let nextToken = 1;
  const callbacks = new Map<number, FrameCallback>();
  return {
    callbacks,
    request(callback: FrameCallback) {
      const token = nextToken;
      nextToken += 1;
      callbacks.set(token, callback);
      return token;
    },
    cancel(token: number) {
      callbacks.delete(token);
    },
    fire(timestamp: number) {
      const [token, callback] = callbacks.entries().next().value ?? [];
      if (!callback) throw new Error('no frame');
      callbacks.delete(required(token, '帧 token'));
      callback(timestamp);
    },
  };
}

function required<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined) throw new Error(`测试缺少 ${name}。`);
  return value;
}

test('PresentationFrameLoop owns one frame, clamps wall time and suppresses late callbacks', () => {
  const scheduler = schedulerHarness();
  const errors: unknown[] = [];
  const frames: PresentationFrame[] = [];
  const loop = new PresentationFrameLoop({
    requestFrame: (callback: (timestamp: unknown) => void) => scheduler.request(callback),
    cancelFrame: (token: unknown) => scheduler.cancel(token as number),
    now: () => 0,
    onError: (error: unknown) => errors.push(error),
    maxDeltaSeconds: 0.1,
  });
  assert.equal(loop.start((frame: PresentationFrame) => { frames.push(frame); }), true);
  assert.equal(loop.start(() => {}), false);
  assert.equal(scheduler.callbacks.size, 1);
  scheduler.fire(1_000);
  scheduler.fire(1_500);
  assert.deepEqual(frames.map(({ deltaSeconds }) => deltaSeconds), [0, 0.1]);
  assert.equal(scheduler.callbacks.size, 1);

  const stale = scheduler.callbacks.values().next().value;
  assert.equal(loop.stop(), true);
  assert.equal(scheduler.callbacks.size, 0);
  required(stale, '过期帧回调')(2_000);
  assert.equal(frames.length, 2);
  assert.equal(loop.stop(), false);
  assert.deepEqual(errors, []);
  loop.destroy();
  loop.destroy();
  assert.throws(() => loop.start(() => {}), /已销毁/);
});

test('PresentationFrameLoop rejects synchronous hosts and contains callback failure', () => {
  const synchronousErrors: unknown[] = [];
  const synchronous = new PresentationFrameLoop({
    requestFrame(callback: (timestamp: unknown) => void) { callback(0); return 7; },
    cancelFrame() {},
    now: () => 0,
    onError: (error: unknown) => synchronousErrors.push(error),
  });
  assert.throws(() => synchronous.start(() => {}), /同步 requestFrame/);
  assert.equal(synchronous.getDebugSnapshot().state, 'failed');
  assert.equal(synchronousErrors.length, 1);
  synchronous.destroy();

  const scheduler = schedulerHarness();
  const callbackErrors: unknown[] = [];
  const broken = new PresentationFrameLoop({
    requestFrame: (callback: (timestamp: unknown) => void) => scheduler.request(callback),
    cancelFrame: (token: unknown) => scheduler.cancel(token as number),
    now: () => 0,
    onError: (error: unknown) => callbackErrors.push(error),
  });
  broken.start(() => { throw new Error('frame failed'); });
  scheduler.fire(16);
  assert.equal(broken.getDebugSnapshot().state, 'failed');
  assert.equal(scheduler.callbacks.size, 0);
  const callbackError = required(callbackErrors[0], '帧回调错误');
  assert.match(callbackError instanceof Error ? callbackError.message : String(callbackError), /frame failed/);
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
  assert.ok(Math.abs(required(
    accumulator.getDebugSnapshot().accumulatedSeconds,
    '累计余量',
  ) - 0.004) < 1e-12);
  accumulator.reset();
  assert.equal(accumulator.getDebugSnapshot().accumulatedSeconds, 0);
  assert.ok(required(accumulator.getDebugSnapshot().droppedSeconds, '丢弃时间') > 0);
});
