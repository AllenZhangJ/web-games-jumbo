import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MOVEMENT_MODE,
  cloneMovementRuntimeState,
  createMovementRuntimeSnapshot,
  createMovementRuntimeSnapshotFromValidatedDefinition,
  createMovementRuntimeState,
} from '@number-strategy-jump/arena-movement';
import {
  deserializeMovementRuntimeState,
  serializeMovementRuntimeStates,
} from '@number-strategy-jump/arena-movement';
import {
  MOVEMENT_COMMAND_KIND,
  createMovementCommand,
} from '@number-strategy-jump/arena-movement';
import {
  MOVEMENT_MUTATION_KIND,
  createMovementMutation,
} from '@number-strategy-jump/arena-movement';
import { createArenaV1CharacterRegistry } from '@number-strategy-jump/arena-v1-content';
import { ARENA_V1_CHARACTER_ID } from '@number-strategy-jump/arena-definitions';

const registry = createArenaV1CharacterRegistry();
const definition = registry.require(ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE);
const definitionById = (id) => registry.require(id);

test('MovementRuntime contains only serializable rule state and deep-freezes snapshots', () => {
  const state = createMovementRuntimeState({
    participantId: 'player-1',
    characterDefinition: definition,
  });
  const snapshot = createMovementRuntimeSnapshot(state, definition);
  assert.deepEqual(snapshot, {
    schemaVersion: 2,
    participantId: 'player-1',
    characterDefinitionId: ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE,
    mode: MOVEMENT_MODE.STANDARD,
    coyoteTicksRemaining: 0,
    jumpBufferTicksRemaining: 0,
    airJumpsUsed: 0,
    crouchChargeTicks: 0,
    crouchActionId: null,
    downSmashActionId: null,
    revision: 0,
  });
  assert.ok(Object.isFrozen(snapshot));
  assert.equal(snapshot.grounded, undefined);
  assert.equal(snapshot.physicsBody, undefined);
  assert.equal(snapshot.renderer, undefined);
  assert.throws(() => { snapshot.airJumpsUsed = 99; }, TypeError);
});

test('MovementRuntime validates mode invariants and CharacterDefinition limits', () => {
  const state = createMovementRuntimeState({
    participantId: 'player-1',
    characterDefinition: definition,
  });
  state.coyoteTicksRemaining = definition.jump.coyoteTicks + 1;
  assert.throws(() => createMovementRuntimeSnapshot(state, definition), /coyoteTicksRemaining/);
  state.coyoteTicksRemaining = 0;
  state.mode = MOVEMENT_MODE.CROUCH_CHARGING;
  assert.throws(() => createMovementRuntimeSnapshot(state, definition), /正蓄力状态/);
  state.crouchChargeTicks = 1;
  state.crouchActionId = 'crouch-begin';
  assert.equal(createMovementRuntimeSnapshot(state, definition).crouchChargeTicks, 1);
  state.mode = MOVEMENT_MODE.DOWN_SMASH;
  assert.throws(() => createMovementRuntimeSnapshot(state, definition), /down-smash/);
  state.crouchChargeTicks = 0;
  state.crouchActionId = null;
  state.downSmashActionId = 'down-smash-action';
  assert.equal(createMovementRuntimeSnapshot(state, definition).mode, MOVEMENT_MODE.DOWN_SMASH);
});

test('internal MovementRuntime drafts stay independent while reusing validated definitions', () => {
  const state = createMovementRuntimeState({
    participantId: 'player-1',
    characterDefinition: definition,
  });
  state.coyoteTicksRemaining = 3;
  const draft = cloneMovementRuntimeState(state);
  draft.coyoteTicksRemaining = 1;
  assert.equal(state.coyoteTicksRemaining, 3);
  assert.equal(
    createMovementRuntimeSnapshotFromValidatedDefinition(draft, definition)
      .coyoteTicksRemaining,
    1,
  );
  assert.throws(() => createMovementRuntimeSnapshotFromValidatedDefinition(
    draft,
    { ...definition },
  ), /已冻结 CharacterDefinition/);
});

test('MovementSerializer round trips without retaining Registry or Definition references', () => {
  const state = createMovementRuntimeState({
    participantId: 'player-1',
    characterDefinition: definition,
  });
  state.coyoteTicksRemaining = 3;
  state.jumpBufferTicksRemaining = 2;
  state.airJumpsUsed = 1;
  state.revision = 7;
  const serialized = serializeMovementRuntimeStates([state], {
    characterDefinitionById: definitionById,
  });
  const restored = deserializeMovementRuntimeState(serialized[0], {
    characterDefinitionById: definitionById,
  });
  assert.deepEqual(
    createMovementRuntimeSnapshot(restored, definition),
    serialized[0],
  );
  assert.equal(restored.characterRegistry, undefined);
  assert.equal(restored.characterDefinition, undefined);
  assert.throws(() => serializeMovementRuntimeStates([state, state], {
    characterDefinitionById: definitionById,
  }), /重复 participantId/);
});

test('MovementCommand is strict immutable data and rejects implementation payloads', () => {
  const command = createMovementCommand({
    kind: MOVEMENT_COMMAND_KIND.REQUEST_GROUND_JUMP,
    participantId: 'player-1',
    actionDefinitionId: 'ground-jump',
  });
  assert.ok(Object.isFrozen(command));
  assert.throws(() => createMovementCommand({
    ...command,
    impulse: { x: 0, y: 9, z: 0 },
  }), /不支持字段 impulse/);
  assert.throws(() => createMovementCommand({
    ...command,
    kind: 'teleport',
  }), /kind 不受支持/);
});

test('MovementMutation exposes validated jump, vertical-speed and downward acceleration operations', () => {
  const impulse = createMovementMutation({
    kind: MOVEMENT_MUTATION_KIND.APPLY_IMPULSE,
    participantId: 'player-1',
    impulse: { x: 0, y: 9, z: 0 },
  });
  assert.ok(Object.isFrozen(impulse));
  assert.ok(Object.isFrozen(impulse.impulse));
  assert.deepEqual(impulse.impulse, { x: 0, y: 9, z: 0 });
  const directional = createMovementMutation({
    ...impulse,
    impulse: { x: 1, y: 9, z: -2 },
  });
  assert.deepEqual(directional.impulse, { x: 1, y: 9, z: -2 });
  assert.throws(() => createMovementMutation({
    ...impulse,
    impulse: { x: Number.NaN, y: 9, z: 0 },
  }), /非有限数|有限向量/);
  assert.throws(() => createMovementMutation({
    kind: MOVEMENT_MUTATION_KIND.SET_VERTICAL_SPEED,
    participantId: 'player-1',
    speed: 0,
  }), /有限负数/);
  assert.throws(() => createMovementMutation({
    kind: MOVEMENT_MUTATION_KIND.SET_VERTICAL_SPEED,
    participantId: 'player-1',
    speed: -12,
    callback: 'not-allowed',
  }), /不支持字段 callback/);
  assert.deepEqual(createMovementMutation({
    kind: MOVEMENT_MUTATION_KIND.ACCELERATE_DOWNWARD,
    participantId: 'player-1',
    acceleration: 0.55,
    maximumSpeed: 22,
  }), {
    kind: MOVEMENT_MUTATION_KIND.ACCELERATE_DOWNWARD,
    participantId: 'player-1',
    acceleration: 0.55,
    maximumSpeed: 22,
  });
});
