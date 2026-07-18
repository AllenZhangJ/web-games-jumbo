export function parseArenaStressIntegerOptions(values, definitions) {
  const result = Object.fromEntries(Object.entries(definitions).map(([name, definition]) => [
    name,
    definition.fallback,
  ]));
  const seen = new Set();
  for (const argument of values) {
    const match = argument.match(/^--([a-z0-9-]+)=(.+)$/);
    if (!match || !Object.prototype.hasOwnProperty.call(definitions, match[1])) {
      throw new Error(`未知参数 ${argument}。`);
    }
    const [name, raw] = [match[1], match[2]];
    if (seen.has(name)) throw new Error(`参数 --${name} 不能重复。`);
    seen.add(name);
    const definition = definitions[name];
    const value = Number(raw);
    const minimum = definition.minimum ?? 1;
    const maximum = definition.maximum ?? Number.MAX_SAFE_INTEGER;
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
      throw new RangeError(`${name} 必须是 ${minimum}～${maximum} 的安全整数。`);
    }
    result[name] = value;
  }
  return Object.freeze(result);
}
