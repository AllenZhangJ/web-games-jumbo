import {
  ARENA_MATCH_EVENT_V6,
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createArenaMatchEventV6,
  createDeterministicDataHash,
  type ArenaMatchEventV6,
} from '@number-strategy-jump/arena-contracts';
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
  ARENA_V2_KZ_MAP_EXPERIENCE_CATALOG_CANDIDATE_V1,
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
  requireArenaV2KzMapExperienceSegmentCandidateV1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_FORMAL_MAP_ASSET_BINDINGS_CANDIDATE_V1,
} from './arena-v2-formal-presentation-asset-catalog-candidate-v1.js';
import {
  requireArenaV2FormalMapEnvironmentCandidateV1,
} from './arena-v2-formal-map-environment-candidate-v1.js';

export const ARENA_V2_KZ_ROUTE_PRESENTATION_PROJECTION_CANDIDATE_V1_SCHEMA_VERSION =
  1 as const;

export type ArenaV2KzRoutePresentationModeKindCandidateV1 =
  | 'duel'
  | 'race'
  | 'survival';

export type ArenaV2KzRoutePresentationCueKindCandidateV1 =
  | 'support-lost'
  | 'respawn-scheduled'
  | 'respawned'
  | 'safe-anchor-committed'
  | 'finish-claimed'
  | 'survival-fall-counted';

export type ArenaV2KzRoutePresentationCueShapeCandidateV1 =
  | 'broken-down-line'
  | 'open-reentry-arch'
  | 'solid-reentry-arch'
  | 'small-return-anchor'
  | 'large-finish-gate'
  | 'single-open-fall-ring'
  | 'double-closed-fall-ring';

export const ARENA_V2_KZ_ROUTE_GUIDANCE_SHAPE_IDS_CANDIDATE_V1 = Object.freeze([
  'stable-platform',
  'broken-gap',
  'rising-steps',
  'branch-diamond',
  'narrow-rail',
  'balance-line',
] as const);

export type ArenaV2KzRouteGuidanceShapeCandidateV1 =
  typeof ARENA_V2_KZ_ROUTE_GUIDANCE_SHAPE_IDS_CANDIDATE_V1[number];

export const ARENA_V2_KZ_ROUTE_RISK_SHAPE_IDS_CANDIDATE_V1 = Object.freeze([
  'solid-safe',
  'striped-pressure',
  'forked-choice',
  'open-recovery',
] as const);

export type ArenaV2KzRouteRiskShapeCandidateV1 =
  typeof ARENA_V2_KZ_ROUTE_RISK_SHAPE_IDS_CANDIDATE_V1[number];

export interface ArenaV2KzRouteSegmentShapeReadCandidateV1 {
  readonly segmentId: string;
  readonly ordinal: number;
  readonly landmarkSurfaceId: string;
  readonly guidanceShape: ArenaV2KzRouteGuidanceShapeCandidateV1;
  readonly riskShape: ArenaV2KzRouteRiskShapeCandidateV1;
  readonly colorIsNeverSoleSignal: true;
}

export interface ArenaV2KzRouteCurrentSegmentReadCandidateV1 {
  readonly id: string;
  readonly ordinal: number;
  readonly segmentCount: number;
  readonly kind: KzRouteSegmentKind;
  readonly lessonId: string;
  readonly remixId: string;
  readonly survivalRole: KzRouteSurvivalRole;
  readonly responseOptions: readonly KzRouteResponseOption[];
  readonly responseWindowTicks: number;
  readonly hitRecovery: KzRouteHitRecovery;
  readonly respawnAnchorId: string;
  readonly currentBranchId: string | null;
  readonly pacingArc: 'two-cycle-branch-escalation' | 'cardinal-switchback-sawtooth';
  readonly cycleOrdinal: 1 | 2;
  readonly experienceBeat:
    | 'introduce'
    | 'develop'
    | 'twist'
    | 'test'
    | 'climax'
    | 'release'
    | 'resolution';
  readonly experienceIntensity: 1 | 2 | 3 | 4 | 5;
  readonly landmarkCue: string;
  readonly landmarkAnchorId: string;
  readonly landmarkSurfaceId: string;
  readonly leadingLineCue: string;
  readonly memoryHook: string;
  readonly raceRead: string;
  readonly survivalRead: string;
  readonly colorIsNeverSoleSignal: true;
  readonly guidanceShape: ArenaV2KzRouteGuidanceShapeCandidateV1;
  readonly riskShape: ArenaV2KzRouteRiskShapeCandidateV1;
}

export interface ArenaV2KzRoutePresentationCueCandidateV1 {
  readonly id: string;
  readonly kind: ArenaV2KzRoutePresentationCueKindCandidateV1;
  readonly sourceEventId: string;
  readonly tick: number;
  readonly sequence: number;
  readonly participantId: string;
  readonly anchorId: string | null;
  readonly supportSurfaceId: string | null;
  readonly readyTick: number | null;
  readonly progressOrdinal: number | null;
  readonly fallCount: number | null;
  readonly terminal: boolean | null;
  readonly shape: ArenaV2KzRoutePresentationCueShapeCandidateV1;
  readonly text: string;
  readonly colorIsNeverSoleSignal: true;
}

export type ArenaV2KzRouteModeReadCandidateV1 =
  | Readonly<{ readonly kind: 'duel' }>
  | Readonly<{
    readonly kind: 'race';
    readonly finishGateId: string;
    readonly status: 'racing' | 'respawning' | 'finished';
    readonly safeAnchorId: string | null;
    readonly progressOrdinal: number;
    readonly respawnReadyTick: number | null;
    readonly finishTick: number | null;
    readonly rank: number | null;
  }>
  | Readonly<{
    readonly kind: 'survival';
    readonly fallCount: number;
    readonly terminalFallCount: 2;
    readonly survivedTicks: number;
    readonly pressureStage: number;
  }>;

export interface ArenaV2KzRoutePresentationProjectionCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly source: Readonly<{
    readonly matchSeed: number;
    readonly tick: number;
    readonly eventSequence: number;
    readonly modeDefinitionId: string;
    readonly mapDefinitionId: string;
  }>;
  readonly route: Readonly<{
    readonly routeDefinitionId: string;
    readonly routeContentHash: string;
    readonly mapExperienceCatalogContentHash: string;
    readonly mapDefinitionId: string;
    readonly segmentCount: number;
    readonly segmentIds: readonly string[];
    readonly segmentShapeCatalog: readonly ArenaV2KzRouteSegmentShapeReadCandidateV1[];
    readonly surfaceIds: readonly string[];
    readonly finishAnchorId: string;
    readonly environmentIdentity: 'cool-linear-depth' | 'warm-cardinal-turns';
    readonly environmentContentHash: string;
    readonly routeAccentColor: number;
    readonly mapVisualAssetId: string;
    readonly mapAssetMaturity: 'authored-candidate-not-approved';
  }>;
  readonly local: Readonly<{
    readonly participantId: string;
    readonly participantStatus: string;
    readonly grounded: boolean;
    readonly supportSurfaceId: string | null;
    readonly currentSegment: ArenaV2KzRouteCurrentSegmentReadCandidateV1 | null;
  }>;
  readonly mode: ArenaV2KzRouteModeReadCandidateV1;
  readonly cues: readonly ArenaV2KzRoutePresentationCueCandidateV1[];
  readonly governance: Readonly<{
    readonly ownsRuleOrMatchAuthority: false;
    readonly writesAuthorityState: false;
    readonly infersCurrentSegmentFromPosition: false;
    readonly currentSegmentUsesExactSupportSurfaceOnly: true;
    readonly infersAnchorOrFinish: false;
    readonly cuesUseStableEventsOnly: true;
    readonly usesWallClockOrRandom: false;
    readonly importsThreeOrDom: false;
    readonly programmaticAssetFallbackAllowed: false;
  }>;
}

const INPUT_KEYS = new Set(['schemaVersion', 'scene']);
const SCENE_KEYS = new Set([
  'schemaVersion', 'status', 'source', 'world', 'localAction',
  'localParticipantId', 'events', 'result',
]);
const SOURCE_KEYS = new Set([
  'matchSeed', 'tick', 'eventSequence', 'modeDefinitionId', 'mapDefinitionId',
]);
const WORLD_KEYS = new Set([
  'phase', 'remainingTicks', 'map', 'participants', 'equipment',
  'activeSupplyProjection', 'modeProjection',
]);
const MAP_KEYS = new Set([
  'schemaVersion', 'definitionId', 'nextActiveTick', 'revision', 'surfaces', 'occurrences',
]);
const SURFACE_KEYS = new Set(['id', 'enabled', 'revision']);
const PARTICIPANT_KEYS = new Set([
  'id', 'characterDefinitionId', 'appearanceKey', 'displayName', 'identityOrdinal',
  'identityGlyphKey', 'identityPatternKey', 'modeRole', 'local', 'status', 'lives',
  'position', 'velocity', 'facing', 'grounded', 'supportSurfaceId', 'hitstunTicks',
  'invulnerableTicks', 'respawnTicks', 'action', 'movement', 'equipment',
]);
const MODE_PROJECTION_KEYS = new Set([
  'schemaVersion', 'modeDefinitionId', 'revision', 'preparationRemainingTicks', 'state',
]);
const DUEL_STATE_KEYS = new Set(['kind', 'suddenDeath']);
const RACE_STATE_KEYS = new Set(['kind', 'finishGateId', 'participants']);
const RACE_PARTICIPANT_KEYS = new Set([
  'participantId', 'status', 'safeAnchorId', 'progressOrdinal', 'respawnReadyTick',
  'finishTick', 'rank',
]);
const SURVIVAL_STATE_KEYS = new Set([
  'kind', 'playerParticipantId', 'fallCount', 'terminalFallCount', 'survivedTicks',
  'pressureStage', 'enemySlots',
]);
const ROUTE_EVENT_TYPES: ReadonlySet<unknown> = new Set([
  ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL,
  ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWN_SCHEDULED,
  ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWNED,
  ARENA_MATCH_EVENT_V6.RACE_SAFE_ANCHOR_COMMITTED,
  ARENA_MATCH_EVENT_V6.RACE_FINISH_CLAIMED,
  ARENA_MATCH_EVENT_V6.SURVIVAL_PLAYER_FALL_COUNTED,
]);
const RACE_STATUSES: ReadonlySet<unknown> = new Set(['racing', 'respawning', 'finished']);
const MAXIMUM_ROUTE_CUES_PER_FRAME = 32;

const ROUTES = Object.freeze([
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
]);

const ROUTE_CONTENT_HASHES = new Map(ROUTES.map((route) => [
  route.id,
  createDeterministicDataHash(route, `Arena V2 KZ route presentation ${route.id}`),
]));

const GUIDANCE_SHAPE_BY_SEGMENT_KIND = Object.freeze({
  [KZ_ROUTE_SEGMENT_KIND.BASIC_PLATFORM]: 'stable-platform',
  [KZ_ROUTE_SEGMENT_KIND.GAP]: 'broken-gap',
  [KZ_ROUTE_SEGMENT_KIND.STAIRS]: 'rising-steps',
  [KZ_ROUTE_SEGMENT_KIND.MAZE]: 'branch-diamond',
  [KZ_ROUTE_SEGMENT_KIND.NARROW_PATH]: 'narrow-rail',
  [KZ_ROUTE_SEGMENT_KIND.WIRE]: 'balance-line',
}) satisfies Readonly<Record<KzRouteSegmentKind, ArenaV2KzRouteGuidanceShapeCandidateV1>>;

const RISK_SHAPE_BY_SURVIVAL_ROLE = Object.freeze({
  [KZ_ROUTE_SURVIVAL_ROLE.SAFE]: 'solid-safe',
  [KZ_ROUTE_SURVIVAL_ROLE.PRESSURE]: 'striped-pressure',
  [KZ_ROUTE_SURVIVAL_ROLE.CHOICE]: 'forked-choice',
  [KZ_ROUTE_SURVIVAL_ROLE.RECOVERY]: 'open-recovery',
}) satisfies Readonly<Record<KzRouteSurvivalRole, ArenaV2KzRouteRiskShapeCandidateV1>>;

function segmentShapeRead(
  route: KzRouteDefinitionV2,
  segmentIndex: number,
): ArenaV2KzRouteSegmentShapeReadCandidateV1 {
  const segment = route.segments[segmentIndex]!;
  const experience = requireArenaV2KzMapExperienceSegmentCandidateV1(
    route.mapDefinitionId,
    segment.id,
  );
  return Object.freeze({
    segmentId: segment.id,
    ordinal: segmentIndex + 1,
    landmarkSurfaceId: experience.landmarkSurfaceId,
    guidanceShape: GUIDANCE_SHAPE_BY_SEGMENT_KIND[segment.kind],
    riskShape: RISK_SHAPE_BY_SURVIVAL_ROLE[segment.survivalRole],
    colorIsNeverSoleSignal: true as const,
  });
}

function requiredRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): Record<string, unknown> {
  const record = assertPlainRecord(value, name);
  assertKnownKeys(record, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(record, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
  return record;
}

function booleanValue(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name}必须是布尔值。`);
  return value;
}

function nullableString(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

function nullableInteger(value: unknown, name: string, minimum = 0): number | null {
  return value === null ? null : assertIntegerAtLeast(value, minimum, name);
}

function requireRoute(mapDefinitionId: string): KzRouteDefinitionV2 {
  const matches = ROUTES.filter((route) => route.mapDefinitionId === mapDefinitionId);
  if (matches.length !== 1) {
    throw new RangeError(`Arena V2 KZ路线无法唯一解析地图${mapDefinitionId}。`);
  }
  return matches[0]!;
}

function routeSurfaceOwners(route: KzRouteDefinitionV2): ReadonlyMap<string, number> {
  const owners = new Map<string, number>();
  route.segments.forEach((segment, index) => {
    for (const surfaceId of segment.surfaceIds) {
      if (owners.has(surfaceId)) {
        throw new RangeError(`Arena V2 KZ路线Surface重复归属：${surfaceId}。`);
      }
      owners.set(surfaceId, index);
    }
  });
  return owners;
}

function currentSegmentRead(
  route: KzRouteDefinitionV2,
  supportSurfaceId: string | null,
): ArenaV2KzRouteCurrentSegmentReadCandidateV1 | null {
  if (supportSurfaceId === null) return null;
  const segmentIndex = routeSurfaceOwners(route).get(supportSurfaceId);
  if (segmentIndex === undefined) {
    throw new RangeError(`Arena V2 KZ当前支撑面不属于冻结路线：${supportSurfaceId}。`);
  }
  const segment = route.segments[segmentIndex]!;
  const branchMatches = segment.branches.filter(({ surfaceIds }) => (
    surfaceIds.includes(supportSurfaceId)
  ));
  const shape = segmentShapeRead(route, segmentIndex);
  const experience = requireArenaV2KzMapExperienceSegmentCandidateV1(
    route.mapDefinitionId,
    segment.id,
  );
  return Object.freeze({
    id: segment.id,
    ordinal: segmentIndex + 1,
    segmentCount: route.segments.length,
    kind: segment.kind,
    lessonId: segment.lessonId,
    remixId: segment.remixId,
    survivalRole: segment.survivalRole,
    responseOptions: segment.responseOptions,
    responseWindowTicks: segment.responseWindowTicks,
    hitRecovery: segment.hitRecovery,
    respawnAnchorId: segment.respawnAnchorId,
    currentBranchId: branchMatches.length === 1 ? branchMatches[0]!.id : null,
    pacingArc: experience.pacingArc,
    cycleOrdinal: experience.cycleOrdinal,
    experienceBeat: experience.experienceBeat,
    experienceIntensity: experience.experienceIntensity,
    landmarkCue: experience.landmarkCue,
    landmarkAnchorId: experience.landmarkAnchorId,
    landmarkSurfaceId: experience.landmarkSurfaceId,
    leadingLineCue: experience.leadingLineCue,
    memoryHook: experience.memoryHook,
    raceRead: experience.raceRead,
    survivalRead: experience.survivalRead,
    colorIsNeverSoleSignal: true as const,
    guidanceShape: shape.guidanceShape,
    riskShape: shape.riskShape,
  });
}

function assertKnownRouteAnchor(route: KzRouteDefinitionV2, anchorId: string, name: string): void {
  if (!route.anchors.some(({ id }) => id === anchorId)) {
    throw new RangeError(`${name}引用未知路线锚点${anchorId}。`);
  }
}

function assertKnownRouteSurface(
  route: KzRouteDefinitionV2,
  surfaceId: string | null,
  name: string,
): void {
  if (surfaceId !== null && !routeSurfaceOwners(route).has(surfaceId)) {
    throw new RangeError(`${name}引用未知路线Surface ${surfaceId}。`);
  }
}

function modeRead(
  value: unknown,
  modeDefinitionId: string,
  localParticipantId: string,
  route: KzRouteDefinitionV2,
): ArenaV2KzRouteModeReadCandidateV1 {
  const projection = requiredRecord(value, MODE_PROJECTION_KEYS, 'Arena V2 KZ Mode Projection');
  if (assertNonEmptyString(
    projection.modeDefinitionId,
    'Arena V2 KZ Mode Projection.modeDefinitionId',
  ) !== modeDefinitionId) throw new RangeError('Arena V2 KZ Mode Projection身份漂移。');
  const state = assertPlainRecord(projection.state, 'Arena V2 KZ Mode Projection.state');
  if (state.kind === 'duel') {
    requiredRecord(state, DUEL_STATE_KEYS, 'Arena V2 KZ Duel Projection');
    booleanValue(state.suddenDeath, 'Arena V2 KZ Duel Projection.suddenDeath');
    return Object.freeze({ kind: 'duel' as const });
  }
  if (state.kind === 'race') {
    requiredRecord(state, RACE_STATE_KEYS, 'Arena V2 KZ Race Projection');
    if (!Array.isArray(state.participants)) {
      throw new TypeError('Arena V2 KZ Race Projection.participants必须是数组。');
    }
    const participantIds = new Set<string>();
    const locals: Record<string, unknown>[] = [];
    state.participants.forEach((candidate, index) => {
      const participant = requiredRecord(
        candidate,
        RACE_PARTICIPANT_KEYS,
        `Arena V2 KZ Race Projection.participants[${index}]`,
      );
      const participantId = assertNonEmptyString(
        participant.participantId,
        `Arena V2 KZ Race Projection.participants[${index}].participantId`,
      );
      if (participantIds.has(participantId)) throw new RangeError('Arena V2 KZ Race参与者重复。');
      participantIds.add(participantId);
      if (participantId === localParticipantId) locals.push(participant);
    });
    if (locals.length !== 1) throw new RangeError('Arena V2 KZ Race缺少唯一当前玩家。');
    const local = locals[0]!;
    if (!RACE_STATUSES.has(local.status)) throw new RangeError('Arena V2 KZ Race状态不受支持。');
    const progressOrdinal = assertIntegerAtLeast(
      local.progressOrdinal,
      0,
      'Arena V2 KZ Race.progressOrdinal',
    );
    const status = local.status as 'racing' | 'respawning' | 'finished';
    if (progressOrdinal > route.segments.length + 1
      || (status === 'finished' && progressOrdinal !== route.segments.length + 1)
      || (status !== 'finished' && progressOrdinal > route.segments.length)) {
      throw new RangeError('Arena V2 KZ Race进度超出冻结路线。');
    }
    const safeAnchorId = nullableString(local.safeAnchorId, 'Arena V2 KZ Race.safeAnchorId');
    if (safeAnchorId !== null) assertKnownRouteAnchor(route, safeAnchorId, 'Arena V2 KZ Race');
    const respawnReadyTick = nullableInteger(
      local.respawnReadyTick,
      'Arena V2 KZ Race.respawnReadyTick',
    );
    const finishTick = nullableInteger(local.finishTick, 'Arena V2 KZ Race.finishTick');
    const rank = nullableInteger(local.rank, 'Arena V2 KZ Race.rank', 1);
    const validStatusFields = status === 'racing'
      ? respawnReadyTick === null && finishTick === null && rank === null
      : status === 'respawning'
        ? respawnReadyTick !== null && finishTick === null && rank === null
        : respawnReadyTick === null && finishTick !== null && rank !== null;
    if (!validStatusFields) {
      throw new RangeError('Arena V2 KZ Race状态与重入/完赛字段不闭合。');
    }
    return Object.freeze({
      kind: 'race' as const,
      finishGateId: assertNonEmptyString(
        state.finishGateId,
        'Arena V2 KZ Race.finishGateId',
      ),
      status,
      safeAnchorId,
      progressOrdinal,
      respawnReadyTick,
      finishTick,
      rank,
    });
  }
  if (state.kind === 'survival') {
    requiredRecord(state, SURVIVAL_STATE_KEYS, 'Arena V2 KZ Survival Projection');
    if (assertNonEmptyString(
      state.playerParticipantId,
      'Arena V2 KZ Survival.playerParticipantId',
    ) !== localParticipantId) throw new RangeError('Arena V2 KZ Survival当前玩家身份漂移。');
    const fallCount = assertIntegerAtLeast(state.fallCount, 0, 'Arena V2 KZ Survival.fallCount');
    if (fallCount > 2 || state.terminalFallCount !== 2) {
      throw new RangeError('Arena V2 KZ Survival掉落合同不受支持。');
    }
    if (!Array.isArray(state.enemySlots)) {
      throw new TypeError('Arena V2 KZ Survival.enemySlots必须是数组。');
    }
    return Object.freeze({
      kind: 'survival' as const,
      fallCount,
      terminalFallCount: 2 as const,
      survivedTicks: assertIntegerAtLeast(
        state.survivedTicks,
        0,
        'Arena V2 KZ Survival.survivedTicks',
      ),
      pressureStage: assertIntegerAtLeast(
        state.pressureStage,
        0,
        'Arena V2 KZ Survival.pressureStage',
      ),
    });
  }
  throw new RangeError(`Arena V2 KZ Mode类型不受支持：${String(state.kind)}。`);
}

function cueFromEvent(
  event: ArenaMatchEventV6,
  localParticipantId: string,
  modeKind: ArenaV2KzRoutePresentationModeKindCandidateV1,
  route: KzRouteDefinitionV2,
): ArenaV2KzRoutePresentationCueCandidateV1 | null {
  if (!('participantId' in event) || event.participantId !== localParticipantId) return null;
  if ('modeDefinitionId' in event && typeof event.modeDefinitionId !== 'string') {
    throw new TypeError('Arena V2 KZ路线事件缺少Mode身份。');
  }
  const common = {
    id: `arena.cue.kz-route.${event.id}.candidate.v1`,
    sourceEventId: event.id,
    tick: event.tick,
    sequence: event.sequence,
    participantId: localParticipantId,
    colorIsNeverSoleSignal: true as const,
  };
  switch (event.type) {
    case ARENA_MATCH_EVENT_V6.PARTICIPANT_FELL:
      assertKnownRouteSurface(route, event.supportSurfaceId, 'Arena V2 KZ ParticipantFell');
      return Object.freeze({
        ...common,
        kind: 'support-lost' as const,
        anchorId: null,
        supportSurfaceId: event.supportSurfaceId,
        readyTick: null,
        progressOrdinal: null,
        fallCount: null,
        terminal: null,
        shape: 'broken-down-line' as const,
        text: event.fallCause === 'credited-hit'
          ? '受击后失去支撑'
          : event.fallCause === 'movement'
            ? '移动中失去支撑'
            : '环境导致失去支撑',
      });
    case ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWN_SCHEDULED:
      if (!(
        (modeKind === 'race' && event.modeRole === 'competitor')
        || (modeKind === 'survival' && event.modeRole === 'player')
      )) {
        throw new RangeError('Arena V2 KZ重入事件与Mode不一致。');
      }
      assertKnownRouteAnchor(route, event.anchorId, 'Arena V2 KZ RespawnScheduled');
      return Object.freeze({
        ...common,
        kind: 'respawn-scheduled' as const,
        anchorId: event.anchorId,
        supportSurfaceId: null,
        readyTick: event.readyTick,
        progressOrdinal: null,
        fallCount: null,
        terminal: null,
        shape: 'open-reentry-arch' as const,
        text: '将在安全锚点重返路线',
      });
    case ARENA_MATCH_EVENT_V6.PARTICIPANT_RESPAWNED:
      if (!(
        (modeKind === 'race' && event.modeRole === 'competitor')
        || (modeKind === 'survival' && event.modeRole === 'player')
      )) {
        throw new RangeError('Arena V2 KZ重生事件与Mode不一致。');
      }
      assertKnownRouteAnchor(route, event.anchorId, 'Arena V2 KZ Respawned');
      return Object.freeze({
        ...common,
        kind: 'respawned' as const,
        anchorId: event.anchorId,
        supportSurfaceId: null,
        readyTick: null,
        progressOrdinal: null,
        fallCount: null,
        terminal: null,
        shape: 'solid-reentry-arch' as const,
        text: '已从安全锚点重返路线',
      });
    case ARENA_MATCH_EVENT_V6.RACE_SAFE_ANCHOR_COMMITTED:
      if (modeKind !== 'race') throw new RangeError('Arena V2 KZ安全锚事件只能用于Race。');
      assertKnownRouteAnchor(route, event.anchorId, 'Arena V2 KZ SafeAnchor');
      if (event.progressOrdinal < 1 || event.progressOrdinal > route.segments.length) {
        throw new RangeError('Arena V2 KZ安全锚进度越界。');
      }
      return Object.freeze({
        ...common,
        kind: 'safe-anchor-committed' as const,
        anchorId: event.anchorId,
        supportSurfaceId: null,
        readyTick: null,
        progressOrdinal: event.progressOrdinal,
        fallCount: null,
        terminal: null,
        shape: 'small-return-anchor' as const,
        text: '安全重入点已更新',
      });
    case ARENA_MATCH_EVENT_V6.RACE_FINISH_CLAIMED:
      if (modeKind !== 'race' || event.progressOrdinal !== route.segments.length + 1) {
        throw new RangeError('Arena V2 KZ终点事件与路线不一致。');
      }
      return Object.freeze({
        ...common,
        kind: 'finish-claimed' as const,
        anchorId: route.finishAnchorId,
        supportSurfaceId: null,
        readyTick: null,
        progressOrdinal: event.progressOrdinal,
        fallCount: null,
        terminal: null,
        shape: 'large-finish-gate' as const,
        text: '已抵达终点',
      });
    case ARENA_MATCH_EVENT_V6.SURVIVAL_PLAYER_FALL_COUNTED:
      if (modeKind !== 'survival') {
        throw new RangeError('Arena V2 KZ生存掉落事件只能用于Survival。');
      }
      return Object.freeze({
        ...common,
        kind: 'survival-fall-counted' as const,
        anchorId: null,
        supportSurfaceId: null,
        readyTick: null,
        progressOrdinal: null,
        fallCount: event.fallCount,
        terminal: event.terminal,
        shape: event.terminal ? 'double-closed-fall-ring' as const : 'single-open-fall-ring' as const,
        text: event.terminal ? '第二次掉落，本局结束' : '第一次掉落，仍可重返路线',
      });
    default:
      return null;
  }
}

function routeCues(
  value: unknown,
  localParticipantId: string,
  modeDefinitionId: string,
  modeKind: ArenaV2KzRoutePresentationModeKindCandidateV1,
  route: KzRouteDefinitionV2,
  frameTick: number,
  frameEventSequence: number,
): readonly ArenaV2KzRoutePresentationCueCandidateV1[] {
  if (!Array.isArray(value)) throw new TypeError('Arena V2 KZ scene.events必须是数组。');
  const cues: ArenaV2KzRoutePresentationCueCandidateV1[] = [];
  let previousSequence = -1;
  for (const candidate of value) {
    const record = assertPlainRecord(candidate, 'Arena V2 KZ scene event');
    if (!ROUTE_EVENT_TYPES.has(record.type)) continue;
    const event = createArenaMatchEventV6(record);
    if (!('modeDefinitionId' in event) || event.modeDefinitionId !== modeDefinitionId) {
      throw new RangeError('Arena V2 KZ路线事件Mode身份漂移。');
    }
    if (event.tick >= frameTick || event.sequence >= frameEventSequence) {
      throw new RangeError('Arena V2 KZ路线事件超出post-step Frame水位。');
    }
    if (event.sequence <= previousSequence) {
      throw new RangeError('Arena V2 KZ路线事件必须按sequence严格递增。');
    }
    previousSequence = event.sequence;
    const cue = cueFromEvent(event, localParticipantId, modeKind, route);
    if (cue !== null) cues.push(cue);
  }
  if (cues.length > MAXIMUM_ROUTE_CUES_PER_FRAME) {
    throw new RangeError(`Arena V2 KZ单帧路线Cue不能超过${MAXIMUM_ROUTE_CUES_PER_FRAME}条。`);
  }
  if (new Set(cues.map(({ id }) => id)).size !== cues.length) {
    throw new RangeError('Arena V2 KZ路线Cue身份重复。');
  }
  return Object.freeze(cues);
}

/**
 * Renderer-neutral KZ route projection. It only translates the current
 * authority support surface, mode projection and stable V6 events. It never
 * searches nearby geometry, predicts a checkpoint or creates a finish fact.
 */
export function projectArenaV2KzRoutePresentationCandidateV1(
  value: unknown,
): ArenaV2KzRoutePresentationProjectionCandidateV1 {
  const input = requiredRecord(
    cloneFrozenData(value, 'Arena V2 KZ route presentation input'),
    INPUT_KEYS,
    'Arena V2 KZ route presentation input',
  );
  if (input.schemaVersion !== ARENA_V2_KZ_ROUTE_PRESENTATION_PROJECTION_CANDIDATE_V1_SCHEMA_VERSION) {
    throw new RangeError('Arena V2 KZ route presentation只接受schemaVersion 1。');
  }
  const scene = requiredRecord(input.scene, SCENE_KEYS, 'Arena V2 KZ scene');
  if (scene.schemaVersion !== 1 || scene.status !== 'production-unreachable') {
    throw new RangeError('Arena V2 KZ scene身份不受支持。');
  }
  const source = requiredRecord(scene.source, SOURCE_KEYS, 'Arena V2 KZ scene.source');
  const matchSeed = assertIntegerAtLeast(source.matchSeed, 0, 'Arena V2 KZ source.matchSeed');
  const tick = assertIntegerAtLeast(source.tick, 0, 'Arena V2 KZ source.tick');
  const eventSequence = assertIntegerAtLeast(
    source.eventSequence,
    0,
    'Arena V2 KZ source.eventSequence',
  );
  const modeDefinitionId = assertNonEmptyString(
    source.modeDefinitionId,
    'Arena V2 KZ source.modeDefinitionId',
  );
  const mapDefinitionId = assertNonEmptyString(
    source.mapDefinitionId,
    'Arena V2 KZ source.mapDefinitionId',
  );
  const route = requireRoute(mapDefinitionId);
  const world = requiredRecord(scene.world, WORLD_KEYS, 'Arena V2 KZ scene.world');
  const map = requiredRecord(world.map, MAP_KEYS, 'Arena V2 KZ scene.world.map');
  if (map.definitionId !== mapDefinitionId) {
    throw new RangeError('Arena V2 KZ source与world map身份漂移。');
  }
  if (!Array.isArray(map.surfaces)) throw new TypeError('Arena V2 KZ map.surfaces必须是数组。');
  const mapSurfaceIds = new Set<string>();
  map.surfaces.forEach((candidate, index) => {
    const surface = requiredRecord(candidate, SURFACE_KEYS, `Arena V2 KZ map.surfaces[${index}]`);
    const id = assertNonEmptyString(surface.id, `Arena V2 KZ map.surfaces[${index}].id`);
    if (mapSurfaceIds.has(id)) throw new RangeError('Arena V2 KZ map surface身份重复。');
    mapSurfaceIds.add(id);
    if (!booleanValue(surface.enabled, `Arena V2 KZ map.surfaces[${index}].enabled`)) {
      throw new RangeError(`Arena V2 KZ生产路线不允许关闭Surface ${id}。`);
    }
  });
  for (const surfaceId of routeSurfaceOwners(route).keys()) {
    if (!mapSurfaceIds.has(surfaceId)) {
      throw new RangeError(`Arena V2 KZ Frame缺少路线Surface ${surfaceId}。`);
    }
  }
  if (!Array.isArray(world.participants)) {
    throw new TypeError('Arena V2 KZ scene.world.participants必须是数组。');
  }
  const localParticipantId = assertNonEmptyString(
    scene.localParticipantId,
    'Arena V2 KZ scene.localParticipantId',
  );
  const participantIds = new Set<string>();
  const locals: Record<string, unknown>[] = [];
  world.participants.forEach((candidate, index) => {
    const participant = requiredRecord(
      candidate,
      PARTICIPANT_KEYS,
      `Arena V2 KZ scene.world.participants[${index}]`,
    );
    const id = assertNonEmptyString(
      participant.id,
      `Arena V2 KZ scene.world.participants[${index}].id`,
    );
    if (participantIds.has(id)) throw new RangeError('Arena V2 KZ scene participant身份重复。');
    participantIds.add(id);
    const local = booleanValue(
      participant.local,
      `Arena V2 KZ scene.world.participants[${index}].local`,
    );
    if (local || id === localParticipantId) {
      if (!local || id !== localParticipantId) {
        throw new RangeError('Arena V2 KZ scene本地玩家标记漂移。');
      }
      locals.push(participant);
    }
  });
  if (locals.length !== 1) throw new RangeError('Arena V2 KZ scene必须有唯一当前玩家。');
  const local = locals[0]!;
  const grounded = booleanValue(local.grounded, 'Arena V2 KZ local.grounded');
  const supportSurfaceId = nullableString(
    local.supportSurfaceId,
    'Arena V2 KZ local.supportSurfaceId',
  );
  if (grounded !== (supportSurfaceId !== null)) {
    throw new RangeError('Arena V2 KZ local grounded与supportSurface不闭合。');
  }
  const currentSegment = currentSegmentRead(route, supportSurfaceId);
  const mode = modeRead(world.modeProjection, modeDefinitionId, localParticipantId, route);
  const cues = routeCues(
    scene.events,
    localParticipantId,
    modeDefinitionId,
    mode.kind,
    route,
    tick,
    eventSequence,
  );
  const environment = requireArenaV2FormalMapEnvironmentCandidateV1(mapDefinitionId);
  const assetMatches = ARENA_V2_FORMAL_MAP_ASSET_BINDINGS_CANDIDATE_V1.filter((binding) => (
    binding.mapDefinitionId === mapDefinitionId
  ));
  if (assetMatches.length !== 1 || assetMatches[0]!.maturity !== 'authored-candidate-not-approved') {
    throw new RangeError(`Arena V2 KZ地图${mapDefinitionId}缺少唯一未批准正式资产绑定。`);
  }
  const routeContentHash = ROUTE_CONTENT_HASHES.get(route.id);
  if (routeContentHash === undefined) throw new RangeError('Arena V2 KZ路线hash缺失。');
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    source: Object.freeze({ matchSeed, tick, eventSequence, modeDefinitionId, mapDefinitionId }),
    route: Object.freeze({
      routeDefinitionId: route.id,
      routeContentHash,
      mapExperienceCatalogContentHash:
        ARENA_V2_KZ_MAP_EXPERIENCE_CATALOG_CANDIDATE_V1.contentHash,
      mapDefinitionId,
      segmentCount: route.segments.length,
      segmentIds: Object.freeze(route.segments.map(({ id }) => id)),
      segmentShapeCatalog: Object.freeze(route.segments.map((_, index) => (
        segmentShapeRead(route, index)
      ))),
      surfaceIds: Object.freeze(route.segments.flatMap(({ surfaceIds }) => surfaceIds)),
      finishAnchorId: route.finishAnchorId,
      environmentIdentity: environment.identity,
      environmentContentHash: environment.contentHash,
      routeAccentColor: environment.routeAccentColor,
      mapVisualAssetId: assetMatches[0]!.mapVisualAssetId,
      mapAssetMaturity: 'authored-candidate-not-approved' as const,
    }),
    local: Object.freeze({
      participantId: localParticipantId,
      participantStatus: assertNonEmptyString(local.status, 'Arena V2 KZ local.status'),
      grounded,
      supportSurfaceId,
      currentSegment,
    }),
    mode,
    cues,
    governance: Object.freeze({
      ownsRuleOrMatchAuthority: false as const,
      writesAuthorityState: false as const,
      infersCurrentSegmentFromPosition: false as const,
      currentSegmentUsesExactSupportSurfaceOnly: true as const,
      infersAnchorOrFinish: false as const,
      cuesUseStableEventsOnly: true as const,
      usesWallClockOrRandom: false as const,
      importsThreeOrDom: false as const,
      programmaticAssetFallbackAllowed: false as const,
    }),
  });
}

export const ARENA_V2_KZ_ROUTE_PRESENTATION_PROJECTION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultCompositionWired: false as const,
  defaultSurfaceWired: false as const,
  supportedMapCount: 2 as const,
  guidanceShapeCount: ARENA_V2_KZ_ROUTE_GUIDANCE_SHAPE_IDS_CANDIDATE_V1.length,
  riskShapeCount: ARENA_V2_KZ_ROUTE_RISK_SHAPE_IDS_CANDIDATE_V1.length,
  supportedSegmentShapeCountAcrossTwoMaps: 20 as const,
  maximumRouteCuesPerFrame: MAXIMUM_ROUTE_CUES_PER_FRAME,
  currentSegmentUsesExactSupportSurfaceOnly: true as const,
  positionOrAnimationInferenceAllowed: false as const,
  formalMapAssetsApproved: false as const,
  validationStatus: 'not-run' as const,
});
