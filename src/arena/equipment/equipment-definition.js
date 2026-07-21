import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPositiveFinite,
  cloneFrozenStringSet,
} from '../rules/definition-utils.js';

export const EQUIPMENT_DEFINITION_SCHEMA_VERSION = 2;

export const EQUIPMENT_PICKUP_MODE = Object.freeze({
  AUTOMATIC: 'automatic',
});

export const EQUIPMENT_DROP_POLICY = Object.freeze({
  LAST_SAFE_POSITION: 'last-safe-position',
});

export const EQUIPMENT_DROP_FALLBACK = Object.freeze({
  ORIGIN_SPAWN: 'origin-spawn',
});

const DEFINITION_KEYS = new Set([
  'schemaVersion',
  'id',
  'category',
  'slot',
  'actionDefinitionId',
  'aerialActionDefinitionId',
  'pickup',
  'drop',
  'presentationSemantic',
  'tags',
]);
const PICKUP_KEYS = new Set(['mode', 'radius']);
const DROP_KEYS = new Set(['onOwnerEliminated', 'invalidPositionFallback']);

export function createEquipmentDefinition(value) {
  assertKnownKeys(value, DEFINITION_KEYS, 'EquipmentDefinition');
  if (value.schemaVersion !== EQUIPMENT_DEFINITION_SCHEMA_VERSION) {
    throw new RangeError(
      `EquipmentDefinition.schemaVersion 必须是 ${EQUIPMENT_DEFINITION_SCHEMA_VERSION}。`,
    );
  }
  assertKnownKeys(value.pickup, PICKUP_KEYS, 'EquipmentDefinition.pickup');
  if (value.pickup.mode !== EQUIPMENT_PICKUP_MODE.AUTOMATIC) {
    throw new RangeError(`EquipmentDefinition.pickup.mode 不受支持：${String(value.pickup.mode)}。`);
  }
  assertKnownKeys(value.drop, DROP_KEYS, 'EquipmentDefinition.drop');
  if (value.drop.onOwnerEliminated !== EQUIPMENT_DROP_POLICY.LAST_SAFE_POSITION) {
    throw new RangeError('EquipmentDefinition.drop.onOwnerEliminated 必须是 last-safe-position。');
  }
  if (value.drop.invalidPositionFallback !== EQUIPMENT_DROP_FALLBACK.ORIGIN_SPAWN) {
    throw new RangeError(
      'EquipmentDefinition.drop.invalidPositionFallback 必须是 origin-spawn。',
    );
  }
  return Object.freeze({
    schemaVersion: EQUIPMENT_DEFINITION_SCHEMA_VERSION,
    id: assertNonEmptyString(value.id, 'EquipmentDefinition.id'),
    category: assertNonEmptyString(value.category, 'EquipmentDefinition.category'),
    slot: assertNonEmptyString(value.slot, 'EquipmentDefinition.slot'),
    actionDefinitionId: assertNonEmptyString(
      value.actionDefinitionId,
      'EquipmentDefinition.actionDefinitionId',
    ),
    aerialActionDefinitionId: assertNonEmptyString(
      value.aerialActionDefinitionId,
      'EquipmentDefinition.aerialActionDefinitionId',
    ),
    pickup: Object.freeze({
      mode: value.pickup.mode,
      radius: assertPositiveFinite(value.pickup.radius, 'EquipmentDefinition.pickup.radius'),
    }),
    drop: Object.freeze({
      onOwnerEliminated: value.drop.onOwnerEliminated,
      invalidPositionFallback: value.drop.invalidPositionFallback,
    }),
    presentationSemantic: assertNonEmptyString(
      value.presentationSemantic,
      'EquipmentDefinition.presentationSemantic',
    ),
    tags: cloneFrozenStringSet(value.tags, 'EquipmentDefinition.tags'),
  });
}
