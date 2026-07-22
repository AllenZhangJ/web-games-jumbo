import test from 'node:test';
import assert from 'node:assert/strict';
import { ActionRegistry } from '@number-strategy-jump/arena-definitions';
import {
  ACTION_INPUT_CHANNEL,
  ACTION_LANE,
} from '@number-strategy-jump/arena-definitions';
import {
  ACTION_PRIORITY,
  ACTION_RESOLUTION_KIND,
  ActionResolver,
  createDefaultActionEffectRegistry,
  createDefaultTargetingRegistry,
} from '@number-strategy-jump/arena-core';
import {
  STAGE4_ACTION_DEFINITIONS,
  STAGE4_ACTION_ID,
} from '@number-strategy-jump/arena-v1-content';
import {
  STAGE6_MOVEMENT_ACTION_DEFINITIONS,
  STAGE6_MOVEMENT_ACTION_ID,
} from '@number-strategy-jump/arena-v1-content';
import { MovementActionCandidateProvider } from '@number-strategy-jump/arena-v1-composition';
import { createMovementActionEffectHandlers } from '@number-strategy-jump/arena-v1-composition';
import { MOVEMENT_COMMAND_KIND, MOVEMENT_MODE } from '@number-strategy-jump/arena-movement';

const actionRegistry = new ActionRegistry([
  ...STAGE4_ACTION_DEFINITIONS,
  ...STAGE6_MOVEMENT_ACTION_DEFINITIONS,
]);

function capabilities(overrides = {}) {
  return {
    participantId: 'player-1',
    canMove: true,
    grounded: true,
    mode: MOVEMENT_MODE.STANDARD,
    crouchActionDefinitionId: null,
    hasBufferedJump: false,
    canGroundJump: true,
    canAirJump: false,
    canBeginCrouchJump: true,
    canReleaseCrouchJump: false,
    canBeginDownSmash: false,
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    primaryPressed: false,
    primaryHeld: false,
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: false,
    ...overrides,
  };
}

function resolve(candidates, frame) {
  return new ActionResolver({ actionRegistry }).resolve({
    tick: 1,
    participantId: 'player-1',
    canAct: true,
    input: frame,
    candidates,
    occupiedLanes: [],
    activeConflictTags: [],
  });
}

test('Stage6 movement catalog validates through generic targeting and effect registries', () => {
  assert.deepEqual(
    STAGE6_MOVEMENT_ACTION_DEFINITIONS.map(({ id }) => id).sort(),
    Object.values(STAGE6_MOVEMENT_ACTION_ID).sort(),
  );
  createDefaultTargetingRegistry().validateActionRegistry(actionRegistry);
  createDefaultActionEffectRegistry(
    createMovementActionEffectHandlers(),
  ).validateActionRegistry(actionRegistry);
  assert.ok(STAGE6_MOVEMENT_ACTION_DEFINITIONS.every((definition) => (
    definition.lane === ACTION_LANE.LOCOMOTION
    && Object.isFrozen(definition)
  )));
});

test('MovementActionCandidateProvider derives explicit and context choices only from capabilities', () => {
  const provider = new MovementActionCandidateProvider({ actionRegistry });
  const candidates = provider.getCandidates(capabilities());
  const explicit = resolve(candidates, input({ jumpPressed: true }));
  assert.equal(explicit.outcomes[0].actionDefinitionId, STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP);

  const ordinaryPress = resolve(candidates, input({ jumpPressed: true, jumpHeld: true }));
  assert.equal(
    ordinaryPress.outcomes[0].actionDefinitionId,
    STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP,
  );

  const crouch = resolve(candidates, input({ jumpHeld: true }));
  assert.equal(crouch.outcomes[0].actionDefinitionId, STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_BEGIN);

  const baseUnavailable = {
    id: `base:${STAGE4_ACTION_ID.BASE_PUSH}`,
    actionDefinitionId: STAGE4_ACTION_ID.BASE_PUSH,
    source: 'base-action-provider',
    priority: ACTION_PRIORITY.BASE,
    available: false,
    blocksFallback: false,
    unavailableReason: 'no-target',
  };
  const contextual = resolve(
    [baseUnavailable, ...candidates],
    input({ primaryPressed: true }),
  );
  assert.equal(
    contextual.outcomes[0].actionDefinitionId,
    STAGE6_MOVEMENT_ACTION_ID.CONTEXT_GROUND_JUMP,
  );
  const contextualCrouch = resolve(
    [baseUnavailable, ...candidates],
    input({ primaryHeld: true }),
  );
  assert.equal(
    contextualCrouch.outcomes[0].actionDefinitionId,
    STAGE6_MOVEMENT_ACTION_ID.CONTEXT_CROUCH_BEGIN,
  );
  assert.equal(provider.getCandidates(capabilities()), candidates);
  assert.notEqual(provider.getCandidates(capabilities({ grounded: false })), candidates);
  assert.ok(Object.isFrozen(candidates));
  assert.ok(candidates.every(Object.isFrozen));
});

test('explicit product input removes hidden primary-button mobility fallbacks', () => {
  const provider = new MovementActionCandidateProvider({
    actionRegistry,
    contextPrimaryEnabled: false,
  });
  const candidates = provider.getCandidates(capabilities());
  assert.equal(candidates.some(({ actionDefinitionId }) => (
    actionDefinitionId.startsWith('movement.context-')
  )), false);
  assert.equal(candidates.some(({ actionDefinitionId }) => (
    actionDefinitionId === STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP
  )), true);
});

test('crouch release stays on the channel that began charging', () => {
  const provider = new MovementActionCandidateProvider({ actionRegistry });
  const explicitCandidates = provider.getCandidates(capabilities({
    mode: MOVEMENT_MODE.CROUCH_CHARGING,
    crouchActionDefinitionId: STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_BEGIN,
    canGroundJump: false,
    canBeginCrouchJump: false,
    canReleaseCrouchJump: true,
  }));
  assert.equal(
    explicitCandidates.some(({ actionDefinitionId }) => (
      actionDefinitionId === STAGE6_MOVEMENT_ACTION_ID.CONTEXT_CROUCH_RELEASE
    )),
    false,
  );
  const explicit = resolve(explicitCandidates, input());
  assert.equal(explicit.outcomes[0].inputChannel, ACTION_INPUT_CHANNEL.JUMP);
  assert.equal(explicit.outcomes[0].kind, ACTION_RESOLUTION_KIND.SELECTED);

  const contextCandidates = provider.getCandidates(capabilities({
    mode: MOVEMENT_MODE.CROUCH_CHARGING,
    crouchActionDefinitionId: STAGE6_MOVEMENT_ACTION_ID.CONTEXT_CROUCH_BEGIN,
    canGroundJump: false,
    canBeginCrouchJump: false,
    canReleaseCrouchJump: true,
  }));
  const held = resolve(contextCandidates, input({ primaryHeld: true }));
  assert.equal(held.outcomes[0].kind, ACTION_RESOLUTION_KIND.NONE);
  assert.equal(held.outcomes[0].reason, 'no-available-candidate');
  const released = resolve(contextCandidates, input());
  assert.equal(released.outcomes[0].inputChannel, ACTION_INPUT_CHANNEL.PRIMARY);
  assert.equal(released.outcomes[0].actionDefinitionId, STAGE6_MOVEMENT_ACTION_ID.CONTEXT_CROUCH_RELEASE);
});

test('movement action effects produce generic rule commands without physics payloads', () => {
  const effects = createDefaultActionEffectRegistry(createMovementActionEffectHandlers());
  const definition = actionRegistry.require(STAGE6_MOVEMENT_ACTION_ID.DOWN_SMASH);
  const commands = effects.resolve(definition.effects[0], {
    actionDefinitionId: definition.id,
    source: {
      id: 'player-1',
      position: { x: 0, y: 3, z: 0 },
      facing: { x: 1, z: 0 },
    },
  });
  assert.deepEqual(commands, [{
    kind: MOVEMENT_COMMAND_KIND.BEGIN_DOWN_SMASH,
    participantId: 'player-1',
  }]);
  assert.equal(commands[0].speed, undefined);
  assert.ok(Object.isFrozen(commands));
  assert.ok(Object.isFrozen(commands[0]));
});
