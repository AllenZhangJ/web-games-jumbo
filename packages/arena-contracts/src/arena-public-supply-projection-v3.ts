import {
  ARENA_PUBLIC_SUPPLY_PROJECTION_MAX_ITEMS,
  ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS,
  type ArenaPublicSupplyProjectionReadiness,
} from './arena-public-supply-projection.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  type DeepReadonly,
  type PlainRecord,
} from './definition-utils.js';

export const ARENA_PUBLIC_SUPPLY_PROJECTION_V3_SCHEMA_VERSION = 3 as const;
export const ARENA_PUBLIC_SUPPLY_PROJECTION_V3_MAX_ITEMS =
  ARENA_PUBLIC_SUPPLY_PROJECTION_MAX_ITEMS;
export const ARENA_PUBLIC_SUPPLY_PROJECTION_V3_READINESS =
  ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS;

export interface ArenaPublicSupplyProjectionItemV3 {
  readonly schemaVersion: typeof ARENA_PUBLIC_SUPPLY_PROJECTION_V3_SCHEMA_VERSION;
  readonly supplyDefinitionId: string;
  readonly tierPolicyDefinitionId: string;
  readonly supplyId: string;
  readonly slotId: string;
  readonly waveIndex: number;
  readonly survivalLevel: number;
  readonly collectionEquipmentDefinitionId: string;
  readonly runtimeEquipmentDefinitionId: string;
  readonly equipmentInstanceId: string;
  readonly equipmentSpawnId: string;
  readonly spawnPosition: Readonly<{ x: number; y: number; z: number }>;
  readonly spawnTick: number;
  readonly expireTick: number;
  readonly remainingTicks: number;
  readonly position: Readonly<{ x: number; y: number; z: number }>;
}

export interface ArenaPublicSupplyProjectionV3 {
  readonly schemaVersion: typeof ARENA_PUBLIC_SUPPLY_PROJECTION_V3_SCHEMA_VERSION;
  readonly modeDefinitionId: string;
  readonly snapshotTick: number;
  readonly snapshotEventSequence: number;
  readonly resyncReadiness: ArenaPublicSupplyProjectionReadiness;
  readonly pendingAuthorityTick: number | null;
  readonly pendingExpiryEquipmentInstanceIds: readonly string[];
  readonly supplies: readonly ArenaPublicSupplyProjectionItemV3[];
}

/**
 * Registry-resolved identity for a supply item that is present in the current
 * World equipment set. The authority supplies this view; this contract never
 * infers tier identity by parsing Definition IDs.
 */
export interface ArenaPublicWorldSupplyIdentityV3 {
  readonly modeDefinitionId: string;
  readonly supplyDefinitionId: string;
  readonly tierPolicyDefinitionId: string;
  readonly supplyId: string;
  readonly slotId: string;
  readonly waveIndex: number;
  readonly survivalLevel: number;
  readonly collectionEquipmentDefinitionId: string;
  readonly runtimeEquipmentDefinitionId: string;
  readonly equipmentInstanceId: string;
  readonly equipmentSpawnId: string;
  readonly spawnPosition: Readonly<{ x: number; y: number; z: number }>;
  readonly spawnTick: number;
  readonly expireTick: number;
}

export interface ArenaPublicSupplyProjectionV3AuditOptions {
  readonly modeDefinitionId: string;
  readonly snapshotTick: number;
  readonly eventSequence: number;
  /** Complete spawned/dropped supply subset from the same V3 WorldSnapshot. */
  readonly worldSupplyEquipment: readonly unknown[];
  readonly expectedWorldSupplyIdentities: readonly ArenaPublicWorldSupplyIdentityV3[];
}

const PROJECTION_KEYS = new Set([
  'schemaVersion',
  'modeDefinitionId',
  'snapshotTick',
  'snapshotEventSequence',
  'resyncReadiness',
  'pendingAuthorityTick',
  'pendingExpiryEquipmentInstanceIds',
  'supplies',
]);
const ITEM_KEYS = new Set([
  'schemaVersion',
  'supplyDefinitionId',
  'tierPolicyDefinitionId',
  'supplyId',
  'slotId',
  'waveIndex',
  'survivalLevel',
  'collectionEquipmentDefinitionId',
  'runtimeEquipmentDefinitionId',
  'equipmentInstanceId',
  'equipmentSpawnId',
  'spawnPosition',
  'spawnTick',
  'expireTick',
  'remainingTicks',
  'position',
]);
const IDENTITY_KEYS = new Set([
  'modeDefinitionId',
  'supplyDefinitionId',
  'tierPolicyDefinitionId',
  'supplyId',
  'slotId',
  'waveIndex',
  'survivalLevel',
  'collectionEquipmentDefinitionId',
  'runtimeEquipmentDefinitionId',
  'equipmentInstanceId',
  'equipmentSpawnId',
  'spawnPosition',
  'spawnTick',
  'expireTick',
]);
const OPTIONS_KEYS = new Set([
  'modeDefinitionId',
  'snapshotTick',
  'eventSequence',
  'worldSupplyEquipment',
  'expectedWorldSupplyIdentities',
]);
const POSITION_KEYS = new Set(['x', 'y', 'z']);
const WORLD_LOCATION_STATES = new Set(['spawned', 'dropped']);

function requireKeys(value: PlainRecord, keys: ReadonlySet<string>, name: string): void {
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name} 缺少字段 ${key}。`);
  }
}

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is PlainRecord {
  assertKnownKeys(value, keys, name);
  requireKeys(value, keys, name);
}

function safeInteger(value: unknown, minimum: number, name: string): number {
  return assertIntegerAtLeast(value, minimum, name);
}

function finite(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} 必须是有限数。`);
  }
  return value;
}

function vector3(
  value: unknown,
  name: string,
): Readonly<{ x: number; y: number; z: number }> {
  exactRecord(value, POSITION_KEYS, name);
  return Object.freeze({
    x: finite(value.x, `${name}.x`),
    y: finite(value.y, `${name}.y`),
    z: finite(value.z, `${name}.z`),
  });
}

function sameVector3(
  left: Readonly<{ x: number; y: number; z: number }>,
  right: Readonly<{ x: number; y: number; z: number }>,
): boolean {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertUnique(values: readonly string[], name: string): void {
  if (new Set(values).size !== values.length) throw new RangeError(`${name} 不能重复。`);
}

function assertStableOrder(values: readonly string[], name: string): void {
  if (values.some((value, index) => index > 0 && values[index - 1]! >= value)) {
    throw new RangeError(`${name} 必须唯一且按字符串稳定升序。`);
  }
}

function normalizeIdentity(
  value: unknown,
  index: number,
  modeDefinitionId: string,
  snapshotTick: number,
): ArenaPublicWorldSupplyIdentityV3 {
  const name = `ArenaPublicSupplyProjectionV3.expectedWorldSupplyIdentities[${index}]`;
  exactRecord(value, IDENTITY_KEYS, name);
  if (value.modeDefinitionId !== modeDefinitionId) {
    throw new RangeError(`${name}.modeDefinitionId 与当前 Mode 不一致。`);
  }
  const spawnTick = safeInteger(value.spawnTick, 0, `${name}.spawnTick`);
  const expireTick = safeInteger(value.expireTick, 0, `${name}.expireTick`);
  if (spawnTick > snapshotTick || expireTick < snapshotTick || expireTick <= spawnTick) {
    throw new RangeError(`${name} 生命周期不覆盖当前 world snapshot。`);
  }
  return Object.freeze({
    modeDefinitionId,
    supplyDefinitionId: assertNonEmptyString(
      value.supplyDefinitionId,
      `${name}.supplyDefinitionId`,
    ),
    tierPolicyDefinitionId: assertNonEmptyString(
      value.tierPolicyDefinitionId,
      `${name}.tierPolicyDefinitionId`,
    ),
    supplyId: assertNonEmptyString(value.supplyId, `${name}.supplyId`),
    slotId: assertNonEmptyString(value.slotId, `${name}.slotId`),
    waveIndex: safeInteger(value.waveIndex, 0, `${name}.waveIndex`),
    survivalLevel: safeInteger(value.survivalLevel, 1, `${name}.survivalLevel`),
    collectionEquipmentDefinitionId: assertNonEmptyString(
      value.collectionEquipmentDefinitionId,
      `${name}.collectionEquipmentDefinitionId`,
    ),
    runtimeEquipmentDefinitionId: assertNonEmptyString(
      value.runtimeEquipmentDefinitionId,
      `${name}.runtimeEquipmentDefinitionId`,
    ),
    equipmentInstanceId: assertNonEmptyString(
      value.equipmentInstanceId,
      `${name}.equipmentInstanceId`,
    ),
    equipmentSpawnId: assertNonEmptyString(
      value.equipmentSpawnId,
      `${name}.equipmentSpawnId`,
    ),
    spawnPosition: vector3(value.spawnPosition, `${name}.spawnPosition`),
    spawnTick,
    expireTick,
  });
}

function normalizeOptions(
  value: ArenaPublicSupplyProjectionV3AuditOptions,
): DeepReadonly<ArenaPublicSupplyProjectionV3AuditOptions> {
  const source = cloneFrozenData(value, 'ArenaPublicSupplyProjectionV3 options');
  exactRecord(source, OPTIONS_KEYS, 'ArenaPublicSupplyProjectionV3 options');
  if (!Array.isArray(source.worldSupplyEquipment)) {
    throw new TypeError('ArenaPublicSupplyProjectionV3 options.worldSupplyEquipment 必须是数组。');
  }
  if (!Array.isArray(source.expectedWorldSupplyIdentities)) {
    throw new TypeError(
      'ArenaPublicSupplyProjectionV3 options.expectedWorldSupplyIdentities 必须是数组。',
    );
  }
  if (
    source.expectedWorldSupplyIdentities.length
    > ARENA_PUBLIC_SUPPLY_PROJECTION_V3_MAX_ITEMS
  ) {
    throw new RangeError('ArenaPublicSupplyProjectionV3 world supply 超过 3 项。');
  }
  const modeDefinitionId = assertNonEmptyString(
    source.modeDefinitionId,
    'ArenaPublicSupplyProjectionV3 options.modeDefinitionId',
  );
  const snapshotTick = safeInteger(
    source.snapshotTick,
    0,
    'ArenaPublicSupplyProjectionV3 options.snapshotTick',
  );
  const eventSequence = safeInteger(
    source.eventSequence,
    0,
    'ArenaPublicSupplyProjectionV3 options.eventSequence',
  );
  const expectedWorldSupplyIdentities = source.expectedWorldSupplyIdentities
    .map((identity, index) => normalizeIdentity(identity, index, modeDefinitionId, snapshotTick))
    .sort((left, right) => compareText(left.supplyId, right.supplyId));
  assertUnique(
    expectedWorldSupplyIdentities.map((identity) => identity.supplyId),
    'ArenaPublicSupplyProjectionV3 expected supplyId',
  );
  assertUnique(
    expectedWorldSupplyIdentities.map((identity) => identity.slotId),
    'ArenaPublicSupplyProjectionV3 expected slotId',
  );
  assertUnique(
    expectedWorldSupplyIdentities.map((identity) => identity.equipmentInstanceId),
    'ArenaPublicSupplyProjectionV3 expected equipmentInstanceId',
  );
  assertUnique(
    expectedWorldSupplyIdentities.map((identity) => identity.equipmentSpawnId),
    'ArenaPublicSupplyProjectionV3 expected equipmentSpawnId',
  );
  assertUnique(
    expectedWorldSupplyIdentities.map((identity) => `${identity.waveIndex}\u0000${identity.slotId}`),
    'ArenaPublicSupplyProjectionV3 expected wave/slot identity',
  );
  const firstIdentity = expectedWorldSupplyIdentities[0];
  if (firstIdentity && expectedWorldSupplyIdentities.some((identity) => (
    identity.supplyDefinitionId !== firstIdentity.supplyDefinitionId
    || identity.tierPolicyDefinitionId !== firstIdentity.tierPolicyDefinitionId
    || identity.waveIndex !== firstIdentity.waveIndex
    || identity.survivalLevel !== firstIdentity.survivalLevel
  ))) {
    throw new RangeError(
      'ArenaPublicSupplyProjectionV3 当前 world supply 的 supply/tier/wave/level 必须一致。',
    );
  }
  return Object.freeze({
    modeDefinitionId,
    snapshotTick,
    eventSequence,
    worldSupplyEquipment: source.worldSupplyEquipment,
    expectedWorldSupplyIdentities: Object.freeze(expectedWorldSupplyIdentities),
  });
}

function findWorldEquipment(
  identity: ArenaPublicWorldSupplyIdentityV3,
  equipment: readonly unknown[],
): Readonly<{ position: Readonly<{ x: number; y: number; z: number }> }> {
  const matches = equipment.filter((candidate, index) => {
    const record = assertPlainRecord(
      candidate,
      `ArenaPublicSupplyProjectionV3.worldSupplyEquipment[${index}]`,
    );
    return record.instanceId === identity.equipmentInstanceId;
  });
  if (matches.length !== 1) {
    throw new RangeError(
      `world equipment 必须唯一包含 ${identity.equipmentInstanceId}。`,
    );
  }
  const record = assertPlainRecord(
    matches[0],
    'ArenaPublicSupplyProjectionV3.worldSupplyEquipment',
  );
  if (
    typeof record.locationState !== 'string'
    || !WORLD_LOCATION_STATES.has(record.locationState)
  ) {
    throw new RangeError(`world equipment ${identity.equipmentInstanceId} 必须处于 world。`);
  }
  if (record.ownerId !== null || record.position === null) {
    throw new RangeError(`world equipment ${identity.equipmentInstanceId} owner/position 不一致。`);
  }
  if (
    record.runtimeEquipmentDefinitionId !== identity.runtimeEquipmentDefinitionId
    || record.collectionEquipmentDefinitionId !== identity.collectionEquipmentDefinitionId
    || record.survivalLevel !== identity.survivalLevel
    || record.spawnId !== identity.equipmentSpawnId
  ) {
    throw new RangeError(`world equipment ${identity.equipmentInstanceId} 公开身份漂移。`);
  }
  return Object.freeze({
    position: vector3(
      record.position,
      `world equipment ${identity.equipmentInstanceId}.position`,
    ),
  });
}

function normalizeSupplyItem(
  value: unknown,
  index: number,
  snapshotTick: number,
  expected: ArenaPublicWorldSupplyIdentityV3,
  worldPosition: Readonly<{ x: number; y: number; z: number }>,
): ArenaPublicSupplyProjectionItemV3 {
  const name = `ArenaPublicSupplyProjectionV3.supplies[${index}]`;
  exactRecord(value, ITEM_KEYS, name);
  if (value.schemaVersion !== ARENA_PUBLIC_SUPPLY_PROJECTION_V3_SCHEMA_VERSION) {
    throw new RangeError(`${name}.schemaVersion 必须是 3。`);
  }
  const item = Object.freeze({
    schemaVersion: ARENA_PUBLIC_SUPPLY_PROJECTION_V3_SCHEMA_VERSION,
    supplyDefinitionId: assertNonEmptyString(
      value.supplyDefinitionId,
      `${name}.supplyDefinitionId`,
    ),
    tierPolicyDefinitionId: assertNonEmptyString(
      value.tierPolicyDefinitionId,
      `${name}.tierPolicyDefinitionId`,
    ),
    supplyId: assertNonEmptyString(value.supplyId, `${name}.supplyId`),
    slotId: assertNonEmptyString(value.slotId, `${name}.slotId`),
    waveIndex: safeInteger(value.waveIndex, 0, `${name}.waveIndex`),
    survivalLevel: safeInteger(value.survivalLevel, 1, `${name}.survivalLevel`),
    collectionEquipmentDefinitionId: assertNonEmptyString(
      value.collectionEquipmentDefinitionId,
      `${name}.collectionEquipmentDefinitionId`,
    ),
    runtimeEquipmentDefinitionId: assertNonEmptyString(
      value.runtimeEquipmentDefinitionId,
      `${name}.runtimeEquipmentDefinitionId`,
    ),
    equipmentInstanceId: assertNonEmptyString(
      value.equipmentInstanceId,
      `${name}.equipmentInstanceId`,
    ),
    equipmentSpawnId: assertNonEmptyString(
      value.equipmentSpawnId,
      `${name}.equipmentSpawnId`,
    ),
    spawnPosition: vector3(value.spawnPosition, `${name}.spawnPosition`),
    spawnTick: safeInteger(value.spawnTick, 0, `${name}.spawnTick`),
    expireTick: safeInteger(value.expireTick, 0, `${name}.expireTick`),
    remainingTicks: safeInteger(value.remainingTicks, 1, `${name}.remainingTicks`),
    position: vector3(value.position, `${name}.position`),
  });
  if (
    item.supplyDefinitionId !== expected.supplyDefinitionId
    || item.tierPolicyDefinitionId !== expected.tierPolicyDefinitionId
    || item.supplyId !== expected.supplyId
    || item.slotId !== expected.slotId
    || item.waveIndex !== expected.waveIndex
    || item.survivalLevel !== expected.survivalLevel
    || item.collectionEquipmentDefinitionId !== expected.collectionEquipmentDefinitionId
    || item.runtimeEquipmentDefinitionId !== expected.runtimeEquipmentDefinitionId
    || item.equipmentInstanceId !== expected.equipmentInstanceId
    || item.equipmentSpawnId !== expected.equipmentSpawnId
    || item.spawnTick !== expected.spawnTick
    || item.expireTick !== expected.expireTick
  ) {
    throw new RangeError(`${name} 与 Mode/tier/wave/world identity 不一致。`);
  }
  if (!sameVector3(item.spawnPosition, expected.spawnPosition)) {
    throw new RangeError(`${name}.spawnPosition 与 Mode/tier identity 不一致。`);
  }
  if (!sameVector3(item.position, worldPosition)) {
    throw new RangeError(`${name}.position 与 world equipment 不一致。`);
  }
  if (item.expireTick <= snapshotTick || item.remainingTicks !== item.expireTick - snapshotTick) {
    throw new RangeError(`${name}.remainingTicks 必须精确等于 expireTick - snapshotTick。`);
  }
  return item;
}

export function createArenaPublicSupplyProjectionV3Audit(
  value: unknown,
  options: ArenaPublicSupplyProjectionV3AuditOptions,
): DeepReadonly<ArenaPublicSupplyProjectionV3> {
  const source = cloneFrozenData(value, 'ArenaPublicSupplyProjectionV3');
  const auditedOptions = normalizeOptions(options);
  exactRecord(source, PROJECTION_KEYS, 'ArenaPublicSupplyProjectionV3');
  if (source.schemaVersion !== ARENA_PUBLIC_SUPPLY_PROJECTION_V3_SCHEMA_VERSION) {
    throw new RangeError('ArenaPublicSupplyProjectionV3.schemaVersion 必须是 3。');
  }
  const modeDefinitionId = assertNonEmptyString(
    source.modeDefinitionId,
    'ArenaPublicSupplyProjectionV3.modeDefinitionId',
  );
  if (modeDefinitionId !== auditedOptions.modeDefinitionId) {
    throw new RangeError('ArenaPublicSupplyProjectionV3.modeDefinitionId 不一致。');
  }
  const snapshotTick = safeInteger(
    source.snapshotTick,
    0,
    'ArenaPublicSupplyProjectionV3.snapshotTick',
  );
  const snapshotEventSequence = safeInteger(
    source.snapshotEventSequence,
    0,
    'ArenaPublicSupplyProjectionV3.snapshotEventSequence',
  );
  if (snapshotTick !== auditedOptions.snapshotTick) {
    throw new RangeError('ArenaPublicSupplyProjectionV3.snapshotTick 与 world 不一致。');
  }
  if (snapshotEventSequence !== auditedOptions.eventSequence) {
    throw new RangeError('ArenaPublicSupplyProjectionV3.snapshotEventSequence 与 world 不一致。');
  }
  if (
    source.resyncReadiness !== ARENA_PUBLIC_SUPPLY_PROJECTION_V3_READINESS.READY
    && source.resyncReadiness
      !== ARENA_PUBLIC_SUPPLY_PROJECTION_V3_READINESS.NOT_READY_PRE_EXPIRY
  ) {
    throw new RangeError('ArenaPublicSupplyProjectionV3.resyncReadiness 无效。');
  }
  const readiness = source.resyncReadiness as ArenaPublicSupplyProjectionReadiness;
  const pendingAuthorityTick = source.pendingAuthorityTick === null
    ? null
    : safeInteger(
      source.pendingAuthorityTick,
      0,
      'ArenaPublicSupplyProjectionV3.pendingAuthorityTick',
    );
  const expectedPendingTick = readiness === ARENA_PUBLIC_SUPPLY_PROJECTION_V3_READINESS.READY
    ? null
    : snapshotTick;
  if (pendingAuthorityTick !== expectedPendingTick) {
    throw new RangeError('ArenaPublicSupplyProjectionV3 pending tick/readiness 不一致。');
  }
  if (!Array.isArray(source.pendingExpiryEquipmentInstanceIds)) {
    throw new TypeError(
      'ArenaPublicSupplyProjectionV3.pendingExpiryEquipmentInstanceIds 必须是数组。',
    );
  }
  const pendingExpiryEquipmentInstanceIds = source.pendingExpiryEquipmentInstanceIds.map(
    (id, index) => assertNonEmptyString(
      id,
      `ArenaPublicSupplyProjectionV3.pendingExpiryEquipmentInstanceIds[${index}]`,
    ),
  );
  assertStableOrder(
    pendingExpiryEquipmentInstanceIds,
    'ArenaPublicSupplyProjectionV3.pendingExpiryEquipmentInstanceIds',
  );
  if (pendingExpiryEquipmentInstanceIds.length > ARENA_PUBLIC_SUPPLY_PROJECTION_V3_MAX_ITEMS) {
    throw new RangeError('ArenaPublicSupplyProjectionV3 pending expiry 超过 3 项。');
  }
  if (!Array.isArray(source.supplies)) {
    throw new TypeError('ArenaPublicSupplyProjectionV3.supplies 必须是数组。');
  }
  if (source.supplies.length > ARENA_PUBLIC_SUPPLY_PROJECTION_V3_MAX_ITEMS) {
    throw new RangeError('ArenaPublicSupplyProjectionV3.supplies 超过 3 项。');
  }

  const expectedWorldIds = auditedOptions.expectedWorldSupplyIdentities
    .map((identity) => identity.equipmentInstanceId)
    .sort(compareText);
  const actualWorldIds = auditedOptions.worldSupplyEquipment.map((equipment, index) => {
    const record = assertPlainRecord(
      equipment,
      `ArenaPublicSupplyProjectionV3.worldSupplyEquipment[${index}]`,
    );
    return assertNonEmptyString(
      record.instanceId,
      `ArenaPublicSupplyProjectionV3.worldSupplyEquipment[${index}].instanceId`,
    );
  }).sort(compareText);
  if (
    actualWorldIds.length !== expectedWorldIds.length
    || actualWorldIds.some((id, index) => id !== expectedWorldIds[index])
  ) {
    throw new RangeError(
      'ArenaPublicSupplyProjectionV3 world supply equipment 与 expected identity 双向集合不一致。',
    );
  }
  const identityByInstanceId = new Map(
    auditedOptions.expectedWorldSupplyIdentities.map((identity) => [
      identity.equipmentInstanceId,
      identity,
    ]),
  );
  const worldPositionByInstanceId = new Map<string, Readonly<{ x: number; y: number; z: number }>>();
  for (const identity of auditedOptions.expectedWorldSupplyIdentities) {
    worldPositionByInstanceId.set(
      identity.equipmentInstanceId,
      findWorldEquipment(identity, auditedOptions.worldSupplyEquipment).position,
    );
  }
  const expectedPendingIds = auditedOptions.expectedWorldSupplyIdentities
    .filter((identity) => identity.expireTick === snapshotTick)
    .map((identity) => identity.equipmentInstanceId)
    .sort(compareText);
  const expectedActiveIds = auditedOptions.expectedWorldSupplyIdentities
    .filter((identity) => identity.expireTick > snapshotTick)
    .map((identity) => identity.equipmentInstanceId)
    .sort(compareText);
  const expectedReadiness = expectedPendingIds.length === 0
    ? ARENA_PUBLIC_SUPPLY_PROJECTION_V3_READINESS.READY
    : ARENA_PUBLIC_SUPPLY_PROJECTION_V3_READINESS.NOT_READY_PRE_EXPIRY;
  if (readiness !== expectedReadiness) {
    throw new RangeError('ArenaPublicSupplyProjectionV3 readiness 与 599/600/601 生命周期不一致。');
  }
  if (
    pendingExpiryEquipmentInstanceIds.length !== expectedPendingIds.length
    || pendingExpiryEquipmentInstanceIds.some((id, index) => id !== expectedPendingIds[index])
  ) {
    throw new RangeError('ArenaPublicSupplyProjectionV3 pending expiry 与 world 双向集合不一致。');
  }
  if (readiness === ARENA_PUBLIC_SUPPLY_PROJECTION_V3_READINESS.NOT_READY_PRE_EXPIRY
    && source.supplies.length !== 0) {
    throw new RangeError('ArenaPublicSupplyProjectionV3 pre-expiry 不得发布可拾取 supply。');
  }
  const supplies = source.supplies.map((item, index) => {
    const record = assertPlainRecord(item, `ArenaPublicSupplyProjectionV3.supplies[${index}]`);
    const instanceId = assertNonEmptyString(
      record.equipmentInstanceId,
      `ArenaPublicSupplyProjectionV3.supplies[${index}].equipmentInstanceId`,
    );
    const expected = identityByInstanceId.get(instanceId);
    const worldPosition = worldPositionByInstanceId.get(instanceId);
    if (!expected || !worldPosition) {
      throw new RangeError(`ArenaPublicSupplyProjectionV3 supply ${instanceId} 不在 world 闭包。`);
    }
    return normalizeSupplyItem(item, index, snapshotTick, expected, worldPosition);
  });
  assertStableOrder(
    supplies.map((item) => item.supplyId),
    'ArenaPublicSupplyProjectionV3.supplies',
  );
  assertUnique(
    supplies.map((item) => item.slotId),
    'ArenaPublicSupplyProjectionV3.supplies slotId',
  );
  assertUnique(
    supplies.map((item) => item.equipmentInstanceId),
    'ArenaPublicSupplyProjectionV3.supplies equipmentInstanceId',
  );
  assertUnique(
    supplies.map((item) => item.equipmentSpawnId),
    'ArenaPublicSupplyProjectionV3.supplies equipmentSpawnId',
  );
  const actualActiveIds = supplies.map((item) => item.equipmentInstanceId).sort(compareText);
  if (
    actualActiveIds.length !== expectedActiveIds.length
    || actualActiveIds.some((id, index) => id !== expectedActiveIds[index])
  ) {
    throw new RangeError('ArenaPublicSupplyProjectionV3 supplies 与 world active 集合不一致。');
  }
  return Object.freeze({
    schemaVersion: ARENA_PUBLIC_SUPPLY_PROJECTION_V3_SCHEMA_VERSION,
    modeDefinitionId,
    snapshotTick,
    snapshotEventSequence,
    resyncReadiness: readiness,
    pendingAuthorityTick,
    pendingExpiryEquipmentInstanceIds: Object.freeze([...pendingExpiryEquipmentInstanceIds]),
    supplies: Object.freeze(supplies),
  });
}

export function requireArenaPublicSupplyProjectionV3(
  value: unknown,
  options: ArenaPublicSupplyProjectionV3AuditOptions,
): DeepReadonly<ArenaPublicSupplyProjectionV3> {
  if (value === null || value === undefined) {
    throw new RangeError('V3 Mode read frame 缺少 ArenaPublicSupplyProjectionV3。');
  }
  return createArenaPublicSupplyProjectionV3Audit(value, options);
}

export function assertArenaPublicSupplyProjectionV3ResyncReady(
  value: unknown,
  options: ArenaPublicSupplyProjectionV3AuditOptions,
): DeepReadonly<ArenaPublicSupplyProjectionV3> {
  const projection = createArenaPublicSupplyProjectionV3Audit(value, options);
  if (projection.resyncReadiness !== ARENA_PUBLIC_SUPPLY_PROJECTION_V3_READINESS.READY) {
    throw new RangeError('V3 pre-expiry projection 不能作为 resync source。');
  }
  return projection;
}
