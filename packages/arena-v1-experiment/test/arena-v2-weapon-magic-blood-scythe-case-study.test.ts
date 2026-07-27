import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_CASE_STUDY,
  ARENA_V2_WEAPON_PUBLIC_AXIS_ID,
} from '../src/index.js';

describe('Arena V2 magic blood scythe case study', () => {
  it('keeps one weapon as a move-by-move, source-backed research case', () => {
    const study = ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_CASE_STUDY;
    expect(study.referenceId).toBe('magic-blood-scythe');
    expect(study.sourceUrl).toBe('https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=793');
    expect(study.productionAssetStatus).toBe('research-only');
    expect(study.moves).toHaveLength(7);
    expect(new Set(study.moves.map(({ id }) => id)).size).toBe(7);
    expect(new Set(study.moves.map(({ context }) => context))).toEqual(new Set([
      'ground', 'delayed', 'running', 'aerial', 'charged',
    ]));
    expect(study.moves.every(({ officialFact, designPurpose, playerDecision, counterplay, failureCost }) => (
      officialFact.length > 20
      && designPurpose.length > 20
      && playerDecision.length > 10
      && counterplay.length > 10
      && failureCost.length > 10
    ))).toBe(true);
  });

  it('separates official complexity from the smaller Arena minimum version', () => {
    const study = ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_CASE_STUDY;
    const trap = study.moves.find(({ id }) => id === 'foot-trap-conversion');
    const charge = study.moves.find(({ id }) => id === 'running-charge-levels');
    const underground = study.moves.find(({ id }) => id === 'underground-lock');
    expect(trap?.numericReview.map(({ axisId }) => axisId)).toEqual(expect.arrayContaining([
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DELAY,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.WARNING,
    ]));
    expect(charge?.officialFact).toContain('三档');
    expect(charge?.arenaMinimumVersion).toContain('最多两档蓄力');
    expect(underground?.arenaMinimumVersion).toContain('不加入自动锁定');
    expect(study.minimumVersion.notToCopy).toContain('无限叠加陷阱');
    expect(study.minimumVersion.requiredPublicAxes).toContain(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.WARNING);
  });

  it('keeps the case study immutable and does not expose production registration', () => {
    const study = ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_CASE_STUDY;
    expect(Object.isFrozen(study)).toBe(true);
    expect(Object.isFrozen(study.moves)).toBe(true);
    expect(Object.isFrozen(study.designReasons)).toBe(true);
    expect(Object.isFrozen(study.minimumVersion)).toBe(true);
    expect(Object.isFrozen(study.minimumVersion.requiredPublicAxes)).toBe(true);
    expect(Object.isFrozen(study.minimumVersion.notToCopy)).toBe(true);
    expect(study.moves.every(({ numericReview }) => Object.isFrozen(numericReview))).toBe(true);
    expect(study.moves.every(({ numericReview }) => (
      numericReview.every((review) => Object.isFrozen(review))
    ))).toBe(true);
  });
});
