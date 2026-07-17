import { createCharacterDefinition } from './character-definition.js';

export function createCharacterPhysicsProfile(definition) {
  const normalized = createCharacterDefinition(definition);
  return Object.freeze({
    radius: normalized.collision.radius,
    halfHeight: normalized.collision.halfHeight,
    mass: normalized.collision.mass,
    moveSpeed: normalized.movement.runSpeed,
    groundAcceleration: normalized.movement.groundAcceleration,
    airAcceleration: normalized.movement.airAcceleration,
  });
}
