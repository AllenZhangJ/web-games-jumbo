import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../rules/definition-utils.js';

const ENTRY_KEYS = new Set(['id', 'version', 'validateParameters', 'createCase']);
const REFERENCE_KEYS = new Set(['id', 'version', 'parameters']);
const CASE_METHODS = Object.freeze([
  'getMetadata',
  'getSnapshot',
  'isComplete',
  'step',
  'exportResult',
  'destroy',
]);

function normalizeEntry(value, index) {
  const name = `SimulationWorkloadRegistry.entries[${index}]`;
  assertKnownKeys(value, ENTRY_KEYS, name);
  if (typeof value.validateParameters !== 'function') {
    throw new TypeError(`${name}.validateParameters 必须是函数。`);
  }
  if (typeof value.createCase !== 'function') throw new TypeError(`${name}.createCase 必须是函数。`);
  return Object.freeze({
    id: assertNonEmptyString(value.id, `${name}.id`),
    version: assertIntegerAtLeast(value.version, 1, `${name}.version`),
    validateParameters: value.validateParameters,
    createCase: value.createCase,
  });
}

export function assertSimulationCase(value, name = 'SimulationCase') {
  if (!value || typeof value !== 'object') throw new TypeError(`${name} 必须是对象。`);
  for (const method of CASE_METHODS) {
    if (typeof value[method] !== 'function') throw new TypeError(`${name}.${method} 必须是函数。`);
  }
  return value;
}

export class SimulationWorkloadRegistry {
  #entries;

  constructor(entries = []) {
    if (!Array.isArray(entries)) throw new TypeError('SimulationWorkloadRegistry entries 必须是数组。');
    this.#entries = new Map();
    for (let index = 0; index < entries.length; index += 1) {
      const entry = normalizeEntry(entries[index], index);
      if (this.#entries.has(entry.id)) {
        throw new RangeError(`SimulationWorkloadRegistry 包含重复 id ${entry.id}。`);
      }
      this.#entries.set(entry.id, entry);
    }
    Object.freeze(this);
  }

  require(referenceValue) {
    const reference = cloneFrozenData(referenceValue, 'SimulationWorkload reference');
    assertKnownKeys(reference, REFERENCE_KEYS, 'SimulationWorkload reference');
    const referenceId = assertNonEmptyString(reference.id, 'SimulationWorkload reference.id');
    const referenceVersion = assertIntegerAtLeast(
      reference.version,
      1,
      'SimulationWorkload reference.version',
    );
    const entry = this.#entries.get(referenceId);
    if (!entry) throw new RangeError(`未知 SimulationWorkload ${referenceId}。`);
    if (entry.version !== referenceVersion) {
      throw new RangeError(
        `SimulationWorkload ${entry.id} 版本 ${entry.version} 与 Definition ${referenceVersion} 不一致。`,
      );
    }
    entry.validateParameters(reference.parameters ?? {});
    return entry;
  }

  list() {
    return Object.freeze([...this.#entries.values()]
      .map(({ id, version }) => Object.freeze({ id, version }))
      .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)));
  }
}
