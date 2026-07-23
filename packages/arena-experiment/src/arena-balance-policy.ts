import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const ARENA_BALANCE_POLICY_SCHEMA_VERSION = 1;

const POLICY_KEYS: ReadonlySet<string> = new Set([
  'schemaVersion',
  'minimumCompletedPairedCases',
  'duration',
  'equipment',
  'elimination',
]);
const DURATION_KEYS: ReadonlySet<string> = new Set([
  'targetMinimumTicks',
  'targetMaximumTicks',
  'minimumTargetShare',
  'ultraShortMaximumTicks',
  'maximumUltraShortShare',
  'maximumTimeoutShare',
]);
const EQUIPMENT_KEYS: ReadonlySet<string> = new Set([
  'actionBindings',
  'minimumPickupsPerDefinition',
  'minimumActionsPerDefinition',
  'minimumHitsPerDefinition',
  'minimumPickupSharePerDefinition',
  'maximumPickupSharePerDefinition',
  'minimumActionSharePerDefinition',
  'maximumActionSharePerDefinition',
  'minimumHitSharePerDefinition',
  'maximumHitSharePerDefinition',
]);
const ACTION_BINDING_KEYS: ReadonlySet<string> = new Set([
  'equipmentDefinitionId',
  'actionDefinitionId',
]);
const ELIMINATION_KEYS: ReadonlySet<string> = new Set([
  'minimumCreditedShare',
  'minimumEquipmentAttributedShare',
  'maximumEquipmentAttributedShare',
  'minimumEnvironmentShare',
]);

export interface ArenaBalanceActionBinding {
  readonly equipmentDefinitionId: string;
  readonly actionDefinitionId: string;
}

export interface ArenaBalanceDurationPolicy {
  readonly targetMinimumTicks: number;
  readonly targetMaximumTicks: number;
  readonly minimumTargetShare: number;
  readonly ultraShortMaximumTicks: number;
  readonly maximumUltraShortShare: number;
  readonly maximumTimeoutShare: number;
}

export interface ArenaBalanceEquipmentPolicy {
  readonly actionBindings: readonly Readonly<ArenaBalanceActionBinding>[];
  readonly minimumPickupsPerDefinition: number;
  readonly minimumActionsPerDefinition: number;
  readonly minimumHitsPerDefinition: number;
  readonly minimumPickupSharePerDefinition: number;
  readonly maximumPickupSharePerDefinition: number;
  readonly minimumActionSharePerDefinition: number;
  readonly maximumActionSharePerDefinition: number;
  readonly minimumHitSharePerDefinition: number;
  readonly maximumHitSharePerDefinition: number;
}

export interface ArenaBalanceEliminationPolicy {
  readonly minimumCreditedShare: number;
  readonly minimumEquipmentAttributedShare: number;
  readonly maximumEquipmentAttributedShare: number;
  readonly minimumEnvironmentShare: number;
}

export interface ArenaBalancePolicy {
  readonly schemaVersion: typeof ARENA_BALANCE_POLICY_SCHEMA_VERSION;
  readonly minimumCompletedPairedCases: number;
  readonly duration: Readonly<ArenaBalanceDurationPolicy>;
  readonly equipment: Readonly<ArenaBalanceEquipmentPolicy>;
  readonly elimination: Readonly<ArenaBalanceEliminationPolicy>;
}

function ratio(value: unknown, name: string): number {
  if (!Number.isFinite(value) || (value as number) < 0 || (value as number) > 1) {
    throw new RangeError(`${name} 必须位于 [0, 1]。`);
  }
  return value as number;
}

function cloneActionBindings(value: unknown): readonly Readonly<ArenaBalanceActionBinding>[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new RangeError('ArenaBalancePolicy.equipment.actionBindings 必须是非空数组。');
  }
  const equipmentIds = new Set<string>();
  const actionIds = new Set<string>();
  const result = value.map((entry: unknown, index: number) => {
    const name = `ArenaBalancePolicy.equipment.actionBindings[${index}]`;
    assertKnownKeys(entry, ACTION_BINDING_KEYS, name);
    const equipmentDefinitionId = assertNonEmptyString(
      entry.equipmentDefinitionId,
      `${name}.equipmentDefinitionId`,
    );
    const actionDefinitionId = assertNonEmptyString(
      entry.actionDefinitionId,
      `${name}.actionDefinitionId`,
    );
    if (equipmentIds.has(equipmentDefinitionId)) {
      throw new RangeError(`ArenaBalancePolicy 重复装备 ${equipmentDefinitionId}。`);
    }
    if (actionIds.has(actionDefinitionId)) {
      throw new RangeError(`ArenaBalancePolicy 重复装备动作 ${actionDefinitionId}。`);
    }
    equipmentIds.add(equipmentDefinitionId);
    actionIds.add(actionDefinitionId);
    return Object.freeze({ equipmentDefinitionId, actionDefinitionId });
  }).sort((left, right) => left.equipmentDefinitionId.localeCompare(right.equipmentDefinitionId));
  return Object.freeze(result);
}

function assertShareRange(minimum: number, maximum: number, name: string): void {
  if (minimum > maximum) throw new RangeError(`${name} 最小占比不能大于最大占比。`);
}

export function createArenaBalancePolicy(value: unknown): Readonly<ArenaBalancePolicy> {
  const source = cloneFrozenData(value, 'ArenaBalancePolicy');
  assertKnownKeys(source, POLICY_KEYS, 'ArenaBalancePolicy');
  if (source.schemaVersion !== ARENA_BALANCE_POLICY_SCHEMA_VERSION) {
    throw new RangeError(`不支持 ArenaBalancePolicy schema ${String(source.schemaVersion)}。`);
  }
  assertKnownKeys(source.duration, DURATION_KEYS, 'ArenaBalancePolicy.duration');
  assertKnownKeys(source.equipment, EQUIPMENT_KEYS, 'ArenaBalancePolicy.equipment');
  assertKnownKeys(source.elimination, ELIMINATION_KEYS, 'ArenaBalancePolicy.elimination');

  const targetMinimumTicks = assertIntegerAtLeast(
    source.duration.targetMinimumTicks,
    1,
    'ArenaBalancePolicy.duration.targetMinimumTicks',
  );
  const targetMaximumTicks = assertIntegerAtLeast(
    source.duration.targetMaximumTicks,
    targetMinimumTicks,
    'ArenaBalancePolicy.duration.targetMaximumTicks',
  );
  const ultraShortMaximumTicks = assertIntegerAtLeast(
    source.duration.ultraShortMaximumTicks,
    1,
    'ArenaBalancePolicy.duration.ultraShortMaximumTicks',
  );
  if (ultraShortMaximumTicks >= targetMinimumTicks) {
    throw new RangeError('ultraShortMaximumTicks 必须小于 targetMinimumTicks。');
  }

  const minimumPickupSharePerDefinition = ratio(
    source.equipment.minimumPickupSharePerDefinition,
    'ArenaBalancePolicy.equipment.minimumPickupSharePerDefinition',
  );
  const maximumPickupSharePerDefinition = ratio(
    source.equipment.maximumPickupSharePerDefinition,
    'ArenaBalancePolicy.equipment.maximumPickupSharePerDefinition',
  );
  const minimumActionSharePerDefinition = ratio(
    source.equipment.minimumActionSharePerDefinition,
    'ArenaBalancePolicy.equipment.minimumActionSharePerDefinition',
  );
  const maximumActionSharePerDefinition = ratio(
    source.equipment.maximumActionSharePerDefinition,
    'ArenaBalancePolicy.equipment.maximumActionSharePerDefinition',
  );
  const minimumHitSharePerDefinition = ratio(
    source.equipment.minimumHitSharePerDefinition,
    'ArenaBalancePolicy.equipment.minimumHitSharePerDefinition',
  );
  const maximumHitSharePerDefinition = ratio(
    source.equipment.maximumHitSharePerDefinition,
    'ArenaBalancePolicy.equipment.maximumHitSharePerDefinition',
  );
  assertShareRange(minimumPickupSharePerDefinition, maximumPickupSharePerDefinition, 'ArenaBalancePolicy.equipment pickup share');
  assertShareRange(minimumActionSharePerDefinition, maximumActionSharePerDefinition, 'ArenaBalancePolicy.equipment action share');
  assertShareRange(minimumHitSharePerDefinition, maximumHitSharePerDefinition, 'ArenaBalancePolicy.equipment hit share');

  const actionBindings = cloneActionBindings(source.equipment.actionBindings);
  const shareRanges: readonly [number, number, string][] = [
    [minimumPickupSharePerDefinition, maximumPickupSharePerDefinition, 'pickup'],
    [minimumActionSharePerDefinition, maximumActionSharePerDefinition, 'action'],
    [minimumHitSharePerDefinition, maximumHitSharePerDefinition, 'hit'],
  ];
  for (const [minimum, maximum, name] of shareRanges) {
    if (minimum * actionBindings.length > 1 + 1e-12) {
      throw new RangeError(`ArenaBalancePolicy.equipment ${name} 最小占比总和不可实现。`);
    }
    if (maximum * actionBindings.length < 1 - 1e-12) {
      throw new RangeError(`ArenaBalancePolicy.equipment ${name} 最大占比总和不可实现。`);
    }
  }

  const minimumEquipmentAttributedShare = ratio(
    source.elimination.minimumEquipmentAttributedShare,
    'ArenaBalancePolicy.elimination.minimumEquipmentAttributedShare',
  );
  const maximumEquipmentAttributedShare = ratio(
    source.elimination.maximumEquipmentAttributedShare,
    'ArenaBalancePolicy.elimination.maximumEquipmentAttributedShare',
  );
  assertShareRange(
    minimumEquipmentAttributedShare,
    maximumEquipmentAttributedShare,
    'ArenaBalancePolicy.elimination equipment share',
  );

  return Object.freeze({
    schemaVersion: ARENA_BALANCE_POLICY_SCHEMA_VERSION,
    minimumCompletedPairedCases: assertIntegerAtLeast(
      source.minimumCompletedPairedCases,
      1,
      'ArenaBalancePolicy.minimumCompletedPairedCases',
    ),
    duration: Object.freeze({
      targetMinimumTicks,
      targetMaximumTicks,
      minimumTargetShare: ratio(source.duration.minimumTargetShare, 'ArenaBalancePolicy.duration.minimumTargetShare'),
      ultraShortMaximumTicks,
      maximumUltraShortShare: ratio(source.duration.maximumUltraShortShare, 'ArenaBalancePolicy.duration.maximumUltraShortShare'),
      maximumTimeoutShare: ratio(source.duration.maximumTimeoutShare, 'ArenaBalancePolicy.duration.maximumTimeoutShare'),
    }),
    equipment: Object.freeze({
      actionBindings,
      minimumPickupsPerDefinition: assertIntegerAtLeast(source.equipment.minimumPickupsPerDefinition, 1, 'ArenaBalancePolicy.equipment.minimumPickupsPerDefinition'),
      minimumActionsPerDefinition: assertIntegerAtLeast(source.equipment.minimumActionsPerDefinition, 1, 'ArenaBalancePolicy.equipment.minimumActionsPerDefinition'),
      minimumHitsPerDefinition: assertIntegerAtLeast(source.equipment.minimumHitsPerDefinition, 1, 'ArenaBalancePolicy.equipment.minimumHitsPerDefinition'),
      minimumPickupSharePerDefinition,
      maximumPickupSharePerDefinition,
      minimumActionSharePerDefinition,
      maximumActionSharePerDefinition,
      minimumHitSharePerDefinition,
      maximumHitSharePerDefinition,
    }),
    elimination: Object.freeze({
      minimumCreditedShare: ratio(source.elimination.minimumCreditedShare, 'ArenaBalancePolicy.elimination.minimumCreditedShare'),
      minimumEquipmentAttributedShare,
      maximumEquipmentAttributedShare,
      minimumEnvironmentShare: ratio(source.elimination.minimumEnvironmentShare, 'ArenaBalancePolicy.elimination.minimumEnvironmentShare'),
    }),
  });
}
