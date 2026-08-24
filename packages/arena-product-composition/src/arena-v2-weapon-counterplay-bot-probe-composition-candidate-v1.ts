import {
  createWeaponCounterplayProbeObservationV1,
  createWeaponCounterplayProbeInputV1,
  type WeaponCounterplayProbeObservationV1,
  type WeaponCounterplayProbeRouteTargetV1,
  type WeaponCounterplayRouteTraversalV1,
  type WeaponCounterplayProbeVector3V1,
} from '@number-strategy-jump/arena-bot';
import type { ArenaInputFrame } from '@number-strategy-jump/arena-contracts';
import {
  requireArenaV2MapCounterplaySegmentCandidateV1,
  ARENA_V2_WEAPON_COUNTERPLAY_PROFILES_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import type {
  ArenaV2MatchSceneReadFrameCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';

export interface ArenaV2CurrentLegalCounterplayRouteTargetCandidateV1 {
  readonly segmentId: string;
  readonly targetId: string;
  readonly position: WeaponCounterplayProbeVector3V1;
  readonly traversal: WeaponCounterplayRouteTraversalV1;
  readonly priority: number;
}

export interface ProjectArenaV2CurrentCounterplayRouteTargetsCandidateV1Options {
  readonly mapDefinitionId: string;
  readonly currentLegalTargets: readonly ArenaV2CurrentLegalCounterplayRouteTargetCandidateV1[];
}

export interface CreateArenaV2WeaponCounterplayBotProbeInputCandidateV1Options {
  readonly equipmentDefinitionId: string;
  readonly observation: WeaponCounterplayProbeObservationV1;
}

export interface CreateArenaV2WeaponCounterplayBotProbeObservationCandidateV1Options {
  readonly scene: ArenaV2MatchSceneReadFrameCandidateV1;
  readonly participantId: string;
  readonly opponentParticipantId: string;
  readonly selfPrimaryReady: boolean;
  readonly selfPrimaryRange: number;
  readonly selfJumpAvailable: boolean;
  readonly currentLegalRouteTargets: readonly ArenaV2CurrentLegalCounterplayRouteTargetCandidateV1[];
}

export interface ArenaV2WeaponCounterplayBotProbeObservationEnvelopeCandidateV1 {
  readonly equipmentDefinitionId: string;
  readonly observation: WeaponCounterplayProbeObservationV1;
}

/**
 * Adds immutable segment semantics only to route targets already declared
 * legal by the current authority observation. It never discovers, predicts or
 * expands future routes on the bot's behalf.
 */
export function projectArenaV2CurrentCounterplayRouteTargetsCandidateV1({
  mapDefinitionId,
  currentLegalTargets,
}: ProjectArenaV2CurrentCounterplayRouteTargetsCandidateV1Options): readonly WeaponCounterplayProbeRouteTargetV1[] {
  if (currentLegalTargets.length > 6) {
    throw new RangeError('Arena V2反制Bot当前合法通路不能超过6项。');
  }
  const targetIds = new Set<string>();
  const targets = currentLegalTargets.map((target) => {
    if (targetIds.has(target.targetId)) {
      throw new RangeError(`Arena V2反制Bot当前合法通路${target.targetId}重复。`);
    }
    targetIds.add(target.targetId);
    const segment = requireArenaV2MapCounterplaySegmentCandidateV1(
      mapDefinitionId,
      target.segmentId,
    );
    return Object.freeze({
      targetId: target.targetId,
      position: target.position,
      responseKinds: segment.routeResponseKinds,
      traversal: target.traversal,
      priority: target.priority,
    });
  });
  return Object.freeze(targets.sort((left, right) => (
    right.priority - left.priority
    || (left.targetId < right.targetId ? -1 : left.targetId > right.targetId ? 1 : 0)
  )));
}

/**
 * Adapts the already validated renderer-neutral Scene Read Frame plus explicit
 * current action affordances into the restricted bot observation. The caller
 * must supply route targets already accepted by authority; this adapter only
 * attaches immutable segment semantics and never reads MatchCore or Session.
 */
export function createArenaV2WeaponCounterplayBotProbeObservationCandidateV1({
  scene,
  participantId,
  opponentParticipantId,
  selfPrimaryReady,
  selfPrimaryRange,
  selfJumpAvailable,
  currentLegalRouteTargets,
}: CreateArenaV2WeaponCounterplayBotProbeObservationCandidateV1Options):
ArenaV2WeaponCounterplayBotProbeObservationEnvelopeCandidateV1 {
  if (scene.schemaVersion !== 1 || scene.status !== 'production-unreachable') {
    throw new RangeError('Arena V2反制Bot只接受已验证的V1 Scene Read Frame候选。');
  }
  if (participantId === opponentParticipantId) {
    throw new RangeError('Arena V2反制Bot观察者与对手不能相同。');
  }
  const self = scene.world.participants.find(({ id }) => id === participantId);
  const opponent = scene.world.participants.find(({ id }) => id === opponentParticipantId);
  if (!self || !opponent) throw new RangeError('Arena V2反制Bot参与者不在当前Scene中。');
  if (opponent.equipment === null) {
    throw new RangeError('Arena V2反制Bot专属武器探针要求对手当前持有收藏武器。');
  }
  const routeTargets = projectArenaV2CurrentCounterplayRouteTargetsCandidateV1({
    mapDefinitionId: scene.source.mapDefinitionId,
    currentLegalTargets: currentLegalRouteTargets,
  });
  return Object.freeze({
    equipmentDefinitionId: opponent.equipment.collectionEquipmentDefinitionId,
    observation: createWeaponCounterplayProbeObservationV1({
      schemaVersion: 1 as const,
      tick: scene.source.tick,
      participantId,
      opponentParticipantId,
      self: Object.freeze({
        position: self.position,
        grounded: self.grounded,
        jumpAvailable: selfJumpAvailable,
        primaryReady: selfPrimaryReady,
        primaryRange: selfPrimaryRange,
      }),
      opponent: Object.freeze({
        position: opponent.position,
        facingX: opponent.facing.x,
        facingZ: opponent.facing.z,
        actionDefinitionId: opponent.action.definitionId,
        actionPhase: opponent.action.phase,
      }),
      routeTargets,
    }),
  });
}

export function createArenaV2WeaponCounterplayBotProbeInputFromSceneCandidateV1(
  options: CreateArenaV2WeaponCounterplayBotProbeObservationCandidateV1Options,
): ArenaInputFrame {
  const envelope = createArenaV2WeaponCounterplayBotProbeObservationCandidateV1(options);
  return createArenaV2WeaponCounterplayBotProbeInputCandidateV1(envelope);
}

/**
 * Candidate-only composition boundary. Product content supplies immutable
 * counterplay data while arena-bot remains unaware of product catalogs.
 */
export function createArenaV2WeaponCounterplayBotProbeInputCandidateV1({
  equipmentDefinitionId,
  observation,
}: CreateArenaV2WeaponCounterplayBotProbeInputCandidateV1Options): ArenaInputFrame {
  const profile = ARENA_V2_WEAPON_COUNTERPLAY_PROFILES_CANDIDATE_V1.find((candidate) => (
    candidate.equipmentDefinitionId === equipmentDefinitionId
  ));
  if (!profile) {
    throw new RangeError(`Arena V2反制Bot探针不支持装备${equipmentDefinitionId}。`);
  }
  return createWeaponCounterplayProbeInputV1({
    schemaVersion: profile.schemaVersion,
    profileId: profile.profileId,
    equipmentDefinitionId: profile.equipmentDefinitionId,
    groundActionDefinitionId: profile.groundActionDefinitionId,
    aerialActionDefinitionId: profile.aerialActionDefinitionId,
    threatBand: profile.threatBand,
    preferredMinimumDistance: profile.preferredMinimumDistance,
    preferredMaximumDistance: profile.preferredMaximumDistance,
    groundResponse: profile.groundResponse,
    aerialResponse: profile.aerialResponse,
    punishCue: profile.punishCue,
    routeResponse: profile.routeResponse,
  }, observation);
}

export const ARENA_V2_WEAPON_COUNTERPLAY_BOT_PROBE_COMPOSITION_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultCompositionWired: false as const,
  profileCount: ARENA_V2_WEAPON_COUNTERPLAY_PROFILES_CANDIDATE_V1.length,
  mapCount: 2 as const,
  mapSegmentCount: 20 as const,
  readsRestrictedCurrentObservationOnly: true as const,
  consumesValidatedRendererNeutralSceneReadFrame: true as const,
  requiresExplicitCurrentActionAffordances: true as const,
  expandsCurrentLegalRoutes: false as const,
  emitsInputFrameOnly: true as const,
  validationStatus: 'not-run' as const,
});
