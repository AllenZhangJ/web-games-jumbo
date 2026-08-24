import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export type ArenaV2FormalVfxCameraEdgeBiasCandidateV1 =
  | 'center'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export type ArenaV2FormalVfxCameraEdgeLaneCandidateV1 =
  | 'primary-center'
  | 'secondary-upper-left'
  | 'tertiary-upper-right';

export interface ArenaV2FormalVfxCameraEdgeSafeEntryCandidateV1 {
  readonly sourceEventId: string;
  readonly anchorIdentity: string;
  readonly lane: ArenaV2FormalVfxCameraEdgeLaneCandidateV1;
  readonly projectedAnchorNdc: Readonly<{
    readonly x: number;
    readonly y: number;
    readonly z: number;
  }>;
}

export interface ArenaV2FormalVfxCameraEdgeSafeLaneCandidateV1 {
  readonly sourceEventId: string;
  readonly anchorIdentity: string;
  readonly lane: ArenaV2FormalVfxCameraEdgeLaneCandidateV1;
  readonly edgeBias: ArenaV2FormalVfxCameraEdgeBiasCandidateV1;
  readonly projectionDepthVisible: boolean;
  readonly offsetCameraX: number;
  readonly offsetCameraY: number;
}

const ROOT_KEYS = new Set(['schemaVersion', 'entries']);
const ENTRY_KEYS = new Set([
  'sourceEventId',
  'anchorIdentity',
  'lane',
  'projectedAnchorNdc',
]);
const NDC_KEYS = new Set(['x', 'y', 'z']);
const MAXIMUM_ACTIVE_EFFECTS = 3;
const EDGE_NDC_THRESHOLD = 0.72;
const LANE_SPECS = Object.freeze({
  'primary-center': Object.freeze({
    ordinal: 0,
    offsetCameraX: 0,
    offsetCameraY: 0,
  }),
  'secondary-upper-left': Object.freeze({
    ordinal: 1,
    offsetCameraX: -0.24,
    offsetCameraY: 0.18,
  }),
  'tertiary-upper-right': Object.freeze({
    ordinal: 2,
    offsetCameraX: 0.24,
    offsetCameraY: 0.18,
  }),
} as const);

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function finiteNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RangeError(`${name}必须是有限数字。`);
  }
  return value;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function parseEntry(
  value: unknown,
  index: number,
): ArenaV2FormalVfxCameraEdgeSafeEntryCandidateV1 {
  const name = `Arena V2 formal VFX相机边缘安全组合.entries[${index}]`;
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, ENTRY_KEYS, name);
  for (const key of ENTRY_KEYS) dataField(source, key, name);
  const lane = dataField(source, 'lane', name);
  if (lane !== 'primary-center'
    && lane !== 'secondary-upper-left'
    && lane !== 'tertiary-upper-right') {
    throw new RangeError(`${name}.lane不是既有三槽闭集。`);
  }
  const ndcName = `${name}.projectedAnchorNdc`;
  const ndcSource = assertPlainRecord(dataField(source, 'projectedAnchorNdc', name), ndcName);
  assertKnownKeys(ndcSource, NDC_KEYS, ndcName);
  for (const key of NDC_KEYS) dataField(ndcSource, key, ndcName);
  return Object.freeze({
    sourceEventId: assertNonEmptyString(
      dataField(source, 'sourceEventId', name),
      `${name}.sourceEventId`,
    ),
    anchorIdentity: assertNonEmptyString(
      dataField(source, 'anchorIdentity', name),
      `${name}.anchorIdentity`,
    ),
    lane,
    projectedAnchorNdc: Object.freeze({
      x: finiteNumber(dataField(ndcSource, 'x', ndcName), `${ndcName}.x`),
      y: finiteNumber(dataField(ndcSource, 'y', ndcName), `${ndcName}.y`),
      z: finiteNumber(dataField(ndcSource, 'z', ndcName), `${ndcName}.z`),
    }),
  });
}

function edgeBias(
  projectedAnchorNdc: ArenaV2FormalVfxCameraEdgeSafeEntryCandidateV1[
    'projectedAnchorNdc'
  ],
): ArenaV2FormalVfxCameraEdgeBiasCandidateV1 {
  if (projectedAnchorNdc.z < -1 || projectedAnchorNdc.z > 1) return 'center';
  const horizontalPressure = Math.max(
    0,
    Math.abs(projectedAnchorNdc.x) - EDGE_NDC_THRESHOLD,
  );
  const verticalPressure = Math.max(
    0,
    Math.abs(projectedAnchorNdc.y) - EDGE_NDC_THRESHOLD,
  );
  if (horizontalPressure === 0 && verticalPressure === 0) return 'center';
  if (horizontalPressure > 0 && verticalPressure > 0) {
    if (projectedAnchorNdc.y > 0) {
      return projectedAnchorNdc.x < 0 ? 'top-left' : 'top-right';
    }
    return projectedAnchorNdc.x < 0 ? 'bottom-left' : 'bottom-right';
  }
  if (horizontalPressure > 0) return projectedAnchorNdc.x < 0 ? 'left' : 'right';
  return projectedAnchorNdc.y < 0 ? 'bottom' : 'top';
}

function edgeSafeOffset(
  lane: ArenaV2FormalVfxCameraEdgeLaneCandidateV1,
  bias: ArenaV2FormalVfxCameraEdgeBiasCandidateV1,
): Readonly<{ readonly x: number; readonly y: number }> {
  const base = LANE_SPECS[lane];
  if (bias === 'top-left'
    || bias === 'top-right'
    || bias === 'bottom-left'
    || bias === 'bottom-right') {
    if (lane === 'primary-center') return Object.freeze({ x: 0, y: 0 });
    const inwardX = bias === 'top-left' || bias === 'bottom-left' ? 1 : -1;
    const inwardY = bias === 'top-left' || bias === 'top-right' ? -1 : 1;
    const secondary = lane === 'secondary-upper-left';
    return Object.freeze({
      x: inwardX * (secondary ? 0.18 : 0.24),
      y: inwardY * (secondary ? 0.24 : 0.18),
    });
  }
  if (bias === 'left') {
    return Object.freeze({ x: base.offsetCameraY, y: -base.offsetCameraX });
  }
  if (bias === 'right') {
    return Object.freeze({ x: -base.offsetCameraY, y: base.offsetCameraX });
  }
  if (bias === 'top') {
    return Object.freeze({ x: base.offsetCameraX, y: -base.offsetCameraY });
  }
  return Object.freeze({ x: base.offsetCameraX, y: base.offsetCameraY });
}

/**
 * Rotates the existing three-lane camera-plane fan toward the visible frame.
 * It uses only forward-projected presentation coordinates; the primary lane
 * remains exactly at the authoritative visual anchor and no unprojection,
 * radius/clip measurement, occlusion inference, hit inference, or gameplay
 * clamping is performed. It is an inward bias, not a viewport containment
 * guarantee for an anchor that is already outside the camera frame.
 */
export function composeArenaV2FormalVfxCameraEdgeSafeCandidateV1(
  value: unknown,
): readonly ArenaV2FormalVfxCameraEdgeSafeLaneCandidateV1[] {
  const cloned = cloneFrozenData(value, 'Arena V2 formal VFX相机边缘安全组合输入');
  const source = assertPlainRecord(cloned, 'Arena V2 formal VFX相机边缘安全组合输入');
  assertKnownKeys(source, ROOT_KEYS, 'Arena V2 formal VFX相机边缘安全组合输入');
  for (const key of ROOT_KEYS) dataField(source, key, 'Arena V2 formal VFX相机边缘安全组合输入');
  if (dataField(source, 'schemaVersion', 'Arena V2 formal VFX相机边缘安全组合输入') !== 1) {
    throw new RangeError('Arena V2 formal VFX相机边缘安全组合只接受V1。');
  }
  const rawEntries = dataField(source, 'entries', 'Arena V2 formal VFX相机边缘安全组合输入');
  if (!Array.isArray(rawEntries) || rawEntries.length > MAXIMUM_ACTIVE_EFFECTS) {
    throw new RangeError('Arena V2 formal VFX相机边缘安全组合最多接受3项可见效果。');
  }
  const entries = rawEntries.map(parseEntry);
  if (new Set(entries.map(({ sourceEventId }) => sourceEventId)).size !== entries.length) {
    throw new RangeError('Arena V2 formal VFX相机边缘安全组合拒绝重复sourceEventId。');
  }

  const projectionByAnchor = new Map<string, string>();
  const anchorLaneIdentities = new Set<string>();
  for (const entry of entries) {
    const anchorLaneIdentity = JSON.stringify([entry.anchorIdentity, entry.lane]);
    if (anchorLaneIdentities.has(anchorLaneIdentity)) {
      throw new RangeError('Arena V2 formal VFX相机边缘安全组合拒绝同锚点重复lane。');
    }
    anchorLaneIdentities.add(anchorLaneIdentity);
    const projectionCanonical = JSON.stringify(entry.projectedAnchorNdc);
    const existing = projectionByAnchor.get(entry.anchorIdentity);
    if (existing !== undefined && existing !== projectionCanonical) {
      throw new RangeError('Arena V2 formal VFX同一锚点在同一次组合中发生投影漂移。');
    }
    projectionByAnchor.set(entry.anchorIdentity, projectionCanonical);
  }

  const sorted = entries.slice().sort((left, right) => (
    compareText(left.anchorIdentity, right.anchorIdentity)
    || LANE_SPECS[left.lane].ordinal - LANE_SPECS[right.lane].ordinal
    || compareText(left.sourceEventId, right.sourceEventId)
  ));
  return Object.freeze(sorted.map((entry) => {
    const projectionDepthVisible = entry.projectedAnchorNdc.z >= -1
      && entry.projectedAnchorNdc.z <= 1;
    const bias = edgeBias(entry.projectedAnchorNdc);
    const offset = edgeSafeOffset(entry.lane, bias);
    return Object.freeze({
      sourceEventId: entry.sourceEventId,
      anchorIdentity: entry.anchorIdentity,
      lane: entry.lane,
      edgeBias: bias,
      projectionDepthVisible,
      offsetCameraX: offset.x,
      offsetCameraY: offset.y,
    });
  }));
}

export const ARENA_V2_FORMAL_VFX_CAMERA_EDGE_SAFE_COMPOSITION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  cameraEdgeNdcThreshold: EDGE_NDC_THRESHOLD,
  maximumActiveEffects: MAXIMUM_ACTIVE_EFFECTS,
  maximumSameAnchorLanes: 3 as const,
  keepsPrimaryAtAuthoritativeVisualAnchor: true as const,
  usesForwardProjectionOnly: true as const,
  usesUnprojection: false as const,
  measuresEffectRadiusOrClipRect: false as const,
  guaranteesFullViewportContainment: false as const,
  infersOcclusionHitFallDirectionOrWinner: false as const,
  addsGeometry: false as const,
  addsMaterial: false as const,
  addsTexture: false as const,
  addsDrawCall: false as const,
  reducedMotionKeepsStaticInwardComposition: true as const,
  defaultEntryWired: false as const,
});
