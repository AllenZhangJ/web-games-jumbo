import { describe, expect, it } from 'vitest';
import {
  resolveArenaV2UiNextGoal,
  type ArenaV2UiProgressSnapshot,
} from '../src/arena-v2-ui-next-goal-prototype.js';

const BASE_PROGRESS: ArenaV2UiProgressSnapshot = Object.freeze({
  weaponCatalogSize: 12,
  ownedWeaponCount: 3,
  masteredWeaponContextCount: 0,
  totalWeaponContextCount: 24,
  masteredMapSegmentCount: 0,
  totalMapSegmentCount: 6,
  bestSurvivalSeconds: 200,
  nextSurvivalTargetSeconds: 240,
});

describe('Arena V2 UI next-goal prototype', () => {
  it('chooses a single low-complexity goal in the intended long-term order', () => {
    expect(resolveArenaV2UiNextGoal(BASE_PROGRESS).kind).toBe('weapon-collection');
    expect(resolveArenaV2UiNextGoal({
      ...BASE_PROGRESS,
      ownedWeaponCount: 12,
    }).kind).toBe('weapon-context');
    expect(resolveArenaV2UiNextGoal({
      ...BASE_PROGRESS,
      ownedWeaponCount: 12,
      masteredWeaponContextCount: 24,
    }).kind).toBe('map-route');
    expect(resolveArenaV2UiNextGoal({
      ...BASE_PROGRESS,
      ownedWeaponCount: 12,
      masteredWeaponContextCount: 24,
      masteredMapSegmentCount: 6,
    }).kind).toBe('survival-record');
  });

  it('returns a frozen player-facing target with an immediate action', () => {
    const goal = resolveArenaV2UiNextGoal(BASE_PROGRESS);
    expect(Object.isFrozen(goal)).toBe(true);
    expect(goal.targetId).toBe('weapon-catalog');
    expect(goal.actionLabel).toBe('查看武器索引');
    expect(goal.progressValue).toBe(3);
    expect(goal.progressTarget).toBe(12);
  });

  it('rejects inconsistent progress instead of showing a misleading target', () => {
    expect(() => resolveArenaV2UiNextGoal({
      ...BASE_PROGRESS,
      ownedWeaponCount: 13,
    })).toThrow('ownedWeaponCount');
    expect(() => resolveArenaV2UiNextGoal({
      ...BASE_PROGRESS,
      nextSurvivalTargetSeconds: 180,
    })).toThrow('nextSurvivalTargetSeconds');
  });
});
