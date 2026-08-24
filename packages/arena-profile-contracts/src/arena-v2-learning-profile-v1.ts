import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
  cloneFrozenStringSet,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
  ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1,
  createArenaV2LearningProfileDefinitionV1,
  type ArenaV2LearningModeKindV1,
  type ArenaV2LearningProfileDefinitionV1,
  type ArenaV2WeaponLearningContextV1,
} from './arena-v2-learning-profile-definition-v1.js';

export interface ArenaV2WeaponContextMasteryV1 {
  readonly context: ArenaV2WeaponLearningContextV1;
  readonly evidenceCount: number;
  readonly completedAtRevision: number | null;
}

export interface ArenaV2WeaponMasteryRecordV1 {
  readonly weaponDefinitionId: string;
  readonly useCount: number;
  readonly contexts: readonly ArenaV2WeaponContextMasteryV1[];
}

export interface ArenaV2MapSegmentMasteryRecordV1 {
  readonly mapDefinitionId: string;
  readonly segmentDefinitionId: string;
  readonly completionEvidenceCount: number;
  readonly completedAtRevision: number | null;
  readonly bestRaceFinishTicks: number | null;
  readonly bestSurvivalTicks: number | null;
}

export interface ArenaV2ModeLearningRecordV1 {
  readonly modeDefinitionId: string;
  readonly kind: ArenaV2LearningModeKindV1;
  readonly playCount: number;
  readonly completionCount: number;
  readonly winCount: number;
  readonly completedAtRevision: number | null;
  readonly bestPerformanceTicks: number | null;
}

export interface ArenaV2ChallengeLearningRecordV1 {
  readonly challengeDefinitionId: string;
  readonly progress: number;
  readonly completedAtRevision: number | null;
}

export interface ArenaV2LearningProfileV1 {
  readonly schemaVersion: typeof ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION;
  readonly profileDefinitionId: string;
  readonly profileDefinitionContentVersion: number;
  readonly profileId: string;
  readonly revision: number;
  readonly committedGrantIds: readonly string[];
  readonly collections: Readonly<{
    readonly weaponDefinitionIds: readonly string[];
    readonly mapDefinitionIds: readonly string[];
  }>;
  readonly weaponMastery: readonly ArenaV2WeaponMasteryRecordV1[];
  readonly mapSegmentMastery: readonly ArenaV2MapSegmentMasteryRecordV1[];
  readonly modeRecords: readonly ArenaV2ModeLearningRecordV1[];
  readonly challenges: readonly ArenaV2ChallengeLearningRecordV1[];
}

const PROFILE_KEYS = new Set([
  'schemaVersion', 'profileDefinitionId', 'profileDefinitionContentVersion', 'profileId',
  'revision', 'committedGrantIds', 'collections', 'weaponMastery', 'mapSegmentMastery',
  'modeRecords', 'challenges',
]);
const COLLECTION_KEYS = new Set(['weaponDefinitionIds', 'mapDefinitionIds']);
const WEAPON_KEYS = new Set(['weaponDefinitionId', 'useCount', 'contexts']);
const CONTEXT_KEYS = new Set(['context', 'evidenceCount', 'completedAtRevision']);
const MAP_SEGMENT_KEYS = new Set([
  'mapDefinitionId', 'segmentDefinitionId', 'completionEvidenceCount',
  'completedAtRevision', 'bestRaceFinishTicks', 'bestSurvivalTicks',
]);
const MODE_KEYS = new Set([
  'modeDefinitionId', 'kind', 'playCount', 'completionCount', 'winCount',
  'completedAtRevision', 'bestPerformanceTicks',
]);
const CHALLENGE_KEYS = new Set([
  'challengeDefinitionId', 'progress', 'completedAtRevision',
]);

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

function identifier(value: unknown, definition: ArenaV2LearningProfileDefinitionV1, name: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  if (value.length > definition.limits.maxIdentifierLength) {
    throw new RangeError(`${name} 超出长度上限。`);
  }
  return value;
}

function counter(value: unknown, definition: ArenaV2LearningProfileDefinitionV1, name: string) {
  const result = assertIntegerAtLeast(value, 0, name);
  if (result > definition.limits.maxCounterValue) throw new RangeError(`${name} 超出计数上限。`);
  return result;
}

function nullableCounter(
  value: unknown,
  definition: ArenaV2LearningProfileDefinitionV1,
  name: string,
): number | null {
  return value === null ? null : counter(value, definition, name);
}

function assertModeRecordPerformanceInvariant(
  kind: ArenaV2LearningModeKindV1,
  playCount: number,
  completionCount: number,
  winCount: number,
  bestPerformanceTicks: number | null,
  name: string,
): void {
  const hasBestPerformance = bestPerformanceTicks !== null;
  if (kind === 'duel' && (winCount > 0) !== hasBestPerformance) {
    throw new RangeError(`${name} Duel胜场与最快胜利记录必须双向一致。`);
  }
  if (kind === 'race' && hasBestPerformance && completionCount === 0) {
    throw new RangeError(`${name} Race最快到达记录必须有至少一次有效完成。`);
  }
  if (kind === 'race' && (winCount > 0) !== hasBestPerformance) {
    throw new RangeError(`${name} Race胜场与最快到达记录必须双向一致。`);
  }
  if (kind === 'survival') {
    if (winCount !== 0) {
      throw new RangeError(`${name} Survival胜场必须恒为0。`);
    }
    if ((completionCount > 0) !== hasBestPerformance) {
      throw new RangeError(`${name} Survival有效完成与最长坚持记录必须双向一致。`);
    }
  }
  if (kind === 'duel' && completionCount !== playCount) {
    throw new RangeError(`${name} Duel完成次数必须与游玩次数严格一致。`);
  }
  if (kind === 'survival' && completionCount !== playCount) {
    throw new RangeError(`${name} Survival完成次数必须与游玩次数严格一致。`);
  }
}

function assertMapSegmentPerformanceInvariant(
  segmentDefinitionIds: readonly string[],
  segmentDefinitionId: string,
  completionEvidenceCount: number,
  bestRaceFinishTicks: number | null,
  bestSurvivalTicks: number | null,
  name: string,
): void {
  if (bestRaceFinishTicks !== null) {
    if (completionEvidenceCount === 0) {
      throw new RangeError(`${name} Race最佳成绩必须有至少一条段落完成证据。`);
    }
    if (segmentDefinitionId !== segmentDefinitionIds.at(-1)) {
      throw new RangeError(`${name} Race最佳成绩只能记录在地图最终段。`);
    }
  }
  if (bestSurvivalTicks !== null && completionEvidenceCount === 0) {
    throw new RangeError(`${name} Survival最佳成绩必须有至少一条段落完成证据。`);
  }
}

function completedRevision(
  value: unknown,
  profileRevision: number,
  complete: boolean,
  name: string,
): number | null {
  if (value === null) {
    if (complete) throw new RangeError(`${name} 已完成但缺少完成revision。`);
    return null;
  }
  const result = assertIntegerAtLeast(value, 1, name);
  if (!complete || result > profileRevision) throw new RangeError(`${name} 与完成状态不一致。`);
  return result;
}

function canonicalIds(
  value: unknown,
  maximum: number,
  definition: ArenaV2LearningProfileDefinitionV1,
  name: string,
): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} 必须是数组。`);
  const result = cloneFrozenStringSet(value, name);
  if (result.length > maximum) throw new RangeError(`${name} 超出数量上限。`);
  result.forEach((id, index) => identifier(id, definition, `${name}[${index}]`));
  return result;
}

function orderedRecords<T>(
  value: unknown,
  maximum: number,
  name: string,
  create: (item: unknown, index: number) => T,
  identity: (item: T) => string,
): readonly T[] {
  if (!Array.isArray(value) || value.length > maximum) throw new RangeError(`${name} 数量越界。`);
  const result = value.map(create);
  for (let index = 1; index < result.length; index += 1) {
    if (identity(result[index - 1]!) >= identity(result[index]!)) {
      throw new RangeError(`${name} 必须按身份稳定升序且唯一。`);
    }
  }
  return Object.freeze(result);
}

export function assertArenaV2LearningProfileV1HasNoFutureSchema(value: unknown): true {
  let source: unknown;
  try {
    source = cloneFrozenData(value, 'ArenaV2LearningProfileV1 version probe');
  } catch {
    return true;
  }
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    const schemaVersion = (source as Record<string, unknown>).schemaVersion;
    if (Number.isSafeInteger(schemaVersion)
      && (schemaVersion as number) > ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION) {
      throw new RangeError('ArenaV2LearningProfile 来自未来 schema。');
    }
  }
  return true;
}

export function createArenaV2LearningProfileV1(
  definitionValue: unknown,
  value: unknown = null,
): ArenaV2LearningProfileV1 {
  const definition = createArenaV2LearningProfileDefinitionV1(definitionValue);
  const source = value === null || value === undefined
    ? cloneFrozenData({
      schemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
      profileDefinitionId: definition.id,
      profileDefinitionContentVersion: definition.contentVersion,
      profileId: definition.defaultProfileId,
      revision: 0,
      committedGrantIds: [],
      collections: {
        weaponDefinitionIds: definition.initiallyCollectedWeaponDefinitionIds,
        mapDefinitionIds: definition.initiallyCollectedMapDefinitionIds,
      },
      weaponMastery: [],
      mapSegmentMastery: [],
      modeRecords: [],
      challenges: [],
    }, 'ArenaV2LearningProfileV1 defaults')
    : cloneFrozenData(value, 'ArenaV2LearningProfileV1');
  exactRecord(source, PROFILE_KEYS, 'ArenaV2LearningProfileV1');
  if (source.schemaVersion !== ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION) {
    throw new RangeError('ArenaV2LearningProfileV1 schema 不受支持。');
  }
  if (source.profileDefinitionId !== definition.id
    || source.profileDefinitionContentVersion !== definition.contentVersion) {
    throw new RangeError('ArenaV2LearningProfileV1 与当前Definition不一致。');
  }
  const revision = counter(source.revision, definition, 'profile.revision');
  exactRecord(source.collections, COLLECTION_KEYS, 'profile.collections');
  const weaponDefinitionIds = canonicalIds(
    source.collections.weaponDefinitionIds,
    definition.limits.maxCollectedWeaponIds,
    definition,
    'profile.collections.weaponDefinitionIds',
  );
  const allowedWeapons = new Set(definition.weaponDefinitionIds);
  if (weaponDefinitionIds.some((id) => !allowedWeapons.has(id))) {
    throw new RangeError('profile.collections 引用了未知武器。');
  }
  const collectedWeapons = new Set(weaponDefinitionIds);
  const mapDefinitionIds = canonicalIds(
    source.collections.mapDefinitionIds,
    definition.limits.maxCollectedMapIds,
    definition,
    'profile.collections.mapDefinitionIds',
  );
  const mapById = new Map(definition.mapDefinitions.map((entry) => [entry.mapDefinitionId, entry]));
  if (mapDefinitionIds.some((id) => !mapById.has(id))) {
    throw new RangeError('profile.collections 引用了未知地图。');
  }
  const weaponMastery = orderedRecords(
    source.weaponMastery,
    definition.limits.maxWeaponMasteryRecords,
    'profile.weaponMastery',
    (candidate, index): ArenaV2WeaponMasteryRecordV1 => {
      const name = `profile.weaponMastery[${index}]`;
      exactRecord(candidate, WEAPON_KEYS, name);
      const weaponDefinitionId = identifier(candidate.weaponDefinitionId, definition, `${name}.weaponDefinitionId`);
      if (!allowedWeapons.has(weaponDefinitionId)) throw new RangeError(`${name} 引用了未知武器。`);
      if (!Array.isArray(candidate.contexts)
        || candidate.contexts.length !== ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.length) {
        throw new RangeError(`${name}.contexts 必须覆盖全部五种学习情境。`);
      }
      const contexts = candidate.contexts.map((contextValue, contextIndex) => {
        const contextName = `${name}.contexts[${contextIndex}]`;
        exactRecord(contextValue, CONTEXT_KEYS, contextName);
        const context = ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1[contextIndex]!;
        if (contextValue.context !== context) throw new RangeError(`${contextName} 顺序或身份不一致。`);
        const evidenceCount = counter(contextValue.evidenceCount, definition, `${contextName}.evidenceCount`);
        const required = definition.masteryRequirements.weaponContextEvidence[context];
        if (evidenceCount > required) throw new RangeError(`${contextName}.evidenceCount 超过完成阈值。`);
        return Object.freeze({
          context,
          evidenceCount,
          completedAtRevision: completedRevision(
            contextValue.completedAtRevision,
            revision,
            evidenceCount === required,
            `${contextName}.completedAtRevision`,
          ),
        });
      });
      const useCount = counter(candidate.useCount, definition, `${name}.useCount`);
      if (useCount > definition.masteryRequirements.weaponCollectionUseEvidence) {
        throw new RangeError(`${name}.useCount 超过收藏研究阈值。`);
      }
      if (!collectedWeapons.has(weaponDefinitionId)
        && useCount >= definition.masteryRequirements.weaponCollectionUseEvidence) {
        throw new RangeError(`${name}达到收藏研究阈值但未进入武器收藏。`);
      }
      return Object.freeze({
        weaponDefinitionId,
        useCount,
        contexts: Object.freeze(contexts),
      });
    },
    (entry) => entry.weaponDefinitionId,
  );

  const mapSegmentMastery = orderedRecords(
    source.mapSegmentMastery,
    definition.limits.maxMapSegmentMasteryRecords,
    'profile.mapSegmentMastery',
    (candidate, index): ArenaV2MapSegmentMasteryRecordV1 => {
      const name = `profile.mapSegmentMastery[${index}]`;
      exactRecord(candidate, MAP_SEGMENT_KEYS, name);
      const mapDefinitionId = identifier(candidate.mapDefinitionId, definition, `${name}.mapDefinitionId`);
      const segmentDefinitionId = identifier(candidate.segmentDefinitionId, definition, `${name}.segmentDefinitionId`);
      const map = mapById.get(mapDefinitionId);
      if (!map || !map.segmentDefinitionIds.includes(segmentDefinitionId)) {
        throw new RangeError(`${name} 引用了未知地图或未知段落。`);
      }
      const completionEvidenceCount = counter(
        candidate.completionEvidenceCount,
        definition,
        `${name}.completionEvidenceCount`,
      );
      const required = definition.masteryRequirements.mapSegmentCompletionEvidence;
      if (completionEvidenceCount > required) throw new RangeError(`${name} 完成证据超过阈值。`);
      const bestRaceFinishTicks = nullableCounter(
        candidate.bestRaceFinishTicks,
        definition,
        `${name}.bestRaceFinishTicks`,
      );
      const bestSurvivalTicks = nullableCounter(
        candidate.bestSurvivalTicks,
        definition,
        `${name}.bestSurvivalTicks`,
      );
      assertMapSegmentPerformanceInvariant(
        map.segmentDefinitionIds,
        segmentDefinitionId,
        completionEvidenceCount,
        bestRaceFinishTicks,
        bestSurvivalTicks,
        name,
      );
      return Object.freeze({
        mapDefinitionId,
        segmentDefinitionId,
        completionEvidenceCount,
        completedAtRevision: completedRevision(
          candidate.completedAtRevision,
          revision,
          completionEvidenceCount === required,
          `${name}.completedAtRevision`,
        ),
        bestRaceFinishTicks,
        bestSurvivalTicks,
      });
    },
    (entry) => `${entry.mapDefinitionId}\u0000${entry.segmentDefinitionId}`,
  );

  const modeById = new Map(definition.modeDefinitions.map((entry) => [entry.modeDefinitionId, entry]));
  const modeRecords = orderedRecords(
    source.modeRecords,
    definition.limits.maxModeRecords,
    'profile.modeRecords',
    (candidate, index): ArenaV2ModeLearningRecordV1 => {
      const name = `profile.modeRecords[${index}]`;
      exactRecord(candidate, MODE_KEYS, name);
      const modeDefinitionId = identifier(candidate.modeDefinitionId, definition, `${name}.modeDefinitionId`);
      const mode = modeById.get(modeDefinitionId);
      if (!mode || candidate.kind !== mode.kind) throw new RangeError(`${name} 引用了未知或错误模式。`);
      const playCount = counter(candidate.playCount, definition, `${name}.playCount`);
      const completionCount = counter(candidate.completionCount, definition, `${name}.completionCount`);
      const winCount = counter(candidate.winCount, definition, `${name}.winCount`);
      if (completionCount > playCount || winCount > completionCount) {
        throw new RangeError(`${name} 的play/completion/win计数不闭合。`);
      }
      const complete = completionCount >= definition.masteryRequirements.modeCompletionEvidence;
      const bestPerformanceTicks = nullableCounter(
        candidate.bestPerformanceTicks,
        definition,
        `${name}.bestPerformanceTicks`,
      );
      assertModeRecordPerformanceInvariant(
        mode.kind,
        playCount,
        completionCount,
        winCount,
        bestPerformanceTicks,
        name,
      );
      return Object.freeze({
        modeDefinitionId,
        kind: mode.kind,
        playCount,
        completionCount,
        winCount,
        completedAtRevision: completedRevision(
          candidate.completedAtRevision,
          revision,
          complete,
          `${name}.completedAtRevision`,
        ),
        bestPerformanceTicks,
      });
    },
    (entry) => entry.modeDefinitionId,
  );

  const challengeById = new Map(
    definition.challengeDefinitions.map((entry) => [entry.challengeDefinitionId, entry]),
  );
  const challenges = orderedRecords(
    source.challenges,
    definition.limits.maxChallengeRecords,
    'profile.challenges',
    (candidate, index): ArenaV2ChallengeLearningRecordV1 => {
      const name = `profile.challenges[${index}]`;
      exactRecord(candidate, CHALLENGE_KEYS, name);
      const challengeDefinitionId = identifier(
        candidate.challengeDefinitionId,
        definition,
        `${name}.challengeDefinitionId`,
      );
      const challenge = challengeById.get(challengeDefinitionId);
      if (!challenge) throw new RangeError(`${name} 引用了未知挑战。`);
      const progress = counter(candidate.progress, definition, `${name}.progress`);
      if (progress > challenge.targetProgress) throw new RangeError(`${name}.progress 超过目标。`);
      return Object.freeze({
        challengeDefinitionId,
        progress,
        completedAtRevision: completedRevision(
          candidate.completedAtRevision,
          revision,
          progress === challenge.targetProgress,
          `${name}.completedAtRevision`,
        ),
      });
    },
    (entry) => entry.challengeDefinitionId,
  );

  return Object.freeze({
    schemaVersion: ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
    profileDefinitionId: definition.id,
    profileDefinitionContentVersion: definition.contentVersion,
    profileId: identifier(source.profileId, definition, 'profile.profileId'),
    revision,
    committedGrantIds: canonicalIds(
      source.committedGrantIds,
      definition.limits.maxCommittedGrantIds,
      definition,
      'profile.committedGrantIds',
    ),
    collections: Object.freeze({ weaponDefinitionIds, mapDefinitionIds }),
    weaponMastery,
    mapSegmentMastery,
    modeRecords,
    challenges,
  });
}
