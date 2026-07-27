import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_PUBLIC_AXIS_ID,
  createArenaV2WeaponCaseStudyOverview,
} from '../src/index.js';

describe('Arena V2 weapon case-study overview', () => {
  it('summarizes six deep studies and distinguishes projected research rows from narrative-only rows', () => {
    const overview = createArenaV2WeaponCaseStudyOverview();
    expect(overview.rows).toHaveLength(6);
    expect(overview.rows.map(({ referenceId }) => referenceId)).toEqual([
      'magic-blood-scythe',
      'true-hades-hook-scythe',
      'white-platinum-dual-guns',
      'blood-shadow-hook-blade',
      'phantom-tiger-fist',
      'mammoth-stone-axe',
    ]);
    expect(overview.rows.every(({ productionAssetStatus, numericReadoutReason }) => (
      productionAssetStatus === 'research-only'
      && numericReadoutReason.length > 20
    ))).toBe(true);
    expect(overview.rows.filter(({ numericReadout }) => numericReadout === 'research-projection').map(({ referenceId }) => referenceId))
      .toEqual(['magic-blood-scythe', 'true-hades-hook-scythe', 'white-platinum-dual-guns', 'blood-shadow-hook-blade', 'phantom-tiger-fist', 'mammoth-stone-axe']);
    expect(overview.rows.filter(({ numericReadout }) => numericReadout === 'not-yet-available')).toHaveLength(0);
  });

  it('makes the difference between must-measure axes and research-only signals explicit', () => {
    const overview = createArenaV2WeaponCaseStudyOverview();
    const guns = overview.rows.find(({ referenceId }) => referenceId === 'white-platinum-dual-guns');
    const hookBlade = overview.rows.find(({ referenceId }) => referenceId === 'blood-shadow-hook-blade');
    expect(guns?.mustMeasureAxisIds).toEqual(expect.arrayContaining([
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RANGE,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE,
    ]));
    expect(hookBlade?.axisAudit.find(({ axisId }) => (
      axisId === ARENA_V2_WEAPON_PUBLIC_AXIS_ID.WARNING
    ))?.status).toBe('research-only');
    expect(hookBlade?.researchOnlyAxisIds).toContain(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.WARNING);
    expect(hookBlade?.mapSignals).toContain('实体障碍切断钩刃拉位，验证地图几何是实际反制而非背景。');
    const mammoth = overview.rows.find(({ referenceId }) => referenceId === 'mammoth-stone-axe');
    expect(mammoth?.mustMeasureAxisIds).toEqual(expect.arrayContaining([
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY,
    ]));
    expect(mammoth?.researchOnlyAxisIds).toEqual(expect.arrayContaining([
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DELAY,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.WARNING,
    ]));
  });

  it('binds projected cases to frozen Definition identities and comparable contexts', () => {
    const overview = createArenaV2WeaponCaseStudyOverview();
    const guns = overview.rows.find(({ referenceId }) => referenceId === 'white-platinum-dual-guns');
    const hookBlade = overview.rows.find(({ referenceId }) => referenceId === 'blood-shadow-hook-blade');
    const fist = overview.rows.find(({ referenceId }) => referenceId === 'phantom-tiger-fist');
    expect(guns?.numericProjection?.sourceDefinitionIds).toEqual([
      'research-line-pressure-ground',
      'research-line-pressure-aerial',
    ]);
    expect(guns?.numericProjection?.contexts.map(({ id }) => id)).toEqual(['ground', 'aerial']);
    expect(fist?.numericProjection?.sourceDefinitionIds).toEqual([
      'research-phantom-tiger-fist-ground',
      'research-phantom-tiger-fist-aerial',
    ]);
    const hookBladeProjection = hookBlade?.numericProjection;
    expect(hookBladeProjection?.sourceDefinitionIds).toEqual([
      'research-blood-shadow-hook-blade-ground',
      'research-blood-shadow-hook-blade-aerial',
    ]);
    expect(hookBladeProjection?.comparisonWeaponIds).toContain('research-blood-shadow-hook-blade');
    const trueHades = overview.rows.find(({ referenceId }) => referenceId === 'true-hades-hook-scythe');
    expect(trueHades?.numericProjection?.sourceDefinitionIds).toEqual([
      'research-true-hades-hook-scythe-ground',
      'research-true-hades-hook-scythe-aerial',
    ]);
    expect(trueHades?.numericProjection?.comparisonWeaponIds).toContain('research-true-hades-hook-scythe');
    expect(Object.isFrozen(guns?.numericProjection)).toBe(true);
    expect(Object.isFrozen(guns?.numericProjection?.contexts)).toBe(true);
    const magic = overview.rows.find(({ referenceId }) => referenceId === 'magic-blood-scythe');
    expect(magic?.numericProjection?.sourceDefinitionIds).toEqual([
      'research-magic-blood-scythe-ground',
      'research-magic-blood-scythe-aerial',
    ]);
    expect(magic?.numericProjection?.comparisonWeaponIds).toContain('research-magic-blood-scythe');
    const mammoth = overview.rows.find(({ referenceId }) => referenceId === 'mammoth-stone-axe');
    expect(mammoth?.numericProjection?.sourceDefinitionIds).toEqual([
      'research-mammoth-stone-axe-ground',
      'research-mammoth-stone-axe-aerial',
    ]);
    expect(mammoth?.numericProjection?.comparisonWeaponIds).toContain('research-mammoth-stone-axe');
  });

  it('is deterministic and deeply freezes the research readout', () => {
    const first = createArenaV2WeaponCaseStudyOverview();
    expect(first).toEqual(createArenaV2WeaponCaseStudyOverview());
    expect(first.allRowsAreResearchOnly).toBe(true);
    expect(first.allRowsBlockUnprojectedNumericValues).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.rows)).toBe(true);
    expect(Object.isFrozen(first.rows[0]?.axisAudit)).toBe(true);
    expect(Object.isFrozen(first.rows[0]?.axisAudit[0]?.reviewReasons)).toBe(true);
  });
});
