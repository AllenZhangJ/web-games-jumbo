export interface PresentationInputPoint {
  x: number;
  y: number;
  pointerId: number;
}

export interface PresentationInputViewport {
  readonly width: number;
  readonly height: number;
  readonly safeAreaInsets?: Readonly<PresentationSafeAreaInsets>;
}

export interface PresentationSafeAreaInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export function cloneKnownRecord(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  name: string,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const symbols = Object.getOwnPropertySymbols(value);
  if (symbols.length > 0) throw new RangeError(`${name} 不支持 Symbol 字段。`);
  const result: Record<string, unknown> = {};
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!allowedKeys.has(key)) throw new RangeError(`${name} 不支持字段 ${key}。`);
    if (!Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key} 不能是访问器。`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

export function finiteNumber(value: unknown, name: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`${name} 必须是有限数。`);
  return value as number;
}

export function positiveNumber(value: unknown, name: string): number {
  const number = finiteNumber(value, name);
  if (number <= 0) throw new RangeError(`${name} 必须大于 0。`);
  return number;
}

export function integerAtLeast(value: unknown, minimum: number, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的安全整数。`);
  }
  return value as number;
}

const POINT_KEYS = new Set(['x', 'y', 'pointerId']);
const VIEWPORT_KEYS = new Set(['width', 'height', 'safeAreaInsets']);
const SAFE_AREA_INSET_KEYS = new Set(['top', 'right', 'bottom', 'left']);

export const ZERO_PRESENTATION_SAFE_AREA_INSETS: Readonly<PresentationSafeAreaInsets> = Object.freeze({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
});

function nonNegativeNumber(value: unknown, name: string): number {
  const number = finiteNumber(value, name);
  if (number < 0) throw new RangeError(`${name} 必须大于等于 0。`);
  return number;
}

function cloneSafeAreaInsets(value: unknown, name: string): Readonly<PresentationSafeAreaInsets> {
  const source = cloneKnownRecord(value, SAFE_AREA_INSET_KEYS, name);
  return Object.freeze({
    top: nonNegativeNumber(source.top, `${name}.top`),
    right: nonNegativeNumber(source.right, `${name}.right`),
    bottom: nonNegativeNumber(source.bottom, `${name}.bottom`),
    left: nonNegativeNumber(source.left, `${name}.left`),
  });
}

export function clonePoint(value: unknown, name = 'point'): PresentationInputPoint {
  const source = cloneKnownRecord(value, POINT_KEYS, name);
  const pointerId = integerAtLeast(source.pointerId, 0, `${name}.pointerId`);
  return {
    x: finiteNumber(source.x, `${name}.x`),
    y: finiteNumber(source.y, `${name}.y`),
    pointerId,
  };
}

export function cloneViewport(value: unknown, name = 'viewport'): PresentationInputViewport {
  const source = cloneKnownRecord(value, VIEWPORT_KEYS, name);
  const width = positiveNumber(source.width, `${name}.width`);
  const height = positiveNumber(source.height, `${name}.height`);
  if (!Object.hasOwn(source, 'safeAreaInsets')) return Object.freeze({ width, height });
  const safeAreaInsets = cloneSafeAreaInsets(source.safeAreaInsets, `${name}.safeAreaInsets`);
  if (safeAreaInsets.left + safeAreaInsets.right >= width) {
    throw new RangeError(`${name}.safeAreaInsets 左右之和必须小于 viewport.width。`);
  }
  if (safeAreaInsets.top + safeAreaInsets.bottom >= height) {
    throw new RangeError(`${name}.safeAreaInsets 上下之和必须小于 viewport.height。`);
  }
  return Object.freeze({ width, height, safeAreaInsets });
}

export function resolvedPresentationSafeAreaInsets(
  viewport: PresentationInputViewport,
): Readonly<PresentationSafeAreaInsets> {
  return viewport.safeAreaInsets ?? ZERO_PRESENTATION_SAFE_AREA_INSETS;
}

export function nextRevision(value: number): number {
  return value >= Number.MAX_SAFE_INTEGER ? 0 : value + 1;
}
