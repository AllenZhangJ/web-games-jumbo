import type { ARENA_GAMEPLAY_V2_TUNING } from './arena-gameplay-v2-tuning.js';

export type ArenaGameplayV2AttackTuning = typeof ARENA_GAMEPLAY_V2_TUNING.attacks[
  keyof typeof ARENA_GAMEPLAY_V2_TUNING.attacks
];

export interface ArenaWeaponPublicNumericProjection {
  readonly range: number;
  readonly coverage: number;
  readonly windupTicks: number;
  readonly activeTicks: number;
  readonly recoveryTicks: number;
  readonly cooldownTicks: number;
  readonly impactDistance: number;
  readonly verticalImpulse: number;
  readonly hitstunTicks: number;
  readonly selfMovementImpulse: number;
  readonly heightGap: number;
  readonly directionToleranceDegrees: number;
}

function targetingCoverageWidth(tuning: ArenaGameplayV2AttackTuning): number {
  const { range, radius, minimumFacingDot } = tuning.targeting;
  if (radius !== undefined) return radius * 2;
  if (minimumFacingDot !== undefined) {
    return range * 2 * Math.sqrt(Math.max(0, 1 - minimumFacingDot ** 2));
  }
  return range * 2;
}

function targetingDirectionToleranceDegrees(tuning: ArenaGameplayV2AttackTuning): number {
  const { range, radius, minimumFacingDot } = tuning.targeting;
  if (minimumFacingDot !== undefined) {
    return (2 * Math.acos(Math.max(-1, Math.min(1, minimumFacingDot))) * 180) / Math.PI;
  }
  if (radius !== undefined) {
    return (2 * Math.atan(radius / range) * 180) / Math.PI;
  }
  return 180;
}

/**
 * Projects authoritative attack tuning into the numeric values shared by the
 * weapon overview and headless research. Keeping the derived geometry here
 * prevents the UI from inventing a second meaning for coverage or direction.
 */
export function projectArenaWeaponPublicNumbers(
  tuning: ArenaGameplayV2AttackTuning,
): ArenaWeaponPublicNumericProjection {
  return Object.freeze({
    range: tuning.targeting.range,
    coverage: targetingCoverageWidth(tuning),
    windupTicks: tuning.timing.windupTicks,
    activeTicks: tuning.timing.activeTicks,
    recoveryTicks: tuning.timing.recoveryTicks,
    cooldownTicks: tuning.timing.cooldownTicks,
    impactDistance: tuning.knockback.targetGroundDistance,
    verticalImpulse: tuning.knockback.verticalImpulse,
    hitstunTicks: tuning.hitstunTicks,
    selfMovementImpulse: tuning.selfMovement?.horizontalImpulse ?? 0,
    heightGap: tuning.targeting.maximumVerticalDifference,
    directionToleranceDegrees: targetingDirectionToleranceDegrees(tuning),
  });
}
