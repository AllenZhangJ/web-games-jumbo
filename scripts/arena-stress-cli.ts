export interface ArenaStressIntegerOptionDefinition {
  readonly fallback: number;
  readonly minimum?: number;
  readonly maximum?: number;
}

export function parseArenaStressIntegerOptions<
  T extends Readonly<Record<string, ArenaStressIntegerOptionDefinition>>,
>(values: readonly string[], definitions: T): Readonly<{ [K in keyof T]: number }> {
  const result: Record<string, number> = Object.fromEntries(
    Object.entries(definitions).map(([name, definition]) => [
    name,
    definition.fallback,
    ]),
  );
  const seen = new Set<string>();
  for (const argument of values) {
    const match = argument.match(/^--([a-z0-9-]+)=(.+)$/);
    const name = match?.[1];
    const raw = match?.[2];
    if (!name || raw === undefined || !Object.prototype.hasOwnProperty.call(definitions, name)) {
      throw new Error(`未知参数 ${argument}。`);
    }
    if (seen.has(name)) throw new Error(`参数 --${name} 不能重复。`);
    seen.add(name);
    const definition = definitions[name];
    if (!definition) throw new Error(`参数 --${name} 缺少定义。`);
    const value = Number(raw);
    const minimum = definition.minimum ?? 1;
    const maximum = definition.maximum ?? Number.MAX_SAFE_INTEGER;
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
      throw new RangeError(`${name} 必须是 ${minimum}～${maximum} 的安全整数。`);
    }
    result[name] = value;
  }
  return Object.freeze(result) as Readonly<{ [K in keyof T]: number }>;
}
