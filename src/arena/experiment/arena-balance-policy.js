import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../rules/definition-utils.js';

export const ARENA_BALANCE_POLICY_SCHEMA_VERSION = 1;

const POLICY_KEYS = new Set([
  'schemaVersion',
  'minimumCompletedPairedCases',
  'duration',
  'equipment',
  'elimination',
]);
const DURATION_KEYS = new Set([
  'targetMinimumTicks',
  'targetMaximumTicks',
  'minimumTargetShare',
  'ultraShortMaximumTicks',
  'maximumUltraShortShare',
  'maximumTimeoutShare',
]);
const EQUIPMENT_KEYS = new Set([
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
const ACTION_BINDING_KEYS = new Set(['equipmentDefinitionId', 'actionDefinitionId']);
const ELIMINATION_KEYS = new Set([
  'minimumCreditedShare',
  'minimumEquipmentAttributedShare',
  'maximumEquipmentAttributedShare',
  'minimumEnvironmentShare',
]);

function ratio(value, name) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} 必须位于 [0, 1]。`);
  }
  return value;
}

function cloneActionBindings(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError('ArenaBalancePolicy.equipment.actionBindings 必须是非空数组。');
  }
  const equipmentIds = new Set();
  const actionIds = new Set();
  const result = values.map((value, index) => {
    const name = `ArenaBalancePolicy.equipment.actionBindings[${index}]`;
    assertKnownKeys(value, ACTION_BINDING_KEYS, name);
    const equipmentDefinitionId = assertNonEmptyString(
      value.equipmentDefinitionId,
      `${name}.equipmentDefinitionId`,
    );
    const actionDefinitionId = assertNonEmptyString(
      value.actionDefinitionId,
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
  }).sort((left, right) => (
    left.equipmentDefinitionId < right.equipmentDefinitionId
      ? -1
      : left.equipmentDefinitionId > right.equipmentDefinitionId ? 1 : 0
  ));
  return Object.freeze(result);
}

function assertShareRange(minimum, maximum, name) {
  if (minimum > maximum) throw new RangeError(`${name} 最小占比不能大于最大占比。`);
}

export function createArenaBalancePolicy(value) {
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
  assertShareRange(
    minimumPickupSharePerDefinition,
    maximumPickupSharePerDefinition,
    'ArenaBalancePolicy.equipment pickup share',
  );
  assertShareRange(
    minimumActionSharePerDefinition,
    maximumActionSharePerDefinition,
    'ArenaBalancePolicy.equipment action share',
  );
  assertShareRange(
    minimumHitSharePerDefinition,
    maximumHitSharePerDefinition,
    'ArenaBalancePolicy.equipment hit share',
  );
  const actionBindings = cloneActionBindings(source.equipment.actionBindings);
  for (const [minimum, maximum, name] of [
    [minimumPickupSharePerDefinition, maximumPickupSharePerDefinition, 'pickup'],
    [minimumActionSharePerDefinition, maximumActionSharePerDefinition, 'action'],
    [minimumHitSharePerDefinition, maximumHitSharePerDefinition, 'hit'],
  ]) {
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
      minimumTargetShare: ratio(
        source.duration.minimumTargetShare,
        'ArenaBalancePolicy.duration.minimumTargetShare',
      ),
      ultraShortMaximumTicks,
      maximumUltraShortShare: ratio(
        source.duration.maximumUltraShortShare,
        'ArenaBalancePolicy.duration.maximumUltraShortShare',
      ),
      maximumTimeoutShare: ratio(
        source.duration.maximumTimeoutShare,
        'ArenaBalancePolicy.duration.maximumTimeoutShare',
      ),
    }),
    equipment: Object.freeze({
      actionBindings,
      minimumPickupsPerDefinition: assertIntegerAtLeast(
        source.equipment.minimumPickupsPerDefinition,
        1,
        'ArenaBalancePolicy.equipment.minimumPickupsPerDefinition',
      ),
      minimumActionsPerDefinition: assertIntegerAtLeast(
        source.equipment.minimumActionsPerDefinition,
        1,
        'ArenaBalancePolicy.equipment.minimumActionsPerDefinition',
      ),
      minimumHitsPerDefinition: assertIntegerAtLeast(
        source.equipment.minimumHitsPerDefinition,
        1,
        'ArenaBalancePolicy.equipment.minimumHitsPerDefinition',
      ),
      minimumPickupSharePerDefinition,
      maximumPickupSharePerDefinition,
      minimumActionSharePerDefinition,
      maximumActionSharePerDefinition,
      minimumHitSharePerDefinition,
      maximumHitSharePerDefinition,
    }),
    elimination: Object.freeze({
      minimumCreditedShare: ratio(
        source.elimination.minimumCreditedShare,
        'ArenaBalancePolicy.elimination.minimumCreditedShare',
      ),
      minimumEquipmentAttributedShare,
      maximumEquipmentAttributedShare,
      minimumEnvironmentShare: ratio(
        source.elimination.minimumEnvironmentShare,
        'ArenaBalancePolicy.elimination.minimumEnvironmentShare',
      ),
    }),
  });
}
