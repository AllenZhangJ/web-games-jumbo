import test from 'node:test';
import assert from 'node:assert/strict';
import { ActionExecutionSystem } from '../../src/arena/action/action-execution-system.js';
import { ActionRegistry } from '../../src/arena/action/action-registry.js';
import { ACTION_RESOLUTION_KIND } from '../../src/arena/action/action-resolver.js';
import { ARENA_ACTION_PHASE } from '../../src/arena/action/action-state.js';
import {
  STAGE4_ACTION_DEFINITIONS,
  STAGE4_ACTION_ID,
} from '../../src/arena/content/stage4-equipment.js';

const PARTICIPANTS = Object.freeze(['player-1', 'player-2']);

function createSystem() {
  return new ActionExecutionSystem({
    participantIds: PARTICIPANTS,
    actionRegistry: new ActionRegistry(STAGE4_ACTION_DEFINITIONS),
  });
}

function selected(participantId, actionDefinitionId, candidateId = `${participantId}-candidate`) {
  return {
    kind: ACTION_RESOLUTION_KIND.SELECTED,
    tick: 0,
    participantId,
    reason: 'candidate-selected',
    candidateId,
    actionDefinitionId,
    source: 'test',
  };
}

test('ActionExecutionSystem is the single writer for deterministic action timing', () => {
  const system = createSystem();
  const starts = system.start([selected('player-1', STAGE4_ACTION_ID.BASE_PUSH)]);
  assert.equal(starts[0].phase, ARENA_ACTION_PHASE.WINDUP);
  assert.equal(starts[0].ticksRemaining, 8);
  for (let tick = 0; tick < 7; tick += 1) {
    assert.deepEqual(system.advance(), []);
  }
  const active = system.advance();
  assert.equal(active[0].fromPhase, ARENA_ACTION_PHASE.WINDUP);
  assert.equal(active[0].toPhase, ARENA_ACTION_PHASE.ACTIVE);
  assert.equal(system.getSnapshot('player-1').ticksRemaining, 3);
  system.advance();
  system.advance();
  const recovery = system.advance();
  assert.equal(recovery[0].toPhase, ARENA_ACTION_PHASE.RECOVERY);
  assert.equal(system.getSnapshot('player-1').ticksRemaining, 15);
  for (let tick = 0; tick < 15; tick += 1) system.advance();
  assert.deepEqual(system.getSnapshot('player-1'), {
    definitionId: null,
    phase: ARENA_ACTION_PHASE.IDLE,
    ticksRemaining: 0,
    hitTargetIds: [],
  });
});

test('batch action start validates every participant before mutating any state', () => {
  const system = createSystem();
  assert.throws(() => system.start([
    selected('player-1', STAGE4_ACTION_ID.BASE_PUSH),
    selected('unknown', STAGE4_ACTION_ID.BASE_PUSH),
  ]), /未知 action participant unknown/);
  assert.equal(system.getSnapshot('player-1').phase, ARENA_ACTION_PHASE.IDLE);

  system.start([selected('player-1', STAGE4_ACTION_ID.BASE_PUSH)]);
  assert.throws(
    () => system.start([selected('player-1', STAGE4_ACTION_ID.HAMMER_SMASH)]),
    /ActionState 非 idle/,
  );
});

test('recordHits commits only a valid active batch and prevents repeated targets', () => {
  const system = createSystem();
  system.start([selected('player-1', STAGE4_ACTION_ID.BASE_PUSH)]);
  for (let tick = 0; tick < 8; tick += 1) system.advance();
  const hit = {
    attackerId: 'player-1',
    targetId: 'player-2',
    actionDefinitionId: STAGE4_ACTION_ID.BASE_PUSH,
  };
  system.recordHits([hit]);
  assert.deepEqual(system.getSnapshot('player-1').hitTargetIds, ['player-2']);
  assert.throws(() => system.recordHits([hit]), /已在本动作结算/);

  const fresh = createSystem();
  fresh.start([selected('player-1', STAGE4_ACTION_ID.BASE_PUSH)]);
  for (let tick = 0; tick < 8; tick += 1) fresh.advance();
  assert.throws(() => fresh.recordHits([
    hit,
    { ...hit, targetId: 'unknown' },
  ]), /未知 action participant unknown/);
  assert.deepEqual(fresh.getSnapshot('player-1').hitTargetIds, []);
});

test('interrupt and reset clear action identity without exposing mutable state', () => {
  const system = createSystem();
  system.start([
    selected('player-2', STAGE4_ACTION_ID.CHAIN_PULL),
    selected('player-1', STAGE4_ACTION_ID.HAMMER_SMASH),
  ]);
  const listed = system.listSnapshots();
  assert.deepEqual(listed.map(({ participantId }) => participantId), PARTICIPANTS);
  assert.ok(Object.isFrozen(listed));
  assert.ok(Object.isFrozen(listed[0]));
  const interrupted = system.interrupt(['player-2', 'player-1']);
  assert.deepEqual(interrupted.map(({ participantId }) => participantId), PARTICIPANTS);
  assert.equal(system.getSnapshot('player-1').definitionId, null);
  assert.equal(system.getSnapshot('player-2').phase, ARENA_ACTION_PHASE.IDLE);
  system.reset('player-1');
  assert.throws(() => system.getSnapshot('unknown'), /未知 action participant/);
});
