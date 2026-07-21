import { ARENA_GAMEPLAY_V2_TUNING } from '@number-strategy-jump/arena-definitions';

export interface ArenaPhysicsConfig {
  readonly gravity: number;
  readonly characterRadius: number;
  readonly characterHalfHeight: number;
  readonly characterMass: number;
  readonly moveSpeed: number;
  readonly groundAcceleration: number;
  readonly airAcceleration: number;
  readonly maxHorizontalSpeed: number;
  readonly maxVerticalSpeed: number;
  readonly groundProbeTolerance: number;
  readonly maxStepHeight: number;
  readonly groundSnapDistance: number;
  readonly substeps: number;
}

export const ARENA_TICK_RATE = ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz;
export const ARENA_FIXED_DT = 1 / ARENA_TICK_RATE;

export const ARENA_PHYSICS: Readonly<ArenaPhysicsConfig> = Object.freeze({
  gravity: -ARENA_GAMEPLAY_V2_TUNING.physics.gravityMagnitude,
  characterRadius: ARENA_GAMEPLAY_V2_TUNING.character.collision.radius,
  characterHalfHeight: ARENA_GAMEPLAY_V2_TUNING.character.collision.halfHeight,
  characterMass: ARENA_GAMEPLAY_V2_TUNING.character.collision.mass,
  moveSpeed: ARENA_GAMEPLAY_V2_TUNING.character.movement.runSpeed,
  groundAcceleration: ARENA_GAMEPLAY_V2_TUNING.character.movement.groundAcceleration,
  airAcceleration: ARENA_GAMEPLAY_V2_TUNING.character.movement.airAcceleration,
  maxHorizontalSpeed: ARENA_GAMEPLAY_V2_TUNING.character.movement.maximumHorizontalSpeed,
  maxVerticalSpeed: ARENA_GAMEPLAY_V2_TUNING.character.jump.maximumDownAttackSpeed,
  groundProbeTolerance: ARENA_GAMEPLAY_V2_TUNING.physics.groundProbeTolerance,
  maxStepHeight: ARENA_GAMEPLAY_V2_TUNING.character.movement.automaticStepHeight,
  groundSnapDistance: ARENA_GAMEPLAY_V2_TUNING.physics.groundSnapDistance,
  substeps: ARENA_GAMEPLAY_V2_TUNING.physics.substeps,
});
