import test from 'node:test';
import assert from 'node:assert/strict';
import { createArenaV1RuleEngine } from '../../src/arena/composition/arena-v1-rule-engine.js';
import { createArenaMatchConfig } from '../../src/arena/config.js';
import {
  STAGE4_ACTION_ID,
  STAGE4_EQUIPMENT_ID,
} from '../../src/arena/content/stage4-equipment.js';

function createEngine(configOverrides = {}) {
  const config = createArenaMatchConfig({ preparingTicks: 0, ...configOverrides });
  return createArenaV1RuleEngine({ participantIds: config.participantIds, config });
}

function actor(id, x, facingX, overrides = {}) {
  return {
    id,
    canAct: true,
    targetable: true,
    position: { x, y: 1, z: 0 },
    facing: { x: facingX, z: 0 },
    ...overrides,
  };
}

function actors(distance = 1) {
  return [actor('player-1', 0, 1), actor('player-2', distance, -1)];
}

function frames(tick, pressedIds = []) {
  return ['player-1', 'player-2'].map((participantId) => ({
    tick,
    participantId,
    moveX: 0,
    moveZ: 0,
    primaryPressed: pressedIds.includes(participantId),
    primaryHeld: pressedIds.includes(participantId),
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: false,
  }));
}

function createPorts() {
  const recorded = { hits: [], hitstuns: [], impulses: [] };
  return {
    recorded,
    ports: {
      recordHit: (...values) => recorded.hits.push(values),
      applyHitstun: (...values) => recorded.hitstuns.push(values),
      applyImpulse: (...values) => recorded.impulses.push(values),
    },
  };
}

test('ArenaRuleEngine migrates base push through resolver, state, targeting, effects and commands', () => {
  const engine = createEngine();
  const started = engine.resolveActions({ tick: 0, actors: actors(), inputFrames: frames(0, ['player-1']) });
  assert.equal(started.starts[0].actionDefinitionId, STAGE4_ACTION_ID.BASE_PUSH);
  assert.deepEqual(started.events.map(({ type }) => type), ['ActionStarted']);
  const startPorts = createPorts();
  engine.commit(started, startPorts.ports);
  assert.deepEqual(startPorts.recorded, { hits: [], hitstuns: [], impulses: [] });

  for (let tick = 0; tick < 8; tick += 1) engine.advanceTimers();
  const active = engine.resolveActiveActions({ actors: actors() });
  assert.deepEqual(active.hits, [{
    attackerId: 'player-1',
    targetId: 'player-2',
    actionDefinitionId: STAGE4_ACTION_ID.BASE_PUSH,
  }]);
  assert.deepEqual(active.events.map(({ type }) => type), ['HitResolved', 'KnockbackApplied']);
  const { ports, recorded } = createPorts();
  engine.commit(active, ports);
  assert.deepEqual(recorded.hits, [['player-1', 'player-2', STAGE4_ACTION_ID.BASE_PUSH]]);
  assert.deepEqual(recorded.hitstuns, [['player-2', 24]]);
  assert.deepEqual(recorded.impulses, [['player-2', { x: 8.5, y: 4.8, z: 0 }]]);
  assert.deepEqual(engine.resolveActiveActions({ actors: actors() }).hits, []);
  engine.destroy();
});

test('base push overrides are adapted into one ActionDefinition truth', () => {
  const engine = createEngine({
    basePush: {
      windupTicks: 1,
      activeTicks: 1,
      recoveryTicks: 2,
      hitstunTicks: 7,
      horizontalImpulse: 3,
      verticalImpulse: 2,
    },
  });
  engine.resolveActions({ tick: 0, actors: actors(), inputFrames: frames(0, ['player-1']) });
  engine.advanceTimers();
  const batch = engine.resolveActiveActions({ actors: actors() });
  const { ports, recorded } = createPorts();
  engine.commit(batch, ports);
  assert.deepEqual(recorded.hitstuns, [['player-2', 7]]);
  assert.deepEqual(recorded.impulses, [['player-2', { x: 3, y: 2, z: 0 }]]);
  engine.destroy();
});

test('rule content hash and public action view follow the immutable registered content', () => {
  const baseline = createEngine();
  const tuned = createEngine({ basePush: { range: 2.25 } });
  assert.match(baseline.getContentHash(), /^[0-9a-f]{8}$/);
  assert.notEqual(baseline.getContentHash(), tuned.getContentHash());
  assert.equal(baseline.getParticipantActionRule('player-1').definitionId, STAGE4_ACTION_ID.BASE_PUSH);

  baseline.spawnEquipment({
    instanceId: 'chain-public-view',
    definitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'public-view',
    position: { x: 0, y: 1, z: 0 },
  });
  baseline.resolveEquipmentPickups({
    participants: actors(10).map(({ id, position }) => ({ id, position, eligible: true })),
    contestSeed: 1,
  });
  const equippedRule = baseline.getParticipantActionRule('player-1');
  assert.equal(equippedRule.definitionId, STAGE4_ACTION_ID.CHAIN_PULL);
  assert.equal(equippedRule.range, 5);
  assert.ok(Object.isFrozen(equippedRule));
  baseline.destroy();
  tuned.destroy();
});

test('same-tick symmetric actions collect both hits before interruption commits', () => {
  const engine = createEngine();
  engine.resolveActions({
    tick: 0,
    actors: actors(),
    inputFrames: frames(0, ['player-1', 'player-2']),
  });
  for (let tick = 0; tick < 8; tick += 1) engine.advanceTimers();
  const batch = engine.resolveActiveActions({ actors: actors() });
  assert.deepEqual(batch.hits.map(({ attackerId, targetId }) => [attackerId, targetId]), [
    ['player-1', 'player-2'],
    ['player-2', 'player-1'],
  ]);
  const { ports, recorded } = createPorts();
  engine.commit(batch, ports);
  assert.equal(recorded.impulses.length, 2);
  assert.equal(engine.getActionSnapshot('player-1').definitionId, null);
  assert.equal(engine.getActionSnapshot('player-2').definitionId, null);
  engine.destroy();
});

test('front shield guard cancels chain pull only from the guarded direction', () => {
  const engine = createEngine();
  engine.spawnEquipment({
    instanceId: 'chain-1',
    definitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'left',
    position: { x: 0, y: 1, z: 0 },
  });
  engine.spawnEquipment({
    instanceId: 'shield-1',
    definitionId: STAGE4_EQUIPMENT_ID.SHIELD,
    spawnId: 'right',
    position: { x: 3, y: 1, z: 0 },
  });
  const combatants = actors(3);
  engine.resolveEquipmentPickups({
    participants: combatants.map(({ id, position }) => ({ id, position, eligible: true })),
    contestSeed: 4,
  });
  const started = engine.resolveActions({
    tick: 0,
    actors: combatants,
    inputFrames: frames(0, ['player-1', 'player-2']),
  });
  const startCommit = createPorts();
  engine.commit(started, startCommit.ports);
  for (let tick = 0; tick < 12; tick += 1) engine.advanceTimers();
  const guarded = engine.resolveActiveActions({ actors: combatants });
  assert.deepEqual(guarded.hits.map(({ actionDefinitionId }) => actionDefinitionId), [
    STAGE4_ACTION_ID.CHAIN_PULL,
  ]);
  assert.equal(guarded.commands.some(({ kind }) => kind === 'apply-impulse'), false);

  const rearEngine = createEngine();
  rearEngine.spawnEquipment({
    instanceId: 'chain-1',
    definitionId: STAGE4_EQUIPMENT_ID.CHAIN,
    spawnId: 'left',
    position: { x: 0, y: 1, z: 0 },
  });
  rearEngine.spawnEquipment({
    instanceId: 'shield-1',
    definitionId: STAGE4_EQUIPMENT_ID.SHIELD,
    spawnId: 'right',
    position: { x: 3, y: 1, z: 0 },
  });
  const rearFacing = [combatants[0], actor('player-2', 3, 1)];
  rearEngine.resolveEquipmentPickups({
    participants: rearFacing.map(({ id, position }) => ({ id, position, eligible: true })),
    contestSeed: 4,
  });
  const rearStarted = rearEngine.resolveActions({
    tick: 0,
    actors: rearFacing,
    inputFrames: frames(0, ['player-1', 'player-2']),
  });
  rearEngine.commit(rearStarted, createPorts().ports);
  for (let tick = 0; tick < 12; tick += 1) rearEngine.advanceTimers();
  const rear = rearEngine.resolveActiveActions({ actors: rearFacing });
  assert.equal(rear.commands.some(({ effectKind }) => effectKind === 'pull-to-source'), true);
  engine.destroy();
  rearEngine.destroy();
});

test('ArenaRuleEngine rejects malformed batches before mutation and has terminal lifecycle', () => {
  const engine = createEngine();
  const batch = engine.resolveActions({ tick: 0, actors: actors(), inputFrames: frames(0) });
  assert.throws(() => engine.commit(batch, {
    recordHit() {},
    applyHitstun() {},
  }), /缺少 applyImpulse/);
  assert.equal(engine.getActionSnapshot('player-1').definitionId, null);
  engine.destroy();
  engine.destroy();
  assert.throws(() => engine.advanceTimers(), /已销毁/);
});

test('ArenaRuleEngine blocks commit reentrancy and fails closed after a mutation port error', () => {
  const engine = createEngine({
    basePush: { windupTicks: 1, activeTicks: 1 },
  });
  engine.resolveActions({
    tick: 0,
    actors: actors(),
    inputFrames: frames(0, ['player-1']),
  });
  engine.advanceTimers();
  const batch = engine.resolveActiveActions({ actors: actors() });
  let reentryError = null;
  assert.throws(() => engine.commit(batch, {
    recordHit() {
      try {
        engine.advanceTimers();
      } catch (error) {
        reentryError = error;
      }
    },
    applyHitstun() {},
    applyImpulse() { throw new Error('physics port failed'); },
  }), /physics port failed/);
  assert.match(reentryError?.message, /commit 期间不可重入/);
  assert.throws(() => engine.advanceTimers(), /已失败/);
  engine.destroy();
});
