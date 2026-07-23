import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_GOLDEN_REPLAY_CATEGORY,
  type ArenaGoldenReplayCategory,
} from './golden-replay-manifest.js';

const ENTRY_KEYS: ReadonlySet<string> = new Set([
  'id', 'version', 'category', 'file', 'createReplay', 'assertReplay',
]);
const CATEGORIES: ReadonlySet<unknown> = new Set(Object.values(ARENA_GOLDEN_REPLAY_CATEGORY));
const ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const FILE_PATTERN = /^(?:equipment|map|movement|lifecycle|regression)-[a-z0-9]+(?:-[a-z0-9]+)*\.json$/;

export interface ArenaGoldenReplayScenarioReference {
  readonly id: string;
  readonly version: number;
}
export interface ArenaGoldenReplayScenarioEntry extends ArenaGoldenReplayScenarioReference {
  readonly category: ArenaGoldenReplayCategory;
  readonly file: string;
  readonly createReplay: () => unknown;
  readonly assertReplay: (replay: unknown) => unknown;
}

function snapshotEntries(value: unknown): readonly unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RangeError('ArenaGoldenReplayScenarioRegistry entries 必须是非空数组。');
  }
  const result: unknown[] = [];
  const expectedKeys = new Set<string>(['length']);
  for (let index = 0; index < value.length; index += 1) {
    const key = String(index);
    expectedKeys.add(key);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      throw new TypeError(`ArenaGoldenReplayScenarioRegistry.entries[${index}] 必须是可枚举数据字段。`);
    }
    result.push(descriptor.value);
  }
  if (Reflect.ownKeys(value).some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
    throw new TypeError('ArenaGoldenReplayScenarioRegistry entries 不能包含额外字段。');
  }
  return Object.freeze(result);
}
function normalizeEntry(value: unknown, index: number): Readonly<ArenaGoldenReplayScenarioEntry> {
  const name = `ArenaGoldenReplayScenarioRegistry.entries[${index}]`;
  assertKnownKeys(value, ENTRY_KEYS, name);
  const id = assertNonEmptyString(value.id, `${name}.id`);
  if (!ID_PATTERN.test(id)) throw new RangeError(`${name}.id 格式无效。`);
  if (!CATEGORIES.has(value.category)) {
    throw new RangeError(`${name}.category 不受支持：${String(value.category)}。`);
  }
  const category = value.category as ArenaGoldenReplayCategory;
  if (
    typeof value.file !== 'string' || !FILE_PATTERN.test(value.file)
    || !value.file.startsWith(`${category}-`)
  ) throw new RangeError(`${name}.file 不是安全的 category JSON 文件名。`);
  if (typeof value.createReplay !== 'function') throw new TypeError(`${name}.createReplay 必须是函数。`);
  if (typeof value.assertReplay !== 'function') throw new TypeError(`${name}.assertReplay 必须是函数。`);
  return Object.freeze({
    id,
    version: assertIntegerAtLeast(value.version, 1, `${name}.version`),
    category,
    file: value.file,
    createReplay: value.createReplay as ArenaGoldenReplayScenarioEntry['createReplay'],
    assertReplay: value.assertReplay as ArenaGoldenReplayScenarioEntry['assertReplay'],
  });
}

export class ArenaGoldenReplayScenarioRegistry {
  readonly #entries: ReadonlyMap<string, Readonly<ArenaGoldenReplayScenarioEntry>>;

  constructor(entries: unknown) {
    const source = snapshotEntries(entries);
    const normalizedEntries = new Map<string, Readonly<ArenaGoldenReplayScenarioEntry>>();
    const files = new Set<string>();
    source.forEach((value, index) => {
      const entry = normalizeEntry(value, index);
      if (normalizedEntries.has(entry.id)) throw new RangeError(`黄金回放场景重复 id ${entry.id}。`);
      if (files.has(entry.file)) throw new RangeError(`黄金回放场景重复 file ${entry.file}。`);
      normalizedEntries.set(entry.id, entry);
      files.add(entry.file);
    });
    this.#entries = normalizedEntries;
    Object.freeze(this);
  }

  require(reference: unknown): Readonly<ArenaGoldenReplayScenarioEntry> {
    const record = assertPlainRecord(reference, '黄金回放场景 reference');
    const idDescriptor = Object.getOwnPropertyDescriptor(record, 'id');
    const versionDescriptor = Object.getOwnPropertyDescriptor(record, 'version');
    if (!idDescriptor || !Object.prototype.hasOwnProperty.call(idDescriptor, 'value')) {
      throw new TypeError('黄金回放场景 reference.id 必须是数据字段。');
    }
    if (!versionDescriptor || !Object.prototype.hasOwnProperty.call(versionDescriptor, 'value')) {
      throw new TypeError('黄金回放场景 reference.version 必须是数据字段。');
    }
    const referenceId = String(idDescriptor.value);
    const referenceVersion = versionDescriptor.value;
    const entry = this.#entries.get(referenceId);
    if (!entry) throw new RangeError(`未知黄金回放场景 ${referenceId}。`);
    if (entry.version !== referenceVersion) {
      throw new RangeError(`黄金回放场景 ${entry.id} 版本 ${entry.version} 与 ${String(referenceVersion)} 不一致。`);
    }
    return entry;
  }

  list(): readonly Readonly<Omit<ArenaGoldenReplayScenarioEntry, 'createReplay' | 'assertReplay'>>[] {
    return Object.freeze([...this.#entries.values()]
      .map(({ id, version, category, file }) => Object.freeze({ id, version, category, file }))
      .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)));
  }
}
