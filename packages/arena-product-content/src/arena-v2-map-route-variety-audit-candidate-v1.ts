import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import type {
  KzRouteDefinitionV2,
  KzRouteDifficultyV2,
  KzRouteResponseOption,
  KzRouteSegmentV2,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
} from './arena-v2-kz-base-map-candidate-v1.js';
import {
  requireArenaV2KzMapExperienceSegmentCandidateV1,
  type ArenaV2KzMapExperienceBeatCandidateV1,
  type ArenaV2KzMapExperienceIntensityCandidateV1,
} from './arena-v2-kz-map-experience-catalog-candidate-v1.js';
import {
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
} from './arena-v2-kz-switchback-map-candidate-v1.js';
import {
  requireArenaV2MapCounterplaySegmentCandidateV1,
} from './arena-v2-map-counterplay-route-catalog-candidate-v1.js';

export const ARENA_V2_MAP_ROUTE_VARIETY_AUDIT_CANDIDATE_V1_SCHEMA_VERSION = 1 as const;

export type ArenaV2MapHeadingSectorCandidateV1 =
  | 'east'
  | 'north-east'
  | 'north'
  | 'north-west'
  | 'west'
  | 'south-west'
  | 'south'
  | 'south-east';

export type ArenaV2MapElevationTrendCandidateV1 = 'ascending' | 'flat' | 'descending';

export type ArenaV2MapRouteVarietyFindingCodeCandidateV1 =
  | 'no-authored-branch-choice'
  | 'heading-concentration-review'
  | 'single-response-concentration'
  | 'repeated-response-run'
  | 'undifferentiated-learning-repeat'
  | 'missing-pre-climax-breather'
  | 'sustained-high-intensity-run';

export interface ArenaV2MapRouteVarietySegmentCandidateV1 {
  readonly mapDefinitionId: string;
  readonly routeDefinitionId: string;
  readonly segmentId: string;
  readonly ordinal: number;
  readonly responseOptionSet: readonly KzRouteResponseOption[];
  readonly responseOptionSetKey: string;
  readonly hasAuthoredBranchChoice: boolean;
  readonly hasMultipleAuthoredResponses: boolean;
  readonly headingSector: ArenaV2MapHeadingSectorCandidateV1;
  readonly elevationTrend: ArenaV2MapElevationTrendCandidateV1;
  readonly experienceBeat: ArenaV2KzMapExperienceBeatCandidateV1;
  readonly experienceIntensity: ArenaV2KzMapExperienceIntensityCandidateV1;
  readonly learningSignatureHash: string;
  readonly contextSignatureHash: string;
}

export interface ArenaV2MapRouteVarietyFindingCandidateV1 {
  readonly code: ArenaV2MapRouteVarietyFindingCodeCandidateV1;
  readonly mapDefinitionId: string;
  readonly segmentIds: readonly string[];
  readonly observedCount: number;
  readonly reviewThreshold: number;
  readonly provesPlayerDominantRoute: false;
  readonly requiresDynamicRaceAndSurvivalEvidence: true;
}

export interface ArenaV2MapRepeatedLearningGroupCandidateV1 {
  readonly learningSignatureHash: string;
  readonly segmentIds: readonly string[];
  readonly contextVariantCount: number;
  readonly containsUndifferentiatedRepeat: boolean;
}

export interface ArenaV2MapRouteVarietyMapCandidateV1 {
  readonly mapDefinitionId: string;
  readonly routeDefinitionId: string;
  readonly segmentCount: number;
  readonly distinctSegmentKindCount: number;
  readonly distinctResponseOptionSetCount: number;
  readonly distinctHeadingSectorCount: number;
  readonly distinctElevationTrendCount: number;
  readonly distinctExperienceBeatCount: number;
  readonly authoredBranchChoiceSegmentCount: number;
  readonly singleResponseSegmentCount: number;
  readonly longestSingleResponseRun: number;
  readonly longestRepeatedResponseSetRun: number;
  readonly dominantHeadingSegmentCount: number;
  readonly repeatedLearningGroups: readonly ArenaV2MapRepeatedLearningGroupCandidateV1[];
  readonly findings: readonly ArenaV2MapRouteVarietyFindingCandidateV1[];
  readonly segments: readonly ArenaV2MapRouteVarietySegmentCandidateV1[];
  readonly routeVarietyFingerprintHash: string;
}

const ROUTES: readonly KzRouteDefinitionV2[] = Object.freeze([
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
]);

const POLICY = Object.freeze({
  maximumRepeatedResponseSetRun: 2,
  maximumSingleResponseShareNumerator: 1,
  maximumSingleResponseShareDenominator: 2,
  maximumDominantHeadingShareNumerator: 3,
  maximumDominantHeadingShareDenominator: 4,
  highIntensityMinimum: 4,
  maximumHighIntensityRun: 2,
  preClimaxBreatherMaximumIntensity: 2,
});

function sortedResponseOptions(
  options: readonly KzRouteResponseOption[],
): readonly KzRouteResponseOption[] {
  return Object.freeze([...options].sort());
}

function elevationTrend(heightDelta: number): ArenaV2MapElevationTrendCandidateV1 {
  if (heightDelta > 0.000_001) return 'ascending';
  if (heightDelta < -0.000_001) return 'descending';
  return 'flat';
}

function headingSector(
  headingX: number,
  headingZ: number,
): ArenaV2MapHeadingSectorCandidateV1 {
  const angle = Math.atan2(headingZ, headingX);
  const octant = Math.round(angle / (Math.PI / 4));
  const normalizedOctant = ((octant % 8) + 8) % 8;
  return [
    'east',
    'north-east',
    'north',
    'north-west',
    'west',
    'south-west',
    'south',
    'south-east',
  ][normalizedOctant] as ArenaV2MapHeadingSectorCandidateV1;
}

function difficultyTuple(difficulty: KzRouteDifficultyV2): readonly number[] {
  return Object.freeze([
    difficulty.distance,
    difficulty.rhythm,
    difficulty.turn,
    difficulty.route,
    difficulty.recovery,
    difficulty.combat,
  ]);
}

function longestSingleResponseRun(
  segments: readonly ArenaV2MapRouteVarietySegmentCandidateV1[],
): number {
  let longest = 0;
  let current = 0;
  for (const segment of segments) {
    if (!segment.hasMultipleAuthoredResponses && !segment.hasAuthoredBranchChoice) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

function maxFrequency(values: readonly string[]): number {
  const counts = new Map<string, number>();
  let maximum = 0;
  for (const value of values) {
    const count = (counts.get(value) ?? 0) + 1;
    counts.set(value, count);
    maximum = Math.max(maximum, count);
  }
  return maximum;
}

function dominantValue(values: readonly string[]): string {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .sort(([leftValue, leftCount], [rightValue, rightCount]) => (
      rightCount - leftCount || (leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0)
    ))[0]![0];
}

function longestResponseSetRun(
  segments: readonly ArenaV2MapRouteVarietySegmentCandidateV1[],
): { readonly length: number; readonly segmentIds: readonly string[] } {
  let longest: readonly ArenaV2MapRouteVarietySegmentCandidateV1[] = [];
  let current: ArenaV2MapRouteVarietySegmentCandidateV1[] = [];
  for (const segment of segments) {
    if (
      current.length > 0
      && current[0]!.responseOptionSetKey !== segment.responseOptionSetKey
    ) {
      current = [];
    }
    current.push(segment);
    if (current.length > longest.length) longest = [...current];
  }
  return Object.freeze({
    length: longest.length,
    segmentIds: Object.freeze(longest.map(({ segmentId }) => segmentId)),
  });
}

function longestHighIntensityRun(
  segments: readonly ArenaV2MapRouteVarietySegmentCandidateV1[],
): { readonly length: number; readonly segmentIds: readonly string[] } {
  let longest: readonly ArenaV2MapRouteVarietySegmentCandidateV1[] = [];
  let current: ArenaV2MapRouteVarietySegmentCandidateV1[] = [];
  for (const segment of segments) {
    if (segment.experienceIntensity < POLICY.highIntensityMinimum) current = [];
    else current.push(segment);
    if (current.length > longest.length) longest = [...current];
  }
  return Object.freeze({
    length: longest.length,
    segmentIds: Object.freeze(longest.map(({ segmentId }) => segmentId)),
  });
}

function createFinding(
  code: ArenaV2MapRouteVarietyFindingCodeCandidateV1,
  mapDefinitionId: string,
  segmentIds: readonly string[],
  observedCount: number,
  reviewThreshold: number,
): ArenaV2MapRouteVarietyFindingCandidateV1 {
  return Object.freeze({
    code,
    mapDefinitionId,
    segmentIds: Object.freeze([...segmentIds]),
    observedCount,
    reviewThreshold,
    provesPlayerDominantRoute: false as const,
    requiresDynamicRaceAndSurvivalEvidence: true as const,
  });
}

function createSegment(
  route: KzRouteDefinitionV2,
  segment: KzRouteSegmentV2,
  ordinal: number,
): ArenaV2MapRouteVarietySegmentCandidateV1 {
  const counterplay = requireArenaV2MapCounterplaySegmentCandidateV1(
    route.mapDefinitionId,
    segment.id,
  );
  const experience = requireArenaV2KzMapExperienceSegmentCandidateV1(
    route.mapDefinitionId,
    segment.id,
  );
  const responseOptionSet = sortedResponseOptions(segment.responseOptions);
  const responseOptionSetKey = responseOptionSet.join('+');
  const branchRoles = Object.freeze(segment.branches.map(({ role }) => role).sort());
  const learningSignatureHash = createDeterministicDataHash(
    Object.freeze({
      segmentKind: segment.kind,
      survivalRole: segment.survivalRole,
      responseOptionSet,
      hitRecovery: segment.hitRecovery,
      branchRoles,
    }),
    'Arena V2 map learning signature',
  );
  const contextSignatureHash = createDeterministicDataHash(
    Object.freeze({
      headingSector: headingSector(counterplay.headingX, counterplay.headingZ),
      elevationTrend: elevationTrend(counterplay.heightDelta),
      difficulty: difficultyTuple(segment.difficulty),
      responseWindowTicks: segment.responseWindowTicks,
      experienceBeat: experience.experienceBeat,
      experienceIntensity: experience.experienceIntensity,
      cycleOrdinal: experience.cycleOrdinal,
    }),
    'Arena V2 map learning context',
  );
  return Object.freeze({
    mapDefinitionId: route.mapDefinitionId,
    routeDefinitionId: route.id,
    segmentId: segment.id,
    ordinal,
    responseOptionSet,
    responseOptionSetKey,
    hasAuthoredBranchChoice: segment.branches.length > 1,
    hasMultipleAuthoredResponses: segment.responseOptions.length > 1,
    headingSector: headingSector(counterplay.headingX, counterplay.headingZ),
    elevationTrend: elevationTrend(counterplay.heightDelta),
    experienceBeat: experience.experienceBeat,
    experienceIntensity: experience.experienceIntensity,
    learningSignatureHash,
    contextSignatureHash,
  });
}

function createRepeatedLearningGroups(
  segments: readonly ArenaV2MapRouteVarietySegmentCandidateV1[],
): readonly ArenaV2MapRepeatedLearningGroupCandidateV1[] {
  const groups = new Map<string, ArenaV2MapRouteVarietySegmentCandidateV1[]>();
  for (const segment of segments) {
    const group = groups.get(segment.learningSignatureHash) ?? [];
    group.push(segment);
    groups.set(segment.learningSignatureHash, group);
  }
  return Object.freeze([...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([learningSignatureHash, group]) => {
      const contextVariantCount = new Set(group.map(({ contextSignatureHash }) => (
        contextSignatureHash
      ))).size;
      return Object.freeze({
        learningSignatureHash,
        segmentIds: Object.freeze(group.map(({ segmentId }) => segmentId)),
        contextVariantCount,
        containsUndifferentiatedRepeat: contextVariantCount < group.length,
      });
    }));
}

function createMapAudit(route: KzRouteDefinitionV2): ArenaV2MapRouteVarietyMapCandidateV1 {
  const segments = Object.freeze(route.segments.map((segment, index) => (
    createSegment(route, segment, index + 1)
  )));
  const experienceBeats = segments.map(({ experienceBeat }) => experienceBeat);
  const repeatedLearningGroups = createRepeatedLearningGroups(segments);
  const authoredBranchChoiceSegmentCount = segments.filter(({ hasAuthoredBranchChoice }) => (
    hasAuthoredBranchChoice
  )).length;
  const singleResponseSegments = segments.filter((segment) => (
    !segment.hasMultipleAuthoredResponses && !segment.hasAuthoredBranchChoice
  ));
  const responseSetRun = longestResponseSetRun(segments);
  const longestRepeatedResponseSetRun = responseSetRun.length;
  const highIntensityRun = longestHighIntensityRun(segments);
  const dominantHeadingSegmentCount = maxFrequency(
    segments.map(({ headingSector: value }) => value),
  );
  const findings: ArenaV2MapRouteVarietyFindingCandidateV1[] = [];
  if (authoredBranchChoiceSegmentCount === 0) {
    findings.push(createFinding(
      'no-authored-branch-choice',
      route.mapDefinitionId,
      segments.map(({ segmentId }) => segmentId),
      0,
      1,
    ));
  }
  if (
    dominantHeadingSegmentCount * POLICY.maximumDominantHeadingShareDenominator
    > segments.length * POLICY.maximumDominantHeadingShareNumerator
  ) {
    const dominantHeading = dominantValue(segments.map(({ headingSector: value }) => value));
    findings.push(createFinding(
      'heading-concentration-review',
      route.mapDefinitionId,
      segments.filter(({ headingSector: value }) => value === dominantHeading)
        .map(({ segmentId }) => segmentId),
      dominantHeadingSegmentCount,
      Math.floor(
        segments.length * POLICY.maximumDominantHeadingShareNumerator
        / POLICY.maximumDominantHeadingShareDenominator,
      ),
    ));
  }
  if (
    singleResponseSegments.length * POLICY.maximumSingleResponseShareDenominator
    > segments.length * POLICY.maximumSingleResponseShareNumerator
  ) {
    findings.push(createFinding(
      'single-response-concentration',
      route.mapDefinitionId,
      singleResponseSegments.map(({ segmentId }) => segmentId),
      singleResponseSegments.length,
      Math.floor(
        segments.length * POLICY.maximumSingleResponseShareNumerator
        / POLICY.maximumSingleResponseShareDenominator,
      ),
    ));
  }
  if (longestRepeatedResponseSetRun > POLICY.maximumRepeatedResponseSetRun) {
    findings.push(createFinding(
      'repeated-response-run',
      route.mapDefinitionId,
      responseSetRun.segmentIds,
      longestRepeatedResponseSetRun,
      POLICY.maximumRepeatedResponseSetRun,
    ));
  }
  for (const group of repeatedLearningGroups) {
    if (!group.containsUndifferentiatedRepeat) continue;
    findings.push(createFinding(
      'undifferentiated-learning-repeat',
      route.mapDefinitionId,
      group.segmentIds,
      group.segmentIds.length - group.contextVariantCount,
      0,
    ));
  }
  segments.forEach((segment, index) => {
    if (segment.experienceBeat !== 'climax' || index === 0) return;
    const previous = segments[index - 1]!;
    if (previous.experienceBeat === 'release'
      || previous.experienceIntensity <= POLICY.preClimaxBreatherMaximumIntensity) return;
    findings.push(createFinding(
      'missing-pre-climax-breather',
      route.mapDefinitionId,
      [previous.segmentId, segment.segmentId],
      previous.experienceIntensity,
      POLICY.preClimaxBreatherMaximumIntensity,
    ));
  });
  if (highIntensityRun.length > POLICY.maximumHighIntensityRun) {
    findings.push(createFinding(
      'sustained-high-intensity-run',
      route.mapDefinitionId,
      highIntensityRun.segmentIds,
      highIntensityRun.length,
      POLICY.maximumHighIntensityRun,
    ));
  }
  const routeVarietyFingerprint = Object.freeze({
    segmentKinds: route.segments.map(({ kind }) => kind),
    responseOptionSets: segments.map(({ responseOptionSetKey }) => responseOptionSetKey),
    headings: segments.map(({ headingSector: value }) => value),
    elevationTrends: segments.map(({ elevationTrend: value }) => value),
    branchChoiceOrdinals: segments.filter(({ hasAuthoredBranchChoice }) => hasAuthoredBranchChoice)
      .map(({ ordinal }) => ordinal),
    experienceBeats,
  });
  return Object.freeze({
    mapDefinitionId: route.mapDefinitionId,
    routeDefinitionId: route.id,
    segmentCount: segments.length,
    distinctSegmentKindCount: new Set(route.segments.map(({ kind }) => kind)).size,
    distinctResponseOptionSetCount: new Set(
      segments.map(({ responseOptionSetKey }) => responseOptionSetKey),
    ).size,
    distinctHeadingSectorCount: new Set(segments.map(({ headingSector: value }) => value)).size,
    distinctElevationTrendCount: new Set(
      segments.map(({ elevationTrend: value }) => value),
    ).size,
    distinctExperienceBeatCount: new Set(experienceBeats).size,
    authoredBranchChoiceSegmentCount,
    singleResponseSegmentCount: singleResponseSegments.length,
    longestSingleResponseRun: longestSingleResponseRun(segments),
    longestRepeatedResponseSetRun,
    dominantHeadingSegmentCount,
    repeatedLearningGroups,
    findings: Object.freeze(findings),
    segments,
    routeVarietyFingerprintHash: createDeterministicDataHash(
      routeVarietyFingerprint,
      'Arena V2 map route variety fingerprint',
    ),
  });
}

export function projectArenaV2MapRouteVarietyAuditCandidateV1(): {
  readonly schemaVersion:
    typeof ARENA_V2_MAP_ROUTE_VARIETY_AUDIT_CANDIDATE_V1_SCHEMA_VERSION;
  readonly status: 'production-unreachable';
  readonly implementationStatus: 'code-written-not-run';
  readonly hardGate: false;
  readonly validationStatus: 'not-run';
  readonly mapCount: 2;
  readonly segmentCount: 20;
  readonly inputChannelsRemainDirectionAndJumpOnly: true;
  readonly mutatesRouteDefinitions: false;
  readonly producesAutomaticTuning: false;
  readonly provesRouteBalance: false;
  readonly requiresDynamicRaceAndSurvivalEvidence: true;
  readonly hasRouteVarietyFingerprintCollision: boolean;
  readonly maps: readonly ArenaV2MapRouteVarietyMapCandidateV1[];
  readonly findings: readonly ArenaV2MapRouteVarietyFindingCandidateV1[];
  readonly contentHash: string;
} {
  const maps = Object.freeze(ROUTES.map(createMapAudit));
  if (maps.length !== 2 || maps.reduce((sum, map) => sum + map.segmentCount, 0) !== 20) {
    throw new RangeError('Arena V2地图路线多样性审计必须精确覆盖2张地图与20个段落。');
  }
  const hasRouteVarietyFingerprintCollision = new Set(
    maps.map(({ routeVarietyFingerprintHash }) => routeVarietyFingerprintHash),
  ).size !== maps.length;
  const findings = Object.freeze(maps.flatMap(({ findings: mapFindings }) => mapFindings));
  const authority = Object.freeze({
    schemaVersion: ARENA_V2_MAP_ROUTE_VARIETY_AUDIT_CANDIDATE_V1_SCHEMA_VERSION,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    hardGate: false as const,
    validationStatus: 'not-run' as const,
    mapCount: 2 as const,
    segmentCount: 20 as const,
    inputChannelsRemainDirectionAndJumpOnly: true as const,
    mutatesRouteDefinitions: false as const,
    producesAutomaticTuning: false as const,
    provesRouteBalance: false as const,
    requiresDynamicRaceAndSurvivalEvidence: true as const,
    hasRouteVarietyFingerprintCollision,
    maps,
    findings,
  });
  return Object.freeze({
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena V2 Map Route Variety Audit Candidate V1',
    ),
  });
}

export const ARENA_V2_MAP_ROUTE_VARIETY_AUDIT_CANDIDATE_V1 =
  projectArenaV2MapRouteVarietyAuditCandidateV1();
