export type ArenaV2UiNextGoalKind =
  | 'weapon-collection'
  | 'weapon-context'
  | 'map-route'
  | 'survival-record';

export interface ArenaV2UiProgressSnapshot {
  readonly weaponCatalogSize: number;
  readonly ownedWeaponCount: number;
  readonly masteredWeaponContextCount: number;
  readonly totalWeaponContextCount: number;
  readonly masteredMapSegmentCount: number;
  readonly totalMapSegmentCount: number;
  readonly bestSurvivalSeconds: number;
  readonly nextSurvivalTargetSeconds: number;
}

export interface ArenaV2UiNextGoal {
  readonly kind: ArenaV2UiNextGoalKind;
  readonly targetId: string;
  readonly title: string;
  readonly reason: string;
  readonly actionLabel: string;
  readonly progressValue: number;
  readonly progressTarget: number;
}

function integerAtLeast(value: number, minimum: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的安全整数。`);
  }
  return value;
}

function finiteAtLeast(value: number, minimum: number, name: string): number {
  if (!Number.isFinite(value) || value < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的有限数。`);
  }
  return value;
}

function validateProgress(value: ArenaV2UiProgressSnapshot): void {
  integerAtLeast(value.weaponCatalogSize, 1, 'weaponCatalogSize');
  integerAtLeast(value.ownedWeaponCount, 0, 'ownedWeaponCount');
  integerAtLeast(value.masteredWeaponContextCount, 0, 'masteredWeaponContextCount');
  integerAtLeast(value.totalWeaponContextCount, 1, 'totalWeaponContextCount');
  integerAtLeast(value.masteredMapSegmentCount, 0, 'masteredMapSegmentCount');
  integerAtLeast(value.totalMapSegmentCount, 1, 'totalMapSegmentCount');
  finiteAtLeast(value.bestSurvivalSeconds, 0, 'bestSurvivalSeconds');
  finiteAtLeast(value.nextSurvivalTargetSeconds, 1, 'nextSurvivalTargetSeconds');
  if (value.ownedWeaponCount > value.weaponCatalogSize) {
    throw new RangeError('ownedWeaponCount 不能超过 weaponCatalogSize。');
  }
  if (value.masteredWeaponContextCount > value.totalWeaponContextCount) {
    throw new RangeError('masteredWeaponContextCount 不能超过 totalWeaponContextCount。');
  }
  if (value.masteredMapSegmentCount > value.totalMapSegmentCount) {
    throw new RangeError('masteredMapSegmentCount 不能超过 totalMapSegmentCount。');
  }
  if (value.nextSurvivalTargetSeconds <= value.bestSurvivalSeconds) {
    throw new RangeError('nextSurvivalTargetSeconds 必须高于 bestSurvivalSeconds。');
  }
}

export function resolveArenaV2UiNextGoal(
  progress: ArenaV2UiProgressSnapshot,
): ArenaV2UiNextGoal {
  validateProgress(progress);
  if (progress.ownedWeaponCount < progress.weaponCatalogSize) {
    return Object.freeze({
      kind: 'weapon-collection',
      targetId: 'weapon-catalog',
      title: '收集下一把武器',
      reason: '先扩大可尝试的战斗语法，再进入更细的熟练目标。',
      actionLabel: '查看武器索引',
      progressValue: progress.ownedWeaponCount,
      progressTarget: progress.weaponCatalogSize,
    });
  }
  if (progress.masteredWeaponContextCount < progress.totalWeaponContextCount) {
    return Object.freeze({
      kind: 'weapon-context',
      targetId: 'weapon-context-coverage',
      title: '熟悉一把武器的地面与空中用法',
      reason: '武器收齐后，继续练习同一把武器在不同空间中的价值。',
      actionLabel: '选择武器开始',
      progressValue: progress.masteredWeaponContextCount,
      progressTarget: progress.totalWeaponContextCount,
    });
  }
  if (progress.masteredMapSegmentCount < progress.totalMapSegmentCount) {
    return Object.freeze({
      kind: 'map-route',
      targetId: 'map-route-familiarity',
      title: '熟悉下一段地图路线',
      reason: '武器语法掌握后，把选择转化为路线和边缘判断。',
      actionLabel: '查看地图详情',
      progressValue: progress.masteredMapSegmentCount,
      progressTarget: progress.totalMapSegmentCount,
    });
  }
  return Object.freeze({
    kind: 'survival-record',
    targetId: 'survival-record',
    title: `生存达到 ${progress.nextSurvivalTargetSeconds} 秒`,
    reason: '武器和路线都熟悉后，用更高生存记录作为长期挑战。',
    actionLabel: '开始生存',
    progressValue: progress.bestSurvivalSeconds,
    progressTarget: progress.nextSurvivalTargetSeconds,
  });
}
