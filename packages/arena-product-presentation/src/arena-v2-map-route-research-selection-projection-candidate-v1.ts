import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  projectArenaV2MapRouteResearchMilestoneV1,
  resolveArenaV2MapRouteSegmentFocusV1,
} from '@number-strategy-jump/arena-product-progression';
import type {
  ArenaV2InformationSelectionItemCandidateV1,
  ArenaV2InformationSelectionProjectionCandidateV1,
} from './arena-v2-information-selection-render-plan-candidate-v1.js';

export interface ArenaV2MapRouteResearchSelectionFactCandidateV1 {
  readonly mapDefinitionId: string;
  readonly evidencePerSegmentTarget: number;
  readonly segments: readonly Readonly<{
    readonly segmentDefinitionId: string;
    readonly displayName: string;
    readonly completionEvidenceCount: number;
  }>[];
}

export interface ArenaV2MapRouteResearchSelectionProjectionInputCandidateV1 {
  readonly schemaVersion: 1;
  readonly profileRevision: number;
  readonly replayWeaponRotationSpan: number;
  readonly selection: ArenaV2InformationSelectionProjectionCandidateV1;
  readonly mapResearchFacts: readonly ArenaV2MapRouteResearchSelectionFactCandidateV1[];
}

const INPUT_KEYS = new Set([
  'schemaVersion', 'profileRevision', 'replayWeaponRotationSpan',
  'selection', 'mapResearchFacts',
]);
const SELECTION_KEYS = new Set(['kind', 'selectedId', 'items']);
const ITEM_KEYS = new Set([
  'id', 'label', 'description', 'available', 'unavailableReason',
]);
const REQUIRED_ITEM_KEYS = Object.freeze(['id', 'label', 'description'] as const);
const FACT_KEYS = new Set([
  'mapDefinitionId', 'evidencePerSegmentTarget', 'segments',
]);
const SEGMENT_FACT_KEYS = new Set([
  'segmentDefinitionId', 'displayName', 'completionEvidenceCount',
]);

function exactRecord(value: unknown, keys: ReadonlySet<string>, name: string) {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  return source;
}

function selection(value: unknown): ArenaV2InformationSelectionProjectionCandidateV1 {
  const source = exactRecord(value, SELECTION_KEYS, 'Arena地图路线研究卡片选择投影');
  if (source.kind !== 'map') {
    throw new RangeError('Arena地图路线研究可读性只能投影到地图卡片。');
  }
  const selectedId = assertNonEmptyString(
    source.selectedId,
    'Arena地图路线研究卡片selectedId',
  );
  if (!Array.isArray(source.items)) {
    throw new TypeError('Arena地图路线研究卡片items必须是数组。');
  }
  const maps = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps;
  if (source.items.length !== maps.length) {
    throw new RangeError('Arena地图路线研究卡片必须精确覆盖正式两张地图。');
  }
  const items = Object.freeze(source.items.map((value, index) => {
    const name = `Arena地图路线研究卡片[${index}]`;
    const item = assertPlainRecord(value, name);
    assertKnownKeys(item, ITEM_KEYS, name);
    for (const key of REQUIRED_ITEM_KEYS) {
      if (!Object.hasOwn(item, key)) throw new TypeError(`${name}缺少${key}。`);
    }
    const id = assertNonEmptyString(item.id, `${name}.id`);
    if (id !== maps[index]!.mapDefinitionId) {
      throw new RangeError('Arena地图路线研究卡片顺序与正式地图目录不一致。');
    }
    const hasAvailable = Object.hasOwn(item, 'available');
    const hasUnavailableReason = Object.hasOwn(item, 'unavailableReason');
    if (hasAvailable !== hasUnavailableReason) {
      throw new TypeError(`${name}可用性字段必须成对提供。`);
    }
    if (hasAvailable && typeof item.available !== 'boolean') {
      throw new TypeError(`${name}.available必须是布尔值。`);
    }
    const unavailableReason = !hasUnavailableReason || item.unavailableReason === null
      ? null
      : assertNonEmptyString(item.unavailableReason, `${name}.unavailableReason`);
    if (hasAvailable && item.available === (unavailableReason !== null)) {
      throw new RangeError(`${name}可用性语义不闭合。`);
    }
    return Object.freeze({
      id,
      label: assertNonEmptyString(item.label, `${name}.label`),
      description: assertNonEmptyString(item.description, `${name}.description`),
      ...(hasAvailable
        ? { available: item.available as boolean, unavailableReason }
        : {}),
    });
  }));
  const selected = items.find(({ id }) => id === selectedId);
  if (selected === undefined || selected.available === false) {
    throw new RangeError('Arena地图路线研究卡片selectedId必须指向可用项。');
  }
  return Object.freeze({ kind: 'map' as const, selectedId, items });
}

function researchFacts(
  value: unknown,
): readonly Readonly<{
  readonly mapDefinitionId: string;
  readonly projection: ReturnType<typeof projectArenaV2MapRouteResearchMilestoneV1>;
  readonly nextSegment: Readonly<{
    readonly ordinal: number;
    readonly displayName: string;
    readonly completionEvidenceCount: number;
  }> | null;
}>[] {
  if (!Array.isArray(value)) {
    throw new TypeError('Arena地图路线研究卡片facts必须是数组。');
  }
  const maps = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps;
  if (value.length !== maps.length) {
    throw new RangeError('Arena地图路线研究卡片facts必须精确覆盖正式两张地图。');
  }
  return Object.freeze(value.map((entry, index) => {
    const name = `Arena地图路线研究卡片fact[${index}]`;
    const source = exactRecord(entry, FACT_KEYS, name);
    const mapDefinitionId = assertNonEmptyString(source.mapDefinitionId, `${name}.mapDefinitionId`);
    if (mapDefinitionId !== maps[index]!.mapDefinitionId) {
      throw new RangeError('Arena地图路线研究卡片facts顺序与正式地图目录不一致。');
    }
    const map = maps[index]!;
    if (!Number.isSafeInteger(source.evidencePerSegmentTarget)
      || (source.evidencePerSegmentTarget as number) <= 0) {
      throw new RangeError(`${name}.evidencePerSegmentTarget必须是正安全整数。`);
    }
    if (!Array.isArray(source.segments) || source.segments.length !== map.segments.length) {
      throw new RangeError(`${name}.segments必须精确覆盖当前地图全部路线段。`);
    }
    const evidencePerSegmentTarget = source.evidencePerSegmentTarget as number;
    const segments = Object.freeze(source.segments.map((entry, segmentIndex) => {
      const segmentName = `${name}.segments[${segmentIndex}]`;
      const segment = exactRecord(entry, SEGMENT_FACT_KEYS, segmentName);
      const segmentDefinitionId = assertNonEmptyString(
        segment.segmentDefinitionId,
        `${segmentName}.segmentDefinitionId`,
      );
      if (segmentDefinitionId !== map.segments[segmentIndex]!.segmentDefinitionId) {
        throw new RangeError(`${name}.segments顺序与正式路线目录不一致。`);
      }
      if (!Number.isSafeInteger(segment.completionEvidenceCount)
        || (segment.completionEvidenceCount as number) < 0
        || (segment.completionEvidenceCount as number) > evidencePerSegmentTarget) {
        throw new RangeError(`${segmentName}.completionEvidenceCount越界。`);
      }
      return Object.freeze({
        segmentDefinitionId,
        displayName: assertNonEmptyString(segment.displayName, `${segmentName}.displayName`),
        completionEvidenceCount: segment.completionEvidenceCount as number,
      });
    }));
    const evidenceCount = segments.reduce(
      (total, segment) => total + segment.completionEvidenceCount,
      0,
    );
    const completedSegmentCount = segments.filter(
      ({ completionEvidenceCount }) => completionEvidenceCount === evidencePerSegmentTarget,
    ).length;
    const nextSegmentFocus = resolveArenaV2MapRouteSegmentFocusV1({
      evidencePerSegmentTarget,
      segments: segments.map(({ segmentDefinitionId, completionEvidenceCount }) => ({
        segmentDefinitionId,
        completionEvidenceCount,
      })),
    });
    return Object.freeze({
      mapDefinitionId,
      projection: projectArenaV2MapRouteResearchMilestoneV1({
        evidenceCount,
        completedSegmentCount,
        segmentCount: segments.length,
        evidencePerSegmentTarget,
      }),
      nextSegment: nextSegmentFocus === null
        ? null
        : Object.freeze({
          ordinal: nextSegmentFocus.ordinal,
          displayName: segments[nextSegmentFocus.ordinal - 1]!.displayName,
          completionEvidenceCount: nextSegmentFocus.currentProgress,
        }),
    });
  }));
}

function replaceExactlyOnce(
  value: string,
  expected: string,
  replacement: string,
  name: string,
): string {
  const first = value.indexOf(expected);
  if (first < 0 || value.indexOf(expected, first + expected.length) >= 0) {
    throw new RangeError(`${name}必须精确包含一个既有路线理解片段。`);
  }
  return `${value.slice(0, first)}${replacement}${value.slice(first + expected.length)}`;
}

export function projectArenaV2MapRouteResearchSelectionCandidateV1(
  value: ArenaV2MapRouteResearchSelectionProjectionInputCandidateV1,
): ArenaV2InformationSelectionProjectionCandidateV1 {
  const input = cloneFrozenData(value, 'Arena地图路线研究卡片可读性投影输入');
  const source = exactRecord(input, INPUT_KEYS, 'Arena地图路线研究卡片可读性投影输入');
  if (source.schemaVersion !== 1) {
    throw new RangeError('Arena地图路线研究卡片可读性投影版本无效。');
  }
  const profileRevision = assertIntegerAtLeast(
    source.profileRevision,
    0,
    'Arena地图路线研究卡片profileRevision',
  );
  const replayWeaponRotationSpan = assertIntegerAtLeast(
    source.replayWeaponRotationSpan,
    1,
    'Arena地图路线研究卡片replayWeaponRotationSpan',
  );
  if (replayWeaponRotationSpan
    > ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons.length) {
    throw new RangeError('Arena地图路线研究卡片武器轮转跨度超过正式目录。');
  }
  const existing = selection(source.selection);
  const facts = researchFacts(source.mapResearchFacts);
  const allRoutesComplete = facts.every(({ nextSegment }) => nextSegment === null);
  const replayEligibleItems = existing.items.filter(({ available }) => available !== false);
  if (allRoutesComplete && replayEligibleItems.length === 0) {
    throw new RangeError('Arena地图路线研究卡片没有可用复练地图。');
  }
  const replayMapRotationEpoch = Math.floor(profileRevision / replayWeaponRotationSpan);
  const replayMapDefinitionId = allRoutesComplete
    ? replayEligibleItems[replayMapRotationEpoch % replayEligibleItems.length]!.id
    : null;
  const items = Object.freeze(existing.items.map((item, index) => {
    const fact = facts[index]!;
    if (item.id !== fact.mapDefinitionId) {
      throw new RangeError('Arena地图路线研究卡片与facts身份漂移。');
    }
    const research = fact.projection;
    const existingProgressText = `路线理解 ${research.completedSegmentCount}/${research.segmentCount}`;
    const nextMilestoneText = research.nextMilestonePercentage === null
      ? '里程碑完成'
      : `${research.nextMilestonePercentage}%还需${research.remainingEvidenceCount}次`;
    const nextSegmentText = fact.nextSegment === null
      ? replayMapDefinitionId === item.id
        ? '全部路段已理解 · 本轮复练地图'
        : '全部路段已理解'
      : `下一段${fact.nextSegment.ordinal}.${fact.nextSegment.displayName} ${
        fact.nextSegment.completionEvidenceCount
      }/${research.evidencePerSegmentTarget}`;
    const description = replaceExactlyOnce(
      item.description,
      existingProgressText,
      `${research.stage} · ${existingProgressText} · ${nextSegmentText} · ${nextMilestoneText}`,
      `Arena地图路线研究卡片[${index}].description`,
    );
    return Object.freeze({
      id: item.id,
      label: item.label,
      description,
      ...(Object.hasOwn(item, 'available')
        ? { available: item.available!, unavailableReason: item.unavailableReason! }
        : {}),
    }) satisfies ArenaV2InformationSelectionItemCandidateV1;
  }));
  return Object.freeze({ kind: existing.kind, selectedId: existing.selectedId, items });
}

export const ARENA_V2_MAP_ROUTE_RESEARCH_SELECTION_PROJECTION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  implementationStatus: 'code-written-not-run' as const,
  validationStatus: 'not-run' as const,
  hardGate: false as const,
  defaultSurfaceWired: false as const,
  mutatesProfile: false as const,
  grantsRewards: false as const,
  addsSelectionFields: false as const,
  reusesMapRouteResearchMilestoneProjector: true as const,
  nextSegmentUsesSharedLeastPracticedResolver: true as const,
  completedRouteReplayRotationUsesProfileRevisionWeaponEpochModuloCatalog: true as const,
  completedRouteReplayWeaponEpochLengthSource: 'validated-eligible-weapon-count' as const,
  completedRouteReplayRotationExcludesUnavailableMaps: true as const,
  completedRouteReplayRotationAddsPersistedState: false as const,
});
