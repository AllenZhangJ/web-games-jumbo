import {
  clamp,
  groundDirection,
  groundPointAt,
  isPointInPlatformFootprint,
  lerp,
  rayPlatformInterval,
  type GroundPoint,
  type PlatformFootprint,
} from './geometry.js';

export interface Position3 extends GroundPoint {
  readonly y: number;
}

export interface JumpPhysicsConfig {
  readonly minChargeMs: number;
  readonly maxChargeMs: number;
  readonly minRange: number;
  readonly maxRange: number;
  readonly rangeExponent: number;
  readonly durationMinMs: number;
  readonly durationMaxMs: number;
  readonly heightMin: number;
  readonly heightMax: number;
}

export interface TargetPlatform extends PlatformFootprint {
  readonly topY: number;
}

export interface JumpTrajectory {
  readonly origin: Position3;
  readonly targetCenter: GroundPoint;
  readonly direction: GroundPoint;
  readonly chargeMs: number;
  readonly power: number;
  readonly range: number;
  readonly durationMs: number;
  readonly jumpHeight: number;
  readonly impact: Position3;
}

export interface ChargeWindow {
  readonly minChargeMs: number;
  readonly idealChargeMs: number;
  readonly maxChargeMs: number;
  readonly entryRange: number;
  readonly idealRange: number;
  readonly exitRange: number;
}

export type LandingReason = 'landed' | 'outside' | 'short' | 'overshoot' | 'wrong-height';

export interface LandingResult {
  readonly landed: boolean;
  readonly reason: LandingReason;
  readonly position: Position3;
  readonly offset: GroundPoint;
}

export const DEFAULT_JUMP_PHYSICS: Readonly<JumpPhysicsConfig> = Object.freeze({
  minChargeMs: 80,
  maxChargeMs: 1200,
  minRange: 0.8,
  maxRange: 7.6,
  rangeExponent: 1.18,
  durationMinMs: 520,
  durationMaxMs: 820,
  heightMin: 1.1,
  heightMax: 2.2,
});

const CONFIG_KEYS = [
  'minChargeMs',
  'maxChargeMs',
  'minRange',
  'maxRange',
  'rangeExponent',
  'durationMinMs',
  'durationMaxMs',
  'heightMin',
  'heightMax',
] as const;

function assertFinite(value: unknown, name: string): asserts value is number {
  if (!Number.isFinite(value)) throw new TypeError(`${name} 必须是有限数。`);
}

function assertPosition(
  position: unknown,
  name: string,
  includeY = true,
): asserts position is Position3 {
  if (!position || typeof position !== 'object') throw new TypeError(`${name} 必须是坐标对象。`);
  const candidate = position as Partial<Position3>;
  assertFinite(candidate.x, `${name}.x`);
  assertFinite(candidate.z, `${name}.z`);
  if (includeY) assertFinite(candidate.y, `${name}.y`);
}

function assertTarget(target: unknown): asserts target is TargetPlatform {
  if (!target || typeof target !== 'object') throw new TypeError('target 必须是平台对象。');
  const candidate = target as Partial<TargetPlatform>;
  assertPosition(candidate.center, 'target.center', false);
  assertFinite(candidate.halfWidth, 'target.halfWidth');
  assertFinite(candidate.halfDepth, 'target.halfDepth');
  assertFinite(candidate.topY, 'target.topY');
}

function assertTrajectory(value: unknown): asserts value is JumpTrajectory {
  if (!value || typeof value !== 'object') throw new TypeError('trajectory 必须是轨迹对象。');
  const trajectory = value as Partial<JumpTrajectory>;
  assertPosition(trajectory.origin, 'trajectory.origin');
  assertPosition(trajectory.impact, 'trajectory.impact');
  assertPosition(trajectory.direction, 'trajectory.direction', false);
  assertFinite(trajectory.durationMs, 'trajectory.durationMs');
  assertFinite(trajectory.jumpHeight, 'trajectory.jumpHeight');
  assertFinite(trajectory.range, 'trajectory.range');
}

export function resolveJumpPhysicsConfig(overrides: unknown = {}): Readonly<JumpPhysicsConfig> {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    throw new TypeError('跳跃配置必须是对象。');
  }
  const config = {
    ...DEFAULT_JUMP_PHYSICS,
    ...(overrides as Partial<JumpPhysicsConfig>),
  };
  for (const key of CONFIG_KEYS) assertFinite(config[key], key);
  if (config.minChargeMs < 0) throw new RangeError('minChargeMs 不能为负数。');
  if (config.maxChargeMs <= config.minChargeMs) {
    throw new RangeError('maxChargeMs must be greater than minChargeMs.');
  }
  if (config.maxRange <= config.minRange) throw new RangeError('maxRange must be greater than minRange.');
  if (config.rangeExponent <= 0) throw new RangeError('rangeExponent must be positive.');
  if (config.minRange < 0) throw new RangeError('minRange 不能为负数。');
  if (config.durationMinMs <= 0 || config.durationMaxMs < config.durationMinMs) {
    throw new RangeError('跳跃时长必须为正数且 durationMaxMs >= durationMinMs。');
  }
  if (config.heightMin < 0 || config.heightMax < config.heightMin) {
    throw new RangeError('跳跃高度不能为负数且 heightMax >= heightMin。');
  }
  return Object.freeze(config);
}

export function chargeToPower(chargeMs: unknown, overrides?: unknown): number {
  const config = resolveJumpPhysicsConfig(overrides);
  assertFinite(chargeMs, 'chargeMs');
  return clamp(
    (chargeMs - config.minChargeMs) / (config.maxChargeMs - config.minChargeMs),
    0,
    1,
  );
}

export function chargeToRange(chargeMs: unknown, overrides?: unknown): number {
  const config = resolveJumpPhysicsConfig(overrides);
  const power = chargeToPower(chargeMs, config);
  return lerp(config.minRange, config.maxRange, power ** config.rangeExponent);
}

export function rangeToCharge(distance: unknown, overrides?: unknown): number {
  const config = resolveJumpPhysicsConfig(overrides);
  assertFinite(distance, 'distance');
  const normalizedRange = clamp(
    (distance - config.minRange) / (config.maxRange - config.minRange),
    0,
    1,
  );
  return lerp(
    config.minChargeMs,
    config.maxChargeMs,
    normalizedRange ** (1 / config.rangeExponent),
  );
}

export function getTargetChargeWindow({
  origin,
  target,
  inset = 0,
  config,
}: {
  readonly origin: unknown;
  readonly target: unknown;
  readonly inset?: unknown;
  readonly config?: unknown;
}): ChargeWindow | null {
  const resolved = resolveJumpPhysicsConfig(config);
  assertPosition(origin, 'origin');
  assertTarget(target);
  const direction = groundDirection(origin, target.center);
  const interval = rayPlatformInterval({ origin, direction, platform: target, inset });
  if (!interval) return null;
  const entryRange = Math.max(interval.entry, resolved.minRange);
  const exitRange = Math.min(interval.exit, resolved.maxRange);
  if (entryRange > exitRange) return null;
  const idealRange = clamp(direction.length, entryRange, exitRange);
  return {
    minChargeMs: rangeToCharge(entryRange, resolved),
    idealChargeMs: rangeToCharge(idealRange, resolved),
    maxChargeMs: rangeToCharge(exitRange, resolved),
    entryRange,
    idealRange,
    exitRange,
  };
}

export function createJumpTrajectory({
  origin,
  targetCenter,
  targetTopY,
  chargeMs,
  config,
}: {
  readonly origin: unknown;
  readonly targetCenter: unknown;
  readonly targetTopY?: unknown;
  readonly chargeMs: unknown;
  readonly config?: unknown;
}): Readonly<JumpTrajectory> {
  const resolved = resolveJumpPhysicsConfig(config);
  assertPosition(origin, 'origin');
  assertPosition(targetCenter, 'targetCenter', false);
  const resolvedTopY = targetTopY ?? origin.y;
  assertFinite(resolvedTopY, 'targetTopY');
  assertFinite(chargeMs, 'chargeMs');
  const direction = groundDirection(origin, targetCenter);
  const power = chargeToPower(chargeMs, resolved);
  const range = chargeToRange(chargeMs, resolved);
  const groundImpact = groundPointAt(origin, direction, range);
  return Object.freeze({
    origin: Object.freeze({ x: origin.x, y: origin.y, z: origin.z }),
    targetCenter: Object.freeze({ x: targetCenter.x, z: targetCenter.z }),
    direction: Object.freeze({ x: direction.x, z: direction.z }),
    chargeMs,
    power,
    range,
    durationMs: lerp(resolved.durationMinMs, resolved.durationMaxMs, power),
    jumpHeight: lerp(resolved.heightMin, resolved.heightMax, power),
    impact: Object.freeze({ x: groundImpact.x, y: resolvedTopY, z: groundImpact.z }),
  });
}

export function sampleJumpTrajectory(trajectory: unknown, elapsedMs: unknown): {
  readonly progress: number;
  readonly completed: boolean;
  readonly descending: boolean;
  readonly position: Position3;
} {
  assertTrajectory(trajectory);
  assertFinite(elapsedMs, 'elapsedMs');
  if (trajectory.durationMs <= 0) throw new RangeError('trajectory.durationMs 必须为正数。');
  const progress = clamp(elapsedMs / trajectory.durationMs, 0, 1);
  const baselineY = lerp(trajectory.origin.y, trajectory.impact.y, progress);
  const arcY = trajectory.jumpHeight * 4 * progress * (1 - progress);
  return {
    progress,
    completed: progress >= 1,
    descending: progress > 0.5,
    position: {
      x: lerp(trajectory.origin.x, trajectory.impact.x, progress),
      y: baselineY + arcY,
      z: lerp(trajectory.origin.z, trajectory.impact.z, progress),
    },
  };
}

export function resolveTopLanding({
  trajectory,
  target,
  inset = 0,
}: {
  readonly trajectory: unknown;
  readonly target: unknown;
  readonly inset?: unknown;
}): LandingResult {
  assertTrajectory(trajectory);
  assertTarget(target);
  const impact = trajectory.impact;
  const onTopPlane = Math.abs(impact.y - target.topY) <= 1e-7;
  const landed = onTopPlane && isPointInPlatformFootprint(impact, target, inset);
  if (landed) {
    return {
      landed: true,
      reason: 'landed',
      position: { x: impact.x, y: target.topY, z: impact.z },
      offset: { x: impact.x - target.center.x, z: impact.z - target.center.z },
    };
  }
  const interval = rayPlatformInterval({
    origin: trajectory.origin,
    direction: trajectory.direction,
    platform: target,
    inset,
  });
  let reason: LandingReason = 'outside';
  if (interval && trajectory.range < interval.entry) reason = 'short';
  if (interval && trajectory.range > interval.exit) reason = 'overshoot';
  if (!onTopPlane) reason = 'wrong-height';
  return {
    landed: false,
    reason,
    position: { ...impact },
    offset: { x: impact.x - target.center.x, z: impact.z - target.center.z },
  };
}
