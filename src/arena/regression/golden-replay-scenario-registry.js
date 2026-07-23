import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_GOLDEN_REPLAY_CATEGORY } from '@number-strategy-jump/arena-regression';

const ENTRY_KEYS = new Set([
  'id',
  'version',
  'category',
  'file',
  'createReplay',
  'assertReplay',
]);
const CATEGORIES = new Set(Object.values(ARENA_GOLDEN_REPLAY_CATEGORY));
const ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const FILE_PATTERN = /^(?:equipment|map|movement|lifecycle|regression)-[a-z0-9]+(?:-[a-z0-9]+)*\.json$/;

function normalizeEntry(value, index) {
  const name = `ArenaGoldenReplayScenarioRegistry.entries[${index}]`;
  assertKnownKeys(value, ENTRY_KEYS, name);
  const id = assertNonEmptyString(value.id, `${name}.id`);
  if (!ID_PATTERN.test(id)) throw new RangeError(`${name}.id 格式无效。`);
  const category = value.category;
  if (!CATEGORIES.has(category)) {
    throw new RangeError(`${name}.category 不受支持：${String(category)}。`);
  }
  if (
    typeof value.file !== 'string'
    || !FILE_PATTERN.test(value.file)
    || !value.file.startsWith(`${category}-`)
  ) throw new RangeError(`${name}.file 不是安全的 category JSON 文件名。`);
  for (const method of ['createReplay', 'assertReplay']) {
    if (typeof value[method] !== 'function') throw new TypeError(`${name}.${method} 必须是函数。`);
  }
  return Object.freeze({
    id,
    version: assertIntegerAtLeast(value.version, 1, `${name}.version`),
    category,
    file: value.file,
    createReplay: value.createReplay,
    assertReplay: value.assertReplay,
  });
}

export class ArenaGoldenReplayScenarioRegistry {
  #entries;

  constructor(entries) {
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new RangeError('ArenaGoldenReplayScenarioRegistry entries 必须是非空数组。');
    }
    this.#entries = new Map();
    const files = new Set();
    entries.forEach((value, index) => {
      const entry = normalizeEntry(value, index);
      if (this.#entries.has(entry.id)) throw new RangeError(`黄金回放场景重复 id ${entry.id}。`);
      if (files.has(entry.file)) throw new RangeError(`黄金回放场景重复 file ${entry.file}。`);
      this.#entries.set(entry.id, entry);
      files.add(entry.file);
    });
    Object.freeze(this);
  }

  require(reference) {
    if (!reference || typeof reference !== 'object') {
      throw new TypeError('黄金回放场景 reference 必须是对象。');
    }
    const entry = this.#entries.get(reference.id);
    if (!entry) throw new RangeError(`未知黄金回放场景 ${String(reference.id)}。`);
    if (entry.version !== reference.version) {
      throw new RangeError(
        `黄金回放场景 ${entry.id} 版本 ${entry.version} 与 ${String(reference.version)} 不一致。`,
      );
    }
    return entry;
  }

  list() {
    return Object.freeze([...this.#entries.values()]
      .map(({ id, version, category, file }) => Object.freeze({
        id,
        version,
        category,
        file,
      }))
      .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)));
  }
}
