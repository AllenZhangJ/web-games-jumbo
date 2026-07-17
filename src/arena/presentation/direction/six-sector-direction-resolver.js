import {
  CHARACTER_PRESENTATION_DIRECTION_STRATEGY,
  CHARACTER_PRESENTATION_FRONT_AXIS,
} from '../content/character-presentation-definition.js';

export const SIX_SECTOR_DIRECTION_ID = Object.freeze({
  BACK: 'back',
  BACK_LEFT: 'back-left',
  BACK_RIGHT: 'back-right',
  FRONT: 'front',
  FRONT_LEFT: 'front-left',
  FRONT_RIGHT: 'front-right',
});

const DIRECTION_BY_SECTOR = Object.freeze([
  SIX_SECTOR_DIRECTION_ID.FRONT,
  SIX_SECTOR_DIRECTION_ID.FRONT_RIGHT,
  SIX_SECTOR_DIRECTION_ID.BACK_RIGHT,
  SIX_SECTOR_DIRECTION_ID.BACK,
  SIX_SECTOR_DIRECTION_ID.BACK_LEFT,
  SIX_SECTOR_DIRECTION_ID.FRONT_LEFT,
]);
const SECTOR_RADIANS = Math.PI / 3;

function finiteVector2(value, name) {
  if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.z)) {
    throw new TypeError(`${name} 必须是有限 x/z 向量。`);
  }
  return { x: value.x, z: value.z };
}

function normalized(value, name) {
  const vector = finiteVector2(value, name);
  const length = Math.hypot(vector.x, vector.z);
  if (length <= 1e-9) throw new RangeError(`${name} 不能是零向量。`);
  return { x: vector.x / length, z: vector.z / length };
}

function normalizeAngle(value) {
  let result = value;
  while (result <= -Math.PI) result += Math.PI * 2;
  while (result > Math.PI) result -= Math.PI * 2;
  return result;
}

function normalizedSector(value) {
  return ((value % DIRECTION_BY_SECTOR.length) + DIRECTION_BY_SECTOR.length)
    % DIRECTION_BY_SECTOR.length;
}

function frontAxisYaw(axis) {
  if (axis === CHARACTER_PRESENTATION_FRONT_AXIS.POSITIVE_Z) return 0;
  if (axis === CHARACTER_PRESENTATION_FRONT_AXIS.POSITIVE_X) return Math.PI / 2;
  if (axis === CHARACTER_PRESENTATION_FRONT_AXIS.NEGATIVE_Z) return Math.PI;
  if (axis === CHARACTER_PRESENTATION_FRONT_AXIS.NEGATIVE_X) return -Math.PI / 2;
  throw new RangeError(`未知 character front axis ${String(axis)}。`);
}

function cameraBasis(value) {
  const screenRight = normalized(value?.screenRight, 'cameraBasis.screenRight');
  const screenUp = normalized(value?.screenUp, 'cameraBasis.screenUp');
  if (Math.abs(screenRight.x * screenUp.x + screenRight.z * screenUp.z) > 1e-6) {
    throw new RangeError('cameraBasis screenRight/screenUp 必须正交。');
  }
  return { screenRight, screenUp };
}

export class SixSectorDirectionResolver {
  #hysteresisRadians;
  #frontAxisYaw;
  #sector;
  #destroyed;

  constructor(directionDefinition) {
    if (
      directionDefinition?.strategy
      !== CHARACTER_PRESENTATION_DIRECTION_STRATEGY.SIX_SECTOR_CAMERA_RELATIVE
    ) throw new RangeError('SixSectorDirectionResolver 需要 six-sector-camera-relative 策略。');
    if (
      !Number.isFinite(directionDefinition.hysteresisDegrees)
      || directionDefinition.hysteresisDegrees < 0
      || directionDefinition.hysteresisDegrees >= 30
    ) throw new RangeError('SixSectorDirectionResolver hysteresisDegrees 必须位于 [0, 30)。');
    this.#hysteresisRadians = directionDefinition.hysteresisDegrees * Math.PI / 180;
    this.#frontAxisYaw = frontAxisYaw(directionDefinition.defaultFrontAxis);
    this.#sector = null;
    this.#destroyed = false;
  }

  resolve({ facing, cameraBasis: basisValue, reset = false } = {}) {
    if (this.#destroyed) throw new Error('SixSectorDirectionResolver 已销毁。');
    if (reset) this.#sector = null;
    const basis = cameraBasis(basisValue);
    const source = finiteVector2(facing, 'facing');
    const sourceLength = Math.hypot(source.x, source.z);
    let angle;
    if (sourceLength <= 1e-9) {
      angle = this.#sector === null ? 0 : this.#sector * SECTOR_RADIANS;
    } else {
      const direction = { x: source.x / sourceLength, z: source.z / sourceLength };
      const screenRight = direction.x * basis.screenRight.x + direction.z * basis.screenRight.z;
      const screenUp = direction.x * basis.screenUp.x + direction.z * basis.screenUp.z;
      angle = Math.atan2(screenRight, screenUp);
    }
    const candidate = normalizedSector(Math.round(angle / SECTOR_RADIANS));
    if (this.#sector === null) {
      this.#sector = candidate;
    } else if (candidate !== this.#sector) {
      const previousCenter = this.#sector * SECTOR_RADIANS;
      const distanceFromPrevious = Math.abs(normalizeAngle(angle - previousCenter));
      if (distanceFromPrevious > SECTOR_RADIANS / 2 + this.#hysteresisRadians) {
        this.#sector = candidate;
      }
    }
    const center = this.#sector * SECTOR_RADIANS;
    const screenX = Math.sin(center);
    const screenY = Math.cos(center);
    const worldFacing = Object.freeze({
      x: basis.screenRight.x * screenX + basis.screenUp.x * screenY,
      z: basis.screenRight.z * screenX + basis.screenUp.z * screenY,
    });
    return Object.freeze({
      id: DIRECTION_BY_SECTOR[this.#sector],
      sector: this.#sector,
      worldFacing,
      modelFrontYawRadians: this.#frontAxisYaw,
    });
  }

  destroy() {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#sector = null;
  }
}
