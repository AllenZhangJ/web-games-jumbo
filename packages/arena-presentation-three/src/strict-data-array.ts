export function readDataArray(
  value: unknown,
  name: string,
  { nonEmpty = false }: Readonly<{ nonEmpty?: boolean }> = {},
): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} 必须是数组。`);
  if (nonEmpty && value.length === 0) throw new RangeError(`${name} 不能为空。`);
  const expectedKeys = new Set<PropertyKey>(['length']);
  const result: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const key = String(index);
    expectedKeys.add(key);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name} 不能包含空槽或访问器。`);
    }
    result.push(descriptor.value);
  }
  if (Reflect.ownKeys(value).some((key) => !expectedKeys.has(key))) {
    throw new TypeError(`${name} 不能包含额外字段。`);
  }
  return Object.freeze(result);
}
