import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_WEAPON_LEARNING_CONTEXT_V1,
  ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1,
  createArenaV2LearningProfileDefinitionV1,
  type ArenaV2LearningProfileDefinitionV1,
  type ArenaV2WeaponLearningContextV1,
} from './arena-v2-learning-profile-definition-v1.js';

export const ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION = 1 as const;

export interface ArenaV2WeaponContextEvidenceDeltaV1 {
  readonly context: ArenaV2WeaponLearningContextV1;
  readonly evidenceDelta: 1;
}

export interface ArenaV2WeaponLearningDeltaV1 {
  readonly weaponDefinitionId: string;
  readonly useCountDelta: 0 | 1;
  readonly contextEvidence: readonly ArenaV2WeaponContextEvidenceDeltaV1[];
}

export interface ArenaV2MapSegmentLearningDeltaV1 {
  readonly mapDefinitionId: string;
  readonly segmentDefinitionId: string;
  readonly completionEvidenceDelta: 0 | 1;
  readonly raceFinishTicksCandidate: number | null;
  readonly survivalTicksCandidate: number | null;
}

export interface ArenaV2ModeLearningDeltaV1 {
  readonly modeDefinitionId: string;
  readonly playCountDelta: 1;
  readonly completionCountDelta: 0 | 1;
  readonly winCountDelta: 0 | 1;
  readonly bestPerformanceTicksCandidate: number | null;
}

export interface ArenaV2ChallengeLearningDeltaV1 {
  readonly challengeDefinitionId: string;
  readonly progressDelta: 1;
}

export interface ArenaV2LearningGrantV1 {
  readonly schemaVersion: typeof ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION;
  readonly grantId: string;
  readonly resultAuthorityHash: string;
  readonly recipientParticipantId: string;
  readonly sourceModeDefinitionId: string;
  readonly sourceMapDefinitionIds: readonly string[];
  readonly collectedWeaponDefinitionIds: readonly string[];
  readonly collectedMapDefinitionIds: readonly string[];
  readonly weaponDeltas: readonly ArenaV2WeaponLearningDeltaV1[];
  readonly mapSegmentDeltas: readonly ArenaV2MapSegmentLearningDeltaV1[];
  readonly modeDelta: ArenaV2ModeLearningDeltaV1;
  readonly challengeDeltas: readonly ArenaV2ChallengeLearningDeltaV1[];
}

// `collectedWeaponDefinitionIds` are authority-observed collection candidates.
// The reducer alone decides whether their accumulated use evidence reaches the
// Profile Definition threshold and therefore becomes a permanent collection.

const GRANT_KEYS = new Set([
  'schemaVersion', 'grantId', 'resultAuthorityHash', 'recipientParticipantId',
  'sourceModeDefinitionId', 'sourceMapDefinitionIds', 'collectedWeaponDefinitionIds',
  'collectedMapDefinitionIds', 'weaponDeltas', 'mapSegmentDeltas', 'modeDelta',
  'challengeDeltas',
]);
const WEAPON_KEYS = new Set(['weaponDefinitionId', 'useCountDelta', 'contextEvidence']);
const CONTEXT_KEYS = new Set(['context', 'evidenceDelta']);
const MAP_KEYS = new Set([
  'mapDefinitionId', 'segmentDefinitionId', 'completionEvidenceDelta',
  'raceFinishTicksCandidate', 'survivalTicksCandidate',
]);
const MODE_KEYS = new Set([
  'modeDefinitionId', 'playCountDelta', 'completionCountDelta', 'winCountDelta',
  'bestPerformanceTicksCandidate',
]);
const CHALLENGE_KEYS = new Set(['challengeDefinitionId', 'progressDelta']);

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
  const result = assertNonEmptyString(value, name);
  if (result.length > definition.limits.maxIdentifierLength) {
    throw new RangeError(`${name} 超出长度上限。`);
  }
  return result;
}

function authorityHash(value: unknown, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (!/^[0-9a-f]{8}$/u.test(result)) {
    throw new RangeError(`${name}必须是8位小写十六进制hash。`);
  }
  return result;
}

function exactOne(value: unknown, name: string): 1 {
  if (value !== 1) throw new RangeError(`${name} 每局必须精确为1。`);
  return 1;
}

function zeroOrOne(value: unknown, name: string): 0 | 1 {
  if (value !== 0 && value !== 1) {
    throw new RangeError(`${name} 每局只能为0或1。`);
  }
  return value;
}

function zeroOrPositive(value: unknown, definition: ArenaV2LearningProfileDefinitionV1, name: string) {
  const result = assertIntegerAtLeast(value, 0, name);
  if (result > definition.limits.maxCounterValue) throw new RangeError(`${name} 超出上限。`);
  return result;
}

function nullableCounter(
  value: unknown,
  definition: ArenaV2LearningProfileDefinitionV1,
  name: string,
): number | null {
  return value === null ? null : zeroOrPositive(value, definition, name);
}

function ids(
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

function ordered<T>(
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

export function createArenaV2LearningGrantV1(
  definitionValue: unknown,
  value: unknown,
): ArenaV2LearningGrantV1 {
  const definition = createArenaV2LearningProfileDefinitionV1(definitionValue);
  const source = cloneFrozenData(value, 'ArenaV2LearningGrantV1');
  exactRecord(source, GRANT_KEYS, 'ArenaV2LearningGrantV1');
  if (source.schemaVersion !== ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION) {
    throw new RangeError('ArenaV2LearningGrantV1 schema 不受支持。');
  }
  const grantId = identifier(source.grantId, definition, 'grant.grantId');
  const resultAuthorityHash = authorityHash(
    source.resultAuthorityHash,
    'grant.resultAuthorityHash',
  );
  const weaponSet = new Set(definition.weaponDefinitionIds);
  const mapById = new Map(definition.mapDefinitions.map((entry) => [entry.mapDefinitionId, entry]));
  const modeById = new Map(definition.modeDefinitions.map((entry) => [entry.modeDefinitionId, entry]));
  const challengeById = new Map(definition.challengeDefinitions.map((challenge) => (
    [challenge.challengeDefinitionId, challenge] as const
  )));

  const sourceModeDefinitionId = identifier(
    source.sourceModeDefinitionId,
    definition,
    'grant.sourceModeDefinitionId',
  );
  const sourceModeDefinition = modeById.get(sourceModeDefinitionId);
  if (sourceModeDefinition === undefined) throw new RangeError('grant 引用了未知来源模式。');
  const sourceMapDefinitionIds = ids(
    source.sourceMapDefinitionIds,
    definition.limits.maxCollectedMapIds,
    definition,
    'grant.sourceMapDefinitionIds',
  );
  if (sourceMapDefinitionIds.length === 0
    || sourceMapDefinitionIds.some((id) => !mapById.has(id))) {
    throw new RangeError('grant 必须引用至少一张已注册来源地图。');
  }
  const collectedWeaponDefinitionIds = ids(
    source.collectedWeaponDefinitionIds,
    definition.limits.maxCollectedWeaponIds,
    definition,
    'grant.collectedWeaponDefinitionIds',
  );
  if (collectedWeaponDefinitionIds.some((id) => !weaponSet.has(id))) {
    throw new RangeError('grant 收藏了未知武器。');
  }
  if (collectedWeaponDefinitionIds.length > 1) {
    throw new RangeError('每局最多只能有一把主研究武器。');
  }
  const collectedMapDefinitionIds = ids(
    source.collectedMapDefinitionIds,
    definition.limits.maxCollectedMapIds,
    definition,
    'grant.collectedMapDefinitionIds',
  );
  if (collectedMapDefinitionIds.some((id) => !mapById.has(id))) {
    throw new RangeError('grant 收藏了未知地图。');
  }
  if (collectedMapDefinitionIds.some((id) => !sourceMapDefinitionIds.includes(id))) {
    throw new RangeError('grant 只能收藏本局权威来源地图。');
  }

  const contextOrder = new Map(
    ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.map((context, index) => [context, index]),
  );
  const weaponDeltas = ordered(
    source.weaponDeltas,
    definition.limits.maxWeaponMasteryRecords,
    'grant.weaponDeltas',
    (candidate, index): ArenaV2WeaponLearningDeltaV1 => {
      const name = `grant.weaponDeltas[${index}]`;
      exactRecord(candidate, WEAPON_KEYS, name);
      const weaponDefinitionId = identifier(candidate.weaponDefinitionId, definition, `${name}.weaponDefinitionId`);
      if (!weaponSet.has(weaponDefinitionId)) throw new RangeError(`${name} 引用了未知武器。`);
      if (!Array.isArray(candidate.contextEvidence)
        || candidate.contextEvidence.length > ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1.length) {
        throw new RangeError(`${name}.contextEvidence 数量越界。`);
      }
      const contextEvidence = candidate.contextEvidence.map((entry, contextIndex) => {
        const contextName = `${name}.contextEvidence[${contextIndex}]`;
        exactRecord(entry, CONTEXT_KEYS, contextName);
        if (!contextOrder.has(entry.context as ArenaV2WeaponLearningContextV1)) {
          throw new RangeError(`${contextName}.context 不受支持。`);
        }
        return Object.freeze({
          context: entry.context as ArenaV2WeaponLearningContextV1,
          evidenceDelta: exactOne(entry.evidenceDelta, `${contextName}.evidenceDelta`),
        });
      });
      for (let contextIndex = 1; contextIndex < contextEvidence.length; contextIndex += 1) {
        if (contextOrder.get(contextEvidence[contextIndex - 1]!.context)!
          >= contextOrder.get(contextEvidence[contextIndex]!.context)!) {
          throw new RangeError(`${name}.contextEvidence 必须按固定情境顺序且唯一。`);
        }
      }
      const useCountDelta = zeroOrOne(candidate.useCountDelta, `${name}.useCountDelta`);
      if (contextEvidence.length === 0) {
        throw new RangeError(`${name} 每条武器事实必须携带至少一项本局情境证据。`);
      }
      if (useCountDelta > 0 && !collectedWeaponDefinitionIds.includes(weaponDefinitionId)) {
        throw new RangeError(`${name}.useCountDelta 只能授予本局主研究武器。`);
      }
      return Object.freeze({
        weaponDefinitionId,
        useCountDelta,
        contextEvidence: Object.freeze(contextEvidence),
      });
    },
    (entry) => entry.weaponDefinitionId,
  );
  for (const delta of weaponDeltas) {
    const contexts = new Set(delta.contextEvidence.map((entry) => entry.context));
    const hasSurvivalContext = contexts.has(
      ARENA_V2_WEAPON_LEARNING_CONTEXT_V1.SURVIVAL,
    );
    if (sourceModeDefinition.kind === 'survival') {
      if (!hasSurvivalContext) {
        throw new RangeError('grant.weaponDeltas Survival武器事实必须携带生存情境证据。');
      }
    } else if (hasSurvivalContext) {
      throw new RangeError('grant.weaponDeltas 非Survival模式不能携带生存情境证据。');
    }
    if (sourceModeDefinition.kind !== 'duel' && contexts.has(
      ARENA_V2_WEAPON_LEARNING_CONTEXT_V1.DUEL_COUNTERPLAY,
    )) {
      throw new RangeError('grant.weaponDeltas 非Duel模式不能携带1v1反制情境证据。');
    }
    if (!contexts.has(ARENA_V2_WEAPON_LEARNING_CONTEXT_V1.GROUND)
      && !contexts.has(ARENA_V2_WEAPON_LEARNING_CONTEXT_V1.AERIAL)) {
      throw new RangeError(
        'grant.weaponDeltas 每条武器事实必须携带地面或空中基础情境证据。',
      );
    }
  }
  if (weaponDeltas.length === 0) {
    if (collectedWeaponDefinitionIds.length !== 0) {
      throw new RangeError('grant.weaponDeltas 为空时不能携带主研究武器候选。');
    }
  } else {
    if (collectedWeaponDefinitionIds.length !== 1) {
      throw new RangeError('grant.weaponDeltas 非空时必须精确携带一把主研究武器候选。');
    }
    const featuredWeaponDeltas = weaponDeltas.filter((delta) => delta.useCountDelta === 1);
    if (featuredWeaponDeltas.length !== 1
      || featuredWeaponDeltas[0]!.weaponDefinitionId !== collectedWeaponDefinitionIds[0]) {
      throw new RangeError('grant.weaponDeltas 必须精确一条主研究证据且身份匹配收藏候选。');
    }
  }

  const mapSegmentDeltas = ordered(
    source.mapSegmentDeltas,
    definition.limits.maxMapSegmentMasteryRecords,
    'grant.mapSegmentDeltas',
    (candidate, index): ArenaV2MapSegmentLearningDeltaV1 => {
      const name = `grant.mapSegmentDeltas[${index}]`;
      exactRecord(candidate, MAP_KEYS, name);
      const mapDefinitionId = identifier(candidate.mapDefinitionId, definition, `${name}.mapDefinitionId`);
      const segmentDefinitionId = identifier(candidate.segmentDefinitionId, definition, `${name}.segmentDefinitionId`);
      if (!sourceMapDefinitionIds.includes(mapDefinitionId)
        || !mapById.get(mapDefinitionId)?.segmentDefinitionIds.includes(segmentDefinitionId)) {
        throw new RangeError(`${name} 不是当局来源地图的已注册段落。`);
      }
      const completionEvidenceDelta = zeroOrOne(
        candidate.completionEvidenceDelta,
        `${name}.completionEvidenceDelta`,
      );
      if (completionEvidenceDelta !== 1) {
        throw new RangeError(`${name} 每条地图段落事实必须携带本局完成证据。`);
      }
      const raceFinishTicksCandidate = nullableCounter(
        candidate.raceFinishTicksCandidate,
        definition,
        `${name}.raceFinishTicksCandidate`,
      );
      const survivalTicksCandidate = nullableCounter(
        candidate.survivalTicksCandidate,
        definition,
        `${name}.survivalTicksCandidate`,
      );
      return Object.freeze({
        mapDefinitionId,
        segmentDefinitionId,
        completionEvidenceDelta,
        raceFinishTicksCandidate,
        survivalTicksCandidate,
      });
    },
    (entry) => `${entry.mapDefinitionId}\u0000${entry.segmentDefinitionId}`,
  );

  exactRecord(source.modeDelta, MODE_KEYS, 'grant.modeDelta');
  const completionCountDelta = source.modeDelta.completionCountDelta;
  const winCountDelta = source.modeDelta.winCountDelta;
  if (source.modeDelta.modeDefinitionId !== sourceModeDefinitionId
    || source.modeDelta.playCountDelta !== 1
    || (completionCountDelta !== 0 && completionCountDelta !== 1)
    || (winCountDelta !== 0 && winCountDelta !== 1)) {
    throw new RangeError('grant.modeDelta 与单局来源或计数关系不一致。');
  }
  if (winCountDelta > completionCountDelta) {
    throw new RangeError('grant.modeDelta win不能超过completion。');
  }
  const bestPerformanceTicksCandidate = nullableCounter(
    source.modeDelta.bestPerformanceTicksCandidate,
    definition,
    'grant.modeDelta.bestPerformanceTicksCandidate',
  );
  const hasBestPerformanceCandidate = bestPerformanceTicksCandidate !== null;
  if (sourceModeDefinition.kind === 'duel') {
    if (completionCountDelta !== 1) {
      throw new RangeError('grant.modeDelta Duel每局必须计为有效完成。');
    }
    if ((winCountDelta > 0) !== hasBestPerformanceCandidate) {
      throw new RangeError('grant.modeDelta Duel胜场与最快胜利候选必须双向一致。');
    }
  }
  if (sourceModeDefinition.kind === 'race') {
    if (hasBestPerformanceCandidate && completionCountDelta !== 1) {
      throw new RangeError('grant.modeDelta Race最快到达候选必须来自有效完成。');
    }
    if ((winCountDelta > 0) !== hasBestPerformanceCandidate) {
      throw new RangeError('grant.modeDelta Race胜场与最快到达候选必须双向一致。');
    }
  }
  if (sourceModeDefinition.kind === 'survival') {
    if (completionCountDelta !== 1) {
      throw new RangeError('grant.modeDelta Survival每局必须计为有效完成。');
    }
    if (winCountDelta !== 0) {
      throw new RangeError('grant.modeDelta Survival胜场必须恒为0。');
    }
    if (!hasBestPerformanceCandidate) {
      throw new RangeError('grant.modeDelta Survival每局必须携带最长坚持候选。');
    }
  }
  const wholeMapCollectionEarned = sourceModeDefinition.kind === 'race'
    ? hasBestPerformanceCandidate
    : completionCountDelta === 1;
  const expectedCollectedMapDefinitionIds = wholeMapCollectionEarned
    ? sourceMapDefinitionIds
    : Object.freeze([]);
  if (collectedMapDefinitionIds.length !== expectedCollectedMapDefinitionIds.length
    || collectedMapDefinitionIds.some((id, index) => (
      id !== expectedCollectedMapDefinitionIds[index]
    ))) {
    throw new RangeError(
      'grant.collectedMapDefinitionIds 必须与本局整图收藏资格及来源地图精确一致。',
    );
  }
  if (sourceModeDefinition.kind === 'duel' && mapSegmentDeltas.some((delta) => (
    delta.raceFinishTicksCandidate !== null || delta.survivalTicksCandidate !== null
  ))) {
    throw new RangeError('grant.modeDelta Duel不能携带Race或Survival地图成绩候选。');
  }
  if (sourceModeDefinition.kind === 'race') {
    const raceFinishCandidates = mapSegmentDeltas.filter((delta) => (
      delta.raceFinishTicksCandidate !== null
    ));
    if (mapSegmentDeltas.some((delta) => delta.survivalTicksCandidate !== null)) {
      throw new RangeError('grant.modeDelta Race不能携带Survival地图成绩候选。');
    }
    for (const delta of raceFinishCandidates) {
      const finalSegmentDefinitionId = mapById.get(delta.mapDefinitionId)!
        .segmentDefinitionIds.at(-1)!;
      if (delta.segmentDefinitionId !== finalSegmentDefinitionId) {
        throw new RangeError('grant.modeDelta Race成绩候选只能记录在来源地图最终段。');
      }
      if (delta.raceFinishTicksCandidate !== bestPerformanceTicksCandidate) {
        throw new RangeError('grant.modeDelta Race段落成绩必须与模式最佳候选一致。');
      }
    }
    if (bestPerformanceTicksCandidate === null && raceFinishCandidates.length !== 0) {
      throw new RangeError('grant.modeDelta Race无模式最佳候选时不能携带段落成绩候选。');
    }
    if (bestPerformanceTicksCandidate !== null
      && mapSegmentDeltas.length > 0
      && raceFinishCandidates.length !== 1) {
      throw new RangeError('grant.modeDelta Race有段落证据时必须精确携带一个最终段成绩候选。');
    }
  }
  if (sourceModeDefinition.kind === 'survival') {
    if (mapSegmentDeltas.some((delta) => delta.raceFinishTicksCandidate !== null)) {
      throw new RangeError('grant.modeDelta Survival不能携带Race地图成绩候选。');
    }
    if (mapSegmentDeltas.some((delta) => (
      delta.survivalTicksCandidate === null
      || delta.survivalTicksCandidate !== bestPerformanceTicksCandidate
    ))) {
      throw new RangeError('grant.modeDelta Survival段落成绩必须全部存在且与模式最佳候选一致。');
    }
  }
  const modeDelta = Object.freeze({
    modeDefinitionId: sourceModeDefinitionId,
    playCountDelta: 1 as const,
    completionCountDelta,
    winCountDelta,
    bestPerformanceTicksCandidate,
  });

  const challengeDeltas = ordered(
    source.challengeDeltas,
    definition.limits.maxChallengeRecords,
    'grant.challengeDeltas',
    (candidate, index): ArenaV2ChallengeLearningDeltaV1 => {
      const name = `grant.challengeDeltas[${index}]`;
      exactRecord(candidate, CHALLENGE_KEYS, name);
      const challengeDefinitionId = identifier(
        candidate.challengeDefinitionId,
        definition,
        `${name}.challengeDefinitionId`,
      );
      const challenge = challengeById.get(challengeDefinitionId);
      if (challenge === undefined) throw new RangeError(`${name} 引用了未知挑战。`);
      if (challenge.modeDefinitionId !== null
        && challenge.modeDefinitionId !== sourceModeDefinitionId) {
        throw new RangeError(`${name} 的模式限定与本局来源模式不一致。`);
      }
      if (challenge.mapDefinitionId !== null
        && !sourceMapDefinitionIds.includes(challenge.mapDefinitionId)) {
        throw new RangeError(`${name} 的地图限定不在本局来源地图中。`);
      }
      if (challenge.segmentDefinitionId !== null
        && (challenge.mapDefinitionId === null || !mapSegmentDeltas.some((delta) => (
          delta.mapDefinitionId === challenge.mapDefinitionId
          && delta.segmentDefinitionId === challenge.segmentDefinitionId
        )))) {
        throw new RangeError(`${name} 的段落限定缺少本局精确地图段落证据。`);
      }
      const challengeWeaponDelta = challenge.weaponDefinitionId === null
        ? null
        : weaponDeltas.find((delta) => (
          delta.weaponDefinitionId === challenge.weaponDefinitionId
        )) ?? null;
      if (challenge.weaponDefinitionId !== null && challengeWeaponDelta === null) {
        throw new RangeError(`${name} 的武器限定缺少本局武器事实。`);
      }
      if (challenge.weaponDefinitionId !== null
        && challenge.segmentDefinitionId !== null
        && challengeWeaponDelta?.contextEvidence.length === 0) {
        throw new RangeError(`${name} 的武器与段落交叉限定至少需要一项武器情境证据。`);
      }
      return Object.freeze({
        challengeDefinitionId,
        progressDelta: exactOne(candidate.progressDelta, `${name}.progressDelta`),
      });
    },
    (entry) => entry.challengeDefinitionId,
  );

  return Object.freeze({
    schemaVersion: ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
    grantId,
    resultAuthorityHash,
    recipientParticipantId: identifier(
      source.recipientParticipantId,
      definition,
      'grant.recipientParticipantId',
    ),
    sourceModeDefinitionId,
    sourceMapDefinitionIds,
    collectedWeaponDefinitionIds,
    collectedMapDefinitionIds,
    weaponDeltas,
    mapSegmentDeltas,
    modeDelta,
    challengeDeltas,
  });
}

export function bindArenaV2LearningGrantToReplayEvidenceV1(
  definitionValue: unknown,
  grantValue: unknown,
  replayIdentityHashValue: unknown,
  settlementEvidenceHashValue: unknown,
): ArenaV2LearningGrantV1 {
  const definition = createArenaV2LearningProfileDefinitionV1(definitionValue);
  const grant = createArenaV2LearningGrantV1(definition, grantValue);
  const replayIdentityHash = authorityHash(
    replayIdentityHashValue,
    'Learning Grant Replay identity',
  );
  const settlementEvidenceHash = authorityHash(
    settlementEvidenceHashValue,
    'Learning Grant settlement evidence identity',
  );
  const resultGrantId = getArenaV2LearningResultGrantIdV1(grant.grantId);
  const resultIdentity = RESULT_GRANT_ID_PATTERN.exec(resultGrantId)?.[1];
  if (resultIdentity === undefined) {
    throw new RangeError('只有规范Arena Learning Result Grant才能绑定Replay证据。');
  }
  const boundGrantId = `l1:${resultIdentity}:${replayIdentityHash}:${settlementEvidenceHash}`;
  if (grant.grantId !== resultGrantId && grant.grantId !== boundGrantId) {
    throw new RangeError('Learning Grant拒绝替换已绑定的Replay结算身份。');
  }
  return createArenaV2LearningGrantV1(definition, {
    ...grant,
    grantId: boundGrantId,
  });
}

const RESULT_GRANT_ID_PATTERN = /^arena-learning:v1:([0-9a-f]{8})$/u;
const REPLAY_BOUND_GRANT_ID_PATTERN =
  /^l1:([0-9a-f]{8}):[0-9a-f]{8}:[0-9a-f]{8}$/u;

export function getArenaV2LearningResultGrantIdV1(grantIdValue: unknown): string {
  const grantId = assertNonEmptyString(grantIdValue, 'Learning Grant identity');
  if (RESULT_GRANT_ID_PATTERN.test(grantId)) return grantId;
  const replayBound = REPLAY_BOUND_GRANT_ID_PATTERN.exec(grantId);
  return replayBound === null ? grantId : `arena-learning:v1:${replayBound[1]}`;
}
