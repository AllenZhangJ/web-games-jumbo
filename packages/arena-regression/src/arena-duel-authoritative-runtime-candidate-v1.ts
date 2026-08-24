import {
  createBotPrimaryCommitmentObservationV1,
  createBotPrimaryInputPacingV1,
  isBotParticipantControlAvailableV1,
  isBotPrimaryActionReadyV1,
} from '@number-strategy-jump/arena-bot';
import {
  ARENA_MATCH_EVENT,
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
  createMatchReadFrameV3Audit,
  normalizeInputFrame,
  validateFinalizedMatchAssignmentV2,
  validateMatchContentSelectionV2,
  type ArenaInputFrame,
  type ArenaMatchEventV6,
  type ArenaMatchSnapshot,
  type ArenaWeaponFeedbackDirectionFactV2,
  type DeepReadonly,
  type MatchReadFrameV3,
  type MatchReadFrameV3AuditOptions,
  type ModeResultV3Payload,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_GAMEPLAY_V2_TUNING,
  CharacterRegistry,
  type CharacterDefinition,
  type MapDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  type ActionAffordance,
  type ActionAffordanceOutcome,
} from '@number-strategy-jump/arena-core';
import {
  ArenaMapSystem,
  createDefaultMapCommandRegistry,
  createDefaultMapEventStrategyRegistry,
} from '@number-strategy-jump/arena-map';
import {
  ARENA_MATCH_PHASE,
  ARENA_MATCH_DEFAULTS,
  MODE_MATCH_RUNTIME_V6_STATE,
  MatchCore,
  MatchCoreWeaponFeedbackBundleOwnerV2,
  ModeMatchRuntimeV6,
  createArenaInternalMatchCheckpoint,
  createArenaMatchConfigV6,
  restoreMatchCoreFromCheckpoint,
  type ArenaAuthorityEvent,
  type ArenaInternalMatchCheckpoint,
  type InternalCheckpointCoreFactoryOptions,
  type ArenaMatchConfigOverrides,
  type ArenaMatchConfigV6,
  type MatchCoreWeaponFeedbackAdapterCheckpointV1,
  type MatchCoreWeaponFeedbackDirectionCheckpointV2,
  type ModeMatchResolutionV6,
  type ModeMatchRuntimeV6RetainedResourceSnapshot,
  type ModeMatchWorldAuthorityV6,
} from '@number-strategy-jump/arena-match';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
  ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1,
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1,
  ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_V1,
  ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1,
  ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1,
  ARENA_V2_SIX_CHARACTER_CATALOG_ENTRIES_CANDIDATE_V1,
  ARENA_V2_SIX_CHARACTER_DEFINITION_IDS_CANDIDATE_V1,
  ARENA_V2_DUEL_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V2,
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
  assertArenaThreeModeRuntimePolicyParticipantAssignmentCandidateV1,
  projectArenaDuelRuntimePolicyResolverBundleCandidateV1,
  projectArenaRuntimeObjectivePolicyResolverBundleCandidateV1,
  projectArenaRuntimeResultPolicyResolverBundleCandidateV1,
  validateArenaThreeModeRuntimePolicyBindingCandidateV1,
  type ArenaThreeModeRuntimePolicyBindingCandidateV1,
} from './arena-three-mode-runtime-policy-binding-candidate-v1.js';

export const ARENA_DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1,
  status: 'production-unreachable',
  hardGate: false,
  replaySchemaVersion: 6,
  ruleSchemaVersion: 6,
  physicsBackendVersion: ARENA_MATCH_DEFAULTS.physicsBackendVersion,
  modeDefinitionId: ARENA_V2_LEARNING_MODE_DEFINITION_IDS_CANDIDATE_V1.duel,
  mapDefinitionId: ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.mapDefinition.id,
  mapDefinitionIds: Object.freeze([
    ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.mapDefinition.id,
    ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_V1.mapDefinition.id,
  ]),
  characterDefinitionId:
    ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1.id,
  equipmentDefinitionIds: Object.freeze(
    ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.map(({ equipment }) => equipment.id),
  ),
  participantCount: 2,
  playableCharacterDefinitionIds: ARENA_V2_SIX_CHARACTER_DEFINITION_IDS_CANDIDATE_V1,
  usesRealMatchCoreRuleMovementPhysics: true,
  ownsBotInput: true,
  localPrimaryAffordanceProjectedFromRuleEngine: true,
  localPrimaryHoldAffordanceProjectedFromRuleEngine: true,
  weaponFeedbackCheckpointCapability:
    ARENA_THREE_MODE_WEAPON_FEEDBACK_CHECKPOINT_CAPABILITY_V1,
  weaponFeedbackDirectionCheckpointCapability:
    ARENA_THREE_MODE_WEAPON_FEEDBACK_DIRECTION_CAPABILITY_V2,
  terminalIdentityDeferredUntilMatchEnd: true,
  resolvedParticipantPolicyRuntimeBinding: 'optional-explicit-registry-only',
  resolvedEliminationPolicyRuntimeBinding: 'optional-explicit-registry-only',
  resolvedRespawnPolicyRuntimeBinding: 'optional-explicit-registry-only',
  resolvedRelationshipPolicyRuntimeBinding: 'optional-explicit-registry-only',
  resolvedObjectivePolicyRuntimeBinding: 'optional-explicit-registry-terminal-authority-fact-assertion',
  resolvedResultPolicyRuntimeBinding: 'optional-explicit-registry-terminal-assertion',
  explicitTimelinePolicyRuntimeMirrorCapabilityWritten: true,
  explicitTimelinePolicyRuntimeMirrorWired: false,
  unresolvedTimelineValuesStillLocal: true,
  restoreOldResourcesCommitPerResource: true,
  restoreFailureRetainsCleanupOwnership: true,
  restorePostAdoptionFailureFailsClosed: true,
  validationStatus: 'not-run',
  defaultRegistryWired: false,
  defaultCompositionWired: false,
  defaultEntryWired: false,
} as const);

const MODE_DEFINITION_ID = ARENA_DUEL_AUTHORITATIVE_RUNTIME_CANDIDATE_V1.modeDefinitionId;
const DUEL_TIMELINE_PRODUCT_VARIANT =
  ARENA_V2_DUEL_TIMELINE_PRODUCT_PROPOSAL_CANDIDATE_V2.variants[0]!;
const PREPARING_TICKS = DUEL_TIMELINE_PRODUCT_VARIANT.preparingTicks;
const SUDDEN_DEATH_START_TICK =
  DUEL_TIMELINE_PRODUCT_VARIANT.suddenDeathStartActiveTick!;
const HARD_LIMIT_TICKS = DUEL_TIMELINE_PRODUCT_VARIANT.hardLimitActiveTicks;
export const ARENA_DUEL_TIMELINE_RUNTIME_MIRROR_CANDIDATE_V1 = Object.freeze({
  preparingTicks: PREPARING_TICKS,
  hardLimitActiveTicks: HARD_LIMIT_TICKS,
  suddenDeathStartActiveTick: SUDDEN_DEATH_START_TICK,
});
const CHECKPOINT_INTERVAL_TICKS = 60;
const MAP_RULESET_VERSION = 'arena.duel.authoritative-map-ruleset.candidate.v1';
const NO_SUPPLY_AUDIT = Object.freeze({
  worldSupplyEquipmentInstanceIds: Object.freeze([]),
  expectedWorldSupplyIdentities: Object.freeze([]),
}) satisfies MatchReadFrameV3AuditOptions;
const REQUEST_KEYS = new Set([
  'modeDefinitionId', 'matchSeed', 'selection', 'finalAssignment', 'localParticipantId',
  'runtimePolicyBinding',
]);
const REQUIRED_REQUEST_KEYS = Object.freeze([
  'modeDefinitionId', 'matchSeed', 'selection', 'finalAssignment', 'localParticipantId',
] as const);
const AUTHORITY_CHECKPOINT_KEYS = new Set([
  'schemaVersion', 'configHash', 'matchSeed', 'localParticipantId', 'readFrame',
  'readFrameAudit', 'stateHash', 'paused', 'coreCheckpoint', 'feedbackCheckpoint',
  'feedbackDirectionCheckpoint',
]);

interface DuelRetryableDestroyResourceV1 {
  destroy(): unknown;
}

interface DuelRetainedCleanupResourceV1 {
  readonly label: string;
  readonly resource: DuelRetryableDestroyResourceV1;
}

function safelyWrapDuelThrownError(value: unknown, message: string): Error {
  const error = new Error(message);
  Object.defineProperty(error, 'cause', {
    value,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return error;
}

const CHARACTER = ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1;
const DUEL_MAP = ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.mapDefinition;
const PLAYABLE_DUEL_MAPS: readonly MapDefinition[] = Object.freeze([
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.mapDefinition,
  ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_V1.mapDefinition,
]);
const WEAPON: ArenaBaselineWeaponBundleV1 = Object.freeze({
  id: 'heavy-hammer',
  actions: ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1.actions,
  equipment: ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1.equipment,
  grammar: ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1.grammar,
  contentHash: ARENA_V2_HEAVY_HAMMER_WEAPON_CANDIDATE_V1.contentHash,
});

export interface ArenaDuelAuthoritativeRuntimeCandidateV1Request {
  readonly modeDefinitionId: string;
  readonly matchSeed: number;
  readonly selection: unknown;
  readonly finalAssignment: unknown;
  readonly localParticipantId: string;
  readonly runtimePolicyBinding?: unknown;
}

interface DuelAuthorityCheckpointV2 {
  readonly schemaVersion: 2;
  readonly configHash: string;
  readonly matchSeed: number;
  readonly localParticipantId: string;
  readonly readFrame: DeepReadonly<MatchReadFrameV3>;
  readonly readFrameAudit: MatchReadFrameV3AuditOptions;
  readonly stateHash: string;
  readonly paused: boolean;
  readonly coreCheckpoint: ArenaInternalMatchCheckpoint;
  readonly feedbackCheckpoint: MatchCoreWeaponFeedbackAdapterCheckpointV1;
  readonly feedbackDirectionCheckpoint: MatchCoreWeaponFeedbackDirectionCheckpointV2;
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

function exactRuntimeRequest(value: unknown, name: string): asserts value is Record<string, unknown> {
  assertKnownKeys(value, REQUEST_KEYS, name);
  for (const key of REQUIRED_REQUEST_KEYS) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
}

function sameData(left: unknown, right: unknown, name: string): boolean {
  return createDeterministicDataHash(left, `${name} left`)
    === createDeterministicDataHash(right, `${name} right`);
}

function uint32(value: unknown, name: string): number {
  const result = assertIntegerAtLeast(value, 0, name);
  if (result > 0xffff_ffff) throw new RangeError(`${name}必须是uint32。`);
  return result;
}

function modeBundle() {
  const authority = Object.freeze({
    schemaVersion: 1,
    modeDefinitionId: MODE_DEFINITION_ID,
    modeKind: 'duel',
    participant: Object.freeze({
      definitionId: `${MODE_DEFINITION_ID}.participants.v1`,
      minimumParticipants: 2,
      maximumParticipants: 2,
      roles: Object.freeze([Object.freeze({
        modeRole: 'competitor',
        minimumCount: 2,
        maximumCount: 2,
        allowedControllerKinds: Object.freeze(['human', 'bot']),
        teamId: null,
        slotIds: Object.freeze([]),
      })]),
      controllerKindBounds: Object.freeze([
        Object.freeze({ controllerKind: 'human', minimumCount: 1, maximumCount: 1 }),
        Object.freeze({ controllerKind: 'bot', minimumCount: 1, maximumCount: 1 }),
      ]),
    }),
    elimination: Object.freeze({
      definitionId: `${MODE_DEFINITION_ID}.elimination.v1`,
      roleDispositions: Object.freeze([Object.freeze({
        modeRole: 'competitor',
        fallDisposition: 'eliminate',
      })]),
    }),
    respawn: Object.freeze({
      definitionId: `${MODE_DEFINITION_ID}.respawn.v1`,
      rolePolicies: Object.freeze([Object.freeze({
        modeRole: 'competitor',
        enabled: false,
        delayTicks: 0,
        maximumRespawns: 0,
        anchorPolicy: Object.freeze({ kind: 'disabled', anchorCapabilityId: null }),
        protectionTicks: 0,
      })]),
    }),
    relationship: Object.freeze({
      definitionId: `${MODE_DEFINITION_ID}.relationship.v1`,
      selfTargeting: 'forbidden',
      relations: Object.freeze([Object.freeze({
        sourceRole: 'competitor',
        targetRole: 'competitor',
        relationship: 'hostile',
      })]),
    }),
  });
  return Object.freeze({
    ...authority,
    contentHash: createDeterministicDataHash(authority, 'Arena Duel mode policy bundle'),
  });
}

function playableCharacter(characterDefinitionId: string): CharacterDefinition {
  const entry = ARENA_V2_SIX_CHARACTER_CATALOG_ENTRIES_CANDIDATE_V1.find(
    ({ definition }) => definition.id === characterDefinitionId,
  );
  if (entry === undefined) throw new RangeError(`Arena Duel未知角色${characterDefinitionId}。`);
  return entry.definition;
}

function playableWeapon(equipmentDefinitionId: string): ArenaBaselineWeaponBundleV1 {
  const weapon = ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1.find(
    ({ equipment }) => equipment.id === equipmentDefinitionId,
  );
  if (weapon === undefined) throw new RangeError(`Arena Duel未知武器${equipmentDefinitionId}。`);
  return weapon;
}

function playableMap(mapDefinitionId: string): MapDefinition {
  const mapDefinition = PLAYABLE_DUEL_MAPS.find(({ id }) => id === mapDefinitionId);
  if (mapDefinition === undefined) throw new RangeError(`Arena Duel未知地图${mapDefinitionId}。`);
  return mapDefinition;
}

function v5Config(
  participantIds: readonly string[],
  character: CharacterDefinition = CHARACTER,
  weapon: ArenaBaselineWeaponBundleV1 = WEAPON,
  mapDefinition: MapDefinition = DUEL_MAP,
): ArenaMatchConfigOverrides {
  return Object.freeze({
    participantIds,
    livesPerParticipant: 1,
    preparingTicks: ARENA_DUEL_TIMELINE_RUNTIME_MIRROR_CANDIDATE_V1.preparingTicks,
    suddenDeathStartTick:
      ARENA_DUEL_TIMELINE_RUNTIME_MIRROR_CANDIDATE_V1.suddenDeathStartActiveTick,
    hardLimitTicks: ARENA_DUEL_TIMELINE_RUNTIME_MIRROR_CANDIDATE_V1.hardLimitActiveTicks,
    respawnTicks: 0,
    invulnerableTicks: 0,
    lastHitCreditTicks: 120,
    mapDefinitionId: mapDefinition.id,
    arena: mapDefinition.arena,
    participantCharacters: participantIds.map((participantId) => Object.freeze({
      participantId,
      definitionId: character.id,
    })),
    equipment: Object.freeze({
      initialSpawns: Object.freeze(participantIds.map((participantId, index) => Object.freeze({
        id: `arena-duel-${participantId}-weapon`,
        definitionId: weapon.equipment.id,
        position: mapDefinition.arena.spawns[index]!,
      }))),
    }),
    airJumpHorizontalImpulse: ARENA_GAMEPLAY_V2_TUNING.character.jump.airHorizontalImpulse,
    contextPrimaryMobilityEnabled: false,
  });
}

function createCore(
  participantIds: readonly string[],
  matchSeed: number,
  config: ArenaMatchConfigOverrides = v5Config(participantIds),
  character: CharacterDefinition = CHARACTER,
  weapon: ArenaBaselineWeaponBundleV1 = WEAPON,
  mapDefinition: MapDefinition = DUEL_MAP,
): MatchCore {
  return new MatchCore({
    seed: matchSeed,
    config,
    characterRegistry: new CharacterRegistry([character]),
    ruleEngineFactory: ({ participantIds: ids }) => (
      createArenaBaselineWeaponRuleEngineCandidateV1(weapon, ids)
    ),
    mapSystemFactory: ({ matchSeed: seed, equipmentDefinitionCatalog }) => new ArenaMapSystem({
      mapDefinition,
      strategyRegistry: createDefaultMapEventStrategyRegistry(),
      commandRegistry: createDefaultMapCommandRegistry(),
      matchSeed: seed,
      rulesetVersion: MAP_RULESET_VERSION,
      validationContext: { equipmentRegistry: equipmentDefinitionCatalog },
    }),
  });
}

function v6Config(
  finalAssignment: ReturnType<typeof validateFinalizedMatchAssignmentV2>,
  modePolicyContentHash: string,
): ArenaMatchConfigV6 {
  return createArenaMatchConfigV6({
    schemaVersion: 6,
    modeDefinitionId: MODE_DEFINITION_ID,
    modeKind: 'duel',
    modePolicyContentHash,
    participantAssignments: finalAssignment.participants,
  });
}

function copyLocalActionOutcome(outcome: DeepReadonly<ActionAffordanceOutcome>) {
  return Object.freeze({
    kind: outcome.kind,
    actionDefinitionId: outcome.actionDefinitionId,
    lane: outcome.lane,
    source: outcome.source,
    reason: outcome.reason,
  });
}

function localSidecar(
  snapshot: DeepReadonly<ArenaMatchSnapshot>,
  localParticipantId: string,
  eventSequence: number,
) {
  const participant = snapshot.participants.find(({ id }) => id === localParticipantId);
  if (participant === undefined) throw new Error('Arena Duel local participant缺少snapshot。');
  const affordance = participant.actionAffordance as DeepReadonly<ActionAffordance> | undefined;
  if (affordance === undefined) {
    throw new Error('Arena Duel local participant缺少权威Action Affordance。');
  }
  if (affordance.tick !== snapshot.tick || affordance.participantId !== localParticipantId) {
    throw new RangeError('Arena Duel local Action Affordance与当前帧身份漂移。');
  }
  const primary = affordance.channels.primary as DeepReadonly<ActionAffordanceOutcome> | undefined;
  const primaryHold = affordance.channels.primaryHold as
    DeepReadonly<ActionAffordanceOutcome> | undefined;
  if (primary === undefined || primaryHold === undefined) {
    throw new Error('Arena Duel local Action Affordance缺少primary/primaryHold。');
  }
  return Object.freeze({
    schemaVersion: 3 as const,
    tick: snapshot.tick,
    eventSequence,
    participantId: localParticipantId,
    profile: 'local-context-primary' as const,
    primaryActionDefinitionId: affordance.primaryActionDefinitionId,
    channels: Object.freeze({
      primary: copyLocalActionOutcome(primary),
      primaryHold: copyLocalActionOutcome(primaryHold),
    }),
  });
}

function activeTick(snapshot: DeepReadonly<ArenaMatchSnapshot>): number {
  return Math.max(0, snapshot.activeTick);
}

function feedbackObservation(snapshot: DeepReadonly<ArenaMatchSnapshot>) {
  return Object.freeze({
    tick: snapshot.tick,
    eventSequence: snapshot.eventSequence,
    participants: Object.freeze(snapshot.participants.map((participant) => Object.freeze({
      participantId: participant.id,
      active: participant.status === 'active',
      actionDefinitionId: participant.action.definitionId,
      supportSurfaceId: participant.supportSurfaceId,
    }))),
  });
}

class DuelMatchCoreWorldAuthorityCandidateV1 implements ModeMatchWorldAuthorityV6 {
  readonly #config: ArenaMatchConfigV6;
  readonly #configHash: string;
  readonly #matchSeed: number;
  readonly #localParticipantId: string;
  readonly #participantIds: readonly string[];
  readonly #character: CharacterDefinition;
  readonly #weapon: ArenaBaselineWeaponBundleV1;
  readonly #weaponActionIds: ReadonlySet<string>;
  readonly #mapDefinition: MapDefinition;
  #core: MatchCore | null;
  #feedback: MatchCoreWeaponFeedbackBundleOwnerV2 | null;
  #committedDirectionFacts: readonly ArenaWeaponFeedbackDirectionFactV2[] = Object.freeze([]);
  #inputFrames: ArenaInputFrame[] = [];
  #events: ArenaAuthorityEvent[] = [];
  #readFrame: DeepReadonly<MatchReadFrameV3> | null = null;
  #stateHash: string | null = null;
  #paused = false;
  #failed = false;
  #destroyed = false;
  #transitioning = false;
  #eventSequence = 0;
  readonly #pendingCleanupResources: DuelRetainedCleanupResourceV1[] = [];

  constructor(
    config: ArenaMatchConfigV6,
    matchSeed: number,
    localParticipantId: string,
    core: MatchCore,
    character: CharacterDefinition = CHARACTER,
    weapon: ArenaBaselineWeaponBundleV1 = WEAPON,
    mapDefinition: MapDefinition = DUEL_MAP,
  ) {
    this.#config = config;
    this.#configHash = createDeterministicDataHash(config, 'Arena Duel V6 config');
    this.#matchSeed = matchSeed;
    this.#localParticipantId = localParticipantId;
    this.#participantIds = Object.freeze(
      config.participantAssignments.map(({ participantId }) => participantId),
    );
    this.#character = character;
    this.#weapon = weapon;
    this.#weaponActionIds = new Set(weapon.actions.map(({ id }) => id));
    this.#mapDefinition = mapDefinition;
    this.#core = core;
    this.#feedback = new MatchCoreWeaponFeedbackBundleOwnerV2({
      participantIds: this.#participantIds,
      outcomeWindowTicks: ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1,
      initialObservation: feedbackObservation(core.getLegacyFullSnapshotForAudit()),
    });
  }

  #retainCleanupResource(
    label: string,
    resource: DuelRetryableDestroyResourceV1,
  ): void {
    if (this.#pendingCleanupResources.some((entry) => entry.resource === resource)) return;
    this.#pendingCleanupResources.push(Object.freeze({ label, resource }));
  }

  #releaseDetachedResource(
    label: string,
    resource: DuelRetryableDestroyResourceV1 | null,
    errors: unknown[],
  ): void {
    if (resource === null) return;
    try {
      resource.destroy();
    } catch (error) {
      this.#retainCleanupResource(label, resource);
      errors.push(safelyWrapDuelThrownError(error, `Arena Duel ${label}清理失败。`));
    }
  }

  #releaseCurrentResources(errors: unknown[]): void {
    if (this.#feedback !== null) {
      const feedback = this.#feedback;
      try {
        feedback.destroy();
        if (this.#feedback === feedback) this.#feedback = null;
      } catch (error) {
        errors.push(safelyWrapDuelThrownError(error, 'Arena Duel WeaponFeedback清理失败。'));
      }
    }
    if (this.#core !== null) {
      const core = this.#core;
      try {
        core.destroy();
        if (this.#core === core) this.#core = null;
      } catch (error) {
        errors.push(safelyWrapDuelThrownError(error, 'Arena Duel MatchCore清理失败。'));
      }
    }
  }

  #releasePendingCleanupResources(errors: unknown[]): void {
    for (let index = this.#pendingCleanupResources.length - 1; index >= 0; index -= 1) {
      const entry = this.#pendingCleanupResources[index]!;
      try {
        entry.resource.destroy();
        this.#pendingCleanupResources.splice(index, 1);
      } catch (error) {
        errors.push(safelyWrapDuelThrownError(
          error,
          `Arena Duel retained ${entry.label}清理失败。`,
        ));
      }
    }
  }

  #assertLive(): void {
    if (this.#destroyed) throw new Error('Arena Duel authority已销毁。');
    if (this.#failed) throw new Error('Arena Duel authority已失败关闭。');
    if (this.#core === null) throw new Error('Arena Duel authority Core不可用。');
    if (this.#feedback === null) throw new Error('Arena Duel authority feedback不可用。');
  }

  #push(events: ArenaMatchEventV6[], tick: number, payload: Record<string, unknown>): void {
    events.push(createArenaMatchEventV6({
      ...payload,
      id: `arena-duel:${this.#matchSeed.toString(16)}:${tick}:${this.#eventSequence}`,
      sequence: this.#eventSequence,
      tick,
    }));
    this.#eventSequence += 1;
  }

  #frame(
    snapshot: DeepReadonly<ArenaMatchSnapshot>,
    projection: MatchReadFrameV3['worldSnapshot']['modeProjection'],
    result: DeepReadonly<ModeResultV3Payload> | null,
  ): DeepReadonly<MatchReadFrameV3> {
    const participants = snapshot.participants.map((participant) => {
      const {
        actionAffordance: _actionAffordance,
        equipment,
        ...worldParticipant
      } = participant;
      return Object.freeze({
        ...worldParticipant,
        equipment: equipment === null ? null : Object.freeze({
          instanceId: equipment.instanceId,
          runtimeEquipmentDefinitionId: equipment.definitionId,
          collectionEquipmentDefinitionId: equipment.definitionId,
          survivalLevel: null,
          cooldownRemainingTicks: equipment.cooldownRemainingTicks,
        }),
      });
    });
    const equipment = snapshot.equipment.map((runtime) => Object.freeze({
      schemaVersion: runtime.schemaVersion,
      instanceId: runtime.instanceId,
      runtimeEquipmentDefinitionId: runtime.definitionId,
      collectionEquipmentDefinitionId: runtime.definitionId,
      survivalLevel: null,
      spawnId: runtime.spawnId,
      locationState: runtime.locationState,
      ownerId: runtime.ownerId,
      position: runtime.position,
      lastSafePosition: runtime.lastSafePosition,
      cooldownRemainingTicks: runtime.cooldownRemainingTicks,
      revision: runtime.revision,
    }));
    return createMatchReadFrameV3Audit({
      schemaVersion: 3,
      worldSnapshot: {
        authoritySchemaVersion: 6,
        physicsBackendVersion: snapshot.physicsBackendVersion,
        configHash: this.#configHash,
        ruleContentHash: this.#config.modePolicyContentHash,
        matchSeed: this.#matchSeed,
        tick: snapshot.tick,
        activeTick: activeTick(snapshot),
        phase: result === null ? snapshot.phase : 'ended',
        remainingTicks: snapshot.remainingTicks,
        eventSequence: this.#eventSequence,
        modeDefinitionId: this.#config.modeDefinitionId,
        participants,
        equipment,
        activeSupplyProjection: null,
        modeProjection: projection,
        map: snapshot.map,
        result,
      },
      localActionSidecar: localSidecar(snapshot, this.#localParticipantId, this.#eventSequence),
    }, NO_SUPPLY_AUDIT);
  }

  #localJumpAvailability(frame: DeepReadonly<MatchReadFrameV3>) {
    const capabilities = this.#core!.getMovementCapabilities(this.#localParticipantId);
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

  start(context: Readonly<{
    readonly config: ArenaMatchConfigV6;
    readonly expectedMatchSeed: number;
    readonly localParticipantId: string;
  }>): unknown {
    this.#assertLive();
    if (this.#readFrame !== null || this.#transitioning) throw new Error('Arena Duel只能启动一次。');
    if (
      context.expectedMatchSeed !== this.#matchSeed
      || context.localParticipantId !== this.#localParticipantId
      || !sameData(context.config, this.#config, 'Arena Duel start config')
    ) throw new RangeError('Arena Duel start身份漂移。');
    const snapshot = this.#core!.getLegacyFullSnapshotForAudit();
    const projection = Object.freeze({
      schemaVersion: 1 as const,
      modeDefinitionId: this.#config.modeDefinitionId,
      revision: 0,
      preparationRemainingTicks: snapshot.phase === ARENA_MATCH_PHASE.PREPARING
        ? Math.max(0, PREPARING_TICKS - snapshot.tick)
        : null,
      state: Object.freeze({ kind: 'duel' as const, suddenDeath: false }),
    });
    this.#readFrame = this.#frame(snapshot, projection, null);
    this.#stateHash = createDeterministicDataHash({
      coreHash: this.#core!.getStateHash(),
      feedbackCheckpoint: this.#feedback!.exportFeedbackCheckpointV1(),
      feedbackDirectionCheckpoint: this.#feedback!.exportDirectionCheckpointV2(),
      world: this.#readFrame.worldSnapshot,
    }, 'Arena Duel initial authority state');
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
    if (this.#paused || this.#transitioning || this.#readFrame === null || this.#stateHash === null) {
      throw new Error('Arena Duel authority当前不可step。');
    }
    if (request.tick !== this.#readFrame.worldSnapshot.tick) {
      throw new RangeError('Arena Duel step tick漂移。');
    }
    this.#transitioning = true;
    try {
      const previousSnapshot = this.#core!.getLegacyFullSnapshotForAudit();
      const oldEvents = this.#core!.step(request.inputFrames);
      this.#inputFrames.push(...request.inputFrames);
      this.#events.push(...oldEvents);
      const snapshot = this.#core!.getLegacyFullSnapshotForAudit();
      const previousDuel = this.#readFrame.worldSnapshot.modeProjection.state;
      if (previousDuel.kind !== 'duel') throw new Error('Arena Duel projection漂移。');
      const nonTerminalPhase = snapshot.phase === ARENA_MATCH_PHASE.ENDED
        ? previousDuel.suddenDeath ? 'sudden-death' : 'running'
        : snapshot.phase;
      const resolution = request.resolveMode(Object.freeze({
        phase: nonTerminalPhase,
        preparationRemainingTicks: nonTerminalPhase === 'preparing'
          ? Math.max(0, PREPARING_TICKS - snapshot.tick)
          : null,
        result: snapshot.result,
        timelineFacts: Object.freeze({
          totalTick: snapshot.tick,
          activeTick: activeTick(snapshot),
          phase: nonTerminalPhase,
          preparationRemainingTicks: nonTerminalPhase === 'preparing'
            ? Math.max(0, PREPARING_TICKS - snapshot.tick)
            : null,
        }),
        objectiveFacts: Object.freeze({
          kind: 'duel' as const,
          tick: request.tick,
          participants: Object.freeze(snapshot.participants.map((participant) => Object.freeze({
            participantId: participant.id,
            status: participant.status,
            lives: participant.lives,
            eliminations: participant.eliminations,
          }))),
        }),
      }));
      const events: ArenaMatchEventV6[] = [];
      if (request.tick === 0) {
        this.#push(events, request.tick, {
          type: ARENA_MATCH_EVENT_V6.MATCH_STARTED,
          modeDefinitionId: this.#config.modeDefinitionId,
          participantIds: this.#participantIds,
        });
      }
      const falls: ArenaAuthorityEvent[] = [];
      for (const event of oldEvents) {
        if (event.type === ARENA_MATCH_EVENT.ACTION_STARTED) {
          const participantId = assertNonEmptyString(event.participantId, 'Duel ActionStarted participant');
          const action = assertNonEmptyString(event.action, 'Duel ActionStarted action');
          const currentParticipant = snapshot.participants.find(({ id }) => id === participantId);
          const previousParticipant = previousSnapshot.participants.find(
            ({ id }) => id === participantId,
          );
          const held = currentParticipant?.equipment ?? previousParticipant?.equipment ?? null;
          const equipmentAction = event.source === 'equipment-system';
          if (equipmentAction !== this.#weaponActionIds.has(action)) {
            throw new Error(`Arena Duel ActionStarted ${action}来源与武器目录不一致。`);
          }
          if (equipmentAction && held === null) {
            throw new Error(`Arena Duel equipment action ${action}缺少装备身份。`);
          }
          this.#push(events, request.tick, {
            type: ARENA_MATCH_EVENT_V6.ACTION_STARTED,
            participantId,
            action,
            sourceKind: equipmentAction ? 'equipment' : 'base-action',
            equipmentInstanceId: equipmentAction ? held!.instanceId : null,
            runtimeEquipmentDefinitionId: equipmentAction ? held!.definitionId : null,
            collectionEquipmentDefinitionId: equipmentAction ? held!.definitionId : null,
            survivalLevel: null,
          });
        } else if (event.type === ARENA_MATCH_EVENT.PLAYER_ELIMINATED) {
          falls.push(event);
        }
      }
      const feedbackCheckpoint = this.#feedback!.exportFeedbackCheckpointV1();
      const feedbackSourceEvents = oldEvents.filter((event) => {
        if (event.type !== ARENA_MATCH_EVENT.PLAYER_ELIMINATED) return true;
        if (event.creditedAttackerId === null) return true;
        const target = snapshot.participants.find(({ id }) => id === event.participantId)
          ?? previousSnapshot.participants.find(({ id }) => id === event.participantId);
        if (target === undefined
          || target.lastHitBy !== event.creditedAttackerId
          || !Number.isSafeInteger(target.lastHitTick)) {
          throw new RangeError('Arena Duel credited elimination与目标last-hit身份/时间不闭合。');
        }
        const elapsedTicks = request.tick - target.lastHitTick;
        if (elapsedTicks < 0) {
          throw new RangeError('Arena Duel credited elimination早于目标last-hit。');
        }
        return elapsedTicks <= ARENA_WEAPON_FEEDBACK_OUTCOME_WINDOW_TICKS_V1;
      }).map((event, index) => Object.freeze({
        ...event,
        sequence: feedbackCheckpoint.sourceEventSequence + index,
      }));
      const feedbackResult = this.#feedback!.step({
        sequenceStart: this.#eventSequence,
        sourceEvents: feedbackSourceEvents,
        observation: Object.freeze({
          ...feedbackObservation(snapshot),
          eventSequence: feedbackCheckpoint.sourceEventSequence + feedbackSourceEvents.length,
        }),
      });
      const feedbackEvents = feedbackResult.feedbackEvents;
      events.push(...feedbackEvents);
      this.#eventSequence += feedbackEvents.length;
      for (const event of falls) {
        this.#push(events, request.tick, {
            type: ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL,
            modeDefinitionId: this.#config.modeDefinitionId,
            participantId: event.participantId,
            modeRole: 'competitor',
            slotId: null,
            slotGeneration: 0,
            fallCause: event.creditedAttackerId === null ? 'movement' : 'credited-hit',
            creditedAttackerId: event.creditedAttackerId,
            supportSurfaceId: null,
        });
      }
      if (resolution.modeResult !== null) {
        this.#push(events, request.tick, {
          type: ARENA_MATCH_EVENT_V6.MATCH_ENDED,
          modeDefinitionId: this.#config.modeDefinitionId,
          modeResult: resolution.modeResult,
        });
      }
      const readFrame = this.#frame(snapshot, resolution.modeProjection, resolution.modeResult);
      const stateHash = createDeterministicDataHash({
        previousHash: this.#stateHash,
        coreHash: this.#core!.getStateHash(),
        feedbackCheckpoint: feedbackResult.feedbackCheckpoint,
        feedbackDirectionCheckpoint: feedbackResult.directionCheckpoint,
        feedbackDirectionFacts: feedbackResult.directionFacts,
        inputFrames: request.inputFrames,
        events,
        world: readFrame.worldSnapshot,
      }, 'Arena Duel authority state');
      this.#readFrame = readFrame;
      this.#stateHash = stateHash;
      this.#committedDirectionFacts = feedbackResult.directionFacts;
      return Object.freeze({
        readFrame,
        readFrameAudit: NO_SUPPLY_AUDIT,
        events: Object.freeze(events),
        supplyFacts: Object.freeze([]),
        supplyCadence: null,
        localJumpAvailability: this.#localJumpAvailability(readFrame),
        stateHash,
        appliedModeCommandHash: createDeterministicDataHash(
          resolution.commands,
          'Arena Duel applied mode commands',
        ),
      });
    } finally {
      this.#transitioning = false;
    }
  }

  #coreCheckpoint(): ArenaInternalMatchCheckpoint {
    this.#assertLive();
    const metadata = this.#core!.getReplayMetadata();
    const identity = this.#core!.getInternalCheckpointIdentity();
    return createArenaInternalMatchCheckpoint({
      checkpointSchemaVersion: 1,
      matchSchemaVersion: metadata.schemaVersion,
      physicsBackendVersion: metadata.physicsBackendVersion,
      configHash: metadata.configHash,
      ruleContentHash: metadata.ruleContentHash,
      matchSeed: metadata.matchSeed,
      config: metadata.config,
      tick: identity.tick,
      phase: identity.phase,
      eventSequence: identity.eventSequence,
      inputFrames: this.#inputFrames,
      events: this.#events,
      stateHash: identity.stateHash,
    });
  }

  exportCheckpoint(current?: Readonly<{
    readonly readFrame: DeepReadonly<MatchReadFrameV3>;
    readonly readFrameAudit: MatchReadFrameV3AuditOptions;
    readonly stateHash: string;
  }>): DuelAuthorityCheckpointV2 {
    this.#assertLive();
    if (this.#transitioning || this.#readFrame === null || this.#stateHash === null) {
      throw new Error('Arena Duel authority当前不可导出checkpoint。');
    }
    if (current !== undefined && (
      current.stateHash !== this.#stateHash
      || !sameData(current.readFrame, this.#readFrame, 'Arena Duel checkpoint frame')
      || !sameData(current.readFrameAudit, NO_SUPPLY_AUDIT, 'Arena Duel checkpoint audit')
    )) throw new RangeError('Arena Duel checkpoint调用方状态漂移。');
    return cloneFrozenData({
      schemaVersion: 2 as const,
      configHash: this.#configHash,
      matchSeed: this.#matchSeed,
      localParticipantId: this.#localParticipantId,
      readFrame: this.#readFrame,
      readFrameAudit: NO_SUPPLY_AUDIT,
      stateHash: this.#stateHash,
      paused: this.#paused,
      coreCheckpoint: this.#coreCheckpoint(),
      feedbackCheckpoint: this.#feedback!.exportFeedbackCheckpointV1(),
      feedbackDirectionCheckpoint: this.#feedback!.exportDirectionCheckpointV2(),
    }, 'Arena Duel authority checkpoint');
  }

  restore(request: Readonly<{
    readonly checkpoint: DeepReadonly<unknown>;
    readonly config: ArenaMatchConfigV6;
    readonly expectedMatchSeed: number;
    readonly localParticipantId: string;
    readonly runtimeState: 'running' | 'paused';
  }>): unknown {
    this.#assertLive();
    if (this.#transitioning || this.#readFrame !== null) {
      throw new Error('Arena Duel authority只允许新owner恢复。');
    }
    const checkpoint = cloneFrozenData(request.checkpoint, 'Arena Duel authority checkpoint');
    exactRecord(checkpoint, AUTHORITY_CHECKPOINT_KEYS, 'Arena Duel authority checkpoint');
    if (
      checkpoint.schemaVersion !== 2
      || checkpoint.configHash !== this.#configHash
      || checkpoint.matchSeed !== this.#matchSeed
      || checkpoint.localParticipantId !== this.#localParticipantId
      || request.expectedMatchSeed !== this.#matchSeed
      || request.localParticipantId !== this.#localParticipantId
      || !sameData(request.config, this.#config, 'Arena Duel restore config')
      || checkpoint.paused !== (request.runtimeState === 'paused')
    ) throw new RangeError('Arena Duel restore身份漂移。');
    const coreCheckpoint = checkpoint.coreCheckpoint as ArenaInternalMatchCheckpoint;
    let nextCore: MatchCore | null = null;
    let nextFeedback: MatchCoreWeaponFeedbackBundleOwnerV2 | null = null;
    let adopted = false;
    this.#transitioning = true;
    try {
      nextCore = restoreMatchCoreFromCheckpoint(coreCheckpoint, {
        coreFactory: ({ seed, config }: InternalCheckpointCoreFactoryOptions) => createCore(
          this.#participantIds,
          seed,
          config,
          this.#character,
          this.#weapon,
          this.#mapDefinition,
        ),
      });
      nextFeedback = MatchCoreWeaponFeedbackBundleOwnerV2.restoreFromCheckpointsV2({
        feedbackCheckpoint:
          checkpoint.feedbackCheckpoint as MatchCoreWeaponFeedbackAdapterCheckpointV1,
        directionCheckpoint:
          checkpoint.feedbackDirectionCheckpoint as MatchCoreWeaponFeedbackDirectionCheckpointV2,
      });
      const nextReadFrame = createMatchReadFrameV3Audit(
        checkpoint.readFrame,
        checkpoint.readFrameAudit as MatchReadFrameV3AuditOptions,
      );
      const nextStateHash = assertNonEmptyString(
        checkpoint.stateHash,
        'Arena Duel checkpoint stateHash',
      );
      const previousCleanupErrors: unknown[] = [];
      this.#releaseCurrentResources(previousCleanupErrors);
      if (previousCleanupErrors.length > 0) {
        throw new AggregateError(
          previousCleanupErrors,
          'Arena Duel restore旧资源清理失败。',
        );
      }
      this.#core = nextCore;
      this.#feedback = nextFeedback;
      nextCore = null;
      nextFeedback = null;
      adopted = true;
      this.#inputFrames = [...coreCheckpoint.inputFrames];
      this.#events = [...coreCheckpoint.events];
      this.#readFrame = nextReadFrame;
      this.#stateHash = nextStateHash;
      this.#committedDirectionFacts = Object.freeze([]);
      this.#paused = checkpoint.paused as boolean;
      this.#eventSequence = nextReadFrame.worldSnapshot.eventSequence;
      return Object.freeze({
        readFrame: nextReadFrame,
        readFrameAudit: NO_SUPPLY_AUDIT,
        supplyCadence: null,
        localJumpAvailability: this.#localJumpAvailability(nextReadFrame),
        stateHash: nextStateHash,
      });
    } catch (error) {
      const cleanupErrors: unknown[] = [];
      if (adopted) {
        this.#releaseCurrentResources(cleanupErrors);
      } else {
        this.#releaseDetachedResource('restore WeaponFeedback', nextFeedback, cleanupErrors);
        this.#releaseDetachedResource('restore MatchCore', nextCore, cleanupErrors);
      }
      this.#failed = true;
      if (cleanupErrors.length > 0) {
        throw new AggregateError(
          [error, ...cleanupErrors],
          'Arena Duel restore与资源清理失败。',
        );
      }
      throw error;
    } finally {
      this.#transitioning = false;
    }
  }

  pause(): void {
    this.#assertLive();
    if (this.#paused || this.#transitioning || this.#readFrame === null) {
      throw new Error('Arena Duel authority当前不可pause。');
    }
    this.#paused = true;
  }

  resume(): void {
    this.#assertLive();
    if (!this.#paused || this.#transitioning || this.#readFrame === null) {
      throw new Error('Arena Duel authority当前不可resume。');
    }
    this.#paused = false;
  }

  readCommittedWeaponFeedbackDirectionFactsV2():
  readonly ArenaWeaponFeedbackDirectionFactV2[] {
    this.#assertLive();
    return this.#committedDirectionFacts;
  }

  destroy(): void {
    if (this.#destroyed) return;
    if (this.#transitioning) throw new Error('Arena Duel authority转换期间不可destroy。');
    const cleanupErrors: unknown[] = [];
    this.#releaseCurrentResources(cleanupErrors);
    this.#releasePendingCleanupResources(cleanupErrors);
    if (cleanupErrors.length > 0) {
      this.#failed = true;
      throw new AggregateError(cleanupErrors, 'Arena Duel authority destroy清理不完整。');
    }
    this.#inputFrames.length = 0;
    this.#events.length = 0;
    this.#readFrame = null;
    this.#stateHash = null;
    this.#committedDirectionFacts = Object.freeze([]);
    this.#destroyed = true;
  }
}

interface DuelBotStateV1 {
  readonly participantId: string;
}

function botInput(frame: DeepReadonly<MatchReadFrameV3>, state: DuelBotStateV1): ArenaInputFrame {
  const tick = frame.worldSnapshot.tick;
  const self = frame.worldSnapshot.participants.find(({ id }) => id === state.participantId);
  const opponent = frame.worldSnapshot.participants.find(({ id }) => id !== state.participantId);
  const canControl = self !== undefined && isBotParticipantControlAvailableV1({
    schemaVersion: 1,
    participantActive: self.status === 'active',
    hitstunTicks: self.hitstunTicks,
  });
  if (self === undefined || opponent === undefined || !canControl) {
    return normalizeInputFrame({
      tick,
      participantId: state.participantId,
      moveX: 0,
      moveZ: 0,
      primaryPressed: false,
      primaryHeld: false,
      jumpPressed: false,
      jumpHeld: false,
      slamPressed: false,
    }, { expectedTick: tick, participantIds: [state.participantId] });
  }
  const dx = opponent.position.x - self.position.x;
  const dz = opponent.position.z - self.position.z;
  const distance = Math.hypot(dx, dz);
  const actionRule = assertPlainRecord(
    self.actionRule,
    `Arena Duel ${self.id} actionRule`,
  );
  const range = typeof actionRule.range === 'number' ? actionRule.range : 0;
  const actionReady = isBotPrimaryActionReadyV1({
    schemaVersion: 1,
    actionIdle: self.action.phase === 'idle',
    cooldownRemainingTicks: self.equipment?.cooldownRemainingTicks ?? null,
  });
  const attack = distance <= range * 0.9
    && actionReady
    && opponent.status === 'active'
    && opponent.invulnerableTicks === 0
    && (tick + state.participantId.length) % 12 === 0;
  const primaryInput = createBotPrimaryInputPacingV1({
    schemaVersion: 1,
    actionReady,
    actionInProgress: self.action.phase !== 'idle',
    commitment: createBotPrimaryCommitmentObservationV1(
      self.action.commitment === undefined ? null : {
        status: self.action.commitment.status,
        chargeTicks: self.action.commitment.chargeTicks,
      },
    ),
    minimumCommitmentTicks: typeof actionRule.minimumCommitmentTicks === 'number'
      ? actionRule.minimumCommitmentTicks
      : 0,
    wantsToStart: attack,
  });
  const chargingCommitment = self.action.commitment?.status === 'charging';
  const jump = !attack
    && !chargingCommitment
    && self.grounded
    && Math.abs(opponent.position.y - self.position.y) > 0.35;
  return normalizeInputFrame({
    tick,
    participantId: state.participantId,
    moveX: distance > 1e-7 ? dx / distance : 0,
    moveZ: distance > 1e-7 ? dz / distance : 0,
    primaryPressed: primaryInput.primaryPressed,
    primaryHeld: primaryInput.primaryHeld,
    jumpPressed: jump,
    jumpHeld: jump,
    slamPressed: false,
  }, { expectedTick: tick, participantIds: [state.participantId] });
}

export class ArenaDuelAuthoritativeRuntimeCandidateV1 {
  readonly #runtime: ModeMatchRuntimeV6;
  readonly #authority: DuelMatchCoreWorldAuthorityCandidateV1;
  readonly #request: DeepReadonly<ArenaDuelAuthoritativeRuntimeCandidateV1Request>;
  readonly #localParticipantId: string;
  readonly #participantIds: readonly string[];
  readonly #bot: DuelBotStateV1;
  #destroyed = false;

  constructor(
    value: unknown,
    restoreCapabilityValue?: unknown,
    restoreRuntimeCheckpointV3Value?: unknown,
  ) {
    const source = cloneFrozenData(value, 'Arena Duel authoritative runtime request');
    exactRuntimeRequest(source, 'Arena Duel authoritative runtime request');
    const modeDefinitionId = assertNonEmptyString(
      source.modeDefinitionId,
      'Arena Duel authoritative modeDefinitionId',
    );
    if (modeDefinitionId !== MODE_DEFINITION_ID) {
      throw new RangeError('Arena Duel authoritative runtime Mode身份漂移。');
    }
    const matchSeed = uint32(source.matchSeed, 'Arena Duel authoritative matchSeed');
    const localParticipantId = assertNonEmptyString(
      source.localParticipantId,
      'Arena Duel authoritative localParticipantId',
    );
    const selection = validateMatchContentSelectionV2(source.selection);
    const finalAssignment = validateFinalizedMatchAssignmentV2(source.finalAssignment);
    const runtimePolicyBinding: ArenaThreeModeRuntimePolicyBindingCandidateV1 | null =
      source.runtimePolicyBinding === undefined
        ? null
        : validateArenaThreeModeRuntimePolicyBindingCandidateV1(
          source.runtimePolicyBinding,
          MODE_DEFINITION_ID,
          'duel',
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
    if (restoreCapability !== null && restoreRuntimeCheckpointV3Value !== undefined) {
      throw new RangeError('Arena Duel每次只能选择一种runtime恢复来源。');
    }
    if (
      restoreCapability !== null
      && restoreCapability.modeDefinitionId !== MODE_DEFINITION_ID
    ) throw new RangeError('Arena Duel feedback restore capability Mode身份漂移。');
    const assignedCharacterIds = Object.freeze([...new Set(
      finalAssignment.participants.map(({ characterDefinitionId }) => characterDefinitionId),
    )].sort());
    if (assignedCharacterIds.length !== 1) {
      throw new RangeError('Arena Duel双方必须使用同一角色手感保证对称。');
    }
    const character = playableCharacter(assignedCharacterIds[0]!);
    if (selection.equipmentDefinitionIds.length !== 1) {
      throw new RangeError('Arena Duel必须精确冻结一把武器。');
    }
    const weapon = playableWeapon(selection.equipmentDefinitionIds[0]!);
    const mapDefinition = playableMap(selection.selectedMapDefinitionId);
    if (
      selection.modeDefinitionId !== modeDefinitionId
      || finalAssignment.modeDefinitionId !== modeDefinitionId
      || selection.contentHash !== finalAssignment.contentHash
      || selection.selectedMapDefinitionId !== mapDefinition.id
      || !sameData(
        selection.mapDefinitionIds,
        Object.freeze([mapDefinition.id]),
        'Arena Duel selected maps',
      )
      || !sameData(
        selection.characterDefinitionIds,
        Object.freeze([character.id]),
        'Arena Duel selected characters',
      )
      || !sameData(
        selection.equipmentDefinitionIds,
        Object.freeze([weapon.equipment.id]),
        'Arena Duel selected equipment',
      )
      || finalAssignment.participants.length !== 2
      || finalAssignment.participants.some(({ modeRole, characterDefinitionId }) => (
        modeRole !== 'competitor' || characterDefinitionId !== character.id
      ))
    ) throw new RangeError('Arena Duel authoritative runtime selection/assignment漂移。');
    const humans = finalAssignment.participants.filter(({ controllerKind }) => controllerKind === 'human');
    const bots = finalAssignment.participants.filter(({ controllerKind }) => controllerKind === 'bot');
    if (
      humans.length !== 1
      || bots.length !== 1
      || humans[0]!.participantId !== localParticipantId
    ) throw new RangeError('Arena Duel authoritative runtime必须精确为1 human + 1 bot。');
    const participantIds = Object.freeze(finalAssignment.participants.map(({ participantId }) => participantId));
    const core = createCore(
      participantIds,
      matchSeed,
      v5Config(participantIds, character, weapon, mapDefinition),
      character,
      weapon,
      mapDefinition,
    );
    const definitionBundle = runtimePolicyBinding === null
      ? modeBundle()
      : projectArenaDuelRuntimePolicyResolverBundleCandidateV1(
        runtimePolicyBinding,
        MODE_DEFINITION_ID,
      );
    const resultPolicyBundle = runtimePolicyBinding === null
      ? null
      : projectArenaRuntimeResultPolicyResolverBundleCandidateV1(
        runtimePolicyBinding,
        MODE_DEFINITION_ID,
        'duel',
      );
    const config = v6Config(finalAssignment, definitionBundle.contentHash);
    const objectivePolicyBundle = runtimePolicyBinding === null
      ? null
      : projectArenaRuntimeObjectivePolicyResolverBundleCandidateV1(
        runtimePolicyBinding,
        MODE_DEFINITION_ID,
        'duel',
        config.modePolicyContentHash,
      );
    let authority: DuelMatchCoreWorldAuthorityCandidateV1;
    try {
      authority = new DuelMatchCoreWorldAuthorityCandidateV1(
        config,
        matchSeed,
        localParticipantId,
        core,
        character,
        weapon,
        mapDefinition,
      );
    } catch (error) {
      try { core.destroy(); } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], 'Arena Duel authority构造清理失败。');
      }
      throw error;
    }
    let runtime: ModeMatchRuntimeV6 | null = null;
    try {
      const mode = Object.freeze({
        kind: 'duel' as const,
        definitionBundle,
        ...(objectivePolicyBundle === null ? {} : { objectivePolicyBundle }),
        ...(resultPolicyBundle === null ? {} : { resultPolicyBundle }),
      });
      runtime = restoreRuntimeCheckpointV3Value !== undefined
        ? ModeMatchRuntimeV6.restoreFromRuntimeCheckpointV3({
          checkpoint: restoreRuntimeCheckpointV3Value,
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
        throw new AggregateError([error, cleanupError], 'Arena Duel runtime构造清理失败。');
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
    this.#bot = {
      participantId: bots[0]!.participantId,
    };
  }

  start(): unknown {
    if (this.#destroyed) throw new Error('Arena Duel authoritative runtime已销毁。');
    return this.#runtime.start();
  }

  step(localInput: ArenaInputFrame): unknown {
    if (this.#destroyed) throw new Error('Arena Duel authoritative runtime已销毁。');
    const frame = this.#runtime.readFrame;
    if (frame === null) throw new Error('Arena Duel authoritative runtime尚未启动。');
    const byId = new Map<string, ArenaInputFrame>([
      [this.#localParticipantId, localInput],
      [this.#bot.participantId, botInput(frame, this.#bot)],
    ]);
    const inputs = Object.freeze(this.#participantIds.map((participantId) => byId.get(participantId)!));
    const outcome = this.#runtime.step(inputs);
    return Object.freeze({
      ...outcome,
      inputs,
      weaponFeedbackDirectionFactsV2:
        this.#authority.readCommittedWeaponFeedbackDirectionFactsV2(),
    });
  }

  pause(): void {
    if (this.#destroyed) throw new Error('Arena Duel authoritative runtime已销毁。');
    this.#runtime.pause();
  }

  resume(): void {
    if (this.#destroyed) throw new Error('Arena Duel authoritative runtime已销毁。');
    this.#runtime.resume();
  }

  exportWeaponFeedbackCheckpointCapabilityV1() {
    if (this.#destroyed) throw new Error('Arena Duel authoritative runtime已销毁。');
    return createArenaModeWeaponFeedbackCheckpointCapabilityV1({
      modeDefinitionId: MODE_DEFINITION_ID,
      runtimeCheckpoint: this.#runtime.exportRuntimeCheckpointV1(),
    });
  }

  exportWeaponFeedbackDirectionCheckpointCapabilityV2() {
    if (this.#destroyed) throw new Error('Arena Duel authoritative runtime已销毁。');
    return createArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2({
      modeDefinitionId: MODE_DEFINITION_ID,
      runtimeCheckpoint: this.#runtime.exportRuntimeCheckpointV1(),
    });
  }

  exportRuntimeCheckpointV1() {
    if (this.#destroyed) throw new Error('Arena Duel authoritative runtime已销毁。');
    return this.#runtime.exportRuntimeCheckpointV1();
  }

  exportRuntimeCheckpointV3() {
    if (this.#destroyed) throw new Error('Arena Duel authoritative runtime已销毁。');
    return this.#runtime.exportRuntimeCheckpointV3();
  }

  forkFromRuntimeCheckpointV3(
    checkpoint: unknown = this.exportRuntimeCheckpointV3(),
  ): ArenaDuelAuthoritativeRuntimeCandidateV1 {
    if (this.#destroyed) throw new Error('Arena Duel authoritative runtime已销毁。');
    return new ArenaDuelAuthoritativeRuntimeCandidateV1(
      this.#request,
      undefined,
      checkpoint,
    );
  }

  getRetainedResourceSnapshot(): ModeMatchRuntimeV6RetainedResourceSnapshot {
    return this.#runtime.getRetainedResourceSnapshot();
  }

  exportContentSelectionCheckpointCapabilityV1() {
    if (this.#destroyed) throw new Error('Arena Duel authoritative runtime已销毁。');
    return createArenaThreeModeContentSelectionCheckpointCapabilityV1({
      selection: this.#request.selection,
      finalAssignment: this.#request.finalAssignment,
      runtimeCheckpoint: this.#runtime.exportRuntimeCheckpointV1(),
    });
  }

  forkFromWeaponFeedbackCheckpointCapabilityV1(
    capability: ArenaModeWeaponFeedbackCheckpointCapabilityV1 =
      this.exportWeaponFeedbackCheckpointCapabilityV1(),
  ): ArenaDuelAuthoritativeRuntimeCandidateV1 {
    if (this.#destroyed) throw new Error('Arena Duel authoritative runtime已销毁。');
    return new ArenaDuelAuthoritativeRuntimeCandidateV1(this.#request, capability);
  }

  forkFromWeaponFeedbackDirectionCheckpointCapabilityV2(
    capability: ArenaModeWeaponFeedbackDirectionCheckpointCapabilityV2 =
      this.exportWeaponFeedbackDirectionCheckpointCapabilityV2(),
  ): ArenaDuelAuthoritativeRuntimeCandidateV1 {
    if (this.#destroyed) throw new Error('Arena Duel authoritative runtime已销毁。');
    return new ArenaDuelAuthoritativeRuntimeCandidateV1(this.#request, capability);
  }

  getModeDriverContentHash(): string {
    if (this.#destroyed) throw new Error('Arena Duel authoritative runtime已销毁。');
    return this.#runtime.getModeDriverContentHash();
  }

  getTerminalAuthorityIdentity(): unknown {
    if (this.#destroyed) throw new Error('Arena Duel authoritative runtime已销毁。');
    if (this.#runtime.state !== MODE_MATCH_RUNTIME_V6_STATE.ENDED) {
      throw new Error('Arena Duel authority identity只在终局后可读。');
    }
    const replay = this.exportReplayV6();
    const world = this.#runtime.readFrame?.worldSnapshot;
    if (world === undefined) throw new Error('Arena Duel终局缺少world identity。');
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
    if (this.#destroyed) throw new Error('Arena Duel authoritative runtime已销毁。');
    if (this.#runtime.state !== MODE_MATCH_RUNTIME_V6_STATE.ENDED) {
      throw new Error('Arena Duel Replay V6只在终局后可读。');
    }
    return this.#runtime.exportReplayV6();
  }

  exportTerminalEvidenceV1() {
    if (this.#destroyed) throw new Error('Arena Duel authoritative runtime已销毁。');
    if (this.#runtime.state !== MODE_MATCH_RUNTIME_V6_STATE.ENDED) {
      throw new Error('Arena Duel终局Runtime证据只在终局后可读。');
    }
    return this.#runtime.exportTerminalEvidenceV1();
  }

  exportTerminalEvidenceV2() {
    if (this.#destroyed) throw new Error('Arena Duel authoritative runtime已销毁。');
    if (this.#runtime.state !== MODE_MATCH_RUNTIME_V6_STATE.ENDED) {
      throw new Error('Arena Duel终局Runtime证据V2只在终局后可读。');
    }
    return this.#runtime.exportTerminalEvidenceV2();
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#runtime.destroy();
    this.#destroyed = true;
  }
}

export function createArenaDuelAuthoritativeRuntimeCandidateV1(
  value: ArenaDuelAuthoritativeRuntimeCandidateV1Request,
): ArenaDuelAuthoritativeRuntimeCandidateV1 {
  return new ArenaDuelAuthoritativeRuntimeCandidateV1(value);
}
