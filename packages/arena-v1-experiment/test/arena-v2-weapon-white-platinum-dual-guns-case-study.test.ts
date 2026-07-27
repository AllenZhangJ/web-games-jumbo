import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_PUBLIC_AXIS_ID,
  ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_CASE_STUDY,
} from '../src/index.js';

describe('Arena V2 white platinum dual guns case study', () => {
  it('keeps the third weapon as a move-by-move source-backed study', () => {
    const study = ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_CASE_STUDY;
    expect(study.referenceId).toBe('white-platinum-dual-guns');
    expect(study.sourceUrl).toBe('https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=329');
    expect(study.productionAssetStatus).toBe('research-only');
    expect(study.moves).toHaveLength(7);
    expect(new Set(study.moves.map(({ id }) => id)).size).toBe(7);
    expect(new Set(study.moves.map(({ context }) => context))).toEqual(new Set([
      'ground', 'running', 'aerial', 'resource',
    ]));
    expect(study.moves.every(({ officialFact, designPurpose, counterplay, failureCost }) => (
      officialFact.length > 12
      && designPurpose.length > 12
      && counterplay.length > 12
      && failureCost.length > 12
    ))).toBe(true);
  });

  it('makes distance, coverage, height and movement visible as different learning axes', () => {
    const study = ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_CASE_STUDY;
    const point = study.moves.find(({ id }) => id === 'ground-double-shot');
    const volley = study.moves.find(({ id }) => id === 'aerial-horizontal-volley');
    const running = study.moves.find(({ id }) => id === 'running-forward-back-fire');
    const reset = study.moves.find(({ id }) => id === 'resource-reset');
    expect(point?.numericReview.map(({ axisId }) => axisId)).toEqual(expect.arrayContaining([
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.RANGE,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.STARTUP,
    ]));
    expect(volley?.numericReview.map(({ axisId }) => axisId)).toEqual(expect.arrayContaining([
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.COVERAGE,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.ACTIVE_FRAMES,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.HEIGHT_GAP,
    ]));
    expect(running?.numericReview.map(({ axisId }) => axisId)).toEqual(expect.arrayContaining([
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.SELF_MOVEMENT,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DIRECTION_TOLERANCE,
    ]));
    expect(reset?.officialFact).toContain('五次');
    expect(reset?.numericReview.every(({ status }) => status === 'research-only')).toBe(true);
    expect(study.minimumVersion.notToCopy).toContain('Z 瞄准、自动追踪和 TEC 带来的命中补偿');
  });

  it('keeps the shared case-study contract immutable and research-only', () => {
    const study = ARENA_V2_WEAPON_WHITE_PLATINUM_DUAL_GUNS_CASE_STUDY;
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
