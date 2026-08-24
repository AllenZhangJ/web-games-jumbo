import {
  RACE_MODE_RESPAWN_DELAY_TICKS_V1,
  KZ_ROUTE_DEFINITION_SCHEMA_VERSION,
  KZ_ROUTE_HIT_RECOVERY,
  KZ_ROUTE_INPUT,
  KZ_ROUTE_RESPONSE_OPTION,
  KZ_ROUTE_SEGMENT_KIND,
  KZ_ROUTE_SURVIVAL_ROLE,
  MAP_DEFINITION_SCHEMA_VERSION,
  createKzRouteDefinitionV2,
  createMapDefinition,
  type KzRouteDifficultyV2,
  type Vector3Definition,
} from '@number-strategy-jump/arena-definitions';
import {
  validateKzRouteMapCandidateV1,
  type KzRouteMobilityEnvelopeV1,
} from '@number-strategy-jump/arena-map';
import {
  ARENA_V2_RACE_FINISH_GATE_CAPABILITY_ID_V1,
} from './arena-v2-race-finish-capability-id-v1.js';
import {
  ARENA_V2_RACE_RESPAWN_FALLBACK_SAFE_ANCHOR_CAPABILITY_ID_V1,
} from './arena-v2-race-respawn-capability-id-v1.js';
import {
  ARENA_V2_SURVIVAL_PLAYER_RESPAWN_SAFE_ANCHOR_CAPABILITY_ID_V1,
} from './arena-v2-survival-respawn-capability-id-v1.js';

export const ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID =
  'arena-v2-kz-switchback-map.candidate.v1';
export const ARENA_V2_KZ_SWITCHBACK_ROUTE_CANDIDATE_ID =
  'arena-v2-kz-switchback-route.candidate.v2';

const surface = (
  id: string,
  center: Vector3Definition,
  halfExtents: Vector3Definition,
) => Object.freeze({ id, center: Object.freeze(center), halfExtents: Object.freeze(halfExtents) });

const SURFACES = Object.freeze([
  surface('ks-s01-start', { x: 0, y: 0, z: 0 }, { x: 3.2, y: 0.5, z: 2.4 }),
  surface('ks-s02-landing', { x: 6.5, y: 0, z: 0 }, { x: 1.5, y: 0.5, z: 2 }),
  surface('ks-s03-stair-a', { x: 9, y: 0.15, z: 0 }, { x: 1, y: 0.5, z: 1.5 }),
  surface('ks-s03-stair-b', { x: 11.2, y: 0.3, z: 0 }, { x: 1, y: 0.5, z: 1.5 }),
  surface('ks-s03-stair-c', { x: 13.4, y: 0.45, z: 0 }, { x: 1, y: 0.5, z: 1.5 }),
  surface('ks-s04-north-narrow', { x: 14.7, y: 0.45, z: 3.2 }, { x: 0.45, y: 0.5, z: 2.2 }),
  surface('ks-s05-west-wire', { x: 11.2, y: 0.45, z: 5.7 }, { x: 3, y: 0.5, z: 0.25 }),
  surface('ks-s06-stair-a', { x: 7.5, y: 0.3, z: 5.7 }, { x: 0.75, y: 0.5, z: 1 }),
  surface('ks-s06-stair-b', { x: 5.7, y: 0.15, z: 5.7 }, { x: 0.75, y: 0.5, z: 1 }),
  surface('ks-s06-stair-c', { x: 3.9, y: 0, z: 5.7 }, { x: 0.75, y: 0.5, z: 1 }),
  surface('ks-s07-north-landing', { x: 3.9, y: 0, z: 9.5 }, { x: 1.2, y: 0.5, z: 1.2 }),
  surface('ks-s08-finish', { x: 0.2, y: 0, z: 9.5 }, { x: 1.3, y: 0.5, z: 1.5 }),
]);

const anchor = (id: string, surfaceId: string, x: number, y: number, z: number) => Object.freeze({
  id,
  surfaceId,
  position: Object.freeze({ x, y, z }),
});

const ANCHORS = Object.freeze([
  anchor('ks-a-start-1', 'ks-s01-start', -1.6, 0.5, -1.5),
  anchor('ks-a-start-2', 'ks-s01-start', -1.6, 0.5, -0.5),
  anchor('ks-a-start-3', 'ks-s01-start', -1.6, 0.5, 0.5),
  anchor('ks-a-start-4', 'ks-s01-start', -1.6, 0.5, 1.5),
  anchor('ks-a-route-start', 'ks-s01-start', -2.4, 0.5, 0),
  anchor(
    ARENA_V2_RACE_RESPAWN_FALLBACK_SAFE_ANCHOR_CAPABILITY_ID_V1,
    'ks-s01-start',
    -2.4,
    0.5,
    0,
  ),
  anchor(
    ARENA_V2_SURVIVAL_PLAYER_RESPAWN_SAFE_ANCHOR_CAPABILITY_ID_V1,
    'ks-s01-start',
    -2.4,
    0.5,
    0,
  ),
  anchor('ks-a-s01-supply', 'ks-s01-start', 0, 0.5, 1.4),
  anchor('ks-a-s01-exit', 'ks-s01-start', 2.9, 0.5, 0),
  anchor('ks-a-s02-supply', 'ks-s02-landing', 6.5, 0.5, 1.1),
  anchor('ks-a-s02-exit', 'ks-s02-landing', 7.8, 0.5, 0),
  anchor('ks-a-s03-a', 'ks-s03-stair-a', 9, 0.65, 0),
  anchor('ks-a-s03-b', 'ks-s03-stair-b', 11.2, 0.8, 0),
  anchor('ks-a-s03-supply', 'ks-s03-stair-b', 11.2, 0.8, 1),
  anchor('ks-a-s03-exit', 'ks-s03-stair-c', 14.3, 0.95, 0),
  anchor('ks-a-s04-entry', 'ks-s04-north-narrow', 14.7, 0.95, 1.2),
  anchor('ks-a-s04-supply', 'ks-s04-north-narrow', 14.7, 0.95, 3.2),
  anchor('ks-a-s04-exit', 'ks-s04-north-narrow', 14.7, 0.95, 5.2),
  anchor('ks-a-s05-entry', 'ks-s05-west-wire', 14.1, 0.95, 5.7),
  anchor('ks-a-s05-supply', 'ks-s05-west-wire', 11.2, 0.95, 5.7),
  anchor('ks-a-s05-exit', 'ks-s05-west-wire', 8.3, 0.95, 5.7),
  anchor('ks-a-s06-a', 'ks-s06-stair-a', 7.5, 0.8, 5.7),
  anchor('ks-a-s06-b', 'ks-s06-stair-b', 5.7, 0.65, 5.7),
  anchor('ks-a-s06-supply', 'ks-s06-stair-b', 5.7, 0.65, 6.4),
  anchor('ks-a-s06-exit', 'ks-s06-stair-c', 3.2, 0.5, 5.7),
  anchor('ks-a-s07-supply', 'ks-s07-north-landing', 3.9, 0.5, 9.5),
  anchor('ks-a-s07-exit', 'ks-s07-north-landing', 2.8, 0.5, 9.5),
  anchor('ks-a-s08-supply', 'ks-s08-finish', 0.2, 0.5, 10.2),
  anchor('ks-a-finish', 'ks-s08-finish', -0.9, 0.5, 9.5),
]);

const difficulty = (
  distance: number,
  rhythm: number,
  turn: number,
  route: number,
  recovery: number,
  combat: number,
): KzRouteDifficultyV2 => Object.freeze({ distance, rhythm, turn, route, recovery, combat });

export const ARENA_V2_KZ_SWITCHBACK_MAP_DEFINITION_CANDIDATE_V1 = createMapDefinition({
  schemaVersion: MAP_DEFINITION_SCHEMA_VERSION,
  id: ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID,
  arena: {
    killY: -6,
    surfaces: SURFACES,
    spawns: [
      { x: -1.6, y: 1.5, z: -1.5 },
      { x: -1.6, y: 1.5, z: -0.5 },
      { x: -1.6, y: 1.5, z: 0.5 },
      { x: -1.6, y: 1.5, z: 1.5 },
    ],
  },
  equipmentSpawnPoints: [
    { id: 'ks-supply-01', surfaceId: 'ks-s01-start', position: { x: 0, y: 0.5, z: 1.4 } },
    { id: 'ks-supply-02', surfaceId: 'ks-s02-landing', position: { x: 6.5, y: 0.5, z: 1.1 } },
    { id: 'ks-supply-03', surfaceId: 'ks-s03-stair-b', position: { x: 11.2, y: 0.8, z: 1 } },
    { id: 'ks-supply-04', surfaceId: 'ks-s04-north-narrow', position: { x: 14.7, y: 0.95, z: 3.2 } },
    { id: 'ks-supply-05', surfaceId: 'ks-s05-west-wire', position: { x: 11.2, y: 0.95, z: 5.7 } },
    { id: 'ks-supply-06', surfaceId: 'ks-s06-stair-b', position: { x: 5.7, y: 0.65, z: 6.4 } },
    { id: 'ks-supply-07', surfaceId: 'ks-s07-north-landing', position: { x: 3.9, y: 0.5, z: 9.5 } },
    { id: 'ks-supply-08', surfaceId: 'ks-s08-finish', position: { x: 0.2, y: 0.5, z: 10.2 } },
  ],
  events: [],
});

export const ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2 =
createKzRouteDefinitionV2({
  schemaVersion: KZ_ROUTE_DEFINITION_SCHEMA_VERSION,
  id: ARENA_V2_KZ_SWITCHBACK_ROUTE_CANDIDATE_ID,
  mapDefinitionId: ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_ID,
  requiredInputs: [KZ_ROUTE_INPUT.DIRECTION, KZ_ROUTE_INPUT.JUMP],
  minimumParticipants: 2,
  maximumParticipants: 4,
  respawnDelayTicks: RACE_MODE_RESPAWN_DELAY_TICKS_V1,
  startAnchorIds: ['ks-a-start-1', 'ks-a-start-2', 'ks-a-start-3', 'ks-a-start-4'],
  finishAnchorId: 'ks-a-finish',
  anchors: ANCHORS,
  segments: [
    {
      id: 'ks-segment-01-platform', kind: KZ_ROUTE_SEGMENT_KIND.BASIC_PLATFORM,
      lessonId: 'ks.lesson.establish-heading', remixId: 'ks.remix.short-launch',
      surfaceIds: ['ks-s01-start'], pathAnchorIds: ['ks-a-route-start', 'ks-a-s01-exit'],
      entryAnchorId: 'ks-a-route-start', exitAnchorId: 'ks-a-s01-exit',
      respawnAnchorId: ARENA_V2_RACE_RESPAWN_FALLBACK_SAFE_ANCHOR_CAPABILITY_ID_V1,
      survivalRole: KZ_ROUTE_SURVIVAL_ROLE.SAFE,
      responseOptions: [KZ_ROUTE_RESPONSE_OPTION.HOLD, KZ_ROUTE_RESPONSE_OPTION.STRAFE, KZ_ROUTE_RESPONSE_OPTION.JUMP],
      responseWindowTicks: 10, hitRecovery: KZ_ROUTE_HIT_RECOVERY.SAME_SEGMENT,
      difficulty: difficulty(1, 1, 1, 1, 1, 1), branches: [],
    },
    {
      id: 'ks-segment-02-east-gap', kind: KZ_ROUTE_SEGMENT_KIND.GAP,
      lessonId: 'ks.lesson.long-east-commit', remixId: 'ks.remix.landing-center',
      surfaceIds: ['ks-s02-landing'], pathAnchorIds: ['ks-a-s01-exit', 'ks-a-s02-exit'],
      entryAnchorId: 'ks-a-s01-exit', exitAnchorId: 'ks-a-s02-exit',
      respawnAnchorId: 'ks-a-s01-exit', survivalRole: KZ_ROUTE_SURVIVAL_ROLE.RECOVERY,
      responseOptions: [KZ_ROUTE_RESPONSE_OPTION.JUMP], responseWindowTicks: 8,
      hitRecovery: KZ_ROUTE_HIT_RECOVERY.RESPAWN_ANCHOR,
      difficulty: difficulty(3, 2, 1, 1, 2, 1), branches: [],
    },
    {
      id: 'ks-segment-03-rising-stairs', kind: KZ_ROUTE_SEGMENT_KIND.STAIRS,
      lessonId: 'ks.lesson.rise-with-rhythm', remixId: 'ks.remix.three-rising-beats',
      surfaceIds: ['ks-s03-stair-a', 'ks-s03-stair-b', 'ks-s03-stair-c'],
      pathAnchorIds: ['ks-a-s02-exit', 'ks-a-s03-a', 'ks-a-s03-b', 'ks-a-s03-exit'],
      entryAnchorId: 'ks-a-s02-exit', exitAnchorId: 'ks-a-s03-exit',
      respawnAnchorId: 'ks-a-s02-exit', survivalRole: KZ_ROUTE_SURVIVAL_ROLE.PRESSURE,
      responseOptions: [KZ_ROUTE_RESPONSE_OPTION.STRAFE, KZ_ROUTE_RESPONSE_OPTION.JUMP],
      responseWindowTicks: 8, hitRecovery: KZ_ROUTE_HIT_RECOVERY.ADJACENT_SEGMENT,
      difficulty: difficulty(2, 3, 1, 1, 2, 2), branches: [],
    },
    {
      id: 'ks-segment-04-north-turn', kind: KZ_ROUTE_SEGMENT_KIND.NARROW_PATH,
      lessonId: 'ks.lesson.turn-on-narrow', remixId: 'ks.remix.east-to-north',
      surfaceIds: ['ks-s04-north-narrow'],
      pathAnchorIds: ['ks-a-s03-exit', 'ks-a-s04-entry', 'ks-a-s04-exit'],
      entryAnchorId: 'ks-a-s03-exit', exitAnchorId: 'ks-a-s04-exit',
      respawnAnchorId: 'ks-a-s03-exit', survivalRole: KZ_ROUTE_SURVIVAL_ROLE.PRESSURE,
      responseOptions: [KZ_ROUTE_RESPONSE_OPTION.STRAFE, KZ_ROUTE_RESPONSE_OPTION.JUMP],
      responseWindowTicks: 6, hitRecovery: KZ_ROUTE_HIT_RECOVERY.ADJACENT_SEGMENT,
      difficulty: difficulty(2, 3, 4, 2, 3, 4), branches: [],
    },
    {
      id: 'ks-segment-05-west-wire', kind: KZ_ROUTE_SEGMENT_KIND.WIRE,
      lessonId: 'ks.lesson.reverse-heading', remixId: 'ks.remix.north-to-west-wire',
      surfaceIds: ['ks-s05-west-wire'],
      pathAnchorIds: ['ks-a-s04-exit', 'ks-a-s05-entry', 'ks-a-s05-exit'],
      entryAnchorId: 'ks-a-s04-exit', exitAnchorId: 'ks-a-s05-exit',
      respawnAnchorId: 'ks-a-s04-exit', survivalRole: KZ_ROUTE_SURVIVAL_ROLE.PRESSURE,
      responseOptions: [KZ_ROUTE_RESPONSE_OPTION.STRAFE], responseWindowTicks: 4,
      hitRecovery: KZ_ROUTE_HIT_RECOVERY.RESPAWN_ANCHOR,
      difficulty: difficulty(3, 4, 4, 3, 4, 4), branches: [],
    },
    {
      id: 'ks-segment-06-descending-stairs', kind: KZ_ROUTE_SEGMENT_KIND.STAIRS,
      lessonId: 'ks.lesson.descend-with-control', remixId: 'ks.remix.three-falling-beats',
      surfaceIds: ['ks-s06-stair-a', 'ks-s06-stair-b', 'ks-s06-stair-c'],
      pathAnchorIds: ['ks-a-s05-exit', 'ks-a-s06-a', 'ks-a-s06-b', 'ks-a-s06-exit'],
      entryAnchorId: 'ks-a-s05-exit', exitAnchorId: 'ks-a-s06-exit',
      respawnAnchorId: 'ks-a-s05-exit', survivalRole: KZ_ROUTE_SURVIVAL_ROLE.PRESSURE,
      responseOptions: [KZ_ROUTE_RESPONSE_OPTION.HOLD, KZ_ROUTE_RESPONSE_OPTION.STRAFE],
      responseWindowTicks: 7, hitRecovery: KZ_ROUTE_HIT_RECOVERY.ADJACENT_SEGMENT,
      difficulty: difficulty(2, 4, 2, 2, 3, 3), branches: [],
    },
    {
      id: 'ks-segment-07-north-gap', kind: KZ_ROUTE_SEGMENT_KIND.GAP,
      lessonId: 'ks.lesson.jump-after-descent', remixId: 'ks.remix.north-commit',
      surfaceIds: ['ks-s07-north-landing'],
      pathAnchorIds: ['ks-a-s06-exit', 'ks-a-s07-exit'],
      entryAnchorId: 'ks-a-s06-exit', exitAnchorId: 'ks-a-s07-exit',
      respawnAnchorId: 'ks-a-s06-exit', survivalRole: KZ_ROUTE_SURVIVAL_ROLE.RECOVERY,
      responseOptions: [KZ_ROUTE_RESPONSE_OPTION.JUMP], responseWindowTicks: 7,
      hitRecovery: KZ_ROUTE_HIT_RECOVERY.RESPAWN_ANCHOR,
      difficulty: difficulty(3, 3, 2, 2, 3, 3), branches: [],
    },
    {
      id: 'ks-segment-08-finish', kind: KZ_ROUTE_SEGMENT_KIND.BASIC_PLATFORM,
      lessonId: 'ks.lesson.finish-under-contact', remixId: 'ks.remix.short-west-close',
      surfaceIds: ['ks-s08-finish'], pathAnchorIds: ['ks-a-s07-exit', 'ks-a-finish'],
      entryAnchorId: 'ks-a-s07-exit', exitAnchorId: 'ks-a-finish',
      respawnAnchorId: 'ks-a-s07-exit', survivalRole: KZ_ROUTE_SURVIVAL_ROLE.SAFE,
      responseOptions: [KZ_ROUTE_RESPONSE_OPTION.HOLD, KZ_ROUTE_RESPONSE_OPTION.STRAFE, KZ_ROUTE_RESPONSE_OPTION.JUMP],
      responseWindowTicks: 8, hitRecovery: KZ_ROUTE_HIT_RECOVERY.SAME_SEGMENT,
      difficulty: difficulty(2, 2, 2, 1, 1, 3), branches: [],
    },
  ],
  supplyPoints: [
    { equipmentSpawnPointId: 'ks-supply-01', anchorId: 'ks-a-s01-supply', segmentId: 'ks-segment-01-platform' },
    { equipmentSpawnPointId: 'ks-supply-02', anchorId: 'ks-a-s02-supply', segmentId: 'ks-segment-02-east-gap' },
    { equipmentSpawnPointId: 'ks-supply-03', anchorId: 'ks-a-s03-supply', segmentId: 'ks-segment-03-rising-stairs' },
    { equipmentSpawnPointId: 'ks-supply-04', anchorId: 'ks-a-s04-supply', segmentId: 'ks-segment-04-north-turn' },
    { equipmentSpawnPointId: 'ks-supply-05', anchorId: 'ks-a-s05-supply', segmentId: 'ks-segment-05-west-wire' },
    { equipmentSpawnPointId: 'ks-supply-06', anchorId: 'ks-a-s06-supply', segmentId: 'ks-segment-06-descending-stairs' },
    { equipmentSpawnPointId: 'ks-supply-07', anchorId: 'ks-a-s07-supply', segmentId: 'ks-segment-07-north-gap' },
    { equipmentSpawnPointId: 'ks-supply-08', anchorId: 'ks-a-s08-supply', segmentId: 'ks-segment-08-finish' },
  ],
  survivalLinks: [
    { fromSegmentId: 'ks-segment-01-platform', toSegmentId: 'ks-segment-02-east-gap' },
    { fromSegmentId: 'ks-segment-02-east-gap', toSegmentId: 'ks-segment-01-platform' },
    { fromSegmentId: 'ks-segment-02-east-gap', toSegmentId: 'ks-segment-03-rising-stairs' },
    { fromSegmentId: 'ks-segment-03-rising-stairs', toSegmentId: 'ks-segment-02-east-gap' },
    { fromSegmentId: 'ks-segment-03-rising-stairs', toSegmentId: 'ks-segment-04-north-turn' },
    { fromSegmentId: 'ks-segment-04-north-turn', toSegmentId: 'ks-segment-03-rising-stairs' },
    { fromSegmentId: 'ks-segment-04-north-turn', toSegmentId: 'ks-segment-05-west-wire' },
    { fromSegmentId: 'ks-segment-05-west-wire', toSegmentId: 'ks-segment-04-north-turn' },
    { fromSegmentId: 'ks-segment-05-west-wire', toSegmentId: 'ks-segment-06-descending-stairs' },
    { fromSegmentId: 'ks-segment-06-descending-stairs', toSegmentId: 'ks-segment-05-west-wire' },
    { fromSegmentId: 'ks-segment-06-descending-stairs', toSegmentId: 'ks-segment-07-north-gap' },
    { fromSegmentId: 'ks-segment-07-north-gap', toSegmentId: 'ks-segment-06-descending-stairs' },
    { fromSegmentId: 'ks-segment-07-north-gap', toSegmentId: 'ks-segment-08-finish' },
    { fromSegmentId: 'ks-segment-08-finish', toSegmentId: 'ks-segment-07-north-gap' },
  ],
});

export const ARENA_V2_KZ_SWITCHBACK_MOBILITY_ENVELOPE_CANDIDATE_V1:
KzRouteMobilityEnvelopeV1 = Object.freeze({
  maximumStepHeight: 0.4,
  maximumJumpGap: 2.25,
  maximumJumpRise: 0.65,
  maximumSafeDrop: 1.5,
  anchorGroundTolerance: 0.001,
});

export const ARENA_V2_KZ_SWITCHBACK_MAP_STATIC_VALIDATION_CANDIDATE_V1 =
  validateKzRouteMapCandidateV1(
    ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
    ARENA_V2_KZ_SWITCHBACK_MAP_DEFINITION_CANDIDATE_V1,
    ARENA_V2_KZ_SWITCHBACK_MOBILITY_ENVELOPE_CANDIDATE_V1,
  );

export const ARENA_V2_KZ_SWITCHBACK_MAP_CANDIDATE_V1 = Object.freeze({
  status: 'production-unreachable' as const,
  hardGate: false as const,
  gameplayIdentity: 'switchback-turn-rhythm' as const,
  copiedThirdPartyGeometry: false as const,
  requiredInputChannels: Object.freeze(['direction', 'jump'] as const),
  mapDefinition: ARENA_V2_KZ_SWITCHBACK_MAP_DEFINITION_CANDIDATE_V1,
  routeDefinition: ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
  raceFinishCapability: Object.freeze({
    capabilityId: ARENA_V2_RACE_FINISH_GATE_CAPABILITY_ID_V1,
    anchorId: ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2.finishAnchorId,
  }),
  mobilityEnvelope: ARENA_V2_KZ_SWITCHBACK_MOBILITY_ENVELOPE_CANDIDATE_V1,
  staticValidation: ARENA_V2_KZ_SWITCHBACK_MAP_STATIC_VALIDATION_CANDIDATE_V1,
  raceAndSurvivalRuntimeWired: true as const,
  informationCatalogWired: true as const,
  validationStatus: 'not-run' as const,
});
