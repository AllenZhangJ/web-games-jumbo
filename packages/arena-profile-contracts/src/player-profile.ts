import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '@number-strategy-jump/arena-contracts';
import {
  PLAYER_PROFILE_QUALITY,
  PLAYER_PROFILE_SCHEMA_VERSION,
  createPlayerProfileDefinition,
  type PlayerProfileDefinition,
  type PlayerProfileProgression,
  type PlayerProfileQuality,
  type PlayerProfileSelection,
  type PlayerProfileSettings,
  type PlayerProfileUnlocks,
} from './player-profile-definition.js';

export interface PlayerProfile {
  readonly schemaVersion: typeof PLAYER_PROFILE_SCHEMA_VERSION;
  readonly profileDefinitionId: string;
  readonly profileId: string;
  readonly revision: number;
  readonly progression: PlayerProfileProgression;
  readonly unlocks: PlayerProfileUnlocks;
  readonly selection: PlayerProfileSelection;
  readonly settings: PlayerProfileSettings;
}

export interface PlayerProfileUpdate {
  readonly progression?: PlayerProfileProgression;
  readonly unlocks?: PlayerProfileUnlocks;
  readonly selection?: PlayerProfileSelection;
  readonly settings?: PlayerProfileSettings;
}

const PROFILE_KEYS = new Set([
  'schemaVersion', 'profileDefinitionId', 'profileId', 'revision',
  'progression', 'unlocks', 'selection', 'settings',
]);
const UPDATE_KEYS = new Set(['progression', 'unlocks', 'selection', 'settings']);
const PROGRESSION_KEYS = new Set(['experience', 'committedGrantIds']);
const UNLOCK_KEYS = new Set(['characterIds', 'appearanceIds', 'equipmentIds', 'mapIds']);
const SELECTION_KEYS = new Set(['characterId', 'appearanceId']);
const SETTINGS_KEYS = new Set(['soundEnabled', 'reducedMotion', 'qualityProfile']);
const QUALITY_VALUES: ReadonlySet<unknown> = new Set(Object.values(PLAYER_PROFILE_QUALITY));

function boundedIdentifier(value: unknown, maximum: number, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  if (value.length > maximum) throw new RangeError(`${name} 超出长度上限。`);
  return value;
}

function boundedStringSet(
  values: unknown,
  maximumCount: number,
  maximumLength: number,
  name: string,
): readonly string[] {
  if (!Array.isArray(values)) throw new TypeError(`${name} 必须是数组。`);
  const result = cloneFrozenStringSet(values, name);
  if (result.length > maximumCount) throw new RangeError(`${name} 超出数量上限。`);
  result.forEach((item, index) => boundedIdentifier(item, maximumLength, `${name}[${index}]`));
  return result;
}

function requiredBoolean(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name} 必须是布尔值。`);
  return value;
}

function cloneProgression(
  value: unknown,
  definition: PlayerProfileDefinition,
  name: string,
): PlayerProfileProgression {
  assertKnownKeys(value, PROGRESSION_KEYS, name);
  const experience = assertIntegerAtLeast(value.experience, 0, `${name}.experience`);
  if (experience > definition.limits.maxExperience) throw new RangeError(`${name}.experience 超出上限。`);
  return Object.freeze({
    experience,
    committedGrantIds: boundedStringSet(
      value.committedGrantIds,
      definition.limits.maxCommittedGrantIds,
      definition.limits.maxIdentifierLength,
      `${name}.committedGrantIds`,
    ),
  });
}

function cloneUnlocks(
  value: unknown,
  definition: PlayerProfileDefinition,
  name: string,
): PlayerProfileUnlocks {
  assertKnownKeys(value, UNLOCK_KEYS, name);
  const { maxUnlockedPerKind, maxIdentifierLength } = definition.limits;
  return Object.freeze({
    characterIds: boundedStringSet(value.characterIds, maxUnlockedPerKind, maxIdentifierLength, `${name}.characterIds`),
    appearanceIds: boundedStringSet(value.appearanceIds, maxUnlockedPerKind, maxIdentifierLength, `${name}.appearanceIds`),
    equipmentIds: boundedStringSet(value.equipmentIds, maxUnlockedPerKind, maxIdentifierLength, `${name}.equipmentIds`),
    mapIds: boundedStringSet(value.mapIds, maxUnlockedPerKind, maxIdentifierLength, `${name}.mapIds`),
  });
}

function cloneSelection(
  value: unknown,
  unlocks: PlayerProfileUnlocks,
  definition: PlayerProfileDefinition,
  name: string,
): PlayerProfileSelection {
  assertKnownKeys(value, SELECTION_KEYS, name);
  const characterId = boundedIdentifier(value.characterId, definition.limits.maxIdentifierLength, `${name}.characterId`);
  const appearanceId = value.appearanceId === null
    ? null
    : boundedIdentifier(value.appearanceId, definition.limits.maxIdentifierLength, `${name}.appearanceId`);
  if (!unlocks.characterIds.includes(characterId)) throw new RangeError(`${name}.characterId 必须已经解锁。`);
  if (appearanceId !== null && !unlocks.appearanceIds.includes(appearanceId)) {
    throw new RangeError(`${name}.appearanceId 必须已经解锁。`);
  }
  return Object.freeze({ characterId, appearanceId });
}

function cloneSettings(value: unknown, name: string): PlayerProfileSettings {
  assertKnownKeys(value, SETTINGS_KEYS, name);
  if (!QUALITY_VALUES.has(value.qualityProfile)) throw new RangeError(`${name}.qualityProfile 不受支持。`);
  return Object.freeze({
    soundEnabled: requiredBoolean(value.soundEnabled, `${name}.soundEnabled`),
    reducedMotion: requiredBoolean(value.reducedMotion, `${name}.reducedMotion`),
    qualityProfile: value.qualityProfile as PlayerProfileQuality,
  });
}

export function assertPlayerProfileHasNoFutureSchema(
  definitionValue: unknown,
  value: unknown,
): true {
  const definition = createPlayerProfileDefinition(definitionValue);
  let source: unknown;
  try {
    source = cloneFrozenData(value, 'PlayerProfile version probe');
  } catch {
    return true;
  }
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    const schemaVersion = (source as Record<string, unknown>).schemaVersion;
    if (Number.isSafeInteger(schemaVersion) && (schemaVersion as number) > definition.currentProfileSchemaVersion) {
      throw new RangeError('PlayerProfile 来自未来 schema。');
    }
  }
  return true;
}

export function createPlayerProfile(
  definitionValue: unknown,
  value: unknown = null,
): PlayerProfile {
  const definition = createPlayerProfileDefinition(definitionValue);
  const source = value === null || value === undefined
    ? cloneFrozenData({
      schemaVersion: definition.currentProfileSchemaVersion,
      profileDefinitionId: definition.id,
      profileId: definition.defaults.profileId,
      revision: 0,
      progression: definition.defaults.progression,
      unlocks: definition.defaults.unlocks,
      selection: definition.defaults.selection,
      settings: definition.defaults.settings,
    }, 'PlayerProfile defaults')
    : cloneFrozenData(value, 'PlayerProfile');
  assertKnownKeys(source, PROFILE_KEYS, 'PlayerProfile');
  if (source.schemaVersion !== definition.currentProfileSchemaVersion) {
    throw new RangeError(`不支持 PlayerProfile schema ${String(source.schemaVersion)}。`);
  }
  if (source.profileDefinitionId !== definition.id) {
    throw new RangeError('PlayerProfile 与当前 Definition 不一致。');
  }
  const unlocks = cloneUnlocks(source.unlocks, definition, 'PlayerProfile.unlocks');
  return Object.freeze({
    schemaVersion: PLAYER_PROFILE_SCHEMA_VERSION,
    profileDefinitionId: definition.id,
    profileId: boundedIdentifier(source.profileId, definition.limits.maxIdentifierLength, 'PlayerProfile.profileId'),
    revision: assertIntegerAtLeast(source.revision, 0, 'PlayerProfile.revision'),
    progression: cloneProgression(source.progression, definition, 'PlayerProfile.progression'),
    unlocks,
    selection: cloneSelection(source.selection, unlocks, definition, 'PlayerProfile.selection'),
    settings: cloneSettings(source.settings, 'PlayerProfile.settings'),
  });
}

export function advancePlayerProfile(
  definitionValue: unknown,
  currentValue: unknown,
  updateValue: unknown,
): PlayerProfile {
  const definition = createPlayerProfileDefinition(definitionValue);
  const current = createPlayerProfile(definition, currentValue);
  const update = cloneFrozenData(updateValue, 'PlayerProfile update');
  assertKnownKeys(update, UPDATE_KEYS, 'PlayerProfile update');
  if (Object.keys(update).length === 0) throw new RangeError('PlayerProfile update 不能是空更新。');
  return createPlayerProfile(definition, {
    ...current,
    ...update,
    revision: current.revision + 1,
  });
}
