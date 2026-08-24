import {
  SURVIVAL_ENEMY_FAMILY_PROFILE_CANDIDATE_V1,
  SURVIVAL_ENEMY_OBSERVATION_V2_SCHEMA_VERSION,
  SurvivalEnemyControllerV2,
  isBotPrimaryActionReadyV1,
  type SurvivalEnemyControllerCheckpointV2,
  type SurvivalEnemyVisibleSupplyV2,
} from '@number-strategy-jump/arena-bot';
import {
  ARENA_SUPPLY_AUTHORITY_FACT_KIND_V1,
  ARENA_MATCH_EVENT_V6,
  ARENA_MATCH_EVENT_V6_ACTION_SOURCE,
  ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1,
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createArenaLocalJumpAvailabilityV1,
  createArenaMatchEventV6,
  createParticipantEquipmentUsageV3FromEvents,
  createArenaSupplyAuthorityFactV1,
  createDeterministicDataHash,
  createModeResultV3Payload,
  createMatchReadFrameV3Audit,
  deriveSeed,
  normalizeInputFrame,
  validateFinalizedMatchAssignmentV2,
  validateMatchContentSelectionV2,
  type ArenaInputFrame,
  type ArenaMatchEventV6,
  type ArenaSupplyCadenceSnapshotV1,
  type ArenaSupplyAuthorityFactV1,
  type ArenaWeaponFeedbackDirectionFactV2,
  type DeepReadonly,
  type MatchReadFrameV3,
  type MatchReadFrameV3AuditOptions,
  type ModeResultV3Payload,
  type ParticipantEquipmentUsageV3,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_GAMEPLAY_V2_TUNING,
  type CharacterDefinition,
  type KzRouteAnchorV2,
  type KzRouteDefinitionV2,
  type KzRouteSegmentV2,
  type MapDefinition,
  type MapSurfaceDefinition,
  type SurvivalEquipmentTierPolicyDefinition,
  type SurvivalPressurePolicyDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_ACTION_PHASE,
  ArenaRuleEngine,
  createArenaBeginDownSmashActionEffectHandlerV1,
  createDefaultActionEffectRegistry,
  createDefaultRuleCommandRegistry,
  createDefaultTargetingRegistry,
  type ArenaRuleEngineContract,
  type ArenaRuleEngineCheckpointV1,
  type RuleActor,
  type RuleImpulse,
  type RuleMutationPorts,
} from '@number-strategy-jump/arena-core';
import {
  EquipmentSupplyTimelineSystem,
  EquipmentSystem,
  type EquipmentSupplyTimelineSnapshot,
} from '@number-strategy-jump/arena-equipment';
import {
  MATCH_CORE_WEAPON_FEEDBACK_ADAPTER_CHECKPOINT_V1_SCHEMA_VERSION,
  MODE_MATCH_RUNTIME_V6_STATE,
  MatchCoreWeaponFeedbackBundleOwnerV2,
  ModePolicyResolver,
  ModeResultPolicyResolverV1,
  ModeMatchRuntimeV6,
  createArenaMatchConfigV6,
  createKzSurvivalRouteTargetProjectionV1,
  validateMatchCoreWeaponFeedbackAdapterCheckpointV1,
  validateMatchCoreWeaponFeedbackDirectionCheckpointV2,
  type ArenaMatchConfigV6,
  type MatchCoreWeaponFeedbackAdapterCheckpointV1,
  type MatchCoreWeaponFeedbackDirectionCheckpointV2,
  type ModeMatchResolutionV6,
  type ModeMatchRuntimeV6RetainedResourceSnapshot,
  type ModeMatchWorldAuthorityV6,
  type SurvivalModeCommandV1,
  type SurvivalModeFixtureV1,
} from '@number-strategy-jump/arena-match';
import {
  MOVEMENT_COMMAND_KIND,
  MovementSystem,
  createMovementCommand,
  isMovementCommandKind,
  type MovementCommand,
  type MovementSystemCheckpointV1,
} from '@number-strategy-jump/arena-movement';
import {
  ARENA_FIXED_DT,
  createCharacterPhysicsProfile,
  createLightweightPhysicsWorld,
  createLightweightPhysicsWorldFromCheckpointV1,
  type CheckpointableLightweightPhysicsWorldV1,
  type LightweightPhysicsCheckpointV1,
  type PhysicsCharacterState,
} from '@number-strategy-jump/arena-physics';
import {
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1,
  ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_V1,
  ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_ENEMY_FAMILY_CHARACTER_DEFINITION_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_PRESSURE_POLICY_DEFINITION_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_SUPPLY_FIRST_SPAWN_TICKS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_SUPPLY_INTERVAL_TICKS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_SUPPLY_LIFETIME_TICKS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_SUPPLY_SPAWN_COUNT_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V2,
  ARENA_V2_SIX_CHARACTER_CATALOG_ENTRIES_CANDIDATE_V1,
  ARENA_V2_SIX_CHARACTER_DEFINITION_IDS_CANDIDATE_V1,
  createArenaV2SurvivalBaselineWeaponCandidateRegistriesV1,
  createArenaV2SurvivalRegisteredWeaponPoolCandidateV1,
  createArenaV2SurvivalRegisteredWeaponPoolRegistriesCandidateV1,
  resolveArenaV2SurvivalFirstRespawnAnchorCandidateV1,
  type ArenaV2SurvivalRegisteredWeaponPoolCandidateV1,
} from '@number-strategy-jump/arena-product-content';
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

export const ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_V1_CANDIDATE_STATUS =
  'production-unreachable' as const;
export const ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_ENEMY_COUNTS_V1 = Object.freeze(
  [1, 4, 8, 12, 16] as const,
);

const PLAYER_ID = 'arena-p3-survival-shared-player';
const PHYSICS_BACKEND_VERSION = 'arena.p3.survival.shared-lightweight-physics.candidate.v1';
const CHECKPOINT_INTERVAL_TICKS = 50_000;
const FALL_DRIVE_LEAD_TICKS = 30;
const FALL_COMPLETION_BUDGET_TICKS = 2_400;
const LAST_HIT_CREDIT_TICKS = 120;
const SURVIVAL_EXECUTION_TIMING_KEYS = new Set([
  'schemaVersion', 'purpose', 'enemyCount', 'initialPlayerProtectionTicks',
  'interactiveLocalHardLimitActiveTicks', 'scenarioFallDriveStartTick',
  'verificationScenarioMaximumTick', 'verificationPressurePolicyContentHash',
  'contentHash',
]);
const SCENARIO_OPTION_KEYS = new Set([
  'schemaVersion', 'enemyCount', 'matchSeed', 'authorityStartTick',
]);
const VERIFICATION_OPTION_KEYS = new Set(['schemaVersion', 'matchSeed', 'enemyCounts']);
const RUN_KEYS = new Set(['authorityStartTick']);
const PREPARE_KEYS = new Set(['playerInputFrame']);
const MODE_RESOLUTION_KEYS = new Set([
  'tick', 'commands', 'modeProjection', 'modeState', 'modeResult',
]);
const SURVIVAL_COMMAND_KEYS = Object.freeze({
  'count-player-fall': new Set([
    'kind', 'participantId', 'fallCount', 'terminalFallCount', 'terminal',
  ]),
  'schedule-player-respawn': new Set([
    'kind', 'participantId', 'readyTick', 'anchorId', 'protectionTicks',
  ]),
  'respawn-player': new Set([
    'kind', 'participantId', 'anchorId', 'protectionTicks',
  ]),
  'change-enemy-slot': new Set([
    'kind', 'participantId', 'slotId', 'previousGeneration', 'generation',
    'active', 'anchorId', 'reason',
  ]),
  'end-survival': new Set(['kind', 'result']),
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
  'executionTiming',
  'readFrame', 'readFrameAudit', 'stateHash', 'paused', 'supplyFactSequence',
  'participantStates', 'evidence',
  'physicsCheckpoint', 'movementCheckpoint', 'ruleCheckpoint', 'timelineSnapshot',
  'controllerCheckpoints', 'feedbackCheckpoint', 'feedbackDirectionCheckpoint',
  'checkpointIdentityHash',
]);
const AUTHORITY_CHECKPOINT_CORE_KEYS = new Set(
  [...AUTHORITY_CHECKPOINT_KEYS].filter((key) => key !== 'checkpointIdentityHash'),
);
const AUTHORITY_PARTICIPANT_STATE_KEYS = new Set([
  'participantId', 'role', 'slotId', 'active', 'slotGeneration', 'respawnReadyTick',
  'invulnerableTicks', 'hitstunTicks', 'lastHitBy', 'lastHitTick', 'fallCount',
  'lastSupportSurfaceId', 'currentSegmentId',
]);
const AUTHORITY_EVIDENCE_KEYS = new Set([
  'supplySpawnedCount', 'supplyExpiredCount', 'supplyPickedUpCount',
  'supplyReplacementCount', 'firstObservedSpawnTick', 'firstObservedExpiryTick',
  'firstObservedPickupTick', 'firstObservedReplacementTick', 'observedSurvivalLevels',
  'v2ObservationCount', 'unarmedVisibleSupplyObservationCount',
  'heldEquipmentObservationCount', 'botInputFrameCount', 'botPrimaryPressCount',
  'actionStartedCount', 'hitCount', 'impulseCount', 'usedRuntimeEquipmentDefinitionIds',
  'playerFallTicks', 'enemyFallCount', 'enemyReactivationCount',
  'maximumActiveEnemyCount',
]);
const AUTHORITY_CONTROLLER_CHECKPOINT_KEYS = new Set([
  'participantId', 'behaviorSeed', 'checkpoint',
]);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;

const MAP = ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.mapDefinition;
const ROUTE = ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.routeDefinition;
export interface SurvivalMapContext {
  readonly mapDefinition: MapDefinition;
  readonly routeDefinition: KzRouteDefinitionV2;
  readonly anchorById: ReadonlyMap<string, KzRouteAnchorV2>;
  readonly segmentById: ReadonlyMap<string, KzRouteSegmentV2>;
  readonly segmentBySurfaceId: ReadonlyMap<string, KzRouteSegmentV2>;
}

function createSurvivalMapContext(
  content: Readonly<{
    readonly mapDefinition: MapDefinition;
    readonly routeDefinition: KzRouteDefinitionV2;
  }>,
): SurvivalMapContext {
  return Object.freeze({
    mapDefinition: content.mapDefinition,
    routeDefinition: content.routeDefinition,
    anchorById: new Map(content.routeDefinition.anchors.map((anchorValue) => (
      [anchorValue.id, anchorValue] as const
    ))),
    segmentById: new Map(content.routeDefinition.segments.map((segment) => (
      [segment.id, segment] as const
    ))),
    segmentBySurfaceId: new Map(content.routeDefinition.segments.flatMap((segment) => (
      segment.surfaceIds.map((surfaceId) => [surfaceId, segment] as const)
    ))),
  });
}

const PLAYABLE_SURVIVAL_MAP_CONTEXTS = Object.freeze([
  createSurvivalMapContext(ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1),
  createSurvivalMapContext(ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_V1),
]);
const BASE_SURVIVAL_MAP_CONTEXT = PLAYABLE_SURVIVAL_MAP_CONTEXTS[0]!;
const PLAYER_CHARACTER = ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1;
const ENEMY_CHARACTER = ARENA_V2_SURVIVAL_ENEMY_FAMILY_CHARACTER_DEFINITION_CANDIDATE_V1;
const ENEMY_PROFILE = createCharacterPhysicsProfile(ENEMY_CHARACTER);
const CATALOG = ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1;
const PRESSURE = ARENA_V2_SURVIVAL_PRESSURE_POLICY_DEFINITION_CANDIDATE_V1;

type SurvivalWeaponPoolCandidateV1 = ArenaV2SurvivalRegisteredWeaponPoolCandidateV1
  | typeof ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1;

type EnemyCountV1 = typeof ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_ENEMY_COUNTS_V1[number];
type SurvivalModeResultV3 = Extract<ModeResultV3Payload, { readonly kind: 'survival' }>;

export const ARENA_SURVIVAL_SHARED_WORLD_EXECUTION_TIMING_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_SURVIVAL_SHARED_WORLD_EXECUTION_PURPOSE_V1 = Object.freeze({
  INTERACTIVE_PRODUCT_CANDIDATE: 'interactive-product-candidate',
  VERIFICATION_SCENARIO: 'verification-scenario',
} as const);

export const ARENA_SURVIVAL_UNRESOLVED_INTERACTIVE_LOCAL_HARD_LIMITS_CANDIDATE_V1 =
  Object.freeze(ARENA_V2_SURVIVAL_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V2.variants.map(
    (variant) => {
      if (variant.selector.kind !== 'survival-enemy-count') {
        throw new RangeError('Arena Survival Timeline产品提案selector漂移。');
      }
      return Object.freeze({
        enemyCount: variant.selector.enemyCount,
        hardLimitActiveTicks: variant.hardLimitActiveTicks,
      });
    },
  ));

type ArenaSurvivalSharedWorldExecutionPurposeV1 =
  typeof ARENA_SURVIVAL_SHARED_WORLD_EXECUTION_PURPOSE_V1[keyof
    typeof ARENA_SURVIVAL_SHARED_WORLD_EXECUTION_PURPOSE_V1];

export interface ArenaSurvivalSharedWorldExecutionTimingCandidateV1 {
  readonly schemaVersion:
    typeof ARENA_SURVIVAL_SHARED_WORLD_EXECUTION_TIMING_V1_SCHEMA_VERSION;
  readonly purpose: ArenaSurvivalSharedWorldExecutionPurposeV1;
  readonly enemyCount: EnemyCountV1;
  readonly initialPlayerProtectionTicks: number;
  readonly interactiveLocalHardLimitActiveTicks: number;
  readonly scenarioFallDriveStartTick: number | null;
  readonly verificationScenarioMaximumTick: number | null;
  readonly verificationPressurePolicyContentHash: string | null;
  readonly contentHash: string;
}

export function createArenaSurvivalTimelineRuntimeMirrorCandidateV1(
  enemyCountValue: unknown,
) {
  const timing = createArenaSurvivalInteractiveExecutionTimingCandidateV1(enemyCountValue);
  return Object.freeze({
    preparingTicks: 0,
    hardLimitActiveTicks: timing.interactiveLocalHardLimitActiveTicks,
    suddenDeathStartActiveTick: null,
  });
}

function orderedPressureSlotEntries(
  pressurePolicy: SurvivalPressurePolicyDefinition,
) {
  const entriesById = new Map(pressurePolicy.slotEntries.map((entry) => [entry.slotId, entry]));
  return Object.freeze(pressurePolicy.slotActivationOrder.map((slotId) => {
    const entry = entriesById.get(slotId);
    if (entry === undefined) {
      throw new RangeError(`Arena Survival pressure激活顺序缺少slot ${slotId} Definition。`);
    }
    return entry;
  }));
}

export interface ArenaSurvivalSharedWorldAuthorityScenarioOptionsV1 {
  readonly schemaVersion:
    typeof ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_V1_SCHEMA_VERSION;
  readonly enemyCount: EnemyCountV1;
  readonly matchSeed: number;
  readonly authorityStartTick: 0;
}

export interface ArenaSurvivalSharedWorldAuthorityVerificationOptionsV1 {
  readonly schemaVersion:
    typeof ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_V1_SCHEMA_VERSION;
  readonly matchSeed: number;
  readonly enemyCounts: readonly [1, 4, 8, 12, 16];
}

export interface ArenaSurvivalSharedWorldAuthorityScenarioReportV1 {
  readonly id: string;
  readonly enemyCount: EnemyCountV1;
  readonly participantCount: number;
  readonly participantIds: readonly string[];
  readonly matchSeed: number;
  readonly behaviorSeeds: readonly Readonly<{
    readonly participantId: string;
    readonly seed: number;
  }>[];
  readonly configuredEnemyCount: number;
  readonly maximumActiveEnemyCount: number;
  readonly pressureTargetReached: boolean;
  readonly executedTicks: number;
  readonly firstSpawnTick: 1200;
  readonly spawnIntervalTicks: 1200;
  readonly spawnCountPerWave: 3;
  readonly unpickedLifetimeTicks: 600;
  readonly supplySpawnedCount: number;
  readonly supplyExpiredCount: number;
  readonly supplyPickedUpCount: number;
  readonly supplyReplacementCount: number;
  readonly firstObservedSpawnTick: number | null;
  readonly firstObservedExpiryTick: number | null;
  readonly firstObservedPickupTick: number | null;
  readonly firstObservedReplacementTick: number | null;
  readonly observedSurvivalLevels: readonly number[];
  readonly v2ObservationCount: number;
  readonly unarmedVisibleSupplyObservationCount: number;
  readonly heldEquipmentObservationCount: number;
  readonly botInputFrameCount: number;
  readonly botPrimaryPressCount: number;
  readonly controllerWritesOnlyInputFrame: true;
  readonly actionStartedCount: number;
  readonly hitCount: number;
  readonly impulseCount: number;
  readonly usedRuntimeEquipmentDefinitionIds: readonly string[];
  readonly playerFallTicks: readonly [number, number];
  readonly enemyFallCount: number;
  readonly enemyReactivationCount: number;
  readonly terminalPostFrameTick: number;
  readonly modeResult: DeepReadonly<SurvivalModeResultV3> & Readonly<{
    readonly reason: 'terminal-player-fall';
  }>;
  readonly participantEquipmentUsage:
    DeepReadonly<readonly ParticipantEquipmentUsageV3[]>;
  readonly participantEquipmentUsageAllowedCollectionEquipmentDefinitionIds:
    readonly string[];
  readonly participantEquipmentUsageIdentityHash: string;
  readonly participantEquipmentUsageOwnership: Readonly<{
    readonly canonicalProducer:
      'arena-contracts.createParticipantEquipmentUsageV3FromEvents';
    readonly source: 'replay-v6-action-started-events';
    readonly productResultOwner: 'ProductMatchResultV3';
    readonly modeResultOwnsUsage: false;
    readonly learningVerification: 'recomputed-from-replay-v6';
  }>;
  readonly replayEventCount: number;
  readonly replayInputFrameCount: number;
  readonly feedbackOutcomeWindowTicks:
    typeof ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1;
  readonly fullWorldCheckpointRestoreCount: 1;
  readonly fullWorldCheckpointRestoredAtTick: number;
  readonly runtimeCheckpointV3RestoreIdentityHash: string;
  readonly feedbackCheckpointRestoreIdentityHash: string;
  readonly finalHash: string;
  readonly replayIdentityHash: string;
  readonly retainedResourceCountAfterDestroy: 0;
  readonly deferredGap: readonly Readonly<{
    readonly id: 'deferred-runtime-validation';
    readonly status: 'deferred';
    readonly reason: string;
  }>[];
  readonly resultHash: string;
}

export interface ArenaSurvivalSharedWorldAuthorityVerificationReportV1 {
  readonly schemaVersion:
    typeof ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_V1_SCHEMA_VERSION;
  readonly candidateStatus:
    typeof ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_V1_CANDIDATE_STATUS;
  readonly hardGate: false;
  readonly defaultRegistryWired: false;
  readonly defaultCompositionWired: false;
  readonly defaultEntryWired: false;
  readonly validationStatus: 'not-run';
  readonly usesArenaV1Experiment: false;
  readonly usesSingleSharedTickAuthority: true;
  readonly usesP4SupplyTimeline: true;
  readonly usesObservationV2: true;
  readonly usesControllerV2InputFramesOnly: true;
  readonly usesSharedRuleMovementPhysics: true;
  readonly usesRealKillYFacts: true;
  readonly usesModeMatchRuntimeV6: true;
  readonly tickContract: 'T-events-to-T-plus-1-post-frame';
  readonly enemyCounts: readonly [1, 4, 8, 12, 16];
  readonly mapDefinitionId: string;
  readonly routeDefinitionId: string;
  readonly pressurePolicyDefinitionId: string;
  readonly tierPolicyDefinitionId: string;
  readonly scenarios: readonly ArenaSurvivalSharedWorldAuthorityScenarioReportV1[];
  readonly resultHash: string;
}

export interface ArenaSurvivalSharedWorldParticipantStateCheckpointV1 {
  readonly participantId: string;
  readonly role: 'player' | 'enemy';
  readonly slotId: string | null;
  active: boolean;
  slotGeneration: number;
  respawnReadyTick: number | null;
  invulnerableTicks: number;
  hitstunTicks: number;
  lastHitBy: string | null;
  lastHitTick: number;
  fallCount: number;
  lastSupportSurfaceId: string | null;
  currentSegmentId: string;
}

type MutableParticipantState = ArenaSurvivalSharedWorldParticipantStateCheckpointV1;

interface MutableEvidence {
  supplySpawnedCount: number;
  supplyExpiredCount: number;
  supplyPickedUpCount: number;
  supplyReplacementCount: number;
  firstObservedSpawnTick: number | null;
  firstObservedExpiryTick: number | null;
  firstObservedPickupTick: number | null;
  firstObservedReplacementTick: number | null;
  readonly observedSurvivalLevels: Set<number>;
  v2ObservationCount: number;
  unarmedVisibleSupplyObservationCount: number;
  heldEquipmentObservationCount: number;
  botInputFrameCount: number;
  botPrimaryPressCount: number;
  actionStartedCount: number;
  hitCount: number;
  impulseCount: number;
  readonly usedRuntimeEquipmentDefinitionIds: Set<string>;
  readonly playerFallTicks: number[];
  enemyFallCount: number;
  enemyReactivationCount: number;
  maximumActiveEnemyCount: number;
}

export interface ArenaSurvivalSharedAuthorityEvidenceCheckpointV1 {
  readonly supplySpawnedCount: number;
  readonly supplyExpiredCount: number;
  readonly supplyPickedUpCount: number;
  readonly supplyReplacementCount: number;
  readonly firstObservedSpawnTick: number | null;
  readonly firstObservedExpiryTick: number | null;
  readonly firstObservedPickupTick: number | null;
  readonly firstObservedReplacementTick: number | null;
  readonly observedSurvivalLevels: readonly number[];
  readonly v2ObservationCount: number;
  readonly unarmedVisibleSupplyObservationCount: number;
  readonly heldEquipmentObservationCount: number;
  readonly botInputFrameCount: number;
  readonly botPrimaryPressCount: number;
  readonly actionStartedCount: number;
  readonly hitCount: number;
  readonly impulseCount: number;
  readonly usedRuntimeEquipmentDefinitionIds: readonly string[];
  readonly playerFallTicks: readonly number[];
  readonly enemyFallCount: number;
  readonly enemyReactivationCount: number;
  readonly maximumActiveEnemyCount: number;
}

export interface ArenaSurvivalSharedWorldAuthorityCheckpointV3 {
  readonly schemaVersion: 3;
  readonly configHash: string;
  readonly matchSeed: number;
  readonly localParticipantId: string;
  readonly participantIds: readonly string[];
  readonly executionTiming: ArenaSurvivalSharedWorldExecutionTimingCandidateV1;
  readonly readFrame: DeepReadonly<MatchReadFrameV3>;
  readonly readFrameAudit: MatchReadFrameV3AuditOptions;
  readonly stateHash: string;
  readonly paused: boolean;
  readonly supplyFactSequence: number;
  readonly participantStates:
    readonly DeepReadonly<ArenaSurvivalSharedWorldParticipantStateCheckpointV1>[];
  readonly evidence: DeepReadonly<ArenaSurvivalSharedAuthorityEvidenceCheckpointV1>;
  readonly physicsCheckpoint: LightweightPhysicsCheckpointV1;
  readonly movementCheckpoint: MovementSystemCheckpointV1;
  readonly ruleCheckpoint: ArenaRuleEngineCheckpointV1;
  readonly timelineSnapshot: EquipmentSupplyTimelineSnapshot;
  readonly controllerCheckpoints: readonly Readonly<{
    readonly participantId: string;
    readonly behaviorSeed: number;
    readonly checkpoint: SurvivalEnemyControllerCheckpointV2;
  }>[];
  readonly feedbackCheckpoint: MatchCoreWeaponFeedbackAdapterCheckpointV1;
  readonly feedbackDirectionCheckpoint: MatchCoreWeaponFeedbackDirectionCheckpointV2;
  readonly checkpointIdentityHash: string;
}

type WeaponFeedbackSourceEventV1 = Readonly<Record<string, unknown> & {
  readonly id: string;
  readonly sequence: number;
  readonly tick: number;
  readonly type: 'ActionStarted' | 'ActionCommitmentCancelled' | 'ActionInterrupted'
    | 'HitResolved' | 'KnockbackApplied' | 'PlayerEliminated';
}>;

interface PreparedTickV1 {
  readonly tick: number;
  readonly playerInputHash: string;
  readonly inputFrames: readonly ArenaInputFrame[];
  readonly inputHash: string;
  readonly supplyResult: ReturnType<EquipmentSupplyTimelineSystem['step']>;
  readonly supplyFacts: readonly ArenaSupplyAuthorityFactV1[];
  readonly interruptedEquipmentActions: readonly Readonly<{
    readonly participantId: string;
    readonly actionDefinitionId: string;
  }>[];
}

interface SupplyFactIdentityV1 {
  readonly supplyDefinitionId: string;
  readonly supplyId: string;
  readonly equipmentInstanceId: string;
  readonly runtimeEquipmentDefinitionId: string;
  readonly collectionEquipmentDefinitionId: string;
  readonly survivalLevel: number;
}

interface AuthorityResourcesV1 {
  readonly physics: CheckpointableLightweightPhysicsWorldV1;
  readonly movement: MovementSystem;
  readonly engine: ArenaRuleEngineContract;
  readonly equipment: EquipmentSystem;
  readonly timeline: EquipmentSupplyTimelineSystem;
}

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

function survivalCommandOrder(command: SurvivalModeCommandV1): number {
  if (command.kind === 'change-enemy-slot') return command.active ? 4 : 0;
  if (command.kind === 'count-player-fall') return 1;
  if (command.kind === 'schedule-player-respawn') return 2;
  if (command.kind === 'respawn-player') return 3;
  return 5;
}

function assertSurvivalModeCommandOrder(commands: readonly SurvivalModeCommandV1[]): void {
  let previousOrder = -1;
  let previousFallenEnemyParticipantId: string | null = null;
  for (const command of commands) {
    const order = survivalCommandOrder(command);
    if (order < previousOrder) {
      throw new RangeError('P3 Survival mode commands未按冻结生命周期阶段排序。');
    }
    if (command.kind === 'change-enemy-slot' && !command.active) {
      if (
        previousFallenEnemyParticipantId !== null
        && command.participantId <= previousFallenEnemyParticipantId
      ) {
        throw new RangeError('P3 Survival enemy fall commands未按participantId稳定排序。');
      }
      previousFallenEnemyParticipantId = command.participantId;
    }
    previousOrder = order;
  }
}

function validateSurvivalModeCommands(value: unknown): readonly SurvivalModeCommandV1[] {
  if (!Array.isArray(value)) throw new TypeError('P3 Survival mode commands必须是数组。');
  value.forEach((entry, index) => {
    const name = `P3 Survival mode commands[${index}]`;
    const command = assertPlainRecord(entry, name);
    const kind = command.kind;
    if (typeof kind !== 'string' || !Object.hasOwn(SURVIVAL_COMMAND_KEYS, kind)) {
      throw new RangeError(`${name}.kind不受支持。`);
    }
    exactRecord(
      command,
      SURVIVAL_COMMAND_KEYS[kind as keyof typeof SURVIVAL_COMMAND_KEYS],
      name,
    );
    if (kind === 'end-survival') {
      const result = createModeResultV3Payload(command.result);
      if (result.kind !== 'survival') {
        throw new RangeError(`${name}.result必须是Survival。`);
      }
      return;
    }
    assertNonEmptyString(command.participantId, `${name}.participantId`);
    if (kind === 'count-player-fall') {
      assertIntegerAtLeast(command.fallCount, 0, `${name}.fallCount`);
      if (command.terminalFallCount !== 2 || typeof command.terminal !== 'boolean') {
        throw new RangeError(`${name}掉落终局字段不一致。`);
      }
    } else if (kind === 'schedule-player-respawn') {
      assertIntegerAtLeast(command.readyTick, 0, `${name}.readyTick`);
      assertNonEmptyString(command.anchorId, `${name}.anchorId`);
      assertIntegerAtLeast(command.protectionTicks, 0, `${name}.protectionTicks`);
    } else if (kind === 'respawn-player') {
      assertNonEmptyString(command.anchorId, `${name}.anchorId`);
      assertIntegerAtLeast(command.protectionTicks, 0, `${name}.protectionTicks`);
    } else {
      assertNonEmptyString(command.slotId, `${name}.slotId`);
      assertIntegerAtLeast(command.previousGeneration, 0, `${name}.previousGeneration`);
      assertIntegerAtLeast(command.generation, 0, `${name}.generation`);
      if (typeof command.active !== 'boolean') throw new TypeError(`${name}.active必须是布尔值。`);
      if (command.anchorId !== null) assertNonEmptyString(command.anchorId, `${name}.anchorId`);
      if (
        command.reason !== 'pressure-stage'
        && command.reason !== 'reactivation-ready'
        && command.reason !== 'fell'
      ) throw new RangeError(`${name}.reason不受支持。`);
    }
  });
  const commands = value as readonly SurvivalModeCommandV1[];
  assertSurvivalModeCommandOrder(commands);
  return commands;
}

function checkpointHash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name}必须是8位小写十六进制hash。`);
  }
  return value;
}

function checkpointInteger(value: unknown, minimum: number, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new RangeError(`${name}必须是大于等于${minimum}的安全整数。`);
  }
  return value as number;
}

function nullableCheckpointTick(value: unknown, name: string): number | null {
  return value === null ? null : checkpointInteger(value, 0, name);
}

function sortedCheckpointStrings(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${name}必须是数组。`);
  const result = value.map((entry, index) => {
    if (typeof entry !== 'string' || entry.length === 0) {
      throw new TypeError(`${name}[${index}]必须是非空字符串。`);
    }
    return entry;
  });
  for (let index = 1; index < result.length; index += 1) {
    if (result[index - 1]! >= result[index]!) {
      throw new RangeError(`${name}必须唯一稳定升序。`);
    }
  }
  return Object.freeze(result);
}

function sortedCheckpointNumbers(value: unknown, name: string): readonly number[] {
  if (!Array.isArray(value)) throw new TypeError(`${name}必须是数组。`);
  const result = value.map((entry, index) => checkpointInteger(entry, 0, `${name}[${index}]`));
  for (let index = 1; index < result.length; index += 1) {
    if (result[index - 1]! >= result[index]!) {
      throw new RangeError(`${name}必须唯一稳定升序。`);
    }
  }
  return Object.freeze(result);
}

function normalizeAuthorityParticipantStates(
  value: unknown,
  config: ArenaMatchConfigV6,
  mapContext: SurvivalMapContext = BASE_SURVIVAL_MAP_CONTEXT,
): readonly ArenaSurvivalSharedWorldParticipantStateCheckpointV1[] {
  if (!Array.isArray(value) || value.length !== config.participantAssignments.length) {
    throw new RangeError('P3 Survival authority checkpoint participantStates必须完整覆盖roster。');
  }
  const assignmentById = new Map(config.participantAssignments.map((assignment) => (
    [assignment.participantId, assignment] as const
  )));
  const states = value.map((entry, index) => {
    const name = `P3 Survival authority checkpoint participantStates[${index}]`;
    exactRecord(entry, AUTHORITY_PARTICIPANT_STATE_KEYS, name);
    if (typeof entry.participantId !== 'string' || entry.participantId.length === 0) {
      throw new TypeError(`${name}.participantId无效。`);
    }
    const assignment = assignmentById.get(entry.participantId);
    if (
      assignment === undefined
      || entry.role !== assignment.modeRole
      || entry.slotId !== assignment.slotId
    ) throw new RangeError(`${name}与config roster身份漂移。`);
    if (typeof entry.active !== 'boolean') throw new TypeError(`${name}.active必须是布尔值。`);
    const lastHitBy = entry.lastHitBy;
    if (lastHitBy !== null && !assignmentById.has(lastHitBy as string)) {
      throw new RangeError(`${name}.lastHitBy不属于roster。`);
    }
    const lastSupportSurfaceId = entry.lastSupportSurfaceId;
    if (
      lastSupportSurfaceId !== null
      && !mapContext.mapDefinition.arena.surfaces.some(({ id }) => id === lastSupportSurfaceId)
    ) throw new RangeError(`${name}.lastSupportSurfaceId未知。`);
    if (typeof entry.currentSegmentId !== 'string') {
      throw new TypeError(`${name}.currentSegmentId无效。`);
    }
    requireSegment(entry.currentSegmentId, mapContext);
    return Object.freeze({
      participantId: entry.participantId,
      role: entry.role as 'player' | 'enemy',
      slotId: entry.slotId as string | null,
      active: entry.active,
      slotGeneration: checkpointInteger(entry.slotGeneration, 0, `${name}.slotGeneration`),
      respawnReadyTick: nullableCheckpointTick(entry.respawnReadyTick, `${name}.respawnReadyTick`),
      invulnerableTicks: checkpointInteger(entry.invulnerableTicks, 0, `${name}.invulnerableTicks`),
      hitstunTicks: checkpointInteger(entry.hitstunTicks, 0, `${name}.hitstunTicks`),
      lastHitBy: lastHitBy as string | null,
      lastHitTick: checkpointInteger(entry.lastHitTick, -1, `${name}.lastHitTick`),
      fallCount: checkpointInteger(entry.fallCount, 0, `${name}.fallCount`),
      lastSupportSurfaceId: lastSupportSurfaceId as string | null,
      currentSegmentId: entry.currentSegmentId,
    });
  }).sort((left, right) => compareText(left.participantId, right.participantId));
  const expectedIds = [...assignmentById.keys()].sort(compareText);
  if (states.some((state, index) => state.participantId !== expectedIds[index])) {
    throw new RangeError('P3 Survival authority checkpoint participantStates身份不完整。');
  }
  return Object.freeze(states);
}

function assertAuthorityCheckpointParticipantClosure(
  participantStates: readonly ArenaSurvivalSharedWorldParticipantStateCheckpointV1[],
  readFrame: DeepReadonly<MatchReadFrameV3>,
  evidence: ArenaSurvivalSharedAuthorityEvidenceCheckpointV1,
): void {
  const world = readFrame.worldSnapshot;
  if (world.modeProjection.state.kind !== 'survival') {
    throw new RangeError('P3 Survival authority checkpoint缺少Survival Projection。');
  }
  const projection = world.modeProjection.state;
  const publicById = new Map(world.participants.map((participant) => (
    [participant.id, participant] as const
  )));
  const enemySlotById = new Map(projection.enemySlots.map((slot) => (
    [slot.participantId, slot] as const
  )));
  let enemyFallCount = 0;
  let pendingEnemyReactivationCount = 0;
  for (const state of participantStates) {
    const participant = publicById.get(state.participantId);
    if (
      participant === undefined
      || participant.deaths !== state.fallCount
      || participant.hitstunTicks !== state.hitstunTicks
      || participant.invulnerableTicks !== state.invulnerableTicks
      || participant.lastHitBy !== state.lastHitBy
      || participant.lastHitTick !== state.lastHitTick
    ) {
      throw new RangeError('P3 Survival authority checkpoint participant私有状态与公开Frame不闭合。');
    }
    if (state.role === 'player') {
      if (
        state.participantId !== projection.playerParticipantId
        || state.fallCount !== projection.fallCount
      ) {
        throw new RangeError('P3 Survival authority checkpoint player与Projection不闭合。');
      }
      if (world.result === null) {
        const expectedStatus = state.active ? 'active' : 'respawning';
        const expectedRespawnTicks = state.respawnReadyTick === null
          ? 0
          : Math.max(0, state.respawnReadyTick - world.tick);
        if (
          participant.status !== expectedStatus
          || (state.active && state.respawnReadyTick !== null)
          || (!state.active && state.respawnReadyTick === null)
          || participant.respawnTicks !== expectedRespawnTicks
        ) {
          throw new RangeError('P3 Survival authority checkpoint player lifecycle不闭合。');
        }
      } else {
        if (
          world.result.kind !== 'survival'
          || state.active
          || state.respawnReadyTick !== null
          || participant.respawnTicks !== 0
          || participant.status !== (
            world.result.reason === 'terminal-player-fall' ? 'eliminated' : 'active'
          )
        ) {
          throw new RangeError('P3 Survival authority checkpoint terminal player不闭合。');
        }
      }
    } else {
      const slot = enemySlotById.get(state.participantId);
      enemyFallCount += state.fallCount;
      if (!state.active && state.respawnReadyTick !== null) {
        pendingEnemyReactivationCount += 1;
      }
      if (
        slot === undefined
        || slot.slotId !== state.slotId
        || slot.active !== state.active
        || slot.generation !== state.slotGeneration
        || participant.status !== (state.active ? 'active' : 'eliminated')
        || participant.respawnTicks !== 0
        || (state.active && state.respawnReadyTick !== null)
      ) {
        throw new RangeError('P3 Survival authority checkpoint enemy与Projection/Frame不闭合。');
      }
    }
  }
  if (
    publicById.size !== participantStates.length
    || enemySlotById.size !== participantStates.length - 1
    || enemyFallCount !== evidence.enemyFallCount
    || evidence.enemyFallCount
      !== evidence.enemyReactivationCount + pendingEnemyReactivationCount
  ) {
    throw new RangeError('P3 Survival authority checkpoint roster或enemy fall evidence不闭合。');
  }
}

function normalizeAuthorityEvidence(
  value: unknown,
): ArenaSurvivalSharedAuthorityEvidenceCheckpointV1 {
  exactRecord(value, AUTHORITY_EVIDENCE_KEYS, 'P3 Survival authority checkpoint evidence');
  const source = value;
  const count = (key: keyof ArenaSurvivalSharedAuthorityEvidenceCheckpointV1): number => (
    checkpointInteger(source[key], 0, `P3 Survival authority checkpoint evidence.${key}`)
  );
  return Object.freeze({
    supplySpawnedCount: count('supplySpawnedCount'),
    supplyExpiredCount: count('supplyExpiredCount'),
    supplyPickedUpCount: count('supplyPickedUpCount'),
    supplyReplacementCount: count('supplyReplacementCount'),
    firstObservedSpawnTick: nullableCheckpointTick(source.firstObservedSpawnTick, 'evidence.firstObservedSpawnTick'),
    firstObservedExpiryTick: nullableCheckpointTick(source.firstObservedExpiryTick, 'evidence.firstObservedExpiryTick'),
    firstObservedPickupTick: nullableCheckpointTick(source.firstObservedPickupTick, 'evidence.firstObservedPickupTick'),
    firstObservedReplacementTick: nullableCheckpointTick(source.firstObservedReplacementTick, 'evidence.firstObservedReplacementTick'),
    observedSurvivalLevels: sortedCheckpointNumbers(source.observedSurvivalLevels, 'evidence.observedSurvivalLevels'),
    v2ObservationCount: count('v2ObservationCount'),
    unarmedVisibleSupplyObservationCount: count('unarmedVisibleSupplyObservationCount'),
    heldEquipmentObservationCount: count('heldEquipmentObservationCount'),
    botInputFrameCount: count('botInputFrameCount'),
    botPrimaryPressCount: count('botPrimaryPressCount'),
    actionStartedCount: count('actionStartedCount'),
    hitCount: count('hitCount'),
    impulseCount: count('impulseCount'),
    usedRuntimeEquipmentDefinitionIds: sortedCheckpointStrings(
      source.usedRuntimeEquipmentDefinitionIds,
      'evidence.usedRuntimeEquipmentDefinitionIds',
    ),
    playerFallTicks: Array.isArray(source.playerFallTicks)
      ? Object.freeze(source.playerFallTicks.map((tick, index) => (
        checkpointInteger(tick, 0, `evidence.playerFallTicks[${index}]`)
      )))
      : (() => { throw new TypeError('evidence.playerFallTicks必须是数组。'); })(),
    enemyFallCount: count('enemyFallCount'),
    enemyReactivationCount: count('enemyReactivationCount'),
    maximumActiveEnemyCount: count('maximumActiveEnemyCount'),
  });
}

function normalizeAuthorityCheckpoint(
  value: unknown,
  expected: Readonly<{
    readonly config: ArenaMatchConfigV6;
    readonly configHash: string;
    readonly matchSeed: number;
    readonly localParticipantId: string;
    readonly participantIds: readonly string[];
    readonly enemyIds: readonly string[];
    readonly behaviorSeeds: ReadonlyMap<string, number>;
    readonly mapContext: SurvivalMapContext;
    readonly executionTiming: ArenaSurvivalSharedWorldExecutionTimingCandidateV1;
    readonly pressurePolicy: SurvivalPressurePolicyDefinition;
  }>,
): ArenaSurvivalSharedWorldAuthorityCheckpointV3 {
  const source = cloneFrozenData(value, 'P3 Survival authority checkpoint');
  exactRecord(source, AUTHORITY_CHECKPOINT_KEYS, 'P3 Survival authority checkpoint');
  if (source.schemaVersion !== 3) {
    throw new RangeError('P3 Survival authority checkpoint.schemaVersion必须是3。');
  }
  const identityHash = checkpointHash(
    source.checkpointIdentityHash,
    'P3 Survival authority checkpoint.checkpointIdentityHash',
  );
  const core = Object.fromEntries([...AUTHORITY_CHECKPOINT_CORE_KEYS].map((key) => (
    [key, source[key]]
  )));
  if (
    createDeterministicDataHash(core, 'P3 Survival authority checkpoint identity')
    !== identityHash
  ) throw new RangeError('P3 Survival authority checkpoint identity hash漂移。');
  if (
    source.configHash !== expected.configHash
    || source.matchSeed !== expected.matchSeed
    || source.localParticipantId !== expected.localParticipantId
  ) throw new RangeError('P3 Survival authority checkpoint match身份漂移。');
  const executionTiming = validateArenaSurvivalSharedWorldExecutionTimingCandidateV1(
    source.executionTiming,
    expected.pressurePolicy,
  );
  if (!sameData(
    executionTiming,
    expected.executionTiming,
    'P3 Survival authority checkpoint execution timing',
  )) throw new RangeError('P3 Survival authority checkpoint executionTiming漂移。');
  const participantIds = sortedCheckpointStrings(
    source.participantIds,
    'P3 Survival authority checkpoint.participantIds',
  );
  if (
    participantIds.length !== expected.participantIds.length
    || participantIds.some((participantId, index) => participantId !== expected.participantIds[index])
  ) throw new RangeError('P3 Survival authority checkpoint participantIds漂移。');
  if (typeof source.paused !== 'boolean') {
    throw new TypeError('P3 Survival authority checkpoint.paused必须是布尔值。');
  }
  const stateHash = checkpointHash(source.stateHash, 'P3 Survival authority checkpoint.stateHash');
  const readFrameAudit = source.readFrameAudit as MatchReadFrameV3AuditOptions;
  const readFrame = createMatchReadFrameV3Audit(source.readFrame, readFrameAudit);
  const world = readFrame.worldSnapshot;
  if (
    world.configHash !== expected.configHash
    || world.matchSeed !== expected.matchSeed
    || world.physicsBackendVersion !== PHYSICS_BACKEND_VERSION
    || world.modeDefinitionId !== expected.config.modeDefinitionId
    || world.phase !== 'running'
    || world.result !== null
    || world.modeProjection.state.kind !== 'survival'
  ) throw new RangeError('P3 Survival authority checkpoint只接受运行中同局Survival Frame。');
  const participantStates = normalizeAuthorityParticipantStates(
    source.participantStates,
    expected.config,
    expected.mapContext,
  );
  const evidence = normalizeAuthorityEvidence(source.evidence);
  assertAuthorityCheckpointParticipantClosure(participantStates, readFrame, evidence);
  if (!Array.isArray(source.controllerCheckpoints)) {
    throw new TypeError('P3 Survival authority checkpoint.controllerCheckpoints必须是数组。');
  }
  const controllerCheckpoints = Object.freeze(source.controllerCheckpoints.map((entry, index) => {
    const name = `P3 Survival authority checkpoint.controllerCheckpoints[${index}]`;
    exactRecord(entry, AUTHORITY_CONTROLLER_CHECKPOINT_KEYS, name);
    if (typeof entry.participantId !== 'string' || !expected.enemyIds.includes(entry.participantId)) {
      throw new RangeError(`${name}.participantId不是enemy。`);
    }
    const behaviorSeed = checkpointInteger(entry.behaviorSeed, 0, `${name}.behaviorSeed`);
    if (behaviorSeed > 0xffff_ffff || behaviorSeed !== expected.behaviorSeeds.get(entry.participantId)) {
      throw new RangeError(`${name}.behaviorSeed漂移。`);
    }
    const checkpoint = cloneFrozenData(
      entry.checkpoint,
      `${name}.checkpoint`,
    ) as DeepReadonly<SurvivalEnemyControllerCheckpointV2>;
    return Object.freeze({ participantId: entry.participantId, behaviorSeed, checkpoint });
  }).sort((left, right) => compareText(left.participantId, right.participantId)));
  if (
    controllerCheckpoints.length !== expected.enemyIds.length
    || controllerCheckpoints.some((entry, index) => entry.participantId !== expected.enemyIds[index])
  ) throw new RangeError('P3 Survival authority checkpoint controller roster不完整。');
  const feedbackCheckpoint = validateMatchCoreWeaponFeedbackAdapterCheckpointV1(
    source.feedbackCheckpoint,
  );
  const feedbackDirectionCheckpoint = validateMatchCoreWeaponFeedbackDirectionCheckpointV2(
    source.feedbackDirectionCheckpoint,
    feedbackCheckpoint,
  );
  const feedbackParticipantIds = expected.config.participantAssignments.map(
    ({ participantId }) => participantId,
  );
  if (
    feedbackCheckpoint.schemaVersion
      !== MATCH_CORE_WEAPON_FEEDBACK_ADAPTER_CHECKPOINT_V1_SCHEMA_VERSION
    || feedbackCheckpoint.tick !== readFrame.worldSnapshot.tick
    || feedbackCheckpoint.participantIds.length !== feedbackParticipantIds.length
    || feedbackCheckpoint.participantIds.some((participantId, index) => (
      participantId !== feedbackParticipantIds[index]
    ))
  ) throw new RangeError('P3 Survival feedback checkpoint与runtime身份不闭合。');
  return Object.freeze({
    schemaVersion: 3 as const,
    configHash: expected.configHash,
    matchSeed: expected.matchSeed,
    localParticipantId: expected.localParticipantId,
    participantIds,
    executionTiming,
    readFrame,
    readFrameAudit,
    stateHash,
    paused: source.paused,
    supplyFactSequence: checkpointInteger(
      source.supplyFactSequence,
      0,
      'P3 Survival authority checkpoint.supplyFactSequence',
    ),
    participantStates,
    evidence,
    physicsCheckpoint: source.physicsCheckpoint as DeepReadonly<LightweightPhysicsCheckpointV1>,
    movementCheckpoint: source.movementCheckpoint as DeepReadonly<MovementSystemCheckpointV1>,
    ruleCheckpoint: source.ruleCheckpoint as DeepReadonly<ArenaRuleEngineCheckpointV1>,
    timelineSnapshot: source.timelineSnapshot as DeepReadonly<EquipmentSupplyTimelineSnapshot>,
    controllerCheckpoints,
    feedbackCheckpoint,
    feedbackDirectionCheckpoint,
    checkpointIdentityHash: identityHash,
  });
}

function sameNumbers(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function enemyParticipantId(index: number): string {
  return `arena-p3-survival-shared-enemy-${String(index + 1).padStart(2, '0')}`;
}

function requireAnchor(
  anchorId: string,
  mapContext: SurvivalMapContext = BASE_SURVIVAL_MAP_CONTEXT,
): KzRouteAnchorV2 {
  const anchor = mapContext.anchorById.get(anchorId);
  if (!anchor) throw new RangeError(`P3 Survival shared authority引用未知anchor ${anchorId}。`);
  return anchor;
}

function requireSegment(
  segmentId: string,
  mapContext: SurvivalMapContext = BASE_SURVIVAL_MAP_CONTEXT,
): KzRouteSegmentV2 {
  const segment = mapContext.segmentById.get(segmentId);
  if (!segment) throw new RangeError(`P3 Survival shared authority引用未知segment ${segmentId}。`);
  return segment;
}

function anchorSpawnPosition(
  anchor: KzRouteAnchorV2,
  profile: Readonly<{ halfHeight: number; radius: number }>,
): Readonly<{ x: number; y: number; z: number }> {
  return Object.freeze({
    x: anchor.position.x,
    y: anchor.position.y + profile.halfHeight + profile.radius,
    z: anchor.position.z,
  });
}

function inactiveEnemyParkingPosition(
  enemyOrdinal: number,
  mapContext: SurvivalMapContext = BASE_SURVIVAL_MAP_CONTEXT,
): Readonly<{
  x: number;
  y: number;
  z: number;
}> {
  return Object.freeze({
    x: 10_000 + enemyOrdinal * 16,
    y: mapContext.mapDefinition.arena.killY - 100 - enemyOrdinal * 16,
    z: -10_000 - enemyOrdinal * 16,
  });
}

function surfaceForPosition(
  position: Readonly<{ x: number; y: number; z: number }>,
  mapContext: SurvivalMapContext = BASE_SURVIVAL_MAP_CONTEXT,
): MapSurfaceDefinition {
  const containing = mapContext.mapDefinition.arena.surfaces.filter((surface) => (
    Math.abs(position.x - surface.center.x) <= surface.halfExtents.x + 1e-6
    && Math.abs(position.z - surface.center.z) <= surface.halfExtents.z + 1e-6
  ));
  const candidates = containing.length > 0
    ? containing
    : mapContext.mapDefinition.arena.surfaces;
  const selected = [...candidates].sort((left, right) => (
    Math.hypot(position.x - left.center.x, position.z - left.center.z)
      - Math.hypot(position.x - right.center.x, position.z - right.center.z)
    || compareText(left.id, right.id)
  ))[0];
  if (!selected) throw new Error('P3 Survival KZ地图缺少surface。');
  return selected;
}

function segmentForPosition(
  position: Readonly<{ x: number; y: number; z: number }>,
  mapContext: SurvivalMapContext = BASE_SURVIVAL_MAP_CONTEXT,
): KzRouteSegmentV2 {
  const surface = surfaceForPosition(position, mapContext);
  const segment = mapContext.segmentBySurfaceId.get(surface.id);
  if (!segment) throw new RangeError(`P3 Survival surface ${surface.id}未归属KZ route segment。`);
  return segment;
}

function segmentForState(
  state: PhysicsCharacterState,
  fallbackSegmentId: string,
  mapContext: SurvivalMapContext = BASE_SURVIVAL_MAP_CONTEXT,
): string {
  if (state.supportSurfaceId === null) return fallbackSegmentId;
  return mapContext.segmentBySurfaceId.get(state.supportSurfaceId)?.id ?? fallbackSegmentId;
}

function closestOwnedAnchor(
  segment: KzRouteSegmentV2,
  position: Readonly<{ x: number; z: number }>,
  mapContext: SurvivalMapContext = BASE_SURVIVAL_MAP_CONTEXT,
): KzRouteAnchorV2 {
  const anchors = mapContext.routeDefinition.anchors.filter(
    (anchorValue) => segment.surfaceIds.includes(anchorValue.surfaceId),
  );
  const selected = [...anchors].sort((left, right) => (
    Math.hypot(left.position.x - position.x, left.position.z - position.z)
      - Math.hypot(right.position.x - position.x, right.position.z - position.z)
    || compareText(left.id, right.id)
  ))[0];
  if (!selected) throw new Error(`${segment.id}缺少归属anchor。`);
  return selected;
}

function createRouteTargets(
  currentSegmentId: string,
  playerSegmentId: string,
  selfPosition: Readonly<{ x: number; y: number; z: number }>,
  mapContext: SurvivalMapContext = BASE_SURVIVAL_MAP_CONTEXT,
) {
  const legalTransitions = mapContext.routeDefinition.survivalLinks
    .filter(({ fromSegmentId }) => fromSegmentId === currentSegmentId)
    .map(({ toSegmentId }) => {
      const anchor = closestOwnedAnchor(
        requireSegment(toSegmentId, mapContext),
        selfPosition,
        mapContext,
      );
      return Object.freeze({
        toSegmentId,
        anchorId: anchor.id,
        traversal: 'jump' as const,
      });
    });
  if (legalTransitions.length === 0) {
    const segment = requireSegment(currentSegmentId, mapContext);
    const anchor = closestOwnedAnchor(segment, selfPosition, mapContext);
    return Object.freeze([Object.freeze({
      segmentId: segment.id,
      anchorId: anchor.id,
      position: anchor.position,
      intent: segment.id === playerSegmentId ? 'pursuit' as const : 'recovery' as const,
      traversal: 'walk' as const,
      priority: segment.id === playerSegmentId ? 100 : 45,
    })]);
  }
  return createKzSurvivalRouteTargetProjectionV1(mapContext.routeDefinition, {
    currentSegmentId,
    playerSegmentId,
    legalTransitions,
  });
}

function runtimeIdentity(runtimeEquipmentDefinitionId: string): Readonly<{
  collectionEquipmentDefinitionId: string;
  runtimeEquipmentDefinitionId: string;
  survivalLevel: number;
}> {
  const variant = CATALOG.runtimeVariants.find(({ equipment }) => (
    equipment.id === runtimeEquipmentDefinitionId
  ));
  if (!variant) {
    throw new RangeError(`P3 Survival未知P4 runtime equipment ${runtimeEquipmentDefinitionId}。`);
  }
  return Object.freeze({
    collectionEquipmentDefinitionId: variant.collectionEquipmentDefinitionId,
    runtimeEquipmentDefinitionId,
    survivalLevel: variant.level,
  });
}

function normalizeUint32(value: unknown, name: string): number {
  const result = assertIntegerAtLeast(value, 0, name);
  if (result > 0xffff_ffff) throw new RangeError(`${name}必须是uint32。`);
  return result;
}

function normalizeEnemyCount(value: unknown, name: string): EnemyCountV1 {
  const result = assertIntegerAtLeast(value, 1, name);
  if (!ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_ENEMY_COUNTS_V1.includes(
    result as EnemyCountV1,
  )) throw new RangeError(`${name}必须是1/4/8/12/16。`);
  return result as EnemyCountV1;
}

function normalizeScenarioOptions(
  value: unknown,
): ArenaSurvivalSharedWorldAuthorityScenarioOptionsV1 {
  const source = cloneFrozenData(value, 'P3 Survival shared scenario options');
  exactRecord(source, SCENARIO_OPTION_KEYS, 'P3 Survival shared scenario options');
  if (source.schemaVersion !== ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_V1_SCHEMA_VERSION) {
    throw new RangeError('P3 Survival shared scenario schemaVersion必须是1。');
  }
  const authorityStartTick = assertIntegerAtLeast(
    source.authorityStartTick,
    0,
    'P3 Survival shared authorityStartTick',
  );
  if (authorityStartTick !== 0) throw new RangeError('P3 Survival shared authority拒绝迟到起点。');
  return Object.freeze({
    schemaVersion: ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_V1_SCHEMA_VERSION,
    enemyCount: normalizeEnemyCount(source.enemyCount, 'P3 Survival shared enemyCount'),
    matchSeed: normalizeUint32(source.matchSeed, 'P3 Survival shared matchSeed'),
    authorityStartTick: 0 as const,
  });
}

function normalizeVerificationOptions(
  value: unknown,
): ArenaSurvivalSharedWorldAuthorityVerificationOptionsV1 {
  const source = cloneFrozenData(value, 'P3 Survival shared verification options');
  exactRecord(source, VERIFICATION_OPTION_KEYS, 'P3 Survival shared verification options');
  if (source.schemaVersion !== ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_V1_SCHEMA_VERSION) {
    throw new RangeError('P3 Survival shared verification schemaVersion必须是1。');
  }
  if (!Array.isArray(source.enemyCounts)) {
    throw new TypeError('P3 Survival shared enemyCounts必须是数组。');
  }
  const counts = source.enemyCounts.map((entry, index) => normalizeEnemyCount(
    entry,
    `P3 Survival shared enemyCounts[${index}]`,
  ));
  if (!sameNumbers(counts, ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_ENEMY_COUNTS_V1)) {
    throw new RangeError('P3 Survival shared enemyCounts必须精确为1/4/8/12/16。');
  }
  return Object.freeze({
    schemaVersion: ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_V1_SCHEMA_VERSION,
    matchSeed: normalizeUint32(source.matchSeed, 'P3 Survival shared matchSeed'),
    enemyCounts: ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_ENEMY_COUNTS_V1,
  });
}

function pressureStagesFor(
  enemyCount: EnemyCountV1,
  pressurePolicy: SurvivalPressurePolicyDefinition = PRESSURE,
) {
  const stages = pressurePolicy.stages.filter(({ desiredActiveEnemySlots }) => (
    desiredActiveEnemySlots <= enemyCount
  ));
  if (stages.at(-1)?.desiredActiveEnemySlots !== enemyCount) {
    throw new Error(`P3 Survival pressure policy无法到达${enemyCount} active enemies。`);
  }
  return Object.freeze(stages.map((stage) => Object.freeze({ ...stage })));
}

function pressureTargetTick(
  enemyCount: EnemyCountV1,
  pressurePolicy: SurvivalPressurePolicyDefinition = PRESSURE,
): number {
  const stage = pressureStagesFor(enemyCount, pressurePolicy).at(-1);
  if (!stage) throw new Error('P3 Survival pressure stage为空。');
  return stage.startActiveTick;
}

function verificationScenarioFallDriveStartTick(
  enemyCount: EnemyCountV1,
  pressurePolicy: SurvivalPressurePolicyDefinition = PRESSURE,
): number {
  return Math.max(
    ARENA_V2_SURVIVAL_SUPPLY_FIRST_SPAWN_TICKS_CANDIDATE_V1
      + ARENA_V2_SURVIVAL_SUPPLY_INTERVAL_TICKS_CANDIDATE_V1
      + FALL_DRIVE_LEAD_TICKS,
    pressureTargetTick(enemyCount, pressurePolicy) + FALL_DRIVE_LEAD_TICKS,
  );
}

function verificationScenarioMaximumTick(
  enemyCount: EnemyCountV1,
  pressurePolicy: SurvivalPressurePolicyDefinition = PRESSURE,
): number {
  return verificationScenarioFallDriveStartTick(enemyCount, pressurePolicy)
    + FALL_COMPLETION_BUDGET_TICKS;
}

function unresolvedInteractiveLocalHardLimitActiveTicks(
  enemyCount: EnemyCountV1,
): number {
  const entry = ARENA_SURVIVAL_UNRESOLVED_INTERACTIVE_LOCAL_HARD_LIMITS_CANDIDATE_V1.find(
    (candidate) => candidate.enemyCount === enemyCount,
  );
  if (entry === undefined) {
    throw new RangeError(`Arena Survival缺少${enemyCount}敌人的未批准本地hard limit候选。`);
  }
  return entry.hardLimitActiveTicks;
}

function freezeExecutionTiming(
  value: Omit<ArenaSurvivalSharedWorldExecutionTimingCandidateV1, 'contentHash'>,
): ArenaSurvivalSharedWorldExecutionTimingCandidateV1 {
  const body = Object.freeze({ ...value });
  return Object.freeze({
    ...body,
    contentHash: createDeterministicDataHash(
      body,
      'Arena Survival shared-world execution timing candidate',
    ),
  });
}

export function createArenaSurvivalInteractiveExecutionTimingCandidateV1(
  enemyCountValue: unknown,
): ArenaSurvivalSharedWorldExecutionTimingCandidateV1 {
  const enemyCount = normalizeEnemyCount(
    enemyCountValue,
    'Arena Survival interactive execution timing enemyCount',
  );
  return freezeExecutionTiming({
    schemaVersion: ARENA_SURVIVAL_SHARED_WORLD_EXECUTION_TIMING_V1_SCHEMA_VERSION,
    purpose:
      ARENA_SURVIVAL_SHARED_WORLD_EXECUTION_PURPOSE_V1.INTERACTIVE_PRODUCT_CANDIDATE,
    enemyCount,
    initialPlayerProtectionTicks: 0,
    interactiveLocalHardLimitActiveTicks:
      unresolvedInteractiveLocalHardLimitActiveTicks(enemyCount),
    scenarioFallDriveStartTick: null,
    verificationScenarioMaximumTick: null,
    verificationPressurePolicyContentHash: null,
  });
}

export function createArenaSurvivalVerificationExecutionTimingCandidateV1(
  enemyCountValue: unknown,
  pressurePolicy: SurvivalPressurePolicyDefinition = PRESSURE,
): ArenaSurvivalSharedWorldExecutionTimingCandidateV1 {
  const enemyCount = normalizeEnemyCount(
    enemyCountValue,
    'Arena Survival verification execution timing enemyCount',
  );
  const scenarioFallDriveStartTick = verificationScenarioFallDriveStartTick(
    enemyCount,
    pressurePolicy,
  );
  return freezeExecutionTiming({
    schemaVersion: ARENA_SURVIVAL_SHARED_WORLD_EXECUTION_TIMING_V1_SCHEMA_VERSION,
    purpose: ARENA_SURVIVAL_SHARED_WORLD_EXECUTION_PURPOSE_V1.VERIFICATION_SCENARIO,
    enemyCount,
    initialPlayerProtectionTicks: scenarioFallDriveStartTick,
    interactiveLocalHardLimitActiveTicks:
      unresolvedInteractiveLocalHardLimitActiveTicks(enemyCount),
    scenarioFallDriveStartTick,
    verificationScenarioMaximumTick: verificationScenarioMaximumTick(
      enemyCount,
      pressurePolicy,
    ),
    verificationPressurePolicyContentHash: createDeterministicDataHash(
      pressurePolicy,
      'Arena Survival verification pressure policy',
    ),
  });
}

export function validateArenaSurvivalSharedWorldExecutionTimingCandidateV1(
  value: unknown,
  pressurePolicy: SurvivalPressurePolicyDefinition = PRESSURE,
): ArenaSurvivalSharedWorldExecutionTimingCandidateV1 {
  const source = cloneFrozenData(value, 'Arena Survival shared-world execution timing');
  exactRecord(
    source,
    SURVIVAL_EXECUTION_TIMING_KEYS,
    'Arena Survival shared-world execution timing',
  );
  if (source.schemaVersion !== ARENA_SURVIVAL_SHARED_WORLD_EXECUTION_TIMING_V1_SCHEMA_VERSION) {
    throw new RangeError('Arena Survival execution timing schemaVersion必须是1。');
  }
  const purpose = source.purpose;
  if (
    purpose !== ARENA_SURVIVAL_SHARED_WORLD_EXECUTION_PURPOSE_V1.INTERACTIVE_PRODUCT_CANDIDATE
    && purpose !== ARENA_SURVIVAL_SHARED_WORLD_EXECUTION_PURPOSE_V1.VERIFICATION_SCENARIO
  ) throw new RangeError('Arena Survival execution timing purpose非法。');
  const enemyCount = normalizeEnemyCount(
    source.enemyCount,
    'Arena Survival execution timing enemyCount',
  );
  const expected = purpose
    === ARENA_SURVIVAL_SHARED_WORLD_EXECUTION_PURPOSE_V1.INTERACTIVE_PRODUCT_CANDIDATE
    ? createArenaSurvivalInteractiveExecutionTimingCandidateV1(enemyCount)
    : createArenaSurvivalVerificationExecutionTimingCandidateV1(enemyCount, pressurePolicy);
  if (!sameData(source, expected, 'Arena Survival execution timing')) {
    throw new RangeError('Arena Survival execution timing purpose/数值/身份漂移。');
  }
  return expected;
}

function playableCharacter(characterDefinitionId: string): CharacterDefinition {
  const entry = ARENA_V2_SIX_CHARACTER_CATALOG_ENTRIES_CANDIDATE_V1.find(
    ({ definition }) => definition.id === characterDefinitionId,
  );
  if (entry === undefined) {
    throw new RangeError(`Arena Survival未知玩家角色${characterDefinitionId}。`);
  }
  return entry.definition;
}

function playableSurvivalMap(mapDefinitionId: string): SurvivalMapContext {
  const context = PLAYABLE_SURVIVAL_MAP_CONTEXTS.find(
    ({ mapDefinition }) => mapDefinition.id === mapDefinitionId,
  );
  if (context === undefined) {
    throw new RangeError(`Arena Survival未知地图${mapDefinitionId}。`);
  }
  return context;
}

function enemyReentryAnchorId(mapContext: SurvivalMapContext, ordinal: number): string {
  const segment = mapContext.routeDefinition.segments[
    ordinal % mapContext.routeDefinition.segments.length
  ];
  if (segment === undefined) throw new Error('Arena Survival当前地图缺少重入段。');
  return segment.respawnAnchorId;
}

function survivalSupplySpawnSpecs(
  mapContext: SurvivalMapContext,
  weaponPool: SurvivalWeaponPoolCandidateV1 = CATALOG,
) {
  const points = mapContext.routeDefinition.supplyPoints;
  if (points.length < 3) throw new RangeError('Arena Survival地图至少需3个供给点。');
  const ordinals = Object.freeze([0, Math.floor((points.length - 1) / 2), points.length - 1]);
  return Object.freeze(weaponPool.spawnSpecs.map((spec, index) => {
    const binding = points[ordinals[index]!]!;
    const point = mapContext.mapDefinition.equipmentSpawnPoints.find(
      ({ id }) => id === binding.equipmentSpawnPointId,
    );
    if (point === undefined) throw new Error(`Arena Survival供给点${binding.equipmentSpawnPointId}缺失。`);
    return Object.freeze({
      slotId: spec.slotId,
      equipmentDefinitionId: spec.equipmentDefinitionId,
      spawnId: `arena-v2-survival-${mapContext.mapDefinition.id}-${spec.slotId}`,
      position: Object.freeze({
        x: point.position.x,
        y: point.position.y + 1,
        z: point.position.z,
      }),
    });
  }));
}

function createConfig(
  enemyCount: EnemyCountV1,
  executionTiming: ArenaSurvivalSharedWorldExecutionTimingCandidateV1,
  playerCharacter: CharacterDefinition = PLAYER_CHARACTER,
  mapContext: SurvivalMapContext = BASE_SURVIVAL_MAP_CONTEXT,
  weaponPool: SurvivalWeaponPoolCandidateV1 = CATALOG,
  pressurePolicy: SurvivalPressurePolicyDefinition = PRESSURE,
  runtimePolicyBinding: ArenaThreeModeRuntimePolicyBindingCandidateV1 | null = null,
): ArenaMatchConfigV6 {
  const modePolicyContentHash = createDeterministicDataHash({
    mapDefinition: mapContext.mapDefinition,
    routeDefinition: mapContext.routeDefinition,
    ...(runtimePolicyBinding === null
      ? { pressureContentHash: ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.contentHash }
      : { pressurePolicy }),
    tierContentHash: weaponPool.contentHash,
    enemyCount,
    playerCharacterDefinitionId: playerCharacter.id,
    executionTimingContentHash: executionTiming.contentHash,
    ...(runtimePolicyBinding === null ? {} : {
      runtimePolicyBindingContentHash: runtimePolicyBinding.contentHash,
    }),
  }, 'P3 Survival shared mode policy content');
  const slotEntries = orderedPressureSlotEntries(pressurePolicy).slice(0, enemyCount);
  const participantAssignments = [
    {
      participantId: PLAYER_ID,
      modeRole: 'player' as const,
      teamId: null,
      controllerKind: 'human' as const,
      characterDefinitionId: playerCharacter.id,
      slotId: null,
      slotGeneration: 0,
    },
    ...slotEntries.map((entry, index) => ({
      participantId: enemyParticipantId(index),
      modeRole: 'enemy' as const,
      teamId: null,
      controllerKind: 'bot' as const,
      characterDefinitionId: ENEMY_CHARACTER.id,
      slotId: entry.slotId,
      slotGeneration: index + 1,
    })),
  ].sort((left, right) => (
    left.participantId < right.participantId ? -1 : left.participantId > right.participantId ? 1 : 0
  ));
  return createArenaMatchConfigV6({
    schemaVersion: 6,
    modeDefinitionId: ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.modeDefinitionId,
    modeKind: 'survival',
    modePolicyContentHash,
    participantAssignments,
  });
}

function createFixture(
  config: ArenaMatchConfigV6,
  enemyCount: EnemyCountV1,
  executionTiming: ArenaSurvivalSharedWorldExecutionTimingCandidateV1,
  mapContext: SurvivalMapContext = BASE_SURVIVAL_MAP_CONTEXT,
  weaponPool: SurvivalWeaponPoolCandidateV1 = CATALOG,
  pressurePolicy: SurvivalPressurePolicyDefinition = PRESSURE,
  runtimePolicyBinding: ArenaThreeModeRuntimePolicyBindingCandidateV1 | null = null,
): SurvivalModeFixtureV1 {
  const resolvedRespawn = runtimePolicyBinding === null
    ? null
    : resolveArenaRuntimeRespawnRolePolicyCandidateV1(
      runtimePolicyBinding,
      ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.modeDefinitionId,
      'survival',
      'player',
    );
  const resolvedTierPolicy = runtimePolicyBinding?.bundle.survivalEquipmentTier ?? null;
  if (runtimePolicyBinding !== null) {
    const objective = runtimePolicyBinding.bundle.objective.objective;
    if (objective.kind !== 'survival' || objective.terminalPlayerFallCount !== 2) {
      throw new RangeError('Arena Survival resolved Objective Policy与两次掉落终局语义不一致。');
    }
    if (runtimePolicyBinding.bundle.survivalPressure?.id !== pressurePolicy.id) {
      throw new RangeError('Arena Survival runtime压力Policy身份漂移。');
    }
    if (resolvedTierPolicy === null) {
      throw new RangeError('Arena Survival runtime缺少resolved装备等级Policy。');
    }
    assertSurvivalWeaponPoolSubsetOfResolvedTierPolicy(weaponPool, resolvedTierPolicy);
    const rolePolicy = resolvedRespawn!.rolePolicy;
    if (rolePolicy.maximumRespawns !== 1
      || rolePolicy.anchorPolicy.kind !== 'fixed-anchor'
      || rolePolicy.anchorPolicy.anchorCapabilityId
        !== ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.anchorCapabilityId) {
      throw new RangeError('Arena Survival resolved首次重生Policy与权威语义不一致。');
    }
  }
  const enemyAssignments = config.participantAssignments.filter(({ modeRole }) => (
    modeRole === 'enemy'
  ));
  const orderedPolicyEntries = orderedPressureSlotEntries(pressurePolicy);
  return Object.freeze({
    schemaVersion: 1 as const,
    fixtureDefinitionId: runtimePolicyBinding === null
      ? `arena.p3.survival.shared.enemy-${enemyCount}.test.${executionTiming.purpose}`
        + `-timing-${executionTiming.contentHash}`
      : `arena.p3.survival.shared.enemy-${enemyCount}.test.registry-${runtimePolicyBinding.contentHash}`
        + `-timing-${executionTiming.contentHash}`,
    terminalPlayerFallCount: 2 as const,
    playerRespawnDelayTicks: resolvedRespawn?.rolePolicy.delayTicks
      ?? ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.delayTicks,
    playerRespawnProtectionTicks: resolvedRespawn?.rolePolicy.protectionTicks
      ?? ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.protectionTicks,
    playerRespawnAnchorId: resolveArenaV2SurvivalFirstRespawnAnchorCandidateV1(
      mapContext.mapDefinition.id,
    ),
    hardLimitActiveTicks: executionTiming.interactiveLocalHardLimitActiveTicks,
    pressurePolicyDefinitionId: `${pressurePolicy.id}.test.shared-world`,
    tierPolicyDefinitionId: runtimePolicyBinding === null
      ? `${weaponPool.tierPolicyDefinition.id}.test.shared-world`
      : `${resolvedTierPolicy!.id}.test.active-${weaponPool.contentHash}`,
    slotActivationOrder: Object.freeze(orderedPolicyEntries
      .slice(0, enemyCount)
      .map(({ slotId }) => slotId)),
    slotEntries: Object.freeze(orderedPolicyEntries.slice(0, enemyCount).map((entry, index) => {
      const assignment = enemyAssignments.find(({ slotId }) => slotId === entry.slotId);
      if (assignment === undefined) {
        throw new Error(`P3 Survival缺少slot ${entry.slotId} participant绑定。`);
      }
      return Object.freeze({
        slotId: entry.slotId,
        participantId: assignment.participantId,
        anchorId: enemyReentryAnchorId(mapContext, index),
      });
    })),
    pressureStages: pressureStagesFor(enemyCount, pressurePolicy),
    equipmentTiers: Object.freeze(weaponPool.tierPolicyDefinition.tiers.map((tier) => Object.freeze({
      minimumWaveIndex: tier.minimumWaveIndex,
      survivalLevel: tier.survivalLevel,
      variants: Object.freeze(tier.variants.map((variant) => Object.freeze({ ...variant }))),
    }))),
  });
}

function assertSurvivalWeaponPoolSubsetOfResolvedTierPolicy(
  weaponPool: SurvivalWeaponPoolCandidateV1,
  resolvedTierPolicy: SurvivalEquipmentTierPolicyDefinition,
): void {
  if (weaponPool.supplyDefinition.id !== resolvedTierPolicy.supplyDefinitionId) {
    throw new RangeError('Arena Survival active武器池与resolved供给Definition身份漂移。');
  }
  for (const activeTier of weaponPool.tierPolicyDefinition.tiers) {
    const resolvedTier = resolvedTierPolicy.tiers.find((candidate) => (
      candidate.minimumWaveIndex === activeTier.minimumWaveIndex
      && candidate.survivalLevel === activeTier.survivalLevel
    ));
    if (resolvedTier === undefined) {
      throw new RangeError('Arena Survival active武器池包含resolved等级Policy之外的层级。');
    }
    for (const activeVariant of activeTier.variants) {
      if (!resolvedTier.variants.some((candidate) => (
        candidate.collectionEquipmentDefinitionId
          === activeVariant.collectionEquipmentDefinitionId
        && candidate.runtimeEquipmentDefinitionId === activeVariant.runtimeEquipmentDefinitionId
      ))) {
        throw new RangeError('Arena Survival active武器池包含resolved等级Policy之外的武器变体。');
      }
    }
  }
}

function registriesForWeaponPool(weaponPool: SurvivalWeaponPoolCandidateV1) {
  return 'source' in weaponPool
    ? createArenaV2SurvivalRegisteredWeaponPoolRegistriesCandidateV1(
      weaponPool.collectionEquipmentDefinitionIds,
    )
    : createArenaV2SurvivalBaselineWeaponCandidateRegistriesV1();
}

function createJumpCommand(
  movement: MovementSystem,
  frame: ArenaInputFrame,
): MovementCommand | null {
  if (!frame.jumpPressed) return null;
  const capabilities = movement.getCapabilities(frame.participantId);
  if (capabilities.canGroundJump) {
    return Object.freeze({
      kind: MOVEMENT_COMMAND_KIND.REQUEST_GROUND_JUMP,
      participantId: frame.participantId,
      actionDefinitionId: 'arena.p3.survival.shared.ground-jump.candidate.v1',
    });
  }
  if (capabilities.canAirJump) {
    return Object.freeze({
      kind: MOVEMENT_COMMAND_KIND.REQUEST_AIR_JUMP,
      participantId: frame.participantId,
      actionDefinitionId: 'arena.p3.survival.shared.air-jump.candidate.v1',
    });
  }
  return null;
}

function actionSnapshot(engine: ArenaRuleEngineContract, participantId: string) {
  const snapshot = engine.getActionSnapshot(participantId);
  return Object.freeze({
    definitionId: snapshot.definitionId,
    phase: snapshot.phase,
    ticksRemaining: snapshot.ticksRemaining,
    ...(snapshot.commitment === undefined ? {} : { commitment: snapshot.commitment }),
  });
}

function eventId(matchSeed: number, tick: number, sequence: number): string {
  return `p3-survival-shared:${matchSeed.toString(16)}:${tick}:${sequence}`;
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

interface SurvivalRetryableDestroyResourceV1 {
  destroy(): unknown;
}

interface SurvivalRetainedCleanupResourceV1 {
  readonly label: string;
  readonly resource: SurvivalRetryableDestroyResourceV1;
}

type SurvivalSharedWorldAuthorityOperationV1 =
  | 'prepare-inputs'
  | 'step'
  | 'restore'
  | 'pause'
  | 'resume'
  | 'destroy';

export class ArenaSurvivalSharedWorldAuthorityCandidateV1 implements ModeMatchWorldAuthorityV6 {
  readonly #config: ArenaMatchConfigV6;
  readonly #configHash: string;
  readonly #matchSeed: number;
  readonly #supplyFactStreamId: string;
  readonly #localParticipantId: string;
  readonly #participantIds: readonly string[];
  readonly #enemyIds: readonly string[];
  readonly #states: Map<string, MutableParticipantState>;
  readonly #controllers = new Map<string, SurvivalEnemyControllerV2>();
  readonly #behaviorSeeds = new Map<string, number>();
  readonly #evidence: MutableEvidence;
  readonly #executionTiming: ArenaSurvivalSharedWorldExecutionTimingCandidateV1;
  readonly #mapContext: SurvivalMapContext;
  readonly #playerCharacter: CharacterDefinition;
  readonly #playerProfile: ReturnType<typeof createCharacterPhysicsProfile>;
  readonly #weaponPool: SurvivalWeaponPoolCandidateV1;
  readonly #pressurePolicy: SurvivalPressurePolicyDefinition;
  readonly #modePolicyResolver: ModePolicyResolver | null;
  readonly #modeResultPolicyResolver: ModeResultPolicyResolverV1 | null;
  #physics: CheckpointableLightweightPhysicsWorldV1 | null = null;
  #movement: MovementSystem | null = null;
  #engine: ArenaRuleEngineContract | null = null;
  #equipment: EquipmentSystem | null = null;
  #timeline: EquipmentSupplyTimelineSystem | null = null;
  #feedback: MatchCoreWeaponFeedbackBundleOwnerV2 | null = null;
  #committedDirectionFacts: readonly ArenaWeaponFeedbackDirectionFactV2[] = Object.freeze([]);
  #readFrame: DeepReadonly<MatchReadFrameV3> | null = null;
  #readFrameAudit: MatchReadFrameV3AuditOptions | null = null;
  #stateHash: string | null = null;
  #supplyFactSequence = 0;
  #prepared: PreparedTickV1 | null = null;
  #paused = false;
  #failed = false;
  #destroyed = false;
  #operation: SurvivalSharedWorldAuthorityOperationV1 | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  readonly #pendingCleanupResources: SurvivalRetainedCleanupResourceV1[] = [];

  constructor(
    config: ArenaMatchConfigV6,
    matchSeed: number,
    localParticipantId: string,
    enemyCount: EnemyCountV1,
    executionTimingValue: unknown,
    playerCharacter: CharacterDefinition = PLAYER_CHARACTER,
    mapContext: SurvivalMapContext = BASE_SURVIVAL_MAP_CONTEXT,
    weaponPool: SurvivalWeaponPoolCandidateV1 = CATALOG,
    pressurePolicy: SurvivalPressurePolicyDefinition = PRESSURE,
    modePolicyResolver: ModePolicyResolver | null = null,
    modeResultPolicyResolver: ModeResultPolicyResolverV1 | null = null,
  ) {
    this.#config = createArenaMatchConfigV6(config);
    this.#configHash = createDeterministicDataHash(this.#config, 'P3 Survival shared config');
    this.#matchSeed = normalizeUint32(matchSeed, 'P3 Survival shared authority matchSeed');
    this.#supplyFactStreamId = `arena-v2-survival-supply-${this.#matchSeed
      .toString(16)
      .padStart(8, '0')}`;
    this.#localParticipantId = localParticipantId;
    this.#mapContext = mapContext;
    this.#playerCharacter = playerCharacter;
    this.#playerProfile = createCharacterPhysicsProfile(playerCharacter);
    this.#weaponPool = weaponPool;
    this.#pressurePolicy = pressurePolicy;
    this.#executionTiming = validateArenaSurvivalSharedWorldExecutionTimingCandidateV1(
      executionTimingValue,
      this.#pressurePolicy,
    );
    this.#modePolicyResolver = modePolicyResolver;
    this.#modeResultPolicyResolver = modeResultPolicyResolver;
    this.#participantIds = Object.freeze(
      this.#config.participantAssignments.map(({ participantId }) => participantId),
    );
    this.#enemyIds = Object.freeze(this.#config.participantAssignments.flatMap((assignment) => (
      assignment.modeRole === 'enemy' ? [assignment.participantId] : []
    )));
    if (
      localParticipantId !== PLAYER_ID
      || this.#enemyIds.length !== enemyCount
      || this.#executionTiming.enemyCount !== enemyCount
      || !this.#participantIds.includes(localParticipantId)
      || this.#config.participantAssignments.find(
        ({ participantId }) => participantId === localParticipantId,
      )?.characterDefinitionId !== playerCharacter.id
    ) throw new RangeError('P3 Survival shared authority roster/local identity漂移。');
    const pressureSlotEntries = orderedPressureSlotEntries(this.#pressurePolicy);
    this.#states = new Map(this.#config.participantAssignments.map((assignment) => {
      const pressureEntryIndex = assignment.modeRole === 'enemy'
        ? pressureSlotEntries.findIndex(({ slotId }) => slotId === assignment.slotId)
        : -1;
      if (assignment.modeRole === 'enemy' && pressureEntryIndex < 0) {
        throw new Error(`P3 Survival enemy ${assignment.participantId}缺少pressure顺序。`);
      }
      const initialAnchorId = assignment.modeRole === 'player'
        ? this.#mapContext.routeDefinition.startAnchorIds[0]!
        : enemyReentryAnchorId(this.#mapContext, pressureEntryIndex);
      const initialAnchor = requireAnchor(initialAnchorId, this.#mapContext);
      const initialSegment = this.#mapContext.segmentBySurfaceId.get(initialAnchor.surfaceId);
      if (!initialSegment) throw new Error(`${initialAnchorId}未归属KZ route segment。`);
      return [assignment.participantId, {
        participantId: assignment.participantId,
        role: assignment.modeRole as 'player' | 'enemy',
        slotId: assignment.slotId,
        active: assignment.modeRole === 'player',
        slotGeneration: assignment.slotGeneration,
        respawnReadyTick: null,
        invulnerableTicks: assignment.modeRole === 'player'
          ? this.#executionTiming.initialPlayerProtectionTicks
          : 0,
        hitstunTicks: 0,
        lastHitBy: null,
        lastHitTick: -1,
        fallCount: 0,
        lastSupportSurfaceId: initialAnchor.surfaceId,
        currentSegmentId: initialSegment.id,
      }] as const;
    }));
    this.#evidence = {
      supplySpawnedCount: 0,
      supplyExpiredCount: 0,
      supplyPickedUpCount: 0,
      supplyReplacementCount: 0,
      firstObservedSpawnTick: null,
      firstObservedExpiryTick: null,
      firstObservedPickupTick: null,
      firstObservedReplacementTick: null,
      observedSurvivalLevels: new Set(),
      v2ObservationCount: 0,
      unarmedVisibleSupplyObservationCount: 0,
      heldEquipmentObservationCount: 0,
      botInputFrameCount: 0,
      botPrimaryPressCount: 0,
      actionStartedCount: 0,
      hitCount: 0,
      impulseCount: 0,
      usedRuntimeEquipmentDefinitionIds: new Set(),
      playerFallTicks: [],
      enemyFallCount: 0,
      enemyReactivationCount: 0,
      maximumActiveEnemyCount: 0,
    };

    const cleanupErrors: unknown[] = [];
    try {
      this.#physics = createLightweightPhysicsWorld({ arena: this.#mapContext.mapDefinition.arena });
      this.#movement = new MovementSystem({
        participantCharacters: this.#config.participantAssignments.map((assignment) => ({
          participantId: assignment.participantId,
          characterDefinition: assignment.modeRole === 'player'
            ? this.#playerCharacter
            : ENEMY_CHARACTER,
        })),
        airJumpHorizontalImpulse: ARENA_GAMEPLAY_V2_TUNING.character.jump.airHorizontalImpulse,
      });
      const registries = registriesForWeaponPool(this.#weaponPool);
      this.#engine = new ArenaRuleEngine({
        participantIds: this.#participantIds,
        baseActionDefinitionId: this.#weaponPool.baseGroundActionDefinitionId,
        baseAirActionDefinitionId: this.#weaponPool.baseAerialActionDefinitionId,
        actionRegistry: registries.actionRegistry,
        equipmentRegistry: registries.equipmentRegistry,
        targetingRegistry: createDefaultTargetingRegistry(),
        effectRegistry: createDefaultActionEffectRegistry([
          createArenaBeginDownSmashActionEffectHandlerV1(),
        ]),
        commandRegistry: createDefaultRuleCommandRegistry(),
        movementCandidateProvider: Object.freeze({ getCandidates: () => Object.freeze([]) }),
        ...(this.#modePolicyResolver === null ? {} : {
          targetEligibility: Object.freeze({
            contentHash: this.#modePolicyResolver.definitionBundle.contentHash,
            allowsTarget: (sourceParticipantId: string, targetParticipantId: string) => (
              this.#modePolicyResolver!.relationshipBetween(
                sourceParticipantId,
                targetParticipantId,
              ) === 'hostile'
            ),
          }),
        }),
        createEquipmentSystem: (options) => {
          const equipment = new EquipmentSystem({
            ...options,
            equipmentSupplyRegistry: registries.equipmentSupplyRegistry,
          });
          if (this.#equipment !== null) {
            equipment.destroy();
            throw new Error('P3 Survival authority EquipmentSystem只能创建一次。');
          }
          this.#equipment = equipment;
          return equipment;
        },
        movementCommandAdapter: Object.freeze({
          isCommandKind: isMovementCommandKind,
          createCommand: createMovementCommand,
        }),
        allowBaseAttackWhiff: true,
      });
      if (this.#equipment === null) throw new Error('P3 Survival authority未捕获EquipmentSystem。');
      const supplySpawnSpecs = survivalSupplySpawnSpecs(this.#mapContext, this.#weaponPool);
      this.#timeline = new EquipmentSupplyTimelineSystem({
        supplyDefinitionId: this.#weaponPool.supplyDefinition.id,
        spawnSpecs: supplySpawnSpecs,
        waveEquipmentOverrides: this.#weaponPool.waveEquipmentOverrides,
        equipmentRegistry: registries.equipmentRegistry,
        equipmentSupplyRegistry: registries.equipmentSupplyRegistry,
        equipmentSystem: Object.freeze({
          applySupplyTimelinePhase: (options: unknown) => (
            this.#engine!.applyEquipmentSupplyTimelinePhase!(options)
          ),
          resolveSupplyPickups: (options: unknown) => (
            this.#engine!.resolveEquipmentSupplyPickups!(options)
          ),
          getSnapshot: (instanceId: string) => this.#engine!.getEquipmentSnapshot(instanceId),
        }),
      });

      const primarySupply = supplySpawnSpecs[0];
      if (!primarySupply) throw new Error('P3 Survival P4 supply缺少首槽。');
      const playerSurface = surfaceForPosition(primarySupply.position, this.#mapContext);
      this.#physics.addCharacter({
        id: PLAYER_ID,
        position: Object.freeze({
            x: primarySupply.position.x,
            y: playerSurface.center.y
              + playerSurface.halfExtents.y
              + this.#playerProfile.halfHeight
              + this.#playerProfile.radius,
            z: primarySupply.position.z,
          }),
        ...this.#playerProfile,
      });
      this.#states.get(PLAYER_ID)!.currentSegmentId = segmentForPosition(
        primarySupply.position,
        this.#mapContext,
      ).id;
      this.#states.get(PLAYER_ID)!.lastSupportSurfaceId = playerSurface.id;
      for (const assignment of this.#config.participantAssignments) {
        if (assignment.modeRole !== 'enemy') continue;
        const entry = pressureSlotEntries.find(
          ({ slotId }) => slotId === assignment.slotId,
        );
        if (!entry) throw new Error(`P3 Survival enemy ${assignment.participantId}缺少slot entry。`);
        const pressureOrdinal = pressureSlotEntries.findIndex(
          ({ slotId }) => slotId === assignment.slotId,
        );
        requireAnchor(enemyReentryAnchorId(this.#mapContext, pressureOrdinal), this.#mapContext);
        const enemyOrdinal = this.#enemyIds.indexOf(assignment.participantId);
        if (enemyOrdinal < 0) throw new Error('P3 Survival enemy roster ordinal缺失。');
        this.#physics.addCharacter({
          id: assignment.participantId,
          position: inactiveEnemyParkingPosition(enemyOrdinal, this.#mapContext),
          ...ENEMY_PROFILE,
        });
        const behaviorSeed = deriveSeed(
          this.#matchSeed,
          `arena.p3.survival.shared.bot:${assignment.slotId}:${assignment.participantId}`,
        );
        this.#behaviorSeeds.set(assignment.participantId, behaviorSeed);
        this.#controllers.set(assignment.participantId, new SurvivalEnemyControllerV2({
          participantId: assignment.participantId,
          slotId: assignment.slotId!,
          behaviorSeed,
          profile: SURVIVAL_ENEMY_FAMILY_PROFILE_CANDIDATE_V1,
        }));
      }
      this.#feedback = new MatchCoreWeaponFeedbackBundleOwnerV2({
        participantIds: this.#participantIds,
        outcomeWindowTicks: ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1,
        initialObservation: this.#feedbackObservation(0, 0),
      });
    } catch (error) {
      for (const resource of [
        ...[...this.#controllers.values()].reverse(),
        this.#feedback,
        this.#timeline,
        this.#engine,
        this.#movement,
        this.#physics,
      ]) {
        if (resource === null) continue;
        try { resource.destroy(); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
      }
      this.#controllers.clear();
      this.#feedback = null;
      this.#timeline = null;
      this.#engine = null;
      this.#equipment = null;
      this.#movement = null;
      this.#physics = null;
      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          [error, ...cleanupErrors],
          'P3 Survival shared authority构造与逆序清理失败。',
        );
      }
      throw error;
    }
  }

  #assertLive(): void {
    if (this.#destroyed) throw new Error('P3 Survival shared authority已销毁。');
    if (this.#failed) throw new Error('P3 Survival shared authority已失败关闭。');
  }

  #rejectReentry(requestedOperation: string): never {
    this.#reentrySequence += 1;
    this.#reentryError ??= new Error(
      `P3 Survival shared authority操作${this.#operation ?? 'unknown'}期间拒绝${requestedOperation}重入。`,
    );
    throw this.#reentryError;
  }

  #assertNoOperation(requestedOperation: string): void {
    if (this.#operation !== null) this.#rejectReentry(requestedOperation);
  }

  #beginOperation(operation: SurvivalSharedWorldAuthorityOperationV1): void {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
  }

  #assertOperationCommit(operation: SurvivalSharedWorldAuthorityOperationV1): void {
    if (this.#operation !== operation) {
      throw new Error(`P3 Survival shared authority缺少${operation}操作所有权。`);
    }
    if (this.#reentryError !== null) {
      this.#failed = true;
      throw this.#reentryError;
    }
  }

  #endOperation(operation: SurvivalSharedWorldAuthorityOperationV1): void {
    if (this.#operation === operation) this.#operation = null;
  }

  #retainCleanupResource(
    label: string,
    resource: SurvivalRetryableDestroyResourceV1,
  ): void {
    if (this.#pendingCleanupResources.some((entry) => entry.resource === resource)) return;
    this.#pendingCleanupResources.push(Object.freeze({ label, resource }));
  }

  #releaseDetachedResource(
    label: string,
    resource: SurvivalRetryableDestroyResourceV1 | null,
    errors: Error[],
  ): void {
    if (resource === null) return;
    const reentrySequence = this.#reentrySequence;
    try {
      resource.destroy();
      if (this.#reentrySequence !== reentrySequence) {
        this.#retainCleanupResource(label, resource);
        errors.push(this.#reentryError ?? new Error(`P3 Survival ${label}清理期间发生重入。`));
      }
    } catch (error) {
      this.#retainCleanupResource(label, resource);
      errors.push(safelyWrapThrownError(error, `P3 Survival ${label}清理失败。`));
    }
  }

  #releaseDetachedControllers(
    controllers: Map<string, SurvivalEnemyControllerV2>,
    errors: Error[],
  ): void {
    for (const [participantId, controller] of [...controllers].reverse()) {
      this.#releaseDetachedResource(`restore Controller ${participantId}`, controller, errors);
      if (this.#reentryError !== null) return;
      controllers.delete(participantId);
    }
  }

  #releaseCurrentResources(errors: Error[]): void {
    for (const [participantId, controller] of [...this.#controllers].reverse()) {
      const reentrySequence = this.#reentrySequence;
      try {
        controller.destroy();
        if (this.#reentrySequence !== reentrySequence) {
          errors.push(this.#reentryError ?? new Error('P3 Survival ControllerV2清理期间发生重入。'));
          return;
        }
        if (this.#controllers.get(participantId) === controller) {
          this.#controllers.delete(participantId);
        }
      } catch (error) {
        errors.push(safelyWrapThrownError(error, 'P3 Survival ControllerV2清理失败。'));
        if (this.#reentrySequence !== reentrySequence) return;
      }
    }
    for (const [name, get, clear] of [
      ['WeaponFeedback', () => this.#feedback, () => { this.#feedback = null; }],
      ['SupplyTimeline', () => this.#timeline, () => { this.#timeline = null; }],
      ['RuleEngine', () => this.#engine, () => {
        this.#engine = null;
        this.#equipment = null;
      }],
      ['MovementSystem', () => this.#movement, () => { this.#movement = null; }],
      ['PhysicsWorld', () => this.#physics, () => { this.#physics = null; }],
    ] as const) {
      const owned = get();
      if (owned === null) continue;
      const reentrySequence = this.#reentrySequence;
      try {
        owned.destroy();
        if (this.#reentrySequence !== reentrySequence) {
          errors.push(this.#reentryError ?? new Error(`P3 Survival ${name}清理期间发生重入。`));
          return;
        }
        if (get() === owned) clear();
      } catch (error) {
        errors.push(safelyWrapThrownError(error, `P3 Survival ${name}清理失败。`));
        if (this.#reentrySequence !== reentrySequence) return;
      }
    }
  }

  #releasePendingCleanupResources(errors: Error[]): void {
    for (let index = this.#pendingCleanupResources.length - 1; index >= 0; index -= 1) {
      const entry = this.#pendingCleanupResources[index]!;
      const reentrySequence = this.#reentrySequence;
      try {
        entry.resource.destroy();
        if (this.#reentrySequence !== reentrySequence) {
          errors.push(this.#reentryError ?? new Error(
            `P3 Survival retained ${entry.label}清理期间发生重入。`,
          ));
          return;
        }
        this.#pendingCleanupResources.splice(index, 1);
      } catch (error) {
        errors.push(safelyWrapThrownError(
          error,
          `P3 Survival retained ${entry.label}清理失败。`,
        ));
        if (this.#reentrySequence !== reentrySequence) return;
      }
    }
  }

  #resources(): AuthorityResourcesV1 {
    this.#assertLive();
    if (
      this.#physics === null
      || this.#movement === null
      || this.#engine === null
      || this.#equipment === null
      || this.#timeline === null
    ) throw new Error('P3 Survival shared authority资源不完整。');
    return Object.freeze({
      physics: this.#physics,
      movement: this.#movement,
      engine: this.#engine,
      equipment: this.#equipment,
      timeline: this.#timeline,
    });
  }

  #localJumpAvailability(frame: DeepReadonly<MatchReadFrameV3>) {
    const { physics, movement } = this.#resources();
    const authority = this.#states.get(this.#localParticipantId)!;
    const phase = frame.worldSnapshot.phase;
    const capabilities = movement.projectCapabilities(this.#localParticipantId, {
      grounded: physics.getCharacterState(this.#localParticipantId).grounded,
      canMove: (phase === 'running' || phase === 'sudden-death')
        && authority.active
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
    if (this.#feedback === null) throw new Error('P3 Survival feedback owner不完整。');
    return this.#feedback;
  }

  #feedbackObservation(tick: number, eventSequence: number) {
    const { physics, engine } = this.#resources();
    return Object.freeze({
      tick,
      eventSequence,
      participants: Object.freeze(this.#participantIds.map((participantId) => {
        const authority = this.#states.get(participantId)!;
        const physical = physics.getCharacterState(participantId);
        return Object.freeze({
          participantId,
          active: authority.active,
          actionDefinitionId: engine.getActionSnapshot(participantId).definitionId,
          supportSurfaceId: physical.supportSurfaceId,
        });
      })),
    });
  }

  #actors(): readonly RuleActor[] {
    const { physics } = this.#resources();
    return Object.freeze(this.#participantIds.map((participantId) => {
      const authority = this.#states.get(participantId)!;
      const physical = physics.getCharacterState(participantId);
      return Object.freeze({
        id: participantId,
        canAct: authority.active && authority.hitstunTicks === 0,
        targetable: authority.active && authority.invulnerableTicks === 0,
        position: physical.position,
        facing: physical.facing,
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
        const attacker = this.#states.get(attackerId);
        const target = this.#states.get(targetId);
        if (!attacker || !target || !attacker.active || !target.active) {
          throw new RangeError('P3 Survival Rule命中身份或active状态无效。');
        }
        if (this.#modePolicyResolver !== null
          && this.#modePolicyResolver.relationshipBetween(attackerId, targetId) !== 'hostile') {
          throw new RangeError('P3 Survival Rule命中违反resolved Relationship Policy。');
        }
        feedbackSourceEvents.push(Object.freeze({
          id: `p3-survival-feedback-hit:${this.#matchSeed.toString(16)}:${tick}:${feedbackSequenceStart + feedbackSourceEvents.length}`,
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
        this.#evidence.hitCount += 1;
      },
      applyHitstun: (participantId: string, ticks: number) => {
        const target = this.#states.get(participantId);
        if (!target || !Number.isSafeInteger(ticks) || ticks < 0) {
          throw new RangeError('P3 Survival hitstun mutation无效。');
        }
        target.hitstunTicks = Math.max(target.hitstunTicks, ticks);
      },
      applyImpulse: (participantId: string, impulse: RuleImpulse) => {
        if (!this.#states.has(participantId)) {
          throw new RangeError('P3 Survival impulse participant未知。');
        }
        const pendingFeedbackHits = pendingFeedbackHitsByTarget.get(participantId);
        const feedbackHit = pendingFeedbackHits?.shift();
        if (feedbackHit !== undefined) {
          if (pendingFeedbackHits!.length === 0) {
            pendingFeedbackHitsByTarget.delete(participantId);
          }
          feedbackSourceEvents.push(Object.freeze({
            id: `p3-survival-feedback-knockback:${this.#matchSeed.toString(16)}:${tick}:${feedbackSequenceStart + feedbackSourceEvents.length}`,
            sequence: feedbackSequenceStart + feedbackSourceEvents.length,
            tick,
            type: 'KnockbackApplied' as const,
            attackerId: feedbackHit.attackerId,
            targetId: feedbackHit.targetId,
            impulse: Object.freeze({ ...impulse }),
          }));
        }
        physics.applyImpulse(participantId, impulse);
        this.#evidence.impulseCount += 1;
      },
    });
  }

  #routeTargets(participantId: string) {
    const { physics } = this.#resources();
    const authority = this.#states.get(participantId)!;
    const player = this.#states.get(PLAYER_ID)!;
    const selfState = physics.getCharacterState(participantId);
    const playerState = physics.getCharacterState(PLAYER_ID);
    authority.currentSegmentId = segmentForState(
      selfState,
      authority.currentSegmentId,
      this.#mapContext,
    );
    player.currentSegmentId = segmentForState(
      playerState,
      player.currentSegmentId,
      this.#mapContext,
    );
    return createRouteTargets(
      authority.currentSegmentId,
      player.currentSegmentId,
      selfState.position,
      this.#mapContext,
    );
  }

  #visibleSupplies(
    participantId: string,
    tick: number,
    routeTargets: readonly Readonly<{
      readonly segmentId: string;
      readonly anchorId: string;
      readonly traversal: 'walk' | 'jump';
    }>[],
  ): readonly SurvivalEnemyVisibleSupplyV2[] {
    const { equipment, timeline } = this.#resources();
    const participant = this.#states.get(participantId)!;
    return Object.freeze(timeline.listActiveSupplies().flatMap((lifecycle) => {
      const runtime = equipment.getSnapshot(lifecycle.equipmentInstanceId);
      if (
        runtime.ownerId !== null
        || runtime.position === null
        || (runtime.locationState !== 'spawned' && runtime.locationState !== 'dropped')
      ) return [];
      const remainingTicks = lifecycle.expireTick - tick;
      if (remainingTicks < 1) return [];
      const identity = runtimeIdentity(runtime.definitionId);
      const supplySegment = segmentForPosition(runtime.position, this.#mapContext);
      const sameSegment = supplySegment.id === participant.currentSegmentId;
      const routeTarget = sameSegment
        ? null
        : routeTargets.find(({ segmentId }) => segmentId === supplySegment.id)
          ?? routeTargets[0]
          ?? null;
      if (!sameSegment && routeTarget === null) {
        throw new Error(`P3 Survival供给 ${lifecycle.supplyId}缺少route target。`);
      }
      return [Object.freeze({
        supplyId: lifecycle.supplyId,
        equipmentInstanceId: lifecycle.equipmentInstanceId,
        ...identity,
        segmentId: supplySegment.id,
        position: runtime.position,
        remainingTicks,
        directTraversal: sameSegment ? 'walk' as const : routeTarget!.traversal,
        routeTargetAnchorId: sameSegment ? null : routeTarget!.anchorId,
      })];
    }).sort((left, right) => compareText(left.supplyId, right.supplyId)));
  }

  #createEnemyInput(participantId: string, tick: number): ArenaInputFrame {
    const { physics, engine } = this.#resources();
    const authority = this.#states.get(participantId)!;
    const player = this.#states.get(PLAYER_ID)!;
    const selfState = physics.getCharacterState(participantId);
    const playerState = physics.getCharacterState(PLAYER_ID);
    const routeTargets = authority.active ? this.#routeTargets(participantId) : Object.freeze([]);
    const held = engine.getHeldEquipment(participantId);
    const heldEquipment = held === null ? null : runtimeIdentity(held.definitionId);
    const primaryActionRule = engine.getParticipantActionRule(participantId);
    const primaryActionSnapshot = engine.getActionSnapshot(participantId);
    const primaryActionReady = isBotPrimaryActionReadyV1({
      schemaVersion: 1,
      actionIdle: primaryActionSnapshot.phase === ARENA_ACTION_PHASE.IDLE,
      cooldownRemainingTicks: held?.cooldownRemainingTicks ?? null,
    });
    const visibleSupplies = authority.active && held === null
      ? this.#visibleSupplies(participantId, tick, routeTargets)
      : Object.freeze([]);
    const observation = Object.freeze({
      schemaVersion: SURVIVAL_ENEMY_OBSERVATION_V2_SCHEMA_VERSION,
      tick,
      eventSequence: this.#readFrame!.worldSnapshot.eventSequence,
      modeDefinitionId: this.#config.modeDefinitionId,
      participantId,
      slotId: authority.slotId!,
      slotGeneration: authority.slotGeneration,
      active: authority.active,
      primaryRange: primaryActionRule.range,
      primaryMinimumCommitmentTicks: primaryActionRule.minimumCommitmentTicks,
      primaryCommitment: primaryActionSnapshot.commitment === undefined ? null : Object.freeze({
        status: primaryActionSnapshot.commitment.status,
        chargeTicks: primaryActionSnapshot.commitment.chargeTicks,
      }),
      self: Object.freeze({
        position: selfState.position,
        velocity: selfState.velocity,
        grounded: selfState.grounded,
        hitstunTicks: authority.hitstunTicks,
        actionReady: primaryActionReady,
        actionInProgress: primaryActionSnapshot.phase !== ARENA_ACTION_PHASE.IDLE,
        currentSegmentId: authority.currentSegmentId,
      }),
      player: Object.freeze({
        participantId: PLAYER_ID,
        position: playerState.position,
        velocity: playerState.velocity,
        invulnerableTicks: player.invulnerableTicks,
        currentSegmentId: player.currentSegmentId,
      }),
      routeTargets,
      heldEquipment,
      visibleSupplies,
    });
    const frame = this.#controllers.get(participantId)!.createInput(observation);
    this.#assertOperationCommit('prepare-inputs');
    this.#evidence.v2ObservationCount += 1;
    this.#evidence.botInputFrameCount += 1;
    if (heldEquipment !== null) this.#evidence.heldEquipmentObservationCount += 1;
    if (heldEquipment === null && visibleSupplies.length > 0) {
      this.#evidence.unarmedVisibleSupplyObservationCount += 1;
    }
    if (frame.primaryPressed) this.#evidence.botPrimaryPressCount += 1;
    return frame;
  }

  #recordSupply(result: ReturnType<EquipmentSupplyTimelineSystem['step']>): void {
    this.#evidence.supplySpawnedCount += result.spawned.length;
    this.#evidence.supplyExpiredCount += result.expiredEvents.length;
    this.#evidence.supplyPickedUpCount += result.pickupDecisions.filter(
      ({ kind }) => kind === 'picked-up',
    ).length;
    this.#evidence.supplyReplacementCount += result.pickupDecisions.filter(
      ({ kind }) => kind === 'replaced',
    ).length;
    if (result.spawned.length > 0 && this.#evidence.firstObservedSpawnTick === null) {
      this.#evidence.firstObservedSpawnTick = result.tick;
    }
    if (result.expiredEvents.length > 0 && this.#evidence.firstObservedExpiryTick === null) {
      this.#evidence.firstObservedExpiryTick = result.tick;
    }
    if (result.pickupDecisions.length > 0 && this.#evidence.firstObservedPickupTick === null) {
      this.#evidence.firstObservedPickupTick = result.tick;
    }
    if (
      result.pickupDecisions.some(({ kind }) => kind === 'replaced')
      && this.#evidence.firstObservedReplacementTick === null
    ) this.#evidence.firstObservedReplacementTick = result.tick;
    const { engine } = this.#resources();
    for (const decision of result.pickupDecisions) {
      const held = engine.getHeldEquipment(decision.participantId);
      if (held === null) throw new Error('P3 Survival pickup decision未形成held equipment。');
      const identity = runtimeIdentity(held.definitionId);
      this.#evidence.observedSurvivalLevels.add(identity.survivalLevel);
    }
  }

  #appendSupplyFact(
    facts: ArenaSupplyAuthorityFactV1[],
    tick: number,
    kind: ArenaSupplyAuthorityFactV1['kind'],
    identity: SupplyFactIdentityV1,
    participantId: string | null,
    previousEquipmentInstanceId: string | null,
  ): void {
    const sequence = this.#supplyFactSequence;
    const fact = createArenaSupplyAuthorityFactV1({
      schemaVersion: 1,
      id: `${this.#supplyFactStreamId}:supply-fact-v1:${sequence}:${kind}`,
      streamId: this.#supplyFactStreamId,
      sequence,
      tick,
      modeDefinitionId: this.#config.modeDefinitionId,
      kind,
      ...identity,
      participantId,
      previousEquipmentInstanceId,
    });
    if (!Number.isSafeInteger(sequence + 1)) {
      throw new RangeError('P3 Survival supply fact sequence超出安全整数范围。');
    }
    facts.push(fact);
    this.#supplyFactSequence = sequence + 1;
  }

  #createSupplyFacts(
    result: ReturnType<EquipmentSupplyTimelineSystem['step']>,
  ): readonly ArenaSupplyAuthorityFactV1[] {
    if (this.#readFrame === null || this.#readFrameAudit === null) {
      throw new Error('P3 Survival supply fact缺少pre-step Frame/Audit。');
    }
    const projection = this.#readFrame.worldSnapshot.activeSupplyProjection;
    if (projection === null) throw new Error('P3 Survival supply fact缺少V3供给投影。');
    const identities = new Map<string, SupplyFactIdentityV1>();
    for (const supply of this.#readFrameAudit.expectedWorldSupplyIdentities) {
      identities.set(supply.equipmentInstanceId, Object.freeze({
        supplyDefinitionId: supply.supplyDefinitionId,
        supplyId: supply.supplyId,
        equipmentInstanceId: supply.equipmentInstanceId,
        runtimeEquipmentDefinitionId: supply.runtimeEquipmentDefinitionId,
        collectionEquipmentDefinitionId: supply.collectionEquipmentDefinitionId,
        survivalLevel: supply.survivalLevel,
      }));
    }
    for (const event of result.spawnedEvents) {
      const payload = event.payload;
      const runtime = runtimeIdentity(payload.equipmentDefinitionId);
      identities.set(payload.equipmentInstanceId, Object.freeze({
        supplyDefinitionId: payload.supplyDefinitionId,
        supplyId: payload.supplyId,
        equipmentInstanceId: payload.equipmentInstanceId,
        ...runtime,
      }));
    }

    const facts: ArenaSupplyAuthorityFactV1[] = [];
    for (const event of [...result.spawnedEvents].sort((left, right) => (
      compareText(left.payload.supplyId, right.payload.supplyId)
    ))) {
      const identity = identities.get(event.payload.equipmentInstanceId);
      if (identity === undefined) throw new Error('P3 Survival spawned supply fact身份丢失。');
      this.#appendSupplyFact(
        facts,
        result.tick,
        ARENA_SUPPLY_AUTHORITY_FACT_KIND_V1.SPAWNED,
        identity,
        null,
        null,
      );
    }
    for (const event of [...result.expiredEvents].sort((left, right) => (
      compareText(left.payload.supplyId, right.payload.supplyId)
    ))) {
      const identity = identities.get(event.payload.equipmentInstanceId);
      if (identity === undefined) throw new Error('P3 Survival expired supply fact身份丢失。');
      this.#appendSupplyFact(
        facts,
        result.tick,
        ARENA_SUPPLY_AUTHORITY_FACT_KIND_V1.EXPIRED,
        identity,
        null,
        null,
      );
    }
    for (const decision of [...result.pickupDecisions].sort((left, right) => (
      compareText(left.participantId, right.participantId)
      || compareText(left.equipmentInstanceId, right.equipmentInstanceId)
    ))) {
      const identity = identities.get(decision.equipmentInstanceId);
      if (identity === undefined) throw new Error('P3 Survival pickup supply fact身份丢失。');
      this.#appendSupplyFact(
        facts,
        result.tick,
        decision.kind === 'replaced'
          ? ARENA_SUPPLY_AUTHORITY_FACT_KIND_V1.REPLACED
          : ARENA_SUPPLY_AUTHORITY_FACT_KIND_V1.PICKED_UP,
        identity,
        decision.participantId,
        decision.previousEquipmentInstanceId,
      );
    }
    return Object.freeze(facts);
  }

  prepareInputFrames(value: unknown): readonly ArenaInputFrame[] {
    this.#assertNoOperation('prepare-inputs');
    this.#assertLive();
    if (this.#paused || this.#readFrame === null) {
      throw new Error('P3 Survival shared authority当前不可prepare输入。');
    }
    const source = cloneFrozenData(value, 'P3 Survival shared prepare request');
    exactRecord(source, PREPARE_KEYS, 'P3 Survival shared prepare request');
    const tick = this.#readFrame.worldSnapshot.tick;
    const playerInputFrame = normalizeInputFrame(source.playerInputFrame, {
      expectedTick: tick,
      participantIds: [PLAYER_ID],
    });
    if (playerInputFrame.participantId !== PLAYER_ID) {
      throw new RangeError('P3 Survival shared prepare只接受player输入。');
    }
    const playerInputHash = createDeterministicDataHash(
      playerInputFrame,
      'P3 Survival shared player input',
    );
    if (this.#prepared !== null) {
      if (this.#prepared.tick !== tick || this.#prepared.playerInputHash !== playerInputHash) {
        throw new RangeError('P3 Survival shared同tick prepare输入发生分叉。');
      }
      return this.#prepared.inputFrames;
    }
    this.#beginOperation('prepare-inputs');
    try {
      const { physics, timeline, engine } = this.#resources();
      const actionBeforeSupply = new Map(this.#participantIds.map((participantId) => (
        [participantId, engine.getActionSnapshot(participantId).definitionId] as const
      )));
      const supplyResult = timeline.step({
        tick,
        participants: this.#participantIds.map((participantId) => {
          const authority = this.#states.get(participantId)!;
          return Object.freeze({
            id: participantId,
            eligible: authority.active,
            position: physics.getCharacterState(participantId).position,
          });
        }),
        contestSeed: deriveSeed(
          this.#matchSeed,
          `arena.p3.survival.shared.supply-contest:tick:${tick}`,
        ),
      });
      this.#recordSupply(supplyResult);
      const supplyFacts = this.#createSupplyFacts(supplyResult);
      const interruptedActionByParticipant = new Map<string, string>();
      for (const { participantId } of supplyResult.pickupDecisions) {
        const actionDefinitionId = actionBeforeSupply.get(participantId) ?? null;
        if (actionDefinitionId === null) continue;
        const previous = interruptedActionByParticipant.get(participantId);
        if (previous !== undefined && previous !== actionDefinitionId) {
          throw new RangeError('P3 Survival同tick装备中断动作身份发生分叉。');
        }
        interruptedActionByParticipant.set(participantId, actionDefinitionId);
      }
      const interruptedEquipmentActions = Object.freeze(
        [...interruptedActionByParticipant]
          .sort(([left], [right]) => compareText(left, right))
          .map(([participantId, actionDefinitionId]) => Object.freeze({
            participantId,
            actionDefinitionId,
          })),
      );
      const frameByParticipant = new Map<string, ArenaInputFrame>([[PLAYER_ID, playerInputFrame]]);
      for (const participantId of this.#enemyIds) {
        frameByParticipant.set(participantId, this.#createEnemyInput(participantId, tick));
      }
      const inputFrames = Object.freeze(this.#participantIds.map((participantId) => {
        const frame = frameByParticipant.get(participantId);
        if (!frame) throw new Error(`P3 Survival缺少input frame ${participantId}。`);
        return frame;
      }));
      this.#assertOperationCommit('prepare-inputs');
      this.#prepared = Object.freeze({
        tick,
        playerInputHash,
        inputFrames,
        inputHash: createDeterministicDataHash(inputFrames, 'P3 Survival shared prepared inputs'),
        supplyResult,
        supplyFacts,
        interruptedEquipmentActions,
      });
      return inputFrames;
    } catch (error) {
      this.#failed = true;
      throw error;
    } finally {
      this.#endOperation('prepare-inputs');
    }
  }

  #equipmentSnapshot() {
    const { equipment } = this.#resources();
    return Object.freeze(equipment.listSnapshots().map((runtime) => {
      const identity = runtimeIdentity(runtime.definitionId);
      return Object.freeze({
        schemaVersion: runtime.schemaVersion,
        instanceId: runtime.instanceId,
        ...identity,
        spawnId: runtime.spawnId,
        locationState: runtime.locationState,
        ownerId: runtime.ownerId,
        position: runtime.position,
        lastSafePosition: runtime.lastSafePosition,
        cooldownRemainingTicks: runtime.cooldownRemainingTicks,
        revision: runtime.revision,
      });
    }).sort((left, right) => compareText(left.instanceId, right.instanceId)));
  }

  #supplyFrameData(tick: number, eventSequence: number) {
    const { equipment, timeline } = this.#resources();
    const projected = timeline.getPublicSupplyProjectionV3({
      modeDefinitionId: this.#config.modeDefinitionId,
      tierPolicyDefinition: this.#weaponPool.tierPolicyDefinition,
      snapshotTick: tick,
      eventSequence,
      equipment: equipment.listSnapshots(),
    });
    const audit = Object.freeze({
      worldSupplyEquipmentInstanceIds: Object.freeze(
        projected.worldSupplyEquipment.map(({ instanceId }) => instanceId),
      ),
      expectedWorldSupplyIdentities: projected.expectedWorldSupplyIdentities,
    }) satisfies MatchReadFrameV3AuditOptions;
    return Object.freeze({
      projection: projected.projection,
      cadence: projected.cadence,
      audit,
    });
  }

  #participantSnapshot(
    participantId: string,
    projection: MatchReadFrameV3['worldSnapshot']['modeProjection'],
    tick: number,
    result: DeepReadonly<ModeResultV3Payload> | null,
  ) {
    const { physics, movement, engine } = this.#resources();
    const authority = this.#states.get(participantId)!;
    const physical = physics.getCharacterState(participantId);
    const held = engine.getHeldEquipment(participantId);
    const heldIdentity = held === null ? null : runtimeIdentity(held.definitionId);
    if (projection.state.kind !== 'survival') {
      throw new RangeError('P3 Survival participant snapshot收到非Survival projection。');
    }
    if (result !== null && result.kind !== 'survival') {
      throw new RangeError('P3 Survival participant snapshot收到非Survival result。');
    }
    const projectedSlot = authority.role === 'enemy'
      ? projection.state.enemySlots.find(({ participantId: id }) => id === participantId)
      : null;
    if (
      authority.role === 'enemy'
      && (
        projectedSlot === null
        || projectedSlot === undefined
        || projectedSlot.slotId !== authority.slotId
        || projectedSlot.active !== authority.active
        || projectedSlot.generation !== authority.slotGeneration
        || (authority.active && authority.respawnReadyTick !== null)
      )
    ) {
      throw new RangeError(`P3 Survival projection与enemy authority ${participantId}不闭合。`);
    }
    if (
      authority.role === 'player'
      && (
        participantId !== projection.state.playerParticipantId
        || authority.fallCount !== projection.state.fallCount
      )
    ) {
      throw new RangeError('P3 Survival projection与player authority不闭合。');
    }
    const status = authority.role === 'player'
      ? result !== null
        ? result.reason === 'terminal-player-fall' ? 'eliminated' : 'active'
        : projection.state.fallCount >= 2
          ? 'eliminated'
          : authority.active ? 'active' : 'respawning'
      : projectedSlot?.active ? 'active' : 'eliminated';
    return Object.freeze({
      id: participantId,
      characterDefinitionId: authority.role === 'player'
        ? this.#playerCharacter.id
        : ENEMY_CHARACTER.id,
      status,
      lives: authority.role === 'player' ? Math.max(0, 2 - authority.fallCount) : 1,
      eliminations: 0,
      deaths: authority.fallCount,
      hitstunTicks: authority.hitstunTicks,
      invulnerableTicks: authority.invulnerableTicks,
      respawnTicks: status === 'eliminated' || authority.respawnReadyTick === null
        ? 0
        : Math.max(0, authority.respawnReadyTick - tick),
      lastHitBy: authority.lastHitBy,
      lastHitTick: authority.lastHitTick,
      action: actionSnapshot(engine, participantId),
      actionRule: engine.getParticipantActionRule(participantId),
      movement: Object.freeze({ ...movement.getSnapshot(participantId), grounded: physical.grounded }),
      equipment: held === null ? null : Object.freeze({
        instanceId: held.instanceId,
        ...heldIdentity!,
        cooldownRemainingTicks: held.cooldownRemainingTicks,
      }),
      position: physical.position,
      velocity: physical.velocity,
      facing: physical.facing,
      grounded: physical.grounded,
      supportSurfaceId: physical.supportSurfaceId,
    });
  }

  #localSidecar(tick: number, eventSequence: number) {
    const { engine } = this.#resources();
    const affordance = engine.getActionAffordanceProfile({
      tick,
      participantId: this.#localParticipantId,
      actors: this.#actors(),
    }, 'local-context-primary');
    return Object.freeze({
      schemaVersion: 3 as const,
      tick,
      eventSequence,
      participantId: this.#localParticipantId,
      profile: 'local-context-primary' as const,
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
  ): Readonly<{
    readonly readFrame: DeepReadonly<MatchReadFrameV3>;
    readonly readFrameAudit: MatchReadFrameV3AuditOptions;
    readonly supplyCadence: DeepReadonly<ArenaSupplyCadenceSnapshotV1>;
  }> {
    const supply = this.#supplyFrameData(tick, eventSequence);
    const readFrame = createMatchReadFrameV3Audit({
      schemaVersion: 3,
      worldSnapshot: {
        authoritySchemaVersion: 6,
        physicsBackendVersion: PHYSICS_BACKEND_VERSION,
        configHash: this.#configHash,
        ruleContentHash: this.#config.modePolicyContentHash,
        matchSeed: this.#matchSeed,
        tick,
        activeTick: tick,
        phase: result === null ? 'running' : 'ended',
        remainingTicks: Math.max(
          0,
          this.#executionTiming.interactiveLocalHardLimitActiveTicks - tick,
        ),
        eventSequence,
        modeDefinitionId: this.#config.modeDefinitionId,
        participants: this.#participantIds.map((participantId) => this.#participantSnapshot(
          participantId,
          projection,
          tick,
          result,
        )),
        equipment: this.#equipmentSnapshot(),
        activeSupplyProjection: supply.projection,
        modeProjection: projection,
        map: {
          schemaVersion: 1,
          definitionId: this.#mapContext.mapDefinition.id,
          nextActiveTick: tick + 1,
          revision: 0,
          surfaces: this.#mapContext.mapDefinition.arena.surfaces.map(
            ({ id }) => ({ id, enabled: true, revision: 0 }),
          ),
          occurrences: [],
        },
        result,
      },
      localActionSidecar: this.#localSidecar(tick, eventSequence),
    }, supply.audit);
    return Object.freeze({
      readFrame,
      readFrameAudit: supply.audit,
      supplyCadence: supply.cadence,
    });
  }

  #pushEvent(
    events: ArenaMatchEventV6[],
    tick: number,
    value: Record<string, unknown>,
  ): void {
    const sequence = (this.#readFrame?.worldSnapshot.eventSequence ?? 0) + events.length;
    events.push(createArenaMatchEventV6({
      ...value,
      id: eventId(this.#matchSeed, tick, sequence),
      sequence,
      tick,
    }));
  }

  #assertModeCommandClosure(
    commands: readonly SurvivalModeCommandV1[],
    resolution: DeepReadonly<ModeMatchResolutionV6>,
    tick: number,
    playerFell: boolean,
    enemyFalls: readonly string[],
  ): void {
    const currentReadFrame = this.#readFrame;
    const resolvedProjectionState = resolution.modeProjection.state;
    const modeState = resolution.modeState;
    if (
      resolvedProjectionState.kind !== 'survival'
      || modeState.kind !== 'survival'
      || currentReadFrame?.worldSnapshot.modeProjection.state.kind !== 'survival'
    ) throw new RangeError('P3 Survival command closure收到非Survival状态。');
    const currentProjection = currentReadFrame.worldSnapshot.modeProjection.state;
    const player = this.#states.get(this.#localParticipantId);
    if (!player || player.role !== 'player') {
      throw new RangeError('P3 Survival command closure缺少player authority。');
    }
    let playerStatus: 'active' | 'respawning' | 'ended' = player.active
      ? 'active'
      : player.respawnReadyTick === null ? 'ended' : 'respawning';
    let playerRespawnReadyTick = player.respawnReadyTick;
    let fallCount = player.fallCount;
    const expectedRespawnPolicy = this.#modePolicyResolver?.resolveParticipantFall(
      this.#localParticipantId,
      tick,
    )?.respawn ?? null;
    const expectedRespawnDelayTicks = expectedRespawnPolicy?.delayTicks
      ?? ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.delayTicks;
    const expectedRespawnProtectionTicks = expectedRespawnPolicy?.protectionTicks
      ?? ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.protectionTicks;
    const expectedRespawnAnchorId = resolveArenaV2SurvivalFirstRespawnAnchorCandidateV1(
      this.#mapContext.mapDefinition.id,
    );
    const currentStage = this.#pressurePolicy.stages.find(({ stage }) => (
      stage === modeState.pressureStage
    ));
    if (!currentStage) throw new RangeError('P3 Survival command closure缺少当前压力阶段。');
    const enemyDraft = new Map<string, {
      slotId: string;
      active: boolean;
      generation: number;
      anchorId: string | null;
      expectedReactivationReadyTick: number | null;
    }>(currentProjection.enemySlots.map((slot) => {
      const authority = this.#states.get(slot.participantId);
      if (
        !authority
        || authority.role !== 'enemy'
        || authority.slotId !== slot.slotId
        || authority.active !== slot.active
        || authority.slotGeneration !== slot.generation
      ) throw new RangeError('P3 Survival current Projection与enemy authority不闭合。');
      return [slot.participantId, {
        slotId: slot.slotId,
        active: slot.active,
        generation: slot.generation,
        anchorId: slot.anchorId,
        expectedReactivationReadyTick: authority.respawnReadyTick,
      }];
    }));
    const enemyFallSet = new Set(enemyFalls);
    let countedPlayerFall = false;
    let scheduledPlayerRespawn = false;
    let respawnedPlayer = false;
    let ended = false;
    const consumedEnemyFalls = new Set<string>();
    for (const command of commands) {
      if (ended) throw new RangeError('P3 Survival end-survival之后不得继续执行命令。');
      if (command.kind === 'count-player-fall') {
        if (
          countedPlayerFall
          || !playerFell
          || command.participantId !== this.#localParticipantId
          || playerStatus !== 'active'
          || command.fallCount !== fallCount + 1
          || command.terminal !== (command.fallCount === command.terminalFallCount)
        ) throw new RangeError('P3 Survival count-player-fall与player事实不闭合。');
        countedPlayerFall = true;
        fallCount = command.fallCount;
        if (command.terminal) {
          playerStatus = 'ended';
          playerRespawnReadyTick = null;
        }
      } else if (command.kind === 'schedule-player-respawn') {
        if (
          resolution.modeResult !== null
          || scheduledPlayerRespawn
          || !countedPlayerFall
          || fallCount !== 1
          || playerStatus !== 'active'
          || command.participantId !== this.#localParticipantId
          || command.readyTick !== tick + expectedRespawnDelayTicks
          || command.anchorId !== expectedRespawnAnchorId
          || command.protectionTicks !== expectedRespawnProtectionTicks
        ) throw new RangeError('P3 Survival schedule-player-respawn与Policy不闭合。');
        scheduledPlayerRespawn = true;
        playerStatus = 'respawning';
        playerRespawnReadyTick = command.readyTick;
      } else if (command.kind === 'respawn-player') {
        if (
          resolution.modeResult !== null
          || respawnedPlayer
          || playerFell
          || playerStatus !== 'respawning'
          || playerRespawnReadyTick !== tick
          || command.participantId !== this.#localParticipantId
          || command.anchorId !== expectedRespawnAnchorId
          || command.protectionTicks !== expectedRespawnProtectionTicks
        ) throw new RangeError('P3 Survival respawn-player与pending/Policy不闭合。');
        respawnedPlayer = true;
        playerStatus = 'active';
        playerRespawnReadyTick = null;
      } else if (command.kind === 'change-enemy-slot') {
        const slot = enemyDraft.get(command.participantId);
        if (
          !slot
          || slot.slotId !== command.slotId
          || slot.generation !== command.previousGeneration
        ) throw new RangeError('P3 Survival enemy command与当前slot不闭合。');
        if (command.active) {
          if (
            resolution.modeResult !== null
            || command.reason === 'fell'
            || command.generation !== command.previousGeneration + 1
            || command.anchorId === null
          ) throw new RangeError('P3 Survival enemy激活command不闭合。');
          requireAnchor(command.anchorId, this.#mapContext);
          slot.active = true;
          slot.generation = command.generation;
          slot.anchorId = command.anchorId;
          slot.expectedReactivationReadyTick = null;
        } else {
          if (
            command.reason !== 'fell'
            || !enemyFallSet.has(command.participantId)
            || !slot.active
            || command.generation !== command.previousGeneration
            || command.anchorId !== null
          ) throw new RangeError('P3 Survival enemy掉落command不闭合。');
          consumedEnemyFalls.add(command.participantId);
          slot.active = false;
          slot.anchorId = null;
          slot.expectedReactivationReadyTick = tick + currentStage.reactivationDelayTicks;
        }
      } else {
        if (command.result.kind !== 'survival') {
          throw new RangeError('P3 Survival end command结果类型漂移。');
        }
        ended = true;
        playerStatus = 'ended';
        playerRespawnReadyTick = null;
      }
    }
    if (playerFell !== countedPlayerFall) {
      throw new RangeError('P3 Survival player掉落与计数命令集合不闭合。');
    }
    if (
      consumedEnemyFalls.size !== enemyFallSet.size
      || [...enemyFallSet].some((participantId) => !consumedEnemyFalls.has(participantId))
    ) throw new RangeError('P3 Survival enemy掉落与失活命令集合不闭合。');
    if (resolution.modeResult === null && ended) {
      throw new RangeError('P3 Survival非终局命令模拟出现end-survival。');
    }
    if (resolution.modeResult !== null && !ended) {
      throw new RangeError('P3 Survival终局命令模拟缺少end-survival。');
    }
    if (resolution.modeResult !== null && (scheduledPlayerRespawn || respawnedPlayer)) {
      throw new RangeError('P3 Survival终局不得调度或执行玩家复活。');
    }
    if (
      modeState.playerStatus !== playerStatus
      || modeState.playerRespawnReadyTick !== playerRespawnReadyTick
      || modeState.fallCount !== fallCount
    ) throw new RangeError('P3 Survival player命令结果与ModeState不闭合。');
    const finalProjectionByParticipantId = new Map(
      resolvedProjectionState.enemySlots.map((slot) => [slot.participantId, slot]),
    );
    const finalModeStateByParticipantId = new Map(
      modeState.enemySlots.map((slot) => [slot.participantId, slot]),
    );
    for (const [participantId, draft] of enemyDraft) {
      const projected = finalProjectionByParticipantId.get(participantId);
      const resolvedModeSlot = finalModeStateByParticipantId.get(participantId);
      if (
        !projected
        || !resolvedModeSlot
        || projected.slotId !== draft.slotId
        || projected.active !== draft.active
        || projected.generation !== draft.generation
        || projected.anchorId !== draft.anchorId
        || resolvedModeSlot.slotId !== draft.slotId
        || resolvedModeSlot.active !== draft.active
        || resolvedModeSlot.generation !== draft.generation
        || resolvedModeSlot.anchorId !== draft.anchorId
        || resolvedModeSlot.reactivationReadyTick !== draft.expectedReactivationReadyTick
      ) throw new RangeError('P3 Survival enemy命令结果与Projection/ModeState不闭合。');
    }
  }

  #applyModeCommands(
    commands: readonly unknown[],
    tick: number,
    events: ArenaMatchEventV6[],
    pressureStage: number,
  ): void {
    const { physics, movement, engine } = this.#resources();
    const currentStage = this.#pressurePolicy.stages.find(({ stage }) => (
      stage === pressureStage
    ));
    if (!currentStage) throw new RangeError('P3 Survival command apply缺少当前压力阶段。');
    for (const command of commands as readonly SurvivalModeCommandV1[]) {
      if (command.kind === 'change-enemy-slot') {
        const participant = this.#states.get(command.participantId);
        if (
          !participant
          || participant.role !== 'enemy'
          || participant.slotId !== command.slotId
          || participant.slotGeneration !== command.previousGeneration
        ) throw new RangeError('P3 Survival enemy slot command身份漂移。');
        participant.active = command.active;
        participant.slotGeneration = command.generation;
        participant.respawnReadyTick = command.active
          ? null
          : tick + currentStage.reactivationDelayTicks;
        if (!command.active) participant.fallCount += 1;
        participant.hitstunTicks = 0;
        participant.invulnerableTicks = 0;
        participant.lastHitBy = null;
        participant.lastHitTick = -1;
        if (command.active) {
          if (command.anchorId === null) throw new RangeError('active enemy缺少anchor。');
          const anchor = requireAnchor(command.anchorId, this.#mapContext);
          physics.resetCharacter(command.participantId, {
            position: anchorSpawnPosition(anchor, ENEMY_PROFILE),
          });
          movement.resetParticipant(command.participantId);
          engine.resetParticipant(command.participantId);
          const reentrySegment = this.#mapContext.segmentBySurfaceId.get(
            anchor.surfaceId,
          );
          if (!reentrySegment) {
            throw new RangeError(`Survival敌人入口锚${anchor.id}未归属当前地图路线段。`);
          }
          participant.currentSegmentId = reentrySegment.id;
          participant.lastSupportSurfaceId = anchor.surfaceId;
          if (command.reason === 'reactivation-ready') {
            this.#evidence.enemyReactivationCount += 1;
          }
        }
        this.#pushEvent(events, tick, {
          type: ARENA_MATCH_EVENT_V6.SURVIVAL_ENEMY_SLOT_CHANGED,
          modeDefinitionId: this.#config.modeDefinitionId,
          participantId: command.participantId,
          slotId: command.slotId,
          previousGeneration: command.previousGeneration,
          generation: command.generation,
          active: command.active,
          anchorId: command.anchorId,
          reason: command.reason,
        });
      } else if (command.kind === 'count-player-fall') {
        const player = this.#states.get(command.participantId);
        if (
          !player
          || player.role !== 'player'
          || command.fallCount !== player.fallCount + 1
        ) throw new RangeError('P3 Survival player fall command计数漂移。');
        player.fallCount = command.fallCount;
        player.active = !command.terminal;
        this.#pushEvent(events, tick, {
          type: ARENA_MATCH_EVENT_V6.SURVIVAL_PLAYER_FALL_COUNTED,
          modeDefinitionId: this.#config.modeDefinitionId,
          participantId: command.participantId,
          fallCount: command.fallCount,
          terminalFallCount: command.terminalFallCount,
          terminal: command.terminal,
        });
      } else if (command.kind === 'schedule-player-respawn') {
        const player = this.#states.get(command.participantId);
        if (!player || player.role !== 'player' || player.respawnReadyTick !== null) {
          throw new RangeError('P3 Survival schedule-player-respawn ownership无效。');
        }
        player.active = false;
        player.respawnReadyTick = command.readyTick;
        this.#pushEvent(events, tick, {
          type: ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWN_SCHEDULED,
          modeDefinitionId: this.#config.modeDefinitionId,
          participantId: command.participantId,
          modeRole: 'player',
          slotId: null,
          slotGeneration: 0,
          readyTick: command.readyTick,
          anchorId: command.anchorId,
          reason: 'survival-first-fall',
        });
      } else if (command.kind === 'respawn-player') {
        const player = this.#states.get(command.participantId);
        if (
          !player
          || player.role !== 'player'
          || player.respawnReadyTick !== tick
        ) throw new RangeError('P3 Survival respawn-player必须命中权威readyTick。');
        const anchor = requireAnchor(command.anchorId, this.#mapContext);
        physics.resetCharacter(command.participantId, {
          position: anchorSpawnPosition(anchor, this.#playerProfile),
        });
        movement.resetParticipant(command.participantId);
        engine.resetParticipant(command.participantId);
        player.active = true;
        player.respawnReadyTick = null;
        player.invulnerableTicks = command.protectionTicks;
        player.hitstunTicks = 0;
        player.lastHitBy = null;
        player.lastHitTick = -1;
        const respawnSegment = this.#mapContext.segmentBySurfaceId.get(anchor.surfaceId);
        if (!respawnSegment) {
          throw new RangeError(`Survival玩家复活锚${anchor.id}未归属当前地图路线段。`);
        }
        player.currentSegmentId = respawnSegment.id;
        player.lastSupportSurfaceId = anchor.surfaceId;
        this.#pushEvent(events, tick, {
          type: ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWNED,
          modeDefinitionId: this.#config.modeDefinitionId,
          participantId: command.participantId,
          modeRole: 'player',
          slotId: null,
          slotGeneration: 0,
          anchorId: command.anchorId,
          invulnerableTicks: command.protectionTicks,
        });
      } else if (command.kind === 'end-survival') {
        const player = this.#states.get(command.result.playerParticipantId);
        if (
          !player
          || player.role !== 'player'
          || command.result.playerParticipantId !== this.#localParticipantId
          || command.result.endedAtTick !== tick
          || command.result.fallCount !== player.fallCount
        ) throw new RangeError('P3 Survival end-survival终局身份漂移。');
        player.active = false;
        player.respawnReadyTick = null;
        player.invulnerableTicks = 0;
        player.hitstunTicks = 0;
        player.lastHitBy = null;
        player.lastHitTick = -1;
      } else {
        throw new RangeError(`P3 Survival未知mode command ${String((command as { kind?: unknown }).kind)}。`);
      }
    }
    this.#evidence.maximumActiveEnemyCount = Math.max(
      this.#evidence.maximumActiveEnemyCount,
      this.#enemyIds.filter((participantId) => this.#states.get(participantId)!.active).length,
    );
  }

  start(context: Readonly<{
    readonly config: ArenaMatchConfigV6;
    readonly expectedMatchSeed: number;
    readonly localParticipantId: string;
  }>): unknown {
    this.#assertNoOperation('start');
    this.#assertLive();
    if (this.#readFrame !== null || this.#paused) {
      throw new Error('P3 Survival shared authority只能启动一次。');
    }
    if (
      context.expectedMatchSeed !== this.#matchSeed
      || context.localParticipantId !== this.#localParticipantId
      || !sameData(context.config, this.#config, 'P3 Survival shared start config')
    ) throw new RangeError('P3 Survival shared authority start身份漂移。');
    const projection = Object.freeze({
      schemaVersion: 1 as const,
      modeDefinitionId: this.#config.modeDefinitionId,
      revision: 0,
      preparationRemainingTicks: null,
      state: Object.freeze({
        kind: 'survival' as const,
        playerParticipantId: PLAYER_ID,
        fallCount: 0,
        terminalFallCount: 2 as const,
        survivedTicks: 0,
        pressureStage: 0,
        enemySlots: Object.freeze(this.#config.participantAssignments.flatMap((assignment) => (
          assignment.modeRole === 'enemy' ? [Object.freeze({
            slotId: assignment.slotId!,
            participantId: assignment.participantId,
            active: false,
            generation: assignment.slotGeneration,
            anchorId: null,
          })] : []
        )).sort((left, right) => compareText(left.slotId, right.slotId))),
      }),
    });
    const initial = this.#createFrame(0, 0, projection, null);
    this.#readFrame = initial.readFrame;
    this.#readFrameAudit = initial.readFrameAudit;
    this.#stateHash = createDeterministicDataHash({
      config: this.#config,
      matchSeed: this.#matchSeed,
      worldSnapshot: initial.readFrame.worldSnapshot,
      supplyCadence: initial.supplyCadence,
      feedbackCheckpoint: this.#feedbackOwner().exportFeedbackCheckpointV1(),
      feedbackDirectionCheckpoint: this.#feedbackOwner().exportDirectionCheckpointV2(),
      timeline: this.#resources().timeline.getSnapshot(),
      controllers: [...this.#controllers].map(([id, controller]) => ({
        id,
        checkpoint: controller.exportCheckpointV2(),
      })),
    }, 'P3 Survival shared initial state');
    return Object.freeze({
      readFrame: this.#readFrame,
      readFrameAudit: this.#readFrameAudit,
      supplyCadence: initial.supplyCadence,
      localJumpAvailability: this.#localJumpAvailability(this.#readFrame),
      stateHash: this.#stateHash,
    });
  }

  step(request: Readonly<{
    readonly tick: number;
    readonly inputFrames: readonly ArenaInputFrame[];
    readonly resolveMode: (facts: unknown) => ModeMatchResolutionV6;
  }>): unknown {
    this.#assertNoOperation('step');
    this.#assertLive();
    if (
      this.#paused
      || this.#readFrame === null
      || this.#stateHash === null
      || this.#prepared === null
    ) throw new Error('P3 Survival shared authority当前不可step。');
    const tick = request.tick;
    if (
      tick !== this.#readFrame.worldSnapshot.tick
      || this.#prepared.tick !== tick
      || createDeterministicDataHash(
        request.inputFrames,
        'P3 Survival shared step inputs',
      ) !== this.#prepared.inputHash
    ) throw new RangeError('P3 Survival shared authority step未消费同tick已绑定输入。');
    this.#beginOperation('step');
    try {
      const { physics, movement, engine, timeline } = this.#resources();
      for (const participant of this.#states.values()) {
        participant.hitstunTicks = Math.max(0, participant.hitstunTicks - 1);
        participant.invulnerableTicks = Math.max(0, participant.invulnerableTicks - 1);
      }
      engine.advanceTimers();
      movement.prepareTick({
        tick,
        contacts: this.#participantIds.map((participantId) => ({
          participantId,
          grounded: physics.getCharacterState(participantId).grounded,
        })),
        inputs: request.inputFrames,
        availability: this.#participantIds.map((participantId) => {
          const authority = this.#states.get(participantId)!;
          return Object.freeze({
            participantId,
            canMove: authority.active && authority.hitstunTicks === 0,
          });
        }),
      });
      const started = engine.resolveActions({
        tick,
        actors: this.#actors(),
        inputFrames: request.inputFrames,
        additionalCandidates: [],
      });
      const feedback = this.#feedbackOwner();
      const feedbackSequenceStart = feedback.exportFeedbackCheckpointV1().sourceEventSequence;
      const feedbackSourceEvents: WeaponFeedbackSourceEventV1[] = [];
      for (const interrupted of this.#prepared.interruptedEquipmentActions) {
        feedbackSourceEvents.push(Object.freeze({
          id: `p3-survival-feedback-interrupt:${this.#matchSeed.toString(16)}:${tick}:${feedbackSequenceStart + feedbackSourceEvents.length}`,
          sequence: feedbackSequenceStart + feedbackSourceEvents.length,
          tick,
          type: 'ActionInterrupted' as const,
          participantId: interrupted.participantId,
          action: interrupted.actionDefinitionId,
        }));
      }
      for (const event of started.events) {
        if (event.type !== 'ActionCommitmentCancelled') continue;
        feedbackSourceEvents.push(Object.freeze({
          ...event,
          id: `p3-survival-feedback-cancel:${this.#matchSeed.toString(16)}:${tick}:${feedbackSequenceStart + feedbackSourceEvents.length}`,
          sequence: feedbackSequenceStart + feedbackSourceEvents.length,
          tick,
          type: 'ActionCommitmentCancelled' as const,
        }));
      }
      for (const start of started.starts) {
        feedbackSourceEvents.push(Object.freeze({
          id: `p3-survival-feedback-action:${this.#matchSeed.toString(16)}:${tick}:${feedbackSequenceStart + feedbackSourceEvents.length}`,
          sequence: feedbackSequenceStart + feedbackSourceEvents.length,
          tick,
          type: 'ActionStarted' as const,
          participantId: start.participantId,
          action: start.actionDefinitionId,
          lane: start.lane,
          source: start.source,
        }));
      }
      const jumpCommands = request.inputFrames.flatMap((frame) => {
        if (!this.#states.get(frame.participantId)!.active) return [];
        const command = createJumpCommand(movement, frame);
        return command === null ? [] : [command];
      });
      movement.execute([
        ...started.movementCommands.map(createMovementCommand),
        ...jumpCommands,
      ], {
        applyBatch: (mutations) => physics.applyCharacterMutationBatch(mutations),
      });
      const mutationPorts = this.#mutationPorts(
        tick,
        feedbackSourceEvents,
        feedbackSequenceStart,
      );
      engine.commit(started, mutationPorts);
      const active = engine.resolveActiveActions({ actors: this.#actors() });
      engine.commit(active, mutationPorts);
      for (const frame of request.inputFrames) {
        const authority = this.#states.get(frame.participantId)!;
        const intent = authority.active && authority.hitstunTicks === 0
          ? movement.projectHorizontalIntent(frame.participantId, frame.moveX, frame.moveZ)
          : { x: 0, z: 0 };
        physics.setMovementIntent(frame.participantId, intent.x, intent.z);
      }
      physics.step(ARENA_FIXED_DT);
      movement.completeTick({
        tick,
        contacts: this.#participantIds.map((participantId) => ({
          participantId,
          grounded: physics.getCharacterState(participantId).grounded,
        })),
      });

      const enemyFalls: string[] = [];
      let playerFell = false;
      for (const participantId of this.#participantIds) {
        const authority = this.#states.get(participantId)!;
        const physical = physics.getCharacterState(participantId);
        authority.currentSegmentId = segmentForState(
          physical,
          authority.currentSegmentId,
          this.#mapContext,
        );
        if (physical.supportSurfaceId !== null) {
          authority.lastSupportSurfaceId = physical.supportSurfaceId;
        }
        if (!authority.active
          || physical.position.y >= this.#mapContext.mapDefinition.arena.killY) continue;
        const policyFall = this.#modePolicyResolver?.resolveParticipantFall(
          participantId,
          tick,
        ) ?? null;
        if (authority.role === 'player') {
          if (policyFall !== null
            && (policyFall.modeRole !== 'player'
              || policyFall.fallDisposition !== 'count-for-objective'
              || policyFall.slotId !== null
              || policyFall.respawn === null
              || policyFall.respawn.maximumRespawns !== 1
              || policyFall.respawn.anchorPolicy.kind !== 'fixed-anchor'
              || policyFall.respawn.anchorPolicy.anchorCapabilityId
                !== ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.anchorCapabilityId)) {
            throw new RangeError('P3 Survival玩家掉落不符合resolved Elimination/Respawn Policy。');
          }
          playerFell = true;
          this.#evidence.playerFallTicks.push(tick);
        } else {
          if (policyFall !== null
            && (policyFall.modeRole !== 'enemy'
              || policyFall.fallDisposition !== 'deactivate-slot'
              || policyFall.slotId !== authority.slotId
              || policyFall.respawn !== null)) {
            throw new RangeError('P3 Survival敌人掉落不符合resolved Elimination/Respawn Policy。');
          }
          enemyFalls.push(participantId);
          this.#evidence.enemyFallCount += 1;
        }
      }
      enemyFalls.sort(compareText);
      const resolvedMode = request.resolveMode(Object.freeze({
          tick,
          activeTick: tick,
          playerFell,
          enemyFalls: Object.freeze(enemyFalls),
        }));
      this.#assertOperationCommit('step');
      const resolution = cloneFrozenData(
        resolvedMode,
        'P3 Survival mode resolution',
      );
      exactRecord(resolution, MODE_RESOLUTION_KEYS, 'P3 Survival mode resolution');
      if (resolution.tick !== tick) {
        throw new RangeError('P3 Survival mode resolution tick漂移。');
      }
      const previousProjectionRevision = this.#readFrame.worldSnapshot.modeProjection.revision;
      if (
        resolution.modeProjection.schemaVersion !== 1
        || resolution.modeProjection.modeDefinitionId !== this.#config.modeDefinitionId
        || resolution.modeProjection.preparationRemainingTicks !== null
        || resolution.modeProjection.state.kind !== 'survival'
        || resolution.modeState.kind !== 'survival'
        || resolution.modeState.lastProcessedTick !== tick
        || resolution.modeProjection.revision !== resolution.modeState.revision
        || resolution.modeProjection.revision < previousProjectionRevision
        || resolution.modeProjection.revision > previousProjectionRevision + 1
        || resolution.modeProjection.state.playerParticipantId
          !== resolution.modeState.playerParticipantId
        || resolution.modeProjection.state.fallCount !== resolution.modeState.fallCount
        || resolution.modeProjection.state.terminalFallCount
          !== resolution.modeState.terminalFallCount
        || resolution.modeProjection.state.survivedTicks !== resolution.modeState.survivedTicks
        || resolution.modeProjection.state.pressureStage !== resolution.modeState.pressureStage
        || !sameData(
          resolution.modeProjection.state.enemySlots,
          resolution.modeState.enemySlots.map((slot) => Object.freeze({
            slotId: slot.slotId,
            participantId: slot.participantId,
            active: slot.active,
            generation: slot.generation,
            anchorId: slot.anchorId,
          })),
          'P3 Survival projection/modeState enemy slots',
        )
      ) {
        throw new RangeError('P3 Survival projection/modeState身份不闭合。');
      }
      const normalizedModeResult = resolution.modeResult === null
        ? null
        : createModeResultV3Payload(resolution.modeResult);
      const modeResult = normalizedModeResult === null
        ? null
        : this.#modeResultPolicyResolver?.assertResult(normalizedModeResult, tick)
          ?? normalizedModeResult;
      if (modeResult === null) {
        if (
          resolution.modeState.playerStatus === 'ended'
          || resolution.modeProjection.state.fallCount >= 2
        ) {
          throw new RangeError('P3 Survival非终局Projection/ModeState不得携带ended。');
        }
      } else if (
        modeResult.kind !== 'survival'
        || modeResult.endedAtTick !== tick
        || resolution.modeState.playerStatus !== 'ended'
        || resolution.modeState.playerRespawnReadyTick !== null
        || modeResult.playerParticipantId
          !== resolution.modeProjection.state.playerParticipantId
        || modeResult.fallCount !== resolution.modeProjection.state.fallCount
        || modeResult.survivedTicks !== resolution.modeProjection.state.survivedTicks
        || modeResult.pressureStage !== resolution.modeProjection.state.pressureStage
        || (modeResult.reason === 'terminal-player-fall')
          !== (modeResult.fallCount === resolution.modeProjection.state.terminalFallCount)
      ) {
        throw new RangeError('P3 Survival Projection与终局Result不闭合。');
      }
      const modeCommands = validateSurvivalModeCommands(resolution.commands);
      this.#assertModeCommandClosure(
        modeCommands,
        resolution,
        tick,
        playerFell,
        enemyFalls,
      );
      const terminalCommandIndexes = modeCommands.flatMap((command, index) => (
        command.kind === 'end-survival' ? [index] : []
      ));
      if (modeResult === null) {
        if (terminalCommandIndexes.length !== 0) {
          throw new RangeError('P3 Survival非终局resolution不得携带end-survival。');
        }
      } else {
        const terminalIndex = terminalCommandIndexes[0];
        const terminalCommand = terminalIndex === undefined
          ? null
          : modeCommands[terminalIndex];
        if (
          modeResult.kind !== 'survival'
          || terminalCommandIndexes.length !== 1
          || terminalIndex !== modeCommands.length - 1
          || terminalCommand?.kind !== 'end-survival'
          || !sameData(
            terminalCommand.result,
            modeResult,
            'P3 Survival terminal command/result identity',
          )
        ) {
          throw new RangeError('P3 Survival终局命令与顶层Result不闭合。');
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
        if (equipmentAction && held === null) {
          throw new Error('P3 Survival equipment ActionStarted缺少当前武器身份。');
        }
        const identity = equipmentAction ? runtimeIdentity(held!.definitionId) : null;
        if (identity !== null) {
          this.#evidence.usedRuntimeEquipmentDefinitionIds.add(
            identity.runtimeEquipmentDefinitionId,
          );
        }
        this.#evidence.actionStartedCount += 1;
        this.#pushEvent(events, tick, {
          type: ARENA_MATCH_EVENT_V6.ACTION_STARTED,
          participantId: start.participantId,
          action: start.actionDefinitionId,
          sourceKind: equipmentAction ? 'equipment' : 'base-action',
          equipmentInstanceId: equipmentAction ? held!.instanceId : null,
          runtimeEquipmentDefinitionId: identity?.runtimeEquipmentDefinitionId ?? null,
          collectionEquipmentDefinitionId: identity?.collectionEquipmentDefinitionId ?? null,
          survivalLevel: identity?.survivalLevel ?? null,
        });
      }
      for (const participantId of [...enemyFalls, ...(playerFell ? [PLAYER_ID] : [])]) {
        const participant = this.#states.get(participantId)!;
        const creditedAttackerId = participant.lastHitBy !== null
          && tick - participant.lastHitTick <= LAST_HIT_CREDIT_TICKS
          ? participant.lastHitBy
          : null;
        if (
          creditedAttackerId === null
          || tick - participant.lastHitTick
            <= ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1
        ) {
          feedbackSourceEvents.push(Object.freeze({
            id: `p3-survival-feedback-fall:${this.#matchSeed.toString(16)}:${tick}:${feedbackSequenceStart + feedbackSourceEvents.length}`,
            sequence: feedbackSequenceStart + feedbackSourceEvents.length,
            tick,
            type: 'PlayerEliminated' as const,
            participantId,
            remainingLives: 0,
            creditedAttackerId,
          }));
        }
        this.#pushEvent(events, tick, {
          type: ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL,
          modeDefinitionId: this.#config.modeDefinitionId,
          participantId,
          modeRole: participant.role,
          slotId: participant.slotId,
          slotGeneration: participant.slotGeneration,
          fallCause: creditedAttackerId === null ? 'movement' : 'credited-hit',
          creditedAttackerId,
          supportSurfaceId: participant.lastSupportSurfaceId,
        });
      }
      this.#applyModeCommands(
        modeCommands,
        tick,
        events,
        resolution.modeState.pressureStage,
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
      const next = this.#createFrame(
        tick + 1,
        nextSequence,
        resolution.modeProjection,
        modeResult,
      );
      const controllerStateHashCheckpoints = [...this.#controllers].map(([id, controller]) => ({
        id,
        checkpoint: controller.exportCheckpointV2(),
      }));
      this.#assertOperationCommit('step');
      const nextStateHash = createDeterministicDataHash({
        previousHash: this.#stateHash,
        preparedSupply: this.#prepared.supplyResult,
        supplyFacts: this.#prepared.supplyFacts,
        supplyCadence: next.supplyCadence,
        supplyFactSequence: this.#supplyFactSequence,
        inputFrames: request.inputFrames,
        events,
        modeCommands: resolution.commands,
        feedbackCheckpoint: feedbackResult.feedbackCheckpoint,
        feedbackDirectionCheckpoint: feedbackResult.directionCheckpoint,
        feedbackDirectionFacts: feedbackResult.directionFacts,
        worldSnapshot: next.readFrame.worldSnapshot,
        timeline: timeline.getSnapshot(),
        controllers: controllerStateHashCheckpoints,
      }, 'P3 Survival shared authority state');
      this.#assertOperationCommit('step');
      this.#readFrame = next.readFrame;
      this.#readFrameAudit = next.readFrameAudit;
      this.#stateHash = nextStateHash;
      this.#committedDirectionFacts = feedbackResult.directionFacts;
      const supplyFacts = this.#prepared.supplyFacts;
      this.#prepared = null;
      return Object.freeze({
        readFrame: next.readFrame,
        readFrameAudit: next.readFrameAudit,
        events: Object.freeze(events),
        supplyFacts,
        supplyCadence: next.supplyCadence,
        localJumpAvailability: this.#localJumpAvailability(next.readFrame),
        stateHash: nextStateHash,
        appliedModeCommandHash: createDeterministicDataHash(
          resolution.commands,
          'P3 Survival shared applied mode commands',
        ),
      });
    } catch (error) {
      this.#failed = true;
      throw error;
    } finally {
      this.#endOperation('step');
    }
  }

  exportCheckpoint(current?: Readonly<{
    readonly readFrame: DeepReadonly<MatchReadFrameV3>;
    readonly readFrameAudit: MatchReadFrameV3AuditOptions;
    readonly stateHash: string;
  }>): ArenaSurvivalSharedWorldAuthorityCheckpointV3 {
    this.#assertNoOperation('checkpoint-read');
    this.#assertLive();
    if (
      this.#prepared !== null
      || this.#readFrame === null
      || this.#readFrameAudit === null
      || this.#stateHash === null
    ) {
      throw new Error('P3 Survival shared authority尚无checkpoint状态。');
    }
    if (
      current !== undefined
      && (
        current.stateHash !== this.#stateHash
        || !sameData(current.readFrame, this.#readFrame, 'P3 Survival checkpoint current frame')
        || !sameData(
          current.readFrameAudit,
          this.#readFrameAudit,
          'P3 Survival checkpoint current frame audit',
        )
      )
    ) throw new RangeError('P3 Survival checkpoint调用方current与authority已提交状态漂移。');
    const { physics, movement, engine, timeline } = this.#resources();
    if (typeof engine.exportCheckpointV1 !== 'function') {
      throw new Error('P3 Survival RuleEngine不支持完整checkpoint。');
    }
    const evidence: ArenaSurvivalSharedAuthorityEvidenceCheckpointV1 = Object.freeze({
      supplySpawnedCount: this.#evidence.supplySpawnedCount,
      supplyExpiredCount: this.#evidence.supplyExpiredCount,
      supplyPickedUpCount: this.#evidence.supplyPickedUpCount,
      supplyReplacementCount: this.#evidence.supplyReplacementCount,
      firstObservedSpawnTick: this.#evidence.firstObservedSpawnTick,
      firstObservedExpiryTick: this.#evidence.firstObservedExpiryTick,
      firstObservedPickupTick: this.#evidence.firstObservedPickupTick,
      firstObservedReplacementTick: this.#evidence.firstObservedReplacementTick,
      observedSurvivalLevels: Object.freeze([...this.#evidence.observedSurvivalLevels]
        .sort((left, right) => left - right)),
      v2ObservationCount: this.#evidence.v2ObservationCount,
      unarmedVisibleSupplyObservationCount: this.#evidence.unarmedVisibleSupplyObservationCount,
      heldEquipmentObservationCount: this.#evidence.heldEquipmentObservationCount,
      botInputFrameCount: this.#evidence.botInputFrameCount,
      botPrimaryPressCount: this.#evidence.botPrimaryPressCount,
      actionStartedCount: this.#evidence.actionStartedCount,
      hitCount: this.#evidence.hitCount,
      impulseCount: this.#evidence.impulseCount,
      usedRuntimeEquipmentDefinitionIds: Object.freeze(
        [...this.#evidence.usedRuntimeEquipmentDefinitionIds].sort(compareText),
      ),
      playerFallTicks: Object.freeze([...this.#evidence.playerFallTicks]),
      enemyFallCount: this.#evidence.enemyFallCount,
      enemyReactivationCount: this.#evidence.enemyReactivationCount,
      maximumActiveEnemyCount: this.#evidence.maximumActiveEnemyCount,
    });
    const core = cloneFrozenData({
      schemaVersion: 3 as const,
      configHash: this.#configHash,
      matchSeed: this.#matchSeed,
      localParticipantId: this.#localParticipantId,
      participantIds: Object.freeze([...this.#participantIds].sort(compareText)),
      executionTiming: this.#executionTiming,
      readFrame: this.#readFrame,
      readFrameAudit: this.#readFrameAudit,
      stateHash: this.#stateHash,
      paused: this.#paused,
      supplyFactSequence: this.#supplyFactSequence,
      participantStates: Object.freeze([...this.#states.values()]
        .sort((left, right) => compareText(left.participantId, right.participantId))
        .map((state) => Object.freeze({ ...state }))),
      evidence,
      physicsCheckpoint: physics.exportCheckpointV1(),
      movementCheckpoint: movement.exportCheckpointV1(),
      ruleCheckpoint: engine.exportCheckpointV1(),
      timelineSnapshot: timeline.getSnapshot(),
      controllerCheckpoints: Object.freeze([...this.#controllers]
        .sort(([left], [right]) => compareText(left, right))
        .map(([participantId, controller]) => Object.freeze({
          participantId,
          behaviorSeed: this.#behaviorSeeds.get(participantId)!,
          checkpoint: controller.exportCheckpointV2(),
        }))),
      feedbackCheckpoint: this.#feedbackOwner().exportFeedbackCheckpointV1(),
      feedbackDirectionCheckpoint: this.#feedbackOwner().exportDirectionCheckpointV2(),
    }, 'P3 Survival shared authority checkpoint core');
    return cloneFrozenData({
      ...core,
      checkpointIdentityHash: createDeterministicDataHash(
        core,
        'P3 Survival authority checkpoint identity',
      ),
    }, 'P3 Survival shared authority checkpoint') as ArenaSurvivalSharedWorldAuthorityCheckpointV3;
  }

  restore(request: Readonly<{
    readonly checkpoint: DeepReadonly<unknown>;
    readonly config: ArenaMatchConfigV6;
    readonly expectedMatchSeed: number;
    readonly localParticipantId: string;
    readonly runtimeState: 'running' | 'paused';
  }>): unknown {
    this.#assertNoOperation('restore');
    this.#assertLive();
    if (this.#prepared !== null || this.#readFrame !== null) {
      throw new Error('P3 Survival shared authority只能由未启动的新实例恢复。');
    }
    if (
      request.expectedMatchSeed !== this.#matchSeed
      || request.localParticipantId !== this.#localParticipantId
      || !sameData(request.config, this.#config, 'P3 Survival restore config')
    ) throw new RangeError('P3 Survival restore调用身份漂移。');
    const checkpoint = normalizeAuthorityCheckpoint(request.checkpoint, {
      config: this.#config,
      configHash: this.#configHash,
      matchSeed: this.#matchSeed,
      localParticipantId: this.#localParticipantId,
      participantIds: Object.freeze([...this.#participantIds].sort(compareText)),
      enemyIds: Object.freeze([...this.#enemyIds].sort(compareText)),
      behaviorSeeds: this.#behaviorSeeds,
      mapContext: this.#mapContext,
      executionTiming: this.#executionTiming,
      pressurePolicy: this.#pressurePolicy,
    });
    if (checkpoint.paused !== (request.runtimeState === 'paused')) {
      throw new RangeError('P3 Survival restore checkpoint paused与runtimeState不一致。');
    }
    const world = checkpoint.readFrame.worldSnapshot;

    const registries = registriesForWeaponPool(this.#weaponPool);
    let nextPhysics: CheckpointableLightweightPhysicsWorldV1 | null = null;
    let nextMovement: MovementSystem | null = null;
    let nextEngine: ArenaRuleEngineContract | null = null;
    let nextEquipment: EquipmentSystem | null = null;
    let nextTimeline: EquipmentSupplyTimelineSystem | null = null;
    let nextFeedback: MatchCoreWeaponFeedbackBundleOwnerV2 | null = null;
    const nextControllers = new Map<string, SurvivalEnemyControllerV2>();
    let adopted = false;
    this.#beginOperation('restore');
    try {
      nextPhysics = createLightweightPhysicsWorldFromCheckpointV1(
        checkpoint.physicsCheckpoint,
      );
      nextMovement = MovementSystem.restoreFromCheckpointV1(checkpoint.movementCheckpoint);
      nextEngine = ArenaRuleEngine.restoreFromCheckpointV1(checkpoint.ruleCheckpoint, {
        actionRegistry: registries.actionRegistry,
        equipmentRegistry: registries.equipmentRegistry,
        targetingRegistry: createDefaultTargetingRegistry(),
        effectRegistry: createDefaultActionEffectRegistry([
          createArenaBeginDownSmashActionEffectHandlerV1(),
        ]),
        commandRegistry: createDefaultRuleCommandRegistry(),
        movementCandidateProvider: Object.freeze({ getCandidates: () => Object.freeze([]) }),
        ...(this.#modePolicyResolver === null ? {} : {
          targetEligibility: Object.freeze({
            contentHash: this.#modePolicyResolver.definitionBundle.contentHash,
            allowsTarget: (sourceParticipantId: string, targetParticipantId: string) => (
              this.#modePolicyResolver!.relationshipBetween(
                sourceParticipantId,
                targetParticipantId,
              ) === 'hostile'
            ),
          }),
        }),
        createEquipmentSystem: (options) => {
          if (options.checkpoint === undefined) {
            throw new Error('P3 Survival restore Rule checkpoint缺少Equipment checkpoint。');
          }
          const equipment = EquipmentSystem.restoreFromCheckpointV1(options.checkpoint, {
            actionRegistry: options.actionRegistry,
            equipmentRegistry: options.equipmentRegistry,
            equipmentSupplyRegistry: registries.equipmentSupplyRegistry,
          });
          if (nextEquipment !== null) {
            try {
              equipment.destroy();
            } catch (cleanupError) {
              this.#retainCleanupResource('duplicate restore EquipmentSystem', equipment);
              throw new AggregateError(
                [cleanupError],
                'P3 Survival restore重复EquipmentSystem清理失败。',
              );
            }
            throw new Error('P3 Survival restore EquipmentSystem只能创建一次。');
          }
          nextEquipment = equipment;
          return equipment;
        },
        movementCommandAdapter: Object.freeze({
          isCommandKind: isMovementCommandKind,
          createCommand: createMovementCommand,
        }),
      });
      if (nextEquipment === null) throw new Error('P3 Survival restore未捕获EquipmentSystem。');
      nextTimeline = new EquipmentSupplyTimelineSystem({
        supplyDefinitionId: this.#weaponPool.supplyDefinition.id,
        spawnSpecs: survivalSupplySpawnSpecs(this.#mapContext, this.#weaponPool),
        waveEquipmentOverrides: this.#weaponPool.waveEquipmentOverrides,
        equipmentRegistry: registries.equipmentRegistry,
        equipmentSupplyRegistry: registries.equipmentSupplyRegistry,
        equipmentSystem: Object.freeze({
          applySupplyTimelinePhase: (options: unknown) => (
            nextEngine!.applyEquipmentSupplyTimelinePhase!(options)
          ),
          resolveSupplyPickups: (options: unknown) => (
            nextEngine!.resolveEquipmentSupplyPickups!(options)
          ),
          getSnapshot: (instanceId: string) => nextEngine!.getEquipmentSnapshot(instanceId),
        }),
        snapshot: checkpoint.timelineSnapshot,
      });
      for (const entry of checkpoint.controllerCheckpoints) {
        const controller = SurvivalEnemyControllerV2.restoreFromCheckpointV2(entry.checkpoint);
        nextControllers.set(entry.participantId, controller);
        const lifecycle = controller.getDebugSnapshot().lifecycle;
        if (lifecycle !== (request.runtimeState === 'paused' ? 'paused' : 'active')) {
          throw new RangeError(`P3 Survival restore Controller ${entry.participantId} lifecycle漂移。`);
        }
      }
      nextFeedback = MatchCoreWeaponFeedbackBundleOwnerV2.restoreFromCheckpointsV2({
        feedbackCheckpoint: checkpoint.feedbackCheckpoint,
        directionCheckpoint: checkpoint.feedbackDirectionCheckpoint,
      });
      if (typeof nextEngine.exportCheckpointV1 !== 'function') {
        throw new Error('P3 Survival restored RuleEngine不支持完整checkpoint。');
      }
      if (
        nextTimeline.nextTick !== world.tick
        || !sameData(
          nextPhysics.exportCheckpointV1(),
          checkpoint.physicsCheckpoint,
          'P3 Survival restored physics checkpoint',
        )
        || !sameData(
          nextMovement.exportCheckpointV1(),
          checkpoint.movementCheckpoint,
          'P3 Survival restored movement checkpoint',
        )
        || !sameData(
          nextEngine.exportCheckpointV1(),
          checkpoint.ruleCheckpoint,
          'P3 Survival restored rule checkpoint',
        )
        || !sameData(
          nextTimeline.getSnapshot(),
          checkpoint.timelineSnapshot,
          'P3 Survival restored timeline checkpoint',
        )
        || !sameData(
          nextFeedback.exportFeedbackCheckpointV1(),
          checkpoint.feedbackCheckpoint,
          'P3 Survival restored feedback checkpoint',
        )
        || !sameData(
          nextFeedback.exportDirectionCheckpointV2(),
          checkpoint.feedbackDirectionCheckpoint,
          'P3 Survival restored feedback direction checkpoint',
        )
      ) throw new RangeError('P3 Survival restore子系统checkpoint未闭合。');

      const cleanupErrors: Error[] = [];
      this.#releaseCurrentResources(cleanupErrors);
      this.#assertOperationCommit('restore');
      if (cleanupErrors.length > 0) {
        throw new AggregateError(cleanupErrors, 'P3 Survival restore旧资源清理失败。');
      }
      for (const [participantId, controller] of nextControllers) {
        this.#controllers.set(participantId, controller);
      }
      nextControllers.clear();
      this.#physics = nextPhysics;
      this.#movement = nextMovement;
      this.#engine = nextEngine;
      this.#equipment = nextEquipment;
      this.#timeline = nextTimeline;
      this.#feedback = nextFeedback;
      nextPhysics = null;
      nextMovement = null;
      nextEngine = null;
      nextEquipment = null;
      nextTimeline = null;
      nextFeedback = null;
      adopted = true;
      this.#states.clear();
      for (const state of checkpoint.participantStates) {
        this.#states.set(state.participantId, { ...state });
      }
      const evidence = checkpoint.evidence;
      this.#evidence.supplySpawnedCount = evidence.supplySpawnedCount;
      this.#evidence.supplyExpiredCount = evidence.supplyExpiredCount;
      this.#evidence.supplyPickedUpCount = evidence.supplyPickedUpCount;
      this.#evidence.supplyReplacementCount = evidence.supplyReplacementCount;
      this.#evidence.firstObservedSpawnTick = evidence.firstObservedSpawnTick;
      this.#evidence.firstObservedExpiryTick = evidence.firstObservedExpiryTick;
      this.#evidence.firstObservedPickupTick = evidence.firstObservedPickupTick;
      this.#evidence.firstObservedReplacementTick = evidence.firstObservedReplacementTick;
      this.#evidence.observedSurvivalLevels.clear();
      evidence.observedSurvivalLevels.forEach((level) => (
        this.#evidence.observedSurvivalLevels.add(level)
      ));
      this.#evidence.v2ObservationCount = evidence.v2ObservationCount;
      this.#evidence.unarmedVisibleSupplyObservationCount = evidence.unarmedVisibleSupplyObservationCount;
      this.#evidence.heldEquipmentObservationCount = evidence.heldEquipmentObservationCount;
      this.#evidence.botInputFrameCount = evidence.botInputFrameCount;
      this.#evidence.botPrimaryPressCount = evidence.botPrimaryPressCount;
      this.#evidence.actionStartedCount = evidence.actionStartedCount;
      this.#evidence.hitCount = evidence.hitCount;
      this.#evidence.impulseCount = evidence.impulseCount;
      this.#evidence.usedRuntimeEquipmentDefinitionIds.clear();
      evidence.usedRuntimeEquipmentDefinitionIds.forEach((definitionId) => (
        this.#evidence.usedRuntimeEquipmentDefinitionIds.add(definitionId)
      ));
      this.#evidence.playerFallTicks.splice(
        0,
        this.#evidence.playerFallTicks.length,
        ...evidence.playerFallTicks,
      );
      this.#evidence.enemyFallCount = evidence.enemyFallCount;
      this.#evidence.enemyReactivationCount = evidence.enemyReactivationCount;
      this.#evidence.maximumActiveEnemyCount = evidence.maximumActiveEnemyCount;
      this.#readFrame = checkpoint.readFrame;
      this.#readFrameAudit = checkpoint.readFrameAudit;
      this.#stateHash = checkpoint.stateHash;
      this.#committedDirectionFacts = Object.freeze([]);
      this.#paused = checkpoint.paused;
      this.#supplyFactSequence = checkpoint.supplyFactSequence;
      this.#prepared = null;
      const rebuilt = this.#createFrame(
        world.tick,
        world.eventSequence,
        world.modeProjection,
        world.result,
      );
      if (
        !sameData(rebuilt.readFrame, checkpoint.readFrame, 'P3 Survival restored read frame')
        || !sameData(
          rebuilt.readFrameAudit,
          checkpoint.readFrameAudit,
          'P3 Survival restored read frame audit',
        )
      ) throw new RangeError('P3 Survival restore公开帧与完整世界不闭合。');
      return Object.freeze({
        readFrame: this.#readFrame,
        readFrameAudit: this.#readFrameAudit,
        supplyCadence: rebuilt.supplyCadence,
        localJumpAvailability: this.#localJumpAvailability(this.#readFrame),
        stateHash: this.#stateHash,
      });
    } catch (error) {
      const cleanupErrors: Error[] = [];
      if (adopted) {
        this.#releaseCurrentResources(cleanupErrors);
        if (cleanupErrors.length === 0) {
          this.#readFrame = null;
          this.#readFrameAudit = null;
          this.#stateHash = null;
        }
      } else {
        this.#releaseDetachedControllers(nextControllers, cleanupErrors);
        this.#releaseDetachedResource('restore WeaponFeedback', nextFeedback, cleanupErrors);
        this.#releaseDetachedResource('restore SupplyTimeline', nextTimeline, cleanupErrors);
        this.#releaseDetachedResource('restore RuleEngine', nextEngine, cleanupErrors);
        if (nextEngine === null) {
          this.#releaseDetachedResource('restore EquipmentSystem', nextEquipment, cleanupErrors);
        }
        this.#releaseDetachedResource('restore MovementSystem', nextMovement, cleanupErrors);
        this.#releaseDetachedResource('restore PhysicsWorld', nextPhysics, cleanupErrors);
      }
      this.#failed = true;
      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          [error, ...cleanupErrors],
          'P3 Survival restore与新资源清理均失败。',
        );
      }
      throw error;
    } finally {
      this.#endOperation('restore');
    }
  }

  pause(): unknown {
    this.#assertNoOperation('pause');
    this.#assertLive();
    if (this.#paused || this.#prepared !== null || this.#readFrame === null) {
      throw new Error('P3 Survival shared authority当前不可pause。');
    }
    this.#beginOperation('pause');
    try {
      for (const controller of this.#controllers.values()) {
        controller.pause();
        this.#assertOperationCommit('pause');
      }
      this.#paused = true;
    } catch (error) {
      this.#failed = true;
      throw error;
    } finally {
      this.#endOperation('pause');
    }
    return undefined;
  }

  resume(): unknown {
    this.#assertNoOperation('resume');
    this.#assertLive();
    if (!this.#paused || this.#prepared !== null || this.#readFrame === null) {
      throw new Error('P3 Survival shared authority当前不可resume。');
    }
    this.#beginOperation('resume');
    try {
      for (const controller of this.#controllers.values()) {
        controller.resume();
        this.#assertOperationCommit('resume');
      }
      this.#paused = false;
    } catch (error) {
      this.#failed = true;
      throw error;
    } finally {
      this.#endOperation('resume');
    }
    return undefined;
  }

  readCommittedWeaponFeedbackDirectionFactsV2():
  readonly ArenaWeaponFeedbackDirectionFactV2[] {
    this.#assertNoOperation('weapon-feedback-read');
    this.#assertLive();
    return this.#committedDirectionFacts;
  }

  getEvidenceSnapshot() {
    this.#assertNoOperation('evidence-read');
    this.#assertLive();
    return Object.freeze({
      behaviorSeeds: Object.freeze([...this.#behaviorSeeds]
        .sort(([left], [right]) => compareText(left, right))
        .map(([participantId, seed]) => Object.freeze({ participantId, seed }))),
      supplySpawnedCount: this.#evidence.supplySpawnedCount,
      supplyExpiredCount: this.#evidence.supplyExpiredCount,
      supplyPickedUpCount: this.#evidence.supplyPickedUpCount,
      supplyReplacementCount: this.#evidence.supplyReplacementCount,
      firstObservedSpawnTick: this.#evidence.firstObservedSpawnTick,
      firstObservedExpiryTick: this.#evidence.firstObservedExpiryTick,
      firstObservedPickupTick: this.#evidence.firstObservedPickupTick,
      firstObservedReplacementTick: this.#evidence.firstObservedReplacementTick,
      observedSurvivalLevels: Object.freeze(
        [...this.#evidence.observedSurvivalLevels].sort((left, right) => left - right),
      ),
      v2ObservationCount: this.#evidence.v2ObservationCount,
      unarmedVisibleSupplyObservationCount: this.#evidence.unarmedVisibleSupplyObservationCount,
      heldEquipmentObservationCount: this.#evidence.heldEquipmentObservationCount,
      botInputFrameCount: this.#evidence.botInputFrameCount,
      botPrimaryPressCount: this.#evidence.botPrimaryPressCount,
      actionStartedCount: this.#evidence.actionStartedCount,
      hitCount: this.#evidence.hitCount,
      impulseCount: this.#evidence.impulseCount,
      usedRuntimeEquipmentDefinitionIds: Object.freeze(
        [...this.#evidence.usedRuntimeEquipmentDefinitionIds].sort(compareText),
      ),
      playerFallTicks: Object.freeze([...this.#evidence.playerFallTicks]),
      enemyFallCount: this.#evidence.enemyFallCount,
      enemyReactivationCount: this.#evidence.enemyReactivationCount,
      maximumActiveEnemyCount: this.#evidence.maximumActiveEnemyCount,
      supplyFactSequence: this.#supplyFactSequence,
      preparedTick: this.#prepared?.tick ?? null,
      retainedResourceCount: [
        ...this.#controllers.values(),
        this.#feedback,
        this.#timeline,
        this.#engine,
        this.#movement,
        this.#physics,
      ].filter((resource) => resource !== null).length + this.#pendingCleanupResources.length,
    });
  }

  get verificationScenarioFallDriveStartTick(): number {
    this.#assertNoOperation('fall-drive-start-tick-read');
    if (this.#executionTiming.scenarioFallDriveStartTick === null) {
      throw new Error('Arena Survival交互式Authority不持有验证脚本掉落起点。');
    }
    return this.#executionTiming.scenarioFallDriveStartTick;
  }

  get verificationScenarioMaximumTick(): number {
    this.#assertNoOperation('maximum-tick-read');
    if (this.#executionTiming.verificationScenarioMaximumTick === null) {
      throw new Error('Arena Survival交互式Authority不持有验证场景预算。');
    }
    return this.#executionTiming.verificationScenarioMaximumTick;
  }

  getExecutionTimingSnapshotV1(): ArenaSurvivalSharedWorldExecutionTimingCandidateV1 {
    this.#assertNoOperation('execution-timing-read');
    this.#assertLive();
    return this.#executionTiming;
  }

  destroy(): unknown {
    this.#assertNoOperation('destroy');
    if (this.#destroyed) return;
    this.#beginOperation('destroy');
    try {
      const errors: Error[] = [];
      this.#releaseCurrentResources(errors);
      if (errors.length === 0) this.#releasePendingCleanupResources(errors);
      if (errors.length > 0) {
        this.#failed = true;
        throw new AggregateError(errors, 'P3 Survival authority清理不完整。');
      }
      this.#states.clear();
      this.#behaviorSeeds.clear();
      this.#prepared = null;
      this.#readFrame = null;
      this.#readFrameAudit = null;
      this.#stateHash = null;
      this.#committedDirectionFacts = Object.freeze([]);
      this.#destroyed = true;
    } finally {
      this.#endOperation('destroy');
    }
  }
}

function outsideTarget(): Readonly<{ x: number; z: number }> {
  const minimumX = Math.min(...MAP.arena.surfaces.map((surface) => (
    surface.center.x - surface.halfExtents.x
  )));
  const maximumX = Math.max(...MAP.arena.surfaces.map((surface) => (
    surface.center.x + surface.halfExtents.x
  )));
  const minimumZ = Math.min(...MAP.arena.surfaces.map((surface) => (
    surface.center.z - surface.halfExtents.z
  )));
  const maximumZ = Math.max(...MAP.arena.surfaces.map((surface) => (
    surface.center.z + surface.halfExtents.z
  )));
  return Object.freeze({ x: maximumX + (maximumX - minimumX) + 8, z: minimumZ - (maximumZ - minimumZ) - 8 });
}

const PLAYER_FALL_TARGET = outsideTarget();

function playerInputFor(
  frame: DeepReadonly<MatchReadFrameV3>,
  fallDriveStartTick: number,
): ArenaInputFrame {
  const tick = frame.worldSnapshot.tick;
  const player = frame.worldSnapshot.participants.find(({ id }) => id === PLAYER_ID);
  if (!player) throw new Error('P3 Survival post frame缺少player。');
  const projection = frame.worldSnapshot.modeProjection.state;
  if (projection.kind !== 'survival') throw new Error('P3 Survival收到非Survival projection。');
  const canDrive = tick >= fallDriveStartTick
    && frame.worldSnapshot.result === null
    && player.status === 'active';
  const dx = PLAYER_FALL_TARGET.x - player.position.x;
  const dz = PLAYER_FALL_TARGET.z - player.position.z;
  const distance = Math.hypot(dx, dz);
  return normalizeInputFrame({
    tick,
    participantId: PLAYER_ID,
    moveX: canDrive && distance > 1e-7 ? dx / distance : 0,
    moveZ: canDrive && distance > 1e-7 ? dz / distance : 0,
    primaryPressed: false,
    primaryHeld: false,
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: false,
  }, { expectedTick: tick, participantIds: [PLAYER_ID] });
}

function deferredGap() {
  return Object.freeze([
    Object.freeze({
      id: 'deferred-runtime-validation' as const,
      status: 'deferred' as const,
      reason: '按用户开发优先要求，本批测试、类型、构建、压力、性能与设备验证均未运行。',
    }),
  ]);
}

export function runArenaSurvivalSharedWorldAuthorityScenarioCandidateV1(
  value: unknown,
): ArenaSurvivalSharedWorldAuthorityScenarioReportV1 {
  const options = normalizeScenarioOptions(value);
  const executionTiming = createArenaSurvivalVerificationExecutionTimingCandidateV1(
    options.enemyCount,
  );
  const config = createConfig(options.enemyCount, executionTiming);
  const fixture = createFixture(config, options.enemyCount, executionTiming);
  let authority = new ArenaSurvivalSharedWorldAuthorityCandidateV1(
    config,
    options.matchSeed,
    PLAYER_ID,
    options.enemyCount,
    executionTiming,
  );
  let runtime = new ModeMatchRuntimeV6({
    checkpointIntervalTicks: CHECKPOINT_INTERVAL_TICKS,
    config,
    expectedMatchSeed: options.matchSeed,
    localParticipantId: PLAYER_ID,
    mode: Object.freeze({ kind: 'survival' as const, fixture }),
    worldAuthority: authority,
  });
  let report: ArenaSurvivalSharedWorldAuthorityScenarioReportV1 | null = null;
  let destroyed = false;
  let fullWorldCheckpointRestoreCount = 0;
  let fullWorldCheckpointRestoredAtTick: number | null = null;
  let runtimeCheckpointV3RestoreIdentityHash: string | null = null;
  let feedbackCheckpointRestoreIdentityHash: string | null = null;
  try {
    runtime.start();
    while (runtime.state === MODE_MATCH_RUNTIME_V6_STATE.RUNNING) {
      const frame = runtime.readFrame;
      if (frame === null) throw new Error('P3 Survival runtime缺少current frame。');
      if (frame.worldSnapshot.tick > authority.verificationScenarioMaximumTick) {
        throw new RangeError('P3 Survival未在显式tick预算内形成两次真实killY player fall。');
      }
      const inputFrames = authority.prepareInputFrames({
        playerInputFrame: playerInputFor(
          frame,
          authority.verificationScenarioFallDriveStartTick,
        ),
      });
      runtime.step(inputFrames);
      const postFrame = runtime.readFrame;
      if (
        fullWorldCheckpointRestoreCount === 0
        && postFrame !== null
        && postFrame.worldSnapshot.tick
          >= ARENA_V2_SURVIVAL_SUPPLY_FIRST_SPAWN_TICKS_CANDIDATE_V1 + 37
      ) {
        const runtimeCheckpoint = runtime.exportRuntimeCheckpointV3();
        const runtimeCheckpointV2 = runtimeCheckpoint.runtimeCheckpointV2;
        const runtimeCheckpointV1 = runtimeCheckpointV2.runtimeCheckpointV1;
        const feedbackCapabilityBeforeRestore =
          createArenaModeWeaponFeedbackCheckpointCapabilityV1({
            modeDefinitionId: config.modeDefinitionId,
            runtimeCheckpoint: runtimeCheckpointV1,
          });
        const directionCapabilityBeforeRestore =
          createArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2({
            modeDefinitionId: config.modeDefinitionId,
            runtimeCheckpoint: runtimeCheckpointV1,
          });
        const restoredAuthority = new ArenaSurvivalSharedWorldAuthorityCandidateV1(
          config,
          options.matchSeed,
          PLAYER_ID,
          options.enemyCount,
          executionTiming,
        );
        let restoredRuntime: ModeMatchRuntimeV6 | null = null;
        try {
          restoredRuntime = ModeMatchRuntimeV6.restoreFromRuntimeCheckpointV3({
            checkpoint: runtimeCheckpoint,
            mode: Object.freeze({ kind: 'survival' as const, fixture }),
            worldAuthority: restoredAuthority,
          });
          const restoredRuntimeCheckpoint = restoredRuntime.exportRuntimeCheckpointV3();
          const restoredRuntimeCheckpointV2 = restoredRuntimeCheckpoint.runtimeCheckpointV2;
          const restoredRuntimeCheckpointV1 = restoredRuntimeCheckpointV2.runtimeCheckpointV1;
          const feedbackCapabilityAfterRestore =
            createArenaModeWeaponFeedbackCheckpointCapabilityV1({
              modeDefinitionId: config.modeDefinitionId,
              runtimeCheckpoint: restoredRuntimeCheckpointV1,
            });
          const directionCapabilityAfterRestore =
            createArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2({
              modeDefinitionId: config.modeDefinitionId,
              runtimeCheckpoint: restoredRuntimeCheckpointV1,
            });
          if (
            restoredRuntimeCheckpoint.checkpointIdentityHash
              !== runtimeCheckpoint.checkpointIdentityHash
            || restoredRuntimeCheckpoint.modeDriverContentHash
              !== runtimeCheckpoint.modeDriverContentHash
            || restoredRuntimeCheckpointV2.supplyFactStreamId
              !== runtimeCheckpointV2.supplyFactStreamId
            || restoredRuntimeCheckpointV2.lastSupplyFactSequence
              !== runtimeCheckpointV2.lastSupplyFactSequence
            || feedbackCapabilityAfterRestore.capabilityIdentityHash
              !== feedbackCapabilityBeforeRestore.capabilityIdentityHash
            || feedbackCapabilityAfterRestore.feedbackCheckpoint.checkpointIdentityHash
              !== feedbackCapabilityBeforeRestore.feedbackCheckpoint.checkpointIdentityHash
            || directionCapabilityAfterRestore.capabilityIdentityHash
              !== directionCapabilityBeforeRestore.capabilityIdentityHash
            || directionCapabilityAfterRestore.directionCheckpoint.checkpointIdentityHash
              !== directionCapabilityBeforeRestore.directionCheckpoint.checkpointIdentityHash
          ) throw new RangeError('P3 Survival feedback checkpoint恢复前后身份漂移。');
          const previousRuntime = runtime;
          previousRuntime.destroy();
          runtime = restoredRuntime;
          authority = restoredAuthority;
          fullWorldCheckpointRestoreCount = 1;
          fullWorldCheckpointRestoredAtTick = postFrame.worldSnapshot.tick;
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
              'P3 Survival runtime恢复候选清理不完整。',
            );
          }
          throw error;
        }
      }
    }
    if (runtime.state !== MODE_MATCH_RUNTIME_V6_STATE.ENDED) {
      throw new Error(`P3 Survival runtime意外结束于${runtime.state}。`);
    }
    const finalFrame = runtime.readFrame;
    if (finalFrame === null) throw new Error('P3 Survival终局缺少post frame。');
    const replay = runtime.exportReplayV6();
    const modeResult = replay.modeResult;
    if (
      modeResult.kind !== 'survival'
      || modeResult.reason !== 'terminal-player-fall'
      || modeResult.fallCount !== 2
      || finalFrame.worldSnapshot.tick !== modeResult.endedAtTick + 1
    ) throw new RangeError('P3 Survival两次player fall终局与T/T+1合同未闭合。');
    const evidence = authority.getEvidenceSnapshot();
    if (
      fullWorldCheckpointRestoreCount !== 1
      || fullWorldCheckpointRestoredAtTick === null
      || runtimeCheckpointV3RestoreIdentityHash === null
      || feedbackCheckpointRestoreIdentityHash === null
    ) {
      throw new RangeError('P3 Survival场景未完成一次完整世界checkpoint恢复。');
    }
    if (evidence.playerFallTicks.length !== 2) {
      throw new RangeError('P3 Survival必须恰好提交两次真实killY player fall。');
    }
    const participantIds = Object.freeze(
      config.participantAssignments.map(({ participantId }) => participantId).sort(compareText),
    );
    const allowedCollectionEquipmentDefinitionIds = Object.freeze(
      CATALOG.collectionEquipmentDefinitions.map(({ id }) => id).sort(compareText),
    );
    const participantEquipmentUsage = createParticipantEquipmentUsageV3FromEvents({
      participantIds,
      allowedCollectionEquipmentDefinitionIds,
      events: replay.events,
    });
    if (!participantEquipmentUsage.some(({ usedCollectionEquipmentDefinitionIds }) => (
      usedCollectionEquipmentDefinitionIds.length > 0
    ))) {
      throw new RangeError('P3 Survival真实Replay缺少非base ActionStarted武器使用事实。');
    }
    if (!replay.events.some((event) => (
      event.type === ARENA_MATCH_EVENT_V6.ACTION_STARTED
      && event.sourceKind === ARENA_MATCH_EVENT_V6_ACTION_SOURCE.EQUIPMENT
    ))) {
      throw new RangeError('P3 Survival真实Replay缺少equipment来源ActionStarted。');
    }
    const participantEquipmentUsageIdentityHash = createDeterministicDataHash({
      participantIds,
      allowedCollectionEquipmentDefinitionIds,
      participantEquipmentUsage,
    }, 'P3 Survival shared participant equipment usage V3');
    const participantEquipmentUsageOwnership = Object.freeze({
      canonicalProducer:
        'arena-contracts.createParticipantEquipmentUsageV3FromEvents' as const,
      source: 'replay-v6-action-started-events' as const,
      productResultOwner: 'ProductMatchResultV3' as const,
      modeResultOwnsUsage: false as const,
      learningVerification: 'recomputed-from-replay-v6' as const,
    });
    const reportWithoutHash = Object.freeze({
      id: `arena.p3.survival.shared.enemy-${options.enemyCount}.candidate.v1`,
      enemyCount: options.enemyCount,
      participantCount: options.enemyCount + 1,
      participantIds,
      matchSeed: options.matchSeed,
      behaviorSeeds: evidence.behaviorSeeds,
      configuredEnemyCount: options.enemyCount,
      maximumActiveEnemyCount: evidence.maximumActiveEnemyCount,
      pressureTargetReached: evidence.maximumActiveEnemyCount === options.enemyCount,
      executedTicks: finalFrame.worldSnapshot.tick,
      firstSpawnTick: ARENA_V2_SURVIVAL_SUPPLY_FIRST_SPAWN_TICKS_CANDIDATE_V1,
      spawnIntervalTicks: ARENA_V2_SURVIVAL_SUPPLY_INTERVAL_TICKS_CANDIDATE_V1,
      spawnCountPerWave: ARENA_V2_SURVIVAL_SUPPLY_SPAWN_COUNT_CANDIDATE_V1,
      unpickedLifetimeTicks: ARENA_V2_SURVIVAL_SUPPLY_LIFETIME_TICKS_CANDIDATE_V1,
      supplySpawnedCount: evidence.supplySpawnedCount,
      supplyExpiredCount: evidence.supplyExpiredCount,
      supplyPickedUpCount: evidence.supplyPickedUpCount,
      supplyReplacementCount: evidence.supplyReplacementCount,
      firstObservedSpawnTick: evidence.firstObservedSpawnTick,
      firstObservedExpiryTick: evidence.firstObservedExpiryTick,
      firstObservedPickupTick: evidence.firstObservedPickupTick,
      firstObservedReplacementTick: evidence.firstObservedReplacementTick,
      observedSurvivalLevels: evidence.observedSurvivalLevels,
      v2ObservationCount: evidence.v2ObservationCount,
      unarmedVisibleSupplyObservationCount: evidence.unarmedVisibleSupplyObservationCount,
      heldEquipmentObservationCount: evidence.heldEquipmentObservationCount,
      botInputFrameCount: evidence.botInputFrameCount,
      botPrimaryPressCount: evidence.botPrimaryPressCount,
      controllerWritesOnlyInputFrame: true as const,
      actionStartedCount: evidence.actionStartedCount,
      hitCount: evidence.hitCount,
      impulseCount: evidence.impulseCount,
      usedRuntimeEquipmentDefinitionIds: evidence.usedRuntimeEquipmentDefinitionIds,
      playerFallTicks: Object.freeze([...evidence.playerFallTicks]) as readonly [number, number],
      enemyFallCount: evidence.enemyFallCount,
      enemyReactivationCount: evidence.enemyReactivationCount,
      terminalPostFrameTick: finalFrame.worldSnapshot.tick,
      modeResult: modeResult as DeepReadonly<SurvivalModeResultV3> & Readonly<{
        readonly reason: 'terminal-player-fall';
      }>,
      participantEquipmentUsage,
      participantEquipmentUsageAllowedCollectionEquipmentDefinitionIds:
        allowedCollectionEquipmentDefinitionIds,
      participantEquipmentUsageIdentityHash,
      participantEquipmentUsageOwnership,
      replayEventCount: replay.events.length,
      replayInputFrameCount: replay.inputFrames.length,
      feedbackOutcomeWindowTicks: ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1,
      fullWorldCheckpointRestoreCount: 1 as const,
      fullWorldCheckpointRestoredAtTick,
      runtimeCheckpointV3RestoreIdentityHash,
      feedbackCheckpointRestoreIdentityHash,
      finalHash: replay.finalHash,
      replayIdentityHash: replay.replayIdentityHash,
      retainedResourceCountAfterDestroy: 0 as const,
      deferredGap: deferredGap(),
    });
    report = Object.freeze({
      ...reportWithoutHash,
      resultHash: createDeterministicDataHash(
        reportWithoutHash,
        `P3 Survival shared enemy-${options.enemyCount} report`,
      ),
    });
  } finally {
    try {
      runtime.destroy();
      destroyed = true;
    } finally {
      if (!destroyed) {
        try { authority.destroy(); } catch { /* preserve primary destroy failure */ }
      }
    }
  }
  if (runtime.getRetainedResourceSnapshot().ownedResourceCount !== 0) {
    throw new Error('P3 Survival runtime destroy后仍保留owner。');
  }
  if (report === null) throw new Error('P3 Survival shared scenario未形成report。');
  return report;
}

export const ARENA_SURVIVAL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1,
  status: 'production-unreachable',
  hardGate: false,
  replaySchemaVersion: 6,
  ruleSchemaVersion: 6,
  physicsBackendVersion: PHYSICS_BACKEND_VERSION,
  modeDefinitionId: ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.modeDefinitionId,
  mapDefinitionId: MAP.id,
  mapDefinitionIds: Object.freeze(PLAYABLE_SURVIVAL_MAP_CONTEXTS.map(
    ({ mapDefinition }) => mapDefinition.id,
  )),
  playerCharacterDefinitionId: PLAYER_CHARACTER.id,
  playableCharacterDefinitionIds: ARENA_V2_SIX_CHARACTER_DEFINITION_IDS_CANDIDATE_V1,
  enemyCharacterDefinitionId: ENEMY_CHARACTER.id,
  collectionEquipmentDefinitionIds: Object.freeze(
    CATALOG.collectionEquipmentDefinitions.map(({ id }) => id).sort(),
  ),
  localParticipantId: PLAYER_ID,
  supportedEnemyCounts: ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_ENEMY_COUNTS_V1,
  firstRespawnTuningContentHash:
    ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.contentHash,
  firstRespawnDelayTicks:
    ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.delayTicks,
  firstRespawnProtectionTicks:
    ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.protectionTicks,
  firstRespawnAnchorCapabilityId:
    ARENA_V2_SURVIVAL_FIRST_RESPAWN_TUNING_CANDIDATE_V1.anchorCapabilityId,
  firstRespawnBalanceApprovalStatus: 'not-run',
  resolvedParticipantPolicyRuntimeBinding: 'optional-explicit-registry-only',
  resolvedRespawnPolicyRuntimeBinding: 'optional-explicit-registry-only',
  resolvedEliminationPolicyRuntimeBinding:
    'player-count-for-objective-and-enemy-deactivate-slot-asserted-on-authority-fall',
  resolvedRelationshipPolicyRuntimeBinding:
    'player-enemy-hostile-and-same-role-neutral-target-matrix-consumed-by-rule-engine',
  resolvedObjectiveAndResultPolicyRuntimeBinding: 'existing-semantics-identity-bound',
  resolvedPressurePolicyRuntimeBinding:
    'slot-order-and-stages-with-selected-route-anchor-adapter',
  resolvedTierPolicyRuntimeBinding: 'identity-with-active-registry-subset',
  explicitTimelinePolicyRuntimeMirrorCapabilityWritten: true,
  explicitTimelinePolicyRuntimeMirrorWired: false,
  unresolvedTimelineHardLimitStillLocal: true,
  interactiveInitialPlayerProtectionTicks: 0,
  verificationExecutionTimingSeparatedFromInteractiveRuntime: true,
  verificationScenarioBudgetNeverUsedAsInteractiveProtection: true,
  interactiveLocalHardLimitSource:
    'preserved-unapproved-local-runtime-candidate-not-verification-budget',
  executionTimingCheckpointSchemaVersion: 3,
  restoreOldResourcesCommitPerResource: true,
  restoreFailureRetainsCleanupOwnership: true,
  restorePostAdoptionFailureFailsClosed: true,
  ownsBotControllersAndRandomStreams: true,
  botAuthorityUsesNamedOperationAndStickyReentrySequence: true,
  botObservationCallbacksCheckedBeforeEvidenceOrPreparedInputPublication: true,
  modeResolutionAndBotCheckpointCallbacksCheckedBeforeWorldCommit: true,
  botPauseResumeCallbacksCheckedBeforeAuthorityLifecycleCommit: true,
  swallowedBotCleanupReentryRetainsCurrentOwnerAndStopsLaterCleanup: true,
  publicAuthorityReadsRejectBotOperationIntermediateState: true,
  canonicalTickOrder: 'supply-then-observation-then-input-then-rule-world-mode',
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

export interface ArenaSurvivalAuthoritativeRuntimeCandidateV1Request {
  readonly modeDefinitionId: string;
  readonly matchSeed: number;
  readonly selection: unknown;
  readonly finalAssignment: unknown;
  readonly localParticipantId: string;
  readonly runtimePolicyBinding?: unknown;
}

/**
 * ModeAuthoritativeQuickMatchServiceV3 runtime port for the actual shared
 * Survival world. The adapter returns the exact canonical input array consumed
 * by Replay; no sibling Session controller can diverge from authority-owned Bot
 * observations or checkpointed random streams.
 */
export class ArenaSurvivalAuthoritativeRuntimeCandidateV1 {
  readonly #runtime: ModeMatchRuntimeV6;
  readonly #authority: ArenaSurvivalSharedWorldAuthorityCandidateV1;
  readonly #request: DeepReadonly<ArenaSurvivalAuthoritativeRuntimeCandidateV1Request>;
  #destroyed = false;

  constructor(
    value: unknown,
    restoreCapabilityValue?: unknown,
    restoreRuntimeCheckpointV2Value?: unknown,
    restoreRuntimeCheckpointV3Value?: unknown,
    restoreRuntimeCheckpointV4Value?: unknown,
  ) {
    const source = cloneFrozenData(value, 'Arena Survival authoritative runtime request');
    exactAuthoritativeRuntimeRequest(
      source,
      'Arena Survival authoritative runtime request',
    );
    const modeDefinitionId = assertNonEmptyString(
      source.modeDefinitionId,
      'Arena Survival authoritative runtime modeDefinitionId',
    );
    if (modeDefinitionId !== ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.modeDefinitionId) {
      throw new RangeError('Arena Survival authoritative runtime Mode身份漂移。');
    }
    const matchSeed = normalizeUint32(source.matchSeed, 'Arena Survival authoritative matchSeed');
    if (source.localParticipantId !== PLAYER_ID) {
      throw new RangeError('Arena Survival authoritative runtime local participant身份漂移。');
    }
    const selection = validateMatchContentSelectionV2(source.selection);
    const finalAssignment = validateFinalizedMatchAssignmentV2(source.finalAssignment);
    const runtimePolicyBinding: ArenaThreeModeRuntimePolicyBindingCandidateV1 | null =
      source.runtimePolicyBinding === undefined
        ? null
        : validateArenaThreeModeRuntimePolicyBindingCandidateV1(
          source.runtimePolicyBinding,
          ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.modeDefinitionId,
          'survival',
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
    }
    const restoreCapability = restoreCapabilityValue === undefined
      ? null
      : validateArenaModeWeaponFeedbackRestoreCapability(restoreCapabilityValue);
    const restoreSourceCount = Number(restoreCapability !== null)
      + Number(restoreRuntimeCheckpointV2Value !== undefined)
      + Number(restoreRuntimeCheckpointV3Value !== undefined)
      + Number(restoreRuntimeCheckpointV4Value !== undefined);
    if (restoreSourceCount > 1) {
      throw new RangeError('Arena Survival每次只能选择一种runtime恢复来源。');
    }
    if (
      restoreCapability !== null
      && restoreCapability.modeDefinitionId
        !== ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.modeDefinitionId
    ) throw new RangeError('Arena Survival feedback restore capability Mode身份漂移。');
    const playerAssignment = finalAssignment.participants.find(({ modeRole }) => (
      modeRole === 'player'
    ));
    if (playerAssignment === undefined) {
      throw new RangeError('Arena Survival authoritative runtime缺少玩家角色。');
    }
    const playerCharacter = playableCharacter(playerAssignment.characterDefinitionId);
    const mapContext = playableSurvivalMap(selection.selectedMapDefinitionId);
    const staticContentDefinitionId = 'arena-v2.content.survival-authoritative.candidate.v1';
    const registryBoundContent = new RegExp(
      `^${staticContentDefinitionId.replaceAll('.', '\\.')}`
        + String.raw`\.registry-r(?:0|[1-9]\d*)-[0-9a-f]{8}$`,
      'u',
    ).test(selection.contentDefinitionId);
    if (selection.contentDefinitionId !== staticContentDefinitionId && !registryBoundContent) {
      throw new RangeError('Arena Survival authoritative runtime content Registry身份非法。');
    }
    const weaponPool: SurvivalWeaponPoolCandidateV1 = registryBoundContent
      ? createArenaV2SurvivalRegisteredWeaponPoolCandidateV1(
        selection.equipmentDefinitionIds,
      )
      : CATALOG;
    const pressurePolicy = runtimePolicyBinding?.bundle.survivalPressure ?? PRESSURE;
    if (
      selection.modeDefinitionId !== modeDefinitionId
      || finalAssignment.modeDefinitionId !== modeDefinitionId
      || selection.contentHash !== finalAssignment.contentHash
      || selection.selectedMapDefinitionId !== mapContext.mapDefinition.id
      || !sameData(
        selection.mapDefinitionIds,
        Object.freeze([mapContext.mapDefinition.id]),
        'Arena Survival selected maps',
      )
      || !sameData(
        selection.characterDefinitionIds,
        Object.freeze([playerCharacter.id, ENEMY_CHARACTER.id].sort()),
        'Arena Survival selected characters',
      )
      || (!registryBoundContent && !sameData(
        selection.equipmentDefinitionIds,
        Object.freeze(CATALOG.collectionEquipmentDefinitions.map(({ id }) => id).sort()),
        'Arena Survival selected equipment',
      ))
    ) throw new RangeError('Arena Survival authoritative runtime selection身份漂移。');
    const enemyCount = normalizeEnemyCount(
      finalAssignment.participants.filter(({ modeRole }) => modeRole === 'enemy').length,
      'Arena Survival authoritative enemyCount',
    );
    const executionTiming = createArenaSurvivalInteractiveExecutionTimingCandidateV1(
      enemyCount,
    );
    const expected = createConfig(
      enemyCount,
      executionTiming,
      playerCharacter,
      mapContext,
      weaponPool,
      pressurePolicy,
      runtimePolicyBinding,
    );
    if (runtimePolicyBinding !== null) {
      assertArenaRuntimeExistingModeSemanticsCandidateV1(
        runtimePolicyBinding,
        ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.modeDefinitionId,
        'survival',
      );
    }
    if (!sameData(
      finalAssignment.participants,
      expected.participantAssignments,
      'Arena Survival authoritative participant assignment',
    )) {
      throw new RangeError(
        'Arena Survival authoritative runtime只接受固定player/enemy族、slot与角色选择。',
      );
    }
    const fixture = createFixture(
      expected,
      enemyCount,
      executionTiming,
      mapContext,
      weaponPool,
      pressurePolicy,
      runtimePolicyBinding,
    );
    const modePolicyResolver = runtimePolicyBinding === null
      ? null
      : (() => {
        const definitionBundle = projectArenaRuntimePolicyResolverBundleCandidateV1(
          runtimePolicyBinding,
          ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.modeDefinitionId,
          'survival',
        );
        return new ModePolicyResolver(createArenaMatchConfigV6({
          ...expected,
          modePolicyContentHash: definitionBundle.contentHash,
        }), definitionBundle);
      })();
    const modeResultPolicyResolver = runtimePolicyBinding === null
      ? null
      : (() => {
        const definitionBundle = projectArenaRuntimeResultPolicyResolverBundleCandidateV1(
          runtimePolicyBinding,
          ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.modeDefinitionId,
          'survival',
        );
        return new ModeResultPolicyResolverV1(createArenaMatchConfigV6({
          ...expected,
          modePolicyContentHash: definitionBundle.contentHash,
        }), definitionBundle);
      })();
    const objectivePolicyBundle = runtimePolicyBinding === null
      ? null
      : projectArenaRuntimeObjectivePolicyResolverBundleCandidateV1(
        runtimePolicyBinding,
        ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.modeDefinitionId,
        'survival',
        expected.modePolicyContentHash,
      );
    const authority = new ArenaSurvivalSharedWorldAuthorityCandidateV1(
      expected,
      matchSeed,
      PLAYER_ID,
      enemyCount,
      executionTiming,
      playerCharacter,
      mapContext,
      weaponPool,
      pressurePolicy,
      modePolicyResolver,
      modeResultPolicyResolver,
    );
    let runtime: ModeMatchRuntimeV6 | null = null;
    try {
      const mode = Object.freeze({
        kind: 'survival' as const,
        fixture,
        ...(objectivePolicyBundle === null ? {} : { objectivePolicyBundle }),
      });
      runtime = restoreRuntimeCheckpointV4Value !== undefined
        ? ModeMatchRuntimeV6.restoreFromRuntimeCheckpointV4({
          checkpoint: restoreRuntimeCheckpointV4Value,
          mode,
          worldAuthority: authority,
        })
        : restoreRuntimeCheckpointV3Value !== undefined
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
          config: expected,
          expectedMatchSeed: matchSeed,
          localParticipantId: PLAYER_ID,
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
        throw new AggregateError([error, cleanupError], 'Arena Survival runtime构造清理失败。');
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
      localParticipantId: PLAYER_ID,
      ...(runtimePolicyBinding === null ? {} : { runtimePolicyBinding }),
    });
  }

  start(): unknown {
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    return this.#runtime.start();
  }

  step(localInput: ArenaInputFrame): unknown {
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    const inputs = this.#authority.prepareInputFrames({ playerInputFrame: localInput });
    const outcome = this.#runtime.step(inputs);
    return Object.freeze({
      ...outcome,
      inputs,
      weaponFeedbackDirectionFactsV2:
        this.#authority.readCommittedWeaponFeedbackDirectionFactsV2(),
    });
  }

  pause(): void {
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    this.#runtime.pause();
  }

  resume(): void {
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    this.#runtime.resume();
  }

  exportWeaponFeedbackCheckpointCapabilityV1() {
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    return createArenaModeWeaponFeedbackCheckpointCapabilityV1({
      modeDefinitionId: ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.modeDefinitionId,
      runtimeCheckpoint: this.#runtime.exportRuntimeCheckpointV1(),
    });
  }

  exportWeaponFeedbackDirectionCheckpointCapabilityV2() {
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    return createArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2({
      modeDefinitionId: ARENA_V2_SURVIVAL_PRESSURE_CANDIDATE_V1.modeDefinitionId,
      runtimeCheckpoint: this.#runtime.exportRuntimeCheckpointV1(),
    });
  }

  exportRuntimeCheckpointV1() {
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    return this.#runtime.exportRuntimeCheckpointV1();
  }

  exportRuntimeCheckpointV2() {
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    return this.#runtime.exportRuntimeCheckpointV2();
  }

  exportRuntimeCheckpointV3() {
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    return this.#runtime.exportRuntimeCheckpointV3();
  }

  exportRuntimeCheckpointV4() {
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    return this.#runtime.exportRuntimeCheckpointV4();
  }

  forkFromRuntimeCheckpointV2(
    checkpoint: unknown = this.exportRuntimeCheckpointV2(),
  ): ArenaSurvivalAuthoritativeRuntimeCandidateV1 {
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    return new ArenaSurvivalAuthoritativeRuntimeCandidateV1(
      this.#request,
      undefined,
      checkpoint,
    );
  }

  forkFromRuntimeCheckpointV3(
    checkpoint: unknown = this.exportRuntimeCheckpointV3(),
  ): ArenaSurvivalAuthoritativeRuntimeCandidateV1 {
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    return new ArenaSurvivalAuthoritativeRuntimeCandidateV1(
      this.#request,
      undefined,
      undefined,
      checkpoint,
    );
  }

  forkFromRuntimeCheckpointV4(
    checkpoint: unknown = this.exportRuntimeCheckpointV4(),
  ): ArenaSurvivalAuthoritativeRuntimeCandidateV1 {
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    return new ArenaSurvivalAuthoritativeRuntimeCandidateV1(
      this.#request,
      undefined,
      undefined,
      undefined,
      checkpoint,
    );
  }

  getRetainedResourceSnapshot(): ModeMatchRuntimeV6RetainedResourceSnapshot {
    return this.#runtime.getRetainedResourceSnapshot();
  }

  getExecutionTimingSnapshotV1(): ArenaSurvivalSharedWorldExecutionTimingCandidateV1 {
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    return this.#authority.getExecutionTimingSnapshotV1();
  }

  exportContentSelectionCheckpointCapabilityV1() {
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    return createArenaThreeModeContentSelectionCheckpointCapabilityV1({
      selection: this.#request.selection,
      finalAssignment: this.#request.finalAssignment,
      runtimeCheckpoint: this.#runtime.exportRuntimeCheckpointV1(),
    });
  }

  forkFromWeaponFeedbackCheckpointCapabilityV1(
    capability: ArenaModeWeaponFeedbackCheckpointCapabilityV1 =
      this.exportWeaponFeedbackCheckpointCapabilityV1(),
  ): ArenaSurvivalAuthoritativeRuntimeCandidateV1 {
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    return new ArenaSurvivalAuthoritativeRuntimeCandidateV1(this.#request, capability);
  }

  forkFromWeaponFeedbackDirectionCheckpointCapabilityV2(
    capability: ArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2 =
      this.exportWeaponFeedbackDirectionCheckpointCapabilityV2(),
  ): ArenaSurvivalAuthoritativeRuntimeCandidateV1 {
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    return new ArenaSurvivalAuthoritativeRuntimeCandidateV1(this.#request, capability);
  }

  getModeDriverContentHash(): string {
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    return this.#runtime.getModeDriverContentHash();
  }

  getTerminalAuthorityIdentity(): unknown {
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    if (this.#runtime.state !== MODE_MATCH_RUNTIME_V6_STATE.ENDED) {
      throw new Error('Arena Survival authority identity只在终局后可读。');
    }
    const replay = this.exportReplayV6();
    const world = this.#runtime.readFrame?.worldSnapshot;
    if (world === undefined) throw new Error('Arena Survival终局缺少world identity。');
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
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    if (this.#runtime.state !== MODE_MATCH_RUNTIME_V6_STATE.ENDED) {
      throw new Error('Arena Survival Replay V6只在终局后可读。');
    }
    return this.#runtime.exportReplayV6();
  }

  exportTerminalEvidenceV1() {
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    if (this.#runtime.state !== MODE_MATCH_RUNTIME_V6_STATE.ENDED) {
      throw new Error('Arena Survival终局Runtime证据只在终局后可读。');
    }
    return this.#runtime.exportTerminalEvidenceV1();
  }

  exportTerminalEvidenceV2() {
    if (this.#destroyed) throw new Error('Arena Survival authoritative runtime已销毁。');
    if (this.#runtime.state !== MODE_MATCH_RUNTIME_V6_STATE.ENDED) {
      throw new Error('Arena Survival完整供给终局Runtime证据只在终局后可读。');
    }
    return this.#runtime.exportTerminalEvidenceV2();
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#runtime.destroy();
    this.#destroyed = true;
  }
}

export function createArenaSurvivalAuthoritativeRuntimeCandidateV1(
  value: ArenaSurvivalAuthoritativeRuntimeCandidateV1Request,
): ArenaSurvivalAuthoritativeRuntimeCandidateV1 {
  return new ArenaSurvivalAuthoritativeRuntimeCandidateV1(value);
}

export function runArenaSurvivalSharedWorldAuthorityVerificationCandidateV1(
  value: unknown,
): ArenaSurvivalSharedWorldAuthorityVerificationReportV1 {
  const options = normalizeVerificationOptions(value);
  const scenarios = Object.freeze(options.enemyCounts.map((enemyCount) => (
    runArenaSurvivalSharedWorldAuthorityScenarioCandidateV1({
      schemaVersion: ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_V1_SCHEMA_VERSION,
      enemyCount,
      matchSeed: deriveSeed(
        options.matchSeed,
        `arena.p3.survival.shared.enemy-count:${enemyCount}`,
      ),
      authorityStartTick: 0,
    })
  )));
  const reportWithoutHash = Object.freeze({
    schemaVersion: ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_V1_SCHEMA_VERSION,
    candidateStatus: ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_V1_CANDIDATE_STATUS,
    hardGate: false as const,
    defaultRegistryWired: false as const,
    defaultCompositionWired: false as const,
    defaultEntryWired: false as const,
    validationStatus: 'not-run' as const,
    usesArenaV1Experiment: false as const,
    usesSingleSharedTickAuthority: true as const,
    usesP4SupplyTimeline: true as const,
    usesObservationV2: true as const,
    usesControllerV2InputFramesOnly: true as const,
    usesSharedRuleMovementPhysics: true as const,
    usesRealKillYFacts: true as const,
    usesModeMatchRuntimeV6: true as const,
    tickContract: 'T-events-to-T-plus-1-post-frame' as const,
    enemyCounts: ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_ENEMY_COUNTS_V1,
    mapDefinitionId: MAP.id,
    routeDefinitionId: ROUTE.id,
    pressurePolicyDefinitionId: PRESSURE.id,
    tierPolicyDefinitionId: CATALOG.tierPolicyDefinition.id,
    scenarios,
  });
  return Object.freeze({
    ...reportWithoutHash,
    resultHash: createDeterministicDataHash(
      reportWithoutHash,
      'Arena Survival Shared World Authority Verification V1',
    ),
  });
}

export type ArenaSurvivalSharedWorldAuthorityVerificationRuntimeStateV1 =
  | 'created'
  | 'running'
  | 'completed'
  | 'failed'
  | 'destroyed';

export class ArenaSurvivalSharedWorldAuthorityVerificationRuntimeV1 {
  readonly #options: ArenaSurvivalSharedWorldAuthorityVerificationOptionsV1;
  #state: ArenaSurvivalSharedWorldAuthorityVerificationRuntimeStateV1 = 'created';
  #running = false;
  #report: ArenaSurvivalSharedWorldAuthorityVerificationReportV1 | null = null;

  constructor(value: unknown) {
    this.#options = normalizeVerificationOptions(value);
  }

  get state(): ArenaSurvivalSharedWorldAuthorityVerificationRuntimeStateV1 {
    return this.#state;
  }

  run(value: unknown): ArenaSurvivalSharedWorldAuthorityVerificationReportV1 {
    if (this.#state === 'destroyed') throw new Error('P3 Survival verification runtime已销毁。');
    if (this.#state !== 'created' || this.#running) {
      throw new Error(`P3 Survival verification runtime状态${this.#state}拒绝重入run。`);
    }
    this.#state = 'running';
    this.#running = true;
    try {
      const source = cloneFrozenData(value, 'P3 Survival verification run request');
      exactRecord(source, RUN_KEYS, 'P3 Survival verification run request');
      const authorityStartTick = assertIntegerAtLeast(
        source.authorityStartTick,
        0,
        'P3 Survival verification authorityStartTick',
      );
      if (authorityStartTick !== 0) throw new RangeError('P3 Survival verification拒绝迟到tick。');
      const report = runArenaSurvivalSharedWorldAuthorityVerificationCandidateV1(this.#options);
      this.#report = report;
      this.#state = 'completed';
      return report;
    } catch (error) {
      this.#report = null;
      this.#state = 'failed';
      throw error;
    } finally {
      this.#running = false;
    }
  }

  getSnapshot() {
    return Object.freeze({
      state: this.#state,
      hasReport: this.#report !== null,
      retainedResourceCount: 0 as const,
    });
  }

  destroy(): void {
    if (this.#state === 'destroyed') return;
    if (this.#running) throw new Error('P3 Survival verification runtime运行中不可destroy。');
    this.#report = null;
    this.#state = 'destroyed';
  }
}

export const ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_PLAN_V1 = Object.freeze({
  schemaVersion: ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_V1_SCHEMA_VERSION,
  candidateStatus: ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_VERIFICATION_V1_CANDIDATE_STATUS,
  hardGate: false as const,
  explicitTimelinePolicyRuntimeMirrorCapabilityWritten: true as const,
  explicitTimelinePolicyRuntimeMirrorWired: false as const,
  verificationExecutionTimingSeparatedFromInteractiveRuntime: true as const,
  interactiveInitialPlayerProtectionTicks: 0 as const,
  interactiveLocalHardLimitBalanceApprovalStatus: 'not-run' as const,
  validationStatus: 'not-run' as const,
  defaultRegistryWired: false as const,
  defaultCompositionWired: false as const,
  defaultEntryWired: false as const,
  enemyCounts: ARENA_SURVIVAL_SHARED_WORLD_AUTHORITY_ENEMY_COUNTS_V1,
  targetTickOrder: Object.freeze([
    'p4-supply-spawn-expire-pickup-replacement',
    'authority-observation-v2-projection',
    'controller-v2-input-frame-only',
    'rule-movement-physics-actions-and-impulses',
    'kill-y-fall-facts',
    'survival-mode-runtime-v6-commands',
    't-plus-1-post-frame',
  ] as const),
  integratedInOneWorldAuthority: true as const,
  localPrimaryAffordanceProjectedFromRuleEngine: true as const,
  localPrimaryHoldAffordanceProjectedFromRuleEngine: true as const,
  fullWorldCheckpointRestore: true as const,
  runtimeValidationExecuted: false as const,
});
