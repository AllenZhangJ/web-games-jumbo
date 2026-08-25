import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';
import {
  ARENA_V2_WEAPON_COLLECTION_RESEARCH_SELECTION_PROJECTION_CANDIDATE_V1,
  projectArenaV2WeaponCollectionResearchSelectionCandidateV1,
} from '../src/index.js';

const WEAPONS = ARENA_V2_INFORMATION_CONTENT_READ_CATALOG_CANDIDATE_V1.weapons;

function selection(
  counts: Readonly<Record<number, number>> = {},
) {
  return {
    kind: 'weapon' as const,
    selectedId: WEAPONS[1]!.weaponDefinitionId,
    items: WEAPONS.map((weapon, index) => ({
      id: weapon.weaponDefinitionId,
      label: `${weapon.collectionOrder}. weapon-${weapon.collectionOrder}`,
      description: `${index === 1 ? '当前目标 · ' : ''}${index === 2 ? '等待开放 · ' : ''}${index === 4 ? '新开放 · 已可用未收藏 · ' : ''}收藏研究 ${counts[index] ?? index}/120 · 情境理解 ${index % 6}/5｜verb-${index}`,
      available: index !== 2,
      unavailableReason: index === 2 ? '尚未开放' : null,
    })),
  };
}

function facts(overrides: Readonly<Record<number, Readonly<Record<string, unknown>>>> = {}) {
  return WEAPONS.map((weapon, index) => ({
    weaponDefinitionId: weapon.weaponDefinitionId,
    collectionEvidenceCount: index,
    collectionEvidenceTarget: 120,
    collected: false,
    mastered: false,
    ...overrides[index],
  }));
}

function project(options: Readonly<{
  readonly selection?: unknown;
  readonly facts?: unknown;
  readonly profileRevision?: number;
}> = {}) {
  return projectArenaV2WeaponCollectionResearchSelectionCandidateV1({
    schemaVersion: 1,
    profileRevision: options.profileRevision ?? 0,
    selection: (options.selection ?? selection()) as never,
    weaponResearchFacts: (options.facts ?? facts()) as never,
  });
}

describe('Arena V2 weapon collection research selection projection candidate V1', () => {
  it('adds the existing milestone stage while preserving target, availability and context copy', () => {
    const counts = { 0: 0, 1: 30, 2: 60, 3: 90 } as const;
    const source = selection(counts);
    const result = project({
      selection: source,
      facts: facts({
        0: { collectionEvidenceCount: counts[0] },
        1: { collectionEvidenceCount: counts[1] },
        2: { collectionEvidenceCount: counts[2] },
        3: { collectionEvidenceCount: counts[3] },
      }),
    });

    expect(result.kind).toBe(source.kind);
    expect(result.selectedId).toBe(source.selectedId);
    expect(result.items.map(({ id }) => id)).toEqual(source.items.map(({ id }) => id));
    result.items.forEach((item, index) => {
      expect(item.id).toBe(source.items[index]!.id);
      expect(item.label).toBe(source.items[index]!.label);
      expect(item.available).toBe(source.items[index]!.available);
      expect(item.unavailableReason).toBe(source.items[index]!.unavailableReason);
    });
    expect(result.items[0]!.description).toContain(
      '初识 · 主研究 0/120 · 距熟悉至少30局有效主研究',
    );
    expect(result.items[1]!.description).toContain(
      '当前目标 · 熟悉 · 主研究 30/120 · 距熟练至少30局有效主研究',
    );
    expect(result.items[2]!.description).toContain(
      '等待开放 · 熟练 · 主研究 60/120 · 距精通至少30局有效主研究',
    );
    expect(result.items[3]!.description).toContain(
      '精通 · 主研究 90/120 · 距主研究完成至少30局有效主研究',
    );
    expect(result.items[4]!.description).toContain(
      '新开放 · 已可用未收藏 · 初识 · 主研究 4/120 · 距熟悉至少26局有效主研究',
    );
    expect(result.items[1]!.description).toContain('情境理解 1/5｜verb-1');
    expect(result.items[2]!.available).toBe(false);
    expect(result.items[2]!.unavailableReason).toBe('尚未开放');
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.items)).toBe(true);
  });

  it('shows collected for an imported collected weapon below 120 without changing other copy', () => {
    const source = selection();
    source.items[0]!.description = '已收藏 · 情境理解 0/5｜verb-0';
    const result = project({
      selection: source,
      facts: facts({ 0: { collectionEvidenceCount: 12, collected: true } }),
    });
    expect(result.items[0]!.description).toBe(
      '已收藏 · 初识 · 主研究 12/120 · 距熟悉至少18局有效主研究 · 情境理解 0/5｜verb-0',
    );
  });

  it('rejects order, target and existing-description drift', () => {
    const reversed = facts().slice().reverse();
    expect(() => project({ facts: reversed })).toThrow(/顺序/);
    expect(() => project({ facts: facts({ 0: { collectionEvidenceTarget: 121 } }) }))
      .toThrow(/120/);
    const source = selection();
    source.items[0]!.description = '情境理解 0/5｜verb-0';
    expect(() => project({ selection: source })).toThrow(/收藏研究片段/);
  });

  it('rejects future fields, accessors and Symbols without executing getters', () => {
    expect(() => project({
      facts: facts({ 0: { future: true } }),
    })).toThrow(/future/);

    let getterCalls = 0;
    const source = Object.defineProperty({
      schemaVersion: 1,
      profileRevision: 0,
      weaponResearchFacts: facts(),
    }, 'selection', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return selection();
      },
    });
    expect(() => projectArenaV2WeaponCollectionResearchSelectionCandidateV1(
      source as never,
    )).toThrow();
    expect(getterCalls).toBe(0);

    const symbolSelection = selection() as Record<PropertyKey, unknown>;
    Object.defineProperty(symbolSelection, Symbol('future'), {
      enumerable: true,
      value: true,
    });
    expect(() => project({ selection: symbolSelection })).toThrow();
  });

  it('rotates one replay weapon after all 20 weapons and contexts are complete', () => {
    const source = selection();
    source.items.forEach((item, index) => {
      item.description = `已收藏 · 情境理解 5/5｜verb-${index}`;
      item.available = true;
      item.unavailableReason = null;
    });
    source.selectedId = WEAPONS[0]!.weaponDefinitionId;
    source.items[1]!.available = false;
    source.items[1]!.unavailableReason = '本轮暂未开放';
    const result = project({
      profileRevision: 1,
      selection: source,
      facts: facts(Object.fromEntries(WEAPONS.map((_, index) => [
        index,
        { collectionEvidenceCount: 120, collected: true, mastered: true },
      ]))),
    });
    expect(result.items[0]!.description).not.toContain('本轮复练武器');
    expect(result.items[1]!.description).not.toContain('本轮复练武器');
    expect(result.items[2]!.description).toContain('本轮复练武器');
    expect(result.items.filter(({ description }) => (
      description.includes('本轮复练武器')
    ))).toHaveLength(1);
  });

  it('returns detached frozen data and keeps production wiring closed', () => {
    const source = selection();
    const result = project({ selection: source });
    source.items[0]!.description = 'caller mutation';
    expect(result.items[0]!.description).not.toBe('caller mutation');
    expect(ARENA_V2_WEAPON_COLLECTION_RESEARCH_SELECTION_PROJECTION_CANDIDATE_V1)
      .toMatchObject({
        status: 'production-unreachable',
        implementationStatus: 'code-written-not-run',
        validationStatus: 'not-run',
        hardGate: false,
        defaultSurfaceWired: false,
        mutatesProfile: false,
        readsRegistry: false,
        addsSelectionFields: false,
        reusesWeaponCollectionResearchMilestoneProjector: true,
        showsMinimumEffectiveMatchesToNextStage: true,
        completedWeaponLearningReplayRotationUsesProfileRevisionModuloCatalog: true,
        completedWeaponLearningReplayRotationExcludesUnavailableWeapons: true,
        completedWeaponLearningReplayRotationAddsPersistedState: false,
      });
  });
});
