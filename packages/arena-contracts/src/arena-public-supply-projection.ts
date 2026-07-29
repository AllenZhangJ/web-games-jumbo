import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from './definition-utils.js';
import type { DeepReadonly } from './definition-utils.js';

// v2 adds pending expiry identities so a pre-step command view cannot be
// mistaken for a recoverable snapshot or an arbitrary not-ready claim.
export const ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION = 2 as const;
export const ARENA_PUBLIC_SUPPLY_PROJECTION_MAX_ITEMS = 3 as const;

export const ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS = Object.freeze({
  READY: 'ready',
  NOT_READY_PRE_EXPIRY: 'not-ready-pre-expiry',
} as const);

export type ArenaPublicSupplyProjectionReadiness =
  typeof ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS[
    keyof typeof ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS
  ];

export interface ArenaPublicSupplyProjectionItem {
  readonly schemaVersion: typeof ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION;
  readonly supplyDefinitionId: string;
  readonly supplyId: string;
  readonly slotId: string;
  readonly equipmentInstanceId: string;
  readonly equipmentDefinitionId: string;
  readonly equipmentSpawnId: string;
  readonly spawnPosition: Readonly<{ x: number; y: number; z: number }>;
  readonly spawnTick: number;
  readonly expireTick: number;
  readonly remainingTicks: number;
  readonly position: Readonly<{ x: number; y: number; z: number }>;
}

export interface ArenaPublicSupplyProjection {
  readonly schemaVersion: typeof ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION;
  readonly snapshotTick: number;
  readonly snapshotEventSequence: number;
  /** Resync status; not-ready views are still valid current-tick command views. */
  readonly resyncReadiness: ArenaPublicSupplyProjectionReadiness;
  /** The authority tick still pending; null means the view is post-step ready. */
  readonly pendingAuthorityTick: number | null;
  /** Formal supply identities waiting for the expire phase at pendingAuthorityTick. */
  readonly pendingExpiryEquipmentInstanceIds: readonly string[];
  readonly supplies: readonly ArenaPublicSupplyProjectionItem[];
}

export interface ArenaPublicSupplyProjectionAuditOptions {
  readonly snapshotTick: number;
  readonly eventSequence: number;
  readonly equipment: readonly unknown[];
  /** The complete current-tick world-supply set, supplied by the authority. */
  readonly expectedWorldSupplyEquipmentInstanceIds?: readonly string[];
  /** Pure-data formal survival contract for consumer-side validation. */
  readonly lifecycleContract?: ArenaPublicSupplyProjectionLifecycleContract;
}

export interface ArenaPublicSupplyProjectionSpawnSpec {
  readonly slotId: string;
  readonly equipmentDefinitionId: string;
  readonly spawnId: string;
  readonly position: Readonly<{ x: number; y: number; z: number }>;
}

export interface ArenaPublicSupplyProjectionLifecycleContract {
  readonly supplyDefinitionId: string;
  readonly firstSpawnTick: number;
  readonly spawnIntervalTicks: number;
  readonly spawnCount: number;
  readonly lifetimeTicks: number;
  readonly spawnSpecs: readonly ArenaPublicSupplyProjectionSpawnSpec[];
  readonly equipmentDefinitionIds: readonly string[];
}

const PROJECTION_KEYS = new Set([
  'schemaVersion',
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
  'supplyId',
  'slotId',
  'equipmentInstanceId',
  'equipmentDefinitionId',
  'equipmentSpawnId',
  'spawnPosition',
  'spawnTick',
  'expireTick',
  'remainingTicks',
  'position',
]);
const POSITION_KEYS = new Set(['x', 'y', 'z']);
const EQUIPMENT_KEYS = new Set([
  'schemaVersion',
  'instanceId',
  'definitionId',
  'spawnId',
  'locationState',
  'ownerId',
  'position',
  'lastSafePosition',
  'cooldownRemainingTicks',
  'revision',
]);
const LIFECYCLE_CONTRACT_KEYS = new Set([
  'supplyDefinitionId',
  'firstSpawnTick',
  'spawnIntervalTicks',
  'spawnCount',
  'lifetimeTicks',
  'spawnSpecs',
  'equipmentDefinitionIds',
]);
const LIFECYCLE_SPEC_KEYS = new Set(['slotId', 'equipmentDefinitionId', 'spawnId', 'position']);
const SLOT_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

function safeTick(value: unknown, name: string): number {
  return assertIntegerAtLeast(value, 0, name);
}

function finite(value: unknown, name: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`${name} 必须是有限数。`);
  return value as number;
}

function position(value: unknown, name: string): Readonly<{ x: number; y: number; z: number }> {
  assertKnownKeys(value, POSITION_KEYS, name);
  return Object.freeze({
    x: finite(value.x, `${name}.x`),
    y: finite(value.y, `${name}.y`),
    z: finite(value.z, `${name}.z`),
  });
}

function samePosition(
  left: Readonly<{ x: number; y: number; z: number }>,
  right: Readonly<{ x: number; y: number; z: number }>,
): boolean {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

function normalizeLifecycleContract(
  value: ArenaPublicSupplyProjectionLifecycleContract,
): DeepReadonly<ArenaPublicSupplyProjectionLifecycleContract> {
  const source = cloneFrozenData(value, 'ArenaPublicSupplyProjection.lifecycleContract');
  assertKnownKeys(source, LIFECYCLE_CONTRACT_KEYS, 'ArenaPublicSupplyProjection.lifecycleContract');
  if (!Array.isArray(source.spawnSpecs) || !Array.isArray(source.equipmentDefinitionIds)) {
    throw new TypeError('ArenaPublicSupplyProjection.lifecycleContract 集合字段必须是数组。');
  }
  const supplyDefinitionId = assertNonEmptyString(
    source.supplyDefinitionId,
    'ArenaPublicSupplyProjection.lifecycleContract.supplyDefinitionId',
  );
  const firstSpawnTick = safeTick(
    source.firstSpawnTick,
    'ArenaPublicSupplyProjection.lifecycleContract.firstSpawnTick',
  );
  const spawnIntervalTicks = safeTick(
    source.spawnIntervalTicks,
    'ArenaPublicSupplyProjection.lifecycleContract.spawnIntervalTicks',
  );
  const spawnCount = safeTick(
    source.spawnCount,
    'ArenaPublicSupplyProjection.lifecycleContract.spawnCount',
  );
  const lifetimeTicks = safeTick(
    source.lifetimeTicks,
    'ArenaPublicSupplyProjection.lifecycleContract.lifetimeTicks',
  );
  if (spawnIntervalTicks < 1 || spawnCount < 1 || lifetimeTicks < 1) {
    throw new RangeError('ArenaPublicSupplyProjection.lifecycleContract 正数约束失败。');
  }
  if (lifetimeTicks >= spawnIntervalTicks) {
    throw new RangeError(
      'ArenaPublicSupplyProjection.lifecycleContract lifetime 必须小于 spawnIntervalTicks。',
    );
  }
  if (source.spawnSpecs.length !== spawnCount) {
    throw new RangeError('ArenaPublicSupplyProjection.lifecycleContract spawnCount 不匹配。');
  }
  const equipmentDefinitionIds = source.equipmentDefinitionIds.map((id, index) => (
    assertNonEmptyString(
      id,
      `ArenaPublicSupplyProjection.lifecycleContract.equipmentDefinitionIds[${index}]`,
    )
  ));
  const knownEquipmentDefinitions = new Set(equipmentDefinitionIds);
  if (knownEquipmentDefinitions.size !== equipmentDefinitionIds.length) {
    throw new RangeError('ArenaPublicSupplyProjection.lifecycleContract equipmentDefinitionIds 重复。');
  }
  const slots = new Set<string>();
  const spawnSpecs = source.spawnSpecs.map((value, index) => {
    const name = `ArenaPublicSupplyProjection.lifecycleContract.spawnSpecs[${index}]`;
    assertKnownKeys(value, LIFECYCLE_SPEC_KEYS, name);
    const slotId = assertNonEmptyString(value.slotId, `${name}.slotId`);
    if (!SLOT_ID_PATTERN.test(slotId)) {
      throw new RangeError(`${name}.slotId 格式非法。`);
    }
    if (slots.has(slotId)) throw new RangeError(`${name}.slotId 重复。`);
    slots.add(slotId);
    const equipmentDefinitionId = assertNonEmptyString(
      value.equipmentDefinitionId,
      `${name}.equipmentDefinitionId`,
    );
    if (!knownEquipmentDefinitions.has(equipmentDefinitionId)) {
      throw new RangeError(`${name}.equipmentDefinitionId 未在 registry contract 中注册。`);
    }
    return Object.freeze({
      slotId,
      equipmentDefinitionId,
      spawnId: assertNonEmptyString(value.spawnId, `${name}.spawnId`),
      position: position(value.position, `${name}.position`),
    });
  }).sort((left, right) => left.slotId < right.slotId ? -1 : left.slotId > right.slotId ? 1 : 0);
  return Object.freeze({
    supplyDefinitionId,
    firstSpawnTick,
    spawnIntervalTicks,
    spawnCount,
    lifetimeTicks,
    spawnSpecs: Object.freeze(spawnSpecs),
    equipmentDefinitionIds: Object.freeze(equipmentDefinitionIds),
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface FormalSupplyIdentity {
  readonly supplyId: string;
  readonly equipmentInstanceId: string;
  readonly waveIndex: number;
  readonly spawnTick: number;
  readonly expireTick: number;
  readonly spec: DeepReadonly<ArenaPublicSupplyProjectionSpawnSpec>;
}

function parseFormalSupplyIdentity(
  instanceId: string,
  contract: DeepReadonly<ArenaPublicSupplyProjectionLifecycleContract>,
): FormalSupplyIdentity | null {
  const namespace = `${contract.supplyDefinitionId}:`;
  if (!instanceId.startsWith(namespace)) return null;
  const pattern = new RegExp(
    `^${escapeRegExp(contract.supplyDefinitionId)}:wave-(\\d+):slot-([A-Za-z0-9._-]+):equipment$`,
  );
  const match = pattern.exec(instanceId);
  if (!match) {
    throw new RangeError(`正式 supply namespace 的 equipment instanceId 非法：${instanceId}。`);
  }
  const waveToken = match[1];
  const slotId = match[2];
  if (waveToken === undefined || slotId === undefined || String(Number(waveToken)) !== waveToken) {
    throw new RangeError(`正式 supply instanceId 的 wave/slot identity 非法：${instanceId}。`);
  }
  const waveIndex = Number(waveToken);
  if (!Number.isSafeInteger(waveIndex) || waveIndex < 0) {
    throw new RangeError(`正式 supply instanceId wave identity 非法：${instanceId}。`);
  }
  const spec = contract.spawnSpecs.find((candidate) => candidate.slotId === slotId);
  if (!spec) {
    throw new RangeError(`正式 supply instanceId slot 未在冻结 spawn spec 中注册：${instanceId}。`);
  }
  const supplyId = `${contract.supplyDefinitionId}:wave-${waveIndex}:slot-${spec.slotId}`;
  const equipmentInstanceId = `${supplyId}:equipment`;
  if (instanceId !== equipmentInstanceId) {
    throw new RangeError(`正式 supply instanceId canonical identity 不一致：${instanceId}。`);
  }
  const spawnTick = contract.firstSpawnTick + contract.spawnIntervalTicks * waveIndex;
  const expireTick = spawnTick + contract.lifetimeTicks;
  if (!Number.isSafeInteger(spawnTick) || !Number.isSafeInteger(expireTick)) {
    throw new RangeError(`正式 supply instanceId 生命周期超出安全整数：${instanceId}。`);
  }
  return {
    supplyId,
    equipmentInstanceId,
    waveIndex,
    spawnTick,
    expireTick,
    spec,
  };
}

interface FormalWorldSupplySets {
  readonly active: Set<string>;
  readonly pendingExpiry: Set<string>;
  readonly nonWorld: Set<string>;
}

function classifyFormalWorldSupplyFromEquipment(
  equipment: readonly unknown[],
  snapshotTick: number,
  contract: DeepReadonly<ArenaPublicSupplyProjectionLifecycleContract>,
): FormalWorldSupplySets {
  const active = new Set<string>();
  const pendingExpiry = new Set<string>();
  const nonWorld = new Set<string>();
  for (const [index, value] of equipment.entries()) {
    const record = assertPlainRecord(value, `ArenaMatchSnapshot.equipment[${index}]`);
    const isWorld = record.locationState === 'spawned' || record.locationState === 'dropped';
    const instanceId = assertNonEmptyString(
      record.instanceId,
      `ArenaMatchSnapshot.equipment[${index}].instanceId`,
    );
    const identity = parseFormalSupplyIdentity(instanceId, contract);
    if (identity === null) {
      if (isWorld) {
        throw new RangeError(
          `formal survival world equipment ${instanceId} 未映射到正式 supply identity。`,
        );
      }
      continue;
    }
    if (
      record.definitionId !== identity.spec.equipmentDefinitionId
      || record.spawnId !== identity.spec.spawnId
    ) {
      throw new RangeError(
        `equipment ${instanceId} 与正式 supply spawn spec definition/spawn 不一致。`,
      );
    }
    if (
      record.locationState !== 'spawned'
      && record.locationState !== 'dropped'
      && record.locationState !== 'held'
      && record.locationState !== 'despawned'
    ) {
      throw new RangeError(`formal supply equipment ${instanceId} locationState 非法。`);
    }
    if (snapshotTick < identity.spawnTick) {
      throw new RangeError(`formal supply equipment ${instanceId} 在 spawnTick 前出现。`);
    }
    if (!isWorld) {
      nonWorld.add(instanceId);
      continue;
    }
    if (record.ownerId !== null || record.position === null) {
      throw new RangeError(`formal supply equipment ${instanceId} world owner/position 不一致。`);
    }
    if (snapshotTick > identity.expireTick) {
      throw new RangeError(`formal supply equipment ${instanceId} 在 expireTick 后仍处于 world。`);
    }
    if (snapshotTick === identity.expireTick) {
      pendingExpiry.add(instanceId);
    } else {
      active.add(instanceId);
    }
  }
  return { active, pendingExpiry, nonWorld };
}

function assertFormalLifecycleIdentity(
  item: ArenaPublicSupplyProjectionItem,
  equipment: readonly unknown[],
  snapshotTick: number,
  contract: DeepReadonly<ArenaPublicSupplyProjectionLifecycleContract>,
): void {
  const identity = parseFormalSupplyIdentity(item.equipmentInstanceId, contract);
  if (identity === null) {
    throw new RangeError(`供给 ${item.supplyId} equipmentInstanceId 不在正式 supply namespace。`);
  }
  if (item.supplyDefinitionId !== contract.supplyDefinitionId) {
    throw new RangeError(`供给 ${item.supplyId} 未绑定正式 supply Definition。`);
  }
  if (item.slotId !== identity.spec.slotId || item.supplyId !== identity.supplyId) {
    throw new RangeError(`供给 ${item.supplyId} supply/slot identity 不一致。`);
  }
  if (item.equipmentInstanceId !== identity.equipmentInstanceId) {
    throw new RangeError(`供给 ${item.supplyId} equipmentInstanceId 身份不一致。`);
  }
  if (
    item.equipmentDefinitionId !== identity.spec.equipmentDefinitionId
    || item.equipmentSpawnId !== identity.spec.spawnId
  ) {
    throw new RangeError(`供给 ${item.supplyId} 与冻结 spawn spec 不一致。`);
  }
  if (!samePosition(item.spawnPosition, identity.spec.position)) {
    throw new RangeError(`供给 ${item.supplyId} spawnPosition 未绑定冻结 spawn spec。`);
  }
  if (item.spawnTick !== identity.spawnTick || item.expireTick !== identity.expireTick) {
    throw new RangeError(`供给 ${item.supplyId} expireTick 未绑定 lifetime。`);
  }
  const runtime = equipment.find((value) => (
    assertPlainRecord(value, 'ArenaMatchSnapshot.equipment').instanceId === item.equipmentInstanceId
  ));
  if (!runtime) throw new RangeError(`供给 ${item.supplyId} 缺少 equipment runtime。`);
  if (snapshotTick < item.spawnTick || item.expireTick <= snapshotTick) {
    throw new RangeError(`供给 ${item.supplyId} 不覆盖 snapshot tick。`);
  }
}

function assertEquipmentConnection(
  item: ArenaPublicSupplyProjectionItem,
  equipment: readonly unknown[],
): void {
  const matches = equipment.filter((value, index) => {
    const record = assertPlainRecord(value, `ArenaMatchSnapshot.equipment[${index}]`);
    return record.instanceId === item.equipmentInstanceId;
  });
  if (matches.length !== 1) {
    throw new RangeError(
      `供给 ${item.supplyId} 必须唯一连接 equipment instance ${item.equipmentInstanceId}。`,
    );
  }
  const record = assertPlainRecord(matches[0], `ArenaMatchSnapshot.equipment[${item.equipmentInstanceId}]`);
  assertKnownKeys(record, EQUIPMENT_KEYS, `ArenaMatchSnapshot.equipment[${item.equipmentInstanceId}]`);
  if (record.definitionId !== item.equipmentDefinitionId) {
    throw new RangeError(`供给 ${item.supplyId} 的 equipmentDefinitionId 不一致。`);
  }
  if (record.spawnId !== item.equipmentSpawnId) {
    throw new RangeError(`供给 ${item.supplyId} 的 equipmentSpawnId 不一致。`);
  }
  if (record.locationState !== 'spawned' && record.locationState !== 'dropped') {
    throw new RangeError(`供给 ${item.supplyId} 不能连接非世界 equipment。`);
  }
  if (record.ownerId !== null || record.position === null) {
    throw new RangeError(`供给 ${item.supplyId} 的 equipment owner/position 不一致。`);
  }
  if (!samePosition(item.position, position(record.position, 'equipment.position'))) {
    throw new RangeError(`供给 ${item.supplyId} 的 equipment position 不一致。`);
  }
}

/**
 * Audits the independently versioned public supply projection and its
 * connection to the same-tick public equipment snapshot. It never infers
 * lifecycle state from a partial event stream.
 */
export function createArenaPublicSupplyProjectionAudit(
  value: unknown,
  options: ArenaPublicSupplyProjectionAuditOptions,
): DeepReadonly<ArenaPublicSupplyProjection> {
  const source = cloneFrozenData(value, 'ArenaPublicSupplyProjection');
  assertKnownKeys(source, PROJECTION_KEYS, 'ArenaPublicSupplyProjection');
  if (source.schemaVersion !== ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION) {
    throw new RangeError(
      `ArenaPublicSupplyProjection.schemaVersion 必须是 ${ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION}。`,
    );
  }
  const snapshotTick = safeTick(source.snapshotTick, 'ArenaPublicSupplyProjection.snapshotTick');
  const eventSequence = safeTick(
    source.snapshotEventSequence,
    'ArenaPublicSupplyProjection.snapshotEventSequence',
  );
  if (snapshotTick !== options.snapshotTick) {
    throw new RangeError('ArenaPublicSupplyProjection snapshotTick 与 public snapshot 不一致。');
  }
  if (eventSequence !== options.eventSequence) {
    throw new RangeError('ArenaPublicSupplyProjection eventSequence 与 public snapshot 不一致。');
  }
  if (
    source.resyncReadiness !== ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.READY
    && source.resyncReadiness !== ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.NOT_READY_PRE_EXPIRY
  ) {
    throw new RangeError('ArenaPublicSupplyProjection.resyncReadiness 无效。');
  }
  const pendingAuthorityTick = source.pendingAuthorityTick === null
    ? null
    : safeTick(source.pendingAuthorityTick, 'ArenaPublicSupplyProjection.pendingAuthorityTick');
  const expectedPendingAuthorityTick = source.resyncReadiness
    === ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.READY ? null : snapshotTick;
  if (pendingAuthorityTick !== expectedPendingAuthorityTick) {
    throw new RangeError(
      'ArenaPublicSupplyProjection.pendingAuthorityTick 与 resyncReadiness/snapshotTick 不一致。',
    );
  }
  if (!Array.isArray(source.pendingExpiryEquipmentInstanceIds)) {
    throw new TypeError(
      'ArenaPublicSupplyProjection.pendingExpiryEquipmentInstanceIds 必须是数组。',
    );
  }
  const pendingExpiryEquipmentInstanceIds = source.pendingExpiryEquipmentInstanceIds.map(
    (value, index) => assertNonEmptyString(
      value,
      `ArenaPublicSupplyProjection.pendingExpiryEquipmentInstanceIds[${index}]`,
    ),
  );
  if (
    new Set(pendingExpiryEquipmentInstanceIds).size !== pendingExpiryEquipmentInstanceIds.length
    || pendingExpiryEquipmentInstanceIds.some((value, index) => {
      const previous = index > 0 ? pendingExpiryEquipmentInstanceIds[index - 1] : undefined;
      return previous !== undefined && previous >= value;
    })
  ) {
    throw new RangeError(
      'ArenaPublicSupplyProjection.pendingExpiryEquipmentInstanceIds 必须唯一且稳定排序。',
    );
  }
  if (pendingExpiryEquipmentInstanceIds.length > ARENA_PUBLIC_SUPPLY_PROJECTION_MAX_ITEMS) {
    throw new RangeError(
      'ArenaPublicSupplyProjection.pendingExpiryEquipmentInstanceIds 超过有界 active 数量。',
    );
  }
  if (
    source.resyncReadiness === ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.READY
    && pendingExpiryEquipmentInstanceIds.length !== 0
  ) {
    throw new RangeError('ready projection 不能包含 pending expiry identity。');
  }
  if (
    source.resyncReadiness === ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.NOT_READY_PRE_EXPIRY
    && pendingExpiryEquipmentInstanceIds.length === 0
  ) {
    throw new RangeError('not-ready-pre-expiry projection 必须包含 pending expiry identity。');
  }
  if (!Array.isArray(source.supplies)) {
    throw new TypeError('ArenaPublicSupplyProjection.supplies 必须是数组。');
  }
  if (
    source.resyncReadiness === ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.NOT_READY_PRE_EXPIRY
    && source.supplies.length !== 0
  ) {
    throw new RangeError('pre-expiry projection 不能包含可交互供给。');
  }
  if (source.supplies.length > ARENA_PUBLIC_SUPPLY_PROJECTION_MAX_ITEMS) {
    throw new RangeError('ArenaPublicSupplyProjection.supplies 超过有界 active 数量。');
  }
  const lifecycleContract = options.lifecycleContract === undefined
    ? undefined
    : normalizeLifecycleContract(options.lifecycleContract);

  const supplyIds = new Set<string>();
  const equipmentIds = new Set<string>();
  const supplies = source.supplies.map((value, index): ArenaPublicSupplyProjectionItem => {
    const name = `ArenaPublicSupplyProjection.supplies[${index}]`;
    assertKnownKeys(value, ITEM_KEYS, name);
    if (value.schemaVersion !== ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION) {
      throw new RangeError(`${name}.schemaVersion 无效。`);
    }
    const supplyDefinitionId = assertNonEmptyString(value.supplyDefinitionId, `${name}.supplyDefinitionId`);
    const supplyId = assertNonEmptyString(value.supplyId, `${name}.supplyId`);
    const slotId = assertNonEmptyString(value.slotId, `${name}.slotId`);
    const equipmentInstanceId = assertNonEmptyString(value.equipmentInstanceId, `${name}.equipmentInstanceId`);
    const equipmentDefinitionId = assertNonEmptyString(
      value.equipmentDefinitionId,
      `${name}.equipmentDefinitionId`,
    );
    const equipmentSpawnId = assertNonEmptyString(value.equipmentSpawnId, `${name}.equipmentSpawnId`);
    if (supplyIds.has(supplyId)) throw new RangeError(`${name}.supplyId 重复。`);
    if (equipmentIds.has(equipmentInstanceId)) throw new RangeError(`${name}.equipmentInstanceId 重复。`);
    supplyIds.add(supplyId);
    equipmentIds.add(equipmentInstanceId);
    const spawnTick = safeTick(value.spawnTick, `${name}.spawnTick`);
    const expireTick = safeTick(value.expireTick, `${name}.expireTick`);
    if (spawnTick > snapshotTick || expireTick <= snapshotTick || expireTick <= spawnTick) {
      throw new RangeError(`${name} 生命周期不覆盖 snapshot tick。`);
    }
    const remainingTicks = safeTick(value.remainingTicks, `${name}.remainingTicks`);
    if (remainingTicks === 0 || remainingTicks !== expireTick - snapshotTick) {
      throw new RangeError(`${name}.remainingTicks 必须等于 expireTick - snapshotTick 且大于 0。`);
    }
    const item = Object.freeze({
      schemaVersion: ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION,
      supplyDefinitionId,
      supplyId,
      slotId,
      equipmentInstanceId,
      equipmentDefinitionId,
      equipmentSpawnId,
      spawnPosition: position(value.spawnPosition, `${name}.spawnPosition`),
      spawnTick,
      expireTick,
      remainingTicks,
      position: position(value.position, `${name}.position`),
    });
    assertEquipmentConnection(item, options.equipment);
    if (lifecycleContract) {
      assertFormalLifecycleIdentity(item, options.equipment, snapshotTick, lifecycleContract);
    }
    return item;
  });

  for (let index = 1; index < supplies.length; index += 1) {
    const previous = supplies[index - 1];
    const current = supplies[index];
    if (previous && current && previous.supplyId > current.supplyId) {
      throw new RangeError('ArenaPublicSupplyProjection.supplies 必须按 supplyId 稳定排序。');
    }
  }
  const formalWorldSupplySets = lifecycleContract === undefined
    ? undefined
    : classifyFormalWorldSupplyFromEquipment(options.equipment, snapshotTick, lifecycleContract);
  let formalExpectedActiveIds: Set<string> | undefined;
  if (formalWorldSupplySets !== undefined) {
    for (const instanceId of pendingExpiryEquipmentInstanceIds) {
      const identity = parseFormalSupplyIdentity(instanceId, lifecycleContract!);
      if (identity === null || identity.expireTick !== snapshotTick) {
        throw new RangeError(
          `pending expiry identity ${instanceId} 未证明 expireTick 等于 snapshotTick。`,
        );
      }
    }
    if (pendingExpiryEquipmentInstanceIds.some(
      (id) => formalWorldSupplySets.nonWorld.has(id),
    )) {
      throw new RangeError(
        'pending expiry identity 不能连接当前已 held/despawned 的 nonWorld equipment。',
      );
    }
    formalExpectedActiveIds = formalWorldSupplySets.active;
    if ([...formalWorldSupplySets.pendingExpiry].some(
      (id) => !pendingExpiryEquipmentInstanceIds.includes(id),
    )) {
      throw new RangeError(
        'formal lifecycle 的 pending expiry equipment 未出现在 projection metadata。',
      );
    }
    if (
      pendingExpiryEquipmentInstanceIds.length > 0
      && source.resyncReadiness !== ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.NOT_READY_PRE_EXPIRY
    ) {
      throw new RangeError(
        'ready projection 不能携带 formal pending expiry identity。',
      );
    }
  }
  if (
    lifecycleContract !== undefined
    && options.expectedWorldSupplyEquipmentInstanceIds !== undefined
  ) {
    if (!Array.isArray(options.expectedWorldSupplyEquipmentInstanceIds)) {
      throw new TypeError('expectedWorldSupplyEquipmentInstanceIds 必须是数组。');
    }
    const explicitExpected = new Set(options.expectedWorldSupplyEquipmentInstanceIds);
    if (
      explicitExpected.size !== formalWorldSupplySets!.active.size
      || [...explicitExpected].some((id) => !formalWorldSupplySets!.active.has(id))
    ) {
      throw new RangeError(
        '显式 expected world supply 集合与 consumer formal world equipment 不一致。',
      );
    }
  }
  const expectedWorldSupplyEquipmentInstanceIds = options.expectedWorldSupplyEquipmentInstanceIds
    ?? (formalExpectedActiveIds === undefined ? undefined : [...formalExpectedActiveIds]);
  if (expectedWorldSupplyEquipmentInstanceIds !== undefined) {
    const expected = new Set<string>();
    if (!Array.isArray(expectedWorldSupplyEquipmentInstanceIds)) {
      throw new TypeError('expectedWorldSupplyEquipmentInstanceIds 必须是数组。');
    }
    for (const [index, value] of expectedWorldSupplyEquipmentInstanceIds.entries()) {
      const instanceId = assertNonEmptyString(
        value,
        `expectedWorldSupplyEquipmentInstanceIds[${index}]`,
      );
      if (expected.has(instanceId)) {
        throw new RangeError(`expectedWorldSupplyEquipmentInstanceIds 重复 ${instanceId}。`);
      }
      expected.add(instanceId);
    }
    if (expected.size !== equipmentIds.size || [...expected].some((id) => !equipmentIds.has(id))) {
      throw new RangeError('世界供给 equipment 集合与 active supply projection 不一致。');
    }
  }
  return Object.freeze({
    schemaVersion: ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION,
    snapshotTick,
    snapshotEventSequence: eventSequence,
    resyncReadiness: source.resyncReadiness as ArenaPublicSupplyProjectionReadiness,
    pendingAuthorityTick,
    pendingExpiryEquipmentInstanceIds: Object.freeze([...pendingExpiryEquipmentInstanceIds]),
    supplies: Object.freeze(supplies),
  });
}

/**
 * Consumer-side entry point for a formal survival snapshot. A missing
 * projection is an invalid survival view, never an ordinary equipment view.
 */
export function requireArenaPublicSupplyProjection(
  value: unknown,
  options: ArenaPublicSupplyProjectionAuditOptions,
): DeepReadonly<ArenaPublicSupplyProjection> {
  if (value === null || value === undefined) {
    throw new RangeError('正式生存 public snapshot 缺少 activeSupplyProjection，已 fail closed。');
  }
  return createArenaPublicSupplyProjectionAudit(value, options);
}

/**
 * A pre-expiry view is deliberately usable for the current input decision but
 * must never be used as a recovery/resynchronization source. Callers restoring
 * a public stream must wait for the post-step ready view.
 */
export function assertArenaPublicSupplyProjectionResyncReady(
  value: unknown,
  options: ArenaPublicSupplyProjectionAuditOptions,
): DeepReadonly<ArenaPublicSupplyProjection> {
  const projection = createArenaPublicSupplyProjectionAudit(value, options);
  if (projection.resyncReadiness !== ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.READY) {
    throw new RangeError(
      'pre-expiry ArenaPublicSupplyProjection 不是 resync-ready；必须使用 post-step ready 快照。',
    );
  }
  return projection;
}
