import { createDeterministicDataHash } from '../../../shared/deterministic-data-hash.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../../rules/definition-utils.js';

export const PRODUCT_MATCH_RESULT_SCHEMA_VERSION = 1;

const RESULT_KEYS = new Set(['winnerId', 'reason', 'isDraw', 'endedAtTick']);
const AUTHORITY_IDENTITY_KEYS = new Set([
  'replaySchemaVersion',
  'ruleSchemaVersion',
  'physicsBackendVersion',
  'configHash',
  'ruleContentHash',
  'finalHash',
]);
const PRODUCT_RESULT_KEYS = new Set([
  'schemaVersion',
  'matchSeed',
  'authorityIdentity',
  'authorityResult',
  'opponent',
  'authorityHash',
]);

export function assertProductMatchSeed(value, name = 'ProductMatch matchSeed') {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(`${name} 必须是 uint32。`);
  }
  return value;
}

function hash(value, name) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}$/.test(value)) {
    throw new TypeError(`${name} 必须是 8 位十六进制 hash。`);
  }
  return value;
}

function positiveInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} 必须是正安全整数。`);
  }
  return value;
}

function authorityIdentity(value) {
  const source = cloneFrozenData(value, 'ProductMatch authorityIdentity');
  assertKnownKeys(source, AUTHORITY_IDENTITY_KEYS, 'ProductMatch authorityIdentity');
  return Object.freeze({
    replaySchemaVersion: positiveInteger(
      source.replaySchemaVersion,
      'ProductMatch replaySchemaVersion',
    ),
    ruleSchemaVersion: positiveInteger(
      source.ruleSchemaVersion,
      'ProductMatch ruleSchemaVersion',
    ),
    physicsBackendVersion: assertNonEmptyString(
      source.physicsBackendVersion,
      'ProductMatch physicsBackendVersion',
    ),
    configHash: hash(source.configHash, 'ProductMatch configHash'),
    ruleContentHash: hash(source.ruleContentHash, 'ProductMatch ruleContentHash'),
    finalHash: hash(source.finalHash, 'ProductMatch finalHash'),
  });
}

export function createProductPublicOpponent(value) {
  const source = cloneFrozenData(value, 'ProductMatch opponent');
  const result = {};
  for (const field of ['id', 'displayName', 'portraitKey', 'appearanceKey']) {
    result[field] = assertNonEmptyString(source[field], `ProductMatch opponent.${field}`);
  }
  return Object.freeze(result);
}

export function createProductPublicMatchInfo(value) {
  const source = cloneFrozenData(value, 'ProductMatch publicInfo');
  return Object.freeze({
    matchSeed: assertProductMatchSeed(source.matchSeed),
    opponent: createProductPublicOpponent(source.opponent),
  });
}

function authorityResult(value) {
  const source = cloneFrozenData(value, 'ProductMatch authorityResult');
  assertKnownKeys(source, RESULT_KEYS, 'ProductMatch authorityResult');
  if (source.winnerId !== null) {
    assertNonEmptyString(source.winnerId, 'ProductMatch authorityResult.winnerId');
  }
  if (typeof source.isDraw !== 'boolean') {
    throw new TypeError('ProductMatch authorityResult.isDraw 必须是布尔值。');
  }
  if (source.isDraw !== (source.winnerId === null)) {
    throw new RangeError('ProductMatch authorityResult 胜者与平局标记不一致。');
  }
  return Object.freeze({
    winnerId: source.winnerId,
    reason: assertNonEmptyString(source.reason, 'ProductMatch authorityResult.reason'),
    isDraw: source.isDraw,
    endedAtTick: assertIntegerAtLeast(
      source.endedAtTick,
      0,
      'ProductMatch authorityResult.endedAtTick',
    ),
  });
}

export function createProductMatchResult({ matchSeed, opponent, replay }) {
  if (!replay || typeof replay !== 'object') {
    throw new TypeError('ProductMatchResult 需要完整 replay。');
  }
  const normalizedMatchSeed = assertProductMatchSeed(matchSeed);
  const replayMatchSeed = assertProductMatchSeed(replay.matchSeed, 'ProductMatch replay.matchSeed');
  if (normalizedMatchSeed !== replayMatchSeed) {
    throw new RangeError('ProductMatch match seed 与 replay 不一致。');
  }
  const copiedOpponent = createProductPublicOpponent(opponent);
  const copiedResult = authorityResult(replay.result);
  const identity = authorityIdentity({
    replaySchemaVersion: positiveInteger(
      replay.replaySchemaVersion,
      'ProductMatch replaySchemaVersion',
    ),
    ruleSchemaVersion: positiveInteger(replay.schemaVersion, 'ProductMatch ruleSchemaVersion'),
    physicsBackendVersion: assertNonEmptyString(
      replay.physicsBackendVersion,
      'ProductMatch physicsBackendVersion',
    ),
    configHash: hash(replay.configHash, 'ProductMatch configHash'),
    ruleContentHash: hash(replay.ruleContentHash, 'ProductMatch ruleContentHash'),
    finalHash: hash(replay.finalHash, 'ProductMatch finalHash'),
  });
  const authority = Object.freeze({
    schemaVersion: PRODUCT_MATCH_RESULT_SCHEMA_VERSION,
    matchSeed: normalizedMatchSeed,
    authorityIdentity: identity,
    authorityResult: copiedResult,
  });
  return validateProductMatchResult({
    ...authority,
    opponent: copiedOpponent,
    authorityHash: createDeterministicDataHash(authority, 'ProductMatchResult authority'),
  });
}

export function validateProductMatchResult(value) {
  const source = cloneFrozenData(value, 'ProductMatchResult');
  assertKnownKeys(source, PRODUCT_RESULT_KEYS, 'ProductMatchResult');
  if (source.schemaVersion !== PRODUCT_MATCH_RESULT_SCHEMA_VERSION) {
    throw new RangeError(`不支持 ProductMatchResult schema ${String(source.schemaVersion)}。`);
  }
  const authority = Object.freeze({
    schemaVersion: PRODUCT_MATCH_RESULT_SCHEMA_VERSION,
    matchSeed: assertProductMatchSeed(source.matchSeed),
    authorityIdentity: authorityIdentity(source.authorityIdentity),
    authorityResult: authorityResult(source.authorityResult),
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
