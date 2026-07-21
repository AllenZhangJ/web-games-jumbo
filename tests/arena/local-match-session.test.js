import test from 'node:test';
import assert from 'node:assert/strict';
import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';
import { createArenaV1MatchCore } from '../../src/arena/arena-v1-match-core.js';
import { replayMatch } from '../../src/arena/replay.js';
import { QuickMatchService } from '../../src/arena/matchmaking/quick-match-service.js';
import {
  LOCAL_MATCH_SESSION_STATE,
  LocalMatchSession,
} from '@number-strategy-jump/arena-session';

function neutral(snapshot) {
  return createNeutralInputFrame(snapshot.tick, 'player-1');
}

test('quick match public surface does not leak bot identity or hidden difficulty', () => {
  const diagnostics = [];
  const match = new QuickMatchService({ diagnosticSink: (value) => diagnostics.push(value) })
    .create({ matchSeed: 11 });
  const publicInfo = match.session.getPublicMatchInfo();
  assert.equal(Object.isFrozen(publicInfo), true);
  assert.equal(Object.isFrozen(publicInfo.opponent), true);
  const serialized = JSON.stringify({
    matchSeed: match.matchSeed,
    opponent: match.opponent,
    publicInfo,
  });
  assert.equal(diagnostics.length, 1);
  assert.match(diagnostics[0].effectiveDifficultyId, /^(easy|normal|hard)$/);
  assert.doesNotMatch(serialized, /difficulty|\bbot\b|机器人|简单|普通|困难/i);
  assert.equal(match.session.getDebugSnapshot, undefined);
  match.session.destroy();
});

test('diagnostic failure cannot cancel a valid quick match', () => {
  const match = new QuickMatchService({
    diagnosticSink: () => { throw new Error('logger unavailable'); },
  }).create({ matchSeed: 15 });
  match.session.start();
  const submitted = neutral(match.session.getSnapshot());
  const accepted = match.session.step(submitted);
  assert.deepEqual(accepted.input, submitted);
  assert.ok(Object.isFrozen(accepted.input));
  assert.equal(match.session.getSnapshot().tick, 1);
  match.session.destroy();
});

test('production quick match rejects difficulty overrides', () => {
  const service = new QuickMatchService();
  assert.throws(() => service.create({
    matchSeed: 1,
    difficultyOverride: 'hard',
  }), /不允许覆盖/);
});

test('invalid player input fails before bot or core mutation and session remains usable', () => {
  const { session } = new QuickMatchService().create({ matchSeed: 12 });
  session.start();
  assert.throws(() => session.step({
    ...createNeutralInputFrame(0, 'player-2'),
  }), /不能控制隐藏对手/);
  assert.equal(session.getSnapshot().tick, 0);
  session.step(neutral(session.getSnapshot()));
  assert.equal(session.getSnapshot().tick, 1);
  session.destroy();
});

test('LocalMatchSession pause, complete replay and destruction have explicit lifecycles', () => {
  const { session } = new QuickMatchService().create({
    matchSeed: 2,
    config: { preparingTicks: 0 },
  });
  assert.equal(session.state, LOCAL_MATCH_SESSION_STATE.CREATED);
  session.setPaused(true);
  assert.equal(session.state, LOCAL_MATCH_SESSION_STATE.CREATED);
  session.start();
  session.start();
  assert.equal(session.state, LOCAL_MATCH_SESSION_STATE.PAUSED);
  assert.throws(() => session.setPaused('yes'), /布尔值/);
  const paused = session.step();
  assert.equal(paused.snapshot.tick, 0);
  assert.equal(paused.input, null);
  session.setPaused(false);
  const replay = session.runUntilEnded(neutral);
  assert.equal(session.state, LOCAL_MATCH_SESSION_STATE.ENDED);
  assert.deepEqual(session.runUntilEnded(neutral), replay);
  assert.deepEqual(replayMatch(replay).result, replay.result);
  session.destroy();
  session.destroy();
  assert.throws(() => session.getSnapshot(), /已销毁/);
});

test('pre-start App hide/show is idempotent and does not start the match early', () => {
  const { session } = new QuickMatchService().create({ matchSeed: 24 });
  session.setPaused(true);
  session.setPaused(true);
  session.setPaused(false);
  assert.equal(session.state, LOCAL_MATCH_SESSION_STATE.CREATED);
  assert.equal(session.getSnapshot().tick, 0);
  session.start();
  assert.equal(session.state, LOCAL_MATCH_SESSION_STATE.RUNNING);
  session.destroy();
});

test('rapid App pause/resume never advances a paused tick or desynchronizes the bot', () => {
  for (let seed = 0; seed < 32; seed += 1) {
    const { session } = new QuickMatchService().create({
      matchSeed: 1000 + seed,
      config: { preparingTicks: 0 },
    });
    if (seed % 2 === 0) session.setPaused(true);
    session.start();
    if (session.state === LOCAL_MATCH_SESSION_STATE.PAUSED) {
      const pausedTick = session.getSnapshot().tick;
      assert.equal(session.step().snapshot.tick, pausedTick);
      session.setPaused(false);
    }
    for (let index = 0; index < 120; index += 1) {
      if (index % 17 === 0) {
        session.setPaused(true);
        const pausedTick = session.getSnapshot().tick;
        assert.equal(session.step().snapshot.tick, pausedTick);
        session.setPaused(false);
      }
      session.step(neutral(session.getSnapshot()));
    }
    assert.equal(session.getSnapshot().tick, 120);
    session.destroy();
    session.destroy();
  }
});

test('caller-owned InputFrame accessors are rejected without execution and session remains usable', () => {
  const { session } = new QuickMatchService().create({
    matchSeed: 25,
    config: { preparingTicks: 0 },
  });
  session.start();
  let getterCalls = 0;
  const frame = {
    tick: 0,
    get participantId() {
      getterCalls += 1;
      return 'player-1';
    },
    moveX: 0,
    moveZ: 0,
    primaryPressed: false,
    primaryHeld: false,
  };
  assert.throws(() => session.step(frame), /数据字段/);
  assert.equal(getterCalls, 0);
  assert.equal(session.getSnapshot().tick, 0);
  session.step();
  assert.equal(session.getSnapshot().tick, 1);
  session.destroy();
});

test('failed LocalMatchSession construction does not take ownership of the core', () => {
  const core = createArenaV1MatchCore({ seed: 16 });
  assert.throws(() => new LocalMatchSession({
    core,
    botController: { createInput() {}, destroy() {} },
    publicMatchInfo: { matchSeed: 16, opponent: null },
  }), /opponent 不存在/);
  assert.equal(core.getSnapshot().tick, 0);
  core.destroy();
});

test('same quick-match seed and player inputs reproduce final replay hash', () => {
  const run = () => {
    const { session } = new QuickMatchService().create({
      matchSeed: 22,
      config: { preparingTicks: 0 },
    });
    session.start();
    const replay = session.runUntilEnded(neutral);
    session.destroy();
    return replay;
  };
  const first = run();
  const second = run();
  assert.equal(first.finalHash, second.finalHash);
  assert.deepEqual(first.events, second.events);
  assert.deepEqual(first.result, second.result);
});

test('QuickMatchService cleans partial ownership when a later factory fails', () => {
  let core;
  let controllerDestroyed = false;
  const service = new QuickMatchService({
    coreFactory: (options) => {
      core = createArenaV1MatchCore(options);
      return core;
    },
    botControllerFactory: () => ({
      createInput() {},
      destroy() { controllerDestroyed = true; },
    }),
    sessionFactory: () => { throw new Error('session factory failed'); },
  });
  assert.throws(() => service.create({ matchSeed: 18 }), /session factory failed/);
  assert.equal(controllerDestroyed, true);
  assert.throws(() => core.getSnapshot(), /已销毁/);
});

test('QuickMatchService rejects an incomplete session contract before returning it', () => {
  let fakeSessionDestroyed = false;
  const service = new QuickMatchService({
    sessionFactory: () => ({
      start() {},
      step() {},
      destroy() { fakeSessionDestroyed = true; },
    }),
  });
  assert.throws(() => service.create({ matchSeed: 28 }), /缺少 setPaused/);
  assert.equal(fakeSessionDestroyed, true);
});

test('bot or authoritative step failures destroy the entire local session', () => {
  const core = createArenaV1MatchCore({ seed: 19, config: { preparingTicks: 0 } });
  let controllerDestroyed = false;
  const session = new LocalMatchSession({
    core,
    botController: {
      createInput() { throw new Error('bot failed'); },
      destroy() { controllerDestroyed = true; },
    },
    publicMatchInfo: {
      matchSeed: 19,
      opponent: {
        id: 'test-opponent',
        displayName: '测试对手',
        portraitKey: 'portrait-test',
        appearanceKey: 'appearance-test',
      },
    },
  });
  session.start();
  assert.throws(() => session.step(neutral(session.getSnapshot())), /bot failed/);
  assert.equal(session.state, LOCAL_MATCH_SESSION_STATE.DESTROYED);
  assert.equal(controllerDestroyed, true);
  assert.throws(() => core.getSnapshot(), /已销毁/);
});

test('frozen internal errors and cleanup failures preserve both causes', () => {
  const original = Object.freeze(new Error('frozen bot failure'));
  const core = createArenaV1MatchCore({ seed: 26, config: { preparingTicks: 0 } });
  let controllerCleanupAttempts = 0;
  const session = new LocalMatchSession({
    core,
    botController: {
      createInput() { throw original; },
      destroy() {
        controllerCleanupAttempts += 1;
        if (controllerCleanupAttempts === 1) throw new Error('controller cleanup failed');
      },
    },
    publicMatchInfo: {
      matchSeed: 26,
      opponent: {
        id: 'test-opponent',
        displayName: '测试对手',
        portraitKey: 'portrait-test',
        appearanceKey: 'appearance-test',
      },
    },
  });
  session.start();
  assert.throws(
    () => session.step(neutral(session.getSnapshot())),
    (error) => {
      assert.equal(error.originalError, original);
      assert.equal(error.cleanupErrors.length, 1);
      assert.match(error.cleanupErrors[0].message, /cleanup failed/);
      return true;
    },
  );
  assert.equal(session.state, LOCAL_MATCH_SESSION_STATE.DESTROYED);
  assert.throws(() => core.getSnapshot(), /已销毁/);
  session.destroy();
  session.destroy();
  assert.equal(controllerCleanupAttempts, 2);

  const factoryFailure = Object.freeze(new Error('frozen factory failure'));
  const service = new QuickMatchService({
    botControllerFactory: () => ({
      createInput() {},
      destroy() { throw new Error('partial cleanup failed'); },
    }),
    sessionFactory: () => { throw factoryFailure; },
  });
  assert.throws(
    () => service.create({ matchSeed: 27 }),
    (error) => {
      assert.equal(error.originalError, factoryFailure);
      assert.equal(error.cleanupErrors.length, 1);
      assert.match(error.cleanupErrors[0].message, /partial cleanup failed/);
      return true;
    },
  );
});

test('LocalMatchSession rejects controller method accessors without taking Core ownership', () => {
  const core = createArenaV1MatchCore({ seed: 29 });
  let getterCalls = 0;
  const botController = Object.defineProperty({ destroy() {} }, 'createInput', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return () => null;
    },
  });
  assert.throws(() => new LocalMatchSession({
    core,
    botController,
    publicMatchInfo: {
      matchSeed: 29,
      opponent: {
        id: 'test-opponent',
        displayName: '测试对手',
        portraitKey: 'portrait-test',
        appearanceKey: 'appearance-test',
      },
    },
  }), /数据方法/);
  assert.equal(getterCalls, 0);
  assert.equal(core.getSnapshot().tick, 0);
  core.destroy();
});

test('runUntilEnded validates data-only options before starting the session', () => {
  const { session } = new QuickMatchService().create({ matchSeed: 30 });
  let getterCalls = 0;
  const options = Object.defineProperty({}, 'maxTicks', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return 1;
    },
  });
  assert.throws(() => session.runUntilEnded(neutral, options), /数据字段/);
  assert.equal(getterCalls, 0);
  assert.equal(session.state, LOCAL_MATCH_SESSION_STATE.CREATED);
  assert.equal(session.getSnapshot().tick, 0);
  session.destroy();
});

test('runUntilEnded blocks proxy reentry while validating options', () => {
  const { session } = new QuickMatchService().create({ matchSeed: 33 });
  let reentered = false;
  const options = new Proxy({ maxTicks: 1 }, {
    getOwnPropertyDescriptor(target, property) {
      if (!reentered) {
        reentered = true;
        session.step();
      }
      return Reflect.getOwnPropertyDescriptor(target, property);
    },
  });
  assert.throws(() => session.runUntilEnded(neutral, options), /运行期间不能调用 step/);
  assert.equal(session.state, LOCAL_MATCH_SESSION_STATE.CREATED);
  assert.equal(session.getSnapshot().tick, 0);
  session.destroy();
});

test('runUntilEnded blocks provider reentry and leaves a boundary failure retryable', () => {
  const { session } = new QuickMatchService().create({
    matchSeed: 31,
    config: { preparingTicks: 0 },
  });
  assert.throws(() => session.runUntilEnded(() => {
    session.step();
    return null;
  }, { maxTicks: 2 }), /运行期间不能调用 step/);
  assert.equal(session.state, LOCAL_MATCH_SESSION_STATE.RUNNING);
  assert.equal(session.getSnapshot().tick, 0);
  session.step(neutral(session.getSnapshot()));
  assert.equal(session.getSnapshot().tick, 1);
  session.destroy();
});

test('cleanup publishes terminal state before destroying owned callbacks and rejects reentry', () => {
  const core = createArenaV1MatchCore({ seed: 32 });
  let session;
  let reentryRejected = false;
  const botController = {
    createInput() { return createNeutralInputFrame(0, 'player-2'); },
    destroy() {
      assert.throws(() => session.destroy(), /清理期间不允许重入/);
      reentryRejected = true;
    },
  };
  session = new LocalMatchSession({
    core,
    botController,
    publicMatchInfo: {
      matchSeed: 32,
      opponent: {
        id: 'test-opponent',
        displayName: '测试对手',
        portraitKey: 'portrait-test',
        appearanceKey: 'appearance-test',
      },
    },
  });
  session.destroy();
  assert.equal(reentryRejected, true);
  assert.equal(session.state, LOCAL_MATCH_SESSION_STATE.DESTROYED);
  assert.throws(() => core.getSnapshot(), /已销毁/);
  session.destroy();
});
