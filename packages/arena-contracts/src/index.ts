export {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertTrimmedNonEmptyString,
  assertPlainRecord,
  assertPositiveFinite,
  cloneFrozenData,
  cloneFrozenStringSet,
} from './definition-utils.js';
export type { DeepReadonly, PlainRecord } from './definition-utils.js';
export {
  ARENA_ACTION_PHASE,
  ARENA_MATCH_PHASE,
  ARENA_PARTICIPANT_STATUS,
  assertArenaActionPhase,
  assertArenaMatchPhase,
  assertArenaParticipantStatus,
} from './arena-authority-state.js';
export type {
  ArenaActionPhase,
  ArenaMatchPhase,
  ArenaParticipantStatus,
} from './arena-authority-state.js';
export {
  createDeterministicDataHash,
  createFnv1aHash,
} from './deterministic-data-hash.js';
export { createRng, deriveSeed } from './deterministic-rng.js';
export type { DeterministicRng } from './deterministic-rng.js';
export {
  ARENA_INPUT_FRAME_SCHEMA_VERSION,
  createNeutralInputFrame,
  isNormalizedInputFrame,
  normalizeInputFrame,
  normalizeInputFrames,
  normalizeMovementIntent,
} from './input-frame.js';
export type {
  ArenaInputFrame,
  NormalizeInputFrameOptions,
  NormalizeInputFramesOptions,
} from './input-frame.js';
export { ARENA_MATCH_EVENT } from './match-event-types.js';
export type { ArenaMatchEventType } from './match-event-types.js';
export {
  EQUIPMENT_EXPIRY_REASON,
  EQUIPMENT_DESPAWN_REASON,
  EQUIPMENT_RECYCLE_REASON,
  EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION,
  createEquipmentExpiredEventPayload,
  createEquipmentRecycledEventPayload,
  createEquipmentReplacedEventPayload,
  createEquipmentSpawnedEventPayload,
} from './equipment-supply-event-payload.js';
export type {
  EquipmentExpiredEventPayload,
  EquipmentRecycledEventPayload,
  EquipmentReplacedEventPayload,
  EquipmentSpawnedEventPayload,
} from './equipment-supply-event-payload.js';
export {
  ARENA_SUPPLY_AUTHORITY_FACT_KIND_V1,
  ARENA_SUPPLY_AUTHORITY_FACT_MAX_RETAINED_COUNT_V1,
  ARENA_SUPPLY_AUTHORITY_FACT_V1_SCHEMA_VERSION,
  createArenaSupplyAuthorityFactV1,
  createArenaSupplyAuthorityFactsV1,
} from './arena-supply-authority-fact-v1.js';
export type {
  ArenaSupplyAuthorityFactKindV1,
  ArenaSupplyAuthorityFactV1,
} from './arena-supply-authority-fact-v1.js';
export {
  ARENA_SUPPLY_CADENCE_SNAPSHOT_V1_SCHEMA_VERSION,
  createArenaSupplyCadenceSnapshotV1,
} from './arena-supply-cadence-snapshot-v1.js';
export type {
  ArenaSupplyCadenceSnapshotV1,
} from './arena-supply-cadence-snapshot-v1.js';
export {
  SYNCHRONOUS_STORAGE_PORT_BOUNDARY,
  createSynchronousStoragePort,
} from './synchronous-storage-port.js';
export type {
  SynchronousStoragePort,
  SynchronousStoragePortOptions,
  SynchronousStorageReadResult,
} from './synchronous-storage-port.js';
export { createArenaMatchSnapshotAudit } from './match-snapshot.js';
export {
  ARENA_PUBLIC_SUPPLY_PROJECTION_MAX_ITEMS,
  ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS,
  ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION,
  assertArenaPublicSupplyProjectionResyncReady,
  createArenaPublicSupplyProjectionAudit,
  requireArenaPublicSupplyProjection,
} from './arena-public-supply-projection.js';
export type {
  ArenaActionSnapshot,
  ArenaActionCommitmentSnapshot,
  ArenaEquipmentSnapshot,
  ArenaHeldEquipmentSnapshot,
  ArenaMapOccurrenceSnapshot,
  ArenaMapSnapshot,
  ArenaMapSurfaceSnapshot,
  ArenaMatchResultSnapshot,
  ArenaMatchSnapshot,
  ArenaMatchSnapshotAuditOptions,
  ArenaMovementSnapshot,
  ArenaParticipantSnapshot,
  ArenaVector2Snapshot,
  ArenaVector3Snapshot,
} from './match-snapshot.js';
export type {
  ArenaPublicSupplyProjection,
  ArenaPublicSupplyProjectionAuditOptions,
  ArenaPublicSupplyProjectionItem,
  ArenaPublicSupplyProjectionLifecycleContract,
  ArenaPublicSupplyProjectionReadiness,
  ArenaPublicSupplyProjectionSpawnSpec,
} from './arena-public-supply-projection.js';
export {
  ARENA_MATCH_READ_PROFILE,
  MATCH_READ_FRAME_V2_SCHEMA_VERSION,
  createBotMobilitySidecarV2Audit,
  createFullAuditSidecarV2Audit,
  createLocalActionSidecarV2Audit,
  createMatchReadFrameV2Audit,
  createWorldSnapshotV2Audit,
  requireArenaSurvivalSupplyProjectionV2,
} from './match-read-frame-v2.js';
export type {
  ActionAffordanceViewV2,
  ArenaMatchReadProfile,
  BotMobilitySidecarV2,
  FullAuditSidecarV2,
  LocalActionSidecarV2,
  MatchReadFrameV2,
  WorldParticipantSnapshotV2,
  WorldSnapshotV2,
} from './match-read-frame-v2.js';
export { ACTION_RESOLUTION_KIND } from './action-resolution.js';
export type { ActionResolutionKind } from './action-resolution.js';
export {
  createMatchContentPublicView,
  createMatchContentSelection,
  MATCH_CONTENT_SELECTION_SCHEMA_VERSION,
} from './match-content-selection.js';
export type {
  MatchContentSelection,
  MatchParticipantCharacterSelection,
} from './match-content-selection.js';
export * from './match-content-selection-v2.js';
export * from './match-equipment-usage-v3.js';
export * from './survival-equipment-action-eligibility-v1.js';
export * from './competitive-equipment-action-eligibility-v1.js';
export * from './action-feedback-outcome-consistency-v1.js';
export * from './survival-equipment-ownership-consistency-v1.js';
export * from './match-participant-assignment-v2.js';
// P2 versioned contracts are public library boundaries only. Product/Composition
// must still opt in explicitly; exporting them does not change the V5 default path.
export * from './match-event-v6.js';
export * from './arena-mode-rule-constants-v1.js';
export * from './arena-combat-rule-constants-v1.js';
export * from './arena-public-supply-projection-v3.js';
export * from './match-read-frame-v3.js';
export * from './weapon-feedback-semantic-v1.js';
export * from './weapon-feedback-result-direction-v2.js';
export * from './weapon-feedback-direction-fact-v2.js';
export * from './local-jump-availability-v1.js';
export {
  combineCleanupFailure,
  normalizeThrownError,
} from './lifecycle-errors.js';
export type {
  CombinedLifecycleError,
  NormalizedLifecycleError,
} from './lifecycle-errors.js';
export {
  ARENA_SYNCHRONOUS_RETURN_BOUNDARY,
  assertSynchronousReturn,
} from './synchronous-return-boundary.js';
