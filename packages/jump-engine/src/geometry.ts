export const GEOMETRY_EPSILON = 1e-9;

export interface GroundPoint {
  readonly x: number;
  readonly z: number;
}

export interface PlatformFootprint {
  readonly center: GroundPoint;
  readonly halfWidth: number;
  readonly halfDepth: number;
}

export interface GroundDirection extends GroundPoint {
  readonly length: number;
}

export interface RayPlatformInterval {
  readonly entry: number;
  readonly exit: number;
}

function assertFinite(value: unknown, name: string): asserts value is number {
  if (!Number.isFinite(value)) throw new TypeError(`${name} 必须是有限数。`);
}

function assertGroundPoint(point: unknown, name: string): asserts point is GroundPoint {
  if (!point || typeof point !== 'object') throw new TypeError(`${name} 必须是坐标对象。`);
  const candidate = point as Partial<GroundPoint>;
  assertFinite(candidate.x, `${name}.x`);
  assertFinite(candidate.z, `${name}.z`);
}

function assertPlatformFootprint(platform: unknown): asserts platform is PlatformFootprint {
  if (!platform || typeof platform !== 'object') throw new TypeError('platform 必须是平台对象。');
  const candidate = platform as Partial<PlatformFootprint>;
  assertGroundPoint(candidate.center, 'platform.center');
  assertFinite(candidate.halfWidth, 'platform.halfWidth');
  assertFinite(candidate.halfDepth, 'platform.halfDepth');
  if (candidate.halfWidth < 0 || candidate.halfDepth < 0) {
    throw new RangeError('平台半宽和半深不能为负数。');
  }
}

function assertInset(inset: unknown): asserts inset is number {
  assertFinite(inset, 'inset');
  if (inset < 0) throw new RangeError('inset 不能为负数。');
}

export function clamp(value: unknown, min: unknown, max: unknown): number {
  assertFinite(value, 'value');
  assertFinite(min, 'min');
  assertFinite(max, 'max');
  if (min > max) throw new RangeError('clamp 的 min 不能大于 max。');
  return Math.min(max, Math.max(min, value));
}

export function lerp(start: unknown, end: unknown, progress: unknown): number {
  assertFinite(start, 'start');
  assertFinite(end, 'end');
  assertFinite(progress, 'progress');
  return start + (end - start) * progress;
}

export function groundDistance(from: unknown, to: unknown): number {
  assertGroundPoint(from, 'from');
  assertGroundPoint(to, 'to');
  return Math.hypot(to.x - from.x, to.z - from.z);
}

export function groundDirection(from: unknown, to: unknown): GroundDirection {
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

export function groundPointAt(origin: unknown, direction: unknown, distance: unknown): GroundPoint {
  assertGroundPoint(origin, 'origin');
  assertGroundPoint(direction, 'direction');
  assertFinite(distance, 'distance');
  return {
    x: origin.x + direction.x * distance,
    z: origin.z + direction.z * distance,
  };
}

export function isPointInPlatformFootprint(
  point: unknown,
  platform: unknown,
  inset: unknown = 0,
): boolean {
  assertGroundPoint(point, 'point');
  assertPlatformFootprint(platform);
  assertInset(inset);
  const halfWidth = platform.halfWidth - inset;
  const halfDepth = platform.halfDepth - inset;
  if (halfWidth < 0 || halfDepth < 0) return false;
  return Math.abs(point.x - platform.center.x) <= halfWidth + GEOMETRY_EPSILON
    && Math.abs(point.z - platform.center.z) <= halfDepth + GEOMETRY_EPSILON;
}

export function rayPlatformInterval({
  origin,
  direction,
  platform,
  inset = 0,
}: {
  readonly origin: unknown;
  readonly direction: unknown;
  readonly platform: unknown;
  readonly inset?: unknown;
}): RayPlatformInterval | null {
  assertGroundPoint(origin, 'origin');
  assertGroundPoint(direction, 'direction');
  assertPlatformFootprint(platform);
  assertInset(inset);
  const halfWidth = platform.halfWidth - inset;
  const halfDepth = platform.halfDepth - inset;
  if (halfWidth < 0 || halfDepth < 0) return null;

  const directionLength = Math.hypot(direction.x, direction.z);
  if (directionLength <= GEOMETRY_EPSILON) throw new RangeError('射线方向必须为非零向量。');
  const normalizedDirection = {
    x: direction.x / directionLength,
    z: direction.z / directionLength,
  };
  let entry = Number.NEGATIVE_INFINITY;
  let exit = Number.POSITIVE_INFINITY;
  const axes: readonly [keyof GroundPoint, number, number][] = [
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
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
    if (entry > exit) return null;
  }

  const forwardEntry = Math.max(0, entry);
  return exit < forwardEntry ? null : { entry: forwardEntry, exit };
}
