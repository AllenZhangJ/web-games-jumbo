import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../rules/definition-utils.js';

export const MOVEMENT_MUTATION_KIND = Object.freeze({
  APPLY_IMPULSE: 'apply-impulse',
  SET_VERTICAL_SPEED: 'set-vertical-speed',
});

const IMPULSE_KEYS = new Set(['kind', 'participantId', 'impulse']);
const SPEED_KEYS = new Set(['kind', 'participantId', 'speed']);
const VECTOR_KEYS = new Set(['x', 'y', 'z']);

export function createMovementMutation(value) {
  const source = cloneFrozenData(value, 'MovementMutation');
  if (source.kind === MOVEMENT_MUTATION_KIND.APPLY_IMPULSE) {
    assertKnownKeys(source, IMPULSE_KEYS, 'MovementMutation');
    assertKnownKeys(source.impulse, VECTOR_KEYS, 'MovementMutation.impulse');
    if (
      source.impulse.x !== 0
      || !Number.isFinite(source.impulse.y)
      || source.impulse.y <= 0
      || source.impulse.z !== 0
    ) {
      throw new RangeError('MovementMutation 竖直冲量必须是有限正数且 x/z 为 0。');
    }
    return Object.freeze({
      kind: source.kind,
      participantId: assertNonEmptyString(
        source.participantId,
        'MovementMutation.participantId',
      ),
      impulse: Object.freeze({ x: 0, y: source.impulse.y, z: 0 }),
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
  throw new RangeError(`MovementMutation.kind 不受支持：${String(source.kind)}。`);
}
