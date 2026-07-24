import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from './definition-utils.js';
import type { DeepReadonly, PlainRecord } from './definition-utils.js';

export interface ArenaVector3Snapshot {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface ArenaVector2Snapshot {
  readonly x: number;
  readonly z: number;
}

export interface ArenaActionSnapshot {
  readonly definitionId: string | null;
  readonly phase: string;
  readonly ticksRemaining: number;
}

export interface ArenaMovementSnapshot {
  readonly schemaVersion: number;
  readonly participantId: string;
  readonly characterDefinitionId: string;
  readonly mode: string;
  readonly coyoteTicksRemaining: number;
  readonly jumpBufferTicksRemaining: number;
  readonly airJumpsUsed: number;
  readonly crouchChargeTicks: number;
  readonly crouchActionId: string | null;
  readonly downSmashActionId: string | null;
  readonly revision: number;
  readonly grounded: boolean;
}

export interface ArenaHeldEquipmentSnapshot {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly cooldownRemainingTicks: number;
}

export interface ArenaParticipantSnapshot {
  readonly id: string;
  readonly characterDefinitionId: string;
  readonly status: string;
  readonly lives: number;
  readonly eliminations: number;
  readonly deaths: number;
  readonly hitstunTicks: number;
  readonly invulnerableTicks: number;
  readonly respawnTicks: number;
  readonly lastHitBy: string | null;
  readonly lastHitTick: number;
  readonly action: ArenaActionSnapshot;
  readonly actionRule: DeepReadonly<unknown>;
  readonly movement: ArenaMovementSnapshot;
  readonly actionAffordance?: DeepReadonly<unknown>;
  readonly equipment: ArenaHeldEquipmentSnapshot | null;
  readonly position: ArenaVector3Snapshot;
  readonly velocity: ArenaVector3Snapshot;
  readonly facing: ArenaVector2Snapshot;
  readonly grounded: boolean;
  readonly supportSurfaceId: string | null;
}

export interface ArenaEquipmentSnapshot {
  readonly schemaVersion: number;
  readonly instanceId: string;
  readonly definitionId: string;
  readonly spawnId: string;
  readonly locationState: string;
  readonly ownerId: string | null;
  readonly position: ArenaVector3Snapshot | null;
  readonly lastSafePosition: ArenaVector3Snapshot | null;
  readonly cooldownRemainingTicks: number;
  readonly revision: number;
}

export interface ArenaMapSurfaceSnapshot {
  readonly id: string;
  readonly enabled: boolean;
  readonly revision: number;
}

export interface ArenaMapOccurrenceSnapshot {
  readonly occurrenceId: string;
  readonly eventId: string;
  readonly kind: string;
  readonly warningTick: number;
  readonly startTick: number;
  readonly endTick: number | null;
  readonly phase: string;
  readonly publicPayload: DeepReadonly<unknown>;
  readonly privatePlan?: DeepReadonly<unknown>;
  readonly revision: number;
}

export interface ArenaMapSnapshot {
  readonly schemaVersion: number;
  readonly definitionId: string;
  readonly nextActiveTick: number;
  readonly revision: number;
  readonly surfaces: readonly ArenaMapSurfaceSnapshot[];
  readonly occurrences: readonly ArenaMapOccurrenceSnapshot[];
}

export interface ArenaMatchResultSnapshot {
  readonly winnerId: string | null;
  readonly reason: string;
  readonly isDraw: boolean;
  readonly endedAtTick: number;
}

export interface ArenaMatchSnapshot {
  readonly schemaVersion: number;
  readonly physicsBackendVersion: string;
  readonly configHash: string;
  readonly ruleContentHash: string;
  readonly matchSeed: number;
  readonly tick: number;
  readonly activeTick: number;
  readonly phase: string;
  readonly remainingTicks: number;
  readonly eventSequence: number;
  readonly participants: readonly ArenaParticipantSnapshot[];
  readonly equipment: readonly ArenaEquipmentSnapshot[];
  readonly map: ArenaMapSnapshot;
  readonly result: ArenaMatchResultSnapshot | null;
  readonly rngStates?: Readonly<Record<string, number>>;
}

export interface ArenaMatchSnapshotAuditOptions {
  readonly includeInternal?: boolean;
}

const PUBLIC_SNAPSHOT_KEYS = new Set([
  'schemaVersion', 'physicsBackendVersion', 'configHash', 'ruleContentHash', 'matchSeed',
  'tick', 'activeTick', 'phase', 'remainingTicks', 'eventSequence', 'participants',
  'equipment', 'map', 'result',
]);
const INTERNAL_SNAPSHOT_KEYS = new Set([...PUBLIC_SNAPSHOT_KEYS, 'rngStates']);
const PUBLIC_PARTICIPANT_KEYS = new Set([
  'id', 'characterDefinitionId', 'status', 'lives', 'eliminations', 'deaths',
  'hitstunTicks', 'invulnerableTicks', 'respawnTicks', 'lastHitBy', 'lastHitTick',
  'action', 'actionRule', 'movement', 'actionAffordance', 'equipment', 'position',
  'velocity', 'facing', 'grounded', 'supportSurfaceId',
]);
const INTERNAL_PARTICIPANT_KEYS = new Set(
  [...PUBLIC_PARTICIPANT_KEYS].filter((key) => key !== 'actionAffordance'),
);
const ACTION_KEYS = new Set(['definitionId', 'phase', 'ticksRemaining']);
const MOVEMENT_KEYS = new Set([
  'schemaVersion', 'participantId', 'characterDefinitionId', 'mode',
  'coyoteTicksRemaining', 'jumpBufferTicksRemaining', 'airJumpsUsed',
  'crouchChargeTicks', 'crouchActionId', 'downSmashActionId', 'revision', 'grounded',
]);
const HELD_EQUIPMENT_KEYS = new Set(['instanceId', 'definitionId', 'cooldownRemainingTicks']);
const EQUIPMENT_KEYS = new Set([
  'schemaVersion', 'instanceId', 'definitionId', 'spawnId', 'locationState', 'ownerId',
  'position', 'lastSafePosition', 'cooldownRemainingTicks', 'revision',
]);
const MAP_KEYS = new Set([
  'schemaVersion', 'definitionId', 'nextActiveTick', 'revision', 'surfaces', 'occurrences',
]);
const SURFACE_KEYS = new Set(['id', 'enabled', 'revision']);
const PUBLIC_OCCURRENCE_KEYS = new Set([
  'occurrenceId', 'eventId', 'kind', 'warningTick', 'startTick', 'endTick', 'phase',
  'publicPayload', 'revision',
]);
const INTERNAL_OCCURRENCE_KEYS = new Set([...PUBLIC_OCCURRENCE_KEYS, 'privatePlan']);
const RESULT_KEYS = new Set(['winnerId', 'reason', 'isDraw', 'endedAtTick']);
const VECTOR3_KEYS = new Set(['x', 'y', 'z']);
const VECTOR2_KEYS = new Set(['x', 'z']);

function finite(value: unknown, name: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`${name} 必须是有限数。`);
  return value as number;
}

function nullableIdentifier(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

function vector3(value: unknown, name: string): void {
  assertKnownKeys(value, VECTOR3_KEYS, name);
  finite(value.x, `${name}.x`);
  finite(value.y, `${name}.y`);
  finite(value.z, `${name}.z`);
}

function vector2(value: unknown, name: string): void {
  assertKnownKeys(value, VECTOR2_KEYS, name);
  finite(value.x, `${name}.x`);
  finite(value.z, `${name}.z`);
}

function uniqueIdentifier(record: PlainRecord, key: string, values: Set<string>, name: string): string {
  const id = assertNonEmptyString(record[key], `${name}.${key}`);
  if (values.has(id)) throw new RangeError(`${name}.${key} 重复 ${id}。`);
  values.add(id);
  return id;
}

function auditParticipant(value: unknown, index: number, includeInternal: boolean, ids: Set<string>): void {
  const name = `ArenaMatchSnapshot.participants[${index}]`;
  assertKnownKeys(value, includeInternal ? INTERNAL_PARTICIPANT_KEYS : PUBLIC_PARTICIPANT_KEYS, name);
  const id = uniqueIdentifier(value, 'id', ids, name);
  assertNonEmptyString(value.characterDefinitionId, `${name}.characterDefinitionId`);
  assertNonEmptyString(value.status, `${name}.status`);
  for (const key of [
    'lives', 'eliminations', 'deaths', 'hitstunTicks', 'invulnerableTicks',
    'respawnTicks', 'lastHitTick',
  ]) assertIntegerAtLeast(value[key], key === 'lastHitTick' ? -1 : 0, `${name}.${key}`);
  nullableIdentifier(value.lastHitBy, `${name}.lastHitBy`);
  if (!Object.prototype.hasOwnProperty.call(value, 'actionRule')) {
    throw new TypeError(`${name} 缺少 actionRule。`);
  }

  assertKnownKeys(value.action, ACTION_KEYS, `${name}.action`);
  nullableIdentifier(value.action.definitionId, `${name}.action.definitionId`);
  assertNonEmptyString(value.action.phase, `${name}.action.phase`);
  assertIntegerAtLeast(value.action.ticksRemaining, 0, `${name}.action.ticksRemaining`);

  assertKnownKeys(value.movement, MOVEMENT_KEYS, `${name}.movement`);
  if (value.movement.participantId !== id) {
    throw new RangeError(`${name}.movement.participantId 与 participant id 不一致。`);
  }
  if (value.movement.characterDefinitionId !== value.characterDefinitionId) {
    throw new RangeError(`${name}.movement.characterDefinitionId 与 participant 不一致。`);
  }
  assertNonEmptyString(value.movement.mode, `${name}.movement.mode`);
  for (const key of [
    'schemaVersion', 'coyoteTicksRemaining', 'jumpBufferTicksRemaining', 'airJumpsUsed',
    'crouchChargeTicks', 'revision',
  ]) assertIntegerAtLeast(value.movement[key], key === 'schemaVersion' ? 1 : 0, `${name}.movement.${key}`);
  nullableIdentifier(value.movement.crouchActionId, `${name}.movement.crouchActionId`);
  nullableIdentifier(value.movement.downSmashActionId, `${name}.movement.downSmashActionId`);
  if (typeof value.movement.grounded !== 'boolean' || value.movement.grounded !== value.grounded) {
    throw new RangeError(`${name}.movement.grounded 必须与 participant grounded 一致。`);
  }

  if (!includeInternal && !Object.prototype.hasOwnProperty.call(value, 'actionAffordance')) {
    throw new TypeError(`${name} 缺少 actionAffordance。`);
  }
  if (value.equipment !== null) {
    assertKnownKeys(value.equipment, HELD_EQUIPMENT_KEYS, `${name}.equipment`);
    assertNonEmptyString(value.equipment.instanceId, `${name}.equipment.instanceId`);
    assertNonEmptyString(value.equipment.definitionId, `${name}.equipment.definitionId`);
    assertIntegerAtLeast(
      value.equipment.cooldownRemainingTicks,
      0,
      `${name}.equipment.cooldownRemainingTicks`,
    );
  }
  vector3(value.position, `${name}.position`);
  vector3(value.velocity, `${name}.velocity`);
  vector2(value.facing, `${name}.facing`);
  if (typeof value.grounded !== 'boolean') throw new TypeError(`${name}.grounded 必须是布尔值。`);
  nullableIdentifier(value.supportSurfaceId, `${name}.supportSurfaceId`);
}

function auditEquipment(value: unknown, index: number, ids: Set<string>): void {
  const name = `ArenaMatchSnapshot.equipment[${index}]`;
  assertKnownKeys(value, EQUIPMENT_KEYS, name);
  assertIntegerAtLeast(value.schemaVersion, 1, `${name}.schemaVersion`);
  uniqueIdentifier(value, 'instanceId', ids, name);
  assertNonEmptyString(value.definitionId, `${name}.definitionId`);
  assertNonEmptyString(value.spawnId, `${name}.spawnId`);
  assertNonEmptyString(value.locationState, `${name}.locationState`);
  nullableIdentifier(value.ownerId, `${name}.ownerId`);
  if (value.position !== null) vector3(value.position, `${name}.position`);
  if (value.lastSafePosition !== null) vector3(value.lastSafePosition, `${name}.lastSafePosition`);
  assertIntegerAtLeast(value.cooldownRemainingTicks, 0, `${name}.cooldownRemainingTicks`);
  assertIntegerAtLeast(value.revision, 0, `${name}.revision`);
}

function auditMap(value: unknown, includeInternal: boolean): void {
  const name = 'ArenaMatchSnapshot.map';
  assertKnownKeys(value, MAP_KEYS, name);
  assertIntegerAtLeast(value.schemaVersion, 1, `${name}.schemaVersion`);
  assertNonEmptyString(value.definitionId, `${name}.definitionId`);
  assertIntegerAtLeast(value.nextActiveTick, 0, `${name}.nextActiveTick`);
  assertIntegerAtLeast(value.revision, 0, `${name}.revision`);
  if (!Array.isArray(value.surfaces) || !Array.isArray(value.occurrences)) {
    throw new TypeError(`${name}.surfaces/occurrences 必须是数组。`);
  }
  const surfaceIds = new Set<string>();
  value.surfaces.forEach((surface, index) => {
    const surfaceName = `${name}.surfaces[${index}]`;
    assertKnownKeys(surface, SURFACE_KEYS, surfaceName);
    uniqueIdentifier(surface, 'id', surfaceIds, surfaceName);
    if (typeof surface.enabled !== 'boolean') {
      throw new TypeError(`${surfaceName}.enabled 必须是布尔值。`);
    }
    assertIntegerAtLeast(surface.revision, 0, `${surfaceName}.revision`);
  });
  const occurrenceIds = new Set<string>();
  value.occurrences.forEach((occurrence, index) => {
    const occurrenceName = `${name}.occurrences[${index}]`;
    assertKnownKeys(
      occurrence,
      includeInternal ? INTERNAL_OCCURRENCE_KEYS : PUBLIC_OCCURRENCE_KEYS,
      occurrenceName,
    );
    uniqueIdentifier(occurrence, 'occurrenceId', occurrenceIds, occurrenceName);
    assertNonEmptyString(occurrence.eventId, `${occurrenceName}.eventId`);
    assertNonEmptyString(occurrence.kind, `${occurrenceName}.kind`);
    assertNonEmptyString(occurrence.phase, `${occurrenceName}.phase`);
    const warningTick = assertIntegerAtLeast(occurrence.warningTick, 0, `${occurrenceName}.warningTick`);
    const startTick = assertIntegerAtLeast(occurrence.startTick, 0, `${occurrenceName}.startTick`);
    const endTick = occurrence.endTick === null
      ? null
      : assertIntegerAtLeast(occurrence.endTick, 0, `${occurrenceName}.endTick`);
    if (warningTick > startTick || (endTick !== null && endTick <= startTick)) {
      throw new RangeError(`${occurrenceName} 的 warning/start/end tick 顺序无效。`);
    }
    assertIntegerAtLeast(occurrence.revision, 0, `${occurrenceName}.revision`);
    if (!Object.prototype.hasOwnProperty.call(occurrence, 'publicPayload')) {
      throw new TypeError(`${occurrenceName} 缺少 publicPayload。`);
    }
    if (includeInternal && !Object.prototype.hasOwnProperty.call(occurrence, 'privatePlan')) {
      throw new TypeError(`${occurrenceName} 缺少 privatePlan。`);
    }
  });
}

/**
 * Expensive, explicit boundary audit for tooling, fixtures and migrations.
 * MatchCore must not call this on every tick; the authority owns its snapshot
 * construction and G3 will consume the static types directly.
 */
export function createArenaMatchSnapshotAudit(
  value: unknown,
  { includeInternal = false }: ArenaMatchSnapshotAuditOptions = {},
): DeepReadonly<ArenaMatchSnapshot> {
  if (typeof includeInternal !== 'boolean') {
    throw new TypeError('ArenaMatchSnapshotAudit.includeInternal 必须是布尔值。');
  }
  const source = cloneFrozenData(value, 'ArenaMatchSnapshot');
  assertKnownKeys(
    source,
    includeInternal ? INTERNAL_SNAPSHOT_KEYS : PUBLIC_SNAPSHOT_KEYS,
    'ArenaMatchSnapshot',
  );
  assertIntegerAtLeast(source.schemaVersion, 1, 'ArenaMatchSnapshot.schemaVersion');
  assertNonEmptyString(source.physicsBackendVersion, 'ArenaMatchSnapshot.physicsBackendVersion');
  assertNonEmptyString(source.configHash, 'ArenaMatchSnapshot.configHash');
  assertNonEmptyString(source.ruleContentHash, 'ArenaMatchSnapshot.ruleContentHash');
  const matchSeed = assertIntegerAtLeast(source.matchSeed, 0, 'ArenaMatchSnapshot.matchSeed');
  if (matchSeed > 0xffffffff) throw new RangeError('ArenaMatchSnapshot.matchSeed 必须是 uint32。');
  const tick = assertIntegerAtLeast(source.tick, 0, 'ArenaMatchSnapshot.tick');
  const activeTick = assertIntegerAtLeast(
    source.activeTick,
    0,
    'ArenaMatchSnapshot.activeTick',
  );
  if (activeTick > tick) {
    throw new RangeError('ArenaMatchSnapshot.activeTick 不能超过 tick。');
  }
  assertNonEmptyString(source.phase, 'ArenaMatchSnapshot.phase');
  assertIntegerAtLeast(source.remainingTicks, 0, 'ArenaMatchSnapshot.remainingTicks');
  assertIntegerAtLeast(source.eventSequence, 0, 'ArenaMatchSnapshot.eventSequence');
  if (!Array.isArray(source.participants) || source.participants.length === 0) {
    throw new RangeError('ArenaMatchSnapshot.participants 必须是非空数组。');
  }
  if (!Array.isArray(source.equipment)) {
    throw new TypeError('ArenaMatchSnapshot.equipment 必须是数组。');
  }
  const participantIds = new Set<string>();
  source.participants.forEach((participant, index) => (
    auditParticipant(participant, index, includeInternal, participantIds)
  ));
  const equipmentIds = new Set<string>();
  source.equipment.forEach((equipment, index) => auditEquipment(equipment, index, equipmentIds));
  auditMap(source.map, includeInternal);
  if (source.result !== null) {
    assertKnownKeys(source.result, RESULT_KEYS, 'ArenaMatchSnapshot.result');
    const winnerId = nullableIdentifier(source.result.winnerId, 'ArenaMatchSnapshot.result.winnerId');
    if (winnerId !== null && !participantIds.has(winnerId)) {
      throw new RangeError('ArenaMatchSnapshot.result.winnerId 必须引用 participant。');
    }
    assertNonEmptyString(source.result.reason, 'ArenaMatchSnapshot.result.reason');
    if (typeof source.result.isDraw !== 'boolean') {
      throw new TypeError('ArenaMatchSnapshot.result.isDraw 必须是布尔值。');
    }
    assertIntegerAtLeast(source.result.endedAtTick, 0, 'ArenaMatchSnapshot.result.endedAtTick');
  }
  if (includeInternal) {
    if (!source.rngStates || typeof source.rngStates !== 'object' || Array.isArray(source.rngStates)) {
      throw new TypeError('ArenaMatchSnapshot.rngStates 必须是对象。');
    }
    assertKnownKeys(source.rngStates, new Set(Object.keys(source.rngStates)), 'ArenaMatchSnapshot.rngStates');
    for (const [name, state] of Object.entries(source.rngStates)) {
      assertNonEmptyString(name, 'ArenaMatchSnapshot.rngStates key');
      const normalized = assertIntegerAtLeast(state, 0, `ArenaMatchSnapshot.rngStates.${name}`);
      if (normalized > 0xffffffff) {
        throw new RangeError(`ArenaMatchSnapshot.rngStates.${name} 必须是 uint32。`);
      }
    }
  }
  return source as unknown as DeepReadonly<ArenaMatchSnapshot>;
}
