import { createActionDefinition } from './action-definition.js';
import type { ActionDefinition } from './action-definition.js';

function compareIds(left: ActionDefinition, right: ActionDefinition): number {
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export class ActionRegistry {
  readonly #definitionsById: Map<string, ActionDefinition>;
  readonly #definitions: readonly ActionDefinition[];

  constructor(definitions: readonly unknown[] = []) {
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

  get size(): number { return this.#definitions.length; }
  has(id: string): boolean { return this.#definitionsById.has(id); }
  get(id: string): ActionDefinition | undefined { return this.#definitionsById.get(id); }

  require(id: string): ActionDefinition {
    const definition = this.get(id);
    if (!definition) throw new RangeError(`未知 ActionDefinition ${String(id)}。`);
    return definition;
  }

  list(): readonly ActionDefinition[] { return this.#definitions; }
}
