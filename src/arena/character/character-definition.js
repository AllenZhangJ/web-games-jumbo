import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPositiveFinite,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '../rules/definition-utils.js';

export const CHARACTER_DEFINITION_SCHEMA_VERSION = 2;

const DEFINITION_KEYS = new Set([
  'schemaVersion',
  'id',
  'collision',
  'movement',
  'jump',
  'tags',
]);
const COLLISION_KEYS = new Set(['radius', 'halfHeight', 'mass']);
const MOVEMENT_KEYS = new Set([
  'walkSpeed',
  'runSpeed',
  'runInputThreshold',
  'groundAcceleration',
  'airAcceleration',
  'maximumHorizontalSpeed',
  'automaticStepHeight',
]);
const JUMP_KEYS = new Set([
  'groundImpulse',
  'crouchImpulse',
  'airImpulse',
  'downSmashSpeed',
  'downSmashAccelerationPerTick',
  'maximumDownSmashSpeed',
  'coyoteTicks',
  'bufferTicks',
  'maximumAirJumps',
  'maximumCrouchChargeTicks',
]);

function nonNegativeFinite(value, name) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} 必须是非负有限数。`);
  }
  return value;
}

function cloneCollision(value) {
  assertKnownKeys(value, COLLISION_KEYS, 'CharacterDefinition.collision');
  const collision = Object.freeze({
    radius: assertPositiveFinite(value.radius, 'CharacterDefinition.collision.radius'),
    halfHeight: assertPositiveFinite(
      value.halfHeight,
      'CharacterDefinition.collision.halfHeight',
    ),
    mass: assertPositiveFinite(value.mass, 'CharacterDefinition.collision.mass'),
  });
  if (!Number.isFinite(collision.radius + collision.halfHeight)) {
    throw new RangeError('CharacterDefinition collision 组合高度必须是有限数。');
  }
  return collision;
}

function cloneMovement(value) {
  assertKnownKeys(value, MOVEMENT_KEYS, 'CharacterDefinition.movement');
  const movement = {
    walkSpeed: assertPositiveFinite(value.walkSpeed, 'CharacterDefinition.movement.walkSpeed'),
    runSpeed: assertPositiveFinite(value.runSpeed, 'CharacterDefinition.movement.runSpeed'),
    runInputThreshold: assertPositiveFinite(
      value.runInputThreshold,
      'CharacterDefinition.movement.runInputThreshold',
    ),
    groundAcceleration: assertPositiveFinite(
      value.groundAcceleration,
      'CharacterDefinition.movement.groundAcceleration',
    ),
    airAcceleration: assertPositiveFinite(
      value.airAcceleration,
      'CharacterDefinition.movement.airAcceleration',
    ),
    maximumHorizontalSpeed: assertPositiveFinite(
      value.maximumHorizontalSpeed,
      'CharacterDefinition.movement.maximumHorizontalSpeed',
    ),
    automaticStepHeight: nonNegativeFinite(
      value.automaticStepHeight,
      'CharacterDefinition.movement.automaticStepHeight',
    ),
  };
  if (movement.runInputThreshold > 1) {
    throw new RangeError('CharacterDefinition.movement.runInputThreshold 必须位于 (0, 1]。');
  }
  if (movement.runSpeed < movement.walkSpeed) {
    throw new RangeError('CharacterDefinition.movement.runSpeed 不能小于 walkSpeed。');
  }
  if (movement.maximumHorizontalSpeed < movement.runSpeed) {
    throw new RangeError(
      'CharacterDefinition.movement.maximumHorizontalSpeed 不能小于 runSpeed。',
    );
  }
  return Object.freeze(movement);
}

function cloneJump(value) {
  assertKnownKeys(value, JUMP_KEYS, 'CharacterDefinition.jump');
  const jump = {
    groundImpulse: assertPositiveFinite(
      value.groundImpulse,
      'CharacterDefinition.jump.groundImpulse',
    ),
    crouchImpulse: assertPositiveFinite(
      value.crouchImpulse,
      'CharacterDefinition.jump.crouchImpulse',
    ),
    airImpulse: assertPositiveFinite(value.airImpulse, 'CharacterDefinition.jump.airImpulse'),
    downSmashSpeed: assertPositiveFinite(
      value.downSmashSpeed,
      'CharacterDefinition.jump.downSmashSpeed',
    ),
    downSmashAccelerationPerTick: assertPositiveFinite(
      value.downSmashAccelerationPerTick,
      'CharacterDefinition.jump.downSmashAccelerationPerTick',
    ),
    maximumDownSmashSpeed: assertPositiveFinite(
      value.maximumDownSmashSpeed,
      'CharacterDefinition.jump.maximumDownSmashSpeed',
    ),
    coyoteTicks: assertIntegerAtLeast(
      value.coyoteTicks,
      0,
      'CharacterDefinition.jump.coyoteTicks',
    ),
    bufferTicks: assertIntegerAtLeast(
      value.bufferTicks,
      0,
      'CharacterDefinition.jump.bufferTicks',
    ),
    maximumAirJumps: assertIntegerAtLeast(
      value.maximumAirJumps,
      0,
      'CharacterDefinition.jump.maximumAirJumps',
    ),
    maximumCrouchChargeTicks: assertIntegerAtLeast(
      value.maximumCrouchChargeTicks,
      0,
      'CharacterDefinition.jump.maximumCrouchChargeTicks',
    ),
  };
  if (jump.crouchImpulse < jump.groundImpulse) {
    throw new RangeError('CharacterDefinition.jump.crouchImpulse 不能小于 groundImpulse。');
  }
  if (jump.maximumDownSmashSpeed < jump.downSmashSpeed) {
    throw new RangeError(
      'CharacterDefinition.jump.maximumDownSmashSpeed 不能小于 downSmashSpeed。',
    );
  }
  return Object.freeze(jump);
}

export function createCharacterDefinition(value) {
  const source = cloneFrozenData(value, 'CharacterDefinition');
  assertKnownKeys(source, DEFINITION_KEYS, 'CharacterDefinition');
  if (source.schemaVersion !== CHARACTER_DEFINITION_SCHEMA_VERSION) {
    throw new RangeError(`不支持 CharacterDefinition schema ${source.schemaVersion}。`);
  }
  return Object.freeze({
    schemaVersion: CHARACTER_DEFINITION_SCHEMA_VERSION,
    id: assertNonEmptyString(source.id, 'CharacterDefinition.id'),
    collision: cloneCollision(source.collision),
    movement: cloneMovement(source.movement),
    jump: cloneJump(source.jump),
    tags: cloneFrozenStringSet(source.tags, 'CharacterDefinition.tags'),
  });
}
