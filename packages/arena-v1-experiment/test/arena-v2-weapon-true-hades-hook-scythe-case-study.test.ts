import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_PUBLIC_AXIS_ID,
  ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_CASE_STUDY,
} from '../src/index.js';

describe('Arena V2 true Hades hook scythe case study', () => {
  it('keeps the second weapon as a move-by-move source-backed study', () => {
    const study = ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_CASE_STUDY;
    expect(study.referenceId).toBe('true-hades-hook-scythe');
    expect(study.sourceUrl).toBe('https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=526');
    expect(study.productionAssetStatus).toBe('research-only');
    expect(study.moves).toHaveLength(7);
    expect(new Set(study.moves.map(({ id }) => id)).size).toBe(7);
    expect(new Set(study.moves.map(({ context }) => context))).toEqual(new Set([
      'ground', 'running', 'aerial', 'charged', 'counter',
    ]));
    expect(study.moves.every(({ officialFact, designPurpose, counterplay, failureCost }) => (
      officialFact.length > 12
      && designPurpose.length > 12
      && counterplay.length > 12
      && failureCost.length > 12
    ))).toBe(true);
  });

  it('treats the rebound surface and nonlethal commitment as distinct learning axes', () => {
    const study = ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_CASE_STUDY;
    const rebound = study.moves.find(({ id }) => id === 'rebound-blade');
    const charge = study.moves.find(({ id }) => id === 'fixed-nonlethal-charge');
    const counter = study.moves.find(({ id }) => id === 'charged-counter');
    expect(rebound?.numericReview.map(({ axisId }) => axisId)).toEqual(expect.arrayContaining([
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.HEIGHT_GAP,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.VERTICAL,
    ]));
    expect(rebound?.designPurpose).toContain('支撑面');
    expect(charge?.officialFact).toContain('没有致死判定');
    expect(charge?.arenaMinimumVersion).toContain('非致死');
    expect(counter?.arenaMinimumVersion).toContain('不迁移格挡');
    expect(study.minimumVersion.notToCopy).toContain('格挡和反击键');
  });

  it('keeps the shared case-study contract immutable and research-only', () => {
    const study = ARENA_V2_WEAPON_TRUE_HADES_HOOK_SCYTHE_CASE_STUDY;
    expect(Object.isFrozen(study)).toBe(true);
    expect(Object.isFrozen(study.moves)).toBe(true);
    expect(Object.isFrozen(study.designReasons)).toBe(true);
    expect(Object.isFrozen(study.minimumVersion)).toBe(true);
    expect(Object.isFrozen(study.minimumVersion.contexts)).toBe(true);
    expect(Object.isFrozen(study.minimumVersion.requiredPublicAxes)).toBe(true);
    expect(study.moves.every(({ numericReview }) => (
      Object.isFrozen(numericReview)
      && numericReview.every((review) => Object.isFrozen(review))
    ))).toBe(true);
  });
});
