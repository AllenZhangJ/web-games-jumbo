import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_RULES } from '../src/config.js';
import { GAME_PHASE } from '../src/core/game-state.js';
import { findOperationPath } from '../src/core/operations.js';
import { bootstrap } from '../src/runtime/bootstrap.js';
import { NumberStrategyGame } from '../src/runtime/game.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createHarness({ pendingLoad = null, draw = null } = {}) {
  let clock = 0;
  let nextFrameId = 1;
  let failRequestFrame = false;
  const frames = new Map();
  const handlers = {};
  const counts = {
    bindInput: 0,
    resizeBinding: 0,
    showBinding: 0,
    hideBinding: 0,
    cleanup: 0,
    requestFrame: 0,
    cancelFrame: 0,
  };
  const bind = (name, callback, countKey) => {
    handlers[name] = callback;
    counts[countKey] += 1;
    return () => {
      counts.cleanup += 1;
      if (handlers[name] === callback) delete handlers[name];
    };
  };
  const platform = {
    createCanvas: () => ({}),
    now: () => clock,
    requestFrame: (callback) => {
      counts.requestFrame += 1;
      if (failRequestFrame) throw new Error('requestFrame unavailable');
      const id = nextFrameId;
      nextFrameId += 1;
      frames.set(id, callback);
      return id;
    },
    cancelFrame: (id) => {
      counts.cancelFrame += 1;
      frames.delete(id);
    },
    bindInput: (callbacks) => {
      handlers.input = callbacks;
      counts.bindInput += 1;
      return () => {
        counts.cleanup += 1;
        if (handlers.input === callbacks) delete handlers.input;
      };
    },
    onResize: (callback) => bind('resize', callback, 'resizeBinding'),
    onShow: (callback) => bind('show', callback, 'showBinding'),
    onHide: (callback) => bind('hide', callback, 'hideBinding'),
  };
  const renderer = {
    resizeCalls: 0,
    loadCalls: 0,
    drawCalls: 0,
    destroyCalls: 0,
    resize() {
      this.resizeCalls += 1;
    },
    async load() {
      this.loadCalls += 1;
      if (pendingLoad) await pendingLoad.promise;
      return this;
    },
    toDesignPoint: (point) => ({ x: point.x, y: point.y }),
    hitTest: (point) => point?.control ?? null,
    draw(...args) {
      this.drawCalls += 1;
      return draw?.(...args, this.drawCalls);
    },
    destroy() {
      this.destroyCalls += 1;
    },
    getDebugSnapshot: () => null,
  };
  const game = new NumberStrategyGame(platform, {
    seed: 45,
    rendererFactory: () => renderer,
  });

  return {
    game,
    platform,
    renderer,
    handlers,
    frames,
    counts,
    setClock(value) {
      clock = value;
    },
    failRequestFrame(value = true) {
      failRequestFrame = value;
    },
    fireNextFrame(time) {
      const entry = frames.entries().next().value;
      assert.ok(entry, 'expected one queued frame');
      const [id, callback] = entry;
      frames.delete(id);
      callback(time);
    },
  };
}

test('start is idempotent while loading and binds exactly one frame loop', async () => {
  const load = deferred();
  const harness = createHarness({ pendingLoad: load });
  const first = harness.game.start();
  const second = harness.game.start();

  assert.strictEqual(first, second);
  assert.equal(harness.renderer.loadCalls, 1);
  load.resolve();
  await Promise.all([first, second]);

  assert.equal(harness.game.lifecycle, 'running');
  assert.equal(harness.counts.bindInput, 1);
  assert.equal(harness.counts.resizeBinding, 1);
  assert.equal(harness.counts.showBinding, 1);
  assert.equal(harness.counts.hideBinding, 1);
  assert.equal(harness.frames.size, 1);

  await harness.game.start();
  assert.equal(harness.counts.bindInput, 1);
  assert.equal(harness.frames.size, 1);
  harness.game.destroy();
});

test('only explicit bottom controls can start a charge and each maps to its branch', async () => {
  const harness = createHarness();
  await harness.game.start();

  assert.equal(harness.handlers.input.onStart({ x: 120, y: 500, pointerId: 1 }), false);
  assert.equal(harness.game.state.phase, GAME_PHASE.READY);
  assert.equal(harness.game.activePointerId, null);

  assert.equal(harness.handlers.input.onStart({
    x: 560,
    y: 1240,
    pointerId: 2,
    control: 'choice-right',
  }), true);
  assert.equal(harness.game.state.phase, GAME_PHASE.CHARGING);
  assert.equal(harness.game.state.selectedChoice, 1);
  assert.equal(harness.game.presentation.selectedChoice, 1);

  harness.handlers.input.onCancel({ x: 560, y: 1240, pointerId: 2 });
  assert.equal(harness.game.state.phase, GAME_PHASE.READY);

  assert.equal(harness.handlers.input.onStart({
    x: 190,
    y: 1240,
    pointerId: 3,
    control: 'choice-left',
  }), true);
  assert.equal(harness.game.state.selectedChoice, 0);
  harness.game.destroy();
});

test('screen-projected control mapping can swap logical candidates without changing core order', async () => {
  const harness = createHarness();
  harness.renderer.choiceIndexForControl = (control) => (
    control === 'choice-left' ? 1 : control === 'choice-right' ? 0 : null
  );
  await harness.game.start();

  assert.equal(harness.handlers.input.onStart({
    x: 190,
    y: 1240,
    pointerId: 31,
    control: 'choice-left',
  }), true);
  assert.equal(harness.game.state.selectedChoice, 1);
  harness.handlers.input.onCancel({ x: 190, y: 1240, pointerId: 31 });

  assert.equal(harness.handlers.input.onStart({
    x: 560,
    y: 1240,
    pointerId: 32,
    control: 'choice-right',
  }), true);
  assert.equal(harness.game.state.selectedChoice, 0);
  harness.game.destroy();
});

test('start rejects and unbinds when the first frame cannot be scheduled', async () => {
  const harness = createHarness();
  harness.failRequestFrame();

  await assert.rejects(harness.game.start(), /requestFrame unavailable/);
  assert.equal(harness.game.lifecycle, 'idle');
  assert.equal(harness.game.eventsBound, false);
  assert.equal(harness.counts.cleanup, 4);
  assert.equal(harness.frames.size, 0);
  assert.equal(harness.game.getDebugSnapshot().lastRuntimeError.source, 'request-frame');
  harness.game.destroy();
});

test('a later frame scheduling failure unbinds input and failed lifecycle rejects late events', async () => {
  const harness = createHarness();
  await harness.game.start();
  const staleInput = harness.handlers.input;
  staleInput.onStart({ x: 100, y: 500, pointerId: 21, control: 'choice-left' });
  assert.equal(harness.game.state.phase, GAME_PHASE.CHARGING);
  assert.equal(harness.game.activePointerId, 21);

  harness.failRequestFrame();
  harness.fireNextFrame(16);

  assert.equal(harness.game.lifecycle, 'failed');
  assert.equal(harness.game.eventsBound, false);
  assert.equal(harness.game.activePointerId, null);
  assert.equal(harness.game.state.phase, GAME_PHASE.READY);
  assert.equal(harness.handlers.input, undefined);
  assert.equal(staleInput.onStart({ x: 600, y: 500, pointerId: 22 }), false);
  assert.equal(staleInput.onEnd({ x: 100, y: 500, pointerId: 21 }), false);
  assert.equal(harness.game.state.phase, GAME_PHASE.READY);
  assert.equal(harness.game.activePointerId, null);
  harness.game.destroy();
});

test('start rejects before binding when initial renderer resize reports failure', async () => {
  const harness = createHarness();
  harness.renderer.resize = () => false;

  await assert.rejects(harness.game.start(), /首屏尺寸初始化失败/);
  assert.equal(harness.renderer.loadCalls, 0);
  assert.equal(harness.counts.bindInput, 0);
  assert.equal(harness.frames.size, 0);
  assert.equal(harness.game.getDebugSnapshot().lastRuntimeError.source, 'initial-resize');
  harness.game.destroy();
});

test('destroy during asynchronous load prevents late bindings and frame scheduling', async () => {
  const load = deferred();
  const harness = createHarness({ pendingLoad: load });
  const started = harness.game.start();

  harness.game.destroy();
  load.resolve();
  await assert.rejects(started, /启动完成前已销毁/);

  assert.equal(harness.game.lifecycle, 'destroyed');
  assert.equal(harness.counts.bindInput, 0);
  assert.equal(harness.counts.requestFrame, 0);
  assert.equal(harness.renderer.destroyCalls, 1);
});

test('missing or mismatched frame timestamps stay finite and pointer release uses real hold duration', async () => {
  const harness = createHarness();
  harness.setClock(100);
  await harness.game.start();
  harness.handlers.input.onStart({ x: 100, y: 500, pointerId: 7, control: 'choice-left' });

  harness.fireNextFrame(9_999_999_999);
  harness.setClock(140);
  harness.fireNextFrame(undefined);
  assert.ok(Number.isFinite(harness.game.accumulator));
  assert.ok(harness.game.state.chargeMs > 0);

  harness.setClock(725);
  harness.handlers.input.onEnd({ x: 100, y: 500, pointerId: 7 });
  assert.equal(harness.game.state.phase, GAME_PHASE.JUMPING);
  assert.equal(harness.game.jump.trajectory.chargeMs, 625);
  harness.game.destroy();
});

test('pause or hide cancels an active pointer and overlay click resumes to READY', async () => {
  const harness = createHarness();
  await harness.game.start();
  harness.handlers.input.onStart({ x: 100, y: 500, pointerId: 3, control: 'choice-left' });
  assert.equal(harness.game.state.phase, GAME_PHASE.CHARGING);

  harness.handlers.hide();
  assert.equal(harness.game.state.phase, GAME_PHASE.PAUSED);
  assert.equal(harness.game.state.previousPhase, GAME_PHASE.READY);
  assert.equal(harness.game.activePointerId, null);

  harness.handlers.input.onEnd({ x: 100, y: 500, pointerId: 3 });
  assert.equal(harness.game.state.phase, GAME_PHASE.PAUSED);
  harness.handlers.input.onStart({ x: 300, y: 700, pointerId: 4 });
  assert.equal(harness.game.state.phase, GAME_PHASE.READY);
  assert.equal(harness.game.activePointerId, null);
  harness.handlers.input.onEnd({ x: 300, y: 700, pointerId: 4 });
  assert.equal(harness.game.state.phase, GAME_PHASE.READY);
  harness.game.destroy();
});

test('foreign pointer cancellation is ignored and restart clears the owning pointer', async () => {
  const harness = createHarness();
  await harness.game.start();
  harness.handlers.input.onStart({ x: 100, y: 500, pointerId: 11, control: 'choice-left' });

  harness.handlers.input.onCancel({ x: 200, y: 500, pointerId: 12 });
  assert.equal(harness.game.state.phase, GAME_PHASE.CHARGING);
  assert.equal(harness.game.activePointerId, 11);

  harness.game.restart();
  assert.equal(harness.game.state.phase, GAME_PHASE.READY);
  assert.equal(harness.game.activePointerId, null);
  harness.handlers.input.onEnd({ x: 100, y: 500, pointerId: 11 });
  assert.equal(harness.game.state.phase, GAME_PHASE.READY);
  harness.game.destroy();
});

test('a transient frame failure is recorded and the next frame still runs', async () => {
  const harness = createHarness({
    draw: (...args) => {
      const drawCount = args.at(-1);
      if (drawCount === 1) throw new Error('transient draw failure');
    },
  });
  await harness.game.start();

  harness.fireNextFrame(10);
  assert.equal(harness.game.lifecycle, 'running');
  assert.equal(harness.game.runtimeErrorCount, 1);
  assert.equal(harness.frames.size, 1);

  harness.fireNextFrame(30);
  assert.equal(harness.renderer.drawCalls, 2);
  assert.equal(harness.game.consecutiveFrameErrors, 0);
  assert.equal(harness.frames.size, 1);
  harness.game.destroy();
});

test('three consecutive renderer false results enter an explicit failed state', async () => {
  const harness = createHarness({ draw: () => false });
  await harness.game.start();
  harness.handlers.input.onStart({ x: 100, y: 500, pointerId: 23, control: 'choice-left' });
  assert.equal(harness.game.state.phase, GAME_PHASE.CHARGING);

  harness.fireNextFrame(10);
  harness.fireNextFrame(30);
  harness.fireNextFrame(50);

  assert.equal(harness.game.lifecycle, 'failed');
  assert.equal(harness.game.state.phase, GAME_PHASE.READY);
  assert.equal(harness.game.activePointerId, null);
  assert.equal(harness.game.eventsBound, false);
  assert.equal(harness.game.consecutiveFrameErrors, 3);
  assert.equal(harness.frames.size, 0);
  assert.match(harness.game.getDebugSnapshot().lastRuntimeError.message, /未能完成当前帧/);
  harness.game.destroy();
});

test('destroyed callback cannot schedule a replacement frame', async () => {
  const harness = createHarness();
  await harness.game.start();
  const callback = harness.frames.values().next().value;
  const requestsBeforeDestroy = harness.counts.requestFrame;

  harness.game.destroy();
  callback(16);
  assert.equal(harness.counts.requestFrame, requestsBeforeDestroy);
  assert.equal(harness.frames.size, 0);
});

test('failed world commit leaves numeric state untouched', () => {
  const harness = createHarness();
  const before = {
    value: harness.game.state.currentValue,
    moves: harness.game.state.movesRemaining,
    step: harness.game.world.step,
    rng: harness.game.state.rng.snapshot(),
  };
  assert.equal(harness.game.debugJump(0), true);
  harness.game.world.commitLanding = () => {
    throw new Error('candidate generation failed');
  };

  assert.throws(() => harness.game.resolveJump(), /candidate generation failed/);
  assert.equal(harness.game.state.currentValue, before.value);
  assert.equal(harness.game.state.movesRemaining, before.moves);
  assert.equal(harness.game.state.phase, GAME_PHASE.JUMPING);
  assert.equal(harness.game.world.step, before.step);
  assert.equal(harness.game.state.rng.snapshot(), before.rng);
  harness.game.destroy();
});

test('fixed step applies only jump overflow time to landing animation', () => {
  const harness = createHarness();
  assert.equal(harness.game.debugJump(0), true);
  harness.game.jump.elapsedMs = harness.game.jump.trajectory.durationMs - 5;

  harness.game.update(10);
  assert.equal(harness.game.state.phase, GAME_PHASE.LANDING);
  assert.ok(Math.abs(harness.game.state.landingProgress - 5 / GAME_RULES.landingDurationMs) < 1e-9);
  harness.game.destroy();
});

test('the guaranteed branch completes a formerly unwinnable seed through runtime and world commits', () => {
  const harness = createHarness();
  let jumps = 0;
  while (harness.game.state.phase !== GAME_PHASE.WON) {
    const path = findOperationPath({
      value: harness.game.state.currentValue,
      target: harness.game.state.targetValue,
      maxMoves: harness.game.state.movesRemaining,
    });
    assert.ok(path?.length);
    const next = path[0];
    const choiceIndex = harness.game.state.choices.findIndex((choice) => (
      choice.kind === next.kind && choice.amount === next.amount
    ));
    assert.notEqual(choiceIndex, -1);
    assert.equal(harness.game.debugJump(choiceIndex), true);
    harness.game.update(harness.game.jump.trajectory.durationMs);
    assert.equal(harness.game.state.phase, GAME_PHASE.LANDING);
    harness.game.update(GAME_RULES.landingDurationMs);
    jumps += 1;
    assert.ok(jumps <= GAME_RULES.movesPerRound);
  }

  assert.equal(harness.game.state.currentValue, harness.game.state.targetValue);
  assert.equal(harness.game.world.step, jumps);
  assert.equal(harness.game.world.current.preview, harness.game.state.currentValue);
  harness.game.destroy();
});

test('bootstrap replaces the previous global game without leaking its loop', async () => {
  delete globalThis.__NUMBER_STRATEGY_GAME__;
  const firstHarness = createHarness();
  const first = await bootstrap(firstHarness.platform, {
    seed: 1,
    rendererFactory: () => firstHarness.renderer,
  });
  const secondHarness = createHarness();
  const second = await bootstrap(secondHarness.platform, {
    seed: 2,
    rendererFactory: () => secondHarness.renderer,
  });

  assert.equal(first.lifecycle, 'destroyed');
  assert.equal(firstHarness.renderer.destroyCalls, 1);
  assert.equal(firstHarness.frames.size, 0);
  assert.strictEqual(globalThis.__NUMBER_STRATEGY_GAME__, second);

  second.destroy();
  delete globalThis.__NUMBER_STRATEGY_GAME__;
});

test('concurrent bootstrap keeps only the newest pending instance alive', async () => {
  delete globalThis.__NUMBER_STRATEGY_GAME__;
  const load = deferred();
  const firstHarness = createHarness({ pendingLoad: load });
  const firstStart = bootstrap(firstHarness.platform, {
    seed: 3,
    rendererFactory: () => firstHarness.renderer,
  });
  const secondHarness = createHarness();
  const second = await bootstrap(secondHarness.platform, {
    seed: 4,
    rendererFactory: () => secondHarness.renderer,
  });

  load.resolve();
  await assert.rejects(firstStart, /启动完成前已销毁/);
  assert.equal(firstHarness.renderer.destroyCalls, 1);
  assert.equal(firstHarness.frames.size, 0);
  assert.strictEqual(globalThis.__NUMBER_STRATEGY_GAME__, second);

  second.destroy();
  delete globalThis.__NUMBER_STRATEGY_GAME__;
});

test('a broken previous global cleanup cannot block bootstrap replacement', async () => {
  globalThis.__NUMBER_STRATEGY_GAME__ = {
    destroy() {
      throw new Error('old cleanup failed');
    },
  };
  const harness = createHarness();
  const game = await bootstrap(harness.platform, {
    seed: 5,
    rendererFactory: () => harness.renderer,
  });

  assert.strictEqual(globalThis.__NUMBER_STRATEGY_GAME__, game);
  game.destroy();
  delete globalThis.__NUMBER_STRATEGY_GAME__;
});
