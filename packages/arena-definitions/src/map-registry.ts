import { createMapDefinition } from './map-definition.js';
import type { MapDefinition } from './map-definition.js';

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export class MapRegistry {
  readonly #definitions: Map<string, MapDefinition>;

  constructor(definitions: readonly unknown[] = []) {
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

  has(id: string): boolean {
    return this.#definitions.has(id);
  }

  require(id: string): MapDefinition {
    const definition = this.#definitions.get(id);
    if (!definition) throw new RangeError(`未知 MapDefinition ${String(id)}。`);
    return definition;
  }

  list(): readonly MapDefinition[] {
    return Object.freeze([...this.#definitions.values()].sort((left, right) => (
      compareText(left.id, right.id)
    )));
  }
}
