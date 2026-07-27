import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_CASE_STUDY,
  ARENA_V2_WEAPON_PUBLIC_AXIS_ID,
} from '../src/index.js';

describe('Arena V2 blood shadow hook blade case study', () => {
  it('keeps the fourth weapon as a move-by-move source-backed study', () => {
    const study = ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_CASE_STUDY;
    expect(study.referenceId).toBe('blood-shadow-hook-blade');
    expect(study.sourceUrl).toBe('https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=1109');
    expect(study.productionAssetStatus).toBe('research-only');
    expect(study.moves).toHaveLength(9);
    expect(new Set(study.moves.map(({ id }) => id)).size).toBe(9);
    expect(new Set(study.moves.map(({ context }) => context))).toEqual(new Set([
      'ground', 'running', 'aerial',
    ]));
    expect(study.moves.every(({ officialFact, designPurpose, counterplay, failureCost }) => (
      officialFact.length > 12
      && designPurpose.length > 12
      && counterplay.length > 12
      && failureCost.length > 12
    ))).toBe(true);
  });

  it('makes relative position, obstacles and height support visible as distinct axes', () => {
    const study = ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_CASE_STUDY;
    const retract = study.moves.find(({ id }) => id === 'forward-retracting-hook');
    const groundThrow = study.moves.find(({ id }) => id === 'aerial-ground-throw');
    const clamp = study.moves.find(({ id }) => id === 'side-clamp-and-bleed');
    expect(retract?.counterplay).toContain('实体障碍');
    expect(retract?.numericReview.map(({ axisId }) => axisId)).toEqual(expect.arrayContaining([
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RANGE,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.IMPACT,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.ACTIVE_FRAMES,
    ]));
    expect(groundThrow?.numericReview.map(({ axisId }) => axisId)).toEqual(expect.arrayContaining([
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.HEIGHT_GAP,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.SELF_MOVEMENT,
    ]));
    expect(clamp?.numericReview.map(({ axisId }) => axisId)).toEqual(expect.arrayContaining([
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DIRECTION_TOLERANCE,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.WARNING,
    ]));
    expect(study.minimumVersion.notToCopy).toContain('强制拘束、自动追击和复杂空中连段');
  });

  it('keeps the shared case-study contract immutable and research-only', () => {
    const study = ARENA_V2_WEAPON_BLOOD_SHADOW_HOOK_BLADE_CASE_STUDY;
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
