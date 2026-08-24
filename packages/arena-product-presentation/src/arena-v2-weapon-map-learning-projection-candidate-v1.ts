import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import type {
  WeaponMapSituationV1,
  WeaponModeKindV1,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
  isArenaV2WeaponSituationOpportunityCandidateV1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
} from './arena-v2-information-presentation-content-v1.js';

export interface ArenaV2WeaponMapLearningSituationCandidateV1 {
  readonly situation: WeaponMapSituationV1;
  readonly displayName: string;
  readonly segmentCount: number;
  readonly exampleSegmentDefinitionId: string;
  readonly exampleSegmentOrdinal: number;
  readonly exampleSegmentDisplayName: string;
}

export interface ArenaV2WeaponMapLearningProjectionCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly validationStatus: 'not-run';
  readonly modeKind: WeaponModeKindV1;
  readonly weaponDefinitionId: string;
  readonly weaponCatalogId: string;
  readonly weaponCollectionOrder: number;
  readonly weaponDisplayName: string;
  readonly mapDefinitionId: string;
  readonly mapDisplayName: string;
  readonly mapSegmentCount: number;
  readonly situations: readonly ArenaV2WeaponMapLearningSituationCandidateV1[];
  readonly situationSummary: string;
  readonly practiceSummary: string;
}

export interface ArenaV2WeaponMapSegmentLearningProjectionCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly validationStatus: 'not-run';
  readonly modeKind: WeaponModeKindV1;
  readonly weaponDefinitionId: string;
  readonly weaponDisplayName: string;
  readonly mapDefinitionId: string;
  readonly mapDisplayName: string;
  readonly segmentDefinitionId: string;
  readonly segmentOrdinal: number;
  readonly segmentDisplayName: string;
  readonly situation: WeaponMapSituationV1;
  readonly situationDisplayName: string;
}

export type ArenaV2RaceResultRouteContinuationCandidateV1 =
  | Readonly<{
    readonly kind: 'segment';
    readonly mapDefinitionId: string;
    readonly mapDisplayName: string;
    readonly segmentDefinitionId: string;
    readonly segmentOrdinal: number;
    readonly segmentDisplayName: string;
  }>
  | Readonly<{
    readonly kind: 'finish-gate';
    readonly mapDefinitionId: string;
    readonly mapDisplayName: string;
    readonly completedSegmentCount: number;
  }>;

const INPUT_KEYS = new Set([
  'modeKind',
  'weaponDefinitionIds',
  'mapDefinitionId',
  'focusPolicy',
  'unknownMapPolicy',
]);
const MODE_KINDS: ReadonlySet<unknown> = new Set(['duel', 'race', 'survival']);
const FOCUS_POLICIES: ReadonlySet<unknown> = new Set([
  'exactly-one',
  'lowest-collection-order',
]);
const UNKNOWN_MAP_POLICIES: ReadonlySet<unknown> = new Set([
  'fail-closed',
  'return-null',
]);
const SEGMENT_INPUT_KEYS = new Set([
  'modeKind',
  'weaponDefinitionId',
  'mapDefinitionId',
  'segmentDefinitionId',
  'segmentOrdinal',
]);

function requireWeapon(weaponDefinitionId: string) {
  const weapon = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons.find(
    (entry) => entry.weaponDefinitionId === weaponDefinitionId,
  );
  if (weapon === undefined) {
    throw new RangeError(`Arena V2武器地图学习缺少武器${weaponDefinitionId}。`);
  }
  return weapon;
}

export function requireArenaV2WeaponDefinitionIdV1(value: string): string {
  const identity = assertNonEmptyString(value, 'Arena V2武器身份');
  const matches = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons.filter(
    (entry) => entry.weaponDefinitionId === identity || entry.catalogId === identity,
  );
  if (matches.length !== 1) {
    throw new RangeError(`Arena V2武器身份${identity}无法唯一规范化。`);
  }
  return matches[0]!.weaponDefinitionId;
}

export function arenaV2WeaponDisplayNameV1(value: string): string {
  const collectionPrefix = 'arena-v2.weapon.';
  const candidateSuffix = '.candidate.v1';
  const slug = value.startsWith(collectionPrefix) && value.endsWith(candidateSuffix)
    ? value.slice(collectionPrefix.length, -candidateSuffix.length)
    : value;
  const weapon = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons.find(
    (entry) => entry.weaponDefinitionId === value || entry.catalogId === slug,
  );
  return weapon === undefined
    ? slug.replaceAll('-', ' ')
    : ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(weapon.nameMessageId);
}

export function requireArenaV2WeaponDisplayNameV1(weaponDefinitionId: string): string {
  const weapon = requireWeapon(weaponDefinitionId);
  return ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(weapon.nameMessageId);
}

export function findArenaV2MapDisplayNameV1(mapDefinitionId: string): string | null {
  const identity = assertNonEmptyString(
    mapDefinitionId,
    'Arena V2地图显示名mapDefinitionId',
  );
  const map = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps.find(
    (entry) => entry.mapDefinitionId === identity,
  );
  return map === undefined
    ? null
    : ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(map.nameMessageId);
}

export function arenaV2MapDisplayNameV1(mapDefinitionId: string): string {
  const displayName = findArenaV2MapDisplayNameV1(mapDefinitionId);
  if (displayName === null) {
    throw new RangeError(`Arena V2武器地图学习缺少地图${mapDefinitionId}。`);
  }
  return displayName;
}

export function arenaV2MapSegmentCountV1(mapDefinitionId: string): number {
  const map = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps.find(
    (entry) => entry.mapDefinitionId === mapDefinitionId,
  );
  if (map === undefined) throw new RangeError(`Arena V2武器地图学习缺少地图${mapDefinitionId}。`);
  return map.segments.length;
}

export function projectArenaV2RaceResultRouteContinuationCandidateV1(
  mapDefinitionId: string,
  progressOrdinal: number,
): ArenaV2RaceResultRouteContinuationCandidateV1 | null {
  const identity = assertNonEmptyString(
    mapDefinitionId,
    'Arena V2竞速结果路线延续mapDefinitionId',
  );
  if (!Number.isSafeInteger(progressOrdinal) || progressOrdinal < 0) {
    throw new RangeError('Arena V2竞速结果路线延续progressOrdinal必须是非负安全整数。');
  }
  const map = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps.find(
    (entry) => entry.mapDefinitionId === identity,
  );
  if (map === undefined) return null;
  if (progressOrdinal > map.segments.length) {
    throw new RangeError('Arena V2竞速结果路线延续进度超过正式地图段数。');
  }
  const mapDisplayName = ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
    map.nameMessageId,
  );
  if (progressOrdinal === map.segments.length) {
    return Object.freeze({
      kind: 'finish-gate' as const,
      mapDefinitionId: map.mapDefinitionId,
      mapDisplayName,
      completedSegmentCount: map.segments.length,
    });
  }
  const segment = map.segments[progressOrdinal]!;
  return Object.freeze({
    kind: 'segment' as const,
    mapDefinitionId: map.mapDefinitionId,
    mapDisplayName,
    segmentDefinitionId: segment.segmentDefinitionId,
    segmentOrdinal: segment.ordinal,
    segmentDisplayName: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      segment.nameMessageId,
    ),
  });
}

export function projectArenaV2WeaponMapSegmentLearningCandidateV1(
  value: unknown,
): ArenaV2WeaponMapSegmentLearningProjectionCandidateV1 | null {
  const source = cloneFrozenData(value, 'ArenaV2WeaponMapSegmentLearningCandidateV1');
  assertKnownKeys(source, SEGMENT_INPUT_KEYS, 'ArenaV2WeaponMapSegmentLearningCandidateV1');
  for (const key of SEGMENT_INPUT_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`ArenaV2WeaponMapSegmentLearningCandidateV1缺少${key}。`);
    }
  }
  if (!MODE_KINDS.has(source.modeKind)) {
    throw new RangeError('Arena V2武器路段学习模式无效。');
  }
  const weapon = requireWeapon(assertNonEmptyString(
    source.weaponDefinitionId,
    'Arena V2武器路段学习weaponDefinitionId',
  ));
  const mapDefinitionId = assertNonEmptyString(
    source.mapDefinitionId,
    'Arena V2武器路段学习mapDefinitionId',
  );
  const map = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps.find(
    (entry) => entry.mapDefinitionId === mapDefinitionId,
  );
  if (map === undefined) {
    throw new RangeError(`Arena V2武器路段学习缺少地图${mapDefinitionId}。`);
  }
  const segmentDefinitionId = assertNonEmptyString(
    source.segmentDefinitionId,
    'Arena V2武器路段学习segmentDefinitionId',
  );
  if (!Number.isSafeInteger(source.segmentOrdinal) || (source.segmentOrdinal as number) < 1) {
    throw new RangeError('Arena V2武器路段学习segmentOrdinal必须是正安全整数。');
  }
  const segment = map.segments.find(
    (entry) => entry.segmentDefinitionId === segmentDefinitionId,
  );
  if (segment === undefined || segment.ordinal !== source.segmentOrdinal) {
    throw new RangeError('Arena V2武器路段学习路段身份与序号不闭合。');
  }
  const modeKind = source.modeKind as WeaponModeKindV1;
  const consequence = weapon.modeConsequences.find((entry) => entry.modeKind === modeKind);
  if (consequence === undefined) {
    throw new RangeError(`Arena V2武器${weapon.catalogId}缺少${modeKind}路段学习语法。`);
  }
  const situation = consequence.mapSituations.find((candidate) => (
    isArenaV2WeaponSituationOpportunityCandidateV1(segment.kind, candidate)
  ));
  if (situation === undefined) return null;
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    validationStatus: 'not-run' as const,
    modeKind,
    weaponDefinitionId: weapon.weaponDefinitionId,
    weaponDisplayName: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      weapon.nameMessageId,
    ),
    mapDefinitionId: map.mapDefinitionId,
    mapDisplayName: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      map.nameMessageId,
    ),
    segmentDefinitionId: segment.segmentDefinitionId,
    segmentOrdinal: segment.ordinal,
    segmentDisplayName: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      segment.nameMessageId,
    ),
    situation,
    situationDisplayName: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      `arena.v2.map-situation.${situation}`,
    ),
  });
}

/**
 * Projects one shared weapon × mode × map learning focus for preparation,
 * in-match pickup feedback and result review. It never reads participant
 * position and therefore cannot claim which route segment the player occupies.
 */
export function projectArenaV2WeaponMapLearningCandidateV1(
  value: unknown,
): ArenaV2WeaponMapLearningProjectionCandidateV1 | null {
  const source = cloneFrozenData(value, 'ArenaV2WeaponMapLearningProjectionCandidateV1');
  assertKnownKeys(source, INPUT_KEYS, 'ArenaV2WeaponMapLearningProjectionCandidateV1');
  for (const key of INPUT_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`ArenaV2WeaponMapLearningProjectionCandidateV1缺少${key}。`);
    }
  }
  if (!MODE_KINDS.has(source.modeKind)) {
    throw new RangeError('Arena V2武器地图学习模式无效。');
  }
  if (!FOCUS_POLICIES.has(source.focusPolicy)) {
    throw new RangeError('Arena V2武器地图学习焦点策略无效。');
  }
  if (!UNKNOWN_MAP_POLICIES.has(source.unknownMapPolicy)) {
    throw new RangeError('Arena V2武器地图学习未知地图策略无效。');
  }
  const mapDefinitionId = assertNonEmptyString(
    source.mapDefinitionId,
    'Arena V2武器地图学习mapDefinitionId',
  );
  const map = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.maps.find(
    (entry) => entry.mapDefinitionId === mapDefinitionId,
  );
  if (map === undefined) {
    if (source.unknownMapPolicy === 'return-null') return null;
    throw new RangeError(`Arena V2武器地图学习缺少地图${mapDefinitionId}。`);
  }
  if (!Array.isArray(source.weaponDefinitionIds) || source.weaponDefinitionIds.length === 0) {
    throw new RangeError('Arena V2武器地图学习至少需要一把本局真实武器。');
  }
  const weaponDefinitionIds = source.weaponDefinitionIds.map((entry, index) => (
    assertNonEmptyString(entry, `Arena V2武器地图学习weaponDefinitionIds[${index}]`)
  ));
  if (new Set(weaponDefinitionIds).size !== weaponDefinitionIds.length) {
    throw new RangeError('Arena V2武器地图学习武器身份不能重复。');
  }
  if (source.focusPolicy === 'exactly-one' && weaponDefinitionIds.length !== 1) {
    throw new RangeError('Arena V2武器地图学习exactly-one策略必须精确提供一把武器。');
  }
  const weapons = weaponDefinitionIds.map(requireWeapon).sort((left, right) => (
    left.collectionOrder - right.collectionOrder
  ));
  const weapon = weapons[0]!;
  const modeKind = source.modeKind as WeaponModeKindV1;
  const consequence = weapon.modeConsequences.find((entry) => entry.modeKind === modeKind);
  if (consequence === undefined) {
    throw new RangeError(`Arena V2武器${weapon.catalogId}缺少${modeKind}地图学习语法。`);
  }
  const opportunities = new Map(map.weaponSituationOpportunityCounts.map(
    (opportunity) => [opportunity.situation, opportunity] as const,
  ));
  const situations = consequence.mapSituations.map((situation, sourceOrder) => {
    const opportunity = opportunities.get(situation);
    return Object.freeze({
      situation,
      sourceOrder,
      segmentCount: opportunity?.segmentCount ?? 0,
      exampleSegment: opportunity?.exampleSegment ?? null,
    });
  }).filter(({ segmentCount }) => segmentCount > 0).sort((left, right) => (
    right.segmentCount - left.segmentCount || left.sourceOrder - right.sourceOrder
  )).slice(0, 2).map(({ situation, segmentCount, exampleSegment }) => {
    if (exampleSegment === null) {
      throw new RangeError(
        `Arena V2地图${map.mapDefinitionId}的${situation}机会缺少示例路段。`,
      );
    }
    return Object.freeze({
      situation,
      displayName: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
        `arena.v2.map-situation.${situation}`,
      ),
      segmentCount,
      exampleSegmentDefinitionId: exampleSegment.segmentDefinitionId,
      exampleSegmentOrdinal: exampleSegment.ordinal,
      exampleSegmentDisplayName: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
        exampleSegment.nameMessageId,
      ),
    });
  });
  if (situations.length === 0) {
    throw new RangeError(
      `Arena V2武器${weapon.catalogId}在地图${map.mapDefinitionId}没有可读地形机会。`,
    );
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    validationStatus: 'not-run' as const,
    modeKind,
    weaponDefinitionId: weapon.weaponDefinitionId,
    weaponCatalogId: weapon.catalogId,
    weaponCollectionOrder: weapon.collectionOrder,
    weaponDisplayName: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      weapon.nameMessageId,
    ),
    mapDefinitionId: map.mapDefinitionId,
    mapDisplayName: ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
      map.nameMessageId,
    ),
    mapSegmentCount: map.segments.length,
    situations: Object.freeze(situations),
    situationSummary: situations.map(({ displayName }) => displayName).join('、'),
    practiceSummary: situations.map(({
      displayName,
      exampleSegmentOrdinal,
      exampleSegmentDisplayName,
    }) => `${displayName}（第${exampleSegmentOrdinal}段·${exampleSegmentDisplayName}）`).join('、'),
  });
}

export const ARENA_V2_WEAPON_MAP_LEARNING_PROJECTION_CONTRACT_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  validationStatus: 'not-run' as const,
  weaponSource: 'information-content-catalog.weapon-definition' as const,
  modeSituationSource: 'information-content-catalog.mode-consequence' as const,
  mapOpportunitySource: 'information-content-catalog.weapon-situation-opportunity-counts' as const,
  reviewFocusPolicy: 'lowest-collection-order-among-used-weapons' as const,
  maximumVisibleSituationCount: 2 as const,
  exampleSegmentPolicy: 'earliest-route-ordinal-owned-by-content-catalog' as const,
  segmentProjectionUsesExplicitMapSegmentIdentity: true as const,
  segmentProjectionCanReturnNullWhenNotApplicable: true as const,
  consumers: Object.freeze([
    'competitive-weapon-detail',
    'competitive-map-detail',
    'competitive-preparation',
    'duel-persistent-current-weapon',
    'survival-local-pickup-or-replacement',
    'survival-persistent-current-weapon',
    'race-next-segment-current-weapon',
    'product-result-review',
  ] as const),
  readsParticipantPosition: false as const,
  infersCurrentSegment: false as const,
  writesRuleMatchRewardOrProfile: false as const,
});
