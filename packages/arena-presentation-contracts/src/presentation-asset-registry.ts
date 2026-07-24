import { assertNonEmptyString } from '@number-strategy-jump/arena-contracts';
import {
  createPresentationAssetDefinition,
  type PresentationAssetDefinition,
} from './presentation-asset-definition.js';

export interface PresentationAssetRegistryPort {
  readonly size?: number;
  has?(id: string): boolean;
  get?(id: string): PresentationAssetDefinition | null;
  require(id: string): PresentationAssetDefinition;
  list(): readonly PresentationAssetDefinition[];
}

function normalizeDefinitions(value: unknown): PresentationAssetDefinition[] {
  if (!Array.isArray(value)) {
    throw new TypeError('PresentationAssetRegistry definitions 必须是数组。');
  }
  const expectedKeys = new Set(['length']);
  const result: PresentationAssetDefinition[] = [];
  for (let index = 0; index < value.length; index += 1) {
    expectedKeys.add(String(index));
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError('PresentationAssetRegistry definitions 不能包含空槽或访问器。');
    }
    result.push(createPresentationAssetDefinition(descriptor.value));
  }
  if (Reflect.ownKeys(value).some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
    throw new TypeError('PresentationAssetRegistry definitions 不能包含额外字段。');
  }
  return result.sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
}

export class PresentationAssetRegistry implements PresentationAssetRegistryPort {
  readonly #definitionsById: ReadonlyMap<string, PresentationAssetDefinition>;
  readonly #definitions: readonly PresentationAssetDefinition[];

  constructor(definitions: unknown = []) {
    const normalized = normalizeDefinitions(definitions);
    const definitionsById = new Map<string, PresentationAssetDefinition>();
    for (const definition of normalized) {
      if (definitionsById.has(definition.id)) {
        throw new RangeError(`PresentationAssetRegistry 包含重复 id ${definition.id}。`);
      }
      definitionsById.set(definition.id, definition);
    }
    this.#definitionsById = definitionsById;
    this.#definitions = Object.freeze(normalized);
    Object.freeze(this);
  }

  get size(): number { return this.#definitions.length; }

  has(id: string): boolean {
    return this.#definitionsById.has(assertNonEmptyString(id, 'PresentationAssetRegistry.id'));
  }

  get(id: string): PresentationAssetDefinition | null {
    return this.#definitionsById.get(assertNonEmptyString(id, 'PresentationAssetRegistry.id')) ?? null;
  }

  require(id: string): PresentationAssetDefinition {
    const normalizedId = assertNonEmptyString(id, 'PresentationAssetRegistry.id');
    const definition = this.#definitionsById.get(normalizedId);
    if (!definition) throw new RangeError(`未知 PresentationAssetDefinition ${normalizedId}。`);
    return definition;
  }

  list(): readonly PresentationAssetDefinition[] { return this.#definitions; }
}

function ownMethod(value: object, name: 'require' | 'list'): (...args: unknown[]) => unknown {
  let owner: object | null = value;
  while (owner) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, name);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`PresentationAssetRegistry.${name} 必须是数据方法。`);
      }
      return descriptor.value as (...args: unknown[]) => unknown;
    }
    owner = Object.getPrototypeOf(owner) as object | null;
  }
  throw new TypeError(`PresentationAssetRegistry 缺少 ${name}()。`);
}

export function assertPresentationAssetRegistry(value: unknown): PresentationAssetRegistryPort {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('PresentationAssetRegistry 必须是对象。');
  }
  if (value instanceof PresentationAssetRegistry) return value;
  const requireMethod = ownMethod(value, 'require');
  const listMethod = ownMethod(value, 'list');
  return Object.freeze({
    require: (id: string) => createPresentationAssetDefinition(
      requireMethod.call(value, assertNonEmptyString(id, 'PresentationAssetRegistry.id')),
    ),
    list: () => Object.freeze(
      normalizeDefinitions(listMethod.call(value)),
    ),
  });
}
