import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createDeterministicDataHash,
  createMatchContentPublicView,
  type MatchContentSelection,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';

export const PRODUCT_MATCH_RESULT_SCHEMA_VERSION = 2;

export interface ProductPublicOpponent {
  readonly id: string;
  readonly displayName: string;
  readonly portraitKey: string;
  readonly appearanceKey: string;
}

export interface ProductPublicMatchInfo {
  readonly matchSeed: number;
  readonly opponent: ProductPublicOpponent;
  readonly content: MatchContentSelection;
}

export interface ProductAuthorityIdentity {
  readonly replaySchemaVersion: number;
  readonly ruleSchemaVersion: number;
  readonly physicsBackendVersion: string;
  readonly configHash: string;
  readonly ruleContentHash: string;
  readonly finalHash: string;
}

export interface ProductAuthorityResult {
  readonly winnerId: string | null;
  readonly reason: string;
  readonly isDraw: boolean;
  readonly endedAtTick: number;
}

export interface ProductMatchResult {
  readonly schemaVersion: 2;
  readonly matchSeed: number;
  readonly authorityIdentity: ProductAuthorityIdentity;
  readonly authorityResult: ProductAuthorityResult;
  readonly content: MatchContentSelection;
  readonly opponent: ProductPublicOpponent;
  readonly authorityHash: string;
}

const RESULT_KEYS = new Set(['winnerId', 'reason', 'isDraw', 'endedAtTick']);
const AUTHORITY_IDENTITY_KEYS = new Set([
  'replaySchemaVersion', 'ruleSchemaVersion', 'physicsBackendVersion',
  'configHash', 'ruleContentHash', 'finalHash',
]);
const PRODUCT_RESULT_KEYS = new Set([
  'schemaVersion', 'matchSeed', 'authorityIdentity', 'authorityResult',
  'content', 'opponent', 'authorityHash',
]);
const CREATE_KEYS = new Set(['matchSeed', 'opponent', 'content', 'replay']);

function readOwnDataField(record: PlainRecord, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function readCreateOptions(value: unknown): Readonly<{
  matchSeed: unknown;
  opponent: unknown;
  content: unknown;
  replay: unknown;
}> {
  const record = assertPlainRecord(value, 'ProductMatchResult options');
  assertKnownKeys(record, CREATE_KEYS, 'ProductMatchResult options');
  return Object.freeze({
    matchSeed: readOwnDataField(record, 'matchSeed', 'ProductMatchResult options'),
    opponent: readOwnDataField(record, 'opponent', 'ProductMatchResult options'),
    content: readOwnDataField(record, 'content', 'ProductMatchResult options'),
    replay: readOwnDataField(record, 'replay', 'ProductMatchResult options'),
  });
}

function readReplay(value: unknown): Readonly<{
  replaySchemaVersion: unknown;
  schemaVersion: unknown;
  physicsBackendVersion: unknown;
  configHash: unknown;
  ruleContentHash: unknown;
  finalHash: unknown;
  matchSeed: unknown;
  contentSelection: unknown;
  result: unknown;
}> {
  const replay = assertPlainRecord(value, 'ProductMatch replay');
  const config = assertPlainRecord(
    readOwnDataField(replay, 'config', 'ProductMatch replay'),
    'ProductMatch replay.config',
  );
  return Object.freeze({
    replaySchemaVersion: readOwnDataField(replay, 'replaySchemaVersion', 'ProductMatch replay'),
    schemaVersion: readOwnDataField(replay, 'schemaVersion', 'ProductMatch replay'),
    physicsBackendVersion: readOwnDataField(replay, 'physicsBackendVersion', 'ProductMatch replay'),
    configHash: readOwnDataField(replay, 'configHash', 'ProductMatch replay'),
    ruleContentHash: readOwnDataField(replay, 'ruleContentHash', 'ProductMatch replay'),
    finalHash: readOwnDataField(replay, 'finalHash', 'ProductMatch replay'),
    matchSeed: readOwnDataField(replay, 'matchSeed', 'ProductMatch replay'),
    contentSelection: readOwnDataField(config, 'contentSelection', 'ProductMatch replay.config'),
    result: readOwnDataField(replay, 'result', 'ProductMatch replay'),
  });
}

export function assertProductMatchSeed(value: unknown, name = 'ProductMatch matchSeed'): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 0xffffffff) {
    throw new RangeError(`${name} 必须是 uint32。`);
  }
  return value as number;
}

function hash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}$/.test(value)) {
    throw new TypeError(`${name} 必须是 8 位十六进制 hash。`);
  }
  return value;
}

function positiveInteger(value: unknown, name: string): number {
  return assertIntegerAtLeast(value, 1, name);
}

function createAuthorityIdentity(value: unknown): ProductAuthorityIdentity {
  const source = cloneFrozenData(value, 'ProductMatch authorityIdentity');
  assertKnownKeys(source, AUTHORITY_IDENTITY_KEYS, 'ProductMatch authorityIdentity');
  return Object.freeze({
    replaySchemaVersion: positiveInteger(source.replaySchemaVersion, 'ProductMatch replaySchemaVersion'),
    ruleSchemaVersion: positiveInteger(source.ruleSchemaVersion, 'ProductMatch ruleSchemaVersion'),
    physicsBackendVersion: assertNonEmptyString(source.physicsBackendVersion, 'ProductMatch physicsBackendVersion'),
    configHash: hash(source.configHash, 'ProductMatch configHash'),
    ruleContentHash: hash(source.ruleContentHash, 'ProductMatch ruleContentHash'),
    finalHash: hash(source.finalHash, 'ProductMatch finalHash'),
  });
}

export function createProductPublicOpponent(value: unknown): ProductPublicOpponent {
  const source = assertPlainRecord(
    cloneFrozenData(value, 'ProductMatch opponent'),
    'ProductMatch opponent',
  );
  return Object.freeze({
    id: assertNonEmptyString(source.id, 'ProductMatch opponent.id'),
    displayName: assertNonEmptyString(source.displayName, 'ProductMatch opponent.displayName'),
    portraitKey: assertNonEmptyString(source.portraitKey, 'ProductMatch opponent.portraitKey'),
    appearanceKey: assertNonEmptyString(source.appearanceKey, 'ProductMatch opponent.appearanceKey'),
  });
}

export function createProductPublicMatchInfo(value: unknown): ProductPublicMatchInfo {
  const source = assertPlainRecord(
    cloneFrozenData(value, 'ProductMatch publicInfo'),
    'ProductMatch publicInfo',
  );
  return Object.freeze({
    matchSeed: assertProductMatchSeed(source.matchSeed),
    opponent: createProductPublicOpponent(source.opponent),
    content: createMatchContentPublicView(source.content),
  });
}

function createAuthorityResult(value: unknown): ProductAuthorityResult {
  const source = cloneFrozenData(value, 'ProductMatch authorityResult');
  assertKnownKeys(source, RESULT_KEYS, 'ProductMatch authorityResult');
  const winnerId = source.winnerId === null
    ? null
    : assertNonEmptyString(source.winnerId, 'ProductMatch authorityResult.winnerId');
  if (typeof source.isDraw !== 'boolean') {
    throw new TypeError('ProductMatch authorityResult.isDraw 必须是布尔值。');
  }
  if (source.isDraw !== (winnerId === null)) {
    throw new RangeError('ProductMatch authorityResult 胜者与平局标记不一致。');
  }
  return Object.freeze({
    winnerId,
    reason: assertNonEmptyString(source.reason, 'ProductMatch authorityResult.reason'),
    isDraw: source.isDraw,
    endedAtTick: assertIntegerAtLeast(source.endedAtTick, 0, 'ProductMatch authorityResult.endedAtTick'),
  });
}

function sameContent(left: MatchContentSelection, right: MatchContentSelection): boolean {
  return left.contentHash === right.contentHash && JSON.stringify(left) === JSON.stringify(right);
}

export function createProductMatchResult(value: unknown): ProductMatchResult {
  const options = readCreateOptions(value);
  const replay = readReplay(options.replay);
  const matchSeed = assertProductMatchSeed(options.matchSeed);
  const replayMatchSeed = assertProductMatchSeed(replay.matchSeed, 'ProductMatch replay.matchSeed');
  if (matchSeed !== replayMatchSeed) throw new RangeError('ProductMatch match seed 与 replay 不一致。');
  const opponent = createProductPublicOpponent(options.opponent);
  const content = createMatchContentPublicView(options.content);
  const replayContent = createMatchContentPublicView(replay.contentSelection);
  if (!sameContent(content, replayContent)) {
    throw new RangeError('ProductMatch content 与 replay 权威配置不一致。');
  }
  const identity = createAuthorityIdentity({
    replaySchemaVersion: replay.replaySchemaVersion,
    ruleSchemaVersion: replay.schemaVersion,
    physicsBackendVersion: replay.physicsBackendVersion,
    configHash: replay.configHash,
    ruleContentHash: replay.ruleContentHash,
    finalHash: replay.finalHash,
  });
  const authority = Object.freeze({
    schemaVersion: PRODUCT_MATCH_RESULT_SCHEMA_VERSION,
    matchSeed,
    authorityIdentity: identity,
    authorityResult: createAuthorityResult(replay.result),
    content,
  });
  return validateProductMatchResult({
    ...authority,
    opponent,
    authorityHash: createDeterministicDataHash(authority, 'ProductMatchResult authority'),
  });
}

export function validateProductMatchResult(value: unknown): ProductMatchResult {
  const source = cloneFrozenData(value, 'ProductMatchResult');
  assertKnownKeys(source, PRODUCT_RESULT_KEYS, 'ProductMatchResult');
  if (source.schemaVersion !== PRODUCT_MATCH_RESULT_SCHEMA_VERSION) {
    throw new RangeError(`不支持 ProductMatchResult schema ${String(source.schemaVersion)}。`);
  }
  const authority = Object.freeze({
    schemaVersion: PRODUCT_MATCH_RESULT_SCHEMA_VERSION,
    matchSeed: assertProductMatchSeed(source.matchSeed),
    authorityIdentity: createAuthorityIdentity(source.authorityIdentity),
    authorityResult: createAuthorityResult(source.authorityResult),
    content: createMatchContentPublicView(source.content),
  });
  const expectedHash = createDeterministicDataHash(authority, 'ProductMatchResult authority');
  if (hash(source.authorityHash, 'ProductMatchResult authorityHash') !== expectedHash) {
    throw new RangeError('ProductMatchResult authorityHash 与权威内容不一致。');
  }
  return Object.freeze({
    ...authority,
    opponent: createProductPublicOpponent(source.opponent),
    authorityHash: expectedHash,
  });
}
