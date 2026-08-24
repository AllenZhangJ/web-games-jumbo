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
  projectArenaV2WeaponCollectionResearchMilestoneV1,
} from '@number-strategy-jump/arena-product-progression';
import type {
  ArenaV2InformationSelectionItemCandidateV1,
  ArenaV2InformationSelectionProjectionCandidateV1,
} from './arena-v2-information-selection-render-plan-candidate-v1.js';

export interface ArenaV2WeaponCollectionResearchSelectionFactCandidateV1 {
  readonly weaponDefinitionId: string;
  readonly collectionEvidenceCount: number;
  readonly collectionEvidenceTarget: number;
  readonly collected: boolean;
  readonly mastered: boolean;
}

export interface ArenaV2WeaponCollectionResearchSelectionProjectionInputCandidateV1 {
  readonly schemaVersion: 1;
  readonly profileRevision: number;
  readonly selection: ArenaV2InformationSelectionProjectionCandidateV1;
  readonly weaponResearchFacts:
    readonly ArenaV2WeaponCollectionResearchSelectionFactCandidateV1[];
}

const INPUT_KEYS = new Set([
  'schemaVersion', 'profileRevision', 'selection', 'weaponResearchFacts',
]);
const SELECTION_KEYS = new Set(['kind', 'selectedId', 'items']);
const ITEM_KEYS = new Set([
  'id', 'label', 'description', 'available', 'unavailableReason',
]);
const REQUIRED_ITEM_KEYS = Object.freeze(['id', 'label', 'description'] as const);
const FACT_KEYS = new Set([
  'weaponDefinitionId', 'collectionEvidenceCount', 'collectionEvidenceTarget', 'collected',
  'mastered',
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
  const source = exactRecord(value, SELECTION_KEYS, 'Arena武器收藏研究卡片选择投影');
  if (source.kind !== 'weapon') {
    throw new RangeError('Arena武器收藏研究可读性只能投影到武器卡片。');
  }
  const selectedId = assertNonEmptyString(
    source.selectedId,
    'Arena武器收藏研究卡片selectedId',
  );
  if (!Array.isArray(source.items)) {
    throw new TypeError('Arena武器收藏研究卡片items必须是数组。');
  }
  const weapons = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons;
  if (source.items.length !== weapons.length) {
    throw new RangeError('Arena武器收藏研究卡片必须精确覆盖正式20把武器。');
  }
  const items = Object.freeze(source.items.map((value, index) => {
    const name = `Arena武器收藏研究卡片[${index}]`;
    const item = assertPlainRecord(value, name);
    assertKnownKeys(item, ITEM_KEYS, name);
    for (const key of REQUIRED_ITEM_KEYS) {
      if (!Object.hasOwn(item, key)) throw new TypeError(`${name}缺少${key}。`);
    }
    const id = assertNonEmptyString(item.id, `${name}.id`);
    if (id !== weapons[index]!.weaponDefinitionId) {
      throw new RangeError('Arena武器收藏研究卡片顺序与正式武器目录不一致。');
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
    throw new RangeError('Arena武器收藏研究卡片selectedId必须指向可用项。');
  }
  return Object.freeze({ kind: 'weapon' as const, selectedId, items });
}

function researchFacts(
  value: unknown,
): readonly ArenaV2WeaponCollectionResearchSelectionFactCandidateV1[] {
  if (!Array.isArray(value)) {
    throw new TypeError('Arena武器收藏研究卡片facts必须是数组。');
  }
  const weapons = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons;
  if (value.length !== weapons.length) {
    throw new RangeError('Arena武器收藏研究卡片facts必须精确覆盖正式20把武器。');
  }
  return Object.freeze(value.map((entry, index) => {
    const name = `Arena武器收藏研究卡片fact[${index}]`;
    const source = exactRecord(entry, FACT_KEYS, name);
    const weaponDefinitionId = assertNonEmptyString(
      source.weaponDefinitionId,
      `${name}.weaponDefinitionId`,
    );
    if (weaponDefinitionId !== weapons[index]!.weaponDefinitionId) {
      throw new RangeError('Arena武器收藏研究卡片facts顺序与正式武器目录不一致。');
    }
    const milestone = projectArenaV2WeaponCollectionResearchMilestoneV1({
      count: source.collectionEvidenceCount,
      target: source.collectionEvidenceTarget,
      collected: source.collected,
    });
    if (typeof source.mastered !== 'boolean') {
      throw new TypeError(`${name}.mastered必须是布尔值。`);
    }
    return Object.freeze({
      weaponDefinitionId,
      collectionEvidenceCount: milestone.count,
      collectionEvidenceTarget: milestone.target,
      collected: milestone.collected,
      mastered: source.mastered,
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
    throw new RangeError(`${name}必须精确包含一个既有收藏研究片段。`);
  }
  return `${value.slice(0, first)}${replacement}${value.slice(first + expected.length)}`;
}

export function projectArenaV2WeaponCollectionResearchSelectionCandidateV1(
  value: ArenaV2WeaponCollectionResearchSelectionProjectionInputCandidateV1,
): ArenaV2InformationSelectionProjectionCandidateV1 {
  const input = cloneFrozenData(value, 'Arena武器收藏研究卡片可读性投影输入');
  const source = exactRecord(input, INPUT_KEYS, 'Arena武器收藏研究卡片可读性投影输入');
  if (source.schemaVersion !== 1) {
    throw new RangeError('Arena武器收藏研究卡片可读性投影版本无效。');
  }
  const profileRevision = assertIntegerAtLeast(
    source.profileRevision,
    0,
    'Arena武器收藏研究卡片profileRevision',
  );
  const existing = selection(source.selection);
  const facts = researchFacts(source.weaponResearchFacts);
  const allWeaponLearningComplete = facts.every((fact) => (
    fact.collected
    && fact.mastered
    && fact.collectionEvidenceCount === fact.collectionEvidenceTarget
  ));
  const replayEligibleItems = existing.items.filter(({ available }) => available !== false);
  if (allWeaponLearningComplete && replayEligibleItems.length === 0) {
    throw new RangeError('Arena武器收藏研究卡片没有可用复练武器。');
  }
  const replayWeaponDefinitionId = allWeaponLearningComplete
    ? replayEligibleItems[profileRevision % replayEligibleItems.length]!.id
    : null;
  const items = Object.freeze(existing.items.map((item, index) => {
    const fact = facts[index]!;
    if (item.id !== fact.weaponDefinitionId) {
      throw new RangeError('Arena武器收藏研究卡片与facts身份漂移。');
    }
    const milestone = projectArenaV2WeaponCollectionResearchMilestoneV1({
      count: fact.collectionEvidenceCount,
      target: fact.collectionEvidenceTarget,
      collected: fact.collected,
    });
    const existingResearchText = milestone.collected
      ? '已收藏'
      : `收藏研究 ${milestone.count}/${milestone.target}`;
    const ownershipText = milestone.collected ? '已收藏 · ' : '';
    const readableResearchText = milestone.nextStage === null
      ? `${ownershipText}主研究已完成 ${milestone.count}/${milestone.target}${
        replayWeaponDefinitionId === item.id ? ' · 本轮复练武器' : ''
      }`
      : `${ownershipText}${milestone.stage} · 主研究 ${milestone.count}/${milestone.target}`
        + ` · 距${milestone.nextStage}至少${
          milestone.minimumEffectiveMainResearchMatchCount
        }局有效主研究`;
    const description = replaceExactlyOnce(
      item.description,
      existingResearchText,
      readableResearchText,
      `Arena武器收藏研究卡片[${index}].description`,
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

export const ARENA_V2_WEAPON_COLLECTION_RESEARCH_SELECTION_PROJECTION_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    mutatesProfile: false as const,
    readsRegistry: false as const,
    addsSelectionFields: false as const,
    reusesWeaponCollectionResearchMilestoneProjector: true as const,
    showsMinimumEffectiveMatchesToNextStage: true as const,
    completedWeaponLearningReplayRotationUsesProfileRevisionModuloCatalog: true as const,
    completedWeaponLearningReplayRotationExcludesUnavailableWeapons: true as const,
    completedWeaponLearningReplayRotationAddsPersistedState: false as const,
  });
