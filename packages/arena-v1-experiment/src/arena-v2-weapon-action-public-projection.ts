import {
  ARENA_GAMEPLAY_V2_TUNING,
  type ActionDefinition,
  type ArenaWeaponPublicNumericProjection,
} from '@number-strategy-jump/arena-definitions';

function record(value: unknown, name: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function finiteAtLeast(value: unknown, minimum: number, name: string): number {
  if (!Number.isFinite(value) || (value as number) < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的有限数。`);
  }
  return value as number;
}

function targetParameter(action: ActionDefinition, field: string): number | undefined {
  const parameters = record(action.targeting.parameters, `${action.id}.targeting.parameters`);
  const value = parameters[field];
  if (value === undefined) return undefined;
  return finiteAtLeast(value, 0, `${action.id}.targeting.${field}`);
}

function effectParameter(
  action: ActionDefinition,
  effectKind: string,
  field: string,
  fallback: number | undefined = undefined,
): number {
  const effect = action.effects.find(({ kind }) => kind === effectKind);
  if (!effect) {
    if (fallback !== undefined) return fallback;
    throw new RangeError(`${action.id} 缺少 ${effectKind} effect。`);
  }
  const parameters = record(effect.parameters, `${action.id}.${effectKind}.parameters`);
  const value = parameters[field];
  if (value === undefined && fallback !== undefined) return fallback;
  return finiteAtLeast(value, 0, `${action.id}.${effectKind}.${field}`);
}

function coverageWidth(action: ActionDefinition, range: number): number {
  const radius = targetParameter(action, 'radius');
  if (radius !== undefined) return radius * 2;
  const minimumFacingDot = targetParameter(action, 'minimumFacingDot');
  if (minimumFacingDot !== undefined) {
    return range * 2 * Math.sqrt(Math.max(0, 1 - minimumFacingDot ** 2));
  }
  return range * 2;
}

function directionToleranceDegrees(action: ActionDefinition, range: number): number {
  const radius = targetParameter(action, 'radius');
  const minimumFacingDot = targetParameter(action, 'minimumFacingDot');
  if (minimumFacingDot !== undefined) {
    return (2 * Math.acos(Math.max(-1, Math.min(1, minimumFacingDot))) * 180) / Math.PI;
  }
  if (radius !== undefined) return (2 * Math.atan(radius / range) * 180) / Math.PI;
  return 180;
}

/**
 * Converts a research ActionDefinition into the same read-only numeric shape
 * consumed by the weapon overview. This is intentionally separate from the
 * production tuning projector because research actions are tick-based Rules
 * content, not production tuning entries.
 */
export function projectArenaV2ActionDefinitionPublicNumbers(
  action: ActionDefinition,
): ArenaWeaponPublicNumericProjection {
  const range = targetParameter(action, 'range');
  const maximumVerticalDifference = targetParameter(action, 'maximumVerticalDifference');
  if (range === undefined || maximumVerticalDifference === undefined) {
    throw new RangeError(`${action.id} 缺少 range 或 maximumVerticalDifference。`);
  }
  const impulseEffectKind = action.effects.some(({ kind }) => kind === 'apply-directional-impulse')
    ? 'apply-directional-impulse'
    : 'pull-to-source';
  const horizontalImpulse = effectParameter(action, impulseEffectKind, 'horizontalImpulse');
  const verticalImpulse = effectParameter(action, impulseEffectKind, 'verticalImpulse');
  const hitstunTicks = effectParameter(action, 'apply-hitstun', 'ticks');
  const selfMovementImpulse = effectParameter(
    action,
    'apply-self-impulse',
    'horizontalImpulse',
    0,
  );
  const impactDistance = (horizontalImpulse ** 2)
    / (2 * ARENA_GAMEPLAY_V2_TUNING.physics.standardGroundDeceleration);
  return Object.freeze({
    range,
    coverage: coverageWidth(action, range),
    windupTicks: action.timing.windupTicks,
    activeTicks: action.timing.activeTicks,
    recoveryTicks: action.timing.recoveryTicks,
    cooldownTicks: action.timing.cooldownTicks,
    impactDistance,
    verticalImpulse,
    hitstunTicks,
    selfMovementImpulse,
    heightGap: maximumVerticalDifference,
    directionToleranceDegrees: directionToleranceDegrees(action, range),
  });
}
