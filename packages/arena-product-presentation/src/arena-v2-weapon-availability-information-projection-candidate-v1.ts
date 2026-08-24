import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import type {
  ArenaV2InformationFieldSourceV1,
} from './arena-v2-information-field-composition-v1.js';
import type {
  ArenaV2InformationFieldValueV1,
} from './arena-v2-information-screen-view-model-v1.js';
import type {
  ArenaV2InformationSelectionItemCandidateV1,
  ArenaV2InformationSelectionProjectionCandidateV1,
} from './arena-v2-information-selection-render-plan-candidate-v1.js';
import {
  ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1,
} from './arena-v2-information-presentation-content-v1.js';

export interface ArenaV2WeaponAvailabilityInformationProjectionInputCandidateV1 {
  readonly schemaVersion: 1;
  readonly fieldSource: ArenaV2InformationFieldSourceV1;
  readonly availabilityChange: unknown;
  readonly collectedWeaponDefinitionIds: readonly string[];
}

export interface ArenaV2WeaponAvailabilityInformationSelectionProjectionInputCandidateV1 {
  readonly schemaVersion: 1;
  readonly selection: ArenaV2InformationSelectionProjectionCandidateV1;
  readonly availabilityChange: unknown;
  readonly collectedWeaponDefinitionIds: readonly string[];
}

const INPUT_KEYS = new Set([
  'schemaVersion', 'fieldSource', 'availabilityChange', 'collectedWeaponDefinitionIds',
]);
const SELECTION_INPUT_KEYS = new Set([
  'schemaVersion', 'selection', 'availabilityChange', 'collectedWeaponDefinitionIds',
]);
const FIELD_SOURCE_KEYS = new Set(['ownerId', 'fieldValues']);
const FIELD_VALUE_KEYS = new Set([
  'fieldId', 'labelMessageId', 'valueText', 'accessibilityText', 'fixedWidthNumeric',
]);
const AVAILABILITY_KEYS = new Set([
  'schemaVersion', 'status', 'implementationStatus', 'validationStatus',
  'weaponId', 'weaponDefinitionId', 'collectionOrder',
  'previousRevision', 'previousSnapshotHash', 'nextRevision', 'nextSnapshotHash',
  'previousCollectionWeaponIds', 'nextCollectionWeaponIds',
  'newlyPlayable', 'newlyCollected',
]);
const SELECTION_KEYS = new Set(['kind', 'selectedId', 'items']);
const SELECTION_ITEM_KEYS = new Set([
  'id', 'label', 'description', 'available', 'unavailableReason',
]);
const REQUIRED_SELECTION_ITEM_KEYS = Object.freeze(['id', 'label', 'description'] as const);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;
const NEWLY_PLAYABLE_SELECTION_PREFIX = '新开放 · 已可用未收藏 · ';

function exactRecord(value: unknown, keys: ReadonlySet<string>, name: string) {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name}缺少${key}。`);
  }
  return source;
}

function stringTuple(value: unknown, name: string): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${name}必须是数组。`);
  const result = value.map((entry, index) => (
    assertNonEmptyString(entry, `${name}[${index}]`)
  ));
  if (new Set(result).size !== result.length) throw new RangeError(`${name}不得重复。`);
  return Object.freeze(result);
}

function fieldSource(value: unknown): ArenaV2InformationFieldSourceV1 {
  const source = exactRecord(value, FIELD_SOURCE_KEYS, 'Arena武器可用状态字段Owner');
  if (source.ownerId !== 'p6-learning-profile' || !Array.isArray(source.fieldValues)) {
    throw new RangeError('Arena武器可用状态只能改写既有学习档案字段Owner。');
  }
  const fields = source.fieldValues.map((entry, index) => {
    const field = exactRecord(entry, FIELD_VALUE_KEYS, `Arena武器可用状态字段[${index}]`);
    const fieldId = assertNonEmptyString(field.fieldId, `Arena武器可用状态字段[${index}].fieldId`);
    const labelMessageId = assertNonEmptyString(
      field.labelMessageId,
      `Arena武器可用状态字段[${index}].labelMessageId`,
    );
    const valueText = assertNonEmptyString(
      field.valueText,
      `Arena武器可用状态字段[${index}].valueText`,
    );
    const accessibilityText = assertNonEmptyString(
      field.accessibilityText,
      `Arena武器可用状态字段[${index}].accessibilityText`,
    );
    if (typeof field.fixedWidthNumeric !== 'boolean') {
      throw new TypeError(`Arena武器可用状态字段[${index}].fixedWidthNumeric必须是布尔值。`);
    }
    return Object.freeze({
      fieldId,
      labelMessageId,
      valueText,
      accessibilityText,
      fixedWidthNumeric: field.fixedWidthNumeric,
    });
  });
  if (fields.filter(({ fieldId }) => fieldId === 'next-unowned').length !== 1) {
    throw new RangeError('Arena武器可用状态必须精确复用一个next-unowned字段。');
  }
  return Object.freeze({ ownerId: source.ownerId, fieldValues: Object.freeze(fields) });
}

function collectedWeaponDefinitionIds(value: unknown): readonly string[] {
  const collected = stringTuple(
    value,
    'Arena武器可用状态collectedWeaponDefinitionIds',
  );
  const knownDefinitionIds = new Set(
    ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons.map(
      ({ weaponDefinitionId }) => weaponDefinitionId,
    ),
  );
  if (collected.some((definitionId) => !knownDefinitionIds.has(definitionId))) {
    throw new RangeError('Arena武器可用状态收藏目录包含未知武器。');
  }
  return collected;
}

function weaponSelection(
  value: unknown,
): ArenaV2InformationSelectionProjectionCandidateV1 {
  const source = exactRecord(value, SELECTION_KEYS, 'Arena新开放武器卡片选择投影');
  if (source.kind !== 'weapon') {
    throw new RangeError('Arena新开放标记只能投影到武器卡片。');
  }
  const selectedId = assertNonEmptyString(
    source.selectedId,
    'Arena新开放武器卡片selectedId',
  );
  if (!Array.isArray(source.items)) {
    throw new TypeError('Arena新开放武器卡片items必须是数组。');
  }
  const weapons = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons;
  if (source.items.length !== weapons.length) {
    throw new RangeError('Arena新开放武器卡片必须精确覆盖正式武器目录。');
  }
  const items = Object.freeze(source.items.map((entry, index) => {
    const itemName = `Arena新开放武器卡片[${index}]`;
    const item = assertPlainRecord(entry, itemName);
    assertKnownKeys(item, SELECTION_ITEM_KEYS, itemName);
    for (const key of REQUIRED_SELECTION_ITEM_KEYS) {
      if (!Object.hasOwn(item, key)) {
        throw new TypeError(`Arena新开放武器卡片[${index}]缺少${key}。`);
      }
    }
    const id = assertNonEmptyString(item.id, `Arena新开放武器卡片[${index}].id`);
    if (id !== weapons[index]!.weaponDefinitionId) {
      throw new RangeError('Arena新开放武器卡片顺序与正式武器目录不一致。');
    }
    const hasAvailable = Object.hasOwn(item, 'available');
    const hasUnavailableReason = Object.hasOwn(item, 'unavailableReason');
    if (hasAvailable !== hasUnavailableReason) {
      throw new TypeError(`Arena新开放武器卡片[${index}]可用性字段必须成对提供。`);
    }
    if (hasAvailable && typeof item.available !== 'boolean') {
      throw new TypeError(`Arena新开放武器卡片[${index}].available必须是布尔值。`);
    }
    const unavailableReason = !hasUnavailableReason || item.unavailableReason === null
      ? null
      : assertNonEmptyString(
        item.unavailableReason,
        `Arena新开放武器卡片[${index}].unavailableReason`,
      );
    if (hasAvailable && item.available === (unavailableReason !== null)) {
      throw new RangeError(`Arena新开放武器卡片[${index}]可用性语义不闭合。`);
    }
    return Object.freeze({
      id,
      label: assertNonEmptyString(item.label, `Arena新开放武器卡片[${index}].label`),
      description: assertNonEmptyString(
        item.description,
        `Arena新开放武器卡片[${index}].description`,
      ),
      ...(hasAvailable
        ? { available: item.available as boolean, unavailableReason }
        : {}),
    });
  }));
  const selected = items.find(({ id }) => id === selectedId);
  if (selected === undefined || selected.available === false) {
    throw new RangeError('Arena新开放武器卡片selectedId必须指向可用项。');
  }
  return Object.freeze({ kind: 'weapon' as const, selectedId, items });
}

function availabilityChange(value: unknown): Readonly<{
  readonly weaponId: string;
  readonly weaponDefinitionId: string;
  readonly collectionOrder: number;
}> | null {
  if (value === null || value === undefined) return null;
  const source = exactRecord(value, AVAILABILITY_KEYS, 'Arena武器可用状态事实');
  if (source.schemaVersion !== 1
    || source.status !== 'production-unreachable'
    || source.implementationStatus !== 'code-written-not-run'
    || source.validationStatus !== 'not-run'
    || source.newlyPlayable !== true
    || source.newlyCollected !== false) {
    throw new RangeError('Arena武器可用状态事实版本或语义无效。');
  }
  const weaponId = assertNonEmptyString(source.weaponId, 'Arena武器可用状态weaponId');
  const weaponDefinitionId = assertNonEmptyString(
    source.weaponDefinitionId,
    'Arena武器可用状态weaponDefinitionId',
  );
  if (!Number.isSafeInteger(source.collectionOrder)
    || !Number.isSafeInteger(source.previousRevision)
    || !Number.isSafeInteger(source.nextRevision)
    || (source.previousRevision as number) < 0
    || source.nextRevision !== (source.previousRevision as number) + 1
    || typeof source.previousSnapshotHash !== 'string'
    || typeof source.nextSnapshotHash !== 'string'
    || !HASH_PATTERN.test(source.previousSnapshotHash)
    || !HASH_PATTERN.test(source.nextSnapshotHash)
    || source.previousSnapshotHash === source.nextSnapshotHash) {
    throw new RangeError('Arena武器可用状态revision或hash不闭合。');
  }
  const previousIds = stringTuple(
    source.previousCollectionWeaponIds,
    'Arena武器可用状态previousCollectionWeaponIds',
  );
  const nextIds = stringTuple(
    source.nextCollectionWeaponIds,
    'Arena武器可用状态nextCollectionWeaponIds',
  );
  const weapons = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons;
  const previousExpected = weapons.slice(0, previousIds.length).map(({ catalogId }) => catalogId);
  const nextExpected = weapons.slice(0, nextIds.length).map(({ catalogId }) => catalogId);
  if (nextIds.length !== previousIds.length + 1
    || previousIds.some((id, index) => id !== previousExpected[index])
    || nextIds.some((id, index) => id !== nextExpected[index])
    || nextIds[nextIds.length - 1] !== weaponId) {
    throw new RangeError('Arena武器可用状态必须是正式目录连续前缀精确新增一把。');
  }
  const weapon = weapons.find(({ catalogId }) => catalogId === weaponId);
  if (weapon === undefined
    || weapon.weaponDefinitionId !== weaponDefinitionId
    || weapon.collectionOrder !== source.collectionOrder) {
    throw new RangeError('Arena武器可用状态与内容目录身份不一致。');
  }
  return Object.freeze({ weaponId, weaponDefinitionId, collectionOrder: weapon.collectionOrder });
}

export function projectArenaV2WeaponAvailabilityInformationFieldSourceCandidateV1(
  value: ArenaV2WeaponAvailabilityInformationProjectionInputCandidateV1,
): ArenaV2InformationFieldSourceV1 {
  const input = cloneFrozenData(value, 'Arena武器可用状态信息投影输入');
  const source = exactRecord(input, INPUT_KEYS, 'Arena武器可用状态信息投影输入');
  if (source.schemaVersion !== 1) throw new RangeError('Arena武器可用状态信息投影版本无效。');
  const existing = fieldSource(source.fieldSource);
  const change = availabilityChange(source.availabilityChange);
  const collected = collectedWeaponDefinitionIds(source.collectedWeaponDefinitionIds);
  if (change === null || collected.includes(change.weaponDefinitionId)) return existing;

  const weapon = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons.find(
    ({ weaponDefinitionId }) => weaponDefinitionId === change.weaponDefinitionId,
  )!;
  const displayName = ARENA_V2_ZH_CN_INFORMATION_MESSAGES_CANDIDATE_V1.require(
    weapon.nameMessageId,
  );
  const fieldValues = existing.fieldValues.map((field): ArenaV2InformationFieldValueV1 => (
    field.fieldId !== 'next-unowned'
      ? field
      : Object.freeze({
        fieldId: field.fieldId,
        labelMessageId: field.labelMessageId,
        valueText: `${String(change.collectionOrder).padStart(2, '0')}·${displayName} 已可用，尚未收藏；${field.valueText}`,
        accessibilityText: `第${change.collectionOrder}把武器${displayName}现在已经可以在对局中使用，但尚未加入收藏。当前收藏研究提示：${field.accessibilityText}`,
        fixedWidthNumeric: false,
      })
  ));
  return Object.freeze({ ownerId: existing.ownerId, fieldValues: Object.freeze(fieldValues) });
}

export function projectArenaV2WeaponAvailabilityInformationSelectionCandidateV1(
  value: ArenaV2WeaponAvailabilityInformationSelectionProjectionInputCandidateV1,
): ArenaV2InformationSelectionProjectionCandidateV1 {
  const input = cloneFrozenData(value, 'Arena新开放武器卡片投影输入');
  const source = exactRecord(input, SELECTION_INPUT_KEYS, 'Arena新开放武器卡片投影输入');
  if (source.schemaVersion !== 1) throw new RangeError('Arena新开放武器卡片投影版本无效。');
  const existing = weaponSelection(source.selection);
  const change = availabilityChange(source.availabilityChange);
  const collected = collectedWeaponDefinitionIds(source.collectedWeaponDefinitionIds);
  if (change === null || collected.includes(change.weaponDefinitionId)) return existing;

  const target = existing.items.find(({ id }) => id === change.weaponDefinitionId);
  if (target === undefined) {
    throw new RangeError('Arena新开放武器卡片缺少目标武器。');
  }
  if (target.available !== true || target.unavailableReason !== null) {
    throw new RangeError('Arena新开放标记只能写入已激活的武器卡片。');
  }
  const items = Object.freeze(existing.items.map((item): ArenaV2InformationSelectionItemCandidateV1 => (
    item.id !== change.weaponDefinitionId
      ? item
      : Object.freeze({
        id: item.id,
        label: item.label,
        description: `${NEWLY_PLAYABLE_SELECTION_PREFIX}${item.description}`,
        available: true,
        unavailableReason: null,
      })
  )));
  return Object.freeze({ kind: existing.kind, selectedId: existing.selectedId, items });
}

export const ARENA_V2_WEAPON_AVAILABILITY_INFORMATION_PROJECTION_POLICY_CANDIDATE_V1 =
  Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    implementationStatus: 'code-written-not-run' as const,
    validationStatus: 'not-run' as const,
    hardGate: false as const,
    sourceFact: 'registry-single-weapon-availability-change' as const,
    targetScreenId: 'weapon-index' as const,
    targetFieldId: 'next-unowned' as const,
    targetSelectionDescriptionPrefix: NEWLY_PLAYABLE_SELECTION_PREFIX,
    fieldCountAdded: 0 as const,
    selectionFieldCountAdded: 0 as const,
    pageCountAdded: 0 as const,
    actionCountAdded: 0 as const,
    newlyPlayableNeverMeansCollected: true as const,
    currentProfileCollectionOverridesHistoricalAvailabilityNotice: true as const,
    readsRegistryOrProfileAtRenderTime: false as const,
  });
