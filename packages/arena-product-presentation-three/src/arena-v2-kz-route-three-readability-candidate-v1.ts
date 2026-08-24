import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaV2KzRouteChapterLandmarkGrammarCandidateV1,
  ArenaV2KzRoutePresentationCueCandidateV1,
  ArenaV2KzRoutePresentationProjectionCandidateV1,
  ArenaV2KzRouteSegmentShapeReadCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  resolveArenaV2KzRouteChapterLandmarkMapCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';
import * as THREE from 'three';
import {
  ARENA_V2_KZ_ROUTE_THREE_CHAPTER_LANDMARK_LANGUAGE_CANDIDATE_V1,
  resolveArenaV2KzRouteThreeChapterLandmarkLanguageCandidateV1,
  type ArenaV2KzRouteThreeChapterLandmarkCandidateV1,
} from './arena-v2-kz-route-three-chapter-landmark-language-candidate-v1.js';
import {
  ARENA_V2_KZ_ROUTE_THREE_SHAPE_LANGUAGE_CANDIDATE_V1,
  resolveArenaV2KzRouteThreeShapeLanguageCandidateV1,
  type ArenaV2KzRouteThreeResolvedShapeLanguageCandidateV1,
} from './arena-v2-kz-route-three-shape-language-candidate-v1.js';

export const ARENA_V2_KZ_ROUTE_THREE_READABILITY_STATE_CANDIDATE_V1 = Object.freeze({
  ACTIVE: 'active',
  PAUSED: 'paused',
  DESTROY_INCOMPLETE: 'destroy-incomplete',
  DESTROYED: 'destroyed',
} as const);

type ReadabilityState = typeof ARENA_V2_KZ_ROUTE_THREE_READABILITY_STATE_CANDIDATE_V1[
  keyof typeof ARENA_V2_KZ_ROUTE_THREE_READABILITY_STATE_CANDIDATE_V1
];

interface BoundNode {
  readonly node: THREE.Object3D;
  readonly baseScale: THREE.Vector3;
  readonly baseQuaternion: THREE.Quaternion;
}

interface TransformCleanupRecord {
  readonly binding: BoundNode;
  scaleRestored: boolean;
  quaternionRestored: boolean;
}

interface ActiveCue {
  readonly cue: ArenaV2KzRoutePresentationCueCandidateV1;
  readonly expiresAtTick: number;
}

interface SegmentChapterBinding {
  readonly chapterId: string;
  readonly chapterOrdinal: number;
  readonly landmarkGrammar: ArenaV2KzRouteChapterLandmarkGrammarCandidateV1;
  readonly chapterBoundary: boolean;
  readonly shape: ArenaV2KzRouteThreeChapterLandmarkCandidateV1;
}

interface ParsedProjectionIdentity {
  readonly projection: ArenaV2KzRoutePresentationProjectionCandidateV1;
  readonly tick: number;
  readonly mapDefinitionId: string;
  readonly routeDefinitionId: string;
  readonly routeContentHash: string;
  readonly mapExperienceCatalogContentHash: string;
  readonly segmentIds: readonly string[];
  readonly segmentShapeCatalog: readonly ArenaV2KzRouteSegmentShapeReadCandidateV1[];
  readonly surfaceIds: readonly string[];
  readonly finishAnchorId: string;
}

const OPTION_KEYS = new Set(['mapObject', 'projection']);
const PROJECTION_KEYS = new Set([
  'schemaVersion', 'status', 'implementationStatus', 'source', 'route',
  'local', 'mode', 'cues', 'governance',
]);
const SOURCE_KEYS = new Set([
  'matchSeed', 'tick', 'eventSequence', 'modeDefinitionId', 'mapDefinitionId',
]);
const ROUTE_KEYS = new Set([
  'routeDefinitionId', 'routeContentHash', 'mapDefinitionId', 'segmentCount',
  'mapExperienceCatalogContentHash',
  'segmentIds', 'segmentShapeCatalog', 'surfaceIds', 'finishAnchorId', 'environmentIdentity',
  'environmentContentHash', 'routeAccentColor', 'mapVisualAssetId', 'mapAssetMaturity',
]);
const SEGMENT_SHAPE_KEYS = new Set([
  'segmentId', 'ordinal', 'landmarkSurfaceId', 'guidanceShape', 'riskShape',
  'colorIsNeverSoleSignal',
]);
const LOCAL_KEYS = new Set([
  'participantId', 'participantStatus', 'grounded', 'supportSurfaceId', 'currentSegment',
]);
const CURRENT_SEGMENT_KEYS = new Set([
  'id', 'ordinal', 'segmentCount', 'kind', 'lessonId', 'remixId', 'survivalRole',
  'responseOptions', 'responseWindowTicks', 'hitRecovery', 'respawnAnchorId',
  'currentBranchId', 'pacingArc', 'cycleOrdinal', 'experienceBeat',
  'experienceIntensity', 'landmarkCue', 'landmarkAnchorId', 'landmarkSurfaceId',
  'leadingLineCue', 'memoryHook', 'raceRead', 'survivalRead',
  'colorIsNeverSoleSignal', 'guidanceShape', 'riskShape',
]);
const CUE_KEYS = new Set([
  'id', 'kind', 'sourceEventId', 'tick', 'sequence', 'participantId', 'anchorId',
  'supportSurfaceId', 'readyTick', 'progressOrdinal', 'fallCount', 'terminal',
  'shape', 'text', 'colorIsNeverSoleSignal',
]);
const CUE_KINDS: ReadonlySet<unknown> = new Set([
  'support-lost',
  'respawn-scheduled',
  'respawned',
  'safe-anchor-committed',
  'finish-claimed',
  'survival-fall-counted',
]);
const EXPERIENCE_BEATS: ReadonlySet<unknown> = new Set([
  'introduce', 'develop', 'twist', 'test', 'climax', 'release', 'resolution',
]);
const TOP_CAP_NAME = 'ArenaV2TopCap';
const SEGMENT_ENTRY_NAME = 'ArenaV2SegmentEntryCue';
const FINISH_GATE_NAME = 'ArenaV2FinishGate';
const MAXIMUM_ACTIVE_CUES = 32;
const MAXIMUM_RECENT_CUE_IDENTITIES = 64;
const NORMAL_UNIFORM_CUE_RELATIVE_MAXIMUM_DELTA = 0.28;
const REDUCED_MOTION_UNIFORM_CUE_RELATIVE_MAXIMUM_DELTA = 0.12;

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function uniqueStringArray(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError(`${name}必须是非空数组。`);
  const result = value.map((item, index) => assertNonEmptyString(item, `${name}[${index}]`));
  if (new Set(result).size !== result.length) throw new RangeError(`${name}不能重复。`);
  return Object.freeze(result);
}

function segmentShapeCatalog(
  value: unknown,
  segmentIds: readonly string[],
  surfaceIds: readonly string[],
): readonly ArenaV2KzRouteSegmentShapeReadCandidateV1[] {
  if (!Array.isArray(value) || value.length !== segmentIds.length) {
    throw new RangeError('Arena V2 KZ Three路线段形状目录必须逐段闭合。');
  }
  return Object.freeze(value.map((candidate, index) => {
    const name = `Arena V2 KZ Three route.segmentShapeCatalog[${index}]`;
    const item = assertPlainRecord(candidate, name);
    if (Object.getOwnPropertySymbols(item).length !== 0) {
      throw new TypeError(`${name}不能包含Symbol键。`);
    }
    assertKnownKeys(item, SEGMENT_SHAPE_KEYS, name);
    for (const key of SEGMENT_SHAPE_KEYS) dataField(item, key, name);
    const segmentId = assertNonEmptyString(item.segmentId, `${name}.segmentId`);
    const landmarkSurfaceId = assertNonEmptyString(
      item.landmarkSurfaceId,
      `${name}.landmarkSurfaceId`,
    );
    if (segmentId !== segmentIds[index]
      || assertIntegerAtLeast(item.ordinal, 1, `${name}.ordinal`) !== index + 1
      || !surfaceIds.includes(landmarkSurfaceId)) {
      throw new RangeError(`${name}的段落顺序或地标Surface身份漂移。`);
    }
    const shape = resolveArenaV2KzRouteThreeShapeLanguageCandidateV1({
      guidanceShape: item.guidanceShape,
      riskShape: item.riskShape,
    });
    if (item.colorIsNeverSoleSignal !== true) {
      throw new RangeError(`${name}缺少非颜色形状承诺。`);
    }
    return Object.freeze({
      segmentId,
      ordinal: index + 1,
      landmarkSurfaceId,
      guidanceShape: shape.guidanceShape,
      riskShape: shape.riskShape,
      colorIsNeverSoleSignal: true as const,
    });
  }));
}

function parseProjection(value: unknown): ParsedProjectionIdentity {
  const projection = assertPlainRecord(value, 'Arena V2 KZ Three路线投影');
  assertKnownKeys(projection, PROJECTION_KEYS, 'Arena V2 KZ Three路线投影');
  for (const key of PROJECTION_KEYS) dataField(projection, key, 'Arena V2 KZ Three路线投影');
  if (
    projection.schemaVersion !== 1
    || projection.status !== 'production-unreachable'
    || projection.implementationStatus !== 'code-written-not-run'
  ) throw new RangeError('Arena V2 KZ Three只接受V1未运行路线投影。');
  const source = assertPlainRecord(projection.source, 'Arena V2 KZ Three路线投影.source');
  assertKnownKeys(source, SOURCE_KEYS, 'Arena V2 KZ Three路线投影.source');
  for (const key of SOURCE_KEYS) dataField(source, key, 'Arena V2 KZ Three路线投影.source');
  const route = assertPlainRecord(projection.route, 'Arena V2 KZ Three路线投影.route');
  assertKnownKeys(route, ROUTE_KEYS, 'Arena V2 KZ Three路线投影.route');
  for (const key of ROUTE_KEYS) dataField(route, key, 'Arena V2 KZ Three路线投影.route');
  const mapDefinitionId = assertNonEmptyString(
    source.mapDefinitionId,
    'Arena V2 KZ Three路线投影.source.mapDefinitionId',
  );
  if (route.mapDefinitionId !== mapDefinitionId) {
    throw new RangeError('Arena V2 KZ Three路线投影地图身份漂移。');
  }
  const segmentIds = uniqueStringArray(route.segmentIds, 'Arena V2 KZ Three route.segmentIds');
  const surfaceIds = uniqueStringArray(route.surfaceIds, 'Arena V2 KZ Three route.surfaceIds');
  if (route.segmentCount !== segmentIds.length) {
    throw new RangeError('Arena V2 KZ Three路线段落计数不闭合。');
  }
  const parsedSegmentShapeCatalog = segmentShapeCatalog(
    route.segmentShapeCatalog,
    segmentIds,
    surfaceIds,
  );
  const local = assertPlainRecord(projection.local, 'Arena V2 KZ Three路线投影.local');
  assertKnownKeys(local, LOCAL_KEYS, 'Arena V2 KZ Three路线投影.local');
  for (const key of LOCAL_KEYS) dataField(local, key, 'Arena V2 KZ Three路线投影.local');
  assertNonEmptyString(local.participantId, 'Arena V2 KZ Three路线投影.local.participantId');
  if (typeof local.grounded !== 'boolean') {
    throw new TypeError('Arena V2 KZ Three路线投影.local.grounded必须是boolean。');
  }
  if (local.currentSegment !== null) {
    const current = assertPlainRecord(
      local.currentSegment,
      'Arena V2 KZ Three路线投影.local.currentSegment',
    );
    assertKnownKeys(current, CURRENT_SEGMENT_KEYS, 'Arena V2 KZ Three路线投影.local.currentSegment');
    for (const key of CURRENT_SEGMENT_KEYS) {
      dataField(current, key, 'Arena V2 KZ Three路线投影.local.currentSegment');
    }
    const currentId = assertNonEmptyString(
      current.id,
      'Arena V2 KZ Three路线投影.local.currentSegment.id',
    );
    if (!segmentIds.includes(currentId)) {
      throw new RangeError(`Arena V2 KZ Three当前段不属于路线：${currentId}。`);
    }
    const cycleOrdinal = assertIntegerAtLeast(
      current.cycleOrdinal,
      1,
      'Arena V2 KZ Three路线投影.local.currentSegment.cycleOrdinal',
    );
    const experienceIntensity = assertIntegerAtLeast(
      current.experienceIntensity,
      1,
      'Arena V2 KZ Three路线投影.local.currentSegment.experienceIntensity',
    );
    if (cycleOrdinal > 2 || experienceIntensity > 5
      || !EXPERIENCE_BEATS.has(current.experienceBeat)) {
      throw new RangeError('Arena V2 KZ Three当前段体验节奏不受支持。');
    }
    for (const key of [
      'pacingArc', 'landmarkCue', 'landmarkAnchorId', 'landmarkSurfaceId',
      'leadingLineCue', 'memoryHook', 'raceRead', 'survivalRead',
    ]) assertNonEmptyString(current[key], `Arena V2 KZ Three路线投影.local.currentSegment.${key}`);
    const landmarkSurfaceId = assertNonEmptyString(
      current.landmarkSurfaceId,
      'Arena V2 KZ Three路线投影.local.currentSegment.landmarkSurfaceId',
    );
    if (!surfaceIds.includes(landmarkSurfaceId)) {
      throw new RangeError(`Arena V2 KZ Three当前段地标Surface不属于路线：${landmarkSurfaceId}。`);
    }
    const currentShape = resolveArenaV2KzRouteThreeShapeLanguageCandidateV1({
      guidanceShape: current.guidanceShape,
      riskShape: current.riskShape,
    });
    const expectedShape = parsedSegmentShapeCatalog[segmentIds.indexOf(currentId)]!;
    if (landmarkSurfaceId !== expectedShape.landmarkSurfaceId
      || currentShape.guidanceShape !== expectedShape.guidanceShape
      || currentShape.riskShape !== expectedShape.riskShape) {
      throw new RangeError(`Arena V2 KZ Three当前段${currentId}与路线形状目录漂移。`);
    }
    if (current.colorIsNeverSoleSignal !== true) {
      throw new RangeError('Arena V2 KZ Three当前段地标缺少非颜色线索。');
    }
  }
  if (!Array.isArray(projection.cues)) {
    throw new TypeError('Arena V2 KZ Three路线投影.cues必须是数组。');
  }
  projection.cues.forEach((candidate, index) => {
    const cue = assertPlainRecord(candidate, `Arena V2 KZ Three路线投影.cues[${index}]`);
    assertKnownKeys(cue, CUE_KEYS, `Arena V2 KZ Three路线投影.cues[${index}]`);
    for (const key of CUE_KEYS) dataField(cue, key, `Arena V2 KZ Three路线投影.cues[${index}]`);
    if (!CUE_KINDS.has(cue.kind)) throw new RangeError(`Arena V2 KZ Three未知Cue ${String(cue.kind)}。`);
    assertNonEmptyString(cue.id, `Arena V2 KZ Three路线投影.cues[${index}].id`);
    assertNonEmptyString(
      cue.sourceEventId,
      `Arena V2 KZ Three路线投影.cues[${index}].sourceEventId`,
    );
    assertIntegerAtLeast(cue.tick, 0, `Arena V2 KZ Three路线投影.cues[${index}].tick`);
    assertIntegerAtLeast(cue.sequence, 0, `Arena V2 KZ Three路线投影.cues[${index}].sequence`);
    if (cue.colorIsNeverSoleSignal !== true) {
      throw new RangeError(`Arena V2 KZ Three路线投影.cues[${index}]缺少非颜色线索。`);
    }
  });
  return Object.freeze({
    projection: projection as unknown as ArenaV2KzRoutePresentationProjectionCandidateV1,
    tick: assertIntegerAtLeast(source.tick, 0, 'Arena V2 KZ Three路线投影.source.tick'),
    mapDefinitionId,
    routeDefinitionId: assertNonEmptyString(
      route.routeDefinitionId,
      'Arena V2 KZ Three route.routeDefinitionId',
    ),
    routeContentHash: assertNonEmptyString(
      route.routeContentHash,
      'Arena V2 KZ Three route.routeContentHash',
    ),
    mapExperienceCatalogContentHash: assertNonEmptyString(
      route.mapExperienceCatalogContentHash,
      'Arena V2 KZ Three route.mapExperienceCatalogContentHash',
    ),
    segmentIds,
    segmentShapeCatalog: parsedSegmentShapeCatalog,
    surfaceIds,
    finishAnchorId: assertNonEmptyString(
      route.finishAnchorId,
      'Arena V2 KZ Three route.finishAnchorId',
    ),
  });
}

function requirePresentationExtras(node: THREE.Object3D, name: string): Record<string, unknown> {
  const extras = assertPlainRecord(node.userData, `${name}.userData`);
  if (extras.presentationOnly !== true) {
    throw new RangeError(`${name}必须声明presentationOnly=true。`);
  }
  return extras;
}

function boundNode(node: THREE.Object3D): BoundNode {
  if (![node.scale.x, node.scale.y, node.scale.z].every((value) => (
    Number.isFinite(value) && Math.abs(value) > Number.EPSILON
  ))) {
    throw new RangeError(`${node.name}的基础scale必须有限且非零。`);
  }
  if (![node.quaternion.x, node.quaternion.y, node.quaternion.z, node.quaternion.w]
    .every(Number.isFinite) || node.quaternion.lengthSq() <= Number.EPSILON) {
    throw new RangeError(`${node.name}的基础quaternion必须有限且有效。`);
  }
  return Object.freeze({
    node,
    baseScale: node.scale.clone(),
    baseQuaternion: node.quaternion.clone(),
  });
}

function markRouteTransformsOwned(records: readonly TransformCleanupRecord[]): void {
  for (const record of records) {
    record.scaleRestored = false;
    record.quaternionRestored = false;
  }
}

function cleanupRouteTransformRecords(
  records: readonly TransformCleanupRecord[],
): readonly unknown[] {
  const errors: unknown[] = [];
  for (const record of [...records].reverse()) {
    if (!record.quaternionRestored) {
      try {
        record.binding.node.quaternion.copy(record.binding.baseQuaternion);
        record.quaternionRestored = true;
      } catch (error) {
        errors.push(error);
        return Object.freeze(errors);
      }
    }
    if (!record.scaleRestored) {
      try {
        record.binding.node.scale.copy(record.binding.baseScale);
        record.scaleRestored = true;
      } catch (error) {
        errors.push(error);
        return Object.freeze(errors);
      }
    }
  }
  return Object.freeze(errors);
}

function routeTransformRecordsCleanupComplete(
  records: readonly TransformCleanupRecord[],
): boolean {
  return records.every((record) => record.scaleRestored && record.quaternionRestored);
}

export class ArenaV2KzRouteThreeReadabilityConstructionCleanupFailureCandidateV1
  extends AggregateError {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly #records: readonly TransformCleanupRecord[];

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    records: readonly TransformCleanupRecord[],
  ) {
    super(
      [originalError, cleanupError],
      'Arena V2 KZ Three路线可读性构造失败且地图变换回滚未收敛。',
    );
    this.name = 'ArenaV2KzRouteThreeReadabilityConstructionCleanupFailureCandidateV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#records = records;
  }

  get cleanupComplete(): boolean {
    return routeTransformRecordsCleanupComplete(this.#records);
  }

  retryCleanup(): void {
    const errors = cleanupRouteTransformRecords(this.#records);
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Arena V2 KZ Three路线可读性构造债务清理不完整。');
    }
  }
}

function sameOrderedValues(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sameSegmentShapeCatalog(
  left: readonly ArenaV2KzRouteSegmentShapeReadCandidateV1[],
  right: readonly ArenaV2KzRouteSegmentShapeReadCandidateV1[],
): boolean {
  return left.length === right.length && left.every((value, index) => {
    const other = right[index];
    return other !== undefined
      && value.segmentId === other.segmentId
      && value.ordinal === other.ordinal
      && value.landmarkSurfaceId === other.landmarkSurfaceId
      && value.guidanceShape === other.guidanceShape
      && value.riskShape === other.riskShape
      && value.colorIsNeverSoleSignal === other.colorIsNeverSoleSignal;
  });
}

function sameValueSet(left: Iterable<string>, right: readonly string[]): boolean {
  const values = new Set(left);
  return values.size === right.length && right.every((value) => values.has(value));
}

function hasAuthoredPrefix(name: string, prefix: string): boolean {
  return name.startsWith(`${prefix}:`) || name.startsWith(`${prefix}_`);
}

function matchesAuthoredName(name: string, prefix: string, identity: string): boolean {
  return name === `${prefix}:${identity}` || name === `${prefix}_${identity}`;
}

function cueDuration(kind: ArenaV2KzRoutePresentationCueCandidateV1['kind']): number {
  switch (kind) {
    case 'support-lost': return 8;
    case 'respawn-scheduled': return 18;
    case 'respawned': return 10;
    case 'safe-anchor-committed': return 12;
    case 'finish-claimed': return 18;
    case 'survival-fall-counted': return 10;
  }
}

/**
 * Binds only presentation-only nodes already authored into the formal map GLB.
 * It never creates geometry, materials, collision, route facts or fallback art.
 */
export class ArenaV2KzRouteThreeReadabilityCandidateV1 {
  readonly #mapObject: THREE.Object3D;
  readonly #mapDefinitionId: string;
  readonly #routeDefinitionId: string;
  readonly #routeContentHash: string;
  readonly #mapExperienceCatalogContentHash: string;
  readonly #segmentIds: readonly string[];
  readonly #segmentShapeCatalog: readonly ArenaV2KzRouteSegmentShapeReadCandidateV1[];
  readonly #chapterCatalogContentHash: string | null;
  readonly #chaptersBySegmentId = new Map<string, SegmentChapterBinding>();
  readonly #chapterCount: number;
  readonly #surfaceIds: readonly string[];
  readonly #finishAnchorId: string;
  readonly #topCapsBySurfaceId = new Map<string, BoundNode>();
  readonly #entriesBySegmentId = new Map<string, BoundNode>();
  readonly #entriesByAnchorId = new Map<string, BoundNode>();
  readonly #finishGateNodes: readonly BoundNode[];
  readonly #transformCleanupRecords: readonly TransformCleanupRecord[];
  readonly #shapeEulerScratch = new THREE.Euler();
  readonly #shapeQuaternionScratch = new THREE.Quaternion();
  #state: ReadabilityState = 'active';
  #lastTick = -1;
  #currentSegmentId: string | null = null;
  #currentExperienceBeat: string | null = null;
  #currentExperienceIntensity: number | null = null;
  #currentGuidanceShape: string | null = null;
  #currentRiskShape: string | null = null;
  #currentShapeIdentity: string | null = null;
  #currentChapterId: string | null = null;
  #currentChapterOrdinal: number | null = null;
  #currentChapterLandmarkGrammar: string | null = null;
  #currentChapterShapeIdentity: string | null = null;
  #activeCues = new Map<string, ActiveCue>();
  #recentCueSignatures = new Map<string, string>();

  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'Arena V2 KZ Three readability options');
    assertKnownKeys(source, OPTION_KEYS, 'Arena V2 KZ Three readability options');
    for (const key of OPTION_KEYS) dataField(source, key, 'Arena V2 KZ Three readability options');
    if (!(source.mapObject instanceof THREE.Object3D)) {
      throw new TypeError('Arena V2 KZ Three readability需要正式地图Object3D。');
    }
    const identity = parseProjection(source.projection);
    this.#mapObject = source.mapObject;
    this.#mapDefinitionId = identity.mapDefinitionId;
    this.#routeDefinitionId = identity.routeDefinitionId;
    this.#routeContentHash = identity.routeContentHash;
    this.#mapExperienceCatalogContentHash = identity.mapExperienceCatalogContentHash;
    this.#segmentIds = identity.segmentIds;
    this.#segmentShapeCatalog = identity.segmentShapeCatalog;
    const chapterMap = resolveArenaV2KzRouteChapterLandmarkMapCandidateV1({
      mapDefinitionId: identity.mapDefinitionId,
      routeDefinitionId: identity.routeDefinitionId,
      routeContentHash: identity.routeContentHash,
      mapExperienceCatalogContentHash: identity.mapExperienceCatalogContentHash,
      segmentIds: identity.segmentIds,
    });
    this.#chapterCatalogContentHash = chapterMap?.contentHash ?? null;
    this.#chapterCount = chapterMap?.chapters.length ?? 0;
    for (const chapter of chapterMap?.chapters ?? []) {
      chapter.segmentIds.forEach((segmentId, index) => {
        if (this.#chaptersBySegmentId.has(segmentId)) {
          throw new RangeError(`Arena V2 KZ Three章节重复覆盖段落${segmentId}。`);
        }
        const chapterBoundary = index === 0;
        this.#chaptersBySegmentId.set(segmentId, Object.freeze({
          chapterId: chapter.chapterId,
          chapterOrdinal: chapter.chapterOrdinal,
          landmarkGrammar: chapter.landmarkGrammar,
          chapterBoundary,
          shape: resolveArenaV2KzRouteThreeChapterLandmarkLanguageCandidateV1({
            landmarkGrammar: chapter.landmarkGrammar,
            chapterBoundary,
          }),
        }));
      });
    }
    if (chapterMap !== null && this.#chaptersBySegmentId.size !== identity.segmentIds.length) {
      throw new RangeError('Arena V2 KZ Three章节地标未覆盖正式路线全部段落。');
    }
    this.#surfaceIds = identity.surfaceIds;
    this.#finishAnchorId = identity.finishAnchorId;
    const finishNodes: BoundNode[] = [];
    this.#mapObject.traverse((node) => {
      if (hasAuthoredPrefix(node.name, TOP_CAP_NAME)) {
        if (!(node instanceof THREE.Mesh)) throw new TypeError(`${node.name}必须是正式GLB Mesh节点。`);
        const extras = requirePresentationExtras(node, node.name);
        const surfaceId = assertNonEmptyString(extras.surfaceId, `${node.name}.surfaceId`);
        const segmentId = assertNonEmptyString(extras.segmentId, `${node.name}.segmentId`);
        if (!matchesAuthoredName(node.name, TOP_CAP_NAME, surfaceId)
          || !this.#segmentIds.includes(segmentId)) {
          throw new RangeError(`${node.name}的Surface/Segment身份漂移。`);
        }
        if (this.#topCapsBySurfaceId.has(surfaceId)) {
          throw new RangeError(`Arena V2 KZ Three重复TopCap ${surfaceId}。`);
        }
        this.#topCapsBySurfaceId.set(surfaceId, boundNode(node));
      } else if (hasAuthoredPrefix(node.name, SEGMENT_ENTRY_NAME)) {
        if (!(node instanceof THREE.Mesh)) throw new TypeError(`${node.name}必须是正式GLB Mesh节点。`);
        const extras = requirePresentationExtras(node, node.name);
        const segmentId = assertNonEmptyString(extras.segmentId, `${node.name}.segmentId`);
        const anchorId = assertNonEmptyString(extras.anchorId, `${node.name}.anchorId`);
        if (!matchesAuthoredName(node.name, SEGMENT_ENTRY_NAME, segmentId)) {
          throw new RangeError(`${node.name}的Segment身份漂移。`);
        }
        if (this.#entriesBySegmentId.has(segmentId) || this.#entriesByAnchorId.has(anchorId)) {
          throw new RangeError(`Arena V2 KZ Three重复入口Cue ${segmentId}/${anchorId}。`);
        }
        const binding = boundNode(node);
        this.#entriesBySegmentId.set(segmentId, binding);
        this.#entriesByAnchorId.set(anchorId, binding);
      } else if (hasAuthoredPrefix(node.name, FINISH_GATE_NAME)) {
        if (!(node instanceof THREE.Mesh)) throw new TypeError(`${node.name}必须是正式GLB Mesh节点。`);
        const extras = requirePresentationExtras(node, node.name);
        const anchorId = assertNonEmptyString(extras.anchorId, `${node.name}.anchorId`);
        if (anchorId !== this.#finishAnchorId) {
          throw new RangeError(`${node.name}的终点Anchor身份漂移。`);
        }
        finishNodes.push(boundNode(node));
      }
    });
    if (!sameValueSet(this.#topCapsBySurfaceId.keys(), this.#surfaceIds)) {
      throw new RangeError('Arena V2 KZ Three正式GLB的TopCap集合与Route Definition不闭合。');
    }
    if (!sameValueSet(this.#entriesBySegmentId.keys(), this.#segmentIds)) {
      throw new RangeError('Arena V2 KZ Three正式GLB的入口Cue集合与Route Definition不闭合。');
    }
    const finishParts = ['left', 'right', 'header'];
    if (finishNodes.length !== 3 || !finishParts.every((part) => (
      finishNodes.some(({ node }) => matchesAuthoredName(node.name, FINISH_GATE_NAME, part))
    ))) {
      throw new RangeError('Arena V2 KZ Three正式GLB必须有唯一三件式终点门。');
    }
    this.#finishGateNodes = Object.freeze(finishNodes);
    this.#transformCleanupRecords = Object.freeze(
      [...new Set<BoundNode>([
        ...this.#topCapsBySurfaceId.values(),
        ...this.#entriesBySegmentId.values(),
        ...this.#finishGateNodes,
      ])].map((binding): TransformCleanupRecord => ({
        binding,
        scaleRestored: true,
        quaternionRestored: true,
      })),
    );
    markRouteTransformsOwned(this.#transformCleanupRecords);
    try {
      this.#applyRouteShapeCatalog(this.#segmentShapeCatalog);
    } catch (error) {
      const cleanupErrors = cleanupRouteTransformRecords(this.#transformCleanupRecords);
      if (!routeTransformRecordsCleanupComplete(this.#transformCleanupRecords)) {
        throw new ArenaV2KzRouteThreeReadabilityConstructionCleanupFailureCandidateV1(
          error,
          cleanupErrors.length === 1
            ? cleanupErrors[0]
            : new AggregateError(
              cleanupErrors,
              'Arena V2 KZ Three路线可读性构造地图变换回滚不完整。',
            ),
          this.#transformCleanupRecords,
        );
      }
      throw error;
    }
  }

  get state(): ReadabilityState { return this.#state; }

  #assertActive(operation: string): void {
    if (this.#state !== 'active') throw new Error(`${operation}拒绝当前状态${this.#state}。`);
  }

  #resetTransforms(): void {
    const unique = new Set<BoundNode>([
      ...this.#topCapsBySurfaceId.values(),
      ...this.#entriesBySegmentId.values(),
      ...this.#finishGateNodes,
    ]);
    for (const binding of unique) {
      binding.node.scale.copy(binding.baseScale);
      binding.node.quaternion.copy(binding.baseQuaternion);
    }
  }

  #applyUniform(
    binding: BoundNode,
    relativeMaximumDelta: number,
    boosted: Set<BoundNode>,
  ): void {
    if (boosted.has(binding)) return;
    const relativeMaximum = Math.max(
      binding.node.scale.x / binding.baseScale.x,
      binding.node.scale.y / binding.baseScale.y,
      binding.node.scale.z / binding.baseScale.z,
    );
    if (!Number.isFinite(relativeMaximum) || relativeMaximum <= 0) {
      throw new RangeError(`${binding.node.name}的基础scale不支持路线表现组合。`);
    }
    const targetMaximum = relativeMaximum + relativeMaximumDelta;
    binding.node.scale.multiplyScalar(targetMaximum / relativeMaximum);
    boosted.add(binding);
  }

  #applySegmentShape(
    binding: BoundNode,
    shape: ArenaV2KzRouteThreeResolvedShapeLanguageCandidateV1,
    chapter: SegmentChapterBinding | null,
    emphasis: number,
  ): void {
    const { transform } = shape;
    const chapterTransform = chapter?.shape.transform;
    binding.node.scale.set(
      binding.baseScale.x * transform.scaleX * (chapterTransform?.scaleX ?? 1) * emphasis,
      binding.baseScale.y * transform.scaleY * (chapterTransform?.scaleY ?? 1) * emphasis,
      binding.baseScale.z * transform.scaleZ * (chapterTransform?.scaleZ ?? 1) * emphasis,
    );
    this.#shapeEulerScratch.set(
      transform.rotationXRadians,
      transform.rotationYRadians,
      transform.rotationZRadians,
      'XYZ',
    );
    this.#shapeQuaternionScratch.setFromEuler(this.#shapeEulerScratch);
    binding.node.quaternion.copy(binding.baseQuaternion).multiply(this.#shapeQuaternionScratch);
    if (chapterTransform !== undefined) {
      this.#shapeEulerScratch.set(
        chapterTransform.rotationXRadians,
        chapterTransform.rotationYRadians,
        chapterTransform.rotationZRadians,
        'XYZ',
      );
      this.#shapeQuaternionScratch.setFromEuler(this.#shapeEulerScratch);
      binding.node.quaternion.multiply(this.#shapeQuaternionScratch);
    }
  }

  #applyRouteShapeCatalog(
    catalog: readonly ArenaV2KzRouteSegmentShapeReadCandidateV1[],
  ): void {
    for (const segmentShape of catalog) {
      this.#applySegmentShape(
        this.#entriesBySegmentId.get(segmentShape.segmentId)!,
        resolveArenaV2KzRouteThreeShapeLanguageCandidateV1({
          guidanceShape: segmentShape.guidanceShape,
          riskShape: segmentShape.riskShape,
        }),
        this.#chaptersBySegmentId.get(segmentShape.segmentId) ?? null,
        1,
      );
    }
  }

  #applyCue(
    cue: ArenaV2KzRoutePresentationCueCandidateV1,
    reducedMotion: boolean,
    boosted: Set<BoundNode>,
  ): void {
    const relativeMaximumDelta = reducedMotion
      ? REDUCED_MOTION_UNIFORM_CUE_RELATIVE_MAXIMUM_DELTA
      : NORMAL_UNIFORM_CUE_RELATIVE_MAXIMUM_DELTA;
    if (cue.kind === 'support-lost') {
      if (cue.supportSurfaceId === null) return;
      const binding = this.#topCapsBySurfaceId.get(cue.supportSurfaceId);
      if (binding === undefined) {
        throw new RangeError(`Arena V2 KZ Three缺少掉落Surface ${cue.supportSurfaceId}。`);
      }
      binding.node.scale.y = Math.max(
        binding.node.scale.y,
        binding.baseScale.y * (1 + relativeMaximumDelta),
      );
      return;
    }
    if (cue.kind === 'finish-claimed') {
      for (const binding of this.#finishGateNodes) {
        this.#applyUniform(binding, relativeMaximumDelta, boosted);
      }
      return;
    }
    if (
      cue.kind === 'respawn-scheduled'
      || cue.kind === 'respawned'
      || cue.kind === 'safe-anchor-committed'
    ) {
      if (cue.anchorId === null) throw new RangeError(`Arena V2 KZ Three ${cue.kind}缺少Anchor。`);
      if (cue.anchorId === this.#finishAnchorId) {
        for (const binding of this.#finishGateNodes) {
          this.#applyUniform(binding, relativeMaximumDelta, boosted);
        }
        return;
      }
      const binding = this.#entriesByAnchorId.get(cue.anchorId);
      if (binding === undefined) {
        throw new RangeError(`Arena V2 KZ Three缺少路线Anchor视觉 ${cue.anchorId}。`);
      }
      this.#applyUniform(binding, relativeMaximumDelta, boosted);
    }
  }

  sync(value: unknown, reducedMotion: boolean): void {
    this.#assertActive('Arena V2 KZ Three readability sync');
    if (typeof reducedMotion !== 'boolean') {
      throw new TypeError('Arena V2 KZ Three readability reducedMotion必须是boolean。');
    }
    const identity = parseProjection(value);
    if (
      identity.mapDefinitionId !== this.#mapDefinitionId
      || identity.routeDefinitionId !== this.#routeDefinitionId
      || identity.routeContentHash !== this.#routeContentHash
      || identity.mapExperienceCatalogContentHash !== this.#mapExperienceCatalogContentHash
      || !sameOrderedValues(identity.segmentIds, this.#segmentIds)
      || !sameSegmentShapeCatalog(identity.segmentShapeCatalog, this.#segmentShapeCatalog)
      || !sameOrderedValues(identity.surfaceIds, this.#surfaceIds)
      || identity.finishAnchorId !== this.#finishAnchorId
    ) throw new RangeError('Arena V2 KZ Three readability路线身份漂移。');
    if (identity.tick < this.#lastTick) throw new RangeError('Arena V2 KZ Three readability tick回退。');
    const currentSegmentId = identity.projection.local.currentSegment?.id ?? null;
    if (currentSegmentId !== null && !this.#entriesBySegmentId.has(currentSegmentId)) {
      throw new RangeError(`Arena V2 KZ Three缺少当前段入口Cue ${currentSegmentId}。`);
    }
    let currentShape: ArenaV2KzRouteThreeResolvedShapeLanguageCandidateV1 | null = null;
    const currentChapter = currentSegmentId === null
      ? null
      : this.#chaptersBySegmentId.get(currentSegmentId) ?? null;
    if (currentSegmentId !== null && this.#chapterCount > 0 && currentChapter === null) {
      throw new RangeError(`Arena V2 KZ Three当前段${currentSegmentId}缺少章节地标身份。`);
    }
    if (identity.projection.local.currentSegment !== null) {
      const current = identity.projection.local.currentSegment;
      currentShape = resolveArenaV2KzRouteThreeShapeLanguageCandidateV1({
        guidanceShape: current.guidanceShape,
        riskShape: current.riskShape,
      });
      const landmark = this.#topCapsBySurfaceId.get(current.landmarkSurfaceId);
      if (landmark === undefined) {
        throw new RangeError(
          `Arena V2 KZ Three当前段${current.id}缺少地标Surface：${current.landmarkSurfaceId}。`,
        );
      }
    }

    const nextRecent = new Map(this.#recentCueSignatures);
    const nextActive = new Map(
      [...this.#activeCues].filter(([, active]) => active.expiresAtTick >= identity.tick),
    );
    for (const cue of identity.projection.cues) {
      if (!CUE_KINDS.has(cue.kind)) throw new RangeError(`Arena V2 KZ Three未知Cue ${cue.kind}。`);
      const signature = createDeterministicDataHash(cue, `Arena V2 KZ Three cue ${cue.id}`);
      const previous = nextRecent.get(cue.sourceEventId);
      if (previous !== undefined && previous !== signature) {
        throw new RangeError(`Arena V2 KZ Three Cue身份漂移：${cue.sourceEventId}。`);
      }
      if (previous !== undefined) continue;
      nextRecent.set(cue.sourceEventId, signature);
      const expiresAtTick = cue.tick + cueDuration(cue.kind);
      if (expiresAtTick >= identity.tick) nextActive.set(cue.sourceEventId, { cue, expiresAtTick });
    }
    while (nextRecent.size > MAXIMUM_RECENT_CUE_IDENTITIES) {
      const oldest = nextRecent.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      nextRecent.delete(oldest);
    }
    if (nextActive.size > MAXIMUM_ACTIVE_CUES) {
      const kept = [...nextActive.entries()]
        .sort((left, right) => (
          right[1].expiresAtTick - left[1].expiresAtTick
          || left[0].localeCompare(right[0])
        ))
        .slice(0, MAXIMUM_ACTIVE_CUES);
      nextActive.clear();
      for (const entry of kept) nextActive.set(entry[0], entry[1]);
    }
    for (const { cue } of nextActive.values()) {
      if (cue.kind === 'support-lost' && cue.supportSurfaceId !== null
        && !this.#topCapsBySurfaceId.has(cue.supportSurfaceId)) {
        throw new RangeError(`Arena V2 KZ Three缺少掉落Surface ${cue.supportSurfaceId}。`);
      }
      if (
        (cue.kind === 'respawn-scheduled'
          || cue.kind === 'respawned'
          || cue.kind === 'safe-anchor-committed')
        && cue.anchorId !== this.#finishAnchorId
        && (cue.anchorId === null || !this.#entriesByAnchorId.has(cue.anchorId))
      ) throw new RangeError(`Arena V2 KZ Three缺少路线Anchor视觉 ${String(cue.anchorId)}。`);
    }

    this.#lastTick = identity.tick;
    this.#currentSegmentId = currentSegmentId;
    this.#currentExperienceBeat = identity.projection.local.currentSegment?.experienceBeat ?? null;
    this.#currentExperienceIntensity = identity.projection.local.currentSegment?.experienceIntensity
      ?? null;
    this.#currentGuidanceShape = currentShape?.guidanceShape ?? null;
    this.#currentRiskShape = currentShape?.riskShape ?? null;
    this.#currentShapeIdentity = currentShape?.shapeIdentity ?? null;
    this.#currentChapterId = currentChapter?.chapterId ?? null;
    this.#currentChapterOrdinal = currentChapter?.chapterOrdinal ?? null;
    this.#currentChapterLandmarkGrammar = currentChapter?.landmarkGrammar ?? null;
    this.#currentChapterShapeIdentity = currentChapter?.shape.chapterShapeIdentity ?? null;
    this.#recentCueSignatures = nextRecent;
    this.#activeCues = nextActive;
    markRouteTransformsOwned(this.#transformCleanupRecords);
    this.#resetTransforms();
    this.#applyRouteShapeCatalog(identity.segmentShapeCatalog);
    if (currentSegmentId !== null) {
      const intensity = identity.projection.local.currentSegment!.experienceIntensity;
      this.#applySegmentShape(
        this.#entriesBySegmentId.get(currentSegmentId)!,
        currentShape!,
        currentChapter,
        reducedMotion ? 1.02 + intensity * 0.01 : 1.06 + intensity * 0.015,
      );
    }
    const cueBoostedBindings = new Set<BoundNode>();
    for (const { cue } of this.#activeCues.values()) {
      this.#applyCue(cue, reducedMotion, cueBoostedBindings);
    }
  }

  pause(): void {
    if (this.#state !== 'active') return;
    this.#state = 'paused';
  }

  resume(): void {
    if (this.#state !== 'paused') return;
    this.#state = 'active';
  }

  clear(): void {
    if (this.#state === 'destroyed') return;
    if (this.#state === 'destroy-incomplete') {
      throw new Error('Arena V2 KZ Three路线可读性清理未完成时拒绝clear。');
    }
    this.#activeCues.clear();
    this.#recentCueSignatures.clear();
    this.#currentSegmentId = null;
    this.#currentExperienceBeat = null;
    this.#currentExperienceIntensity = null;
    this.#currentGuidanceShape = null;
    this.#currentRiskShape = null;
    this.#currentShapeIdentity = null;
    this.#currentChapterId = null;
    this.#currentChapterOrdinal = null;
    this.#currentChapterLandmarkGrammar = null;
    this.#currentChapterShapeIdentity = null;
    this.#lastTick = -1;
    markRouteTransformsOwned(this.#transformCleanupRecords);
    this.#resetTransforms();
    for (const record of this.#transformCleanupRecords) {
      record.scaleRestored = true;
      record.quaternionRestored = true;
    }
  }

  getSnapshot(): Readonly<Record<string, unknown>> {
    return Object.freeze({
      state: this.#state,
      mapDefinitionId: this.#mapDefinitionId,
      routeDefinitionId: this.#routeDefinitionId,
      lastTick: this.#lastTick,
      currentSegmentId: this.#currentSegmentId,
      currentExperienceBeat: this.#currentExperienceBeat,
      currentExperienceIntensity: this.#currentExperienceIntensity,
      currentGuidanceShape: this.#currentGuidanceShape,
      currentRiskShape: this.#currentRiskShape,
      currentShapeIdentity: this.#currentShapeIdentity,
      currentChapterId: this.#currentChapterId,
      currentChapterOrdinal: this.#currentChapterOrdinal,
      currentChapterLandmarkGrammar: this.#currentChapterLandmarkGrammar,
      currentChapterShapeIdentity: this.#currentChapterShapeIdentity,
      shapeLanguageContentHash: ARENA_V2_KZ_ROUTE_THREE_SHAPE_LANGUAGE_CANDIDATE_V1.contentHash,
      chapterCatalogContentHash: this.#chapterCatalogContentHash,
      chapterShapeLanguageContentHash:
        ARENA_V2_KZ_ROUTE_THREE_CHAPTER_LANDMARK_LANGUAGE_CANDIDATE_V1.contentHash,
      chapterCount: this.#chapterCount,
      chapterShapedSegmentCount: this.#chaptersBySegmentId.size,
      topCapCount: this.#topCapsBySurfaceId.size,
      segmentEntryCount: this.#entriesBySegmentId.size,
      shapedSegmentCount: this.#segmentShapeCatalog.length,
      finishGateNodeCount: this.#finishGateNodes.length,
      activeCueCount: this.#activeCues.size,
      recentCueIdentityCount: this.#recentCueSignatures.size,
      transformCleanupComplete:
        routeTransformRecordsCleanupComplete(this.#transformCleanupRecords),
      createsGeometryOrMaterials: false,
    });
  }

  destroy(): void {
    if (this.#state === 'destroyed') return;
    this.#state = 'destroy-incomplete';
    const cleanupErrors = cleanupRouteTransformRecords(this.#transformCleanupRecords);
    if (cleanupErrors.length > 0) {
      throw new AggregateError(cleanupErrors, 'Arena V2 KZ Three路线可读性清理不完整。');
    }
    this.#activeCues.clear();
    this.#recentCueSignatures.clear();
    this.#currentSegmentId = null;
    this.#currentExperienceBeat = null;
    this.#currentExperienceIntensity = null;
    this.#currentGuidanceShape = null;
    this.#currentRiskShape = null;
    this.#currentShapeIdentity = null;
    this.#currentChapterId = null;
    this.#currentChapterOrdinal = null;
    this.#currentChapterLandmarkGrammar = null;
    this.#currentChapterShapeIdentity = null;
    this.#state = 'destroyed';
  }
}

export const ARENA_V2_KZ_ROUTE_THREE_READABILITY_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  hardGate: false as const,
  defaultStageWired: false as const,
  formalStageConsumerWired: true as const,
  consumesAuthoredMapNodesOnly: true as const,
  createsGeometryOrMaterials: false as const,
  mutatesCollisionOrRoute: false as const,
  maximumActiveCues: MAXIMUM_ACTIVE_CUES,
  maximumRecentCueIdentities: MAXIMUM_RECENT_CUE_IDENTITIES,
  usesAuthorityTickOnly: true as const,
  consumesFrozenMapExperienceOnly: true as const,
  currentGuidanceAndRiskShapeLanguageWired: true as const,
  routeWideSegmentShapeCatalogWired: true as const,
  routeWideChapterLandmarkCatalogWired: true as const,
  chapterLandmarkUsesExistingSegmentEntryCueOnly: true as const,
  chapterLandmarkCreatesGeometryMaterialsTexturesOrDrawCalls: false as const,
  chapterBoundaryUniformMultiplier: 1.04 as const,
  visualCompositionOrder: Object.freeze([
    'authored-baseline',
    'segment-shape',
    'chapter-landmark',
    'current-segment',
    'safe-anchor-or-respawn-cue',
  ] as const),
  anchorCueBoostUsesPostShapeScale: true as const,
  anchorCueBoostAggregatesPerTargetNode: true as const,
  normalUniformCueRelativeMaximumDelta:
    NORMAL_UNIFORM_CUE_RELATIVE_MAXIMUM_DELTA,
  reducedMotionUniformCueRelativeMaximumDelta:
    REDUCED_MOTION_UNIFORM_CUE_RELATIVE_MAXIMUM_DELTA,
  shapeLanguageContentHash: ARENA_V2_KZ_ROUTE_THREE_SHAPE_LANGUAGE_CANDIDATE_V1.contentHash,
  chapterShapeLanguageContentHash:
    ARENA_V2_KZ_ROUTE_THREE_CHAPTER_LANDMARK_LANGUAGE_CANDIDATE_V1.contentHash,
  guidanceShapeCount: ARENA_V2_KZ_ROUTE_THREE_SHAPE_LANGUAGE_CANDIDATE_V1.guidanceShapeCount,
  riskShapeCount: ARENA_V2_KZ_ROUTE_THREE_SHAPE_LANGUAGE_CANDIDATE_V1.riskShapeCount,
  routeOrDangerInferenceAllowed: false as const,
  constructorTransformRollbackExposesRetryableDebt: true as const,
  terminalTransformCleanupWatermarks: Object.freeze([
    'quaternion-restored',
    'scale-restored',
  ] as const),
  ordinaryCleanupFailureRetainsCurrentAndLaterNodes: true as const,
  validationStatus: 'not-run' as const,
});
