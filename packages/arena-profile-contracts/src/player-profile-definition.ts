import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';

export const PLAYER_PROFILE_DEFINITION_SCHEMA_VERSION = 1 as const;
export const PLAYER_PROFILE_SCHEMA_VERSION = 1 as const;

export const PLAYER_PROFILE_QUALITY = Object.freeze({
  AUTO: 'auto',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const);

export type PlayerProfileQuality =
  typeof PLAYER_PROFILE_QUALITY[keyof typeof PLAYER_PROFILE_QUALITY];

export interface PlayerProfileLimits {
  readonly maxUnlockedPerKind: number;
  readonly maxCommittedGrantIds: number;
  readonly maxExperience: number;
  readonly maxIdentifierLength: number;
}

export interface PlayerProfileProgression {
  readonly experience: number;
  readonly committedGrantIds: readonly string[];
}

export interface PlayerProfileUnlocks {
  readonly characterIds: readonly string[];
  readonly appearanceIds: readonly string[];
  readonly equipmentIds: readonly string[];
  readonly mapIds: readonly string[];
}

export interface PlayerProfileSelection {
  readonly characterId: string;
  readonly appearanceId: string | null;
}

export interface PlayerProfileSettings {
  readonly soundEnabled: boolean;
  readonly reducedMotion: boolean;
  readonly qualityProfile: PlayerProfileQuality;
}

export interface PlayerProfileDefaults {
  readonly profileId: string;
  readonly progression: PlayerProfileProgression;
  readonly unlocks: PlayerProfileUnlocks;
  readonly selection: PlayerProfileSelection;
  readonly settings: PlayerProfileSettings;
}

export interface PlayerProfileDefinitionData {
  readonly schemaVersion: typeof PLAYER_PROFILE_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly contentVersion: number;
  readonly currentProfileSchemaVersion: typeof PLAYER_PROFILE_SCHEMA_VERSION;
  readonly limits: PlayerProfileLimits;
  readonly defaults: PlayerProfileDefaults;
}

const DEFINITION_KEYS = new Set([
  'schemaVersion', 'id', 'contentVersion', 'currentProfileSchemaVersion', 'limits', 'defaults',
]);
const LIMIT_KEYS = new Set([
  'maxUnlockedPerKind', 'maxCommittedGrantIds', 'maxExperience', 'maxIdentifierLength',
]);
const DEFAULT_KEYS = new Set(['profileId', 'progression', 'unlocks', 'selection', 'settings']);
const PROGRESSION_KEYS = new Set(['experience', 'committedGrantIds']);
const UNLOCK_KEYS = new Set(['characterIds', 'appearanceIds', 'equipmentIds', 'mapIds']);
const SELECTION_KEYS = new Set(['characterId', 'appearanceId']);
const SETTINGS_KEYS = new Set(['soundEnabled', 'reducedMotion', 'qualityProfile']);
const QUALITY_VALUES: ReadonlySet<unknown> = new Set(Object.values(PLAYER_PROFILE_QUALITY));

function boundedIdentifier(value: unknown, maximum: number, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (result.length > maximum) throw new RangeError(`${name} 不能超过 ${maximum} 个字符。`);
  return result;
}

function boundedStringSet(
  values: unknown,
  maximumCount: number,
  maximumLength: number,
  name: string,
): readonly string[] {
  if (!Array.isArray(values)) throw new TypeError(`${name} 必须是数组。`);
  const result = cloneFrozenStringSet(values, name);
  if (result.length > maximumCount) throw new RangeError(`${name} 不能超过 ${maximumCount} 项。`);
  result.forEach((item, index) => boundedIdentifier(item, maximumLength, `${name}[${index}]`));
  return result;
}

function requiredBoolean(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name} 必须是布尔值。`);
  return value;
}

function qualityValue(value: unknown, name: string): PlayerProfileQuality {
  if (!QUALITY_VALUES.has(value)) throw new RangeError(`${name} 不受支持：${String(value)}。`);
  return value as PlayerProfileQuality;
}

function cloneLimits(value: unknown): PlayerProfileLimits {
  const name = 'PlayerProfileDefinition.limits';
  assertKnownKeys(value, LIMIT_KEYS, name);
  return Object.freeze({
    maxUnlockedPerKind: assertIntegerAtLeast(value.maxUnlockedPerKind, 1, `${name}.maxUnlockedPerKind`),
    maxCommittedGrantIds: assertIntegerAtLeast(value.maxCommittedGrantIds, 1, `${name}.maxCommittedGrantIds`),
    maxExperience: assertIntegerAtLeast(value.maxExperience, 0, `${name}.maxExperience`),
    maxIdentifierLength: assertIntegerAtLeast(value.maxIdentifierLength, 8, `${name}.maxIdentifierLength`),
  });
}

function cloneDefaults(value: unknown, limits: PlayerProfileLimits): PlayerProfileDefaults {
  const name = 'PlayerProfileDefinition.defaults';
  assertKnownKeys(value, DEFAULT_KEYS, name);
  assertKnownKeys(value.progression, PROGRESSION_KEYS, `${name}.progression`);
  const experience = assertIntegerAtLeast(
    value.progression.experience,
    0,
    `${name}.progression.experience`,
  );
  if (experience > limits.maxExperience) throw new RangeError(`${name}.progression.experience 超出上限。`);
  const committedGrantIds = boundedStringSet(
    value.progression.committedGrantIds,
    limits.maxCommittedGrantIds,
    limits.maxIdentifierLength,
    `${name}.progression.committedGrantIds`,
  );

  assertKnownKeys(value.unlocks, UNLOCK_KEYS, `${name}.unlocks`);
  const unlocks = Object.freeze({
    characterIds: boundedStringSet(value.unlocks.characterIds, limits.maxUnlockedPerKind, limits.maxIdentifierLength, `${name}.unlocks.characterIds`),
    appearanceIds: boundedStringSet(value.unlocks.appearanceIds, limits.maxUnlockedPerKind, limits.maxIdentifierLength, `${name}.unlocks.appearanceIds`),
    equipmentIds: boundedStringSet(value.unlocks.equipmentIds, limits.maxUnlockedPerKind, limits.maxIdentifierLength, `${name}.unlocks.equipmentIds`),
    mapIds: boundedStringSet(value.unlocks.mapIds, limits.maxUnlockedPerKind, limits.maxIdentifierLength, `${name}.unlocks.mapIds`),
  });

  assertKnownKeys(value.selection, SELECTION_KEYS, `${name}.selection`);
  const characterId = boundedIdentifier(value.selection.characterId, limits.maxIdentifierLength, `${name}.selection.characterId`);
  const appearanceId = value.selection.appearanceId === null
    ? null
    : boundedIdentifier(value.selection.appearanceId, limits.maxIdentifierLength, `${name}.selection.appearanceId`);
  if (!unlocks.characterIds.includes(characterId)) throw new RangeError(`${name}.selection.characterId 必须已经解锁。`);
  if (appearanceId !== null && !unlocks.appearanceIds.includes(appearanceId)) {
    throw new RangeError(`${name}.selection.appearanceId 必须已经解锁。`);
  }

  assertKnownKeys(value.settings, SETTINGS_KEYS, `${name}.settings`);
  return Object.freeze({
    profileId: boundedIdentifier(value.profileId, limits.maxIdentifierLength, `${name}.profileId`),
    progression: Object.freeze({ experience, committedGrantIds }),
    unlocks,
    selection: Object.freeze({ characterId, appearanceId }),
    settings: Object.freeze({
      soundEnabled: requiredBoolean(value.settings.soundEnabled, `${name}.settings.soundEnabled`),
      reducedMotion: requiredBoolean(value.settings.reducedMotion, `${name}.settings.reducedMotion`),
      qualityProfile: qualityValue(value.settings.qualityProfile, `${name}.settings.qualityProfile`),
    }),
  });
}

export class PlayerProfileDefinition implements PlayerProfileDefinitionData {
  declare readonly schemaVersion: typeof PLAYER_PROFILE_DEFINITION_SCHEMA_VERSION;
  declare readonly id: string;
  declare readonly contentVersion: number;
  declare readonly currentProfileSchemaVersion: typeof PLAYER_PROFILE_SCHEMA_VERSION;
  declare readonly limits: PlayerProfileLimits;
  declare readonly defaults: PlayerProfileDefaults;

  constructor(value: PlayerProfileDefinitionData) {
    const source = cloneFrozenData(value, 'PlayerProfileDefinition');
    assertKnownKeys(source, DEFINITION_KEYS, 'PlayerProfileDefinition');
    if (source.schemaVersion !== PLAYER_PROFILE_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(`不支持 PlayerProfileDefinition schema ${String(source.schemaVersion)}。`);
    }
    if (source.currentProfileSchemaVersion !== PLAYER_PROFILE_SCHEMA_VERSION) {
      throw new RangeError(`当前 PlayerProfile schema 必须是 ${PLAYER_PROFILE_SCHEMA_VERSION}。`);
    }
    const limits = cloneLimits(source.limits);
    Object.defineProperties(this, {
      schemaVersion: { value: PLAYER_PROFILE_DEFINITION_SCHEMA_VERSION, enumerable: true },
      id: { value: boundedIdentifier(source.id, limits.maxIdentifierLength, 'PlayerProfileDefinition.id'), enumerable: true },
      contentVersion: { value: assertIntegerAtLeast(source.contentVersion, 1, 'PlayerProfileDefinition.contentVersion'), enumerable: true },
      currentProfileSchemaVersion: { value: PLAYER_PROFILE_SCHEMA_VERSION, enumerable: true },
      limits: { value: limits, enumerable: true },
      defaults: { value: cloneDefaults(source.defaults, limits), enumerable: true },
    });
    Object.freeze(this);
  }

  toJSON(): PlayerProfileDefinitionData {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      contentVersion: this.contentVersion,
      currentProfileSchemaVersion: this.currentProfileSchemaVersion,
      limits: this.limits,
      defaults: this.defaults,
    };
  }

  getContentHash(): string {
    return createDeterministicDataHash(this.toJSON(), `PlayerProfileDefinition ${this.id}`);
  }
}

export function createPlayerProfileDefinition(value: unknown): PlayerProfileDefinition {
  return value instanceof PlayerProfileDefinition
    ? value
    : new PlayerProfileDefinition(value as PlayerProfileDefinitionData);
}
