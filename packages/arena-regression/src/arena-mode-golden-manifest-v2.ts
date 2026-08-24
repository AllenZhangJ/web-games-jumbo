import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';

export const ARENA_MODE_GOLDEN_MANIFEST_V2_SCHEMA_VERSION = 2 as const;
export const ARENA_MODE_GOLDEN_MANIFEST_V2_CANDIDATE_STATUS = 'production-unreachable' as const;
export const ARENA_MODE_GOLDEN_MANIFEST_V2_MAXIMUM_ENTRIES = 256 as const;

export type ArenaModeGoldenManifestV2ModeKind = 'duel' | 'race' | 'survival';

export interface ArenaModeGoldenManifestEntryV2 {
  readonly id: string;
  readonly modeKind: ArenaModeGoldenManifestV2ModeKind;
  readonly modeDefinitionId: string;
  readonly fixtureDefinitionId: string | null;
  readonly matchSeed: number;
  readonly participantCount: number;
  readonly enemySlotCount: number;
  readonly regressionCandidateId: string;
  readonly replayIdentityHash: string;
  readonly checkpointSequenceHash: string;
  readonly modeResultHash: string;
  readonly finalHash: string;
  readonly regressionResultHash: string;
}

export interface ArenaModeGoldenManifestV2 {
  readonly schemaVersion: typeof ARENA_MODE_GOLDEN_MANIFEST_V2_SCHEMA_VERSION;
  readonly candidateStatus: typeof ARENA_MODE_GOLDEN_MANIFEST_V2_CANDIDATE_STATUS;
  readonly id: string;
  readonly sourceCommit: string;
  readonly replaySchemaVersion: 6;
  readonly entries: readonly Readonly<ArenaModeGoldenManifestEntryV2>[];
  readonly resultHash: string;
}

export type ArenaModeGoldenManifestV2CreateOptions = Omit<
  ArenaModeGoldenManifestV2,
  'resultHash'
>;

const CREATE_KEYS: ReadonlySet<string> = new Set([
  'schemaVersion', 'candidateStatus', 'id', 'sourceCommit', 'replaySchemaVersion', 'entries',
]);
const MANIFEST_KEYS: ReadonlySet<string> = new Set([...CREATE_KEYS, 'resultHash']);
const ENTRY_KEYS: ReadonlySet<string> = new Set([
  'id',
  'modeKind',
  'modeDefinitionId',
  'fixtureDefinitionId',
  'matchSeed',
  'participantCount',
  'enemySlotCount',
  'regressionCandidateId',
  'replayIdentityHash',
  'checkpointSequenceHash',
  'modeResultHash',
  'finalHash',
  'regressionResultHash',
]);
const MODE_KINDS: ReadonlySet<unknown> = new Set(['duel', 'race', 'survival']);
const ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u;
const HASH_PATTERN = /^[0-9a-f]{8}$/u;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/u;
const UINT32_MAXIMUM = 0xffffffff;

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key} 为必填字段。`);
  }
}

function stableId(value: unknown, name: string): string {
  const id = assertNonEmptyString(value, name);
  if (!ID_PATTERN.test(id)) throw new RangeError(`${name} 格式无效。`);
  return id;
}

function testFixtureId(value: unknown, name: string): string {
  const id = stableId(value, name);
  if (!id.includes('.test.')) {
    throw new RangeError(`${name} 必须保持显式 .test. fixture identity。`);
  }
  return id;
}

function hash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name} 必须是8位小写十六进制hash。`);
  }
  return value;
}

function uint32(value: unknown, name: string): number {
  const result = assertIntegerAtLeast(value, 0, name);
  if (result > UINT32_MAXIMUM) throw new RangeError(`${name} 必须是uint32。`);
  return result;
}

function cloneEntry(value: unknown, index: number): Readonly<ArenaModeGoldenManifestEntryV2> {
  const name = `ArenaModeGoldenManifestV2.entries[${index}]`;
  exactRecord(value, ENTRY_KEYS, name);
  if (!MODE_KINDS.has(value.modeKind)) {
    throw new RangeError(`${name}.modeKind 不受支持。`);
  }
  const modeKind = value.modeKind as ArenaModeGoldenManifestV2ModeKind;
  const modeDefinitionId = stableId(value.modeDefinitionId, `${name}.modeDefinitionId`);
  const participantCount = assertIntegerAtLeast(
    value.participantCount,
    1,
    `${name}.participantCount`,
  );
  const enemySlotCount = assertIntegerAtLeast(
    value.enemySlotCount,
    0,
    `${name}.enemySlotCount`,
  );
  let fixtureDefinitionId: string | null;
  if (modeKind === 'duel') {
    if (participantCount !== 2 || enemySlotCount !== 0) {
      throw new RangeError(`${name} Duel 必须精确为2名participant且无enemy slot。`);
    }
    if (value.fixtureDefinitionId !== null) {
      throw new RangeError(`${name} Duel 不得伪造未决fixture。`);
    }
    fixtureDefinitionId = null;
  } else {
    fixtureDefinitionId = testFixtureId(
      value.fixtureDefinitionId,
      `${name}.fixtureDefinitionId`,
    );
    if (modeKind === 'race') {
      if (participantCount < 2 || participantCount > 4 || enemySlotCount !== 0) {
        throw new RangeError(`${name} Race 必须为2-4名participant且无enemy slot。`);
      }
    } else if (
      enemySlotCount < 1
      || enemySlotCount > 16
      || participantCount !== enemySlotCount + 1
    ) {
      throw new RangeError(`${name} Survival 必须为1名玩家加1-16个有界enemy slot。`);
    }
  }
  return Object.freeze({
    id: stableId(value.id, `${name}.id`),
    modeKind,
    modeDefinitionId,
    fixtureDefinitionId,
    matchSeed: uint32(value.matchSeed, `${name}.matchSeed`),
    participantCount,
    enemySlotCount,
    regressionCandidateId: stableId(
      value.regressionCandidateId,
      `${name}.regressionCandidateId`,
    ),
    replayIdentityHash: hash(value.replayIdentityHash, `${name}.replayIdentityHash`),
    checkpointSequenceHash: hash(
      value.checkpointSequenceHash,
      `${name}.checkpointSequenceHash`,
    ),
    modeResultHash: hash(value.modeResultHash, `${name}.modeResultHash`),
    finalHash: hash(value.finalHash, `${name}.finalHash`),
    regressionResultHash: hash(
      value.regressionResultHash,
      `${name}.regressionResultHash`,
    ),
  });
}

function createManifestCore(value: unknown): ArenaModeGoldenManifestV2CreateOptions {
  const source = cloneFrozenData(value, 'ArenaModeGoldenManifestV2 create options');
  exactRecord(source, CREATE_KEYS, 'ArenaModeGoldenManifestV2 create options');
  if (source.schemaVersion !== ARENA_MODE_GOLDEN_MANIFEST_V2_SCHEMA_VERSION) {
    throw new RangeError('ArenaModeGoldenManifestV2.schemaVersion 必须是2。');
  }
  if (source.candidateStatus !== ARENA_MODE_GOLDEN_MANIFEST_V2_CANDIDATE_STATUS) {
    throw new RangeError('ArenaModeGoldenManifestV2 必须保持production-unreachable。');
  }
  if (source.replaySchemaVersion !== 6) {
    throw new RangeError('ArenaModeGoldenManifestV2.replaySchemaVersion 必须是6。');
  }
  if (typeof source.sourceCommit !== 'string' || !COMMIT_PATTERN.test(source.sourceCommit)) {
    throw new TypeError('ArenaModeGoldenManifestV2.sourceCommit 必须是40位小写commit SHA。');
  }
  if (!Array.isArray(source.entries) || source.entries.length < MODE_KINDS.size) {
    throw new RangeError('ArenaModeGoldenManifestV2.entries 必须至少逐模式提供一项。');
  }
  if (source.entries.length > ARENA_MODE_GOLDEN_MANIFEST_V2_MAXIMUM_ENTRIES) {
    throw new RangeError(
      `ArenaModeGoldenManifestV2.entries 不能超过${ARENA_MODE_GOLDEN_MANIFEST_V2_MAXIMUM_ENTRIES}项。`,
    );
  }
  const entries = source.entries.map(cloneEntry);
  const entryIds = new Set<string>();
  const regressionCandidateIds = new Set<string>();
  const coveredModes = new Set<ArenaModeGoldenManifestV2ModeKind>();
  let previousId: string | undefined;
  for (const entry of entries) {
    if (entryIds.has(entry.id)) throw new RangeError(`黄金项id重复：${entry.id}。`);
    if (regressionCandidateIds.has(entry.regressionCandidateId)) {
      throw new RangeError(`黄金项回归候选重复：${entry.regressionCandidateId}。`);
    }
    if (previousId !== undefined && entry.id <= previousId) {
      throw new RangeError('ArenaModeGoldenManifestV2.entries 必须按id严格递增。');
    }
    entryIds.add(entry.id);
    regressionCandidateIds.add(entry.regressionCandidateId);
    coveredModes.add(entry.modeKind);
    previousId = entry.id;
  }
  for (const modeKind of MODE_KINDS) {
    if (!coveredModes.has(modeKind as ArenaModeGoldenManifestV2ModeKind)) {
      throw new RangeError(`ArenaModeGoldenManifestV2 缺少${String(modeKind)}黄金项。`);
    }
  }
  return Object.freeze({
    schemaVersion: ARENA_MODE_GOLDEN_MANIFEST_V2_SCHEMA_VERSION,
    candidateStatus: ARENA_MODE_GOLDEN_MANIFEST_V2_CANDIDATE_STATUS,
    id: stableId(source.id, 'ArenaModeGoldenManifestV2.id'),
    sourceCommit: source.sourceCommit,
    replaySchemaVersion: 6,
    entries: Object.freeze(entries),
  });
}

export function createArenaModeGoldenManifestV2(
  value: unknown,
): Readonly<ArenaModeGoldenManifestV2> {
  const core = createManifestCore(value);
  return cloneFrozenData({
    ...core,
    resultHash: createDeterministicDataHash(core, 'ArenaModeGoldenManifestV2'),
  }, 'ArenaModeGoldenManifestV2');
}

export function validateArenaModeGoldenManifestV2(
  value: unknown,
): Readonly<ArenaModeGoldenManifestV2> {
  const source = cloneFrozenData(value, 'ArenaModeGoldenManifestV2 candidate');
  exactRecord(source, MANIFEST_KEYS, 'ArenaModeGoldenManifestV2 candidate');
  const expected = createArenaModeGoldenManifestV2({
    schemaVersion: source.schemaVersion,
    candidateStatus: source.candidateStatus,
    id: source.id,
    sourceCommit: source.sourceCommit,
    replaySchemaVersion: source.replaySchemaVersion,
    entries: source.entries,
  });
  if (hash(source.resultHash, 'ArenaModeGoldenManifestV2.resultHash') !== expected.resultHash) {
    throw new RangeError('ArenaModeGoldenManifestV2.resultHash 与重算身份不一致。');
  }
  return expected;
}
