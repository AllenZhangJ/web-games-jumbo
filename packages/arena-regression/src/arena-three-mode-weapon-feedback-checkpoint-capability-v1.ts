import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createDeterministicDataHash,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import {
  MATCH_CORE_WEAPON_FEEDBACK_ADAPTER_CHECKPOINT_V2_SCHEMA_VERSION,
  validateMatchCoreWeaponFeedbackAdapterCheckpointV2,
  validateModeMatchRuntimeCheckpointV1,
  type MatchCoreWeaponFeedbackAdapterCheckpointV2,
  type ModeMatchRuntimeCheckpointV1,
} from '@number-strategy-jump/arena-match';

export const ARENA_THREE_MODE_WEAPON_FEEDBACK_CHECKPOINT_CAPABILITY_V1 =
  Object.freeze({
    schemaVersion: 1,
    status: 'production-unreachable',
    implementationStatus: 'code-written-not-run',
    hardGate: false,
    feedbackCheckpointSchemaVersion:
      MATCH_CORE_WEAPON_FEEDBACK_ADAPTER_CHECKPOINT_V2_SCHEMA_VERSION,
    runtimeCheckpointMethod: 'exportRuntimeCheckpointV1',
    runtimeCheckpointForkMethod: 'forkFromWeaponFeedbackCheckpointCapabilityV1',
    worldAuthorityCheckpointField: 'feedbackCheckpoint',
    validationStatus: 'not-run',
    defaultCompositionWired: false,
    defaultEntryWired: false,
  } as const);

export interface ArenaModeWeaponFeedbackCheckpointCapabilityV1 {
  readonly schemaVersion: 1;
  readonly modeDefinitionId: string;
  readonly runtimeCheckpoint: DeepReadonly<ModeMatchRuntimeCheckpointV1>;
  readonly runtimeCheckpointIdentityHash: string;
  readonly feedbackCheckpoint: DeepReadonly<MatchCoreWeaponFeedbackAdapterCheckpointV2>;
  readonly capabilityIdentityHash: string;
}

const CREATE_KEYS = new Set(['modeDefinitionId', 'runtimeCheckpoint']);
const CAPABILITY_CORE_KEYS = new Set([
  'schemaVersion',
  'modeDefinitionId',
  'runtimeCheckpoint',
  'runtimeCheckpointIdentityHash',
  'feedbackCheckpoint',
]);
const CAPABILITY_KEYS = new Set([...CAPABILITY_CORE_KEYS, 'capabilityIdentityHash']);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): Readonly<Record<string, unknown>> {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
  return source;
}

function dataField(
  value: Readonly<Record<string, unknown>>,
  key: string,
  name: string,
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function hash(value: unknown, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (!HASH_PATTERN.test(result)) throw new RangeError(`${name}必须是8位小写十六进制hash。`);
  return result;
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function createCapabilityCore(value: unknown) {
  const source = exactRecord(value, CREATE_KEYS, 'Arena feedback checkpoint capability options');
  const expectedModeDefinitionId = assertNonEmptyString(
    dataField(source, 'modeDefinitionId', 'Arena feedback checkpoint capability options'),
    'Arena feedback checkpoint capability modeDefinitionId',
  );
  const runtimeCheckpoint = validateModeMatchRuntimeCheckpointV1(
    dataField(source, 'runtimeCheckpoint', 'Arena feedback checkpoint capability options'),
  );
  if (
    runtimeCheckpoint.config.modeDefinitionId !== expectedModeDefinitionId
    || runtimeCheckpoint.readFrame.worldSnapshot.modeDefinitionId !== expectedModeDefinitionId
  ) throw new RangeError('Arena feedback checkpoint capability Mode身份漂移。');
  const worldCheckpoint = assertPlainRecord(
    cloneFrozenData(
      runtimeCheckpoint.worldAuthorityCheckpoint,
      'Arena feedback world authority checkpoint',
    ),
    'Arena feedback world authority checkpoint',
  );
  const feedbackCheckpoint = validateMatchCoreWeaponFeedbackAdapterCheckpointV2(
    dataField(worldCheckpoint, 'feedbackCheckpoint', 'Arena feedback world authority checkpoint'),
  );
  const participantIds = runtimeCheckpoint.config.participantAssignments.map(
    ({ participantId }) => participantId,
  );
  if (!sameIds(feedbackCheckpoint.participantIds, participantIds)) {
    throw new RangeError('Arena feedback checkpoint participantIds与runtime config不闭合。');
  }
  if (feedbackCheckpoint.tick !== runtimeCheckpoint.readFrame.worldSnapshot.tick) {
    throw new RangeError('Arena feedback checkpoint tick与runtime已提交帧不闭合。');
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    modeDefinitionId: expectedModeDefinitionId,
    runtimeCheckpoint,
    runtimeCheckpointIdentityHash: runtimeCheckpoint.runtimeCheckpointIdentityHash,
    feedbackCheckpoint,
  });
}

export function createArenaModeWeaponFeedbackCheckpointCapabilityV1(
  value: unknown,
): ArenaModeWeaponFeedbackCheckpointCapabilityV1 {
  const core = createCapabilityCore(value);
  return Object.freeze({
    ...core,
    capabilityIdentityHash: createDeterministicDataHash(
      core,
      'ArenaModeWeaponFeedbackCheckpointCapabilityV1 identity',
    ),
  });
}

export function validateArenaModeWeaponFeedbackCheckpointCapabilityV1(
  value: unknown,
): ArenaModeWeaponFeedbackCheckpointCapabilityV1 {
  const source = exactRecord(value, CAPABILITY_KEYS, 'Arena feedback checkpoint capability');
  if (dataField(source, 'schemaVersion', 'Arena feedback checkpoint capability') !== 1) {
    throw new RangeError('Arena feedback checkpoint capability schemaVersion不受支持。');
  }
  const core = createCapabilityCore({
    modeDefinitionId: dataField(source, 'modeDefinitionId', 'Arena feedback checkpoint capability'),
    runtimeCheckpoint: dataField(
      source,
      'runtimeCheckpoint',
      'Arena feedback checkpoint capability',
    ),
  });
  const claimedRuntimeIdentity = hash(
    dataField(source, 'runtimeCheckpointIdentityHash', 'Arena feedback checkpoint capability'),
    'Arena feedback checkpoint capability runtimeCheckpointIdentityHash',
  );
  const claimedFeedback = validateMatchCoreWeaponFeedbackAdapterCheckpointV2(
    dataField(source, 'feedbackCheckpoint', 'Arena feedback checkpoint capability'),
  );
  if (
    claimedRuntimeIdentity !== core.runtimeCheckpointIdentityHash
    || claimedFeedback.checkpointIdentityHash !== core.feedbackCheckpoint.checkpointIdentityHash
  ) throw new RangeError('Arena feedback checkpoint capability嵌入证据与runtime checkpoint漂移。');
  const claimedIdentity = hash(
    dataField(source, 'capabilityIdentityHash', 'Arena feedback checkpoint capability'),
    'Arena feedback checkpoint capability identity',
  );
  const normalizedIdentity = createDeterministicDataHash(
    core,
    'ArenaModeWeaponFeedbackCheckpointCapabilityV1 identity',
  );
  if (normalizedIdentity !== claimedIdentity) {
    throw new RangeError('Arena feedback checkpoint capability identity hash漂移。');
  }
  return Object.freeze({ ...core, capabilityIdentityHash: normalizedIdentity });
}
