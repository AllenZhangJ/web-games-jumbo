import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
  ARENA_V2_KZ_MAP_EXPERIENCE_CATALOG_CANDIDATE_V1,
  ARENA_V2_KZ_MAP_EXPERIENCE_SEGMENTS_CANDIDATE_V1,
  ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
} from '@number-strategy-jump/arena-product-content';
import type { KzRouteDefinitionV2 } from '@number-strategy-jump/arena-definitions';

export const ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_GRAMMAR_IDS_CANDIDATE_V1 =
  Object.freeze([
    'open-runway-frame',
    'split-decision-crown',
    'raised-rhythm-stack',
    'reversal-crossbar',
    'terminal-gate',
  ] as const);

export type ArenaV2KzRouteChapterLandmarkGrammarCandidateV1 =
  typeof ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_GRAMMAR_IDS_CANDIDATE_V1[number];

export interface ArenaV2KzRouteChapterLandmarkCandidateV1 {
  readonly schemaVersion: 1;
  readonly mapDefinitionId: string;
  readonly routeDefinitionId: string;
  readonly chapterId: string;
  readonly chapterOrdinal: 1 | 2 | 3 | 4;
  readonly landmarkGrammar: ArenaV2KzRouteChapterLandmarkGrammarCandidateV1;
  readonly startSegmentOrdinal: number;
  readonly endSegmentOrdinal: number;
  readonly segmentIds: readonly string[];
  readonly experienceBeatSequence: readonly string[];
  readonly chapterBoundarySegmentId: string;
  readonly usesExistingAuthoredSegmentEntryCue: true;
  readonly changesRouteOrAuthority: false;
  readonly colorIsNeverSoleSignal: true;
  readonly contentHash: string;
}

export interface ArenaV2KzRouteChapterLandmarkMapCandidateV1 {
  readonly schemaVersion: 1;
  readonly mapDefinitionId: string;
  readonly routeDefinitionId: string;
  readonly routeContentHash: string;
  readonly mapExperienceCatalogContentHash: string;
  readonly segmentIds: readonly string[];
  readonly chapters: readonly ArenaV2KzRouteChapterLandmarkCandidateV1[];
  readonly contentHash: string;
}

interface ChapterSpec {
  readonly chapterId: string;
  readonly startSegmentOrdinal: number;
  readonly endSegmentOrdinal: number;
  readonly landmarkGrammar: ArenaV2KzRouteChapterLandmarkGrammarCandidateV1;
}

interface RouteChapterSource {
  readonly route: KzRouteDefinitionV2;
  readonly chapterSpecs: readonly ChapterSpec[];
}

const RESOLVE_KEYS = new Set([
  'mapDefinitionId',
  'routeDefinitionId',
  'routeContentHash',
  'mapExperienceCatalogContentHash',
  'segmentIds',
]);

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function frozenUniqueStrings(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RangeError(`${name}必须是非空数组。`);
  }
  const result = value.map((entry, index) => assertNonEmptyString(entry, `${name}[${index}]`));
  if (new Set(result).size !== result.length) throw new RangeError(`${name}不能重复。`);
  return Object.freeze(result);
}

const BASE_CHAPTER_SPECS = Object.freeze([
  Object.freeze({
    chapterId: 'base-launch-and-rise',
    startSegmentOrdinal: 1,
    endSegmentOrdinal: 3,
    landmarkGrammar: 'open-runway-frame',
  }),
  Object.freeze({
    chapterId: 'base-first-choice-climax',
    startSegmentOrdinal: 4,
    endSegmentOrdinal: 6,
    landmarkGrammar: 'split-decision-crown',
  }),
  Object.freeze({
    chapterId: 'base-reset-and-high-read',
    startSegmentOrdinal: 7,
    endSegmentOrdinal: 9,
    landmarkGrammar: 'raised-rhythm-stack',
  }),
  Object.freeze({
    chapterId: 'base-terminal-control',
    startSegmentOrdinal: 10,
    endSegmentOrdinal: 12,
    landmarkGrammar: 'terminal-gate',
  }),
] as const satisfies readonly ChapterSpec[]);

const SWITCHBACK_CHAPTER_SPECS = Object.freeze([
  Object.freeze({
    chapterId: 'switchback-eastbound-launch',
    startSegmentOrdinal: 1,
    endSegmentOrdinal: 2,
    landmarkGrammar: 'open-runway-frame',
  }),
  Object.freeze({
    chapterId: 'switchback-rise-and-turn',
    startSegmentOrdinal: 3,
    endSegmentOrdinal: 4,
    landmarkGrammar: 'raised-rhythm-stack',
  }),
  Object.freeze({
    chapterId: 'switchback-reversal-and-descent',
    startSegmentOrdinal: 5,
    endSegmentOrdinal: 6,
    landmarkGrammar: 'reversal-crossbar',
  }),
  Object.freeze({
    chapterId: 'switchback-north-close',
    startSegmentOrdinal: 7,
    endSegmentOrdinal: 8,
    landmarkGrammar: 'terminal-gate',
  }),
] as const satisfies readonly ChapterSpec[]);

const ROUTE_SOURCES = Object.freeze([
  Object.freeze({
    route: ARENA_V2_KZ_BASE_ROUTE_DEFINITION_CANDIDATE_V2,
    chapterSpecs: BASE_CHAPTER_SPECS,
  }),
  Object.freeze({
    route: ARENA_V2_KZ_SWITCHBACK_ROUTE_DEFINITION_CANDIDATE_V2,
    chapterSpecs: SWITCHBACK_CHAPTER_SPECS,
  }),
] as const satisfies readonly RouteChapterSource[]);

function routeContentHash(route: KzRouteDefinitionV2): string {
  return createDeterministicDataHash(
    route,
    `Arena V2 KZ route presentation ${route.id}`,
  );
}

function createMapCatalog(
  source: RouteChapterSource,
): ArenaV2KzRouteChapterLandmarkMapCandidateV1 {
  const { route, chapterSpecs } = source;
  if (chapterSpecs.length !== 4) {
    throw new RangeError(`Arena V2 KZ地图${route.mapDefinitionId}必须精确形成4个章节。`);
  }
  const expectedOrdinals = route.segments.map((_, index) => index + 1);
  const coveredOrdinals = chapterSpecs.flatMap((chapter) => {
    if (chapter.startSegmentOrdinal > chapter.endSegmentOrdinal) {
      throw new RangeError(`Arena V2 KZ章节${chapter.chapterId}范围倒置。`);
    }
    return Array.from(
      { length: chapter.endSegmentOrdinal - chapter.startSegmentOrdinal + 1 },
      (_, index) => chapter.startSegmentOrdinal + index,
    );
  });
  if (coveredOrdinals.length !== expectedOrdinals.length
    || coveredOrdinals.some((ordinal, index) => ordinal !== expectedOrdinals[index])) {
    throw new RangeError(`Arena V2 KZ地图${route.mapDefinitionId}章节未连续覆盖全部段落。`);
  }
  const grammars = chapterSpecs.map(({ landmarkGrammar }) => landmarkGrammar);
  const chapterIds = chapterSpecs.map(({ chapterId }) => chapterId);
  if (new Set(grammars).size !== grammars.length) {
    throw new RangeError(`Arena V2 KZ地图${route.mapDefinitionId}章节地标语法必须各自唯一。`);
  }
  if (new Set(chapterIds).size !== chapterIds.length) {
    throw new RangeError(`Arena V2 KZ地图${route.mapDefinitionId}章节身份必须各自唯一。`);
  }
  const chapters = Object.freeze(chapterSpecs.map((spec, index) => {
    const segments = route.segments.slice(
      spec.startSegmentOrdinal - 1,
      spec.endSegmentOrdinal,
    );
    const experienceSegments = segments.map((segment) => {
      const matches = ARENA_V2_KZ_MAP_EXPERIENCE_SEGMENTS_CANDIDATE_V1.filter((entry) => (
        entry.mapDefinitionId === route.mapDefinitionId
        && entry.routeDefinitionId === route.id
        && entry.segmentId === segment.id
      ));
      if (matches.length !== 1) {
        throw new RangeError(`Arena V2 KZ章节${spec.chapterId}缺少唯一体验段${segment.id}。`);
      }
      return matches[0]!;
    });
    const authority = Object.freeze({
      schemaVersion: 1 as const,
      mapDefinitionId: route.mapDefinitionId,
      routeDefinitionId: route.id,
      chapterId: spec.chapterId,
      chapterOrdinal: (index + 1) as 1 | 2 | 3 | 4,
      landmarkGrammar: spec.landmarkGrammar,
      startSegmentOrdinal: spec.startSegmentOrdinal,
      endSegmentOrdinal: spec.endSegmentOrdinal,
      segmentIds: Object.freeze(segments.map(({ id }) => id)),
      experienceBeatSequence: Object.freeze(
        experienceSegments.map(({ experienceBeat }) => experienceBeat),
      ),
      chapterBoundarySegmentId: segments[0]!.id,
      usesExistingAuthoredSegmentEntryCue: true as const,
      changesRouteOrAuthority: false as const,
      colorIsNeverSoleSignal: true as const,
    });
    return Object.freeze({
      ...authority,
      contentHash: createDeterministicDataHash(
        authority,
        `Arena V2 KZ route chapter ${spec.chapterId}`,
      ),
    });
  }));
  const authority = Object.freeze({
    schemaVersion: 1 as const,
    mapDefinitionId: route.mapDefinitionId,
    routeDefinitionId: route.id,
    routeContentHash: routeContentHash(route),
    mapExperienceCatalogContentHash:
      ARENA_V2_KZ_MAP_EXPERIENCE_CATALOG_CANDIDATE_V1.contentHash,
    segmentIds: Object.freeze(route.segments.map(({ id }) => id)),
    chapters,
  });
  return Object.freeze({
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      `Arena V2 KZ route chapter map ${route.mapDefinitionId}`,
    ),
  });
}

export const ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_MAPS_CANDIDATE_V1 = Object.freeze(
  ROUTE_SOURCES.map(createMapCatalog),
);

export function resolveArenaV2KzRouteChapterLandmarkMapCandidateV1(
  value: unknown,
): ArenaV2KzRouteChapterLandmarkMapCandidateV1 | null {
  const input = assertPlainRecord(value, 'Arena V2 KZ章节地标目录解析输入');
  if (Object.getOwnPropertySymbols(input).length !== 0) {
    throw new TypeError('Arena V2 KZ章节地标目录解析输入不能包含Symbol键。');
  }
  assertKnownKeys(input, RESOLVE_KEYS, 'Arena V2 KZ章节地标目录解析输入');
  for (const key of RESOLVE_KEYS) dataField(input, key, 'Arena V2 KZ章节地标目录解析输入');
  const mapDefinitionId = assertNonEmptyString(
    input.mapDefinitionId,
    'Arena V2 KZ章节地标目录解析输入.mapDefinitionId',
  );
  const routeDefinitionId = assertNonEmptyString(
    input.routeDefinitionId,
    'Arena V2 KZ章节地标目录解析输入.routeDefinitionId',
  );
  const mapMatches = ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_MAPS_CANDIDATE_V1.filter((map) => (
    map.mapDefinitionId === mapDefinitionId
  ));
  const routeMatches = ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_MAPS_CANDIDATE_V1.filter((map) => (
    map.routeDefinitionId === routeDefinitionId
  ));
  if (mapMatches.length === 0 && routeMatches.length === 0) return null;
  if (mapMatches.length !== 1 || routeMatches.length !== 1 || mapMatches[0] !== routeMatches[0]) {
    throw new RangeError('Arena V2 KZ章节地标地图与路线身份漂移。');
  }
  const map = mapMatches[0]!;
  const segmentIds = frozenUniqueStrings(
    input.segmentIds,
    'Arena V2 KZ章节地标目录解析输入.segmentIds',
  );
  if (input.routeContentHash !== map.routeContentHash
    || input.mapExperienceCatalogContentHash !== map.mapExperienceCatalogContentHash
    || segmentIds.length !== map.segmentIds.length
    || segmentIds.some((segmentId, index) => segmentId !== map.segmentIds[index])) {
    throw new RangeError('Arena V2 KZ章节地标来源Definition或体验目录身份漂移。');
  }
  return map;
}

const ALL_CHAPTERS = ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_MAPS_CANDIDATE_V1.flatMap(
  ({ chapters }) => chapters,
);
const ALL_SEGMENT_IDENTITIES = ALL_CHAPTERS.flatMap(({ mapDefinitionId, segmentIds }) => (
  segmentIds.map((segmentId) => `${mapDefinitionId}\u0000${segmentId}`)
));
const ALL_CHAPTER_IDENTITIES = ALL_CHAPTERS.map(({ mapDefinitionId, chapterId }) => (
  `${mapDefinitionId}\u0000${chapterId}`
));
if (ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_MAPS_CANDIDATE_V1.length !== 2
  || ALL_CHAPTERS.length !== 8
  || ALL_SEGMENT_IDENTITIES.length !== 20
  || new Set(ALL_SEGMENT_IDENTITIES).size !== 20
  || new Set(ALL_CHAPTER_IDENTITIES).size !== 8) {
  throw new RangeError('Arena V2 KZ章节地标目录必须精确覆盖2图、8章、20段。');
}

const CORE = Object.freeze({
  schemaVersion: 1 as const,
  identity: 'arena-v2.kz-route-chapter-landmark-catalog.candidate.v1' as const,
  sourceMapExperienceCatalogContentHash:
    ARENA_V2_KZ_MAP_EXPERIENCE_CATALOG_CANDIDATE_V1.contentHash,
  maps: ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_MAPS_CANDIDATE_V1,
});

export const ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_CATALOG_CANDIDATE_V1 = Object.freeze({
  ...CORE,
  contentHash: createDeterministicDataHash(
    CORE,
    'Arena V2 KZ route chapter landmark catalog candidate V1',
  ),
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  mapCount: 2 as const,
  chapterCount: 8 as const,
  chapterCountPerMap: 4 as const,
  segmentCount: 20 as const,
  segmentCountsByMap: Object.freeze([12, 8] as const),
  usesDefinitionAndExperienceOrdinalOnly: true as const,
  readsPlayerRuntimeOrFutureState: false as const,
  changesRouteOrAuthority: false as const,
  defaultEntryWired: false as const,
});
