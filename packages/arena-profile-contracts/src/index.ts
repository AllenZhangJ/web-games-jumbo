export {
  PLAYER_PROFILE_DEFINITION_SCHEMA_VERSION,
  PLAYER_PROFILE_QUALITY,
  PLAYER_PROFILE_SCHEMA_VERSION,
  PlayerProfileDefinition,
  createPlayerProfileDefinition,
} from './player-profile-definition.js';
export type {
  PlayerProfileDefaults,
  PlayerProfileDefinitionData,
  PlayerProfileLimits,
  PlayerProfileProgression,
  PlayerProfileQuality,
  PlayerProfileSelection,
  PlayerProfileSettings,
  PlayerProfileUnlocks,
} from './player-profile-definition.js';
export {
  advancePlayerProfile,
  assertPlayerProfileHasNoFutureSchema,
  createPlayerProfile,
} from './player-profile.js';
export type { PlayerProfile, PlayerProfileUpdate } from './player-profile.js';
export {
  PLAYER_PROFILE_SAVE_ENVELOPE_SCHEMA_VERSION,
  assertPlayerProfileSaveEnvelopeHasNoFutureSchema,
  createPlayerProfileSaveEnvelope,
  validatePlayerProfileSaveEnvelope,
} from './player-profile-save-envelope.js';
export type {
  PlayerProfileSaveEnvelope,
  ValidatedPlayerProfileSaveEnvelope,
} from './player-profile-save-envelope.js';
export {
  ArenaV2LearningProfileFutureSchemaError,
  ArenaV2LearningProfileIndeterminateWriteError,
  ArenaV2LearningProfileRepositoryBusyError,
  ArenaV2LearningProfileSaveConflictError,
  PlayerProfileFutureSchemaError,
  PlayerProfileIndeterminateWriteError,
  PlayerProfileRepositoryBusyError,
  PlayerProfileSaveConflictError,
} from './profile-persistence-errors.js';
export {
  SaveMigrationRegistry,
  createSaveMigrationRegistry,
} from './save-migration-registry.js';
export type { SaveMigration, SaveMigrationRegistryData } from './save-migration-registry.js';

// P6 candidate contracts are public library boundaries only. They remain
// absent from the default Profile V1 service, persistence and product entry.
export {
  ARENA_V2_LEARNING_PROFILE_DEFINITION_V1_SCHEMA_VERSION,
  ARENA_V2_LEARNING_PROFILE_V1_SCHEMA_VERSION,
  ARENA_V2_WEAPON_LEARNING_CONTEXT_V1,
  ARENA_V2_WEAPON_LEARNING_CONTEXTS_V1,
  assertArenaV2LearningProfileDefinitionV1HasNoFutureSchema,
  createArenaV2LearningProfileDefinitionV1,
} from './arena-v2-learning-profile-definition-v1.js';
export type {
  ArenaV2LearningChallengeDefinitionV1,
  ArenaV2LearningMapDefinitionV1,
  ArenaV2LearningMasteryRequirementsV1,
  ArenaV2LearningModeDefinitionV1,
  ArenaV2LearningModeKindV1,
  ArenaV2LearningProfileDefinitionV1,
  ArenaV2LearningProfileLimitsV1,
  ArenaV2WeaponLearningContextV1,
} from './arena-v2-learning-profile-definition-v1.js';
export {
  assertArenaV2LearningProfileV1HasNoFutureSchema,
  createArenaV2LearningProfileV1,
} from './arena-v2-learning-profile-v1.js';
export type {
  ArenaV2ChallengeLearningRecordV1,
  ArenaV2LearningProfileV1,
  ArenaV2MapSegmentMasteryRecordV1,
  ArenaV2ModeLearningRecordV1,
  ArenaV2WeaponContextMasteryV1,
  ArenaV2WeaponMasteryRecordV1,
} from './arena-v2-learning-profile-v1.js';
export {
  ARENA_V2_LEARNING_GRANT_V1_SCHEMA_VERSION,
  bindArenaV2LearningGrantToReplayEvidenceV1,
  createArenaV2LearningGrantV1,
  getArenaV2LearningResultGrantIdV1,
} from './arena-v2-learning-grant-v1.js';
export type {
  ArenaV2ChallengeLearningDeltaV1,
  ArenaV2LearningGrantV1,
  ArenaV2MapSegmentLearningDeltaV1,
  ArenaV2ModeLearningDeltaV1,
  ArenaV2WeaponContextEvidenceDeltaV1,
  ArenaV2WeaponLearningDeltaV1,
} from './arena-v2-learning-grant-v1.js';
export { advanceArenaV2LearningProfileV1 } from './arena-v2-learning-profile-reducer-v1.js';
export type {
  ArenaV2LearningCommitOutcomeV1,
  ArenaV2ChallengeProgressAppliedDeltaV1,
  ArenaV2LearningProgressKindV1,
  ArenaV2MapRouteEvidenceDeltaV1,
  ArenaV2MapSegmentEvidenceAppliedDeltaV1,
  ArenaV2ModeCompletionAppliedDeltaV1,
  ArenaV2WeaponContextEvidenceAppliedDeltaV1,
} from './arena-v2-learning-profile-reducer-v1.js';
export {
  ARENA_V2_LEARNING_PROFILE_SAVE_ENVELOPE_V1_SCHEMA_VERSION,
  assertArenaV2LearningProfileSaveEnvelopeV1HasNoFutureSchema,
  createArenaV2LearningProfileSaveEnvelopeV1,
  validateArenaV2LearningProfileSaveEnvelopeV1,
} from './arena-v2-learning-profile-save-envelope-v1.js';
export type {
  ArenaV2LearningProfileSaveEnvelopeV1,
  ValidatedArenaV2LearningProfileSaveEnvelopeV1,
} from './arena-v2-learning-profile-save-envelope-v1.js';
