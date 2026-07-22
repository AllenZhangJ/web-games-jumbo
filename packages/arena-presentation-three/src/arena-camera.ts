const VIEWPORT_KEYS = new Set<PropertyKey>(['width', 'height', 'pixelRatio', 'safeArea']);
const WORLD_BOUNDS_KEYS = new Set<PropertyKey>(['minX', 'maxX', 'minZ', 'maxZ']);
const TARGET_KEYS = new Set<PropertyKey>(['x', 'z']);
const FULL_CAMERA_OPTION_KEYS = new Set<PropertyKey>([
  'viewport', 'worldBounds', 'padding', 'minimumVerticalSpan',
]);
const FOLLOW_CAMERA_OPTION_KEYS = new Set<PropertyKey>([
  'viewport', 'worldBounds', 'target', 'portraitVerticalSpan', 'landscapeVerticalSpan',
]);

export const ARENA_CAMERA_DEFAULTS = Object.freeze({
  worldPadding: 2,
  fullMapMinimumVerticalSpan: 16,
  followPortraitVerticalSpan: 14,
  followLandscapeVerticalSpan: 12,
  portraitAspectThreshold: 0.82,
  positionHeight: 16,
  positionDepthOffset: 16,
  targetHeight: 0,
  near: 0.1,
  far: 80,
} as const);

const VISUAL_TRANSFORM = Object.freeze({ mirrorWorldX: true as const });
const INPUT_BASIS = Object.freeze({
  screenRight: Object.freeze({ x: 1, z: 0 }),
  screenUp: Object.freeze({ x: 0, z: 1 }),
});

export interface ArenaWorldBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface ArenaCameraModel {
  readonly projection: 'orthographic' | 'orthographic-follow';
  readonly position: Readonly<{ x: number; y: number; z: number }>;
  readonly target: Readonly<{ x: number; y: number; z: number }>;
  readonly near: number;
  readonly far: number;
  readonly frustum: Readonly<{ left: number; right: number; top: number; bottom: number }>;
  readonly worldBounds?: ArenaWorldBounds;
  readonly visualTransform: typeof VISUAL_TRANSFORM;
  readonly inputBasis: typeof INPUT_BASIS;
}

function assertRecord(value: unknown, name: string): asserts value is object {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
}

function assertKnownKeys(value: object, allowed: ReadonlySet<PropertyKey>, name: string): void {
  const unknown = Reflect.ownKeys(value).find((key) => !allowed.has(key));
  if (unknown !== undefined) throw new TypeError(`${name} 包含未知字段 ${String(unknown)}。`);
}

function ownData(value: unknown, field: PropertyKey, name: string, required = true): unknown {
  assertRecord(value, name);
  const descriptor = Object.getOwnPropertyDescriptor(value, field);
  if (!descriptor) {
    if (!required) return undefined;
    throw new TypeError(`${name}.${String(field)} 缺失。`);
  }
  if (!Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${String(field)} 必须是数据字段。`);
  }
  return descriptor.value;
}

function finiteNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} 必须是有限数。`);
  }
  return value;
}

function positiveNumber(value: unknown, name: string): number {
  const result = finiteNumber(value, name);
  if (result <= 0) throw new RangeError(`${name} 必须大于 0。`);
  return result;
}

function optionalNumber(
  options: object,
  field: PropertyKey,
  fallback: number,
  name: string,
): number {
  const value = ownData(options, field, 'camera options', false);
  return value === undefined ? fallback : finiteNumber(value, name);
}

function cloneViewport(value: unknown): Readonly<{ width: number; height: number }> {
  assertRecord(value, 'camera viewport');
  assertKnownKeys(value, VIEWPORT_KEYS, 'camera viewport');
  return Object.freeze({
    width: positiveNumber(ownData(value, 'width', 'camera viewport'), 'camera viewport.width'),
    height: positiveNumber(ownData(value, 'height', 'camera viewport'), 'camera viewport.height'),
  });
}

function cloneBounds(value: unknown): ArenaWorldBounds {
  assertRecord(value, 'camera worldBounds');
  assertKnownKeys(value, WORLD_BOUNDS_KEYS, 'camera worldBounds');
  const bounds = Object.freeze({
    minX: finiteNumber(ownData(value, 'minX', 'camera worldBounds'), 'camera worldBounds.minX'),
    maxX: finiteNumber(ownData(value, 'maxX', 'camera worldBounds'), 'camera worldBounds.maxX'),
    minZ: finiteNumber(ownData(value, 'minZ', 'camera worldBounds'), 'camera worldBounds.minZ'),
    maxZ: finiteNumber(ownData(value, 'maxZ', 'camera worldBounds'), 'camera worldBounds.maxZ'),
  });
  if (bounds.minX >= bounds.maxX || bounds.minZ >= bounds.maxZ) {
    throw new RangeError('camera worldBounds 必须具有正面积。');
  }
  return bounds;
}

function cloneTarget(value: unknown): Readonly<{ x: number; z: number }> {
  assertRecord(value, 'camera local target');
  assertKnownKeys(value, TARGET_KEYS, 'camera local target');
  return Object.freeze({
    x: finiteNumber(ownData(value, 'x', 'camera local target'), 'camera local target.x'),
    z: finiteNumber(ownData(value, 'z', 'camera local target'), 'camera local target.z'),
  });
}

function arrayDataItem(value: readonly unknown[], index: number, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
  if (!descriptor) throw new TypeError(`${name}[${index}] 缺失。`);
  if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${name}[${index}] 必须是数据字段。`);
  return descriptor.value;
}

export function createArenaWorldBounds(surfaces: unknown): ArenaWorldBounds {
  if (!Array.isArray(surfaces) || surfaces.length === 0) {
    throw new RangeError('camera surfaces 必须是非空数组。');
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let index = 0; index < surfaces.length; index += 1) {
    const surface = arrayDataItem(surfaces, index, 'camera surfaces');
    const surfaceName = `camera surfaces[${index}]`;
    const center = ownData(surface, 'center', surfaceName);
    const halfExtents = ownData(surface, 'halfExtents', surfaceName);
    const x = finiteNumber(ownData(center, 'x', `${surfaceName}.center`), `${surfaceName}.center.x`);
    const z = finiteNumber(ownData(center, 'z', `${surfaceName}.center`), `${surfaceName}.center.z`);
    const halfX = positiveNumber(
      ownData(halfExtents, 'x', `${surfaceName}.halfExtents`),
      `${surfaceName}.halfExtents.x`,
    );
    const halfZ = positiveNumber(
      ownData(halfExtents, 'z', `${surfaceName}.halfExtents`),
      `${surfaceName}.halfExtents.z`,
    );
    minX = Math.min(minX, x - halfX);
    maxX = Math.max(maxX, x + halfX);
    minZ = Math.min(minZ, z - halfZ);
    maxZ = Math.max(maxZ, z + halfZ);
  }
  return Object.freeze({ minX, maxX, minZ, maxZ });
}

/** Full-map presentation camera with a stable world X/Z input basis. */
export function createOrthographicArenaCamera(options: unknown = {}): ArenaCameraModel {
  assertRecord(options, 'camera options');
  assertKnownKeys(options, FULL_CAMERA_OPTION_KEYS, 'camera options');
  const size = cloneViewport(ownData(options, 'viewport', 'camera options'));
  const bounds = cloneBounds(ownData(options, 'worldBounds', 'camera options'));
  const padding = optionalNumber(options, 'padding', ARENA_CAMERA_DEFAULTS.worldPadding, 'camera padding');
  if (padding < 0) throw new RangeError('camera padding 不能小于 0。');
  const minimumVerticalSpan = positiveNumber(
    optionalNumber(
      options,
      'minimumVerticalSpan',
      ARENA_CAMERA_DEFAULTS.fullMapMinimumVerticalSpan,
      'camera minimumVerticalSpan',
    ),
    'camera minimumVerticalSpan',
  );
  const aspect = size.width / size.height;
  const requiredWidth = bounds.maxX - bounds.minX + padding * 2;
  const requiredDepth = bounds.maxZ - bounds.minZ + padding * 2;
  const verticalSpan = Math.max(minimumVerticalSpan, requiredDepth, requiredWidth / aspect);
  return createModel('orthographic', bounds, aspect, verticalSpan, false);
}

/** Large-map camera with an immutable local readable play area. */
export function createLocalFollowArenaCamera(options: unknown = {}): ArenaCameraModel {
  assertRecord(options, 'camera options');
  assertKnownKeys(options, FOLLOW_CAMERA_OPTION_KEYS, 'camera options');
  const size = cloneViewport(ownData(options, 'viewport', 'camera options'));
  const bounds = cloneBounds(ownData(options, 'worldBounds', 'camera options'));
  const aspect = size.width / size.height;
  const portraitVerticalSpan = positiveNumber(
    optionalNumber(
      options,
      'portraitVerticalSpan',
      ARENA_CAMERA_DEFAULTS.followPortraitVerticalSpan,
      'camera portraitVerticalSpan',
    ),
    'camera portraitVerticalSpan',
  );
  const landscapeVerticalSpan = positiveNumber(
    optionalNumber(
      options,
      'landscapeVerticalSpan',
      ARENA_CAMERA_DEFAULTS.followLandscapeVerticalSpan,
      'camera landscapeVerticalSpan',
    ),
    'camera landscapeVerticalSpan',
  );
  const verticalSpan = aspect < ARENA_CAMERA_DEFAULTS.portraitAspectThreshold
    ? portraitVerticalSpan
    : landscapeVerticalSpan;
  const targetValue = ownData(options, 'target', 'camera options', false);
  const target = targetValue === undefined || targetValue === null
    ? Object.freeze({
      x: (bounds.minX + bounds.maxX) / 2,
      z: (bounds.minZ + bounds.maxZ) / 2,
    })
    : cloneTarget(targetValue);
  return createModel('orthographic-follow', bounds, aspect, verticalSpan, true, target);
}

function createModel(
  projection: ArenaCameraModel['projection'],
  bounds: ArenaWorldBounds,
  aspect: number,
  verticalSpan: number,
  includeWorldBounds: boolean,
  explicitTarget?: Readonly<{ x: number; z: number }>,
): ArenaCameraModel {
  const horizontalSpan = verticalSpan * aspect;
  const centerX = explicitTarget?.x ?? (bounds.minX + bounds.maxX) / 2;
  const centerZ = explicitTarget?.z ?? (bounds.minZ + bounds.maxZ) / 2;
  const common = {
    projection,
    position: Object.freeze({
      x: centerX,
      y: ARENA_CAMERA_DEFAULTS.positionHeight,
      z: centerZ - ARENA_CAMERA_DEFAULTS.positionDepthOffset,
    }),
    target: Object.freeze({ x: centerX, y: ARENA_CAMERA_DEFAULTS.targetHeight, z: centerZ }),
    near: ARENA_CAMERA_DEFAULTS.near,
    far: ARENA_CAMERA_DEFAULTS.far,
    frustum: Object.freeze({
      left: -horizontalSpan / 2,
      right: horizontalSpan / 2,
      top: verticalSpan / 2,
      bottom: -verticalSpan / 2,
    }),
    visualTransform: VISUAL_TRANSFORM,
    inputBasis: INPUT_BASIS,
  };
  return includeWorldBounds
    ? Object.freeze({ ...common, worldBounds: bounds })
    : Object.freeze(common);
}
