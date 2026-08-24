import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_WEAPON_AVAILABILITY_INFORMATION_PROJECTION_POLICY_CANDIDATE_V1,
  projectArenaV2WeaponAvailabilityInformationFieldSourceCandidateV1,
  projectArenaV2WeaponAvailabilityInformationSelectionCandidateV1,
} from '../src/index.js';

const WEAPONS = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons;
const FIRST_WEAPON = WEAPONS[0]!;
const SECOND_WEAPON = WEAPONS[1]!;

function fieldSource() {
  return Object.freeze({
    ownerId: 'p6-learning-profile' as const,
    fieldValues: Object.freeze([
      Object.freeze({
        fieldId: 'collection-count',
        labelMessageId: 'arena.v2.field.collection-count',
        valueText: '已收藏0/20',
        accessibilityText: '已经收藏零把武器，共二十把。',
        fixedWidthNumeric: false,
      }),
      Object.freeze({
        fieldId: 'next-unowned',
        labelMessageId: 'arena.v2.field.next-unowned',
        valueText: '下一把尚未收藏的武器等待研究',
        accessibilityText: '下一把尚未收藏的武器等待研究。',
        fixedWidthNumeric: false,
      }),
      Object.freeze({
        fieldId: 'next-goal',
        labelMessageId: 'arena.v2.field.next-goal',
        valueText: '继续当前研究目标',
        accessibilityText: '继续当前研究目标。',
        fixedWidthNumeric: false,
      }),
    ]),
  });
}

function availabilityChange(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    schemaVersion: 1,
    status: 'production-unreachable',
    implementationStatus: 'code-written-not-run',
    validationStatus: 'not-run',
    weaponId: FIRST_WEAPON.catalogId,
    weaponDefinitionId: FIRST_WEAPON.weaponDefinitionId,
    collectionOrder: FIRST_WEAPON.collectionOrder,
    previousRevision: 0,
    previousSnapshotHash: '11111111',
    nextRevision: 1,
    nextSnapshotHash: '22222222',
    previousCollectionWeaponIds: [],
    nextCollectionWeaponIds: [FIRST_WEAPON.catalogId],
    newlyPlayable: true,
    newlyCollected: false,
    ...overrides,
  };
}

function project(options: Readonly<{
  readonly availabilityChange?: unknown;
  readonly collectedWeaponDefinitionIds?: readonly string[];
}> = {}) {
  return projectArenaV2WeaponAvailabilityInformationFieldSourceCandidateV1({
    schemaVersion: 1,
    fieldSource: fieldSource(),
    availabilityChange: options.availabilityChange ?? availabilityChange(),
    collectedWeaponDefinitionIds: options.collectedWeaponDefinitionIds ?? [],
  });
}

function weaponSelection(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    kind: 'weapon',
    selectedId: FIRST_WEAPON.weaponDefinitionId,
    items: WEAPONS.map((weapon, index) => ({
      id: weapon.weaponDefinitionId,
      label: `${weapon.collectionOrder}. weapon-${weapon.collectionOrder}`,
      description: `description-${weapon.collectionOrder}`,
      available: index === 0,
      unavailableReason: index === 0 ? null : '尚未进入当前可玩武器池',
    })),
    ...overrides,
  };
}

function projectSelection(options: Readonly<{
  readonly selection?: unknown;
  readonly availabilityChange?: unknown;
  readonly collectedWeaponDefinitionIds?: readonly string[];
}> = {}) {
  return projectArenaV2WeaponAvailabilityInformationSelectionCandidateV1({
    schemaVersion: 1,
    selection: (options.selection ?? weaponSelection()) as never,
    availabilityChange: Object.hasOwn(options, 'availabilityChange')
      ? options.availabilityChange
      : availabilityChange(),
    collectedWeaponDefinitionIds: options.collectedWeaponDefinitionIds ?? [],
  });
}

describe('Arena V2 weapon availability information projection candidate V1', () => {
  it('keeps the original learning owner and fields when no availability change exists', () => {
    const source = fieldSource();
    const result = projectArenaV2WeaponAvailabilityInformationFieldSourceCandidateV1({
      schemaVersion: 1,
      fieldSource: source,
      availabilityChange: null,
      collectedWeaponDefinitionIds: [],
    });

    expect(result).toEqual(source);
    expect(result.ownerId).toBe('p6-learning-profile');
    expect(result.fieldValues.map(({ fieldId }) => fieldId)).toEqual(
      source.fieldValues.map(({ fieldId }) => fieldId),
    );
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.fieldValues)).toBe(true);
  });

  it('rewrites only next-unowned for one exact newly-playable weapon', () => {
    const source = fieldSource();
    const result = project();

    expect(result.ownerId).toBe(source.ownerId);
    expect(result.fieldValues).toHaveLength(source.fieldValues.length);
    expect(result.fieldValues.map(({ fieldId }) => fieldId)).toEqual(
      source.fieldValues.map(({ fieldId }) => fieldId),
    );
    expect(result.fieldValues[0]).toEqual(source.fieldValues[0]);
    expect(result.fieldValues[2]).toEqual(source.fieldValues[2]);
    expect(result.fieldValues[1]).toMatchObject({
      fieldId: 'next-unowned',
      labelMessageId: source.fieldValues[1]!.labelMessageId,
      fixedWidthNumeric: false,
    });
    expect(result.fieldValues[1]!.valueText).toContain('已可用，尚未收藏');
    expect(result.fieldValues[1]!.valueText).toContain(
      source.fieldValues[1]!.valueText,
    );
    expect(ARENA_V2_WEAPON_AVAILABILITY_INFORMATION_PROJECTION_POLICY_CANDIDATE_V1)
      .toMatchObject({
        newlyPlayableNeverMeansCollected: true,
        fieldCountAdded: 0,
        pageCountAdded: 0,
        actionCountAdded: 0,
      });
  });

  it('restores the original copy when the current profile already owns the weapon', () => {
    expect(project({
      collectedWeaponDefinitionIds: [FIRST_WEAPON.weaponDefinitionId],
    })).toEqual(fieldSource());
  });

  it('rejects collected claims and non-contiguous active registry prefixes', () => {
    expect(() => project({
      availabilityChange: availabilityChange({ newlyCollected: true }),
    })).toThrow(/版本或语义无效/);

    expect(() => project({
      availabilityChange: availabilityChange({
        weaponId: SECOND_WEAPON.catalogId,
        weaponDefinitionId: SECOND_WEAPON.weaponDefinitionId,
        collectionOrder: SECOND_WEAPON.collectionOrder,
        nextCollectionWeaponIds: [SECOND_WEAPON.catalogId],
      }),
    })).toThrow(/连续前缀/);
  });

  it('rejects weapon identity, registry hash and revision drift', () => {
    for (const drift of [
      { weaponDefinitionId: SECOND_WEAPON.weaponDefinitionId },
      { collectionOrder: FIRST_WEAPON.collectionOrder + 1 },
      { nextSnapshotHash: '11111111' },
      { nextSnapshotHash: 'not-a-hash' },
      { nextRevision: 2 },
    ]) {
      expect(() => project({ availabilityChange: availabilityChange(drift) })).toThrow();
    }
  });

  it('rejects unknown profile collections and future fields', () => {
    expect(() => project({
      collectedWeaponDefinitionIds: ['arena-v2.weapon.unknown.candidate.v1'],
    })).toThrow(/未知武器/);
    expect(() => project({
      availabilityChange: availabilityChange({ future: true }),
    })).toThrow(/future/);
  });

  it('rejects accessors and Symbols without executing getters', () => {
    let getterCalls = 0;
    const accessorInput = Object.defineProperty({
      schemaVersion: 1,
      availabilityChange: availabilityChange(),
      collectedWeaponDefinitionIds: [],
    }, 'fieldSource', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return fieldSource();
      },
    });
    expect(() => projectArenaV2WeaponAvailabilityInformationFieldSourceCandidateV1(
      accessorInput as never,
    )).toThrow();
    expect(getterCalls).toBe(0);

    const symbolInput = {
      schemaVersion: 1,
      fieldSource: fieldSource(),
      availabilityChange: availabilityChange(),
      collectedWeaponDefinitionIds: [],
    } as Record<PropertyKey, unknown>;
    Object.defineProperty(symbolInput, Symbol('future'), {
      enumerable: true,
      value: true,
    });
    expect(() => projectArenaV2WeaponAvailabilityInformationFieldSourceCandidateV1(
      symbolInput as never,
    )).toThrow();
  });

  it('prefixes only the exact active newly-playable weapon card description', () => {
    const source = weaponSelection();
    const result = projectSelection({ selection: source });

    expect(result.kind).toBe(source.kind);
    expect(result.selectedId).toBe(source.selectedId);
    expect(result.items).toHaveLength(source.items.length);
    expect(result.items.map(({ id }) => id)).toEqual(source.items.map(({ id }) => id));
    expect(result.items[0]).toEqual({
      ...source.items[0],
      description: `新开放 · 已可用未收藏 · ${source.items[0]!.description}`,
    });
    expect(result.items.slice(1)).toEqual(source.items.slice(1));
    expect(result.items[0]!.label).toBe(source.items[0]!.label);
    expect(result.items[0]!.available).toBe(true);
    expect(result.items[0]!.unavailableReason).toBeNull();
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.items)).toBe(true);
  });

  it('keeps all weapon cards unchanged for null facts or a currently collected target', () => {
    const source = weaponSelection();
    expect(projectSelection({ selection: source, availabilityChange: null })).toEqual(source);
    expect(projectSelection({
      selection: source,
      collectedWeaponDefinitionIds: [FIRST_WEAPON.weaponDefinitionId],
    })).toEqual(source);
  });

  it('rejects an availability fact targeting a card that is not active', () => {
    const source = weaponSelection({
      selectedId: SECOND_WEAPON.weaponDefinitionId,
      items: WEAPONS.map((weapon, index) => ({
        id: weapon.weaponDefinitionId,
        label: `${weapon.collectionOrder}. weapon-${weapon.collectionOrder}`,
        description: `description-${weapon.collectionOrder}`,
        available: index === 1,
        unavailableReason: index === 1 ? null : '尚未进入当前可玩武器池',
      })),
    });
    expect(() => projectSelection({ selection: source })).toThrow(/已激活/);
  });

  it('reuses availability identity, prefix, hash and revision closure for card projection', () => {
    for (const drift of [
      { newlyPlayable: false },
      { newlyCollected: true },
      { weaponDefinitionId: SECOND_WEAPON.weaponDefinitionId },
      { nextCollectionWeaponIds: [SECOND_WEAPON.catalogId] },
      { nextSnapshotHash: '11111111' },
      { nextRevision: 2 },
      { future: true },
    ]) {
      expect(() => projectSelection({
        availabilityChange: availabilityChange(drift),
      })).toThrow();
    }
  });

  it('rejects selection accessors and Symbols without executing getters', () => {
    let getterCalls = 0;
    const selection = Object.defineProperty({
      kind: 'weapon',
      selectedId: FIRST_WEAPON.weaponDefinitionId,
    }, 'items', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return weaponSelection().items;
      },
    });
    expect(() => projectSelection({ selection })).toThrow();
    expect(getterCalls).toBe(0);

    const symbolSelection = weaponSelection() as Record<PropertyKey, unknown>;
    Object.defineProperty(symbolSelection, Symbol('future'), {
      enumerable: true,
      value: true,
    });
    expect(() => projectSelection({ selection: symbolSelection })).toThrow();
  });
});
