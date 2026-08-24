import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const SURVIVAL_ENEMY_WEAPON_AFFORDANCE_V1_SCHEMA_VERSION = 1 as const;

export const SURVIVAL_ENEMY_PRIMARY_SOURCE_V1 = Object.freeze({
  BASE_ACTION: 'base-action',
  EQUIPMENT: 'equipment',
} as const);

export type SurvivalEnemyPrimarySourceV1 = typeof SURVIVAL_ENEMY_PRIMARY_SOURCE_V1[
  keyof typeof SURVIVAL_ENEMY_PRIMARY_SOURCE_V1
];

export interface SurvivalEnemyWeaponAffordanceSourceV1 {
  readonly schemaVersion: typeof SURVIVAL_ENEMY_WEAPON_AFFORDANCE_V1_SCHEMA_VERSION;
  readonly sourceKind: SurvivalEnemyPrimarySourceV1;
  readonly primaryActionDefinitionId: string;
  readonly collectionEquipmentDefinitionId: string | null;
  readonly runtimeEquipmentDefinitionId: string | null;
  readonly survivalLevel: number | null;
  readonly primaryRange: number;
  readonly minimumCommitmentTicks: number;
  readonly cooldownRemainingTicks: number;
  readonly actionBlocked: boolean;
}

export interface SurvivalEnemyPrimaryActionAffordanceV1 {
  readonly primaryRange: number;
  readonly minimumCommitmentTicks: number;
  readonly actionReady: boolean;
}

const SOURCE_KEYS = new Set([
  'schemaVersion', 'sourceKind', 'primaryActionDefinitionId',
  'collectionEquipmentDefinitionId', 'runtimeEquipmentDefinitionId', 'survivalLevel',
  'primaryRange', 'minimumCommitmentTicks', 'cooldownRemainingTicks', 'actionBlocked',
]);
const SOURCE_KINDS: ReadonlySet<unknown> = new Set(Object.values(SURVIVAL_ENEMY_PRIMARY_SOURCE_V1));

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
}

function nullableId(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

export function createSurvivalEnemyPrimaryActionAffordanceV1(
  value: unknown,
): SurvivalEnemyPrimaryActionAffordanceV1 {
  const source = cloneFrozenData(value, 'SurvivalEnemyWeaponAffordanceSourceV1');
  exactRecord(source, SOURCE_KEYS, 'SurvivalEnemyWeaponAffordanceSourceV1');
  if (source.schemaVersion !== SURVIVAL_ENEMY_WEAPON_AFFORDANCE_V1_SCHEMA_VERSION) {
    throw new RangeError('SurvivalEnemyWeaponAffordanceSourceV1.schemaVersion必须是1。');
  }
  if (!SOURCE_KINDS.has(source.sourceKind)) {
    throw new RangeError('SurvivalEnemyWeaponAffordanceSourceV1.sourceKind不受支持。');
  }
  const sourceKind = source.sourceKind as SurvivalEnemyPrimarySourceV1;
  assertNonEmptyString(
    source.primaryActionDefinitionId,
    'SurvivalEnemyWeaponAffordanceSourceV1.primaryActionDefinitionId',
  );
  const collectionEquipmentDefinitionId = nullableId(
    source.collectionEquipmentDefinitionId,
    'SurvivalEnemyWeaponAffordanceSourceV1.collectionEquipmentDefinitionId',
  );
  const runtimeEquipmentDefinitionId = nullableId(
    source.runtimeEquipmentDefinitionId,
    'SurvivalEnemyWeaponAffordanceSourceV1.runtimeEquipmentDefinitionId',
  );
  let survivalLevel: number | null = null;
  if (source.survivalLevel !== null) {
    survivalLevel = assertIntegerAtLeast(
      source.survivalLevel,
      1,
      'SurvivalEnemyWeaponAffordanceSourceV1.survivalLevel',
    );
    if (survivalLevel > 10) {
      throw new RangeError('SurvivalEnemyWeaponAffordanceSourceV1.survivalLevel不能超过10。');
    }
  }
  if (sourceKind === SURVIVAL_ENEMY_PRIMARY_SOURCE_V1.BASE_ACTION) {
    if (
      collectionEquipmentDefinitionId !== null
      || runtimeEquipmentDefinitionId !== null
      || survivalLevel !== null
    ) throw new RangeError('base-action affordance不得携带装备或等级身份。');
  } else if (
    collectionEquipmentDefinitionId === null
    || runtimeEquipmentDefinitionId === null
    || survivalLevel === null
    || collectionEquipmentDefinitionId === runtimeEquipmentDefinitionId
  ) {
    throw new RangeError('equipment affordance必须携带分离的collection/runtime/level身份。');
  }
  if (!Number.isFinite(source.primaryRange) || (source.primaryRange as number) <= 0) {
    throw new RangeError('SurvivalEnemyWeaponAffordanceSourceV1.primaryRange必须是有限正数。');
  }
  const cooldownRemainingTicks = assertIntegerAtLeast(
    source.cooldownRemainingTicks,
    0,
    'SurvivalEnemyWeaponAffordanceSourceV1.cooldownRemainingTicks',
  );
  if (!Number.isSafeInteger(cooldownRemainingTicks)) {
    throw new RangeError('SurvivalEnemyWeaponAffordanceSourceV1.cooldownRemainingTicks必须是安全整数。');
  }
  const minimumCommitmentTicks = assertIntegerAtLeast(
    source.minimumCommitmentTicks,
    0,
    'SurvivalEnemyWeaponAffordanceSourceV1.minimumCommitmentTicks',
  );
  if (!Number.isSafeInteger(minimumCommitmentTicks)) {
    throw new RangeError('SurvivalEnemyWeaponAffordanceSourceV1.minimumCommitmentTicks必须是安全整数。');
  }
  if (typeof source.actionBlocked !== 'boolean') {
    throw new TypeError('SurvivalEnemyWeaponAffordanceSourceV1.actionBlocked必须是boolean。');
  }
  return Object.freeze({
    primaryRange: source.primaryRange as number,
    minimumCommitmentTicks,
    actionReady: cooldownRemainingTicks === 0 && !source.actionBlocked,
  });
}
