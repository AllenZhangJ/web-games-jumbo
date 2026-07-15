export const GEOMETRY_EPSILON = 1e-9;

function assertFinite(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} 必须是有限数。`);
}

function assertGroundPoint(point, name) {
  if (!point || typeof point !== 'object') throw new TypeError(`${name} 必须是坐标对象。`);
  assertFinite(point.x, `${name}.x`);
  assertFinite(point.z, `${name}.z`);
}

function platformFootprint(platform) {
  if (!platform || typeof platform !== 'object') throw new TypeError('platform 必须是平台对象。');
  assertGroundPoint(platform.center, 'platform.center');
  assertFinite(platform.halfWidth, 'platform.halfWidth');
  assertFinite(platform.halfDepth, 'platform.halfDepth');
  if (platform.halfWidth < 0 || platform.halfDepth < 0) {
    throw new RangeError('平台半宽和半深不能为负数。');
  }
  return platform;
}

function assertInset(inset) {
  assertFinite(inset, 'inset');
  if (inset < 0) throw new RangeError('inset 不能为负数。');
}

export function clamp(value, min, max) {
  assertFinite(value, 'value');
  assertFinite(min, 'min');
  assertFinite(max, 'max');
  if (min > max) throw new RangeError('clamp 的 min 不能大于 max。');
  return Math.min(max, Math.max(min, value));
}

export function lerp(start, end, progress) {
  assertFinite(start, 'start');
  assertFinite(end, 'end');
  assertFinite(progress, 'progress');
  return start + (end - start) * progress;
}

export function groundDistance(from, to) {
  assertGroundPoint(from, 'from');
  assertGroundPoint(to, 'to');
  return Math.hypot(to.x - from.x, to.z - from.z);
}

export function groundDirection(from, to) {
  assertGroundPoint(from, 'from');
  assertGroundPoint(to, 'to');
  const x = to.x - from.x;
  const z = to.z - from.z;
  const length = Math.hypot(x, z);

  if (length <= GEOMETRY_EPSILON) {
    throw new RangeError('Ground direction needs two distinct x/z points.');
  }

  return { x: x / length, z: z / length, length };
}

export function groundPointAt(origin, direction, distance) {
  assertGroundPoint(origin, 'origin');
  assertGroundPoint(direction, 'direction');
  assertFinite(distance, 'distance');
  return {
    x: origin.x + direction.x * distance,
    z: origin.z + direction.z * distance,
  };
}

export function isPointInPlatformFootprint(point, platform, inset = 0) {
  assertGroundPoint(point, 'point');
  platformFootprint(platform);
  assertInset(inset);
  const halfWidth = platform.halfWidth - inset;
  const halfDepth = platform.halfDepth - inset;
  if (halfWidth < 0 || halfDepth < 0) return false;

  return (
    Math.abs(point.x - platform.center.x) <= halfWidth + GEOMETRY_EPSILON
    && Math.abs(point.z - platform.center.z) <= halfDepth + GEOMETRY_EPSILON
  );
}

/**
 * Returns the distances at which a normalized x/z ray enters and leaves an
 * axis-aligned platform footprint. A null result means the ray misses it.
 */
export function rayPlatformInterval({ origin, direction, platform, inset = 0 }) {
  assertGroundPoint(origin, 'origin');
  assertGroundPoint(direction, 'direction');
  platformFootprint(platform);
  assertInset(inset);
  const halfWidth = platform.halfWidth - inset;
  const halfDepth = platform.halfDepth - inset;
  if (halfWidth < 0 || halfDepth < 0) return null;

  const directionLength = Math.hypot(direction.x, direction.z);
  if (directionLength <= GEOMETRY_EPSILON) {
    throw new RangeError('射线方向必须为非零向量。');
  }
  const normalizedDirection = {
    x: direction.x / directionLength,
    z: direction.z / directionLength,
  };

  let entry = Number.NEGATIVE_INFINITY;
  let exit = Number.POSITIVE_INFINITY;

  const axes = [
    ['x', platform.center.x - halfWidth, platform.center.x + halfWidth],
    ['z', platform.center.z - halfDepth, platform.center.z + halfDepth],
  ];

  for (const [axis, min, max] of axes) {
    const axisDirection = normalizedDirection[axis];
    const axisOrigin = origin[axis];

    if (Math.abs(axisDirection) <= GEOMETRY_EPSILON) {
      if (axisOrigin < min || axisOrigin > max) return null;
      continue;
    }

    const first = (min - axisOrigin) / axisDirection;
    const second = (max - axisOrigin) / axisDirection;
    const near = Math.min(first, second);
    const far = Math.max(first, second);
    entry = Math.max(entry, near);
    exit = Math.min(exit, far);

    if (entry > exit) return null;
  }

  const forwardEntry = Math.max(0, entry);
  if (exit < forwardEntry) return null;
  return { entry: forwardEntry, exit };
}
