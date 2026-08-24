import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  KZ_ROUTE_SEGMENT_KIND,
  KZ_ROUTE_SURVIVAL_ROLE,
  type KzRouteDefinitionV2,
  type KzRouteHitRecovery,
  type KzRouteResponseOption,
  type KzRouteSegmentKind,
  type KzRouteSurvivalRole,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
} from './arena-v2-kz-base-map-candidate-v1.js';
import {
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
} from './arena-v2-kz-switchback-map-candidate-v1.js';
import type {
  ArenaV2CounterplayRouteResponseCandidateV1,
} from './arena-v2-weapon-counterplay-profile-candidate-v1.js';

export const ARENA_V2_MAP_COUNTERPLAY_ROUTE_CATALOG_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;

export interface ArenaV2MapCounterplaySegmentCandidateV1 {
  readonly schemaVersion:
    typeof ARENA_V2_MAP_COUNTERPLAY_ROUTE_CATALOG_CANDIDATE_V1_SCHEMA_VERSION;
  readonly mapDefinitionId: string;
  readonly routeDefinitionId: string;
  readonly mapGameplayIdentity: 'longitudinal-branch-rhythm' | 'switchback-turn-rhythm';
  readonly mapVisualIdentity: 'cool-linear-depth' | 'warm-cardinal-turns';
  readonly segmentId: string;
  readonly ordinal: number;
  readonly segmentKind: KzRouteSegmentKind;
  readonly survivalRole: KzRouteSurvivalRole;
  readonly responseOptions: readonly KzRouteResponseOption[];
  readonly responseWindowTicks: number;
  readonly hitRecovery: KzRouteHitRecovery;
  readonly routeResponseKinds: readonly ArenaV2CounterplayRouteResponseCandidateV1[];
  readonly entryAnchorId: string;
  readonly exitAnchorId: string;
  readonly respawnAnchorId: string;
  readonly headingX: number;
  readonly headingZ: number;
  readonly heightDelta: number;
  readonly branchCount: number;
  readonly turnDemand: number;
  readonly combatDemand: number;
  readonly contentHash: string;
}

interface MapSource {
  readonly route: KzRouteDefinitionV2;
  readonly gameplayIdentity: ArenaV2MapCounterplaySegmentCandidateV1['mapGameplayIdentity'];
  readonly visualIdentity: ArenaV2MapCounterplaySegmentCandidateV1['mapVisualIdentity'];
}

const MAPS: readonly MapSource[] = Object.freeze([
  Object.freeze({
    route: ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
    gameplayIdentity: 'longitudinal-branch-rhythm' as const,
    visualIdentity: 'cool-linear-depth' as const,
  }),
  Object.freeze({
    route: ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
    gameplayIdentity: 'switchback-turn-rhythm' as const,
    visualIdentity: 'warm-cardinal-turns' as const,
  }),
]);

function primaryResponse(
  kind: KzRouteSegmentKind,
): ArenaV2CounterplayRouteResponseCandidateV1 {
  switch (kind) {
    case KZ_ROUTE_SEGMENT_KIND.BASIC_PLATFORM: return 'hold-open-center';
    case KZ_ROUTE_SEGMENT_KIND.GAP: return 'reset-gap';
    case KZ_ROUTE_SEGMENT_KIND.STAIRS: return 'take-height';
    case KZ_ROUTE_SEGMENT_KIND.MAZE: return 'cross-platform-entry';
    case KZ_ROUTE_SEGMENT_KIND.NARROW_PATH: return 'exit-narrow-path';
    case KZ_ROUTE_SEGMENT_KIND.WIRE: return 'leave-edge';
  }
}

function roleResponse(
  role: KzRouteSurvivalRole,
): ArenaV2CounterplayRouteResponseCandidateV1 {
  switch (role) {
    case KZ_ROUTE_SURVIVAL_ROLE.SAFE: return 'hold-open-center';
    case KZ_ROUTE_SURVIVAL_ROLE.PRESSURE: return 'leave-edge';
    case KZ_ROUTE_SURVIVAL_ROLE.CHOICE: return 'cross-platform-entry';
    case KZ_ROUTE_SURVIVAL_ROLE.RECOVERY: return 'reset-gap';
  }
}

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function createSegments(source: MapSource): readonly ArenaV2MapCounterplaySegmentCandidateV1[] {
  const anchors = new Map(source.route.anchors.map((anchor) => [anchor.id, anchor]));
  return Object.freeze(source.route.segments.map((segment, index) => {
    const entry = anchors.get(segment.entryAnchorId);
    const exit = anchors.get(segment.exitAnchorId);
    if (!entry || !exit) throw new RangeError(`地图反制段${segment.id}缺少入口或出口锚点。`);
    const deltaX = exit.position.x - entry.position.x;
    const deltaZ = exit.position.z - entry.position.z;
    const length = Math.hypot(deltaX, deltaZ);
    if (length <= Number.EPSILON) throw new RangeError(`地图反制段${segment.id}没有水平朝向。`);
    const routeResponseKinds = Object.freeze([...new Set([
      primaryResponse(segment.kind),
      roleResponse(segment.survivalRole),
    ])]);
    const authority = Object.freeze({
      schemaVersion: ARENA_V2_MAP_COUNTERPLAY_ROUTE_CATALOG_CANDIDATE_V1_SCHEMA_VERSION,
      mapDefinitionId: source.route.mapDefinitionId,
      routeDefinitionId: source.route.id,
      mapGameplayIdentity: source.gameplayIdentity,
      mapVisualIdentity: source.visualIdentity,
      segmentId: segment.id,
      ordinal: index + 1,
      segmentKind: segment.kind,
      survivalRole: segment.survivalRole,
      responseOptions: segment.responseOptions,
      responseWindowTicks: segment.responseWindowTicks,
      hitRecovery: segment.hitRecovery,
      routeResponseKinds,
      entryAnchorId: segment.entryAnchorId,
      exitAnchorId: segment.exitAnchorId,
      respawnAnchorId: segment.respawnAnchorId,
      headingX: rounded(deltaX / length),
      headingZ: rounded(deltaZ / length),
      heightDelta: rounded(exit.position.y - entry.position.y),
      branchCount: segment.branches.length,
      turnDemand: segment.difficulty.turn,
      combatDemand: segment.difficulty.combat,
    });
    return Object.freeze({
      ...authority,
      contentHash: createDeterministicDataHash(
        authority,
        `Arena V2 map counterplay segment ${segment.id}`,
      ),
    });
  }));
}

export const ARENA_V2_MAP_COUNTERPLAY_SEGMENTS_CANDIDATE_V1 = Object.freeze(
  MAPS.flatMap(createSegments),
);

function assertClosure(): void {
  if (ARENA_V2_MAP_COUNTERPLAY_SEGMENTS_CANDIDATE_V1.length !== 20) {
    throw new RangeError('Arena V2地图反制通路目录必须精确覆盖20个段落。');
  }
  const ids = ARENA_V2_MAP_COUNTERPLAY_SEGMENTS_CANDIDATE_V1.map((segment) => (
    `${segment.mapDefinitionId}:${segment.segmentId}`
  ));
  if (new Set(ids).size !== ids.length) throw new RangeError('Arena V2地图反制段身份重复。');
  for (const source of MAPS) {
    const profiles = ARENA_V2_MAP_COUNTERPLAY_SEGMENTS_CANDIDATE_V1.filter((segment) => (
      segment.mapDefinitionId === source.route.mapDefinitionId
    ));
    if (profiles.length !== source.route.segments.length) {
      throw new RangeError(`Arena V2地图${source.route.mapDefinitionId}反制段未闭合。`);
    }
  }
}

assertClosure();

export function requireArenaV2MapCounterplaySegmentCandidateV1(
  mapDefinitionId: string,
  segmentId: string,
): ArenaV2MapCounterplaySegmentCandidateV1 {
  const segment = ARENA_V2_MAP_COUNTERPLAY_SEGMENTS_CANDIDATE_V1.find((candidate) => (
    candidate.mapDefinitionId === mapDefinitionId && candidate.segmentId === segmentId
  ));
  if (!segment) throw new RangeError(`未知Arena V2地图反制段${mapDefinitionId}/${segmentId}。`);
  return segment;
}

const AUTHORITY = Object.freeze({
  schemaVersion: ARENA_V2_MAP_COUNTERPLAY_ROUTE_CATALOG_CANDIDATE_V1_SCHEMA_VERSION,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultRuntimeWired: false as const,
  mapCount: 2 as const,
  segmentCount: 20 as const,
  derivesOnlyFromImmutableRouteDefinitions: true as const,
  requiresCurrentLegalTargetsAtRuntime: true as const,
  exposesFutureRouteState: false as const,
  segments: ARENA_V2_MAP_COUNTERPLAY_SEGMENTS_CANDIDATE_V1,
  validationStatus: 'not-run' as const,
});

export const ARENA_V2_MAP_COUNTERPLAY_ROUTE_CATALOG_CANDIDATE_V1 = Object.freeze({
  ...AUTHORITY,
  contentHash: createDeterministicDataHash(
    AUTHORITY,
    'Arena V2 Map Counterplay Route Catalog Candidate V1',
  ),
});
