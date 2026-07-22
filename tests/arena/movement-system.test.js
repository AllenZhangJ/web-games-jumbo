import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MOVEMENT_COMMAND_KIND,
  MOVEMENT_MODE,
  MovementSystem,
} from '@number-strategy-jump/arena-movement';
import { createCharacterDefinition } from '@number-strategy-jump/arena-definitions';
import { createArenaV1CharacterRegistry } from '@number-strategy-jump/arena-v1-content';
import { ARENA_V1_CHARACTER_ID } from '@number-strategy-jump/arena-definitions';

const baseDefinition = createArenaV1CharacterRegistry().require(
  ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE,
);

function createSystem(definition = baseDefinition, options = {}) {
  return new MovementSystem({
    ...options,
    participantCharacters: [
      { participantId: 'player-1', characterDefinition: definition },
      { participantId: 'player-2', characterDefinition: definition },
    ],
  });
}

function contacts(playerGrounded, opponentGrounded = true) {
  return [
    { participantId: 'player-1', grounded: playerGrounded },
    { participantId: 'player-2', grounded: opponentGrounded },
  ];
}

function inputs(tick, {
  jumpPressed = false,
  jumpHeld = false,
  moveX = 0,
  moveZ = 0,
} = {}) {
  return [
    { participantId: 'player-1', tick, jumpPressed, jumpHeld, moveX, moveZ },
    {
      participantId: 'player-2',
      tick,
      jumpPressed: false,
      jumpHeld: false,
      moveX: 0,
      moveZ: 0,
    },
  ];
}

function availability(playerCanMove = true, opponentCanMove = true) {
  return [
    { participantId: 'player-1', canMove: playerCanMove },
    { participantId: 'player-2', canMove: opponentCanMove },
  ];
}

function prepare(system, tick, grounded, input = {}, canMove = true) {
  return system.prepareTick({
    tick,
    contacts: contacts(grounded),
    inputs: inputs(tick, input),
    availability: availability(canMove),
  });
}

function command(kind, actionDefinitionId = kind, participantId = 'player-1') {
  return { kind, participantId, actionDefinitionId };
}

function ports({ failImpulse = false } = {}) {
  const calls = [];
  return {
    calls,
    value: {
      applyBatch(operations) {
        if (failImpulse && operations.some(({ kind }) => kind === 'apply-impulse')) {
          throw new Error('forced impulse failure');
        }
        for (const operation of operations) {
          if (operation.kind === 'apply-impulse') {
            calls.push({
              kind: 'impulse',
              participantId: operation.participantId,
              impulse: { ...operation.impulse },
            });
          } else if (operation.kind === 'set-vertical-speed') {
            calls.push({
              kind: 'vertical-speed',
              participantId: operation.participantId,
              speed: operation.speed,
            });
          } else {
            calls.push({
              kind: 'downward-acceleration',
              participantId: operation.participantId,
              acceleration: operation.acceleration,
              maximumSpeed: operation.maximumSpeed,
            });
          }
        }
      },
    },
  };
}

function complete(system, tick, grounded) {
  const port = ports();
  system.execute([], port.value);
  return system.completeTick({ tick, contacts: contacts(grounded) });
}

test('coyote time has an exact number of legal airborne ticks without storing grounded', () => {
  const system = createSystem();
  prepare(system, 0, true);
  assert.equal(system.getCapabilities('player-1').canGroundJump, true);
  complete(system, 0, false);
  assert.equal(system.getSnapshot('player-1').grounded, undefined);

  for (let tick = 1; tick <= baseDefinition.jump.coyoteTicks; tick += 1) {
    prepare(system, tick, false);
    assert.equal(system.getCapabilities('player-1').canGroundJump, true, `tick ${tick}`);
    complete(system, tick, false);
  }
  prepare(system, baseDefinition.jump.coyoteTicks + 1, false);
  assert.equal(system.getCapabilities('player-1').canGroundJump, false);
  assert.equal(system.getCapabilities('player-1').canAirJump, true);
  complete(system, baseDefinition.jump.coyoteTicks + 1, false);
  system.destroy();
});

test('jump buffer survives a landing transition and is consumed once by ground jump', () => {
  const noAirJump = createCharacterDefinition({
    ...baseDefinition,
    id: 'no-air-jump',
    jump: { ...baseDefinition.jump, maximumAirJumps: 0 },
  });
  const system = createSystem(noAirJump);
  prepare(system, 0, false, { jumpPressed: true });
  assert.equal(system.getCapabilities('player-1').hasBufferedJump, true);
  assert.equal(system.getCapabilities('player-1').canAirJump, false);
  complete(system, 0, true);

  prepare(system, 1, true);
  assert.equal(system.getCapabilities('player-1').canGroundJump, true);
  assert.equal(system.getCapabilities('player-1').hasBufferedJump, true);
  const port = ports();
  const executed = system.execute([
    command(MOVEMENT_COMMAND_KIND.REQUEST_GROUND_JUMP),
  ], port.value);
  assert.equal(executed[0].verticalImpulse, noAirJump.jump.groundImpulse);
  assert.deepEqual(port.calls[0].impulse, { x: 0, y: noAirJump.jump.groundImpulse, z: 0 });
  system.completeTick({ tick: 1, contacts: contacts(false) });
  assert.equal(system.getSnapshot('player-1').jumpBufferTicksRemaining, 0);
  assert.equal(system.getSnapshot('player-1').coyoteTicksRemaining, 0);
  system.destroy();
});

test('air jump budget cannot be consumed twice before a real landing', () => {
  const system = createSystem();
  prepare(system, 0, false, { jumpPressed: true });
  assert.equal(system.getCapabilities('player-1').canAirJump, true);
  const port = ports();
  system.execute([command(MOVEMENT_COMMAND_KIND.REQUEST_AIR_JUMP)], port.value);
  system.completeTick({ tick: 0, contacts: contacts(false) });
  assert.equal(system.getSnapshot('player-1').airJumpsUsed, 1);

  prepare(system, 1, false, { jumpPressed: true });
  assert.equal(system.getCapabilities('player-1').canAirJump, false);
  assert.throws(() => system.execute([
    command(MOVEMENT_COMMAND_KIND.REQUEST_AIR_JUMP),
  ], port.value), /不能二段跳/);
  system.execute([], port.value);
  system.completeTick({ tick: 1, contacts: contacts(true) });
  assert.equal(system.getSnapshot('player-1').airJumpsUsed, 0);
  system.destroy();
});

test('product air jump converts the live stick direction into a bounded horizontal impulse', () => {
  const system = createSystem(baseDefinition, { airJumpHorizontalImpulse: 3.6 });
  prepare(system, 0, false, {
    jumpPressed: true,
    moveX: 1,
    moveZ: 1,
  });
  const port = ports();
  system.execute([command(MOVEMENT_COMMAND_KIND.REQUEST_AIR_JUMP)], port.value);
  assert.ok(Math.abs(port.calls[0].impulse.x - 3.6 / Math.sqrt(2)) < 1e-12);
  assert.equal(port.calls[0].impulse.y, baseDefinition.jump.airImpulse);
  assert.ok(Math.abs(port.calls[0].impulse.z - 3.6 / Math.sqrt(2)) < 1e-12);
  system.completeTick({ tick: 0, contacts: contacts(false) });
  system.destroy();
});

test('crouch jump charge is bounded and release derives impulse from CharacterDefinition', () => {
  const system = createSystem();
  prepare(system, 0, true, { jumpHeld: true });
  const port = ports();
  system.execute([command(MOVEMENT_COMMAND_KIND.BEGIN_CROUCH_JUMP)], port.value);
  system.completeTick({ tick: 0, contacts: contacts(true) });
  assert.equal(system.getSnapshot('player-1').mode, MOVEMENT_MODE.CROUCH_CHARGING);
  assert.equal(system.getSnapshot('player-1').crouchChargeTicks, 1);

  prepare(system, 1, true, { jumpHeld: true });
  system.execute([], port.value);
  system.completeTick({ tick: 1, contacts: contacts(true) });
  prepare(system, 2, true, { jumpHeld: false });
  const execution = system.execute([
    command(MOVEMENT_COMMAND_KIND.RELEASE_CROUCH_JUMP),
  ], port.value)[0];
  const expected = baseDefinition.jump.groundImpulse
    + (baseDefinition.jump.crouchImpulse - baseDefinition.jump.groundImpulse)
      * (2 / baseDefinition.jump.maximumCrouchChargeTicks);
  assert.ok(Math.abs(execution.verticalImpulse - expected) < 1e-12);
  system.completeTick({ tick: 2, contacts: contacts(false) });
  assert.equal(system.getSnapshot('player-1').mode, MOVEMENT_MODE.STANDARD);
  assert.equal(system.getSnapshot('player-1').crouchChargeTicks, 0);
  system.destroy();
});

test('down smash sets bounded vertical speed and emits exactly one landing transition', () => {
  const system = createSystem();
  prepare(system, 0, false);
  const port = ports();
  system.execute([
    command(MOVEMENT_COMMAND_KIND.BEGIN_DOWN_SMASH, 'down-smash-action'),
  ], port.value);
  assert.deepEqual(port.calls, [{
    kind: 'vertical-speed',
    participantId: 'player-1',
    speed: -baseDefinition.jump.downSmashSpeed,
  }]);
  const transitions = system.completeTick({ tick: 0, contacts: contacts(true) });
  assert.deepEqual(transitions, [{
    kind: 'down-smash-landed',
    participantId: 'player-1',
    actionDefinitionId: 'down-smash-action',
  }]);
  assert.equal(system.getSnapshot('player-1').mode, MOVEMENT_MODE.STANDARD);

  prepare(system, 1, true);
  system.execute([], port.value);
  assert.deepEqual(system.completeTick({ tick: 1, contacts: contacts(true) }), []);
  system.destroy();
});

test('down smash continues with configured acceleration until its maximum speed', () => {
  const system = createSystem();
  prepare(system, 0, false);
  const startPort = ports();
  system.execute([
    command(MOVEMENT_COMMAND_KIND.BEGIN_DOWN_SMASH, 'aerial-attack'),
  ], startPort.value);
  system.completeTick({ tick: 0, contacts: contacts(false) });

  prepare(system, 1, false);
  const continuationPort = ports();
  system.execute([], continuationPort.value);
  assert.deepEqual(continuationPort.calls, [{
    kind: 'downward-acceleration',
    participantId: 'player-1',
    acceleration: baseDefinition.jump.downSmashAccelerationPerTick,
    maximumSpeed: baseDefinition.jump.maximumDownSmashSpeed,
  }]);
  system.completeTick({ tick: 1, contacts: contacts(false) });
  system.destroy();
});

test('invalid batches do not mutate and a port failure makes MovementSystem fail closed', () => {
  const system = createSystem();
  prepare(system, 0, true);
  const before = system.getSnapshot('player-1');
  const valid = command(MOVEMENT_COMMAND_KIND.REQUEST_GROUND_JUMP);
  const port = ports();
  assert.throws(() => system.execute([valid, valid], port.value), /重复命令/);
  assert.deepEqual(system.getSnapshot('player-1'), before);
  assert.equal(port.calls.length, 0);

  const failing = ports({ failImpulse: true });
  assert.throws(() => system.execute([valid], failing.value), /forced impulse failure/);
  assert.throws(() => system.getSnapshot('player-1'), /已失败/);
  assert.throws(() => system.prepareTick({
    tick: 1,
    contacts: contacts(true),
    inputs: inputs(1),
    availability: availability(),
  }), /已失败/);
  system.destroy();
  system.destroy();
  assert.throws(() => system.getSnapshot('player-1'), /已销毁/);
});

test('tick lifecycle is sequential and complete requires an executed command batch', () => {
  const system = createSystem();
  prepare(system, 20, true);
  assert.throws(() => prepare(system, 21, true), /尚未完成/);
  assert.throws(() => system.completeTick({ tick: 20, contacts: contacts(true) }), /尚未执行/);
  const port = ports();
  system.execute([], port.value);
  system.completeTick({ tick: 20, contacts: contacts(true) });
  assert.throws(() => prepare(system, 22, true), /tick 必须连续/);
  prepare(system, 21, true);
  system.execute([], port.value);
  system.completeTick({ tick: 21, contacts: contacts(true) });
  system.destroy();
});

test('invalid prepare and complete batches leave the current lifecycle recoverable', () => {
  const system = createSystem();
  const initial = system.listSnapshots();
  assert.throws(() => system.prepareTick({
    tick: 0,
    contacts: contacts(true),
    inputs: [inputs(0)[0], inputs(0)[0]],
    availability: availability(),
  }), /重复 player-1/);
  assert.deepEqual(system.listSnapshots(), initial);

  prepare(system, 0, true);
  const port = ports();
  system.execute([], port.value);
  assert.throws(() => system.completeTick({
    tick: 0,
    contacts: [contacts(true)[0], contacts(true)[0]],
  }), /重复 player-1/);
  system.completeTick({ tick: 0, contacts: contacts(true) });
  system.destroy();
});

test('a two-participant command batch has stable order and one physical commit boundary', () => {
  const system = createSystem();
  prepare(system, 0, true);
  const batches = [];
  const executions = system.execute([
    command(MOVEMENT_COMMAND_KIND.REQUEST_GROUND_JUMP, 'jump-2', 'player-2'),
    command(MOVEMENT_COMMAND_KIND.REQUEST_GROUND_JUMP, 'jump-1', 'player-1'),
  ], {
    applyBatch(operations) {
      batches.push(operations);
    },
  });
  assert.equal(batches.length, 1);
  assert.deepEqual(
    batches[0].map(({ participantId }) => participantId),
    ['player-1', 'player-2'],
  );
  assert.deepEqual(
    executions.map(({ participantId }) => participantId),
    ['player-1', 'player-2'],
  );
  assert.ok(Object.isFrozen(batches[0]));
  assert.ok(batches[0].every(Object.isFrozen));
  assert.equal(system.getSnapshot('player-1').coyoteTicksRemaining, 0);
  assert.equal(system.getSnapshot('player-2').coyoteTicksRemaining, 0);
  system.completeTick({ tick: 0, contacts: contacts(false, false) });
  system.destroy();
});

test('movement mutation port cannot reenter authority and asynchronous ports fail closed', () => {
  const reentrantSystem = createSystem();
  prepare(reentrantSystem, 0, true);
  assert.throws(() => reentrantSystem.execute([
    command(MOVEMENT_COMMAND_KIND.REQUEST_GROUND_JUMP),
  ], {
    applyBatch() {
      reentrantSystem.getSnapshot('player-1');
    },
  }), /不可重入/);
  assert.throws(() => reentrantSystem.listSnapshots(), /已失败/);
  reentrantSystem.destroy();

  const asyncSystem = createSystem();
  prepare(asyncSystem, 0, true);
  assert.throws(() => asyncSystem.execute([
    command(MOVEMENT_COMMAND_KIND.REQUEST_GROUND_JUMP),
  ], {
    applyBatch() {
      return Promise.resolve();
    },
  }), /同步返回 undefined/);
  assert.throws(() => asyncSystem.listSnapshots(), /已失败/);
  asyncSystem.destroy();
});

test('participant reset and interruption are rejected inside an active tick', () => {
  const system = createSystem();
  prepare(system, 0, true, { jumpPressed: true });
  const before = system.getSnapshot('player-1');
  assert.throws(() => system.interruptParticipant('player-1'), /进行中/);
  assert.throws(() => system.resetParticipant('player-1'), /进行中/);
  assert.deepEqual(system.getSnapshot('player-1'), before);
  const port = ports();
  system.execute([], port.value);
  system.completeTick({ tick: 0, contacts: contacts(true) });

  assert.equal(system.interruptParticipant('player-1').jumpBufferTicksRemaining, 0);
  assert.equal(system.resetParticipant('player-1').revision > 0, true);
  system.destroy();
});

test('buffer expiration, bounded crouch charge and movement suppression have explicit boundaries', () => {
  const noAirJump = createCharacterDefinition({
    ...baseDefinition,
    id: 'movement-boundaries',
    jump: { ...baseDefinition.jump, maximumAirJumps: 0, maximumCrouchChargeTicks: 3 },
  });
  const buffered = createSystem(noAirJump);
  prepare(buffered, 0, false, { jumpPressed: true });
  assert.equal(buffered.getCapabilities('player-1').hasBufferedJump, true);
  complete(buffered, 0, false);
  for (let tick = 1; tick < noAirJump.jump.bufferTicks; tick += 1) {
    prepare(buffered, tick, false);
    complete(buffered, tick, false);
  }
  prepare(buffered, noAirJump.jump.bufferTicks, false);
  assert.equal(buffered.getCapabilities('player-1').hasBufferedJump, false);
  complete(buffered, noAirJump.jump.bufferTicks, false);
  buffered.destroy();

  const charged = createSystem(noAirJump);
  prepare(charged, 0, true, { jumpHeld: true });
  const port = ports();
  charged.execute([command(MOVEMENT_COMMAND_KIND.BEGIN_CROUCH_JUMP)], port.value);
  charged.completeTick({ tick: 0, contacts: contacts(true) });
  for (let tick = 1; tick <= 5; tick += 1) {
    prepare(charged, tick, true, { jumpHeld: true });
    charged.execute([], port.value);
    charged.completeTick({ tick, contacts: contacts(true) });
  }
  assert.equal(charged.getSnapshot('player-1').crouchChargeTicks, 3);
  prepare(charged, 6, true, { jumpHeld: true }, false);
  assert.equal(charged.getSnapshot('player-1').mode, MOVEMENT_MODE.STANDARD);
  assert.equal(charged.getSnapshot('player-1').crouchChargeTicks, 0);
  assert.equal(charged.getCapabilities('player-1').canGroundJump, false);
  charged.execute([], port.value);
  charged.completeTick({ tick: 6, contacts: contacts(true) });
  charged.destroy();
});
