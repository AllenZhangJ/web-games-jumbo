import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import {
  createBotProfileDefinition,
  type BotProfileDefinition,
} from './bot-profile-definition.js';

export interface BotProfileRegistryContract {
  has(id: string): boolean;
  get(id: string): BotProfileDefinition | undefined;
  require(id: string): BotProfileDefinition;
  list(): readonly BotProfileDefinition[];
}

function compareIds(left: BotProfileDefinition, right: BotProfileDefinition): number {
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export class BotProfileRegistry implements BotProfileRegistryContract {
  readonly #definitionsById: Map<string, BotProfileDefinition>;
  readonly #definitions: readonly BotProfileDefinition[];

  constructor(definitions: readonly unknown[] = []) {
    const source = cloneFrozenData(definitions, 'BotProfileRegistry definitions');
    if (!Array.isArray(source)) {
      throw new TypeError('BotProfileRegistry definitions 必须是数组。');
    }
    const normalized = source.map(createBotProfileDefinition).sort(compareIds);
    this.#definitionsById = new Map();
    for (const definition of normalized) {
      if (this.#definitionsById.has(definition.id)) {
        throw new RangeError(`BotProfileRegistry 包含重复 id ${definition.id}。`);
      }
      this.#definitionsById.set(definition.id, definition);
    }
    this.#definitions = Object.freeze(normalized);
    Object.freeze(this);
  }

  get size(): number {
    return this.#definitions.length;
  }

  has(id: string): boolean {
    return typeof id === 'string' && this.#definitionsById.has(id);
  }

  get(id: string): BotProfileDefinition | undefined {
    return typeof id === 'string' ? this.#definitionsById.get(id) : undefined;
  }

  require(id: string): BotProfileDefinition {
    const definition = this.get(id);
    if (!definition) throw new RangeError(`未知 Bot Profile ${String(id)}。`);
    return definition;
  }

  list(): readonly BotProfileDefinition[] {
    return this.#definitions;
  }
}

export function assertBotProfileRegistry(value: unknown): BotProfileRegistryContract {
  if (!(value instanceof BotProfileRegistry)) {
    throw new TypeError('BotProfileRegistry 必须是已校验的只读 Registry。');
  }
  return value;
}

export function createBotProfileRegistrySnapshot(value: unknown): BotProfileRegistry {
  const registry = assertBotProfileRegistry(value);
  return new BotProfileRegistry(registry.list());
}
