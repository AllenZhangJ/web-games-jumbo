import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_MATCH_PHASE,
  ARENA_PARTICIPANT_STATUS,
  type ArenaAuthorityEvent,
  type MatchCore,
  type MatchCoreOptions,
} from '@number-strategy-jump/arena-match';
import {
  createArenaMatchSnapshotAudit,
  createNeutralInputFrame,
  type ArenaInputFrame,
  type ArenaMatchSnapshot,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_MATCH_EVENT } from '@number-strategy-jump/arena-match';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import { createLightweightPhysicsWorld } from '@number-strategy-jump/arena-physics';
import { createArenaV1RuleEngine } from '@number-strategy-jump/arena-v1-composition';

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

type ParticipantSnapshot = ArenaMatchSnapshot['participants'][number];
type InputOverrides = Readonly<Record<string, Partial<ArenaInputFrame>>>;

function required<T>(value: T | null | undefined, name: string): T {
  assert.ok(value != null, `${name} 不存在。`);
  return value;
}

function record(value: unknown, name: string): Readonly<Record<string, unknown>> {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value), `${name} 必须是对象。`);
  return value as Readonly<Record<string, unknown>>;
}

function participant(snapshot: ArenaMatchSnapshot, index: number): ParticipantSnapshot {
  return required(snapshot.participants[index], `participant ${index}`);
}

function createFastCore(overrides: Readonly<Record<string, unknown>> = {}) {
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

function inputs(core: MatchCore, overrides: InputOverrides = {}): ArenaInputFrame[] {
  return ['player-1', 'player-2'].map((participantId) => ({
    ...createNeutralInputFrame(core.tick, participantId),
    ...(overrides[participantId] ?? {}),
    tick: core.tick,
    participantId,
  }));
}

function step(core: MatchCore, overrides: InputOverrides = {}) {
  return core.step(inputs(core, overrides));
}

function runUntil(
  core: MatchCore,
  predicate: (value: MatchCore, events: readonly ArenaAuthorityEvent[]) => boolean,
  maxTicks = 240,
) {
  const events: ArenaAuthorityEvent[] = [];
  for (let index = 0; index < maxTicks; index += 1) {
    events.push(...step(core));
    if (predicate(core, events)) return events;
  }
  throw new Error(`runUntil 在 ${maxTicks} tick 内未满足条件。`);
}

function attackAndWaitForElimination(core: MatchCore) {
  const events = [...step(core, { 'player-1': { primaryPressed: true, primaryHeld: true } })];
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
  assert.equal(participant(core.getSnapshot(), 0).position.x, participant(initial, 0).position.x);
  const secondEvents = step(core, { 'player-1': { moveX: 1 } });
  assert.deepEqual(secondEvents.map((event) => event.type), [ARENA_MATCH_EVENT.MATCH_STARTED]);
  assert.equal(core.phase, ARENA_MATCH_PHASE.RUNNING);
  step(core, { 'player-1': { moveX: 1 } });
  assert.ok(participant(core.getSnapshot(), 0).position.x > participant(initial, 0).position.x);
  core.destroy();
});

test('MatchCore internals are not exposed and snapshots cannot mutate authority', () => {
  const core = createFastCore();
  const publicCore = record(core, 'MatchCore');
  assert.equal(publicCore.physics, undefined);
  assert.equal(publicCore.participants, undefined);
  assert.equal(publicCore.emit, undefined);
  assert.equal(publicCore.endMatch, undefined);
  assert.equal(publicCore.respawnParticipant, undefined);
  assert.ok(Object.isFrozen(core.config));
  assert.throws(() => { Object.assign(core, { matchSeed: 999 }); }, TypeError);
  assert.throws(() => { Object.assign(core, { configHash: 'tampered' }); }, TypeError);
  assert.throws(() => { Object.assign(core, { config: {} }); }, TypeError);
  const snapshot = core.getSnapshot();
  assert.equal(snapshot.rngStates, undefined);
  assert.equal(Reflect.set(participant(snapshot, 0), 'lives', 0), true);
  assert.equal(Reflect.set(participant(snapshot, 0).position, 'x', 999), true);
  const authority = core.getSnapshot();
  assert.equal(participant(authority, 0).lives, 3);
  assert.notEqual(participant(authority, 0).position.x, 999);
  core.destroy();
});

test('MatchCore public snapshot satisfies the shared audit schema without entering the tick path', () => {
  const core = createFastCore();
  const audited = createArenaMatchSnapshotAudit(core.getSnapshot());
  assert.equal(audited.participants.length, 2);
  assert.equal(audited.map.surfaces.length, 1);
  assert.ok(Object.isFrozen(audited));
  assert.ok(Object.isFrozen(audited.participants[0]));
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
  const started = step(core, { 'player-1': { primaryPressed: true, primaryHeld: true } });
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

test('character selection cannot inject tuning or unknown config fields', () => {
  assert.throws(
    () => createArenaV1MatchCore({ config: { character: { id: 'hijack' } } }),
    /match config 不支持字段 character/,
  );
  assert.throws(
    () => createArenaV1MatchCore({
      config: {
        participantCharacters: [
          { participantId: 'player-1', definitionId: 'parkour-apprentice', model: 'bad.glb' },
          { participantId: 'player-2', definitionId: 'parkour-apprentice' },
        ],
      },
    }),
    /participantCharacters\[0\] 不支持字段 model/,
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

test('MatchCore cleans incomplete factory resources and failed map authority during construction', () => {
  let incompleteRuleDestroyed = 0;
  assert.throws(() => createArenaV1MatchCore({
    config: { arena: TEST_ARENA },
    ruleEngineFactory() {
      return {
        destroy() { incompleteRuleDestroyed += 1; },
      };
    },
  }), /缺少 advanceTimers/);
  assert.equal(incompleteRuleDestroyed, 1);

  let incompleteDestroyed = 0;
  assert.throws(() => createArenaV1MatchCore({
    config: { arena: TEST_ARENA },
    mapSystemFactory() {
      return {
        destroy() { incompleteDestroyed += 1; },
      };
    },
  }), /缺少 advance/);
  assert.equal(incompleteDestroyed, 1);

  let incompletePhysicsDestroyed = 0;
  assert.throws(() => createArenaV1MatchCore({
    config: { arena: TEST_ARENA },
    physicsFactory() {
      return {
        destroy() { incompletePhysicsDestroyed += 1; },
      };
    },
  }), /缺少 addCharacter/);
  assert.equal(incompletePhysicsDestroyed, 1);

  let failedDestroyed = 0;
  assert.throws(() => createArenaV1MatchCore({
    config: { arena: TEST_ARENA },
    mapSystemFactory() {
      return {
        advance() {},
        commit() {},
        getSnapshot() {},
        getStateSnapshot() {},
        getContentHash() { throw new Error('map content failed'); },
        isSurfaceEnabled() { return true; },
        isPositionOnEnabledSurface() { return true; },
        destroy() {
          failedDestroyed += 1;
          throw new Error('map cleanup failed');
        },
      };
    },
  }), (error) => {
    const failure = record(error, 'construction failure');
    const original = record(failure.originalError, 'original construction failure');
    const cleanupErrors = failure.cleanupErrors;
    assert.ok(Array.isArray(cleanupErrors));
    assert.match(required(original.message, 'original error message') as string, /map content failed/);
    assert.equal(cleanupErrors.length, 1);
    assert.match(
      required(record(cleanupErrors[0], 'cleanup failure').message, 'cleanup error message') as string,
      /map cleanup failed/,
    );
    return true;
  });
  assert.equal(failedDestroyed, 1);
});

test('registered map equipment is validated against the actual injected RuleEngine catalog', () => {
  let destroyCalls = 0;
  const ruleEngineFactory: NonNullable<MatchCoreOptions['ruleEngineFactory']> = (context) => {
    const engine = createArenaV1RuleEngine(context);
    return new Proxy(engine, {
      get(target, property) {
        if (property === 'requireEquipmentDefinition') {
          return (definitionId: string) => {
            if (definitionId === 'hammer') {
              throw new RangeError('injected rules do not support hammer');
            }
            return target.requireEquipmentDefinition(definitionId);
          };
        }
        if (property === 'destroy') {
          return () => {
            destroyCalls += 1;
            target.destroy();
          };
        }
        const value = Reflect.get(target, property, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  };
  assert.throws(() => createArenaV1MatchCore({
    ruleEngineFactory,
  }), /do not support hammer/);
  assert.equal(destroyCalls, 1);
});

test('MatchCore tick failure preserves cleanup causes and retries unfinished resources', () => {
  let destroyAttempts = 0;
  let rawWorld = null;
  const physicsFactory: NonNullable<MatchCoreOptions['physicsFactory']> = ({ arena }) => {
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
      const failure = record(error, 'tick failure');
      const original = record(failure.originalError, 'original tick failure');
      const cleanupErrors = failure.cleanupErrors;
      assert.ok(Array.isArray(cleanupErrors));
      assert.match(required(original.message, 'original error message') as string, /physics step failed/);
      assert.equal(cleanupErrors.length, 1);
      assert.match(
        required(record(cleanupErrors[0], 'cleanup failure').message, 'cleanup error message') as string,
        /physics cleanup failed/,
      );
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

test('caller-owned InputFrame accessors are rejected without execution and leave MatchCore usable', () => {
  const core = createFastCore();
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
  assert.throws(() => core.step([frame]), /数据字段/);
  assert.equal(getterCalls, 0);
  assert.equal(core.tick, 0);
  core.step([]);
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
  assert.equal(required(elimination, 'elimination event').participantId, 'player-2');
  assert.equal(required(elimination, 'elimination event').creditedAttackerId, 'player-1');
  const snapshot = core.getSnapshot();
  assert.equal(participant(snapshot, 0).eliminations, 1);
  assert.equal(participant(snapshot, 1).lives, 2);
  assert.equal(participant(snapshot, 1).status, ARENA_PARTICIPANT_STATUS.RESPAWNING);
  core.destroy();
});

test('same-tick symmetric attacks trade without participant-order advantage', () => {
  const core = createFastCore();
  step(core, {
    'player-1': { primaryPressed: true, primaryHeld: true },
    'player-2': { primaryPressed: true, primaryHeld: true },
  });
  const events = step(core);
  const hits = events.filter((event) => event.type === ARENA_MATCH_EVENT.HIT_RESOLVED);
  assert.deepEqual(
    hits.map((event) => [event.attackerId, event.targetId]),
    [['player-1', 'player-2'], ['player-2', 'player-1']],
  );
  const snapshot = core.getSnapshot();
  assert.equal(participant(snapshot, 0).hitstunTicks, core.config.basePush.hitstunTicks);
  assert.equal(participant(snapshot, 1).hitstunTicks, core.config.basePush.hitstunTicks);
  assert.ok(participant(snapshot, 0).velocity.x < 0);
  assert.ok(participant(snapshot, 1).velocity.x > 0);
  core.destroy();
});

test('three eliminations respawn twice with invulnerability and then end the match', () => {
  const core = createFastCore();
  for (let life = 2; life >= 0; life -= 1) {
    const eliminationEvents = attackAndWaitForElimination(core);
    assert.ok(eliminationEvents.some((event) => event.type === ARENA_MATCH_EVENT.PLAYER_ELIMINATED));
    const target = participant(core.getSnapshot(), 1);
    assert.equal(target.lives, life);
    if (life > 0) {
      const respawnEvents = runUntil(
        core,
        (value, events) => events.some((event) => event.type === ARENA_MATCH_EVENT.PLAYER_RESPAWNED),
        10,
      );
      assert.ok(respawnEvents.some((event) => event.type === ARENA_MATCH_EVENT.PLAYER_RESPAWNED));
      assert.equal(participant(core.getSnapshot(), 1).invulnerableTicks, 3);
      for (let wait = 0; wait < 4; wait += 1) step(core);
    }
  }
  assert.equal(core.phase, ARENA_MATCH_PHASE.ENDED);
  assert.equal(required(core.result, 'match result').winnerId, 'player-1');
  assert.equal(required(core.result, 'match result').reason, 'last-participant-standing');
  assert.throws(() => step(core), /已经结束/);
  core.destroy();
});

test('simultaneous final falls produce a deterministic draw', () => {
  const arena = {
    killY: 1.01,
    surfaces: TEST_ARENA.surfaces,
    spawns: TEST_ARENA.spawns,
  };
  const core = createFastCore({
    arena,
    livesPerParticipant: 1,
    suddenDeathStartTick: 100,
    hardLimitTicks: 120,
  });
  runUntil(core, (value) => value.phase === ARENA_MATCH_PHASE.ENDED, 120);
  assert.equal(required(core.result, 'match result').isDraw, true);
  assert.equal(required(core.result, 'match result').reason, 'simultaneous-elimination');
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
  assert.equal(participant(core.getSnapshot(), 1).lives, 1);

  let terminalEvents: readonly ArenaAuthorityEvent[] = [];
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
  assert.equal(required(core.result, 'match result').winnerId, 'player-1');
  const winner = participant(core.getSnapshot(), 0);
  assert.equal(winner.status, ARENA_PARTICIPANT_STATUS.ACTIVE);
  assert.ok(winner.position.y > core.config.arena.killY);
  core.destroy();
});

test('120+30 style timing enters sudden death and resolves a tied timeout as draw', () => {
  const core = createFastCore({ suddenDeathStartTick: 3, hardLimitTicks: 5 });
  const events = [];
  while (core.phase !== ARENA_MATCH_PHASE.ENDED) events.push(...step(core));
  assert.equal(events.filter((event) => event.type === ARENA_MATCH_EVENT.SUDDEN_DEATH_STARTED).length, 1);
  assert.equal(required(core.result, 'match result').isDraw, true);
  assert.equal(required(core.result, 'match result').reason, 'timeout-draw');
  core.destroy();
});

test('same seed and inputs produce identical hashes and event IDs', () => {
  const first = createFastCore();
  const second = createFastCore();
  for (let tick = 0; tick < 300; tick += 1) {
    const overrides = {
      'player-1': { moveX: tick % 120 < 60 ? 0.7 : -0.7, primaryPressed: tick % 40 === 0 },
      'player-2': { moveX: tick % 160 < 80 ? -0.6 : 0.6, primaryPressed: tick % 55 === 0 },
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
