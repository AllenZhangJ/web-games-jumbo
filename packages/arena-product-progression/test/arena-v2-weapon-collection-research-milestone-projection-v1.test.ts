import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_COLLECTION_RESEARCH_MILESTONE_PROJECTION_V1_METADATA,
  ARENA_V2_WEAPON_COLLECTION_RESEARCH_MILESTONE_THRESHOLDS_V1,
  arenaV2WeaponCollectionResearchStageForThresholdV1,
  deriveArenaV2HighestCrossedWeaponCollectionResearchMilestoneV1,
  projectArenaV2WeaponCollectionResearchMilestoneV1,
} from '../src/arena-v2-weapon-collection-research-milestone-projection-v1.js';

function project(count: number, collected = false, target: unknown = 120) {
  return projectArenaV2WeaponCollectionResearchMilestoneV1({ count, target, collected });
}

describe('Arena V2 P6.9-D weapon collection research milestones V1', () => {
  it('derives the five stages at the exact 30/60/90/120 boundaries', () => {
    expect(project(0).stage).toBe('初识');
    expect(project(29).stage).toBe('初识');
    expect(project(30).stage).toBe('熟悉');
    expect(project(59).stage).toBe('熟悉');
    expect(project(60).stage).toBe('熟练');
    expect(project(89).stage).toBe('熟练');
    expect(project(90).stage).toBe('精通');
    expect(project(119).stage).toBe('精通');
    expect(project(120, true).stage).toBe('主研究完成');
    expect(project(0, true).stage).toBe('初识');
  });

  it('keeps milestone reachability tied to count instead of inferring it from collection', () => {
    const facts = project(60, true);
    expect(facts.milestones).toEqual([
      { threshold: 30, reached: true },
      { threshold: 60, reached: true },
      { threshold: 90, reached: false },
      { threshold: 120, reached: false },
    ]);
    expect(facts).toMatchObject({
      collected: true,
      stage: '熟练',
      nextStage: '精通',
      nextThreshold: 90,
      remainingEvidenceCount: 30,
    });
    expect(Object.isFrozen(facts)).toBe(true);
    expect(Object.isFrozen(facts.milestones)).toBe(true);
    expect(facts.milestones.every(Object.isFrozen)).toBe(true);
    expect(ARENA_V2_WEAPON_COLLECTION_RESEARCH_MILESTONE_THRESHOLDS_V1)
      .toEqual([30, 60, 90, 120]);
    expect(project(29)).toMatchObject({
      stage: '初识',
      nextStage: '熟悉',
      nextThreshold: 30,
      remainingEvidenceCount: 1,
      minimumEffectiveMainResearchMatchCount: 1,
    });
    expect(project(30)).toMatchObject({
      stage: '熟悉',
      nextStage: '熟练',
      nextThreshold: 60,
      minimumEffectiveMainResearchMatchCount: 30,
    });
    expect(project(120, true)).toMatchObject({
      stage: '主研究完成',
      nextStage: null,
      nextThreshold: null,
      remainingEvidenceCount: 0,
      minimumEffectiveMainResearchMatchCount: 0,
    });
  });

  it('returns only the highest milestone crossed by one monotonic transition', () => {
    expect(deriveArenaV2HighestCrossedWeaponCollectionResearchMilestoneV1({
      previousCount: 29,
      currentCount: 30,
    })).toBe(30);
    expect(deriveArenaV2HighestCrossedWeaponCollectionResearchMilestoneV1({
      previousCount: 29,
      currentCount: 91,
    })).toBe(90);
    expect(deriveArenaV2HighestCrossedWeaponCollectionResearchMilestoneV1({
      previousCount: 90,
      currentCount: 120,
    })).toBe(120);
    expect(deriveArenaV2HighestCrossedWeaponCollectionResearchMilestoneV1({
      previousCount: 60,
      currentCount: 89,
    })).toBeNull();
    expect(deriveArenaV2HighestCrossedWeaponCollectionResearchMilestoneV1({
      previousCount: 120,
      currentCount: 120,
    })).toBeNull();
  });

  it('maps every formal threshold to one shared familiarity stage', () => {
    expect(arenaV2WeaponCollectionResearchStageForThresholdV1(30)).toBe('熟悉');
    expect(arenaV2WeaponCollectionResearchStageForThresholdV1(60)).toBe('熟练');
    expect(arenaV2WeaponCollectionResearchStageForThresholdV1(90)).toBe('精通');
    expect(arenaV2WeaponCollectionResearchStageForThresholdV1(120)).toBe('主研究完成');
    expect(() => arenaV2WeaponCollectionResearchStageForThresholdV1(45 as 30))
      .toThrow(/30、60、90或120/u);
  });

  it('fails closed for contradictory, non-finite, unsafe and future inputs', () => {
    expect(() => project(120, false)).toThrow(/未收藏/u);
    expect(() => project(1, false, 119)).toThrow(/精确等于/u);
    expect(() => project(-1)).toThrow(/非负安全整数/u);
    expect(() => project(Number.NaN)).toThrow(/非负安全整数/u);
    expect(() => project(Number.POSITIVE_INFINITY)).toThrow(/非负安全整数/u);
    expect(() => projectArenaV2WeaponCollectionResearchMilestoneV1({
      count: 1,
      target: 120,
      collected: false,
      futureReward: 1,
    })).toThrow(/未知字段/u);
    expect(() => deriveArenaV2HighestCrossedWeaponCollectionResearchMilestoneV1({
      previousCount: 61,
      currentCount: 60,
    })).toThrow(/不能倒退/u);
  });

  it('does not execute accessors or accept thenables', () => {
    let reads = 0;
    expect(() => projectArenaV2WeaponCollectionResearchMilestoneV1({
      get count() {
        reads += 1;
        return 30;
      },
      target: 120,
      collected: false,
    })).toThrow(/数据字段/u);
    expect(reads).toBe(0);
    expect(() => projectArenaV2WeaponCollectionResearchMilestoneV1({
      count: 30,
      target: 120,
      collected: false,
      then() {},
    })).toThrow(/未知字段/u);
  });

  it('keeps governance metadata honest and produces deterministic immutable values', () => {
    expect(ARENA_V2_WEAPON_COLLECTION_RESEARCH_MILESTONE_PROJECTION_V1_METADATA).toEqual({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      defaultSurfaceWired: false,
      mutatesProfile: false,
      grantsRewards: false,
      maximumEvidenceGrantedPerEffectiveMatch: 1,
      minimumMatchCountIsNotCompletionPromise: true,
      ownershipAndMainResearchStageAreIndependent: true,
      mainResearchCompletesOnlyAtEvidenceTarget: true,
      validationStatus: 'not-run',
    });
    expect(project(75)).toEqual(project(75));
  });
});
