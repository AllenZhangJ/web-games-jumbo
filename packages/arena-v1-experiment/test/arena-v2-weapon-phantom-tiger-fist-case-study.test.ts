import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_CASE_STUDY,
  ARENA_V2_WEAPON_PUBLIC_AXIS_ID,
} from '../src/index.js';

describe('Arena V2 phantom tiger fist case study', () => {
  it('keeps the fifth weapon as a move-by-move commitment study', () => {
    const study = ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_CASE_STUDY;
    expect(study.referenceId).toBe('phantom-tiger-fist');
    expect(study.sourceUrl).toBe('https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=546');
    expect(study.productionAssetStatus).toBe('research-only');
    expect(study.moves).toHaveLength(8);
    expect(new Set(study.moves.map(({ id }) => id)).size).toBe(8);
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

  it('separates readable commitment axes from Arena-rejected guard mechanics', () => {
    const study = ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_CASE_STUDY;
    const charged = study.moves.find(({ id }) => id === 'charged-tiger-rush');
    const guard = study.moves.find(({ id }) => id === 'charge-reversal');
    const aerial = study.moves.find(({ id }) => id === 'aerial-tiger-strike');
    expect(charged?.numericReview.map(({ axisId }) => axisId)).toEqual(expect.arrayContaining([
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DIRECTION_TOLERANCE,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RECOVERY,
    ]));
    expect(guard?.arenaMinimumVersion).toContain('不做格挡');
    expect(guard?.numericReview.every(({ status }) => status === 'research-only' || status === 'must-measure')).toBe(true);
    expect(aerial?.numericReview.map(({ axisId }) => axisId)).toEqual(expect.arrayContaining([
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.HEIGHT_GAP,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.VERTICAL,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.CONTROL,
    ]));
    expect(study.minimumVersion.notToCopy).toContain('格挡/架招、破防和反击键');
  });

  it('keeps the shared case-study contract immutable and research-only', () => {
    const study = ARENA_V2_WEAPON_PHANTOM_TIGER_FIST_CASE_STUDY;
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
