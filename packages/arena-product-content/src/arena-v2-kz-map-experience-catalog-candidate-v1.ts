import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import type { KzRouteDefinitionV2 } from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
} from './arena-v2-kz-base-map-candidate-v1.js';
import {
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
} from './arena-v2-kz-switchback-map-candidate-v1.js';

export const ARENA_V2_KZ_MAP_EXPERIENCE_CATALOG_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;

export type ArenaV2KzMapExperienceBeatCandidateV1 =
  | 'introduce'
  | 'develop'
  | 'twist'
  | 'test'
  | 'climax'
  | 'release'
  | 'resolution';

export type ArenaV2KzMapExperienceIntensityCandidateV1 = 1 | 2 | 3 | 4 | 5;

export interface ArenaV2KzMapExperienceSegmentCandidateV1 {
  readonly schemaVersion:
    typeof ARENA_V2_KZ_MAP_EXPERIENCE_CATALOG_CANDIDATE_V1_SCHEMA_VERSION;
  readonly mapDefinitionId: string;
  readonly routeDefinitionId: string;
  readonly pacingArc: 'two-cycle-branch-escalation' | 'cardinal-switchback-sawtooth';
  readonly segmentId: string;
  readonly ordinal: number;
  readonly cycleOrdinal: 1 | 2;
  readonly experienceBeat: ArenaV2KzMapExperienceBeatCandidateV1;
  readonly experienceIntensity: ArenaV2KzMapExperienceIntensityCandidateV1;
  readonly landmarkCue: string;
  readonly landmarkAnchorId: string;
  readonly landmarkSurfaceId: string;
  readonly leadingLineCue: string;
  readonly leadingLineFromAnchorId: string;
  readonly leadingLineToAnchorId: string;
  readonly memoryHook: string;
  readonly raceRead: string;
  readonly survivalRead: string;
  readonly usesExistingAuthoredSegmentEntryCue: true;
  readonly requiresAuthoredGeometryChange: false;
  readonly colorIsNeverSoleSignal: true;
  readonly contentHash: string;
}

interface SegmentExperienceInput {
  readonly segmentId: string;
  readonly cycleOrdinal: 1 | 2;
  readonly experienceBeat: ArenaV2KzMapExperienceBeatCandidateV1;
  readonly experienceIntensity: ArenaV2KzMapExperienceIntensityCandidateV1;
  readonly landmarkCue: string;
  readonly leadingLineCue: string;
  readonly memoryHook: string;
  readonly raceRead: string;
  readonly survivalRead: string;
}

interface MapExperienceSource {
  readonly route: KzRouteDefinitionV2;
  readonly pacingArc: ArenaV2KzMapExperienceSegmentCandidateV1['pacingArc'];
  readonly inputs: readonly SegmentExperienceInput[];
}

const BASE_INPUTS: readonly SegmentExperienceInput[] = Object.freeze([
  {
    segmentId: 'kz-segment-01-platform', cycleOrdinal: 1,
    experienceBeat: 'introduce', experienceIntensity: 1,
    landmarkCue: 'start-deck', leadingLineCue: 'forward-spine',
    memoryHook: 'open-deck-launch', raceRead: 'establish-forward-commit',
    survivalRead: 'open-reset-pocket',
  },
  {
    segmentId: 'kz-segment-02-gap', cycleOrdinal: 1,
    experienceBeat: 'develop', experienceIntensity: 2,
    landmarkCue: 'landing-island', leadingLineCue: 'broken-axis',
    memoryHook: 'first-air-commit', raceRead: 'confirm-jump-distance',
    survivalRead: 'single-recovery-edge',
  },
  {
    segmentId: 'kz-segment-03-stairs', cycleOrdinal: 1,
    experienceBeat: 'develop', experienceIntensity: 2,
    landmarkCue: 'stair-crown', leadingLineCue: 'rising-rungs',
    memoryHook: 'three-beat-rise', raceRead: 'build-repeatable-rhythm',
    survivalRead: 'layered-pressure-lane',
  },
  {
    segmentId: 'kz-segment-04-maze', cycleOrdinal: 1,
    experienceBeat: 'twist', experienceIntensity: 3,
    landmarkCue: 'route-fork', leadingLineCue: 'split-chevron',
    memoryHook: 'first-safe-fast-choice', raceRead: 'choose-speed-or-recovery',
    survivalRead: 'branch-ambush-pocket',
  },
  {
    segmentId: 'kz-segment-05-narrow', cycleOrdinal: 1,
    experienceBeat: 'test', experienceIntensity: 4,
    landmarkCue: 'narrow-bridge', leadingLineCue: 'center-thread',
    memoryHook: 'first-precision-check', raceRead: 'hold-micro-correction',
    survivalRead: 'ring-out-pressure-lane',
  },
  {
    segmentId: 'kz-segment-06-wire', cycleOrdinal: 1,
    experienceBeat: 'climax', experienceIntensity: 5,
    landmarkCue: 'wire-choice', leadingLineCue: 'dual-path',
    memoryHook: 'first-cycle-wire-fork', raceRead: 'cash-out-route-choice',
    survivalRead: 'high-contact-choice-lane',
  },
  {
    segmentId: 'kz-segment-07-breather', cycleOrdinal: 2,
    experienceBeat: 'release', experienceIntensity: 1,
    landmarkCue: 'reset-deck', leadingLineCue: 'open-frame',
    memoryHook: 'mid-route-breath', raceRead: 'reset-heading-and-rhythm',
    survivalRead: 'wide-reorientation-pocket',
  },
  {
    segmentId: 'kz-segment-08-stairs', cycleOrdinal: 2,
    experienceBeat: 'develop', experienceIntensity: 3,
    landmarkCue: 'stair-tower', leadingLineCue: 'rising-rungs',
    memoryHook: 'accelerating-rise', raceRead: 'rebuild-rhythm-at-height',
    survivalRead: 'vertical-pressure-lane',
  },
  {
    segmentId: 'kz-segment-09-maze', cycleOrdinal: 2,
    experienceBeat: 'twist', experienceIntensity: 4,
    landmarkCue: 'elevated-fork', leadingLineCue: 'vertical-split',
    memoryHook: 'high-safe-low-fast', raceRead: 'read-height-before-commit',
    survivalRead: 'split-level-ambush-pocket',
  },
  {
    segmentId: 'kz-segment-10-gap', cycleOrdinal: 2,
    experienceBeat: 'test', experienceIntensity: 4,
    landmarkCue: 'landing-island', leadingLineCue: 'leap-axis',
    memoryHook: 'long-gap-after-choice', raceRead: 'retain-line-after-fork',
    survivalRead: 'recovery-edge-under-contact',
  },
  {
    segmentId: 'kz-segment-11-narrow', cycleOrdinal: 2,
    experienceBeat: 'test', experienceIntensity: 5,
    landmarkCue: 'narrow-spine', leadingLineCue: 'center-thread',
    memoryHook: 'late-precision-spike', raceRead: 'protect-final-line',
    survivalRead: 'late-ring-out-lane',
  },
  {
    segmentId: 'kz-segment-12-wire', cycleOrdinal: 2,
    experienceBeat: 'climax', experienceIntensity: 5,
    landmarkCue: 'finish-wire', leadingLineCue: 'finish-gate',
    memoryHook: 'final-safe-fast-wire', raceRead: 'resolve-under-finish-pressure',
    survivalRead: 'terminal-choice-lane',
  },
]);

const SWITCHBACK_INPUTS: readonly SegmentExperienceInput[] = Object.freeze([
  {
    segmentId: 'ks-segment-01-platform', cycleOrdinal: 1,
    experienceBeat: 'introduce', experienceIntensity: 1,
    landmarkCue: 'start-deck', leadingLineCue: 'east-axis',
    memoryHook: 'eastbound-launch', raceRead: 'establish-cardinal-heading',
    survivalRead: 'open-reset-pocket',
  },
  {
    segmentId: 'ks-segment-02-east-gap', cycleOrdinal: 1,
    experienceBeat: 'develop', experienceIntensity: 2,
    landmarkCue: 'landing-island', leadingLineCue: 'east-gap',
    memoryHook: 'long-east-commit', raceRead: 'center-the-first-landing',
    survivalRead: 'single-recovery-edge',
  },
  {
    segmentId: 'ks-segment-03-rising-stairs', cycleOrdinal: 1,
    experienceBeat: 'develop', experienceIntensity: 3,
    landmarkCue: 'stair-crown', leadingLineCue: 'rising-rungs',
    memoryHook: 'rise-before-turn', raceRead: 'carry-rhythm-to-corner',
    survivalRead: 'layered-pressure-lane',
  },
  {
    segmentId: 'ks-segment-04-north-turn', cycleOrdinal: 1,
    experienceBeat: 'twist', experienceIntensity: 4,
    landmarkCue: 'cardinal-corner', leadingLineCue: 'east-to-north-elbow',
    memoryHook: 'first-heading-rewrite', raceRead: 'turn-on-narrow-support',
    survivalRead: 'corner-ring-out-lane',
  },
  {
    segmentId: 'ks-segment-05-west-wire', cycleOrdinal: 1,
    experienceBeat: 'climax', experienceIntensity: 5,
    landmarkCue: 'reversal-wire', leadingLineCue: 'north-to-west-line',
    memoryHook: 'westbound-wire-reversal', raceRead: 'reverse-heading-without-reset',
    survivalRead: 'high-contact-wire-lane',
  },
  {
    segmentId: 'ks-segment-06-descending-stairs', cycleOrdinal: 2,
    experienceBeat: 'release', experienceIntensity: 3,
    landmarkCue: 'descent-rungs', leadingLineCue: 'falling-rungs',
    memoryHook: 'active-descent-release', raceRead: 'recover-control-while-descending',
    survivalRead: 'layered-recovery-lane',
  },
  {
    segmentId: 'ks-segment-07-north-gap', cycleOrdinal: 2,
    experienceBeat: 'test', experienceIntensity: 4,
    landmarkCue: 'north-landing', leadingLineCue: 'north-gap',
    memoryHook: 'jump-after-descent', raceRead: 'commit-after-direction-change',
    survivalRead: 'late-recovery-edge',
  },
  {
    segmentId: 'ks-segment-08-finish', cycleOrdinal: 2,
    experienceBeat: 'resolution', experienceIntensity: 2,
    landmarkCue: 'finish-deck', leadingLineCue: 'finish-gate',
    memoryHook: 'short-west-close', raceRead: 'resolve-line-under-contact',
    survivalRead: 'finish-reset-pocket',
  },
]);

const MAPS: readonly MapExperienceSource[] = Object.freeze([
  Object.freeze({
    route: ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
    pacingArc: 'two-cycle-branch-escalation' as const,
    inputs: BASE_INPUTS,
  }),
  Object.freeze({
    route: ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
    pacingArc: 'cardinal-switchback-sawtooth' as const,
    inputs: SWITCHBACK_INPUTS,
  }),
]);

function createSegments(
  source: MapExperienceSource,
): readonly ArenaV2KzMapExperienceSegmentCandidateV1[] {
  if (source.inputs.length !== source.route.segments.length) {
    throw new RangeError(`Arena V2地图${source.route.mapDefinitionId}体验节奏未覆盖全部段落。`);
  }
  const anchors = new Map(source.route.anchors.map((anchor) => [anchor.id, anchor]));
  return Object.freeze(source.route.segments.map((segment, index) => {
    const input = source.inputs[index]!;
    if (input.segmentId !== segment.id) {
      throw new RangeError(`Arena V2地图体验段落顺序漂移：${input.segmentId}/${segment.id}。`);
    }
    const entry = anchors.get(segment.entryAnchorId);
    const exit = anchors.get(segment.exitAnchorId);
    if (!entry || !exit) throw new RangeError(`Arena V2地图体验段${segment.id}缺少入口或出口。`);
    const authority = Object.freeze({
      schemaVersion: ARENA_V2_KZ_MAP_EXPERIENCE_CATALOG_CANDIDATE_V1_SCHEMA_VERSION,
      mapDefinitionId: source.route.mapDefinitionId,
      routeDefinitionId: source.route.id,
      pacingArc: source.pacingArc,
      segmentId: segment.id,
      ordinal: index + 1,
      cycleOrdinal: input.cycleOrdinal,
      experienceBeat: input.experienceBeat,
      experienceIntensity: input.experienceIntensity,
      landmarkCue: input.landmarkCue,
      landmarkAnchorId: entry.id,
      landmarkSurfaceId: entry.surfaceId,
      leadingLineCue: input.leadingLineCue,
      leadingLineFromAnchorId: entry.id,
      leadingLineToAnchorId: exit.id,
      memoryHook: input.memoryHook,
      raceRead: input.raceRead,
      survivalRead: input.survivalRead,
      usesExistingAuthoredSegmentEntryCue: true as const,
      requiresAuthoredGeometryChange: false as const,
      colorIsNeverSoleSignal: true as const,
    });
    return Object.freeze({
      ...authority,
      contentHash: createDeterministicDataHash(
        authority,
        `Arena V2 KZ map experience segment ${segment.id}`,
      ),
    });
  }));
}

export const ARENA_V2_KZ_MAP_EXPERIENCE_SEGMENTS_CANDIDATE_V1 = Object.freeze(
  MAPS.flatMap(createSegments),
);

function assertClosure(): void {
  if (ARENA_V2_KZ_MAP_EXPERIENCE_SEGMENTS_CANDIDATE_V1.length !== 20) {
    throw new RangeError('Arena V2地图体验目录必须精确覆盖20个段落。');
  }
  const identities = ARENA_V2_KZ_MAP_EXPERIENCE_SEGMENTS_CANDIDATE_V1.map((segment) => (
    `${segment.mapDefinitionId}:${segment.segmentId}`
  ));
  if (new Set(identities).size !== identities.length) {
    throw new RangeError('Arena V2地图体验段身份重复。');
  }
  for (const source of MAPS) {
    const segments = ARENA_V2_KZ_MAP_EXPERIENCE_SEGMENTS_CANDIDATE_V1.filter((segment) => (
      segment.mapDefinitionId === source.route.mapDefinitionId
    ));
    const beats = new Set(segments.map(({ experienceBeat }) => experienceBeat));
    if (segments.length !== source.route.segments.length
      || !beats.has('introduce')
      || !beats.has('develop')
      || !beats.has('twist')
      || !beats.has('test')
      || !beats.has('release')) {
      throw new RangeError(`Arena V2地图${source.route.mapDefinitionId}体验节奏不闭合。`);
    }
    if (!segments.some(({ experienceIntensity }) => experienceIntensity === 1)
      || !segments.some(({ experienceIntensity }) => experienceIntensity === 5)) {
      throw new RangeError(`Arena V2地图${source.route.mapDefinitionId}缺少强弱节奏对比。`);
    }
  }
}

assertClosure();

export function requireArenaV2KzMapExperienceSegmentCandidateV1(
  mapDefinitionId: string,
  segmentId: string,
): ArenaV2KzMapExperienceSegmentCandidateV1 {
  const matches = ARENA_V2_KZ_MAP_EXPERIENCE_SEGMENTS_CANDIDATE_V1.filter((segment) => (
    segment.mapDefinitionId === mapDefinitionId && segment.segmentId === segmentId
  ));
  if (matches.length !== 1) {
    throw new RangeError(`未知Arena V2地图体验段${mapDefinitionId}/${segmentId}。`);
  }
  return matches[0]!;
}

const AUTHORITY = Object.freeze({
  schemaVersion: ARENA_V2_KZ_MAP_EXPERIENCE_CATALOG_CANDIDATE_V1_SCHEMA_VERSION,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultContentPoolWired: false as const,
  mapCount: 2 as const,
  segmentCount: 20 as const,
  inputChannelsRemainDirectionAndJumpOnly: true as const,
  derivesOnlyFromImmutableRouteDefinitions: true as const,
  changesCollisionOrAuthority: false as const,
  requiresDynamicPresentationGeometry: false as const,
  segments: ARENA_V2_KZ_MAP_EXPERIENCE_SEGMENTS_CANDIDATE_V1,
  validationStatus: 'not-run' as const,
});

export const ARENA_V2_KZ_MAP_EXPERIENCE_CATALOG_CANDIDATE_V1 = Object.freeze({
  ...AUTHORITY,
  contentHash: createDeterministicDataHash(
    AUTHORITY,
    'Arena V2 KZ Map Experience Catalog Candidate V1',
  ),
});
