import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
  createDeterministicDataHash,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_ANIMATION_SEMANTIC_IDS,
  ARENA_ANIMATION_SOURCE_KIND,
  type ArenaAnimationSemantic,
  type ArenaAnimationSourceKind,
} from './animation-semantics.js';

export const CHARACTER_PRESENTATION_DEFINITION_SCHEMA_VERSION = 1 as const;
export const CHARACTER_PRESENTATION_DIRECTION_STRATEGY = Object.freeze({
  SIX_SECTOR_CAMERA_RELATIVE: 'six-sector-camera-relative',
} as const);
export const CHARACTER_PRESENTATION_FRONT_AXIS = Object.freeze({
  NEGATIVE_X: 'negative-x', NEGATIVE_Z: 'negative-z',
  POSITIVE_X: 'positive-x', POSITIVE_Z: 'positive-z',
} as const);
export const CHARACTER_PRESENTATION_SLOT_ID = Object.freeze({
  ACCESSORY: 'accessory', BODY: 'body', EQUIPMENT: 'equipment',
  OUTFIT: 'outfit', TRAIL: 'trail', WINGS: 'wings',
} as const);

export type CharacterPresentationSlotId =
  typeof CHARACTER_PRESENTATION_SLOT_ID[keyof typeof CHARACTER_PRESENTATION_SLOT_ID];
export interface CharacterAnimationBinding {
  readonly sourceKind: ArenaAnimationSourceKind;
  readonly sourceKey: string;
  readonly loop: boolean;
  readonly fallbackSemantics: readonly ArenaAnimationSemantic[];
}
export interface CharacterPresentationDirection {
  readonly strategy: 'six-sector-camera-relative';
  readonly defaultFrontAxis: 'negative-x' | 'negative-z' | 'positive-x' | 'positive-z';
  readonly hysteresisDegrees: number;
}
export interface CharacterPresentationLocomotion {
  readonly walkSpeedThreshold: number;
  readonly runSpeedThreshold: number;
  readonly knockbackSpeedThreshold: number;
}
export interface CharacterPresentationSlot {
  readonly id: CharacterPresentationSlotId;
  readonly nodeName: string;
  readonly allowedAssetIds: readonly string[];
  readonly defaultAssetId: string | null;
}
export interface CharacterPresentationDefinitionJson {
  readonly schemaVersion: typeof CHARACTER_PRESENTATION_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly characterDefinitionId: string;
  readonly defaultForCharacter: boolean;
  readonly contentVersion: number;
  readonly modelAssetId: string;
  readonly rigProfileId: string;
  readonly materialProfileId: string;
  readonly outlineProfileId: string;
  readonly direction: CharacterPresentationDirection;
  readonly locomotion: CharacterPresentationLocomotion;
  readonly animationMap: Readonly<Record<ArenaAnimationSemantic, CharacterAnimationBinding>>;
  readonly attachmentSlots: readonly CharacterPresentationSlot[];
  readonly tags: readonly string[];
}

const REQUIRED_SLOT_IDS = Object.freeze(Object.values(CHARACTER_PRESENTATION_SLOT_ID).sort());
const DEFINITION_KEYS = new Set(['schemaVersion', 'id', 'characterDefinitionId',
  'defaultForCharacter', 'contentVersion', 'modelAssetId', 'rigProfileId',
  'materialProfileId', 'outlineProfileId', 'direction', 'locomotion', 'animationMap',
  'attachmentSlots', 'tags']);
const DIRECTION_KEYS = new Set(['strategy', 'defaultFrontAxis', 'hysteresisDegrees']);
const LOCOMOTION_KEYS = new Set(['walkSpeedThreshold', 'runSpeedThreshold', 'knockbackSpeedThreshold']);
const ANIMATION_KEYS = new Set(['sourceKind', 'sourceKey', 'loop', 'fallbackSemantics']);
const SLOT_KEYS = new Set(['id', 'nodeName', 'allowedAssetIds', 'defaultAssetId']);
const SEMANTICS: ReadonlySet<unknown> = new Set(ARENA_ANIMATION_SEMANTIC_IDS);
const SOURCE_KINDS: ReadonlySet<unknown> = new Set(Object.values(ARENA_ANIMATION_SOURCE_KIND));
const SLOT_IDS: ReadonlySet<unknown> = new Set(Object.values(CHARACTER_PRESENTATION_SLOT_ID));
const FRONT_AXES: ReadonlySet<unknown> = new Set(Object.values(CHARACTER_PRESENTATION_FRONT_AXIS));

function finiteAtLeast(value: unknown, minimum: number, name: string): number {
  if (!Number.isFinite(value) || (value as number) < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的有限数。`);
  }
  return value as number;
}

function cloneDirection(value: unknown): CharacterPresentationDirection {
  const name = 'CharacterPresentationDefinition.direction';
  assertKnownKeys(value, DIRECTION_KEYS, name);
  const hysteresisDegrees = finiteAtLeast(value.hysteresisDegrees, 0, `${name}.hysteresisDegrees`);
  if (hysteresisDegrees >= 30) throw new RangeError(`${name}.hysteresisDegrees 必须小于单扇区半角 30 度。`);
  if (value.strategy !== CHARACTER_PRESENTATION_DIRECTION_STRATEGY.SIX_SECTOR_CAMERA_RELATIVE) {
    throw new RangeError(`${name}.strategy 不受支持：${String(value.strategy)}。`);
  }
  if (!FRONT_AXES.has(value.defaultFrontAxis)) {
    throw new RangeError(`${name}.defaultFrontAxis 不受支持：${String(value.defaultFrontAxis)}。`);
  }
  return Object.freeze({
    strategy: value.strategy,
    defaultFrontAxis: value.defaultFrontAxis as CharacterPresentationDirection['defaultFrontAxis'],
    hysteresisDegrees,
  });
}

function cloneLocomotion(value: unknown): CharacterPresentationLocomotion {
  const name = 'CharacterPresentationDefinition.locomotion';
  assertKnownKeys(value, LOCOMOTION_KEYS, name);
  const result = Object.freeze({
    walkSpeedThreshold: finiteAtLeast(value.walkSpeedThreshold, 0, `${name}.walkSpeedThreshold`),
    runSpeedThreshold: finiteAtLeast(value.runSpeedThreshold, 0, `${name}.runSpeedThreshold`),
    knockbackSpeedThreshold: finiteAtLeast(value.knockbackSpeedThreshold, 0, `${name}.knockbackSpeedThreshold`),
  });
  if (result.runSpeedThreshold <= result.walkSpeedThreshold) {
    throw new RangeError(`${name}.runSpeedThreshold 必须大于 walkSpeedThreshold。`);
  }
  return result;
}

function cloneFallbackList(values: unknown, name: string): readonly ArenaAnimationSemantic[] {
  if (!Array.isArray(values)) throw new TypeError(`${name} 必须是数组。`);
  const seen = new Set<string>();
  const result = values.map((value, index) => {
    const semantic = assertNonEmptyString(value, `${name}[${index}]`);
    if (!SEMANTICS.has(semantic)) throw new RangeError(`${name} 引用未知 fallback ${semantic}。`);
    if (seen.has(semantic)) throw new RangeError(`${name} 不能包含重复项 ${semantic}。`);
    seen.add(semantic);
    return semantic as ArenaAnimationSemantic;
  });
  return Object.freeze(result);
}

function cloneAnimationMap(value: unknown): Readonly<Record<ArenaAnimationSemantic, CharacterAnimationBinding>> {
  const name = 'CharacterPresentationDefinition.animationMap';
  assertKnownKeys(value, new Set(ARENA_ANIMATION_SEMANTIC_IDS), name);
  if (Object.keys(value).length !== ARENA_ANIMATION_SEMANTIC_IDS.length) {
    throw new RangeError(`${name} 必须完整定义全部 AnimationSemantic。`);
  }
  const result: Partial<Record<ArenaAnimationSemantic, CharacterAnimationBinding>> = {};
  for (const semantic of ARENA_ANIMATION_SEMANTIC_IDS) {
    const bindingName = `${name}.${semantic}`;
    const binding = value[semantic];
    assertKnownKeys(binding, ANIMATION_KEYS, bindingName);
    if (typeof binding.loop !== 'boolean') throw new TypeError(`${bindingName}.loop 必须是布尔值。`);
    if (!SOURCE_KINDS.has(binding.sourceKind)) {
      throw new RangeError(`${bindingName}.sourceKind 不受支持：${String(binding.sourceKind)}。`);
    }
    const fallbackSemantics = cloneFallbackList(binding.fallbackSemantics, `${bindingName}.fallbackSemantics`);
    if (fallbackSemantics.includes(semantic)) throw new RangeError(`${bindingName} 不能回退到自身。`);
    result[semantic] = Object.freeze({
      sourceKind: binding.sourceKind as ArenaAnimationSourceKind,
      sourceKey: assertNonEmptyString(binding.sourceKey, `${bindingName}.sourceKey`),
      loop: binding.loop,
      fallbackSemantics,
    });
  }
  const complete = result as Record<ArenaAnimationSemantic, CharacterAnimationBinding>;
  const visited = new Set<ArenaAnimationSemantic>();
  const visit = (semantic: ArenaAnimationSemantic, visiting: Set<ArenaAnimationSemantic>): void => {
    if (visiting.has(semantic)) throw new RangeError(`${name} fallback 不能形成循环。`);
    if (visited.has(semantic)) return;
    visiting.add(semantic);
    for (const fallback of complete[semantic].fallbackSemantics) visit(fallback, visiting);
    visiting.delete(semantic);
    visited.add(semantic);
  };
  for (const semantic of ARENA_ANIMATION_SEMANTIC_IDS) visit(semantic, new Set());
  return Object.freeze(complete);
}

function cloneAttachmentSlots(values: unknown): readonly CharacterPresentationSlot[] {
  const name = 'CharacterPresentationDefinition.attachmentSlots';
  if (!Array.isArray(values)) throw new TypeError(`${name} 必须是数组。`);
  const ids = new Set<CharacterPresentationSlotId>();
  const slots = values.map((value, index) => {
    const slotName = `${name}[${index}]`;
    assertKnownKeys(value, SLOT_KEYS, slotName);
    if (!SLOT_IDS.has(value.id)) throw new RangeError(`${slotName}.id 不受支持：${String(value.id)}。`);
    const id = value.id as CharacterPresentationSlotId;
    if (ids.has(id)) throw new RangeError(`${name} 包含重复 slot ${id}。`);
    ids.add(id);
    if (!Array.isArray(value.allowedAssetIds)) {
      throw new TypeError(`${slotName}.allowedAssetIds 必须是数组。`);
    }
    const allowedAssetIds = cloneFrozenStringSet(value.allowedAssetIds, `${slotName}.allowedAssetIds`);
    const defaultAssetId = value.defaultAssetId === null ? null
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
  if (slots.length !== REQUIRED_SLOT_IDS.length || REQUIRED_SLOT_IDS.some((id) => !ids.has(id))) {
    throw new RangeError(`${name} 必须完整定义 ${REQUIRED_SLOT_IDS.join('/')}。`);
  }
  return Object.freeze(slots);
}

export class CharacterPresentationDefinition implements CharacterPresentationDefinitionJson {
  readonly schemaVersion = CHARACTER_PRESENTATION_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly characterDefinitionId: string;
  readonly defaultForCharacter: boolean;
  readonly contentVersion: number;
  readonly modelAssetId: string;
  readonly rigProfileId: string;
  readonly materialProfileId: string;
  readonly outlineProfileId: string;
  readonly direction: CharacterPresentationDirection;
  readonly locomotion: CharacterPresentationLocomotion;
  readonly animationMap: Readonly<Record<ArenaAnimationSemantic, CharacterAnimationBinding>>;
  readonly attachmentSlots: readonly CharacterPresentationSlot[];
  readonly tags: readonly string[];

  constructor(value: unknown) {
    const source = cloneFrozenData(value, 'CharacterPresentationDefinition');
    assertKnownKeys(source, DEFINITION_KEYS, 'CharacterPresentationDefinition');
    if (source.schemaVersion !== CHARACTER_PRESENTATION_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(`不支持 CharacterPresentationDefinition schema ${String(source.schemaVersion)}。`);
    }
    if (typeof source.defaultForCharacter !== 'boolean') {
      throw new TypeError('CharacterPresentationDefinition.defaultForCharacter 必须是布尔值。');
    }
    this.id = assertNonEmptyString(source.id, 'CharacterPresentationDefinition.id');
    this.characterDefinitionId = assertNonEmptyString(source.characterDefinitionId, 'CharacterPresentationDefinition.characterDefinitionId');
    this.defaultForCharacter = source.defaultForCharacter;
    this.contentVersion = assertIntegerAtLeast(source.contentVersion, 1, 'CharacterPresentationDefinition.contentVersion');
    this.modelAssetId = assertNonEmptyString(source.modelAssetId, 'CharacterPresentationDefinition.modelAssetId');
    this.rigProfileId = assertNonEmptyString(source.rigProfileId, 'CharacterPresentationDefinition.rigProfileId');
    this.materialProfileId = assertNonEmptyString(source.materialProfileId, 'CharacterPresentationDefinition.materialProfileId');
    this.outlineProfileId = assertNonEmptyString(source.outlineProfileId, 'CharacterPresentationDefinition.outlineProfileId');
    this.direction = cloneDirection(source.direction);
    this.locomotion = cloneLocomotion(source.locomotion);
    this.animationMap = cloneAnimationMap(source.animationMap);
    this.attachmentSlots = cloneAttachmentSlots(source.attachmentSlots);
    if (!Array.isArray(source.tags)) {
      throw new TypeError('CharacterPresentationDefinition.tags 必须是数组。');
    }
    this.tags = cloneFrozenStringSet(source.tags, 'CharacterPresentationDefinition.tags');
    Object.freeze(this);
  }

  toJSON(): CharacterPresentationDefinitionJson {
    return {
      schemaVersion: this.schemaVersion, id: this.id,
      characterDefinitionId: this.characterDefinitionId,
      defaultForCharacter: this.defaultForCharacter, contentVersion: this.contentVersion,
      modelAssetId: this.modelAssetId, rigProfileId: this.rigProfileId,
      materialProfileId: this.materialProfileId, outlineProfileId: this.outlineProfileId,
      direction: this.direction, locomotion: this.locomotion,
      animationMap: this.animationMap, attachmentSlots: this.attachmentSlots, tags: this.tags,
    };
  }

  getContentHash(): string {
    return createDeterministicDataHash(this.toJSON() as unknown as PlainRecord, `CharacterPresentationDefinition ${this.id}`);
  }
}

export function createCharacterPresentationDefinition(value: unknown): CharacterPresentationDefinition {
  return value instanceof CharacterPresentationDefinition ? value : new CharacterPresentationDefinition(value);
}
