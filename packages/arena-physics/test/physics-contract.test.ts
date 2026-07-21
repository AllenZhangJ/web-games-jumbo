import { describe, expect, it } from 'vitest';

import { MOVEMENT_MUTATION_KIND } from '@number-strategy-jump/arena-movement';
import { ARENA_GAMEPLAY_V2_TUNING } from '@number-strategy-jump/arena-definitions';

import {
  ARENA_FIXED_DT,
  ARENA_PHYSICS,
  assertPhysicsWorld,
  createLightweightPhysicsWorld,
  createMovementPhysicsPort,
  validateArenaDefinition,
  validateCharacterDefinition,
  type PhysicsWorld,
} from '../src/index.js';

const TEST_ARENA = Object.freeze({
  killY: -5,
  surfaces: Object.freeze([Object.freeze({
    id: 'main',
    center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
    halfExtents: Object.freeze({ x: 6, y: 0.5, z: 6 }),
  })]),
});

function addTestCharacter(world: PhysicsWorld, id: string, x: number): void {
  world.addCharacter({
    id,
    position: { x, y: 1, z: 0 },
    radius: ARENA_PHYSICS.characterRadius,
    halfHeight: ARENA_PHYSICS.characterHalfHeight,
    mass: ARENA_PHYSICS.characterMass,
    moveSpeed: ARENA_PHYSICS.moveSpeed,
    groundAcceleration: ARENA_PHYSICS.groundAcceleration,
    airAcceleration: ARENA_PHYSICS.airAcceleration,
  });
}

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
  it('derives the fixed step and every solver default from Gameplay V2 Definition', () => {
    expect(ARENA_FIXED_DT).toBe(1 / ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz);
    expect(ARENA_PHYSICS).toMatchObject({
      gravity: -ARENA_GAMEPLAY_V2_TUNING.physics.gravityMagnitude,
      maxHorizontalSpeed:
        ARENA_GAMEPLAY_V2_TUNING.character.movement.maximumHorizontalSpeed,
      maxVerticalSpeed: ARENA_GAMEPLAY_V2_TUNING.character.jump.maximumDownAttackSpeed,
      groundProbeTolerance: ARENA_GAMEPLAY_V2_TUNING.physics.groundProbeTolerance,
      maxStepHeight: ARENA_GAMEPLAY_V2_TUNING.character.movement.automaticStepHeight,
      groundSnapDistance: ARENA_GAMEPLAY_V2_TUNING.physics.groundSnapDistance,
      substeps: ARENA_GAMEPLAY_V2_TUNING.physics.substeps,
    });
  });

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

  it('produces identical state for identical fixed-tick input', () => {
    const run = () => {
      const world = createLightweightPhysicsWorld({ arena: TEST_ARENA });
      addTestCharacter(world, 'player-1', -1);
      addTestCharacter(world, 'player-2', 1);
      world.setMovementIntent('player-1', 1, 0);
      world.setMovementIntent('player-2', -1, 0);
      for (let tick = 0; tick < 120; tick += 1) world.step(ARENA_FIXED_DT);
      const result = [
        world.getCharacterState('player-1'),
        world.getCharacterState('player-2'),
      ];
      world.destroy();
      return result;
    };

    expect(run()).toEqual(run());
  });

  it('commits no participant when a later mutation cannot produce finite velocity', () => {
    const world = createLightweightPhysicsWorld({ arena: TEST_ARENA });
    addTestCharacter(world, 'normal', -1);
    world.addCharacter({
      id: 'tiny',
      position: { x: 1, y: 1, z: 0 },
      radius: ARENA_PHYSICS.characterRadius,
      halfHeight: ARENA_PHYSICS.characterHalfHeight,
      mass: Number.MIN_VALUE,
      moveSpeed: ARENA_PHYSICS.moveSpeed,
      groundAcceleration: ARENA_PHYSICS.groundAcceleration,
      airAcceleration: ARENA_PHYSICS.airAcceleration,
    });
    const before = world.getCharacterState('normal');

    expect(() => world.applyCharacterMutationBatch([
      {
        kind: MOVEMENT_MUTATION_KIND.APPLY_IMPULSE,
        participantId: 'normal',
        impulse: { x: 0, y: 2, z: 0 },
      },
      {
        kind: MOVEMENT_MUTATION_KIND.APPLY_IMPULSE,
        participantId: 'tiny',
        impulse: { x: 0, y: 2, z: 0 },
      },
    ])).toThrow('必须产生有限速度');
    expect(world.getCharacterState('normal')).toEqual(before);
    world.destroy();
  });

  it('owns an idempotent terminal lifecycle and rejects all later authority use', () => {
    const world = createLightweightPhysicsWorld({ arena: TEST_ARENA });
    addTestCharacter(world, 'player-1', 0);
    world.destroy();
    world.destroy();

    expect(() => world.step(ARENA_FIXED_DT)).toThrow('已销毁');
    expect(() => world.getCharacterState('player-1')).toThrow('已销毁');
    expect(() => addTestCharacter(world, 'player-2', 1)).toThrow('已销毁');
  });
});
