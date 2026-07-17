const REQUIRED_WORLD_METHODS = Object.freeze([
  'addCharacter',
  'setMovementIntent',
  'applyImpulse',
  'applyCharacterMutationBatch',
  'setSurfaceEnabled',
  'step',
  'getCharacterState',
  'resetCharacter',
  'destroy',
]);

export function assertFiniteNumber(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} 必须是有限数。`);
  return value;
}

export function assertPositiveNumber(value, name) {
  assertFiniteNumber(value, name);
  if (value <= 0) throw new RangeError(`${name} 必须大于 0。`);
  return value;
}

export function assertVector3(value, name) {
  if (!value || typeof value !== 'object') throw new TypeError(`${name} 必须是三维向量。`);
  assertFiniteNumber(value.x, `${name}.x`);
  assertFiniteNumber(value.y, `${name}.y`);
  assertFiniteNumber(value.z, `${name}.z`);
  return value;
}

export function normalizeMovementIntent(moveX, moveZ) {
  assertFiniteNumber(moveX, 'moveX');
  assertFiniteNumber(moveZ, 'moveZ');
  const clampedX = Math.max(-1, Math.min(1, moveX));
  const clampedZ = Math.max(-1, Math.min(1, moveZ));
  const length = Math.hypot(clampedX, clampedZ);
  if (length <= 1) return { x: clampedX, z: clampedZ };
  return { x: clampedX / length, z: clampedZ / length };
}

export function moveToward(current, target, maxDelta) {
  assertFiniteNumber(current, 'current');
  assertFiniteNumber(target, 'target');
  assertPositiveNumber(maxDelta, 'maxDelta');
  const delta = target - current;
  if (Math.abs(delta) <= maxDelta) return target;
  return current + Math.sign(delta) * maxDelta;
}

export function validateArenaDefinition(arena) {
  if (!arena || typeof arena !== 'object') throw new TypeError('arena 必须是对象。');
  assertFiniteNumber(arena.killY, 'arena.killY');
  if (!Array.isArray(arena.surfaces) || arena.surfaces.length === 0) {
    throw new RangeError('arena.surfaces 必须是非空数组。');
  }
  const ids = new Set();
  const surfaces = arena.surfaces.map((surface, index) => {
    if (!surface || typeof surface !== 'object') {
      throw new TypeError(`arena.surfaces[${index}] 必须是对象。`);
    }
    if (typeof surface.id !== 'string' || surface.id.length === 0 || ids.has(surface.id)) {
      throw new RangeError(`arena.surfaces[${index}].id 必须是唯一非空字符串。`);
    }
    ids.add(surface.id);
    assertVector3(surface.center, `arena.surfaces[${index}].center`);
    assertVector3(surface.halfExtents, `arena.surfaces[${index}].halfExtents`);
    assertPositiveNumber(surface.halfExtents.x, `arena.surfaces[${index}].halfExtents.x`);
    assertPositiveNumber(surface.halfExtents.y, `arena.surfaces[${index}].halfExtents.y`);
    assertPositiveNumber(surface.halfExtents.z, `arena.surfaces[${index}].halfExtents.z`);
    return {
      id: surface.id,
      center: { ...surface.center },
      halfExtents: { ...surface.halfExtents },
      topY: surface.center.y + surface.halfExtents.y,
      enabled: true,
    };
  });
  return { killY: arena.killY, surfaces };
}

export function validateCharacterDefinition(definition) {
  if (!definition || typeof definition !== 'object') {
    throw new TypeError('character definition 必须是对象。');
  }
  if (typeof definition.id !== 'string' || definition.id.length === 0) {
    throw new TypeError('character.id 必须是非空字符串。');
  }
  assertVector3(definition.position, 'character.position');
  for (const name of [
    'radius',
    'halfHeight',
    'mass',
    'moveSpeed',
    'groundAcceleration',
    'airAcceleration',
  ]) assertPositiveNumber(definition[name], `character.${name}`);
  return {
    id: definition.id,
    position: { ...definition.position },
    radius: definition.radius,
    halfHeight: definition.halfHeight,
    mass: definition.mass,
    moveSpeed: definition.moveSpeed,
    groundAcceleration: definition.groundAcceleration,
    airAcceleration: definition.airAcceleration,
  };
}

export function assertPhysicsWorld(world) {
  if (!world || typeof world !== 'object') throw new TypeError('physics world 必须是对象。');
  for (const name of REQUIRED_WORLD_METHODS) {
    if (typeof world[name] !== 'function') {
      throw new TypeError(`physics world 缺少 ${name}()。`);
    }
  }
  return world;
}

export function cloneCharacterState(body) {
  return {
    id: body.id,
    position: { x: body.x, y: body.y, z: body.z },
    velocity: { x: body.vx, y: body.vy, z: body.vz },
    facing: { x: body.facingX, z: body.facingZ },
    grounded: body.grounded,
    supportSurfaceId: body.supportSurfaceId,
  };
}
