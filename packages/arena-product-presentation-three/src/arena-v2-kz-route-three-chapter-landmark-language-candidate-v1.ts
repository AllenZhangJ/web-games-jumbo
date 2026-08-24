import {
  assertKnownKeys,
  assertPlainRecord,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_GRAMMAR_IDS_CANDIDATE_V1,
  type ArenaV2KzRouteChapterLandmarkGrammarCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';
import type {
  ArenaV2KzRouteThreeShapeTransformCandidateV1,
} from './arena-v2-kz-route-three-shape-language-candidate-v1.js';

export interface ArenaV2KzRouteThreeChapterLandmarkCandidateV1 {
  readonly schemaVersion: 1;
  readonly sourceContentHash: string;
  readonly landmarkGrammar: ArenaV2KzRouteChapterLandmarkGrammarCandidateV1;
  readonly chapterBoundary: boolean;
  readonly transform: ArenaV2KzRouteThreeShapeTransformCandidateV1;
  readonly chapterShapeIdentity: string;
  readonly colorIsNeverSoleSignal: true;
}

const RESOLVE_KEYS = new Set(['landmarkGrammar', 'chapterBoundary']);
const CHAPTER_BOUNDARY_UNIFORM_MULTIPLIER = 1.04;
const MAXIMUM_ABSOLUTE_ROTATION_RADIANS = Math.PI / 6;

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function transform(
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  rotationXRadians = 0,
  rotationYRadians = 0,
  rotationZRadians = 0,
): ArenaV2KzRouteThreeShapeTransformCandidateV1 {
  for (const [key, value] of Object.entries({ scaleX, scaleY, scaleZ })) {
    if (!Number.isFinite(value) || value < 0.9 || value > 1.18) {
      throw new RangeError(`Arena V2 KZ章节地标${key}超出静态表现边界。`);
    }
  }
  for (const [key, value] of Object.entries({
    rotationXRadians,
    rotationYRadians,
    rotationZRadians,
  })) {
    if (!Number.isFinite(value) || Math.abs(value) > MAXIMUM_ABSOLUTE_ROTATION_RADIANS) {
      throw new RangeError(`Arena V2 KZ章节地标${key}超出静态表现边界。`);
    }
  }
  return Object.freeze({
    scaleX,
    scaleY,
    scaleZ,
    rotationXRadians,
    rotationYRadians,
    rotationZRadians,
  });
}

const CHAPTER_PROFILES = Object.freeze({
  'open-runway-frame': transform(1.08, 0.94, 0.98, 0, 0, -Math.PI / 24),
  'split-decision-crown': transform(1.1, 1.04, 0.92, 0, Math.PI / 12, 0),
  'raised-rhythm-stack': transform(0.94, 1.12, 1.02, -Math.PI / 18, 0, 0),
  'reversal-crossbar': transform(1.12, 0.96, 1.06, 0, -Math.PI / 12, 0),
  'terminal-gate': transform(0.96, 1.1, 1.1, 0, 0, Math.PI / 24),
}) satisfies Readonly<Record<
  ArenaV2KzRouteChapterLandmarkGrammarCandidateV1,
  ArenaV2KzRouteThreeShapeTransformCandidateV1
>>;

const CORE = Object.freeze({
  schemaVersion: 1 as const,
  identity: 'arena-v2.kz-route-three-chapter-landmark-language.candidate.v1' as const,
  chapterProfiles: Object.freeze(
    ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_GRAMMAR_IDS_CANDIDATE_V1.map((id) => (
      Object.freeze({ landmarkGrammar: id, transform: CHAPTER_PROFILES[id] })
    )),
  ),
  chapterBoundaryUniformMultiplier: CHAPTER_BOUNDARY_UNIFORM_MULTIPLIER,
});
const CONTENT_HASH = createDeterministicDataHash(
  CORE,
  'Arena V2 KZ route Three chapter landmark language candidate V1',
);

function requireLandmarkGrammar(
  value: unknown,
): ArenaV2KzRouteChapterLandmarkGrammarCandidateV1 {
  if (typeof value !== 'string'
    || !ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_GRAMMAR_IDS_CANDIDATE_V1.includes(
      value as ArenaV2KzRouteChapterLandmarkGrammarCandidateV1,
    )) {
    throw new RangeError(`Arena V2 KZ Three未知章节地标语法：${String(value)}。`);
  }
  return value as ArenaV2KzRouteChapterLandmarkGrammarCandidateV1;
}

export function resolveArenaV2KzRouteThreeChapterLandmarkLanguageCandidateV1(
  value: unknown,
): ArenaV2KzRouteThreeChapterLandmarkCandidateV1 {
  const input = assertPlainRecord(value, 'Arena V2 KZ Three章节地标解析输入');
  if (Object.getOwnPropertySymbols(input).length !== 0) {
    throw new TypeError('Arena V2 KZ Three章节地标解析输入不能包含Symbol键。');
  }
  assertKnownKeys(input, RESOLVE_KEYS, 'Arena V2 KZ Three章节地标解析输入');
  for (const key of RESOLVE_KEYS) dataField(input, key, 'Arena V2 KZ Three章节地标解析输入');
  const landmarkGrammar = requireLandmarkGrammar(input.landmarkGrammar);
  if (typeof input.chapterBoundary !== 'boolean') {
    throw new TypeError('Arena V2 KZ Three章节地标chapterBoundary必须是boolean。');
  }
  const profile = CHAPTER_PROFILES[landmarkGrammar];
  const multiplier = input.chapterBoundary ? CHAPTER_BOUNDARY_UNIFORM_MULTIPLIER : 1;
  const resolvedTransform = transform(
    profile.scaleX * multiplier,
    profile.scaleY * multiplier,
    profile.scaleZ * multiplier,
    profile.rotationXRadians,
    profile.rotationYRadians,
    profile.rotationZRadians,
  );
  const identityCore = Object.freeze({
    sourceContentHash: CONTENT_HASH,
    landmarkGrammar,
    chapterBoundary: input.chapterBoundary,
    transform: resolvedTransform,
  });
  return Object.freeze({
    schemaVersion: 1 as const,
    ...identityCore,
    chapterShapeIdentity: createDeterministicDataHash(
      identityCore,
      `Arena V2 KZ Three chapter ${landmarkGrammar}/${String(input.chapterBoundary)}`,
    ),
    colorIsNeverSoleSignal: true as const,
  });
}

const RESOLVED_SIGNATURES = new Set(
  ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_GRAMMAR_IDS_CANDIDATE_V1.flatMap((landmarkGrammar) => (
    [false, true].map((chapterBoundary) => JSON.stringify(
      resolveArenaV2KzRouteThreeChapterLandmarkLanguageCandidateV1({
        landmarkGrammar,
        chapterBoundary,
      }).transform,
    ))
  )),
);
if (RESOLVED_SIGNATURES.size
  !== ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_GRAMMAR_IDS_CANDIDATE_V1.length * 2) {
  throw new RangeError('Arena V2 KZ Three章节地标几何签名不唯一。');
}

export const ARENA_V2_KZ_ROUTE_THREE_CHAPTER_LANDMARK_LANGUAGE_CANDIDATE_V1 =
  Object.freeze({
    ...CORE,
    contentHash: CONTENT_HASH,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    landmarkGrammarCount:
      ARENA_V2_KZ_ROUTE_CHAPTER_LANDMARK_GRAMMAR_IDS_CANDIDATE_V1.length,
    chapterBoundaryVariantCount: 2 as const,
    exactTransformCount: RESOLVED_SIGNATURES.size,
    usesExistingAuthoredSegmentEntryCueOnly: true as const,
    createsGeometryMaterialsTexturesOrDrawCalls: false as const,
    changesParentPositionCollisionRouteOrAuthority: false as const,
    usesColorAsSoleSignal: false as const,
    usesWallClockRandomOrAnimation: false as const,
    defaultEntryWired: false as const,
  });
