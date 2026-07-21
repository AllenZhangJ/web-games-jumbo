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
} from './player-profile-definition.js';

const PROFILE_KEYS = new Set([
  'schemaVersion',
  'profileDefinitionId',
  'profileId',
  'revision',
  'progression',
  'unlocks',
  'selection',
  'settings',
]);
const UPDATE_KEYS = new Set(['progression', 'unlocks', 'selection', 'settings']);
const PROGRESSION_KEYS = new Set(['experience', 'committedGrantIds']);
const UNLOCK_KEYS = new Set(['characterIds', 'appearanceIds', 'equipmentIds', 'mapIds']);
const SELECTION_KEYS = new Set(['characterId', 'appearanceId']);
const SETTINGS_KEYS = new Set(['soundEnabled', 'reducedMotion', 'qualityProfile']);

function boundedIdentifier(value, maximum, name) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  if (value.length > maximum) throw new RangeError(`${name} 超出长度上限。`);
  return value;
}

function boundedStringSet(values, maximumCount, maximumLength, name) {
  const result = cloneFrozenStringSet(values, name);
  if (result.length > maximumCount) throw new RangeError(`${name} 超出数量上限。`);
  result.forEach((value, index) => boundedIdentifier(value, maximumLength, `${name}[${index}]`));
  return result;
}

function requiredBoolean(value, name) {
  if (typeof value !== 'boolean') throw new TypeError(`${name} 必须是布尔值。`);
  return value;
}

function cloneProgression(value, limits, name) {
  assertKnownKeys(value, PROGRESSION_KEYS, name);
  const experience = assertIntegerAtLeast(value.experience, 0, `${name}.experience`);
  if (experience > limits.maxExperience) throw new RangeError(`${name}.experience 超出上限。`);
  return Object.freeze({
    experience,
    committedGrantIds: boundedStringSet(
      value.committedGrantIds,
      limits.maxCommittedGrantIds,
      limits.maxIdentifierLength,
      `${name}.committedGrantIds`,
    ),
  });
}

function cloneUnlocks(value, limits, name) {
  assertKnownKeys(value, UNLOCK_KEYS, name);
  return Object.freeze(Object.fromEntries([...UNLOCK_KEYS].map((key) => [
    key,
    boundedStringSet(
      value[key],
      limits.maxUnlockedPerKind,
      limits.maxIdentifierLength,
      `${name}.${key}`,
    ),
  ])));
}

function cloneSelection(value, unlocks, limits, name) {
  assertKnownKeys(value, SELECTION_KEYS, name);
  const characterId = boundedIdentifier(
    value.characterId,
    limits.maxIdentifierLength,
    `${name}.characterId`,
  );
  const appearanceId = value.appearanceId === null
    ? null
    : boundedIdentifier(value.appearanceId, limits.maxIdentifierLength, `${name}.appearanceId`);
  if (!unlocks.characterIds.includes(characterId)) {
    throw new RangeError(`${name}.characterId 必须已经解锁。`);
  }
  if (appearanceId !== null && !unlocks.appearanceIds.includes(appearanceId)) {
    throw new RangeError(`${name}.appearanceId 必须已经解锁。`);
  }
  return Object.freeze({ characterId, appearanceId });
}

function cloneSettings(value, name) {
  assertKnownKeys(value, SETTINGS_KEYS, name);
  if (!Object.values(PLAYER_PROFILE_QUALITY).includes(value.qualityProfile)) {
    throw new RangeError(`${name}.qualityProfile 不受支持。`);
  }
  return Object.freeze({
    soundEnabled: requiredBoolean(value.soundEnabled, `${name}.soundEnabled`),
    reducedMotion: requiredBoolean(value.reducedMotion, `${name}.reducedMotion`),
    qualityProfile: value.qualityProfile,
  });
}

export function assertPlayerProfileHasNoFutureSchema(definitionValue, value) {
  const definition = createPlayerProfileDefinition(definitionValue);
  let source;
  try {
    source = cloneFrozenData(value, 'PlayerProfile version probe');
  } catch {
    return true;
  }
  if (
    Number.isSafeInteger(source?.schemaVersion)
    && source.schemaVersion > definition.currentProfileSchemaVersion
  ) throw new RangeError('PlayerProfile 来自未来 schema。');
  return true;
}

export function createPlayerProfile(definitionValue, value = null) {
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
  const limits = definition.limits;
  const unlocks = cloneUnlocks(source.unlocks, limits, 'PlayerProfile.unlocks');
  return Object.freeze({
    schemaVersion: PLAYER_PROFILE_SCHEMA_VERSION,
    profileDefinitionId: definition.id,
    profileId: boundedIdentifier(source.profileId, limits.maxIdentifierLength, 'PlayerProfile.profileId'),
    revision: assertIntegerAtLeast(source.revision, 0, 'PlayerProfile.revision'),
    progression: cloneProgression(source.progression, limits, 'PlayerProfile.progression'),
    unlocks,
    selection: cloneSelection(source.selection, unlocks, limits, 'PlayerProfile.selection'),
    settings: cloneSettings(source.settings, 'PlayerProfile.settings'),
  });
}

export function advancePlayerProfile(definitionValue, currentValue, updateValue) {
  const definition = createPlayerProfileDefinition(definitionValue);
  const current = createPlayerProfile(definition, currentValue);
  const update = cloneFrozenData(updateValue, 'PlayerProfile update');
  assertKnownKeys(update, UPDATE_KEYS, 'PlayerProfile update');
  if (Object.keys(update).length === 0) {
    throw new RangeError('PlayerProfile update 不能是空更新。');
  }
  return createPlayerProfile(definition, {
    ...current,
    ...update,
    revision: current.revision + 1,
  });
}
