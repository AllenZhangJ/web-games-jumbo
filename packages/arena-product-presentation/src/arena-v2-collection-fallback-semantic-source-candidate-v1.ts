import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import type { WeaponCoreVerbV1 } from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';

export interface ArenaV2CollectionFallbackWeaponSemanticSourceCandidateV1 {
  readonly weaponDefinitionId: string;
  readonly collectionOrder: number;
  readonly coreVerb: WeaponCoreVerbV1;
}

export interface ArenaV2CollectionFallbackMapSemanticSourceCandidateV1 {
  readonly mapDefinitionId: string;
  readonly routeDefinitionId: string;
  readonly collectionOrder: 1 | 2;
  readonly segmentCount: 8 | 12;
  readonly pacingArc:
    | 'two-cycle-branch-escalation'
    | 'cardinal-switchback-sawtooth';
  readonly routeRhythm: readonly string[];
  readonly landmarkCues: readonly string[];
  readonly leadingLineCues: readonly string[];
  readonly peakLandmarkCue: string;
  readonly primaryLeadingLineCue: string;
}

function mapSemanticSource(
  map: (typeof ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps)[number],
  index: number,
): ArenaV2CollectionFallbackMapSemanticSourceCandidateV1 {
  const collectionOrder = index + 1;
  if (collectionOrder !== 1 && collectionOrder !== 2) {
    throw new RangeError('A6.18地图收藏顺序只能是1或2。');
  }
  const expectedSegmentCount = collectionOrder === 1 ? 12 as const : 8 as const;
  const expectedPacingArc = collectionOrder === 1
    ? 'two-cycle-branch-escalation' as const
    : 'cardinal-switchback-sawtooth' as const;
  if (map.segments.length !== expectedSegmentCount) {
    throw new RangeError(
      `A6.18地图${map.mapDefinitionId}必须闭合既有${expectedSegmentCount}段体验目录。`,
    );
  }
  const pacingArcs = new Set(map.segments.map(({ pacingArc }) => pacingArc));
  if (pacingArcs.size !== 1 || !pacingArcs.has(expectedPacingArc)) {
    throw new RangeError(`A6.18地图${map.mapDefinitionId}的顺序、段数与路线节奏身份不闭合。`);
  }
  const peakSegment = map.segments.reduce((current, segment) => (
    segment.experienceIntensity > current.experienceIntensity ? segment : current
  ));
  return Object.freeze({
    mapDefinitionId: map.mapDefinitionId,
    routeDefinitionId: map.routeDefinitionId,
    collectionOrder,
    segmentCount: expectedSegmentCount,
    pacingArc: expectedPacingArc,
    routeRhythm: Object.freeze(map.segments.map((segment) => (
      `${segment.ordinal}:${segment.experienceBeat}:${segment.experienceIntensity}`
    ))),
    landmarkCues: Object.freeze(map.segments.map(({ landmarkCue }) => landmarkCue)),
    leadingLineCues: Object.freeze(map.segments.map(({ leadingLineCue }) => leadingLineCue)),
    peakLandmarkCue: peakSegment.landmarkCue,
    primaryLeadingLineCue: map.segments[0]!.leadingLineCue,
  });
}

const WEAPONS = Object.freeze(
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons.map((weapon) => (
    Object.freeze({
      weaponDefinitionId: weapon.weaponDefinitionId,
      collectionOrder: weapon.collectionOrder,
      coreVerb: weapon.coreVerb,
    })
  )),
);

const MAPS = Object.freeze(
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps.map(mapSemanticSource),
);

if (
  WEAPONS.length !== 20
  || MAPS.length !== 2
  || new Set(WEAPONS.map(({ weaponDefinitionId }) => weaponDefinitionId)).size !== 20
  || new Set(MAPS.map(({ mapDefinitionId }) => mapDefinitionId)).size !== 2
  || MAPS.reduce((total, { segmentCount }) => total + segmentCount, 0) !== 20
) {
  throw new RangeError('A6.18收藏语义来源必须闭合20武器、2地图和20段体验。');
}

const AUTHORITY = Object.freeze({
  schemaVersion: 1 as const,
  stage: 'A6.18' as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  ownerId: 'arena-v2-information-content-read-catalog' as const,
  sourceCatalogContentHash:
    ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.contentHash,
  weaponCount: 20 as const,
  mapCount: 2 as const,
  mapSegmentCount: 20 as const,
  grantsAssetApproval: false as const,
  readsRulesAtRenderTime: false as const,
  weapons: WEAPONS,
  maps: MAPS,
});

export const ARENA_V2_COLLECTION_FALLBACK_SEMANTIC_SOURCE_CANDIDATE_V1 =
  Object.freeze({
    ...AUTHORITY,
    contentHash: createDeterministicDataHash(
      AUTHORITY,
      'Arena V2 A6.18 Collection Fallback Semantic Source Candidate V1',
    ),
  });
