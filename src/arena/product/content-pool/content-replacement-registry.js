import {
  MATCH_CONTENT_KIND,
  createContentReplacementDefinition,
} from './content-replacement-definition.js';
import { assertNonEmptyString } from '../../rules/definition-utils.js';

function normalizeDefinitions(values) {
  if (!Array.isArray(values)) {
    throw new TypeError('ContentReplacementRegistry definitions 必须是数组。');
  }
  const keys = Reflect.ownKeys(values);
  const expectedKeys = new Set(['length']);
  const definitions = [];
  for (let index = 0; index < values.length; index += 1) {
    expectedKeys.add(String(index));
    const descriptor = Object.getOwnPropertyDescriptor(values, String(index));
    if (
      !descriptor
      || !descriptor.enumerable
      || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) {
      throw new TypeError(
        'ContentReplacementRegistry definitions 不能包含空槽或访问器。',
      );
    }
    definitions.push(createContentReplacementDefinition(descriptor.value));
  }
  if (keys.some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
    throw new TypeError('ContentReplacementRegistry definitions 不能包含额外字段。');
  }
  return definitions.sort((left, right) => (
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  ));
}

function replacementKey(kind, contentId) {
  return `${kind}:${contentId}`;
}

export class ContentReplacementRegistry {
  #definitions;
  #bySource;

  constructor(definitions = []) {
    const normalized = normalizeDefinitions(definitions);
    const ids = new Set();
    const bySource = new Map();
    for (const definition of normalized) {
      if (ids.has(definition.id)) {
        throw new RangeError(`ContentReplacementRegistry 重复 id ${definition.id}。`);
      }
      ids.add(definition.id);
      const key = replacementKey(definition.kind, definition.retiredId);
      if (bySource.has(key)) {
        throw new RangeError(`ContentReplacementRegistry 重复来源 ${key}。`);
      }
      bySource.set(key, definition);
    }
    for (const definition of normalized) {
      const visited = new Set();
      let currentId = definition.retiredId;
      while (bySource.has(replacementKey(definition.kind, currentId))) {
        const key = replacementKey(definition.kind, currentId);
        if (visited.has(key)) throw new RangeError('ContentReplacementRegistry 存在替换环。');
        visited.add(key);
        currentId = bySource.get(key).replacementId;
      }
    }
    this.#definitions = Object.freeze(normalized);
    this.#bySource = bySource;
    Object.freeze(this);
  }

  resolve(kind, retiredId) {
    if (!Object.values(MATCH_CONTENT_KIND).includes(kind)) {
      throw new RangeError(`ContentReplacementRegistry 不支持 kind ${String(kind)}。`);
    }
    let currentId = retiredId;
    assertNonEmptyString(currentId, 'ContentReplacementRegistry retiredId');
    let replaced = false;
    while (this.#bySource.has(replacementKey(kind, currentId))) {
      replaced = true;
      currentId = this.#bySource.get(replacementKey(kind, currentId)).replacementId;
    }
    return replaced ? currentId : null;
  }

  list() {
    return this.#definitions;
  }
}

export function createContentReplacementRegistry(value = []) {
  return value instanceof ContentReplacementRegistry
    ? value
    : new ContentReplacementRegistry(value);
}
