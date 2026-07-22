const LAYOUT_KEYS = new Set<PropertyKey>([
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
const VIEWPORT_KEYS = new Set<PropertyKey>(['width', 'height']);
const POINT_KEYS = new Set<PropertyKey>(['x', 'y', 'pointerId']);

export const ARENA_CONTROL_ID = Object.freeze({
  MOVE: 'move',
  PRIMARY: 'primary',
  JUMP: 'jump',
} as const);

export interface ArenaControlLayout {
  readonly moveZoneFraction: number;
  readonly joystickRadiusFraction: number;
  readonly minimumJoystickRadius: number;
  readonly maximumJoystickRadius: number;
  readonly actionButtonRadiusFraction: number;
  readonly minimumActionButtonRadius: number;
  readonly maximumActionButtonRadius: number;
  readonly primaryCenterXFraction: number;
  readonly primaryCenterYFraction: number;
  readonly jumpCenterXFraction: number;
  readonly jumpCenterYFraction: number;
}

export interface ArenaControlPoint {
  readonly x: number;
  readonly y: number;
  readonly pointerId: number;
}

export interface ArenaControlViewport {
  readonly width: number;
  readonly height: number;
}

export interface ArenaControlDelta {
  readonly x: number;
  readonly y: number;
  readonly rawX: number;
  readonly rawY: number;
  readonly magnitude: number;
  readonly rawMagnitude: number;
}

export type ArenaControlId = typeof ARENA_CONTROL_ID[keyof typeof ARENA_CONTROL_ID];

export const DEFAULT_ARENA_CONTROL_LAYOUT: Readonly<ArenaControlLayout> = Object.freeze({
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

function assertRecord(value: unknown, name: string): asserts value is object {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
}

function cloneKnownRecord(
  value: unknown,
  allowedKeys: ReadonlySet<PropertyKey>,
  name: string,
): Record<PropertyKey, unknown> {
  assertRecord(value, name);
  const result: Record<PropertyKey, unknown> = {};
  for (const key of Reflect.ownKeys(value)) {
    if (!allowedKeys.has(key)) throw new RangeError(`${name} 不支持字段 ${String(key)}。`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${name}.${String(key)} 不能是访问器。`);
    result[key] = descriptor.value;
  }
  return result;
}

function finiteNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} 必须是有限数。`);
  return value;
}

function positiveNumber(value: unknown, name: string): number {
  const number = finiteNumber(value, name);
  if (number <= 0) throw new RangeError(`${name} 必须大于 0。`);
  return number;
}

function clonePoint(value: unknown, name: string): ArenaControlPoint {
  const source = cloneKnownRecord(value, POINT_KEYS, name);
  if (!Number.isSafeInteger(source.pointerId) || (source.pointerId as number) < 0) {
    throw new RangeError(`${name}.pointerId 必须是非负安全整数。`);
  }
  return Object.freeze({
    x: finiteNumber(source.x, `${name}.x`),
    y: finiteNumber(source.y, `${name}.y`),
    pointerId: source.pointerId as number,
  });
}

function cloneViewport(value: unknown, name: string): ArenaControlViewport {
  const source = cloneKnownRecord(value, VIEWPORT_KEYS, name);
  return Object.freeze({
    width: positiveNumber(source.width, `${name}.width`),
    height: positiveNumber(source.height, `${name}.height`),
  });
}

export function createArenaControlLayout(overrides: unknown = {}): Readonly<ArenaControlLayout> {
  const source = cloneKnownRecord(overrides, LAYOUT_KEYS, 'ArenaControlLayout');
  const layout = { ...DEFAULT_ARENA_CONTROL_LAYOUT, ...source } as unknown as ArenaControlLayout;
  for (const field of [
    'moveZoneFraction',
    'joystickRadiusFraction',
    'actionButtonRadiusFraction',
    'primaryCenterXFraction',
    'primaryCenterYFraction',
    'jumpCenterXFraction',
    'jumpCenterYFraction',
  ] as const) {
    positiveNumber(layout[field], `ArenaControlLayout.${field}`);
    if (layout[field] >= 1) throw new RangeError(`ArenaControlLayout.${field} 必须小于 1。`);
  }
  for (const field of [
    'minimumJoystickRadius',
    'maximumJoystickRadius',
    'minimumActionButtonRadius',
    'maximumActionButtonRadius',
  ] as const) positiveNumber(layout[field], `ArenaControlLayout.${field}`);
  if (layout.maximumJoystickRadius < layout.minimumJoystickRadius) {
    throw new RangeError('ArenaControlLayout.maximumJoystickRadius 不能小于最小半径。');
  }
  if (layout.maximumActionButtonRadius < layout.minimumActionButtonRadius) {
    throw new RangeError('ArenaControlLayout.maximumActionButtonRadius 不能小于最小半径。');
  }
  return Object.freeze(layout);
}

function resolvedActionButtonRadius(
  viewport: ArenaControlViewport,
  definition: ArenaControlLayout,
): number {
  return Math.min(
    definition.maximumActionButtonRadius,
    Math.max(
      definition.minimumActionButtonRadius,
      Math.min(viewport.width, viewport.height) * definition.actionButtonRadiusFraction,
    ),
  );
}

function isInsideButton(
  point: ArenaControlPoint,
  viewport: ArenaControlViewport,
  definition: ArenaControlLayout,
  prefix: 'jump' | 'primary',
): boolean {
  const centerX = viewport.width * definition[`${prefix}CenterXFraction`];
  const centerY = viewport.height * definition[`${prefix}CenterYFraction`];
  return Math.hypot(point.x - centerX, point.y - centerY)
    <= resolvedActionButtonRadius(viewport, definition);
}

export function actionButtonRadius(
  viewportValue: unknown,
  layoutValue: unknown = DEFAULT_ARENA_CONTROL_LAYOUT,
): number {
  const viewport = cloneViewport(viewportValue, 'action button viewport');
  return resolvedActionButtonRadius(viewport, createArenaControlLayout(layoutValue));
}

export function controlAtPoint(
  pointValue: unknown,
  viewportValue: unknown,
  layoutValue: unknown = DEFAULT_ARENA_CONTROL_LAYOUT,
): ArenaControlId | null {
  const point = clonePoint(pointValue, 'control point');
  const viewport = cloneViewport(viewportValue, 'control viewport');
  const definition = createArenaControlLayout(layoutValue);
  if (point.x < 0 || point.y < 0 || point.x > viewport.width || point.y > viewport.height) return null;
  if (isInsideButton(point, viewport, definition, 'jump')) return ARENA_CONTROL_ID.JUMP;
  if (isInsideButton(point, viewport, definition, 'primary')) return ARENA_CONTROL_ID.PRIMARY;
  return point.x < viewport.width * definition.moveZoneFraction ? ARENA_CONTROL_ID.MOVE : null;
}

export function joystickRadius(
  viewportValue: unknown,
  layoutValue: unknown = DEFAULT_ARENA_CONTROL_LAYOUT,
): number {
  const viewport = cloneViewport(viewportValue, 'joystick viewport');
  const definition = createArenaControlLayout(layoutValue);
  return Math.min(
    definition.maximumJoystickRadius,
    Math.max(
      definition.minimumJoystickRadius,
      Math.min(viewport.width, viewport.height) * definition.joystickRadiusFraction,
    ),
  );
}

export function normalizedControlDelta(
  originValue: unknown,
  currentValue: unknown,
  radiusValue: unknown,
): Readonly<ArenaControlDelta> {
  const origin = clonePoint(originValue, 'control origin');
  const current = clonePoint(currentValue, 'control current');
  if (origin.pointerId !== current.pointerId) {
    throw new RangeError('control origin/current pointerId 必须一致。');
  }
  const radius = positiveNumber(radiusValue, 'control radius');
  const rawX = (current.x - origin.x) / radius;
  const rawY = (current.y - origin.y) / radius;
  const rawMagnitude = Math.hypot(rawX, rawY);
  const scale = rawMagnitude > 1 ? 1 / rawMagnitude : 1;
  return Object.freeze({
    x: rawX * scale,
    y: rawY * scale,
    rawX,
    rawY,
    magnitude: Math.min(1, rawMagnitude),
    rawMagnitude,
  });
}
