export function cloneKnownRecord(value, allowedKeys, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${name} 必须是普通对象。`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const result = {};
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!allowedKeys.has(key)) throw new RangeError(`${name} 不支持字段 ${key}。`);
    if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      throw new TypeError(`${name}.${key} 不能是访问器。`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

export function finiteNumber(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} 必须是有限数。`);
  return value;
}

export function positiveNumber(value, name) {
  const number = finiteNumber(value, name);
  if (number <= 0) throw new RangeError(`${name} 必须大于 0。`);
  return number;
}

export function integerAtLeast(value, minimum, name) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的安全整数。`);
  }
  return value;
}

export function clonePoint(value, name = 'point') {
  const source = cloneKnownRecord(value, new Set(['x', 'y', 'pointerId']), name);
  if (!Number.isSafeInteger(source.pointerId) || source.pointerId < 0) {
    throw new RangeError(`${name}.pointerId 必须是非负安全整数。`);
  }
  return {
    x: finiteNumber(source.x, `${name}.x`),
    y: finiteNumber(source.y, `${name}.y`),
    pointerId: source.pointerId,
  };
}

export function cloneViewport(value, name = 'viewport') {
  const source = cloneKnownRecord(value, new Set(['width', 'height']), name);
  return Object.freeze({
    width: positiveNumber(source.width, `${name}.width`),
    height: positiveNumber(source.height, `${name}.height`),
  });
}

export function nextRevision(value) {
  return value >= Number.MAX_SAFE_INTEGER ? 0 : value + 1;
}
