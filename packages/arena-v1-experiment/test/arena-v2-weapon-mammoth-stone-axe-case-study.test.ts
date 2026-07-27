import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_CASE_STUDY,
  ARENA_V2_WEAPON_PUBLIC_AXIS_ID,
} from '../src/index.js';

describe('Arena V2 mammoth stone axe case study', () => {
  it('keeps delayed heavy, route pressure and public-risk evidence move by move', () => {
    const study = ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_CASE_STUDY;
    expect(study.referenceId).toBe('mammoth-stone-axe');
    expect(study.sourceUrl).toBe('https://bfo.web.sdo.com/web4/introduce/prop_explanation.asp?id=775');
    expect(study.productionAssetStatus).toBe('research-only');
    expect(study.moves).toHaveLength(6);
    expect(new Set(study.moves.map(({ id }) => id)).size).toBe(6);
    expect(new Set(study.moves.map(({ context }) => context))).toEqual(new Set([
      'delayed', 'charged', 'ground', 'running', 'resource',
    ]));
    expect(study.moves.every(({ officialFact, designPurpose, playerDecision, counterplay, failureCost }) => (
      officialFact.length > 20
      && designPurpose.length > 20
      && playerDecision.length > 10
      && counterplay.length > 10
      && failureCost.length > 10
    ))).toBe(true);
  });

  it('keeps delay and warning as explicit research fields instead of fake player numbers', () => {
    const study = ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_CASE_STUDY;
    const delayedDrop = study.moves.find(({ id }) => id === 'delayed-axe-drop');
    const charge = study.moves.find(({ id }) => id === 'charged-ground-slam');
    const running = study.moves.find(({ id }) => id === 'running-wall-rebound');
    expect(delayedDrop?.numericReview.map(({ axisId }) => axisId)).toEqual(expect.arrayContaining([
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.DELAY,
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.WARNING,
    ]));
    expect(delayedDrop?.officialFact).toContain('约 3 秒');
    expect(charge?.officialFact).toContain('3 种攻击方式');
    expect(charge?.arenaMinimumVersion).toContain('最多两档');
    expect(running?.numericReview.map(({ axisId }) => axisId)).toContain(
      ARENA_V2_WEAPON_PUBLIC_AXIS_ID.HEIGHT_GAP,
    );
    expect(study.minimumVersion.requiredPublicAxes).toContain(ARENA_V2_WEAPON_PUBLIC_AXIS_ID.WARNING);
    expect(study.minimumVersion.notToCopy).toContain('召唤自伤、治疗物和三次恢复规则');
  });

  it('keeps the case study immutable and outside production registration', () => {
    const study = ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_CASE_STUDY;
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
