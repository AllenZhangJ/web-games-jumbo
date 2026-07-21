import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MOVEMENT_GAIT,
  projectCharacterMovementIntent,
} from '@number-strategy-jump/arena-movement';
import { createArenaV1CharacterRegistry } from '../../src/arena/content/arena-v1-characters.js';
import { ARENA_V1_CHARACTER_ID } from '@number-strategy-jump/arena-definitions';

const definition = createArenaV1CharacterRegistry().require(
  ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE,
);

function project(moveX, moveZ) {
  return projectCharacterMovementIntent({ moveX, moveZ, characterDefinition: definition });
}

test('walk/run projection is continuous, definition-driven and normalized for physics', () => {
  assert.deepEqual(project(0, 0), { x: 0, z: 0, gait: MOVEMENT_GAIT.IDLE, targetSpeed: 0 });

  const below = project(definition.movement.runInputThreshold / 2, 0);
  assert.equal(below.gait, MOVEMENT_GAIT.WALK);
  assert.equal(below.targetSpeed, definition.movement.walkSpeed / 2);

  const threshold = project(definition.movement.runInputThreshold, 0);
  assert.equal(threshold.gait, MOVEMENT_GAIT.RUN);
  assert.equal(threshold.targetSpeed, definition.movement.walkSpeed);

  const full = project(1, 0);
  assert.equal(full.targetSpeed, definition.movement.runSpeed);
  assert.equal(full.x, 1);
  assert.equal(full.z, 0);

  const diagonal = project(1, 1);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1) < 1e-12);
  assert.equal(diagonal.targetSpeed, definition.movement.runSpeed);
  assert.throws(() => project(Number.NaN, 0), /有限数/);
});
