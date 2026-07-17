import test from 'node:test';
import assert from 'node:assert/strict';
import { PHYSICS_POC_ARENA, PHYSICS_POC_CHARACTER } from '../../src/arena/config.js';
import {
  assertPhysicsWorld,
  normalizeMovementIntent,
} from '../../src/arena/physics/physics-adapter.js';
import { createLightweightPhysicsWorld } from '../../src/arena/physics/lightweight-physics.js';

test('movement intent clamps and normalizes without exceeding unit length', () => {
  assert.deepEqual(normalizeMovementIntent(0.5, -0.25), { x: 0.5, z: -0.25 });
  const diagonal = normalizeMovementIntent(1, 1);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1) < 1e-12);
  assert.throws(() => normalizeMovementIntent(Number.NaN, 0), /有限数/);
});

test('lightweight world implements the complete adapter and rejects invalid lifecycle use', () => {
  const world = assertPhysicsWorld(createLightweightPhysicsWorld({ arena: PHYSICS_POC_ARENA }));
  assert.equal(world.characters, undefined);
  assert.equal(world.config, undefined);
  assert.equal(world.integrateCharacter, undefined);
  assert.equal(world.resolveCharacterPairs, undefined);
  world.addCharacter({
    id: 'player-1',
    position: PHYSICS_POC_ARENA.spawns[0],
    ...PHYSICS_POC_CHARACTER,
  });
  assert.equal(world.getCharacterState('player-1').grounded, true);
  assert.equal(world.setSurfaceEnabled('main-platform', false), true);
  assert.equal(world.getCharacterState('player-1').grounded, false);
  assert.equal(world.setSurfaceEnabled('main-platform', false), false);
  assert.equal(world.setSurfaceEnabled('main-platform', true), true);
  world.resetCharacter('player-1', { position: PHYSICS_POC_ARENA.spawns[0] });
  assert.equal(world.getCharacterState('player-1').grounded, true);
  world.applyImpulse('player-1', { x: 1, y: 0, z: 0 });
  assert.equal(world.getCharacterState('player-1').grounded, true);
  assert.throws(() => world.step(1 / 30), /只接受固定步长/);
  world.resetCharacter('player-1', {
    position: PHYSICS_POC_ARENA.spawns[0],
    velocity: { x: Number.MAX_VALUE, y: Number.MAX_VALUE, z: Number.MAX_VALUE },
  });
  const limited = world.getCharacterState('player-1').velocity;
  assert.ok(Math.hypot(limited.x, limited.z) <= 18 + 1e-12);
  assert.equal(limited.y, 22);
  world.addCharacter({
    id: 'tiny-mass',
    position: PHYSICS_POC_ARENA.spawns[1],
    ...PHYSICS_POC_CHARACTER,
    mass: Number.MIN_VALUE,
  });
  assert.throws(
    () => world.applyImpulse('tiny-mass', { x: 1, y: 1, z: 0 }),
    /必须产生有限速度/,
  );
  assert.throws(() => world.addCharacter({
    id: 'player-1',
    position: PHYSICS_POC_ARENA.spawns[0],
    ...PHYSICS_POC_CHARACTER,
  }), /已存在/);
  world.destroy();
  assert.throws(() => world.step(1 / 60), /已销毁/);
});

test('pair separation refreshes ground support at a platform edge in the same tick', () => {
  const arena = {
    killY: -5,
    surfaces: [{
      id: 'narrow',
      center: { x: 0, y: -0.5, z: 0 },
      halfExtents: { x: 0.4, y: 0.5, z: 1 },
    }],
    spawns: [{ x: -0.3, y: 1, z: 0 }, { x: 0.3, y: 1, z: 0 }],
  };
  const world = createLightweightPhysicsWorld({ arena });
  for (let index = 0; index < 2; index += 1) {
    world.addCharacter({
      id: `player-${index + 1}`,
      position: arena.spawns[index],
      ...PHYSICS_POC_CHARACTER,
    });
  }
  world.step(1 / 60);
  assert.equal(world.getCharacterState('player-1').grounded, false);
  assert.equal(world.getCharacterState('player-2').grounded, false);
  world.destroy();
});
