import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import {
  createEquipmentSupplyDefinition,
  type EquipmentSupplyDefinition,
} from './equipment-supply-definition.js';

export interface EquipmentSupplyRegistryContract {
  readonly size: number;
  has(id: string): boolean;
  get(id: string): EquipmentSupplyDefinition | undefined;
  require(id: string): EquipmentSupplyDefinition;
  list(): readonly EquipmentSupplyDefinition[];
}

function compareIds(left: EquipmentSupplyDefinition, right: EquipmentSupplyDefinition): number {
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export class EquipmentSupplyRegistry implements EquipmentSupplyRegistryContract {
  readonly #definitionsById: Map<string, EquipmentSupplyDefinition>;
  readonly #definitions: readonly EquipmentSupplyDefinition[];

  constructor(definitions: unknown = []) {
    const source = cloneFrozenData(definitions, 'EquipmentSupplyRegistry definitions');
    if (!Array.isArray(source)) {
      throw new TypeError('EquipmentSupplyRegistry definitions 必须是数组。');
    }
    const normalized = source.map(createEquipmentSupplyDefinition).sort(compareIds);
    this.#definitionsById = new Map();
    for (const definition of normalized) {
      if (this.#definitionsById.has(definition.id)) {
        throw new RangeError(`EquipmentSupplyRegistry 包含重复 id ${definition.id}。`);
      }
      this.#definitionsById.set(definition.id, definition);
    }
    this.#definitions = Object.freeze(normalized);
    Object.freeze(this);
  }

  get size(): number { return this.#definitions.length; }
  has(id: string): boolean { return this.#definitionsById.has(id); }
  get(id: string): EquipmentSupplyDefinition | undefined { return this.#definitionsById.get(id); }

  require(id: string): EquipmentSupplyDefinition {
    const definition = this.get(id);
    if (!definition) throw new RangeError(`未知 EquipmentSupplyDefinition ${String(id)}。`);
    return definition;
  }

  list(): readonly EquipmentSupplyDefinition[] { return this.#definitions; }
}
