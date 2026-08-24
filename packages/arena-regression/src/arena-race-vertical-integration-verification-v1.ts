import {
  createBotPrimaryCommitmentObservationV1,
  createBotPrimaryInputPacingV1,
  isBotParticipantControlAvailableV1,
  isBotPrimaryActionReadyV1,
} from '@number-strategy-jump/arena-bot';
import {
  ARENA_MATCH_EVENT_V6,
  ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1,
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createArenaLocalJumpAvailabilityV1,
  createArenaMatchEventV6,
  createDeterministicDataHash,
  createModeResultV3Payload,
  createMatchReadFrameV3Audit,
  validateFinalizedMatchAssignmentV2,
  validateMatchContentSelectionV2,
  type ArenaInputFrame,
  type ArenaMatchEventV6,
  type ArenaWeaponFeedbackDirectionFactV2,
  type DeepReadonly,
  type MatchReadFrameV3,
  type MatchReadFrameV3AuditOptions,
  type ModeResultV3Payload,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_GAMEPLAY_V2_TUNING,
  type CharacterDefinition,
  type KzRouteAnchorV2,
  type KzRouteDefinitionV2,
  type MapDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  type ArenaRuleEngineCheckpointV1,
  type ArenaRuleEngineContract,
  type RuleActor,
  type RuleImpulse,
  type RuleMutationPorts,
} from '@number-strategy-jump/arena-core';
import {
  KzRaceModeMapAdapterV1,
  ARENA_MATCH_DEFAULTS,
  MATCH_CORE_WEAPON_FEEDBACK_ADAPTER_CHECKPOINT_V1_SCHEMA_VERSION,
  MODE_MATCH_RUNTIME_V6_STATE,
  MatchCoreWeaponFeedbackBundleOwnerV2,
  ModePolicyResolver,
  ModeResultPolicyResolverV1,
  ModeMatchRuntimeV6,
  RACE_MODE_PREPARING_TICKS_V1,
  RACE_MODE_RESPAWN_DELAY_TICKS_V1,
  createArenaMatchConfigV6,
  validateMatchCoreWeaponFeedbackAdapterCheckpointV1,
  validateMatchCoreWeaponFeedbackDirectionCheckpointV2,
  type ArenaMatchConfigV6,
  type MatchCoreWeaponFeedbackAdapterCheckpointV1,
  type MatchCoreWeaponFeedbackDirectionCheckpointV2,
  type ModeMatchResolutionV6,
  type ModeMatchRuntimeV6RetainedResourceSnapshot,
  type ModeMatchWorldAuthorityV6,
  type RaceModeCommandV1,
} from '@number-strategy-jump/arena-match';
import {
  MovementSystem,
  createMovementCommand,
  type MovementSystemCheckpointV1,
} from '@number-strategy-jump/arena-movement';
import {
  ARENA_FIXED_DT,
  createCharacterPhysicsProfile,
  createLightweightPhysicsWorld,
  createLightweightPhysicsWorldFromCheckpointV1,
  type CheckpointableLightweightPhysicsWorldV1,
  type LightweightPhysicsCheckpointV1,
} from '@number-strategy-jump/arena-physics';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
  ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1,
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1,
  ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_V1,
  ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1,
  ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1,
  ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1,
  ARENA_V2_RACE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V2,
  ARENA_V2_SIX_CHARACTER_CATALOG_ENTRIES_CANDIDATE_V1,
  ARENA_V2_SIX_CHARACTER_DEFINITION_IDS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  createArenaBaselineWeaponRuleEngineCandidateV1,
  type ArenaBaselineWeaponBundleV1,
} from './arena-baseline-weapon-consequence-verification-v1.js';
import {
  ARENA_THREE_MODE_WEAPON_FEEDBACK_CHECKPOINT_CAPABILITY_V1,
  createArenaModeWeaponFeedbackCheckpointCapabilityV1,
  type ArenaModeWeaponFeedbackCheckpointCapabilityV1,
} from './arena-three-mode-weapon-feedback-checkpoint-capability-v1.js';
import {
  ARENA_THREE_MODE_WEAPON_FEEDBACK_DIRECTION_CAPABILITY_V2,
  createArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2,
  validateArenaModeWeaponFeedbackRestoreCapability,
  type ArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2,
} from './arena-three-mode-weapon-feedback-direction-capability-v2.js';
import {
  createArenaThreeModeContentSelectionCheckpointCapabilityV1,
} from './arena-three-mode-content-selection-checkpoint-capability-v1.js';
import {
  assertArenaThreeModeRuntimePolicyContentSelectionCandidateV1,
  assertArenaRuntimeExistingModeSemanticsCandidateV1,
  assertArenaThreeModeRuntimePolicyParticipantAssignmentCandidateV1,
  projectArenaRuntimeObjectivePolicyResolverBundleCandidateV1,
  projectArenaRuntimePolicyResolverBundleCandidateV1,
  projectArenaRuntimeResultPolicyResolverBundleCandidateV1,
  resolveArenaRuntimeRespawnRolePolicyCandidateV1,
  validateArenaThreeModeRuntimePolicyBindingCandidateV1,
  type ArenaThreeModeRuntimePolicyBindingCandidateV1,
} from './arena-three-mode-runtime-policy-binding-candidate-v1.js';

export const ARENA_RACE_VERTICAL_INTEGRATION_VERIFICATION_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_RACE_VERTICAL_INTEGRATION_VERIFICATION_V1_CANDIDATE_STATUS =
  'production-unreachable' as const;

const PARTICIPANT_COUNTS = Object.freeze([2, 3, 4] as const);
const DEFAULT_MATCH_SEED = 0x5a17_c0de;
const CHECKPOINT_INTERVAL_TICKS = 60;
const VERIFICATION_SCENARIO_MAXIMUM_TICKS = 6_000;
export const ARENA_RACE_EXECUTION_TIMING_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_RACE_EXECUTION_PURPOSE_V1 = Object.freeze({
  INTERACTIVE_PRODUCT_CANDIDATE: 'interactive-product-candidate',
  VERIFICATION_SCENARIO: 'verification-scenario',
} as const);
const RACE_TIMELINE_PRODUCT_VARIANT =
  ARENA_V2_RACE_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V2.variants[0]!;
export const ARENA_RACE_UNRESOLVED_INTERACTIVE_LOCAL_HARD_LIMIT_ACTIVE_TICKS_CANDIDATE_V1 =
  RACE_TIMELINE_PRODUCT_VARIANT.hardLimitActiveTicks;
const RACE_EXECUTION_TIMING_KEYS = new Set([
  'schemaVersion', 'purpose', 'preparingTicks', 'interactiveLocalHardLimitActiveTicks',
  'verificationScenarioMaximumTicks', 'contentHash',
]);
export const ARENA_RACE_TIMELINE_RUNTIME_MIRROR_CANDIDATE_V1 = Object.freeze({
  preparingTicks: RACE_TIMELINE_PRODUCT_VARIANT.preparingTicks,
  hardLimitActiveTicks:
    ARENA_RACE_UNRESOLVED_INTERACTIVE_LOCAL_HARD_LIMIT_ACTIVE_TICKS_CANDIDATE_V1,
  suddenDeathStartActiveTick: null,
});
const AIR_JUMP_REPRESS_AFTER_TICKS = 12;
const ARRIVAL_HORIZONTAL_TOLERANCE = 0.9;
const ROUTE_MISTAKE_TICKS = 36;
const ROUTE_MISTAKE_SURFACE_ID = 'kz-s05-narrow';
const COMBAT_RING_OUT_SURFACE_ID = 'kz-s01-start';
const COMBAT_ATTACKER_INDEX = 0;
const COMBAT_TARGET_INDEX = 1;
const COMBAT_STAGE_TOLERANCE = 0.32;
const COMBAT_SETTLE_TICKS = 8;
const MAXIMUM_RECORDED_FALLS = 64;
const COMBAT_STAGE_ATTACKER = Object.freeze({ x: -1.8, z: -0.45 });
const COMBAT_STAGE_TARGET = Object.freeze({ x: -1.8, z: -2 });
const EXPIRED_CONTROL_STAGE_ATTACKER = Object.freeze({ x: -2.2, z: -1.2 });
const EXPIRED_CONTROL_STAGE_TARGET = Object.freeze({ x: -0.7, z: -1.2 });
const PHYSICS_BACKEND_VERSION = 'arena.p3.race.lightweight-physics.v1';
const MODE_DEFINITION_ID = ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.race;
const FIXTURE_DEFINITION_ID = 'arena-v2.mode.race.vertical-integration.test.fixture.v1';
const NO_SUPPLY_AUDIT = Object.freeze({
  worldSupplyEquipmentInstanceIds: Object.freeze([]),
  expectedWorldSupplyIdentities: Object.freeze([]),
}) satisfies MatchReadFrameV3AuditOptions;
const SCENARIO_OPTION_KEYS = new Set(['participantCount', 'matchSeed']);
const MODE_RESOLUTION_KEYS = new Set([
  'tick', 'commands', 'modeProjection', 'modeState', 'modeResult',
]);
const RACE_COMMAND_KEYS = Object.freeze({
  'commit-safe-anchor': new Set(['kind', 'participantId', 'anchorId', 'progressOrdinal']),
  'record-finish-claim': new Set([
    'kind', 'participantId', 'finishTick', 'progressOrdinal',
  ]),
  'schedule-respawn': new Set([
    'kind', 'participantId', 'readyTick', 'anchorId', 'protectionTicks',
  ]),
  'respawn-participant': new Set([
    'kind', 'participantId', 'anchorId', 'protectionTicks',
  ]),
  'end-race': new Set(['kind', 'result']),
} as const);
const AUTHORITATIVE_RUNTIME_REQUEST_KEYS = new Set([
  'modeDefinitionId', 'matchSeed', 'selection', 'finalAssignment', 'localParticipantId',
  'runtimePolicyBinding',
]);
const AUTHORITATIVE_RUNTIME_REQUIRED_REQUEST_KEYS = Object.freeze([
  'modeDefinitionId', 'matchSeed', 'selection', 'finalAssignment', 'localParticipantId',
] as const);
const AUTHORITY_CHECKPOINT_KEYS = new Set([
  'schemaVersion', 'configHash', 'matchSeed', 'localParticipantId', 'participantIds',
  'readFrame', 'readFrameAudit', 'stateHash', 'paused', 'participantStates', 'evidence',
  'physicsCheckpoint', 'movementCheckpoint', 'ruleCheckpoint', 'feedbackCheckpoint',
  'feedbackDirectionCheckpoint', 'checkpointIdentityHash',
]);
const AUTHORITY_CHECKPOINT_CORE_KEYS = new Set(
  [...AUTHORITY_CHECKPOINT_KEYS].filter((key) => key !== 'checkpointIdentityHash'),
);
const AUTHORITY_PARTICIPANT_STATE_KEYS = new Set([
  'participantId', 'latestSafeAnchorId', 'lastSupportSurfaceId', 'respawning',
  'scheduledReadyTick', 'invulnerableTicks', 'hitstunTicks', 'lastHitBy', 'lastHitTick',
  'fallCount', 'finished',
]);
const AUTHORITY_EVIDENCE_KEYS = new Set([
  'actionStartedCount', 'combatHitCount', 'combatCreditedFallCount', 'physicalFallCount',
  'safeAnchorCommitCount', 'respawns', 'pendingRespawns', 'combat', 'falls',
]);
const AUTHORITY_COMBAT_EVIDENCE_KEYS = new Set([
  'attackerId', 'targetId', 'actionStartedTicks', 'hitTicks', 'firstImpulse',
  'supportSurfaceAtFirstHit', 'lastSupportedTick', 'firstUnsupportedTick',
  'creditedFall', 'expiredControlFall',
]);
const AUTHORITY_PENDING_RESPAWN_KEYS = new Set([
  'participantId', 'fallTick', 'readyTick', 'anchorId',
]);
const AUTHORITY_RESPAWN_EVIDENCE_KEYS = new Set([
  'participantId', 'fallTick', 'scheduledReadyTick', 'respawnTick', 'anchorId',
]);
const AUTHORITY_FALL_EVIDENCE_KEYS = new Set([
  'participantId', 'tick', 'eventId', 'eventSequence', 'fallCause',
  'creditedAttackerId', 'supportSurfaceId', 'lastHitByAtFall', 'lastHitTickAtFall',
]);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;

type ArenaRaceExecutionPurposeV1 =
  typeof ARENA_RACE_EXECUTION_PURPOSE_V1[keyof typeof ARENA_RACE_EXECUTION_PURPOSE_V1];

export interface ArenaRaceExecutionTimingCandidateV1 {
  readonly schemaVersion: typeof ARENA_RACE_EXECUTION_TIMING_V1_SCHEMA_VERSION;
  readonly purpose: ArenaRaceExecutionPurposeV1;
  readonly preparingTicks: number;
  readonly interactiveLocalHardLimitActiveTicks:
    typeof ARENA_RACE_UNRESOLVED_INTERACTIVE_LOCAL_HARD_LIMIT_ACTIVE_TICKS_CANDIDATE_V1;
  readonly verificationScenarioMaximumTicks: number | null;
  readonly contentHash: string;
}

const MAP = ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.mapDefinition;
const ROUTE = ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.routeDefinition;
type RaceMapContent = Readonly<{
  readonly mapDefinition: MapDefinition;
  readonly routeDefinition: KzRouteDefinitionV2;
  readonly raceFinishCapability: Readonly<{
    readonly capabilityId: string;
    readonly anchorId: string;
  }>;
}>;
const PLAYABLE_RACE_MAPS: readonly RaceMapContent[] = Object.freeze([
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1,
  ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_V1,
]);
const CHARACTER = ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1;
const PROFILE = createCharacterPhysicsProfile(CHARACTER);
const WEAPON: ArenaBaselineWeaponBundleV1 = Object.freeze({
  id: 'heavy-hammer',
  actions: ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1.actions,
  equipment: ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1.equipment,
  grammar: ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1.grammar,
  contentHash: ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1.contentHash,
});
const ANCHOR_BY_ID = new Map(ROUTE.anchors.map((anchor) => [anchor.id, anchor]));

export interface ArenaRaceVerticalIntegrationScenarioOptionsV1 {
  readonly participantCount: 2 | 3 | 4;
  readonly matchSeed: number;
}

export interface ArenaRaceVerticalIntegrationRespawnEvidenceV1 {
  readonly participantId: string;
  readonly fallTick: number;
  readonly scheduledReadyTick: number;
  readonly respawnTick: number;
  readonly anchorId: string;
}

export interface ArenaRaceVerticalIntegrationFallEventEvidenceV1 {
  readonly participantId: string;
  readonly tick: number;
  readonly eventId: string;
  readonly eventSequence: number;
  readonly fallCause: 'movement' | 'credited-hit';
  readonly creditedAttackerId: string | null;
  readonly supportSurfaceId: string | null;
  readonly lastHitByAtFall: string | null;
  readonly lastHitTickAtFall: number;
}

export interface ArenaRaceVerticalIntegrationCombatRingOutEvidenceV1 {
  readonly closure: 'code-written-not-run';
  readonly requiredScenario: true;
  readonly attackerId: string;
  readonly targetId: string;
  readonly combatSurfaceId: typeof COMBAT_RING_OUT_SURFACE_ID;
  readonly usesOnlyStandardInputFrame: true;
  readonly directionalInputTick: number;
  readonly jumpInputTick: number;
  readonly primaryInputTick: number;
  readonly actionStartedTick: number;
  readonly firstHitTick: number;
  readonly appliedImpulse: Readonly<{
    readonly tick: number;
    readonly x: number;
    readonly y: number;
    readonly z: number;
  }>;
  readonly supportTransition: Readonly<{
    readonly fromSurfaceId: typeof COMBAT_RING_OUT_SURFACE_ID;
    readonly lastSupportedTick: number;
    readonly firstUnsupportedTick: number;
    readonly killYCrossingTick: number;
  }>;
  readonly creditedFall: ArenaRaceVerticalIntegrationFallEventEvidenceV1;
  readonly respawn: ArenaRaceVerticalIntegrationRespawnEvidenceV1;
  readonly replayV6ResultIdentity: Readonly<{
    readonly emittedFallEventId: string;
    readonly replayFallEventId: string;
    readonly replayFallEventSequence: number;
    readonly resultParticipantId: string;
    readonly resultRank: number;
    readonly resultEndedAtTick: number;
  }>;
}

export interface ArenaRaceVerticalIntegrationControlEvidenceV1 {
  readonly expiredLastHit: Readonly<{
    readonly attackerId: string;
    readonly targetId: string;
    readonly hitTick: number;
    readonly fallTick: number;
    readonly elapsedTicks: number;
    readonly lastHitCreditTicks: number;
    readonly fallCause: 'movement';
    readonly creditedAttackerId: null;
    readonly respawn: ArenaRaceVerticalIntegrationRespawnEvidenceV1;
  }>;
  readonly noHitRouteMistake: Readonly<{
    readonly participantId: string;
    readonly phaseStartedTick: number;
    readonly fallTick: number;
    readonly fallCause: 'movement';
    readonly creditedAttackerId: null;
    readonly lastHitByAtFall: null;
    readonly lastHitTickAtFall: -1;
  }>;
}

export interface ArenaRaceVerticalIntegrationScenarioReportV1 {
  readonly id: string;
  readonly participantCount: 2 | 3 | 4;
  readonly matchSeed: number;
  readonly participantIds: readonly string[];
  readonly startLineX: number;
  readonly startLaneZs: readonly number[];
  readonly preparationTicks: 60;
  readonly executedTicks: number;
  readonly pauseResumeCycleCount: number;
  readonly actionStartedCount: number;
  readonly combatHitCount: number;
  readonly combatCreditedFallCount: number;
  readonly combatRingOutClosure: 'code-written-not-run';
  readonly combatRingOut: ArenaRaceVerticalIntegrationCombatRingOutEvidenceV1;
  readonly controls: ArenaRaceVerticalIntegrationControlEvidenceV1;
  readonly scriptedPhaseOrder: readonly RaceScriptPhaseV1[];
  readonly routeMistakeFallCount: number;
  readonly safeAnchorCommitCount: number;
  readonly respawns: readonly ArenaRaceVerticalIntegrationRespawnEvidenceV1[];
  readonly winnerParticipantIds: readonly string[];
  readonly rankings: readonly Readonly<{
    readonly participantId: string;
    readonly rank: number;
    readonly finishTick: number | null;
    readonly progressOrdinal: number;
  }>[];
  readonly replayEventCount: number;
  readonly replayCheckpointCount: number;
  readonly feedbackOutcomeWindowTicks:
    typeof ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1;
  readonly fullAuthorityCheckpointRestoreCount: 1;
  readonly fullAuthorityCheckpointRestoredAtTick: number;
  readonly runtimeCheckpointV3RestoreIdentityHash: string;
  readonly feedbackCheckpointRestoreIdentityHash: string;
  readonly finalTick: number;
  readonly finalHash: string;
  readonly retainedResourceCountAfterDestroy: number;
  readonly resultHash: string;
}

export interface ArenaRaceVerticalIntegrationVerificationReportV1 {
  readonly schemaVersion:
    typeof ARENA_RACE_VERTICAL_INTEGRATION_VERIFICATION_V1_SCHEMA_VERSION;
  readonly candidateStatus:
    typeof ARENA_RACE_VERTICAL_INTEGRATION_VERIFICATION_V1_CANDIDATE_STATUS;
  readonly hardGate: false;
  readonly defaultRegistryWired: false;
  readonly defaultCompositionWired: false;
  readonly defaultEntryWired: false;
  readonly validationStatus: 'not-run';
  readonly mapDefinitionId: string;
  readonly routeDefinitionId: string;
  readonly characterDefinitionId: string;
  readonly weaponDefinitionId: string;
  readonly weaponContentHash: string;
  readonly modeDefinitionId: string;
  readonly usesSharedRuleMovementPhysics: true;
  readonly usesRaceSpecificWeaponSystem: false;
  readonly combatRingOutClosure: 'code-written-not-run';
  readonly terminalTickContractClosure: 'static-contract-patched-not-run';
  readonly fullAuthorityCheckpointClosure: 'code-written-not-run';
  readonly deferredGaps: readonly [];
  readonly scenarios: readonly ArenaRaceVerticalIntegrationScenarioReportV1[];
  readonly resultHash: string;
}

interface MutableParticipantAuthorityState {
  readonly participantId: string;
  latestSafeAnchorId: string;
  lastSupportSurfaceId: string | null;
  respawning: boolean;
  scheduledReadyTick: number | null;
  invulnerableTicks: number;
  hitstunTicks: number;
  lastHitBy: string | null;
  lastHitTick: number;
  fallCount: number;
  finished: boolean;
}

interface MutableAuthorityEvidence {
  actionStartedCount: number;
  combatHitCount: number;
  combatCreditedFallCount: number;
  physicalFallCount: number;
  safeAnchorCommitCount: number;
  readonly respawns: ArenaRaceVerticalIntegrationRespawnEvidenceV1[];
  readonly pendingRespawns: Map<string, Readonly<{
    fallTick: number;
    readyTick: number;
    anchorId: string;
  }>>;
  readonly combat: {
    readonly attackerId: string;
    readonly targetId: string;
    readonly actionStartedTicks: number[];
    readonly hitTicks: number[];
    firstImpulse: Readonly<{ tick: number; x: number; y: number; z: number }> | null;
    supportSurfaceAtFirstHit: string | null;
    lastSupportedTick: number | null;
    firstUnsupportedTick: number | null;
    creditedFall: ArenaRaceVerticalIntegrationFallEventEvidenceV1 | null;
    expiredControlFall: ArenaRaceVerticalIntegrationFallEventEvidenceV1 | null;
  };
  readonly falls: ArenaRaceVerticalIntegrationFallEventEvidenceV1[];
}

interface ScriptParticipantState {
  readonly participantId: string;
  readonly path: readonly KzRouteAnchorV2[];
  targetIndex: number;
  airborneTicks: number;
  routeMistakeTicksRemaining: number;
  routeMistakeTriggered: boolean;
}

export type RaceScriptPhaseV1 =
  | 'preparing'
  | 'combat-stage'
  | 'combat-face'
  | 'combat-settle'
  | 'combat-attack'
  | 'combat-await-fall'
  | 'combat-await-respawn'
  | 'expired-control-stage'
  | 'expired-control-face'
  | 'expired-control-settle'
  | 'expired-control-attack'
  | 'expired-control-await-hit'
  | 'expired-control-hold'
  | 'expired-control-drive-off'
  | 'expired-control-await-respawn'
  | 'route'
  | 'route-mistake-await-respawn';

interface RaceScenarioScriptStateV1 {
  readonly participants: ScriptParticipantState[];
  readonly attackerId: string;
  readonly targetId: string;
  readonly routeMistakeParticipantId: string;
  phase: RaceScriptPhaseV1;
  phaseStartedTick: number;
  readonly phaseOrder: RaceScriptPhaseV1[];
  combatJumpInputTick: number | null;
  combatPrimaryInputTick: number | null;
  expiredPrimaryInputTick: number | null;
  routeMistakeStartedTick: number | null;
  routeMistakeFallTick: number | null;
  routeMistakeRespawnObserved: boolean;
}

interface RaceVerticalAuthorityCheckpointV2 {
  readonly schemaVersion: 2;
  readonly configHash: string;
  readonly matchSeed: number;
  readonly localParticipantId: string;
  readonly participantIds: readonly string[];
  readonly readFrame: DeepReadonly<MatchReadFrameV3>;
  readonly readFrameAudit: MatchReadFrameV3AuditOptions;
  readonly stateHash: string;
  readonly paused: boolean;
  readonly participantStates: readonly DeepReadonly<MutableParticipantAuthorityState>[];
  readonly evidence: DeepReadonly<{
    readonly actionStartedCount: number;
    readonly combatHitCount: number;
    readonly combatCreditedFallCount: number;
    readonly physicalFallCount: number;
    readonly safeAnchorCommitCount: number;
    readonly respawns: readonly ArenaRaceVerticalIntegrationRespawnEvidenceV1[];
    readonly pendingRespawns: readonly Readonly<{
      readonly participantId: string;
      readonly fallTick: number;
      readonly readyTick: number;
      readonly anchorId: string;
    }>[];
    readonly combat: DeepReadonly<MutableAuthorityEvidence['combat']>;
    readonly falls: readonly ArenaRaceVerticalIntegrationFallEventEvidenceV1[];
  }>;
  readonly physicsCheckpoint: LightweightPhysicsCheckpointV1;
  readonly movementCheckpoint: MovementSystemCheckpointV1;
  readonly ruleCheckpoint: ArenaRuleEngineCheckpointV1;
  readonly feedbackCheckpoint: MatchCoreWeaponFeedbackAdapterCheckpointV1;
  readonly feedbackDirectionCheckpoint: MatchCoreWeaponFeedbackDirectionCheckpointV2;
  readonly checkpointIdentityHash: string;
}

type WeaponFeedbackSourceEventV1 = Readonly<Record<string, unknown> & {
  readonly id: string;
  readonly sequence: number;
  readonly tick: number;
  readonly type: 'ActionStarted' | 'ActionCommitmentCancelled'
    | 'HitResolved' | 'KnockbackApplied' | 'PlayerEliminated';
}>;

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
}

function exactAuthoritativeRuntimeRequest(
  value: unknown,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, AUTHORITATIVE_RUNTIME_REQUEST_KEYS, name);
  for (const key of AUTHORITATIVE_RUNTIME_REQUIRED_REQUEST_KEYS) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
}

function sameData(left: unknown, right: unknown, name: string): boolean {
  return createDeterministicDataHash(left, `${name} left`)
    === createDeterministicDataHash(right, `${name} right`);
}

function freezeRaceExecutionTiming(
  value: Omit<ArenaRaceExecutionTimingCandidateV1, 'contentHash'>,
): ArenaRaceExecutionTimingCandidateV1 {
  const body = Object.freeze({ ...value });
  return Object.freeze({
    ...body,
    contentHash: createDeterministicDataHash(
      body,
      'Arena Race execution timing candidate',
    ),
  });
}

export function createArenaRaceInteractiveExecutionTimingCandidateV1(): ArenaRaceExecutionTimingCandidateV1 {
  return freezeRaceExecutionTiming({
    schemaVersion: ARENA_RACE_EXECUTION_TIMING_V1_SCHEMA_VERSION,
    purpose: ARENA_RACE_EXECUTION_PURPOSE_V1.INTERACTIVE_PRODUCT_CANDIDATE,
    preparingTicks: RACE_TIMELINE_PRODUCT_VARIANT.preparingTicks,
    interactiveLocalHardLimitActiveTicks:
      ARENA_RACE_UNRESOLVED_INTERACTIVE_LOCAL_HARD_LIMIT_ACTIVE_TICKS_CANDIDATE_V1,
    verificationScenarioMaximumTicks: null,
  });
}

export function createArenaRaceVerificationExecutionTimingCandidateV1(): ArenaRaceExecutionTimingCandidateV1 {
  return freezeRaceExecutionTiming({
    schemaVersion: ARENA_RACE_EXECUTION_TIMING_V1_SCHEMA_VERSION,
    purpose: ARENA_RACE_EXECUTION_PURPOSE_V1.VERIFICATION_SCENARIO,
    preparingTicks: RACE_TIMELINE_PRODUCT_VARIANT.preparingTicks,
    interactiveLocalHardLimitActiveTicks:
      ARENA_RACE_UNRESOLVED_INTERACTIVE_LOCAL_HARD_LIMIT_ACTIVE_TICKS_CANDIDATE_V1,
    verificationScenarioMaximumTicks: VERIFICATION_SCENARIO_MAXIMUM_TICKS,
  });
}

export function validateArenaRaceExecutionTimingCandidateV1(
  value: unknown,
): ArenaRaceExecutionTimingCandidateV1 {
  const source = cloneFrozenData(value, 'Arena Race execution timing');
  exactRecord(source, RACE_EXECUTION_TIMING_KEYS, 'Arena Race execution timing');
  if (source.schemaVersion !== ARENA_RACE_EXECUTION_TIMING_V1_SCHEMA_VERSION) {
    throw new RangeError('Arena Race execution timing schemaVersion必须是1。');
  }
  const expected = source.purpose
    === ARENA_RACE_EXECUTION_PURPOSE_V1.INTERACTIVE_PRODUCT_CANDIDATE
    ? createArenaRaceInteractiveExecutionTimingCandidateV1()
    : source.purpose === ARENA_RACE_EXECUTION_PURPOSE_V1.VERIFICATION_SCENARIO
      ? createArenaRaceVerificationExecutionTimingCandidateV1()
      : null;
  if (expected === null) throw new RangeError('Arena Race execution timing purpose非法。');
  if (!sameData(source, expected, 'Arena Race execution timing')) {
    throw new RangeError('Arena Race execution timing purpose/数值/身份漂移。');
  }
  return expected;
}

function raceCommandOrder(command: RaceModeCommandV1): number {
  if (command.kind === 'commit-safe-anchor') return 0;
  if (command.kind === 'record-finish-claim') return 1;
  if (command.kind === 'schedule-respawn') return 2;
  if (command.kind === 'respawn-participant') return 3;
  return 4;
}

function assertRaceModeCommandOrder(commands: readonly RaceModeCommandV1[]): void {
  let previousOrder = -1;
  let previousParticipantId: string | null = null;
  for (const command of commands) {
    const order = raceCommandOrder(command);
    const participantId = command.kind === 'end-race' ? null : command.participantId;
    if (
      order < previousOrder
      || (
        order === previousOrder
        && participantId !== null
        && previousParticipantId !== null
        && participantId <= previousParticipantId
      )
    ) {
      throw new RangeError('P3 Race mode commands未按冻结阶段和participantId稳定排序。');
    }
    previousOrder = order;
    previousParticipantId = participantId;
  }
}

function validateRaceModeCommands(value: unknown): readonly RaceModeCommandV1[] {
  if (!Array.isArray(value)) throw new TypeError('P3 Race mode commands必须是数组。');
  value.forEach((entry, index) => {
    const name = `P3 Race mode commands[${index}]`;
    const command = assertPlainRecord(entry, name);
    const kind = command.kind;
    if (typeof kind !== 'string' || !Object.hasOwn(RACE_COMMAND_KEYS, kind)) {
      throw new RangeError(`${name}.kind不受支持。`);
    }
    exactRecord(command, RACE_COMMAND_KEYS[kind as keyof typeof RACE_COMMAND_KEYS], name);
    if (kind === 'end-race') {
      const result = createModeResultV3Payload(command.result);
      if (result.kind !== 'race') throw new RangeError(`${name}.result必须是Race。`);
      return;
    }
    assertNonEmptyString(command.participantId, `${name}.participantId`);
    if (kind === 'commit-safe-anchor') {
      assertNonEmptyString(command.anchorId, `${name}.anchorId`);
      assertIntegerAtLeast(command.progressOrdinal, 0, `${name}.progressOrdinal`);
    } else if (kind === 'record-finish-claim') {
      assertIntegerAtLeast(command.finishTick, 0, `${name}.finishTick`);
      assertIntegerAtLeast(command.progressOrdinal, 0, `${name}.progressOrdinal`);
    } else if (kind === 'schedule-respawn') {
      assertIntegerAtLeast(command.readyTick, 0, `${name}.readyTick`);
      assertNonEmptyString(command.anchorId, `${name}.anchorId`);
      assertIntegerAtLeast(command.protectionTicks, 0, `${name}.protectionTicks`);
    } else {
      assertNonEmptyString(command.anchorId, `${name}.anchorId`);
      assertIntegerAtLeast(command.protectionTicks, 0, `${name}.protectionTicks`);
    }
  });
  const commands = value as readonly RaceModeCommandV1[];
  assertRaceModeCommandOrder(commands);
  return commands;
}

function raceCheckpointInteger(value: unknown, minimum: number, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new RangeError(`${name}必须是大于等于${minimum}的安全整数。`);
  }
  return value as number;
}

function raceCheckpointHash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name}必须是8位小写十六进制hash。`);
  }
  return value;
}

function assertRaceAuthorityCheckpointParticipantClosure(
  participantStates: readonly DeepReadonly<MutableParticipantAuthorityState>[],
  pendingRespawns: readonly Readonly<{
    readonly participantId: string;
    readonly fallTick: number;
    readonly readyTick: number;
    readonly anchorId: string;
  }>[],
  physicalFallCount: number,
  falls: readonly ArenaRaceVerticalIntegrationFallEventEvidenceV1[],
  readFrame: DeepReadonly<MatchReadFrameV3>,
): void {
  const world = readFrame.worldSnapshot;
  if (
    world.phase !== 'running'
    || world.result !== null
    || world.modeProjection.state.kind !== 'race'
  ) {
    throw new RangeError('P3 Race authority checkpoint只接受运行中Race Frame。');
  }
  const publicById = new Map(world.participants.map((participant) => (
    [participant.id, participant] as const
  )));
  const projectedById = new Map(world.modeProjection.state.participants.map((participant) => (
    [participant.participantId, participant] as const
  )));
  const pendingById = new Map<string, typeof pendingRespawns[number]>();
  const fallCountByParticipantId = new Map<string, number>();
  for (const fall of falls) {
    fallCountByParticipantId.set(
      fall.participantId,
      (fallCountByParticipantId.get(fall.participantId) ?? 0) + 1,
    );
  }
  for (const pending of pendingRespawns) {
    if (pendingById.has(pending.participantId)) {
      throw new RangeError('P3 Race authority checkpoint pending respawn participant重复。');
    }
    pendingById.set(pending.participantId, pending);
  }
  let participantFallCount = 0;
  for (const state of participantStates) {
    const participant = publicById.get(state.participantId);
    const projected = projectedById.get(state.participantId);
    const pending = pendingById.get(state.participantId);
    const expectedStatus = state.respawning ? 'respawning' : 'active';
    const expectedRespawnTicks = state.scheduledReadyTick === null
      ? 0
      : Math.max(0, state.scheduledReadyTick - world.tick);
    participantFallCount += state.fallCount;
    if (
      participant === undefined
      || projected === undefined
      || participant.status !== expectedStatus
      || participant.deaths !== state.fallCount
      || state.fallCount !== (fallCountByParticipantId.get(state.participantId) ?? 0)
      || participant.hitstunTicks !== state.hitstunTicks
      || participant.invulnerableTicks !== state.invulnerableTicks
      || participant.respawnTicks !== expectedRespawnTicks
      || participant.lastHitBy !== state.lastHitBy
      || participant.lastHitTick !== state.lastHitTick
      || projected.safeAnchorId !== state.latestSafeAnchorId
      || (projected.status === 'respawning') !== state.respawning
      || (projected.status === 'finished') !== state.finished
      || state.finished
      || projected.finishTick !== null
      || projected.rank !== null
      || projected.respawnReadyTick !== state.scheduledReadyTick
      || state.respawning !== (state.scheduledReadyTick !== null)
      || (state.finished && state.respawning)
      || (state.respawning && (
        pending === undefined
        || pending.readyTick !== state.scheduledReadyTick
        || pending.anchorId !== state.latestSafeAnchorId
        || pending.readyTick <= world.tick
      ))
      || (!state.respawning && pending !== undefined)
    ) {
      throw new RangeError('P3 Race authority checkpoint participant/Projection/pending不闭合。');
    }
  }
  if (
    publicById.size !== participantStates.length
    || projectedById.size !== participantStates.length
    || pendingById.size !== participantStates.filter(({ respawning }) => respawning).length
    || participantFallCount !== physicalFallCount
    || falls.length !== physicalFallCount
  ) {
    throw new RangeError('P3 Race authority checkpoint roster或fall evidence不闭合。');
  }
}

function normalizeRaceAuthorityCheckpoint(
  value: unknown,
  expected: Readonly<{
    readonly configHash: string;
    readonly matchSeed: number;
    readonly localParticipantId: string;
    readonly participantIds: readonly string[];
    readonly anchorDefinitionIds: ReadonlySet<string>;
    readonly surfaceDefinitionIds: ReadonlySet<string>;
  }>,
): RaceVerticalAuthorityCheckpointV2 {
  const source = cloneFrozenData(value, 'P3 Race authority checkpoint');
  exactRecord(source, AUTHORITY_CHECKPOINT_KEYS, 'P3 Race authority checkpoint');
  if (source.schemaVersion !== 2) throw new RangeError('P3 Race checkpoint.schemaVersion必须是2。');
  const checkpointIdentityHash = raceCheckpointHash(
    source.checkpointIdentityHash,
    'P3 Race checkpoint.checkpointIdentityHash',
  );
  const core = Object.fromEntries([...AUTHORITY_CHECKPOINT_CORE_KEYS].map((key) => (
    [key, source[key]]
  )));
  if (
    createDeterministicDataHash(core, 'P3 Race authority checkpoint identity')
    !== checkpointIdentityHash
  ) throw new RangeError('P3 Race checkpoint identity hash漂移。');
  if (
    source.configHash !== expected.configHash
    || source.matchSeed !== expected.matchSeed
    || source.localParticipantId !== expected.localParticipantId
  ) throw new RangeError('P3 Race checkpoint match身份漂移。');
  if (
    !Array.isArray(source.participantIds)
    || source.participantIds.length !== expected.participantIds.length
    || source.participantIds.some((id, index) => id !== expected.participantIds[index])
  ) throw new RangeError('P3 Race checkpoint participantIds漂移。');
  if (typeof source.paused !== 'boolean') throw new TypeError('P3 Race checkpoint.paused必须是布尔值。');
  const stateHash = raceCheckpointHash(source.stateHash, 'P3 Race checkpoint.stateHash');
  if (!sameData(source.readFrameAudit, NO_SUPPLY_AUDIT, 'P3 Race checkpoint readFrameAudit')) {
    throw new RangeError('P3 Race checkpoint readFrameAudit漂移。');
  }
  const readFrame = createMatchReadFrameV3Audit(source.readFrame, NO_SUPPLY_AUDIT);
  const feedbackCheckpoint = validateMatchCoreWeaponFeedbackAdapterCheckpointV1(
    source.feedbackCheckpoint,
  );
  const feedbackDirectionCheckpoint = validateMatchCoreWeaponFeedbackDirectionCheckpointV2(
    source.feedbackDirectionCheckpoint,
    feedbackCheckpoint,
  );
  if (
    feedbackCheckpoint.schemaVersion
      !== MATCH_CORE_WEAPON_FEEDBACK_ADAPTER_CHECKPOINT_V1_SCHEMA_VERSION
    || feedbackCheckpoint.tick !== readFrame.worldSnapshot.tick
    || feedbackCheckpoint.participantIds.length !== expected.participantIds.length
    || feedbackCheckpoint.participantIds.some(
      (participantId, index) => participantId !== expected.participantIds[index],
    )
  ) throw new RangeError('P3 Race feedback checkpoint与runtime身份不闭合。');
  if (!Array.isArray(source.participantStates) || source.participantStates.length !== expected.participantIds.length) {
    throw new RangeError('P3 Race checkpoint participantStates必须完整覆盖roster。');
  }
  const participantStates = Object.freeze(source.participantStates.map((entry, index) => {
    const name = `P3 Race checkpoint participantStates[${index}]`;
    exactRecord(entry, AUTHORITY_PARTICIPANT_STATE_KEYS, name);
    if (entry.participantId !== expected.participantIds[index]) {
      throw new RangeError(`${name}.participantId顺序或身份漂移。`);
    }
    if (
      typeof entry.respawning !== 'boolean'
      || typeof entry.finished !== 'boolean'
      || typeof entry.latestSafeAnchorId !== 'string'
    ) throw new TypeError(`${name}布尔或anchor字段无效。`);
    if (!expected.anchorDefinitionIds.has(entry.latestSafeAnchorId)) {
      throw new RangeError(`${name}.latestSafeAnchorId未知。`);
    }
    if (
      entry.lastSupportSurfaceId !== null
      && !expected.surfaceDefinitionIds.has(entry.lastSupportSurfaceId as string)
    ) throw new RangeError(`${name}.lastSupportSurfaceId未知。`);
    if (entry.lastHitBy !== null && !expected.participantIds.includes(entry.lastHitBy as string)) {
      throw new RangeError(`${name}.lastHitBy未知。`);
    }
    return Object.freeze({
      participantId: entry.participantId as string,
      latestSafeAnchorId: entry.latestSafeAnchorId,
      lastSupportSurfaceId: entry.lastSupportSurfaceId as string | null,
      respawning: entry.respawning,
      scheduledReadyTick: entry.scheduledReadyTick === null
        ? null
        : raceCheckpointInteger(entry.scheduledReadyTick, 0, `${name}.scheduledReadyTick`),
      invulnerableTicks: raceCheckpointInteger(entry.invulnerableTicks, 0, `${name}.invulnerableTicks`),
      hitstunTicks: raceCheckpointInteger(entry.hitstunTicks, 0, `${name}.hitstunTicks`),
      lastHitBy: entry.lastHitBy as string | null,
      lastHitTick: raceCheckpointInteger(entry.lastHitTick, -1, `${name}.lastHitTick`),
      fallCount: raceCheckpointInteger(entry.fallCount, 0, `${name}.fallCount`),
      finished: entry.finished,
    });
  }));
  exactRecord(source.evidence, AUTHORITY_EVIDENCE_KEYS, 'P3 Race checkpoint evidence');
  exactRecord(source.evidence.combat, AUTHORITY_COMBAT_EVIDENCE_KEYS, 'P3 Race checkpoint combat');
  if (!Array.isArray(source.evidence.pendingRespawns)) {
    throw new TypeError('P3 Race checkpoint pendingRespawns必须是数组。');
  }
  const pendingRespawns = Object.freeze(source.evidence.pendingRespawns.map((entry, index) => {
    const name = `P3 Race checkpoint pendingRespawns[${index}]`;
    exactRecord(entry, AUTHORITY_PENDING_RESPAWN_KEYS, name);
    if (!expected.participantIds.includes(entry.participantId as string)) {
      throw new RangeError(`${name}.participantId未知。`);
    }
    const fallTick = raceCheckpointInteger(entry.fallTick, 0, `${name}.fallTick`);
    const readyTick = raceCheckpointInteger(entry.readyTick, 0, `${name}.readyTick`);
    if (readyTick <= fallTick) throw new RangeError(`${name}.readyTick必须晚于fallTick。`);
    if (!expected.anchorDefinitionIds.has(entry.anchorId as string)) {
      throw new RangeError(`${name}.anchorId未知。`);
    }
    return Object.freeze({
      participantId: entry.participantId as string,
      fallTick,
      readyTick,
      anchorId: entry.anchorId as string,
    });
  }));
  for (let index = 1; index < pendingRespawns.length; index += 1) {
    if (pendingRespawns[index - 1]!.participantId >= pendingRespawns[index]!.participantId) {
      throw new RangeError('P3 Race checkpoint pendingRespawns必须按participantId唯一升序。');
    }
  }
  if (!Array.isArray(source.evidence.respawns)) {
    throw new TypeError('P3 Race checkpoint respawns必须是数组。');
  }
  const respawns = Object.freeze(source.evidence.respawns.map((entry, index) => {
    const name = `P3 Race checkpoint respawns[${index}]`;
    exactRecord(entry, AUTHORITY_RESPAWN_EVIDENCE_KEYS, name);
    if (!expected.participantIds.includes(entry.participantId as string)) {
      throw new RangeError(`${name}.participantId未知。`);
    }
    const fallTick = raceCheckpointInteger(entry.fallTick, 0, `${name}.fallTick`);
    const scheduledReadyTick = raceCheckpointInteger(
      entry.scheduledReadyTick,
      0,
      `${name}.scheduledReadyTick`,
    );
    const respawnTick = raceCheckpointInteger(entry.respawnTick, 0, `${name}.respawnTick`);
    if (scheduledReadyTick <= fallTick || respawnTick !== scheduledReadyTick) {
      throw new RangeError(`${name}的fall/ready/respawn tick不闭合。`);
    }
    if (!expected.anchorDefinitionIds.has(entry.anchorId as string)) {
      throw new RangeError(`${name}.anchorId未知。`);
    }
    return Object.freeze({
      participantId: entry.participantId as string,
      fallTick,
      scheduledReadyTick,
      respawnTick,
      anchorId: entry.anchorId as string,
    });
  }));
  for (let index = 1; index < respawns.length; index += 1) {
    const previous = respawns[index - 1]!;
    const current = respawns[index]!;
    if (
      previous.respawnTick > current.respawnTick
      || (
        previous.respawnTick === current.respawnTick
        && previous.participantId >= current.participantId
      )
    ) {
      throw new RangeError('P3 Race checkpoint respawns必须按respawnTick/participantId稳定排序。');
    }
  }
  if (!Array.isArray(source.evidence.falls)) {
    throw new TypeError('P3 Race checkpoint falls必须是数组。');
  }
  const fallEventIds = new Set<string>();
  const fallEventSequences = new Set<number>();
  const falls = Object.freeze(source.evidence.falls.map((entry, index) => {
    const name = `P3 Race checkpoint falls[${index}]`;
    exactRecord(entry, AUTHORITY_FALL_EVIDENCE_KEYS, name);
    if (!expected.participantIds.includes(entry.participantId as string)) {
      throw new RangeError(`${name}.participantId未知。`);
    }
    const tick = raceCheckpointInteger(entry.tick, 0, `${name}.tick`);
    const eventId = assertNonEmptyString(entry.eventId, `${name}.eventId`);
    const eventSequence = raceCheckpointInteger(
      entry.eventSequence,
      0,
      `${name}.eventSequence`,
    );
    if (
      tick >= readFrame.worldSnapshot.tick
      || eventSequence >= readFrame.worldSnapshot.eventSequence
      || eventId !== eventIdForRaceCheckpoint(expected.matchSeed, tick, eventSequence)
      || fallEventIds.has(eventId)
      || fallEventSequences.has(eventSequence)
    ) {
      throw new RangeError(`${name}的tick/event identity无效或重复。`);
    }
    fallEventIds.add(eventId);
    fallEventSequences.add(eventSequence);
    if (entry.fallCause !== 'movement' && entry.fallCause !== 'credited-hit') {
      throw new RangeError(`${name}.fallCause不受支持。`);
    }
    const creditedAttackerId = entry.creditedAttackerId;
    const lastHitByAtFall = entry.lastHitByAtFall;
    if (
      (creditedAttackerId !== null
        && !expected.participantIds.includes(creditedAttackerId as string))
      || (lastHitByAtFall !== null
        && !expected.participantIds.includes(lastHitByAtFall as string))
      || (entry.fallCause === 'credited-hit') !== (creditedAttackerId !== null)
      || (creditedAttackerId !== null && creditedAttackerId !== lastHitByAtFall)
    ) {
      throw new RangeError(`${name}的掉落归因不闭合。`);
    }
    const supportSurfaceId = entry.supportSurfaceId;
    if (
      supportSurfaceId !== null
      && !expected.surfaceDefinitionIds.has(supportSurfaceId as string)
    ) throw new RangeError(`${name}.supportSurfaceId未知。`);
    const lastHitTickAtFall = raceCheckpointInteger(
      entry.lastHitTickAtFall,
      -1,
      `${name}.lastHitTickAtFall`,
    );
    if (
      lastHitTickAtFall > tick
      || (lastHitByAtFall === null) !== (lastHitTickAtFall === -1)
    ) throw new RangeError(`${name}的last-hit事实不闭合。`);
    return Object.freeze({
      participantId: entry.participantId as string,
      tick,
      eventId,
      eventSequence,
      fallCause: entry.fallCause as 'movement' | 'credited-hit',
      creditedAttackerId: creditedAttackerId as string | null,
      supportSurfaceId: supportSurfaceId as string | null,
      lastHitByAtFall: lastHitByAtFall as string | null,
      lastHitTickAtFall,
    });
  }));
  for (let index = 1; index < falls.length; index += 1) {
    const previous = falls[index - 1]!;
    const current = falls[index]!;
    if (
      previous.tick > current.tick
      || (previous.tick === current.tick && previous.participantId >= current.participantId)
    ) throw new RangeError('P3 Race checkpoint falls必须按tick/participantId稳定唯一排序。');
  }
  const fallByIdentity = new Map<string, typeof falls[number]>(falls.map((fall) => (
    [`${fall.participantId}\u0000${fall.tick}`, fall] as const
  )));
  const claimedFallIdentities = new Set<string>();
  for (const pending of pendingRespawns) {
    const identity = `${pending.participantId}\u0000${pending.fallTick}`;
    if (!fallByIdentity.has(identity) || claimedFallIdentities.has(identity)) {
      throw new RangeError('P3 Race checkpoint pending respawn未唯一引用真实fall evidence。');
    }
    claimedFallIdentities.add(identity);
  }
  for (const respawn of respawns) {
    const identity = `${respawn.participantId}\u0000${respawn.fallTick}`;
    if (!fallByIdentity.has(identity) || claimedFallIdentities.has(identity)) {
      throw new RangeError('P3 Race checkpoint respawn未唯一引用真实fall evidence。');
    }
    claimedFallIdentities.add(identity);
  }
  if (claimedFallIdentities.size !== falls.length) {
    throw new RangeError('P3 Race运行中checkpoint的fall lifecycle未完全闭合。');
  }
  const physicalFallCount = raceCheckpointInteger(
    source.evidence.physicalFallCount,
    0,
    'P3 Race checkpoint evidence.physicalFallCount',
  );
  assertRaceAuthorityCheckpointParticipantClosure(
    participantStates,
    pendingRespawns,
    physicalFallCount,
    falls,
    readFrame,
  );
  const evidence = Object.freeze({
    ...source.evidence,
    physicalFallCount,
    pendingRespawns,
    respawns,
    falls,
  }) as RaceVerticalAuthorityCheckpointV2['evidence'];
  return Object.freeze({
    schemaVersion: 2 as const,
    configHash: expected.configHash,
    matchSeed: expected.matchSeed,
    localParticipantId: expected.localParticipantId,
    participantIds: Object.freeze([...expected.participantIds]),
    readFrame,
    readFrameAudit: NO_SUPPLY_AUDIT,
    stateHash,
    paused: source.paused,
    participantStates,
    evidence,
    physicsCheckpoint: source.physicsCheckpoint as DeepReadonly<LightweightPhysicsCheckpointV1>,
    movementCheckpoint: source.movementCheckpoint as DeepReadonly<MovementSystemCheckpointV1>,
    ruleCheckpoint: source.ruleCheckpoint as DeepReadonly<ArenaRuleEngineCheckpointV1>,
    feedbackCheckpoint,
    feedbackDirectionCheckpoint,
    checkpointIdentityHash,
  });
}

function participantId(index: number): string {
  return `arena-race-vertical-player-${String(index + 1).padStart(2, '0')}`;
}

function requireAnchor(anchorId: string): KzRouteAnchorV2 {
  const anchor = ANCHOR_BY_ID.get(anchorId);
  if (!anchor) throw new RangeError(`P3 Race纵向候选引用未知anchor ${anchorId}。`);
  return anchor;
}

function appendPath(target: string[], source: readonly string[]): void {
  if (target.length === 0) {
    target.push(...source);
    return;
  }
  if (target.at(-1) !== source[0]) {
    throw new RangeError(`P3 Race路线未闭合：${String(target.at(-1))} -> ${source[0]}。`);
  }
  target.push(...source.slice(1));
}

function mainRouteAnchorIds(): readonly string[] {
  const result: string[] = [];
  for (const segment of ROUTE.segments) appendPath(result, segment.pathAnchorIds);
  return Object.freeze(result);
}

const MAIN_ROUTE_ANCHOR_IDS = mainRouteAnchorIds();

function participantPath(startAnchorId: string): readonly KzRouteAnchorV2[] {
  return Object.freeze([
    requireAnchor(startAnchorId),
    ...MAIN_ROUTE_ANCHOR_IDS.slice(1).map(requireAnchor),
  ]);
}

function playableCharacter(characterDefinitionId: string): CharacterDefinition {
  const entry = ARENA_V2_SIX_CHARACTER_CATALOG_ENTRIES_CANDIDATE_V1.find(
    ({ definition }) => definition.id === characterDefinitionId,
  );
  if (entry === undefined) throw new RangeError(`Arena Race未知角色${characterDefinitionId}。`);
  return entry.definition;
}

function playableWeapon(equipmentDefinitionId: string): ArenaBaselineWeaponBundleV1 {
  const weapon = ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.find(
    ({ equipment }) => equipment.id === equipmentDefinitionId,
  );
  if (weapon === undefined) throw new RangeError(`Arena Race未知武器${equipmentDefinitionId}。`);
  return weapon;
}

function playableRaceMap(mapDefinitionId: string): RaceMapContent {
  const content = PLAYABLE_RACE_MAPS.find(
    ({ mapDefinition }) => mapDefinition.id === mapDefinitionId,
  );
  if (content === undefined) throw new RangeError(`Arena Race未知地图${mapDefinitionId}。`);
  if (content.raceFinishCapability.anchorId !== content.routeDefinition.finishAnchorId) {
    throw new RangeError('Arena Race地图终点能力未映射到当前路线真实终点。');
  }
  return content;
}

function routeAnchor(
  route: KzRouteDefinitionV2,
  anchorId: string,
): KzRouteAnchorV2 {
  const anchor = route.anchors.find(({ id }) => id === anchorId);
  if (anchor === undefined) throw new RangeError(`Arena Race路线未知anchor ${anchorId}。`);
  return anchor;
}

function routeMainAnchorIds(route: KzRouteDefinitionV2): readonly string[] {
  const result: string[] = [];
  for (const segment of route.segments) appendPath(result, segment.pathAnchorIds);
  return Object.freeze(result);
}

function participantPathFor(
  route: KzRouteDefinitionV2,
  startAnchorId: string,
): readonly KzRouteAnchorV2[] {
  return Object.freeze([
    routeAnchor(route, startAnchorId),
    ...routeMainAnchorIds(route).slice(1).map((anchorId) => routeAnchor(route, anchorId)),
  ]);
}

function spawnPosition(
  anchor: KzRouteAnchorV2,
  profile = PROFILE,
) {
  return Object.freeze({
    x: anchor.position.x,
    y: anchor.position.y + profile.halfHeight + profile.radius,
    z: anchor.position.z,
  });
}

function directionTo(
  state: Readonly<{ position: Readonly<{ x: number; z: number }> }>,
  target: KzRouteAnchorV2,
): Readonly<{ moveX: number; moveZ: number }> {
  const dx = target.position.x - state.position.x;
  const dz = target.position.z - state.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= 0.05) return Object.freeze({ moveX: 0, moveZ: 0 });
  return Object.freeze({ moveX: dx / distance, moveZ: dz / distance });
}

function arrived(
  state: Readonly<{
    position: Readonly<{ x: number; z: number }>;
    grounded: boolean;
    supportSurfaceId: string | null;
  }>,
  target: KzRouteAnchorV2,
): boolean {
  return state.grounded
    && state.supportSurfaceId === target.surfaceId
    && Math.hypot(
      state.position.x - target.position.x,
      state.position.z - target.position.z,
    ) <= ARRIVAL_HORIZONTAL_TOLERANCE;
}

function createConfig(
  participantCount: number,
  executionTiming: ArenaRaceExecutionTimingCandidateV1,
  character: CharacterDefinition = CHARACTER,
  weapon: ArenaBaselineWeaponBundleV1 = WEAPON,
  mapContent: RaceMapContent = ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1,
  runtimePolicyBinding: ArenaThreeModeRuntimePolicyBindingCandidateV1 | null = null,
): ArenaMatchConfigV6 {
  const { mapDefinition, routeDefinition } = mapContent;
  const modePolicyContentHash = createDeterministicDataHash({
    mapDefinitionId: mapDefinition.id,
    routeDefinitionId: routeDefinition.id,
    routeRespawnDelayTicks: routeDefinition.respawnDelayTicks,
    characterDefinitionId: character.id,
    weaponDefinitionId: weapon.equipment.id,
    weaponContentHash: weapon.contentHash,
    executionTimingContentHash: executionTiming.contentHash,
    preparingTicks: executionTiming.preparingTicks,
    respawnTuningContentHash: ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.contentHash,
    ...(runtimePolicyBinding === null ? {} : {
      runtimePolicyBindingContentHash: runtimePolicyBinding.contentHash,
    }),
  }, 'P3 Race vertical mode policy content');
  return createArenaMatchConfigV6({
    schemaVersion: 6,
    modeDefinitionId: MODE_DEFINITION_ID,
    modeKind: 'race',
    modePolicyContentHash,
    participantAssignments: Array.from({ length: participantCount }, (_, index) => ({
      participantId: participantId(index),
      modeRole: 'competitor',
      teamId: null,
      controllerKind: index === 0 ? 'human' : 'bot',
      characterDefinitionId: character.id,
      slotId: null,
      slotGeneration: 0,
    })),
  });
}

function createFixture(
  adapter: KzRaceModeMapAdapterV1,
  executionTimingValue: unknown,
  runtimePolicyBinding: ArenaThreeModeRuntimePolicyBindingCandidateV1 | null = null,
  raceFinishCapabilityId: string | null = null,
) {
  const executionTiming = validateArenaRaceExecutionTimingCandidateV1(
    executionTimingValue,
  );
  if (adapter.fallbackSafeAnchorId
    !== ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.anchorCapabilityId) {
    throw new RangeError('P3 Race地图adapter未绑定统一重生兜底锚。');
  }
  const resolvedRespawn = runtimePolicyBinding === null
    ? null
    : resolveArenaRuntimeRespawnRolePolicyCandidateV1(
      runtimePolicyBinding,
      MODE_DEFINITION_ID,
      'race',
      'competitor',
    );
  if (resolvedRespawn !== null) {
    const objective = resolvedRespawn.binding.bundle.objective.objective;
    if (raceFinishCapabilityId === null
      || objective.kind !== 'race'
      || objective.finishGateCapabilityId !== raceFinishCapabilityId) {
      throw new RangeError('Arena Race resolved Objective未绑定当前地图统一终点能力。');
    }
    const { rolePolicy } = resolvedRespawn;
    if (rolePolicy.maximumRespawns !== null
      || rolePolicy.anchorPolicy.kind !== 'latest-valid-safe-anchor'
      || rolePolicy.anchorPolicy.fallbackAnchorCapabilityId !== adapter.fallbackSafeAnchorId
      || rolePolicy.delayTicks !== RACE_MODE_RESPAWN_DELAY_TICKS_V1) {
      throw new RangeError('Arena Race resolved重生Policy与地图权威语义不一致。');
    }
  }
  return Object.freeze({
    schemaVersion: 1,
    fixtureDefinitionId: runtimePolicyBinding === null
      ? `${FIXTURE_DEFINITION_ID}.${executionTiming.purpose}`
        + `.timing-${executionTiming.contentHash}`
      : `${FIXTURE_DEFINITION_ID}.${executionTiming.purpose}`
        + `.timing-${executionTiming.contentHash}`
        + `.registry-${runtimePolicyBinding.contentHash}`,
    preparingTicks: executionTiming.preparingTicks,
    respawnDelayTicks: resolvedRespawn?.rolePolicy.delayTicks
      ?? RACE_MODE_RESPAWN_DELAY_TICKS_V1,
    respawnProtectionTicks: resolvedRespawn?.rolePolicy.protectionTicks
      ?? ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.protectionTicks,
    // Race hard-limit remains an unapproved interactive candidate, independent from the
    // verification scenario watchdog and outside the respawn candidate.
    hardLimitActiveTicks: executionTiming.interactiveLocalHardLimitActiveTicks,
    finishGateId: adapter.finishGateId,
    safeAnchorIds: adapter.safeAnchorIds,
    fallbackSafeAnchorId: adapter.fallbackSafeAnchorId,
    initialSafeAnchors: adapter.createInitialSafeAnchors(),
  });
}

function actionSnapshot(engine: ArenaRuleEngineContract, participantIdValue: string) {
  const snapshot = engine.getActionSnapshot(participantIdValue);
  return Object.freeze({
    definitionId: snapshot.definitionId,
    phase: snapshot.phase,
    ticksRemaining: snapshot.ticksRemaining,
    ...(snapshot.commitment === undefined ? {} : { commitment: snapshot.commitment }),
  });
}

function eventId(matchSeed: number, tick: number, sequence: number): string {
  return `p3-race:${matchSeed.toString(16)}:${tick}:${sequence}`;
}

function eventIdForRaceCheckpoint(matchSeed: number, tick: number, sequence: number): string {
  return eventId(matchSeed, tick, sequence);
}

function safelyWrapThrownError(value: unknown, message: string): Error {
  const error = new Error(message);
  Object.defineProperty(error, 'cause', {
    value,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return error;
}

interface RaceRetryableDestroyResourceV1 {
  destroy(): unknown;
}

interface RaceRetainedCleanupResourceV1 {
  readonly label: string;
  readonly resource: RaceRetryableDestroyResourceV1;
}

class RaceVerticalWorldAuthorityV1 implements ModeMatchWorldAuthorityV6 {
  readonly #config: ArenaMatchConfigV6;
  readonly #configHash: string;
  readonly #matchSeed: number;
  readonly #localParticipantId: string;
  readonly #participantIds: readonly string[];
  readonly #adapter: KzRaceModeMapAdapterV1;
  readonly #executionTiming: ArenaRaceExecutionTimingCandidateV1;
  readonly #mapDefinition: MapDefinition;
  readonly #routeDefinition: KzRouteDefinitionV2;
  readonly #anchorById: ReadonlyMap<string, KzRouteAnchorV2>;
  readonly #character: CharacterDefinition;
  readonly #weapon: ArenaBaselineWeaponBundleV1;
  readonly #weaponActionIds: ReadonlySet<string>;
  readonly #modePolicyResolver: ModePolicyResolver | null;
  readonly #modeResultPolicyResolver: ModeResultPolicyResolverV1 | null;
  readonly #profile: ReturnType<typeof createCharacterPhysicsProfile>;
  readonly #participantState: Map<string, MutableParticipantAuthorityState>;
  readonly #evidence: MutableAuthorityEvidence;
  #physics: CheckpointableLightweightPhysicsWorldV1 | null = null;
  #movement: MovementSystem | null = null;
  #engine: ArenaRuleEngineContract | null = null;
  #feedback: MatchCoreWeaponFeedbackBundleOwnerV2 | null = null;
  #committedDirectionFacts: readonly ArenaWeaponFeedbackDirectionFactV2[] = Object.freeze([]);
  #readFrame: DeepReadonly<MatchReadFrameV3> | null = null;
  #stateHash: string | null = null;
  #paused = false;
  #failed = false;
  #destroyed = false;
  #stepping = false;
  readonly #pendingCleanupResources: RaceRetainedCleanupResourceV1[] = [];

  constructor(
    config: ArenaMatchConfigV6,
    matchSeed: number,
    localParticipantId: string,
    adapter: KzRaceModeMapAdapterV1,
    executionTimingValue: unknown,
    character: CharacterDefinition = CHARACTER,
    weapon: ArenaBaselineWeaponBundleV1 = WEAPON,
    mapContent: RaceMapContent = ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1,
    modePolicyResolver: ModePolicyResolver | null = null,
    modeResultPolicyResolver: ModeResultPolicyResolverV1 | null = null,
  ) {
    this.#config = config;
    this.#configHash = createDeterministicDataHash(config, 'P3 Race vertical config');
    this.#matchSeed = matchSeed;
    this.#localParticipantId = localParticipantId;
    this.#participantIds = Object.freeze(
      config.participantAssignments.map(({ participantId: id }) => id),
    );
    this.#adapter = adapter;
    this.#executionTiming = validateArenaRaceExecutionTimingCandidateV1(
      executionTimingValue,
    );
    this.#mapDefinition = mapContent.mapDefinition;
    this.#routeDefinition = mapContent.routeDefinition;
    if (mapContent.raceFinishCapability.anchorId !== this.#routeDefinition.finishAnchorId) {
      throw new RangeError('P3 Race地图终点能力与路线finish anchor不一致。');
    }
    this.#anchorById = new Map(
      mapContent.routeDefinition.anchors.map((anchorValue) => [anchorValue.id, anchorValue]),
    );
    this.#character = character;
    this.#weapon = weapon;
    this.#weaponActionIds = new Set(weapon.actions.map(({ id }) => id));
    this.#modePolicyResolver = modePolicyResolver;
    this.#modeResultPolicyResolver = modeResultPolicyResolver;
    this.#profile = createCharacterPhysicsProfile(character);
    const initial = adapter.createInitialSafeAnchors();
    const combatAttackerId = this.#participantIds[COMBAT_ATTACKER_INDEX];
    const combatTargetId = this.#participantIds[COMBAT_TARGET_INDEX];
    if (combatAttackerId === undefined || combatTargetId === undefined) {
      throw new RangeError('P3 Race combat ring-out窗口需要至少2名participant。');
    }
    this.#participantState = new Map(initial.map(({ participantId: id, anchorId }) => [id, {
      participantId: id,
      latestSafeAnchorId: anchorId,
      lastSupportSurfaceId: this.#requireAnchor(anchorId).surfaceId,
      respawning: false,
      scheduledReadyTick: null,
      invulnerableTicks: 0,
      hitstunTicks: 0,
      lastHitBy: null,
      lastHitTick: -1,
      fallCount: 0,
      finished: false,
    }] as const));
    this.#evidence = {
      actionStartedCount: 0,
      combatHitCount: 0,
      combatCreditedFallCount: 0,
      physicalFallCount: 0,
      safeAnchorCommitCount: 0,
      respawns: [],
      pendingRespawns: new Map(),
      combat: {
        attackerId: combatAttackerId,
        targetId: combatTargetId,
        actionStartedTicks: [],
        hitTicks: [],
        firstImpulse: null,
        supportSurfaceAtFirstHit: null,
        lastSupportedTick: null,
        firstUnsupportedTick: null,
        creditedFall: null,
        expiredControlFall: null,
      },
      falls: [],
    };

    const cleanupErrors: unknown[] = [];
    try {
      this.#physics = createLightweightPhysicsWorld({ arena: this.#mapDefinition.arena });
      this.#movement = new MovementSystem({
        participantCharacters: this.#participantIds.map((id) => ({
          participantId: id,
          characterDefinition: this.#character,
        })),
        airJumpHorizontalImpulse:
          ARENA_GAMEPLAY_V2_TUNING.character.jump.airHorizontalImpulse,
      });
      this.#engine = createArenaBaselineWeaponRuleEngineCandidateV1(
        this.#weapon,
        this.#participantIds,
        undefined,
        this.#modePolicyResolver === null
          ? undefined
          : Object.freeze({
            contentHash: this.#modePolicyResolver.definitionBundle.contentHash,
            allowsTarget: (sourceParticipantId: string, targetParticipantId: string) => (
              this.#modePolicyResolver!.relationshipBetween(
                sourceParticipantId,
                targetParticipantId,
              ) === 'hostile'
            ),
          }),
      );
      for (const [index, { participantId: id, anchorId }] of initial.entries()) {
        const anchor = this.#requireAnchor(anchorId);
        this.#physics.addCharacter({
          id,
          position: spawnPosition(anchor, this.#profile),
          ...this.#profile,
        });
        const next = initial[(index + 1) % initial.length]!;
        const nextPosition = this.#requireAnchor(next.anchorId).position;
        this.#physics.resetCharacter(id, {
          position: spawnPosition(anchor, this.#profile),
          facing: {
            x: nextPosition.x - anchor.position.x,
            z: nextPosition.z - anchor.position.z,
          },
        });
        const equipmentInstanceId = `p3-race-${id}-weapon`;
        this.#engine.spawnEquipment({
          instanceId: equipmentInstanceId,
          definitionId: this.#weapon.equipment.id,
          spawnId: `p3-race-${id}-weapon-spawn`,
          position: this.#physics.getCharacterState(id).position,
        });
        const decisions = this.#engine.resolveEquipmentPickups({
          participants: this.#participantIds.map((candidateId) => ({
            id: candidateId,
            position: this.#physics!.getCharacterState(candidateId).position,
            eligible: candidateId === id,
          })),
          contestSeed: (matchSeed + index) >>> 0,
        });
        if (
          decisions.length !== 1
          || decisions[0]?.participantId !== id
          || decisions[0].equipmentInstanceId !== equipmentInstanceId
        ) throw new Error(`P3 Race ${id}未通过统一EquipmentSystem拾取已选武器。`);
      }
      this.#feedback = new MatchCoreWeaponFeedbackBundleOwnerV2({
        participantIds: this.#participantIds,
        outcomeWindowTicks: ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1,
        initialObservation: this.#feedbackObservation(0, 0),
      });
    } catch (error) {
      for (const resource of [this.#feedback, this.#engine, this.#movement, this.#physics]) {
        if (resource === null) continue;
        try { resource.destroy(); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
      }
      this.#feedback = null;
      this.#engine = null;
      this.#movement = null;
      this.#physics = null;
      if (cleanupErrors.length > 0) {
        throw new AggregateError([error, ...cleanupErrors], 'P3 Race authority构造与逆序清理失败。');
      }
      throw error;
    }
  }

  #assertLive(): void {
    if (this.#destroyed) throw new Error('P3 Race world authority已销毁。');
    if (this.#failed) throw new Error('P3 Race world authority已失败关闭。');
  }

  #retainCleanupResource(
    label: string,
    resource: RaceRetryableDestroyResourceV1,
  ): void {
    if (this.#pendingCleanupResources.some((entry) => entry.resource === resource)) return;
    this.#pendingCleanupResources.push(Object.freeze({ label, resource }));
  }

  #releaseDetachedResource(
    label: string,
    resource: RaceRetryableDestroyResourceV1 | null,
    errors: Error[],
  ): void {
    if (resource === null) return;
    try {
      resource.destroy();
    } catch (error) {
      this.#retainCleanupResource(label, resource);
      errors.push(safelyWrapThrownError(error, `P3 Race ${label}清理失败。`));
    }
  }

  #releaseCurrentResources(errors: Error[]): void {
    for (const [name, get, clear] of [
      ['WeaponFeedback', () => this.#feedback, () => { this.#feedback = null; }],
      ['RuleEngine', () => this.#engine, () => { this.#engine = null; }],
      ['MovementSystem', () => this.#movement, () => { this.#movement = null; }],
      ['PhysicsWorld', () => this.#physics, () => { this.#physics = null; }],
    ] as const) {
      const resource = get();
      if (resource === null) continue;
      try {
        resource.destroy();
        if (get() === resource) clear();
      } catch (error) {
        errors.push(safelyWrapThrownError(error, `P3 Race ${name}清理失败。`));
      }
    }
  }

  #releasePendingCleanupResources(errors: Error[]): void {
    for (let index = this.#pendingCleanupResources.length - 1; index >= 0; index -= 1) {
      const entry = this.#pendingCleanupResources[index]!;
      try {
        entry.resource.destroy();
        this.#pendingCleanupResources.splice(index, 1);
      } catch (error) {
        errors.push(safelyWrapThrownError(
          error,
          `P3 Race retained ${entry.label}清理失败。`,
        ));
      }
    }
  }

  #resources() {
    this.#assertLive();
    if (this.#physics === null || this.#movement === null || this.#engine === null) {
      throw new Error('P3 Race world authority资源不完整。');
    }
    return Object.freeze({
      physics: this.#physics,
      movement: this.#movement,
      engine: this.#engine,
    });
  }

  #localJumpAvailability(frame: DeepReadonly<MatchReadFrameV3>) {
    const { physics, movement } = this.#resources();
    const authority = this.#participantState.get(this.#localParticipantId)!;
    const phase = frame.worldSnapshot.phase;
    const capabilities = movement.projectCapabilities(this.#localParticipantId, {
      grounded: physics.getCharacterState(this.#localParticipantId).grounded,
      canMove: (phase === 'running' || phase === 'sudden-death')
        && !authority.respawning
        && !authority.finished
        && authority.hitstunTicks === 0,
    });
    return createArenaLocalJumpAvailabilityV1({
      schemaVersion: 1,
      tick: frame.worldSnapshot.tick,
      eventSequence: frame.worldSnapshot.eventSequence,
      participantId: this.#localParticipantId,
      canMove: capabilities.canMove,
      canGroundJump: capabilities.canGroundJump,
      canAirJump: capabilities.canAirJump,
      state: capabilities.canGroundJump || capabilities.canAirJump ? 'ready' : 'blocked',
    });
  }

  #feedbackOwner(): MatchCoreWeaponFeedbackBundleOwnerV2 {
    this.#assertLive();
    if (this.#feedback === null) throw new Error('P3 Race feedback owner不完整。');
    return this.#feedback;
  }

  #feedbackObservation(tick: number, eventSequence: number) {
    const { physics, engine } = this.#resources();
    return Object.freeze({
      tick,
      eventSequence,
      participants: Object.freeze(this.#participantIds.map((participantIdValue) => {
        const participant = this.#participantState.get(participantIdValue)!;
        const physical = physics.getCharacterState(participantIdValue);
        return Object.freeze({
          participantId: participantIdValue,
          active: !participant.respawning && !participant.finished,
          actionDefinitionId: engine.getActionSnapshot(participantIdValue).definitionId,
          supportSurfaceId: physical.supportSurfaceId,
        });
      })),
    });
  }

  #requireAnchor(anchorId: string): KzRouteAnchorV2 {
    const anchorValue = this.#anchorById.get(anchorId);
    if (anchorValue === undefined) {
      throw new RangeError(`Arena Race当前地图未知anchor ${anchorId}。`);
    }
    return anchorValue;
  }

  #actors(tick: number): readonly RuleActor[] {
    const { physics } = this.#resources();
    return Object.freeze(this.#participantIds.map((id) => {
      const authority = this.#participantState.get(id)!;
      const state = physics.getCharacterState(id);
      const active = tick >= this.#executionTiming.preparingTicks
        && !authority.respawning
        && !authority.finished;
      return Object.freeze({
        id,
        canAct: active && authority.hitstunTicks === 0,
        targetable: active && authority.invulnerableTicks === 0,
        position: state.position,
        facing: state.facing,
      });
    }));
  }

  #mutationPorts(
    tick: number,
    feedbackSourceEvents: WeaponFeedbackSourceEventV1[],
    feedbackSequenceStart: number,
  ): RuleMutationPorts {
    const { physics } = this.#resources();
    const pendingFeedbackHitsByTarget = new Map<string, Array<Readonly<{
      readonly attackerId: string;
      readonly targetId: string;
    }>>>();
    return Object.freeze({
      recordHit: (attackerId: string, targetId: string, actionDefinitionId: string) => {
        const target = this.#participantState.get(targetId);
        if (!target || !this.#participantState.has(attackerId)) {
          throw new RangeError('P3 Race Rule命中participant不属于本局。');
        }
        if (this.#modePolicyResolver !== null
          && this.#modePolicyResolver.relationshipBetween(attackerId, targetId) !== 'hostile') {
          throw new RangeError('P3 Race Rule命中违反resolved Relationship Policy。');
        }
        feedbackSourceEvents.push(Object.freeze({
          id: `p3-race-feedback-hit:${this.#matchSeed.toString(16)}:${tick}:${feedbackSequenceStart + feedbackSourceEvents.length}`,
          sequence: feedbackSequenceStart + feedbackSourceEvents.length,
          tick,
          type: 'HitResolved' as const,
          attackerId,
          targetId,
          action: actionDefinitionId,
        }));
        const pendingFeedbackHits = pendingFeedbackHitsByTarget.get(targetId) ?? [];
        pendingFeedbackHits.push(Object.freeze({ attackerId, targetId }));
        pendingFeedbackHitsByTarget.set(targetId, pendingFeedbackHits);
        target.lastHitBy = attackerId;
        target.lastHitTick = tick;
        this.#evidence.combatHitCount += 1;
        const combat = this.#evidence.combat;
        if (attackerId === combat.attackerId && targetId === combat.targetId) {
          if (combat.hitTicks.at(-1) !== tick) combat.hitTicks.push(tick);
          if (combat.hitTicks.length === 1) {
            const targetState = physics.getCharacterState(targetId);
            combat.supportSurfaceAtFirstHit = targetState.supportSurfaceId;
            combat.lastSupportedTick = targetState.supportSurfaceId === null ? null : tick;
          }
        }
      },
      applyHitstun: (participantIdValue: string, ticks: number) => {
        const target = this.#participantState.get(participantIdValue);
        if (!target || !Number.isSafeInteger(ticks) || ticks < 0) {
          throw new RangeError('P3 Race hitstun mutation无效。');
        }
        target.hitstunTicks = Math.max(target.hitstunTicks, ticks);
      },
      applyImpulse: (participantIdValue: string, impulse: RuleImpulse) => {
        const pendingFeedbackHits = pendingFeedbackHitsByTarget.get(participantIdValue);
        const feedbackHit = pendingFeedbackHits?.shift();
        if (feedbackHit !== undefined) {
          if (pendingFeedbackHits!.length === 0) {
            pendingFeedbackHitsByTarget.delete(participantIdValue);
          }
          feedbackSourceEvents.push(Object.freeze({
            id: `p3-race-feedback-knockback:${this.#matchSeed.toString(16)}:${tick}:${feedbackSequenceStart + feedbackSourceEvents.length}`,
            sequence: feedbackSequenceStart + feedbackSourceEvents.length,
            tick,
            type: 'KnockbackApplied' as const,
            attackerId: feedbackHit.attackerId,
            targetId: feedbackHit.targetId,
            impulse: Object.freeze({ ...impulse }),
          }));
        }
        const combat = this.#evidence.combat;
        if (
          participantIdValue === combat.targetId
          && combat.hitTicks.length === 1
          && combat.hitTicks[0] === tick
          && combat.firstImpulse === null
        ) {
          combat.firstImpulse = Object.freeze({ tick, ...impulse });
        }
        physics.applyImpulse(participantIdValue, impulse);
      },
    });
  }

  #participantSnapshot(
    id: string,
    projection: MatchReadFrameV3['worldSnapshot']['modeProjection'],
    tick: number,
    matchEnded: boolean,
  ) {
    const { physics, movement, engine } = this.#resources();
    const physical = physics.getCharacterState(id);
    const authority = this.#participantState.get(id)!;
    const projected = projection.state.kind === 'race'
      ? projection.state.participants.find(({ participantId: candidateId }) => candidateId === id)
      : null;
    if (projected === null || projected === undefined) {
      throw new RangeError(`P3 Race projection缺少participant ${id}。`);
    }
    if (
      projected.safeAnchorId !== authority.latestSafeAnchorId
      || (projected.status === 'respawning') !== authority.respawning
      || projected.respawnReadyTick !== authority.scheduledReadyTick
      || (projected.status === 'finished') !== authority.finished
    ) {
      throw new RangeError(`P3 Race projection与participant authority ${id}不闭合。`);
    }
    const held = engine.getHeldEquipment(id);
    const movementSnapshot = movement.getSnapshot(id);
    const status = projected.status === 'respawning'
      ? matchEnded ? 'eliminated' : 'respawning'
      : 'active';
    return Object.freeze({
      id,
      characterDefinitionId: this.#character.id,
      status,
      lives: 1,
      eliminations: 0,
      deaths: authority.fallCount,
      hitstunTicks: authority.hitstunTicks,
      invulnerableTicks: authority.invulnerableTicks,
      respawnTicks: status === 'eliminated' || projected.respawnReadyTick === null
        ? 0
        : Math.max(0, projected.respawnReadyTick - tick),
      lastHitBy: authority.lastHitBy,
      lastHitTick: authority.lastHitTick,
      action: actionSnapshot(engine, id),
      actionRule: engine.getParticipantActionRule(id),
      movement: Object.freeze({ ...movementSnapshot, grounded: physical.grounded }),
      equipment: held === null ? null : Object.freeze({
        instanceId: held.instanceId,
        runtimeEquipmentDefinitionId: held.definitionId,
        collectionEquipmentDefinitionId: held.definitionId,
        survivalLevel: null,
        cooldownRemainingTicks: held.cooldownRemainingTicks,
      }),
      position: physical.position,
      velocity: physical.velocity,
      facing: physical.facing,
      grounded: physical.grounded,
      supportSurfaceId: physical.supportSurfaceId,
    });
  }

  #equipmentSnapshots() {
    const { engine } = this.#resources();
    return Object.freeze(engine.listEquipmentSnapshots()
      .map((snapshot) => Object.freeze({
        schemaVersion: snapshot.schemaVersion,
        instanceId: snapshot.instanceId,
        runtimeEquipmentDefinitionId: snapshot.definitionId,
        collectionEquipmentDefinitionId: snapshot.definitionId,
        survivalLevel: null,
        spawnId: snapshot.spawnId,
        locationState: snapshot.locationState,
        ownerId: snapshot.ownerId,
        position: snapshot.position,
        lastSafePosition: snapshot.lastSafePosition,
        cooldownRemainingTicks: snapshot.cooldownRemainingTicks,
        revision: snapshot.revision,
      }))
      .sort((left, right) => compareText(left.instanceId, right.instanceId)));
  }

  #localSidecar(tick: number, eventSequence: number) {
    const { engine } = this.#resources();
    const affordance = engine.getActionAffordanceProfile({
      tick,
      participantId: this.#localParticipantId,
      actors: this.#actors(tick),
    }, 'local-context-primary');
    return Object.freeze({
      schemaVersion: 3,
      tick,
      eventSequence,
      participantId: this.#localParticipantId,
      profile: 'local-context-primary',
      primaryActionDefinitionId: affordance.primaryActionDefinitionId,
      channels: Object.freeze({
        primary: Object.freeze({
          kind: affordance.channels.primary.kind,
          actionDefinitionId: affordance.channels.primary.actionDefinitionId,
          lane: affordance.channels.primary.lane,
          source: affordance.channels.primary.source,
          reason: affordance.channels.primary.reason,
        }),
        primaryHold: Object.freeze({
          kind: affordance.channels.primaryHold.kind,
          actionDefinitionId: affordance.channels.primaryHold.actionDefinitionId,
          lane: affordance.channels.primaryHold.lane,
          source: affordance.channels.primaryHold.source,
          reason: affordance.channels.primaryHold.reason,
        }),
      }),
    });
  }

  #createFrame(
    tick: number,
    eventSequence: number,
    projection: MatchReadFrameV3['worldSnapshot']['modeProjection'],
    result: DeepReadonly<ModeResultV3Payload> | null,
  ): DeepReadonly<MatchReadFrameV3> {
    const phase = result !== null
      ? 'ended'
      : projection.preparationRemainingTicks === null ? 'running' : 'preparing';
    return createMatchReadFrameV3Audit({
      schemaVersion: 3,
      worldSnapshot: {
        authoritySchemaVersion: 6,
        physicsBackendVersion: PHYSICS_BACKEND_VERSION,
        configHash: this.#configHash,
        ruleContentHash: this.#config.modePolicyContentHash,
        matchSeed: this.#matchSeed,
        tick,
        activeTick: Math.max(0, tick - this.#executionTiming.preparingTicks - 1),
        phase,
        remainingTicks: Math.max(
          0,
          this.#executionTiming.preparingTicks
            + this.#executionTiming.interactiveLocalHardLimitActiveTicks
            - tick,
        ),
        eventSequence,
        modeDefinitionId: this.#config.modeDefinitionId,
        participants: this.#participantIds.map((id) => this.#participantSnapshot(
          id,
          projection,
          tick,
          result !== null,
        )),
        equipment: this.#equipmentSnapshots(),
        activeSupplyProjection: null,
        modeProjection: projection,
        map: {
          schemaVersion: 1,
          definitionId: this.#mapDefinition.id,
          nextActiveTick: tick + 1,
          revision: 0,
          surfaces: this.#mapDefinition.arena.surfaces.map(
            ({ id }) => ({ id, enabled: true, revision: 0 }),
          ),
          occurrences: [],
        },
        result,
      },
      localActionSidecar: this.#localSidecar(tick, eventSequence),
    }, NO_SUPPLY_AUDIT);
  }

  #pushEvent(
    events: ArenaMatchEventV6[],
    tick: number,
    value: Record<string, unknown>,
  ): ArenaMatchEventV6 {
    const sequence = (this.#readFrame?.worldSnapshot.eventSequence ?? 0) + events.length;
    const event = createArenaMatchEventV6({
      ...value,
      id: eventId(this.#matchSeed, tick, sequence),
      sequence,
      tick,
    });
    events.push(event);
    return event;
  }

  #applyModeCommands(
    commands: readonly unknown[],
    tick: number,
    events: ArenaMatchEventV6[],
    fallRespawnExpectations: ReadonlyMap<string, Readonly<{
      readonly readyTick: number;
      readonly protectionTicks: number;
    }>>,
    phase: 'before-falls' | 'after-falls',
  ): void {
    const { physics, movement, engine } = this.#resources();
    for (const command of commands as readonly RaceModeCommandV1[]) {
      if (command.kind === 'commit-safe-anchor') {
        if (phase !== 'before-falls') continue;
        const participant = this.#participantState.get(command.participantId);
        if (!participant) throw new RangeError('Race safe-anchor command participant未知。');
        this.#requireAnchor(command.anchorId);
        participant.latestSafeAnchorId = command.anchorId;
        this.#evidence.safeAnchorCommitCount += 1;
        this.#pushEvent(events, tick, {
          type: ARENA_MATCH_EVENT_V6.RACE_SAFE_ANCHOR_COMMITTED,
          modeDefinitionId: this.#config.modeDefinitionId,
          participantId: command.participantId,
          anchorId: command.anchorId,
          progressOrdinal: command.progressOrdinal,
        });
      } else if (command.kind === 'schedule-respawn') {
        if (phase !== 'after-falls') continue;
        const participant = this.#participantState.get(command.participantId);
        const expectation = fallRespawnExpectations.get(command.participantId);
        if (!participant || participant.respawning || participant.scheduledReadyTick !== null) {
          throw new Error('Race schedule-respawn ownership无效。');
        }
        const pending = this.#evidence.pendingRespawns.get(command.participantId);
        if (
          expectation === undefined
          || pending !== undefined
          || expectation.readyTick !== command.readyTick
          || expectation.protectionTicks !== command.protectionTicks
        ) {
          throw new RangeError('Race schedule-respawn未与本tick真实掉落闭合。');
        }
        this.#requireAnchor(command.anchorId);
        this.#evidence.pendingRespawns.set(command.participantId, Object.freeze({
          fallTick: tick,
          readyTick: command.readyTick,
          anchorId: command.anchorId,
        }));
        participant.respawning = true;
        participant.scheduledReadyTick = command.readyTick;
        participant.latestSafeAnchorId = command.anchorId;
        this.#pushEvent(events, tick, {
          type: ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWN_SCHEDULED,
          modeDefinitionId: this.#config.modeDefinitionId,
          participantId: command.participantId,
          modeRole: 'competitor',
          slotId: null,
          slotGeneration: 0,
          readyTick: command.readyTick,
          anchorId: command.anchorId,
          reason: 'race-fall',
        });
      } else if (command.kind === 'respawn-participant') {
        if (phase !== 'after-falls') continue;
        const participant = this.#participantState.get(command.participantId);
        const pending = this.#evidence.pendingRespawns.get(command.participantId);
        if (
          !participant
          || !participant.respawning
          || participant.scheduledReadyTick !== tick
          || pending === undefined
          || pending.readyTick !== tick
          || pending.anchorId !== command.anchorId
        ) throw new RangeError('Race respawn必须精确发生在schedule + 180 tick。');
        physics.resetCharacter(command.participantId, {
          position: spawnPosition(this.#requireAnchor(command.anchorId), this.#profile),
        });
        movement.resetParticipant(command.participantId);
        engine.resetParticipant(command.participantId);
        participant.respawning = false;
        participant.scheduledReadyTick = null;
        participant.invulnerableTicks = command.protectionTicks;
        participant.hitstunTicks = 0;
        participant.lastHitBy = null;
        participant.lastHitTick = -1;
        participant.latestSafeAnchorId = command.anchorId;
        participant.lastSupportSurfaceId = this.#requireAnchor(command.anchorId).surfaceId;
        this.#evidence.pendingRespawns.delete(command.participantId);
        this.#evidence.respawns.push(Object.freeze({
          participantId: command.participantId,
          fallTick: pending.fallTick,
          scheduledReadyTick: pending.readyTick,
          respawnTick: tick,
          anchorId: command.anchorId,
        }));
        this.#pushEvent(events, tick, {
          type: ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWNED,
          modeDefinitionId: this.#config.modeDefinitionId,
          participantId: command.participantId,
          modeRole: 'competitor',
          slotId: null,
          slotGeneration: 0,
          anchorId: command.anchorId,
          invulnerableTicks: command.protectionTicks,
        });
      } else if (command.kind === 'record-finish-claim') {
        if (phase !== 'before-falls') continue;
        const participant = this.#participantState.get(command.participantId);
        if (!participant || participant.finished || participant.respawning) {
          throw new Error('Race finish command重复、复位中或未知。');
        }
        participant.finished = true;
        this.#pushEvent(events, tick, {
          type: ARENA_MATCH_EVENT_V6.RACE_FINISH_CLAIMED,
          modeDefinitionId: this.#config.modeDefinitionId,
          participantId: command.participantId,
          finishTick: command.finishTick,
          progressOrdinal: command.progressOrdinal,
        });
      } else if (command.kind === 'end-race') {
        if (phase !== 'after-falls') continue;
        if (command.result.kind !== 'race' || command.result.endedAtTick !== tick) {
          throw new RangeError('P3 Race end-race终局身份漂移。');
        }
        this.#evidence.pendingRespawns.clear();
      } else {
        throw new RangeError(`P3 Race未知mode command ${(command as { kind?: unknown }).kind as string}。`);
      }
    }
  }

  start(context: Readonly<{
    readonly config: ArenaMatchConfigV6;
    readonly expectedMatchSeed: number;
    readonly localParticipantId: string;
  }>): unknown {
    this.#assertLive();
    if (this.#readFrame !== null || this.#paused) throw new Error('P3 Race authority只能启动一次。');
    if (
      context.expectedMatchSeed !== this.#matchSeed
      || context.localParticipantId !== this.#localParticipantId
      || !sameData(context.config, this.#config, 'P3 Race authority start config')
    ) throw new RangeError('P3 Race authority start身份漂移。');
    const projection = Object.freeze({
      schemaVersion: 1 as const,
      modeDefinitionId: this.#config.modeDefinitionId,
      revision: 0,
      preparationRemainingTicks: this.#executionTiming.preparingTicks,
      state: Object.freeze({
        kind: 'race' as const,
        finishGateId: this.#adapter.finishGateId,
        participants: Object.freeze(this.#adapter.createInitialSafeAnchors().map((entry) => Object.freeze({
          participantId: entry.participantId,
          status: 'racing' as const,
          safeAnchorId: entry.anchorId,
          progressOrdinal: 0,
          respawnReadyTick: null,
          finishTick: null,
          rank: null,
        }))),
      }),
    });
    this.#readFrame = this.#createFrame(0, 0, projection, null);
    this.#stateHash = createDeterministicDataHash({
      config: this.#config,
      matchSeed: this.#matchSeed,
      feedbackCheckpoint: this.#feedbackOwner().exportFeedbackCheckpointV1(),
      feedbackDirectionCheckpoint: this.#feedbackOwner().exportDirectionCheckpointV2(),
      worldSnapshot: this.#readFrame.worldSnapshot,
    }, 'P3 Race authority initial state');
    return Object.freeze({
      readFrame: this.#readFrame,
      readFrameAudit: NO_SUPPLY_AUDIT,
      supplyCadence: null,
      localJumpAvailability: this.#localJumpAvailability(this.#readFrame),
      stateHash: this.#stateHash,
    });
  }

  step(request: Readonly<{
    readonly tick: number;
    readonly inputFrames: readonly ArenaInputFrame[];
    readonly resolveMode: (facts: unknown) => ModeMatchResolutionV6;
  }>): unknown {
    this.#assertLive();
    if (this.#paused || this.#readFrame === null || this.#stateHash === null) {
      throw new Error('P3 Race authority当前不可step。');
    }
    if (this.#stepping) throw new Error('P3 Race authority step不可重入。');
    if (request.tick !== this.#readFrame.worldSnapshot.tick) {
      throw new RangeError('P3 Race authority tick与current frame不一致。');
    }
    this.#stepping = true;
    try {
      const { physics, movement, engine } = this.#resources();
      const tick = request.tick;
      const canCompete = tick >= this.#executionTiming.preparingTicks;
      for (const participant of this.#participantState.values()) {
        participant.hitstunTicks = Math.max(0, participant.hitstunTicks - 1);
        participant.invulnerableTicks = Math.max(0, participant.invulnerableTicks - 1);
      }
      engine.advanceTimers();
      movement.prepareTick({
        tick,
        contacts: this.#participantIds.map((id) => ({
          participantId: id,
          grounded: physics.getCharacterState(id).grounded,
        })),
        inputs: request.inputFrames,
        availability: this.#participantIds.map((id) => ({
          participantId: id,
          canMove: canCompete
            && !this.#participantState.get(id)!.respawning
            && !this.#participantState.get(id)!.finished,
        })),
      });
      const actorsBeforePhysics = this.#actors(tick);
      const started = engine.resolveActions({
        tick,
        actors: actorsBeforePhysics,
        inputFrames: request.inputFrames,
        additionalCandidates: this.#participantIds.map((id) => Object.freeze({
          participantId: id,
          candidates: engine.getMovementActionCandidates(movement.getCapabilities(id)),
        })),
      });
      const feedback = this.#feedbackOwner();
      const feedbackSequenceStart = feedback.exportFeedbackCheckpointV1().sourceEventSequence;
      const feedbackSourceEvents: WeaponFeedbackSourceEventV1[] = [];
      for (const event of started.events) {
        if (event.type !== 'ActionCommitmentCancelled') continue;
        feedbackSourceEvents.push(Object.freeze({
          ...event,
          id: `p3-race-feedback-cancel:${this.#matchSeed.toString(16)}:${tick}:${feedbackSequenceStart + feedbackSourceEvents.length}`,
          sequence: feedbackSequenceStart + feedbackSourceEvents.length,
          tick,
          type: 'ActionCommitmentCancelled' as const,
        }));
      }
      for (const start of started.starts) {
        feedbackSourceEvents.push(Object.freeze({
          id: `p3-race-feedback-action:${this.#matchSeed.toString(16)}:${tick}:${feedbackSequenceStart + feedbackSourceEvents.length}`,
          sequence: feedbackSequenceStart + feedbackSourceEvents.length,
          tick,
          type: 'ActionStarted' as const,
          participantId: start.participantId,
          action: start.actionDefinitionId,
          lane: start.lane,
          source: start.source,
        }));
      }
      movement.execute(
        started.movementCommands.map(createMovementCommand),
        { applyBatch: (mutations) => physics.applyCharacterMutationBatch(mutations) },
      );
      const mutationPorts = this.#mutationPorts(
        tick,
        feedbackSourceEvents,
        feedbackSequenceStart,
      );
      engine.commit(started, mutationPorts);
      const active = engine.resolveActiveActions({ actors: this.#actors(tick) });
      engine.commit(active, mutationPorts);
      for (const input of request.inputFrames) {
        const authority = this.#participantState.get(input.participantId)!;
        const intent = canCompete && !authority.respawning && !authority.finished
          ? movement.projectHorizontalIntent(input.participantId, input.moveX, input.moveZ)
          : { x: 0, z: 0 };
        physics.setMovementIntent(input.participantId, intent.x, intent.z);
      }
      physics.step(ARENA_FIXED_DT);
      movement.completeTick({
        tick,
        contacts: this.#participantIds.map((id) => ({
          participantId: id,
          grounded: physics.getCharacterState(id).grounded,
        })),
      });

      const combat = this.#evidence.combat;
      if (combat.hitTicks.length > 0 && combat.creditedFall === null) {
        const targetState = physics.getCharacterState(combat.targetId);
        if (targetState.supportSurfaceId === null) {
          combat.firstUnsupportedTick ??= tick;
        } else {
          combat.lastSupportedTick = tick;
        }
      }

      const fell = new Set<string>();
      const fallRespawnExpectations = new Map<string, Readonly<{
        readonly readyTick: number;
        readonly protectionTicks: number;
      }>>();
      const finishGateCrossed = new Set<string>();
      for (const id of this.#participantIds) {
        const authority = this.#participantState.get(id)!;
        const state = physics.getCharacterState(id);
        if (state.supportSurfaceId !== null) authority.lastSupportSurfaceId = state.supportSurfaceId;
        if (!authority.respawning
          && !authority.finished
          && state.position.y < this.#mapDefinition.arena.killY) {
          const policyFall = this.#modePolicyResolver?.resolveParticipantFall(id, tick) ?? null;
          if (policyFall !== null
            && (policyFall.fallDisposition !== 'schedule-respawn'
              || policyFall.modeRole !== 'competitor'
              || policyFall.respawn === null
              || policyFall.respawn.maximumRespawns !== null
              || policyFall.respawn.anchorPolicy.kind !== 'latest-valid-safe-anchor'
              || policyFall.respawn.anchorPolicy.anchorCapabilityId
                !== this.#adapter.fallbackSafeAnchorId)) {
            throw new RangeError('P3 Race掉落不符合resolved Elimination/Respawn Policy。');
          }
          fell.add(id);
          const readyTick = tick + (policyFall?.respawn?.delayTicks
            ?? RACE_MODE_RESPAWN_DELAY_TICKS_V1);
          fallRespawnExpectations.set(id, Object.freeze({
            readyTick,
            protectionTicks: policyFall?.respawn?.protectionTicks
              ?? ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.protectionTicks,
          }));
        }
        const finishAnchor = this.#requireAnchor(this.#routeDefinition.finishAnchorId);
        if (!authority.finished && !authority.respawning && arrived(state, finishAnchor)) {
          finishGateCrossed.add(id);
        }
      }
      const preparationRemainingTicks = tick <= this.#executionTiming.preparingTicks
        ? this.#executionTiming.preparingTicks - tick
        : null;
      const facts = this.#adapter.createTickFacts({
        tick,
        activeTick: tick < this.#executionTiming.preparingTicks
          ? null
          : tick - this.#executionTiming.preparingTicks,
        preparationRemainingTicks,
        participants: this.#participantIds.map((id) => ({
          participantId: id,
          supportSurfaceId: physics.getCharacterState(id).supportSurfaceId,
          fell: fell.has(id),
          finishGateCrossed: finishGateCrossed.has(id),
        })),
      });
      const resolution = cloneFrozenData(
        request.resolveMode(facts),
        'P3 Race mode resolution',
      );
      exactRecord(resolution, MODE_RESOLUTION_KEYS, 'P3 Race mode resolution');
      if (resolution.tick !== tick) {
        throw new RangeError('P3 Race mode resolution tick漂移。');
      }
      const previousProjectionRevision = this.#readFrame.worldSnapshot.modeProjection.revision;
      const expectedProjectionPreparation = tick < this.#executionTiming.preparingTicks
        ? this.#executionTiming.preparingTicks - tick
        : null;
      if (
        resolution.modeProjection.schemaVersion !== 1
        || resolution.modeProjection.modeDefinitionId !== this.#config.modeDefinitionId
        || resolution.modeProjection.preparationRemainingTicks
          !== expectedProjectionPreparation
        || resolution.modeProjection.state.kind !== 'race'
        || resolution.modeState.kind !== 'race'
        || resolution.modeState.lastProcessedTick !== tick
        || resolution.modeProjection.revision !== resolution.modeState.revision
        || resolution.modeProjection.revision < previousProjectionRevision
        || resolution.modeProjection.revision > previousProjectionRevision + 1
        || resolution.modeProjection.state.finishGateId !== resolution.modeState.finishGateId
        || !sameData(
          resolution.modeProjection.state.participants,
          resolution.modeState.participants,
          'P3 Race projection/modeState participants',
        )
      ) {
        throw new RangeError('P3 Race projection/modeState身份不闭合。');
      }
      const normalizedModeResult = resolution.modeResult === null
        ? null
        : createModeResultV3Payload(resolution.modeResult);
      const modeResult = normalizedModeResult === null
        ? null
        : this.#modeResultPolicyResolver?.assertResult(normalizedModeResult, tick)
          ?? normalizedModeResult;
      const projectedParticipants = resolution.modeProjection.state.participants;
      if (modeResult === null) {
        if (projectedParticipants.some((participant) => (
          participant.status === 'finished'
          || participant.finishTick !== null
          || participant.rank !== null
        ))) {
          throw new RangeError('P3 Race非终局Projection不得携带完赛排名。');
        }
      } else {
        const projectedRankings = projectedParticipants.map((participant) => Object.freeze({
          participantId: participant.participantId,
          rank: participant.rank,
          finishTick: participant.finishTick,
          progressOrdinal: participant.progressOrdinal,
        }));
        const expectedWinnerParticipantIds = projectedRankings
          .filter(({ rank, finishTick }) => rank === 1 && finishTick !== null)
          .map(({ participantId }) => participantId);
        if (
          modeResult.kind !== 'race'
          || modeResult.endedAtTick !== tick
          || !sameData(
            projectedRankings,
            modeResult.rankings,
            'P3 Race projection/result rankings',
          )
          || !sameData(
            expectedWinnerParticipantIds,
            modeResult.winnerParticipantIds,
            'P3 Race projection/result winners',
          )
          || (expectedWinnerParticipantIds.length === 0)
            !== (modeResult.reason === 'no-finisher')
        ) {
          throw new RangeError('P3 Race Projection与终局Result不闭合。');
        }
      }
      const modeCommands = validateRaceModeCommands(resolution.commands);
      const finishClaimedParticipants = new Set(modeCommands.flatMap((command) => (
        command.kind === 'record-finish-claim' ? [command.participantId] : []
      )));
      const committedFalls = new Set([...fell].filter((participantId) => (
        !finishClaimedParticipants.has(participantId)
      )));
      const committedFallRespawnExpectations = new Map(
        [...fallRespawnExpectations].filter(([participantId]) => (
          committedFalls.has(participantId)
        )),
      );
      const projectionByParticipantId = new Map(projectedParticipants.map((participant) => [
        participant.participantId,
        participant,
      ] as const));
      const commandIdentities = new Set<string>();
      const scheduledParticipants = new Set<string>();
      const finishCommandParticipants = new Set<string>();
      for (const command of modeCommands) {
        if (command.kind === 'end-race') continue;
        const commandIdentity = `${command.kind}:${command.participantId}`;
        if (commandIdentities.has(commandIdentity)) {
          throw new RangeError(`P3 Race mode command重复：${commandIdentity}。`);
        }
        commandIdentities.add(commandIdentity);
        const projected = projectionByParticipantId.get(command.participantId);
        if (!projected) throw new RangeError('P3 Race mode command participant不属于Projection。');
        if (command.kind === 'commit-safe-anchor') {
          if (
            projected.safeAnchorId !== command.anchorId
            || projected.progressOrdinal !== command.progressOrdinal
          ) throw new RangeError('P3 Race safe-anchor command与Projection不闭合。');
        } else if (command.kind === 'record-finish-claim') {
          if (
            !finishGateCrossed.has(command.participantId)
            || command.finishTick !== tick
            || projected.status !== 'finished'
            || projected.finishTick !== tick
            || projected.progressOrdinal !== command.progressOrdinal
          ) throw new RangeError('P3 Race finish command与Projection不闭合。');
          finishCommandParticipants.add(command.participantId);
        } else if (command.kind === 'schedule-respawn') {
          const expectation = fallRespawnExpectations.get(command.participantId);
          if (
            expectation === undefined
            || expectation.readyTick !== command.readyTick
            || expectation.protectionTicks !== command.protectionTicks
            || projected.status !== 'respawning'
            || projected.safeAnchorId !== command.anchorId
            || projected.respawnReadyTick !== command.readyTick
          ) throw new RangeError('P3 Race schedule command与掉落/Projection不闭合。');
          scheduledParticipants.add(command.participantId);
        } else {
          const pending = this.#evidence.pendingRespawns.get(command.participantId);
          const resolvedProtectionTicks = pending === undefined
            ? null
            : this.#modePolicyResolver?.resolveParticipantFall(
              command.participantId,
              pending.fallTick,
            )?.respawn?.protectionTicks
              ?? ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.protectionTicks;
          if (
            pending === undefined
            || pending.readyTick !== tick
            || pending.anchorId !== command.anchorId
            || resolvedProtectionTicks !== command.protectionTicks
            || projected.status !== 'racing'
            || projected.safeAnchorId !== command.anchorId
            || projected.respawnReadyTick !== null
          ) throw new RangeError('P3 Race respawn command与pending/Projection不闭合。');
        }
      }
      if (
        finishCommandParticipants.size !== finishGateCrossed.size
        || [...finishGateCrossed].some((participantId) => (
          !finishCommandParticipants.has(participantId)
        ))
      ) {
        throw new RangeError('P3 Race物理终点事实与finish命令集合不闭合。');
      }
      if (
        modeResult === null
          ? scheduledParticipants.size !== fallRespawnExpectations.size
            || [...fallRespawnExpectations.keys()].some((id) => !scheduledParticipants.has(id))
          : scheduledParticipants.size !== 0
      ) {
        throw new RangeError('P3 Race本tick掉落与复活调度集合不闭合。');
      }
      const terminalCommandIndexes = modeCommands.flatMap((command, index) => (
        command.kind === 'end-race' ? [index] : []
      ));
      if (modeResult === null) {
        if (terminalCommandIndexes.length !== 0) {
          throw new RangeError('P3 Race非终局resolution不得携带end-race。');
        }
      } else {
        const terminalIndex = terminalCommandIndexes[0];
        const terminalCommand = terminalIndex === undefined
          ? null
          : modeCommands[terminalIndex];
        if (
          modeResult.kind !== 'race'
          || terminalCommandIndexes.length !== 1
          || terminalIndex !== modeCommands.length - 1
          || terminalCommand?.kind !== 'end-race'
          || !sameData(
            terminalCommand.result,
            modeResult,
            'P3 Race terminal command/result identity',
          )
        ) {
          throw new RangeError('P3 Race终局命令与顶层Result不闭合。');
        }
      }
      const events: ArenaMatchEventV6[] = [];
      if (tick === 0) {
        this.#pushEvent(events, tick, {
          type: ARENA_MATCH_EVENT_V6.MATCH_STARTED,
          modeDefinitionId: this.#config.modeDefinitionId,
          participantIds: this.#participantIds,
        });
      }
      for (const start of started.starts) {
        const held = engine.getHeldEquipment(start.participantId);
        const equipmentAction = start.source === 'equipment-system';
        if (equipmentAction && (held === null || !this.#weaponActionIds.has(
          start.actionDefinitionId,
        ))) {
          throw new Error('P3 Race equipment ActionStarted缺少当前武器身份。');
        }
        if (equipmentAction) this.#evidence.actionStartedCount += 1;
        const startedEvent = this.#pushEvent(events, tick, {
          type: ARENA_MATCH_EVENT_V6.ACTION_STARTED,
          participantId: start.participantId,
          action: start.actionDefinitionId,
          sourceKind: equipmentAction ? 'equipment' : 'base-action',
          equipmentInstanceId: equipmentAction ? held!.instanceId : null,
          runtimeEquipmentDefinitionId: equipmentAction ? held!.definitionId : null,
          collectionEquipmentDefinitionId: equipmentAction ? held!.definitionId : null,
          survivalLevel: null,
        });
        if (equipmentAction && start.participantId === combat.attackerId) {
          combat.actionStartedTicks.push(startedEvent.tick);
        }
      }
      this.#applyModeCommands(
        modeCommands,
        tick,
        events,
        committedFallRespawnExpectations,
        'before-falls',
      );
      for (const id of committedFalls) {
        const participant = this.#participantState.get(id)!;
        participant.fallCount += 1;
        this.#evidence.physicalFallCount += 1;
        const creditedAttackerId = participant.lastHitBy !== null
          && tick - participant.lastHitTick <= ARENA_MATCH_DEFAULTS.lastHitCreditTicks
          ? participant.lastHitBy
          : null;
        if (creditedAttackerId !== null) this.#evidence.combatCreditedFallCount += 1;
        const fallCause = creditedAttackerId === null ? 'movement' : 'credited-hit';
        if (
          creditedAttackerId === null
          || tick - participant.lastHitTick
            <= ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1
        ) {
          feedbackSourceEvents.push(Object.freeze({
            id: `p3-race-feedback-fall:${this.#matchSeed.toString(16)}:${tick}:${feedbackSequenceStart + feedbackSourceEvents.length}`,
            sequence: feedbackSequenceStart + feedbackSourceEvents.length,
            tick,
            type: 'PlayerEliminated' as const,
            participantId: id,
            remainingLives: 0,
            creditedAttackerId,
          }));
        }
        const fallEvent = this.#pushEvent(events, tick, {
          type: ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL,
          modeDefinitionId: this.#config.modeDefinitionId,
          participantId: id,
          modeRole: 'competitor',
          slotId: null,
          slotGeneration: 0,
          fallCause,
          creditedAttackerId,
          supportSurfaceId: participant.lastSupportSurfaceId,
        });
        const fallEvidence = Object.freeze({
          participantId: id,
          tick,
          eventId: fallEvent.id,
          eventSequence: fallEvent.sequence,
          fallCause,
          creditedAttackerId,
          supportSurfaceId: participant.lastSupportSurfaceId,
          lastHitByAtFall: participant.lastHitBy,
          lastHitTickAtFall: participant.lastHitTick,
        }) satisfies ArenaRaceVerticalIntegrationFallEventEvidenceV1;
        if (this.#evidence.falls.length >= MAXIMUM_RECORDED_FALLS) {
          throw new RangeError('P3 Race有界fall evidence容量耗尽。');
        }
        this.#evidence.falls.push(fallEvidence);
        if (
          id === combat.targetId
          && creditedAttackerId === combat.attackerId
          && combat.hitTicks.length > 0
          && combat.creditedFall === null
        ) {
          combat.creditedFall = fallEvidence;
        } else if (
          id === combat.targetId
          && creditedAttackerId === null
          && combat.hitTicks.length >= 2
          && tick - combat.hitTicks[1]! > ARENA_MATCH_DEFAULTS.lastHitCreditTicks
          && combat.expiredControlFall === null
        ) {
          combat.expiredControlFall = fallEvidence;
        }
      }
      this.#applyModeCommands(
        modeCommands,
        tick,
        events,
        committedFallRespawnExpectations,
        'after-falls',
      );
      const feedbackResult = feedback.step({
        sequenceStart: this.#readFrame.worldSnapshot.eventSequence + events.length,
        sourceEvents: Object.freeze(feedbackSourceEvents),
        observation: this.#feedbackObservation(
          tick + 1,
          feedbackSequenceStart + feedbackSourceEvents.length,
        ),
      });
      const feedbackEvents = feedbackResult.feedbackEvents;
      events.push(...feedbackEvents);
      if (modeResult !== null) {
        this.#pushEvent(events, tick, {
          type: ARENA_MATCH_EVENT_V6.MATCH_ENDED,
          modeDefinitionId: this.#config.modeDefinitionId,
          modeResult,
        });
      }
      const nextSequence = this.#readFrame.worldSnapshot.eventSequence + events.length;
      const nextFrame = this.#createFrame(
        tick + 1,
        nextSequence,
        resolution.modeProjection,
        modeResult,
      );
      const nextStateHash = createDeterministicDataHash({
        previousHash: this.#stateHash,
        inputFrames: request.inputFrames,
        events,
        feedbackCheckpoint: feedbackResult.feedbackCheckpoint,
        feedbackDirectionCheckpoint: feedbackResult.directionCheckpoint,
        feedbackDirectionFacts: feedbackResult.directionFacts,
        worldSnapshot: nextFrame.worldSnapshot,
      }, 'P3 Race authority state');
      this.#readFrame = nextFrame;
      this.#stateHash = nextStateHash;
      this.#committedDirectionFacts = feedbackResult.directionFacts;
      return Object.freeze({
        readFrame: nextFrame,
        readFrameAudit: NO_SUPPLY_AUDIT,
        events: Object.freeze(events),
        supplyFacts: Object.freeze([]),
        supplyCadence: null,
        localJumpAvailability: this.#localJumpAvailability(nextFrame),
        stateHash: nextStateHash,
        appliedModeCommandHash: createDeterministicDataHash(
          resolution.commands,
          'P3 Race applied mode commands',
        ),
      });
    } catch (error) {
      this.#failed = true;
      throw error;
    } finally {
      this.#stepping = false;
    }
  }

  exportCheckpoint(current?: Readonly<{
    readonly readFrame: DeepReadonly<MatchReadFrameV3>;
    readonly readFrameAudit: MatchReadFrameV3AuditOptions;
    readonly stateHash: string;
  }>): unknown {
    this.#assertLive();
    if (this.#stepping || this.#readFrame === null || this.#stateHash === null) {
      throw new Error('P3 Race authority尚无可导出checkpoint。');
    }
    if (
      current !== undefined
      && (
        current.stateHash !== this.#stateHash
        || !sameData(current.readFrame, this.#readFrame, 'P3 Race checkpoint current frame')
        || !sameData(current.readFrameAudit, NO_SUPPLY_AUDIT, 'P3 Race checkpoint current audit')
      )
    ) throw new RangeError('P3 Race checkpoint调用方current与authority状态漂移。');
    const { physics, movement, engine } = this.#resources();
    if (typeof engine.exportCheckpointV1 !== 'function') {
      throw new Error('P3 Race RuleEngine不支持完整checkpoint。');
    }
    const core = cloneFrozenData({
      schemaVersion: 2 as const,
      configHash: this.#configHash,
      matchSeed: this.#matchSeed,
      localParticipantId: this.#localParticipantId,
      participantIds: this.#participantIds,
      readFrame: this.#readFrame,
      readFrameAudit: NO_SUPPLY_AUDIT,
      stateHash: this.#stateHash,
      paused: this.#paused,
      participantStates: Object.freeze(this.#participantIds.map((participantIdValue) => (
        Object.freeze({ ...this.#participantState.get(participantIdValue)! })
      ))),
      evidence: Object.freeze({
        actionStartedCount: this.#evidence.actionStartedCount,
        combatHitCount: this.#evidence.combatHitCount,
        combatCreditedFallCount: this.#evidence.combatCreditedFallCount,
        physicalFallCount: this.#evidence.physicalFallCount,
        safeAnchorCommitCount: this.#evidence.safeAnchorCommitCount,
        respawns: Object.freeze([...this.#evidence.respawns]),
        pendingRespawns: Object.freeze([...this.#evidence.pendingRespawns]
          .sort(([left], [right]) => compareText(left, right))
          .map(([participantIdValue, pending]) => Object.freeze({
            participantId: participantIdValue,
            ...pending,
          }))),
        combat: Object.freeze({
          attackerId: this.#evidence.combat.attackerId,
          targetId: this.#evidence.combat.targetId,
          actionStartedTicks: Object.freeze([...this.#evidence.combat.actionStartedTicks]),
          hitTicks: Object.freeze([...this.#evidence.combat.hitTicks]),
          firstImpulse: this.#evidence.combat.firstImpulse,
          supportSurfaceAtFirstHit: this.#evidence.combat.supportSurfaceAtFirstHit,
          lastSupportedTick: this.#evidence.combat.lastSupportedTick,
          firstUnsupportedTick: this.#evidence.combat.firstUnsupportedTick,
          creditedFall: this.#evidence.combat.creditedFall,
          expiredControlFall: this.#evidence.combat.expiredControlFall,
        }),
        falls: Object.freeze([...this.#evidence.falls]),
      }),
      physicsCheckpoint: physics.exportCheckpointV1(),
      movementCheckpoint: movement.exportCheckpointV1(),
      ruleCheckpoint: engine.exportCheckpointV1(),
      feedbackCheckpoint: this.#feedbackOwner().exportFeedbackCheckpointV1(),
      feedbackDirectionCheckpoint: this.#feedbackOwner().exportDirectionCheckpointV2(),
    }, 'P3 Race authority checkpoint core');
    return cloneFrozenData({
      ...core,
      checkpointIdentityHash: createDeterministicDataHash(
        core,
        'P3 Race authority checkpoint identity',
      ),
    }, 'P3 Race authority checkpoint');
  }

  restore(request: Readonly<{
    readonly checkpoint: DeepReadonly<unknown>;
    readonly config: ArenaMatchConfigV6;
    readonly expectedMatchSeed: number;
    readonly localParticipantId: string;
    readonly runtimeState: 'running' | 'paused';
  }>): unknown {
    this.#assertLive();
    if (this.#stepping || this.#readFrame !== null) {
      throw new Error('P3 Race authority只能由未启动的新实例恢复。');
    }
    if (
      request.expectedMatchSeed !== this.#matchSeed
      || request.localParticipantId !== this.#localParticipantId
      || !sameData(request.config, this.#config, 'P3 Race restore config')
    ) throw new RangeError('P3 Race restore调用身份漂移。');
    const checkpoint = normalizeRaceAuthorityCheckpoint(request.checkpoint, {
      configHash: this.#configHash,
      matchSeed: this.#matchSeed,
      localParticipantId: this.#localParticipantId,
      participantIds: this.#participantIds,
      anchorDefinitionIds: new Set(this.#routeDefinition.anchors.map(({ id }) => id)),
      surfaceDefinitionIds: new Set(this.#mapDefinition.arena.surfaces.map(({ id }) => id)),
    });
    if (checkpoint.paused !== (request.runtimeState === 'paused')) {
      throw new RangeError('P3 Race checkpoint paused与runtimeState不一致。');
    }
    const world = checkpoint.readFrame.worldSnapshot;
    if (
      world.configHash !== this.#configHash
      || world.matchSeed !== this.#matchSeed
      || world.physicsBackendVersion !== PHYSICS_BACKEND_VERSION
      || world.modeDefinitionId !== this.#config.modeDefinitionId
      || world.phase !== 'running'
      || world.result !== null
      || world.modeProjection.state.kind !== 'race'
    ) throw new RangeError('P3 Race checkpoint readFrame权威身份漂移。');
    let nextPhysics: CheckpointableLightweightPhysicsWorldV1 | null = null;
    let nextMovement: MovementSystem | null = null;
    let nextEngine: ArenaRuleEngineContract | null = null;
    let nextFeedback: MatchCoreWeaponFeedbackBundleOwnerV2 | null = null;
    let adopted = false;
    this.#stepping = true;
    try {
      nextPhysics = createLightweightPhysicsWorldFromCheckpointV1(checkpoint.physicsCheckpoint);
      nextMovement = MovementSystem.restoreFromCheckpointV1(checkpoint.movementCheckpoint);
      nextEngine = createArenaBaselineWeaponRuleEngineCandidateV1(
        this.#weapon,
        this.#participantIds,
        checkpoint.ruleCheckpoint,
        this.#modePolicyResolver === null
          ? undefined
          : Object.freeze({
            contentHash: this.#modePolicyResolver.definitionBundle.contentHash,
            allowsTarget: (sourceParticipantId: string, targetParticipantId: string) => (
              this.#modePolicyResolver!.relationshipBetween(
                sourceParticipantId,
                targetParticipantId,
              ) === 'hostile'
            ),
          }),
      );
      nextFeedback = MatchCoreWeaponFeedbackBundleOwnerV2.restoreFromCheckpointsV2({
        feedbackCheckpoint: checkpoint.feedbackCheckpoint,
        directionCheckpoint: checkpoint.feedbackDirectionCheckpoint,
      });
      if (
        typeof nextEngine.exportCheckpointV1 !== 'function'
        || !sameData(
          nextPhysics.exportCheckpointV1(),
          checkpoint.physicsCheckpoint,
          'P3 Race restored physics checkpoint',
        )
        || !sameData(
          nextMovement.exportCheckpointV1(),
          checkpoint.movementCheckpoint,
          'P3 Race restored movement checkpoint',
        )
        || !sameData(
          nextEngine.exportCheckpointV1(),
          checkpoint.ruleCheckpoint,
          'P3 Race restored rule checkpoint',
        )
        || !sameData(
          nextFeedback.exportFeedbackCheckpointV1(),
          checkpoint.feedbackCheckpoint,
          'P3 Race restored feedback checkpoint',
        )
        || !sameData(
          nextFeedback.exportDirectionCheckpointV2(),
          checkpoint.feedbackDirectionCheckpoint,
          'P3 Race restored feedback direction checkpoint',
        )
      ) throw new RangeError('P3 Race恢复后的子系统checkpoint未闭合。');
      const cleanupErrors: Error[] = [];
      this.#releaseCurrentResources(cleanupErrors);
      if (cleanupErrors.length > 0) {
        throw new AggregateError(cleanupErrors, 'P3 Race restore旧资源清理失败。');
      }
      this.#physics = nextPhysics;
      this.#movement = nextMovement;
      this.#engine = nextEngine;
      this.#feedback = nextFeedback;
      nextPhysics = null;
      nextMovement = null;
      nextEngine = null;
      nextFeedback = null;
      adopted = true;
      this.#participantState.clear();
      for (const state of checkpoint.participantStates) {
        this.#participantState.set(state.participantId, { ...state });
      }
      const evidence = checkpoint.evidence;
      this.#evidence.actionStartedCount = raceCheckpointInteger(
        evidence.actionStartedCount,
        0,
        'P3 Race checkpoint evidence.actionStartedCount',
      );
      this.#evidence.combatHitCount = raceCheckpointInteger(evidence.combatHitCount, 0, 'evidence.combatHitCount');
      this.#evidence.combatCreditedFallCount = raceCheckpointInteger(evidence.combatCreditedFallCount, 0, 'evidence.combatCreditedFallCount');
      this.#evidence.physicalFallCount = raceCheckpointInteger(evidence.physicalFallCount, 0, 'evidence.physicalFallCount');
      this.#evidence.safeAnchorCommitCount = raceCheckpointInteger(evidence.safeAnchorCommitCount, 0, 'evidence.safeAnchorCommitCount');
      this.#evidence.respawns.splice(0, this.#evidence.respawns.length, ...evidence.respawns);
      this.#evidence.pendingRespawns.clear();
      for (const pending of evidence.pendingRespawns) {
        this.#evidence.pendingRespawns.set(pending.participantId, Object.freeze({
          fallTick: pending.fallTick,
          readyTick: pending.readyTick,
          anchorId: pending.anchorId,
        }));
      }
      const combat = this.#evidence.combat;
      if (
        evidence.combat.attackerId !== combat.attackerId
        || evidence.combat.targetId !== combat.targetId
      ) throw new RangeError('P3 Race checkpoint combat participant身份漂移。');
      combat.actionStartedTicks.splice(0, combat.actionStartedTicks.length, ...evidence.combat.actionStartedTicks);
      combat.hitTicks.splice(0, combat.hitTicks.length, ...evidence.combat.hitTicks);
      combat.firstImpulse = evidence.combat.firstImpulse;
      combat.supportSurfaceAtFirstHit = evidence.combat.supportSurfaceAtFirstHit;
      combat.lastSupportedTick = evidence.combat.lastSupportedTick;
      combat.firstUnsupportedTick = evidence.combat.firstUnsupportedTick;
      combat.creditedFall = evidence.combat.creditedFall;
      combat.expiredControlFall = evidence.combat.expiredControlFall;
      this.#evidence.falls.splice(0, this.#evidence.falls.length, ...evidence.falls);
      this.#readFrame = checkpoint.readFrame;
      this.#stateHash = checkpoint.stateHash;
      this.#committedDirectionFacts = Object.freeze([]);
      this.#paused = checkpoint.paused;
      const rebuilt = this.#createFrame(
        world.tick,
        world.eventSequence,
        world.modeProjection,
        world.result,
      );
      if (!sameData(rebuilt, checkpoint.readFrame, 'P3 Race restored read frame')) {
        throw new RangeError('P3 Race restore公开帧与完整世界不闭合。');
      }
      return Object.freeze({
        readFrame: this.#readFrame,
        readFrameAudit: NO_SUPPLY_AUDIT,
        supplyCadence: null,
        localJumpAvailability: this.#localJumpAvailability(this.#readFrame),
        stateHash: this.#stateHash,
      });
    } catch (error) {
      const cleanupErrors: Error[] = [];
      if (adopted) {
        this.#releaseCurrentResources(cleanupErrors);
        if (cleanupErrors.length === 0) {
          this.#readFrame = null;
          this.#stateHash = null;
        }
      } else {
        this.#releaseDetachedResource('restore WeaponFeedback', nextFeedback, cleanupErrors);
        this.#releaseDetachedResource('restore RuleEngine', nextEngine, cleanupErrors);
        this.#releaseDetachedResource('restore MovementSystem', nextMovement, cleanupErrors);
        this.#releaseDetachedResource('restore PhysicsWorld', nextPhysics, cleanupErrors);
      }
      this.#failed = true;
      if (cleanupErrors.length > 0) {
        throw new AggregateError([error, ...cleanupErrors], 'P3 Race restore及资源清理失败。');
      }
      throw error;
    } finally {
      this.#stepping = false;
    }
  }

  pause(): unknown {
    this.#assertLive();
    if (this.#paused || this.#stepping || this.#readFrame === null) {
      throw new Error('P3 Race authority当前不能pause。');
    }
    this.#paused = true;
    return undefined;
  }

  resume(): unknown {
    this.#assertLive();
    if (!this.#paused || this.#stepping || this.#readFrame === null) {
      throw new Error('P3 Race authority当前不能resume。');
    }
    this.#paused = false;
    return undefined;
  }

  readCommittedWeaponFeedbackDirectionFactsV2():
  readonly ArenaWeaponFeedbackDirectionFactV2[] {
    this.#assertLive();
    return this.#committedDirectionFacts;
  }

  getEvidenceSnapshot() {
    return Object.freeze({
      actionStartedCount: this.#evidence.actionStartedCount,
      combatHitCount: this.#evidence.combatHitCount,
      combatCreditedFallCount: this.#evidence.combatCreditedFallCount,
      physicalFallCount: this.#evidence.physicalFallCount,
      safeAnchorCommitCount: this.#evidence.safeAnchorCommitCount,
      respawns: Object.freeze([...this.#evidence.respawns]),
      combat: Object.freeze({
        attackerId: this.#evidence.combat.attackerId,
        targetId: this.#evidence.combat.targetId,
        actionStartedTicks: Object.freeze([...this.#evidence.combat.actionStartedTicks]),
        hitTicks: Object.freeze([...this.#evidence.combat.hitTicks]),
        firstImpulse: this.#evidence.combat.firstImpulse,
        supportSurfaceAtFirstHit: this.#evidence.combat.supportSurfaceAtFirstHit,
        lastSupportedTick: this.#evidence.combat.lastSupportedTick,
        firstUnsupportedTick: this.#evidence.combat.firstUnsupportedTick,
        creditedFall: this.#evidence.combat.creditedFall,
        expiredControlFall: this.#evidence.combat.expiredControlFall,
      }),
      falls: Object.freeze([...this.#evidence.falls]),
      pendingRespawnCount: this.#evidence.pendingRespawns.size,
      retainedResourceCount: [this.#feedback, this.#engine, this.#movement, this.#physics]
        .filter((resource) => resource !== null).length + this.#pendingCleanupResources.length,
    });
  }

  destroy(): unknown {
    if (this.#destroyed) return;
    if (this.#stepping) throw new Error('P3 Race authority destroy不可在step中重入。');
    const errors: Error[] = [];
    this.#releaseCurrentResources(errors);
    this.#releasePendingCleanupResources(errors);
    if (errors.length > 0) {
      this.#failed = true;
      throw new AggregateError(errors, 'P3 Race authority清理不完整。');
    }
    this.#participantState.clear();
    this.#evidence.pendingRespawns.clear();
    this.#readFrame = null;
    this.#stateHash = null;
    this.#committedDirectionFacts = Object.freeze([]);
    this.#destroyed = true;
  }
}

function normalizeScenarioOptions(
  value: unknown,
): ArenaRaceVerticalIntegrationScenarioOptionsV1 {
  const source = cloneFrozenData(value, 'P3 Race vertical scenario options');
  exactRecord(source, SCENARIO_OPTION_KEYS, 'P3 Race vertical scenario options');
  const participantCount = assertIntegerAtLeast(
    source.participantCount,
    2,
    'P3 Race participantCount',
  );
  if (participantCount > 4) throw new RangeError('P3 Race participantCount只能是2/3/4。');
  const matchSeed = assertIntegerAtLeast(source.matchSeed, 0, 'P3 Race matchSeed');
  if (matchSeed > 0xffff_ffff) throw new RangeError('P3 Race matchSeed必须是uint32。');
  return Object.freeze({
    participantCount: participantCount as 2 | 3 | 4,
    matchSeed,
  });
}

function scriptState(
  config: ArenaMatchConfigV6,
  adapter: KzRaceModeMapAdapterV1,
): RaceScenarioScriptStateV1 {
  const initial = adapter.createInitialSafeAnchors();
  const participants = config.participantAssignments.map(({ participantId: id }) => {
    const anchorId = initial.find(({ participantId: candidateId }) => candidateId === id)!.anchorId;
    return {
      participantId: id,
      path: participantPath(anchorId),
      targetIndex: 1,
      airborneTicks: 0,
      routeMistakeTicksRemaining: 0,
      routeMistakeTriggered: false,
    };
  });
  const attackerId = participants[COMBAT_ATTACKER_INDEX]?.participantId;
  const targetId = participants[COMBAT_TARGET_INDEX]?.participantId;
  const routeMistakeParticipantId = participants.at(-1)?.participantId;
  if (attackerId === undefined || targetId === undefined || routeMistakeParticipantId === undefined) {
    throw new RangeError('P3 Race脚本至少需要2名participant。');
  }
  return {
    participants,
    attackerId,
    targetId,
    routeMistakeParticipantId,
    phase: 'preparing',
    phaseStartedTick: 0,
    phaseOrder: ['preparing'],
    combatJumpInputTick: null,
    combatPrimaryInputTick: null,
    expiredPrimaryInputTick: null,
    routeMistakeStartedTick: null,
    routeMistakeFallTick: null,
    routeMistakeRespawnObserved: false,
  };
}

function advanceScriptTarget(
  script: ScriptParticipantState,
  participant: MatchReadFrameV3['worldSnapshot']['participants'][number],
  safeAnchorId: string | null,
): void {
  if (safeAnchorId !== null) {
    const safeIndex = script.path.findIndex(({ id }) => id === safeAnchorId);
    if (safeIndex >= 0 && safeIndex + 1 > script.targetIndex) script.targetIndex = safeIndex + 1;
  }
  const target = script.path[script.targetIndex];
  if (target !== undefined && arrived(participant, target)) script.targetIndex += 1;
}

function transitionScriptPhase(
  script: RaceScenarioScriptStateV1,
  phase: RaceScriptPhaseV1,
  tick: number,
): void {
  if (script.phase === phase) return;
  script.phase = phase;
  script.phaseStartedTick = tick;
  script.phaseOrder.push(phase);
}

function pointDirection(
  participant: MatchReadFrameV3['worldSnapshot']['participants'][number],
  target: Readonly<{ x: number; z: number }>,
): Readonly<{ moveX: number; moveZ: number }> {
  const dx = target.x - participant.position.x;
  const dz = target.z - participant.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= COMBAT_STAGE_TOLERANCE) return Object.freeze({ moveX: 0, moveZ: 0 });
  return Object.freeze({ moveX: dx / distance, moveZ: dz / distance });
}

function reachedCombatPoint(
  participant: MatchReadFrameV3['worldSnapshot']['participants'][number],
  target: Readonly<{ x: number; z: number }>,
): boolean {
  return participant.grounded
    && participant.supportSurfaceId === COMBAT_RING_OUT_SURFACE_ID
    && Math.hypot(
      participant.position.x - target.x,
      participant.position.z - target.z,
    ) <= COMBAT_STAGE_TOLERANCE;
}

function requireFrameParticipant(
  frame: DeepReadonly<MatchReadFrameV3>,
  id: string,
) {
  const participant = frame.worldSnapshot.participants.find(({ id: candidateId }) => (
    candidateId === id
  ));
  if (participant === undefined) throw new RangeError(`P3 Race脚本frame缺少participant ${id}。`);
  return participant;
}

function requireRaceProjectionParticipant(
  frame: DeepReadonly<MatchReadFrameV3>,
  id: string,
) {
  const race = frame.worldSnapshot.modeProjection.state;
  if (race.kind !== 'race') throw new Error('P3 Race脚本收到非Race projection。');
  const participant = race.participants.find(({ participantId }) => participantId === id);
  if (participant === undefined) throw new RangeError(`P3 Race脚本projection缺少participant ${id}。`);
  return participant;
}

function advanceScenarioScriptPhase(
  frame: DeepReadonly<MatchReadFrameV3>,
  script: RaceScenarioScriptStateV1,
): void {
  const tick = frame.worldSnapshot.tick;
  if (script.phase === 'preparing' && tick >= RACE_MODE_PREPARING_TICKS_V1) {
    transitionScriptPhase(script, 'combat-stage', tick);
  }
  const attacker = requireFrameParticipant(frame, script.attackerId);
  const target = requireFrameParticipant(frame, script.targetId);
  const targetProjection = requireRaceProjectionParticipant(frame, script.targetId);
  if (
    script.phase === 'combat-stage'
    && reachedCombatPoint(attacker, COMBAT_STAGE_ATTACKER)
    && reachedCombatPoint(target, COMBAT_STAGE_TARGET)
  ) {
    transitionScriptPhase(script, 'combat-face', tick);
  } else if (script.phase === 'combat-face' && tick > script.phaseStartedTick) {
    transitionScriptPhase(script, 'combat-settle', tick);
  } else if (
    script.phase === 'combat-settle'
    && tick - script.phaseStartedTick >= COMBAT_SETTLE_TICKS
  ) {
    transitionScriptPhase(script, 'combat-attack', tick);
  } else if (
    script.phase === 'combat-await-fall'
    && targetProjection.status === 'respawning'
  ) {
    transitionScriptPhase(script, 'combat-await-respawn', tick);
  } else if (
    script.phase === 'combat-await-respawn'
    && targetProjection.status === 'racing'
  ) {
    transitionScriptPhase(script, 'expired-control-stage', tick);
  } else if (
    script.phase === 'expired-control-stage'
    && reachedCombatPoint(attacker, EXPIRED_CONTROL_STAGE_ATTACKER)
    && reachedCombatPoint(target, EXPIRED_CONTROL_STAGE_TARGET)
    && target.invulnerableTicks === 0
  ) {
    transitionScriptPhase(script, 'expired-control-face', tick);
  } else if (script.phase === 'expired-control-face' && tick > script.phaseStartedTick) {
    transitionScriptPhase(script, 'expired-control-settle', tick);
  } else if (
    script.phase === 'expired-control-settle'
    && tick - script.phaseStartedTick >= COMBAT_SETTLE_TICKS
  ) {
    transitionScriptPhase(script, 'expired-control-attack', tick);
  } else if (
    script.phase === 'expired-control-await-hit'
    && script.expiredPrimaryInputTick !== null
    && target.lastHitBy === script.attackerId
    && target.lastHitTick >= script.expiredPrimaryInputTick
  ) {
    transitionScriptPhase(script, 'expired-control-hold', tick);
  } else if (
    script.phase === 'expired-control-hold'
    && target.lastHitBy === script.attackerId
    && tick - target.lastHitTick > ARENA_MATCH_DEFAULTS.lastHitCreditTicks
    && target.grounded
    && target.supportSurfaceId === COMBAT_RING_OUT_SURFACE_ID
  ) {
    transitionScriptPhase(script, 'expired-control-drive-off', tick);
  } else if (
    script.phase === 'expired-control-drive-off'
    && targetProjection.status === 'respawning'
  ) {
    transitionScriptPhase(script, 'expired-control-await-respawn', tick);
  } else if (
    script.phase === 'expired-control-await-respawn'
    && targetProjection.status === 'racing'
  ) {
    transitionScriptPhase(script, 'route', tick);
  }
}

function createInput(
  tick: number,
  participantIdValue: string,
  movement: Readonly<{ moveX: number; moveZ: number }> = { moveX: 0, moveZ: 0 },
  options: Readonly<{
    jumpPressed?: boolean;
    primaryPressed?: boolean;
    primaryHeld?: boolean;
  }> = {},
): ArenaInputFrame {
  const jumpPressed = options.jumpPressed === true;
  const primaryPressed = options.primaryPressed === true;
  const primaryHeld = options.primaryHeld ?? primaryPressed;
  return Object.freeze({
    tick,
    participantId: participantIdValue,
    moveX: movement.moveX,
    moveZ: movement.moveZ,
    primaryPressed,
    primaryHeld,
    jumpPressed,
    jumpHeld: jumpPressed,
    slamPressed: false,
  });
}

function createRouteInput(
  frame: DeepReadonly<MatchReadFrameV3>,
  script: RaceScenarioScriptStateV1,
  participantScript: ScriptParticipantState,
  index: number,
): ArenaInputFrame {
  const tick = frame.worldSnapshot.tick;
  const participant = requireFrameParticipant(frame, participantScript.participantId);
  const projected = requireRaceProjectionParticipant(frame, participantScript.participantId);
  advanceScriptTarget(participantScript, participant, projected.safeAnchorId);
  if (participant.grounded) participantScript.airborneTicks = 0;
  else participantScript.airborneTicks += 1;
  const target = participantScript.path[participantScript.targetIndex];
  const waitingForRespawn = projected.status === 'respawning';
  const waitingAtFinish = target?.id === ROUTE.finishAnchorId
    && !script.routeMistakeRespawnObserved;
  const canDrive = !waitingForRespawn && !waitingAtFinish && target !== undefined;
  if (
    index === script.participants.length - 1
    && !participantScript.routeMistakeTriggered
    && participant.supportSurfaceId === ROUTE_MISTAKE_SURFACE_ID
  ) {
    participantScript.routeMistakeTriggered = true;
    participantScript.routeMistakeTicksRemaining = ROUTE_MISTAKE_TICKS;
    script.routeMistakeStartedTick = tick;
  }
  const forcingMistake = participantScript.routeMistakeTicksRemaining > 0;
  if (forcingMistake) participantScript.routeMistakeTicksRemaining -= 1;
  const movement = canDrive
    ? forcingMistake ? { moveX: 0, moveZ: 1 } : directionTo(participant, target!)
    : { moveX: 0, moveZ: 0 };
  const jumpPressed = canDrive
    && !forcingMistake
    && ((participant.grounded && participant.supportSurfaceId !== target!.surfaceId)
      || (!participant.grounded
        && participantScript.airborneTicks === AIR_JUMP_REPRESS_AFTER_TICKS));
  return createInput(tick, participantScript.participantId, movement, { jumpPressed });
}

function createScriptedInputs(
  frame: DeepReadonly<MatchReadFrameV3>,
  script: RaceScenarioScriptStateV1,
): readonly ArenaInputFrame[] {
  const tick = frame.worldSnapshot.tick;
  advanceScenarioScriptPhase(frame, script);
  const phase = script.phase;
  const frames = script.participants.map((participantScript, index) => {
    const participant = requireFrameParticipant(frame, participantScript.participantId);
    const isAttacker = participantScript.participantId === script.attackerId;
    const isTarget = participantScript.participantId === script.targetId;
    if (phase === 'preparing') return createInput(tick, participantScript.participantId);
    if (phase === 'combat-stage') {
      const jumpPressed = isAttacker
        && script.combatJumpInputTick === null
        && participant.grounded;
      if (jumpPressed) script.combatJumpInputTick = tick;
      const movement = isAttacker
        ? pointDirection(participant, COMBAT_STAGE_ATTACKER)
        : isTarget
          ? pointDirection(participant, COMBAT_STAGE_TARGET)
          : { moveX: 0, moveZ: 0 };
      return createInput(tick, participantScript.participantId, movement, { jumpPressed });
    }
    if (phase === 'combat-face' && isAttacker) {
      return createInput(tick, participantScript.participantId, { moveX: 0, moveZ: -1 });
    }
    if (phase === 'combat-attack' && isAttacker) {
      script.combatPrimaryInputTick = tick;
      return createInput(
        tick,
        participantScript.participantId,
        { moveX: 0, moveZ: -1 },
        { primaryPressed: true },
      );
    }
    if (phase === 'expired-control-stage') {
      const movement = isAttacker
        ? pointDirection(participant, EXPIRED_CONTROL_STAGE_ATTACKER)
        : isTarget
          ? pointDirection(participant, EXPIRED_CONTROL_STAGE_TARGET)
          : { moveX: 0, moveZ: 0 };
      return createInput(tick, participantScript.participantId, movement);
    }
    if (phase === 'expired-control-face' && isAttacker) {
      return createInput(tick, participantScript.participantId, { moveX: 1, moveZ: 0 });
    }
    if (phase === 'expired-control-attack' && isAttacker) {
      script.expiredPrimaryInputTick = tick;
      return createInput(
        tick,
        participantScript.participantId,
        { moveX: 1, moveZ: 0 },
        { primaryPressed: true },
      );
    }
    if (phase === 'expired-control-drive-off' && isTarget) {
      return createInput(tick, participantScript.participantId, { moveX: 0, moveZ: -1 });
    }
    if (phase === 'route' || phase === 'route-mistake-await-respawn') {
      return createRouteInput(frame, script, participantScript, index);
    }
    return createInput(tick, participantScript.participantId);
  });
  if (phase === 'combat-attack') {
    transitionScriptPhase(script, 'combat-await-fall', tick);
  } else if (phase === 'expired-control-attack') {
    transitionScriptPhase(script, 'expired-control-await-hit', tick);
  }
  return Object.freeze(frames);
}

export const ARENA_RACE_AUTHORITATIVE_RUNTIME_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1,
  status: 'production-unreachable',
  hardGate: false,
  replaySchemaVersion: 6,
  ruleSchemaVersion: 6,
  physicsBackendVersion: PHYSICS_BACKEND_VERSION,
  modeDefinitionId: MODE_DEFINITION_ID,
  mapDefinitionId: MAP.id,
  mapDefinitionIds: Object.freeze(PLAYABLE_RACE_MAPS.map(
    ({ mapDefinition }) => mapDefinition.id,
  )),
  characterDefinitionId: CHARACTER.id,
  playableCharacterDefinitionIds: ARENA_V2_SIX_CHARACTER_DEFINITION_IDS_CANDIDATE_V1,
  equipmentDefinitionIds: Object.freeze(
    ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map(({ equipment }) => equipment.id),
  ),
  supportedParticipantCounts: PARTICIPANT_COUNTS,
  respawnTuningContentHash: ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.contentHash,
  respawnProtectionTicks: ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.protectionTicks,
  respawnFallbackAnchorCapabilityId:
    ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.anchorCapabilityId,
  respawnProtectionBalanceApprovalStatus: 'not-run',
  resolvedParticipantPolicyRuntimeBinding: 'optional-explicit-registry-only',
  resolvedRespawnPolicyRuntimeBinding: 'optional-explicit-registry-only',
  resolvedEliminationPolicyRuntimeBinding: 'schedule-respawn-asserted-on-authority-fall',
  resolvedRelationshipPolicyRuntimeBinding: 'hostile-target-matrix-consumed-by-rule-engine',
  resolvedObjectiveAndResultPolicyRuntimeBinding: 'existing-semantics-identity-bound',
  explicitTimelinePolicyRuntimeMirrorCapabilityWritten: true,
  explicitTimelinePolicyRuntimeMirrorWired: false,
  unresolvedTimelineHardLimitStillLocal: true,
  interactiveExecutionTimingPurpose:
    ARENA_RACE_EXECUTION_PURPOSE_V1.INTERACTIVE_PRODUCT_CANDIDATE,
  interactiveLocalHardLimitActiveTicks:
    ARENA_RACE_UNRESOLVED_INTERACTIVE_LOCAL_HARD_LIMIT_ACTIVE_TICKS_CANDIDATE_V1,
  interactiveLocalHardLimitSource:
    'preserved-unapproved-local-runtime-candidate-not-verification-budget',
  verificationExecutionTimingSeparatedFromInteractiveRuntime: true,
  executionTimingIdentityBoundToConfigAndModeFixture: true,
  verificationScenarioWatchdogControlsInteractiveFixture: false,
  ownsBotRouteControllers: true,
  usesOnlyWorldSnapshotForBotInput: true,
  restoreOldResourcesCommitPerResource: true,
  restoreFailureRetainsCleanupOwnership: true,
  restorePostAdoptionFailureFailsClosed: true,
  weaponFeedbackCheckpointCapability:
    ARENA_THREE_MODE_WEAPON_FEEDBACK_CHECKPOINT_CAPABILITY_V1,
  weaponFeedbackDirectionCheckpointCapability:
    ARENA_THREE_MODE_WEAPON_FEEDBACK_DIRECTION_CAPABILITY_V2,
  multiTargetFeedbackUsesPerTargetFifo: true,
  validationStatus: 'not-run',
  defaultRegistryWired: false,
  defaultCompositionWired: false,
  defaultEntryWired: false,
} as const);

export interface ArenaRaceAuthoritativeRuntimeCandidateV1Request {
  readonly modeDefinitionId: string;
  readonly matchSeed: number;
  readonly selection: unknown;
  readonly finalAssignment: unknown;
  readonly localParticipantId: string;
  readonly runtimePolicyBinding?: unknown;
}

interface RaceAuthoritativeBotStateV1 {
  readonly participantId: string;
  readonly path: readonly KzRouteAnchorV2[];
}

function raceAuthoritativeBotInput(
  frame: DeepReadonly<MatchReadFrameV3>,
  state: RaceAuthoritativeBotStateV1,
): ArenaInputFrame {
  const tick = frame.worldSnapshot.tick;
  const participant = requireFrameParticipant(frame, state.participantId);
  const projected = requireRaceProjectionParticipant(frame, state.participantId);
  let targetIndex = 1;
  if (projected.safeAnchorId !== null) {
    const safeIndex = state.path.findIndex(({ id }) => id === projected.safeAnchorId);
    if (safeIndex >= 0) targetIndex = safeIndex + 1;
  }
  const target = state.path[targetIndex];
  if (target !== undefined && arrived(participant, target)) targetIndex += 1;
  const nextTarget = state.path[targetIndex];
  const canControl = isBotParticipantControlAvailableV1({
    schemaVersion: 1,
    participantActive: participant.status === 'active',
    hitstunTicks: participant.hitstunTicks,
  });
  if (
    projected.status !== 'racing'
    || !canControl
    || nextTarget === undefined
  ) {
    return createInput(tick, state.participantId);
  }
  const opponents = frame.worldSnapshot.participants
    .filter(({ id, status, invulnerableTicks }) => (
      id !== state.participantId
      && status === 'active'
      && invulnerableTicks === 0
    ))
    .map((candidate) => Object.freeze({
      candidate,
      distance: Math.hypot(
        candidate.position.x - participant.position.x,
        candidate.position.z - participant.position.z,
      ),
    }))
    .sort((left, right) => left.distance - right.distance
      || compareText(left.candidate.id, right.candidate.id));
  const nearest = opponents[0];
  const actionRule = assertPlainRecord(
    participant.actionRule,
    `P3 Race bot ${state.participantId} actionRule`,
  );
  const range = typeof actionRule.range === 'number'
    ? actionRule.range
    : 0;
  const actionReady = isBotPrimaryActionReadyV1({
    schemaVersion: 1,
    actionIdle: participant.action.phase === 'idle',
    cooldownRemainingTicks: participant.equipment?.cooldownRemainingTicks ?? null,
  });
  const canAttack = nearest !== undefined
    && nearest.distance <= Math.max(0, range * 0.9)
    && actionReady
    && (tick + state.participantId.length) % 12 === 0;
  const primaryInput = createBotPrimaryInputPacingV1({
    schemaVersion: 1,
    actionReady,
    actionInProgress: participant.action.phase !== 'idle',
    commitment: createBotPrimaryCommitmentObservationV1(
      participant.action.commitment === undefined ? null : {
        status: participant.action.commitment.status,
        chargeTicks: participant.action.commitment.chargeTicks,
      },
    ),
    minimumCommitmentTicks: typeof actionRule.minimumCommitmentTicks === 'number'
      ? actionRule.minimumCommitmentTicks
      : 0,
    wantsToStart: canAttack,
  });
  const chargingCommitment = participant.action.commitment?.status === 'charging';
  const movement = chargingCommitment
    ? nearest === undefined
      ? Object.freeze({ moveX: 0, moveZ: 0 })
      : directionTo(participant, Object.freeze({
          ...nextTarget,
          position: nearest.candidate.position,
        }))
    : canAttack && nearest !== undefined
      ? directionTo(participant, Object.freeze({
          ...nextTarget,
          position: nearest.candidate.position,
        }))
      : directionTo(participant, nextTarget);
  const jumpPressed = !canAttack
    && !chargingCommitment
    && ((participant.grounded && participant.supportSurfaceId !== nextTarget.surfaceId)
      || (!participant.grounded
        && participant.movement.airJumpsUsed === 0
        && (tick + state.participantId.length) % AIR_JUMP_REPRESS_AFTER_TICKS === 0));
  return createInput(tick, state.participantId, movement, {
    jumpPressed,
    primaryPressed: primaryInput.primaryPressed,
    primaryHeld: primaryInput.primaryHeld,
  });
}

export class ArenaRaceAuthoritativeRuntimeCandidateV1 {
  readonly #runtime: ModeMatchRuntimeV6;
  readonly #authority: RaceVerticalWorldAuthorityV1;
  readonly #request: DeepReadonly<ArenaRaceAuthoritativeRuntimeCandidateV1Request>;
  readonly #localParticipantId: string;
  readonly #participantIds: readonly string[];
  readonly #bots: readonly RaceAuthoritativeBotStateV1[];
  #destroyed = false;

  constructor(
    value: unknown,
    restoreCapabilityValue?: unknown,
    restoreRuntimeCheckpointV2Value?: unknown,
    restoreRuntimeCheckpointV3Value?: unknown,
  ) {
    const source = cloneFrozenData(value, 'Arena Race authoritative runtime request');
    exactAuthoritativeRuntimeRequest(
      source,
      'Arena Race authoritative runtime request',
    );
    const modeDefinitionId = assertNonEmptyString(
      source.modeDefinitionId,
      'Arena Race authoritative modeDefinitionId',
    );
    if (modeDefinitionId !== MODE_DEFINITION_ID) {
      throw new RangeError('Arena Race authoritative runtime Mode身份漂移。');
    }
    const matchSeed = assertIntegerAtLeast(source.matchSeed, 0, 'Arena Race authoritative seed');
    if (matchSeed > 0xffff_ffff) throw new RangeError('Arena Race authoritative seed必须是uint32。');
    const localParticipantId = assertNonEmptyString(
      source.localParticipantId,
      'Arena Race authoritative localParticipantId',
    );
    const selection = validateMatchContentSelectionV2(source.selection);
    const finalAssignment = validateFinalizedMatchAssignmentV2(source.finalAssignment);
    const runtimePolicyBinding: ArenaThreeModeRuntimePolicyBindingCandidateV1 | null =
      source.runtimePolicyBinding === undefined
        ? null
        : validateArenaThreeModeRuntimePolicyBindingCandidateV1(
          source.runtimePolicyBinding,
          MODE_DEFINITION_ID,
          'race',
        );
    if (runtimePolicyBinding !== null) {
      assertArenaThreeModeRuntimePolicyContentSelectionCandidateV1(
        runtimePolicyBinding,
        selection,
      );
      assertArenaThreeModeRuntimePolicyParticipantAssignmentCandidateV1(
        runtimePolicyBinding,
        finalAssignment,
      );
      assertArenaRuntimeExistingModeSemanticsCandidateV1(
        runtimePolicyBinding,
        MODE_DEFINITION_ID,
        'race',
      );
    }
    const restoreCapability = restoreCapabilityValue === undefined
      ? null
      : validateArenaModeWeaponFeedbackRestoreCapability(restoreCapabilityValue);
    const restoreSourceCount = Number(restoreCapability !== null)
      + Number(restoreRuntimeCheckpointV2Value !== undefined)
      + Number(restoreRuntimeCheckpointV3Value !== undefined);
    if (restoreSourceCount > 1) {
      throw new RangeError('Arena Race每次只能选择一种runtime恢复来源。');
    }
    if (
      restoreCapability !== null
      && restoreCapability.modeDefinitionId !== MODE_DEFINITION_ID
    ) throw new RangeError('Arena Race feedback restore capability Mode身份漂移。');
    const assignedCharacterIds = Object.freeze([...new Set(
      finalAssignment.participants.map(({ characterDefinitionId }) => characterDefinitionId),
    )].sort());
    if (assignedCharacterIds.length !== 1) {
      throw new RangeError('Arena Race所有竞速者必须使用同一角色手感保证对称。');
    }
    const character = playableCharacter(assignedCharacterIds[0]!);
    const mapContent = playableRaceMap(selection.selectedMapDefinitionId);
    if (selection.equipmentDefinitionIds.length !== 1) {
      throw new RangeError('Arena Race必须精确冻结一把武器。');
    }
    const weapon = playableWeapon(selection.equipmentDefinitionIds[0]!);
    if (
      selection.modeDefinitionId !== modeDefinitionId
      || finalAssignment.modeDefinitionId !== modeDefinitionId
      || selection.contentHash !== finalAssignment.contentHash
      || selection.selectedMapDefinitionId !== mapContent.mapDefinition.id
      || !sameData(
        selection.mapDefinitionIds,
        Object.freeze([mapContent.mapDefinition.id]),
        'Arena Race selected maps',
      )
      || !sameData(
        selection.characterDefinitionIds,
        Object.freeze([character.id]),
        'Arena Race selected characters',
      )
      || !sameData(
        selection.equipmentDefinitionIds,
        Object.freeze([weapon.equipment.id]),
        'Arena Race selected equipment',
      )
    ) throw new RangeError('Arena Race authoritative runtime selection身份漂移。');
    const participantCount = assertIntegerAtLeast(
      finalAssignment.participants.length,
      2,
      'Arena Race authoritative participantCount',
    );
    if (!PARTICIPANT_COUNTS.includes(participantCount as 2 | 3 | 4)) {
      throw new RangeError('Arena Race authoritative participantCount必须是2/3/4。');
    }
    const executionTiming = createArenaRaceInteractiveExecutionTimingCandidateV1();
    const config = createConfig(
      participantCount,
      executionTiming,
      character,
      weapon,
      mapContent,
      runtimePolicyBinding,
    );
    if (!sameData(
      finalAssignment.participants,
      config.participantAssignments,
      'Arena Race authoritative participant assignment',
    )) throw new RangeError('Arena Race authoritative runtime participant/角色选择漂移。');
    const human = config.participantAssignments.filter(
      ({ controllerKind }) => controllerKind === 'human',
    );
    if (human.length !== 1 || human[0]!.participantId !== localParticipantId) {
      throw new RangeError('Arena Race authoritative runtime必须精确绑定1名local human。');
    }
    const participantIds = Object.freeze(
      config.participantAssignments.map(({ participantId: id }) => id),
    );
    const adapter = new KzRaceModeMapAdapterV1({
      routeDefinition: mapContent.routeDefinition,
      participantIds,
    });
    const fixture = createFixture(
      adapter,
      executionTiming,
      runtimePolicyBinding,
      mapContent.raceFinishCapability.capabilityId,
    );
    const modePolicyResolver = runtimePolicyBinding === null
      ? null
      : (() => {
        const definitionBundle = projectArenaRuntimePolicyResolverBundleCandidateV1(
          runtimePolicyBinding,
          MODE_DEFINITION_ID,
          'race',
        );
        return new ModePolicyResolver(createArenaMatchConfigV6({
          ...config,
          modePolicyContentHash: definitionBundle.contentHash,
        }), definitionBundle);
      })();
    const modeResultPolicyResolver = runtimePolicyBinding === null
      ? null
      : (() => {
        const definitionBundle = projectArenaRuntimeResultPolicyResolverBundleCandidateV1(
          runtimePolicyBinding,
          MODE_DEFINITION_ID,
          'race',
        );
        return new ModeResultPolicyResolverV1(createArenaMatchConfigV6({
          ...config,
          modePolicyContentHash: definitionBundle.contentHash,
        }), definitionBundle);
      })();
    const objectivePolicyBundle = runtimePolicyBinding === null
      ? null
      : projectArenaRuntimeObjectivePolicyResolverBundleCandidateV1(
        runtimePolicyBinding,
        MODE_DEFINITION_ID,
        'race',
        config.modePolicyContentHash,
      );
    const initial = adapter.createInitialSafeAnchors();
    const bots = config.participantAssignments
      .filter(({ controllerKind }) => controllerKind === 'bot')
      .map(({ participantId: id }) => {
        const start = initial.find(({ participantId }) => participantId === id);
        if (start === undefined) throw new Error(`Arena Race Bot ${id}缺少起点。`);
        return {
          participantId: id,
          path: participantPathFor(mapContent.routeDefinition, start.anchorId),
        };
      });
    const authority = new RaceVerticalWorldAuthorityV1(
      config,
      matchSeed,
      localParticipantId,
      adapter,
      executionTiming,
      character,
      weapon,
      mapContent,
      modePolicyResolver,
      modeResultPolicyResolver,
    );
    let runtime: ModeMatchRuntimeV6 | null = null;
    try {
      const mode = Object.freeze({
        kind: 'race' as const,
        fixture,
        ...(objectivePolicyBundle === null ? {} : { objectivePolicyBundle }),
      });
      runtime = restoreRuntimeCheckpointV3Value !== undefined
        ? ModeMatchRuntimeV6.restoreFromRuntimeCheckpointV3({
          checkpoint: restoreRuntimeCheckpointV3Value,
          mode,
          worldAuthority: authority,
        })
        : restoreRuntimeCheckpointV2Value !== undefined
        ? ModeMatchRuntimeV6.restoreFromRuntimeCheckpointV2({
          checkpoint: restoreRuntimeCheckpointV2Value,
          mode,
          worldAuthority: authority,
        })
        : restoreCapability === null
        ? new ModeMatchRuntimeV6({
          checkpointIntervalTicks: CHECKPOINT_INTERVAL_TICKS,
          config,
          expectedMatchSeed: matchSeed,
          localParticipantId,
          mode,
          worldAuthority: authority,
        })
        : ModeMatchRuntimeV6.restoreFromRuntimeCheckpointV1({
          checkpoint: restoreCapability.runtimeCheckpoint,
          mode,
          worldAuthority: authority,
        });
    } catch (error) {
      try { authority.destroy(); } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], 'Arena Race runtime构造清理失败。');
      }
      throw error;
    }
    this.#runtime = runtime;
    this.#authority = authority;
    this.#request = Object.freeze({
      modeDefinitionId,
      matchSeed,
      selection,
      finalAssignment,
      localParticipantId,
      ...(runtimePolicyBinding === null ? {} : { runtimePolicyBinding }),
    });
    this.#localParticipantId = localParticipantId;
    this.#participantIds = participantIds;
    this.#bots = Object.freeze(bots);
  }

  start(): unknown {
    if (this.#destroyed) throw new Error('Arena Race authoritative runtime已销毁。');
    return this.#runtime.start();
  }

  step(localInput: ArenaInputFrame): unknown {
    if (this.#destroyed) throw new Error('Arena Race authoritative runtime已销毁。');
    const frame = this.#runtime.readFrame;
    if (frame === null) throw new Error('Arena Race authoritative runtime尚未启动。');
    const inputById = new Map<string, ArenaInputFrame>([[this.#localParticipantId, localInput]]);
    for (const bot of this.#bots) inputById.set(bot.participantId, raceAuthoritativeBotInput(frame, bot));
    const inputs = Object.freeze(this.#participantIds.map((participantIdValue) => {
      const input = inputById.get(participantIdValue);
      if (input === undefined) throw new Error(`Arena Race缺少canonical input ${participantIdValue}。`);
      return input;
    }));
    const outcome = this.#runtime.step(inputs);
    return Object.freeze({
      ...outcome,
      inputs,
      weaponFeedbackDirectionFactsV2:
        this.#authority.readCommittedWeaponFeedbackDirectionFactsV2(),
    });
  }

  pause(): void {
    if (this.#destroyed) throw new Error('Arena Race authoritative runtime已销毁。');
    this.#runtime.pause();
  }

  resume(): void {
    if (this.#destroyed) throw new Error('Arena Race authoritative runtime已销毁。');
    this.#runtime.resume();
  }

  exportWeaponFeedbackCheckpointCapabilityV1() {
    if (this.#destroyed) throw new Error('Arena Race authoritative runtime已销毁。');
    return createArenaModeWeaponFeedbackCheckpointCapabilityV1({
      modeDefinitionId: MODE_DEFINITION_ID,
      runtimeCheckpoint: this.#runtime.exportRuntimeCheckpointV1(),
    });
  }

  exportWeaponFeedbackDirectionCheckpointCapabilityV2() {
    if (this.#destroyed) throw new Error('Arena Race authoritative runtime已销毁。');
    return createArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2({
      modeDefinitionId: MODE_DEFINITION_ID,
      runtimeCheckpoint: this.#runtime.exportRuntimeCheckpointV1(),
    });
  }

  exportRuntimeCheckpointV1() {
    if (this.#destroyed) throw new Error('Arena Race authoritative runtime已销毁。');
    return this.#runtime.exportRuntimeCheckpointV1();
  }

  exportRuntimeCheckpointV2() {
    if (this.#destroyed) throw new Error('Arena Race authoritative runtime已销毁。');
    return this.#runtime.exportRuntimeCheckpointV2();
  }

  exportRuntimeCheckpointV3() {
    if (this.#destroyed) throw new Error('Arena Race authoritative runtime已销毁。');
    return this.#runtime.exportRuntimeCheckpointV3();
  }

  forkFromRuntimeCheckpointV2(
    checkpoint: unknown = this.exportRuntimeCheckpointV2(),
  ): ArenaRaceAuthoritativeRuntimeCandidateV1 {
    if (this.#destroyed) throw new Error('Arena Race authoritative runtime已销毁。');
    return new ArenaRaceAuthoritativeRuntimeCandidateV1(this.#request, undefined, checkpoint);
  }

  forkFromRuntimeCheckpointV3(
    checkpoint: unknown = this.exportRuntimeCheckpointV3(),
  ): ArenaRaceAuthoritativeRuntimeCandidateV1 {
    if (this.#destroyed) throw new Error('Arena Race authoritative runtime已销毁。');
    return new ArenaRaceAuthoritativeRuntimeCandidateV1(
      this.#request,
      undefined,
      undefined,
      checkpoint,
    );
  }

  getRetainedResourceSnapshot(): ModeMatchRuntimeV6RetainedResourceSnapshot {
    return this.#runtime.getRetainedResourceSnapshot();
  }

  exportContentSelectionCheckpointCapabilityV1() {
    if (this.#destroyed) throw new Error('Arena Race authoritative runtime已销毁。');
    return createArenaThreeModeContentSelectionCheckpointCapabilityV1({
      selection: this.#request.selection,
      finalAssignment: this.#request.finalAssignment,
      runtimeCheckpoint: this.#runtime.exportRuntimeCheckpointV1(),
    });
  }

  forkFromWeaponFeedbackCheckpointCapabilityV1(
    capability: ArenaModeWeaponFeedbackCheckpointCapabilityV1 =
      this.exportWeaponFeedbackCheckpointCapabilityV1(),
  ): ArenaRaceAuthoritativeRuntimeCandidateV1 {
    if (this.#destroyed) throw new Error('Arena Race authoritative runtime已销毁。');
    return new ArenaRaceAuthoritativeRuntimeCandidateV1(this.#request, capability);
  }

  forkFromWeaponFeedbackDirectionCheckpointCapabilityV2(
    capability: ArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2 =
      this.exportWeaponFeedbackDirectionCheckpointCapabilityV2(),
  ): ArenaRaceAuthoritativeRuntimeCandidateV1 {
    if (this.#destroyed) throw new Error('Arena Race authoritative runtime已销毁。');
    return new ArenaRaceAuthoritativeRuntimeCandidateV1(this.#request, capability);
  }

  getModeDriverContentHash(): string {
    if (this.#destroyed) throw new Error('Arena Race authoritative runtime已销毁。');
    return this.#runtime.getModeDriverContentHash();
  }

  getTerminalAuthorityIdentity(): unknown {
    if (this.#destroyed) throw new Error('Arena Race authoritative runtime已销毁。');
    if (this.#runtime.state !== MODE_MATCH_RUNTIME_V6_STATE.ENDED) {
      throw new Error('Arena Race authority identity只在终局后可读。');
    }
    const replay = this.exportReplayV6();
    const world = this.#runtime.readFrame?.worldSnapshot;
    if (world === undefined) throw new Error('Arena Race终局缺少world identity。');
    return Object.freeze({
      replaySchemaVersion: 6 as const,
      ruleSchemaVersion: 6 as const,
      physicsBackendVersion: world.physicsBackendVersion,
      configHash: world.configHash,
      ruleContentHash: world.ruleContentHash,
      finalHash: replay.finalHash,
    });
  }

  exportReplayV6() {
    if (this.#destroyed) throw new Error('Arena Race authoritative runtime已销毁。');
    if (this.#runtime.state !== MODE_MATCH_RUNTIME_V6_STATE.ENDED) {
      throw new Error('Arena Race Replay V6只在终局后可读。');
    }
    return this.#runtime.exportReplayV6();
  }

  exportTerminalEvidenceV1() {
    if (this.#destroyed) throw new Error('Arena Race authoritative runtime已销毁。');
    if (this.#runtime.state !== MODE_MATCH_RUNTIME_V6_STATE.ENDED) {
      throw new Error('Arena Race终局Runtime证据只在终局后可读。');
    }
    return this.#runtime.exportTerminalEvidenceV1();
  }

  exportTerminalEvidenceV2() {
    if (this.#destroyed) throw new Error('Arena Race authoritative runtime已销毁。');
    if (this.#runtime.state !== MODE_MATCH_RUNTIME_V6_STATE.ENDED) {
      throw new Error('Arena Race终局Runtime证据V2只在终局后可读。');
    }
    return this.#runtime.exportTerminalEvidenceV2();
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#runtime.destroy();
    this.#destroyed = true;
  }
}

export function createArenaRaceAuthoritativeRuntimeCandidateV1(
  value: ArenaRaceAuthoritativeRuntimeCandidateV1Request,
): ArenaRaceAuthoritativeRuntimeCandidateV1 {
  return new ArenaRaceAuthoritativeRuntimeCandidateV1(value);
}

function observeScriptEvents(
  script: RaceScenarioScriptStateV1,
  events: readonly ArenaMatchEventV6[],
): void {
  for (const event of events) {
    if (
      event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL
      && event.participantId === script.routeMistakeParticipantId
      && script.routeMistakeStartedTick !== null
      && event.tick >= script.routeMistakeStartedTick
      && event.fallCause === 'movement'
      && event.creditedAttackerId === null
    ) {
      script.routeMistakeFallTick = event.tick;
      transitionScriptPhase(script, 'route-mistake-await-respawn', event.tick);
    }
    if (
      event.type === ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWNED
      && event.participantId === script.routeMistakeParticipantId
      && script.routeMistakeFallTick !== null
      && event.tick > script.routeMistakeFallTick
    ) {
      script.routeMistakeRespawnObserved = true;
      transitionScriptPhase(script, 'route', event.tick);
    }
  }
}

function destroyRuntime(runtime: ModeMatchRuntimeV6): void {
  let firstFailure: unknown = undefined;
  try {
    runtime.destroy();
  } catch (error) {
    firstFailure = error;
    try { runtime.destroy(); } catch (retryError) {
      throw new AggregateError([error, retryError], 'P3 Race runtime destroy retry失败。');
    }
  }
  if (runtime.getRetainedResourceSnapshot().ownedResourceCount !== 0) {
    throw new Error('P3 Race runtime destroy后仍保留owned resource。');
  }
  if (firstFailure !== undefined) throw firstFailure;
}

export function runArenaRaceVerticalIntegrationScenarioCandidateV1(
  value: unknown,
): ArenaRaceVerticalIntegrationScenarioReportV1 {
  const options = normalizeScenarioOptions(value);
  const executionTiming = createArenaRaceVerificationExecutionTimingCandidateV1();
  const config = createConfig(options.participantCount, executionTiming);
  const participantIds = config.participantAssignments.map(({ participantId: id }) => id);
  const adapter = new KzRaceModeMapAdapterV1({
    routeDefinition: ROUTE,
    participantIds,
  });
  const fixture = createFixture(adapter, executionTiming);
  let authority = new RaceVerticalWorldAuthorityV1(
    config,
    options.matchSeed,
    participantIds[0]!,
    adapter,
    executionTiming,
  );
  let runtime = new ModeMatchRuntimeV6({
    checkpointIntervalTicks: CHECKPOINT_INTERVAL_TICKS,
    config,
    expectedMatchSeed: options.matchSeed,
    localParticipantId: participantIds[0]!,
    mode: Object.freeze({ kind: 'race', fixture }),
    worldAuthority: authority,
  });
  const scripts = scriptState(config, adapter);
  let executedTicks = 0;
  let pauseResumeCycleCount = 0;
  let scenarioCore: Omit<ArenaRaceVerticalIntegrationScenarioReportV1, 'resultHash'> | null = null;
  let primaryFailure: unknown = undefined;
  let hasPrimaryFailure = false;
  let fullAuthorityCheckpointRestoreCount = 0;
  let fullAuthorityCheckpointRestoredAtTick: number | null = null;
  let runtimeCheckpointV3RestoreIdentityHash: string | null = null;
  let feedbackCheckpointRestoreIdentityHash: string | null = null;
  try {
    const started = runtime.start();
    const initialWorld = started.readFrame.worldSnapshot;
    const initialXs = initialWorld.participants.map(({ position }) => position.x);
    const initialZs = initialWorld.participants.map(({ position }) => position.z);
    if (
      initialWorld.phase !== 'preparing'
      || initialWorld.modeProjection.preparationRemainingTicks !== RACE_MODE_PREPARING_TICKS_V1
      || initialXs.length !== options.participantCount
      || !initialXs.every((x) => x === initialXs[0])
      || new Set(initialZs).size !== options.participantCount
    ) {
      throw new RangeError('P3 Race 2/3/4人起跑线/独立赛道/60 tick准备身份未闭合。');
    }
    while (runtime.state === MODE_MATCH_RUNTIME_V6_STATE.RUNNING) {
      const frame = runtime.readFrame;
      if (frame === null) throw new Error('P3 Race runtime缺少当前frame。');
      if (executedTicks >= executionTiming.verificationScenarioMaximumTicks!) {
        throw new RangeError('P3 Race纵向候选超过显式test hard limit。');
      }
      if (frame.worldSnapshot.tick === 90 && pauseResumeCycleCount === 0) {
        runtime.pause();
        runtime.resume();
        pauseResumeCycleCount += 1;
      }
      const outcome = runtime.step(createScriptedInputs(frame, scripts));
      observeScriptEvents(scripts, outcome.events);
      executedTicks += 1;
      const checkpointEvidence = authority.getEvidenceSnapshot();
      if (
        fullAuthorityCheckpointRestoreCount === 0
        && checkpointEvidence.combat.hitTicks.length > 0
      ) {
        const runtimeCheckpoint = runtime.exportRuntimeCheckpointV3();
        const runtimeCheckpointV2 = runtimeCheckpoint.runtimeCheckpointV2;
        const runtimeCheckpointV1 = runtimeCheckpointV2.runtimeCheckpointV1;
        const feedbackCapabilityBeforeRestore =
          createArenaModeWeaponFeedbackCheckpointCapabilityV1({
            modeDefinitionId: MODE_DEFINITION_ID,
            runtimeCheckpoint: runtimeCheckpointV1,
          });
        const directionCapabilityBeforeRestore =
          createArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2({
            modeDefinitionId: MODE_DEFINITION_ID,
            runtimeCheckpoint: runtimeCheckpointV1,
          });
        const restoredAdapter = new KzRaceModeMapAdapterV1({
          routeDefinition: ROUTE,
          participantIds,
        });
        const restoredAuthority = new RaceVerticalWorldAuthorityV1(
          config,
          options.matchSeed,
          participantIds[0]!,
          restoredAdapter,
          executionTiming,
        );
        let restoredRuntime: ModeMatchRuntimeV6 | null = null;
        try {
          restoredRuntime = ModeMatchRuntimeV6.restoreFromRuntimeCheckpointV3({
            checkpoint: runtimeCheckpoint,
            mode: Object.freeze({ kind: 'race' as const, fixture }),
            worldAuthority: restoredAuthority,
          });
          const restoredRuntimeCheckpoint = restoredRuntime.exportRuntimeCheckpointV3();
          const restoredRuntimeCheckpointV2 = restoredRuntimeCheckpoint.runtimeCheckpointV2;
          const restoredRuntimeCheckpointV1 = restoredRuntimeCheckpointV2.runtimeCheckpointV1;
          const feedbackCapabilityAfterRestore =
            createArenaModeWeaponFeedbackCheckpointCapabilityV1({
              modeDefinitionId: MODE_DEFINITION_ID,
              runtimeCheckpoint: restoredRuntimeCheckpointV1,
            });
          const directionCapabilityAfterRestore =
            createArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2({
              modeDefinitionId: MODE_DEFINITION_ID,
              runtimeCheckpoint: restoredRuntimeCheckpointV1,
            });
          if (
            restoredRuntimeCheckpoint.checkpointIdentityHash
              !== runtimeCheckpoint.checkpointIdentityHash
            || restoredRuntimeCheckpoint.modeDriverContentHash
              !== runtimeCheckpoint.modeDriverContentHash
            || restoredRuntimeCheckpointV2.supplyFactStreamId !== null
            || restoredRuntimeCheckpointV2.lastSupplyFactSequence !== null
            || feedbackCapabilityAfterRestore.capabilityIdentityHash
              !== feedbackCapabilityBeforeRestore.capabilityIdentityHash
            || feedbackCapabilityAfterRestore.feedbackCheckpoint.checkpointIdentityHash
              !== feedbackCapabilityBeforeRestore.feedbackCheckpoint.checkpointIdentityHash
            || directionCapabilityAfterRestore.capabilityIdentityHash
              !== directionCapabilityBeforeRestore.capabilityIdentityHash
            || directionCapabilityAfterRestore.directionCheckpoint.checkpointIdentityHash
              !== directionCapabilityBeforeRestore.directionCheckpoint.checkpointIdentityHash
          ) throw new RangeError('P3 Race feedback checkpoint恢复前后身份漂移。');
          const previousRuntime = runtime;
          previousRuntime.destroy();
          runtime = restoredRuntime;
          authority = restoredAuthority;
          fullAuthorityCheckpointRestoreCount = 1;
          fullAuthorityCheckpointRestoredAtTick = runtime.readFrame!.worldSnapshot.tick;
          runtimeCheckpointV3RestoreIdentityHash =
            restoredRuntimeCheckpoint.checkpointIdentityHash;
          feedbackCheckpointRestoreIdentityHash =
            feedbackCapabilityAfterRestore.capabilityIdentityHash;
        } catch (error) {
          const cleanupErrors: unknown[] = [];
          try {
            if (restoredRuntime === null) restoredAuthority.destroy();
            else restoredRuntime.destroy();
          } catch (cleanupError) {
            cleanupErrors.push(cleanupError);
          }
          if (cleanupErrors.length > 0) {
            throw new AggregateError(
              [error, ...cleanupErrors],
              'P3 Race runtime恢复候选清理不完整。',
            );
          }
          throw error;
        }
      }
    }
    if (runtime.state !== MODE_MATCH_RUNTIME_V6_STATE.ENDED) {
      throw new Error('P3 Race纵向候选未正常终局。');
    }
    const replay = runtime.exportReplayV6();
    const modeCheckpoints = runtime.exportModeCheckpointsV2();
    const result = replay.modeResult;
    if (result.kind !== 'race') throw new Error('P3 Race终局result类型漂移。');
    const evidence = authority.getEvidenceSnapshot();
    if (evidence.pendingRespawnCount !== 0) {
      throw new RangeError('P3 Race终局后仍保留幽灵待复活证据。');
    }
    if (
      fullAuthorityCheckpointRestoreCount !== 1
      || fullAuthorityCheckpointRestoredAtTick === null
      || runtimeCheckpointV3RestoreIdentityHash === null
      || feedbackCheckpointRestoreIdentityHash === null
    ) {
      throw new RangeError('P3 Race场景未完成一次真实战斗中的完整authority恢复。');
    }
    const routeMistakeParticipant = scripts.participants.at(-1);
    const routeMistakeRespawns = routeMistakeParticipant === undefined
      || scripts.routeMistakeFallTick === null
      ? []
      : evidence.respawns.filter(({ participantId: id, fallTick }) => (
        id === routeMistakeParticipant.participantId
        && fallTick === scripts.routeMistakeFallTick
      ));
    const combat = evidence.combat;
    const combatActionStartedTick = combat.actionStartedTicks[0];
    const combatHitTick = combat.hitTicks[0];
    const expiredControlHitTick = combat.hitTicks[1];
    const combatFall = combat.creditedFall;
    const expiredControlFall = combat.expiredControlFall;
    const combatRespawn = combatFall === null ? undefined : evidence.respawns.find((entry) => (
      entry.participantId === combat.targetId && entry.fallTick === combatFall.tick
    ));
    const expiredControlRespawn = expiredControlFall === null
      ? undefined
      : evidence.respawns.find((entry) => (
        entry.participantId === combat.targetId && entry.fallTick === expiredControlFall.tick
      ));
    const routeMistakeFall = scripts.routeMistakeFallTick === null
      ? undefined
      : evidence.falls.find((entry) => (
        entry.participantId === scripts.routeMistakeParticipantId
        && entry.tick === scripts.routeMistakeFallTick
      ));
    const replayCombatFall = combatFall === null
      ? undefined
      : replay.events.find(({ id }) => id === combatFall.eventId);
    const combatResultRanking = result.rankings.find(({ participantId: id }) => (
      id === combat.targetId
    ));
    if (
      evidence.actionStartedCount < 2
      || evidence.combatHitCount < 2
      || evidence.combatCreditedFallCount < 1
      || evidence.physicalFallCount < 3
      || scripts.combatJumpInputTick === null
      || scripts.combatPrimaryInputTick === null
      || scripts.expiredPrimaryInputTick === null
      || combatActionStartedTick === undefined
      || combatActionStartedTick !== scripts.combatPrimaryInputTick
      || combatHitTick === undefined
      || combatHitTick < combatActionStartedTick
      || expiredControlHitTick === undefined
      || expiredControlHitTick < scripts.expiredPrimaryInputTick
      || combat.firstImpulse === null
      || combat.supportSurfaceAtFirstHit !== COMBAT_RING_OUT_SURFACE_ID
      || combat.lastSupportedTick === null
      || combat.firstUnsupportedTick === null
      || combat.firstUnsupportedTick < combatHitTick
      || combatFall === null
      || combatFall.fallCause !== 'credited-hit'
      || combatFall.creditedAttackerId !== combat.attackerId
      || combatFall.tick < combat.firstUnsupportedTick
      || combatRespawn === undefined
      || expiredControlFall === null
      || expiredControlFall.fallCause !== 'movement'
      || expiredControlFall.creditedAttackerId !== null
      || expiredControlFall.tick - expiredControlHitTick
        <= ARENA_MATCH_DEFAULTS.lastHitCreditTicks
      || expiredControlRespawn === undefined
      || routeMistakeParticipant?.routeMistakeTriggered !== true
      || scripts.routeMistakeStartedTick === null
      || routeMistakeFall === undefined
      || routeMistakeFall.fallCause !== 'movement'
      || routeMistakeFall.creditedAttackerId !== null
      || routeMistakeFall.lastHitByAtFall !== null
      || routeMistakeFall.lastHitTickAtFall !== -1
      || routeMistakeRespawns.length < 1
      || evidence.safeAnchorCommitCount < 1
      || replayCombatFall?.type !== ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL
      || replayCombatFall.id !== combatFall.eventId
      || replayCombatFall.sequence !== combatFall.eventSequence
      || combatResultRanking === undefined
      || evidence.pendingRespawnCount !== 0
    ) throw new Error(
      'P3 Race纵向候选缺少真实重锤归因掉落/过期控制/无命中路线/180 tick重生证据。',
    );
    for (const respawn of evidence.respawns) {
      if (
        respawn.scheduledReadyTick - respawn.fallTick !== RACE_MODE_RESPAWN_DELAY_TICKS_V1
        || respawn.respawnTick !== respawn.scheduledReadyTick
      ) throw new RangeError('P3 Race重生未精确闭合180 authority tick。');
    }
    const finalTick = runtime.readFrame?.worldSnapshot.tick;
    if (!Number.isSafeInteger(finalTick) || (finalTick as number) < 1) {
      throw new RangeError('P3 Race终局tick无效。');
    }
    const terminalEvent = replay.events.at(-1);
    if (
      terminalEvent?.type !== ARENA_MATCH_EVENT_V6.MATCH_ENDED
      || terminalEvent.tick !== result.endedAtTick
      || finalTick !== result.endedAtTick + 1
    ) throw new RangeError('P3 Race authority终局tick与post-frame tick未按T/T+1闭合。');
    const initialAnchors = adapter.createInitialSafeAnchors().map(({ anchorId }) => requireAnchor(anchorId));
    scenarioCore = Object.freeze({
      id: `arena-race-vertical-integration.${options.participantCount}.v1`,
      participantCount: options.participantCount,
      matchSeed: options.matchSeed,
      participantIds: Object.freeze([...participantIds]),
      startLineX: initialAnchors[0]!.position.x,
      startLaneZs: Object.freeze(initialAnchors.map(({ position }) => position.z)),
      preparationTicks: RACE_MODE_PREPARING_TICKS_V1,
      executedTicks,
      pauseResumeCycleCount,
      actionStartedCount: evidence.actionStartedCount,
      combatHitCount: evidence.combatHitCount,
      combatCreditedFallCount: evidence.combatCreditedFallCount,
      combatRingOutClosure: 'code-written-not-run',
      combatRingOut: Object.freeze({
        closure: 'code-written-not-run',
        requiredScenario: true,
        attackerId: combat.attackerId,
        targetId: combat.targetId,
        combatSurfaceId: COMBAT_RING_OUT_SURFACE_ID,
        usesOnlyStandardInputFrame: true,
        directionalInputTick: scripts.combatPrimaryInputTick,
        jumpInputTick: scripts.combatJumpInputTick,
        primaryInputTick: scripts.combatPrimaryInputTick,
        actionStartedTick: combatActionStartedTick,
        firstHitTick: combatHitTick,
        appliedImpulse: combat.firstImpulse,
        supportTransition: Object.freeze({
          fromSurfaceId: COMBAT_RING_OUT_SURFACE_ID,
          lastSupportedTick: combat.lastSupportedTick,
          firstUnsupportedTick: combat.firstUnsupportedTick,
          killYCrossingTick: combatFall.tick,
        }),
        creditedFall: combatFall,
        respawn: combatRespawn,
        replayV6ResultIdentity: Object.freeze({
          emittedFallEventId: combatFall.eventId,
          replayFallEventId: replayCombatFall.id,
          replayFallEventSequence: replayCombatFall.sequence,
          resultParticipantId: combatResultRanking.participantId,
          resultRank: combatResultRanking.rank,
          resultEndedAtTick: result.endedAtTick,
        }),
      }),
      controls: Object.freeze({
        expiredLastHit: Object.freeze({
          attackerId: combat.attackerId,
          targetId: combat.targetId,
          hitTick: expiredControlHitTick,
          fallTick: expiredControlFall.tick,
          elapsedTicks: expiredControlFall.tick - expiredControlHitTick,
          lastHitCreditTicks: ARENA_MATCH_DEFAULTS.lastHitCreditTicks,
          fallCause: 'movement',
          creditedAttackerId: null,
          respawn: expiredControlRespawn,
        }),
        noHitRouteMistake: Object.freeze({
          participantId: routeMistakeFall.participantId,
          phaseStartedTick: scripts.routeMistakeStartedTick,
          fallTick: routeMistakeFall.tick,
          fallCause: 'movement',
          creditedAttackerId: null,
          lastHitByAtFall: null,
          lastHitTickAtFall: -1,
        }),
      }),
      scriptedPhaseOrder: Object.freeze([...scripts.phaseOrder]),
      routeMistakeFallCount: routeMistakeRespawns.length,
      safeAnchorCommitCount: evidence.safeAnchorCommitCount,
      respawns: evidence.respawns,
      winnerParticipantIds: result.winnerParticipantIds,
      rankings: result.rankings,
      replayEventCount: replay.events.length,
      replayCheckpointCount: modeCheckpoints.length,
      feedbackOutcomeWindowTicks: ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1,
      fullAuthorityCheckpointRestoreCount: 1 as const,
      fullAuthorityCheckpointRestoredAtTick,
      runtimeCheckpointV3RestoreIdentityHash,
      feedbackCheckpointRestoreIdentityHash,
      finalTick: finalTick as number,
      finalHash: replay.finalHash,
      retainedResourceCountAfterDestroy: -1,
    });
  } catch (error) {
    primaryFailure = error;
    hasPrimaryFailure = true;
  } finally {
    try {
      destroyRuntime(runtime);
    } catch (cleanupError) {
      primaryFailure = hasPrimaryFailure
        ? new AggregateError([primaryFailure, cleanupError], 'P3 Race主流程及清理失败。')
        : cleanupError;
      hasPrimaryFailure = true;
    }
  }
  if (hasPrimaryFailure) throw primaryFailure;
  if (scenarioCore === null) throw new Error('P3 Race纵向候选未形成scenario report。');
  const retainedResourceCountAfterDestroy = authority.getEvidenceSnapshot().retainedResourceCount;
  if (retainedResourceCountAfterDestroy !== 0) {
    throw new Error('P3 Race authority destroy后资源未归零。');
  }
  const completed = Object.freeze({ ...scenarioCore, retainedResourceCountAfterDestroy });
  return Object.freeze({
    ...completed,
    resultHash: createDeterministicDataHash(completed, `${completed.id} report`),
  });
}

const RACE_VERIFICATION_PLAN_EXECUTION_TIMING =
  createArenaRaceVerificationExecutionTimingCandidateV1();

export const ARENA_RACE_VERTICAL_INTEGRATION_VERIFICATION_PLAN_CANDIDATE_V1 = Object.freeze({
  status: ARENA_RACE_VERTICAL_INTEGRATION_VERIFICATION_V1_CANDIDATE_STATUS,
  hardGate: false as const,
  participantCounts: PARTICIPANT_COUNTS,
  matchSeed: DEFAULT_MATCH_SEED,
  preparingTicks: RACE_MODE_PREPARING_TICKS_V1,
  respawnDelayTicks: RACE_MODE_RESPAWN_DELAY_TICKS_V1,
  respawnTuningContentHash: ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.contentHash,
  respawnProtectionTicks: ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.protectionTicks,
  respawnFallbackAnchorCapabilityId:
    ARENA_V2_RACE_RESPAWN_TUNING_CANDIDATE_V1.anchorCapabilityId,
  respawnProtectionBalanceApprovalStatus: 'not-run' as const,
  explicitTimelinePolicyRuntimeMirrorCapabilityWritten: true as const,
  explicitTimelinePolicyRuntimeMirrorWired: false as const,
  executionTimingPurpose: RACE_VERIFICATION_PLAN_EXECUTION_TIMING.purpose,
  executionTimingContentHash: RACE_VERIFICATION_PLAN_EXECUTION_TIMING.contentHash,
  interactiveLocalHardLimitActiveTicks:
    RACE_VERIFICATION_PLAN_EXECUTION_TIMING.interactiveLocalHardLimitActiveTicks,
  interactiveLocalHardLimitSource:
    'preserved-unapproved-local-runtime-candidate-not-verification-budget' as const,
  verificationExecutionTimingSeparatedFromInteractiveRuntime: true as const,
  executionTimingIdentityBoundToConfigAndModeFixture: true as const,
  verificationScenarioWatchdogControlsInteractiveFixture: false as const,
  localPrimaryAffordanceProjectedFromRuleEngine: true as const,
  localPrimaryHoldAffordanceProjectedFromRuleEngine: true as const,
  checkpointIntervalTicks: CHECKPOINT_INTERVAL_TICKS,
  maximumScenarioTicks:
    RACE_VERIFICATION_PLAN_EXECUTION_TIMING.verificationScenarioMaximumTicks!,
  defaultRegistryWired: false as const,
  defaultCompositionWired: false as const,
  defaultEntryWired: false as const,
  validationStatus: 'not-run' as const,
  combatRingOutRequired: true as const,
  combatRingOutClosure: 'code-written-not-run' as const,
  terminalTickContractClosure: 'static-contract-patched-not-run' as const,
  fullAuthorityCheckpointClosure: 'code-written-not-run' as const,
  fixtureDefinitionId: `${FIXTURE_DEFINITION_ID}.${RACE_VERIFICATION_PLAN_EXECUTION_TIMING.purpose}`
    + `.timing-${RACE_VERIFICATION_PLAN_EXECUTION_TIMING.contentHash}`,
});

export function runArenaRaceVerticalIntegrationVerificationCandidateV1():
ArenaRaceVerticalIntegrationVerificationReportV1 {
  const scenarios = Object.freeze(PARTICIPANT_COUNTS.map((participantCount) => (
    runArenaRaceVerticalIntegrationScenarioCandidateV1({
      participantCount,
      matchSeed: DEFAULT_MATCH_SEED + participantCount,
    })
  )));
  const reportWithoutHash = Object.freeze({
    schemaVersion: ARENA_RACE_VERTICAL_INTEGRATION_VERIFICATION_V1_SCHEMA_VERSION,
    candidateStatus: ARENA_RACE_VERTICAL_INTEGRATION_VERIFICATION_V1_CANDIDATE_STATUS,
    hardGate: false as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
    defaultEntryWired: false as const,
    validationStatus: 'not-run' as const,
    mapDefinitionId: MAP.id,
    routeDefinitionId: ROUTE.id,
    characterDefinitionId: CHARACTER.id,
    weaponDefinitionId: WEAPON.equipment.id,
    weaponContentHash: WEAPON.contentHash,
    modeDefinitionId: MODE_DEFINITION_ID,
    usesSharedRuleMovementPhysics: true as const,
    usesRaceSpecificWeaponSystem: false as const,
    combatRingOutClosure: 'code-written-not-run' as const,
    terminalTickContractClosure: 'static-contract-patched-not-run' as const,
    fullAuthorityCheckpointClosure: 'code-written-not-run' as const,
    deferredGaps: Object.freeze([]) as readonly [],
    scenarios,
  });
  return Object.freeze({
    ...reportWithoutHash,
    resultHash: createDeterministicDataHash(
      reportWithoutHash,
      'P3 Race vertical integration report',
    ),
  });
}
