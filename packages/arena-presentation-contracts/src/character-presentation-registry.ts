import { assertKnownKeys, assertNonEmptyString } from '@number-strategy-jump/arena-contracts';
import {
  createCharacterPresentationDefinition,
  type CharacterPresentationDefinition,
} from './character-presentation-definition.js';
import { PRESENTATION_ASSET_KIND } from './presentation-asset-definition.js';
import {
  assertPresentationAssetRegistry,
  type PresentationAssetRegistryPort,
} from './presentation-asset-registry.js';

export interface CharacterPresentationRegistryPort {
  readonly size?: number;
  get?(id: string): CharacterPresentationDefinition | null;
  require(id: string): CharacterPresentationDefinition;
  requireDefaultForCharacter(characterDefinitionId: string): CharacterPresentationDefinition;
  list(): readonly CharacterPresentationDefinition[];
}

const OPTION_KEYS = new Set(['definitions', 'assetRegistry']);

function normalizeDefinitions(value: unknown): CharacterPresentationDefinition[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RangeError('CharacterPresentationRegistry definitions 不能为空。');
  }
  const expectedKeys = new Set(['length']);
  const result: CharacterPresentationDefinition[] = [];
  for (let index = 0; index < value.length; index += 1) {
    expectedKeys.add(String(index));
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError('CharacterPresentationRegistry definitions 不能包含空槽或访问器。');
    }
    result.push(createCharacterPresentationDefinition(descriptor.value));
  }
  if (Reflect.ownKeys(value).some((key) => typeof key !== 'string' || !expectedKeys.has(key))) {
    throw new TypeError('CharacterPresentationRegistry definitions 不能包含额外字段。');
  }
  return result.sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
}

export class CharacterPresentationRegistry implements CharacterPresentationRegistryPort {
  readonly #definitionsById: ReadonlyMap<string, CharacterPresentationDefinition>;
  readonly #defaultByCharacterId: ReadonlyMap<string, CharacterPresentationDefinition>;
  readonly #definitions: readonly CharacterPresentationDefinition[];

  constructor(options: unknown) {
    assertKnownKeys(options, OPTION_KEYS, 'CharacterPresentationRegistry options');
    const normalized = normalizeDefinitions(options.definitions);
    const assets: PresentationAssetRegistryPort = assertPresentationAssetRegistry(options.assetRegistry);
    const definitionsById = new Map<string, CharacterPresentationDefinition>();
    const defaultByCharacterId = new Map<string, CharacterPresentationDefinition>();
    const characterIds = new Set<string>();
    for (const definition of normalized) {
      if (definitionsById.has(definition.id)) {
        throw new RangeError(`CharacterPresentationRegistry 包含重复 id ${definition.id}。`);
      }
      const model = assets.require(definition.modelAssetId);
      if (model.kind !== PRESENTATION_ASSET_KIND.CHARACTER_MODEL) {
        throw new RangeError(`${definition.id}.modelAssetId 必须引用 character-model。`);
      }
      for (const slot of definition.attachmentSlots) {
        for (const assetId of slot.allowedAssetIds) {
          const asset = assets.require(assetId);
          if (asset.kind !== PRESENTATION_ASSET_KIND.ATTACHMENT) {
            throw new RangeError(`${definition.id} slot ${slot.id} 必须引用 attachment。`);
          }
        }
      }
      characterIds.add(definition.characterDefinitionId);
      if (definition.defaultForCharacter) {
        if (defaultByCharacterId.has(definition.characterDefinitionId)) {
          throw new RangeError(`CharacterDefinition ${definition.characterDefinitionId} 存在多个默认表现。`);
        }
        defaultByCharacterId.set(definition.characterDefinitionId, definition);
      }
      definitionsById.set(definition.id, definition);
    }
    for (const characterId of characterIds) {
      if (!defaultByCharacterId.has(characterId)) {
        throw new RangeError(`CharacterDefinition ${characterId} 缺少默认表现。`);
      }
    }
    this.#definitionsById = definitionsById;
    this.#defaultByCharacterId = defaultByCharacterId;
    this.#definitions = Object.freeze(normalized);
    Object.freeze(this);
  }

  get size(): number { return this.#definitions.length; }
  get(id: string): CharacterPresentationDefinition | null {
    return this.#definitionsById.get(assertNonEmptyString(id, 'CharacterPresentationRegistry.id')) ?? null;
  }
  require(id: string): CharacterPresentationDefinition {
    const normalizedId = assertNonEmptyString(id, 'CharacterPresentationRegistry.id');
    const definition = this.#definitionsById.get(normalizedId);
    if (!definition) throw new RangeError(`未知 CharacterPresentationDefinition ${normalizedId}。`);
    return definition;
  }
  requireDefaultForCharacter(characterDefinitionId: string): CharacterPresentationDefinition {
    const id = assertNonEmptyString(characterDefinitionId, 'CharacterPresentationRegistry.characterDefinitionId');
    const definition = this.#defaultByCharacterId.get(id);
    if (!definition) throw new RangeError(`CharacterDefinition ${id} 缺少默认表现。`);
    return definition;
  }
  list(): readonly CharacterPresentationDefinition[] { return this.#definitions; }
}

type RegistryMethodName = 'require' | 'requireDefaultForCharacter' | 'list';
function method(value: object, name: RegistryMethodName): (...args: unknown[]) => unknown {
  let owner: object | null = value;
  while (owner) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, name);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`CharacterPresentationRegistry.${name} 必须是数据方法。`);
      }
      return descriptor.value as (...args: unknown[]) => unknown;
    }
    owner = Object.getPrototypeOf(owner) as object | null;
  }
  throw new TypeError(`CharacterPresentationRegistry 缺少 ${name}()。`);
}

export function assertCharacterPresentationRegistry(value: unknown): CharacterPresentationRegistryPort {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('CharacterPresentationRegistry 必须是对象。');
  }
  if (value instanceof CharacterPresentationRegistry) return value;
  const requireMethod = method(value, 'require');
  const defaultMethod = method(value, 'requireDefaultForCharacter');
  const listMethod = method(value, 'list');
  return Object.freeze({
    require: (id: string) => createCharacterPresentationDefinition(
      requireMethod.call(value, assertNonEmptyString(id, 'CharacterPresentationRegistry.id')),
    ),
    requireDefaultForCharacter: (id: string) => createCharacterPresentationDefinition(
      defaultMethod.call(value, assertNonEmptyString(id, 'CharacterPresentationRegistry.characterDefinitionId')),
    ),
    list: () => Object.freeze(normalizeDefinitions(listMethod.call(value))),
  });
}
