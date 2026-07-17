import {
  PRESENTATION_ASSET_KIND,
} from '../assets/presentation-asset-definition.js';
import { assertPresentationAssetRegistry } from '../assets/presentation-asset-registry.js';
import {
  createCharacterPresentationDefinition,
} from './character-presentation-definition.js';

function compareIds(left, right) {
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export class CharacterPresentationRegistry {
  #definitionsById;
  #defaultByCharacterId;
  #definitions;

  constructor({ definitions = [], assetRegistry }) {
    if (!Array.isArray(definitions) || definitions.length === 0) {
      throw new RangeError('CharacterPresentationRegistry definitions 不能为空。');
    }
    const assets = assertPresentationAssetRegistry(assetRegistry);
    const normalized = definitions.map(createCharacterPresentationDefinition).sort(compareIds);
    this.#definitionsById = new Map();
    this.#defaultByCharacterId = new Map();
    const characterIds = new Set();
    for (const definition of normalized) {
      if (this.#definitionsById.has(definition.id)) {
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
        if (this.#defaultByCharacterId.has(definition.characterDefinitionId)) {
          throw new RangeError(
            `CharacterDefinition ${definition.characterDefinitionId} 存在多个默认表现。`,
          );
        }
        this.#defaultByCharacterId.set(definition.characterDefinitionId, definition);
      }
      this.#definitionsById.set(definition.id, definition);
    }
    for (const characterId of characterIds) {
      if (!this.#defaultByCharacterId.has(characterId)) {
        throw new RangeError(`CharacterDefinition ${characterId} 缺少默认表现。`);
      }
    }
    this.#definitions = Object.freeze(normalized);
    Object.freeze(this);
  }

  get size() {
    return this.#definitions.length;
  }

  get(id) {
    return this.#definitionsById.get(id) ?? null;
  }

  require(id) {
    const definition = this.get(id);
    if (!definition) {
      throw new RangeError(`未知 CharacterPresentationDefinition ${String(id)}。`);
    }
    return definition;
  }

  requireDefaultForCharacter(characterDefinitionId) {
    const definition = this.#defaultByCharacterId.get(characterDefinitionId);
    if (!definition) {
      throw new RangeError(`CharacterDefinition ${String(characterDefinitionId)} 缺少默认表现。`);
    }
    return definition;
  }

  list() {
    return this.#definitions;
  }
}

export function assertCharacterPresentationRegistry(value) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('CharacterPresentationRegistry 必须是对象。');
  }
  for (const method of ['require', 'requireDefaultForCharacter', 'list']) {
    if (typeof value[method] !== 'function') {
      throw new TypeError(`CharacterPresentationRegistry 缺少 ${method}()。`);
    }
  }
  return value;
}
