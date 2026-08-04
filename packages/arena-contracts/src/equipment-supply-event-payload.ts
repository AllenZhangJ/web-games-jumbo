import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type PlainRecord,
} from './definition-utils.js';

export const EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION = 1 as const;

export const EQUIPMENT_RECYCLE_REASON = Object.freeze({
  REPLACED: 'replaced',
} as const);

export const EQUIPMENT_EXPIRY_REASON = Object.freeze({
  LIFETIME_EXPIRED: 'lifetime-expired',
} as const);

// A held supply may outlive its public lifecycle, but it must not re-enter the
// world when its owner is eliminated after expiry. This reason is shared by
// the equipment authority and MatchCore's authoritative despawn event.
export const EQUIPMENT_DESPAWN_REASON = Object.freeze({
  EXPIRED_HELD_LIFECYCLE: 'supply-lifecycle-expired-held-drop',
} as const);

interface EquipmentSupplyEventIdentityPayload {
  readonly supplyDefinitionId: string;
  readonly supplyId: string;
  readonly equipmentInstanceId: string;
  readonly spawnTick: number;
  readonly expireTick: number;
  readonly tick: number;
}

export interface EquipmentSpawnedEventPayload extends EquipmentSupplyEventIdentityPayload {
  readonly schemaVersion: typeof EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION;
  readonly equipmentDefinitionId: string;
  readonly spawnId: string;
  readonly position: Readonly<{ x: number; y: number; z: number }>;
}

export interface EquipmentReplacedEventPayload extends EquipmentSupplyEventIdentityPayload {
  readonly schemaVersion: typeof EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION;
  readonly participantId: string;
  readonly previousEquipmentInstanceId: string;
  readonly nextEquipmentInstanceId: string;
}

export interface EquipmentRecycledEventPayload extends EquipmentSupplyEventIdentityPayload {
  readonly schemaVersion: typeof EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION;
  readonly participantId: string;
  readonly recycledEquipmentInstanceId: string;
  readonly replacementEquipmentInstanceId: string;
  readonly reason: typeof EQUIPMENT_RECYCLE_REASON.REPLACED;
}

export interface EquipmentExpiredEventPayload extends EquipmentSupplyEventIdentityPayload {
  readonly schemaVersion: typeof EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION;
  readonly expiredEquipmentInstanceId: string;
  readonly reason: typeof EQUIPMENT_EXPIRY_REASON.LIFETIME_EXPIRED;
}

const IDENTITY_KEYS = [
  'schemaVersion',
  'supplyDefinitionId',
  'supplyId',
  'equipmentInstanceId',
  'spawnTick',
  'expireTick',
  'tick',
] as const;
const SPAWNED_KEYS = new Set([
  ...IDENTITY_KEYS,
  'equipmentDefinitionId',
  'spawnId',
  'position',
]);
const POSITION_KEYS = new Set(['x', 'y', 'z']);
const REPLACED_KEYS = new Set([
  ...IDENTITY_KEYS,
  'participantId',
  'previousEquipmentInstanceId',
  'nextEquipmentInstanceId',
]);
const RECYCLED_KEYS = new Set([
  ...IDENTITY_KEYS,
  'participantId',
  'recycledEquipmentInstanceId',
  'replacementEquipmentInstanceId',
  'reason',
]);
const EXPIRED_KEYS = new Set([
  ...IDENTITY_KEYS,
  'expiredEquipmentInstanceId',
  'reason',
]);

function safeTick(value: unknown, name: string): number {
  return assertIntegerAtLeast(value, 0, name);
}

function parseIdentity(
  source: PlainRecord,
  name: string,
  { requireBeforeExpiry }: { readonly requireBeforeExpiry: boolean },
): EquipmentSupplyEventIdentityPayload {
  if (source.schemaVersion !== EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION) {
    throw new RangeError(
      `${name}.schemaVersion 必须是 ${EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION}。`,
    );
  }
  const spawnTick = safeTick(source.spawnTick, `${name}.spawnTick`);
  const expireTick = safeTick(source.expireTick, `${name}.expireTick`);
  const tick = safeTick(source.tick, `${name}.tick`);
  if (expireTick <= spawnTick) throw new RangeError(`${name}.expireTick 必须晚于 spawnTick。`);
  if (tick < spawnTick || (requireBeforeExpiry ? tick >= expireTick : tick !== expireTick)) {
    throw new RangeError(requireBeforeExpiry
      ? `${name}.tick 必须位于 [spawnTick, expireTick) 内。`
      : `${name}.tick 必须等于 expireTick。`);
  }
  return {
    supplyDefinitionId: assertNonEmptyString(
      source.supplyDefinitionId,
      `${name}.supplyDefinitionId`,
    ),
    supplyId: assertNonEmptyString(source.supplyId, `${name}.supplyId`),
    equipmentInstanceId: assertNonEmptyString(
      source.equipmentInstanceId,
      `${name}.equipmentInstanceId`,
    ),
    spawnTick,
    expireTick,
    tick,
  };
}

export function createEquipmentSpawnedEventPayload(value: unknown): EquipmentSpawnedEventPayload {
  const source = cloneFrozenData(value, 'EquipmentSpawnedEventPayload');
  assertKnownKeys(source, SPAWNED_KEYS, 'EquipmentSpawnedEventPayload');
  const identity = parseIdentity(source, 'EquipmentSpawnedEventPayload', {
    requireBeforeExpiry: true,
  });
  if (identity.tick !== identity.spawnTick) {
    throw new RangeError('EquipmentSpawnedEventPayload.tick 必须等于 spawnTick。');
  }
  assertKnownKeys(source.position, POSITION_KEYS, 'EquipmentSpawnedEventPayload.position');
  const position = { x: 0, y: 0, z: 0 };
  for (const axis of ['x', 'y', 'z'] as const) {
    if (!Number.isFinite(source.position[axis])) {
      throw new RangeError(`EquipmentSpawnedEventPayload.position.${axis} 必须是有限数。`);
    }
    position[axis] = source.position[axis] as number;
  }
  return Object.freeze({
    schemaVersion: EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION,
    ...identity,
    equipmentDefinitionId: assertNonEmptyString(
      source.equipmentDefinitionId,
      'EquipmentSpawnedEventPayload.equipmentDefinitionId',
    ),
    spawnId: assertNonEmptyString(source.spawnId, 'EquipmentSpawnedEventPayload.spawnId'),
    position: Object.freeze(position),
  });
}

export function createEquipmentReplacedEventPayload(value: unknown): EquipmentReplacedEventPayload {
  const source = cloneFrozenData(value, 'EquipmentReplacedEventPayload');
  assertKnownKeys(source, REPLACED_KEYS, 'EquipmentReplacedEventPayload');
  const identity = parseIdentity(source, 'EquipmentReplacedEventPayload', {
    requireBeforeExpiry: true,
  });
  const previousEquipmentInstanceId = assertNonEmptyString(
    source.previousEquipmentInstanceId,
    'EquipmentReplacedEventPayload.previousEquipmentInstanceId',
  );
  const nextEquipmentInstanceId = assertNonEmptyString(
    source.nextEquipmentInstanceId,
    'EquipmentReplacedEventPayload.nextEquipmentInstanceId',
  );
  if (nextEquipmentInstanceId !== identity.equipmentInstanceId) {
    throw new RangeError('EquipmentReplacedEventPayload.nextEquipmentInstanceId 与供给身份不一致。');
  }
  if (previousEquipmentInstanceId === nextEquipmentInstanceId) {
    throw new RangeError('EquipmentReplacedEventPayload 旧新 equipment identity 不能相同。');
  }
  return Object.freeze({
    schemaVersion: EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION,
    ...identity,
    participantId: assertNonEmptyString(
      source.participantId,
      'EquipmentReplacedEventPayload.participantId',
    ),
    previousEquipmentInstanceId,
    nextEquipmentInstanceId,
  });
}

export function createEquipmentRecycledEventPayload(value: unknown): EquipmentRecycledEventPayload {
  const source = cloneFrozenData(value, 'EquipmentRecycledEventPayload');
  assertKnownKeys(source, RECYCLED_KEYS, 'EquipmentRecycledEventPayload');
  const identity = parseIdentity(source, 'EquipmentRecycledEventPayload', {
    requireBeforeExpiry: true,
  });
  if (source.reason !== EQUIPMENT_RECYCLE_REASON.REPLACED) {
    throw new RangeError('EquipmentRecycledEventPayload.reason 必须是 replaced。');
  }
  const recycledEquipmentInstanceId = assertNonEmptyString(
    source.recycledEquipmentInstanceId,
    'EquipmentRecycledEventPayload.recycledEquipmentInstanceId',
  );
  const replacementEquipmentInstanceId = assertNonEmptyString(
    source.replacementEquipmentInstanceId,
    'EquipmentRecycledEventPayload.replacementEquipmentInstanceId',
  );
  if (replacementEquipmentInstanceId !== identity.equipmentInstanceId) {
    throw new RangeError(
      'EquipmentRecycledEventPayload.replacementEquipmentInstanceId 与供给身份不一致。',
    );
  }
  if (recycledEquipmentInstanceId === replacementEquipmentInstanceId) {
    throw new RangeError('EquipmentRecycledEventPayload 回收与替换 equipment identity 不能相同。');
  }
  return Object.freeze({
    schemaVersion: EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION,
    ...identity,
    participantId: assertNonEmptyString(
      source.participantId,
      'EquipmentRecycledEventPayload.participantId',
    ),
    recycledEquipmentInstanceId,
    replacementEquipmentInstanceId,
    reason: EQUIPMENT_RECYCLE_REASON.REPLACED,
  });
}

export function createEquipmentExpiredEventPayload(value: unknown): EquipmentExpiredEventPayload {
  const source = cloneFrozenData(value, 'EquipmentExpiredEventPayload');
  assertKnownKeys(source, EXPIRED_KEYS, 'EquipmentExpiredEventPayload');
  const identity = parseIdentity(source, 'EquipmentExpiredEventPayload', {
    requireBeforeExpiry: false,
  });
  if (source.reason !== EQUIPMENT_EXPIRY_REASON.LIFETIME_EXPIRED) {
    throw new RangeError('EquipmentExpiredEventPayload.reason 必须是 lifetime-expired。');
  }
  const expiredEquipmentInstanceId = assertNonEmptyString(
    source.expiredEquipmentInstanceId,
    'EquipmentExpiredEventPayload.expiredEquipmentInstanceId',
  );
  if (expiredEquipmentInstanceId !== identity.equipmentInstanceId) {
    throw new RangeError('EquipmentExpiredEventPayload.expiredEquipmentInstanceId 与供给身份不一致。');
  }
  return Object.freeze({
    schemaVersion: EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION,
    ...identity,
    expiredEquipmentInstanceId,
    reason: EQUIPMENT_EXPIRY_REASON.LIFETIME_EXPIRED,
  });
}
