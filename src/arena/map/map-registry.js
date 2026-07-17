import { createMapDefinition } from './map-definition.js';

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export class MapRegistry {
  #definitions;

  constructor(definitions = []) {
    if (!Array.isArray(definitions)) throw new TypeError('MapRegistry definitions 必须是数组。');
    this.#definitions = new Map();
    for (const value of definitions) {
      const definition = createMapDefinition(value);
      if (this.#definitions.has(definition.id)) {
        throw new RangeError(`重复 MapDefinition ${definition.id}。`);
      }
      this.#definitions.set(definition.id, definition);
    }
    Object.freeze(this);
  }

  has(id) {
    return this.#definitions.has(id);
  }

  require(id) {
    const definition = this.#definitions.get(id);
    if (!definition) throw new RangeError(`未知 MapDefinition ${String(id)}。`);
    return definition;
  }

  list() {
    return Object.freeze([...this.#definitions.values()].sort((left, right) => (
      compareText(left.id, right.id)
    )));
  }
}
