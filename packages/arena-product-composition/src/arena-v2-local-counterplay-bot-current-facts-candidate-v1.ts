import type {
  ArenaV2MatchSceneReadFrameCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
  ARENA_V2_SIX_CHARACTER_DEFINITIONS_CANDIDATE_V1,
  ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1,
  ARENA_V2_WEAPON_COUNTERPLAY_PROFILES_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import type {
  ArenaV2CurrentLegalCounterplayRouteTargetCandidateV1,
} from './arena-v2-weapon-counterplay-bot-probe-composition-candidate-v1.js';

export interface ArenaV2LocalCounterplayBotCurrentFactsCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly tick: number;
  readonly eventSequence: number;
  readonly participantId: string;
  readonly mapDefinitionId: string;
  readonly currentSegmentId: string | null;
  readonly selfPosition: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
  readonly selfPrimaryReady: boolean;
  readonly selfPrimaryRange: number;
  readonly selfJumpAvailable: boolean;
  readonly currentLegalRouteTargets:
    readonly ArenaV2CurrentLegalCounterplayRouteTargetCandidateV1[];
}

type RouteDefinition =
  | typeof ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2
  | typeof ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2;

const ROUTES: readonly RouteDefinition[] = Object.freeze([
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
]);
const LOCAL_PRIMARY_EQUIPMENT_DEFINITIONS = Object.freeze([
  ...ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1
    .collectionEquipmentDefinitions,
  ...ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1
    .runtimeEquipmentDefinitions,
]);

function requireRoute(mapDefinitionId: string): RouteDefinition {
  const route = ROUTES.find((candidate) => candidate.mapDefinitionId === mapDefinitionId);
  if (!route) throw new RangeError(`Arena V2本地反制Bot不支持地图${mapDefinitionId}。`);
  return route;
}

function actionRange(
  value: Readonly<{ targeting: Readonly<{ parameters: unknown }> }>,
  name: string,
): number {
  if (
    typeof value.targeting.parameters !== 'object'
    || value.targeting.parameters === null
    || Array.isArray(value.targeting.parameters)
  ) throw new TypeError(`${name} targeting.parameters无效。`);
  const range = (value.targeting.parameters as Readonly<Record<string, unknown>>).range;
  if (typeof range !== 'number' || !Number.isFinite(range) || range <= 0) {
    throw new RangeError(`${name}缺少有限正数range。`);
  }
  return range;
}

function localPrimaryActionDefinitionId(
  participant: ArenaV2MatchSceneReadFrameCandidateV1['world']['participants'][number],
  selectedActionDefinitionId: string | null,
): string {
  let groundActionDefinitionId =
    ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1.baseGroundActionDefinitionId;
  let aerialActionDefinitionId =
    ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1.baseAerialActionDefinitionId;
  if (participant.equipment !== null) {
    const equipment = LOCAL_PRIMARY_EQUIPMENT_DEFINITIONS.find(({ id }) => (
      id === participant.equipment!.runtimeEquipmentDefinitionId
    ));
    if (!equipment || equipment.aerialActionDefinitionId === null) {
      throw new RangeError(
        `Arena V2本地反制Bot未知运行装备${participant.equipment.runtimeEquipmentDefinitionId}。`,
      );
    }
    groundActionDefinitionId = equipment.actionDefinitionId;
    aerialActionDefinitionId = equipment.aerialActionDefinitionId;
  }
  if (
    selectedActionDefinitionId !== null
    && selectedActionDefinitionId !== groundActionDefinitionId
    && selectedActionDefinitionId !== aerialActionDefinitionId
  ) {
    throw new RangeError(
      `Arena V2本地反制Bot当前主动作${selectedActionDefinitionId}与持有装备不闭合。`,
    );
  }
  return selectedActionDefinitionId
    ?? (participant.grounded ? groundActionDefinitionId : aerialActionDefinitionId);
}

function localPrimaryActionRange(actionDefinitionId: string): number {
  const action = ARENA_V2_SURVIVAL_BASELINE_WEAPON_TIERS_CANDIDATE_V1
    .actionDefinitions.find(({ id }) => id === actionDefinitionId);
  if (!action) {
    throw new RangeError(`Arena V2本地反制Bot主动作${actionDefinitionId}缺失。`);
  }
  return actionRange(action, `Arena V2本地反制Bot主动作${actionDefinitionId}`);
}

function currentSegment(
  route: RouteDefinition,
  supportSurfaceId: string | null,
): RouteDefinition['segments'][number] | null {
  if (supportSurfaceId === null) return null;
  return route.segments.find(({ surfaceIds }) => surfaceIds.includes(supportSurfaceId)) ?? null;
}

function traversalFor(
  segment: RouteDefinition['segments'][number],
  selfY: number,
  targetY: number,
): 'walk' | 'jump' {
  return segment.kind === 'gap'
    || segment.kind === 'wire'
    || targetY > selfY + 0.2
    ? 'jump'
    : 'walk';
}

function currentLegalRouteTargets(
  scene: ArenaV2MatchSceneReadFrameCandidateV1,
  route: RouteDefinition,
  participant: ArenaV2MatchSceneReadFrameCandidateV1['world']['participants'][number],
  segment: RouteDefinition['segments'][number] | null,
): readonly ArenaV2CurrentLegalCounterplayRouteTargetCandidateV1[] {
  if (segment === null || participant.supportSurfaceId === null) return Object.freeze([]);
  const enabledSurfaces = new Set(
    scene.world.map.surfaces.filter(({ enabled }) => enabled).map(({ id }) => id),
  );
  if (!enabledSurfaces.has(participant.supportSurfaceId)) return Object.freeze([]);
  const segmentIndex = new Map(route.segments.map((candidate, index) => [candidate.id, index]));
  const anchorById = new Map(route.anchors.map((anchor) => [anchor.id, anchor]));
  const currentOrdinal = segmentIndex.get(segment.id);
  if (currentOrdinal === undefined) throw new RangeError('Arena V2本地反制Bot当前段落索引缺失。');
  const targets = route.survivalLinks
    .filter(({ fromSegmentId }) => fromSegmentId === segment.id)
    .flatMap(({ toSegmentId }) => {
      const targetSegment = route.segments.find(({ id }) => id === toSegmentId);
      if (!targetSegment) throw new RangeError(`Arena V2本地反制Bot目标段${toSegmentId}缺失。`);
      const anchor = anchorById.get(targetSegment.entryAnchorId);
      if (!anchor) throw new RangeError(`Arena V2本地反制Bot目标锚点${targetSegment.entryAnchorId}缺失。`);
      if (!enabledSurfaces.has(anchor.surfaceId)) return [];
      const targetOrdinal = segmentIndex.get(targetSegment.id)!;
      return [Object.freeze({
        segmentId: targetSegment.id,
        targetId: anchor.id,
        position: anchor.position,
        traversal: traversalFor(targetSegment, participant.position.y, anchor.position.y),
        priority: targetOrdinal > currentOrdinal ? 90 : 60,
      })];
    })
    .sort((left, right) => (
      right.priority - left.priority
      || (left.targetId < right.targetId ? -1 : left.targetId > right.targetId ? 1 : 0)
    ));
  if (targets.length > 6) throw new RangeError('Arena V2本地反制Bot当前合法通路超过6项。');
  return Object.freeze(targets);
}

/**
 * Projects only current, already audited local facts. Route candidates are
 * limited to enabled outgoing links from the participant's current support
 * surface; an airborne or unknown surface yields no route target instead of a
 * nearest-segment guess. It never exposes later links or searches a route.
 */
export function projectArenaV2LocalCounterplayBotCurrentFactsCandidateV1(
  scene: ArenaV2MatchSceneReadFrameCandidateV1,
): ArenaV2LocalCounterplayBotCurrentFactsCandidateV1 {
  if (scene.schemaVersion !== 1 || scene.status !== 'production-unreachable') {
    throw new RangeError('Arena V2本地反制Bot事实只接受V1 Scene Read Frame候选。');
  }
  const participant = scene.world.participants.find(({ id }) => id === scene.localParticipantId);
  if (!participant) throw new RangeError('Arena V2本地反制Bot缺少local participant。');
  const localAction = scene.localAction;
  if (
    localAction.tick !== scene.source.tick
    || localAction.eventSequence !== scene.source.eventSequence
    || localAction.participantId !== participant.id
  ) throw new RangeError('Arena V2本地反制Bot Scene/local action身份不闭合。');
  const character = ARENA_V2_SIX_CHARACTER_DEFINITIONS_CANDIDATE_V1.find(
    ({ id }) => id === participant.characterDefinitionId,
  );
  if (!character) {
    throw new RangeError(`Arena V2本地反制Bot未知角色${participant.characterDefinitionId}。`);
  }
  const route = requireRoute(scene.source.mapDefinitionId);
  const segment = currentSegment(route, participant.supportSurfaceId);
  const canActNow = (
    (scene.world.phase === 'running' || scene.world.phase === 'sudden-death')
    && participant.status === 'active'
    && participant.hitstunTicks === 0
    && participant.respawnTicks === 0
    && participant.action.phase === 'idle'
  );
  const equipmentProfile = participant.equipment === null
    ? null
    : ARENA_V2_WEAPON_COUNTERPLAY_PROFILES_CANDIDATE_V1.find(({ equipmentDefinitionId }) => (
      equipmentDefinitionId === participant.equipment!.collectionEquipmentDefinitionId
    )) ?? null;
  if (participant.equipment !== null && equipmentProfile === null) {
    throw new RangeError(
      `Arena V2本地反制Bot未知自身装备${participant.equipment.collectionEquipmentDefinitionId}。`,
    );
  }
  const selfPrimaryActionDefinitionId = localPrimaryActionDefinitionId(
    participant,
    localAction.primaryActionDefinitionId,
  );
  const selfPrimaryRange = localPrimaryActionRange(selfPrimaryActionDefinitionId);
  const primaryCooldownRemainingTicks = participant.equipment?.cooldownRemainingTicks ?? 0;
  const selfPrimaryReady = canActNow
    && primaryCooldownRemainingTicks === 0
    && localAction.channels.primary.kind === 'selected'
    && localAction.primaryActionDefinitionId !== null;
  const movement = participant.movement;
  const hasGroundOrCoyoteJump = participant.grounded || movement.coyoteTicksRemaining > 0;
  const hasAirJump = movement.airJumpsUsed < character.jump.maximumAirJumps;
  const selfJumpAvailable = canActNow && (hasGroundOrCoyoteJump || hasAirJump);
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    tick: scene.source.tick,
    eventSequence: scene.source.eventSequence,
    participantId: participant.id,
    mapDefinitionId: route.mapDefinitionId,
    currentSegmentId: segment?.id ?? null,
    selfPosition: participant.position,
    selfPrimaryReady,
    selfPrimaryRange,
    selfJumpAvailable,
    currentLegalRouteTargets: currentLegalRouteTargets(scene, route, participant, segment),
  });
}

export const ARENA_V2_LOCAL_COUNTERPLAY_BOT_CURRENT_FACTS_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  source: 'validated-scene-read-current-local-facts' as const,
  routePolicy: 'enabled-current-support-surface-outgoing-links-only' as const,
  primaryRangeSource: 'current-action-definition-targeting-range' as const,
  guessesNearestSegmentWhenAirborne: false as const,
  exposesFutureRouteLinks: false as const,
  defaultBotRegistryWired: false as const,
  validationStatus: 'not-run' as const,
});
