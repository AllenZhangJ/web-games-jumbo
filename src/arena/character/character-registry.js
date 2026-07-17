import { createCharacterDefinition } from './character-definition.js';
import { cloneFrozenData } from '../rules/definition-utils.js';

function compareIds(left, right) {
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export class CharacterRegistry {
  #definitionsById;
  #definitions;

  constructor(definitions = []) {
    const source = cloneFrozenData(definitions, 'CharacterRegistry definitions');
    if (!Array.isArray(source)) {
      throw new TypeError('CharacterRegistry definitions 必须是数组。');
    }
    const normalized = source.map(createCharacterDefinition).sort(compareIds);
    this.#definitionsById = new Map();
    for (const definition of normalized) {
      if (this.#definitionsById.has(definition.id)) {
        throw new RangeError(`CharacterRegistry 包含重复 id ${definition.id}。`);
      }
      this.#definitionsById.set(definition.id, definition);
    }
    this.#definitions = Object.freeze(normalized);
    Object.freeze(this);
  }

  get size() {
    return this.#definitions.length;
  }

  has(id) {
    return this.#definitionsById.has(id);
  }

  get(id) {
    return this.#definitionsById.get(id);
  }

  require(id) {
    const definition = this.get(id);
    if (!definition) throw new RangeError(`未知 CharacterDefinition ${String(id)}。`);
    return definition;
  }

  list() {
    return this.#definitions;
  }
}

export function assertCharacterRegistry(registry) {
  if (!registry || typeof registry !== 'object') {
    throw new TypeError('CharacterRegistry 必须是对象。');
  }
  for (const method of ['require', 'list']) {
    if (typeof registry[method] !== 'function') {
      throw new TypeError(`CharacterRegistry 缺少 ${method}()。`);
    }
  }
  return registry;
}

export function createCharacterRegistrySnapshot(registry) {
  const source = assertCharacterRegistry(registry);
  return new CharacterRegistry(source.list());
}
