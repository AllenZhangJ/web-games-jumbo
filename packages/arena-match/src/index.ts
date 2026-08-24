export { ARENA_ACTION_PHASE } from '@number-strategy-jump/arena-contracts';
export {
  ARENA_FIXED_DT,
  ARENA_PHYSICS,
  ARENA_TICK_RATE,
} from '@number-strategy-jump/arena-physics';
export {
  ARENA_MATCH_DEFAULTS,
  ARENA_MATCH_PHASE,
  ARENA_PARTICIPANT_STATUS,
  createArenaMatchConfig,
  PHYSICS_POC_ARENA,
  PHYSICS_POC_CHARACTER,
} from './match-config.js';
export type {
  ArenaBasePushConfig,
  ArenaEquipmentConfig,
  ArenaEquipmentSpawnConfig,
  ArenaMatchConfig,
  ArenaMatchConfigOverrides,
  ArenaMatchPhase,
  ArenaParticipantCharacterConfig,
  ArenaParticipantStatus,
} from './match-config.js';
export { MatchParticipantSystem } from './match-participant-system.js';
export type {
  MatchParticipantSnapshot,
  ParticipantEliminationOutcome,
  ParticipantTimeoutOutcome,
} from './match-participant-system.js';
export { MatchTimelineSystem } from './match-timeline-system.js';
export type {
  MatchActiveTickTransition,
  MatchTimelineResult,
  MatchTimelineSnapshot,
} from './match-timeline-system.js';
export { createCharacterRuntimeReference } from './character-runtime.js';
export type {
  CharacterRuntimeReference,
  CharacterRuntimeReferenceOptions,
} from './character-runtime.js';
export {
  createArenaConfigHash,
  createMatchStateHash,
} from './state-hash.js';
export type {
  ArenaInternalEquipmentSupplyDispositionSnapshot,
  ArenaInternalEquipmentSupplyLifecycle,
  ArenaInternalEquipmentSupplyTimelineSnapshot,
  ArenaInternalMatchSnapshot,
} from './state-hash.js';
export { ARENA_EQUIPMENT_SUPPLY_DISPOSITION_SCHEMA_VERSION } from './state-hash.js';
export {
  ARENA_MATCH_EVENT,
  MatchCore,
  readConsumedTrustedInputFrameBatch,
} from './match-core.js';
export type {
  ArenaAuthorityEvent,
  MatchCoreFactoryContext,
  MatchCoreEquipmentSupplyAuthority,
  MatchCoreEquipmentSupplyTimelineContract,
  MatchCoreEquipmentSupplyTimelineFactoryContext,
  MatchCoreEquipmentSupplyTimelineStepResult,
  MatchCoreMapFactoryContext,
  MatchCoreOptions,
  MatchCoreTrustedInputFrameBatch,
  MatchReplayMetadata,
  MatchInternalCheckpointIdentity,
} from './match-core.js';
export type {
  MatchReadBinding,
  MatchReadIdentityMemo,
  MatchReadReader,
} from './match-read-port.js';
export type {
  MatchReadFrameReader,
  MatchReadSidecarReader,
} from './match-read-frame.js';
export {
  SURVIVAL_MATCH_READ_FRAME_V3_ADAPTER_SCHEMA_VERSION,
  composeSurvivalMatchReadFrameV3,
} from './survival-match-read-frame-v3-adapter.js';
export type {
  SurvivalMatchReadFrameV3AdapterOptions,
  SurvivalMatchReadFrameV3AdapterResult,
} from './survival-match-read-frame-v3-adapter.js';
export {
  SURVIVAL_PRESSURE_RESOLUTION_V1_SCHEMA_VERSION,
  SurvivalPressureResolverV1,
} from './survival-pressure-resolver-v1.js';
export type {
  SurvivalPressureActiveSlotResolutionV1,
  SurvivalPressureResolutionV1,
} from './survival-pressure-resolver-v1.js';
export * from './match-core-weapon-feedback-adapter-v1.js';
export * from './match-core-weapon-feedback-bundle-owner-v2.js';
export * from './match-core-weapon-feedback-direction-checkpoint-v2.js';
export * from './match-core-weapon-feedback-direction-owner-v2.js';
export {
  ARENA_INTERNAL_MATCH_CHECKPOINT_SCHEMA_VERSION,
  createArenaInternalMatchCheckpoint,
  restoreMatchCoreFromCheckpoint,
  validateArenaInternalMatchCheckpoint,
} from './match-checkpoint.js';
export type {
  ArenaInternalMatchCheckpoint,
  InternalCheckpointCoreFactory,
  InternalCheckpointCoreFactoryOptions,
  RestoreMatchCoreFromCheckpointOptions,
} from './match-checkpoint.js';
export {
  FIXED_STEP_RUNTIME_DEFAULTS,
  FixedStepMatchRuntime,
} from './fixed-step-match-runtime.js';
export type {
  FixedStepAdvanceResult,
  FixedStepDebugSnapshot,
  FixedStepInputProvider,
  FixedStepRuntimeOptions,
} from './fixed-step-match-runtime.js';
export {
  ARENA_REPLAY_ERROR_CODE,
  ARENA_REPLAY_SCHEMA_VERSION,
  ArenaReplayCompatibilityError,
  createReplayMatch,
  validateArenaReplay,
  HEADLESS_MATCH_RUNNER_DEFAULTS,
  HeadlessMatchRunner,
} from './replay.js';
export type {
  ArenaReplay,
  ArenaReplayCheckpoint,
  HeadlessInputProvider,
  HeadlessMatchRunnerOptions,
  HeadlessRunOptions,
  ReplayBeforeStep,
  ReplayBeforeStepContext,
  ReplayCoreFactory,
  ReplayCoreFactoryOptions,
  ReplayMatch,
  ReplayMatchOptions,
  ReplayMatchResult,
} from './replay.js';

// ADR-119 versioned P2 candidates. Exporting these contracts does not connect
// them to the V5 default composition or any production registry/entrypoint.
export * from './match-config-v6.js';
export * from './match-participant-system-v2.js';
export * from './mode-policy-resolver.js';
export * from './mode-timeline-policy-resolver-v1.js';
export * from './mode-objective-policy-resolver-v1.js';
export * from './mode-result-policy-resolver-v1.js';
export * from './match-mode-system.js';
export * from './mode-runtime-contracts-v1.js';
export * from './duel-mode-adapter-v6.js';
export * from './race-mode-system.js';
export * from './survival-mode-system.js';
export * from './mode-checkpoint-v2.js';
export * from './replay-v6.js';
export * from './mode-match-runtime-v6.js';
export * from './mode-match-runtime-checkpoint-v1.js';
export * from './mode-match-runtime-checkpoint-v2.js';
export * from './mode-match-runtime-checkpoint-v3.js';
export * from './mode-match-runtime-terminal-evidence-v1.js';
export * from './mode-match-runtime-terminal-evidence-v2.js';
export * from './mode-match-runtime-checkpoint-v4.js';
export * from './kz-mode-map-adapter-v1.js';
