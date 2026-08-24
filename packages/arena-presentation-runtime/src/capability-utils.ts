import { assertSynchronousReturn } from '@number-strategy-jump/arena-contracts';

export type UnknownMethod = (...args: unknown[]) => unknown;

export function assertCapabilityRecord(
  value: unknown,
  name: string,
): asserts value is Record<PropertyKey, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
}

export function assertCapabilityKnownKeys(
  value: unknown,
  allowed: ReadonlySet<PropertyKey>,
  name: string,
): void {
  assertCapabilityRecord(value, name);
  const unknown = Reflect.ownKeys(value).find((key) => !allowed.has(key));
  if (unknown !== undefined) throw new TypeError(`${name} 包含未知字段 ${String(unknown)}。`);
}

export function readCapabilityOwnData(
  value: unknown,
  field: PropertyKey,
  name: string,
  required = true,
): unknown {
  assertCapabilityRecord(value, name);
  const descriptor = Object.getOwnPropertyDescriptor(value, field);
  if (!descriptor) {
    if (!required) return undefined;
    throw new TypeError(`${name}.${String(field)} 缺失。`);
  }
  if (!Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${String(field)} 必须是数据字段。`);
  }
  return descriptor.value;
}

function snapshotMethodWithTraversal(
  value: unknown,
  name: string,
  methodName: string,
  required: boolean,
  bounded: boolean,
): UnknownMethod | null {
  assertCapabilityRecord(value, name);
  let owner: object | null = value;
  const visited = bounded ? new Set<object>() : null;
  let depth = 0;
  while (owner && (!visited || (depth < 32 && !visited.has(owner)))) {
    if (visited) {
      visited.add(owner);
      depth += 1;
    }
    const descriptor = Object.getOwnPropertyDescriptor(owner, methodName);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${methodName} 必须是数据方法。`);
      }
      const method = descriptor.value as UnknownMethod;
      return (...args: unknown[]) => method.call(value, ...args);
    }
    owner = Object.getPrototypeOf(owner) as object | null;
  }
  if (owner !== null && visited) throw new TypeError(`${name} 返回值原型链无效。`);
  if (!required) return null;
  throw new TypeError(`${name} 缺少 ${methodName}()。`);
}

export function snapshotMethod(value: unknown, name: string, methodName: string): UnknownMethod;
export function snapshotMethod(
  value: unknown,
  name: string,
  methodName: string,
  required: true,
): UnknownMethod;
export function snapshotMethod(
  value: unknown,
  name: string,
  methodName: string,
  required: false,
): UnknownMethod | null;
export function snapshotMethod(
  value: unknown,
  name: string,
  methodName: string,
  required = true,
): UnknownMethod | null {
  return snapshotMethodWithTraversal(value, name, methodName, required, true);
}

export function snapshotLegacyMethod(value: unknown, name: string, methodName: string): UnknownMethod;
export function snapshotLegacyMethod(
  value: unknown,
  name: string,
  methodName: string,
  required: true,
): UnknownMethod;
export function snapshotLegacyMethod(
  value: unknown,
  name: string,
  methodName: string,
  required: false,
): UnknownMethod | null;
export function snapshotLegacyMethod(
  value: unknown,
  name: string,
  methodName: string,
  required = true,
): UnknownMethod | null {
  return snapshotMethodWithTraversal(value, name, methodName, required, false);
}

export function rejectThenable(value: unknown, name: string): void {
  assertSynchronousReturn(value, name);
}

export function snapshotFunction(value: unknown, name: string): UnknownMethod {
  if (typeof value !== 'function') throw new TypeError(`${name} 必须是函数。`);
  return value as UnknownMethod;
}
