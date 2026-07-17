import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_MATCH_PHASE,
  ARENA_PARTICIPANT_STATUS,
} from '../../src/arena/config.js';
import { createNeutralInputFrame } from '../../src/arena/input-frame.js';
import { ARENA_MATCH_EVENT } from '../../src/arena/match-core.js';
import { createArenaV1MatchCore } from '../../src/arena/arena-v1-match-core.js';
import { createLightweightPhysicsWorld } from '../../src/arena/physics/lightweight-physics.js';

const TEST_ARENA = Object.freeze({
  killY: -3,
  surfaces: Object.freeze([Object.freeze({
    id: 'test-platform',
    center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
    halfExtents: Object.freeze({ x: 1.8, y: 0.5, z: 2 }),
  })]),
  spawns: Object.freeze([
    Object.freeze({ x: -0.55, y: 1, z: 0 }),
    Object.freeze({ x: 0.55, y: 1, z: 0 }),
  ]),
});

function createFastCore(overrides = {}) {
  return createArenaV1MatchCore({
    seed: 42,
    config: {
      arena: TEST_ARENA,
      preparingTicks: 0,
      suddenDeathStartTick: 1_000,
      hardLimitTicks: 1_200,
      respawnTicks: 3,
      invulnerableTicks: 3,
      basePush: {
        range: 2,
        windupTicks: 1,
        activeTicks: 2,
        recoveryTicks: 2,
        horizontalImpulse: 16,
        verticalImpulse: 3,
        hitstunTicks: 6,
      },
      ...overrides,
    },
  });
}

function inputs(core, overrides = {}) {
  return ['player-1', 'player-2'].map((participantId) => ({
    ...createNeutralInputFrame(core.tick, participantId),
    ...(overrides[participantId] ?? {}),
    tick: core.tick,
    participantId,
  }));
}

function step(core, overrides) {
  return core.step(inputs(core, overrides));
}

function runUntil(core, predicate, maxTicks = 240) {
  const events = [];
  for (let index = 0; index < maxTicks; index += 1) {
    events.push(...step(core));
    if (predicate(core, events)) return events;
  }
  throw new Error(`runUntil 在 ${maxTicks} tick 内未满足条件。`);
}

function attackAndWaitForElimination(core) {
  const events = [...step(core, { 'player-1': { actionPressed: true, actionHeld: true } })];
  for (let index = 0; index < 240; index += 1) {
    if (events.some((event) => event.type === ARENA_MATCH_EVENT.PLAYER_ELIMINATED)) return events;
    events.push(...step(core));
  }
  throw new Error('基础推击没有在预期时间内造成淘汰。');
}

test('preparing phase ignores movement and emits one MatchStarted transition', () => {
  const core = createFastCore({ preparingTicks: 2 });
  const initial = core.getSnapshot();
  assert.equal(core.phase, ARENA_MATCH_PHASE.PREPARING);
  const firstEvents = step(core, { 'player-1': { moveX: 1 } });
  assert.equal(firstEvents.length, 0);
  assert.equal(core.getSnapshot().participants[0].position.x, initial.participants[0].position.x);
  const secondEvents = step(core, { 'player-1': { moveX: 1 } });
  assert.deepEqual(secondEvents.map((event) => event.type), [ARENA_MATCH_EVENT.MATCH_STARTED]);
  assert.equal(core.phase, ARENA_MATCH_PHASE.RUNNING);
  step(core, { 'player-1': { moveX: 1 } });
  assert.ok(core.getSnapshot().participants[0].position.x > initial.participants[0].position.x);
  core.destroy();
});

test('MatchCore internals are not exposed and snapshots cannot mutate authority', () => {
  const core = createFastCore();
  assert.equal(core.physics, undefined);
  assert.equal(core.participants, undefined);
  assert.equal(core.emit, undefined);
  assert.equal(core.endMatch, undefined);
  assert.equal(core.respawnParticipant, undefined);
  assert.ok(Object.isFrozen(core.config));
  assert.throws(() => { core.matchSeed = 999; }, TypeError);
  assert.throws(() => { core.configHash = 'tampered'; }, TypeError);
  assert.throws(() => { core.config = {}; }, TypeError);
  const snapshot = core.getSnapshot();
  assert.equal(snapshot.rngStates, undefined);
  snapshot.participants[0].lives = 0;
  snapshot.participants[0].position.x = 999;
  const authority = core.getSnapshot();
  assert.equal(authority.participants[0].lives, 3);
  assert.notEqual(authority.participants[0].position.x, 999);
  core.destroy();
});

test('base push timing advances exactly once per authoritative tick', () => {
  const core = createFastCore({
    basePush: {
      range: 2,
      windupTicks: 8,
      activeTicks: 3,
      recoveryTicks: 15,
      horizontalImpulse: 16,
      verticalImpulse: 3,
      hitstunTicks: 6,
    },
  });
  const started = step(core, { 'player-1': { actionPressed: true, actionHeld: true } });
  assert.equal(started.find((event) => event.type === ARENA_MATCH_EVENT.ACTION_STARTED)?.tick, 0);
  for (let tick = 1; tick < 8; tick += 1) {
    assert.equal(
      step(core).some((event) => event.type === ARENA_MATCH_EVENT.HIT_RESOLVED),
      false,
    );
  }
  const active = step(core);
  assert.equal(active.find((event) => event.type === ARENA_MATCH_EVENT.HIT_RESOLVED)?.tick, 8);
  core.destroy();
});

test('character tuning cannot override authoritative identity or inject unknown fields', () => {
  assert.throws(
    () => createArenaV1MatchCore({ config: { character: { id: 'hijack' } } }),
    /不支持字段 id/,
  );
  assert.throws(
    () => createArenaV1MatchCore({ config: { character: { moveSpeed: Number.NaN } } }),
    /character\.moveSpeed.*非有限数/,
  );
  assert.throws(
    () => createArenaV1MatchCore({ config: { basePush: { damage: 999 } } }),
    /basePush 不支持字段 damage/,
  );
  assert.throws(
    () => createArenaV1MatchCore({ config: { hardLimitTick: 9_000 } }),
    /match config 不支持字段 hardLimitTick/,
  );
  assert.throws(() => createArenaV1MatchCore({ seed: 1.5 }), /uint32/);
  assert.throws(() => createArenaV1MatchCore({ seed: -1 }), /uint32/);
  assert.throws(() => createArenaV1MatchCore({
    config: {
      arena: {
        killY: -5,
        surfaces: [{
          id: 'broken',
          center: { x: 0, y: 0, z: 0 },
          halfExtents: { x: 1, y: 0, z: 1 },
        }],
        spawns: [{ x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }],
      },
    },
  }), /halfExtents\.y 必须大于 0/);
});

test('authority config rejects accessors and unknown wrapper fields before invoking caller code', () => {
  let getterCalls = 0;
  const config = {};
  Object.defineProperty(config, 'preparingTicks', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return 0;
    },
  });
  assert.throws(() => createArenaV1MatchCore({ config }), /可枚举数据字段/);
  assert.equal(getterCalls, 0);
  assert.throws(
    () => createArenaV1MatchCore({ config: {}, surpriseFactory: () => null }),
    /options 不支持字段 surpriseFactory/,
  );
});

test('MatchCore tick failure preserves cleanup causes and retries unfinished resources', () => {
  let destroyAttempts = 0;
  let rawWorld = null;
  const physicsFactory = ({ arena }) => {
    rawWorld = createLightweightPhysicsWorld({ arena });
    return new Proxy(rawWorld, {
      get(target, property) {
        if (property === 'step') return () => { throw new Error('physics step failed'); };
        if (property === 'destroy') {
          return () => {
            destroyAttempts += 1;
            if (destroyAttempts === 1) throw new Error('physics cleanup failed');
            target.destroy();
          };
        }
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  };
  const core = createArenaV1MatchCore({
    physicsFactory,
    config: { preparingTicks: 0 },
  });
  assert.throws(
    () => core.step(inputs(core)),
    (error) => {
      assert.match(error.originalError?.message, /physics step failed/);
      assert.equal(error.cleanupErrors?.length, 1);
      assert.match(error.cleanupErrors[0].message, /physics cleanup failed/);
      return true;
    },
  );
  assert.throws(() => core.getSnapshot(), /已销毁/);
  core.destroy();
  core.destroy();
  assert.equal(destroyAttempts, 2);
  assert.ok(rawWorld);
});

test('invalid input fails before mutation and leaves MatchCore usable', () => {
  const core = createFastCore();
  const duplicate = createNeutralInputFrame(core.tick, 'player-1');
  assert.throws(() => core.step([duplicate, duplicate]), /重复输入/);
  assert.equal(core.tick, 0);
  assert.equal(core.getSnapshot().phase, ARENA_MATCH_PHASE.RUNNING);
  step(core);
  assert.equal(core.tick, 1);
  core.destroy();
});

test('caller-owned InputFrame cannot re-enter or destroy MatchCore during validation', () => {
  const core = createFastCore();
  let reentryError = null;
  let destroyError = null;
  const frame = {
    tick: 0,
    get participantId() {
      try {
        core.step([]);
      } catch (error) {
        reentryError = error;
      }
      try {
        core.destroy();
      } catch (error) {
        destroyError = error;
      }
      return 'player-1';
    },
    moveX: 0,
    moveZ: 0,
    actionPressed: false,
    actionHeld: false,
  };
  core.step([frame]);
  assert.match(reentryError?.message, /不可重入/);
  assert.match(destroyError?.message, /step\(\) 期间不能销毁/);
  assert.equal(core.tick, 1);
  core.destroy();
});

test('base push has windup, hits once, applies hitstun and produces authoritative events', () => {
  const core = createFastCore();
  const events = attackAndWaitForElimination(core);
  assert.equal(events.filter((event) => event.type === ARENA_MATCH_EVENT.ACTION_STARTED).length, 1);
  assert.equal(events.filter((event) => event.type === ARENA_MATCH_EVENT.HIT_RESOLVED).length, 1);
  assert.equal(events.filter((event) => event.type === ARENA_MATCH_EVENT.KNOCKBACK_APPLIED).length, 1);
  const elimination = events.find((event) => event.type === ARENA_MATCH_EVENT.PLAYER_ELIMINATED);
  assert.equal(elimination.participantId, 'player-2');
  assert.equal(elimination.creditedAttackerId, 'player-1');
  const snapshot = core.getSnapshot();
  assert.equal(snapshot.participants[0].eliminations, 1);
  assert.equal(snapshot.participants[1].lives, 2);
  assert.equal(snapshot.participants[1].status, ARENA_PARTICIPANT_STATUS.RESPAWNING);
  core.destroy();
});

test('same-tick symmetric attacks trade without participant-order advantage', () => {
  const core = createFastCore();
  step(core, {
    'player-1': { actionPressed: true, actionHeld: true },
    'player-2': { actionPressed: true, actionHeld: true },
  });
  const events = step(core);
  const hits = events.filter((event) => event.type === ARENA_MATCH_EVENT.HIT_RESOLVED);
  assert.deepEqual(
    hits.map((event) => [event.attackerId, event.targetId]),
    [['player-1', 'player-2'], ['player-2', 'player-1']],
  );
  const snapshot = core.getSnapshot();
  assert.equal(snapshot.participants[0].hitstunTicks, core.config.basePush.hitstunTicks);
  assert.equal(snapshot.participants[1].hitstunTicks, core.config.basePush.hitstunTicks);
  assert.ok(snapshot.participants[0].velocity.x < 0);
  assert.ok(snapshot.participants[1].velocity.x > 0);
  core.destroy();
});

test('three eliminations respawn twice with invulnerability and then end the match', () => {
  const core = createFastCore();
  for (let life = 2; life >= 0; life -= 1) {
    const eliminationEvents = attackAndWaitForElimination(core);
    assert.ok(eliminationEvents.some((event) => event.type === ARENA_MATCH_EVENT.PLAYER_ELIMINATED));
    const target = core.getSnapshot().participants[1];
    assert.equal(target.lives, life);
    if (life > 0) {
      const respawnEvents = runUntil(
        core,
        (value, events) => events.some((event) => event.type === ARENA_MATCH_EVENT.PLAYER_RESPAWNED),
        10,
      );
      assert.ok(respawnEvents.some((event) => event.type === ARENA_MATCH_EVENT.PLAYER_RESPAWNED));
      assert.equal(core.getSnapshot().participants[1].invulnerableTicks, 3);
      for (let wait = 0; wait < 4; wait += 1) step(core);
    }
  }
  assert.equal(core.phase, ARENA_MATCH_PHASE.ENDED);
  assert.equal(core.result.winnerId, 'player-1');
  assert.equal(core.result.reason, 'last-participant-standing');
  assert.throws(() => step(core), /已经结束/);
  core.destroy();
});

test('simultaneous final falls produce a deterministic draw', () => {
  const arena = {
    killY: -1,
    surfaces: TEST_ARENA.surfaces,
    spawns: [
      { x: -8, y: 1, z: 0 },
      { x: 8, y: 1, z: 0 },
    ],
  };
  const core = createFastCore({
    arena,
    livesPerParticipant: 1,
    suddenDeathStartTick: 100,
    hardLimitTicks: 120,
  });
  runUntil(core, (value) => value.phase === ARENA_MATCH_PHASE.ENDED, 120);
  assert.equal(core.result.isDraw, true);
  assert.equal(core.result.reason, 'simultaneous-elimination');
  core.destroy();
});

test('a surviving winner is returned to a safe active state after a simultaneous fall', () => {
  const core = createFastCore();
  for (let elimination = 0; elimination < 2; elimination += 1) {
    attackAndWaitForElimination(core);
    runUntil(
      core,
      (value, events) => events.some((event) => event.type === ARENA_MATCH_EVENT.PLAYER_RESPAWNED),
      10,
    );
    for (let wait = 0; wait < 4; wait += 1) step(core);
  }
  assert.equal(core.getSnapshot().participants[1].lives, 1);

  let terminalEvents = [];
  for (let tick = 0; tick < 240 && core.phase !== ARENA_MATCH_PHASE.ENDED; tick += 1) {
    terminalEvents = step(core, {
      'player-1': { moveX: -1 },
      'player-2': { moveX: 1 },
    });
  }
  assert.equal(
    terminalEvents.filter((event) => event.type === ARENA_MATCH_EVENT.PLAYER_ELIMINATED).length,
    2,
  );
  assert.equal(core.result.winnerId, 'player-1');
  const winner = core.getSnapshot().participants[0];
  assert.equal(winner.status, ARENA_PARTICIPANT_STATUS.ACTIVE);
  assert.ok(winner.position.y > core.config.arena.killY);
  core.destroy();
});

test('120+30 style timing enters sudden death and resolves a tied timeout as draw', () => {
  const core = createFastCore({ suddenDeathStartTick: 3, hardLimitTicks: 5 });
  const events = [];
  while (core.phase !== ARENA_MATCH_PHASE.ENDED) events.push(...step(core));
  assert.equal(events.filter((event) => event.type === ARENA_MATCH_EVENT.SUDDEN_DEATH_STARTED).length, 1);
  assert.equal(core.result.isDraw, true);
  assert.equal(core.result.reason, 'timeout-draw');
  core.destroy();
});

test('same seed and inputs produce identical hashes and event IDs', () => {
  const first = createFastCore();
  const second = createFastCore();
  for (let tick = 0; tick < 300; tick += 1) {
    const overrides = {
      'player-1': { moveX: tick % 120 < 60 ? 0.7 : -0.7, actionPressed: tick % 40 === 0 },
      'player-2': { moveX: tick % 160 < 80 ? -0.6 : 0.6, actionPressed: tick % 55 === 0 },
    };
    const firstEvents = step(first, overrides);
    const secondEvents = step(second, overrides);
    assert.deepEqual(firstEvents, secondEvents);
    assert.equal(first.getStateHash(), second.getStateHash());
    if (first.phase === ARENA_MATCH_PHASE.ENDED) break;
  }
  first.destroy();
  second.destroy();
});
