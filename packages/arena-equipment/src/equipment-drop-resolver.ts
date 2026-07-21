import { assertKnownKeys } from '@number-strategy-jump/arena-contracts';
import type { EquipmentPosition } from './equipment-runtime.js';

const DROP_KEYS = new Set(['lastSafePosition', 'originPosition', 'isPositionValid']);

export interface EquipmentDropResolution {
  readonly position: Readonly<EquipmentPosition> | null;
  readonly fallbackUsed: boolean;
  readonly despawned: boolean;
  readonly diagnosticCode:
    | 'equipment-drop-fallback-origin-spawn'
    | 'equipment-drop-no-valid-position'
    | null;
}

function clonePosition(value: unknown, name: string): Readonly<EquipmentPosition> {
  const position = value as Partial<EquipmentPosition> | null;
  if (
    !position
    || !Number.isFinite(position.x)
    || !Number.isFinite(position.y)
    || !Number.isFinite(position.z)
  ) throw new TypeError(`${name} 必须是有限三维位置。`);
  return Object.freeze({
    x: position.x as number,
    y: position.y as number,
    z: position.z as number,
  });
}

export function resolveEquipmentDrop(options: unknown): EquipmentDropResolution {
  assertKnownKeys(options, DROP_KEYS, 'EquipmentDropResolver options');
  const { lastSafePosition, originPosition, isPositionValid } = options;
  if (typeof isPositionValid !== 'function') {
    throw new TypeError('EquipmentDropResolver 需要 isPositionValid。');
  }
  const lastSafe = clonePosition(lastSafePosition, 'lastSafePosition');
  const origin = clonePosition(originPosition, 'originPosition');
  const validatePosition = isPositionValid as (position: Readonly<EquipmentPosition>) => unknown;
  const lastSafeValid = validatePosition(lastSafe);
  if (typeof lastSafeValid !== 'boolean') {
    throw new TypeError('isPositionValid 必须返回布尔值。');
  }
  if (lastSafeValid) {
    return Object.freeze({
      position: lastSafe,
      fallbackUsed: false,
      despawned: false,
      diagnosticCode: null,
    });
  }
  const originValid = validatePosition(origin);
  if (typeof originValid !== 'boolean') {
    throw new TypeError('isPositionValid 必须返回布尔值。');
  }
  return Object.freeze({
    position: originValid ? origin : null,
    fallbackUsed: true,
    despawned: !originValid,
    diagnosticCode: originValid
      ? 'equipment-drop-fallback-origin-spawn'
      : 'equipment-drop-no-valid-position',
  });
}
