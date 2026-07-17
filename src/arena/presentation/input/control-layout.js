import {
  cloneKnownRecord,
  clonePoint,
  cloneViewport,
  positiveNumber,
} from './input-validation.js';

export const ARENA_CONTROL_ID = Object.freeze({
  MOVE: 'move',
  PRIMARY: 'primary',
});

const LAYOUT_KEYS = new Set([
  'moveZoneFraction',
  'joystickRadiusFraction',
  'minimumJoystickRadius',
  'maximumJoystickRadius',
]);

export const DEFAULT_ARENA_CONTROL_LAYOUT = Object.freeze({
  moveZoneFraction: 0.58,
  joystickRadiusFraction: 0.14,
  minimumJoystickRadius: 48,
  maximumJoystickRadius: 140,
});

export function createArenaControlLayout(overrides = {}) {
  const source = cloneKnownRecord(overrides, LAYOUT_KEYS, 'ArenaControlLayout');
  const layout = { ...DEFAULT_ARENA_CONTROL_LAYOUT, ...source };
  for (const field of ['moveZoneFraction', 'joystickRadiusFraction']) {
    positiveNumber(layout[field], `ArenaControlLayout.${field}`);
    if (layout[field] >= 1) {
      throw new RangeError(`ArenaControlLayout.${field} 必须小于 1。`);
    }
  }
  for (const field of ['minimumJoystickRadius', 'maximumJoystickRadius']) {
    positiveNumber(layout[field], `ArenaControlLayout.${field}`);
  }
  if (layout.maximumJoystickRadius < layout.minimumJoystickRadius) {
    throw new RangeError('ArenaControlLayout.maximumJoystickRadius 不能小于最小半径。');
  }
  return Object.freeze(layout);
}

export function controlAtPoint(point, viewport, layout = DEFAULT_ARENA_CONTROL_LAYOUT) {
  const value = clonePoint(point, 'control point');
  const size = cloneViewport(viewport, 'control viewport');
  const definition = createArenaControlLayout(layout);
  if (value.x < 0 || value.y < 0 || value.x > size.width || value.y > size.height) {
    return null;
  }
  return value.x < size.width * definition.moveZoneFraction
    ? ARENA_CONTROL_ID.MOVE
    : ARENA_CONTROL_ID.PRIMARY;
}

export function joystickRadius(viewport, layout = DEFAULT_ARENA_CONTROL_LAYOUT) {
  const size = cloneViewport(viewport, 'joystick viewport');
  const definition = createArenaControlLayout(layout);
  return Math.min(
    definition.maximumJoystickRadius,
    Math.max(
      definition.minimumJoystickRadius,
      Math.min(size.width, size.height) * definition.joystickRadiusFraction,
    ),
  );
}

export function normalizedControlDelta(origin, current, radius) {
  const start = clonePoint(origin, 'control origin');
  const end = clonePoint(current, 'control current');
  if (start.pointerId !== end.pointerId) {
    throw new RangeError('control origin/current pointerId 必须一致。');
  }
  const normalizedRadius = positiveNumber(radius, 'control radius');
  const rawX = (end.x - start.x) / normalizedRadius;
  const rawY = (end.y - start.y) / normalizedRadius;
  const magnitude = Math.hypot(rawX, rawY);
  const scale = magnitude > 1 ? 1 / magnitude : 1;
  return Object.freeze({
    x: rawX * scale,
    y: rawY * scale,
    rawX,
    rawY,
    magnitude: Math.min(1, magnitude),
    rawMagnitude: magnitude,
  });
}
