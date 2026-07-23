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
  type ActionCandidate,
  type ActionIntentInput,
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
import {
  MOVEMENT_COMMAND_KIND,
  MOVEMENT_MODE,
  type MovementCapabilities,
} from '@number-strategy-jump/arena-movement';

const actionRegistry = new ActionRegistry([
  ...STAGE4_ACTION_DEFINITIONS,
  ...STAGE6_MOVEMENT_ACTION_DEFINITIONS,
]);

function required<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined) throw new Error(`测试缺少 ${name}。`);
  return value;
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  return value as Record<string, unknown>;
}

function capabilities(overrides: Partial<MovementCapabilities> = {}): MovementCapabilities {
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

function input(overrides: Partial<ActionIntentInput> = {}): ActionIntentInput {
  return {
    primaryPressed: false,
    primaryHeld: false,
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: false,
    ...overrides,
  };
}

function resolve(candidates: readonly ActionCandidate[], frame: ActionIntentInput) {
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
  assert.equal(required(explicit.outcomes[0], '显式跳跃裁决').actionDefinitionId, STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP);

  const ordinaryPress = resolve(candidates, input({ jumpPressed: true, jumpHeld: true }));
  assert.equal(
    required(ordinaryPress.outcomes[0], '普通跳跃裁决').actionDefinitionId,
    STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP,
  );

  const crouch = resolve(candidates, input({ jumpHeld: true }));
  assert.equal(required(crouch.outcomes[0], '蓄力跳裁决').actionDefinitionId, STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_BEGIN);

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
    required(contextual.outcomes[0], '上下文跳跃裁决').actionDefinitionId,
    STAGE6_MOVEMENT_ACTION_ID.CONTEXT_GROUND_JUMP,
  );
  const contextualCrouch = resolve(
    [baseUnavailable, ...candidates],
    input({ primaryHeld: true }),
  );
  assert.equal(
    required(contextualCrouch.outcomes[0], '上下文蓄力裁决').actionDefinitionId,
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
  assert.equal(required(explicit.outcomes[0], '显式释放裁决').inputChannel, ACTION_INPUT_CHANNEL.JUMP);
  assert.equal(required(explicit.outcomes[0], '显式释放裁决').kind, ACTION_RESOLUTION_KIND.SELECTED);

  const contextCandidates = provider.getCandidates(capabilities({
    mode: MOVEMENT_MODE.CROUCH_CHARGING,
    crouchActionDefinitionId: STAGE6_MOVEMENT_ACTION_ID.CONTEXT_CROUCH_BEGIN,
    canGroundJump: false,
    canBeginCrouchJump: false,
    canReleaseCrouchJump: true,
  }));
  const held = resolve(contextCandidates, input({ primaryHeld: true }));
  assert.equal(required(held.outcomes[0], '保持蓄力裁决').kind, ACTION_RESOLUTION_KIND.NONE);
  assert.equal(required(held.outcomes[0], '保持蓄力裁决').reason, 'no-available-candidate');
  const released = resolve(contextCandidates, input());
  assert.equal(required(released.outcomes[0], '上下文释放裁决').inputChannel, ACTION_INPUT_CHANNEL.PRIMARY);
  assert.equal(required(released.outcomes[0], '上下文释放裁决').actionDefinitionId, STAGE6_MOVEMENT_ACTION_ID.CONTEXT_CROUCH_RELEASE);
});

test('movement action effects produce generic rule commands without physics payloads', () => {
  const effects = createDefaultActionEffectRegistry(createMovementActionEffectHandlers());
  const definition = actionRegistry.require(STAGE6_MOVEMENT_ACTION_ID.DOWN_SMASH);
  const commands = effects.resolve(required(definition.effects[0], '下砸效果'), {
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
  assert.equal(record(commands[0], '下砸命令').speed, undefined);
  assert.ok(Object.isFrozen(commands));
  assert.ok(Object.isFrozen(required(commands[0], '冻结的下砸命令')));
});
