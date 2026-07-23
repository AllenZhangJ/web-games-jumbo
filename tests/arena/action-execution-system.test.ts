import test from 'node:test';
import assert from 'node:assert/strict';
import { ActionExecutionSystem } from '@number-strategy-jump/arena-core';
import type { ActionResolution } from '@number-strategy-jump/arena-core';
import { ActionRegistry } from '@number-strategy-jump/arena-definitions';
import { ACTION_RESOLUTION_KIND } from '@number-strategy-jump/arena-core';
import { ARENA_ACTION_PHASE } from '@number-strategy-jump/arena-core';
import {
  ACTION_DEFINITION_SCHEMA_VERSION,
  ACTION_EFFECT_TRIGGER,
  ACTION_INPUT_CHANNEL,
  ACTION_INPUT_TRIGGER,
  ACTION_LANE,
  type ActionDefinition,
  type ActionInputChannel,
  type ActionLane,
} from '@number-strategy-jump/arena-definitions';
import {
  STAGE4_ACTION_DEFINITIONS,
  STAGE4_ACTION_ID,
} from '@number-strategy-jump/arena-v1-content';

const PARTICIPANTS = Object.freeze(['player-1', 'player-2']);

function createSystem() {
  return new ActionExecutionSystem({
    participantIds: PARTICIPANTS,
    actionRegistry: new ActionRegistry(STAGE4_ACTION_DEFINITIONS),
  });
}

function selected(
  participantId: string,
  actionDefinitionId: string,
  candidateId: string = `${participantId}-candidate`,
  {
    inputChannel = ACTION_INPUT_CHANNEL.PRIMARY,
    lane = ACTION_LANE.COMBAT,
  }: Readonly<{
    inputChannel?: ActionInputChannel;
    lane?: ActionLane;
  }> = {},
): ActionResolution {
  return {
    kind: ACTION_RESOLUTION_KIND.SELECTED,
    tick: 0,
    participantId,
    inputChannel,
    lane,
    reason: 'candidate-selected',
    candidateId,
    actionDefinitionId,
    source: 'test',
  };
}

function testAction(id: string, {
  inputChannel,
  lane,
  conflictTags = [],
}: Readonly<{
  inputChannel: ActionInputChannel;
  lane: ActionLane;
  conflictTags?: readonly string[];
}>): ActionDefinition {
  return {
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id,
    kind: 'test',
    input: { channel: inputChannel, trigger: ACTION_INPUT_TRIGGER.PRESSED },
    lane,
    conflictTags,
    timing: { windupTicks: 0, activeTicks: 2, recoveryTicks: 0, cooldownTicks: 0 },
    targeting: { kind: 'self', parameters: {} },
    effects: [{
      id: `${id}-effect`,
      kind: 'test',
      trigger: ACTION_EFFECT_TRIGGER.ACTION_STARTED,
      parameters: {},
    }],
    tags: [],
  };
}

test('ActionExecutionSystem is the single writer for deterministic action timing', () => {
  const system = createSystem();
  const starts = system.start([selected('player-1', STAGE4_ACTION_ID.BASE_PUSH)]);
  const start = starts[0];
  assert.ok(start);
  assert.equal(start.phase, ARENA_ACTION_PHASE.WINDUP);
  assert.equal(start.ticksRemaining, 8);
  for (let tick = 0; tick < 7; tick += 1) {
    assert.deepEqual(system.advance(), []);
  }
  const active = system.advance();
  const activeTransition = active[0];
  assert.ok(activeTransition);
  assert.equal(activeTransition.fromPhase, ARENA_ACTION_PHASE.WINDUP);
  assert.equal(activeTransition.toPhase, ARENA_ACTION_PHASE.ACTIVE);
  assert.equal(system.getSnapshot('player-1').ticksRemaining, 3);
  system.advance();
  system.advance();
  const recovery = system.advance();
  const recoveryTransition = recovery[0];
  assert.ok(recoveryTransition);
  assert.equal(recoveryTransition.toPhase, ARENA_ACTION_PHASE.RECOVERY);
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
  const firstListed = listed[0];
  assert.ok(firstListed);
  assert.ok(Object.isFrozen(firstListed));
  const interrupted = system.interrupt(['player-2', 'player-1']);
  assert.deepEqual(interrupted.map(({ participantId }) => participantId), PARTICIPANTS);
  assert.equal(system.getSnapshot('player-1').definitionId, null);
  assert.equal(system.getSnapshot('player-2').phase, ARENA_ACTION_PHASE.IDLE);
  system.reset('player-1');
  assert.throws(() => system.getSnapshot('unknown'), /未知 action participant/);
});

test('combat and locomotion lanes advance independently from one participant', () => {
  const jump = testAction('jump', {
    inputChannel: ACTION_INPUT_CHANNEL.JUMP,
    lane: ACTION_LANE.LOCOMOTION,
  });
  const system = new ActionExecutionSystem({
    participantIds: PARTICIPANTS,
    actionRegistry: new ActionRegistry([...STAGE4_ACTION_DEFINITIONS, jump]),
  });
  const starts = system.start([
    selected('player-1', STAGE4_ACTION_ID.BASE_PUSH, 'attack', {
      inputChannel: ACTION_INPUT_CHANNEL.PRIMARY,
      lane: ACTION_LANE.COMBAT,
    }),
    selected('player-1', jump.id, 'jump', {
      inputChannel: ACTION_INPUT_CHANNEL.JUMP,
      lane: ACTION_LANE.LOCOMOTION,
    }),
  ]);
  assert.deepEqual(starts.map(({ lane }) => lane), [ACTION_LANE.COMBAT, ACTION_LANE.LOCOMOTION]);
  assert.equal(
    system.getLaneSnapshot('player-1', ACTION_LANE.LOCOMOTION).phase,
    ARENA_ACTION_PHASE.ACTIVE,
  );
  assert.deepEqual(system.getConstraints('player-1').occupiedLanes, [
    ACTION_LANE.COMBAT,
    ACTION_LANE.LOCOMOTION,
  ]);
  assert.deepEqual(
    system.listAllSnapshots()
      .filter(({ participantId, phase }) => (
        participantId === 'player-1' && phase !== ARENA_ACTION_PHASE.IDLE
      ))
      .map(({ lane }) => lane),
    [ACTION_LANE.COMBAT, ACTION_LANE.LOCOMOTION],
  );
  assert.deepEqual(
    system.interrupt(['player-1']).map(({ lane }) => lane),
    [ACTION_LANE.COMBAT, ACTION_LANE.LOCOMOTION],
  );
});

test('multi-lane start validates input uniqueness and conflicts before mutating any lane', () => {
  const primaryLocomotion = testAction('primary-locomotion', {
    inputChannel: ACTION_INPUT_CHANNEL.PRIMARY,
    lane: ACTION_LANE.LOCOMOTION,
  });
  const attack = testAction('full-body-attack', {
    inputChannel: ACTION_INPUT_CHANNEL.PRIMARY,
    lane: ACTION_LANE.COMBAT,
    conflictTags: ['full-body'],
  });
  const jump = testAction('full-body-jump', {
    inputChannel: ACTION_INPUT_CHANNEL.JUMP,
    lane: ACTION_LANE.LOCOMOTION,
    conflictTags: ['full-body'],
  });
  const system = new ActionExecutionSystem({
    participantIds: PARTICIPANTS,
    actionRegistry: new ActionRegistry([primaryLocomotion, attack, jump]),
  });
  assert.throws(() => system.start([
    selected('player-1', attack.id, 'attack'),
    selected('player-1', primaryLocomotion.id, 'locomotion', {
      inputChannel: ACTION_INPUT_CHANNEL.PRIMARY,
      lane: ACTION_LANE.LOCOMOTION,
    }),
  ]), /重复 action start participant\/input/);
  assert.deepEqual(system.getConstraints('player-1').occupiedLanes, []);

  assert.throws(() => system.start([
    selected('player-1', attack.id, 'attack'),
    selected('player-1', jump.id, 'jump', {
      inputChannel: ACTION_INPUT_CHANNEL.JUMP,
      lane: ACTION_LANE.LOCOMOTION,
    }),
  ]), /conflictTags 冲突/);
  assert.deepEqual(system.getConstraints('player-1').occupiedLanes, []);

  assert.throws(() => system.start([
    selected('player-1', jump.id, 'wrong-lane', {
      inputChannel: ACTION_INPUT_CHANNEL.JUMP,
      lane: ACTION_LANE.COMBAT,
    }),
  ]), /lane\/input 与定义不一致/);
  assert.deepEqual(system.getConstraints('player-1').occupiedLanes, []);
});

test('next-tick constraints project the same advance transition without mutating action state', () => {
  const jump = {
    ...testAction('single-tick-jump', {
      inputChannel: ACTION_INPUT_CHANNEL.JUMP,
      lane: ACTION_LANE.LOCOMOTION,
    }),
    timing: { windupTicks: 0, activeTicks: 1, recoveryTicks: 0, cooldownTicks: 0 },
  };
  const system = new ActionExecutionSystem({
    participantIds: PARTICIPANTS,
    actionRegistry: new ActionRegistry([...STAGE4_ACTION_DEFINITIONS, jump]),
  });
  system.start([
    selected('player-1', jump.id, 'jump', {
      inputChannel: ACTION_INPUT_CHANNEL.JUMP,
      lane: ACTION_LANE.LOCOMOTION,
    }),
  ]);
  const before = system.getLaneSnapshot('player-1', ACTION_LANE.LOCOMOTION);
  assert.deepEqual(system.getConstraints('player-1').occupiedLanes, [ACTION_LANE.LOCOMOTION]);
  assert.deepEqual(system.getNextTickConstraints('player-1').occupiedLanes, []);
  assert.deepEqual(system.getLaneSnapshot('player-1', ACTION_LANE.LOCOMOTION), before);

  system.start([selected('player-2', STAGE4_ACTION_ID.BASE_PUSH)]);
  assert.deepEqual(system.getNextTickConstraints('player-2').occupiedLanes, [ACTION_LANE.COMBAT]);
});
