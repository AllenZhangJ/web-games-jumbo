import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createDeterministicDataHash,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import {
  validateMatchCoreWeaponFeedbackAdapterCheckpointV1,
  validateMatchCoreWeaponFeedbackDirectionCheckpointV2,
  type MatchCoreWeaponFeedbackAdapterCheckpointV1,
  type MatchCoreWeaponFeedbackDirectionCheckpointV2,
  type ModeMatchRuntimeCheckpointV1,
} from '@number-strategy-jump/arena-match';
import {
  createArenaModeWeaponFeedbackCheckpointCapabilityV1,
  validateArenaModeWeaponFeedbackCheckpointCapabilityV1,
  type ArenaModeWeaponFeedbackCheckpointCapabilityV1,
} from './arena-three-mode-weapon-feedback-checkpoint-capability-v1.js';

export const ARENA_THREE_MODE_WEAPON_FEEDBACK_DIRECTION_CAPABILITY_V2 = Object.freeze({
  schemaVersion: 2 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  feedbackCheckpointSchemaVersion: 1 as const,
  directionCheckpointSchemaVersion: 2 as const,
  runtimeCheckpointMethod: 'exportRuntimeCheckpointV1' as const,
  runtimeCheckpointForkMethod:
    'forkFromWeaponFeedbackDirectionCheckpointCapabilityV2' as const,
  worldAuthorityFeedbackCheckpointField: 'feedbackCheckpoint' as const,
  worldAuthorityDirectionCheckpointField: 'feedbackDirectionCheckpoint' as const,
  pairedCheckpointValidation: true as const,
  validationStatus: 'not-run' as const,
  defaultCompositionWired: false as const,
  defaultEntryWired: false as const,
});

export interface ArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2 {
  readonly schemaVersion: 2;
  readonly modeDefinitionId: string;
  readonly runtimeCheckpoint: DeepReadonly<ModeMatchRuntimeCheckpointV1>;
  readonly runtimeCheckpointIdentityHash: string;
  readonly feedbackCheckpoint: DeepReadonly<MatchCoreWeaponFeedbackAdapterCheckpointV1>;
  readonly directionCheckpoint: DeepReadonly<MatchCoreWeaponFeedbackDirectionCheckpointV2>;
  readonly capabilityIdentityHash: string;
}

export type ArenaModeWeaponFeedbackRestoreCapability =
  | ArenaModeWeaponFeedbackCheckpointCapabilityV1
  | ArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2;

const CREATE_KEYS = new Set(['modeDefinitionId', 'runtimeCheckpoint']);
const CAPABILITY_CORE_KEYS = new Set([
  'schemaVersion', 'modeDefinitionId', 'runtimeCheckpoint', 'runtimeCheckpointIdentityHash',
  'feedbackCheckpoint', 'directionCheckpoint',
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

function field(
  source: Readonly<Record<string, unknown>>,
  key: string,
  name: string,
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
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

function createCore(value: unknown) {
  const source = exactRecord(value, CREATE_KEYS, 'Arena feedback direction capability options');
  const feedbackCapability: ArenaModeWeaponFeedbackCheckpointCapabilityV1 =
    createArenaModeWeaponFeedbackCheckpointCapabilityV1({
      modeDefinitionId: field(source, 'modeDefinitionId', 'Arena feedback direction capability options'),
      runtimeCheckpoint: field(source, 'runtimeCheckpoint', 'Arena feedback direction capability options'),
    });
  const worldCheckpoint = assertPlainRecord(
    cloneFrozenData(
      feedbackCapability.runtimeCheckpoint.worldAuthorityCheckpoint,
      'Arena feedback direction world authority checkpoint',
    ),
    'Arena feedback direction world authority checkpoint',
  );
  const directionCheckpoint = validateMatchCoreWeaponFeedbackDirectionCheckpointV2(
    field(
      worldCheckpoint,
      'feedbackDirectionCheckpoint',
      'Arena feedback direction world authority checkpoint',
    ),
    feedbackCapability.feedbackCheckpoint,
  );
  if (
    directionCheckpoint.tick
      !== feedbackCapability.runtimeCheckpoint.readFrame.worldSnapshot.tick
    || directionCheckpoint.sourceEventSequence
      !== feedbackCapability.feedbackCheckpoint.sourceEventSequence
  ) throw new RangeError('Arena feedback direction checkpoint与runtime已提交水位不闭合。');
  return Object.freeze({
    schemaVersion: 2 as const,
    modeDefinitionId: feedbackCapability.modeDefinitionId,
    runtimeCheckpoint: feedbackCapability.runtimeCheckpoint,
    runtimeCheckpointIdentityHash: feedbackCapability.runtimeCheckpointIdentityHash,
    feedbackCheckpoint: feedbackCapability.feedbackCheckpoint,
    directionCheckpoint,
  });
}

export function createArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2(
  value: unknown,
): ArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2 {
  const core = createCore(value);
  return Object.freeze({
    ...core,
    capabilityIdentityHash: createDeterministicDataHash(
      core,
      'ArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2 identity',
    ),
  });
}

export function validateArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2(
  value: unknown,
): ArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2 {
  const source = exactRecord(
    value,
    CAPABILITY_KEYS,
    'Arena feedback direction checkpoint capability',
  );
  if (field(source, 'schemaVersion', 'Arena feedback direction checkpoint capability') !== 2) {
    throw new RangeError('Arena feedback direction capability schemaVersion不受支持。');
  }
  const core = createCore({
    modeDefinitionId: field(source, 'modeDefinitionId', 'Arena feedback direction capability'),
    runtimeCheckpoint: field(source, 'runtimeCheckpoint', 'Arena feedback direction capability'),
  });
  const claimedRuntimeIdentity = hash(
    field(source, 'runtimeCheckpointIdentityHash', 'Arena feedback direction capability'),
    'Arena feedback direction capability runtimeCheckpointIdentityHash',
  );
  const claimedFeedback = validateMatchCoreWeaponFeedbackAdapterCheckpointV1(field(
    source,
    'feedbackCheckpoint',
    'Arena feedback direction capability',
  ));
  const claimedDirection = validateMatchCoreWeaponFeedbackDirectionCheckpointV2(
    field(source, 'directionCheckpoint', 'Arena feedback direction capability'),
    core.feedbackCheckpoint,
  );
  if (
    claimedRuntimeIdentity !== core.runtimeCheckpointIdentityHash
    || claimedFeedback.checkpointIdentityHash !== core.feedbackCheckpoint.checkpointIdentityHash
    || claimedDirection.checkpointIdentityHash !== core.directionCheckpoint.checkpointIdentityHash
  ) throw new RangeError('Arena feedback direction capability嵌入证据与runtime checkpoint漂移。');
  const claimedIdentity = hash(
    field(source, 'capabilityIdentityHash', 'Arena feedback direction capability'),
    'Arena feedback direction capability identity',
  );
  const normalizedIdentity = createDeterministicDataHash(
    core,
    'ArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2 identity',
  );
  if (claimedIdentity !== normalizedIdentity) {
    throw new RangeError('Arena feedback direction capability identity hash漂移。');
  }
  return Object.freeze({ ...core, capabilityIdentityHash: normalizedIdentity });
}

export function validateArenaModeWeaponFeedbackRestoreCapability(
  value: unknown,
): ArenaModeWeaponFeedbackRestoreCapability {
  const source = assertPlainRecord(
    cloneFrozenData(value, 'Arena feedback restore capability'),
    'Arena feedback restore capability',
  );
  return source.schemaVersion === 2
    ? validateArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2(source)
    : validateArenaModeWeaponFeedbackCheckpointCapabilityV1(source);
}
