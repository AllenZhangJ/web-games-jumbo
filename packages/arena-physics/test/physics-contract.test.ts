import { describe, expect, it } from 'vitest';

import { MOVEMENT_MUTATION_KIND } from '@number-strategy-jump/arena-movement';

import {
  assertPhysicsWorld,
  createMovementPhysicsPort,
  validateArenaDefinition,
  validateCharacterDefinition,
  type PhysicsWorld,
} from '../src/index.js';

function createWorld(overrides: Partial<PhysicsWorld> = {}): PhysicsWorld {
  return {
    addCharacter: () => 'player-1',
    setMovementIntent: () => {},
    applyImpulse: () => {},
    applyCharacterMutationBatch: () => {},
    setSurfaceEnabled: () => false,
    step: () => {},
    getCharacterState: () => ({
      id: 'player-1',
      position: { x: 0, y: 1, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      facing: { x: 1, z: 0 },
      grounded: true,
      supportSurfaceId: 'main',
    }),
    resetCharacter: () => {},
    destroy: () => {},
    ...overrides,
  };
}

describe('arena-physics contracts', () => {
  it('validates and detaches authority arena and character inputs', () => {
    const center = { x: 0, y: -0.5, z: 0 };
    const arena = validateArenaDefinition({
      killY: -5,
      surfaces: [{ id: 'main', center, halfExtents: { x: 6, y: 0.5, z: 6 } }],
    });
    const character = validateCharacterDefinition({
      id: 'player-1',
      position: { x: 0, y: 1, z: 0 },
      radius: 0.3,
      halfHeight: 0.7,
      mass: 1,
      moveSpeed: 5,
      groundAcceleration: 20,
      airAcceleration: 10,
    });

    center.x = 99;
    expect(arena.surfaces[0]?.center.x).toBe(0);
    expect(character.position).toEqual({ x: 0, y: 1, z: 0 });
    expect(() => validateArenaDefinition({
      killY: -5,
      surfaces: [{ id: 'main', center, halfExtents: { x: 0, y: 1, z: 1 } }],
    })).toThrow('必须大于 0');
  });

  it('validates the complete movement batch before one synchronous world call', () => {
    const batches: unknown[][] = [];
    const world = assertPhysicsWorld(createWorld({
      applyCharacterMutationBatch(mutations) {
        batches.push([...mutations]);
      },
    }));
    const port = createMovementPhysicsPort(world);

    port.applyBatch([{
      kind: MOVEMENT_MUTATION_KIND.SET_VERTICAL_SPEED,
      participantId: 'player-1',
      speed: -9,
    }]);
    expect(batches).toHaveLength(1);

    expect(() => port.applyBatch([
      {
        kind: MOVEMENT_MUTATION_KIND.SET_VERTICAL_SPEED,
        participantId: 'player-1',
        speed: -9,
      },
      {
        kind: MOVEMENT_MUTATION_KIND.SET_VERTICAL_SPEED,
        participantId: 'player-2',
        speed: 0,
      },
    ])).toThrow('下砸速度必须是有限负数');
    expect(batches).toHaveLength(1);
  });
});
