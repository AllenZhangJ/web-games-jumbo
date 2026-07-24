import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
  createMatchContentSelection,
  type MatchContentSelection,
} from '@number-strategy-jump/arena-contracts';

export const FROZEN_MATCH_CONTENT_POOL_SCHEMA_VERSION = 1 as const;

export interface FrozenMatchContentPool {
  readonly schemaVersion: typeof FROZEN_MATCH_CONTENT_POOL_SCHEMA_VERSION;
  readonly matchSeed: number;
  readonly sourceProfileRevision: number;
  readonly selection: MatchContentSelection;
  readonly poolHash: string;
}

const KEYS = new Set([
  'schemaVersion',
  'matchSeed',
  'sourceProfileRevision',
  'selection',
  'poolHash',
]);

function hash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}$/.test(value)) {
    throw new TypeError(`${name} 必须是 8 位十六进制 hash。`);
  }
  return value;
}

export function assertMatchSeed(value: unknown, name = 'MatchContentPool matchSeed'): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 0xffffffff) {
    throw new RangeError(`${name} 必须是 uint32。`);
  }
  return value as number;
}

export function createFrozenMatchContentPool(value: unknown): FrozenMatchContentPool {
  const source = cloneFrozenData(value, 'FrozenMatchContentPool');
  assertKnownKeys(source, KEYS, 'FrozenMatchContentPool');
  if (source.schemaVersion !== FROZEN_MATCH_CONTENT_POOL_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 FrozenMatchContentPool schema ${String(source.schemaVersion)}。`,
    );
  }
  const payload = Object.freeze({
    schemaVersion: FROZEN_MATCH_CONTENT_POOL_SCHEMA_VERSION,
    matchSeed: assertMatchSeed(source.matchSeed, 'FrozenMatchContentPool.matchSeed'),
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
