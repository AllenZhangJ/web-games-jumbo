import {
  createPresentationAssetDefinition,
} from './presentation-asset-definition.js';

function compareIds(left, right) {
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export class PresentationAssetRegistry {
  #definitionsById;
  #definitions;

  constructor(definitions = []) {
    if (!Array.isArray(definitions)) {
      throw new TypeError('PresentationAssetRegistry definitions 必须是数组。');
    }
    const normalized = definitions.map(createPresentationAssetDefinition).sort(compareIds);
    this.#definitionsById = new Map();
    for (const definition of normalized) {
      if (this.#definitionsById.has(definition.id)) {
        throw new RangeError(`PresentationAssetRegistry 包含重复 id ${definition.id}。`);
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
    return this.#definitionsById.get(id) ?? null;
  }

  require(id) {
    const definition = this.get(id);
    if (!definition) throw new RangeError(`未知 PresentationAssetDefinition ${String(id)}。`);
    return definition;
  }

  list() {
    return this.#definitions;
  }
}

export function assertPresentationAssetRegistry(value) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('PresentationAssetRegistry 必须是对象。');
  }
  for (const method of ['require', 'list']) {
    if (typeof value[method] !== 'function') {
      throw new TypeError(`PresentationAssetRegistry 缺少 ${method}()。`);
    }
  }
  return value;
}
