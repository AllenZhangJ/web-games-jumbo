export { normalizeMovementIntent } from '@number-strategy-jump/arena-contracts';

import type { MovementMutation } from '@number-strategy-jump/arena-movement';

export interface PhysicsVector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface PhysicsVector2 {
  readonly x: number;
  readonly z: number;
}

export interface PhysicsArenaDefinition {
  readonly killY: number;
  readonly surfaces: readonly Readonly<{
    id: string;
    center: PhysicsVector3;
    halfExtents: PhysicsVector3;
  }>[];
}

export interface PhysicsRuntimeSurface {
  readonly id: string;
  readonly center: PhysicsVector3;
  readonly halfExtents: PhysicsVector3;
  readonly topY: number;
  enabled: boolean;
}

export interface PhysicsRuntimeArena {
  readonly killY: number;
  readonly surfaces: PhysicsRuntimeSurface[];
}

export interface PhysicsCharacterDefinition {
  readonly id: string;
  readonly position: PhysicsVector3;
  readonly radius: number;
  readonly halfHeight: number;
  readonly mass: number;
  readonly moveSpeed: number;
  readonly groundAcceleration: number;
  readonly airAcceleration: number;
}

export interface PhysicsCharacterState {
  readonly id: string;
  readonly position: PhysicsVector3;
  readonly velocity: PhysicsVector3;
  readonly facing: PhysicsVector2;
  readonly grounded: boolean;
  readonly supportSurfaceId: string | null;
}

export interface PhysicsCharacterResetState {
  readonly position: PhysicsVector3;
  readonly velocity?: PhysicsVector3;
  readonly facing?: PhysicsVector2;
}

export interface PhysicsCharacterBody extends PhysicsCharacterDefinition {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  intentX: number;
  intentZ: number;
  facingX: number;
  facingZ: number;
  grounded: boolean;
  supportSurfaceId: string | null;
}

export interface PhysicsWorld {
  readonly addCharacter: (definition: PhysicsCharacterDefinition) => string;
  readonly setMovementIntent: (id: string, moveX: number, moveZ: number) => void;
  readonly applyImpulse: (id: string, impulse: PhysicsVector3) => void;
  readonly applyCharacterMutationBatch: (mutations: readonly MovementMutation[]) => void;
  readonly setSurfaceEnabled: (surfaceId: string, enabled: boolean) => boolean;
  readonly step: (deltaSeconds: number) => void;
  readonly getCharacterState: (id: string) => PhysicsCharacterState;
  readonly resetCharacter: (id: string, state: PhysicsCharacterResetState) => void;
  readonly destroy: () => void;
}

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

export function assertFiniteNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} 必须是有限数。`);
  }
  return value;
}

export function assertPositiveNumber(value: unknown, name: string): number {
  const normalized = assertFiniteNumber(value, name);
  if (normalized <= 0) throw new RangeError(`${name} 必须大于 0。`);
  return normalized;
}

export function assertVector3(value: unknown, name: string): PhysicsVector3 {
  if (!value || typeof value !== 'object') throw new TypeError(`${name} 必须是三维向量。`);
  const vector = value as Readonly<Record<string, unknown>>;
  assertFiniteNumber(vector.x, `${name}.x`);
  assertFiniteNumber(vector.y, `${name}.y`);
  assertFiniteNumber(vector.z, `${name}.z`);
  return value as PhysicsVector3;
}

export function moveToward(current: number, target: number, maxDelta: number): number {
  assertFiniteNumber(current, 'current');
  assertFiniteNumber(target, 'target');
  assertPositiveNumber(maxDelta, 'maxDelta');
  const delta = target - current;
  if (Math.abs(delta) <= maxDelta) return target;
  return current + Math.sign(delta) * maxDelta;
}

export function validateArenaDefinition(arena: unknown): PhysicsRuntimeArena {
  if (!arena || typeof arena !== 'object') throw new TypeError('arena 必须是对象。');
  const source = arena as Readonly<Record<string, unknown>>;
  const killY = assertFiniteNumber(source.killY, 'arena.killY');
  if (!Array.isArray(source.surfaces) || source.surfaces.length === 0) {
    throw new RangeError('arena.surfaces 必须是非空数组。');
  }
  const ids = new Set();
  const surfaces = source.surfaces.map((surface, index) => {
    if (!surface || typeof surface !== 'object') {
      throw new TypeError(`arena.surfaces[${index}] 必须是对象。`);
    }
    const value = surface as Readonly<Record<string, unknown>>;
    if (typeof value.id !== 'string' || value.id.length === 0 || ids.has(value.id)) {
      throw new RangeError(`arena.surfaces[${index}].id 必须是唯一非空字符串。`);
    }
    ids.add(value.id);
    const center = assertVector3(value.center, `arena.surfaces[${index}].center`);
    const halfExtents = assertVector3(value.halfExtents, `arena.surfaces[${index}].halfExtents`);
    assertPositiveNumber(halfExtents.x, `arena.surfaces[${index}].halfExtents.x`);
    assertPositiveNumber(halfExtents.y, `arena.surfaces[${index}].halfExtents.y`);
    assertPositiveNumber(halfExtents.z, `arena.surfaces[${index}].halfExtents.z`);
    return {
      id: value.id,
      center: { ...center },
      halfExtents: { ...halfExtents },
      topY: center.y + halfExtents.y,
      enabled: true,
    };
  });
  return { killY, surfaces };
}

export function validateCharacterDefinition(definition: unknown): PhysicsCharacterDefinition {
  if (!definition || typeof definition !== 'object') {
    throw new TypeError('character definition 必须是对象。');
  }
  const source = definition as Readonly<Record<string, unknown>>;
  if (typeof source.id !== 'string' || source.id.length === 0) {
    throw new TypeError('character.id 必须是非空字符串。');
  }
  const position = assertVector3(source.position, 'character.position');
  for (const name of [
    'radius',
    'halfHeight',
    'mass',
    'moveSpeed',
    'groundAcceleration',
    'airAcceleration',
  ]) assertPositiveNumber(source[name], `character.${name}`);
  return {
    id: source.id,
    position: { ...position },
    radius: source.radius as number,
    halfHeight: source.halfHeight as number,
    mass: source.mass as number,
    moveSpeed: source.moveSpeed as number,
    groundAcceleration: source.groundAcceleration as number,
    airAcceleration: source.airAcceleration as number,
  };
}

export function assertPhysicsWorld(world: unknown): PhysicsWorld {
  if (!world || typeof world !== 'object') throw new TypeError('physics world 必须是对象。');
  for (const name of REQUIRED_WORLD_METHODS) {
    if (typeof Reflect.get(world, name) !== 'function') {
      throw new TypeError(`physics world 缺少 ${name}()。`);
    }
  }
  return world as PhysicsWorld;
}

export function cloneCharacterState(body: PhysicsCharacterBody): PhysicsCharacterState {
  return {
    id: body.id,
    position: { x: body.x, y: body.y, z: body.z },
    velocity: { x: body.vx, y: body.vy, z: body.vz },
    facing: { x: body.facingX, z: body.facingZ },
    grounded: body.grounded,
    supportSurfaceId: body.supportSurfaceId,
  };
}
