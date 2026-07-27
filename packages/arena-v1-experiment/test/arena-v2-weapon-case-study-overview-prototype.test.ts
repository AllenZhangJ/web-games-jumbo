import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_PUBLIC_AXIS_ID,
  createArenaV2WeaponCaseStudyOverview,
} from '../src/index.js';

describe('Arena V2 weapon case-study overview', () => {
  it('summarizes four deep studies without pretending they are production numeric rows', () => {
    const overview = createArenaV2WeaponCaseStudyOverview();
    expect(overview.rows).toHaveLength(5);
    expect(overview.rows.map(({ referenceId }) => referenceId)).toEqual([
      'magic-blood-scythe',
      'true-hades-hook-scythe',
      'white-platinum-dual-guns',
      'blood-shadow-hook-blade',
      'phantom-tiger-fist',
    ]);
    expect(overview.rows.every(({ productionAssetStatus, numericReadout, numericReadoutReason }) => (
      productionAssetStatus === 'research-only'
      && numericReadout === 'not-yet-available'
      && numericReadoutReason.length > 20
    ))).toBe(true);
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
