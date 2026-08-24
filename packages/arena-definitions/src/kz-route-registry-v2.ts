import {
  assertKnownKeys,
  cloneFrozenData,
  cloneFrozenStringSet,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  createKzRouteDefinitionV2,
  type KzRouteDefinitionV2,
} from './kz-route-definition-v2.js';

export interface KzRouteRegistrySourceV2 {
  readonly definitions: readonly unknown[];
  readonly mapDefinitionIds: readonly string[];
}

export interface KzRouteRegistryV2Contract {
  readonly size: number;
  readonly contentHash: string;
  has(id: string): boolean;
  get(id: string): KzRouteDefinitionV2 | undefined;
  require(id: string): KzRouteDefinitionV2;
  list(): readonly KzRouteDefinitionV2[];
}

const SOURCE_KEYS = new Set(['definitions', 'mapDefinitionIds']);

function compareById(left: KzRouteDefinitionV2, right: KzRouteDefinitionV2): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export class KzRouteRegistryV2 implements KzRouteRegistryV2Contract {
  readonly #definitionsById: ReadonlyMap<string, KzRouteDefinitionV2>;
  readonly #definitions: readonly KzRouteDefinitionV2[];
  readonly contentHash: string;

  constructor(value: unknown) {
    const source = cloneFrozenData(value, 'KzRouteRegistryV2');
    assertKnownKeys(source, SOURCE_KEYS, 'KzRouteRegistryV2');
    for (const key of SOURCE_KEYS) {
      if (!Object.hasOwn(source, key)) throw new TypeError(`KzRouteRegistryV2.${key} 为必填字段。`);
    }
    if (!Array.isArray(source.definitions)) {
      throw new TypeError('KzRouteRegistryV2.definitions 必须是数组。');
    }
    const mapDefinitionIds = cloneFrozenStringSet(
      source.mapDefinitionIds as readonly unknown[],
      'KzRouteRegistryV2.mapDefinitionIds',
    );
    const registeredMapIds = new Set(mapDefinitionIds);
    const definitions = source.definitions.map(createKzRouteDefinitionV2).sort(compareById);
    const definitionsById = new Map<string, KzRouteDefinitionV2>();
    const routeByMapId = new Map<string, string>();
    for (const definition of definitions) {
      if (definitionsById.has(definition.id)) {
        throw new RangeError(`KzRouteRegistryV2 包含重复 id ${definition.id}。`);
      }
      if (!registeredMapIds.has(definition.mapDefinitionId)) {
        throw new RangeError(
          `KzRouteDefinitionV2 ${definition.id} 引用未注册 map ${definition.mapDefinitionId}。`,
        );
      }
      const existingRouteId = routeByMapId.get(definition.mapDefinitionId);
      if (existingRouteId) {
        throw new RangeError(
          `MapDefinition ${definition.mapDefinitionId} 被路线 ${existingRouteId} 与 ${definition.id} 重复持有。`,
        );
      }
      definitionsById.set(definition.id, definition);
      routeByMapId.set(definition.mapDefinitionId, definition.id);
    }
    this.#definitionsById = definitionsById;
    this.#definitions = Object.freeze(definitions);
    this.contentHash = createDeterministicDataHash(
      Object.freeze({ definitions: this.#definitions, mapDefinitionIds }),
      'KzRouteRegistryV2 content',
    );
    Object.freeze(this);
  }

  get size(): number { return this.#definitions.length; }
  has(id: string): boolean { return this.#definitionsById.has(id); }
  get(id: string): KzRouteDefinitionV2 | undefined { return this.#definitionsById.get(id); }

  require(id: string): KzRouteDefinitionV2 {
    const definition = this.get(id);
    if (!definition) throw new RangeError(`未知 KzRouteDefinitionV2 ${String(id)}。`);
    return definition;
  }

  list(): readonly KzRouteDefinitionV2[] { return this.#definitions; }
}
