import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const MOVEMENT_MUTATION_KIND = Object.freeze({
  APPLY_IMPULSE: 'apply-impulse',
  SET_VERTICAL_SPEED: 'set-vertical-speed',
  ACCELERATE_DOWNWARD: 'accelerate-downward',
});

const IMPULSE_KEYS = new Set(['kind', 'participantId', 'impulse']);
const SPEED_KEYS = new Set(['kind', 'participantId', 'speed']);
const ACCELERATION_KEYS = new Set(['kind', 'participantId', 'acceleration', 'maximumSpeed']);
const VECTOR_KEYS = new Set(['x', 'y', 'z']);

export function createMovementMutation(value) {
  const source = cloneFrozenData(value, 'MovementMutation');
  if (source.kind === MOVEMENT_MUTATION_KIND.APPLY_IMPULSE) {
    assertKnownKeys(source, IMPULSE_KEYS, 'MovementMutation');
    assertKnownKeys(source.impulse, VECTOR_KEYS, 'MovementMutation.impulse');
    if (
      !Number.isFinite(source.impulse.x)
      || !Number.isFinite(source.impulse.y)
      || source.impulse.y <= 0
      || !Number.isFinite(source.impulse.z)
    ) {
      throw new RangeError('MovementMutation 跳跃冲量必须是有限向量且 y 为正数。');
    }
    return Object.freeze({
      kind: source.kind,
      participantId: assertNonEmptyString(
        source.participantId,
        'MovementMutation.participantId',
      ),
      impulse: Object.freeze({
        x: source.impulse.x,
        y: source.impulse.y,
        z: source.impulse.z,
      }),
    });
  }
  if (source.kind === MOVEMENT_MUTATION_KIND.SET_VERTICAL_SPEED) {
    assertKnownKeys(source, SPEED_KEYS, 'MovementMutation');
    if (!Number.isFinite(source.speed) || source.speed >= 0) {
      throw new RangeError('MovementMutation 下砸速度必须是有限负数。');
    }
    return Object.freeze({
      kind: source.kind,
      participantId: assertNonEmptyString(
        source.participantId,
        'MovementMutation.participantId',
      ),
      speed: source.speed,
    });
  }
  if (source.kind === MOVEMENT_MUTATION_KIND.ACCELERATE_DOWNWARD) {
    assertKnownKeys(source, ACCELERATION_KEYS, 'MovementMutation');
    if (!Number.isFinite(source.acceleration) || source.acceleration <= 0) {
      throw new RangeError('MovementMutation 下砸加速度必须是正有限数。');
    }
    if (!Number.isFinite(source.maximumSpeed) || source.maximumSpeed <= 0) {
      throw new RangeError('MovementMutation 下砸最大速度必须是正有限数。');
    }
    return Object.freeze({
      kind: source.kind,
      participantId: assertNonEmptyString(
        source.participantId,
        'MovementMutation.participantId',
      ),
      acceleration: source.acceleration,
      maximumSpeed: source.maximumSpeed,
    });
  }
  throw new RangeError(`MovementMutation.kind 不受支持：${String(source.kind)}。`);
}
