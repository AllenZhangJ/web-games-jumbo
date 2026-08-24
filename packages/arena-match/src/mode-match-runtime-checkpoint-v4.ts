import {
  assertKnownKeys,
  ARENA_SUPPLY_AUTHORITY_FACT_MAX_RETAINED_COUNT_V1,
  cloneFrozenData,
  createArenaSupplyAuthorityFactsV1,
  createDeterministicDataHash,
  type ArenaSupplyAuthorityFactV1,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import {
  validateModeMatchRuntimeCheckpointV3,
  type ModeMatchRuntimeCheckpointV3,
} from './mode-match-runtime-checkpoint-v3.js';

export const MODE_MATCH_RUNTIME_CHECKPOINT_V4_SCHEMA_VERSION = 4 as const;

export interface ModeMatchRuntimeCheckpointV4 {
  readonly schemaVersion: typeof MODE_MATCH_RUNTIME_CHECKPOINT_V4_SCHEMA_VERSION;
  readonly runtimeCheckpointV3: DeepReadonly<ModeMatchRuntimeCheckpointV3>;
  readonly supplyFactsPrefix: readonly DeepReadonly<ArenaSupplyAuthorityFactV1>[];
  readonly checkpointIdentityHash: string;
}

export type ModeMatchRuntimeCheckpointV4CreateOptions = Omit<
  ModeMatchRuntimeCheckpointV4,
  'checkpointIdentityHash'
>;

const CREATE_KEYS = new Set(['schemaVersion', 'runtimeCheckpointV3', 'supplyFactsPrefix']);
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

function normalizeCore(value: unknown): ModeMatchRuntimeCheckpointV4CreateOptions {
  exactRecord(value, CREATE_KEYS, 'ModeMatchRuntimeCheckpointV4');
  if (value.schemaVersion !== MODE_MATCH_RUNTIME_CHECKPOINT_V4_SCHEMA_VERSION) {
    throw new RangeError('ModeMatchRuntimeCheckpointV4.schemaVersion必须是4。');
  }
  const runtimeCheckpointV3 = validateModeMatchRuntimeCheckpointV3(value.runtimeCheckpointV3);
  if (!Array.isArray(value.supplyFactsPrefix)
    || value.supplyFactsPrefix.length > ARENA_SUPPLY_AUTHORITY_FACT_MAX_RETAINED_COUNT_V1) {
    throw new RangeError('ModeMatchRuntimeCheckpointV4 supplyFactsPrefix超过上限。');
  }
  const supplyFactsPrefix = createArenaSupplyAuthorityFactsV1(value.supplyFactsPrefix);
  const runtimeCheckpointV2 = runtimeCheckpointV3.runtimeCheckpointV2;
  const runtimeCheckpointV1 = runtimeCheckpointV2.runtimeCheckpointV1;
  if (runtimeCheckpointV1.config.modeKind !== 'survival') {
    if (supplyFactsPrefix.length !== 0) {
      throw new RangeError('ModeMatchRuntimeCheckpointV4非Survival不得携带供给事实。');
    }
  } else {
    const last = supplyFactsPrefix.at(-1);
    if ((last === undefined) !== (runtimeCheckpointV2.lastSupplyFactSequence === null)
      || (last !== undefined && (
        supplyFactsPrefix[0]!.sequence !== 0
        || last.sequence !== runtimeCheckpointV2.lastSupplyFactSequence
        || last.streamId !== runtimeCheckpointV2.supplyFactStreamId
        || supplyFactsPrefix.some((fact) => (
          fact.streamId !== last.streamId
          || fact.modeDefinitionId !== runtimeCheckpointV1.config.modeDefinitionId
          || fact.tick >= runtimeCheckpointV1.readFrame.worldSnapshot.tick
        ))
      ))) {
      throw new RangeError('ModeMatchRuntimeCheckpointV4供给事实前缀与Runtime水位不闭合。');
    }
  }
  return Object.freeze({
    schemaVersion: MODE_MATCH_RUNTIME_CHECKPOINT_V4_SCHEMA_VERSION,
    runtimeCheckpointV3,
    supplyFactsPrefix,
  });
}

function withIdentityHash(core: ModeMatchRuntimeCheckpointV4CreateOptions): ModeMatchRuntimeCheckpointV4 {
  return Object.freeze({
    ...core,
    checkpointIdentityHash: createDeterministicDataHash(
      core,
      'ModeMatchRuntimeCheckpointV4 identity',
    ),
  });
}

export function createModeMatchRuntimeCheckpointV4(value: unknown): ModeMatchRuntimeCheckpointV4 {
  return withIdentityHash(normalizeCore(cloneFrozenData(
    value,
    'ModeMatchRuntimeCheckpointV4 create options',
  )));
}

export function validateModeMatchRuntimeCheckpointV4(value: unknown): ModeMatchRuntimeCheckpointV4 {
  const source = cloneFrozenData(value, 'ModeMatchRuntimeCheckpointV4');
  exactRecord(source, CHECKPOINT_KEYS, 'ModeMatchRuntimeCheckpointV4');
  const claimedHash = hash(
    source.checkpointIdentityHash,
    'ModeMatchRuntimeCheckpointV4.checkpointIdentityHash',
  );
  const checkpoint = withIdentityHash(normalizeCore({
    schemaVersion: source.schemaVersion,
    runtimeCheckpointV3: source.runtimeCheckpointV3,
    supplyFactsPrefix: source.supplyFactsPrefix,
  }));
  if (checkpoint.checkpointIdentityHash !== claimedHash) {
    throw new RangeError('ModeMatchRuntimeCheckpointV4声明hash与重算值不一致。');
  }
  return checkpoint;
}
