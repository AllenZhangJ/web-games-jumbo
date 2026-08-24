import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaV2LearningProfileDefinitionV1,
} from './arena-v2-learning-profile-definition-v1.js';
import {
  assertArenaV2LearningProfileV1HasNoFutureSchema,
  createArenaV2LearningProfileV1,
  type ArenaV2LearningProfileV1,
} from './arena-v2-learning-profile-v1.js';
import { ArenaV2LearningProfileFutureSchemaError } from './profile-persistence-errors.js';
import {
  createSaveMigrationRegistry,
  type SaveMigrationRegistry,
} from './save-migration-registry.js';

export const ARENA_V2_LEARNING_PROFILE_SAVE_ENVELOPE_V1_SCHEMA_VERSION = 1 as const;

export interface ArenaV2LearningProfileSaveEnvelopeV1 {
  readonly schemaVersion: typeof ARENA_V2_LEARNING_PROFILE_SAVE_ENVELOPE_V1_SCHEMA_VERSION;
  readonly profileDefinitionId: string;
  readonly profileDefinitionContentVersion: number;
  readonly generation: number;
  readonly payloadSchemaVersion: number;
  readonly payloadHash: string;
  readonly payload: ArenaV2LearningProfileV1;
}

export interface ValidatedArenaV2LearningProfileSaveEnvelopeV1 {
  readonly envelope: ArenaV2LearningProfileSaveEnvelopeV1;
  readonly profile: ArenaV2LearningProfileV1;
  readonly migrated: boolean;
}

const ENVELOPE_KEYS = new Set([
  'schemaVersion', 'profileDefinitionId', 'profileDefinitionContentVersion',
  'generation', 'payloadSchemaVersion', 'payloadHash', 'payload',
]);

export function createArenaV2LearningProfileSaveEnvelopeV1(
  definitionValue: unknown,
  profileValue: unknown,
): ArenaV2LearningProfileSaveEnvelopeV1 {
  const definition = createArenaV2LearningProfileDefinitionV1(definitionValue);
  const profile = createArenaV2LearningProfileV1(definition, profileValue);
  return cloneFrozenData({
    schemaVersion: ARENA_V2_LEARNING_PROFILE_SAVE_ENVELOPE_V1_SCHEMA_VERSION,
    profileDefinitionId: definition.id,
    profileDefinitionContentVersion: definition.contentVersion,
    generation: profile.revision,
    payloadSchemaVersion: profile.schemaVersion,
    payloadHash: createDeterministicDataHash(profile, 'ArenaV2LearningProfileV1 payload'),
    payload: profile,
  }, 'ArenaV2LearningProfileSaveEnvelopeV1');
}

export function validateArenaV2LearningProfileSaveEnvelopeV1(
  definitionValue: unknown,
  migrationRegistryValue: unknown,
  value: unknown,
): ValidatedArenaV2LearningProfileSaveEnvelopeV1 {
  const definition = createArenaV2LearningProfileDefinitionV1(definitionValue);
  const migrationRegistry: SaveMigrationRegistry = createSaveMigrationRegistry(
    migrationRegistryValue,
  );
  if (migrationRegistry.getCurrentVersion() !== definition.currentProfileSchemaVersion) {
    throw new RangeError('Learning Profile MigrationRegistry schema 不匹配。');
  }
  const source = cloneFrozenData(value, 'ArenaV2LearningProfileSaveEnvelopeV1');
  assertKnownKeys(source, ENVELOPE_KEYS, 'ArenaV2LearningProfileSaveEnvelopeV1');
  for (const key of ENVELOPE_KEYS) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`Learning Profile envelope缺少${key}。`);
  }
  if (source.schemaVersion !== ARENA_V2_LEARNING_PROFILE_SAVE_ENVELOPE_V1_SCHEMA_VERSION) {
    throw new RangeError('Learning Profile envelope schema 不受支持。');
  }
  if (source.profileDefinitionId !== definition.id
    || source.profileDefinitionContentVersion !== definition.contentVersion) {
    throw new RangeError('Learning Profile envelope与Definition不一致。');
  }
  const generation = assertIntegerAtLeast(source.generation, 0, 'Learning envelope.generation');
  const payloadSchemaVersion = assertIntegerAtLeast(
    source.payloadSchemaVersion,
    1,
    'Learning envelope.payloadSchemaVersion',
  );
  if (payloadSchemaVersion > definition.currentProfileSchemaVersion) {
    throw new ArenaV2LearningProfileFutureSchemaError();
  }
  const rawHash = createDeterministicDataHash(source.payload, 'ArenaV2LearningProfile raw payload');
  if (source.payloadHash !== rawHash) throw new RangeError('Learning Profile payload hash不一致。');
  const migratedPayload = migrationRegistry.migrate(source.payload, payloadSchemaVersion);
  const profile = createArenaV2LearningProfileV1(definition, migratedPayload);
  if (profile.revision !== generation) throw new RangeError('Learning Profile generation不一致。');
  return Object.freeze({
    envelope: createArenaV2LearningProfileSaveEnvelopeV1(definition, profile),
    profile,
    migrated: payloadSchemaVersion !== definition.currentProfileSchemaVersion,
  });
}

export function assertArenaV2LearningProfileSaveEnvelopeV1HasNoFutureSchema(
  definitionValue: unknown,
  value: unknown,
): true {
  const definition = createArenaV2LearningProfileDefinitionV1(definitionValue);
  let source: unknown;
  try {
    source = cloneFrozenData(value, 'Learning Profile envelope version probe');
  } catch {
    return true;
  }
  if (!source || typeof source !== 'object' || Array.isArray(source)) return true;
  const candidate = source as Readonly<Record<string, unknown>>;
  if (Number.isSafeInteger(candidate.schemaVersion)
    && (candidate.schemaVersion as number)
      > ARENA_V2_LEARNING_PROFILE_SAVE_ENVELOPE_V1_SCHEMA_VERSION) {
    throw new ArenaV2LearningProfileFutureSchemaError('Arena V2学习档案envelope来自未来schema。');
  }
  if (Number.isSafeInteger(candidate.payloadSchemaVersion)
    && (candidate.payloadSchemaVersion as number) > definition.currentProfileSchemaVersion) {
    throw new ArenaV2LearningProfileFutureSchemaError('Arena V2学习档案payload来自未来schema。');
  }
  if (Number.isSafeInteger(candidate.profileDefinitionContentVersion)
    && (candidate.profileDefinitionContentVersion as number) > definition.contentVersion) {
    throw new ArenaV2LearningProfileFutureSchemaError('Arena V2学习档案来自未来内容Definition。');
  }
  try {
    assertArenaV2LearningProfileV1HasNoFutureSchema(candidate.payload);
  } catch (error) {
    const failure = new ArenaV2LearningProfileFutureSchemaError('Arena V2学习档案嵌套payload来自未来schema。');
    failure.cause = error;
    throw failure;
  }
  return true;
}
