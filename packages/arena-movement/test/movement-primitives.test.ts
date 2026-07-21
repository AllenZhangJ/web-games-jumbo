import { describe, expect, it } from 'vitest';

import {
  CHARACTER_DEFINITION_SCHEMA_VERSION,
  createCharacterDefinition,
} from '@number-strategy-jump/arena-definitions';

import {
  MOVEMENT_COMMAND_KIND,
  MOVEMENT_GAIT,
  MOVEMENT_MODE,
  MOVEMENT_MUTATION_KIND,
  cloneMovementRuntimeState,
  createMovementCapabilities,
  createMovementCommand,
  createMovementMutation,
  createMovementRuntimeSnapshot,
  createMovementRuntimeState,
  deserializeMovementRuntimeState,
  projectCharacterMovementIntent,
  resetMovementRuntimeState,
  serializeMovementRuntimeStates,
} from '../src/index.js';

const definition = createCharacterDefinition({
  schemaVersion: CHARACTER_DEFINITION_SCHEMA_VERSION,
  id: 'character.movement-test',
  collision: { radius: 0.4, halfHeight: 0.9, mass: 70 },
  movement: {
    walkSpeed: 4,
    runSpeed: 8,
    runInputThreshold: 0.5,
    groundAcceleration: 1,
    airAcceleration: 0.5,
    maximumHorizontalSpeed: 9,
    automaticStepHeight: 0.2,
  },
  jump: {
    groundImpulse: 8,
    crouchImpulse: 10,
    airImpulse: 7,
    downSmashSpeed: 9,
    downSmashAccelerationPerTick: 1,
    maximumDownSmashSpeed: 14,
    coyoteTicks: 4,
    bufferTicks: 5,
    maximumAirJumps: 1,
    maximumCrouchChargeTicks: 8,
  },
  tags: [],
});

describe('arena-movement primitives', () => {
  it('keeps runtime identity immutable and reset deterministic', () => {
    const state = createMovementRuntimeState({
      participantId: 'player-1',
      characterDefinition: definition,
    });
    state.airJumpsUsed = 1;
    state.jumpBufferTicksRemaining = 3;

    const clone = cloneMovementRuntimeState(state);
    expect(clone).not.toBe(state);
    expect(createMovementRuntimeSnapshot(clone, definition)).toEqual({
      schemaVersion: 2,
      participantId: 'player-1',
      characterDefinitionId: definition.id,
      mode: MOVEMENT_MODE.STANDARD,
      coyoteTicksRemaining: 0,
      jumpBufferTicksRemaining: 3,
      airJumpsUsed: 1,
      crouchChargeTicks: 0,
      crouchActionId: null,
      downSmashActionId: null,
      revision: 0,
    });

    resetMovementRuntimeState(clone);
    expect(clone.airJumpsUsed).toBe(0);
    expect(clone.jumpBufferTicksRemaining).toBe(0);
    expect(clone.revision).toBe(1);
  });

  it('derives gait and speed only from the character definition', () => {
    expect(projectCharacterMovementIntent({
      moveX: 0.25,
      moveZ: 0,
      characterDefinition: definition,
    })).toEqual({ x: 0.25, z: 0, gait: MOVEMENT_GAIT.WALK, targetSpeed: 2 });

    expect(projectCharacterMovementIntent({
      moveX: 1,
      moveZ: 0,
      characterDefinition: definition,
    })).toEqual({ x: 1, z: 0, gait: MOVEMENT_GAIT.RUN, targetSpeed: 8 });
  });

  it('normalizes commands and mutations into frozen discriminated contracts', () => {
    const command = createMovementCommand({
      kind: MOVEMENT_COMMAND_KIND.REQUEST_AIR_JUMP,
      participantId: 'player-1',
      actionDefinitionId: 'action.air-jump',
    });
    const mutation = createMovementMutation({
      kind: MOVEMENT_MUTATION_KIND.APPLY_IMPULSE,
      participantId: 'player-1',
      impulse: { x: 0, y: 7, z: 0 },
    });

    expect(Object.isFrozen(command)).toBe(true);
    if (mutation.kind !== MOVEMENT_MUTATION_KIND.APPLY_IMPULSE) {
      throw new Error('测试需要跳跃冲量 mutation。');
    }
    expect(Object.isFrozen(mutation.impulse)).toBe(true);
    expect(() => createMovementMutation({
      kind: MOVEMENT_MUTATION_KIND.SET_VERTICAL_SPEED,
      participantId: 'player-1',
      speed: 0,
    })).toThrow('下砸速度必须是有限负数');
  });

  it('computes capabilities without mutating authoritative state', () => {
    const state = createMovementRuntimeState({
      participantId: 'player-1',
      characterDefinition: definition,
    });
    const before = createMovementRuntimeSnapshot(state, definition);
    const capabilities = createMovementCapabilities({
      participantId: 'player-1',
      state,
      definition,
      contact: { grounded: false },
      canMove: true,
    });

    expect(capabilities.canAirJump).toBe(true);
    expect(createMovementRuntimeSnapshot(state, definition)).toEqual(before);
  });

  it('serializes in participant order and rejects duplicate authority identities', () => {
    const second = createMovementRuntimeState({
      participantId: 'player-2',
      characterDefinition: definition,
    });
    const first = createMovementRuntimeState({
      participantId: 'player-1',
      characterDefinition: definition,
    });
    const resolver = { characterDefinitionById: () => definition };
    const snapshots = serializeMovementRuntimeStates([second, first], resolver);

    expect(snapshots.map(({ participantId }) => participantId)).toEqual(['player-1', 'player-2']);
    expect(deserializeMovementRuntimeState(snapshots[0], resolver)).toEqual(first);
    expect(() => serializeMovementRuntimeStates([first, first], resolver)).toThrow(
      '不能序列化重复 participantId',
    );
  });
});
