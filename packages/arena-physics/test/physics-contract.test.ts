import { describe, expect, it } from 'vitest';

import { MOVEMENT_MUTATION_KIND } from '@number-strategy-jump/arena-movement';
import { ARENA_GAMEPLAY_V2_TUNING } from '@number-strategy-jump/arena-definitions';

import {
  ARENA_FIXED_DT,
  ARENA_PHYSICS,
  assertPhysicsWorld,
  createCharacterPhysicsProfile,
  createLightweightPhysicsWorld,
  createLightweightPhysicsWorldFromCheckpointV1,
  createMovementPhysicsPort,
  validateLightweightPhysicsCheckpointV1,
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
  it('projects a validated CharacterDefinition into one immutable physics profile', () => {
    const profile = createCharacterPhysicsProfile({
      schemaVersion: 2,
      id: 'fighter',
      collision: { radius: 0.45, halfHeight: 0.55, mass: 1 },
      movement: {
        walkSpeed: 3,
        runSpeed: 6,
        runInputThreshold: 0.75,
        groundAcceleration: 42,
        airAcceleration: 14,
        maximumHorizontalSpeed: 8,
        automaticStepHeight: 0.25,
      },
      jump: {
        groundImpulse: 8,
        crouchImpulse: 10,
        airImpulse: 7,
        downSmashSpeed: 8,
        downSmashAccelerationPerTick: 1,
        maximumDownSmashSpeed: 16,
        coyoteTicks: 4,
        bufferTicks: 5,
        maximumAirJumps: 1,
        maximumCrouchChargeTicks: 30,
      },
      tags: ['test'],
    });
    expect(profile).toEqual({
      radius: 0.45,
      halfHeight: 0.55,
      mass: 1,
      moveSpeed: 6,
      groundAcceleration: 42,
      airAcceleration: 14,
    });
    expect(Object.isFrozen(profile)).toBe(true);
  });

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

  it('validates world methods by bounded descriptors without invoking accessors', () => {
    let getterCalls = 0;
    const accessorWorld = Object.defineProperty({}, 'addCharacter', {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error('world getter must not execute');
      },
    });
    expect(() => assertPhysicsWorld(accessorWorld)).toThrow('数据方法');
    expect(getterCalls).toBe(0);

    const cyclicTarget = Object.create(null) as object;
    let cyclicWorld: object;
    cyclicWorld = new Proxy(cyclicTarget, {
      getPrototypeOf() {
        return cyclicWorld;
      },
    });
    expect(() => assertPhysicsWorld(cyclicWorld)).toThrow('prototype 链不能循环');

    let tooDeepWorld = Object.create(null) as object;
    for (let depth = 0; depth < 33; depth += 1) {
      tooDeepWorld = Object.create(tooDeepWorld) as object;
    }
    expect(() => assertPhysicsWorld(tooDeepWorld)).toThrow('prototype 链超过 32 层');
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

  it('restores bodies, velocity, facing, intent and arena surface state', () => {
    const continuous = createLightweightPhysicsWorld({ arena: TEST_ARENA });
    addTestCharacter(continuous, 'player-1', -1);
    addTestCharacter(continuous, 'player-2', 1);
    continuous.setMovementIntent('player-1', 1, 0);
    continuous.setMovementIntent('player-2', -1, 0);
    continuous.applyImpulse('player-1', { x: 2, y: 3, z: 0 });
    continuous.step(ARENA_FIXED_DT);
    const checkpoint = continuous.exportCheckpointV1();
    const restored = createLightweightPhysicsWorldFromCheckpointV1(checkpoint);

    expect(restored.exportCheckpointV1()).toEqual(checkpoint);
    for (const world of [continuous, restored]) {
      world.setMovementIntent('player-1', 0, 1);
      world.setMovementIntent('player-2', 0, -1);
      world.step(ARENA_FIXED_DT);
    }
    expect(restored.getCharacterState('player-1')).toEqual(
      continuous.getCharacterState('player-1'),
    );
    expect(restored.getCharacterState('player-2')).toEqual(
      continuous.getCharacterState('player-2'),
    );
    continuous.destroy();
    restored.destroy();
  });

  it('fails closed on tampered, reordered and future physics checkpoints', () => {
    const world = createLightweightPhysicsWorld({ arena: TEST_ARENA });
    addTestCharacter(world, 'player-1', 0);
    const checkpoint = world.exportCheckpointV1();
    const tampered = JSON.parse(JSON.stringify(checkpoint)) as {
      characters: Array<{ state: { position: { x: number } } }>;
    };
    tampered.characters[0]!.state.position.x = 3;
    expect(() => validateLightweightPhysicsCheckpointV1(tampered)).toThrow(/hash漂移/u);
    const future = JSON.parse(JSON.stringify(checkpoint)) as Record<string, unknown>;
    future.future = true;
    expect(() => validateLightweightPhysicsCheckpointV1(future)).toThrow(/future/u);
    const reorderedSurface = JSON.parse(JSON.stringify(checkpoint)) as {
      arena: { surfaces: Array<{ id: string }> };
    };
    reorderedSurface.arena.surfaces.push({
      ...reorderedSurface.arena.surfaces[0]!,
      id: 'aaa-before-main',
    });
    expect(() => validateLightweightPhysicsCheckpointV1(reorderedSurface))
      .toThrow(/稳定升序/u);
    world.destroy();
  });
});
