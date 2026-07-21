import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const MOVEMENT_MUTATION_KIND = Object.freeze({
  APPLY_IMPULSE: 'apply-impulse',
  SET_VERTICAL_SPEED: 'set-vertical-speed',
  ACCELERATE_DOWNWARD: 'accelerate-downward',
} as const);

export interface MovementImpulseMutation {
  readonly kind: typeof MOVEMENT_MUTATION_KIND.APPLY_IMPULSE;
  readonly participantId: string;
  readonly impulse: Readonly<{ x: number; y: number; z: number }>;
}

export interface MovementVerticalSpeedMutation {
  readonly kind: typeof MOVEMENT_MUTATION_KIND.SET_VERTICAL_SPEED;
  readonly participantId: string;
  readonly speed: number;
}

export interface MovementDownwardAccelerationMutation {
  readonly kind: typeof MOVEMENT_MUTATION_KIND.ACCELERATE_DOWNWARD;
  readonly participantId: string;
  readonly acceleration: number;
  readonly maximumSpeed: number;
}

export type MovementMutation =
  | MovementImpulseMutation
  | MovementVerticalSpeedMutation
  | MovementDownwardAccelerationMutation;

const IMPULSE_KEYS = new Set(['kind', 'participantId', 'impulse']);
const SPEED_KEYS = new Set(['kind', 'participantId', 'speed']);
const ACCELERATION_KEYS = new Set(['kind', 'participantId', 'acceleration', 'maximumSpeed']);
const VECTOR_KEYS = new Set(['x', 'y', 'z']);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function createMovementMutation(value: unknown): MovementMutation {
  const source = cloneFrozenData(value, 'MovementMutation') as Readonly<Record<string, unknown>>;
  if (source.kind === MOVEMENT_MUTATION_KIND.APPLY_IMPULSE) {
    assertKnownKeys(source, IMPULSE_KEYS, 'MovementMutation');
    assertKnownKeys(source.impulse, VECTOR_KEYS, 'MovementMutation.impulse');
    const { x, y, z } = source.impulse;
    if (!isFiniteNumber(x) || !isFiniteNumber(y) || y <= 0 || !isFiniteNumber(z)) {
      throw new RangeError('MovementMutation 跳跃冲量必须是有限向量且 y 为正数。');
    }
    return Object.freeze({
      kind: MOVEMENT_MUTATION_KIND.APPLY_IMPULSE,
      participantId: assertNonEmptyString(
        source.participantId,
        'MovementMutation.participantId',
      ),
      impulse: Object.freeze({
        x,
        y,
        z,
      }),
    });
  }
  if (source.kind === MOVEMENT_MUTATION_KIND.SET_VERTICAL_SPEED) {
    assertKnownKeys(source, SPEED_KEYS, 'MovementMutation');
    const speed = source.speed;
    if (!isFiniteNumber(speed) || speed >= 0) {
      throw new RangeError('MovementMutation 下砸速度必须是有限负数。');
    }
    return Object.freeze({
      kind: MOVEMENT_MUTATION_KIND.SET_VERTICAL_SPEED,
      participantId: assertNonEmptyString(
        source.participantId,
        'MovementMutation.participantId',
      ),
      speed,
    });
  }
  if (source.kind === MOVEMENT_MUTATION_KIND.ACCELERATE_DOWNWARD) {
    assertKnownKeys(source, ACCELERATION_KEYS, 'MovementMutation');
    const { acceleration, maximumSpeed } = source;
    if (!isFiniteNumber(acceleration) || acceleration <= 0) {
      throw new RangeError('MovementMutation 下砸加速度必须是正有限数。');
    }
    if (!isFiniteNumber(maximumSpeed) || maximumSpeed <= 0) {
      throw new RangeError('MovementMutation 下砸最大速度必须是正有限数。');
    }
    return Object.freeze({
      kind: MOVEMENT_MUTATION_KIND.ACCELERATE_DOWNWARD,
      participantId: assertNonEmptyString(
        source.participantId,
        'MovementMutation.participantId',
      ),
      acceleration,
      maximumSpeed,
    });
  }
  throw new RangeError(`MovementMutation.kind 不受支持：${String(source.kind)}。`);
}
