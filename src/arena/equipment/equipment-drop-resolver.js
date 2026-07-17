import { assertKnownKeys } from '../rules/definition-utils.js';

const DROP_KEYS = new Set(['lastSafePosition', 'originPosition', 'isPositionValid']);

function clonePosition(value, name) {
  if (
    !value
    || !Number.isFinite(value.x)
    || !Number.isFinite(value.y)
    || !Number.isFinite(value.z)
  ) throw new TypeError(`${name} 必须是有限三维位置。`);
  return Object.freeze({ x: value.x, y: value.y, z: value.z });
}

export function resolveEquipmentDrop(options) {
  assertKnownKeys(options, DROP_KEYS, 'EquipmentDropResolver options');
  const { lastSafePosition, originPosition, isPositionValid } = options;
  if (typeof isPositionValid !== 'function') {
    throw new TypeError('EquipmentDropResolver 需要 isPositionValid。');
  }
  const lastSafe = clonePosition(lastSafePosition, 'lastSafePosition');
  const origin = clonePosition(originPosition, 'originPosition');
  const lastSafeValid = isPositionValid(lastSafe);
  if (typeof lastSafeValid !== 'boolean') {
    throw new TypeError('isPositionValid 必须返回布尔值。');
  }
  if (lastSafeValid) {
    return Object.freeze({
      position: lastSafe,
      fallbackUsed: false,
      diagnosticCode: null,
    });
  }
  const originValid = isPositionValid(origin);
  if (typeof originValid !== 'boolean') {
    throw new TypeError('isPositionValid 必须返回布尔值。');
  }
  return Object.freeze({
    position: origin,
    fallbackUsed: true,
    diagnosticCode: originValid
      ? 'equipment-drop-fallback-origin-spawn'
      : 'equipment-drop-fallback-origin-spawn-invalid',
  });
}
