import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
  createDeterministicDataHash,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';

export const ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION = 1 as const;

export const ARENA_V2_WEAPON_LEARNING_CONTEXT_V1 = Object.freeze({
  GROUND: 'ground',
  AERIAL: 'aerial',
  EDGE: 'edge',
  DUEL_COUNTERPLAY: 'duel-counterplay',
  SURVIVAL: 'survival',
} as const);

export type ArenaV2WeaponLearningContextV1 =
  typeof ARENA_V2_WEAPON_LEARNING_CONTEXT_V1[keyof typeof ARENA_V2_WEAPON_LEARNING_CONTEXT_V1];

export const ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1 = Object.freeze([
  ARENA_V2_WEAPON_LEARNING_CONTEXT_V1.GROUND,
  ARENA_V2_WEAPON_LEARNING_CONTEXT_V1.AERIAL,
  ARENA_V2_WEAPON_LEARNING_CONTEXT_V1.EDGE,
  ARENA_V2_WEAPON_LEARNING_CONTEXT_V1.DUEL_COUNTERPLAY,
  ARENA_V2_WEAPON_LEARNING_CONTEXT_V1.SURVIVAL,
] as const);

export type ArenaV2LearningModeKindV1 = 'duel' | 'race' | 'survival';

export interface ArenaV2LearningProfileLimitsV1 {
  readonly maxIdentifierLength: number;
  readonly maxCommittedGrantIds: number;
  readonly maxCounterValue: number;
  readonly maxCollectedWeaponIds: number;
  readonly maxCollectedMapIds: number;
  readonly maxWeaponMasteryRecords: number;
  readonly maxMapSegmentMasteryRecords: number;
  readonly maxModeRecords: number;
  readonly maxChallengeRecords: number;
}

export interface ArenaV2LearningMasteryRequirementsV1 {
  readonly weaponCollectionUseEvidence: number;
  readonly weaponContextEvidence: Readonly<Record<ArenaV2WeaponLearningContextV1, number>>;
  readonly mapSegmentCompletionEvidence: number;
  readonly modeCompletionEvidence: number;
}

export interface ArenaV2LearningMapDefinitionV1 {
  readonly mapDefinitionId: string;
  readonly segmentDefinitionIds: readonly string[];
}

export interface ArenaV2LearningModeDefinitionV1 {
  readonly modeDefinitionId: string;
  readonly kind: ArenaV2LearningModeKindV1;
}

export interface ArenaV2LearningChallengeDefinitionV1 {
  readonly challengeDefinitionId: string;
  readonly targetProgress: number;
  readonly weaponDefinitionId: string | null;
  readonly mapDefinitionId: string | null;
  readonly segmentDefinitionId: string | null;
  readonly modeDefinitionId: string | null;
}

export interface ArenaV2LearningProfileDefinitionV1 {
  readonly schemaVersion: typeof ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION;
  readonly id: string;
  readonly contentVersion: number;
  readonly currentProfileSchemaVersion: typeof ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly defaultProfileServiceWired: false;
  readonly limits: ArenaV2LearningProfileLimitsV1;
  readonly masteryRequirements: ArenaV2LearningMasteryRequirementsV1;
  readonly defaultProfileId: string;
  readonly initiallyCollectedWeaponDefinitionIds: readonly string[];
  readonly initiallyCollectedMapDefinitionIds: readonly string[];
  readonly weaponDefinitionIds: readonly string[];
  readonly mapDefinitions: readonly ArenaV2LearningMapDefinitionV1[];
  readonly modeDefinitions: readonly ArenaV2LearningModeDefinitionV1[];
  readonly challengeDefinitions: readonly ArenaV2LearningChallengeDefinitionV1[];
  readonly contentHash: string;
}

const CREATE_DEFINITION_KEYS = new Set([
  'schemaVersion', 'id', 'contentVersion', 'currentProfileSchemaVersion', 'status',
  'hardGate', 'defaultProfileServiceWired', 'limits', 'masteryRequirements',
  'defaultProfileId', 'initiallyCollectedWeaponDefinitionIds',
  'initiallyCollectedMapDefinitionIds', 'weaponDefinitionIds', 'mapDefinitions',
  'modeDefinitions', 'challengeDefinitions',
]);
const DEFINITION_KEYS = new Set([...CREATE_DEFINITION_KEYS, 'contentHash']);
const LIMIT_KEYS = new Set([
  'maxIdentifierLength', 'maxCommittedGrantIds', 'maxCounterValue',
  'maxCollectedWeaponIds', 'maxCollectedMapIds', 'maxWeaponMasteryRecords',
  'maxMapSegmentMasteryRecords', 'maxModeRecords', 'maxChallengeRecords',
]);
const REQUIREMENT_KEYS = new Set([
  'weaponCollectionUseEvidence', 'weaponContextEvidence',
  'mapSegmentCompletionEvidence', 'modeCompletionEvidence',
]);
const CONTEXT_KEYS = new Set(ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1);
const MAP_KEYS = new Set(['mapDefinitionId', 'segmentDefinitionIds']);
const MODE_KEYS = new Set(['modeDefinitionId', 'kind']);
const CHALLENGE_KEYS = new Set([
  'challengeDefinitionId', 'targetProgress', 'weaponDefinitionId', 'mapDefinitionId',
  'segmentDefinitionId', 'modeDefinitionId',
]);
const MODE_KINDS = new Set<unknown>(['duel', 'race', 'survival']);

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is PlainRecord {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name} 缺少字段 ${key}。`);
  }
}

function boundedIdentifier(value: unknown, maximum: number, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (result.length > maximum) throw new RangeError(`${name} 超出长度上限。`);
  return result;
}

function identifiers(
  value: unknown,
  maximumCount: number,
  maximumLength: number,
  name: string,
): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} 必须是数组。`);
  const result = cloneFrozenStringSet(value, name);
  if (result.length > maximumCount) throw new RangeError(`${name} 超出数量上限。`);
  result.forEach((id, index) => boundedIdentifier(id, maximumLength, `${name}[${index}]`));
  return result;
}

function limits(value: unknown): ArenaV2LearningProfileLimitsV1 {
  exactRecord(value, LIMIT_KEYS, 'ArenaV2LearningProfileDefinitionV1.limits');
  const result = Object.freeze({
    maxIdentifierLength: assertIntegerAtLeast(value.maxIdentifierLength, 32, 'limits.maxIdentifierLength'),
    maxCommittedGrantIds: assertIntegerAtLeast(value.maxCommittedGrantIds, 1, 'limits.maxCommittedGrantIds'),
    maxCounterValue: assertIntegerAtLeast(value.maxCounterValue, 1, 'limits.maxCounterValue'),
    maxCollectedWeaponIds: assertIntegerAtLeast(value.maxCollectedWeaponIds, 1, 'limits.maxCollectedWeaponIds'),
    maxCollectedMapIds: assertIntegerAtLeast(value.maxCollectedMapIds, 1, 'limits.maxCollectedMapIds'),
    maxWeaponMasteryRecords: assertIntegerAtLeast(value.maxWeaponMasteryRecords, 1, 'limits.maxWeaponMasteryRecords'),
    maxMapSegmentMasteryRecords: assertIntegerAtLeast(value.maxMapSegmentMasteryRecords, 1, 'limits.maxMapSegmentMasteryRecords'),
    maxModeRecords: assertIntegerAtLeast(value.maxModeRecords, 1, 'limits.maxModeRecords'),
    maxChallengeRecords: assertIntegerAtLeast(value.maxChallengeRecords, 1, 'limits.maxChallengeRecords'),
  });
  if (result.maxCounterValue > Number.MAX_SAFE_INTEGER) {
    throw new RangeError('limits.maxCounterValue 不能超过安全整数。');
  }
  return result;
}

function masteryRequirements(value: unknown): ArenaV2LearningMasteryRequirementsV1 {
  exactRecord(value, REQUIREMENT_KEYS, 'ArenaV2LearningProfileDefinitionV1.masteryRequirements');
  const weaponContextEvidence = value.weaponContextEvidence;
  exactRecord(weaponContextEvidence, CONTEXT_KEYS, 'masteryRequirements.weaponContextEvidence');
  const contextEntries = ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.map((context) => [
    context,
    assertIntegerAtLeast(
      weaponContextEvidence[context],
      1,
      `masteryRequirements.weaponContextEvidence.${context}`,
    ),
  ] as const);
  return Object.freeze({
    weaponCollectionUseEvidence: assertIntegerAtLeast(
      value.weaponCollectionUseEvidence,
      1,
      'masteryRequirements.weaponCollectionUseEvidence',
    ),
    weaponContextEvidence: Object.freeze(Object.fromEntries(contextEntries)) as Readonly<
      Record<ArenaV2WeaponLearningContextV1, number>
    >,
    mapSegmentCompletionEvidence: assertIntegerAtLeast(
      value.mapSegmentCompletionEvidence,
      1,
      'masteryRequirements.mapSegmentCompletionEvidence',
    ),
    modeCompletionEvidence: assertIntegerAtLeast(
      value.modeCompletionEvidence,
      1,
      'masteryRequirements.modeCompletionEvidence',
    ),
  });
}

function nullableIdentifier(value: unknown, maximum: number, name: string): string | null {
  return value === null ? null : boundedIdentifier(value, maximum, name);
}

export function createArenaV2LearningProfileDefinitionV1(
  value: unknown,
): ArenaV2LearningProfileDefinitionV1 {
  const source = cloneFrozenData(value, 'ArenaV2LearningProfileDefinitionV1');
  const includesContentHash = typeof source === 'object'
    && source !== null
    && Object.hasOwn(source, 'contentHash');
  exactRecord(
    source,
    includesContentHash ? DEFINITION_KEYS : CREATE_DEFINITION_KEYS,
    'ArenaV2LearningProfileDefinitionV1',
  );
  if (source.schemaVersion !== ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION
    || source.currentProfileSchemaVersion !== ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION) {
    throw new RangeError('ArenaV2LearningProfileDefinitionV1 schema 不受支持。');
  }
  if (source.status !== 'production-unreachable'
    || source.hardGate !== false
    || source.defaultProfileServiceWired !== false) {
    throw new RangeError('ArenaV2LearningProfileDefinitionV1 不得提前接入生产。');
  }
  const profileLimits = limits(source.limits);
  const requirement = masteryRequirements(source.masteryRequirements);
  const weaponDefinitionIds = identifiers(
    source.weaponDefinitionIds,
    profileLimits.maxWeaponMasteryRecords,
    profileLimits.maxIdentifierLength,
    'weaponDefinitionIds',
  );
  const weaponSet = new Set(weaponDefinitionIds);
  if (weaponDefinitionIds.length === 0) throw new RangeError('weaponDefinitionIds 不能为空。');

  if (!Array.isArray(source.mapDefinitions)) throw new TypeError('mapDefinitions 必须是数组。');
  if (source.mapDefinitions.length === 0
    || source.mapDefinitions.length > profileLimits.maxCollectedMapIds) {
    throw new RangeError('mapDefinitions 数量越界。');
  }
  let segmentCount = 0;
  const mapDefinitions = source.mapDefinitions.map((entry, index) => {
    const name = `mapDefinitions[${index}]`;
    exactRecord(entry, MAP_KEYS, name);
    const mapDefinitionId = boundedIdentifier(
      entry.mapDefinitionId,
      profileLimits.maxIdentifierLength,
      `${name}.mapDefinitionId`,
    );
    const segmentDefinitionIds = identifiers(
      entry.segmentDefinitionIds,
      profileLimits.maxMapSegmentMasteryRecords,
      profileLimits.maxIdentifierLength,
      `${name}.segmentDefinitionIds`,
    );
    if (segmentDefinitionIds.length === 0) throw new RangeError(`${name} 必须包含地图段落。`);
    segmentCount += segmentDefinitionIds.length;
    return Object.freeze({ mapDefinitionId, segmentDefinitionIds });
  }).sort((left, right) => (
    left.mapDefinitionId < right.mapDefinitionId
      ? -1
      : left.mapDefinitionId > right.mapDefinitionId ? 1 : 0
  ));
  if (segmentCount > profileLimits.maxMapSegmentMasteryRecords) {
    throw new RangeError('地图段落总数超出Profile上限。');
  }
  const mapIds = mapDefinitions.map(({ mapDefinitionId }) => mapDefinitionId);
  if (new Set(mapIds).size !== mapIds.length) throw new RangeError('mapDefinitions 身份重复。');
  const mapById = new Map(mapDefinitions.map((entry) => [entry.mapDefinitionId, entry]));

  if (!Array.isArray(source.modeDefinitions)) throw new TypeError('modeDefinitions 必须是数组。');
  if (source.modeDefinitions.length === 0
    || source.modeDefinitions.length > profileLimits.maxModeRecords) {
    throw new RangeError('modeDefinitions 数量越界。');
  }
  const modeDefinitions = source.modeDefinitions.map((entry, index) => {
    const name = `modeDefinitions[${index}]`;
    exactRecord(entry, MODE_KEYS, name);
    if (!MODE_KINDS.has(entry.kind)) throw new RangeError(`${name}.kind 不受支持。`);
    return Object.freeze({
      modeDefinitionId: boundedIdentifier(
        entry.modeDefinitionId,
        profileLimits.maxIdentifierLength,
        `${name}.modeDefinitionId`,
      ),
      kind: entry.kind as ArenaV2LearningModeKindV1,
    });
  }).sort((left, right) => (
    left.modeDefinitionId < right.modeDefinitionId
      ? -1
      : left.modeDefinitionId > right.modeDefinitionId ? 1 : 0
  ));
  const modeIds = modeDefinitions.map(({ modeDefinitionId }) => modeDefinitionId);
  if (new Set(modeIds).size !== modeIds.length) throw new RangeError('modeDefinitions 身份重复。');
  const modeSet = new Set(modeIds);

  if (!Array.isArray(source.challengeDefinitions)
    || source.challengeDefinitions.length > profileLimits.maxChallengeRecords) {
    throw new RangeError('challengeDefinitions 数量越界。');
  }
  const challengeDefinitions = source.challengeDefinitions.map((entry, index) => {
    const name = `challengeDefinitions[${index}]`;
    exactRecord(entry, CHALLENGE_KEYS, name);
    const weaponDefinitionId = nullableIdentifier(
      entry.weaponDefinitionId,
      profileLimits.maxIdentifierLength,
      `${name}.weaponDefinitionId`,
    );
    const mapDefinitionId = nullableIdentifier(
      entry.mapDefinitionId,
      profileLimits.maxIdentifierLength,
      `${name}.mapDefinitionId`,
    );
    const segmentDefinitionId = nullableIdentifier(
      entry.segmentDefinitionId,
      profileLimits.maxIdentifierLength,
      `${name}.segmentDefinitionId`,
    );
    const modeDefinitionId = nullableIdentifier(
      entry.modeDefinitionId,
      profileLimits.maxIdentifierLength,
      `${name}.modeDefinitionId`,
    );
    const dimensions = [weaponDefinitionId, mapDefinitionId, segmentDefinitionId, modeDefinitionId]
      .filter((item) => item !== null).length;
    if (dimensions < 2) throw new RangeError(`${name} 必须是至少两个维度的交叉挑战。`);
    if (weaponDefinitionId !== null && !weaponSet.has(weaponDefinitionId)) {
      throw new RangeError(`${name} 引用了未知武器。`);
    }
    const map = mapDefinitionId === null ? null : mapById.get(mapDefinitionId);
    if (mapDefinitionId !== null && !map) throw new RangeError(`${name} 引用了未知地图。`);
    if (segmentDefinitionId !== null && (!map || !map.segmentDefinitionIds.includes(segmentDefinitionId))) {
      throw new RangeError(`${name} 的地图段落不属于指定地图。`);
    }
    if (modeDefinitionId !== null && !modeSet.has(modeDefinitionId)) {
      throw new RangeError(`${name} 引用了未知模式。`);
    }
    return Object.freeze({
      challengeDefinitionId: boundedIdentifier(
        entry.challengeDefinitionId,
        profileLimits.maxIdentifierLength,
        `${name}.challengeDefinitionId`,
      ),
      targetProgress: assertIntegerAtLeast(entry.targetProgress, 1, `${name}.targetProgress`),
      weaponDefinitionId,
      mapDefinitionId,
      segmentDefinitionId,
      modeDefinitionId,
    });
  }).sort((left, right) => (
    left.challengeDefinitionId < right.challengeDefinitionId
      ? -1
      : left.challengeDefinitionId > right.challengeDefinitionId ? 1 : 0
  ));
  const challengeIds = challengeDefinitions.map(({ challengeDefinitionId }) => challengeDefinitionId);
  if (new Set(challengeIds).size !== challengeIds.length) {
    throw new RangeError('challengeDefinitions 身份重复。');
  }

  const initiallyCollectedWeaponDefinitionIds = identifiers(
    source.initiallyCollectedWeaponDefinitionIds,
    profileLimits.maxCollectedWeaponIds,
    profileLimits.maxIdentifierLength,
    'initiallyCollectedWeaponDefinitionIds',
  );
  if (initiallyCollectedWeaponDefinitionIds.some((id) => !weaponSet.has(id))) {
    throw new RangeError('初始收藏引用未知武器。');
  }
  const mapSet = new Set(mapIds);
  const initiallyCollectedMapDefinitionIds = identifiers(
    source.initiallyCollectedMapDefinitionIds,
    profileLimits.maxCollectedMapIds,
    profileLimits.maxIdentifierLength,
    'initiallyCollectedMapDefinitionIds',
  );
  if (initiallyCollectedMapDefinitionIds.some((id) => !mapSet.has(id))) {
    throw new RangeError('初始收藏引用未知地图。');
  }
  const authority = Object.freeze({
    schemaVersion: ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
    id: boundedIdentifier(source.id, profileLimits.maxIdentifierLength, 'definition.id'),
    contentVersion: assertIntegerAtLeast(source.contentVersion, 1, 'definition.contentVersion'),
    currentProfileSchemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultProfileServiceWired: false as const,
    limits: profileLimits,
    masteryRequirements: requirement,
    defaultProfileId: boundedIdentifier(
      source.defaultProfileId,
      profileLimits.maxIdentifierLength,
      'definition.defaultProfileId',
    ),
    initiallyCollectedWeaponDefinitionIds,
    initiallyCollectedMapDefinitionIds,
    weaponDefinitionIds,
    mapDefinitions: Object.freeze(mapDefinitions),
    modeDefinitions: Object.freeze(modeDefinitions),
    challengeDefinitions: Object.freeze(challengeDefinitions),
  });
  const result = Object.freeze({
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      `ArenaV2LearningProfileDefinitionV1 ${authority.id}`,
    ),
  });
  if (includesContentHash && source.contentHash !== result.contentHash) {
    throw new RangeError('ArenaV2LearningProfileDefinitionV1.contentHash 不一致。');
  }
  return result;
}

export function assertArenaV2LearningProfileDefinitionV1HasNoFutureSchema(
  value: unknown,
): true {
  const source = cloneFrozenData(value, 'ArenaV2LearningProfileDefinitionV1 version probe');
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    const schemaVersion = (source as Record<string, unknown>).schemaVersion;
    if (Number.isSafeInteger(schemaVersion)
      && (schemaVersion as number) > ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION) {
      throw new RangeError('ArenaV2LearningProfileDefinition 来自未来 schema。');
    }
  }
  return true;
}
