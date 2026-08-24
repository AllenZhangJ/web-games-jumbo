import {
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import {
  validateModeMatchRuntimeCheckpointV2,
  type ModeMatchRuntimeCheckpointV2,
} from './mode-match-runtime-checkpoint-v2.js';

export const MODE_MATCH_RUNTIME_CHECKPOINT_V3_SCHEMA_VERSION = 3 as const;

/**
 * V3 keeps the complete V2 checkpoint and binds the normalized Mode Driver
 * content used by the running match. This prevents a restore caller from
 * changing Duel policies or Race/Survival fixture rules while retaining the
 * same config, world checkpoint and committed history.
 */
export interface ModeMatchRuntimeCheckpointV3 {
  readonly schemaVersion: typeof MODE_MATCH_RUNTIME_CHECKPOINT_V3_SCHEMA_VERSION;
  readonly runtimeCheckpointV2: DeepReadonly<ModeMatchRuntimeCheckpointV2>;
  readonly modeDriverContentHash: string;
  readonly checkpointIdentityHash: string;
}

export type ModeMatchRuntimeCheckpointV3CreateOptions = Omit<
  ModeMatchRuntimeCheckpointV3,
  'checkpointIdentityHash'
>;

const CREATE_KEYS = new Set([
  'schemaVersion',
  'runtimeCheckpointV2',
  'modeDriverContentHash',
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

function normalizeCore(value: unknown): ModeMatchRuntimeCheckpointV3CreateOptions {
  exactRecord(value, CREATE_KEYS, 'ModeMatchRuntimeCheckpointV3');
  if (value.schemaVersion !== MODE_MATCH_RUNTIME_CHECKPOINT_V3_SCHEMA_VERSION) {
    throw new RangeError('ModeMatchRuntimeCheckpointV3.schemaVersion必须是3。');
  }
  return Object.freeze({
    schemaVersion: MODE_MATCH_RUNTIME_CHECKPOINT_V3_SCHEMA_VERSION,
    runtimeCheckpointV2: validateModeMatchRuntimeCheckpointV2(value.runtimeCheckpointV2),
    modeDriverContentHash: hash(
      value.modeDriverContentHash,
      'ModeMatchRuntimeCheckpointV3.modeDriverContentHash',
    ),
  });
}

function withIdentityHash(
  core: ModeMatchRuntimeCheckpointV3CreateOptions,
): ModeMatchRuntimeCheckpointV3 {
  return Object.freeze({
    ...core,
    checkpointIdentityHash: createDeterministicDataHash(
      core,
      'ModeMatchRuntimeCheckpointV3 identity',
    ),
  });
}

export function createModeMatchRuntimeCheckpointV3(
  value: unknown,
): ModeMatchRuntimeCheckpointV3 {
  const source = cloneFrozenData(value, 'ModeMatchRuntimeCheckpointV3 create options');
  return withIdentityHash(normalizeCore(source));
}

export function validateModeMatchRuntimeCheckpointV3(
  value: unknown,
): ModeMatchRuntimeCheckpointV3 {
  const source = cloneFrozenData(value, 'ModeMatchRuntimeCheckpointV3');
  exactRecord(source, CHECKPOINT_KEYS, 'ModeMatchRuntimeCheckpointV3');
  const claimedHash = hash(
    source.checkpointIdentityHash,
    'ModeMatchRuntimeCheckpointV3.checkpointIdentityHash',
  );
  const checkpoint = withIdentityHash(normalizeCore({
    schemaVersion: source.schemaVersion,
    runtimeCheckpointV2: source.runtimeCheckpointV2,
    modeDriverContentHash: source.modeDriverContentHash,
  }));
  if (checkpoint.checkpointIdentityHash !== claimedHash) {
    throw new RangeError('ModeMatchRuntimeCheckpointV3声明hash与重算值不一致。');
  }
  return checkpoint;
}
