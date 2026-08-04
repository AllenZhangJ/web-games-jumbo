import {
  ARENA_MATCH_EVENT,
  ARENA_PUBLIC_SUPPLY_PROJECTION_MAX_ITEMS,
  ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS,
  ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION,
  EQUIPMENT_EXPIRY_REASON,
  EQUIPMENT_RECYCLE_REASON,
  EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION,
  createDeterministicDataHash,
  cloneFrozenData,
  assertKnownKeys,
  assertPlainRecord,
  type ArenaEquipmentSnapshot,
  type ArenaPublicSupplyProjection,
  type ArenaPublicSupplyProjectionItem,
  type ArenaPublicSupplyProjectionLifecycleContract,
  type ArenaPublicSupplyProjectionSpawnSpec,
  type DeepReadonly,
  type EquipmentExpiredEventPayload,
  type EquipmentRecycledEventPayload,
  type EquipmentReplacedEventPayload,
  type EquipmentSpawnedEventPayload,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';

export const ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION = 1 as const;
export const ARENA_SUPPLY_PRESENTATION_TICKS_PER_SECOND = 60 as const;
export const ARENA_SUPPLY_PRESENTATION_RECENT_EVENT_CAPACITY = 64 as const;
export const ARENA_SUPPLY_PRESENTATION_MAX_EVENTS_PER_UPDATE = 64 as const;
export const ARENA_SUPPLY_PRESENTATION_MAX_RESYNC_EVENTS_PER_UPDATE = 256 as const;
export const ARENA_SUPPLY_PRESENTATION_MAX_CUES_PER_VIEW = 64 as const;
export const ARENA_SUPPLY_PRESENTATION_MAX_EQUIPMENT_ITEMS = 64 as const;
export const ARENA_SUPPLY_PRESENTATION_MAX_MARKERS = ARENA_PUBLIC_SUPPLY_PROJECTION_MAX_ITEMS;
export const ARENA_SUPPLY_PRESENTATION_MAX_PENDING_REPLACEMENT_PAIRS = 3 as const;
export const ARENA_SUPPLY_PRESENTATION_MAX_ID_LENGTH = 256 as const;
export const ARENA_SUPPLY_PRESENTATION_EQUIPMENT_SNAPSHOT_SCHEMA_VERSION = 1 as const;

export const ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1 = Object.freeze({
  SPAWNED: 'spawned',
  PICKED_UP: 'picked-up',
  REPLACED: 'replaced',
  EXPIRED: 'expired',
} as const);

export const ARENA_SUPPLY_PRESENTATION_VIEW_STATUS_V1 = Object.freeze({
  READY: 'ready',
  RESYNC_REQUIRED: 'resync-required',
} as const);

export const ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1 = Object.freeze({
  CREATED: 'created',
  ACTIVE: 'active',
  RESYNC_REQUIRED: 'resync-required',
  FAILED: 'failed',
  DESTROYED: 'destroyed',
} as const);

export const ARENA_SUPPLY_PRESENTATION_TERMINAL_FAILURE_KIND_V1 = Object.freeze({
  INPUT_INVALID: 'input-invalid',
  EVENT_IDENTITY_CONFLICT: 'event-identity-conflict',
  REENTRANT_CALL: 'reentrant-call',
  INTERNAL_INVARIANT: 'internal-invariant',
} as const);

export const ARENA_SUPPLY_PRESENTATION_EVENT_SHAPE_ID_V1 = Object.freeze({
  SUPPLY_SPAWNED_STRICT: 'supply-spawned-strict',
  ORDINARY_SPAWNED_FLAT_BYPASS: 'ordinary-spawned-flat-bypass',
  ORDINARY_PICKED_UP_FLAT_CONDITIONAL: 'ordinary-picked-up-flat-conditional',
  SUPPLY_RECYCLED_STRICT: 'supply-recycled-strict',
  SUPPLY_REPLACED_STRICT: 'supply-replaced-strict',
  SUPPLY_EXPIRED_STRICT: 'supply-expired-strict',
} as const);

export const ARENA_SUPPLY_PRESENTATION_A1_FIXTURE_IDS_V1 = Object.freeze([
  'spawn-three-physical-entities-without-modal',
  'ordinary-flat-equipment-spawn-bypasses-supply-adapter',
  'mixed-flat-and-payload-spawn-fails-closed',
  'active-supply-flat-pickup-terminates-exactly-one-marker',
  'flat-pickup-not-matching-active-bypasses-without-cue-or-marker-change',
  'definition-conflict-or-multiple-active-pickup-fails-closed',
  'missing-history-or-bound-active-projection-enters-resync-before-any-event',
  'replacement-pair-terminates-without-waiting-for-picked-up',
  'strict-replacement-without-active-match-fails-closed',
  'strict-expiry-without-active-match-fails-closed',
  'remaining-tick-599-600-601',
  'same-tick-expire-before-pickup',
  'same-tick-recycle-before-replace-and-pickup-before-action',
  'duplicate-identical-event-idempotent',
  'duplicate-conflicting-event-fail-closed',
  'event-older-than-recent-ring-never-applies-or-replays-one-shot',
  'sequence-gap-and-out-of-order-resync',
  'missing-required-and-future-field-rejected',
  'pause-resume-no-wall-clock-progress',
  '30fps-terminal-state-exact',
  'replay-forward-and-catch-up-no-double-one-shot',
  'replay-seek-or-reset-starts-new-epoch-and-clears-ring-and-pending',
  'asset-failure-accessible-fallback-does-not-pass-asset-gate',
  'reduced-motion-and-silent-equivalence',
  'destroy-twice-no-live-resources',
] as const);

export type ArenaSupplyPresentationCueKindV1 =
  typeof ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1[
    keyof typeof ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1
  ];
export type ArenaSupplyPresentationViewStatusV1 =
  typeof ARENA_SUPPLY_PRESENTATION_VIEW_STATUS_V1[
    keyof typeof ARENA_SUPPLY_PRESENTATION_VIEW_STATUS_V1
  ];
export type ArenaSupplyPresentationLifecycleStateV1 =
  typeof ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1[
    keyof typeof ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1
  ];
export type ArenaSupplyPresentationTerminalFailureKindV1 =
  typeof ARENA_SUPPLY_PRESENTATION_TERMINAL_FAILURE_KIND_V1[
    keyof typeof ARENA_SUPPLY_PRESENTATION_TERMINAL_FAILURE_KIND_V1
  ];
export type ArenaSupplyPresentationEventShapeIdV1 =
  typeof ARENA_SUPPLY_PRESENTATION_EVENT_SHAPE_ID_V1[
    keyof typeof ARENA_SUPPLY_PRESENTATION_EVENT_SHAPE_ID_V1
  ];
export type ArenaSupplyPresentationA1FixtureIdV1 =
  typeof ARENA_SUPPLY_PRESENTATION_A1_FIXTURE_IDS_V1[number];

export interface ArenaSupplyPresentationPositionV1 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface ArenaSupplyPresentationMarkerV1 {
  readonly schemaVersion: typeof ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION;
  readonly supplyDefinitionId: string;
  readonly supplyId: string;
  readonly equipmentInstanceId: string;
  readonly equipmentDefinitionId: string;
  readonly position: ArenaSupplyPresentationPositionV1;
  readonly spawnTick: number;
  readonly expireTick: number;
  readonly remainingTicks: number;
  readonly labelSeconds: number;
}

export interface ArenaSupplyPresentationCueV1 {
  readonly schemaVersion: typeof ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION;
  readonly id: string;
  readonly kind: ArenaSupplyPresentationCueKindV1;
  readonly sourceEventIds: readonly string[];
  readonly tick: number;
  readonly sequenceStart: number;
  readonly sequenceEnd: number;
  readonly supplyId: string;
  readonly equipmentInstanceId: string;
  readonly participantId: string | null;
  readonly previousEquipmentInstanceId: string | null;
  readonly nextEquipmentInstanceId: string | null;
}

export interface ArenaSupplyPresentationViewV1 {
  readonly schemaVersion: typeof ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION;
  readonly streamId: string;
  readonly status: ArenaSupplyPresentationViewStatusV1;
  readonly snapshotTick: number;
  readonly snapshotEventSequence: number;
  readonly nextExpectedEventSequence: number;
  readonly resyncedFromSnapshot: boolean;
  readonly markers: readonly ArenaSupplyPresentationMarkerV1[];
  readonly cues: readonly ArenaSupplyPresentationCueV1[];
}

export interface ArenaSupplyPresentationAdapterOptionsV1 {
  readonly schemaVersion: typeof ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION;
  readonly streamId: string;
  readonly ticksPerSecond: typeof ARENA_SUPPLY_PRESENTATION_TICKS_PER_SECOND;
  readonly lifecycleContract: DeepReadonly<ArenaPublicSupplyProjectionLifecycleContract>;
  readonly recentEventCapacity: typeof ARENA_SUPPLY_PRESENTATION_RECENT_EVENT_CAPACITY;
}

export interface ArenaSupplyPresentationAuthorityEventV1 extends Readonly<Record<string, unknown>> {
  readonly id: string;
  readonly sequence: number;
  readonly tick: number;
  readonly type: string;
}

export interface ArenaSupplyPresentationStrictSpawnedEventV1 {
  readonly id: string;
  readonly sequence: number;
  readonly tick: number;
  readonly type: typeof ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED;
  readonly payload: EquipmentSpawnedEventPayload;
}

export interface ArenaSupplyPresentationOrdinarySpawnedEventV1 {
  readonly id: string;
  readonly sequence: number;
  readonly tick: number;
  readonly type: typeof ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED;
  readonly equipmentInstanceId: string;
  readonly equipmentDefinitionId: string;
  readonly spawnId: string;
  readonly position: ArenaSupplyPresentationPositionV1;
}

export interface ArenaSupplyPresentationPickedUpEventV1 {
  readonly id: string;
  readonly sequence: number;
  readonly tick: number;
  readonly type: typeof ARENA_MATCH_EVENT.EQUIPMENT_PICKED_UP;
  readonly participantId: string;
  readonly equipmentInstanceId: string;
  readonly equipmentDefinitionId: string;
}

export interface ArenaSupplyPresentationRecycledEventV1 {
  readonly id: string;
  readonly sequence: number;
  readonly tick: number;
  readonly type: typeof ARENA_MATCH_EVENT.EQUIPMENT_RECYCLED;
  readonly payload: EquipmentRecycledEventPayload;
}

export interface ArenaSupplyPresentationReplacedEventV1 {
  readonly id: string;
  readonly sequence: number;
  readonly tick: number;
  readonly type: typeof ARENA_MATCH_EVENT.EQUIPMENT_REPLACED;
  readonly payload: EquipmentReplacedEventPayload;
}

export interface ArenaSupplyPresentationExpiredEventV1 {
  readonly id: string;
  readonly sequence: number;
  readonly tick: number;
  readonly type: typeof ARENA_MATCH_EVENT.EQUIPMENT_EXPIRED;
  readonly payload: EquipmentExpiredEventPayload;
}

export type ArenaSupplyPresentationEquipmentEventV1 =
  | ArenaSupplyPresentationStrictSpawnedEventV1
  | ArenaSupplyPresentationOrdinarySpawnedEventV1
  | ArenaSupplyPresentationPickedUpEventV1
  | ArenaSupplyPresentationRecycledEventV1
  | ArenaSupplyPresentationReplacedEventV1
  | ArenaSupplyPresentationExpiredEventV1;

export type ArenaSupplyPresentationEventV1 =
  | ArenaSupplyPresentationEquipmentEventV1
  | ArenaSupplyPresentationAuthorityEventV1;

export interface ArenaSupplyPresentationStartInputV1 {
  readonly schemaVersion: typeof ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION;
  readonly snapshotTick: number;
  readonly snapshotEventSequence: number;
  readonly equipment: readonly DeepReadonly<ArenaEquipmentSnapshot>[];
  readonly activeSupplyProjection: DeepReadonly<ArenaPublicSupplyProjection>;
}

export interface ArenaSupplyPresentationUpdateInputV1 extends ArenaSupplyPresentationStartInputV1 {
  readonly events: readonly ArenaSupplyPresentationEventV1[];
}

export interface ArenaSupplyPresentationDebugSnapshotV1 {
  readonly schemaVersion: typeof ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION;
  readonly streamId: string;
  readonly lifecycleState: ArenaSupplyPresentationLifecycleStateV1;
  readonly snapshotTick: number | null;
  readonly nextExpectedEventSequence: number | null;
  readonly markerCount: number;
  readonly pendingReplacementPairCount: number;
  readonly recentEventHashCount: number;
  readonly acceptedEventCount: number;
  readonly duplicateEventCount: number;
  readonly resyncCount: number;
  readonly terminalFailureKind: ArenaSupplyPresentationTerminalFailureKindV1 | null;
}

const MARKER_KEYS = new Set([
  'schemaVersion', 'supplyDefinitionId', 'supplyId', 'equipmentInstanceId',
  'equipmentDefinitionId', 'position', 'spawnTick', 'expireTick', 'remainingTicks',
  'labelSeconds',
]);
const CUE_KEYS = new Set([
  'schemaVersion', 'id', 'kind', 'sourceEventIds', 'tick', 'sequenceStart', 'sequenceEnd',
  'supplyId', 'equipmentInstanceId', 'participantId', 'previousEquipmentInstanceId',
  'nextEquipmentInstanceId',
]);
const VIEW_KEYS = new Set([
  'schemaVersion', 'streamId', 'status', 'snapshotTick', 'snapshotEventSequence',
  'nextExpectedEventSequence', 'resyncedFromSnapshot', 'markers', 'cues',
]);
const OPTIONS_KEYS = new Set([
  'schemaVersion', 'streamId', 'ticksPerSecond', 'lifecycleContract',
  'recentEventCapacity',
]);
const START_KEYS = new Set([
  'schemaVersion', 'snapshotTick', 'snapshotEventSequence', 'equipment',
  'activeSupplyProjection',
]);
const UPDATE_KEYS = new Set([...START_KEYS, 'events']);
const DEBUG_KEYS = new Set([
  'schemaVersion', 'streamId', 'lifecycleState', 'snapshotTick',
  'nextExpectedEventSequence', 'markerCount', 'pendingReplacementPairCount',
  'recentEventHashCount', 'acceptedEventCount', 'duplicateEventCount', 'resyncCount',
  'terminalFailureKind',
]);
const POSITION_KEYS = new Set(['x', 'y', 'z']);
const LIFECYCLE_KEYS = new Set([
  'supplyDefinitionId', 'firstSpawnTick', 'spawnIntervalTicks', 'spawnCount',
  'lifetimeTicks', 'spawnSpecs', 'equipmentDefinitionIds',
]);
const SPAWN_SPEC_KEYS = new Set(['slotId', 'equipmentDefinitionId', 'spawnId', 'position']);
const PROJECTION_KEYS = new Set([
  'schemaVersion', 'snapshotTick', 'snapshotEventSequence', 'resyncReadiness',
  'pendingAuthorityTick', 'pendingExpiryEquipmentInstanceIds', 'supplies',
]);
const PROJECTION_ITEM_KEYS = new Set([
  'schemaVersion', 'supplyDefinitionId', 'supplyId', 'slotId', 'equipmentInstanceId',
  'equipmentDefinitionId', 'equipmentSpawnId', 'spawnPosition', 'spawnTick',
  'expireTick', 'remainingTicks', 'position',
]);
const EQUIPMENT_KEYS = new Set([
  'schemaVersion', 'instanceId', 'definitionId', 'spawnId', 'locationState', 'ownerId',
  'position', 'lastSafePosition', 'cooldownRemainingTicks', 'revision',
]);
const SUPPLY_EVENT_IDENTITY_KEYS = [
  'schemaVersion', 'supplyDefinitionId', 'supplyId', 'equipmentInstanceId',
  'spawnTick', 'expireTick', 'tick',
] as const;
const SPAWNED_PAYLOAD_KEYS = new Set([
  ...SUPPLY_EVENT_IDENTITY_KEYS, 'equipmentDefinitionId', 'spawnId', 'position',
]);
const RECYCLED_PAYLOAD_KEYS = new Set([
  ...SUPPLY_EVENT_IDENTITY_KEYS, 'participantId', 'recycledEquipmentInstanceId',
  'replacementEquipmentInstanceId', 'reason',
]);
const REPLACED_PAYLOAD_KEYS = new Set([
  ...SUPPLY_EVENT_IDENTITY_KEYS, 'participantId', 'previousEquipmentInstanceId',
  'nextEquipmentInstanceId',
]);
const EXPIRED_PAYLOAD_KEYS = new Set([
  ...SUPPLY_EVENT_IDENTITY_KEYS, 'expiredEquipmentInstanceId', 'reason',
]);
const EVENT_ENVELOPE_KEYS = ['id', 'sequence', 'tick', 'type'] as const;
const STRICT_EVENT_KEYS = new Set([...EVENT_ENVELOPE_KEYS, 'payload']);
const ORDINARY_SPAWN_KEYS = new Set([
  ...EVENT_ENVELOPE_KEYS, 'equipmentInstanceId', 'equipmentDefinitionId', 'spawnId', 'position',
]);
const ORDINARY_PICKUP_KEYS = new Set([
  ...EVENT_ENVELOPE_KEYS, 'participantId', 'equipmentInstanceId', 'equipmentDefinitionId',
]);
const CUE_KINDS: ReadonlySet<unknown> = new Set(Object.values(
  ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1,
));
const VIEW_STATUSES: ReadonlySet<unknown> = new Set(Object.values(
  ARENA_SUPPLY_PRESENTATION_VIEW_STATUS_V1,
));
const LIFECYCLE_STATES: ReadonlySet<unknown> = new Set(Object.values(
  ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1,
));
const TERMINAL_FAILURE_KINDS: ReadonlySet<unknown> = new Set(Object.values(
  ARENA_SUPPLY_PRESENTATION_TERMINAL_FAILURE_KIND_V1,
));
const REGISTERED_EVENT_TYPES: ReadonlySet<unknown> = new Set(Object.values(ARENA_MATCH_EVENT));
const WORLD_EQUIPMENT_STATES: ReadonlySet<unknown> = new Set(['spawned', 'dropped']);
const KNOWN_EQUIPMENT_STATES: ReadonlySet<unknown> = new Set([
  'spawned', 'dropped', 'held', 'despawned',
]);
const STREAM_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
const SLOT_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
const FORMAL_SUPPLY_DEFINITION_ID = 'arena-v2.survival-supply.v1';
const FORMAL_FIRST_SPAWN_TICK = 1_200;
const FORMAL_SPAWN_INTERVAL_TICKS = 1_200;
const FORMAL_LIFETIME_TICKS = 600;

function exactFrozenRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): PlainRecord {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, keys, name);
  if (Reflect.ownKeys(source).length !== keys.size) {
    throw new TypeError(`${name} exact-key 校验失败。`);
  }
  for (const key of keys) {
    if (!Object.hasOwn(source, key)) throw new TypeError(`${name} 缺少字段 ${key}。`);
  }
  return source;
}

function cloneExactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): PlainRecord {
  return exactFrozenRecord(cloneFrozenData(value, name), keys, name);
}

function safeInteger(value: unknown, name: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的安全整数。`);
  }
  return value as number;
}

function nullableSafeInteger(value: unknown, name: string): number | null {
  return value === null ? null : safeInteger(value, name);
}

function identifier(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim().length === 0
    || value.length > ARENA_SUPPLY_PRESENTATION_MAX_ID_LENGTH
    || /[\0-\x1f\x7f]/.test(value)) {
    throw new TypeError(`${name} 必须是受限非空标识符。`);
  }
  return value;
}

function nullableIdentifier(value: unknown, name: string): string | null {
  return value === null ? null : identifier(value, name);
}

function streamId(value: unknown, name: string): string {
  const result = identifier(value, name);
  if (!STREAM_ID_PATTERN.test(result)) {
    throw new RangeError(`${name} 只允许 [A-Za-z0-9._-]+。`);
  }
  return result;
}

function finite(value: unknown, name: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${name} 必须是有限数。`);
  return value as number;
}

function position(value: unknown, name: string): ArenaSupplyPresentationPositionV1 {
  const source = exactFrozenRecord(value, POSITION_KEYS, name);
  return Object.freeze({
    x: finite(source.x, `${name}.x`),
    y: finite(source.y, `${name}.y`),
    z: finite(source.z, `${name}.z`),
  });
}

function samePosition(
  left: ArenaSupplyPresentationPositionV1,
  right: ArenaSupplyPresentationPositionV1,
): boolean {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

function boundedArray(value: unknown, maximum: number, name: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} 必须是数组。`);
  if (value.length > maximum) throw new RangeError(`${name} 超过上限 ${maximum}。`);
  return value;
}

function assertSchemaVersion(source: PlainRecord, name: string): void {
  if (source.schemaVersion !== ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION) {
    throw new RangeError(
      `${name}.schemaVersion 必须是 ${ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION}。`,
    );
  }
}

function sortedUniqueStrings(
  value: unknown,
  maximum: number,
  name: string,
): readonly string[] {
  const source = boundedArray(value, maximum, name);
  const result = source.map((item, index) => identifier(item, `${name}[${index}]`));
  if (result.some((item, index) => index > 0 && result[index - 1]! >= item)) {
    throw new RangeError(`${name} 必须唯一且稳定排序。`);
  }
  return Object.freeze(result);
}

function normalizeMarkerFrozen(
  value: unknown,
): ArenaSupplyPresentationMarkerV1 {
  const source = exactFrozenRecord(value, MARKER_KEYS, 'ArenaSupplyPresentationMarkerV1');
  assertSchemaVersion(source, 'ArenaSupplyPresentationMarkerV1');
  const spawnTick = safeInteger(source.spawnTick, 'ArenaSupplyPresentationMarkerV1.spawnTick');
  const expireTick = safeInteger(source.expireTick, 'ArenaSupplyPresentationMarkerV1.expireTick');
  const remainingTicks = safeInteger(
    source.remainingTicks,
    'ArenaSupplyPresentationMarkerV1.remainingTicks',
    1,
  );
  const labelSeconds = safeInteger(
    source.labelSeconds,
    'ArenaSupplyPresentationMarkerV1.labelSeconds',
    1,
  );
  const supplyDefinitionId = identifier(
    source.supplyDefinitionId,
    'ArenaSupplyPresentationMarkerV1.supplyDefinitionId',
  );
  const supplyId = identifier(source.supplyId, 'ArenaSupplyPresentationMarkerV1.supplyId');
  const equipmentInstanceId = identifier(
    source.equipmentInstanceId,
    'ArenaSupplyPresentationMarkerV1.equipmentInstanceId',
  );
  if (expireTick <= spawnTick || remainingTicks > expireTick - spawnTick) {
    throw new RangeError('ArenaSupplyPresentationMarkerV1 生命周期边界无效。');
  }
  if (labelSeconds !== Math.ceil(remainingTicks / ARENA_SUPPLY_PRESENTATION_TICKS_PER_SECOND)) {
    throw new RangeError('ArenaSupplyPresentationMarkerV1.labelSeconds 必须由 remainingTicks 派生。');
  }
  return Object.freeze({
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    supplyDefinitionId,
    supplyId,
    equipmentInstanceId,
    equipmentDefinitionId: identifier(
      source.equipmentDefinitionId,
      'ArenaSupplyPresentationMarkerV1.equipmentDefinitionId',
    ),
    position: position(source.position, 'ArenaSupplyPresentationMarkerV1.position'),
    spawnTick,
    expireTick,
    remainingTicks,
    labelSeconds,
  });
}

export function createArenaSupplyPresentationMarkerV1(
  value: unknown,
): ArenaSupplyPresentationMarkerV1 {
  return normalizeMarkerFrozen(cloneFrozenData(value, 'ArenaSupplyPresentationMarkerV1'));
}

function normalizeCueFrozen(
  value: unknown,
): ArenaSupplyPresentationCueV1 {
  const source = exactFrozenRecord(value, CUE_KEYS, 'ArenaSupplyPresentationCueV1');
  assertSchemaVersion(source, 'ArenaSupplyPresentationCueV1');
  if (!CUE_KINDS.has(source.kind)) {
    throw new RangeError('ArenaSupplyPresentationCueV1.kind 不受支持。');
  }
  const kind = source.kind as ArenaSupplyPresentationCueKindV1;
  const sequenceStart = safeInteger(
    source.sequenceStart,
    'ArenaSupplyPresentationCueV1.sequenceStart',
  );
  const sequenceEnd = safeInteger(source.sequenceEnd, 'ArenaSupplyPresentationCueV1.sequenceEnd');
  const sourceEventIds = boundedArray(
    source.sourceEventIds,
    2,
    'ArenaSupplyPresentationCueV1.sourceEventIds',
  ).map((item, index) => identifier(
    item,
    `ArenaSupplyPresentationCueV1.sourceEventIds[${index}]`,
  ));
  const expectedEventCount = kind === ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1.REPLACED ? 2 : 1;
  if (sourceEventIds.length !== expectedEventCount
    || new Set(sourceEventIds).size !== sourceEventIds.length) {
    throw new RangeError('ArenaSupplyPresentationCueV1.sourceEventIds 数量或唯一性无效。');
  }
  if ((expectedEventCount === 1 && sequenceEnd !== sequenceStart)
    || (expectedEventCount === 2 && sequenceEnd !== sequenceStart + 1)) {
    throw new RangeError('ArenaSupplyPresentationCueV1 sequence span 与 Cue kind 不一致。');
  }
  const id = identifier(source.id, 'ArenaSupplyPresentationCueV1.id');
  const suffix = `:supply-cue-v1:${sequenceStart}-${sequenceEnd}:${kind}`;
  if (!id.endsWith(suffix)) throw new RangeError('ArenaSupplyPresentationCueV1.id 不是 canonical Cue ID。');
  streamId(id.slice(0, -suffix.length), 'ArenaSupplyPresentationCueV1.id streamId');
  const supplyId = identifier(source.supplyId, 'ArenaSupplyPresentationCueV1.supplyId');
  const equipmentInstanceId = identifier(
    source.equipmentInstanceId,
    'ArenaSupplyPresentationCueV1.equipmentInstanceId',
  );
  const participantId = nullableIdentifier(
    source.participantId,
    'ArenaSupplyPresentationCueV1.participantId',
  );
  const previousEquipmentInstanceId = nullableIdentifier(
    source.previousEquipmentInstanceId,
    'ArenaSupplyPresentationCueV1.previousEquipmentInstanceId',
  );
  const nextEquipmentInstanceId = nullableIdentifier(
    source.nextEquipmentInstanceId,
    'ArenaSupplyPresentationCueV1.nextEquipmentInstanceId',
  );
  if (kind === ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1.SPAWNED
    || kind === ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1.EXPIRED) {
    if (participantId !== null || previousEquipmentInstanceId !== null
      || nextEquipmentInstanceId !== null) {
      throw new RangeError(`${kind} Cue 的非适用身份必须是 null。`);
    }
  } else if (kind === ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1.PICKED_UP) {
    if (participantId === null || previousEquipmentInstanceId !== null
      || nextEquipmentInstanceId !== null) {
      throw new RangeError('picked-up Cue 只允许 participantId 非空。');
    }
  } else if (participantId === null || previousEquipmentInstanceId === null
    || nextEquipmentInstanceId === null || equipmentInstanceId !== nextEquipmentInstanceId
    || previousEquipmentInstanceId === nextEquipmentInstanceId) {
    throw new RangeError('replaced Cue 旧/新/participant identity 无效。');
  }
  return Object.freeze({
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    id,
    kind,
    sourceEventIds: Object.freeze(sourceEventIds),
    tick: safeInteger(source.tick, 'ArenaSupplyPresentationCueV1.tick'),
    sequenceStart,
    sequenceEnd,
    supplyId,
    equipmentInstanceId,
    participantId,
    previousEquipmentInstanceId,
    nextEquipmentInstanceId,
  });
}

export function createArenaSupplyPresentationCueV1(
  value: unknown,
): ArenaSupplyPresentationCueV1 {
  return normalizeCueFrozen(cloneFrozenData(value, 'ArenaSupplyPresentationCueV1'));
}

export function createArenaSupplyPresentationViewV1(
  value: unknown,
): ArenaSupplyPresentationViewV1 {
  const source = cloneExactRecord(value, VIEW_KEYS, 'ArenaSupplyPresentationViewV1');
  assertSchemaVersion(source, 'ArenaSupplyPresentationViewV1');
  if (!VIEW_STATUSES.has(source.status)) {
    throw new RangeError('ArenaSupplyPresentationViewV1.status 不受支持。');
  }
  if (typeof source.resyncedFromSnapshot !== 'boolean') {
    throw new TypeError('ArenaSupplyPresentationViewV1.resyncedFromSnapshot 必须是布尔值。');
  }
  const normalizedStreamId = streamId(source.streamId, 'ArenaSupplyPresentationViewV1.streamId');
  const snapshotTick = safeInteger(source.snapshotTick, 'ArenaSupplyPresentationViewV1.snapshotTick');
  const snapshotEventSequence = safeInteger(
    source.snapshotEventSequence,
    'ArenaSupplyPresentationViewV1.snapshotEventSequence',
  );
  const nextExpectedEventSequence = safeInteger(
    source.nextExpectedEventSequence,
    'ArenaSupplyPresentationViewV1.nextExpectedEventSequence',
  );
  if (nextExpectedEventSequence !== snapshotEventSequence) {
    throw new RangeError(
      'ArenaSupplyPresentationViewV1 nextExpectedEventSequence 必须等于 post snapshotEventSequence。',
    );
  }
  const markers = boundedArray(
    source.markers,
    ARENA_SUPPLY_PRESENTATION_MAX_MARKERS,
    'ArenaSupplyPresentationViewV1.markers',
  ).map(normalizeMarkerFrozen);
  const cues = boundedArray(
    source.cues,
    ARENA_SUPPLY_PRESENTATION_MAX_CUES_PER_VIEW,
    'ArenaSupplyPresentationViewV1.cues',
  ).map(normalizeCueFrozen);
  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index]!;
    if (index > 0 && markers[index - 1]!.supplyId >= marker.supplyId) {
      throw new RangeError('ArenaSupplyPresentationViewV1.markers 必须按 supplyId 唯一排序。');
    }
    if (marker.spawnTick > snapshotTick || marker.expireTick <= snapshotTick
      || marker.remainingTicks !== marker.expireTick - snapshotTick) {
      throw new RangeError('ArenaSupplyPresentationViewV1 marker 与 snapshotTick 不一致。');
    }
  }
  if (new Set(markers.map(({ equipmentInstanceId }) => equipmentInstanceId)).size !== markers.length) {
    throw new RangeError('ArenaSupplyPresentationViewV1 marker equipment identity 重复。');
  }
  if (new Set(cues.map(({ id }) => id)).size !== cues.length
    || new Set(cues.flatMap(({ sourceEventIds }) => sourceEventIds)).size
      !== cues.reduce((sum, cue) => sum + cue.sourceEventIds.length, 0)) {
    throw new RangeError('ArenaSupplyPresentationViewV1 Cue/source event identity 重复。');
  }
  if (cues.some((cue, index) => cue.tick > snapshotTick
    || cue.sequenceEnd >= snapshotEventSequence
    || (index > 0 && cues[index - 1]!.sequenceEnd >= cue.sequenceStart)
    || !cue.id.startsWith(`${normalizedStreamId}:supply-cue-v1:`))) {
    throw new RangeError('ArenaSupplyPresentationViewV1 Cue 与 stream/snapshot/sequence 不一致。');
  }
  const status = source.status as ArenaSupplyPresentationViewStatusV1;
  if (status === ARENA_SUPPLY_PRESENTATION_VIEW_STATUS_V1.RESYNC_REQUIRED
    && (markers.length !== 0 || cues.length !== 0 || source.resyncedFromSnapshot)) {
    throw new RangeError('resync-required View 必须隐藏 markers/cues 且未完成 snapshot resync。');
  }
  if (source.resyncedFromSnapshot && cues.length !== 0) {
    throw new RangeError('snapshot resync View 不得补播历史 Cue。');
  }
  return Object.freeze({
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    streamId: normalizedStreamId,
    status,
    snapshotTick,
    snapshotEventSequence,
    nextExpectedEventSequence,
    resyncedFromSnapshot: source.resyncedFromSnapshot,
    markers: Object.freeze(markers),
    cues: Object.freeze(cues),
  });
}

function normalizeLifecycleContractFrozen(
  value: unknown,
): DeepReadonly<ArenaPublicSupplyProjectionLifecycleContract> {
  const source = exactFrozenRecord(
    value,
    LIFECYCLE_KEYS,
    'ArenaSupplyPresentationAdapterOptionsV1.lifecycleContract',
  );
  const supplyDefinitionId = identifier(
    source.supplyDefinitionId,
    'ArenaSupplyPresentationAdapterOptionsV1.lifecycleContract.supplyDefinitionId',
  );
  const firstSpawnTick = safeInteger(
    source.firstSpawnTick,
    'ArenaSupplyPresentationAdapterOptionsV1.lifecycleContract.firstSpawnTick',
  );
  const spawnIntervalTicks = safeInteger(
    source.spawnIntervalTicks,
    'ArenaSupplyPresentationAdapterOptionsV1.lifecycleContract.spawnIntervalTicks',
    1,
  );
  const spawnCount = safeInteger(
    source.spawnCount,
    'ArenaSupplyPresentationAdapterOptionsV1.lifecycleContract.spawnCount',
    1,
  );
  const lifetimeTicks = safeInteger(
    source.lifetimeTicks,
    'ArenaSupplyPresentationAdapterOptionsV1.lifecycleContract.lifetimeTicks',
    1,
  );
  if (supplyDefinitionId !== FORMAL_SUPPLY_DEFINITION_ID
    || firstSpawnTick !== FORMAL_FIRST_SPAWN_TICK
    || spawnIntervalTicks !== FORMAL_SPAWN_INTERVAL_TICKS
    || spawnCount !== ARENA_SUPPLY_PRESENTATION_MAX_MARKERS
    || lifetimeTicks !== FORMAL_LIFETIME_TICKS
    || lifetimeTicks >= spawnIntervalTicks) {
    throw new RangeError('ArenaSupplyPresentation lifecycleContract 与冻结 P1 authority 值不一致。');
  }
  const equipmentDefinitionIds = sortedUniqueStrings(
    source.equipmentDefinitionIds,
    ARENA_SUPPLY_PRESENTATION_MAX_MARKERS,
    'ArenaSupplyPresentationAdapterOptionsV1.lifecycleContract.equipmentDefinitionIds',
  );
  if (equipmentDefinitionIds.length === 0) {
    throw new RangeError('ArenaSupplyPresentation lifecycleContract 缺少 equipment Definition。');
  }
  const slots = new Set<string>();
  const spawnIds = new Set<string>();
  const spawnSpecs = boundedArray(
    source.spawnSpecs,
    ARENA_SUPPLY_PRESENTATION_MAX_MARKERS,
    'ArenaSupplyPresentationAdapterOptionsV1.lifecycleContract.spawnSpecs',
  ).map((candidate, index): ArenaPublicSupplyProjectionSpawnSpec => {
    const name = `ArenaSupplyPresentationAdapterOptionsV1.lifecycleContract.spawnSpecs[${index}]`;
    const spec = exactFrozenRecord(candidate, SPAWN_SPEC_KEYS, name);
    const slotId = identifier(spec.slotId, `${name}.slotId`);
    if (!SLOT_ID_PATTERN.test(slotId) || slots.has(slotId)) {
      throw new RangeError(`${name}.slotId 格式或唯一性无效。`);
    }
    slots.add(slotId);
    const equipmentDefinitionId = identifier(
      spec.equipmentDefinitionId,
      `${name}.equipmentDefinitionId`,
    );
    if (!equipmentDefinitionIds.includes(equipmentDefinitionId)) {
      throw new RangeError(`${name}.equipmentDefinitionId 未在冻结集合中。`);
    }
    const spawnId = identifier(spec.spawnId, `${name}.spawnId`);
    if (spawnIds.has(spawnId)) throw new RangeError(`${name}.spawnId 重复。`);
    spawnIds.add(spawnId);
    return Object.freeze({
      slotId,
      equipmentDefinitionId,
      spawnId,
      position: position(spec.position, `${name}.position`),
    });
  });
  if (spawnSpecs.length !== spawnCount
    || spawnSpecs.some((item, index) => index > 0 && spawnSpecs[index - 1]!.slotId >= item.slotId)) {
    throw new RangeError('ArenaSupplyPresentation lifecycleContract spawnSpecs 必须精确为 3 且按 slotId 排序。');
  }
  const usedDefinitions = [...new Set(spawnSpecs.map(({ equipmentDefinitionId }) => (
    equipmentDefinitionId
  )))].sort();
  if (usedDefinitions.length !== equipmentDefinitionIds.length
    || usedDefinitions.some((item, index) => item !== equipmentDefinitionIds[index])) {
    throw new RangeError('ArenaSupplyPresentation lifecycleContract equipment Definition 集合不闭合。');
  }
  return Object.freeze({
    supplyDefinitionId,
    firstSpawnTick,
    spawnIntervalTicks,
    spawnCount,
    lifetimeTicks,
    spawnSpecs: Object.freeze(spawnSpecs),
    equipmentDefinitionIds,
  });
}

function cloneLifecycleContract(
  value: unknown,
): DeepReadonly<ArenaPublicSupplyProjectionLifecycleContract> {
  return normalizeLifecycleContractFrozen(cloneFrozenData(
    value,
    'ArenaSupplyPresentationAdapterOptionsV1.lifecycleContract',
  ));
}

export function createArenaSupplyPresentationAdapterOptionsV1(
  value: unknown,
): ArenaSupplyPresentationAdapterOptionsV1 {
  const source = cloneExactRecord(value, OPTIONS_KEYS, 'ArenaSupplyPresentationAdapterOptionsV1');
  assertSchemaVersion(source, 'ArenaSupplyPresentationAdapterOptionsV1');
  if (source.ticksPerSecond !== ARENA_SUPPLY_PRESENTATION_TICKS_PER_SECOND) {
    throw new RangeError('ArenaSupplyPresentationAdapterOptionsV1.ticksPerSecond 必须是 60。');
  }
  if (source.recentEventCapacity !== ARENA_SUPPLY_PRESENTATION_RECENT_EVENT_CAPACITY) {
    throw new RangeError('ArenaSupplyPresentationAdapterOptionsV1.recentEventCapacity 必须是 64。');
  }
  return Object.freeze({
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    streamId: streamId(source.streamId, 'ArenaSupplyPresentationAdapterOptionsV1.streamId'),
    ticksPerSecond: ARENA_SUPPLY_PRESENTATION_TICKS_PER_SECOND,
    lifecycleContract: normalizeLifecycleContractFrozen(source.lifecycleContract),
    recentEventCapacity: ARENA_SUPPLY_PRESENTATION_RECENT_EVENT_CAPACITY,
  });
}

function normalizeEquipment(value: unknown): readonly DeepReadonly<ArenaEquipmentSnapshot>[] {
  const source = boundedArray(
    value,
    ARENA_SUPPLY_PRESENTATION_MAX_EQUIPMENT_ITEMS,
    'ArenaSupplyPresentationInput.equipment',
  );
  const ids = new Set<string>();
  return Object.freeze(source.map((candidate, index): DeepReadonly<ArenaEquipmentSnapshot> => {
    const name = `ArenaSupplyPresentationInput.equipment[${index}]`;
    const record = exactFrozenRecord(candidate, EQUIPMENT_KEYS, name);
    const instanceId = identifier(record.instanceId, `${name}.instanceId`);
    if (ids.has(instanceId)) throw new RangeError(`${name}.instanceId 重复。`);
    ids.add(instanceId);
    if (!KNOWN_EQUIPMENT_STATES.has(record.locationState)) {
      throw new RangeError(`${name}.locationState 不受支持。`);
    }
    if (record.schemaVersion !== ARENA_SUPPLY_PRESENTATION_EQUIPMENT_SNAPSHOT_SCHEMA_VERSION) {
      throw new RangeError(
        `${name}.schemaVersion 必须是 ${ARENA_SUPPLY_PRESENTATION_EQUIPMENT_SNAPSHOT_SCHEMA_VERSION}。`,
      );
    }
    return Object.freeze({
      schemaVersion: ARENA_SUPPLY_PRESENTATION_EQUIPMENT_SNAPSHOT_SCHEMA_VERSION,
      instanceId,
      definitionId: identifier(record.definitionId, `${name}.definitionId`),
      spawnId: identifier(record.spawnId, `${name}.spawnId`),
      locationState: record.locationState as string,
      ownerId: nullableIdentifier(record.ownerId, `${name}.ownerId`),
      position: record.position === null ? null : position(record.position, `${name}.position`),
      lastSafePosition: record.lastSafePosition === null
        ? null : position(record.lastSafePosition, `${name}.lastSafePosition`),
      cooldownRemainingTicks: safeInteger(
        record.cooldownRemainingTicks,
        `${name}.cooldownRemainingTicks`,
      ),
      revision: safeInteger(record.revision, `${name}.revision`),
    });
  }));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface FormalIdentity {
  readonly supplyId: string;
  readonly equipmentInstanceId: string;
  readonly spawnTick: number;
  readonly expireTick: number;
  readonly spec: DeepReadonly<ArenaPublicSupplyProjectionSpawnSpec>;
}

function formalIdentity(
  equipmentInstanceId: string,
  contract: DeepReadonly<ArenaPublicSupplyProjectionLifecycleContract>,
): FormalIdentity | null {
  const namespace = `${contract.supplyDefinitionId}:`;
  if (!equipmentInstanceId.startsWith(namespace)) return null;
  const pattern = new RegExp(
    `^${escapeRegExp(contract.supplyDefinitionId)}:wave-(\\d+):slot-([A-Za-z0-9._-]+):equipment$`,
  );
  const match = pattern.exec(equipmentInstanceId);
  const waveToken = match?.[1];
  const slotId = match?.[2];
  if (waveToken === undefined || slotId === undefined || String(Number(waveToken)) !== waveToken) {
    throw new RangeError(`ArenaSupplyPresentation formal equipment identity 无效：${equipmentInstanceId}。`);
  }
  const waveIndex = Number(waveToken);
  if (!Number.isSafeInteger(waveIndex) || waveIndex < 0) {
    throw new RangeError(`ArenaSupplyPresentation formal wave identity 无效：${equipmentInstanceId}。`);
  }
  const spec = contract.spawnSpecs.find((item) => item.slotId === slotId);
  if (spec === undefined) throw new RangeError(`ArenaSupplyPresentation formal slot 未注册：${slotId}。`);
  const supplyId = `${contract.supplyDefinitionId}:wave-${waveIndex}:slot-${slotId}`;
  const canonicalEquipmentInstanceId = `${supplyId}:equipment`;
  const spawnTick = contract.firstSpawnTick + contract.spawnIntervalTicks * waveIndex;
  const expireTick = spawnTick + contract.lifetimeTicks;
  if (canonicalEquipmentInstanceId !== equipmentInstanceId
    || !Number.isSafeInteger(spawnTick) || !Number.isSafeInteger(expireTick)) {
    throw new RangeError(`ArenaSupplyPresentation formal identity 不 canonical：${equipmentInstanceId}。`);
  }
  return Object.freeze({
    supplyId,
    equipmentInstanceId: canonicalEquipmentInstanceId,
    spawnTick,
    expireTick,
    spec,
  });
}

function normalizeProjectionItem(
  value: unknown,
  index: number,
  snapshotTick: number,
  equipmentById: ReadonlyMap<string, DeepReadonly<ArenaEquipmentSnapshot>>,
  contract: DeepReadonly<ArenaPublicSupplyProjectionLifecycleContract>,
): ArenaPublicSupplyProjectionItem {
  const name = `ArenaSupplyPresentationInput.activeSupplyProjection.supplies[${index}]`;
  const source = exactFrozenRecord(value, PROJECTION_ITEM_KEYS, name);
  if (source.schemaVersion !== ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION) {
    throw new RangeError(`${name}.schemaVersion 必须是 2。`);
  }
  const supplyDefinitionId = identifier(source.supplyDefinitionId, `${name}.supplyDefinitionId`);
  const supplyId = identifier(source.supplyId, `${name}.supplyId`);
  const slotId = identifier(source.slotId, `${name}.slotId`);
  const equipmentInstanceId = identifier(source.equipmentInstanceId, `${name}.equipmentInstanceId`);
  const equipmentDefinitionId = identifier(
    source.equipmentDefinitionId,
    `${name}.equipmentDefinitionId`,
  );
  const equipmentSpawnId = identifier(source.equipmentSpawnId, `${name}.equipmentSpawnId`);
  const spawnTick = safeInteger(source.spawnTick, `${name}.spawnTick`);
  const expireTick = safeInteger(source.expireTick, `${name}.expireTick`);
  const remainingTicks = safeInteger(source.remainingTicks, `${name}.remainingTicks`, 1);
  const spawnPosition = position(source.spawnPosition, `${name}.spawnPosition`);
  const currentPosition = position(source.position, `${name}.position`);
  const identity = formalIdentity(equipmentInstanceId, contract);
  if (identity === null || supplyDefinitionId !== contract.supplyDefinitionId
    || supplyId !== identity.supplyId || slotId !== identity.spec.slotId
    || equipmentDefinitionId !== identity.spec.equipmentDefinitionId
    || equipmentSpawnId !== identity.spec.spawnId
    || spawnTick !== identity.spawnTick || expireTick !== identity.expireTick
    || !samePosition(spawnPosition, identity.spec.position)
    || spawnTick > snapshotTick || expireTick <= snapshotTick
    || remainingTicks !== expireTick - snapshotTick) {
    throw new RangeError(`${name} 与冻结 lifecycle/snapshot identity 不一致。`);
  }
  const equipment = equipmentById.get(equipmentInstanceId);
  if (equipment === undefined || equipment.definitionId !== equipmentDefinitionId
    || equipment.spawnId !== equipmentSpawnId || !WORLD_EQUIPMENT_STATES.has(equipment.locationState)
    || equipment.ownerId !== null || equipment.position === null
    || !samePosition(currentPosition, equipment.position)) {
    throw new RangeError(`${name} 未唯一连接同 tick world equipment。`);
  }
  return Object.freeze({
    schemaVersion: ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION,
    supplyDefinitionId,
    supplyId,
    slotId,
    equipmentInstanceId,
    equipmentDefinitionId,
    equipmentSpawnId,
    spawnPosition,
    spawnTick,
    expireTick,
    remainingTicks,
    position: currentPosition,
  });
}

function normalizeActiveSupplyProjection(
  value: unknown,
  snapshotTick: number,
  snapshotEventSequence: number,
  equipment: readonly DeepReadonly<ArenaEquipmentSnapshot>[],
  contract: DeepReadonly<ArenaPublicSupplyProjectionLifecycleContract>,
): DeepReadonly<ArenaPublicSupplyProjection> {
  const name = 'ArenaSupplyPresentationInput.activeSupplyProjection';
  const source = exactFrozenRecord(value, PROJECTION_KEYS, name);
  if (source.schemaVersion !== ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION) {
    throw new RangeError(`${name}.schemaVersion 必须是 2。`);
  }
  if (safeInteger(source.snapshotTick, `${name}.snapshotTick`) !== snapshotTick
    || safeInteger(source.snapshotEventSequence, `${name}.snapshotEventSequence`)
      !== snapshotEventSequence) {
    throw new RangeError(`${name} 与 input post-frame identity 不一致。`);
  }
  const readiness = source.resyncReadiness;
  if (readiness !== ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.READY
    && readiness !== ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.NOT_READY_PRE_EXPIRY) {
    throw new RangeError(`${name}.resyncReadiness 不受支持。`);
  }
  const pendingAuthorityTick = nullableSafeInteger(
    source.pendingAuthorityTick,
    `${name}.pendingAuthorityTick`,
  );
  const pendingExpiryEquipmentInstanceIds = sortedUniqueStrings(
    source.pendingExpiryEquipmentInstanceIds,
    ARENA_SUPPLY_PRESENTATION_MAX_MARKERS,
    `${name}.pendingExpiryEquipmentInstanceIds`,
  );
  const equipmentById = new Map(equipment.map((item) => [item.instanceId, item]));
  const supplies = boundedArray(
    source.supplies,
    ARENA_SUPPLY_PRESENTATION_MAX_MARKERS,
    `${name}.supplies`,
  ).map((item, index) => normalizeProjectionItem(
    item,
    index,
    snapshotTick,
    equipmentById,
    contract,
  ));
  if (supplies.some((item, index) => index > 0 && supplies[index - 1]!.supplyId >= item.supplyId)
    || new Set(supplies.map(({ equipmentInstanceId }) => equipmentInstanceId)).size
      !== supplies.length) {
    throw new RangeError(`${name}.supplies 必须按 supplyId 唯一排序。`);
  }
  const expectedActive = new Set<string>();
  const expectedPending = new Set<string>();
  for (const item of equipment) {
    const identity = formalIdentity(item.instanceId, contract);
    if (identity === null) continue;
    if (item.definitionId !== identity.spec.equipmentDefinitionId
      || item.spawnId !== identity.spec.spawnId || snapshotTick < identity.spawnTick) {
      throw new RangeError(`${name} formal equipment 与 lifecycle contract 不一致。`);
    }
    if (!WORLD_EQUIPMENT_STATES.has(item.locationState)) continue;
    if (item.ownerId !== null || item.position === null || snapshotTick > identity.expireTick) {
      throw new RangeError(`${name} formal world equipment 生命周期无效。`);
    }
    (snapshotTick === identity.expireTick ? expectedPending : expectedActive).add(item.instanceId);
  }
  const projectedIds = new Set(supplies.map(({ equipmentInstanceId }) => equipmentInstanceId));
  const pendingIds = new Set(pendingExpiryEquipmentInstanceIds);
  if (readiness === ARENA_PUBLIC_SUPPLY_PROJECTION_READINESS.READY) {
    if (pendingAuthorityTick !== null || pendingIds.size !== 0 || expectedPending.size !== 0
      || projectedIds.size !== expectedActive.size
      || [...expectedActive].some((id) => !projectedIds.has(id))) {
      throw new RangeError(`${name} ready projection 与完整 active identity 不一致。`);
    }
  } else if (pendingAuthorityTick !== snapshotTick || supplies.length !== 0
    || pendingIds.size === 0 || pendingIds.size !== expectedPending.size
    || [...expectedPending].some((id) => !pendingIds.has(id))) {
    throw new RangeError(`${name} not-ready projection 与 pending expiry identity 不一致。`);
  }
  return Object.freeze({
    schemaVersion: ARENA_PUBLIC_SUPPLY_PROJECTION_SCHEMA_VERSION,
    snapshotTick,
    snapshotEventSequence,
    resyncReadiness: readiness,
    pendingAuthorityTick,
    pendingExpiryEquipmentInstanceIds,
    supplies: Object.freeze(supplies),
  });
}

interface EventEnvelope {
  readonly id: string;
  readonly sequence: number;
  readonly tick: number;
  readonly type: string;
}

interface SupplyEventIdentity {
  readonly supplyDefinitionId: string;
  readonly supplyId: string;
  readonly equipmentInstanceId: string;
  readonly spawnTick: number;
  readonly expireTick: number;
  readonly tick: number;
}

function supplyEventIdentity(
  source: PlainRecord,
  name: string,
  requireBeforeExpiry: boolean,
): SupplyEventIdentity {
  if (source.schemaVersion !== EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION) {
    throw new RangeError(
      `${name}.schemaVersion 必须是 ${EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION}。`,
    );
  }
  const spawnTick = safeInteger(source.spawnTick, `${name}.spawnTick`);
  const expireTick = safeInteger(source.expireTick, `${name}.expireTick`);
  const tick = safeInteger(source.tick, `${name}.tick`);
  if (expireTick <= spawnTick
    || tick < spawnTick
    || (requireBeforeExpiry ? tick >= expireTick : tick !== expireTick)) {
    throw new RangeError(`${name} lifecycle tick 边界无效。`);
  }
  return Object.freeze({
    supplyDefinitionId: identifier(source.supplyDefinitionId, `${name}.supplyDefinitionId`),
    supplyId: identifier(source.supplyId, `${name}.supplyId`),
    equipmentInstanceId: identifier(
      source.equipmentInstanceId,
      `${name}.equipmentInstanceId`,
    ),
    spawnTick,
    expireTick,
    tick,
  });
}

function normalizeSpawnedPayloadFrozen(value: unknown): EquipmentSpawnedEventPayload {
  const name = 'EquipmentSpawnedEventPayload';
  const source = exactFrozenRecord(value, SPAWNED_PAYLOAD_KEYS, name);
  const identity = supplyEventIdentity(source, name, true);
  if (identity.tick !== identity.spawnTick) {
    throw new RangeError(`${name}.tick 必须等于 spawnTick。`);
  }
  return Object.freeze({
    schemaVersion: EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION,
    ...identity,
    equipmentDefinitionId: identifier(
      source.equipmentDefinitionId,
      `${name}.equipmentDefinitionId`,
    ),
    spawnId: identifier(source.spawnId, `${name}.spawnId`),
    position: position(source.position, `${name}.position`),
  });
}

function normalizeReplacedPayloadFrozen(value: unknown): EquipmentReplacedEventPayload {
  const name = 'EquipmentReplacedEventPayload';
  const source = exactFrozenRecord(value, REPLACED_PAYLOAD_KEYS, name);
  const identity = supplyEventIdentity(source, name, true);
  const previousEquipmentInstanceId = identifier(
    source.previousEquipmentInstanceId,
    `${name}.previousEquipmentInstanceId`,
  );
  const nextEquipmentInstanceId = identifier(
    source.nextEquipmentInstanceId,
    `${name}.nextEquipmentInstanceId`,
  );
  if (nextEquipmentInstanceId !== identity.equipmentInstanceId
    || previousEquipmentInstanceId === nextEquipmentInstanceId) {
    throw new RangeError(`${name} previous/next equipment identity 无效。`);
  }
  return Object.freeze({
    schemaVersion: EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION,
    ...identity,
    participantId: identifier(source.participantId, `${name}.participantId`),
    previousEquipmentInstanceId,
    nextEquipmentInstanceId,
  });
}

function normalizeRecycledPayloadFrozen(value: unknown): EquipmentRecycledEventPayload {
  const name = 'EquipmentRecycledEventPayload';
  const source = exactFrozenRecord(value, RECYCLED_PAYLOAD_KEYS, name);
  const identity = supplyEventIdentity(source, name, true);
  const recycledEquipmentInstanceId = identifier(
    source.recycledEquipmentInstanceId,
    `${name}.recycledEquipmentInstanceId`,
  );
  const replacementEquipmentInstanceId = identifier(
    source.replacementEquipmentInstanceId,
    `${name}.replacementEquipmentInstanceId`,
  );
  if (source.reason !== EQUIPMENT_RECYCLE_REASON.REPLACED
    || replacementEquipmentInstanceId !== identity.equipmentInstanceId
    || recycledEquipmentInstanceId === replacementEquipmentInstanceId) {
    throw new RangeError(`${name} replacement identity/reason 无效。`);
  }
  return Object.freeze({
    schemaVersion: EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION,
    ...identity,
    participantId: identifier(source.participantId, `${name}.participantId`),
    recycledEquipmentInstanceId,
    replacementEquipmentInstanceId,
    reason: EQUIPMENT_RECYCLE_REASON.REPLACED,
  });
}

function normalizeExpiredPayloadFrozen(value: unknown): EquipmentExpiredEventPayload {
  const name = 'EquipmentExpiredEventPayload';
  const source = exactFrozenRecord(value, EXPIRED_PAYLOAD_KEYS, name);
  const identity = supplyEventIdentity(source, name, false);
  const expiredEquipmentInstanceId = identifier(
    source.expiredEquipmentInstanceId,
    `${name}.expiredEquipmentInstanceId`,
  );
  if (source.reason !== EQUIPMENT_EXPIRY_REASON.LIFETIME_EXPIRED
    || expiredEquipmentInstanceId !== identity.equipmentInstanceId) {
    throw new RangeError(`${name} expiry identity/reason 无效。`);
  }
  return Object.freeze({
    schemaVersion: EQUIPMENT_SUPPLY_EVENT_PAYLOAD_SCHEMA_VERSION,
    ...identity,
    expiredEquipmentInstanceId,
    reason: EQUIPMENT_EXPIRY_REASON.LIFETIME_EXPIRED,
  });
}

function eventEnvelope(source: PlainRecord, name: string): EventEnvelope {
  return Object.freeze({
    id: identifier(source.id, `${name}.id`),
    sequence: safeInteger(source.sequence, `${name}.sequence`),
    tick: safeInteger(source.tick, `${name}.tick`),
    type: identifier(source.type, `${name}.type`),
  });
}

function normalizeEventFrozen(value: unknown): ArenaSupplyPresentationEventV1 {
  const source = assertPlainRecord(value, 'ArenaSupplyPresentationEventV1');
  for (const key of EVENT_ENVELOPE_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`ArenaSupplyPresentationEventV1 缺少字段 ${key}。`);
    }
  }
  const envelope = eventEnvelope(source, 'ArenaSupplyPresentationEventV1');
  if (!REGISTERED_EVENT_TYPES.has(envelope.type)) {
    throw new RangeError(`ArenaSupplyPresentationEventV1.type 未登记：${envelope.type}。`);
  }
  if (envelope.type === ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED) {
    if (Object.hasOwn(source, 'payload')) {
      exactFrozenRecord(source, STRICT_EVENT_KEYS, 'ArenaSupplyPresentation EquipmentSpawned');
      const payload = normalizeSpawnedPayloadFrozen(source.payload);
      if (payload.tick !== envelope.tick) {
        throw new RangeError('EquipmentSpawned envelope/payload tick 不一致。');
      }
      return Object.freeze({ ...envelope, type: ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED, payload });
    }
    exactFrozenRecord(source, ORDINARY_SPAWN_KEYS, 'ArenaSupplyPresentation ordinary Spawn');
    return Object.freeze({
      ...envelope,
      type: ARENA_MATCH_EVENT.EQUIPMENT_SPAWNED,
      equipmentInstanceId: identifier(
        source.equipmentInstanceId,
        'ArenaSupplyPresentation ordinary Spawn.equipmentInstanceId',
      ),
      equipmentDefinitionId: identifier(
        source.equipmentDefinitionId,
        'ArenaSupplyPresentation ordinary Spawn.equipmentDefinitionId',
      ),
      spawnId: identifier(source.spawnId, 'ArenaSupplyPresentation ordinary Spawn.spawnId'),
      position: position(source.position, 'ArenaSupplyPresentation ordinary Spawn.position'),
    });
  }
  if (envelope.type === ARENA_MATCH_EVENT.EQUIPMENT_PICKED_UP) {
    exactFrozenRecord(source, ORDINARY_PICKUP_KEYS, 'ArenaSupplyPresentation Pickup');
    return Object.freeze({
      ...envelope,
      type: ARENA_MATCH_EVENT.EQUIPMENT_PICKED_UP,
      participantId: identifier(source.participantId, 'ArenaSupplyPresentation Pickup.participantId'),
      equipmentInstanceId: identifier(
        source.equipmentInstanceId,
        'ArenaSupplyPresentation Pickup.equipmentInstanceId',
      ),
      equipmentDefinitionId: identifier(
        source.equipmentDefinitionId,
        'ArenaSupplyPresentation Pickup.equipmentDefinitionId',
      ),
    });
  }
  if (envelope.type === ARENA_MATCH_EVENT.EQUIPMENT_RECYCLED
    || envelope.type === ARENA_MATCH_EVENT.EQUIPMENT_REPLACED
    || envelope.type === ARENA_MATCH_EVENT.EQUIPMENT_EXPIRED) {
    exactFrozenRecord(source, STRICT_EVENT_KEYS, `ArenaSupplyPresentation ${envelope.type}`);
    const payload = envelope.type === ARENA_MATCH_EVENT.EQUIPMENT_RECYCLED
      ? normalizeRecycledPayloadFrozen(source.payload)
      : envelope.type === ARENA_MATCH_EVENT.EQUIPMENT_REPLACED
        ? normalizeReplacedPayloadFrozen(source.payload)
        : normalizeExpiredPayloadFrozen(source.payload);
    if (payload.tick !== envelope.tick) {
      throw new RangeError(`${envelope.type} envelope/payload tick 不一致。`);
    }
    return Object.freeze({ ...envelope, type: envelope.type, payload }) as
      ArenaSupplyPresentationEquipmentEventV1;
  }
  return source as ArenaSupplyPresentationAuthorityEventV1;
}

export function createArenaSupplyPresentationEventV1(
  value: unknown,
): ArenaSupplyPresentationEventV1 {
  return normalizeEventFrozen(cloneFrozenData(value, 'ArenaSupplyPresentationEventV1'));
}

export function createArenaSupplyPresentationEventCanonicalHashV1(value: unknown): string {
  const event = createArenaSupplyPresentationEventV1(value);
  return createDeterministicDataHash(event, `ArenaSupplyPresentationEventV1 ${event.id}`);
}

function normalizeInputBaseFrozen(
  source: PlainRecord,
  name: string,
  lifecycleContract: DeepReadonly<ArenaPublicSupplyProjectionLifecycleContract>,
): ArenaSupplyPresentationStartInputV1 {
  assertSchemaVersion(source, name);
  const snapshotTick = safeInteger(source.snapshotTick, `${name}.snapshotTick`);
  const snapshotEventSequence = safeInteger(
    source.snapshotEventSequence,
    `${name}.snapshotEventSequence`,
  );
  const equipment = normalizeEquipment(source.equipment);
  const activeSupplyProjection = normalizeActiveSupplyProjection(
    source.activeSupplyProjection,
    snapshotTick,
    snapshotEventSequence,
    equipment,
    lifecycleContract,
  );
  return Object.freeze({
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    snapshotTick,
    snapshotEventSequence,
    equipment,
    activeSupplyProjection,
  });
}

export function createArenaSupplyPresentationStartInputV1(
  value: unknown,
  lifecycleContract: unknown,
): ArenaSupplyPresentationStartInputV1 {
  const source = cloneExactRecord(
    value, START_KEYS, 'ArenaSupplyPresentationStartInputV1',
  );
  return normalizeInputBaseFrozen(
    source,
    'ArenaSupplyPresentationStartInputV1',
    cloneLifecycleContract(lifecycleContract),
  );
}

export function createArenaSupplyPresentationUpdateInputV1(
  value: unknown,
  lifecycleContract: unknown,
): ArenaSupplyPresentationUpdateInputV1 {
  const source = cloneExactRecord(
    value,
    UPDATE_KEYS,
    'ArenaSupplyPresentationUpdateInputV1',
  );
  const base = normalizeInputBaseFrozen(
    source,
    'ArenaSupplyPresentationUpdateInputV1',
    cloneLifecycleContract(lifecycleContract),
  );
  const events = boundedArray(
    source.events,
    ARENA_SUPPLY_PRESENTATION_MAX_RESYNC_EVENTS_PER_UPDATE,
    'ArenaSupplyPresentationUpdateInputV1.events',
  ).map(normalizeEventFrozen);
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]!;
    if (event.tick > base.snapshotTick || event.sequence >= base.snapshotEventSequence) {
      throw new RangeError('ArenaSupplyPresentationUpdateInputV1 event 超出 post-frame 边界。');
    }
    if (index > 0 && events[index - 1]!.sequence > event.sequence) {
      throw new RangeError('ArenaSupplyPresentationUpdateInputV1.events sequence 必须单调不减。');
    }
  }
  return Object.freeze({ ...base, events: Object.freeze(events) });
}

export function createArenaSupplyPresentationDebugSnapshotV1(
  value: unknown,
): ArenaSupplyPresentationDebugSnapshotV1 {
  const source = cloneExactRecord(value, DEBUG_KEYS, 'ArenaSupplyPresentationDebugSnapshotV1');
  assertSchemaVersion(source, 'ArenaSupplyPresentationDebugSnapshotV1');
  if (!LIFECYCLE_STATES.has(source.lifecycleState)) {
    throw new RangeError('ArenaSupplyPresentationDebugSnapshotV1.lifecycleState 不受支持。');
  }
  const lifecycleState = source.lifecycleState as ArenaSupplyPresentationLifecycleStateV1;
  const snapshotTick = nullableSafeInteger(
    source.snapshotTick,
    'ArenaSupplyPresentationDebugSnapshotV1.snapshotTick',
  );
  const nextExpectedEventSequence = nullableSafeInteger(
    source.nextExpectedEventSequence,
    'ArenaSupplyPresentationDebugSnapshotV1.nextExpectedEventSequence',
  );
  const markerCount = safeInteger(source.markerCount, 'ArenaSupplyPresentationDebugSnapshotV1.markerCount');
  const pendingReplacementPairCount = safeInteger(
    source.pendingReplacementPairCount,
    'ArenaSupplyPresentationDebugSnapshotV1.pendingReplacementPairCount',
  );
  const recentEventHashCount = safeInteger(
    source.recentEventHashCount,
    'ArenaSupplyPresentationDebugSnapshotV1.recentEventHashCount',
  );
  const acceptedEventCount = safeInteger(
    source.acceptedEventCount,
    'ArenaSupplyPresentationDebugSnapshotV1.acceptedEventCount',
  );
  const duplicateEventCount = safeInteger(
    source.duplicateEventCount,
    'ArenaSupplyPresentationDebugSnapshotV1.duplicateEventCount',
  );
  const resyncCount = safeInteger(source.resyncCount, 'ArenaSupplyPresentationDebugSnapshotV1.resyncCount');
  if (markerCount > ARENA_SUPPLY_PRESENTATION_MAX_MARKERS
    || pendingReplacementPairCount > ARENA_SUPPLY_PRESENTATION_MAX_PENDING_REPLACEMENT_PAIRS
    || recentEventHashCount > ARENA_SUPPLY_PRESENTATION_RECENT_EVENT_CAPACITY) {
    throw new RangeError('ArenaSupplyPresentationDebugSnapshotV1 有界资源计数超限。');
  }
  const terminalFailureKind = source.terminalFailureKind === null
    ? null
    : source.terminalFailureKind as ArenaSupplyPresentationTerminalFailureKindV1;
  if (terminalFailureKind !== null && !TERMINAL_FAILURE_KINDS.has(terminalFailureKind)) {
    throw new RangeError('ArenaSupplyPresentationDebugSnapshotV1.terminalFailureKind 不受支持。');
  }
  const hasWaterline = snapshotTick !== null || nextExpectedEventSequence !== null;
  if (hasWaterline && (snapshotTick === null || nextExpectedEventSequence === null)) {
    throw new RangeError('ArenaSupplyPresentationDebugSnapshotV1 snapshot/sequence 必须同时为 null 或整数。');
  }
  if ((lifecycleState === ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.CREATED
      || lifecycleState === ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.DESTROYED)
    && hasWaterline) {
    throw new RangeError(`${lifecycleState} debug 不得保留 snapshot/sequence waterline。`);
  }
  if ((lifecycleState === ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.ACTIVE
      || lifecycleState === ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.RESYNC_REQUIRED)
    && (!hasWaterline || terminalFailureKind !== null)) {
    throw new RangeError(`${lifecycleState} debug identity 无效。`);
  }
  if (lifecycleState === ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.FAILED
    && terminalFailureKind === null) {
    throw new RangeError('failed debug 必须包含稳定 terminalFailureKind。');
  }
  if (lifecycleState !== ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.FAILED
    && lifecycleState !== ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.DESTROYED
    && terminalFailureKind !== null) {
    throw new RangeError(`${lifecycleState} debug 不得携带 terminalFailureKind。`);
  }
  if (lifecycleState === ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.CREATED
    || lifecycleState === ARENA_SUPPLY_PRESENTATION_LIFECYCLE_STATE_V1.DESTROYED) {
    if ([markerCount, pendingReplacementPairCount, recentEventHashCount, acceptedEventCount,
      duplicateEventCount, resyncCount].some((count) => count !== 0)) {
      throw new RangeError(`${lifecycleState} debug 所有计数必须清零。`);
    }
  }
  return Object.freeze({
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    streamId: streamId(source.streamId, 'ArenaSupplyPresentationDebugSnapshotV1.streamId'),
    lifecycleState,
    snapshotTick,
    nextExpectedEventSequence,
    markerCount,
    pendingReplacementPairCount,
    recentEventHashCount,
    acceptedEventCount,
    duplicateEventCount,
    resyncCount,
    terminalFailureKind,
  });
}
