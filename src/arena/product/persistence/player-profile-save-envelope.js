import { createDeterministicDataHash } from '../../../shared/deterministic-data-hash.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
} from '../../rules/definition-utils.js';
import {
  assertPlayerProfileHasNoFutureSchema,
  createPlayerProfile,
} from '../profile/player-profile.js';
import { createPlayerProfileDefinition } from '../profile/player-profile-definition.js';
import { PlayerProfileFutureSchemaError } from './profile-persistence-errors.js';
import { createSaveMigrationRegistry } from './save-migration-registry.js';

export const PLAYER_PROFILE_SAVE_ENVELOPE_SCHEMA_VERSION = 1;

const ENVELOPE_KEYS = new Set([
  'schemaVersion',
  'profileDefinitionId',
  'generation',
  'payloadSchemaVersion',
  'payloadHash',
  'payload',
]);

export function createPlayerProfileSaveEnvelope(definitionValue, profileValue) {
  const definition = createPlayerProfileDefinition(definitionValue);
  const profile = createPlayerProfile(definition, profileValue);
  return cloneFrozenData({
    schemaVersion: PLAYER_PROFILE_SAVE_ENVELOPE_SCHEMA_VERSION,
    profileDefinitionId: definition.id,
    generation: profile.revision,
    payloadSchemaVersion: profile.schemaVersion,
    payloadHash: createDeterministicDataHash(profile, 'PlayerProfile payload'),
    payload: profile,
  }, 'PlayerProfile save envelope');
}

export function validatePlayerProfileSaveEnvelope(
  definitionValue,
  migrationRegistryValue,
  value,
) {
  const definition = createPlayerProfileDefinition(definitionValue);
  const migrationRegistry = createSaveMigrationRegistry(migrationRegistryValue);
  if (migrationRegistry.getCurrentVersion() !== definition.currentProfileSchemaVersion) {
    throw new RangeError('MigrationRegistry 与 PlayerProfileDefinition 当前 schema 不一致。');
  }
  const source = cloneFrozenData(value, 'PlayerProfile save envelope');
  assertKnownKeys(source, ENVELOPE_KEYS, 'PlayerProfile save envelope');
  if (source.schemaVersion !== PLAYER_PROFILE_SAVE_ENVELOPE_SCHEMA_VERSION) {
    throw new RangeError(`不支持 PlayerProfile envelope schema ${String(source.schemaVersion)}。`);
  }
  if (source.profileDefinitionId !== definition.id) {
    throw new RangeError('PlayerProfile envelope 与当前 Definition 不一致。');
  }
  const generation = assertIntegerAtLeast(source.generation, 0, 'PlayerProfile envelope.generation');
  const payloadSchemaVersion = assertIntegerAtLeast(
    source.payloadSchemaVersion,
    1,
    'PlayerProfile envelope.payloadSchemaVersion',
  );
  const rawHash = createDeterministicDataHash(source.payload, 'PlayerProfile raw payload');
  if (source.payloadHash !== rawHash) throw new RangeError('PlayerProfile envelope payload hash 不一致。');
  const migrated = migrationRegistry.migrate(source.payload, payloadSchemaVersion);
  const profile = createPlayerProfile(definition, migrated);
  if (profile.revision !== generation) {
    throw new RangeError('PlayerProfile envelope generation 与 payload revision 不一致。');
  }
  return Object.freeze({
    envelope: createPlayerProfileSaveEnvelope(definition, profile),
    profile,
    migrated: payloadSchemaVersion !== definition.currentProfileSchemaVersion,
  });
}

/**
 * Malformed current/older data is recoverable. Future envelope or payload
 * schema is protected so an older client cannot silently replace it.
 */
export function assertPlayerProfileSaveEnvelopeHasNoFutureSchema(definitionValue, value) {
  const definition = createPlayerProfileDefinition(definitionValue);
  let source;
  try {
    source = cloneFrozenData(value, 'PlayerProfile save version probe');
  } catch {
    return true;
  }
  if (
    Number.isSafeInteger(source?.schemaVersion)
    && source.schemaVersion > PLAYER_PROFILE_SAVE_ENVELOPE_SCHEMA_VERSION
  ) throw new PlayerProfileFutureSchemaError('PlayerProfile envelope 来自未来 schema。');
  if (
    Number.isSafeInteger(source?.payloadSchemaVersion)
    && source.payloadSchemaVersion > definition.currentProfileSchemaVersion
  ) throw new PlayerProfileFutureSchemaError('PlayerProfile payload 来自未来 schema。');
  try {
    assertPlayerProfileHasNoFutureSchema(definition, source?.payload);
  } catch (error) {
    const failure = new PlayerProfileFutureSchemaError('PlayerProfile 嵌套 payload 来自未来 schema。');
    failure.cause = error;
    throw failure;
  }
  return true;
}
