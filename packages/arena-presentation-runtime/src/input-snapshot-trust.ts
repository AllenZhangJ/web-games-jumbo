const rawControlSnapshots = new WeakSet<object>();
const gestureSnapshots = new WeakSet<object>();
const mapperAffordances = new WeakSet<object>();
const mappedSemanticInputs = new WeakSet<object>();

function isObject(value: unknown): value is object {
  return value !== null && typeof value === 'object';
}

export function trustRawControlSnapshot<T extends object>(value: T): T {
  rawControlSnapshots.add(value);
  return value;
}

export function isTrustedRawControlSnapshot(value: unknown): value is object {
  return isObject(value) && rawControlSnapshots.has(value);
}

export function trustGestureSnapshot<T extends object>(value: T): T {
  gestureSnapshots.add(value);
  return value;
}

export function isTrustedGestureSnapshot(value: unknown): value is object {
  return isObject(value) && gestureSnapshots.has(value);
}

export function trustMapperAffordance<T extends object>(value: T): T {
  mapperAffordances.add(value);
  return value;
}

export function isTrustedMapperAffordance(value: unknown): value is object {
  return isObject(value) && mapperAffordances.has(value);
}

export function trustMappedSemanticInput<T extends object>(value: T): T {
  mappedSemanticInputs.add(value);
  return value;
}

export function isTrustedMappedSemanticInput(value: unknown): value is object {
  return isObject(value) && mappedSemanticInputs.has(value);
}
