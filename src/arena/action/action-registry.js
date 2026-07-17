import { createActionDefinition } from './action-definition.js';

function compareIds(left, right) {
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export class ActionRegistry {
  #definitionsById;
  #definitions;

  constructor(definitions = []) {
    if (!Array.isArray(definitions)) throw new TypeError('ActionRegistry definitions 必须是数组。');
    const normalized = definitions.map(createActionDefinition).sort(compareIds);
    this.#definitionsById = new Map();
    for (const definition of normalized) {
      if (this.#definitionsById.has(definition.id)) {
        throw new RangeError(`ActionRegistry 包含重复 id ${definition.id}。`);
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
    if (!definition) throw new RangeError(`未知 ActionDefinition ${String(id)}。`);
    return definition;
  }

  list() {
    return this.#definitions;
  }
}
