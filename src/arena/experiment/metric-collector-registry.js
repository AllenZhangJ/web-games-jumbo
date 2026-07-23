import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { createArenaExperimentDefinition } from '@number-strategy-jump/arena-experiment';

const ENTRY_KEYS = new Set(['id', 'version', 'validateParameters', 'create']);
const COLLECTOR_METHODS = Object.freeze([
  'beginCase',
  'observeStep',
  'completeCase',
  'failCase',
  'getResult',
  'destroy',
]);

function assertCollector(value, name) {
  if (!value || typeof value !== 'object') throw new TypeError(`${name} 必须是对象。`);
  for (const method of COLLECTOR_METHODS) {
    if (typeof value[method] !== 'function') throw new TypeError(`${name}.${method} 必须是函数。`);
  }
  return value;
}

function normalizeEntry(value, index) {
  const name = `MetricCollectorRegistry.entries[${index}]`;
  assertKnownKeys(value, ENTRY_KEYS, name);
  if (typeof value.create !== 'function') throw new TypeError(`${name}.create 必须是函数。`);
  if (
    value.validateParameters !== undefined
    && typeof value.validateParameters !== 'function'
  ) throw new TypeError(`${name}.validateParameters 必须是函数。`);
  return Object.freeze({
    id: assertNonEmptyString(value.id, `${name}.id`),
    version: assertIntegerAtLeast(value.version, 1, `${name}.version`),
    validateParameters: value.validateParameters ?? ((parameters) => {
      assertKnownKeys(parameters, new Set(), `${name} parameters`);
      return Object.freeze({});
    }),
    create: value.create,
  });
}

function validateCollectorParameters(entry, reference) {
  const validated = entry.validateParameters(reference.parameters ?? {});
  const parameters = cloneFrozenData(
    validated,
    `MetricCollector ${entry.id} validated parameters`,
  );
  assertPlainRecord(parameters, `MetricCollector ${entry.id} validated parameters`);
  return parameters;
}

export class MetricCollectorRegistry {
  #entries;

  constructor(entries = []) {
    if (!Array.isArray(entries)) throw new TypeError('MetricCollectorRegistry entries 必须是数组。');
    this.#entries = new Map();
    for (let index = 0; index < entries.length; index += 1) {
      const entry = normalizeEntry(entries[index], index);
      if (this.#entries.has(entry.id)) {
        throw new RangeError(`MetricCollectorRegistry 包含重复 id ${entry.id}。`);
      }
      this.#entries.set(entry.id, entry);
    }
    Object.freeze(this);
  }

  assertDefinition(definitionValue) {
    const definition = createArenaExperimentDefinition(definitionValue);
    for (const reference of definition.collectors) {
      const entry = this.#entries.get(reference.id);
      if (!entry) throw new RangeError(`未知 MetricCollector ${reference.id}。`);
      if (entry.version !== reference.version) {
        throw new RangeError(
          `MetricCollector ${entry.id} 版本 ${entry.version} 与 Definition ${reference.version} 不一致。`,
        );
      }
      validateCollectorParameters(entry, reference);
    }
    return definition;
  }

  createCollectors(definitionValue) {
    const definition = this.assertDefinition(definitionValue);
    const created = [];
    let pendingInstance = null;
    try {
      for (const reference of definition.collectors) {
        const entry = this.#entries.get(reference.id);
        const parameters = validateCollectorParameters(entry, reference);
        pendingInstance = entry.create({ definition, parameters });
        created.push(Object.freeze({
          id: entry.id,
          version: entry.version,
          instance: assertCollector(
            pendingInstance,
            `MetricCollector ${entry.id}`,
          ),
        }));
        pendingInstance = null;
      }
      return Object.freeze(created);
    } catch (error) {
      const cleanupErrors = [];
      if (pendingInstance && typeof pendingInstance.destroy === 'function') {
        try {
          pendingInstance.destroy();
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
        }
      }
      for (let index = created.length - 1; index >= 0; index -= 1) {
        try {
          created[index].instance.destroy();
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
        }
      }
      if (cleanupErrors.length > 0) {
        const combined = new Error('MetricCollector 构造失败且清理未完整完成。');
        combined.originalError = error;
        combined.cleanupErrors = cleanupErrors;
        throw combined;
      }
      throw error;
    }
  }

  list() {
    return Object.freeze([...this.#entries.values()]
      .map(({ id, version }) => Object.freeze({ id, version }))
      .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)));
  }
}
