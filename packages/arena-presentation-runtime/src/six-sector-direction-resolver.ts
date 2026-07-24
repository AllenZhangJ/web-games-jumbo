import { assertKnownKeys } from '@number-strategy-jump/arena-contracts';
import {
  CHARACTER_PRESENTATION_DIRECTION_STRATEGY,
  CHARACTER_PRESENTATION_FRONT_AXIS,
} from '@number-strategy-jump/arena-presentation-contracts';

const DIRECTION_KEYS = new Set(['strategy', 'defaultFrontAxis', 'hysteresisDegrees']);
const RESOLVE_KEYS = new Set(['facing', 'cameraBasis', 'reset']);
const BASIS_KEYS = new Set(['screenRight', 'screenUp']);
const VECTOR_KEYS = new Set(['x', 'z']);

export const SIX_SECTOR_DIRECTION_ID = Object.freeze({
  BACK: 'back',
  BACK_LEFT: 'back-left',
  BACK_RIGHT: 'back-right',
  FRONT: 'front',
  FRONT_LEFT: 'front-left',
  FRONT_RIGHT: 'front-right',
} as const);

const DIRECTION_BY_SECTOR = Object.freeze([
  SIX_SECTOR_DIRECTION_ID.FRONT,
  SIX_SECTOR_DIRECTION_ID.FRONT_RIGHT,
  SIX_SECTOR_DIRECTION_ID.BACK_RIGHT,
  SIX_SECTOR_DIRECTION_ID.BACK,
  SIX_SECTOR_DIRECTION_ID.BACK_LEFT,
  SIX_SECTOR_DIRECTION_ID.FRONT_LEFT,
] as const);
const SECTOR_RADIANS = Math.PI / 3;

interface Vector2 { readonly x: number; readonly z: number }

function finiteVector2(value: unknown, name: string): Vector2 {
  assertKnownKeys(value, VECTOR_KEYS, name);
  if (!Number.isFinite(value.x) || !Number.isFinite(value.z)) {
    throw new TypeError(`${name} 必须是有限 x/z 向量。`);
  }
  return { x: value.x as number, z: value.z as number };
}

function normalized(value: unknown, name: string): Vector2 {
  const vector = finiteVector2(value, name);
  const length = Math.hypot(vector.x, vector.z);
  if (length <= 1e-9) throw new RangeError(`${name} 不能是零向量。`);
  return { x: vector.x / length, z: vector.z / length };
}

function normalizeAngle(value: number): number {
  let result = value;
  while (result <= -Math.PI) result += Math.PI * 2;
  while (result > Math.PI) result -= Math.PI * 2;
  return result;
}

function normalizedSector(value: number): number {
  return ((value % DIRECTION_BY_SECTOR.length) + DIRECTION_BY_SECTOR.length)
    % DIRECTION_BY_SECTOR.length;
}

function frontAxisYaw(axis: unknown): number {
  if (axis === CHARACTER_PRESENTATION_FRONT_AXIS.POSITIVE_Z) return 0;
  if (axis === CHARACTER_PRESENTATION_FRONT_AXIS.POSITIVE_X) return Math.PI / 2;
  if (axis === CHARACTER_PRESENTATION_FRONT_AXIS.NEGATIVE_Z) return Math.PI;
  if (axis === CHARACTER_PRESENTATION_FRONT_AXIS.NEGATIVE_X) return -Math.PI / 2;
  throw new RangeError(`未知 character front axis ${String(axis)}。`);
}

function normalizeCameraBasis(value: unknown): Readonly<{
  screenRight: Vector2;
  screenUp: Vector2;
}> {
  assertKnownKeys(value, BASIS_KEYS, 'cameraBasis');
  const screenRight = normalized(value.screenRight, 'cameraBasis.screenRight');
  const screenUp = normalized(value.screenUp, 'cameraBasis.screenUp');
  if (Math.abs(screenRight.x * screenUp.x + screenRight.z * screenUp.z) > 1e-6) {
    throw new RangeError('cameraBasis screenRight/screenUp 必须正交。');
  }
  return { screenRight, screenUp };
}

export interface SixSectorDirectionResult {
  readonly id: typeof DIRECTION_BY_SECTOR[number];
  readonly sector: number;
  readonly worldFacing: Vector2;
  readonly modelFrontYawRadians: number;
}

export class SixSectorDirectionResolver {
  readonly #hysteresisRadians: number;
  readonly #frontAxisYaw: number;
  #sector: number | null = null;
  #destroyed = false;

  constructor(directionDefinition: unknown) {
    assertKnownKeys(directionDefinition, DIRECTION_KEYS, 'SixSectorDirectionResolver direction');
    if (
      directionDefinition.strategy
      !== CHARACTER_PRESENTATION_DIRECTION_STRATEGY.SIX_SECTOR_CAMERA_RELATIVE
    ) throw new RangeError('SixSectorDirectionResolver 需要 six-sector-camera-relative 策略。');
    if (
      !Number.isFinite(directionDefinition.hysteresisDegrees)
      || (directionDefinition.hysteresisDegrees as number) < 0
      || (directionDefinition.hysteresisDegrees as number) >= 30
    ) throw new RangeError('SixSectorDirectionResolver hysteresisDegrees 必须位于 [0, 30)。');
    this.#hysteresisRadians = (directionDefinition.hysteresisDegrees as number) * Math.PI / 180;
    this.#frontAxisYaw = frontAxisYaw(directionDefinition.defaultFrontAxis);
  }

  resolve(options: unknown = {}): Readonly<SixSectorDirectionResult> {
    if (this.#destroyed) throw new Error('SixSectorDirectionResolver 已销毁。');
    assertKnownKeys(options, RESOLVE_KEYS, 'SixSectorDirectionResolver.resolve options');
    if (options.reset !== undefined && typeof options.reset !== 'boolean') {
      throw new TypeError('SixSectorDirectionResolver.reset 必须是布尔值。');
    }
    const basis = normalizeCameraBasis(options.cameraBasis);
    const source = finiteVector2(options.facing, 'facing');
    const sourceLength = Math.hypot(source.x, source.z);
    let nextSector = options.reset === true ? null : this.#sector;
    let angle: number;
    if (sourceLength <= 1e-9) {
      angle = nextSector === null ? 0 : nextSector * SECTOR_RADIANS;
    } else {
      const direction = { x: source.x / sourceLength, z: source.z / sourceLength };
      const screenRight = direction.x * basis.screenRight.x + direction.z * basis.screenRight.z;
      const screenUp = direction.x * basis.screenUp.x + direction.z * basis.screenUp.z;
      angle = Math.atan2(screenRight, screenUp);
    }
    const candidate = normalizedSector(Math.round(angle / SECTOR_RADIANS));
    if (nextSector === null) {
      nextSector = candidate;
    } else if (candidate !== nextSector) {
      const previousCenter = nextSector * SECTOR_RADIANS;
      const distanceFromPrevious = Math.abs(normalizeAngle(angle - previousCenter));
      if (distanceFromPrevious > SECTOR_RADIANS / 2 + this.#hysteresisRadians) {
        nextSector = candidate;
      }
    }
    const center = nextSector * SECTOR_RADIANS;
    const screenX = Math.sin(center);
    const screenY = Math.cos(center);
    const worldFacing = Object.freeze({
      x: basis.screenRight.x * screenX + basis.screenUp.x * screenY,
      z: basis.screenRight.z * screenX + basis.screenUp.z * screenY,
    });
    const directionId = DIRECTION_BY_SECTOR[nextSector];
    if (!directionId) throw new Error('SixSectorDirectionResolver 生成了无效 sector。');
    const result = Object.freeze({
      id: directionId,
      sector: nextSector,
      worldFacing,
      modelFrontYawRadians: this.#frontAxisYaw,
    });
    this.#sector = nextSector;
    return result;
  }

  getDebugSnapshot(): Readonly<{ destroyed: boolean; sector: number | null }> {
    return Object.freeze({ destroyed: this.#destroyed, sector: this.#sector });
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#sector = null;
  }
}
