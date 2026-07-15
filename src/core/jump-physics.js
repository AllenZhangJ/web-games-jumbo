import {
  clamp,
  groundDirection,
  groundPointAt,
  isPointInPlatformFootprint,
  lerp,
  rayPlatformInterval,
} from './geometry.js';

export const DEFAULT_JUMP_PHYSICS = Object.freeze({
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

function resolveConfig(overrides = {}) {
  const config = { ...DEFAULT_JUMP_PHYSICS, ...overrides };
  const finiteKeys = [
    'minChargeMs',
    'maxChargeMs',
    'minRange',
    'maxRange',
    'rangeExponent',
    'durationMinMs',
    'durationMaxMs',
    'heightMin',
    'heightMax',
  ];
  for (const key of finiteKeys) {
    if (!Number.isFinite(config[key])) throw new TypeError(`${key} 必须是有限数。`);
  }
  if (config.minChargeMs < 0) throw new RangeError('minChargeMs 不能为负数。');
  if (config.maxChargeMs <= config.minChargeMs) {
    throw new RangeError('maxChargeMs must be greater than minChargeMs.');
  }
  if (config.maxRange <= config.minRange) {
    throw new RangeError('maxRange must be greater than minRange.');
  }
  if (config.rangeExponent <= 0) {
    throw new RangeError('rangeExponent must be positive.');
  }
  if (config.minRange < 0) throw new RangeError('minRange 不能为负数。');
  if (config.durationMinMs <= 0 || config.durationMaxMs < config.durationMinMs) {
    throw new RangeError('跳跃时长必须为正数且 durationMaxMs >= durationMinMs。');
  }
  if (config.heightMin < 0 || config.heightMax < config.heightMin) {
    throw new RangeError('跳跃高度不能为负数且 heightMax >= heightMin。');
  }
  return config;
}

function assertFinite(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} 必须是有限数。`);
}

function assertPosition(position, name, includeY = true) {
  if (!position || typeof position !== 'object') throw new TypeError(`${name} 必须是坐标对象。`);
  assertFinite(position.x, `${name}.x`);
  assertFinite(position.z, `${name}.z`);
  if (includeY) assertFinite(position.y, `${name}.y`);
}

export function chargeToPower(chargeMs, overrides) {
  const config = resolveConfig(overrides);
  assertFinite(chargeMs, 'chargeMs');
  return clamp(
    (chargeMs - config.minChargeMs) / (config.maxChargeMs - config.minChargeMs),
    0,
    1,
  );
}

export function chargeToRange(chargeMs, overrides) {
  const config = resolveConfig(overrides);
  const power = chargeToPower(chargeMs, config);
  return lerp(
    config.minRange,
    config.maxRange,
    power ** config.rangeExponent,
  );
}

export function rangeToCharge(distance, overrides) {
  const config = resolveConfig(overrides);
  assertFinite(distance, 'distance');
  const normalizedRange = clamp(
    (distance - config.minRange) / (config.maxRange - config.minRange),
    0,
    1,
  );
  const power = normalizedRange ** (1 / config.rangeExponent);
  return lerp(config.minChargeMs, config.maxChargeMs, power);
}

/**
 * Calculates the charge interval that lands inside the target footprint.
 * The optional inset reserves a safety margin from every platform edge.
 */
export function getTargetChargeWindow({ origin, target, inset = 0, config: overrides }) {
  const config = resolveConfig(overrides);
  assertPosition(origin, 'origin');
  if (!target?.center) throw new TypeError('target.center 必须是坐标对象。');
  const direction = groundDirection(origin, target.center);
  const interval = rayPlatformInterval({ origin, direction, platform: target, inset });
  if (!interval) return null;

  const entryRange = Math.max(interval.entry, config.minRange);
  const exitRange = Math.min(interval.exit, config.maxRange);
  if (entryRange > exitRange) return null;

  const idealRange = clamp(direction.length, entryRange, exitRange);
  return {
    minChargeMs: rangeToCharge(entryRange, config),
    idealChargeMs: rangeToCharge(idealRange, config),
    maxChargeMs: rangeToCharge(exitRange, config),
    entryRange,
    idealRange,
    exitRange,
  };
}

/**
 * Creates an immutable description of one complete analytic jump. Horizontal
 * motion is linear; vertical motion is a normalized parabola over the moving
 * platform-top baseline. The x/z impact remains the real ballistic endpoint.
 */
export function createJumpTrajectory({
  origin,
  targetCenter,
  targetTopY = origin.y,
  chargeMs,
  config: overrides,
}) {
  const config = resolveConfig(overrides);
  assertPosition(origin, 'origin');
  assertPosition(targetCenter, 'targetCenter', false);
  assertFinite(targetTopY, 'targetTopY');
  assertFinite(chargeMs, 'chargeMs');
  const direction = groundDirection(origin, targetCenter);
  const power = chargeToPower(chargeMs, config);
  const range = chargeToRange(chargeMs, config);
  const groundImpact = groundPointAt(origin, direction, range);
  const durationMs = lerp(config.durationMinMs, config.durationMaxMs, power);
  const jumpHeight = lerp(config.heightMin, config.heightMax, power);

  return Object.freeze({
    origin: Object.freeze({ x: origin.x, y: origin.y, z: origin.z }),
    targetCenter: Object.freeze({ x: targetCenter.x, z: targetCenter.z }),
    direction: Object.freeze({ x: direction.x, z: direction.z }),
    chargeMs,
    power,
    range,
    durationMs,
    jumpHeight,
    impact: Object.freeze({ x: groundImpact.x, y: targetTopY, z: groundImpact.z }),
  });
}

export function sampleJumpTrajectory(trajectory, elapsedMs) {
  if (!trajectory || typeof trajectory !== 'object') {
    throw new TypeError('trajectory 必须是轨迹对象。');
  }
  assertPosition(trajectory.origin, 'trajectory.origin');
  assertPosition(trajectory.impact, 'trajectory.impact');
  assertFinite(trajectory.durationMs, 'trajectory.durationMs');
  assertFinite(trajectory.jumpHeight, 'trajectory.jumpHeight');
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

/**
 * Resolves the downward contact against a rectangular platform top. A success
 * returns the exact x/z impact; it deliberately never snaps to target.center.
 */
export function resolveTopLanding({ trajectory, target, inset = 0 }) {
  if (!trajectory || typeof trajectory !== 'object') {
    throw new TypeError('trajectory 必须是轨迹对象。');
  }
  assertPosition(trajectory.origin, 'trajectory.origin');
  assertPosition(trajectory.impact, 'trajectory.impact');
  assertPosition(trajectory.direction, 'trajectory.direction', false);
  assertFinite(trajectory.range, 'trajectory.range');
  const topY = target?.topY ?? 0;
  assertFinite(topY, 'target.topY');
  const impact = trajectory.impact;
  const onTopPlane = Math.abs(impact.y - topY) <= 1e-7;
  const landed = onTopPlane && isPointInPlatformFootprint(impact, target, inset);

  if (landed) {
    return {
      landed: true,
      reason: 'landed',
      position: { x: impact.x, y: topY, z: impact.z },
      offset: {
        x: impact.x - target.center.x,
        z: impact.z - target.center.z,
      },
    };
  }

  const interval = rayPlatformInterval({
    origin: trajectory.origin,
    direction: trajectory.direction,
    platform: target,
    inset,
  });
  let reason = 'outside';
  if (interval && trajectory.range < interval.entry) reason = 'short';
  if (interval && trajectory.range > interval.exit) reason = 'overshoot';
  if (!onTopPlane) reason = 'wrong-height';

  return {
    landed: false,
    reason,
    position: { ...impact },
    offset: {
      x: impact.x - target.center.x,
      z: impact.z - target.center.z,
    },
  };
}
