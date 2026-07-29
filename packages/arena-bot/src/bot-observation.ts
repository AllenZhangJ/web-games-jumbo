import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  ARENA_PUBLIC_SUPPLY_PROJECTION_MAX_ITEMS,
  ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS,
  ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION,
  cloneFrozenData,
  createArenaPublicSupplyProjectionAudit,
  requireArenaPublicSupplyProjection,
  type ArenaPublicSupplyProjection,
  type ArenaPublicSupplyProjectionLifecycleContract,
  type ArenaMapSnapshot,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import { EQUIPMENT_LOCATION_STATE } from '@number-strategy-jump/arena-equipment';
import { serializeMapRuntimeSnapshot } from '@number-strategy-jump/arena-map';
import {
  ARENA_ACTION_PHASE,
  ARENA_MATCH_PHASE,
  ARENA_PARTICIPANT_STATUS,
  ARENA_PHYSICS,
} from '@number-strategy-jump/arena-match';
import {
  MOVEMENT_MODE,
  MOVEMENT_RUNTIME_SCHEMA_VERSION,
} from '@number-strategy-jump/arena-movement';

const SOURCE_KEYS = new Set([
  'tick', 'activeTick', 'eventSequence', 'phase', 'remainingTicks', 'participants',
  'equipment', 'activeSupplyProjection', 'map',
]);
const OBSERVATION_OPTION_KEYS = new Set([
  'commandSnapshot', 'delayedSnapshot', 'selfId', 'arena', 'objectives',
]);
const ARENA_KEYS = new Set([
  'killY', 'characterRadius', 'maximumStepHeight', 'surfaces',
]);
const MATCH_PHASES: ReadonlySet<string> = new Set(Object.values(ARENA_MATCH_PHASE));
const PARTICIPANT_STATUSES: ReadonlySet<string> = new Set(
  Object.values(ARENA_PARTICIPANT_STATUS),
);
const ACTION_PHASES: ReadonlySet<string> = new Set(Object.values(ARENA_ACTION_PHASE));
const MOVEMENT_MODES: ReadonlySet<string> = new Set(Object.values(MOVEMENT_MODE));
const AFFORDANCE_KINDS: ReadonlySet<string> = new Set(['none', 'ignored', 'selected']);
const ACTION_LANES: ReadonlySet<string> = new Set(['combat', 'locomotion', 'interaction']);
const TRUSTED_SOURCE_SNAPSHOTS = new WeakSet<object>();
const TRUSTED_ARENA_VIEWS = new WeakSet<object>();

type BotAffordanceChannel = 'primary' | 'primaryHold' | 'jump' | 'slam';

export interface BotVector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface BotVector2 {
  readonly x: number;
  readonly z: number;
}

export interface BotHeldEquipment {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly cooldownRemainingTicks: number;
}

export interface BotVisibleEquipment {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly locationState: 'spawned' | 'dropped';
  /** Null means this is an ordinary non-supply world item. */
  readonly remainingTicks: number | null;
  readonly position: BotVector3;
}

export interface BotActionRule {
  readonly definitionId: string;
  readonly targetingKind: string;
  readonly range: number;
  readonly minimumFacingDot: number;
  readonly maximumVerticalDifference: number;
  readonly windupTicks: number;
  readonly activeTicks: number;
  readonly recoveryTicks: number;
}

export interface BotMovementSnapshot {
  readonly schemaVersion: number;
  readonly mode: string;
  readonly airJumpsUsed: number;
  readonly crouchChargeTicks: number;
  readonly grounded: boolean;
}

export interface BotActionAffordanceOutcome {
  readonly kind: string;
  readonly actionDefinitionId: string | null;
  readonly lane: string | null;
  readonly source: string | null;
  readonly reason: string;
}

export interface BotActionAffordance {
  readonly tick: number;
  readonly participantId: string;
  readonly primaryActionDefinitionId: string | null;
  readonly channels: Readonly<Record<BotAffordanceChannel, BotActionAffordanceOutcome>>;
}

export interface BotParticipantObservation {
  readonly id: string;
  readonly characterDefinitionId: string;
  readonly status: string;
  readonly lives: number;
  readonly eliminations: number;
  readonly deaths: number;
  readonly hitstunTicks: number;
  readonly invulnerableTicks: number;
  readonly respawnTicks: number;
  readonly action: Readonly<{
    definitionId: string | null;
    phase: string;
    ticksRemaining: number;
  }>;
  readonly actionRule: BotActionRule;
  readonly movement: BotMovementSnapshot;
  readonly actionAffordance: BotActionAffordance;
  readonly equipment: BotHeldEquipment | null;
  readonly position: BotVector3;
  readonly velocity: BotVector3;
  readonly facing: BotVector2;
  readonly grounded: boolean;
  readonly supportSurfaceId: string | null;
}

export interface BotSourceSnapshot {
  readonly tick: number;
  readonly activeTick: number;
  readonly eventSequence: number;
  readonly phase: string;
  readonly remainingTicks: number;
  readonly participants: readonly BotParticipantObservation[];
  readonly equipment: readonly BotVisibleEquipment[];
  readonly activeSupplyProjection: ArenaPublicSupplyProjection | null;
  readonly map: ArenaMapSnapshot;
}

export interface BotArenaSurface {
  readonly id: string;
  readonly center: BotVector3;
  readonly halfExtents: BotVector3;
}

export interface BotArenaView {
  readonly killY: number;
  readonly characterRadius: number;
  readonly maximumStepHeight: number;
  readonly surfaces: readonly BotArenaSurface[];
}

export interface BotObservation {
  readonly schemaVersion: 4;
  readonly commandTick: number;
  readonly observedTick: number;
  readonly phase: string;
  readonly remainingTicks: number;
  readonly self: BotParticipantObservation;
  readonly opponent: BotParticipantObservation;
  readonly equipment: readonly BotVisibleEquipment[];
  readonly map: ArenaMapSnapshot;
  readonly arena: BotArenaView;
  readonly actionRule: BotActionRule;
  readonly opponentActionRule: BotActionRule;
  readonly objectives: readonly DeepReadonly<unknown>[];
}

export interface BotObservationOptions {
  readonly commandSnapshot: BotSourceSnapshot;
  readonly delayedSnapshot: BotSourceSnapshot;
  readonly selfId: string;
  readonly arena: BotArenaView;
  readonly objectives?: readonly unknown[];
}

function nonNegativeInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name} 必须是非负安全整数。`);
  }
  return value as number;
}

function finite(value: unknown, name: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`${name} 必须是有限数。`);
  return value as number;
}

function finiteVector(value: unknown, name: string): BotVector3 {
  const record = assertPlainRecord(value, name);
  return {
    x: finite(record.x, `${name}.x`),
    y: finite(record.y, `${name}.y`),
    z: finite(record.z, `${name}.z`),
  };
}

function nullableString(value: unknown, name: string): string | null {
  return value === null || value === undefined ? null : assertNonEmptyString(value, name);
}

function readDataProperty(record: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function readOptionalDataProperty(record: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined) return undefined;
  if (!descriptor.enumerable || !('value' in descriptor)) {
    throw new TypeError(`${name}.${key} 必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function freezeOwned<T>(value: T): DeepReadonly<T> {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value as DeepReadonly<T>;
  }
  for (const child of Object.values(value)) freezeOwned(child);
  return Object.freeze(value) as DeepReadonly<T>;
}

function copyHeldEquipment(value: unknown, name: string): BotHeldEquipment | null {
  if (value === null || value === undefined) return null;
  const record = assertPlainRecord(value, name);
  return {
    instanceId: assertNonEmptyString(record.instanceId, `${name}.instanceId`),
    definitionId: assertNonEmptyString(record.definitionId, `${name}.definitionId`),
    cooldownRemainingTicks: nonNegativeInteger(
      record.cooldownRemainingTicks,
      `${name}.cooldownRemainingTicks`,
    ),
  };
}

const RAW_PUBLIC_EQUIPMENT_KEYS = new Set([
  'schemaVersion', 'instanceId', 'definitionId', 'spawnId', 'locationState',
  'ownerId', 'position', 'lastSafePosition',
  'cooldownRemainingTicks', 'revision',
]);
const NORMALIZED_VISIBLE_EQUIPMENT_KEYS = new Set([
  'instanceId', 'definitionId', 'locationState', 'remainingTicks', 'position',
]);
const NORMALIZED_PROJECTION_KEYS = new Set([
  'schemaVersion', 'snapshotTick', 'snapshotEventSequence', 'resyncReadiness',
  'pendingAuthorityTick', 'pendingExpiryEquipmentInstanceIds', 'supplies',
]);
const NORMALIZED_PROJECTION_ITEM_KEYS = new Set([
  'schemaVersion', 'supplyDefinitionId', 'supplyId', 'slotId', 'equipmentInstanceId',
  'equipmentDefinitionId', 'equipmentSpawnId', 'spawnPosition', 'spawnTick', 'expireTick',
  'remainingTicks', 'position',
]);

function copyRawVisibleEquipment(
  value: unknown,
  name: string,
  remainingTicksByInstance: ReadonlyMap<string, number>,
): BotVisibleEquipment {
  const record = assertPlainRecord(value, name);
  assertKnownKeys(record, RAW_PUBLIC_EQUIPMENT_KEYS, name);
  if (
    record.locationState !== EQUIPMENT_LOCATION_STATE.SPAWNED
    && record.locationState !== EQUIPMENT_LOCATION_STATE.DROPPED
  ) {
    throw new RangeError(`${name}.locationState 不是可见世界状态。`);
  }
  const instanceId = assertNonEmptyString(record.instanceId, `${name}.instanceId`);
  const projectedRemainingTicks = remainingTicksByInstance.get(instanceId);
  return {
    instanceId,
    definitionId: assertNonEmptyString(record.definitionId, `${name}.definitionId`),
    locationState: record.locationState,
    remainingTicks: projectedRemainingTicks ?? null,
    position: finiteVector(record.position, `${name}.position`),
  };
}

function copyNormalizedVisibleEquipment(value: unknown, name: string): BotVisibleEquipment {
  const record = assertPlainRecord(value, name);
  assertKnownKeys(record, NORMALIZED_VISIBLE_EQUIPMENT_KEYS, name);
  if (
    record.locationState !== EQUIPMENT_LOCATION_STATE.SPAWNED
    && record.locationState !== EQUIPMENT_LOCATION_STATE.DROPPED
  ) {
    throw new RangeError(`${name}.locationState 不是可见世界状态。`);
  }
  return {
    instanceId: assertNonEmptyString(record.instanceId, `${name}.instanceId`),
    definitionId: assertNonEmptyString(record.definitionId, `${name}.definitionId`),
    locationState: record.locationState,
    remainingTicks: record.remainingTicks === null
      ? null
      : nonNegativeInteger(record.remainingTicks, `${name}.remainingTicks`),
    position: finiteVector(record.position, `${name}.position`),
  };
}

function sameVector(left: BotVector3, right: BotVector3): boolean {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

/**
 * Validates an already-normalized BotSourceSnapshot projection view. Full
 * definition/spawn/lifecycle and raw equipment authority auditing remains the
 * responsibility of cloneBotSourceSnapshot before a production BotController
 * commits a source snapshot; this path never treats cropped Bot equipment as
 * an ArenaMatchSnapshot.
 */
function normalizeBotProjectionView(
  value: unknown,
  name: string,
  snapshotTick: number,
  eventSequence: number,
  equipment: readonly BotVisibleEquipment[],
): ArenaPublicSupplyProjection {
  const source = cloneFrozenData(value, name);
  assertKnownKeys(source, NORMALIZED_PROJECTION_KEYS, name);
  if (source.schemaVersion !== ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION) {
    throw new RangeError(`${name}.schemaVersion 无效。`);
  }
  const projectionTick = nonNegativeInteger(source.snapshotTick, `${name}.snapshotTick`);
  const projectionEventSequence = nonNegativeInteger(
    source.snapshotEventSequence,
    `${name}.snapshotEventSequence`,
  );
  if (projectionTick !== snapshotTick) {
    throw new RangeError(`${name}.snapshotTick 与 Bot snapshot 不一致。`);
  }
  if (projectionEventSequence !== eventSequence) {
    throw new RangeError(`${name}.snapshotEventSequence 与 Bot snapshot 不一致。`);
  }
  if (
    source.resyncReadiness !== ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.READY
    && source.resyncReadiness !== ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.NOT_READY_PRE_EXPIRY
  ) {
    throw new RangeError(`${name}.resyncReadiness 无效。`);
  }
  const pendingAuthorityTick = source.pendingAuthorityTick === null
    ? null
    : nonNegativeInteger(source.pendingAuthorityTick, `${name}.pendingAuthorityTick`);
  const expectedPendingAuthorityTick = source.resyncReadiness
    === ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.READY ? null : snapshotTick;
  if (pendingAuthorityTick !== expectedPendingAuthorityTick) {
    throw new RangeError(`${name}.pendingAuthorityTick 与 readiness 不一致。`);
  }
  if (!Array.isArray(source.pendingExpiryEquipmentInstanceIds)) {
    throw new TypeError(`${name}.pendingExpiryEquipmentInstanceIds 必须是数组。`);
  }
  const pendingExpiryEquipmentInstanceIds = source.pendingExpiryEquipmentInstanceIds.map(
    (pendingId, index) => assertNonEmptyString(
      pendingId,
      `${name}.pendingExpiryEquipmentInstanceIds[${index}]`,
    ),
  );
  if (
    pendingExpiryEquipmentInstanceIds.length > ARENA_PUBLIC_SUPPLY_PROJECTION_MAX_ITEMS
    || new Set(pendingExpiryEquipmentInstanceIds).size !== pendingExpiryEquipmentInstanceIds.length
    || pendingExpiryEquipmentInstanceIds.some((pendingId, index) => (
      index > 0 && pendingExpiryEquipmentInstanceIds[index - 1]! >= pendingId
    ))
  ) {
    throw new RangeError(`${name}.pendingExpiryEquipmentInstanceIds 必须唯一、排序且有界。`);
  }
  if (
    (source.resyncReadiness === ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.READY
      && pendingExpiryEquipmentInstanceIds.length !== 0)
    || (source.resyncReadiness === ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.NOT_READY_PRE_EXPIRY
      && pendingExpiryEquipmentInstanceIds.length === 0)
  ) {
    throw new RangeError(`${name}.pendingExpiryEquipmentInstanceIds 与 readiness 不一致。`);
  }
  if (!Array.isArray(source.supplies)) throw new TypeError(`${name}.supplies 必须是数组。`);
  if (
    source.supplies.length > ARENA_PUBLIC_SUPPLY_PROJECTION_MAX_ITEMS
    || (source.resyncReadiness === ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.NOT_READY_PRE_EXPIRY
      && source.supplies.length !== 0)
  ) {
    throw new RangeError(`${name}.supplies 数量或 pre-expiry 状态非法。`);
  }
  const supplies = source.supplies.map((value, index): ArenaPublicSupplyProjection['supplies'][number] => {
    const itemName = `${name}.supplies[${index}]`;
    assertKnownKeys(value, NORMALIZED_PROJECTION_ITEM_KEYS, itemName);
    if (value.schemaVersion !== ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION) {
      throw new RangeError(`${itemName}.schemaVersion 无效。`);
    }
    const supplyDefinitionId = assertNonEmptyString(
      value.supplyDefinitionId,
      `${itemName}.supplyDefinitionId`,
    );
    const supplyId = assertNonEmptyString(value.supplyId, `${itemName}.supplyId`);
    const slotId = assertNonEmptyString(value.slotId, `${itemName}.slotId`);
    const equipmentInstanceId = assertNonEmptyString(
      value.equipmentInstanceId,
      `${itemName}.equipmentInstanceId`,
    );
    const equipmentDefinitionId = assertNonEmptyString(
      value.equipmentDefinitionId,
      `${itemName}.equipmentDefinitionId`,
    );
    const equipmentSpawnId = assertNonEmptyString(
      value.equipmentSpawnId,
      `${itemName}.equipmentSpawnId`,
    );
    const spawnTick = nonNegativeInteger(value.spawnTick, `${itemName}.spawnTick`);
    const expireTick = nonNegativeInteger(value.expireTick, `${itemName}.expireTick`);
    const remainingTicks = nonNegativeInteger(value.remainingTicks, `${itemName}.remainingTicks`);
    if (
      spawnTick > snapshotTick
      || expireTick <= snapshotTick
      || expireTick <= spawnTick
      || remainingTicks === 0
      || remainingTicks !== expireTick - snapshotTick
    ) {
      throw new RangeError(`${itemName} 生命周期或 remainingTicks 非法。`);
    }
    return Object.freeze({
      schemaVersion: ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION,
      supplyDefinitionId,
      supplyId,
      slotId,
      equipmentInstanceId,
      equipmentDefinitionId,
      equipmentSpawnId,
      spawnPosition: finiteVector(value.spawnPosition, `${itemName}.spawnPosition`),
      spawnTick,
      expireTick,
      remainingTicks,
      position: finiteVector(value.position, `${itemName}.position`),
    });
  });
  const supplyIds = new Set<string>();
  const equipmentIds = new Set<string>();
  for (let index = 0; index < supplies.length; index += 1) {
    const item = supplies[index]!;
    if (supplyIds.has(item.supplyId) || equipmentIds.has(item.equipmentInstanceId)) {
      throw new RangeError(`${name}.supplies identity 必须唯一。`);
    }
    if (index > 0 && supplies[index - 1]!.supplyId >= item.supplyId) {
      throw new RangeError(`${name}.supplies 必须按 supplyId 稳定排序。`);
    }
    supplyIds.add(item.supplyId);
    equipmentIds.add(item.equipmentInstanceId);
  }
  const equipmentById = new Map(equipment.map((item) => [item.instanceId, item]));
  if (equipmentById.size !== equipment.length) {
    throw new RangeError(`${name}.equipment instanceId 必须唯一。`);
  }
  if (pendingExpiryEquipmentInstanceIds.some((id) => equipmentById.has(id))) {
    throw new RangeError(`${name}.pending expiry identity 不能出现在 BotVisibleEquipment 世界列表。`);
  }
  for (const item of supplies) {
    const runtime = equipmentById.get(item.equipmentInstanceId);
    if (!runtime) throw new RangeError(`${name} 缺少供给 equipment 映射。`);
    if (
      runtime.definitionId !== item.equipmentDefinitionId
      || runtime.locationState !== EQUIPMENT_LOCATION_STATE.SPAWNED
      && runtime.locationState !== EQUIPMENT_LOCATION_STATE.DROPPED
      || !sameVector(runtime.position, item.position)
      || runtime.remainingTicks !== item.remainingTicks
    ) {
      throw new RangeError(`${name} 供给与 normalized equipment 映射不一致。`);
    }
  }
  for (const runtime of equipment) {
    if (runtime.remainingTicks !== null && !equipmentIds.has(runtime.instanceId)) {
      throw new RangeError(`${name} equipment remainingTicks 缺少 projection 映射。`);
    }
  }
  return Object.freeze({
    schemaVersion: ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION,
    snapshotTick: projectionTick,
    snapshotEventSequence: projectionEventSequence,
    resyncReadiness: source.resyncReadiness,
    pendingAuthorityTick,
    pendingExpiryEquipmentInstanceIds: Object.freeze(pendingExpiryEquipmentInstanceIds),
    supplies: Object.freeze(supplies),
  });
}

function copyActionRule(value: unknown, name: string): BotActionRule {
  const record = assertPlainRecord(value, name);
  const range = finite(record.range, `${name}.range`);
  const minimumFacingDot = finite(record.minimumFacingDot, `${name}.minimumFacingDot`);
  const maximumVerticalDifference = finite(
    record.maximumVerticalDifference,
    `${name}.maximumVerticalDifference`,
  );
  if (range <= 0 || maximumVerticalDifference <= 0) {
    throw new RangeError(`${name} 距离必须大于 0。`);
  }
  if (minimumFacingDot < -1 || minimumFacingDot > 1) {
    throw new RangeError(`${name}.minimumFacingDot 必须位于 [-1, 1]。`);
  }
  const activeTicks = nonNegativeInteger(record.activeTicks, `${name}.activeTicks`);
  if (activeTicks < 1) throw new RangeError(`${name}.activeTicks 必须大于 0。`);
  return {
    definitionId: assertNonEmptyString(record.definitionId, `${name}.definitionId`),
    targetingKind: assertNonEmptyString(record.targetingKind, `${name}.targetingKind`),
    range,
    minimumFacingDot,
    maximumVerticalDifference,
    windupTicks: nonNegativeInteger(record.windupTicks, `${name}.windupTicks`),
    activeTicks,
    recoveryTicks: nonNegativeInteger(record.recoveryTicks, `${name}.recoveryTicks`),
  };
}

function copyMovement(value: unknown, name: string): BotMovementSnapshot {
  const record = assertPlainRecord(value, name);
  if (record.schemaVersion !== MOVEMENT_RUNTIME_SCHEMA_VERSION) {
    throw new RangeError(`${name}.schemaVersion 无效。`);
  }
  if (typeof record.mode !== 'string' || !MOVEMENT_MODES.has(record.mode)) {
    throw new RangeError(`${name}.mode 无效。`);
  }
  if (typeof record.grounded !== 'boolean') {
    throw new TypeError(`${name}.grounded 必须是布尔值。`);
  }
  return {
    schemaVersion: MOVEMENT_RUNTIME_SCHEMA_VERSION,
    mode: record.mode,
    airJumpsUsed: nonNegativeInteger(record.airJumpsUsed, `${name}.airJumpsUsed`),
    crouchChargeTicks: nonNegativeInteger(
      record.crouchChargeTicks,
      `${name}.crouchChargeTicks`,
    ),
    grounded: record.grounded,
  };
}

function copyAffordanceOutcome(value: unknown, name: string): BotActionAffordanceOutcome {
  const record = assertPlainRecord(value, name);
  if (typeof record.kind !== 'string' || !AFFORDANCE_KINDS.has(record.kind)) {
    throw new RangeError(`${name}.kind 无效。`);
  }
  const lane = nullableString(record.lane, `${name}.lane`);
  if (lane !== null && !ACTION_LANES.has(lane)) throw new RangeError(`${name}.lane 无效。`);
  return {
    kind: record.kind,
    actionDefinitionId: nullableString(
      record.actionDefinitionId,
      `${name}.actionDefinitionId`,
    ),
    lane,
    source: nullableString(record.source, `${name}.source`),
    reason: assertNonEmptyString(record.reason, `${name}.reason`),
  };
}

function copyActionAffordance(
  value: unknown,
  participantId: string,
  name: string,
): BotActionAffordance {
  const record = assertPlainRecord(value, name);
  const affordanceParticipantId = assertNonEmptyString(
    record.participantId,
    `${name}.participantId`,
  );
  if (affordanceParticipantId !== participantId) {
    throw new RangeError(`${name}.participantId 与 participant 身份不一致。`);
  }
  const channels = assertPlainRecord(record.channels, `${name}.channels`);
  return {
    tick: nonNegativeInteger(record.tick, `${name}.tick`),
    participantId: affordanceParticipantId,
    primaryActionDefinitionId: nullableString(
      record.primaryActionDefinitionId,
      `${name}.primaryActionDefinitionId`,
    ),
    channels: {
      primary: copyAffordanceOutcome(channels.primary, `${name}.channels.primary`),
      primaryHold: copyAffordanceOutcome(
        channels.primaryHold,
        `${name}.channels.primaryHold`,
      ),
      jump: copyAffordanceOutcome(channels.jump, `${name}.channels.jump`),
      slam: copyAffordanceOutcome(channels.slam, `${name}.channels.slam`),
    },
  };
}

function copyParticipant(value: unknown, name: string): BotParticipantObservation {
  const participant = assertPlainRecord(value, name);
  const id = assertNonEmptyString(participant.id, `${name}.id`);
  if (typeof participant.status !== 'string' || !PARTICIPANT_STATUSES.has(participant.status)) {
    throw new RangeError(`${name}.status 无效。`);
  }
  const action = assertPlainRecord(participant.action, `${name}.action`);
  if (typeof action.phase !== 'string' || !ACTION_PHASES.has(action.phase)) {
    throw new RangeError(`${name}.action.phase 无效。`);
  }
  if (typeof participant.grounded !== 'boolean') {
    throw new TypeError(`${name}.grounded 必须是布尔值。`);
  }
  const facing = assertPlainRecord(participant.facing, `${name}.facing`);
  return {
    id,
    characterDefinitionId: assertNonEmptyString(
      participant.characterDefinitionId,
      `${name}.characterDefinitionId`,
    ),
    status: participant.status,
    lives: nonNegativeInteger(participant.lives, `${name}.lives`),
    eliminations: nonNegativeInteger(participant.eliminations, `${name}.eliminations`),
    deaths: nonNegativeInteger(participant.deaths, `${name}.deaths`),
    hitstunTicks: nonNegativeInteger(participant.hitstunTicks, `${name}.hitstunTicks`),
    invulnerableTicks: nonNegativeInteger(
      participant.invulnerableTicks,
      `${name}.invulnerableTicks`,
    ),
    respawnTicks: nonNegativeInteger(participant.respawnTicks, `${name}.respawnTicks`),
    action: {
      definitionId: nullableString(action.definitionId, `${name}.action.definitionId`),
      phase: action.phase,
      ticksRemaining: nonNegativeInteger(
        action.ticksRemaining,
        `${name}.action.ticksRemaining`,
      ),
    },
    actionRule: copyActionRule(participant.actionRule, `${name}.actionRule`),
    movement: copyMovement(participant.movement, `${name}.movement`),
    actionAffordance: copyActionAffordance(
      participant.actionAffordance,
      id,
      `${name}.actionAffordance`,
    ),
    equipment: copyHeldEquipment(participant.equipment, `${name}.equipment`),
    position: finiteVector(participant.position, `${name}.position`),
    velocity: finiteVector(participant.velocity, `${name}.velocity`),
    facing: {
      x: finite(facing.x, `${name}.facing.x`),
      z: finite(facing.z, `${name}.facing.z`),
    },
    grounded: participant.grounded,
    supportSurfaceId: nullableString(
      participant.supportSurfaceId,
      `${name}.supportSurfaceId`,
    ),
  };
}

function copyMapSnapshot(value: unknown, name: string): ArenaMapSnapshot {
  try {
    return serializeMapRuntimeSnapshot(value);
  } catch (error: unknown) {
    const ErrorType = error instanceof RangeError ? RangeError : TypeError;
    const wrapped = new ErrorType(
      `${name}: ${error instanceof Error ? error.message : String(error)}`,
    ) as Error & { originalError?: unknown };
    wrapped.originalError = error;
    throw wrapped;
  }
}

function normalizeSourceSnapshot(
  value: unknown,
  name: string,
  filterWorldEquipment = false,
  lifecycleContract?: ArenaPublicSupplyProjectionLifecycleContract,
  inputKind: 'raw' | 'normalized' = 'raw',
): BotSourceSnapshot {
  if (typeof value === 'object' && value !== null && TRUSTED_SOURCE_SNAPSHOTS.has(value)) {
    return value as BotSourceSnapshot;
  }
  const source = cloneFrozenData(value, name);
  assertKnownKeys(source, SOURCE_KEYS, name);
  const tick = nonNegativeInteger(source.tick, `${name}.tick`);
  const activeTick = nonNegativeInteger(source.activeTick, `${name}.activeTick`);
  const eventSequence = nonNegativeInteger(source.eventSequence, `${name}.eventSequence`);
  const remainingTicks = nonNegativeInteger(source.remainingTicks, `${name}.remainingTicks`);
  if (typeof source.phase !== 'string' || !MATCH_PHASES.has(source.phase)) {
    throw new RangeError(`${name}.phase 无效。`);
  }
  if (!Array.isArray(source.participants) || source.participants.length !== 2) {
    throw new RangeError(`${name} 必须包含两名参赛者。`);
  }
  if (!Array.isArray(source.equipment)) throw new TypeError(`${name}.equipment 必须是数组。`);
  let activeSupplyProjection: ArenaPublicSupplyProjection | null = null;
  let remainingTicksByInstance = new Map<string, number>();
  if (inputKind === 'raw') {
    activeSupplyProjection = source.activeSupplyProjection === null
      || source.activeSupplyProjection === undefined
      ? null
      : lifecycleContract === undefined
        ? createArenaPublicSupplyProjectionAudit(source.activeSupplyProjection, {
          snapshotTick: tick,
          eventSequence,
          equipment: source.equipment,
        })
        : requireArenaPublicSupplyProjection(source.activeSupplyProjection, {
          snapshotTick: tick,
          eventSequence,
          equipment: source.equipment,
          lifecycleContract,
        });
    remainingTicksByInstance = new Map(
      activeSupplyProjection?.supplies.map(({ equipmentInstanceId, remainingTicks: value }) => (
        [equipmentInstanceId, value]
      )) ?? [],
    );
  }
  const participants = source.participants.map((participant, index) => (
    copyParticipant(participant, `${name}.participants[${index}]`)
  ));
  const ids = new Set(participants.map((participant) => participant.id));
  if (ids.size !== participants.length) throw new RangeError(`${name} 参赛者 ID 必须唯一。`);
  for (const [index, participant] of participants.entries()) {
    if (participant.actionAffordance.tick !== tick) {
      throw new RangeError(
        `${name}.participants[${index}].actionAffordance.tick 必须与快照 tick 一致。`,
      );
    }
  }
  const visibleEquipment = inputKind === 'raw' && filterWorldEquipment
    ? source.equipment.filter((equipment) => {
      const record = assertPlainRecord(equipment, `${name}.equipment`);
      return record.locationState === EQUIPMENT_LOCATION_STATE.SPAWNED
        || record.locationState === EQUIPMENT_LOCATION_STATE.DROPPED;
      })
    : source.equipment;
  const normalizedEquipment = visibleEquipment.map((equipment, index) => (
    inputKind === 'raw'
      ? copyRawVisibleEquipment(equipment, `${name}.equipment[${index}]`, remainingTicksByInstance)
      : copyNormalizedVisibleEquipment(equipment, `${name}.equipment[${index}]`)
  )).sort((left, right) => (
    left.instanceId < right.instanceId ? -1 : left.instanceId > right.instanceId ? 1 : 0
  ));
  if (inputKind === 'normalized') {
    if (source.activeSupplyProjection === null || source.activeSupplyProjection === undefined) {
      if (normalizedEquipment.some(({ remainingTicks: value }) => value !== null)) {
        throw new RangeError(`${name}.equipment remainingTicks 缺少 projection，已 fail closed。`);
      }
    } else {
      activeSupplyProjection = normalizeBotProjectionView(
        source.activeSupplyProjection,
        `${name}.activeSupplyProjection`,
        tick,
        eventSequence,
        normalizedEquipment,
      );
    }
  }
  const result = freezeOwned<BotSourceSnapshot>({
    tick,
    activeTick,
    eventSequence,
    phase: source.phase,
    remainingTicks,
    participants,
    equipment: normalizedEquipment,
    activeSupplyProjection,
    map: copyMapSnapshot(source.map, `${name}.map`),
  });
  TRUSTED_SOURCE_SNAPSHOTS.add(result);
  return result;
}

export function cloneBotSourceSnapshot(
  snapshot: unknown,
  options: Readonly<{
    readonly lifecycleContract?: ArenaPublicSupplyProjectionLifecycleContract;
  }> = {},
): BotSourceSnapshot {
  const source = assertPlainRecord(snapshot, 'Bot source snapshot');
  const reduced = {
    tick: readDataProperty(source, 'tick', 'Bot source snapshot'),
    activeTick: readDataProperty(source, 'activeTick', 'Bot source snapshot'),
    eventSequence: readDataProperty(source, 'eventSequence', 'Bot source snapshot'),
    phase: readDataProperty(source, 'phase', 'Bot source snapshot'),
    remainingTicks: readDataProperty(source, 'remainingTicks', 'Bot source snapshot'),
    participants: readDataProperty(source, 'participants', 'Bot source snapshot'),
    equipment: readDataProperty(source, 'equipment', 'Bot source snapshot'),
    activeSupplyProjection: readOptionalDataProperty(
      source,
      'activeSupplyProjection',
      'Bot source snapshot',
    ) ?? null,
    map: readDataProperty(source, 'map', 'Bot source snapshot'),
  };
  return normalizeSourceSnapshot(
    reduced,
    'Bot source snapshot',
    true,
    options.lifecycleContract,
    'raw',
  );
}

function normalizeArenaView(value: unknown, name: string): BotArenaView {
  if (typeof value === 'object' && value !== null && TRUSTED_ARENA_VIEWS.has(value)) {
    return value as BotArenaView;
  }
  const source = cloneFrozenData(value, name);
  assertKnownKeys(source, ARENA_KEYS, name);
  if (!Array.isArray(source.surfaces) || source.surfaces.length === 0) {
    throw new TypeError(`${name} 必须包含非空 surfaces。`);
  }
  const ids = new Set<string>();
  const surfaces = source.surfaces.map((value, index): BotArenaSurface => {
    const surface = assertPlainRecord(value, `${name}.surfaces[${index}]`);
    const id = assertNonEmptyString(surface.id, `${name}.surfaces[${index}].id`);
    if (ids.has(id)) throw new RangeError(`${name}.surfaces[${index}].id 必须唯一。`);
    ids.add(id);
    const halfExtents = finiteVector(
      surface.halfExtents,
      `${name}.surfaces[${index}].halfExtents`,
    );
    if (halfExtents.x <= 0 || halfExtents.y <= 0 || halfExtents.z <= 0) {
      throw new RangeError(`${name}.surfaces[${index}].halfExtents 必须全部大于 0。`);
    }
    return {
      id,
      center: finiteVector(surface.center, `${name}.surfaces[${index}].center`),
      halfExtents,
    };
  });
  const characterRadius = finite(source.characterRadius, `${name}.characterRadius`);
  const maximumStepHeight = finite(source.maximumStepHeight, `${name}.maximumStepHeight`);
  if (characterRadius <= 0) throw new RangeError('Bot characterRadius 必须大于 0。');
  if (maximumStepHeight <= 0) throw new RangeError('Bot maximumStepHeight 必须大于 0。');
  const result = freezeOwned<BotArenaView>({
    killY: finite(source.killY, `${name}.killY`),
    characterRadius,
    maximumStepHeight,
    surfaces,
  });
  TRUSTED_ARENA_VIEWS.add(result);
  return result;
}

export function createBotArenaView(
  arena: unknown,
  characterRadius: unknown,
  maximumStepHeight: unknown = ARENA_PHYSICS.maxStepHeight,
): BotArenaView {
  const source = cloneFrozenData(arena, 'Bot arena');
  const record = assertPlainRecord(source, 'Bot arena');
  return normalizeArenaView({
    killY: record.killY,
    characterRadius,
    maximumStepHeight,
    surfaces: record.surfaces,
  }, 'Bot arena');
}

export function createBotObservation(options: BotObservationOptions): BotObservation;
export function createBotObservation(options: unknown): BotObservation;
export function createBotObservation(options: unknown): BotObservation {
  assertKnownKeys(options, OBSERVATION_OPTION_KEYS, 'Bot observation options');
  const commandSnapshot = normalizeSourceSnapshot(
    options.commandSnapshot,
    'commandSnapshot',
    false,
    undefined,
    'normalized',
  );
  const delayedSnapshot = normalizeSourceSnapshot(
    options.delayedSnapshot,
    'delayedSnapshot',
    false,
    undefined,
    'normalized',
  );
  if (delayedSnapshot.tick > commandSnapshot.tick) {
    throw new RangeError('机器人不能观察未来快照。');
  }
  if (delayedSnapshot.eventSequence > commandSnapshot.eventSequence) {
    throw new RangeError('机器人不能观察未来 eventSequence。');
  }
  const selfId = assertNonEmptyString(options.selfId, 'Bot selfId');
  const arena = normalizeArenaView(options.arena, 'Bot observation arena');
  const objectives = options.objectives ?? [];
  if (!Array.isArray(objectives)) throw new TypeError('Bot objectives 必须是数组。');
  const self = commandSnapshot.participants.find((participant) => participant.id === selfId);
  const opponentId = commandSnapshot.participants.find(
    (participant) => participant.id !== selfId,
  )?.id;
  const delayedIds = new Set(delayedSnapshot.participants.map((participant) => participant.id));
  if (!self || !opponentId || !delayedIds.has(selfId) || !delayedIds.has(opponentId)) {
    throw new RangeError('Bot observation 前后快照的参赛者身份不一致。');
  }
  const opponent = delayedSnapshot.participants.find(
    (participant) => participant.id === opponentId,
  );
  if (!opponent) throw new RangeError('Bot observation 缺少延迟对手。');
  const copiedObjectives = Object.freeze(objectives.map((objective, index) => (
    cloneFrozenData(objective, `Bot objectives[${index}]`)
  )));
  return Object.freeze({
    schemaVersion: 4,
    commandTick: commandSnapshot.tick,
    observedTick: delayedSnapshot.tick,
    phase: commandSnapshot.phase,
    remainingTicks: commandSnapshot.remainingTicks,
    self,
    opponent,
    equipment: delayedSnapshot.equipment,
    map: delayedSnapshot.map,
    arena,
    actionRule: self.actionRule,
    opponentActionRule: opponent.actionRule,
    objectives: copiedObjectives,
  });
}
