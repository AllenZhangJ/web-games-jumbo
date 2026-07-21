import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_ANIMATION_SEMANTIC_IDS,
  ARENA_ANIMATION_SOURCE_KIND,
} from '../animation/animation-semantics.js';

export const CHARACTER_PRESENTATION_DEFINITION_SCHEMA_VERSION = 1;

export const CHARACTER_PRESENTATION_DIRECTION_STRATEGY = Object.freeze({
  SIX_SECTOR_CAMERA_RELATIVE: 'six-sector-camera-relative',
});

export const CHARACTER_PRESENTATION_FRONT_AXIS = Object.freeze({
  NEGATIVE_X: 'negative-x',
  NEGATIVE_Z: 'negative-z',
  POSITIVE_X: 'positive-x',
  POSITIVE_Z: 'positive-z',
});

export const CHARACTER_PRESENTATION_SLOT_ID = Object.freeze({
  ACCESSORY: 'accessory',
  BODY: 'body',
  EQUIPMENT: 'equipment',
  OUTFIT: 'outfit',
  TRAIL: 'trail',
  WINGS: 'wings',
});

const REQUIRED_SLOT_IDS = Object.freeze(Object.values(CHARACTER_PRESENTATION_SLOT_ID).sort());
const DEFINITION_KEYS = new Set([
  'schemaVersion',
  'id',
  'characterDefinitionId',
  'defaultForCharacter',
  'contentVersion',
  'modelAssetId',
  'rigProfileId',
  'materialProfileId',
  'outlineProfileId',
  'direction',
  'locomotion',
  'animationMap',
  'attachmentSlots',
  'tags',
]);
const DIRECTION_KEYS = new Set(['strategy', 'defaultFrontAxis', 'hysteresisDegrees']);
const LOCOMOTION_KEYS = new Set([
  'walkSpeedThreshold',
  'runSpeedThreshold',
  'knockbackSpeedThreshold',
]);
const ANIMATION_KEYS = new Set([
  'sourceKind',
  'sourceKey',
  'loop',
  'fallbackSemantics',
]);
const SLOT_KEYS = new Set(['id', 'nodeName', 'allowedAssetIds', 'defaultAssetId']);

function enumValue(value, values, name) {
  if (!Object.values(values).includes(value)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value;
}

function finiteAtLeast(value, minimum, name) {
  if (!Number.isFinite(value) || value < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的有限数。`);
  }
  return value;
}

function cloneDirection(value) {
  const name = 'CharacterPresentationDefinition.direction';
  assertKnownKeys(value, DIRECTION_KEYS, name);
  const hysteresisDegrees = finiteAtLeast(
    value.hysteresisDegrees,
    0,
    `${name}.hysteresisDegrees`,
  );
  if (hysteresisDegrees >= 30) {
    throw new RangeError(`${name}.hysteresisDegrees 必须小于单扇区半角 30 度。`);
  }
  return Object.freeze({
    strategy: enumValue(
      value.strategy,
      CHARACTER_PRESENTATION_DIRECTION_STRATEGY,
      `${name}.strategy`,
    ),
    defaultFrontAxis: enumValue(
      value.defaultFrontAxis,
      CHARACTER_PRESENTATION_FRONT_AXIS,
      `${name}.defaultFrontAxis`,
    ),
    hysteresisDegrees,
  });
}

function cloneLocomotion(value) {
  const name = 'CharacterPresentationDefinition.locomotion';
  assertKnownKeys(value, LOCOMOTION_KEYS, name);
  const result = Object.freeze({
    walkSpeedThreshold: finiteAtLeast(
      value.walkSpeedThreshold,
      0,
      `${name}.walkSpeedThreshold`,
    ),
    runSpeedThreshold: finiteAtLeast(
      value.runSpeedThreshold,
      0,
      `${name}.runSpeedThreshold`,
    ),
    knockbackSpeedThreshold: finiteAtLeast(
      value.knockbackSpeedThreshold,
      0,
      `${name}.knockbackSpeedThreshold`,
    ),
  });
  if (result.runSpeedThreshold <= result.walkSpeedThreshold) {
    throw new RangeError(`${name}.runSpeedThreshold 必须大于 walkSpeedThreshold。`);
  }
  return result;
}

function cloneFallbackList(values, name) {
  if (!Array.isArray(values)) throw new TypeError(`${name} 必须是数组。`);
  const seen = new Set();
  return Object.freeze(values.map((value, index) => {
    const semantic = assertNonEmptyString(value, `${name}[${index}]`);
    if (seen.has(semantic)) throw new RangeError(`${name} 不能包含重复项 ${semantic}。`);
    seen.add(semantic);
    return semantic;
  }));
}

function cloneAnimationMap(value) {
  const name = 'CharacterPresentationDefinition.animationMap';
  assertKnownKeys(value, new Set(ARENA_ANIMATION_SEMANTIC_IDS), name);
  const keys = Object.keys(value).sort();
  if (
    keys.length !== ARENA_ANIMATION_SEMANTIC_IDS.length
    || ARENA_ANIMATION_SEMANTIC_IDS.some((semantic) => !keys.includes(semantic))
  ) throw new RangeError(`${name} 必须完整定义全部 AnimationSemantic。`);
  const result = {};
  for (const semantic of ARENA_ANIMATION_SEMANTIC_IDS) {
    const bindingName = `${name}.${semantic}`;
    const binding = value[semantic];
    assertKnownKeys(binding, ANIMATION_KEYS, bindingName);
    if (typeof binding.loop !== 'boolean') {
      throw new TypeError(`${bindingName}.loop 必须是布尔值。`);
    }
    const fallbackSemantics = cloneFallbackList(
      binding.fallbackSemantics,
      `${bindingName}.fallbackSemantics`,
    );
    for (const fallback of fallbackSemantics) {
      if (!ARENA_ANIMATION_SEMANTIC_IDS.includes(fallback)) {
        throw new RangeError(`${bindingName} 引用未知 fallback ${fallback}。`);
      }
      if (fallback === semantic) {
        throw new RangeError(`${bindingName} 不能回退到自身。`);
      }
    }
    result[semantic] = Object.freeze({
      sourceKind: enumValue(
        binding.sourceKind,
        ARENA_ANIMATION_SOURCE_KIND,
        `${bindingName}.sourceKind`,
      ),
      sourceKey: assertNonEmptyString(binding.sourceKey, `${bindingName}.sourceKey`),
      loop: binding.loop,
      fallbackSemantics,
    });
  }
  const visit = (semantic, visiting, visited) => {
    if (visiting.has(semantic)) throw new RangeError(`${name} fallback 不能形成循环。`);
    if (visited.has(semantic)) return;
    visiting.add(semantic);
    for (const fallback of result[semantic].fallbackSemantics) {
      visit(fallback, visiting, visited);
    }
    visiting.delete(semantic);
    visited.add(semantic);
  };
  const visited = new Set();
  for (const semantic of ARENA_ANIMATION_SEMANTIC_IDS) {
    visit(semantic, new Set(), visited);
  }
  return Object.freeze(result);
}

function cloneAttachmentSlots(values) {
  const name = 'CharacterPresentationDefinition.attachmentSlots';
  if (!Array.isArray(values)) throw new TypeError(`${name} 必须是数组。`);
  const ids = new Set();
  const slots = values.map((value, index) => {
    const slotName = `${name}[${index}]`;
    assertKnownKeys(value, SLOT_KEYS, slotName);
    const id = enumValue(value.id, CHARACTER_PRESENTATION_SLOT_ID, `${slotName}.id`);
    if (ids.has(id)) throw new RangeError(`${name} 包含重复 slot ${id}。`);
    ids.add(id);
    const allowedAssetIds = cloneFrozenStringSet(
      value.allowedAssetIds,
      `${slotName}.allowedAssetIds`,
    );
    const defaultAssetId = value.defaultAssetId === null
      ? null
      : assertNonEmptyString(value.defaultAssetId, `${slotName}.defaultAssetId`);
    if (defaultAssetId !== null && !allowedAssetIds.includes(defaultAssetId)) {
      throw new RangeError(`${slotName}.defaultAssetId 必须位于 allowedAssetIds。`);
    }
    return Object.freeze({
      id,
      nodeName: assertNonEmptyString(value.nodeName, `${slotName}.nodeName`),
      allowedAssetIds,
      defaultAssetId,
    });
  }).sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
  if (
    slots.length !== REQUIRED_SLOT_IDS.length
    || REQUIRED_SLOT_IDS.some((id) => !ids.has(id))
  ) throw new RangeError(`${name} 必须完整定义 ${REQUIRED_SLOT_IDS.join('/')}。`);
  return Object.freeze(slots);
}

export class CharacterPresentationDefinition {
  constructor(value) {
    const source = cloneFrozenData(value, 'CharacterPresentationDefinition');
    assertKnownKeys(source, DEFINITION_KEYS, 'CharacterPresentationDefinition');
    if (source.schemaVersion !== CHARACTER_PRESENTATION_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(
        `不支持 CharacterPresentationDefinition schema ${String(source.schemaVersion)}。`,
      );
    }
    if (typeof source.defaultForCharacter !== 'boolean') {
      throw new TypeError('CharacterPresentationDefinition.defaultForCharacter 必须是布尔值。');
    }
    Object.defineProperties(this, {
      schemaVersion: {
        value: CHARACTER_PRESENTATION_DEFINITION_SCHEMA_VERSION,
        enumerable: true,
      },
      id: {
        value: assertNonEmptyString(source.id, 'CharacterPresentationDefinition.id'),
        enumerable: true,
      },
      characterDefinitionId: {
        value: assertNonEmptyString(
          source.characterDefinitionId,
          'CharacterPresentationDefinition.characterDefinitionId',
        ),
        enumerable: true,
      },
      defaultForCharacter: { value: source.defaultForCharacter, enumerable: true },
      contentVersion: {
        value: assertIntegerAtLeast(
          source.contentVersion,
          1,
          'CharacterPresentationDefinition.contentVersion',
        ),
        enumerable: true,
      },
      modelAssetId: {
        value: assertNonEmptyString(
          source.modelAssetId,
          'CharacterPresentationDefinition.modelAssetId',
        ),
        enumerable: true,
      },
      rigProfileId: {
        value: assertNonEmptyString(
          source.rigProfileId,
          'CharacterPresentationDefinition.rigProfileId',
        ),
        enumerable: true,
      },
      materialProfileId: {
        value: assertNonEmptyString(
          source.materialProfileId,
          'CharacterPresentationDefinition.materialProfileId',
        ),
        enumerable: true,
      },
      outlineProfileId: {
        value: assertNonEmptyString(
          source.outlineProfileId,
          'CharacterPresentationDefinition.outlineProfileId',
        ),
        enumerable: true,
      },
      direction: { value: cloneDirection(source.direction), enumerable: true },
      locomotion: { value: cloneLocomotion(source.locomotion), enumerable: true },
      animationMap: { value: cloneAnimationMap(source.animationMap), enumerable: true },
      attachmentSlots: {
        value: cloneAttachmentSlots(source.attachmentSlots),
        enumerable: true,
      },
      tags: {
        value: cloneFrozenStringSet(source.tags, 'CharacterPresentationDefinition.tags'),
        enumerable: true,
      },
    });
    Object.freeze(this);
  }

  toJSON() {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      characterDefinitionId: this.characterDefinitionId,
      defaultForCharacter: this.defaultForCharacter,
      contentVersion: this.contentVersion,
      modelAssetId: this.modelAssetId,
      rigProfileId: this.rigProfileId,
      materialProfileId: this.materialProfileId,
      outlineProfileId: this.outlineProfileId,
      direction: this.direction,
      locomotion: this.locomotion,
      animationMap: this.animationMap,
      attachmentSlots: this.attachmentSlots,
      tags: this.tags,
    };
  }

  getContentHash() {
    return createDeterministicDataHash(
      this.toJSON(),
      `CharacterPresentationDefinition ${this.id}`,
    );
  }
}

export function createCharacterPresentationDefinition(value) {
  return value instanceof CharacterPresentationDefinition
    ? value
    : new CharacterPresentationDefinition(value);
}
