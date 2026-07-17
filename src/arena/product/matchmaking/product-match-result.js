import { createDeterministicDataHash } from '../../../shared/deterministic-data-hash.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../../rules/definition-utils.js';

export const PRODUCT_MATCH_RESULT_SCHEMA_VERSION = 1;

const RESULT_KEYS = new Set(['winnerId', 'reason', 'isDraw', 'endedAtTick']);

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
  const identity = Object.freeze({
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
  return Object.freeze({
    ...authority,
    opponent: copiedOpponent,
    authorityHash: createDeterministicDataHash(authority, 'ProductMatchResult authority'),
  });
}
