import {
  assertKnownKeys,
  assertPlainRecord,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_KZ_ROUTE_GUIDANCE_SHAPE_IDS_CANDIDATE_V1,
  ARENA_V2_KZ_ROUTE_RISK_SHAPE_IDS_CANDIDATE_V1,
  type ArenaV2KzRouteGuidanceShapeCandidateV1,
  type ArenaV2KzRouteRiskShapeCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';

export interface ArenaV2KzRouteThreeShapeTransformCandidateV1 {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly scaleZ: number;
  readonly rotationXRadians: number;
  readonly rotationYRadians: number;
  readonly rotationZRadians: number;
}

export interface ArenaV2KzRouteThreeGuidanceShapeProfileCandidateV1 {
  readonly guidanceShape: ArenaV2KzRouteGuidanceShapeCandidateV1;
  readonly transform: ArenaV2KzRouteThreeShapeTransformCandidateV1;
}

export interface ArenaV2KzRouteThreeRiskShapeProfileCandidateV1 {
  readonly riskShape: ArenaV2KzRouteRiskShapeCandidateV1;
  readonly transform: ArenaV2KzRouteThreeShapeTransformCandidateV1;
}

export interface ArenaV2KzRouteThreeResolvedShapeLanguageCandidateV1 {
  readonly schemaVersion: 1;
  readonly sourceContentHash: string;
  readonly guidanceShape: ArenaV2KzRouteGuidanceShapeCandidateV1;
  readonly riskShape: ArenaV2KzRouteRiskShapeCandidateV1;
  readonly transform: ArenaV2KzRouteThreeShapeTransformCandidateV1;
  readonly shapeIdentity: string;
  readonly colorIsNeverSoleSignal: true;
}

const RESOLVE_INPUT_KEYS = new Set(['guidanceShape', 'riskShape']);
const MINIMUM_SCALE = 0.64;
const MAXIMUM_SCALE = 1.76;
const MAXIMUM_ABSOLUTE_ROTATION_RADIANS = Math.PI / 2;

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function frozenTransform(
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  rotationXRadians = 0,
  rotationYRadians = 0,
  rotationZRadians = 0,
): ArenaV2KzRouteThreeShapeTransformCandidateV1 {
  for (const [name, value] of Object.entries({ scaleX, scaleY, scaleZ })) {
    if (!Number.isFinite(value) || value < MINIMUM_SCALE || value > MAXIMUM_SCALE) {
      throw new RangeError(`Arena V2 KZ路线形状${name}超出静态表现边界。`);
    }
  }
  for (const [name, value] of Object.entries({
    rotationXRadians,
    rotationYRadians,
    rotationZRadians,
  })) {
    if (!Number.isFinite(value) || Math.abs(value) > MAXIMUM_ABSOLUTE_ROTATION_RADIANS) {
      throw new RangeError(`Arena V2 KZ路线形状${name}超出静态表现边界。`);
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

function guidanceProfile(
  guidanceShape: ArenaV2KzRouteGuidanceShapeCandidateV1,
  transform: ArenaV2KzRouteThreeShapeTransformCandidateV1,
): ArenaV2KzRouteThreeGuidanceShapeProfileCandidateV1 {
  return Object.freeze({ guidanceShape, transform });
}

function riskProfile(
  riskShape: ArenaV2KzRouteRiskShapeCandidateV1,
  transform: ArenaV2KzRouteThreeShapeTransformCandidateV1,
): ArenaV2KzRouteThreeRiskShapeProfileCandidateV1 {
  return Object.freeze({ riskShape, transform });
}

const GUIDANCE_PROFILES = Object.freeze({
  'stable-platform': guidanceProfile(
    'stable-platform',
    frozenTransform(1.24, 1, 1.24),
  ),
  'broken-gap': guidanceProfile(
    'broken-gap',
    frozenTransform(1.5, 0.86, 1.08),
  ),
  'rising-steps': guidanceProfile(
    'rising-steps',
    frozenTransform(1.04, 1.42, 1.18),
  ),
  'branch-diamond': guidanceProfile(
    'branch-diamond',
    frozenTransform(1.3, 1.04, 1.3, 0, Math.PI / 4, 0),
  ),
  'narrow-rail': guidanceProfile(
    'narrow-rail',
    frozenTransform(0.82, 1.08, 1.52),
  ),
  'balance-line': guidanceProfile(
    'balance-line',
    frozenTransform(0.72, 1.38, 0.72, 0, Math.PI / 4, 0),
  ),
}) satisfies Readonly<Record<
  ArenaV2KzRouteGuidanceShapeCandidateV1,
  ArenaV2KzRouteThreeGuidanceShapeProfileCandidateV1
>>;

const RISK_PROFILES = Object.freeze({
  'solid-safe': riskProfile(
    'solid-safe',
    frozenTransform(1, 1, 1),
  ),
  'striped-pressure': riskProfile(
    'striped-pressure',
    frozenTransform(0.92, 1.22, 1, 0, 0, -Math.PI / 12),
  ),
  'forked-choice': riskProfile(
    'forked-choice',
    frozenTransform(1.12, 1.05, 0.9, 0, 0, Math.PI / 6),
  ),
  'open-recovery': riskProfile(
    'open-recovery',
    frozenTransform(1.08, 0.82, 1.12, 0, 0, Math.PI / 12),
  ),
}) satisfies Readonly<Record<
  ArenaV2KzRouteRiskShapeCandidateV1,
  ArenaV2KzRouteThreeRiskShapeProfileCandidateV1
>>;

function requireGuidanceShape(value: unknown): ArenaV2KzRouteGuidanceShapeCandidateV1 {
  if (typeof value !== 'string'
    || !ARENA_V2_KZ_ROUTE_GUIDANCE_SHAPE_IDS_CANDIDATE_V1.includes(
      value as ArenaV2KzRouteGuidanceShapeCandidateV1,
    )) {
    throw new RangeError(`Arena V2 KZ Three未知guidanceShape：${String(value)}。`);
  }
  return value as ArenaV2KzRouteGuidanceShapeCandidateV1;
}

function requireRiskShape(value: unknown): ArenaV2KzRouteRiskShapeCandidateV1 {
  if (typeof value !== 'string'
    || !ARENA_V2_KZ_ROUTE_RISK_SHAPE_IDS_CANDIDATE_V1.includes(
      value as ArenaV2KzRouteRiskShapeCandidateV1,
    )) {
    throw new RangeError(`Arena V2 KZ Three未知riskShape：${String(value)}。`);
  }
  return value as ArenaV2KzRouteRiskShapeCandidateV1;
}

const CORE = Object.freeze({
  schemaVersion: 1 as const,
  identity: 'arena-v2.kz-route-three-shape-language.candidate.v1' as const,
  scaleComposition: 'multiply-per-axis' as const,
  rotationComposition: 'add-radians-xyz' as const,
  guidanceProfiles: Object.freeze(
    ARENA_V2_KZ_ROUTE_GUIDANCE_SHAPE_IDS_CANDIDATE_V1.map((id) => GUIDANCE_PROFILES[id]),
  ),
  riskProfiles: Object.freeze(
    ARENA_V2_KZ_ROUTE_RISK_SHAPE_IDS_CANDIDATE_V1.map((id) => RISK_PROFILES[id]),
  ),
});

const CONTENT_HASH = createDeterministicDataHash(
  CORE,
  'Arena V2 KZ route Three shape language candidate V1',
);

function shapeKey(
  guidanceShape: ArenaV2KzRouteGuidanceShapeCandidateV1,
  riskShape: ArenaV2KzRouteRiskShapeCandidateV1,
): string {
  return `${guidanceShape}\u0000${riskShape}`;
}

function resolvedShape(
  guidanceShape: ArenaV2KzRouteGuidanceShapeCandidateV1,
  riskShape: ArenaV2KzRouteRiskShapeCandidateV1,
): ArenaV2KzRouteThreeResolvedShapeLanguageCandidateV1 {
  const guidance = GUIDANCE_PROFILES[guidanceShape].transform;
  const risk = RISK_PROFILES[riskShape].transform;
  const transform = frozenTransform(
    guidance.scaleX * risk.scaleX,
    guidance.scaleY * risk.scaleY,
    guidance.scaleZ * risk.scaleZ,
    guidance.rotationXRadians + risk.rotationXRadians,
    guidance.rotationYRadians + risk.rotationYRadians,
    guidance.rotationZRadians + risk.rotationZRadians,
  );
  const shapeIdentity = createDeterministicDataHash(
    { sourceContentHash: CONTENT_HASH, guidanceShape, riskShape, transform },
    `Arena V2 KZ Three route shape ${guidanceShape}/${riskShape}`,
  );
  return Object.freeze({
    schemaVersion: 1 as const,
    sourceContentHash: CONTENT_HASH,
    guidanceShape,
    riskShape,
    transform,
    shapeIdentity,
    colorIsNeverSoleSignal: true as const,
  });
}

const RESOLVED_SHAPES = Object.freeze(
  ARENA_V2_KZ_ROUTE_GUIDANCE_SHAPE_IDS_CANDIDATE_V1.flatMap((guidanceShape) => (
    ARENA_V2_KZ_ROUTE_RISK_SHAPE_IDS_CANDIDATE_V1.map((riskShape) => (
      resolvedShape(guidanceShape, riskShape)
    ))
  )),
);
const RESOLVED_SHAPES_BY_KEY = new Map(RESOLVED_SHAPES.map((shape) => [
  shapeKey(shape.guidanceShape, shape.riskShape),
  shape,
]));

export function resolveArenaV2KzRouteThreeShapeLanguageCandidateV1(
  value: unknown,
): ArenaV2KzRouteThreeResolvedShapeLanguageCandidateV1 {
  const input = assertPlainRecord(value, 'Arena V2 KZ Three路线形状解析输入');
  if (Object.getOwnPropertySymbols(input).length !== 0) {
    throw new TypeError('Arena V2 KZ Three路线形状解析输入不能包含Symbol键。');
  }
  assertKnownKeys(input, RESOLVE_INPUT_KEYS, 'Arena V2 KZ Three路线形状解析输入');
  for (const key of RESOLVE_INPUT_KEYS) dataField(input, key, 'Arena V2 KZ Three路线形状解析输入');
  const guidanceShape = requireGuidanceShape(input.guidanceShape);
  const riskShape = requireRiskShape(input.riskShape);
  const resolved = RESOLVED_SHAPES_BY_KEY.get(shapeKey(guidanceShape, riskShape));
  if (resolved === undefined) throw new RangeError('Arena V2 KZ Three路线形状目录不闭合。');
  return resolved;
}

const COMBINATION_SIGNATURES = new Set(
  RESOLVED_SHAPES.map(({ transform }) => JSON.stringify(transform)),
);
const EXPECTED_COMBINATION_COUNT = ARENA_V2_KZ_ROUTE_GUIDANCE_SHAPE_IDS_CANDIDATE_V1.length
  * ARENA_V2_KZ_ROUTE_RISK_SHAPE_IDS_CANDIDATE_V1.length;
if (RESOLVED_SHAPES_BY_KEY.size !== EXPECTED_COMBINATION_COUNT
  || COMBINATION_SIGNATURES.size !== EXPECTED_COMBINATION_COUNT) {
  throw new RangeError('Arena V2 KZ Three路线形状组合身份不唯一。');
}

export const ARENA_V2_KZ_ROUTE_THREE_SHAPE_LANGUAGE_CANDIDATE_V1 = Object.freeze({
  ...CORE,
  contentHash: CONTENT_HASH,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  guidanceShapeCount: ARENA_V2_KZ_ROUTE_GUIDANCE_SHAPE_IDS_CANDIDATE_V1.length,
  riskShapeCount: ARENA_V2_KZ_ROUTE_RISK_SHAPE_IDS_CANDIDATE_V1.length,
  exactCombinationCount: EXPECTED_COMBINATION_COUNT,
  usesExistingAuthoredSegmentEntryCueOnly: true as const,
  createsGeometryOrMaterials: false as const,
  changesCollisionRouteOrAuthority: false as const,
  usesColorAsSoleSignal: false as const,
  usesWallClockRandomOrAnimation: false as const,
  defaultEntryWired: false as const,
});
