import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export type ArenaV2FormalVfxSameAnchorSemanticRankCandidateV1 = 0 | 1 | 2 | 3;

export interface ArenaV2FormalVfxSameAnchorCompositionEntryCandidateV1 {
  readonly sourceEventId: string;
  readonly anchorIdentity: string;
  readonly tick: number;
  readonly sequence: number;
  readonly semanticRank: ArenaV2FormalVfxSameAnchorSemanticRankCandidateV1;
}

export interface ArenaV2FormalVfxSameAnchorCompositionLaneCandidateV1 {
  readonly sourceEventId: string;
  readonly anchorIdentity: string;
  readonly lane: 'primary-center' | 'secondary-upper-left' | 'tertiary-upper-right';
  readonly offsetCameraX: 0 | -0.24 | 0.24;
  readonly offsetCameraY: 0 | 0.18;
}

const ROOT_KEYS = new Set(['schemaVersion', 'entries']);
const ENTRY_KEYS = new Set([
  'sourceEventId',
  'anchorIdentity',
  'tick',
  'sequence',
  'semanticRank',
]);
const MAXIMUM_ACTIVE_EFFECTS = 3;
const LANE_SPECS = Object.freeze([
  Object.freeze({
    lane: 'primary-center' as const,
    offsetCameraX: 0 as const,
    offsetCameraY: 0 as const,
  }),
  Object.freeze({
    lane: 'secondary-upper-left' as const,
    offsetCameraX: -0.24 as const,
    offsetCameraY: 0.18 as const,
  }),
  Object.freeze({
    lane: 'tertiary-upper-right' as const,
    offsetCameraX: 0.24 as const,
    offsetCameraY: 0.18 as const,
  }),
]);

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function safeInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name}必须是非负安全整数。`);
  }
  return value as number;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function parseEntry(
  value: unknown,
  index: number,
): ArenaV2FormalVfxSameAnchorCompositionEntryCandidateV1 {
  const name = `Arena V2 formal VFX同锚点组合.entries[${index}]`;
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, ENTRY_KEYS, name);
  for (const key of ENTRY_KEYS) dataField(source, key, name);
  const semanticRank = dataField(source, 'semanticRank', name);
  if (semanticRank !== 0 && semanticRank !== 1 && semanticRank !== 2 && semanticRank !== 3) {
    throw new RangeError(`${name}.semanticRank必须是0..3闭集。`);
  }
  return Object.freeze({
    sourceEventId: assertNonEmptyString(
      dataField(source, 'sourceEventId', name),
      `${name}.sourceEventId`,
    ),
    anchorIdentity: assertNonEmptyString(
      dataField(source, 'anchorIdentity', name),
      `${name}.anchorIdentity`,
    ),
    tick: safeInteger(dataField(source, 'tick', name), `${name}.tick`),
    sequence: safeInteger(dataField(source, 'sequence', name), `${name}.sequence`),
    semanticRank,
  });
}

/**
 * Assigns at most three already-authoritative VFX events at the same visual
 * anchor to deterministic camera-plane lanes. This is presentation layout
 * only: semantic rank is supplied by the existing resolved Cue/style and no
 * hit, fall, direction, winner, or weapon rule is inferred here.
 */
export function composeArenaV2FormalVfxSameAnchorCandidateV1(
  value: unknown,
): readonly ArenaV2FormalVfxSameAnchorCompositionLaneCandidateV1[] {
  const cloned = cloneFrozenData(value, 'Arena V2 formal VFX同锚点组合输入');
  const source = assertPlainRecord(cloned, 'Arena V2 formal VFX同锚点组合输入');
  assertKnownKeys(source, ROOT_KEYS, 'Arena V2 formal VFX同锚点组合输入');
  for (const key of ROOT_KEYS) dataField(source, key, 'Arena V2 formal VFX同锚点组合输入');
  if (dataField(source, 'schemaVersion', 'Arena V2 formal VFX同锚点组合输入') !== 1) {
    throw new RangeError('Arena V2 formal VFX同锚点组合只接受V1。');
  }
  const rawEntries = dataField(source, 'entries', 'Arena V2 formal VFX同锚点组合输入');
  if (!Array.isArray(rawEntries) || rawEntries.length > MAXIMUM_ACTIVE_EFFECTS) {
    throw new RangeError('Arena V2 formal VFX同锚点组合最多接受3项活动效果。');
  }
  const entries = rawEntries.map(parseEntry);
  if (new Set(entries.map(({ sourceEventId }) => sourceEventId)).size !== entries.length) {
    throw new RangeError('Arena V2 formal VFX同锚点组合拒绝重复sourceEventId。');
  }

  const byAnchor = new Map<
    string,
    ArenaV2FormalVfxSameAnchorCompositionEntryCandidateV1[]
  >();
  for (const entry of entries) {
    const group = byAnchor.get(entry.anchorIdentity) ?? [];
    group.push(entry);
    byAnchor.set(entry.anchorIdentity, group);
  }

  const lanes: ArenaV2FormalVfxSameAnchorCompositionLaneCandidateV1[] = [];
  for (const [anchorIdentity, group] of [...byAnchor].sort(([left], [right]) => (
    compareText(left, right)
  ))) {
    group.sort((left, right) => (
      right.semanticRank - left.semanticRank
      || right.tick - left.tick
      || right.sequence - left.sequence
      || compareText(left.sourceEventId, right.sourceEventId)
    ));
    group.forEach((entry, index) => {
      const lane = LANE_SPECS[index];
      if (lane === undefined) {
        throw new RangeError(`Arena V2 formal VFX锚点${anchorIdentity}超出3槽组合预算。`);
      }
      lanes.push(Object.freeze({
        sourceEventId: entry.sourceEventId,
        anchorIdentity,
        lane: lane.lane,
        offsetCameraX: lane.offsetCameraX,
        offsetCameraY: lane.offsetCameraY,
      }));
    });
  }
  return Object.freeze(lanes);
}

export const ARENA_V2_FORMAL_VFX_SAME_ANCHOR_COMPOSITION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  maximumActiveEffects: MAXIMUM_ACTIVE_EFFECTS,
  maximumSameAnchorLanes: LANE_SPECS.length,
  addsGeometry: false as const,
  addsMaterial: false as const,
  addsTexture: false as const,
  addsDrawCall: false as const,
  usesIntegerTickAndStableEventIdentityOnly: true as const,
  infersHitFallDirectionOrWinner: false as const,
  reducedMotionKeepsStaticLaneSeparation: true as const,
  defaultEntryWired: false as const,
});
