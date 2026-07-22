export interface PresentationInputPoint {
  x: number;
  y: number;
  pointerId: number;
}

export interface PresentationInputViewport {
  readonly width: number;
  readonly height: number;
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
const VIEWPORT_KEYS = new Set(['width', 'height']);

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
  return Object.freeze({
    width: positiveNumber(source.width, `${name}.width`),
    height: positiveNumber(source.height, `${name}.height`),
  });
}

export function nextRevision(value: number): number {
  return value >= Number.MAX_SAFE_INTEGER ? 0 : value + 1;
}
