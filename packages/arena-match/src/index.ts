export { ARENA_ACTION_PHASE } from '@number-strategy-jump/arena-core';
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
export type { ArenaInternalMatchSnapshot } from './state-hash.js';
export {
  ARENA_MATCH_EVENT,
  MatchCore,
} from './match-core.js';
export type {
  ArenaAuthorityEvent,
  MatchCoreFactoryContext,
  MatchCoreMapFactoryContext,
  MatchCoreOptions,
  MatchReplayMetadata,
} from './match-core.js';
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
