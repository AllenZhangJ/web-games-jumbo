import { createDeterministicDataHash } from '../../../shared/deterministic-data-hash.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '../../rules/definition-utils.js';

export const PLAYER_PROFILE_DEFINITION_SCHEMA_VERSION = 1;
export const PLAYER_PROFILE_SCHEMA_VERSION = 1;

const DEFINITION_KEYS = new Set([
  'schemaVersion',
  'id',
  'contentVersion',
  'currentProfileSchemaVersion',
  'limits',
  'defaults',
]);
const LIMIT_KEYS = new Set([
  'maxUnlockedPerKind',
  'maxCommittedGrantIds',
  'maxExperience',
  'maxIdentifierLength',
]);
const DEFAULT_KEYS = new Set([
  'profileId',
  'progression',
  'unlocks',
  'selection',
  'settings',
]);
const PROGRESSION_KEYS = new Set(['experience', 'committedGrantIds']);
const UNLOCK_KEYS = new Set([
  'characterIds',
  'appearanceIds',
  'equipmentIds',
  'mapIds',
]);
const SELECTION_KEYS = new Set(['characterId', 'appearanceId']);
const SETTINGS_KEYS = new Set(['soundEnabled', 'reducedMotion', 'qualityProfile']);

export const PLAYER_PROFILE_QUALITY = Object.freeze({
  AUTO: 'auto',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
});

function boundedIdentifier(value, maximum, name) {
  const result = assertNonEmptyString(value, name);
  if (result.length > maximum) {
    throw new RangeError(`${name} 不能超过 ${maximum} 个字符。`);
  }
  return result;
}

function boundedStringSet(values, maximumCount, maximumLength, name) {
  const result = cloneFrozenStringSet(values, name);
  if (result.length > maximumCount) {
    throw new RangeError(`${name} 不能超过 ${maximumCount} 项。`);
  }
  for (let index = 0; index < result.length; index += 1) {
    boundedIdentifier(result[index], maximumLength, `${name}[${index}]`);
  }
  return result;
}

function enumValue(value, values, name) {
  if (!Object.values(values).includes(value)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value;
}

function requiredBoolean(value, name) {
  if (typeof value !== 'boolean') throw new TypeError(`${name} 必须是布尔值。`);
  return value;
}

function cloneLimits(value) {
  const name = 'PlayerProfileDefinition.limits';
  assertKnownKeys(value, LIMIT_KEYS, name);
  return Object.freeze({
    maxUnlockedPerKind: assertIntegerAtLeast(
      value.maxUnlockedPerKind,
      1,
      `${name}.maxUnlockedPerKind`,
    ),
    maxCommittedGrantIds: assertIntegerAtLeast(
      value.maxCommittedGrantIds,
      1,
      `${name}.maxCommittedGrantIds`,
    ),
    maxExperience: assertIntegerAtLeast(value.maxExperience, 0, `${name}.maxExperience`),
    maxIdentifierLength: assertIntegerAtLeast(
      value.maxIdentifierLength,
      8,
      `${name}.maxIdentifierLength`,
    ),
  });
}

function cloneDefaults(value, limits) {
  const name = 'PlayerProfileDefinition.defaults';
  assertKnownKeys(value, DEFAULT_KEYS, name);

  assertKnownKeys(value.progression, PROGRESSION_KEYS, `${name}.progression`);
  const experience = assertIntegerAtLeast(
    value.progression.experience,
    0,
    `${name}.progression.experience`,
  );
  if (experience > limits.maxExperience) {
    throw new RangeError(`${name}.progression.experience 超出上限。`);
  }
  const committedGrantIds = boundedStringSet(
    value.progression.committedGrantIds,
    limits.maxCommittedGrantIds,
    limits.maxIdentifierLength,
    `${name}.progression.committedGrantIds`,
  );

  assertKnownKeys(value.unlocks, UNLOCK_KEYS, `${name}.unlocks`);
  const unlocks = Object.freeze(Object.fromEntries([...UNLOCK_KEYS].map((key) => [
    key,
    boundedStringSet(
      value.unlocks[key],
      limits.maxUnlockedPerKind,
      limits.maxIdentifierLength,
      `${name}.unlocks.${key}`,
    ),
  ])));

  assertKnownKeys(value.selection, SELECTION_KEYS, `${name}.selection`);
  const characterId = boundedIdentifier(
    value.selection.characterId,
    limits.maxIdentifierLength,
    `${name}.selection.characterId`,
  );
  const appearanceId = value.selection.appearanceId === null
    ? null
    : boundedIdentifier(
      value.selection.appearanceId,
      limits.maxIdentifierLength,
      `${name}.selection.appearanceId`,
    );
  if (!unlocks.characterIds.includes(characterId)) {
    throw new RangeError(`${name}.selection.characterId 必须已经解锁。`);
  }
  if (appearanceId !== null && !unlocks.appearanceIds.includes(appearanceId)) {
    throw new RangeError(`${name}.selection.appearanceId 必须已经解锁。`);
  }

  assertKnownKeys(value.settings, SETTINGS_KEYS, `${name}.settings`);
  return Object.freeze({
    profileId: boundedIdentifier(
      value.profileId,
      limits.maxIdentifierLength,
      `${name}.profileId`,
    ),
    progression: Object.freeze({ experience, committedGrantIds }),
    unlocks,
    selection: Object.freeze({ characterId, appearanceId }),
    settings: Object.freeze({
      soundEnabled: requiredBoolean(value.settings.soundEnabled, `${name}.settings.soundEnabled`),
      reducedMotion: requiredBoolean(
        value.settings.reducedMotion,
        `${name}.settings.reducedMotion`,
      ),
      qualityProfile: enumValue(
        value.settings.qualityProfile,
        PLAYER_PROFILE_QUALITY,
        `${name}.settings.qualityProfile`,
      ),
    }),
  });
}

export class PlayerProfileDefinition {
  constructor(value) {
    const source = cloneFrozenData(value, 'PlayerProfileDefinition');
    assertKnownKeys(source, DEFINITION_KEYS, 'PlayerProfileDefinition');
    if (source.schemaVersion !== PLAYER_PROFILE_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(
        `不支持 PlayerProfileDefinition schema ${String(source.schemaVersion)}。`,
      );
    }
    if (source.currentProfileSchemaVersion !== PLAYER_PROFILE_SCHEMA_VERSION) {
      throw new RangeError(
        `当前 PlayerProfile schema 必须是 ${PLAYER_PROFILE_SCHEMA_VERSION}。`,
      );
    }
    const limits = cloneLimits(source.limits);
    Object.defineProperties(this, {
      schemaVersion: { value: PLAYER_PROFILE_DEFINITION_SCHEMA_VERSION, enumerable: true },
      id: {
        value: boundedIdentifier(source.id, limits.maxIdentifierLength, 'PlayerProfileDefinition.id'),
        enumerable: true,
      },
      contentVersion: {
        value: assertIntegerAtLeast(
          source.contentVersion,
          1,
          'PlayerProfileDefinition.contentVersion',
        ),
        enumerable: true,
      },
      currentProfileSchemaVersion: {
        value: PLAYER_PROFILE_SCHEMA_VERSION,
        enumerable: true,
      },
      limits: { value: limits, enumerable: true },
      defaults: { value: cloneDefaults(source.defaults, limits), enumerable: true },
    });
    Object.freeze(this);
  }

  toJSON() {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      contentVersion: this.contentVersion,
      currentProfileSchemaVersion: this.currentProfileSchemaVersion,
      limits: this.limits,
      defaults: this.defaults,
    };
  }

  getContentHash() {
    return createDeterministicDataHash(this.toJSON(), `PlayerProfileDefinition ${this.id}`);
  }
}

export function createPlayerProfileDefinition(value) {
  return value instanceof PlayerProfileDefinition ? value : new PlayerProfileDefinition(value);
}
