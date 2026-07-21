import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import { createCharacterDefinition } from './character-definition.js';
import type { CharacterDefinition } from './character-definition.js';

export interface CharacterRegistryContract {
  require(id: string): CharacterDefinition;
  list(): readonly CharacterDefinition[];
}

function compareIds(left: CharacterDefinition, right: CharacterDefinition): number {
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export class CharacterRegistry implements CharacterRegistryContract {
  readonly #definitionsById: Map<string, CharacterDefinition>;
  readonly #definitions: readonly CharacterDefinition[];

  constructor(definitions: readonly unknown[] = []) {
    const source = cloneFrozenData(definitions, 'CharacterRegistry definitions');
    if (!Array.isArray(source)) throw new TypeError('CharacterRegistry definitions 必须是数组。');
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

  get size(): number { return this.#definitions.length; }
  has(id: string): boolean { return this.#definitionsById.has(id); }
  get(id: string): CharacterDefinition | undefined { return this.#definitionsById.get(id); }

  require(id: string): CharacterDefinition {
    const definition = this.get(id);
    if (!definition) throw new RangeError(`未知 CharacterDefinition ${String(id)}。`);
    return definition;
  }

  list(): readonly CharacterDefinition[] { return this.#definitions; }
}

export function assertCharacterRegistry(registry: unknown): CharacterRegistryContract {
  if (!registry || typeof registry !== 'object') {
    throw new TypeError('CharacterRegistry 必须是对象。');
  }
  const candidate = registry as Record<string, unknown>;
  for (const method of ['require', 'list']) {
    if (typeof candidate[method] !== 'function') {
      throw new TypeError(`CharacterRegistry 缺少 ${method}()。`);
    }
  }
  return registry as CharacterRegistryContract;
}

export function createCharacterRegistrySnapshot(registry: unknown): CharacterRegistry {
  const source = assertCharacterRegistry(registry);
  return new CharacterRegistry(source.list());
}
