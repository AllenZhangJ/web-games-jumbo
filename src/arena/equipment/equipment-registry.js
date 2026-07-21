import { createEquipmentDefinition } from './equipment-definition.js';

function compareIds(left, right) {
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export class EquipmentRegistry {
  #definitionsById;
  #definitions;

  constructor({ definitions = [], actionRegistry }) {
    if (!Array.isArray(definitions)) {
      throw new TypeError('EquipmentRegistry definitions 必须是数组。');
    }
    if (!actionRegistry || typeof actionRegistry.require !== 'function') {
      throw new TypeError('EquipmentRegistry 需要只读 ActionRegistry。');
    }
    const normalized = definitions.map(createEquipmentDefinition).sort(compareIds);
    this.#definitionsById = new Map();
    for (const definition of normalized) {
      if (this.#definitionsById.has(definition.id)) {
        throw new RangeError(`EquipmentRegistry 包含重复 id ${definition.id}。`);
      }
      actionRegistry.require(definition.actionDefinitionId);
      actionRegistry.require(definition.aerialActionDefinitionId);
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
    if (!definition) throw new RangeError(`未知 EquipmentDefinition ${String(id)}。`);
    return definition;
  }

  list() {
    return this.#definitions;
  }
}
