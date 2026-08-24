import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  createDeterministicDataHash,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import {
  validateModeMatchRuntimeCheckpointV1,
  type ModeMatchRuntimeCheckpointV1,
} from './mode-match-runtime-checkpoint-v1.js';

export const MODE_MATCH_RUNTIME_CHECKPOINT_V2_SCHEMA_VERSION = 2 as const;

/**
 * V2 keeps the full V1 authority/runtime checkpoint intact and adds the
 * Runtime-owned supply fact waterline that V1 could not restore. It does not
 * change Replay V6, ModeResult or world-authority checkpoint schemas.
 */
export interface ModeMatchRuntimeCheckpointV2 {
  readonly schemaVersion: typeof MODE_MATCH_RUNTIME_CHECKPOINT_V2_SCHEMA_VERSION;
  readonly runtimeCheckpointV1: DeepReadonly<ModeMatchRuntimeCheckpointV1>;
  readonly supplyFactStreamId: string | null;
  readonly lastSupplyFactSequence: number | null;
  readonly checkpointIdentityHash: string;
}

export type ModeMatchRuntimeCheckpointV2CreateOptions = Omit<
  ModeMatchRuntimeCheckpointV2,
  'checkpointIdentityHash'
>;

const CREATE_KEYS = new Set([
  'schemaVersion',
  'runtimeCheckpointV1',
  'supplyFactStreamId',
  'lastSupplyFactSequence',
]);
const CHECKPOINT_KEYS = new Set([...CREATE_KEYS, 'checkpointIdentityHash']);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
}

function hash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name}必须是8位小写十六进制hash。`);
  }
  return value;
}

function normalizeCore(value: unknown): ModeMatchRuntimeCheckpointV2CreateOptions {
  exactRecord(value, CREATE_KEYS, 'ModeMatchRuntimeCheckpointV2');
  if (value.schemaVersion !== MODE_MATCH_RUNTIME_CHECKPOINT_V2_SCHEMA_VERSION) {
    throw new RangeError('ModeMatchRuntimeCheckpointV2.schemaVersion必须是2。');
  }
  const runtimeCheckpointV1 = validateModeMatchRuntimeCheckpointV1(
    value.runtimeCheckpointV1,
  );
  const streamId = value.supplyFactStreamId === null
    ? null
    : assertNonEmptyString(
        value.supplyFactStreamId,
        'ModeMatchRuntimeCheckpointV2.supplyFactStreamId',
      );
  if (streamId !== null && streamId.length > 256) {
    throw new RangeError('ModeMatchRuntimeCheckpointV2.supplyFactStreamId超过256字符。');
  }
  const lastSequence = value.lastSupplyFactSequence === null
    ? null
    : assertIntegerAtLeast(
        value.lastSupplyFactSequence,
        0,
        'ModeMatchRuntimeCheckpointV2.lastSupplyFactSequence',
      );
  if ((streamId === null) !== (lastSequence === null)) {
    throw new RangeError('ModeMatchRuntimeCheckpointV2 supply fact stream/sequence必须同时为空或非空。');
  }
  if (lastSequence !== null && lastSequence >= Number.MAX_SAFE_INTEGER) {
    throw new RangeError('ModeMatchRuntimeCheckpointV2 supply fact sequence无法安全递增。');
  }
  if (
    runtimeCheckpointV1.config.modeKind !== 'survival'
    && (streamId !== null || lastSequence !== null)
  ) {
    throw new RangeError('ModeMatchRuntimeCheckpointV2非Survival不得携带供给事实水位。');
  }
  return Object.freeze({
    schemaVersion: MODE_MATCH_RUNTIME_CHECKPOINT_V2_SCHEMA_VERSION,
    runtimeCheckpointV1,
    supplyFactStreamId: streamId,
    lastSupplyFactSequence: lastSequence,
  });
}

function withIdentityHash(
  core: ModeMatchRuntimeCheckpointV2CreateOptions,
): ModeMatchRuntimeCheckpointV2 {
  return Object.freeze({
    ...core,
    checkpointIdentityHash: createDeterministicDataHash(
      core,
      'ModeMatchRuntimeCheckpointV2 identity',
    ),
  });
}

export function createModeMatchRuntimeCheckpointV2(
  value: unknown,
): ModeMatchRuntimeCheckpointV2 {
  const source = cloneFrozenData(value, 'ModeMatchRuntimeCheckpointV2 create options');
  return withIdentityHash(normalizeCore(source));
}

export function validateModeMatchRuntimeCheckpointV2(
  value: unknown,
): ModeMatchRuntimeCheckpointV2 {
  const source = cloneFrozenData(value, 'ModeMatchRuntimeCheckpointV2');
  exactRecord(source, CHECKPOINT_KEYS, 'ModeMatchRuntimeCheckpointV2');
  const claimedHash = hash(
    source.checkpointIdentityHash,
    'ModeMatchRuntimeCheckpointV2.checkpointIdentityHash',
  );
  const checkpoint = withIdentityHash(normalizeCore({
    schemaVersion: source.schemaVersion,
    runtimeCheckpointV1: source.runtimeCheckpointV1,
    supplyFactStreamId: source.supplyFactStreamId,
    lastSupplyFactSequence: source.lastSupplyFactSequence,
  }));
  if (checkpoint.checkpointIdentityHash !== claimedHash) {
    throw new RangeError('ModeMatchRuntimeCheckpointV2声明hash与重算值不一致。');
  }
  return checkpoint;
}
