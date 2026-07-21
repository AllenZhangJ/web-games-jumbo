import {
  cloneKnownRecord,
  clonePoint,
  cloneViewport,
  positiveNumber,
} from './input-validation.js';

export const ARENA_CONTROL_ID = Object.freeze({
  MOVE: 'move',
  PRIMARY: 'primary',
  JUMP: 'jump',
});

const LAYOUT_KEYS = new Set([
  'moveZoneFraction',
  'joystickRadiusFraction',
  'minimumJoystickRadius',
  'maximumJoystickRadius',
  'actionButtonRadiusFraction',
  'minimumActionButtonRadius',
  'maximumActionButtonRadius',
  'primaryCenterXFraction',
  'primaryCenterYFraction',
  'jumpCenterXFraction',
  'jumpCenterYFraction',
]);

export const DEFAULT_ARENA_CONTROL_LAYOUT = Object.freeze({
  moveZoneFraction: 0.58,
  joystickRadiusFraction: 0.14,
  minimumJoystickRadius: 48,
  maximumJoystickRadius: 140,
  actionButtonRadiusFraction: 0.092,
  minimumActionButtonRadius: 46,
  maximumActionButtonRadius: 76,
  primaryCenterXFraction: 0.84,
  primaryCenterYFraction: 0.76,
  jumpCenterXFraction: 0.68,
  jumpCenterYFraction: 0.86,
});

export function createArenaControlLayout(overrides = {}) {
  const source = cloneKnownRecord(overrides, LAYOUT_KEYS, 'ArenaControlLayout');
  const layout = { ...DEFAULT_ARENA_CONTROL_LAYOUT, ...source };
  for (const field of [
    'moveZoneFraction',
    'joystickRadiusFraction',
    'actionButtonRadiusFraction',
    'primaryCenterXFraction',
    'primaryCenterYFraction',
    'jumpCenterXFraction',
    'jumpCenterYFraction',
  ]) {
    positiveNumber(layout[field], `ArenaControlLayout.${field}`);
    if (layout[field] >= 1) {
      throw new RangeError(`ArenaControlLayout.${field} 必须小于 1。`);
    }
  }
  for (const field of [
    'minimumJoystickRadius',
    'maximumJoystickRadius',
    'minimumActionButtonRadius',
    'maximumActionButtonRadius',
  ]) {
    positiveNumber(layout[field], `ArenaControlLayout.${field}`);
  }
  if (layout.maximumJoystickRadius < layout.minimumJoystickRadius) {
    throw new RangeError('ArenaControlLayout.maximumJoystickRadius 不能小于最小半径。');
  }
  if (layout.maximumActionButtonRadius < layout.minimumActionButtonRadius) {
    throw new RangeError('ArenaControlLayout.maximumActionButtonRadius 不能小于最小半径。');
  }
  return Object.freeze(layout);
}

function resolvedActionButtonRadius(viewport, definition) {
  return Math.min(
    definition.maximumActionButtonRadius,
    Math.max(
      definition.minimumActionButtonRadius,
      Math.min(viewport.width, viewport.height) * definition.actionButtonRadiusFraction,
    ),
  );
}

function isInsideButton(point, viewport, definition, prefix) {
  const centerX = viewport.width * definition[`${prefix}CenterXFraction`];
  const centerY = viewport.height * definition[`${prefix}CenterYFraction`];
  return Math.hypot(point.x - centerX, point.y - centerY)
    <= resolvedActionButtonRadius(viewport, definition);
}

export function actionButtonRadius(viewport, layout = DEFAULT_ARENA_CONTROL_LAYOUT) {
  const size = cloneViewport(viewport, 'action button viewport');
  const definition = createArenaControlLayout(layout);
  return resolvedActionButtonRadius(size, definition);
}

export function controlAtPoint(point, viewport, layout = DEFAULT_ARENA_CONTROL_LAYOUT) {
  const value = clonePoint(point, 'control point');
  const size = cloneViewport(viewport, 'control viewport');
  const definition = createArenaControlLayout(layout);
  if (value.x < 0 || value.y < 0 || value.x > size.width || value.y > size.height) {
    return null;
  }
  if (isInsideButton(value, size, definition, 'jump')) return ARENA_CONTROL_ID.JUMP;
  if (isInsideButton(value, size, definition, 'primary')) return ARENA_CONTROL_ID.PRIMARY;
  return value.x < size.width * definition.moveZoneFraction ? ARENA_CONTROL_ID.MOVE : null;
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
