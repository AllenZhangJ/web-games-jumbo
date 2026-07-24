import {
  createCharacterDefinition,
  type CharacterDefinition,
} from '@number-strategy-jump/arena-definitions';

export interface CharacterPhysicsProfile {
  readonly radius: number;
  readonly halfHeight: number;
  readonly mass: number;
  readonly moveSpeed: number;
  readonly groundAcceleration: number;
  readonly airAcceleration: number;
}

export function createCharacterPhysicsProfile(definition: unknown): CharacterPhysicsProfile {
  const normalized: CharacterDefinition = createCharacterDefinition(definition);
  return Object.freeze({
    radius: normalized.collision.radius,
    halfHeight: normalized.collision.halfHeight,
    mass: normalized.collision.mass,
    moveSpeed: normalized.movement.runSpeed,
    groundAcceleration: normalized.movement.groundAcceleration,
    airAcceleration: normalized.movement.airAcceleration,
  });
}
