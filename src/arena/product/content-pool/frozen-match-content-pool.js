import { createDeterministicDataHash } from '../../../shared/deterministic-data-hash.js';
import { createMatchContentSelection } from '../../content/match-content-selection.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
} from '../../rules/definition-utils.js';

export const FROZEN_MATCH_CONTENT_POOL_SCHEMA_VERSION = 1;

const KEYS = new Set([
  'schemaVersion',
  'matchSeed',
  'sourceProfileRevision',
  'selection',
  'poolHash',
]);

function hash(value, name) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}$/.test(value)) {
    throw new TypeError(`${name} 必须是 8 位十六进制 hash。`);
  }
  return value;
}

function matchSeed(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError('FrozenMatchContentPool.matchSeed 必须是 uint32。');
  }
  return value;
}

export function createFrozenMatchContentPool(value) {
  const source = cloneFrozenData(value, 'FrozenMatchContentPool');
  assertKnownKeys(source, KEYS, 'FrozenMatchContentPool');
  if (source.schemaVersion !== FROZEN_MATCH_CONTENT_POOL_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 FrozenMatchContentPool schema ${String(source.schemaVersion)}。`,
    );
  }
  const payload = Object.freeze({
    schemaVersion: FROZEN_MATCH_CONTENT_POOL_SCHEMA_VERSION,
    matchSeed: matchSeed(source.matchSeed),
    sourceProfileRevision: assertIntegerAtLeast(
      source.sourceProfileRevision,
      0,
      'FrozenMatchContentPool.sourceProfileRevision',
    ),
    selection: createMatchContentSelection(source.selection),
  });
  const poolHash = createDeterministicDataHash(payload, 'FrozenMatchContentPool');
  if (
    source.poolHash !== undefined
    && hash(source.poolHash, 'FrozenMatchContentPool.poolHash') !== poolHash
  ) {
    throw new RangeError('FrozenMatchContentPool poolHash 与内容不一致。');
  }
  return Object.freeze({ ...payload, poolHash });
}
