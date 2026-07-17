function finite(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} 必须是有限数。`);
  return value;
}

function positive(value, name) {
  const result = finite(value, name);
  if (result <= 0) throw new RangeError(`${name} 必须大于 0。`);
  return result;
}

function cloneViewport(value) {
  if (!value || typeof value !== 'object') throw new TypeError('camera viewport 必须是对象。');
  return Object.freeze({
    width: positive(value.width, 'camera viewport.width'),
    height: positive(value.height, 'camera viewport.height'),
  });
}

function cloneBounds(value) {
  if (!value || typeof value !== 'object') throw new TypeError('camera worldBounds 必须是对象。');
  const bounds = Object.freeze({
    minX: finite(value.minX, 'camera worldBounds.minX'),
    maxX: finite(value.maxX, 'camera worldBounds.maxX'),
    minZ: finite(value.minZ, 'camera worldBounds.minZ'),
    maxZ: finite(value.maxZ, 'camera worldBounds.maxZ'),
  });
  if (bounds.minX >= bounds.maxX || bounds.minZ >= bounds.maxZ) {
    throw new RangeError('camera worldBounds 必须具有正面积。');
  }
  return bounds;
}

export function createArenaWorldBounds(surfaces) {
  if (!Array.isArray(surfaces) || surfaces.length === 0) {
    throw new RangeError('camera surfaces 必须是非空数组。');
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [index, surface] of surfaces.entries()) {
    if (!surface?.center || !surface?.halfExtents) {
      throw new TypeError(`camera surfaces[${index}] 缺少几何数据。`);
    }
    const x = finite(surface.center.x, `camera surfaces[${index}].center.x`);
    const z = finite(surface.center.z, `camera surfaces[${index}].center.z`);
    const halfX = positive(surface.halfExtents.x, `camera surfaces[${index}].halfExtents.x`);
    const halfZ = positive(surface.halfExtents.z, `camera surfaces[${index}].halfExtents.z`);
    minX = Math.min(minX, x - halfX);
    maxX = Math.max(maxX, x + halfX);
    minZ = Math.min(minZ, z - halfZ);
    maxZ = Math.max(maxZ, z + halfZ);
  }
  return Object.freeze({ minX, maxX, minZ, maxZ });
}

/**
 * The camera is intentionally fixed and presentation-only. Input always uses
 * world X/Z: screen right maps to +X through a visual X mirror, and screen up
 * maps to +Z. Resizing changes only the orthographic frustum.
 */
export function createOrthographicArenaCamera({
  viewport,
  worldBounds,
  padding = 2,
  minimumVerticalSpan = 16,
} = {}) {
  const size = cloneViewport(viewport);
  const bounds = cloneBounds(worldBounds);
  const safePadding = finite(padding, 'camera padding');
  if (safePadding < 0) throw new RangeError('camera padding 不能小于 0。');
  const aspect = size.width / size.height;
  const requiredWidth = bounds.maxX - bounds.minX + safePadding * 2;
  const requiredDepth = bounds.maxZ - bounds.minZ + safePadding * 2;
  const verticalSpan = Math.max(
    positive(minimumVerticalSpan, 'camera minimumVerticalSpan'),
    requiredDepth,
    requiredWidth / aspect,
  );
  const horizontalSpan = verticalSpan * aspect;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  return Object.freeze({
    projection: 'orthographic',
    position: Object.freeze({ x: centerX, y: 16, z: centerZ - 16 }),
    target: Object.freeze({ x: centerX, y: 0, z: centerZ }),
    near: 0.1,
    far: 80,
    frustum: Object.freeze({
      left: -horizontalSpan / 2,
      right: horizontalSpan / 2,
      top: verticalSpan / 2,
      bottom: -verticalSpan / 2,
    }),
    visualTransform: Object.freeze({ mirrorWorldX: true }),
    inputBasis: Object.freeze({
      screenRight: Object.freeze({ x: 1, z: 0 }),
      screenUp: Object.freeze({ x: 0, z: 1 }),
    }),
  });
}
