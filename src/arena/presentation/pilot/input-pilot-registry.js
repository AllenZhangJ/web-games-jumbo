import { createInputPilotDefinition } from './input-pilot-definition.js';

function compareIds(left, right) {
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export class InputPilotRegistry {
  #definitionsById;
  #definitions;

  constructor(definitions = []) {
    if (!Array.isArray(definitions)) {
      throw new TypeError('InputPilotRegistry definitions 必须是数组。');
    }
    const normalized = definitions.map(createInputPilotDefinition).sort(compareIds);
    this.#definitionsById = new Map();
    for (const definition of normalized) {
      if (this.#definitionsById.has(definition.id)) {
        throw new RangeError(`InputPilotRegistry 包含重复 id ${definition.id}。`);
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

  require(id) {
    const definition = this.#definitionsById.get(id);
    if (!definition) throw new RangeError(`未知 InputPilotDefinition ${String(id)}。`);
    return definition;
  }

  list() {
    return this.#definitions;
  }
}
