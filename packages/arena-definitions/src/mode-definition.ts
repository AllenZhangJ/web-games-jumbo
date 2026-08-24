import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '@number-strategy-jump/arena-contracts';

export const MODE_DEFINITION_SCHEMA_VERSION = 1 as const;

export const MODE_KIND = Object.freeze({
  DUEL: 'duel',
  RACE: 'race',
  SURVIVAL: 'survival',
} as const);

export type ModeKind = typeof MODE_KIND[keyof typeof MODE_KIND];

export interface ModeDefinition {
  readonly schemaVersion: typeof MODE_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly kind: ModeKind;
  readonly participantPolicyDefinitionId: string;
  readonly timelinePolicyDefinitionId: string;
  readonly objectivePolicyDefinitionId: string;
  readonly eliminationPolicyDefinitionId: string;
  readonly respawnPolicyDefinitionId: string;
  readonly relationshipPolicyDefinitionId: string;
  readonly resultPolicyDefinitionId: string;
  readonly requiredMapCapabilities: readonly string[];
  readonly equipmentSupplyDefinitionId: string | null;
  readonly survivalPressurePolicyDefinitionId: string | null;
  readonly survivalEquipmentTierPolicyDefinitionId: string | null;
}

const MODE_DEFINITION_KEYS = new Set([
  'schemaVersion',
  'id',
  'kind',
  'participantPolicyDefinitionId',
  'timelinePolicyDefinitionId',
  'objectivePolicyDefinitionId',
  'eliminationPolicyDefinitionId',
  'respawnPolicyDefinitionId',
  'relationshipPolicyDefinitionId',
  'resultPolicyDefinitionId',
  'requiredMapCapabilities',
  'equipmentSupplyDefinitionId',
  'survivalPressurePolicyDefinitionId',
  'survivalEquipmentTierPolicyDefinitionId',
]);

const MODE_KINDS: ReadonlySet<unknown> = new Set(Object.values(MODE_KIND));

function assertExactKeys(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key} 为必填字段。`);
  }
}

function cloneNullableDefinitionId(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

export function createModeDefinition(value: unknown): ModeDefinition {
  const source = cloneFrozenData(value, 'ModeDefinition');
  assertExactKeys(source, MODE_DEFINITION_KEYS, 'ModeDefinition');
  if (source.schemaVersion !== MODE_DEFINITION_SCHEMA_VERSION) {
    throw new RangeError(
      `ModeDefinition.schemaVersion 必须是 ${MODE_DEFINITION_SCHEMA_VERSION}。`,
    );
  }
  if (!MODE_KINDS.has(source.kind)) {
    throw new RangeError(`ModeDefinition.kind 不受支持：${String(source.kind)}。`);
  }
  const kind = source.kind as ModeKind;
  const equipmentSupplyDefinitionId = cloneNullableDefinitionId(
    source.equipmentSupplyDefinitionId,
    'ModeDefinition.equipmentSupplyDefinitionId',
  );
  const survivalPressurePolicyDefinitionId = cloneNullableDefinitionId(
    source.survivalPressurePolicyDefinitionId,
    'ModeDefinition.survivalPressurePolicyDefinitionId',
  );
  const survivalEquipmentTierPolicyDefinitionId = cloneNullableDefinitionId(
    source.survivalEquipmentTierPolicyDefinitionId,
    'ModeDefinition.survivalEquipmentTierPolicyDefinitionId',
  );
  if (kind === MODE_KIND.SURVIVAL) {
    if (
      equipmentSupplyDefinitionId === null
      || survivalPressurePolicyDefinitionId === null
      || survivalEquipmentTierPolicyDefinitionId === null
    ) {
      throw new RangeError('Survival ModeDefinition 必须显式绑定供给、压力与装备等级 Policy。');
    }
  } else if (
    survivalPressurePolicyDefinitionId !== null
    || survivalEquipmentTierPolicyDefinitionId !== null
  ) {
    throw new RangeError('非 Survival ModeDefinition 的 Survival Policy 引用必须精确为 null。');
  }

  return Object.freeze({
    schemaVersion: MODE_DEFINITION_SCHEMA_VERSION,
    id: assertNonEmptyString(source.id, 'ModeDefinition.id'),
    kind,
    participantPolicyDefinitionId: assertNonEmptyString(
      source.participantPolicyDefinitionId,
      'ModeDefinition.participantPolicyDefinitionId',
    ),
    timelinePolicyDefinitionId: assertNonEmptyString(
      source.timelinePolicyDefinitionId,
      'ModeDefinition.timelinePolicyDefinitionId',
    ),
    objectivePolicyDefinitionId: assertNonEmptyString(
      source.objectivePolicyDefinitionId,
      'ModeDefinition.objectivePolicyDefinitionId',
    ),
    eliminationPolicyDefinitionId: assertNonEmptyString(
      source.eliminationPolicyDefinitionId,
      'ModeDefinition.eliminationPolicyDefinitionId',
    ),
    respawnPolicyDefinitionId: assertNonEmptyString(
      source.respawnPolicyDefinitionId,
      'ModeDefinition.respawnPolicyDefinitionId',
    ),
    relationshipPolicyDefinitionId: assertNonEmptyString(
      source.relationshipPolicyDefinitionId,
      'ModeDefinition.relationshipPolicyDefinitionId',
    ),
    resultPolicyDefinitionId: assertNonEmptyString(
      source.resultPolicyDefinitionId,
      'ModeDefinition.resultPolicyDefinitionId',
    ),
    requiredMapCapabilities: cloneFrozenStringSet(
      source.requiredMapCapabilities as readonly unknown[],
      'ModeDefinition.requiredMapCapabilities',
    ),
    equipmentSupplyDefinitionId,
    survivalPressurePolicyDefinitionId,
    survivalEquipmentTierPolicyDefinitionId,
  });
}
