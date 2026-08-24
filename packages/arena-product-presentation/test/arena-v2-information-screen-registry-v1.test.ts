import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_INFORMATION_SCREEN_CATALOG_CANDIDATE_V1,
  ARENA_V2_INFORMATION_SCREEN_ORDER_V1,
  ArenaV2InformationScreenRegistryV1,
} from '../src/index.js';

describe('Arena V2 information screen registry candidate V1', () => {
  it('freezes exactly eleven pages with one primary action and at most three first-view fields', () => {
    const catalog = ARENA_V2_INFORMATION_SCREEN_CATALOG_CANDIDATE_V1;
    expect(catalog).toMatchObject({
      status: 'production-unreachable', hardGate: false, defaultNavigationWired: false,
      pageCount: 11, maximumPrimaryClicksFromHomeToStartMatch: 2,
    });
    expect(catalog.definitions.map(({ id }) => id)).toEqual(ARENA_V2_INFORMATION_SCREEN_ORDER_V1);
    expect(catalog.definitions.every(({ firstViewFieldIds }) => (
      firstViewFieldIds.length >= 1 && firstViewFieldIds.length <= 3
    ))).toBe(true);
    expect(catalog.sharedLayout).toMatchObject({
      minimumTouchTargetCssPixels: 48,
      narrowBreakpointCssPixels: 760,
      maximumFirstViewItems: 3,
      maximumPrimaryActions: 1,
      usesSafeAreaInsets: true,
    });
    expect(catalog.contentHash).toMatch(/^[0-9a-f]{8}$/);
    const modeSelect = catalog.definitions.find(({ id }) => id === 'mode-select')!;
    expect(modeSelect.firstViewFieldIds).toEqual([
      'mode-objective',
      'participant-count',
      'character-entry',
    ]);
    expect(modeSelect.deferredFieldIds).toEqual(['record-type', 'preparation-entry']);
    const competitivePreparation = catalog.definitions.find(({ id }) => id === 'match-prep')!;
    expect(competitivePreparation.navigationTargetIds).toEqual([
      'mode-select', 'character-select', 'weapon-detail', 'map-detail',
    ]);
    const survivalPreparation = catalog.definitions.find(({ id }) => id === 'survival-prep')!;
    expect(survivalPreparation.navigationTargetIds).toEqual([
      'mode-select', 'character-select', 'weapon-index', 'map-detail',
    ]);
    const weaponDetail = catalog.definitions.find(({ id }) => id === 'weapon-detail')!;
    expect(weaponDetail.navigationTargetIds).toEqual([
      'mode-select', 'weapon-index', 'match-prep',
    ]);
    const mapDetail = catalog.definitions.find(({ id }) => id === 'map-detail')!;
    expect(mapDetail.navigationTargetIds).toEqual([
      'mode-select', 'map-index', 'match-prep', 'survival-prep',
    ]);
  });

  it('fails closed when page order or coverage drifts', () => {
    const definitions = [...ARENA_V2_INFORMATION_SCREEN_CATALOG_CANDIDATE_V1.definitions];
    expect(() => new ArenaV2InformationScreenRegistryV1(definitions.slice(1))).toThrow(/11/);
    [definitions[0], definitions[1]] = [definitions[1]!, definitions[0]!];
    expect(() => new ArenaV2InformationScreenRegistryV1(definitions)).toThrow(/固定ID/);
  });
});
