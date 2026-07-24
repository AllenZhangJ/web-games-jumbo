import {
  createInputPilotDefinition,
  type InputPilotDefinition,
} from './input-pilot-definition.js';

function compareIds(left: InputPilotDefinition, right: InputPilotDefinition): number {
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export class InputPilotRegistry {
  readonly #definitionsById: ReadonlyMap<string, InputPilotDefinition>;
  readonly #definitions: readonly InputPilotDefinition[];

  constructor(definitions: readonly unknown[] = []) {
    if (!Array.isArray(definitions)) {
      throw new TypeError('InputPilotRegistry definitions 必须是数组。');
    }
    const normalized = definitions.map(createInputPilotDefinition).sort(compareIds);
    const definitionsById = new Map<string, InputPilotDefinition>();
    for (const definition of normalized) {
      if (definitionsById.has(definition.id)) {
        throw new RangeError(`InputPilotRegistry 包含重复 id ${definition.id}。`);
      }
      definitionsById.set(definition.id, definition);
    }
    this.#definitionsById = definitionsById;
    this.#definitions = Object.freeze(normalized);
    Object.freeze(this);
  }

  get size(): number {
    return this.#definitions.length;
  }

  has(id: string): boolean {
    return this.#definitionsById.has(id);
  }

  require(id: string): InputPilotDefinition {
    const definition = this.#definitionsById.get(id);
    if (!definition) throw new RangeError(`未知 InputPilotDefinition ${String(id)}。`);
    return definition;
  }

  list(): readonly InputPilotDefinition[] {
    return this.#definitions;
  }
}
